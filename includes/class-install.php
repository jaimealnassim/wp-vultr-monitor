<?php
defined( 'ABSPATH' ) || exit;

class WVM_Install {

	// ── Table names ───────────────────────────────────────────────────────────
	public static function tables(): array {
		global $wpdb;
		return [
			'accounts'       => $wpdb->prefix . 'wvm_accounts',
			'instances'      => $wpdb->prefix . 'wvm_instances',
			'firewall_rules' => $wpdb->prefix . 'wvm_firewall_rules',
			'alerts'         => $wpdb->prefix . 'wvm_alerts',
			'sync_log'       => $wpdb->prefix . 'wvm_sync_log',
		];
	}

	// ── Activation ────────────────────────────────────────────────────────────
	public static function activate(): void {
		self::create_tables();
		WVM_Cron::schedule();
		if ( ! get_option( 'wvm_settings' ) ) {
			update_option( 'wvm_settings', self::default_settings() );
		}
		update_option( 'wvm_db_version', WVM_VERSION );
	}

	// ── Deactivation ──────────────────────────────────────────────────────────
	public static function deactivate(): void {
		WVM_Cron::unschedule();
	}

	// ── Upgrade check — runs on every plugins_loaded ──────────────────────────
	/**
	 * If the stored DB version doesn't match WVM_VERSION, re-run create_tables()
	 * so dbDelta can add any new columns or tables added since the last install.
	 * This is the standard WP plugin upgrade pattern and handles ZIP uploads
	 * that bypass the activation hook.
	 */
	public static function maybe_upgrade(): void {
		if ( get_option( 'wvm_db_version' ) === WVM_VERSION ) return;
		self::create_tables();
		if ( ! get_option( 'wvm_settings' ) ) {
			update_option( 'wvm_settings', self::default_settings() );
		}
		update_option( 'wvm_db_version', WVM_VERSION );
	}

	// ── DB Tables ─────────────────────────────────────────────────────────────
	public static function create_tables(): void {
		global $wpdb;
		$charset = $wpdb->get_charset_collate();
		$t       = self::tables();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		dbDelta( "CREATE TABLE {$t['accounts']} (
			id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			label      VARCHAR(100)    NOT NULL DEFAULT '',
			api_key    TEXT            NOT NULL,
			enabled    TINYINT(1)      NOT NULL DEFAULT 1,
			source     VARCHAR(20)     NOT NULL DEFAULT 'db',
			created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY source (source)
		) $charset;" );

		dbDelta( "CREATE TABLE {$t['instances']} (
			id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			account_id      BIGINT UNSIGNED NOT NULL,
			vultr_id        VARCHAR(60)     NOT NULL DEFAULT '',
			label           VARCHAR(120)    NOT NULL DEFAULT '',
			ip              VARCHAR(45)     NOT NULL DEFAULT '',
			region          VARCHAR(80)     NOT NULL DEFAULT '',
			plan            VARCHAR(80)     NOT NULL DEFAULT '',
			status          VARCHAR(30)     NOT NULL DEFAULT 'unknown',
			vcpu_count      SMALLINT        NOT NULL DEFAULT 0,
			ram_mb          INT             NOT NULL DEFAULT 0,
			disk_gb         INT             NOT NULL DEFAULT 0,
			bw_used         BIGINT UNSIGNED NOT NULL DEFAULT 0,
			bw_used_month   BIGINT UNSIGNED NOT NULL DEFAULT 0,
			bw_used_30d     BIGINT UNSIGNED NOT NULL DEFAULT 0,
			bw_total        BIGINT UNSIGNED NOT NULL DEFAULT 0,
			cost            DECIMAL(10,4)   NOT NULL DEFAULT 0,
			backup_enabled  TINYINT(1)      NOT NULL DEFAULT 0,
			last_backup     VARCHAR(60)     NOT NULL DEFAULT '',
			uptime_pct      DECIMAL(5,2)    NOT NULL DEFAULT 0,
			os              VARCHAR(80)     NOT NULL DEFAULT '',
			raw_json        LONGTEXT,
			synced_at       DATETIME,
			PRIMARY KEY (id),
			KEY account_id (account_id),
			KEY vultr_id (vultr_id)
		) $charset;" );

		dbDelta( "CREATE TABLE {$t['firewall_rules']} (
			id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			account_id     BIGINT UNSIGNED NOT NULL,
			group_id       VARCHAR(60)     NOT NULL DEFAULT '',
			group_name     VARCHAR(120)    NOT NULL DEFAULT '',
			instance_label VARCHAR(120)    NOT NULL DEFAULT '',
			protocol       VARCHAR(10)     NOT NULL DEFAULT 'TCP',
			port           VARCHAR(30)     NOT NULL DEFAULT '',
			source         VARCHAR(60)     NOT NULL DEFAULT '',
			is_risky       TINYINT(1)      NOT NULL DEFAULT 0,
			note           VARCHAR(200)    NOT NULL DEFAULT '',
			synced_at      DATETIME,
			PRIMARY KEY (id),
			KEY account_id (account_id)
		) $charset;" );

		dbDelta( "CREATE TABLE {$t['alerts']} (
			id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			account_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			severity   VARCHAR(20)     NOT NULL DEFAULT 'info',
			message    TEXT            NOT NULL,
			is_read    TINYINT(1)      NOT NULL DEFAULT 0,
			created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY account_id (account_id),
			KEY is_read (is_read)
		) $charset;" );

		dbDelta( "CREATE TABLE {$t['sync_log']} (
			id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			account_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			type       VARCHAR(40)     NOT NULL DEFAULT 'full',
			status     VARCHAR(20)     NOT NULL DEFAULT 'ok',
			details    TEXT,
			created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY account_id (account_id)
		) $charset;" );
	}

	// ── Default settings ──────────────────────────────────────────────────────
	public static function default_settings(): array {
		return [
			'alert_bw_threshold'   => 80,
			'alert_offline'        => true,
			'alert_backup_missing' => true,
			'alert_email'          => true,
			'alert_email_to'       => get_option( 'admin_email' ),
			'alert_admin_notice'   => true,
			'alert_slack'          => false,
			'alert_slack_webhook'  => '',
			'sync_interval'        => 'hourly',
		];
	}
}
