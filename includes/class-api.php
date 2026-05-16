<?php
defined( 'ABSPATH' ) || exit;

/**
 * Thin wrapper around Vultr API v2.
 *
 * Key facts confirmed from Vultr docs + govultr SDK:
 *  - Instance field: `allowed_bandwidth` (int, GB) — plan cap only, NOT total available
 *  - Total available BW = instanceBandwidthCredits + freeBandwidthCredits + purchasedBandwidthCredits
 *    from GET /v2/account/bandwidth → bandwidth.currentMonthToDate
 *  - freeBandwidthCredits = 2048 GB (2 TB free per account, given upfront each month)
 *  - Cursor pagination: `meta.links.next` is a plain cursor token, NOT a URL
 */
class WVM_Api {

	private string $api_key;
	private string $base = 'https://api.vultr.com/v2/';

	public function __construct( string $api_key ) {
		$this->api_key = $api_key;
	}

	// ── HTTP helpers ──────────────────────────────────────────────────────────

	private function get( string $endpoint, array $params = [] ): array|WP_Error {
		$url = $this->base . ltrim( $endpoint, '/' );
		if ( $params ) $url = add_query_arg( $params, $url );

		$resp = wp_remote_get( $url, [
			'headers' => [ 'Authorization' => 'Bearer ' . $this->api_key ],
			'timeout' => 25,
		] );

		return $this->parse( $resp );
	}

	private function parse( $resp ): array|WP_Error {
		if ( is_wp_error( $resp ) ) return $resp;
		$code = wp_remote_retrieve_response_code( $resp );
		$body = json_decode( wp_remote_retrieve_body( $resp ), true ) ?? [];
		if ( $code >= 400 ) {
			return new WP_Error( 'vultr_api_' . $code, $body['error'] ?? "HTTP $code" );
		}
		return $body;
	}

	/**
	 * Extract the next cursor from a pagination meta block.
	 * Vultr returns cursors as plain opaque tokens, NOT full URLs.
	 * Treat as token directly; fall back to URL query-string parsing if needed.
	 */
	private function next_cursor( array $data ): ?string {
		$next = $data['meta']['links']['next'] ?? null;
		if ( ! $next ) return null;
		// If it looks like a URL, extract the cursor param
		if ( str_starts_with( $next, 'http' ) ) {
			parse_str( (string) parse_url( $next, PHP_URL_QUERY ), $q );
			return $q['cursor'] ?? null;
		}
		// Otherwise it's the raw cursor token
		return $next;
	}

	// ── Instances ─────────────────────────────────────────────────────────────

	/** Return all instances, auto-paginating correctly. */
	public function get_instances(): array|WP_Error {
		$all    = [];
		$cursor = null;

		do {
			$params = [ 'per_page' => 100 ];
			if ( $cursor ) $params['cursor'] = $cursor;

			$data = $this->get( 'instances', $params );
			if ( is_wp_error( $data ) ) return $data;

			$all    = array_merge( $all, $data['instances'] ?? [] );
			$cursor = $this->next_cursor( $data );
		} while ( $cursor );

		return $all;
	}

	/** Daily bandwidth breakdown for one instance. */
	public function get_instance_bandwidth( string $id ): array|WP_Error {
		return $this->get( "instances/{$id}/bandwidth" );
	}

	// ── Account bandwidth ─────────────────────────────────────────────────────

	/**
	 * Account-wide bandwidth summary for the current month.
	 *
	 * Response structure:
	 * {
	 *   "bandwidth": {
	 *     "currentMonthToDate": {
	 *       "instanceBandwidthCredits": 3456,   // plan cap × (hours_run / 672), GB
	 *       "freeBandwidthCredits":     2048,   // 2 TB free, always full upfront
	 *       "purchasedBandwidthCredits": 0,     // extra purchased bandwidth
	 *       "gb_out":                   226,    // actual outbound used this month
	 *       "overage":                  0,
	 *       "overage_cost":             "0.00"
	 *     }
	 *   }
	 * }
	 *
	 * Full-month total = instanceBandwidthCredits (at 672hrs) + freeBandwidthCredits
	 *                  = allowed_bandwidth (plan cap)          + 2048
	 * That's the "7 TB" shown in Vultr's dashboard for a 5TB-plan + 2TB free account.
	 */
	public function get_account_bandwidth(): array|WP_Error {
		$data = $this->get( 'account/bandwidth' );
		if ( is_wp_error( $data ) ) return $data;
		return $data['bandwidth']['currentMonthToDate'] ?? $data;
	}

