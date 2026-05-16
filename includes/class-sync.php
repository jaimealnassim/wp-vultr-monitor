<?php
defined( 'ABSPATH' ) || exit;

class WVM_Sync {

	// ── Full sync for one account ─────────────────────────────────────────────

	public static function run_account( array $account ): void {
		$api = new WVM_Api( $account['api_key'] );
		$id  = (int) $account['id'];

		self::sync_instances( $api, $id );
		self::sync_billing( $api, $id );
		self::sync_firewall( $api, $id );
		self::check_alerts( $id );
		self::log( $id, 'full', 'ok', 'Sync completed' );
	}

	// ── Billing sync ──────────────────────────────────────────────────────────

	/**
	 * Fetch real billing data from Vultr:
	 *   - /v2/billing/pending-charges  → current-month line items (actual $ per service)
	 *   - /v2/account                  → balance, pending_charges total, last payment
	 *   - /v2/plans                    → monthly_cost per plan (used as cost fallback on instances)
	 *
	 * Stored in wp_options as JSON keyed by account_id.
	 * Also back-fills `cost` on instance rows when the instance's monthly_cost was 0.
	 */
	private static function sync_billing( WVM_Api $api, int $account_id ): void {
		global $wpdb;

		// ── Account summary ───────────────────────────────────────────────────
		$acct_info = $api->get_account_info();
		$summary   = [
			'balance'           => 0.0,
			'pending_charges'   => 0.0,
			'last_payment_date' => '',
			'last_payment_amount' => 0.0,
		];
		if ( ! is_wp_error( $acct_info ) ) {
			$summary['balance']             = (float) ( $acct_info['balance']              ?? 0 );
			$summary['pending_charges']     = (float) ( $acct_info['pending_charges']      ?? 0 );
			$summary['last_payment_date']   = $acct_info['last_payment_date']   ?? '';
			$summary['last_payment_amount'] = (float) ( $acct_info['last_payment_amount']  ?? 0 );
		}

		// ── Pending charge line items ─────────────────────────────────────────
		$raw_charges = $api->get_pending_charges();
		$line_items  = [];

		if ( ! is_wp_error( $raw_charges ) ) {
			// Normalise: API sometimes returns { pending_charges: [...] } or bare array
			$items = is_array( $raw_charges ) && isset( $raw_charges[0] ) ? $raw_charges : [];
			foreach ( $items as $item ) {
				// Extract IP from description: "Cloud Compute (1.2.3.4)" → "1.2.3.4"
				$ip = '';
				if ( preg_match( '/\(([0-9a-f.:]+)\)/i', $item['description'] ?? '', $m ) ) {
					$ip = $m[1];
				}
				$line_items[] = [
					'description' => $item['description'] ?? '',
					'amount'      => (float) ( $item['amount']     ?? 0 ),
					'unit_price'  => (float) ( $item['unit_price'] ?? 0 ),
					'units'       => (float) ( $item['units']      ?? 0 ),
					'start_date'  => $item['start_date'] ?? '',
					'end_date'    => $item['end_date']   ?? '',
					'ip'          => $ip,
				];
			}
		}

		// ── Plan pricing map (fallback when instance cost is 0) ───────────────
		// Plans return `bandwidth` (GB) and `monthly_cost`. Both are confirmed
		// field names from Vultr's official Go SDK and API docs.
		$plans = $api->get_plans();
		if ( ! is_wp_error( $plans ) && $plans ) {
			$t_inst = WVM_Install::tables()['instances'];
			$rows   = $wpdb->get_results(
				$wpdb->prepare( "SELECT id, plan, ip, cost FROM $t_inst WHERE account_id = %d AND cost = 0", $account_id ),
				ARRAY_A
			) ?: [];

			foreach ( $rows as $row ) {
				// Try exact plan ID match first
				$plan_cost = (float) ( $plans[ $row['plan'] ]['monthly_cost'] ?? 0 );

				// Try matching by RAM label e.g. "8 vCPU / 32GB" → find vhp-8c-32gb
				if ( $plan_cost <= 0 ) {
					foreach ( $plans as $plan ) {
						if ( self::plan_label( $plan['id'] ) === $row['plan'] ) {
							$plan_cost = (float) ( $plan['monthly_cost'] ?? 0 );
							break;
						}
					}
				}

				// Try matching line items by IP
				if ( $plan_cost <= 0 && $row['ip'] ) {
					foreach ( $line_items as $li ) {
						if ( $li['ip'] === $row['ip'] ) {
							$plan_cost = $li['amount'];
							break;
						}
					}
				}

				if ( $plan_cost > 0 ) {
					$wpdb->update( $t_inst, [ 'cost' => $plan_cost ], [ 'id' => (int) $row['id'] ] );
				}
			}
		}

		// ── Persist billing summary ───────────────────────────────────────────
		update_option( 'wvm_billing_' . $account_id, wp_json_encode( [
			'summary'    => $summary,
			'line_items' => $line_items,
			'synced_at'  => current_time( 'mysql' ),
		] ), false );
	}

