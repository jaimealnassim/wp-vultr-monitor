/* global WVM, wp */
( function () {
	'use strict';

	const { createElement: h, useState, useEffect, useCallback, useRef, Fragment } = wp.element;
	const { restUrl, nonce, version, hasAccounts, configPattern } = window.WVM || {};

	// ── Inject Google Font + M3/Vultr CSS ──────────────────────────────────────
	( function injectCss() {
		const link = document.createElement( 'link' );
		link.rel  = 'stylesheet';
		link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
		document.head.appendChild( link );

		const s = document.createElement( 'style' );
		s.textContent = `
:root{--primary:#0670E8;--primary-dim:#D6E4FF;--primary-text:#001947;--surface:#F7F9FC;--surface-var:#DDE3EA;--on-surface:#181C22;--on-var:#41484F;--outline:#71787F;--outline-var:#C1C7CE;--error:#BA1A1A;--error-bg:#FFDAD6;--warn:#B45309;--warn-bg:#FEF3C7;--ok:#1A7543;--ok-bg:#DCFCE7;--info-bg:#DBEAFE;--r-sm:8px;--r-md:12px;--r-lg:16px;--r-xl:28px;--sh1:0 1px 2px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.08);--sh2:0 2px 6px rgba(0,0,0,.06),0 4px 12px rgba(0,0,0,.08);--sh3:0 4px 16px rgba(0,0,0,.10),0 8px 28px rgba(0,0,0,.10);--hh:56px;--ah:42px;--th:48px;--pad:20px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{-webkit-text-size-adjust:100%}
body,#wvm-root{font-family:'Plus Jakarta Sans',sans-serif;color:var(--on-surface)}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--outline-var);border-radius:99px}
.wvm{display:flex;flex-direction:column;width:100%;min-width:0;min-height:100%;background:#EEF2F8;box-sizing:border-box}
.wvm-hdr{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--outline-var);height:var(--hh);display:flex;align-items:center;padding:0 var(--pad);gap:12px}
.wvm-logo{display:flex;align-items:center;gap:8px;flex-shrink:0}
.wvm-logo-name{font-size:15px;font-weight:700}
.wvm-logo-ver{font-size:10px;font-weight:700;background:var(--primary-dim);color:var(--primary-text);padding:2px 7px;border-radius:99px;flex-shrink:0}
.wvm-spacer{flex:1}
.wvm-hdr-actions{display:flex;align-items:center;gap:8px}
.wvm-acct-bar{position:sticky;top:var(--hh);z-index:40;background:#fff;border-bottom:1px solid var(--outline-var);height:var(--ah);display:flex;align-items:center;padding:0 var(--pad);gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.wvm-acct-bar::-webkit-scrollbar{display:none}
.wvm-acct-lbl{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--on-var);flex-shrink:0;padding-right:4px}
.wvm-chip{flex-shrink:0;display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:99px;font-size:12.5px;font-weight:600;cursor:pointer;border:1.5px solid var(--outline-var);background:#fff;color:var(--on-var);transition:all .15s;white-space:nowrap;font-family:inherit}
.wvm-chip.on{background:var(--primary);color:#fff;border-color:var(--primary)}
.wvm-chip:not(.on):hover{border-color:var(--primary);color:var(--primary)}
.wvm-tab-bar{position:sticky;top:calc(var(--hh) + var(--ah));z-index:30;background:#fff;border-bottom:1px solid var(--outline-var);display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 calc(var(--pad) - 4px)}
.wvm-tab-bar::-webkit-scrollbar{display:none}
.wvm-tab{flex-shrink:0;position:relative;display:flex;align-items:center;gap:6px;padding:0 16px;height:var(--th);font-size:13px;font-weight:600;color:var(--on-var);cursor:pointer;border:none;background:none;white-space:nowrap;transition:color .2s;font-family:inherit}
.wvm-tab:hover{color:var(--primary)}
.wvm-tab.on{color:var(--primary)}
.wvm-tab.on::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:3px;background:var(--primary);border-radius:3px 3px 0 0}
.wvm-tab-ico{opacity:.65;flex-shrink:0}
.wvm-tab.on .wvm-tab-ico{opacity:1}
.wvm-tab-badge{background:var(--error);color:#fff;font-size:10px;font-weight:700;border-radius:99px;padding:1px 5px;line-height:1.4}
.wvm-body{padding:var(--pad);width:100%;min-width:0;box-sizing:border-box}
.wvm-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;gap:10px}
.wvm-empty-title{font-size:18px;font-weight:700;color:var(--on-surface)}
.wvm-empty-sub{font-size:14px;color:var(--on-var);max-width:340px}
.wvm-inst-cards{display:flex;flex-direction:column;gap:12px;width:100%}
.wvm-inst-card{background:#fff;border-radius:var(--r-lg);box-shadow:var(--sh1);border:1px solid var(--outline-var);overflow:hidden;width:100%;box-sizing:border-box;transition:box-shadow .15s}
.wvm-inst-card:hover{box-shadow:var(--sh2)}
.wvm-ic-top{padding:20px 24px 16px;display:flex;flex-direction:column;gap:12px}
.wvm-ic-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.wvm-ic-name{font-size:17px;font-weight:700;color:var(--on-surface)}
.wvm-ic-ip{font-size:12px;color:var(--on-var);background:var(--surface);padding:3px 8px;border-radius:var(--r-sm)}
.wvm-ic-region{font-size:12.5px;color:var(--on-var);margin-left:auto}
.wvm-ic-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wvm-ic-chip{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:500;color:var(--on-var);background:var(--surface);border:1px solid var(--outline-var);padding:4px 10px;border-radius:var(--r-sm)}.wvm-ic-chip-spec{background:var(--primary-dim);color:var(--primary-text);border-color:transparent;font-weight:600}.wvm-ic-chip-cost{background:var(--ok-bg);color:var(--ok);border-color:transparent;font-weight:700}
.wvm-ic-bw{padding:16px 24px 20px;border-top:1px solid var(--outline-var);background:var(--surface)}
.wvm-ic-bw-labels{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--on-var);margin-bottom:8px;flex-wrap:wrap;gap:4px}
.wvm-ic-bw-track{height:10px;background:var(--outline-var);border-radius:99px;overflow:hidden;width:100%}
.wvm-ic-bw-fill{height:100%;border-radius:99px;transition:width .5s cubic-bezier(.4,0,.2,1)}
.wvm-btn{display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border-radius:99px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;border:none;transition:all .15s;white-space:nowrap}
.wvm-btn-sm{padding:5px 11px;font-size:12.5px}
.wvm-btn-filled{background:var(--primary);color:#fff}
.wvm-btn-filled:hover{filter:brightness(1.09);box-shadow:var(--sh2)}
.wvm-btn-tonal{background:var(--primary-dim);color:var(--primary-text)}
.wvm-btn-tonal:hover{filter:brightness(.96)}
.wvm-btn-outlined{background:transparent;color:var(--primary);border:1.5px solid var(--outline-var)}
.wvm-btn-outlined:hover{background:rgba(6,112,232,.04)}
.wvm-btn-ghost{background:transparent;color:var(--on-var);border:1.5px solid var(--outline-var)}
.wvm-btn-ghost:hover{border-color:var(--primary);color:var(--primary)}
.wvm-btn-danger{background:var(--error-bg);color:var(--error);border:1.5px solid rgba(186,26,26,.2)}
.wvm-btn-danger:hover{background:#ffc9c9}
.wvm-ico-btn{width:36px;height:36px;padding:0;border-radius:99px;display:flex;align-items:center;justify-content:center;background:transparent;cursor:pointer;border:1.5px solid var(--outline-var);color:var(--on-var);transition:all .15s;font-family:inherit}
.wvm-ico-btn:hover{border-color:var(--primary);color:var(--primary)}
.wvm-card{background:#fff;border-radius:var(--r-lg);box-shadow:var(--sh1);border:1px solid var(--outline-var);overflow:hidden;width:100%;box-sizing:border-box}
.wvm-card-head{padding:14px 16px 12px;border-bottom:1px solid var(--outline-var);display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.wvm-card-title{font-size:15px;font-weight:700}
.wvm-card-sub{font-size:12.5px;color:var(--on-var);margin-top:2px}
.wvm-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;width:100%}
.wvm-stat-card{padding:18px;display:flex;flex-direction:column;gap:10px}
.wvm-stat-ico{width:30px;height:30px;border-radius:8px;background:var(--primary-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.wvm-stat-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--on-var)}
.wvm-stat-val{font-size:26px;font-weight:700;line-height:1;font-family:'JetBrains Mono',monospace}
.wvm-stat-sub{font-size:12px;color:var(--on-var)}
.wvm-badge{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:600;padding:3px 8px;border-radius:99px}
.wvm-ok{background:var(--ok-bg);color:var(--ok)}.wvm-warn{background:var(--warn-bg);color:var(--warn)}.wvm-err{background:var(--error-bg);color:var(--error)}.wvm-info{background:var(--info-bg);color:#1D4ED8}.wvm-neu{background:var(--surface-var);color:var(--on-var)}
.wvm-prog-wrap{display:flex;flex-direction:column;gap:5px}
.wvm-prog-row{display:flex;justify-content:space-between;font-size:11.5px}
.wvm-prog-track{height:7px;background:var(--surface-var);border-radius:99px;overflow:hidden}
.wvm-prog-fill{height:100%;border-radius:99px;transition:width .5s cubic-bezier(.4,0,.2,1)}
.wvm-p-low{background:var(--primary)}.wvm-p-mid{background:#F59E0B}.wvm-p-high{background:var(--error)}
.wvm-sdot{width:7px;height:7px;border-radius:99px;display:inline-block}
.wvm-sdot-on{background:#16A34A;box-shadow:0 0 0 3px rgba(22,163,74,.15);animation:sdot-pulse 2s infinite}
.wvm-sdot-off{background:var(--error)}.wvm-sdot-idle{background:#F59E0B}
@keyframes sdot-pulse{0%,100%{box-shadow:0 0 0 2px rgba(22,163,74,.2)}50%{box-shadow:0 0 0 5px rgba(22,163,74,.08)}}
.wvm-tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%}
table.dt{width:100%;border-collapse:collapse}
.wvm-inst-grid{display:flex;flex-direction:column;gap:0;width:100%}
.wvm-inst-row{display:grid;grid-template-columns:2fr 1fr 1.2fr 1.3fr 2.2fr 1.1fr 0.9fr;gap:12px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--outline-var);transition:background .1s;width:100%;box-sizing:border-box}
.wvm-inst-row:last-child{border-bottom:none}
.wvm-inst-row:hover{background:rgba(6,112,232,.025)}
.wvm-inst-hdr{display:grid;grid-template-columns:2fr 1fr 1.2fr 1.3fr 2.2fr 1.1fr 0.9fr;gap:12px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--outline-var);width:100%;box-sizing:border-box}
.wvm-inst-hdr-cell{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--on-var);white-space:nowrap}
.wvm-inst-name{font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wvm-inst-ip{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--on-var);margin-top:2px}
.wvm-period-toggle{display:flex;border:1.5px solid var(--outline-var);border-radius:99px;overflow:hidden;flex-shrink:0}
.wvm-period-btn{padding:5px 13px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--on-var);font-family:inherit;transition:all .15s;white-space:nowrap}
.period-btn.on{background:var(--primary);color:#fff}
.wvm-period-btn:not(.on):hover{background:var(--surface-var)}
@media(max-width:900px){.wvm-inst-row,.wvm-inst-hdr{grid-template-columns:1.5fr 1fr 1fr 1.5fr 1fr;}.wvm-inst-row .wvm-hide-md,.wvm-inst-hdr .wvm-hide-md{display:none}}
@media(max-width:600px){.wvm-inst-hdr{display:none}.wvm-inst-row{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:14px}.wvm-inst-row .wvm-hide-sm{display:none}}
table.dt th{padding:10px 14px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--on-var);background:var(--surface);border-bottom:1px solid var(--outline-var);text-align:left;white-space:nowrap}
table.dt td{padding:12px 14px;font-size:13px;border-bottom:1px solid var(--outline-var);vertical-align:middle}
table.dt tr:last-child td{border-bottom:none}
table.dt tr:hover td{background:rgba(6,112,232,.02)}
.wvm-mono{font-family:'JetBrains Mono',monospace;font-size:12px}
.wvm-fw6{font-weight:600}.wvm-fw7{font-weight:700}.wvm-txt-var{color:var(--on-var)}.wvm-txt-sm{font-size:11.5px}
.wvm-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%}
.wvm-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:100%}
.wvm-vgap{display:flex;flex-direction:column;gap:14px;width:100%}
.wvm-alert-item{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid var(--outline-var)}
.wvm-alert-item:last-child{border-bottom:none}
.wvm-a-dot{width:7px;height:7px;border-radius:99px;margin-top:4px;flex-shrink:0}
.wvm-bw-card{padding:18px}
.wvm-bw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
.wvm-bw-stats{display:flex;gap:20px;margin-top:14px;flex-wrap:wrap}
.wvm-bw-stat{display:flex;flex-direction:column;gap:3px}
.wvm-bw-stat-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--on-var)}
.wvm-bw-stat-val{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700}
.wvm-spark{display:flex;align-items:flex-end;gap:2px;height:28px}
.wvm-spark-b{width:5px;border-radius:2px 2px 0 0;background:var(--primary)}
.wvm-fw-banner{display:flex;align-items:center;gap:12px;padding:13px 16px;background:var(--error-bg);border-radius:var(--r-md);border:1px solid rgba(186,26,26,.2);margin-bottom:14px}
.wvm-row-risky td{background:rgba(186,26,26,.03)!important}
.toast-stack{position:fixed;bottom:20px;right:16px;display:flex;flex-direction:column-reverse;gap:8px;z-index:99999;pointer-events:none}
.toast{pointer-events:all;display:flex;align-items:center;gap:10px;padding:11px 14px;background:#262C36;color:#fff;border-radius:var(--r-md);box-shadow:var(--sh3);font-size:13px;font-weight:500;min-width:240px;max-width:min(340px,calc(100vw - 32px));animation:tUp .22s ease}
.toast.out{animation:tDown .18s ease forwards}
.toast-x{margin-left:auto;cursor:pointer;opacity:.6;background:none;border:none;color:#fff;font-size:14px;padding:0 2px;flex-shrink:0}
.toast-x:hover{opacity:1}
@keyframes tUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes tDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(10px)}}
.wvm-divider{height:1px;background:var(--outline-var);margin:16px 0}
.wvm-form-row{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.wvm-form-label{font-size:12.5px;font-weight:600;color:var(--on-surface)}
.wvm-form-input{width:100%;padding:9px 12px;border:1.5px solid var(--outline-var);border-radius:var(--r-sm);font-size:14px;font-family:inherit;color:var(--on-surface);background:#fff;transition:border-color .15s}
.wvm-form-input:focus{outline:none;border-color:var(--primary)}
.wvm-form-select{width:100%;padding:9px 28px 9px 12px;border:1.5px solid var(--outline-var);border-radius:var(--r-sm);font-size:14px;font-family:inherit;color:var(--on-surface);background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371787F' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 8px center;appearance:none;cursor:pointer;transition:border-color .15s}
.wvm-form-select:focus{outline:none;border-color:var(--primary)}
.wvm-form-hint{font-size:11.5px;color:var(--on-var)}
.wvm-toggle{display:flex;align-items:center;gap:10px;cursor:pointer}
.wvm-toggle-track{width:40px;height:22px;border-radius:99px;background:var(--outline-var);position:relative;transition:background .2s;flex-shrink:0}
.toggle-track.on{background:var(--primary)}
.wvm-toggle-thumb{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:99px;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle-track.on .wvm-toggle-thumb{transform:translateX(18px)}
.wvm-code-block{background:#1E2433;color:#E2E8F0;border-radius:var(--r-md);padding:16px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7;overflow-x:auto;white-space:pre;margin-top:8px}
.wvm-code-block .c-comment{color:#6B7BAD}.wvm-code-block .c-key{color:#7DD3FC}.wvm-code-block .c-str{color:#86EFAC}.wvm-code-block .c-fn{color:#C4B5FD}
.wvm-acct-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--outline-var)}
.wvm-acct-row:last-child{border-bottom:none}
.wvm-acct-source-badge{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:99px;background:#F1F0FF;color:#5B50C8;border:1px solid rgba(91,80,200,.2)}
.wvm-snippet-toggle{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--primary);cursor:pointer;background:none;border:none;font-family:inherit;padding:0;margin-top:4px}
.wvm-snippet-toggle:hover{opacity:.8}

@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@media(max-width:900px){.wvm-stat-grid{grid-template-columns:repeat(2,1fr)}.wvm-grid-2{grid-template-columns:1fr}.wvm-grid-3{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){:root{--pad:14px;--hh:52px;--ah:40px;--th:44px}.wvm-logo-ver{display:none}.wvm-hdr-lbl{display:none}.wvm-stat-grid{grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}.wvm-stat-card{padding:14px;gap:8px}.wvm-stat-val{font-size:22px}.wvm-stat-ico{width:26px;height:26px}.wvm-grid-3{grid-template-columns:1fr 1fr;gap:10px}.wvm-grid-2{grid-template-columns:1fr;gap:12px}.wvm-bw-card{padding:14px}.wvm-bw-head{flex-direction:column;gap:8px}.wvm-bw-stats{gap:14px}.wvm-card-head{padding:12px 14px 10px}.wvm-card-title{font-size:14px}.wvm-tab{padding:0 12px;font-size:12.5px;gap:5px}.wvm-btn{padding:7px 12px;font-size:12.5px}.wvm-btn-sm{padding:5px 10px;font-size:12px}.wvm-hdr{top:0}.wvm-acct-bar{top:var(--hh)}.wvm-tab-bar{top:calc(var(--hh) + var(--ah))}}
@media(max-width:400px){.wvm-grid-3{grid-template-columns:1fr}}
`;
		document.head.appendChild( s );
	} )();

	// ── Position app: fixed below admin bar, right of sidebar ─────────────────
	// Reads actual DOM measurements — no WP class/ID dependencies, no !important.
	// This completely bypasses WP's float-based layout constraints.
	( function positionApp() {
		var doPosition = function () {
			var root = document.getElementById( 'wvm-root' );
			var menu = document.getElementById( 'adminmenuwrap' );
			var bar  = document.getElementById( 'wpadminbar' );
			if ( ! root ) return;
			var sideW = menu ? menu.offsetWidth : 0;
			var barH  = bar  ? bar.offsetHeight : 32;
			root.style.position   = 'fixed';
			root.style.top        = barH + 'px';
			root.style.left       = sideW + 'px';
			root.style.right      = '0';
			root.style.bottom     = '0';
			root.style.overflowY  = 'auto';
			root.style.overflowX  = 'hidden';
			root.style.zIndex     = '9990';
			root.style.background = '#EEF2F8';
			root.style.boxSizing  = 'border-box';
		};
		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', doPosition );
		} else {
			doPosition();
		}
		window.addEventListener( 'resize', doPosition );
	} )();

	// ── REST API ───────────────────────────────────────────────────────────────
	const api = {
		get:    ( ep ) => fetch( restUrl + ep, { headers: { 'X-WP-Nonce': nonce } } ).then( r => r.json() ),
		post:   ( ep, d ) => fetch( restUrl + ep, { method: 'POST', headers: { 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' }, body: JSON.stringify( d ) } ).then( r => r.json() ),
		del:    ( ep ) => fetch( restUrl + ep, { method: 'DELETE', headers: { 'X-WP-Nonce': nonce } } ).then( r => r.json() ),
		patch:  ( ep, d ) => fetch( restUrl + ep, { method: 'PATCH', headers: { 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' }, body: JSON.stringify( d ) } ).then( r => r.json() ),
	};

	// ── Helpers ────────────────────────────────────────────────────────────────
	const pct     = ( u, t ) => t > 0 ? Math.round( ( u / t ) * 100 ) : 0;
	const fmt     = n => n >= 1000 ? ( n / 1024 ).toFixed( 1 ) + ' TB' : n + ' GB';
	const fmtRam  = mb => mb >= 1024 ? ( mb / 1024 ).toFixed( 0 ) + ' GB' : mb + ' MB';
	const pCls    = p => p >= 85 ? 'wvm-p-high' : p >= 60 ? 'wvm-p-mid' : 'wvm-p-low';
	const bCls    = p => p >= 85 ? 'wvm-err'  : p >= 60 ? 'wvm-warn' : 'wvm-info';
	const relTime = ts => {
		const secs = Math.floor( ( Date.now() - new Date( ts ).getTime() ) / 1000 );
		if ( secs < 60 ) return 'Just now';
		if ( secs < 3600 ) return Math.floor( secs / 60 ) + 'm ago';
		if ( secs < 86400 ) return Math.floor( secs / 3600 ) + 'h ago';
		return Math.floor( secs / 86400 ) + 'd ago';
	};

	// ── SVG icon ───────────────────────────────────────────────────────────────
	const SPARK_DATA = [ 10, 18, 14, 28, 22, 38, 44, 32, 52, 64, 48, 76, 82, 95 ];

	const Ico = ( { d, size = 18, sw = 1.8, col = 'currentColor' } ) =>
		h( 'svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: col, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' },
			h( 'path', { d } ) );

	const D = {
		overview:  'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		instance:  'M5 12H3m2 0a2 2 0 104 0m-4 0a2 2 0 114 0m0 0h10m-2-6H5m12 0a2 2 0 104 0m-4 0a2 2 0 114 0M5 18h14m-2 0a2 2 0 104 0m-4 0a2 2 0 114 0',
		bandwidth: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		backup:    'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V9c0-2-1-3-3-3H7m0 0V5a2 2 0 012-2h2a2 2 0 012 2v1M9 12l2 2 4-4',
		billing:   'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
		firewall:  'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
		settings:  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
		refresh:   'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
		check:     'M5 13l4 4L19 7',
		alert:     'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		info:      'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		x:         'M6 18L18 6M6 6l12 12',
		plus:      'M12 4v16m8-8H4',
		lock:      'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
		chevron:   'm6 9 6 6 6-6',
		server:    'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
		chip:      'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
	};

	// ── Toast system ───────────────────────────────────────────────────────────
	let _tid = 0;
	const ToastStack = ( { list, dismiss } ) =>
		h( 'div', { className: 'toast-stack' },
			list.map( t =>
				h( 'div', { key: t.id, className: 'toast' + ( t.out ? ' out' : '' ) },
					h( Ico, { d: t.type === 'success' ? D.check : t.type === 'error' ? D.x : D.info, size: 16, sw: 2.2,
						col: t.type === 'success' ? '#4ADE80' : t.type === 'error' ? '#F87171' : '#60A5FA' } ),
					h( 'span', { style: { flex: 1 } }, t.msg ),
					h( 'button', { className: 'toast-x', onClick: () => dismiss( t.id ) }, '✕' )
				)
			)
		);

	// ── Progress bar ───────────────────────────────────────────────────────────
	const ProgBar = ( { used, total, compact } ) => {
		const p = pct( used, total );
		const col = p >= 85 ? 'var(--error)' : p >= 60 ? 'var(--warn)' : 'var(--primary)';
		return h( 'div', { className: 'wvm-prog-wrap' },
			! compact && h( 'div', { className: 'wvm-prog-row' },
				h( 'span', { className: 'wvm-mono wvm-txt-var' }, fmt( used ) + ' / ' + fmt( total ) ),
				h( 'span', { className: 'wvm-mono wvm-fw7', style: { color: col } }, p + '%' )
			),
			h( 'div', { className: 'wvm-prog-track' },
				h( 'div', { className: 'wvm-prog-fill ' + pCls( p ), style: { width: p + '%' } } )
			),
			compact && h( 'div', { className: 'wvm-prog-row' },
				h( 'span', { className: 'wvm-mono wvm-txt-var', style: { fontSize: 11 } }, fmt( used ) ),
				h( 'span', { className: 'wvm-mono wvm-fw7', style: { fontSize: 11, color: col } }, p + '%' )
			)
		);
	};

	// ── Status dot ────────────────────────────────────────────────────────────
	const StatusDot = ( { status } ) => {
		const cls = status === 'running' || status === 'online' ? 'wvm-sdot wvm-sdot-on'
			: status === 'stopped' || status === 'offline' ? 'wvm-sdot wvm-sdot-off' : 'wvm-sdot wvm-sdot-idle';
		const label = status === 'running' ? 'Online' : status === 'stopped' ? 'Offline' : status;
		return h( 'span', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
			h( 'span', { className: cls } ),
			h( 'span', { style: { fontSize: 13, fontWeight: 600, textTransform: 'capitalize' } }, label )
		);
	};

	// ── Overview tab ──────────────────────────────────────────────────────────
	const Overview = ( { instances, alerts, period } ) => {
		const bwField  = period === '30d' ? 'bw_used_30d' : 'bw_used_month';
		const online   = instances.filter( i => i.status === 'running' || i.status === 'online' ).length;
		const offline  = instances.filter( i => i.status === 'stopped' || i.status === 'offline' ).length;
		const highBw   = instances.filter( i => pct( i[ bwField ] || 0, i.bw_total ) >= 80 ).length;
		const total    = instances.reduce( ( s, i ) => s + parseFloat( i.cost ), 0 );

		const stats = [
			{ lbl: 'Instances',     val: instances.length, sub: online + ' online',         icon: D.server,    badge: null },
			{ lbl: 'Offline',       val: offline,          sub: 'Need attention',            icon: D.instance,  badge: offline > 0 ? 'wvm-err' : 'wvm-ok', bl: offline > 0 ? 'Alert' : 'OK' },
			{ lbl: 'High Bandwidth',val: highBw,           sub: '≥80% ' + ( period === '30d' ? '(30 days)' : 'this month' ), icon: D.bandwidth, badge: highBw > 0 ? 'wvm-warn' : 'wvm-ok', bl: highBw > 0 ? 'Warning' : 'OK' },
			{ lbl: 'Monthly Est.',  val: '$' + total.toFixed( 2 ), sub: 'All accounts',      icon: D.billing,   badge: null },
		];

		const top4 = [ ...instances ].sort( ( a, b ) => pct( b[ bwField ] || 0, b.bw_total ) - pct( a[ bwField ] || 0, a.bw_total ) ).slice( 0, 4 );

		return h( Fragment, null,
			h( 'div', { className: 'wvm-stat-grid' },
				stats.map( s =>
					h( 'div', { key: s.lbl, className: 'wvm-card wvm-stat-card' },
						h( 'div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
							h( 'span', { className: 'wvm-stat-lbl' }, s.lbl ),
							h( 'div', { className: 'wvm-stat-ico' }, h( Ico, { d: s.icon, size: 15, col: 'var(--primary)', sw: 2 } ) )
						),
						h( 'div', { className: 'wvm-stat-val' }, s.val ),
						h( 'div', { style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' } },
							s.badge && h( 'span', { className: 'wvm-badge ' + s.badge }, s.bl ),
							h( 'span', { className: 'wvm-stat-sub' }, s.sub )
						)
					)
				)
			),
			h( 'div', { className: 'wvm-grid-2' },
				// Alerts feed
				h( 'div', { className: 'wvm-card' },
					h( 'div', { className: 'wvm-card-head' },
						h( 'div', null,
							h( 'div', { className: 'wvm-card-title' }, 'Recent Alerts' ),
							h( 'div', { className: 'wvm-card-sub' }, 'Last 24 hours across all accounts' )
						)
					),
					alerts.length === 0
						? h( 'div', { style: { padding: '24px 16px', textAlign: 'center', color: 'var(--on-var)', fontSize: 13 } }, 'No alerts — all clear ✓' )
						: alerts.slice( 0, 6 ).map( a =>
							h( 'div', { key: a.id, className: 'wvm-alert-item' },
								h( 'div', { className: 'wvm-a-dot', style: { background: a.severity === 'error' ? 'var(--error)' : a.severity === 'warning' ? '#F59E0B' : 'var(--primary)' } } ),
								h( 'div', { style: { flex: 1 } },
									h( 'div', { style: { fontSize: 13, fontWeight: 500 } }, a.message ),
									h( 'div', { className: 'wvm-txt-sm wvm-txt-var', style: { marginTop: 2 } }, relTime( a.created_at ) )
								)
							)
						)
				),
				// BW snapshot
				h( 'div', { className: 'wvm-card' },
					h( 'div', { className: 'wvm-card-head' },
						h( 'div', null,
							h( 'div', { className: 'wvm-card-title' }, 'Bandwidth Snapshot' ),
							h( 'div', { className: 'wvm-card-sub' }, 'Top usage this month' )
						)
					),
					h( 'div', { style: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 } },
						top4.length === 0
							? h( 'div', { style: { color: 'var(--on-var)', fontSize: 13 } }, 'No instance data yet — run a sync.' )
							: top4.map( i => {
								const used2 = i[ bwField ] || 0;
								const p = pct( used2, i.bw_total );
								return h( 'div', { key: i.id },
									h( 'div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 } },
										h( 'span', { style: { fontSize: 13, fontWeight: 600 } }, i.label ),
										h( 'span', { className: 'wvm-badge ' + bCls( p ) }, p + '%' )
									),
									h( ProgBar, { used: used2, total: i.bw_total } )
								);
							} )
					)
				)
			)
		);
	};

	// ── Instances tab ─────────────────────────────────────────────────────────
	const Instances = ( { instances, period } ) => {
		const bwField = period === '30d' ? 'bw_used_30d' : 'bw_used_month';
		if ( instances.length === 0 ) {
			return h( 'div', { className: 'wvm-empty' },
				h( 'div', { className: 'wvm-empty-title' }, 'No instances synced' ),
				h( 'div', { className: 'wvm-empty-sub' }, 'Add an account and click Sync Now.' )
			);
		}
		return h( 'div', { className: 'wvm-inst-cards' },
			instances.map( i => {
				const used  = i[ bwField ] || 0;
				const total = i.bw_total  || 0;
				const p     = pct( used, total );
				const pCol  = p >= 85 ? 'var(--error)' : p >= 60 ? 'var(--warn)' : 'var(--primary)';
				return h( 'div', { key: i.id, className: 'wvm-inst-card' },
					// ── Top: status + name + IP ──────────────────────────────────
					h( 'div', { className: 'wvm-ic-top' },
						h( 'div', { className: 'wvm-ic-title-row' },
							h( StatusDot, { status: i.status } ),
							h( 'span', { className: 'wvm-ic-name' }, i.label ),
							h( 'span', { className: 'wvm-ic-ip wvm-mono' }, i.ip ),
							h( 'span', { className: 'wvm-ic-region' }, i.region )
						),
						h( 'div', { className: 'wvm-ic-meta' },
							i.vcpu_count > 0 && h( 'span', { className: 'wvm-ic-chip wvm-ic-chip-spec' },
								h( Ico, { d: D.instance, size: 12, sw: 2 } ), ' ', i.vcpu_count, ' vCPU'
							),
							i.ram_mb > 0 && h( 'span', { className: 'wvm-ic-chip wvm-ic-chip-spec' },
								'RAM: ', fmtRam( i.ram_mb )
							),
							i.disk_gb > 0 && h( 'span', { className: 'wvm-ic-chip wvm-ic-chip-spec' },
								'Disk: ', i.disk_gb, ' GB'
							),
							h( 'span', { className: 'wvm-ic-chip' }, i.os || 'Linux' ),
							i.cost > 0 && h( 'span', { className: 'wvm-ic-chip wvm-ic-chip-cost' }, '$' + parseFloat( i.cost ).toFixed( 2 ) + '/mo' ),
							i.backup_enabled
								? h( 'span', { className: 'wvm-badge wvm-ok' }, h( Ico, { d: D.check, size: 11, sw: 2.5 } ), ' Backup ', i.last_backup )
								: h( 'span', { className: 'wvm-badge wvm-err' }, 'No backup' )
						)
					),
					// ── Bottom: bandwidth bar ─────────────────────────────────────
					h( 'div', { className: 'wvm-ic-bw' },
						h( 'div', { className: 'wvm-ic-bw-labels' },
							h( 'span', null, 'Bandwidth — ', period === '30d' ? 'Last 30 days' : 'Current month' ),
							h( 'span', { style: { fontWeight: 700, color: pCol, fontFamily: "'JetBrains Mono', monospace" } },
								fmt( used ), ' / ', fmt( total ), ' (', p, '%)'
							)
						),
						h( 'div', { className: 'wvm-ic-bw-track' },
							h( 'div', { className: 'wvm-ic-bw-fill', style: { width: p + '%', background: pCol } } )
						)
					)
				);
			} )
		);
	};

		// ── Bandwidth tab ─────────────────────────────────────────────────────────
	const Bandwidth = ( { instances, period } ) => {
		const bwField = period === '30d' ? 'bw_used_30d' : 'bw_used_month';
		return h( 'div', { className: 'wvm-vgap' },
			instances.length === 0 && h( 'div', { className: 'wvm-card', style: { padding: 24, textAlign: 'center', color: 'var(--on-var)' } }, 'No data yet. Run a sync first.' ),
			instances.map( i => {
				const used  = i[ bwField ] || 0;
				const total = i.bw_total  || 0;
				const p     = pct( used, total );
				return h( 'div', { key: i.id, className: 'wvm-card wvm-bw-card' },
					h( 'div', { className: 'wvm-bw-head' },
						h( 'div', null,
							h( 'div', { style: { fontWeight: 700, fontSize: 15 } }, i.label ),
							h( 'div', { className: 'wvm-mono wvm-txt-var wvm-txt-sm', style: { marginTop: 3 } }, i.ip + ' · ' + i.region )
						),
						h( 'div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap' } },
							p >= 85 && h( 'span', { className: 'wvm-badge wvm-err' }, h( Ico, { d: D.alert, size: 11, sw: 2 } ), ' Overage Risk' ),
							h( 'span', { className: 'wvm-badge wvm-neu' }, i.plan )
						)
					),
					h( ProgBar, { used, total } ),
					h( 'div', { className: 'wvm-bw-stats' },
						[ [ 'Used', fmt( used ) ], [ 'Remaining', fmt( total - used ) ], [ 'Allowance', fmt( total ) ] ].map( ( [ lbl, val ] ) =>
							h( 'div', { key: lbl, className: 'wvm-bw-stat' },
								h( 'span', { className: 'wvm-bw-stat-lbl' }, lbl ),
								h( 'span', { className: 'wvm-bw-stat-val' }, val )
							)
						),
						h( 'div', { className: 'wvm-bw-stat', style: { marginLeft: 'auto' } },
							h( 'span', { className: 'wvm-bw-stat-lbl' }, '30d Trend' ),
							h( 'div', { className: 'wvm-spark', style: { marginTop: 4 } },
								SPARK_DATA.map( ( v, idx ) =>
									h( 'div', { key: idx, className: 'wvm-spark-b', style: { height: Math.round( ( v / 95 ) * 100 ) + '%', opacity: 0.15 + ( idx / SPARK_DATA.length ) * 0.85 } } )
								)
							)
						)
					)
				);
			} )
		);

	};

	// ── Backups tab ───────────────────────────────────────────────────────────
	const Backups = ( { instances } ) => {
		const ok = instances.filter( i => i.backup_enabled ).length;
		const sumCards = [
			{ lbl: 'Compliant',  val: ok,               badge: 'wvm-ok',   icon: D.check },
			{ lbl: 'No Backup',  val: instances.length - ok, badge: 'wvm-err', icon: D.alert },
			{ lbl: 'Coverage',   val: instances.length > 0 ? Math.round( ( ok / instances.length ) * 100 ) + '%' : '—', badge: 'wvm-info', icon: D.backup },
		];
		return h( 'div', { className: 'wvm-vgap' },
			h( 'div', { className: 'wvm-grid-3' },
				sumCards.map( s =>
					h( 'div', { key: s.lbl, className: 'wvm-card wvm-stat-card' },
						h( 'span', { className: 'wvm-stat-lbl' }, s.lbl ),
						h( 'div', { className: 'wvm-stat-val' }, s.val ),
						h( 'span', { className: 'wvm-badge ' + s.badge }, h( Ico, { d: s.icon, size: 11, sw: 2.5 } ), ' Status' )
					)
				)
			),
			h( 'div', { className: 'wvm-card' },
				h( 'div', { className: 'wvm-tbl-wrap' },
					h( 'table', { className: 'dt' },
						h( 'thead', null,
							h( 'tr', null, [ 'Instance', 'Region', 'Backup', 'Last Run', 'Compliance' ].map( c => h( 'th', { key: c }, c ) ) )
						),
						h( 'tbody', null,
							instances.map( i =>
								h( 'tr', { key: i.id },
									h( 'td', null, h( 'span', { className: 'wvm-fw6' }, i.label ) ),
									h( 'td', { className: 'wvm-txt-var', style: { fontSize: 13 } }, i.region ),
									h( 'td', null, i.backup_enabled ? h( 'span', { className: 'wvm-badge wvm-ok' }, 'Enabled' ) : h( 'span', { className: 'wvm-badge wvm-err' }, 'Disabled' ) ),
									h( 'td', null, h( 'span', { className: 'wvm-mono' }, i.last_backup || '—' ) ),
									h( 'td', null,
										! i.backup_enabled
											? h( 'span', { className: 'wvm-badge wvm-err' }, h( Ico, { d: D.alert, size: 11, sw: 2 } ), ' Non-compliant' )
											: h( 'span', { className: 'wvm-badge wvm-ok' }, h( Ico, { d: D.check, size: 11, sw: 2.5 } ), ' OK' )
									)
								)
							)
						)
					)
				)
			)
		);
	};

	// ── Billing tab ───────────────────────────────────────────────────────────
	const Billing = ( { instances, accounts, billing } ) => {
		// billing = { [account_id]: { summary, line_items, synced_at } }

		// ── Totals: prefer real pending-charges, fall back to plan cost ───────
		const totalPending = Object.values( billing ).reduce( ( s, b ) =>
			s + Math.abs( parseFloat( b.summary?.pending_charges ?? 0 ) ), 0 );
		const totalPlanEst = instances.reduce( ( s, i ) => s + parseFloat( i.cost ), 0 );
		const hasRealData  = totalPending > 0;

		// Per-account billing card data
		const acctBilling = accounts.map( a => {
			const b     = billing[ a.id ] || billing[ String( a.id ) ];
			const pend  = Math.abs( parseFloat( b?.summary?.pending_charges ?? 0 ) );
			const bal   = parseFloat( b?.summary?.balance ?? 0 );
			const inst  = instances.filter( i => String( i.account_id ) === String( a.id ) );
			const est   = inst.reduce( ( s, i ) => s + parseFloat( i.cost ), 0 );
			return { ...a, pending: pend, balance: bal, est, count: inst.length, synced: b?.synced_at };
		} );

		// Match line items to instances by IP for the detail table
		const allLineItems = [];
		Object.entries( billing ).forEach( ( [ acctId, b ] ) => {
			( b.line_items || [] ).forEach( li => {
				const inst = instances.find( i => i.ip === li.ip );
				allLineItems.push( { ...li, acctId, instLabel: inst?.label || li.description } );
			} );
		} );

		const noSync = Object.keys( billing ).length === 0;

		return h( 'div', { className: 'wvm-vgap' },

			// No data banner
			noSync && h( 'div', { style: { padding: '14px 18px', background: 'var(--info-bg)', borderRadius: 'var(--r-md)', border: '1px solid rgba(6,112,232,.2)', display: 'flex', gap: 12, alignItems: 'center' } },
				h( Ico, { d: D.info, size: 18, col: 'var(--primary)', sw: 2 } ),
				h( 'div', null,
					h( 'div', { style: { fontWeight: 700, fontSize: 14, color: 'var(--primary)' } }, 'Billing data not synced yet' ),
					h( 'div', { style: { fontSize: 13, color: 'var(--primary)', opacity: .8 } }, 'Click Sync Now to pull live data from /v2/billing/pending-charges' )
				)
			),

			// Top stat cards
			h( 'div', { className: 'wvm-grid-3' },
				h( 'div', { className: 'wvm-card wvm-stat-card' },
					h( 'span', { className: 'wvm-stat-lbl' }, hasRealData ? 'Pending Charges' : 'Plan Est. Monthly' ),
					h( 'div', { className: 'wvm-stat-val' }, '$' + ( hasRealData ? totalPending : totalPlanEst ).toFixed( 2 ) ),
					h( 'div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
						h( 'span', { className: 'wvm-badge ' + ( hasRealData ? 'wvm-ok' : 'wvm-warn' ) }, hasRealData ? 'Live from Vultr' : 'Estimated' ),
						h( 'span', { className: 'wvm-stat-sub' }, 'All accounts' )
					)
				),
				acctBilling.map( a =>
					h( 'div', { key: a.id, className: 'wvm-card wvm-stat-card' },
						h( 'span', { className: 'wvm-stat-lbl' }, a.label ),
						h( 'div', { className: 'wvm-stat-val' }, '$' + ( a.pending > 0 ? a.pending : a.est ).toFixed( 2 ) ),
						h( 'div', { style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' } },
							a.pending > 0 && h( 'span', { className: 'wvm-badge wvm-ok' }, 'Live' ),
							a.balance !== 0 && h( 'span', { className: 'wvm-stat-sub' }, 'Balance: $' + a.balance.toFixed( 2 ) )
						)
					)
				)
			),

			// Pending charges line items (real data)
			allLineItems.length > 0 && h( 'div', { className: 'wvm-card' },
				h( 'div', { className: 'wvm-card-head' },
					h( 'div', null,
						h( 'div', { className: 'wvm-card-title' }, 'Pending Charges — Current Month' ),
						h( 'div', { className: 'wvm-card-sub' }, 'Live from /v2/billing/pending-charges' )
					)
				),
				h( 'div', { className: 'wvm-tbl-wrap' },
					h( 'table', { className: 'dt' },
						h( 'thead', null,
							h( 'tr', null, [ 'Service', 'IP', 'Unit Price', 'Units', 'Amount', 'Period' ].map( c => h( 'th', { key: c }, c ) ) )
						),
						h( 'tbody', null,
							allLineItems.map( ( li, idx ) =>
								h( 'tr', { key: idx },
									h( 'td', null, h( 'span', { className: 'wvm-fw6', style:{fontSize:13} }, li.instLabel ) ),
									h( 'td', null, h( 'span', { className: 'wvm-mono wvm-txt-var' }, li.ip || '—' ) ),
									h( 'td', null, h( 'span', { className: 'wvm-mono' }, li.unit_price ? '$' + li.unit_price.toFixed( 4 ) : '—' ) ),
								h( 'td', null, h( 'span', { className: 'wvm-mono' }, li.units || '—' ) ),
								h( 'td', null, h( 'span', { className: 'wvm-mono wvm-fw7', style:{color:'var(--primary)'} }, '$' + li.amount.toFixed( 2 ) ) ),
								h( 'td', { className: 'wvm-txt-var', style:{fontSize:12} }, li.start_date ? li.start_date.slice(0,10) + ' → ' + ( li.end_date || '' ).slice(0,10) : '—' )
							)
						)
						)
					)
				)
			),

			// Instance plan-cost table (always shown as reference)
			h( 'div', { className: 'wvm-card' },
				h( 'div', { className: 'wvm-card-head' },
					h( 'div', null,
						h( 'div', { className: 'wvm-card-title' }, 'Plan Pricing Reference' ),
						h( 'div', { className: 'wvm-card-sub' }, hasRealData ? 'Estimates — actual charges shown above' : 'From plan list · synced from Vultr on first run' )
					)
				),
				h( 'div', { className: 'wvm-tbl-wrap' },
					h( 'table', { className: 'dt' },
						h( 'thead', null,
							h( 'tr', null, [ 'Instance', 'IP', 'Plan', 'Est. Cost/mo', 'BW Risk' ].map( c => h( 'th', { key: c }, c ) ) )
						),
						h( 'tbody', null,
							instances.length === 0
								? h( 'tr', null, h( 'td', { colSpan: 5, style: { textAlign: 'center', padding: 24, color: 'var(--on-var)' } }, 'No instances synced yet.' ) )
								: instances.map( i => {
									const p = pct( i.bw_used_month || i.bw_used || 0, i.bw_total );
									return h( 'tr', { key: i.id },
										h( 'td', null, h( 'span', { className: 'wvm-fw6' }, i.label ) ),
										h( 'td', null, h( 'span', { className: 'wvm-mono wvm-txt-var' }, i.ip ) ),
										h( 'td', { className: 'wvm-txt-var', style: { fontSize: 13 } }, i.plan ),
										h( 'td', null,
											parseFloat( i.cost ) > 0
												? h( 'span', { className: 'wvm-mono wvm-fw7' }, '$' + parseFloat( i.cost ).toFixed( 2 ) )
												: h( 'span', { className: 'wvm-badge wvm-warn' }, 'Sync needed' )
										),
										h( 'td', null,
											p >= 85 ? h( 'span', { className: 'wvm-badge wvm-err' }, 'High' )
											: p >= 60 ? h( 'span', { className: 'wvm-badge wvm-warn' }, 'Medium' )
											: h( 'span', { className: 'wvm-badge wvm-ok' }, 'Low' )
										)
									);
								} )
						)
					)
				)
			)
		);
	};

	// ── Firewall tab ──────────────────────────────────────────────────────────
	const Firewall = ( { rules } ) => {
		const risky = rules.filter( r => r.is_risky ).length;
		return h( 'div', { className: 'wvm-vgap' },
			risky > 0 && h( 'div', { className: 'wvm-fw-banner' },
				h( Ico, { d: D.alert, size: 18, col: 'var(--error)', sw: 2 } ),
				h( 'div', null,
					h( 'div', { style: { fontWeight: 700, color: 'var(--error)', fontSize: 14 } }, risky + ' Risky Rule' + ( risky !== 1 ? 's' : '' ) + ' Detected' ),
					h( 'div', { style: { fontSize: 12.5, color: 'var(--error)', opacity: .8 } }, 'Sensitive ports open to 0.0.0.0/0 — review immediately' )
				)
			),
			h( 'div', { className: 'wvm-card' },
				h( 'div', { className: 'wvm-tbl-wrap' },
					h( 'table', { className: 'dt' },
						h( 'thead', null,
							h( 'tr', null, [ 'Group', 'Protocol', 'Port', 'Source', 'Risk', 'Note' ].map( c => h( 'th', { key: c }, c ) ) )
						),
						h( 'tbody', null,
							rules.length === 0
								? h( 'tr', null, h( 'td', { colSpan: 6, style: { textAlign: 'center', padding: 24, color: 'var(--on-var)' } }, 'No firewall rules found.' ) )
								: rules.map( r =>
									h( 'tr', { key: r.id, className: r.is_risky ? 'wvm-row-risky' : '' },
										h( 'td', null, h( 'span', { className: 'wvm-mono wvm-txt-var', style: { fontSize: 11.5 } }, r.group_name ) ),
										h( 'td', null, h( 'span', { className: 'wvm-badge wvm-neu', style: { fontSize: 11 } }, r.protocol ) ),
										h( 'td', null, h( 'span', { className: 'wvm-mono wvm-fw7' }, r.port ) ),
										h( 'td', null,
											h( 'span', { className: 'wvm-mono', style: { fontWeight: r.source === '0.0.0.0/0' ? 700 : 400, color: r.source === '0.0.0.0/0' ? 'var(--error)' : 'inherit', fontSize: 12 } }, r.source )
										),
										h( 'td', null, r.is_risky ? h( 'span', { className: 'wvm-badge wvm-err' }, h( Ico, { d: D.alert, size: 11, sw: 2 } ), ' High' ) : h( 'span', { className: 'wvm-badge wvm-ok' }, 'OK' ) ),
										h( 'td', { className: 'wvm-txt-var', style: { fontSize: 12.5 } }, r.note )
									)
								)
						)
					)
				)
			)
		);
	};

	// ── wp-config code snippet ────────────────────────────────────────────────
	const CodeLine = ( { parts } ) =>
		h( 'div', null, parts.map( ( [ cls, text ], i ) =>
			h( 'span', { key: i, className: cls ? 'c-' + cls : undefined }, text )
		) );

	const WpConfigSnippet = () => {
		const [ open, setOpen ] = useState( false );
		const singleLines = [
			[ [ 'comment', '// wp-config.php — single account' ] ],
			[ [ 'fn', 'define' ], [ null, '( ' ], [ 'key', "'WVM_VULTR_API_KEY'" ], [ null, ', ' ], [ 'str', "'your-vultr-api-key'" ], [ null, ' );' ] ],
			[ [ 'fn', 'define' ], [ null, '( ' ], [ 'key', "'WVM_VULTR_LABEL'" ], [ null, ',   ' ], [ 'str', "'My Server'" ], [ null, ' ); ' ], [ 'comment', '// optional' ] ],
		];
		const multiLines = [
			[ [ 'comment', '// wp-config.php — multiple accounts' ] ],
			[ [ 'fn', 'define' ], [ null, '( ' ], [ 'key', "'WVM_VULTR_ACCOUNTS'" ], [ null, ', json_encode( [' ] ],
			[ [ null, "    [ " ], [ 'str', "'label'" ], [ null, ' => ' ], [ 'str', "'Nahnu Production'" ], [ null, ', ' ], [ 'str', "'api_key'" ], [ null, ' => ' ], [ 'str', "'key_one_here'" ], [ null, " ]," ] ],
			[ [ null, "    [ " ], [ 'str', "'label'" ], [ null, ' => ' ], [ 'str', "'Exercise Library'" ], [ null, ',  ' ], [ 'str', "'api_key'" ], [ null, ' => ' ], [ 'str', "'key_two_here'" ], [ null, " ]," ] ],
			[ [ null, '] ) );' ] ],
		];
		return h( 'div', { style: { marginTop: 4 } },
			h( 'button', { className: 'wvm-snippet-toggle', onClick: () => setOpen( o => ! o ) },
				h( Ico, { d: open ? D.chevron : D.plus, size: 14, sw: 2.2 } ),
				open ? ' Hide wp-config.php examples' : ' Show wp-config.php examples'
			),
			open && h( 'div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 } },
				h( 'div', null,
					h( 'div', { style: { fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--on-var)' } }, 'Single account' ),
					h( 'div', { className: 'wvm-code-block' }, singleLines.map( ( parts, i ) => h( CodeLine, { key: i, parts } ) ) )
				),
				h( 'div', null,
					h( 'div', { style: { fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--on-var)' } }, 'Multiple accounts' ),
					h( 'div', { className: 'wvm-code-block' }, multiLines.map( ( parts, i ) => h( CodeLine, { key: i, parts } ) ) )
				),
				h( 'div', { style: { fontSize: 12, color: 'var(--on-var)', background: 'var(--surface-var)', padding: '8px 12px', borderRadius: 'var(--r-sm)', marginTop: 4 } },
					'Keys are AES-256 encrypted and stored in the DB. Config accounts are read-only and cannot be removed from the dashboard.'
				)
			)
		);
	};

	// ── Settings tab ──────────────────────────────────────────────────────────
	const Settings = ( { accounts, settings, toast, reload } ) => {
		const [ newLabel, setNewLabel ] = useState( '' );
		const [ newKey,   setNewKey   ] = useState( '' );
		const [ adding,   setAdding   ] = useState( false );
		const [ saving,   setSaving   ] = useState( false );
		const [ cfg,      setCfg      ] = useState( settings );

		const configAccounts = accounts.filter( a => a.readonly );
		const dbAccounts     = accounts.filter( a => ! a.readonly );

		const addAccount = async () => {
			if ( ! newLabel || ! newKey ) { toast( 'Label and API key are required', 'error' ); return; }
			setAdding( true );
			const res = await api.post( 'accounts', { label: newLabel, api_key: newKey } );
			setAdding( false );
			if ( res.id ) {
				toast( 'Account "' + newLabel + '" added', 'success' );
				setNewLabel( '' ); setNewKey( '' );
				reload();
			} else {
				toast( res.message || 'Failed — check the API key and try again', 'error' );
			}
		};

		const delAccount = async ( id, label ) => {
			if ( ! confirm( 'Remove account "' + label + '"?' ) ) return;
			const res = await api.del( 'accounts/' + id );
			if ( res.code ) { toast( res.message || 'Could not remove account', 'error' ); return; }
			toast( 'Account removed', 'success' );
			reload();
		};

		const saveSettings = async () => {
			setSaving( true );
			await api.post( 'settings', cfg );
			setSaving( false );
			toast( 'Settings saved', 'success' );
		};

		const Toggle = ( { field, label } ) =>
			h( 'label', { className: 'wvm-toggle', style: { marginBottom: 12 } },
				h( 'div', { className: 'wvm-toggle-track', style: { background: cfg[ field ] ? '#0670E8' : 'var(--outline-var)' }, onClick: () => setCfg( { ...cfg, [ field ]: ! cfg[ field ] } ) },
					h( 'div', { className: 'wvm-toggle-thumb', style: { transform: cfg[ field ] ? 'translateX(18px)' : 'translateX(0)' } } )
				),
				h( 'span', { style: { fontSize: 14 } }, label )
			);

		const AccountRow = ( { acct } ) =>
			h( 'div', { className: 'wvm-acct-row' },
				h( 'div', { style: { width: 8, height: 8, borderRadius: '99px', background: acct.enabled ? '#16A34A' : 'var(--outline-var)', flexShrink: 0 } } ),
				h( 'span', { style: { flex: 1, fontWeight: 600, fontSize: 13.5 } }, acct.label ),
				acct.readonly
					? h( Fragment, null,
						h( 'span', { className: 'wvm-acct-source-badge' },
							h( Ico, { d: D.lock, size: 11, sw: 2.2, col: '#5B50C8' } ), ' wp-config.php'
						)
					)
					: h( Fragment, null,
						h( 'span', { className: 'wvm-badge wvm-neu' }, 'Dashboard' ),
						h( 'button', { className: 'wvm-btn wvm-btn-sm wvm-btn-danger', onClick: () => delAccount( acct.id, acct.label ) },
							h( Ico, { d: D.trash, size: 13, sw: 2 } ), ' Remove'
						)
					)
			);

		return h( 'div', { className: 'wvm-vgap' },

			h( 'div', { className: 'wvm-card' },
				h( 'div', { className: 'wvm-card-head' },
					h( 'div', null,
						h( 'div', { className: 'wvm-card-title' }, 'Vultr Accounts' ),
						h( 'div', { className: 'wvm-card-sub' }, 'AES-256 encrypted at rest. Config accounts are read-only.' )
					)
				),
				h( 'div', { style: { padding: '0 16px' } },
					configAccounts.length > 0 && h( Fragment, null,
						h( 'div', { style: { padding: '12px 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--on-var)' } }, 'From wp-config.php' ),
						configAccounts.map( a => h( AccountRow, { key: a.id, acct: a } ) )
					),
					dbAccounts.length > 0 && h( Fragment, null,
						h( 'div', { style: { padding: '12px 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--on-var)', marginTop: configAccounts.length ? 8 : 0 } }, 'Added via Dashboard' ),
						dbAccounts.map( a => h( AccountRow, { key: a.id, acct: a } ) )
					),
					accounts.length === 0 && h( 'p', { style: { color: 'var(--on-var)', fontSize: 13, padding: '14px 0 4px' } }, 'No accounts yet.' ),
					h( 'div', { className: 'wvm-divider' } ),
					h( 'div', { style: { fontSize: 14, fontWeight: 700, marginBottom: 12 } }, 'Add Account via Dashboard' ),
					h( 'div', { className: 'wvm-form-row' },
						h( 'label', { className: 'wvm-form-label' }, 'Account Label' ),
						h( 'input', { className: 'wvm-form-input', type: 'text', placeholder: 'e.g. Nahnu Production', value: newLabel, onChange: e => setNewLabel( e.target.value ) } )
					),
					h( 'div', { className: 'wvm-form-row' },
						h( 'label', { className: 'wvm-form-label' }, 'Vultr API Key' ),
						h( 'input', { className: 'wvm-form-input', type: 'password', placeholder: 'Paste your Vultr API key', value: newKey, onChange: e => setNewKey( e.target.value ) } ),
						h( 'span', { className: 'wvm-form-hint' }, 'Key is validated live against Vultr before saving.' )
					),
					h( 'div', { style: { paddingBottom: 16 } },
						h( 'button', { className: 'wvm-btn wvm-btn-filled', onClick: addAccount, disabled: adding },
							adding ? 'Validating key…' : h( Fragment, null, h( Ico, { d: D.plus, size: 14, sw: 2.2 } ), ' Add Account' )
						)
					),
					h( WpConfigSnippet, null )
				),
				h( 'div', { style: { height: 16 } } )
			),

			h( 'div', { className: 'wvm-card' },
				h( 'div', { className: 'wvm-card-head' }, h( 'div', null, h( 'div', { className: 'wvm-card-title' }, 'Alert Thresholds' ) ) ),
				h( 'div', { style: { padding: 16 } },
					h( 'div', { className: 'wvm-form-row' },
						h( 'label', { className: 'wvm-form-label' }, 'Bandwidth alert threshold (%)' ),
						h( 'input', { className: 'wvm-form-input', type: 'number', min: 50, max: 99, value: cfg.alert_bw_threshold, onChange: e => setCfg( { ...cfg, alert_bw_threshold: parseInt( e.target.value ) } ) } )
					),
					h( Toggle, { field: 'alert_offline', label: 'Alert when instance goes offline' } ),
					h( Toggle, { field: 'alert_backup_missing', label: 'Alert when backup is disabled' } )
				)
			),

			h( 'div', { className: 'wvm-card' },
				h( 'div', { className: 'wvm-card-head' }, h( 'div', null, h( 'div', { className: 'wvm-card-title' }, 'Notification Channels' ) ) ),
				h( 'div', { style: { padding: 16 } },
					h( Toggle, { field: 'alert_email', label: 'Email notifications' } ),
					cfg.alert_email && h( 'div', { className: 'wvm-form-row', style: { marginLeft: 50, marginBottom: 16 } },
						h( 'label', { className: 'wvm-form-label' }, 'Send to' ),
						h( 'input', { className: 'wvm-form-input', type: 'email', value: cfg.alert_email_to, onChange: e => setCfg( { ...cfg, alert_email_to: e.target.value } ) } )
					),
					h( Toggle, { field: 'alert_admin_notice', label: 'WordPress admin notice' } ),
					h( Toggle, { field: 'alert_slack', label: 'Slack webhook' } ),
					cfg.alert_slack && h( 'div', { className: 'wvm-form-row', style: { marginLeft: 50, marginBottom: 16 } },
						h( 'label', { className: 'wvm-form-label' }, 'Webhook URL' ),
						h( 'input', { className: 'wvm-form-input', type: 'url', placeholder: 'https://hooks.slack.com/…', value: cfg.alert_slack_webhook, onChange: e => setCfg( { ...cfg, alert_slack_webhook: e.target.value } ) } )
					)
				)
			),

			h( 'div', { className: 'wvm-card' },
				h( 'div', { className: 'wvm-card-head' }, h( 'div', null, h( 'div', { className: 'wvm-card-title' }, 'Sync Schedule' ) ) ),
				h( 'div', { style: { padding: 16 } },
					h( 'div', { className: 'wvm-form-row' },
						h( 'label', { className: 'wvm-form-label' }, 'Auto-sync interval' ),
						h( 'select', { className: 'wvm-form-select', value: cfg.sync_interval, onChange: e => setCfg( { ...cfg, sync_interval: e.target.value } ) },
							h( 'option', { value: 'hourly' }, 'Every hour' ),
							h( 'option', { value: 'twicedaily' }, 'Twice daily' ),
							h( 'option', { value: 'daily' }, 'Once daily' )
						),
						h( 'span', { className: 'wvm-form-hint' }, 'Uses WP-Cron. For reliability, configure a real system cron to hit wp-cron.php.' )
					),
					h( 'button', { className: 'wvm-btn wvm-btn-filled', onClick: saveSettings, disabled: saving },
						saving ? 'Saving…' : h( Fragment, null, h( Ico, { d: D.check, size: 14, sw: 2.2 } ), ' Save Settings' )
					)
				)
			)
		);
	};

		// ── Specs tab ─────────────────────────────────────────────────────────────
	const Specs = ( { instances } ) => {
		if ( instances.length === 0 ) {
			return h( 'div', { className: 'wvm-empty' },
				h( 'div', { className: 'wvm-empty-title' }, 'No instances synced' ),
				h( 'div', { className: 'wvm-empty-sub' }, 'Add an account and click Sync Now.' )
			);
		}
		return h( 'div', { className: 'wvm-vgap' },
			instances.map( i => {
				const ramGb = i.ram_mb > 0 ? ( i.ram_mb / 1024 ).toFixed( 0 ) : 0;
				return h( 'div', { key: i.id, className: 'wvm-card', style: { padding: 0, overflow: 'hidden' } },
					// Header
					h( 'div', { style: { padding: '18px 24px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--outline-var)', flexWrap: 'wrap' } },
						h( StatusDot, { status: i.status } ),
						h( 'span', { style: { fontSize: 16, fontWeight: 700 } }, i.label ),
						h( 'span', { className: 'wvm-mono wvm-txt-var', style: { fontSize: 12 } }, i.ip ),
						h( 'span', { style: { marginLeft: 'auto', fontSize: 12.5, color: 'var(--on-var)' } }, i.region ),
						i.cost > 0 && h( 'span', { className: 'wvm-badge wvm-ok', style: { fontSize: 13, fontWeight: 700 } }, '$' + parseFloat( i.cost ).toFixed( 2 ) + '/mo' )
					),
					// Spec grid
					h( 'div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 0 } },
						[
							{ label: 'vCPU', value: i.vcpu_count > 0 ? i.vcpu_count + ' cores' : i.plan, icon: D.instance },
							{ label: 'RAM',  value: ramGb > 0 ? ramGb + ' GB' : '—',                   icon: D.chip },
							{ label: 'Disk', value: i.disk_gb > 0 ? i.disk_gb + ' GB NVMe' : '—',      icon: D.bandwidth },
							{ label: 'OS',   value: i.os || '—',                                         icon: D.server },
							{ label: 'Plan', value: i.plan || '—',                                        icon: D.billing },
							{ label: 'Backup', value: i.backup_enabled ? 'Enabled — ' + i.last_backup : 'Disabled', icon: D.backup, warn: !i.backup_enabled },
						].map( ( s, idx, arr ) =>
							h( 'div', { key: s.label, style: {
								padding: '16px 20px',
								borderRight: idx < arr.length - 1 ? '1px solid var(--outline-var)' : 'none',
								borderTop: '1px solid var(--outline-var)',
							} },
								h( 'div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
									h( Ico, { d: s.icon, size: 13, sw: 2, col: s.warn ? 'var(--error)' : 'var(--primary)' } ),
									h( 'span', { style: { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--on-var)' } }, s.label )
								),
								h( 'div', { style: { fontSize: 14, fontWeight: 600, color: s.warn ? 'var(--error)' : 'var(--on-surface)' } }, s.value )
							)
						)
					)
				);
			} )
		);
	};

		// ── Tabs config ───────────────────────────────────────────────────────────
	const TABS = [
		{ id: 'overview',  label: 'Overview',       icon: D.overview  },
		{ id: 'instances', label: 'Instances',       icon: D.instance  },
		{ id: 'bandwidth', label: 'Bandwidth',       icon: D.bandwidth },
		{ id: 'backups',   label: 'Backups',         icon: D.backup    },
		{ id: 'billing',   label: 'Billing',         icon: D.billing   },
		{ id: 'firewall',  label: 'Firewall Audit',  icon: D.firewall  },
		{ id: 'specs',     label: 'Specs',            icon: D.chip      },
		{ id: 'settings',  label: 'Settings',        icon: D.settings  },
	];

	// ── Empty state (no accounts) ─────────────────────────────────────────────
	const NoAccounts = ( { onGoSettings } ) =>
		h( 'div', { className: 'wvm-empty-state' },
			h( 'svg', { width: 56, height: 56, viewBox: '0 0 56 56', fill: 'none' },
				h( 'rect', { width: 56, height: 56, rx: 14, fill: 'var(--primary-dim)' } ),
				h( 'path', { d: 'M14 20l14 22 14-22', stroke: 'var(--primary)', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' } )
			),
			h( 'div', { className: 'wvm-empty-title' }, 'Welcome to WP Vultr Monitor' ),
			h( 'div', { className: 'wvm-empty-sub' }, 'Add your first Vultr account to start monitoring your VPS instances.' ),
			h( 'button', { className: 'wvm-btn wvm-btn-filled', onClick: onGoSettings },
				h( Ico, { d: D.plus, size: 14, sw: 2.2 } ), ' Add Vultr Account'
			)
		);

	// ── Root App ──────────────────────────────────────────────────────────────
	const App = () => {
		const [ tab,      setTab      ] = useState( hasAccounts ? 'overview' : 'settings' );
		const [ acct,     setAcct     ] = useState( 'all' );
		const [ period,   setPeriod   ] = useState( 'month' ); // 'month' | '30d'
		const [ data,     setData     ] = useState( null );
		const [ loading,  setLoading  ] = useState( true );
		const [ syncing,  setSyncing  ] = useState( false );
		const [ toasts,   setToasts   ] = useState( [] );
		const tabBarRef = useRef( null );

		const addToast = useCallback( ( msg, type = 'success' ) => {
			const id = ++_tid;
			setToasts( t => [ ...t, { id, msg, type } ] );
			setTimeout( () => setToasts( t => t.map( x => x.id === id ? { ...x, out: true } : x ) ), 3400 );
			setTimeout( () => setToasts( t => t.filter( x => x.id !== id ) ), 3650 );
		}, [] );

		const dismissToast = id => {
			setToasts( t => t.map( x => x.id === id ? { ...x, out: true } : x ) );
			setTimeout( () => setToasts( t => t.filter( x => x.id !== id ) ), 220 );
		};

		const load = useCallback( async () => {
			setLoading( true );
			try {
				const params = acct !== 'all' ? '?account_id=' + acct : '';
				const d = await api.get( 'dashboard' + params );
				setData( d );
			} catch ( e ) {
				addToast( 'Failed to load data', 'error' );
			}
			setLoading( false );
		}, [ acct ] );

		useEffect( () => { load(); }, [ load ] );

		// Scroll active tab into view
		useEffect( () => {
			const el = tabBarRef.current && tabBarRef.current.querySelector( '.wvm-tab.on' );
			el && el.scrollIntoView( { inline: 'nearest', behavior: 'smooth', block: 'nearest' } );
		}, [ tab ] );

		const sync = async () => {
			if ( syncing ) return;
			setSyncing( true );
			try {
				const res = await api.post( 'sync' );
				addToast( res.message || 'Sync complete', 'success' );
				await load();
			} catch {
				addToast( 'Sync failed', 'error' );
			}
			setSyncing( false );
		};

		const switchAcct = ( id ) => {
			setAcct( id );
			const lbl = id === 'all' ? 'All Accounts' : ( data && data.accounts.find( a => String( a.id ) === String( id ) ) || {} ).label || id;
			addToast( 'Viewing: ' + lbl, 'info' );
		};

		const accounts   = data ? data.accounts : [];
		const allAccts   = [ { id: 'all', label: 'All Accounts' }, ...accounts ];
		const instances  = data ? data.instances.filter( i => acct === 'all' || String( i.account_id ) === String( acct ) ) : [];
		const fwRules    = data ? data.firewall.filter( r  => acct === 'all' || String( r.account_id )  === String( acct ) ) : [];
		const alerts     = data ? data.alerts   : [];
		const billing    = data ? data.billing   : {};
		const settings   = data ? data.settings  : {};
		const riskyCount = fwRules.filter( r => r.is_risky ).length;
		const noAccts    = accounts.length === 0 && ! loading;

		return h( 'div', { className: 'wvm' },

			// Header
			h( 'header', { className: 'wvm-hdr' },
				h( 'div', { className: 'wvm-logo' },
					h( 'svg', { width: 26, height: 26, viewBox: '0 0 26 26', fill: 'none' },
						h( 'rect', { width: 26, height: 26, rx: 6, fill: '#0670E8' } ),
						h( 'path', { d: 'M6.5 7.5l6.5 11 6.5-11', stroke: '#fff', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' } )
					),
					h( 'span', { className: 'wvm-logo-name' }, 'WP Vultr Monitor' ),
					h( 'span', { className: 'wvm-logo-ver' }, 'v' + version )
				),
				h( 'div', { className: 'wvm-spacer' } ),
				h( 'div', { className: 'wvm-hdr-actions' },
					! noAccts && h( 'button', { className: 'wvm-btn wvm-btn-tonal wvm-btn-sm', onClick: sync, disabled: syncing },
						h( 'svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { animation: syncing ? 'spin 1s linear infinite' : 'none' } },
							h( 'path', { d: D.refresh } )
						),
						h( 'span', { className: 'wvm-hdr-lbl' }, syncing ? 'Syncing…' : 'Sync Now' )
					),
					h( 'button', { className: 'wvm-ico-btn', onClick: () => setTab( 'settings' ), title: 'Settings' },
						h( Ico, { d: D.settings, size: 16, sw: 2 } )
					)
				)
			),

			// Account strip (not shown on settings tab or when no accounts)
			! noAccts && h( 'div', { className: 'wvm-acct-bar' },
				h( 'span', { className: 'wvm-acct-lbl' }, 'Account:' ),
				allAccts.map( a =>
					h( 'button', { key: a.id, className: 'wvm-chip' + ( String( acct ) === String( a.id ) ? ' on' : '' ),
						onClick: () => switchAcct( a.id ) },
						a.id !== 'all' && h( 'span', { style: { width: 6, height: 6, borderRadius: '99px', background: 'currentColor', opacity: .6 } } ),
						a.label
					)
				)
			),

			// Tab bar
			! noAccts && h( 'div', { className: 'wvm-tab-bar', ref: tabBarRef },
				TABS.map( t =>
					h( 'button', { key: t.id, className: 'wvm-tab' + ( tab === t.id ? ' on' : '' ), onClick: () => setTab( t.id ) },
						h( 'svg', { className: 'wvm-tab-ico', width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' },
							h( 'path', { d: t.icon } )
						),
						t.label,
						t.id === 'firewall' && riskyCount > 0 && h( 'span', { className: 'wvm-tab-badge' }, riskyCount )
					)
				)
			),
			// Period toggle — right side of tab bar, visible on BW-aware tabs
			! noAccts && ( tab === 'overview' || tab === 'instances' || tab === 'bandwidth' ) &&
				h( 'div', { style: { background: '#fff', borderBottom: '1px solid var(--outline-var)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 var(--pad)', gap: 8, height: 38, flexShrink: 0 } },
					h( 'span', { style: { fontSize: 11, fontWeight: 700, color: 'var(--on-var)', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'BW Period:' ),
					h( 'div', { className: 'wvm-period-toggle' },
						h( 'button', {
							className: 'wvm-period-btn',
							style: period === 'month' ? { background: '#0670E8', color: '#fff' } : {},
							onClick: () => setPeriod( 'month' )
						}, 'Current Month' ),
						h( 'button', {
							className: 'wvm-period-btn',
							style: period === '30d' ? { background: '#0670E8', color: '#fff' } : {},
							onClick: () => setPeriod( '30d' )
						}, 'Last 30 Days' )
					)
				),
			h( 'main', { className: 'wvm-body' },
				loading && h( 'div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, color: 'var(--on-var)' } },
					h( 'svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--primary)', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { animation: 'spin .7s linear infinite' } },
						h( 'path', { d: D.refresh } )
					),
					'Loading…'
				),
				! loading && noAccts && h( NoAccounts, { onGoSettings: () => setTab( 'settings' ) } ),
				! loading && ! noAccts && tab === 'overview'  && h( Overview,  { instances, alerts, period } ),
				! loading && ! noAccts && tab === 'instances' && h( Instances,  { instances, period } ),
				! loading && ! noAccts && tab === 'bandwidth' && h( Bandwidth,  { instances, period } ),
				! loading && ! noAccts && tab === 'backups'   && h( Backups,    { instances } ),
				! loading && ! noAccts && tab === 'billing'   && h( Billing,    { instances, accounts, billing } ),
				! loading && ! noAccts && tab === 'firewall'  && h( Firewall,   { rules: fwRules } ),
				! loading && ! noAccts && tab === 'specs'     && h( Specs,      { instances } ),
				! loading && tab === 'settings' && h( Settings, { accounts, settings, toast: addToast, reload: load } )
			),

			h( ToastStack, { list: toasts, dismiss: dismissToast } )
		);
	};

	// ── Mount ──────────────────────────────────────────────────────────────────
	const root = document.getElementById( 'wvm-root' );
	if ( root ) {
		wp.element.render( h( App, null ), root );
	}

} )();
