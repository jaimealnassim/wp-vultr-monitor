<?php
defined( 'ABSPATH' ) || exit;

/**
 * Handles account storage, encryption, and wp-config.php constant parsing.
 *
 * ── wp-config.php patterns ────────────────────────────────────────────────────
 *
 * Single account:
 *   define( 'WVM_VULTR_API_KEY', 'your-api-key-here' );
 *   define( 'WVM_VULTR_LABEL',   'My Production Server' ); // optional
 *
 * Multiple accounts (JSON array):
 *   define( 'WVM_VULTR_ACCOUNTS', json_encode( [
 *       [ 'label' => 'Nahnu Production', 'api_key' => 'key_1' ],
 *       [ 'label' => 'Exercise Library', 'api_key' => 'key_2' ],
 *   ] ) );
 *
 * Config-defined accounts are read-only — they cannot be deleted from the dashboard.
 */
class WVM_Settings {

	// ── Encryption ────────────────────────────────────────────────────────────

	private static function enc_key(): string {
		return hash( 'sha256', wp_salt( 'auth' ) . 'wvm_v1', true );
	}

	public static function encrypt( string $plain ): string {
		if ( ! $plain ) return '';
		$key = self::enc_key();
		$iv  = random_bytes( 16 );
		$enc = openssl_encrypt( $plain, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv );
		return base64_encode( $iv . $enc );
	}

	public static function decrypt( string $enc ): string {
		if ( ! $enc ) return '';
		$raw = base64_decode( $enc );
		if ( strlen( $raw ) < 17 ) return '';
		$iv  = substr( $raw, 0, 16 );
		$key = self::enc_key();
		return openssl_decrypt( substr( $raw, 16 ), 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv ) ?: '';
	}

	// ── wp-config.php constant parsing ────────────────────────────────────────

	/**
	 * Read accounts defined as PHP constants.
	 * Returns raw entries with plain api_key — does NOT touch the DB.
	 */
	public static function get_config_entries(): array {
		$entries = [];

		// Pattern A: WVM_VULTR_ACCOUNTS (multi-account JSON array)
		if ( defined( 'WVM_VULTR_ACCOUNTS' ) && WVM_VULTR_ACCOUNTS ) {
			$raw = json_decode( WVM_VULTR_ACCOUNTS, true );
			if ( is_array( $raw ) ) {
				foreach ( $raw as $i => $row ) {
					if ( empty( $row['api_key'] ) ) continue;
					$entries[] = [
						'label'   => sanitize_text_field( $row['label'] ?? 'Account ' . ( $i + 1 ) ),
						'api_key' => trim( $row['api_key'] ),
					];
				}
			}
		}
		// Pattern B: WVM_VULTR_API_KEY (single account)
		elseif ( defined( 'WVM_VULTR_API_KEY' ) && WVM_VULTR_API_KEY ) {
			$entries[] = [
				'label'   => defined( 'WVM_VULTR_LABEL' ) ? sanitize_text_field( WVM_VULTR_LABEL ) : 'Vultr (wp-config)',
				'api_key' => trim( WVM_VULTR_API_KEY ),
			];
		}

		return $entries;
	}

	/**
	 * Upsert wp-config.php accounts into the DB so the sync engine can use
	 * real integer IDs throughout. Called on every admin page load.
	 */
	public static function sync_config_accounts(): void {
		global $wpdb;
		$t       = WVM_Install::tables()['accounts'];
		$entries = self::get_config_entries();

		// Build label->row map for existing config rows
		$existing = $wpdb->get_results(
			"SELECT id, label, api_key FROM $t WHERE source = 'config'",
			ARRAY_A
		) ?: [];
		$by_label = [];
		foreach ( $existing as $row ) {
			$by_label[ $row['label'] ] = $row;
		}

		$seen_ids = [];

		foreach ( $entries as $entry ) {
			$enc = self::encrypt( $entry['api_key'] );

			if ( isset( $by_label[ $entry['label'] ] ) ) {
				$existing_row = $by_label[ $entry['label'] ];
				$id = (int) $existing_row['id'];
				// Re-encrypt and update if the key changed
				if ( self::decrypt( $existing_row['api_key'] ) !== $entry['api_key'] ) {
					$wpdb->update( $t, [ 'api_key' => $enc ], [ 'id' => $id ] );
				}
				$seen_ids[] = $id;
			} else {
				$wpdb->insert( $t, [
					'label'   => $entry['label'],
					'api_key' => $enc,
					'enabled' => 1,
					'source'  => 'config',
				] );
				$seen_ids[] = (int) $wpdb->insert_id;
			}
		}

		// Prune config rows removed from wp-config.php
		if ( $seen_ids ) {
			$ids_sql = implode( ',', array_map( 'intval', $seen_ids ) );
			$wpdb->query( "DELETE FROM $t WHERE source = 'config' AND id NOT IN ($ids_sql)" );
		} elseif ( empty( $entries ) ) {
			$wpdb->query( "DELETE FROM $t WHERE source = 'config'" );
		}
	}