	// ── Instances ─────────────────────────────────────────────────────────────

	private static function sync_instances( WVM_Api $api, int $account_id ): void {
		global $wpdb;
		$t = WVM_Install::tables()['instances'];

		$instances = $api->get_instances();
		if ( is_wp_error( $instances ) ) {
			self::log( $account_id, 'instances', 'error', $instances->get_error_message() );
			return;
		}

		// ── Plans list: the ONLY reliable source for the full monthly bandwidth cap ──
		// `allowed_bandwidth` on the instance object is PRORATED (accrues hourly).
		// The plans list `bandwidth` field is the actual full monthly cap in GB.
		// We add `freeBandwidthCredits` (2 TB given upfront each month) to get
		// the true total Vultr shows in their dashboard (e.g. 5 TB plan + 2 TB free = 7 TB).
		$plans_list = $api->get_plans();
		$plans      = is_wp_error( $plans_list ) ? [] : $plans_list;

		// ── Account-level free bandwidth ──────────────────────────────────────
		$acct_bw = $api->get_account_bandwidth();
		$free_gb = 2048; // 2 TB default — given upfront, not prorated
		if ( ! is_wp_error( $acct_bw ) ) {
			// freeBandwidthCredits is the 2 TB free (given upfront at month start)
			// purchasedBandwidthCredits is any extra purchased pool
			$free_gb = (int) ( $acct_bw['freeBandwidthCredits']      ?? 2048 )
			         + (int) ( $acct_bw['purchasedBandwidthCredits'] ?? 0 );
		}

		$instance_count = max( 1, count( $instances ) );

		// Pre-fetch backups once
		$all_backups = $api->get_backups();
		$backup_map  = [];
		if ( ! is_wp_error( $all_backups ) ) {
			foreach ( $all_backups as $b ) {
				$iid = $b['instance_id'] ?? '';
				if ( $iid && empty( $backup_map[ $iid ] ) ) {
					$backup_map[ $iid ] = human_time_diff( strtotime( $b['date_created'] ), time() ) . ' ago';
				}
			}
		}

		$wpdb->delete( $t, [ 'account_id' => $account_id ] );

		foreach ( $instances as $inst ) {
			$vultr_id = $inst['id'];
			$plan_id  = $inst['plan'] ?? '';

			// ── Cost — from plans list only (instance object has no monthly_cost field) ──
			// Confirmed from govultr SDK: Instance struct has no MonthlyCost.
			// Plan struct has MonthlyCost float32 `json:"monthly_cost"`.
			$cost = 0.0;
			if ( isset( $plans[ $plan_id ] ) ) {
				$cost = (float) ( $plans[ $plan_id ]['monthly_cost'] ?? 0 );
			}

			// ── Specs from instance object ─────────────────────────────────────
			// ram: MB (e.g. 32768 = 32 GB), vcpu_count: cores, disk: GB
			$vcpu_count = (int) ( $inst['vcpu_count'] ?? 0 );
			$ram_mb     = (int) ( $inst['ram']        ?? 0 );
			$disk_gb    = (int) ( $inst['disk']       ?? 0 );
			// in their dashboard (e.g. 7168 GB = 7 TB). Do not add freeBandwidthCredits
			// on top — that produces an inflated number the user never sees in Vultr.
			$plan_cap_gb = isset( $plans[ $plan_id ] ) ? (int) ( $plans[ $plan_id ]['bandwidth'] ?? 0 ) : 0;
			if ( $plan_cap_gb <= 0 ) {
				$plan_cap_gb = self::plan_bandwidth_gb( $plan_id );
			}
			$bw_total = $plan_cap_gb;

			// ── Per-instance bandwidth (daily breakdown) ──────────────────────
			$bw = $api->get_instance_bandwidth( $vultr_id );
			$bw_month = 0;
			$bw_30d   = 0;
			$bw_total_bytes = 0;

			if ( ! is_wp_error( $bw ) ) {
				$periods = self::calc_bandwidth_periods( $bw['bandwidth'] ?? [] );
				$bw_month = $periods['month_gb'];
				$bw_30d   = $periods['days30_gb'];
				// bw_used = current month (primary field, kept for back-compat)
			}

			// ── Backup ───────────────────────────────────────────────────────
			$backup_enabled = isset( $inst['backups'] ) && $inst['backups'] === 'enabled';
			$last_backup    = $backup_map[ $vultr_id ] ?? ( $backup_enabled ? 'No backup yet' : 'Never' );

			// ── Status normalisation ──────────────────────────────────────────
			// Vultr power_status: 'running' | 'stopped' | 'starting' | 'updating'
			$status = $inst['power_status'] ?? $inst['status'] ?? 'unknown';

			$wpdb->insert( $t, [
				'account_id'     => $account_id,
				'vultr_id'       => $vultr_id,
				'label'          => $inst['label'] ?: ( $inst['hostname'] ?? $vultr_id ),
				'ip'             => $inst['main_ip'] ?? '',
				'region'         => self::region_label( $inst['region'] ?? '' ),
				'plan'           => self::plan_label( $plan_id ),
				'status'         => $status,
				'vcpu_count'     => $vcpu_count,
				'ram_mb'         => $ram_mb,
				'disk_gb'        => $disk_gb,
				'bw_used'        => $bw_month,
				'bw_used_month'  => $bw_month,
				'bw_used_30d'    => $bw_30d,
				'bw_total'       => $bw_total,
				'cost'           => $cost,
				'backup_enabled' => (int) $backup_enabled,
				'last_backup'    => $last_backup,
				'uptime_pct'     => 0,
				'os'             => $inst['os'] ?? '',
				'raw_json'       => wp_json_encode( $inst ),
				'synced_at'      => current_time( 'mysql' ),
			] );
		}
	}