	// ── Firewall ──────────────────────────────────────────────────────────────

	public function get_firewall_groups(): array|WP_Error {
		$data = $this->get( 'firewalls' );
		if ( is_wp_error( $data ) ) return $data;
		return $data['firewall_groups'] ?? [];
	}

	public function get_firewall_rules( string $group_id ): array|WP_Error {
		$data = $this->get( "firewalls/{$group_id}/rules", [ 'per_page' => 500 ] );
		if ( is_wp_error( $data ) ) return $data;
		return $data['firewall_rules'] ?? [];
	}

	// ── Backups ───────────────────────────────────────────────────────────────

	public function get_backups(): array|WP_Error {
		$data = $this->get( 'backups', [ 'per_page' => 500 ] );
		if ( is_wp_error( $data ) ) return $data;
		return $data['backups'] ?? [];
	}

	// ── Billing ───────────────────────────────────────────────────────────────

	public function get_pending_charges(): array|WP_Error {
		$data = $this->get( 'billing/pending-charges' );
		if ( is_wp_error( $data ) ) return $data;
		return $data['pending_charges'] ?? ( is_array( $data ) ? $data : [] );
	}

	public function get_account_info(): array|WP_Error {
		$data = $this->get( 'account' );
		if ( is_wp_error( $data ) ) return $data;
		return $data['account'] ?? $data;
	}

	/**
	 * Full plan list indexed by plan ID, with correct pagination.
	 * Cached 24 hours — plan prices change rarely.
	 */
	public function get_plans(): array|WP_Error {
		$cache_key = 'wvm_plans_' . substr( md5( $this->api_key ), 0, 8 );
		$cached    = get_transient( $cache_key );
		if ( is_array( $cached ) && $cached ) return $cached;

		$all    = [];
		$cursor = null;

		do {
			$params = [ 'per_page' => 500 ];
			if ( $cursor ) $params['cursor'] = $cursor;

			$data = $this->get( 'plans', $params );
			if ( is_wp_error( $data ) ) return $data;

			$all    = array_merge( $all, $data['plans'] ?? [] );
			$cursor = $this->next_cursor( $data );
		} while ( $cursor );

		// Index by plan ID
		$indexed = [];
		foreach ( $all as $plan ) {
			$indexed[ $plan['id'] ] = $plan;
		}

		set_transient( $cache_key, $indexed, DAY_IN_SECONDS );
		return $indexed;
	}

	// ── Validation ────────────────────────────────────────────────────────────

	public function get_account(): array|WP_Error {
		return $this->get( 'account' );
	}

	// ── Risky firewall rule detection ─────────────────────────────────────────

	public static function is_risky_rule( string $port, string $source ): bool {
		if ( $source !== '0.0.0.0/0' && $source !== '::/0' ) return false;
		$sensitive = [ '22', '23', '3306', '5432', '6379', '27017', '8080', '8443', '9200' ];
		return in_array( $port, $sensitive, true );
	}

	public static function risky_note( string $port ): string {
		$map = [
			'22'    => 'SSH open to world',
			'23'    => 'Telnet open to world',
			'3306'  => 'MySQL exposed publicly',
			'5432'  => 'PostgreSQL exposed publicly',
			'6379'  => 'Redis exposed publicly',
			'27017' => 'MongoDB exposed publicly',
			'8080'  => 'Alt-HTTP open to world',
			'8443'  => 'Alt-HTTPS open to world',
			'9200'  => 'Elasticsearch exposed publicly',
		];
		return $map[ $port ] ?? "Port {$port} open to world";
	}
}
