<?php
defined( 'ABSPATH' ) || exit;

class WVM_Admin {

	public static function init(): void {
		add_action( 'admin_menu',       [ __CLASS__, 'menu' ] );
		add_action( 'admin_enqueue_scripts', [ __CLASS__, 'assets' ] );
		add_filter( 'admin_body_class', [ __CLASS__, 'body_class' ] );
	}

	// ── Menu ──────────────────────────────────────────────────────────────────

	public static function menu(): void {
		add_menu_page(
			__( 'Vultr Monitor', 'wp-vultr-monitor' ),
			__( 'Vultr Monitor', 'wp-vultr-monitor' ),
			'manage_options',
			WVM_SLUG,
			[ __CLASS__, 'page' ],
			self::menu_icon(),
			81
		);
	}

	public static function page(): void {
		echo '<div id="wvm-root"></div>';
	}

	// ── Body class (for CSS targeting) ────────────────────────────────────────

	public static function body_class( string $classes ): string {
		$screen = get_current_screen();
		if ( $screen && strpos( $screen->id, WVM_SLUG ) !== false ) {
			$classes .= ' wvm-page';
		}
		return $classes;
	}

	// ── Assets ────────────────────────────────────────────────────────────────

	public static function assets( string $hook ): void {
		if ( strpos( $hook, WVM_SLUG ) === false ) return;

		// Upsert any wp-config.php-defined accounts before rendering
		WVM_Settings::sync_config_accounts();

		// CSS
		wp_enqueue_style(
			'wvm-admin',
			WVM_URL . 'assets/css/admin.css',
			[],
			WVM_VERSION
		);

		// React app (depends on wp-element = WP's bundled React)
		wp_enqueue_script(
			'wvm-admin',
			WVM_URL . 'assets/js/admin.js',
			[ 'wp-element' ],
			WVM_VERSION,
			true
		);

		// Detect which constants are in use (for UI hints)
		$config_pattern = defined( 'WVM_VULTR_ACCOUNTS' )
			? 'multi'
			: ( defined( 'WVM_VULTR_API_KEY' ) ? 'single' : 'none' );

		// Pass data to JS
		wp_localize_script( 'wvm-admin', 'WVM', [
			'restUrl'       => esc_url_raw( rest_url( 'wvm/v1/' ) ),
			'nonce'         => wp_create_nonce( 'wp_rest' ),
			'version'       => WVM_VERSION,
			'adminUrl'      => admin_url(),
			'hasAccounts'   => WVM_Settings::has_accounts(),
			'configPattern' => $config_pattern, // 'none' | 'single' | 'multi'
		] );
	}

	// ── SVG icon for menu ─────────────────────────────────────────────────────

	private static function menu_icon(): string {
		// Vultr-style V mark
		return 'data:image/svg+xml;base64,' . base64_encode(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">'
			. '<path d="M4 5l6 10 6-10" stroke="#a7aaad" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
			. '</svg>'
		);
	}
}
