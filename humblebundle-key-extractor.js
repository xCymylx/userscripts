// ==UserScript==
// @name         Humble Bundle Key Extractor
// @namespace    https://github.com/xCymylx/userscripts/
// @version      1.3.0
// @description  Extracts game keys from Humble Bundle purchase/download pages. Auto-reveals unrevealed keys. Can auto-redeem keys on Steam. Also works on membership pages.
// @author       Cymyl
// @updateURL    https://github.com/xCymylx/userscripts/raw/refs/heads/main/humblebundle-key-extractor.js
// @downloadURL  https://github.com/xCymylx/userscripts/raw/refs/heads/main/humblebundle-key-extractor.js
// @icon         https://www.google.com/s2/favicons?domain=humblebundle.com
// @match        https://www.humblebundle.com/home/purchases*
// @match        https://www.humblebundle.com/downloads*
// @match        https://www.humblebundle.com/*/p/*
// @match        https://www.humblebundle.com/monthly/p/*
// @match        https://www.humblebundle.com/membership*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      store.steampowered.com
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
      width: min(640px, 94vw);
      max-height: 85vh;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      z-index: 1000000;
      display: none;
      flex-direction: column;
      gap: 14px;
      overflow: hidden;
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
      min-height: 18px;
    }
    #hb-key-progress .hb-spinner {
      flex-shrink: 0;
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
      min-height: 140px;
      max-height: 35vh;
      overflow-y: auto;
      white-space: pre;
    }

    /* Steam redeem results table */
    #hb-redeem-results {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      max-height: 35vh;
    }
    .hb-redeem-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 10px;
      background: #0d0d1a;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
    }
    .hb-redeem-row-title { color: #e0e0e0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hb-redeem-badge {
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .hb-badge-ok      { background: #14532d; color: #86efac; }
    .hb-badge-owned   { background: #1e3a5f; color: #93c5fd; }
    .hb-badge-error   { background: #4c1919; color: #fca5a5; }
    .hb-badge-pending { background: #2a2a4a; color: #aaa; }

    #hb-key-modal .hb-btn-row {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      flex-shrink: 0;
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
    .hb-action-btn:hover:not(:disabled) { background: #0e9cd8; }
    .hb-action-btn:disabled { background: #444; color: #888; cursor: not-allowed; }
    .hb-action-btn.secondary { background: #2a2a4a; color: #aaa; }
    .hb-action-btn.secondary:hover:not(:disabled) { background: #3a3a5a; color: #fff; }
    .hb-action-btn.danger  { background: #b91c1c; }
    .hb-action-btn.danger:hover:not(:disabled) { background: #dc2626; }
    .hb-action-btn.success { background: #22c55e; }

    /* Tabs */
    .hb-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid #2a2a4a;
      padding-bottom: 0;
      flex-shrink: 0;
    }
    .hb-tab {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #888;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.04em;
      padding: 6px 14px 8px;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .hb-tab:hover { color: #ccc; }
    .hb-tab.active { color: #1cb0f6; border-bottom-color: #1cb0f6; }

    .hb-tab-panel { display: none; flex-direction: column; gap: 10px; overflow: hidden; }
    .hb-tab-panel.active { display: flex; }

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

  // ─── Overlay & Modal ─────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'hb-key-overlay';
  document.body.appendChild(overlay);

  const modal = document.createElement('div');
  modal.id = 'hb-key-modal';
  document.body.appendChild(modal);

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
  // STEAM SESSION — fetch sessionid cookie from Steam (needed for redeem API)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Fetches the Steam register-key page to extract the sessionID embedded
   * in the page JS, confirming the user is logged in.
   * Returns { sessionid, loggedIn } or { loggedIn: false }.
   */
  function getSteamSession() {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://store.steampowered.com/account/registerkey',
        onload(resp) {
          const m = resp.responseText.match(/var\s+g_sessionID\s*=\s*"([^"]+)"/);
          if (m) {
            resolve({ loggedIn: true, sessionid: m[1] });
          } else {
            // Not logged in or page changed
            resolve({ loggedIn: false, sessionid: null });
          }
        },
        onerror() { resolve({ loggedIn: false, sessionid: null }); }
      });
    });
  }

  /**
   * Redeems a single key via Steam's AJAX endpoint.
   * Returns one of: 'ok' | 'owned' | 'error:<message>'
   */
  function redeemKey(key, sessionid) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://store.steampowered.com/account/ajaxregisterkey/',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: `product_key=${encodeURIComponent(key)}&sessionid=${encodeURIComponent(sessionid)}`,
        onload(resp) {
          let json;
          try { json = JSON.parse(resp.responseText); } catch { return resolve('error:Bad response'); }

          // purchase_result_details codes:
          //  9  = already owned
          //  14 = invalid key
          //  15 = already activated by different user
          //  53 = too many activation attempts
          // else check success flag
          if (json.success === 1) {
            resolve('ok');
          } else {
            const code = json.purchase_result_details;
            if (code === 9)  resolve('owned');
            else if (code === 14) resolve('error:Invalid key');
            else if (code === 15) resolve('error:Activated by another account');
            else if (code === 53) resolve('error:Too many attempts — try later');
            else resolve(`error:Code ${code}`);
          }
        },
        onerror() { resolve('error:Network error'); }
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DOWNLOAD PAGE MODE
  // ════════════════════════════════════════════════════════════════════════════

  const REVEAL_TEXT = 'Reveal your Steam key';

  function waitForReveal(keyFieldEl, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const valEl = keyFieldEl.querySelector('.keyfield-value');
      if (valEl && valEl.textContent.trim() !== REVEAL_TEXT && valEl.textContent.trim() !== '') {
        return resolve(valEl.textContent.trim());
      }
      const start = Date.now();
      const iv = setInterval(() => {
        const v = keyFieldEl.querySelector('.keyfield-value');
        const txt = v ? v.textContent.trim() : '';
        if (txt && txt !== REVEAL_TEXT) { clearInterval(iv); resolve(txt); }
        else if (Date.now() - start > timeoutMs) { clearInterval(iv); reject(new Error('timeout')); }
      }, 150);
    });
  }

  async function revealAllKeys(progressEl) {
    const redeemers = Array.from(document.querySelectorAll('.key-redeemer'));
    const unrevealed = redeemers.filter(r => {
      const v = r.querySelector('.keyfield-value');
      return v && v.textContent.trim() === REVEAL_TEXT;
    });
    if (unrevealed.length === 0) return;

    progressEl.innerHTML = `<span class="hb-spinner"></span> Revealing ${unrevealed.length} key${unrevealed.length !== 1 ? 's' : ''}…`;

    await Promise.all(unrevealed.map(async (r, i) => {
      await new Promise(res => setTimeout(res, i * 300));
      const kf = r.querySelector('.js-keyfield');
      if (kf) kf.click();
      try { await waitForReveal(kf); } catch (_) { /* timed out */ }
    }));

    progressEl.innerHTML = '';
  }

  function extractKeys() {
    const results = [];
    document.querySelectorAll('.key-redeemer').forEach(r => {
      const titleEl = r.querySelector('.heading-text h4');
      const keyEl   = r.querySelector('.keyfield-value');
      if (!keyEl) return;
      const key = keyEl.textContent.trim();
      if (!key || key === REVEAL_TEXT) return;
      results.push({ title: titleEl ? titleEl.textContent.trim() : 'Unknown Game', key });
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
      <h2>🎮 Key Extractor</h2>
      <div class="hb-meta" id="hb-key-count"></div>
      <div id="hb-key-progress"></div>

      <div class="hb-tabs">
        <button class="hb-tab active" data-tab="keys">Keys</button>
        <button class="hb-tab" data-tab="redeem">Redeem on Steam</button>
      </div>

      <div class="hb-tab-panel active" id="hb-panel-keys">
        <textarea id="hb-key-textarea" readonly spellcheck="false" style="display:none"></textarea>
      </div>

      <div class="hb-tab-panel" id="hb-panel-redeem">
        <div id="hb-redeem-status" style="font-size:12px;color:#888;min-height:18px;"></div>
        <div id="hb-redeem-results"></div>
      </div>

      <div class="hb-btn-row">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#aaa;cursor:pointer;margin-right:auto;" id="hb-names-label">
          <input type="checkbox" id="hb-include-names" checked style="accent-color:#1cb0f6;"> Include game names
        </label>
        <button class="hb-action-btn secondary" id="hb-key-close">Close</button>
        <button class="hb-action-btn" id="hb-key-copy" disabled>Copy to Clipboard</button>
        <button class="hb-action-btn danger" id="hb-steam-redeem" disabled style="display:none">Redeem All on Steam</button>
      </div>
    `;

    let currentEntries = [];
    let steamSession = null;
    let redeemRunning = false;

    // ── Tabs ──────────────────────────────────────────────────────────────────
    modal.querySelectorAll('.hb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.hb-tab').forEach(t => t.classList.remove('active'));
        modal.querySelectorAll('.hb-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`hb-panel-${tab.dataset.tab}`).classList.add('active');

        const isRedeem = tab.dataset.tab === 'redeem';
        document.getElementById('hb-names-label').style.display = isRedeem ? 'none' : '';
        document.getElementById('hb-key-copy').style.display    = isRedeem ? 'none' : '';
        document.getElementById('hb-steam-redeem').style.display = isRedeem ? '' : 'none';
      });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function updateTextarea() {
      const includeNames = document.getElementById('hb-include-names').checked;
      document.getElementById('hb-key-textarea').value = buildText(currentEntries, includeNames);
    }

    function setCount(n) {
      document.getElementById('hb-key-count').textContent = n === 0
        ? 'No keys found on this page.'
        : `${n} key${n !== 1 ? 's' : ''} found`;
    }

    function buildRedeemRows(entries) {
      const container = document.getElementById('hb-redeem-results');
      container.innerHTML = '';
      entries.forEach(e => {
        const row = document.createElement('div');
        row.className = 'hb-redeem-row';
        row.dataset.key = e.key;
        row.innerHTML = `
          <div class="hb-redeem-row-title" title="${e.key}">${e.title}</div>
          <span class="hb-redeem-badge hb-badge-pending">Pending</span>
        `;
        container.appendChild(row);
      });
    }

    function updateRedeemRow(key, status, message) {
      const row = document.querySelector(`.hb-redeem-row[data-key="${CSS.escape(key)}"]`);
      if (!row) return;
      const badge = row.querySelector('.hb-redeem-badge');
      badge.className = 'hb-redeem-badge';
      if (status === 'ok')    { badge.classList.add('hb-badge-ok');    badge.textContent = '✓ Activated'; }
      else if (status === 'owned')  { badge.classList.add('hb-badge-owned');  badge.textContent = 'Already owned'; }
      else                          { badge.classList.add('hb-badge-error');  badge.textContent = message || 'Error'; }
    }

    // ── Main button: extract ──────────────────────────────────────────────────
    const mainBtn = document.getElementById('hb-key-btn');

    mainBtn.addEventListener('click', async () => {
      mainBtn.disabled = true;
      modal.classList.add('visible');
      overlay.classList.add('visible');

      const progressEl = document.getElementById('hb-key-progress');
      const textarea   = document.getElementById('hb-key-textarea');
      const copyBtn    = document.getElementById('hb-key-copy');
      const redeemBtn  = document.getElementById('hb-steam-redeem');
      const redeemStatus = document.getElementById('hb-redeem-status');

      document.getElementById('hb-key-count').textContent = '';
      textarea.style.display = 'none';
      copyBtn.disabled = true;
      redeemBtn.disabled = true;

      // Step 1: reveal hidden keys
      await revealAllKeys(progressEl);

      // Step 2: extract
      currentEntries = extractKeys();
      setCount(currentEntries.length);
      updateTextarea();
      textarea.style.display = '';
      copyBtn.disabled = currentEntries.length === 0;
      mainBtn.disabled = false;

      if (currentEntries.length === 0) return;

      // Step 3: check Steam login in background
      progressEl.innerHTML = `<span class="hb-spinner"></span> Checking Steam login…`;
      getSteamSession().then(session => {
        progressEl.innerHTML = '';
        steamSession = session;
        if (session.loggedIn) {
          redeemBtn.disabled = false;
          redeemStatus.textContent = `Logged in to Steam. ${currentEntries.length} key${currentEntries.length !== 1 ? 's' : ''} ready to redeem.`;
          buildRedeemRows(currentEntries);
        } else {
          redeemBtn.disabled = true;
          redeemStatus.innerHTML = `Not logged in to Steam. <a href="https://store.steampowered.com/login/" target="_blank" style="color:#1cb0f6;">Log in</a> then re-open this panel.`;
          buildRedeemRows(currentEntries);
        }
      });
    });

    // ── Copy ─────────────────────────────────────────────────────────────────
    document.getElementById('hb-include-names').addEventListener('change', updateTextarea);
    document.getElementById('hb-key-close').addEventListener('click', closeModal);

    document.getElementById('hb-key-copy').addEventListener('click', () => {
      const text = document.getElementById('hb-key-textarea').value;
      const copyBtn = document.getElementById('hb-key-copy');
      const markCopied = () => {
        copyBtn.textContent = '✓ Copied!';
        copyBtn.classList.add('success');
        setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; copyBtn.classList.remove('success'); }, 2000);
      };
      navigator.clipboard.writeText(text).then(markCopied).catch(() => {
        document.getElementById('hb-key-textarea').select();
        document.execCommand('copy');
        markCopied();
      });
    });

    // ── Redeem All ───────────────────────────────────────────────────────────
    document.getElementById('hb-steam-redeem').addEventListener('click', async () => {
      if (redeemRunning || !steamSession?.loggedIn || currentEntries.length === 0) return;
      redeemRunning = true;

      const redeemBtn    = document.getElementById('hb-steam-redeem');
      const redeemStatus = document.getElementById('hb-redeem-status');
      redeemBtn.disabled = true;
      mainBtn.disabled = true;

      const total = currentEntries.length;
      let done = 0, activated = 0, owned = 0, errors = 0;

      for (const entry of currentEntries) {
        redeemStatus.innerHTML = `<span class="hb-spinner" style="display:inline-block;width:10px;height:10px;border:2px solid #f0a500;border-top-color:transparent;border-radius:50%;animation:hb-spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;"></span>Redeeming ${done + 1} of ${total}: ${entry.title}…`;

        const result = await redeemKey(entry.key, steamSession.sessionid);

        if (result === 'ok')    { activated++; updateRedeemRow(entry.key, 'ok'); }
        else if (result === 'owned') { owned++;   updateRedeemRow(entry.key, 'owned'); }
        else { errors++; updateRedeemRow(entry.key, 'error', result.replace('error:', '')); }

        done++;
        // Small delay between keys to be polite to Steam's servers
        if (done < total) await new Promise(r => setTimeout(r, 800));
      }

      redeemStatus.textContent = `Done! Activated: ${activated} | Already owned: ${owned} | Errors: ${errors}`;
      redeemRunning = false;
      mainBtn.disabled = false;
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MEMBERSHIP PAGE MODE
  // ════════════════════════════════════════════════════════════════════════════

  function collectDownloadLinks() {
    const seen = new Set();
    const entries = [];

    function add(label, sublabel, href) {
      const url = new URL(href, location.origin).href;
      if (seen.has(url)) return;
      seen.add(url);
      entries.push({ label, sublabel, url });
    }

    const extrasLink = document.querySelector('a.js-extras-link');
    if (extrasLink) {
      const section = extrasLink.closest('.content-choices-view') || extrasLink.parentElement;
      const heading = section && section.querySelector('h3, .content-choices-title');
      add(heading ? heading.textContent.trim() : 'Current Month', 'Keys & extras download page', extrasLink.href);
    }

    document.querySelectorAll('a.content-choices-footer.js-previous-month-link').forEach(a => {
      add(a.textContent.trim(), 'Previous month keys page', a.href);
    });

    document.querySelectorAll('a.previous-month-link.js-previous-month-link').forEach(a => {
      const view = a.closest('.content-choices-view');
      const heading = view && view.querySelector('.content-choices-title');
      add(heading ? `Get games from ${heading.textContent.trim()}` : a.textContent.trim(), 'Previous month keys page', a.href);
    });

    return entries;
  }

  function buildMembershipPageModal() {
    modal.innerHTML = `
      <h2>📦 Download Pages</h2>
      <div class="hb-meta">
        Keys live on each month's download page — open one below, then use
        the 📋 button there to extract and redeem keys.
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
            <div class="hb-dl-entry-label">${label}<span>${sublabel}</span></div>
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