	// ── Bandwidth period aggregation ──────────────────────────────────────────

	/**
	 * Given the raw bandwidth array keyed by date (YYYY-MM-DD),
	 * return GB totals for:
	 *   - current calendar month (1st → today)
	 *   - last 30 rolling days
	 *
	 * Vultr reports outgoing_bytes per day; that's what counts against quota.
	 */
	private static function calc_bandwidth_periods( array $bw_data ): array {
		$month_bytes = 0;
		$days30_bytes = 0;

		$now          = new DateTime( 'now', new DateTimeZone( 'UTC' ) );
		$month_start  = new DateTime( 'first day of this month midnight', new DateTimeZone( 'UTC' ) );
		$days30_start = ( clone $now )->modify( '-30 days' );

		foreach ( $bw_data as $date_str => $day ) {
			// Keys can be full ISO timestamps or bare dates
			$bare = substr( $date_str, 0, 10 );
			try {
				$day_dt = new DateTime( $bare, new DateTimeZone( 'UTC' ) );
			} catch ( \Exception $e ) {
				continue;
			}

			$outgoing = (int) ( $day['outgoing_bytes'] ?? 0 );

			if ( $day_dt >= $month_start ) {
				$month_bytes += $outgoing;
			}
			if ( $day_dt >= $days30_start ) {
				$days30_bytes += $outgoing;
			}
		}

		return [
			'month_gb' => (int) round( $month_bytes  / 1_073_741_824 ),
			'days30_gb'=> (int) round( $days30_bytes / 1_073_741_824 ),
		];
	}

