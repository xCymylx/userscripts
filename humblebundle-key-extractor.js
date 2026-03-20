// ==UserScript==
// @name         Humble Bundle Key Extractor
// @namespace    https://github.com/xCymylx/userscripts/
// @version      1.2.0
// @description  Extracts game keys from Humble Bundle purchase/download pages into a copyable list. Auto-reveals unrevealed keys. Also works on membership pages.
// @author       Cymyl
// @updateURL    https://github.com/xCymylx/userscripts/raw/refs/heads/main/humblebundle-key-extractor.js
// @downloadURL  https://github.com/xCymylx/userscripts/raw/refs/heads/main/humblebundle-key-extractor.js
// @icon         https://www.google.com/s2/favicons?domain=humblebundle.com
// @match        https://www.humblebundle.com/home/purchases*
// @match        https://www.humblebundle.com/downloads*
// @match        https://www.humblebundle.com/*/p/*
// @match        https://www.humblebundle.com/monthly/p/*
// @match        https://www.humblebundle.com/membership*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  // ─── Detect page type ────────────────────────────────────────────────────────
  const path = window.location.pathname;
  const isMembershipPage = path.startsWith('/membership');

  // ─── Shared Styles ───────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #hb-key-extractor {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    #hb-key-btn {
      background: #1cb0f6;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 0.05em;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      transition: background 0.2s, transform 0.1s;
    }
    #hb-key-btn:hover:not(:disabled) { background: #0e9cd8; transform: translateY(-1px); }
    #hb-key-btn:active:not(:disabled) { transform: translateY(0); }
    #hb-key-btn:disabled { background: #555; cursor: not-allowed; transform: none; }

    #hb-key-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a2e;
      color: #e0e0e0;
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      padding: 24px;
      width: min(580px, 92vw);
      max-height: 80vh;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      z-index: 1000000;
      display: none;
      flex-direction: column;
      gap: 14px;
    }
    #hb-key-modal.visible { display: flex; }

    #hb-key-modal h2 {
      margin: 0;
      font-size: 15px;
      font-weight: bold;
      color: #1cb0f6;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    #hb-key-modal .hb-meta {
      font-size: 11px;
      color: #888;
      margin-top: -8px;
    }

    #hb-key-progress {
      font-size: 12px;
      color: #f0a500;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #hb-key-progress .hb-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid #f0a500;
      border-top-color: transparent;
      border-radius: 50%;
      animation: hb-spin 0.7s linear infinite;
    }
    @keyframes hb-spin { to { transform: rotate(360deg); } }

    #hb-key-textarea {
      background: #0d0d1a;
      color: #c8ffb0;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      padding: 12px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.7;
      resize: vertical;
      min-height: 180px;
      max-height: 50vh;
      overflow-y: auto;
      white-space: pre;
    }

    #hb-key-modal .hb-btn-row {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
    }

    .hb-action-btn {
      background: #1cb0f6;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.04em;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .hb-action-btn:hover { background: #0e9cd8; }
    .hb-action-btn.secondary {
      background: #2a2a4a;
      color: #aaa;
    }
    .hb-action-btn.secondary:hover { background: #3a3a5a; color: #fff; }
    .hb-action-btn.success { background: #22c55e; }

    /* Link list for membership page */
    #hb-dl-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      max-height: 50vh;
    }
    .hb-dl-entry {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: #0d0d1a;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .hb-dl-entry-label {
      font-size: 12px;
      color: #e0e0e0;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .hb-dl-entry-label span {
      color: #888;
      font-size: 11px;
      display: block;
    }
    .hb-dl-open-btn {
      background: #1cb0f6;
      color: #fff;
      border: none;
      border-radius: 5px;
      padding: 5px 12px;
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      transition: background 0.2s;
      text-decoration: none;
      display: inline-block;
    }
    .hb-dl-open-btn:hover { background: #0e9cd8; color: #fff; }

    #hb-key-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 999999;
    }
    #hb-key-overlay.visible { display: block; }
  `;
  document.head.appendChild(style);

  // ─── Overlay ─────────────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'hb-key-overlay';
  document.body.appendChild(overlay);

  // ─── Modal ───────────────────────────────────────────────────────────────────
  const modal = document.createElement('div');
  modal.id = 'hb-key-modal';
  document.body.appendChild(modal);

  // ─── Trigger button ──────────────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.id = 'hb-key-extractor';
  wrapper.innerHTML = `<button id="hb-key-btn">📋 Extract Keys</button>`;
  document.body.appendChild(wrapper);

  function closeModal() {
    modal.classList.remove('visible');
    overlay.classList.remove('visible');
  }
  overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ════════════════════════════════════════════════════════════════════════════
  // DOWNLOAD PAGE MODE
  // ════════════════════════════════════════════════════════════════════════════

  const REVEAL_TEXT = 'Reveal your Steam key';

  /**
   * Wait for a keyfield element's text to change away from the reveal placeholder.
   * Resolves with the revealed key text, or rejects after a timeout.
   */
  function waitForReveal(keyEl, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      // Already revealed
      const current = keyEl.querySelector('.keyfield-value');
      if (current && current.textContent.trim() !== REVEAL_TEXT) {
        return resolve(current.textContent.trim());
      }

      const start = Date.now();
      const interval = setInterval(() => {
        const val = keyEl.querySelector('.keyfield-value');
        if (val && val.textContent.trim() !== REVEAL_TEXT && val.textContent.trim() !== '') {
          clearInterval(interval);
          resolve(val.textContent.trim());
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error('Timed out waiting for key reveal'));
        }
      }, 150);
    });
  }

  /**
   * Click all unrevealed keyfields one at a time with a small delay between each,
   * then wait for all of them to resolve. Updates progress text as it goes.
   */
  async function revealAllKeys(progressEl) {
    const redeemers = Array.from(document.querySelectorAll('.key-redeemer'));
    const unrevealed = redeemers.filter(r => {
      const v = r.querySelector('.keyfield-value');
      return v && v.textContent.trim() === REVEAL_TEXT;
    });

    if (unrevealed.length === 0) return;

    progressEl.innerHTML = `<span class="hb-spinner"></span> Revealing ${unrevealed.length} key${unrevealed.length !== 1 ? 's' : ''}…`;

    const promises = unrevealed.map(async (redeemer, i) => {
      // Stagger clicks slightly to avoid rate limiting
      await new Promise(r => setTimeout(r, i * 300));
      const keyField = redeemer.querySelector('.js-keyfield');
      if (keyField) keyField.click();
      try {
        await waitForReveal(keyField);
      } catch (e) {
        // Key failed to reveal; we'll still read whatever text is there
      }
    });

    await Promise.all(promises);
    progressEl.innerHTML = '';
  }

  function extractKeys() {
    const redeemers = document.querySelectorAll('.key-redeemer');
    const results = [];
    redeemers.forEach(redeemer => {
      const titleEl = redeemer.querySelector('.heading-text h4');
      const keyEl   = redeemer.querySelector('.keyfield-value');
      if (!keyEl) return;
      const key = keyEl.textContent.trim();
      // Skip still-unrevealed entries (reveal timed out)
      if (key === REVEAL_TEXT || key === '') return;
      results.push({
        title: titleEl ? titleEl.textContent.trim() : 'Unknown Game',
        key
      });
    });
    return results;
  }

  function buildText(entries, includeNames) {
    return includeNames
      ? entries.map(e => `${e.title}: ${e.key}`).join('\n')
      : entries.map(e => e.key).join('\n');
  }

  function buildDownloadPageModal() {
    modal.innerHTML = `
      <h2>🎮 Extracted Keys</h2>
      <div class="hb-meta" id="hb-key-count"></div>
      <div id="hb-key-progress"></div>
      <textarea id="hb-key-textarea" readonly spellcheck="false" style="display:none"></textarea>
      <div class="hb-btn-row">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#aaa;cursor:pointer;margin-right:auto;">
          <input type="checkbox" id="hb-include-names" checked style="accent-color:#1cb0f6;"> Include game names
        </label>
        <button class="hb-action-btn secondary" id="hb-key-close">Close</button>
        <button class="hb-action-btn" id="hb-key-copy" disabled>Copy to Clipboard</button>
      </div>
    `;

    let currentEntries = [];

    function updateTextarea() {
      const includeNames = document.getElementById('hb-include-names').checked;
      document.getElementById('hb-key-textarea').value = buildText(currentEntries, includeNames);
    }

    const btn = document.getElementById('hb-key-btn');

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      modal.classList.add('visible');
      overlay.classList.add('visible');

      const progressEl  = document.getElementById('hb-key-progress');
      const countEl     = document.getElementById('hb-key-count');
      const textarea    = document.getElementById('hb-key-textarea');
      const copyBtn     = document.getElementById('hb-key-copy');

      countEl.textContent = '';
      textarea.style.display = 'none';
      copyBtn.disabled = true;

      // Reveal any hidden keys first
      await revealAllKeys(progressEl);
      progressEl.innerHTML = '';

      // Now extract
      currentEntries = extractKeys();
      const count = currentEntries.length;
      countEl.textContent = count === 0
        ? 'No keys found on this page.'
        : `${count} key${count !== 1 ? 's' : ''} found`;

      updateTextarea();
      textarea.style.display = '';
      copyBtn.disabled = false;
      btn.disabled = false;
    });

    document.getElementById('hb-include-names').addEventListener('change', updateTextarea);
    document.getElementById('hb-key-close').addEventListener('click', closeModal);

    document.getElementById('hb-key-copy').addEventListener('click', () => {
      const text = document.getElementById('hb-key-textarea').value;
      const copyBtn = document.getElementById('hb-key-copy');
      const markCopied = () => {
        copyBtn.textContent = '✓ Copied!';
        copyBtn.classList.add('success');
        setTimeout(() => {
          copyBtn.textContent = 'Copy to Clipboard';
          copyBtn.classList.remove('success');
        }, 2000);
      };
      navigator.clipboard.writeText(text).then(markCopied).catch(() => {
        document.getElementById('hb-key-textarea').select();
        document.execCommand('copy');
        markCopied();
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MEMBERSHIP PAGE MODE — find download page links and let user open them
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Collect all download-page links visible on membership pages.
   * Sources:
   *  1. The "Get extras" link on the current month  → /downloads?key=XXXX
   *  2. "Get games from [Month]" footer links       → /membership/month-year
   *  3. Individual previous-month tile links        → /membership/month-year (deduplicated)
   */
  function collectDownloadLinks() {
    const seen = new Set();
    const entries = [];

    function add(label, sublabel, href) {
      const url = new URL(href, location.origin).href;
      if (seen.has(url)) return;
      seen.add(url);
      entries.push({ label, sublabel, url });
    }

    // 1. Current month extras link (has the real ?key= download URL)
    const extrasLink = document.querySelector('a.js-extras-link');
    if (extrasLink) {
      const section = extrasLink.closest('.content-choices-view') || extrasLink.parentElement;
      const heading = section && section.querySelector('h3, .content-choices-title');
      const monthTitle = heading ? heading.textContent.trim() : 'Current Month';
      add(monthTitle, 'Keys & extras download page', extrasLink.href);
    }

    // 2. "Get games from [Month]" footer links in previous months
    document.querySelectorAll('a.content-choices-footer.js-previous-month-link').forEach(a => {
      add(a.textContent.trim(), 'Previous month keys page', a.href);
    });

    // 3. Fallback: individual previous-month tile links
    document.querySelectorAll('a.previous-month-link.js-previous-month-link').forEach(a => {
      const view = a.closest('.content-choices-view');
      const heading = view && view.querySelector('.content-choices-title');
      const label = heading
        ? `Get games from ${heading.textContent.trim()}`
        : a.textContent.trim();
      add(label, 'Previous month keys page', a.href);
    });

    return entries;
  }

  function buildMembershipPageModal() {
    modal.innerHTML = `
      <h2>📦 Download Pages</h2>
      <div class="hb-meta">
        Keys live on each month's download page — open one below, then use
        the 📋 button there to extract keys.
      </div>
      <div id="hb-dl-links"></div>
      <div class="hb-btn-row">
        <button class="hb-action-btn secondary" id="hb-key-close">Close</button>
      </div>
    `;

    document.getElementById('hb-key-btn').addEventListener('click', () => {
      const links = collectDownloadLinks();
      const container = document.getElementById('hb-dl-links');
      container.innerHTML = '';

      if (links.length === 0) {
        container.innerHTML = '<div style="color:#888;font-size:12px;padding:8px 0;">No download links found on this page.</div>';
      } else {
        links.forEach(({ label, sublabel, url }) => {
          const entry = document.createElement('div');
          entry.className = 'hb-dl-entry';
          entry.innerHTML = `
            <div class="hb-dl-entry-label">
              ${label}
              <span>${sublabel}</span>
            </div>
            <a class="hb-dl-open-btn" href="${url}" target="_blank" rel="noopener">Open →</a>
          `;
          container.appendChild(entry);
        });
      }

      modal.classList.add('visible');
      overlay.classList.add('visible');
    });

    document.getElementById('hb-key-close').addEventListener('click', closeModal);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  if (isMembershipPage) {
    buildMembershipPageModal();
  } else {
    buildDownloadPageModal();
  }

})();
