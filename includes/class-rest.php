<?php
defined( 'ABSPATH' ) || exit;

class WVM_Rest {

	const NS = 'wvm/v1';

	public static function init(): void {
		add_action( 'rest_api_init', [ __CLASS__, 'register' ] );
	}

	public static function register(): void {
		$auth = [ 'permission_callback' => [ __CLASS__, 'auth' ] ];

		// Dashboard (all data in one shot)
		register_rest_route( self::NS, '/dashboard', [
			'methods'             => 'GET',
			'callback'            => [ __CLASS__, 'dashboard' ],
			'permission_callback' => [ __CLASS__, 'auth' ],
		] );

		// Accounts
		register_rest_route( self::NS, '/accounts', [
			[ 'methods' => 'GET',  'callback' => [ __CLASS__, 'accounts_list' ],   'permission_callback' => [ __CLASS__, 'auth' ] ],
			[ 'methods' => 'POST', 'callback' => [ __CLASS__, 'accounts_create' ], 'permission_callback' => [ __CLASS__, 'auth' ] ],
		] );
		register_rest_route( self::NS, '/accounts/(?P<id>\d+)', [
			[ 'methods' => 'DELETE', 'callback' => [ __CLASS__, 'accounts_delete' ], 'permission_callback' => [ __CLASS__, 'auth' ] ],
			[ 'methods' => 'PATCH',  'callback' => [ __CLASS__, 'accounts_toggle' ], 'permission_callback' => [ __CLASS__, 'auth' ] ],
		] );

		// Sync
		register_rest_route( self::NS, '/sync', [
			'methods'             => 'POST',
			'callback'            => [ __CLASS__, 'sync' ],
			'permission_callback' => [ __CLASS__, 'auth' ],
		] );

		// Alerts
		register_rest_route( self::NS, '/alerts', [
			'methods'             => 'GET',
			'callback'            => [ __CLASS__, 'alerts' ],
			'permission_callback' => [ __CLASS__, 'auth' ],
		] );
		register_rest_route( self::NS, '/alerts/read', [
			'methods'             => 'POST',
			'callback'            => [ __CLASS__, 'alerts_mark_read' ],
			'permission_callback' => [ __CLASS__, 'auth' ],
		] );

		// Settings
		register_rest_route( self::NS, '/settings', [
			[ 'methods' => 'GET',  'callback' => [ __CLASS__, 'settings_get' ],  'permission_callback' => [ __CLASS__, 'auth' ] ],
			[ 'methods' => 'POST', 'callback' => [ __CLASS__, 'settings_save' ], 'permission_callback' => [ __CLASS__, 'auth' ] ],
		] );
	}

	public static function auth(): bool {
		return current_user_can( 'manage_options' );
	}

	// ── Dashboard ─────────────────────────────────────────────────────────────

	public static function dashboard( WP_REST_Request $req ): WP_REST_Response {
		global $wpdb;
		$t        = WVM_Install::tables();
		$acct_id  = $req->get_param( 'account_id' );

		$where_acct = $acct_id ? $wpdb->prepare( 'WHERE account_id = %d', $acct_id ) : '';

		$instances = $wpdb->get_results( "SELECT * FROM {$t['instances']} $where_acct ORDER BY label ASC", ARRAY_A ) ?: [];
		$fw_rules  = $wpdb->get_results( "SELECT * FROM {$t['firewall_rules']} $where_acct ORDER BY is_risky DESC, id ASC", ARRAY_A ) ?: [];
		$alerts    = $wpdb->get_results( "SELECT * FROM {$t['alerts']} {$where_acct} ORDER BY created_at DESC LIMIT 30", ARRAY_A ) ?: [];

		// Cast types
		foreach ( $instances as &$i ) {
			$i['bw_used']        = (int) $i['bw_used'];
			$i['bw_used_month']  = (int) ( $i['bw_used_month'] ?? $i['bw_used'] );
			$i['bw_used_30d']    = (int) ( $i['bw_used_30d']   ?? $i['bw_used'] );
			$i['bw_total']       = (int) $i['bw_total'];
			$i['cost']           = (float) $i['cost'];
			$i['backup_enabled'] = (bool) $i['backup_enabled'];
			$i['uptime_pct']     = (float) $i['uptime_pct'];
			$i['account_id']     = (int) $i['account_id'];
			$i['vcpu_count']     = (int) ( $i['vcpu_count'] ?? 0 );
			$i['ram_mb']         = (int) ( $i['ram_mb']     ?? 0 );
			$i['disk_gb']        = (int) ( $i['disk_gb']    ?? 0 );
			unset( $i['raw_json'] );
		}
		unset( $i );

		foreach ( $fw_rules as &$r ) {
			$r['is_risky']  = (bool) $r['is_risky'];
			$r['account_id']= (int) $r['account_id'];
		}
		unset( $r );

		foreach ( $alerts as &$a ) {
			$a['is_read']   = (bool) $a['is_read'];
			$a['account_id']= (int) $a['account_id'];
		}
		unset( $a );

		// ── Billing data (from wp_options, populated by sync) ────────────────────
		$billing_by_account = [];
		foreach ( WVM_Settings::get_accounts_safe() as $acct ) {
			$raw = get_option( 'wvm_billing_' . $acct['id'] );
			if ( $raw ) {
				$billing_by_account[ $acct['id'] ] = json_decode( $raw, true );
			}
		}

		return new WP_REST_Response( [
			'accounts'   => WVM_Settings::get_accounts_safe(),
			'instances'  => $instances,
			'firewall'   => $fw_rules,
			'alerts'     => $alerts,
			'billing'    => $billing_by_account,
			'next_sync'  => WVM_Cron::next_run(),
			'settings'   => WVM_Settings::get(),
		] );
	}