	// ── Firewall ──────────────────────────────────────────────────────────────

	private static function sync_firewall( WVM_Api $api, int $account_id ): void {
		global $wpdb;
		$t      = WVM_Install::tables()['firewall_rules'];
		$groups = $api->get_firewall_groups();
		if ( is_wp_error( $groups ) ) return;

		$wpdb->delete( $t, [ 'account_id' => $account_id ] );

		foreach ( $groups as $group ) {
			$rules = $api->get_firewall_rules( $group['id'] );
			if ( is_wp_error( $rules ) ) continue;

			foreach ( $rules as $rule ) {
				$port    = (string) ( $rule['port'] ?? '' );
				$subnet  = $rule['subnet'] ?? '0.0.0.0';
				$size    = $rule['subnet_size'] ?? '';
				$source  = $size !== '' ? $subnet . '/' . $size : $subnet;
				$is_risk = (int) WVM_Api::is_risky_rule( $port, $source );

				$wpdb->insert( $t, [
					'account_id'     => $account_id,
					'group_id'       => $group['id'],
					'group_name'     => $group['description'] ?: $group['id'],
					'instance_label' => '',
					'protocol'       => strtoupper( $rule['protocol'] ?? 'TCP' ),
					'port'           => $port,
					'source'         => $source,
					'is_risky'       => $is_risk,
					'note'           => $is_risk ? WVM_Api::risky_note( $port ) : '',
					'synced_at'      => current_time( 'mysql' ),
				] );
			}
		}
	}

	// ── Alerts ────────────────────────────────────────────────────────────────

	private static function check_alerts( int $account_id ): void {
		global $wpdb;
		$settings  = WVM_Settings::get();
		$t_inst    = WVM_Install::tables()['instances'];
		$t_fw      = WVM_Install::tables()['firewall_rules'];
		$instances = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM $t_inst WHERE account_id = %d", $account_id ), ARRAY_A );

		foreach ( $instances as $inst ) {
			// Offline alert
			if ( $settings['alert_offline'] && $inst['status'] === 'stopped' ) {
				self::create_alert( $account_id, 'error', "{$inst['label']} is OFFLINE" );
			}

			// Bandwidth alert (use current-month figure)
			$bw_pct = $inst['bw_total'] > 0
				? (int) round( ( $inst['bw_used_month'] / $inst['bw_total'] ) * 100 )
				: 0;
			$threshold = (int) ( $settings['alert_bw_threshold'] ?? 80 );
			if ( $bw_pct >= $threshold ) {
				self::create_alert(
					$account_id,
					$bw_pct >= 95 ? 'error' : 'warning',
					"{$inst['label']} bandwidth at {$bw_pct}% — " . ( $bw_pct >= 95 ? 'overage imminent' : 'approaching limit' )
				);
			}

			// Backup alert
			if ( $settings['alert_backup_missing'] && ! $inst['backup_enabled'] ) {
				self::create_alert( $account_id, 'warning', "{$inst['label']} has no backup enabled" );
			}
		}

		// Firewall risky rules
		$risky = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM $t_fw WHERE account_id = %d AND is_risky = 1", $account_id ), ARRAY_A );
		foreach ( $risky as $r ) {
			self::create_alert( $account_id, 'warning', "Firewall: {$r['group_name']} — {$r['note']}" );
		}

		self::fire_notifications( $account_id, $settings );
	}

	private static function create_alert( int $account_id, string $severity, string $message ): void {
		global $wpdb;
		$t = WVM_Install::tables()['alerts'];
		$exists = $wpdb->get_var( $wpdb->prepare(
			"SELECT id FROM $t WHERE account_id = %d AND message = %s AND created_at > %s LIMIT 1",
			$account_id, $message, gmdate( 'Y-m-d H:i:s', strtotime( '-24 hours' ) )
		) );
		if ( $exists ) return;
		$wpdb->insert( $t, [ 'account_id' => $account_id, 'severity' => $severity, 'message' => $message ] );
	}

