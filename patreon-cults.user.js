// ==UserScript==
// @name         ES Monster Patreon → Cults3D Promo Code Extractor
// @namespace    https://github.com/xCymylx/userscripts/
// @version      1.0.1
// @license      MIT
// @description  Reads all promo codes from ES Monster Patreon posts and auto-applies them sequentially to the Cults3D cart
// @author       Cymyl
// @updateURL    https://raw.githubusercontent.com/xCymylx/userscripts/main/patreon-cults.user.js
// @downloadURL  https://raw.githubusercontent.com/xCymylx/userscripts/main/patreon-cults.user.js
// @icon         https://www.google.com/s2/favicons?domain=cults3d.com
// @match        https://www.patreon.com/posts/*
// @match        https://cults3d.com/en/cart
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// ==/UserScript==

(function () {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────────────────
  const STORAGE_KEY   = 'cults3d_pending_codes'; // JSON array
  const CODE_PATTERN  = /code\s*👉\s*([A-Za-z0-9_\-]+)/gi;
  const CART_URL      = 'https://cults3d.com/en/cart';
  const BETWEEN_DELAY = 1000; // ms to wait after confirmation before next code
  const TIMEOUT_MS    = 8000; // ms to wait for a response before giving up

  // ─── Patreon side ─────────────────────────────────────────────────────────
  function runOnPatreon() {
    const observer = new MutationObserver(() => extractAndStore());
    observer.observe(document.body, { childList: true, subtree: true });
    extractAndStore();
  }

  function extractAndStore() {
    CODE_PATTERN.lastIndex = 0;
    const bodyText = document.body.innerText || '';
    const codes = [];
    let match;
    while ((match = CODE_PATTERN.exec(bodyText)) !== null) {
      if (!codes.includes(match[1])) codes.push(match[1]);
    }
    if (codes.length === 0) return;

    const existing = JSON.parse(GM_getValue(STORAGE_KEY, '[]'));
    if (JSON.stringify(existing) === JSON.stringify(codes)) return;

    GM_setValue(STORAGE_KEY, JSON.stringify(codes));
    console.log(`[Cults3D Helper] Found ${codes.length} code(s):`, codes);
    showPatreonBanner(codes);
  }

  function showPatreonBanner(codes) {
    document.getElementById('cults3d-banner')?.remove();
    const banner = document.createElement('div');
    banner.id = 'cults3d-banner';
    banner.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:999999;
      background:#1a1a2e; color:#e0e0e0;
      border:1px solid #e94560; border-radius:10px;
      padding:16px 20px; font-family:monospace; font-size:13px;
      box-shadow:0 4px 24px rgba(233,69,96,0.3);
      max-width:340px; line-height:1.7;
    `;
    banner.innerHTML = `
      <div style="font-size:11px;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">
        ${codes.length} Cults3D Code${codes.length > 1 ? 's' : ''} Found
      </div>
      <div style="margin-bottom:12px;">
        ${codes.map((c, i) => `<div>${i + 1}. <span style="color:#e94560;font-weight:bold;">${c}</span></div>`).join('')}
      </div>
      <div style="font-size:11px;color:#888;margin-bottom:10px;">
        Will submit all codes with ${BETWEEN_DELAY / 1000}s delay between each.
      </div>
      <div style="display:flex;gap:8px;">
        <button id="cults3d-apply-btn" style="
          flex:1;background:#e94560;color:#fff;border:none;
          border-radius:6px;padding:7px 10px;cursor:pointer;
          font-family:monospace;font-size:12px;font-weight:bold;">
          Open Cults3D Cart →
        </button>
        <button id="cults3d-dismiss-btn" style="
          background:transparent;color:#888;border:1px solid #444;
          border-radius:6px;padding:7px 10px;cursor:pointer;
          font-family:monospace;font-size:12px;">✕</button>
      </div>
    `;
    document.body.appendChild(banner);
    document.getElementById('cults3d-apply-btn').addEventListener('click', () => {
      GM_openInTab(CART_URL, { active: true });
      banner.remove();
    });
    document.getElementById('cults3d-dismiss-btn').addEventListener('click', () => banner.remove());
  }

  // ─── Cults3D cart side ────────────────────────────────────────────────────
  function runOnCults3D() {
    const codes = JSON.parse(GM_getValue(STORAGE_KEY, '[]'));
    if (codes.length === 0) return;

    console.log(`[Cults3D Helper] Queuing ${codes.length} code(s):`, codes);
    showProgressPanel(codes);

    waitForElement('input[name="cart_coupons[coupon_code]"]', () => {
      runNext(codes, 0);
    });
  }

  function runNext(codes, index) {
    if (index >= codes.length) {
      GM_setValue(STORAGE_KEY, '[]');
      updateProgressPanel(codes, index, 'done');
      console.log('[Cults3D Helper] All codes processed.');
      return;
    }

    updateProgressPanel(codes, index, 'active');
    const code = codes[index];

    const input = document.querySelector('input[name="cart_coupons[coupon_code]"]');
    if (!input) {
      console.warn('[Cults3D Helper] Input not found, retrying...');
      setTimeout(() => runNext(codes, index), 1000);
      return;
    }

    // Clear field first
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      input.value = code;
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const container = input.closest('.field-with-submit') || input.parentElement;
      const submitBtn = container?.querySelector('input[type="submit"][name="commit"]')
                      || document.querySelector('input[type="submit"][value="Apply"]');

      if (!submitBtn) {
        console.warn(`[Cults3D Helper] No Apply button for: ${code}`);
        updateProgressPanel(codes, index, 'skip');
        highlightField(input);
        setTimeout(() => runNext(codes, index + 1), BETWEEN_DELAY);
        return;
      }

      // Snapshot every feedback element currently in the DOM so we only
      // react to *newly added* nodes, not ones already present from a
      // previous code's response.
      const preExisting = new Set(
        document.querySelectorAll(
          '.notice, .flash-notice, .alert, .flash-alert, .error,' +
          '[class*="notice"], [class*="success"], [class*="coupon"],' +
          '[class*="alert"], [class*="error"], [class*="invalid"]'
        )
      );

      console.log(`[Cults3D Helper] Submitting (${index + 1}/${codes.length}): ${code}`);
      submitBtn.click();

      waitForCouponResponse(code, preExisting, TIMEOUT_MS, (status) => {
        updateProgressPanel(codes, index, status);
        setTimeout(() => runNext(codes, index + 1), BETWEEN_DELAY);
      });
    }, 300);
  }

  // Watch for *newly added* feedback nodes only (preExisting is ignored).
  // The callback is guaranteed to fire exactly once.
  function waitForCouponResponse(code, preExisting, timeout, callback) {
    let fired = false;

    function resolve(status) {
      if (fired) return;   // ← guard: only ever fire once
      fired = true;
      observer.disconnect();
      clearTimeout(hardTimer);
      callback(status);
    }

    const SUCCESS_SEL = '.notice, .flash-notice, [class*="notice"], [class*="success"], [class*="coupon"]';
    const ERROR_SEL   = '.alert,  .flash-alert,  .error, [class*="alert"],  [class*="error"],  [class*="invalid"]';

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;          // elements only
          if (preExisting.has(node)) continue;        // ignore pre-existing

          // Check the node itself and any descendants
          const candidates = [node, ...node.querySelectorAll('*')];
          for (const el of candidates) {
            if (preExisting.has(el)) continue;
            const text = el.textContent.toLowerCase();

            if (el.matches(SUCCESS_SEL) &&
                (text.includes('applied') || text.includes(code.toLowerCase()) || text.includes('coupon'))) {
              console.log(`[Cults3D Helper] ✅ Accepted: ${code}`);
              return resolve('success');
            }
            if (el.matches(ERROR_SEL) &&
                (text.includes('invalid') || text.includes('expired') || text.includes('not valid') || text.includes('coupon'))) {
              console.log(`[Cults3D Helper] ❌ Rejected: ${code}`);
              return resolve('rejected');
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const hardTimer = setTimeout(() => {
      console.warn(`[Cults3D Helper] ⏱ Timeout for: ${code}`);
      resolve('timeout');
    }, timeout);
  }

  // ─── Progress panel ───────────────────────────────────────────────────────
  const STATUS_ICON = {
    pending:  { icon: '⏳', color: '#555'    },
    active:   { icon: '▶',  color: '#e94560' },
    success:  { icon: '✅', color: '#4caf50' },
    rejected: { icon: '❌', color: '#f44336' },
    skip:     { icon: '⚠️', color: '#ff9800' },
    timeout:  { icon: '⏱',  color: '#ff9800' },
    done:     { icon: '✅', color: '#4caf50' },
  };

  function showProgressPanel(codes) {
    document.getElementById('cults3d-progress')?.remove();
    const panel = document.createElement('div');
    panel.id = 'cults3d-progress';
    panel.style.cssText = `
      position:fixed; top:20px; right:20px; z-index:999999;
      background:#1a1a2e; color:#e0e0e0;
      border:1px solid #e94560; border-radius:10px;
      padding:16px 20px; font-family:monospace; font-size:13px;
      box-shadow:0 4px 24px rgba(233,69,96,0.25);
      min-width:260px; line-height:1.8;
    `;
    panel.innerHTML = `
      <div style="font-size:11px;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">
        Applying Codes
      </div>
      <div id="cults3d-code-list">
        ${codes.map((c, i) =>
          `<div id="cults3d-row-${i}" style="color:#555;">⏳ ${c}</div>`
        ).join('')}
      </div>
    `;
    document.body.appendChild(panel);
  }

  function updateProgressPanel(codes, index, status) {
    if (status === 'done') {
      const panel = document.getElementById('cults3d-progress');
      if (panel) {
        panel.style.borderColor = '#4caf50';
        panel.querySelector('#cults3d-code-list').innerHTML =
          `<div style="color:#4caf50;">✅ All ${codes.length} code(s) processed!</div>`;
        setTimeout(() => panel.remove(), 5000);
      }
      return;
    }
    const row = document.getElementById(`cults3d-row-${index}`);
    if (!row) return;
    const { icon, color } = STATUS_ICON[status] || STATUS_ICON.pending;
    row.style.color = color;
    row.textContent = `${icon} ${codes[index]}`;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function highlightField(input) {
    input.style.outline    = '2px solid #ff9800';
    input.style.background = '#2a2a1a';
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();
  }

  function waitForElement(selector, callback, timeout = 10000) {
    const el = document.querySelector(selector);
    if (el) { callback(el); return; }
    const obs = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) { obs.disconnect(); callback(found); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), timeout);
  }

  // ─── Router ───────────────────────────────────────────────────────────────
  const host = location.hostname;
  const path = location.pathname;

  if (host.includes('patreon.com') && path.startsWith('/posts/')) {
    runOnPatreon();
  } else if (host.includes('cults3d.com') && path.startsWith('/en/cart')) {
    runOnCults3D();
  }

})();