	// ── Accounts ──────────────────────────────────────────────────────────────

	public static function accounts_list(): WP_REST_Response {
		return new WP_REST_Response( WVM_Settings::get_accounts_safe() );
	}

	public static function accounts_create( WP_REST_Request $req ): WP_REST_Response|WP_Error {
		$label   = sanitize_text_field( $req->get_param( 'label' ) ?? '' );
		$api_key = sanitize_text_field( $req->get_param( 'api_key' ) ?? '' );
		if ( ! $label || ! $api_key ) {
			return new WP_Error( 'missing', 'label and api_key are required', [ 'status' => 400 ] );
		}
		$id = WVM_Settings::add_account( $label, $api_key );
		if ( is_wp_error( $id ) ) return $id;
		return new WP_REST_Response( [ 'id' => $id, 'message' => 'Account added' ], 201 );
	}

	public static function accounts_delete( WP_REST_Request $req ): WP_REST_Response|WP_Error {
		$id     = (int) $req->get_param( 'id' );
		$result = WVM_Settings::delete_account( $id );
		if ( is_wp_error( $result ) ) return $result;
		return new WP_REST_Response( [ 'deleted' => $id ] );
	}

	public static function accounts_toggle( WP_REST_Request $req ): WP_REST_Response|WP_Error {
		$id      = (int) $req->get_param( 'id' );
		$enabled = (bool) $req->get_param( 'enabled' );
		$result  = WVM_Settings::toggle_account( $id, $enabled );
		if ( is_wp_error( $result ) ) return $result;
		return new WP_REST_Response( [ 'id' => $id, 'enabled' => $enabled ] );
	}

	// ── Sync ──────────────────────────────────────────────────────────────────

	public static function sync(): WP_REST_Response {
		$synced = WVM_Cron::run_now();
		return new WP_REST_Response( [
			'synced'   => $synced,
			'count'    => count( $synced ),
			'message'  => 'Sync complete — ' . count( $synced ) . ' account(s) updated',
			'next_sync'=> WVM_Cron::next_run(),
		] );
	}

	// ── Alerts ────────────────────────────────────────────────────────────────

	public static function alerts( WP_REST_Request $req ): WP_REST_Response {
		global $wpdb;
		$t      = WVM_Install::tables()['alerts'];
		$limit  = min( (int) ( $req->get_param( 'limit' ) ?? 50 ), 200 );
		$alerts = $wpdb->get_results( "SELECT * FROM $t ORDER BY created_at DESC LIMIT $limit", ARRAY_A ) ?: [];
		return new WP_REST_Response( $alerts );
	}

	public static function alerts_mark_read(): WP_REST_Response {
		global $wpdb;
		$t = WVM_Install::tables()['alerts'];
		$wpdb->query( "UPDATE $t SET is_read = 1 WHERE is_read = 0" );
		return new WP_REST_Response( [ 'ok' => true ] );
	}

	// ── Settings ──────────────────────────────────────────────────────────────

	public static function settings_get(): WP_REST_Response {
		return new WP_REST_Response( WVM_Settings::get() );
	}

	public static function settings_save( WP_REST_Request $req ): WP_REST_Response {
		$data = $req->get_json_params() ?? [];
		WVM_Settings::save( $data );

		// Reschedule cron if interval changed
		if ( isset( $data['sync_interval'] ) ) {
			WVM_Cron::reschedule( $data['sync_interval'] );
		}

		return new WP_REST_Response( [ 'saved' => true, 'settings' => WVM_Settings::get() ] );
	}
}