	// ── Accounts ──────────────────────────────────────────────────────────────

	/** Full list with decrypted keys — internal use only. */
	public static function get_accounts(): array {
		global $wpdb;
		$t = WVM_Install::tables()['accounts'];

		// Check whether the `source` column exists yet (may be missing on
		// ZIP-upgrade before maybe_upgrade() has run, or on very first boot).
		$has_source = (bool) $wpdb->get_var(
			"SELECT COUNT(*) FROM information_schema.COLUMNS
			 WHERE TABLE_SCHEMA = DATABASE()
			   AND TABLE_NAME   = '$t'
			   AND COLUMN_NAME  = 'source'"
		);

		$order = $has_source ? "ORDER BY FIELD(source,'config','db'), id ASC" : "ORDER BY id ASC";
		$rows  = $wpdb->get_results( "SELECT * FROM $t $order", ARRAY_A ) ?: [];

		return array_map( function ( $r ) use ( $has_source ) {
			$r['api_key']  = self::decrypt( $r['api_key'] );
			$r['source']   = $has_source ? $r['source'] : 'db';
			$r['readonly'] = ( $r['source'] === 'config' );
			return $r;
		}, $rows );
	}

	/** Safe list for the frontend — no api_key exposed. */
	public static function get_accounts_safe(): array {
		return array_map( function ( $a ) {
			unset( $a['api_key'] );
			$a['has_key']  = true;
			$a['readonly'] = $a['source'] === 'config';
			return $a;
		}, self::get_accounts() );
	}

	public static function has_accounts(): bool {
		global $wpdb;
		$t = WVM_Install::tables()['accounts'];
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM $t" ) > 0;
	}

	// ── DB account management ─────────────────────────────────────────────────

	public static function add_account( string $label, string $api_key ): int|WP_Error {
		global $wpdb;

		$vultr  = new WVM_Api( $api_key );
		$result = $vultr->get_account();
		if ( is_wp_error( $result ) ) return $result;

		$t = WVM_Install::tables()['accounts'];
		$wpdb->insert( $t, [
			'label'   => sanitize_text_field( $label ),
			'api_key' => self::encrypt( $api_key ),
			'enabled' => 1,
			'source'  => 'db',
		] );
		return $wpdb->insert_id ?: new WP_Error( 'db', 'Insert failed' );
	}

	public static function delete_account( int $id ): true|WP_Error {
		global $wpdb;
		$t   = WVM_Install::tables()['accounts'];
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT source FROM $t WHERE id = %d", $id ), ARRAY_A );

		if ( ! $row ) {
			return new WP_Error( 'not_found', 'Account not found', [ 'status' => 404 ] );
		}
		if ( $row['source'] === 'config' ) {
			return new WP_Error(
				'readonly',
				'This account is defined in wp-config.php and cannot be deleted from the dashboard. Remove or change the constant to deactivate it.',
				[ 'status' => 403 ]
			);
		}

		$wpdb->delete( $t, [ 'id' => $id ] );
		return true;
	}

	public static function toggle_account( int $id, bool $enabled ): true|WP_Error {
		global $wpdb;
		$t   = WVM_Install::tables()['accounts'];
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT source FROM $t WHERE id = %d", $id ), ARRAY_A );

		if ( $row && $row['source'] === 'config' ) {
			return new WP_Error( 'readonly', 'Config-defined accounts cannot be toggled from the dashboard.', [ 'status' => 403 ] );
		}

		$wpdb->update( $t, [ 'enabled' => (int) $enabled ], [ 'id' => $id ] );
		return true;
	}

	// ── Plugin settings ───────────────────────────────────────────────────────

	public static function get(): array {
		return wp_parse_args( get_option( 'wvm_settings', [] ), WVM_Install::default_settings() );
	}

	public static function save( array $data ): void {
		$current = self::get();
		foreach ( array_keys( WVM_Install::default_settings() ) as $key ) {
			if ( array_key_exists( $key, $data ) ) {
				$current[ $key ] = $data[ $key ];
			}
		}
		update_option( 'wvm_settings', $current );
	}
}
