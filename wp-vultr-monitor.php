<?php
/**
 * Plugin Name: WP Vultr Monitor
 * Plugin URI:  https://nahnuplugins.com/wp-vultr-monitor
 * Description: Analytics dashboard for monitoring Vultr VPS instances — bandwidth, uptime, backups, billing, and firewall auditing.
 * Version:     1.1.7
 * Author:      Nahnu Plugins
 * Author URI:  https://nahnuplugins.com
 * License:     GPL-2.0+
 * Text Domain: wp-vultr-monitor
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

defined( 'ABSPATH' ) || exit;

define( 'WVM_VERSION', '1.1.7' );
define( 'WVM_FILE',    __FILE__ );
define( 'WVM_DIR',     plugin_dir_path( __FILE__ ) );
define( 'WVM_URL',     plugin_dir_url( __FILE__ ) );
define( 'WVM_SLUG',    'wp-vultr-monitor' );

// Nahnu auto-updater — do not remove
if ( ! defined( 'NAHNU_UPDATER_WORKER_URL' ) ) {
	define( 'NAHNU_UPDATER_WORKER_URL', 'https://nahnu-updates.nahnucdn.com' );
}
require_once WVM_DIR . 'includes/class-nahnu-updater.php';
Nahnu_Updater::register( __FILE__ );

// ── Autoloader ────────────────────────────────────────────────────────────────
spl_autoload_register( function ( $class ) {
	$prefix = 'WVM_';
	if ( strpos( $class, $prefix ) !== 0 ) return;
	$name = strtolower( str_replace( '_', '-', substr( $class, strlen( $prefix ) ) ) );
	$file = WVM_DIR . 'includes/class-' . $name . '.php';
	if ( file_exists( $file ) ) require_once $file;
} );

// ── Lifecycle ─────────────────────────────────────────────────────────────────
register_activation_hook( __FILE__,   [ 'WVM_Install', 'activate' ] );
register_deactivation_hook( __FILE__, [ 'WVM_Install', 'deactivate' ] );

// ── Boot ──────────────────────────────────────────────────────────────────────
add_action( 'plugins_loaded', function () {
	WVM_Install::maybe_upgrade(); // runs dbDelta if DB version is behind
	WVM_Admin::init();
	WVM_Rest::init();
	WVM_Cron::init();
} );
