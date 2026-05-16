<?php
defined( 'ABSPATH' ) || exit;

class WVM_Cron {

	const HOOK = 'wvm_sync';

	public static function init(): void {
		add_action( self::HOOK, [ __CLASS__, 'run' ] );
	}

	public static function schedule(): void {
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			$settings = WVM_Settings::get();
			wp_schedule_event( time(), $settings['sync_interval'] ?? 'hourly', self::HOOK );
		}
	}

	public static function unschedule(): void {
		$ts = wp_next_scheduled( self::HOOK );
		if ( $ts ) wp_unschedule_event( $ts, self::HOOK );
	}

	public static function reschedule( string $interval ): void {
		self::unschedule();
		wp_schedule_event( time(), $interval, self::HOOK );
	}

	public static function run(): void {
		$accounts = WVM_Settings::get_accounts();
		foreach ( $accounts as $account ) {
			if ( ! $account['enabled'] ) continue;
			WVM_Sync::run_account( $account );
		}
	}

	public static function run_now(): array {
		$accounts = WVM_Settings::get_accounts();
		$results  = [];
		foreach ( $accounts as $account ) {
			if ( ! $account['enabled'] ) continue;
			WVM_Sync::run_account( $account );
			$results[] = $account['label'];
		}
		return $results;
	}

	public static function next_run(): string {
		$ts = wp_next_scheduled( self::HOOK );
		return $ts ? human_time_diff( time(), $ts ) . ' from now' : 'Not scheduled';
	}
}
