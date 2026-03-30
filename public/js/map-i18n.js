/**
 * map-i18n.js
 * Internationalization (i18n) support for the Bitcoin node map.
 * Provides t() translation function, language switching, and theme toggling.
 *
 * Depends on: map-data.js (window.txidMap)
 */
(function () {
  'use strict';

  var M = window.txidMap = window.txidMap || {};

  // ── Determine language ──
  var pageLang = window.__pageLang || 'en';
  var lang = localStorage.getItem('lang') || pageLang;
  M.lang = lang;
  M.pageLang = pageLang;

  // ── Header navigation labels ──
  var LABELS = {
    ko: {'\uD0D0\uC0C9\uAE30':'\uD0D0\uC0C9\uAE30', '\uB3C4\uAD6C':'\uB3C4\uAD6C', '\uC2DC\uAC01\uD654':'\uC2DC\uAC01\uD654', '\uD1B5\uACC4':'\uD1B5\uACC4', '\uB178\uB4DC':'\uB178\uB4DC', '\uC9C0\uB3C4':'\uC9C0\uB3C4', '\uD3EC\uD2B8\uD3F4\uB9AC\uC624':'\uD3EC\uD2B8\uD3F4\uB9AC\uC624', '\uC804\uC1A1':'\uC804\uC1A1', '\uBC30\uC6B0\uAE30':'\uBC30\uC6B0\uAE30', '\uC575\uBAA8\uC74C':'\uC575\uBAA8\uC74C'},
    en: {'\uD0D0\uC0C9\uAE30':'Explorer', '\uB3C4\uAD6C':'Tools', '\uC2DC\uAC01\uD654':'Viz', '\uD1B5\uACC4':'Stats', '\uB178\uB4DC':'Nodes', '\uC9C0\uB3C4':'Map', '\uD3EC\uD2B8\uD3F4\uB9AC\uC624':'Portfolio', '\uC804\uC1A1':'TX', '\uBC30\uC6B0\uAE30':'Learn', '\uC575\uBAA8\uC74C':'Apps'},
    ja: {'\uD0D0\uC0C9\uAE30':'\u63A2\u7D22', '\uB3C4\uAD6C':'\u30C4\u30FC\u30EB', '\uC2DC\uAC01\uD654':'\u53EF\u8996\u5316', '\uD1B5\uACC4':'\u7D71\u8A08', '\uB178\uB4DC':'\u30CE\u30FC\u30C9', '\uC9C0\uB3C4':'\u5730\u56F3', '\uD3EC\uD2B8\uD3F4\uB9AC\uC624':'\u8CC7\u7523', '\uC804\uC1A1':'\u9001\u91D1', '\uBC30\uC6B0\uAE30':'\u5B66\u7FD2', '\uC575\uBAA8\uC74C':'\u30A2\u30D7\u30EA'},
  };
  M.LABELS = LABELS;

  // ── Translation strings ──
  var i18n = {
    ko: {
      loading: '\uB85C\uB529 \uC911\u2026',
      total_nodes: '\uCD1D \uB178\uB4DC \uC218', channels: '\uCC44\uB110 \uC218', capacity: '\uCD1D \uC6A9\uB7C9',
      active_pools: '\uD65C\uC131 \uB9C8\uC774\uB2DD \uD480', blocks_7d: '\uCD5C\uADFC 7\uC77C \uBE14\uB85D',
      node_label: '\uB178\uB4DC', block_label: '\uBE14\uB85D',
      load_fail: '\uB370\uC774\uD130 \uB85C\uB4DC \uC2E4\uD328',
      searching: '\uAC80\uC0C9 \uC911\u2026', no_results: '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
      search_error: '\uAC80\uC0C9 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
      total_capacity: '\uCD1D \uC6A9\uB7C9', active: '\uD65C\uC131', country: '\uAD6D\uAC00',
      first_seen: '\uCCAB \uB4F1\uC7A5', last_update: '\uB9C8\uC9C0\uB9C9 \uC5C5\uB370\uC774\uD2B8', unknown: '\uC54C \uC218 \uC5C6\uC74C',
      node_load_fail: '\uB178\uB4DC \uC815\uBCF4 \uB85C\uB4DC \uC2E4\uD328',
      total_node_count: '\uCD1D \uB178\uB4DC \uC218', channel_count: '\uCC44\uB110 \uC218',
      total_capacity_label: '\uCD1D \uC6A9\uB7C9', reference: '\uAE30\uC900', change_2y: '2\uB144 \uC804 \uB300\uBE44 \uBCC0\uD654',
      quad_ln: '\uB77C\uC774\uD2B8\uB2DD', quad_mining: '\uB9C8\uC774\uB2DD', quad_fullnode: '\uD480 \uB178\uB4DC', quad_isp: 'ISP',
      quad_ln_unit: '\uB178\uB4DC', quad_mining_unit: '\uBE14\uB85D', quad_fullnode_unit: '\uB178\uB4DC', quad_isp_unit: 'ISP',
      isp_concentration: '\uC0C1\uC704 3\uC0AC \uC810\uC720\uC728',
      click_expand: '\uD074\uB9AD\uD558\uC5EC \uD655\uB300', press_esc: 'ESC\uB85C \uBCF5\uADC0',
    },
    en: {
      loading: 'Loading\u2026',
      total_nodes: 'Total Nodes', channels: 'Channels', capacity: 'Capacity',
      active_pools: 'Active Pools', blocks_7d: '7-day Blocks',
      node_label: 'nodes', block_label: 'blocks',
      load_fail: 'Failed to load data',
      searching: 'Searching...', no_results: 'No results found.',
      search_error: 'Search error occurred.',
      total_capacity: 'Total Capacity', active: 'active', country: 'Country',
      first_seen: 'First Seen', last_update: 'Last Updated', unknown: 'Unknown',
      node_load_fail: 'Failed to load node info',
      total_node_count: 'Total Nodes', channel_count: 'Channels',
      total_capacity_label: 'Total Capacity', reference: 'Reference', change_2y: 'Change over 2 years',
      quad_ln: 'Lightning', quad_mining: 'Mining', quad_fullnode: 'Full Nodes', quad_isp: 'ISP',
      quad_ln_unit: 'nodes', quad_mining_unit: 'blocks', quad_fullnode_unit: 'nodes', quad_isp_unit: 'ISPs',
      isp_concentration: 'Top 3 share',
      click_expand: 'Click to expand', press_esc: 'ESC to return',
    },
    ja: {
      loading: '\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026',
      total_nodes: '\u7DCF\u30CE\u30FC\u30C9\u6570', channels: '\u30C1\u30E3\u30F3\u30CD\u30EB\u6570', capacity: '\u7DCF\u5BB9\u91CF',
      active_pools: '\u30A2\u30AF\u30C6\u30A3\u30D6\u30D7\u30FC\u30EB', blocks_7d: '7\u65E5\u9593\u30D6\u30ED\u30C3\u30AF',
      node_label: '\u30CE\u30FC\u30C9', block_label: '\u30D6\u30ED\u30C3\u30AF',
      load_fail: '\u30C7\u30FC\u30BF\u53D6\u5F97\u5931\u6557',
      searching: '\u691C\u7D22\u4E2D\u2026', no_results: '\u691C\u7D22\u7D50\u679C\u304C\u3042\u308A\u307E\u305B\u3093\u3002',
      search_error: '\u691C\u7D22\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002',
      total_capacity: '\u7DCF\u5BB9\u91CF', active: '\u30A2\u30AF\u30C6\u30A3\u30D6', country: '\u56FD',
      first_seen: '\u521D\u51FA\u73FE', last_update: '\u6700\u7D42\u66F4\u65B0', unknown: '\u4E0D\u660E',
      node_load_fail: '\u30CE\u30FC\u30C9\u60C5\u5831\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F',
      total_node_count: '\u7DCF\u30CE\u30FC\u30C9\u6570', channel_count: '\u30C1\u30E3\u30CD\u30EB\u6570',
      total_capacity_label: '\u7DCF\u5BB9\u91CF', reference: '\u57FA\u6E96', change_2y: '2\u5E74\u524D\u304B\u3089\u306E\u5909\u5316',
      quad_ln: '\u30E9\u30A4\u30C8\u30CB\u30F3\u30B0', quad_mining: '\u30DE\u30A4\u30CB\u30F3\u30B0', quad_fullnode: '\u30D5\u30EB\u30CE\u30FC\u30C9', quad_isp: 'ISP',
      quad_ln_unit: '\u30CE\u30FC\u30C9', quad_mining_unit: '\u30D6\u30ED\u30C3\u30AF', quad_fullnode_unit: '\u30CE\u30FC\u30C9', quad_isp_unit: 'ISP',
      isp_concentration: '\u4E0A\u4F4D3\u793E\u5360\u6709\u7387',
      click_expand: '\u30AF\u30EA\u30C3\u30AF\u3067\u62E1\u5927', press_esc: 'ESC\u3067\u623B\u308B',
    },
  };

  function t(k) {
    return (i18n[M.lang] && i18n[M.lang][k]) || i18n.en[k] || k;
  }

  // ── Theme SVGs ──
  var sunSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>';
  var moonSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var sunSvgSm = sunSvg.replace(/width="15" height="15"/g, 'width="14" height="14"');
  var moonSvgSm = moonSvg.replace(/width="15" height="15"/g, 'width="14" height="14"');

  M.sunSvg = sunSvg;
  M.moonSvg = moonSvg;
  M.sunSvgSm = sunSvgSm;
  M.moonSvgSm = moonSvgSm;

  // ── Language switching ──
  function setLang(l) {
    M.lang = l;
    localStorage.setItem('lang', l);
    var target = '/' + l + '/';
    if (window.location.pathname !== target) {
      window.location.href = target;
      return;
    }
    document.documentElement.lang = l;
    var btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = ({ ko: 'KO', en: 'EN', ja: 'JA' })[l] || 'EN';
    document.getElementById('lang-menu')?.classList.remove('open');
    document.querySelectorAll('[data-ko]').forEach(function (el) {
      var val = el.dataset[l] || el.dataset.en || el.dataset.ko;
      if (val) {
        if ('placeholder' in el && el.placeholder !== undefined) el.placeholder = val;
        else el.textContent = val;
      }
    });
    if (window._mapData && typeof M.loadData === 'function') M.loadData();
  }

  function toggleLang() {
    var m = document.getElementById('lang-menu');
    m?.classList.toggle('open');
    document.getElementById('lang-btn')?.setAttribute('aria-expanded', String(m?.classList.contains('open') || false));
  }

  // Close lang dropdown on outside click
  document.addEventListener('click', function (e) {
    var m = document.getElementById('lang-menu');
    if (m && !e.target.closest('.lang-dropdown')) {
      m.classList.remove('open');
      document.getElementById('lang-btn')?.setAttribute('aria-expanded', 'false');
    }
  });

  // ── Theme toggling ──
  function initTheme() {
    var th = localStorage.getItem('theme') || 'dark';
    var isDark = th !== 'light';
    document.documentElement.setAttribute('data-theme', th);
    var btn = document.getElementById('theme-btn');
    if (btn) {
      btn.innerHTML = isDark ? sunSvg : moonSvg;
      btn.title = isDark ? '\uB77C\uC774\uD2B8 \uBAA8\uB4DC\uB85C \uC804\uD658' : '\uB2E4\uD06C \uBAA8\uB4DC\uB85C \uC804\uD658';
    }
  }

  function updateThemeBtn() {
    var btn = document.getElementById('theme-btn');
    if (!btn) return;
    var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    btn.innerHTML = isDark ? sunSvg : moonSvg;
    btn.title = isDark ? '\uB77C\uC774\uD2B8 \uBAA8\uB4DC\uB85C \uC804\uD658' : '\uB2E4\uD06C \uBAA8\uB4DC\uB85C \uC804\uD658';
  }

  function toggleTheme() {
    var h = document.documentElement;
    var next = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    h.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeBtn();
    if (typeof M.updateGlobeTheme === 'function') M.updateGlobeTheme();
  }

  // ── Hamburger menu ──
  function updateHamburger() {
    var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    var icon = document.getElementById('hamburger-theme-icon');
    if (icon) icon.innerHTML = isDark ? sunSvgSm : moonSvgSm;
    document.querySelectorAll('#hamburger-panel .settings-lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === M.lang);
    });
  }

  // ── If stored lang differs from page lang, navigate ──
  if (lang !== pageLang && ['ko', 'en', 'ja'].includes(lang)) {
    window.location.href = '/' + lang + '/';
  }

  // ── Initialize theme and lang ──
  initTheme();
  setLang(lang);

  // ── Expose on shared namespace ──
  M.t = t;
  M.setLang = setLang;
  M.toggleLang = toggleLang;
  M.toggleTheme = toggleTheme;
  M.updateThemeBtn = updateThemeBtn;
  M.updateHamburger = updateHamburger;
})();
