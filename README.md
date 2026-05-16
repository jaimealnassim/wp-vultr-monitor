# WP Vultr Monitor

> **Unofficial plugin.** WP Vultr Monitor is an independent project by [Nahnu Plugins](https://www.nahnuplugins.com) and is not affiliated with, endorsed by, or supported by Vultr (The Constant Company, LLC). Vultr is a trademark of The Constant Company, LLC.

**Analytics dashboard for monitoring Vultr VPS instances — bandwidth, uptime, backups, billing, and firewall auditing — directly from your WordPress admin.**

[![Version](https://img.shields.io/badge/version-1.1.7-blue)](https://github.com/jaimealnassim/wp-vultr-monitor/releases)
[![WordPress](https://img.shields.io/badge/WordPress-6.0%2B-21759b)](https://wordpress.org)
[![PHP](https://img.shields.io/badge/PHP-8.0%2B-777bb4)](https://php.net)
[![License](https://img.shields.io/badge/license-GPL--2.0%2B-green)](https://www.gnu.org/licenses/gpl-2.0.html)

---

## Overview

WP Vultr Monitor connects to the Vultr API v2 and surfaces everything you need to know about your VPS fleet inside a clean React dashboard in your WordPress admin. Add multiple Vultr accounts, track per-instance bandwidth against real plan caps, catch risky firewall rules before they become incidents, and get notified by email or Slack when something goes wrong — all without leaving WordPress.

---

## Features

### Multi-Account Support
- Add and manage multiple Vultr accounts from a single dashboard
- Accounts can be added via the UI or defined as constants in `wp-config.php` (read-only, config-defined accounts cannot be deleted from the dashboard)
- API keys are encrypted at rest using AES-256-CBC keyed from WordPress salts

### Instance Monitoring
- Syncs all instances across your account(s) with auto-pagination
- Per-instance data: label, IP, region, plan, OS, vCPU count, RAM, disk size, and power status (`running`, `stopped`, `starting`, `updating`)
- Monthly and rolling 30-day outbound bandwidth, calculated from Vultr's daily breakdown endpoint

### Accurate Bandwidth Tracking
- Pulls the actual plan bandwidth cap from the Vultr plans list (not the prorated `allowed_bandwidth` field on the instance object)
- Correctly parses `outgoing_bytes` per day for current-month and 30-day rolling totals
- Handles cursor-based pagination correctly — `meta.links.next` is treated as an opaque token, not a URL

### Billing
- Fetches account balance, pending charges total, and last payment date from `/v2/account`
- Fetches pending charge line items from `/v2/billing/pending-charges` and parses per-service costs, including IP extraction from charge descriptions
- Back-fills instance `cost` from the plans list when the instance object returns zero (the Vultr instance object has no `monthly_cost` field — this is sourced from the plans endpoint)
- Plan pricing is cached for 24 hours

### Firewall Auditing
- Syncs all firewall groups and rules
- Flags rules that expose sensitive ports to the public internet (`0.0.0.0/0` or `::/0`):

| Port | Risk Note |
|------|-----------|
| 22 | SSH open to world |
| 23 | Telnet open to world |
| 3306 | MySQL exposed publicly |
| 5432 | PostgreSQL exposed publicly |
| 6379 | Redis exposed publicly |
| 27017 | MongoDB exposed publicly |
| 8080 | Alt-HTTP open to world |
| 8443 | Alt-HTTPS open to world |
| 9200 | Elasticsearch exposed publicly |

### Backup Monitoring
- Detects whether backups are enabled per instance
- Reports time since last backup using human-readable diffs

### Alerting
- **Offline alert** — fires when an instance's power status is `stopped`
- **Bandwidth alert** — configurable threshold (default 80%); escalates to `error` severity at 95%+
- **Missing backup alert** — warns when an instance has no backup enabled
- **Risky firewall alert** — one alert per risky rule detected at sync time
- Duplicate suppression — alerts with the same message within 24 hours are deduplicated
- **Email notifications** — via `wp_mail()` to a configurable address
- **Slack notifications** — via incoming webhook

### Scheduled Sync
- WP-Cron job runs on a configurable interval (default: hourly)
- Manual sync available from the dashboard via a REST endpoint
- Next scheduled sync time shown in the UI

### React Dashboard
- Built on `wp-element` (WordPress's bundled React) — no additional React load
- Requires no build step on the server; the compiled JS bundle is included
- REST API-driven: all data flows through `wp-json/wvm/v1/`

---

## Requirements

- WordPress 6.0 or higher
- PHP 8.0 or higher
- A Vultr account with a Personal Access Token (API key) — [generate one here](https://my.vultr.com/settings/#settingsapi)

---

## Installation

1. Download the latest release ZIP from the [Releases page](https://github.com/jaimealnassim/wp-vultr-monitor/releases)
2. In your WordPress admin, go to **Plugins → Add New → Upload Plugin**
3. Upload the ZIP and click **Install Now**, then **Activate**
4. Navigate to **Vultr Monitor** in the admin sidebar
5. Add your first Vultr account (label + API key) or define it via `wp-config.php` (see below)
6. Click **Sync Now** to pull your data immediately, or wait for the scheduled sync

---

## Configuration

### Option A — Dashboard UI

Go to **Vultr Monitor → Accounts** and add your Vultr API key. Keys are encrypted at rest using AES-256-CBC.

### Option B — `wp-config.php` Constants (recommended for production)

Defining credentials as constants keeps them out of the database entirely. Config-defined accounts appear in the dashboard as read-only.

**Single account:**

```php
define( 'WVM_VULTR_API_KEY', 'your-api-key-here' );
define( 'WVM_VULTR_LABEL',   'My Production Server' ); // optional
```

**Multiple accounts:**

```php
define( 'WVM_VULTR_ACCOUNTS', json_encode( [
    [ 'label' => 'Production',      'api_key' => 'key_1' ],
    [ 'label' => 'Exercise Library','api_key' => 'key_2' ],
] ) );
```

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `alert_bw_threshold` | `80` | Bandwidth % at which a warning alert fires |
| `alert_offline` | `true` | Alert when an instance is stopped |
| `alert_backup_missing` | `true` | Alert when an instance has no backup enabled |
| `alert_email` | `true` | Send email notifications |
| `alert_email_to` | Admin email | Recipient address for email alerts |
| `alert_admin_notice` | `true` | Show alert banner in WP admin |
| `alert_slack` | `false` | Send Slack notifications |
| `alert_slack_webhook` | _(empty)_ | Slack incoming webhook URL |
| `sync_interval` | `hourly` | WP-Cron sync frequency |

---

## REST API

All endpoints require `manage_options` capability (WordPress administrator).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/wp-json/wvm/v1/dashboard` | Full dashboard payload (instances, firewall, alerts, billing, settings) |
| `GET` | `/wp-json/wvm/v1/accounts` | List accounts (no API keys exposed) |
| `POST` | `/wp-json/wvm/v1/accounts` | Add an account (`label`, `api_key`) |
| `DELETE` | `/wp-json/wvm/v1/accounts/{id}` | Delete a DB-managed account |
| `PATCH` | `/wp-json/wvm/v1/accounts/{id}` | Enable/disable an account |
| `POST` | `/wp-json/wvm/v1/sync` | Trigger an immediate sync |
| `GET` | `/wp-json/wvm/v1/alerts` | Fetch alerts (paginated, max 200) |
| `POST` | `/wp-json/wvm/v1/alerts/read` | Mark all alerts as read |
| `GET` | `/wp-json/wvm/v1/settings` | Get plugin settings |
| `POST` | `/wp-json/wvm/v1/settings` | Save plugin settings (JSON body) |

---

## Database Tables

The plugin creates five custom tables on activation and upgrades them automatically using `dbDelta` on version change.

| Table | Purpose |
|---|---|
| `{prefix}wvm_accounts` | Vultr account credentials (encrypted) |
| `{prefix}wvm_instances` | Synced instance data (bandwidth, specs, status, cost) |
| `{prefix}wvm_firewall_rules` | Synced firewall rules with risk flags |
| `{prefix}wvm_alerts` | Alert log with severity and read state |
| `{prefix}wvm_sync_log` | Sync history per account |

---

## Free Plugin

WP Vultr Monitor is completely free. No license key, no account required, no premium tier — just install and go.

New versions are delivered automatically through the **Nahnu Updater**, a lightweight auto-update system built into the plugin. When a new release is published, WordPress notifies you on the **Plugins** page exactly as it would for any plugin from the official directory. Click **Update Now** and you're done.

The updater checks for new releases against Nahnu's update server at `https://nahnu-updates.nahnucdn.com`. No personal data is transmitted — only your current plugin version and WordPress version are sent during the version check.

---

## Changelog

### 1.1.7
- Updated Nahnu auto-updater class

### 1.1.6 — 1.1.0
- Accurate plan bandwidth cap sourced from plans list (not prorated instance field)
- Correct cursor-based pagination for instances and plans endpoints
- Billing sync: pending charges, account balance, and plan cost back-fill
- Rolling 30-day and current-month bandwidth aggregation
- Risky firewall rule detection across 9 sensitive ports
- Multi-account support with `wp-config.php` constant patterns
- AES-256-CBC API key encryption keyed from WordPress salts
- Slack webhook notifications
- `dbDelta` upgrade path for ZIP installs that bypass activation hook

---

## License

GPL-2.0-or-later — see [LICENSE](LICENSE) for full terms.

---

## Author

Built and maintained by [Nahnu Plugins](https://www.nahnuplugins.com) — a WordPress plugin brand by [Nahnu Media](https://www.nahnumedia.com).

- GitHub: [github.com/jaimealnassim/wp-vultr-monitor](https://github.com/jaimealnassim/wp-vultr-monitor)
- More plugins: [nahnuplugins.com](https://www.nahnuplugins.com)

---

> **Disclaimer:** This is an unofficial, independent plugin. It is not affiliated with, endorsed by, or supported by Vultr (The Constant Company, LLC). Vultr is a trademark of The Constant Company, LLC.