	private static function fire_notifications( int $account_id, array $settings ): void {
		global $wpdb;
		$t      = WVM_Install::tables()['alerts'];
		$unsent = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM $t WHERE account_id = %d AND is_read = 0 AND severity IN ('error','warning') ORDER BY created_at DESC LIMIT 10",
			$account_id
		), ARRAY_A );
		if ( ! $unsent ) return;

		$lines = implode( "\n", array_map( fn( $a ) => "[{$a['severity']}] {$a['message']}", $unsent ) );

		if ( $settings['alert_email'] && $settings['alert_email_to'] ) {
			wp_mail( $settings['alert_email_to'], '[WP Vultr Monitor] Server Alerts',
				"The following alerts were detected:\n\n$lines\n\n-- WP Vultr Monitor" );
		}

		if ( $settings['alert_slack'] && $settings['alert_slack_webhook'] ) {
			wp_remote_post( $settings['alert_slack_webhook'], [
				'headers' => [ 'Content-Type' => 'application/json' ],
				'body'    => wp_json_encode( [ 'text' => "*WP Vultr Monitor Alerts*\n$lines" ] ),
				'timeout' => 10,
			] );
		}

		$ids = implode( ',', array_column( $unsent, 'id' ) );
		$wpdb->query( "UPDATE $t SET is_read = 1 WHERE id IN ($ids)" );
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	/**
	 * Fallback bandwidth allowance by plan slug pattern.
	 * Only used when the API instance object returns 0 for allowed_bandwidth.
	 * Plans list has `bandwidth` field (GB) — we parse the slug as a last resort.
	 */
	private static function plan_bandwidth_gb( string $plan_id ): int {
		// Vultr plan slug pattern: vhp-8c-32gb, vc2-2c-4gb, voc-g-4c-16gb …
		// RAM tier → reasonable bandwidth default (matches Vultr's actual plans)
		if ( preg_match( '/[-_](\d+)gb$/i', $plan_id, $m ) ) {
			$ram = (int) $m[1];
			if ( $ram >= 128 ) return 10240;
			if ( $ram >= 64  ) return 8192;
			if ( $ram >= 32  ) return 7168;
			if ( $ram >= 16  ) return 6144;
			if ( $ram >= 8   ) return 4096;
			if ( $ram >= 4   ) return 3072;
			if ( $ram >= 2   ) return 2048;
			return 1024;
		}
		return 2048; // safe default when slug doesn't match
	}

	private static function region_label( string $code ): string {
		$map = [
			'ams' => 'Amsterdam',    'sea' => 'Seattle, WA',
			'lax' => 'Los Angeles',  'ord' => 'Chicago, IL',
			'ewr' => 'New Jersey',   'dfw' => 'Dallas, TX',
			'mia' => 'Miami, FL',    'atl' => 'Atlanta, GA',
			'fra' => 'Frankfurt',    'lhr' => 'London',
			'cdg' => 'Paris',        'nrt' => 'Tokyo',
			'sgp' => 'Singapore',    'syd' => 'Sydney',
			'yto' => 'Toronto',      'blr' => 'Bangalore',
			'icn' => 'Seoul',        'mex' => 'Mexico City',
			'sao' => 'São Paulo',    'mad' => 'Madrid',
			'mel' => 'Melbourne',    'waw' => 'Warsaw',
			'bom' => 'Mumbai',       'jnb' => 'Johannesburg',
		];
		return $map[ strtolower( $code ) ] ?? strtoupper( $code );
	}

	private static function plan_label( string $plan_id ): string {
		// vc2-2c-4gb → "2 vCPU / 4GB"  |  vhp-8c-32gb → "8 vCPU / 32GB"
		if ( preg_match( '/(\d+)c[-_](\d+)gb/i', $plan_id, $m ) ) {
			return "{$m[1]} vCPU / {$m[2]}GB";
		}
		return $plan_id;
	}

	private static function log( int $account_id, string $type, string $status, string $details ): void {
		global $wpdb;
		$wpdb->insert( WVM_Install::tables()['sync_log'], [
			'account_id' => $account_id,
			'type'       => $type,
			'status'     => $status,
			'details'    => $details,
		] );
	}
}
