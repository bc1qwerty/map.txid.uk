/**
 * node-explorer.js
 * Lightning node search, top nodes list, node detail panel,
 * network history chart, and all UI event bindings.
 *
 * Depends on: map-data.js, map-i18n.js, map-engine.js (window.txidMap)
 *
 * Improvement #7: Country selection filters top nodes
 */
(function () {
  'use strict';

  var M = window.txidMap;
  var t = M.t;
  var escHtml = M.escHtml;
  var fetchRetry = M.fetchRetry;
  var API = M.API;

  // ── #7: State for country filtering ──
  var allTopNodes = [];
  var selectedCountryCC = null;

  // ── Render top nodes list ──
  function renderTopNodes(nodes, filteredCC) {
    var el = document.getElementById('top-nodes');
    if (!el) return;
    if (!nodes || !nodes.length) {
      el.innerHTML = '<div class="empty-msg">' + t('no_results') + '</div>';
      return;
    }

    var headerHtml = '';
    if (filteredCC) {
      var lang = M.lang;
      var showAllLabel = lang === 'ko' ? '\uC804\uCCB4 \uBCF4\uAE30' : lang === 'ja' ? '\u3059\u3079\u3066\u898B\u308B' : 'Show All';
      var countryName = M.getName(filteredCC);
      var flag = M.FLAGS[filteredCC] || '';
      headerHtml = '<div class="node-filter-bar">' +
        '<span class="node-filter-label">' + escHtml(flag + ' ' + countryName) + '</span>' +
        '<button class="node-filter-clear" id="clear-country-filter">' + escHtml(showAllLabel) + '</button>' +
        '</div>';
    }

    el.innerHTML = headerHtml + nodes.slice(0, 10).map(function (n, i) {
      return '<div class="node-item" data-pubkey="' + escHtml(n.publicKey) + '" role="button" tabindex="0">' +
        '<span class="node-alias">#' + (i + 1) + ' ' + (escHtml(n.alias) || n.publicKey.slice(0, 16) + '\u2026') + '</span>' +
        '<span class="node-capacity">' + ((n.capacity || 0) / 1e8).toFixed(2) + ' BTC</span>' +
      '</div>';
    }).join('');

    // #7: Bind clear filter button
    if (filteredCC) {
      var clearBtn = document.getElementById('clear-country-filter');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          selectedCountryCC = null;
          renderTopNodes(allTopNodes, null);
        });
      }
    }
  }

  // ── Load top nodes from API ──
  async function loadTopNodes() {
    var el = document.getElementById('top-nodes');
    if (!el) return;
    el.innerHTML = '<div class="empty-msg">' + t('loading') + '</div>';
    try {
      var fetchFn = M.cachedFetch || fetchRetry;
      var nodes = await fetchFn(API + '/v1/lightning/nodes/rankings/connectivity', 10000).then(function (r) { return r.json(); });
      allTopNodes = nodes || [];
      selectedCountryCC = null;
      renderTopNodes(allTopNodes, null);
    } catch (e) {
      console.error('loadTopNodes error:', e);
      el.innerHTML = '<div class="empty-msg">' + t('load_fail') + '</div>';
    }
  }

  // ── #7: Filter nodes by country ──
  function filterNodesByCountry(cc) {
    if (!cc || !allTopNodes.length) return;
    selectedCountryCC = cc;

    // Filter nodes that belong to this country
    var countryName = M.EN_NAMES[cc] || '';
    var filtered = allTopNodes.filter(function (n) {
      // Check multiple country fields
      var nodeCountry = (n.country && (n.country.en || n.country.de || '')) || '';
      var nodeIso = n.iso_code || n.country_id || '';
      return nodeIso.toUpperCase() === cc ||
        nodeCountry.toLowerCase().indexOf(countryName.toLowerCase()) !== -1;
    });

    if (filtered.length > 0) {
      renderTopNodes(filtered, cc);
    } else {
      // If no match found in current data, show message but keep data
      var el = document.getElementById('top-nodes');
      if (el) {
        var lang = M.lang;
        var showAllLabel = lang === 'ko' ? '\uC804\uCCB4 \uBCF4\uAE30' : lang === 'ja' ? '\u3059\u3079\u3066\u898B\u308B' : 'Show All';
        var flag = M.FLAGS[cc] || '';
        el.innerHTML = '<div class="node-filter-bar">' +
          '<span class="node-filter-label">' + escHtml(flag + ' ' + M.getName(cc)) + '</span>' +
          '<button class="node-filter-clear" id="clear-country-filter">' + escHtml(showAllLabel) + '</button>' +
          '</div>' +
          '<div class="empty-msg">' + t('no_results') + '</div>';
        var clearBtn = document.getElementById('clear-country-filter');
        if (clearBtn) {
          clearBtn.addEventListener('click', function () {
            selectedCountryCC = null;
            renderTopNodes(allTopNodes, null);
          });
        }
      }
    }
  }

  // ── Listen for country-selected events (#7) ──
  document.addEventListener('country-selected', function (e) {
    var cc = e.detail && e.detail.cc;
    if (cc && M.currentTab === 'ln') {
      filterNodesByCountry(cc);
    }
  });

  // ── Search for a node ──
  async function searchNode() {
    var q = document.getElementById('node-search-input')?.value.trim();
    if (!q) return;
    var resultsEl = document.getElementById('node-search-results');
    var topEl = document.getElementById('top-nodes');
    if (!resultsEl) return;
    // If it's a full pubkey, load detail directly
    if (/^[0-9a-f]{66}$/.test(q)) { await loadNodeDetail(q); return; }
    if (topEl) topEl.innerHTML = '<div class="empty-msg">' + t('searching') + '</div>';
    try {
      var fetchFn = M.cachedFetch || fetchRetry;
      var res = await fetchFn(API + '/v1/lightning/search?searchText=' + encodeURIComponent(q) + '&resultAmount=10', 10000).then(function (r) { return r.json(); });
      var nodes = res.nodes || [];
      if (!nodes.length) {
        if (topEl) topEl.innerHTML = '<div class="empty-msg">' + t('no_results') + '</div>';
        return;
      }
      if (nodes.length === 1) { await loadNodeDetail(nodes[0].publicKey); return; }
      renderTopNodes(nodes, null);
    } catch (e) {
      console.error('searchNode error:', e);
      if (topEl) topEl.innerHTML = '<div class="empty-msg">' + t('search_error') + '</div>';
    }
  }

  // ── Load node detail panel ──
  async function loadNodeDetail(pubkey) {
    var el = document.getElementById('node-detail');
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = '<div class="empty-msg">' + t('loading') + '</div>';
    try {
      var fetchFn = M.cachedFetch || fetchRetry;
      var n = await fetchFn(API + '/v1/lightning/nodes/' + pubkey, 10000).then(function (r) { return r.json(); });
      var lang = M.lang;
      el.innerHTML =
        '<div class="nd-title">' + (escHtml(n.alias) || pubkey.slice(0, 20) + '\u2026') + '</div>' +
        '<div class="nd-row"><span class="nd-label">Public Key</span><span class="nd-val nd-pubkey">' + escHtml(pubkey) + '</span></div>' +
        '<div class="nd-row"><span class="nd-label">' + t('total_capacity') + '</span><span class="nd-val">' + ((n.capacity || 0) / 1e8).toFixed(4) + ' BTC</span></div>' +
        '<div class="nd-row"><span class="nd-label">' + t('channels') + '</span><span class="nd-val">' + (n.active_channel_count || n.channels || 0).toLocaleString() + ' ' + t('active') + '</span></div>' +
        '<div class="nd-row"><span class="nd-label">' + t('country') + '</span><span class="nd-val">' + escHtml(n.country?.en || n.city?.en || n.country?.de || t('unknown')) + '</span></div>' +
        '<div class="nd-row"><span class="nd-label">' + t('first_seen') + '</span><span class="nd-val">' + ((n.first_seen || n.firstSeen) ? new Date((n.first_seen || n.firstSeen) * 1000).toLocaleDateString(lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'ko-KR') : '\u2014') + '</span></div>' +
        '<div class="nd-row"><span class="nd-label">' + t('last_update') + '</span><span class="nd-val">' + ((n.updated_at || n.updatedAt) ? new Date((n.updated_at || n.updatedAt) * 1000).toLocaleDateString(lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'ko-KR') : '\u2014') + '</span></div>';
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      el.innerHTML = '<div class="empty-msg">' + t('node_load_fail') + '</div>';
    }
  }

  // ── Load network history stats ──
  async function loadNetworkHistory() {
    var el = document.getElementById('network-chart');
    if (!el) return;
    try {
      var fetchFn = M.cachedFetch || fetchRetry;
      var d = await fetchFn(API + '/v1/lightning/statistics/2y', 15000).then(function (r) { return r.json(); });
      if (!Array.isArray(d) || !d.length) return;
      var cur = d[0], old = d[d.length - 1];
      var getNodes = function (x) { return (x.clearnet_nodes || 0) + (x.tor_nodes || 0) + (x.unannounced_nodes || 0) + (x.clearnet_tor_nodes || 0); };
      var chDiff = cur.channel_count - old.channel_count;
      var ndDiff = getNodes(cur) - getNodes(old);
      var capDiff = (cur.total_capacity - old.total_capacity) / 1e8;
      var sign = function (v) { return v > 0 ? '+' : ''; };
      el.innerHTML =
        '<div class="network-stat-row"><span class="network-stat-label">' + t('total_node_count') + '</span><span class="network-stat-val">' + getNodes(cur).toLocaleString() + ' <small class="' + (ndDiff >= 0 ? 'diff-positive' : 'diff-negative') + '">' + sign(ndDiff) + ndDiff.toLocaleString() + '</small></span></div>' +
        '<div class="network-stat-row"><span class="network-stat-label">Clearnet</span><span class="network-stat-val">' + (cur.clearnet_nodes || 0).toLocaleString() + '</span></div>' +
        '<div class="network-stat-row"><span class="network-stat-label">Tor</span><span class="network-stat-val">' + (cur.tor_nodes || 0).toLocaleString() + '</span></div>' +
        '<div class="network-stat-row"><span class="network-stat-label">' + t('channel_count') + '</span><span class="network-stat-val">' + cur.channel_count.toLocaleString() + ' <small class="' + (chDiff >= 0 ? 'diff-positive' : 'diff-negative') + '">' + sign(chDiff) + chDiff.toLocaleString() + '</small></span></div>' +
        '<div class="network-stat-row"><span class="network-stat-label">' + t('total_capacity_label') + '</span><span class="network-stat-val">' + ((cur.total_capacity || 0) / 1e8).toFixed(0) + ' BTC <small class="' + (capDiff >= 0 ? 'diff-positive' : 'diff-negative') + '">' + sign(capDiff) + capDiff.toFixed(0) + '</small></span></div>' +
        '<div class="network-stat-row"><span class="network-stat-label">' + t('reference') + '</span><span class="network-stat-val" style="font-size:.65rem;color:var(--text3)">' + t('change_2y') + '</span></div>';
    } catch (e) {
      console.error('loadNetworkHistory error:', e);
    }
  }

  // ── Expose on shared namespace (for map-engine.js to call) ──
  M.loadTopNodes = loadTopNodes;
  M.loadNetworkHistory = loadNetworkHistory;
  M.searchNode = searchNode;
  M.loadNodeDetail = loadNodeDetail;
  M.filterNodesByCountry = filterNodesByCountry;

  // ── Event listeners ──
  // Language
  document.getElementById('lang-btn')?.addEventListener('click', M.toggleLang);
  document.querySelectorAll('#lang-menu button').forEach(function (btn) {
    var l = btn.textContent === '\uD55C\uAD6D\uC5B4' ? 'ko' : btn.textContent === 'English' ? 'en' : 'ja';
    btn.addEventListener('click', function () { M.setLang(l); });
  });

  // Theme
  document.getElementById('theme-btn')?.addEventListener('click', M.toggleTheme);

  // Tabs (mobile only)
  document.getElementById('tab-ln')?.addEventListener('click', function () { M.switchTab('ln'); });
  document.getElementById('tab-mining')?.addEventListener('click', function () { M.switchTab('mining'); });

  // Node search
  document.getElementById('node-search-btn')?.addEventListener('click', searchNode);
  document.getElementById('node-search-input')?.addEventListener('keydown', function (e) { if (e.key === 'Enter') searchNode(); });

  // Top nodes click -> show detail
  document.getElementById('top-nodes')?.addEventListener('click', function (e) {
    var row = e.target.closest('[data-pubkey]');
    if (row) loadNodeDetail(row.dataset.pubkey);
  });
  document.getElementById('top-nodes')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var row = e.target.closest('[data-pubkey]');
      if (row) loadNodeDetail(row.dataset.pubkey);
    }
  });

  // Node search results click -> show detail
  document.getElementById('node-search-results')?.addEventListener('click', function (e) {
    var row = e.target.closest('[data-pubkey]');
    if (row) loadNodeDetail(row.dataset.pubkey);
  });

  // Responsive resize
  window.addEventListener('resize', function () {
    clearTimeout(window._mapResize);
    window._mapResize = setTimeout(function () {
      var gs = M.getGlobeState ? M.getGlobeState() : null;
      if (gs) gs.handleResize();
    }, 300);
  });

  // Mobile hamburger
  document.getElementById('hamburger-btn')?.addEventListener('click', function () {
    var panel = document.getElementById('hamburger-panel');
    if (!panel) return;
    var open = panel.classList.toggle('open');
    this.setAttribute('aria-expanded', String(open));
    if (open) M.updateHamburger();
  });

  document.addEventListener('click', function (e) {
    var wrap = document.querySelector('.hamburger-wrap');
    var panel = document.getElementById('hamburger-panel');
    if (wrap && panel && !wrap.contains(e.target)) {
      panel.classList.remove('open');
      document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('#hamburger-panel .settings-lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      M.setLang(btn.dataset.lang);
      document.getElementById('hamburger-panel')?.classList.remove('open');
      document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
    });
  });

  document.getElementById('hamburger-theme-btn')?.addEventListener('click', function () {
    M.toggleTheme();
    M.updateHamburger();
  });
})();
