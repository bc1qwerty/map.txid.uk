/**
 * map-engine.js
 * Three.js globe setup with quad-viewport rendering.
 * 4 viewports: Lightning, Mining, Full Nodes, ISP
 * Single canvas, single scene, 4 data groups toggled per viewport.
 *
 * Depends on: map-data.js, map-i18n.js (window.txidMap)
 */
(function () {
  'use strict';

  var M = window.txidMap;
  var t = M.t;
  var escHtml = M.escHtml;
  var fetchRetry = M.fetchRetry;
  var getName = M.getName;
  var FLAGS = M.FLAGS;
  var CENTROIDS = M.CENTROIDS;
  var NAME_TO_ISO2 = M.NAME_TO_ISO2;
  var API = M.API;

  // ── prefers-reduced-motion ──
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Shared state ──
  var currentTab = 'ln'; // for mobile fallback
  var currentMiningPeriod = '1w';
  var globeState = null;
  var worldGeoRaw = null;
  var heatmapMode = false;
  var capacityMode = false;
  var currentSortKey = 'count';
  var currentSortDir = -1;

  // Quad viewport state
  var quadMode = true; // true = 4-split, false = single expanded
  var expandedQuad = null; // 'ln' | 'mining' | 'fullnode' | 'isp' | null
  var activeQuad = 'ln'; // which quad is "active" for right-panel
  var isMobileView = window.innerWidth < 769;

  // Quad data storage
  var quadData = { ln: null, mining: null, fullnode: null, isp: null };
  var quadMapData = { ln: null, mining: null, fullnode: null, isp: null };

  M.currentTab = currentTab;
  M.activeQuad = activeQuad;

  // ── API Caching (sessionStorage, 5min TTL) ──
  function cachedFetch(url, timeout) {
    var key = 'map_cache_' + url;
    try {
      var cached = sessionStorage.getItem(key);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 300000) {
          return Promise.resolve(new Response(JSON.stringify(parsed.data)));
        }
      }
    } catch (e) { /* ignore */ }
    return fetchRetry(url, timeout).then(function (r) {
      return r.clone().json().then(function (d) {
        try {
          sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: d }));
        } catch (e) { /* quota exceeded */ }
        return new Response(JSON.stringify(d));
      });
    });
  }

  // ── Tab switching (mobile only) ──
  function switchTab(tab) {
    currentTab = tab;
    M.currentTab = tab;
    activeQuad = tab;
    M.activeQuad = tab;
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.getElementById('tab-' + tab)?.classList.add('active');
    document.querySelectorAll('.ln-only').forEach(function (el) {
      el.style.display = tab === 'ln' ? '' : 'none';
    });
    var periodWrap = document.getElementById('mining-period-wrap');
    if (periodWrap) periodWrap.style.display = tab === 'mining' ? '' : 'none';
    var capToggle = document.getElementById('capacity-toggle-wrap');
    if (capToggle) capToggle.style.display = tab === 'ln' ? '' : 'none';
    document.getElementById('node-detail')?.classList.add('hidden');
    loadData();
  }

  // ── Mining period selector ──
  function setMiningPeriod(period) {
    currentMiningPeriod = period;
    document.querySelectorAll('.period-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.period === period);
    });
    loadAllQuadData();
  }

  // ── Pool-country mapping ──
  var POOL_COUNTRY = {
    'Foundry USA': 'US', 'AntPool': 'CN', 'F2Pool': 'CN', 'ViaBTC': 'CN',
    'Binance Pool': 'CN', 'MARA Pool': 'US', 'Luxor': 'US', 'Braiins Pool': 'CZ',
    'SBI Crypto': 'JP', 'Poolin': 'CN', 'BTC.com': 'CN', '1THash': 'CN',
    'SpiderPool': 'CN', 'Ocean': 'US', 'EMCDPool': 'RU', 'Pega Pool': 'KW',
    'KuCoinPool': 'SC', 'BTCC Pool': 'CN', 'Bitfury': 'NL', 'SlushPool': 'CZ',
    'Titan': 'US', 'WhitePool': 'US', 'NovaBlock': 'CN',
    'SigmaPool': 'CN', 'Rawpool': 'CN', 'BitFuFu': 'SG', 'Ultimus Pool': 'US',
    'BTC.TOP': 'CN', 'HuobiPool': 'CN', 'OKExPool': 'CN', 'BytePool': 'CN',
    'Marapool': 'US', 'Riot': 'US', 'CleanSpark': 'US', 'DEMAND': 'US',
    'SecPool': 'CN', 'Carbon Negative': 'IS',
  };

  // ── ISP data center locations (approximate) ──
  var ISP_LOCATIONS = {
    'AMAZON': { lat: 39.0, lng: -77.5 },
    'Amazon': { lat: 39.0, lng: -77.5 },
    'GOOGLE': { lat: 37.4, lng: -122.1 },
    'Google': { lat: 37.4, lng: -122.1 },
    'DIGITALOCEAN': { lat: 40.7, lng: -74.0 },
    'DigitalOcean': { lat: 40.7, lng: -74.0 },
    'OVH': { lat: 50.7, lng: 3.2 },
    'Hetzner': { lat: 51.2, lng: 9.5 },
    'HETZNER': { lat: 51.2, lng: 9.5 },
    'MICROSOFT': { lat: 47.6, lng: -122.3 },
    'Microsoft': { lat: 47.6, lng: -122.3 },
    'Linode': { lat: 39.9, lng: -75.2 },
    'LINODE': { lat: 39.9, lng: -75.2 },
    'Akamai': { lat: 42.4, lng: -71.1 },
    'AKAMAI': { lat: 42.4, lng: -71.1 },
    'Alibaba': { lat: 31.2, lng: 121.5 },
    'ALIBABA': { lat: 31.2, lng: 121.5 },
    'Vultr': { lat: 35.2, lng: -80.8 },
    'VULTR': { lat: 35.2, lng: -80.8 },
    'Leaseweb': { lat: 52.4, lng: 4.9 },
    'LEASEWEB': { lat: 52.4, lng: 4.9 },
    'Contabo': { lat: 48.1, lng: 11.6 },
    'CONTABO': { lat: 48.1, lng: 11.6 },
    'Comcast': { lat: 39.9, lng: -75.2 },
    'COMCAST': { lat: 39.9, lng: -75.2 },
    'Telia': { lat: 59.3, lng: 18.1 },
    'TELIA': { lat: 59.3, lng: 18.1 },
    'Charter': { lat: 38.6, lng: -90.2 },
    'CHARTER': { lat: 38.6, lng: -90.2 },
    'AT&T': { lat: 32.8, lng: -96.8 },
    'T-Mobile': { lat: 47.6, lng: -122.3 },
    'Vodafone': { lat: 51.5, lng: -0.1 },
    'VODAFONE': { lat: 51.5, lng: -0.1 },
  };

  // ISP color palette
  var ISP_COLORS = [
    0xff6b35, 0x00d4aa, 0x7b68ee, 0xff1493, 0x00ced1,
    0xffa500, 0x32cd32, 0xff4500, 0x1e90ff, 0xdaa520,
  ];

  // ── Loading skeleton ──
  function showSkeleton() {
    var cl = document.getElementById('country-list');
    if (!cl) return;
    var rows = '';
    for (var i = 0; i < 6; i++) {
      rows += '<div class="skeleton-row"><div class="skeleton-cell sk-rank"></div><div class="skeleton-cell sk-flag"></div><div class="skeleton-cell sk-name"></div><div class="skeleton-cell sk-count"></div></div>';
    }
    cl.innerHTML = rows;
  }

  // ── Load all quad data in parallel ──
  async function loadAllQuadData() {
    var gs = document.getElementById('global-stats');
    var cl = document.getElementById('country-list');
    if (gs) gs.innerHTML = '<div class="loading-msg">' + t('loading') + '</div>';
    showSkeleton();

    try {
      var results = await Promise.all([
        cachedFetch(API + '/v1/lightning/nodes/countries', 10000).then(function (r) { return r.json(); }),
        cachedFetch(API + '/v1/mining/pools/' + currentMiningPeriod, 10000).then(function (r) { return r.json(); }),
        cachedFetch(API + '/v1/lightning/nodes/isp-ranking', 10000).then(function (r) { return r.json(); }),
        cachedFetch(API + '/v1/lightning/statistics/latest', 10000).then(function (r) { return r.json(); }),
      ]);

      // ── Process Lightning data ──
      var countries = results[0];
      var totalLN = countries.reduce(function (s, n) { return s + (n.count || 0); }, 0);
      var sortedLN = countries.map(function (n) { return [n.iso, { count: n.count, share: n.share }]; })
        .sort(function (a, b) { return b[1].count - a[1].count; });
      quadMapData.ln = { type: 'ln', data: sortedLN, total: totalLN };
      quadData.ln = { total: totalLN, unit: t('quad_ln_unit'), top3: sortedLN.slice(0, 3).map(function (e) { return { flag: FLAGS[e[0]] || '', name: getName(e[0]), value: e[1].count }; }) };

      // ── Process Mining data ──
      var pools = results[1];
      var byCc = {};
      (pools.pools || []).forEach(function (p) {
        var cc = POOL_COUNTRY[p.name] || 'XX';
        if (!byCc[cc]) byCc[cc] = { count: 0, blocks: 0, pools: [] };
        byCc[cc].count++;
        byCc[cc].blocks += p.blockCount || 0;
        byCc[cc].pools.push(p.name);
      });
      var totalBlocks = Object.values(byCc).reduce(function (s, v) { return s + v.blocks; }, 0);
      var sortedMining = Object.entries(byCc).filter(function (e) { return e[0] !== 'XX'; })
        .sort(function (a, b) { return b[1].blocks - a[1].blocks; });
      var miningData = sortedMining.map(function (e) { return [e[0], { count: e[1].blocks }]; });
      quadMapData.mining = { type: 'mining', data: miningData, total: totalBlocks };
      quadData.mining = { total: totalBlocks, unit: t('quad_mining_unit'), top3: sortedMining.slice(0, 3).map(function (e) { return { flag: FLAGS[e[0]] || '', name: getName(e[0]), value: e[1].blocks }; }) };

      // ── Process ISP data ──
      var ispData = results[2];
      var ispRaw = [];
      var totalISPNodes = 0;
      if (ispData && ispData.ispRanking) {
        ispRaw = ispData.ispRanking;
      } else if (Array.isArray(ispData)) {
        ispRaw = ispData;
      }
      // Normalize ISP data: API returns [asnId, name, capacity, nodeCount, channelCount]
      var ispList = ispRaw.map(function (isp) {
        if (Array.isArray(isp)) {
          return { name: isp[1] || 'Unknown', count: isp[3] || 0, capacity: parseInt(isp[2]) || 0 };
        }
        return { name: isp.name || isp.isp || 'Unknown', count: isp.count || isp.nodeCount || 0, capacity: 0 };
      });
      ispList.forEach(function (isp) { totalISPNodes += isp.count; });
      // Build ISP map data using ISP_LOCATIONS
      var ispMapEntries = [];
      ispList.slice(0, 20).forEach(function (isp, idx) {
        var name = isp.name;
        var count = isp.count;
        // Try to find a location for this ISP
        var loc = null;
        var keys = Object.keys(ISP_LOCATIONS);
        for (var k = 0; k < keys.length; k++) {
          if (name.toLowerCase().indexOf(keys[k].toLowerCase()) !== -1) {
            loc = ISP_LOCATIONS[keys[k]];
            break;
          }
        }
        if (!loc) {
          // Distribute unknown ISPs around the globe
          var angle = (idx / 20) * Math.PI * 2;
          loc = { lat: Math.sin(angle) * 30, lng: Math.cos(angle) * 60 };
        }
        ispMapEntries.push({
          name: name,
          count: count,
          lat: loc.lat,
          lng: loc.lng,
          colorIdx: idx % ISP_COLORS.length,
        });
      });

      quadMapData.isp = { type: 'isp', data: ispMapEntries, total: totalISPNodes };
      // Top 3 ISP concentration (ispList is already normalized)
      var top3ISPNodes = ispList.slice(0, 3).reduce(function (s, i) { return s + i.count; }, 0);
      var top3ISPPct = totalISPNodes > 0 ? ((top3ISPNodes / totalISPNodes) * 100).toFixed(1) : '0';
      quadData.isp = {
        total: ispList.length,
        unit: t('quad_isp_unit'),
        top3: ispList.slice(0, 3).map(function (isp) {
          return { flag: '', name: isp.name, value: isp.count };
        }),
        concentration: top3ISPPct,
      };

      // ── Process Fullnode data (reuse Lightning country data) ──
      // Full nodes are approximated from Lightning data (clearnet+tor from statistics)
      var stats = results[3];
      var s = stats.latest || stats;
      var totalFullNodes = (s.clearnet_nodes || 0) + (s.tor_nodes || 0) + (s.unannounced_nodes || 0) + (s.clearnet_tor_nodes || 0);
      // Use Lightning country distribution as proxy for full nodes
      quadMapData.fullnode = { type: 'fullnode', data: sortedLN, total: totalFullNodes };
      quadData.fullnode = { total: totalFullNodes, unit: t('quad_fullnode_unit'), top3: sortedLN.slice(0, 3).map(function (e) { return { flag: FLAGS[e[0]] || '', name: getName(e[0]), value: e[1].count }; }) };

      // ── Update quad stats UI ──
      updateAllQuadStats();

      // ── Build globe data ──
      if (globeState) {
        buildAllQuadGroups();
      }

      // ── Update right panel for active quad ──
      updateRightPanel(activeQuad);

      // ── For mobile: use the old loadData path ──
      if (isMobileView) {
        window._mapData = quadMapData[currentTab] || quadMapData.ln;
        renderMap(window._mapData);
      }

      // Node explorer (Lightning)
      if (typeof M.loadTopNodes === 'function') M.loadTopNodes();
      if (typeof M.loadNetworkHistory === 'function') M.loadNetworkHistory();

    } catch (e) {
      console.error('loadAllQuadData error:', e);
      var gs2 = document.getElementById('global-stats');
      if (gs2) {
        gs2.innerHTML = '';
        var errDiv = document.createElement('div');
        errDiv.className = 'error-msg';
        errDiv.textContent = t('load_fail') + '. ';
        var retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = M.lang === 'en' ? 'Retry' : M.lang === 'ja' ? '\u518D\u8A66\u884C' : '\uC7AC\uC2DC\uB3C4';
        retryBtn.addEventListener('click', loadAllQuadData);
        errDiv.appendChild(retryBtn);
        gs2.appendChild(errDiv);
      }
    }
  }

  // ── Old loadData for mobile compatibility ──
  async function loadData() {
    if (!isMobileView) {
      // Desktop uses quad mode
      loadAllQuadData();
      return;
    }
    // Mobile single-globe mode
    var gs = document.getElementById('global-stats');
    var cl = document.getElementById('country-list');
    if (gs) gs.innerHTML = '<div class="loading-msg">' + t('loading') + '</div>';
    showSkeleton();

    try {
      if (currentTab === 'ln') {
        var results = await Promise.all([
          cachedFetch(API + '/v1/lightning/nodes/countries', 10000).then(function (r) { return r.json(); }),
          cachedFetch(API + '/v1/lightning/statistics/latest', 10000).then(function (r) { return r.json(); }),
        ]);
        var countries = results[0];
        var total = countries.reduce(function (s, n) { return s + (n.count || 0); }, 0);
        if (gs) gs.innerHTML = '';
        var sorted = countries.map(function (n) { return [n.iso, { count: n.count, share: n.share }]; })
          .sort(function (a, b) { return b[1].count - a[1].count; });
        window._mapData = { type: 'ln', data: sorted, total: total };
        renderMap(window._mapData);
        renderCountryList(sorted, total, 'nodes');
        if (typeof M.loadTopNodes === 'function') M.loadTopNodes();
        if (typeof M.loadNetworkHistory === 'function') M.loadNetworkHistory();
      } else {
        var pools = await cachedFetch(API + '/v1/mining/pools/' + currentMiningPeriod, 10000).then(function (r) { return r.json(); });
        var periodLabel = { '24h': '24h', '3d': '3d', '1w': '7d', '1m': '30d' }[currentMiningPeriod] || '7d';
        if (gs) {
          gs.innerHTML =
            '<div class="gs-card"><div class="gs-val">' + (pools.pools?.length || 0) + '</div><div class="gs-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><path d="M15 4l5 5-11 11H4v-5L15 4z"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + t('active_pools') + '</div></div>' +
            '<div class="gs-card"><div class="gs-val">' + (pools.blockCount || 0) + '</div><div class="gs-lbl">' + t('blocks_7d').replace('7', periodLabel.replace(/[dh]/g, '')) + '</div></div>';
        }
        var byCc = {};
        (pools.pools || []).forEach(function (p) {
          var cc = POOL_COUNTRY[p.name] || 'XX';
          if (!byCc[cc]) byCc[cc] = { count: 0, blocks: 0, pools: [] };
          byCc[cc].count++;
          byCc[cc].blocks += p.blockCount || 0;
          byCc[cc].pools.push(p.name);
        });
        var totalBlocks = Object.values(byCc).reduce(function (s, v) { return s + v.blocks; }, 0);
        var sorted = Object.entries(byCc).filter(function (e) { return e[0] !== 'XX'; })
          .sort(function (a, b) { return b[1].blocks - a[1].blocks; });
        window._mapData = { type: 'mining', data: sorted.map(function (e) { return [e[0], { count: e[1].blocks }]; }), total: totalBlocks };
        renderMap(window._mapData);
        renderCountryList(sorted.map(function (e) { return [e[0], { count: e[1].blocks }]; }), totalBlocks, 'blocks');
      }
    } catch (e) {
      console.error('loadData error:', e);
      if (gs) {
        gs.innerHTML = '';
        var errDiv = document.createElement('div');
        errDiv.className = 'error-msg';
        errDiv.textContent = t('load_fail') + '. ';
        var retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = M.lang === 'en' ? 'Retry' : M.lang === 'ja' ? '\u518D\u8A66\u884C' : '\uC7AC\uC2DC\uB3C4';
        retryBtn.addEventListener('click', loadData);
        errDiv.appendChild(retryBtn);
        gs.appendChild(errDiv);
      }
    }
  }

  // ── Update quad header stats ──
  function updateAllQuadStats() {
    ['ln', 'mining', 'fullnode', 'isp'].forEach(function (qName) {
      var data = quadData[qName];
      if (!data) return;
      var statEl = document.getElementById('quad-stat-' + qName);
      var listEl = document.getElementById('quad-list-' + qName);
      if (statEl) {
        statEl.textContent = data.total.toLocaleString() + ' ' + data.unit;
      }
      if (listEl && data.top3) {
        listEl.innerHTML = data.top3.map(function (item) {
          return '<span class="quad-item">' + escHtml(item.flag) + ' ' + item.value.toLocaleString() + '</span>';
        }).join('');
        // ISP concentration warning
        if (qName === 'isp' && data.concentration) {
          listEl.innerHTML += '<span class="quad-item" style="color:var(--accent);font-weight:600;">' + t('isp_concentration') + ': ' + data.concentration + '%</span>';
        }
      }
    });
  }

  // ── Update right panel based on active quad ──
  function updateRightPanel(qName) {
    var gs = document.getElementById('global-stats');
    var mapData = quadMapData[qName];
    if (!mapData) return;

    activeQuad = qName;
    M.activeQuad = qName;

    // Show/hide LN-only sections
    document.querySelectorAll('.ln-only').forEach(function (el) {
      el.style.display = (qName === 'ln' || qName === 'fullnode') ? '' : 'none';
    });

    if (qName === 'ln' || qName === 'fullnode') {
      if (gs) gs.innerHTML = '';
      var sorted = mapData.data;
      var total = mapData.total;
      renderCountryList(sorted, total, 'nodes');
    } else if (qName === 'mining') {
      var sorted = mapData.data;
      var total = mapData.total;
      if (gs) {
        gs.innerHTML =
          '<div class="gs-card"><div class="gs-val">' + sorted.length + '</div><div class="gs-lbl">' + t('active_pools') + '</div></div>' +
          '<div class="gs-card"><div class="gs-val">' + total.toLocaleString() + '</div><div class="gs-lbl">' + t('blocks_7d') + '</div></div>';
      }
      renderCountryList(sorted, total, 'blocks');
    } else if (qName === 'isp') {
      var ispEntries = mapData.data;
      var total = mapData.total;
      if (gs) {
        gs.innerHTML =
          '<div class="gs-card"><div class="gs-val">' + ispEntries.length + '</div><div class="gs-lbl">' + t('quad_isp') + ' providers</div></div>' +
          '<div class="gs-card"><div class="gs-val">' + total.toLocaleString() + '</div><div class="gs-lbl">' + t('quad_ln_unit') + '</div></div>';
      }
      // Render ISP list instead of country list
      renderISPList(ispEntries, total);
    }

    // Highlight active quad cell
    document.querySelectorAll('.quad-cell').forEach(function (cell) {
      cell.classList.toggle('quad-active', cell.dataset.quad === qName);
    });
  }

  // ── Render ISP list in country-list area ──
  function renderISPList(ispEntries, total) {
    var cl = document.getElementById('country-list');
    if (!cl) return;
    var lang = M.lang;
    var titleLabel = 'ISP Ranking';

    cl.innerHTML =
      '<h3 class="section-title">' + escHtml(titleLabel) + '</h3>' +
      '<div class="cl-header"><span>#</span><span>ISP</span><span>' + t('quad_ln_unit') + '</span><span>%</span></div>' +
      ispEntries.map(function (isp, i) {
        var val = isp.count || 0;
        var pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
        var colorDot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#' + ISP_COLORS[i % ISP_COLORS.length].toString(16).padStart(6, '0') + ';margin-right:4px;"></span>';
        return '<div class="cl-row" tabindex="0" role="button">' +
          '<span class="cl-rank">' + (i + 1) + '</span>' +
          '<span class="cl-flag">' + colorDot + '</span>' +
          '<span class="cl-name">' + escHtml(isp.name) + '</span>' +
          '<span class="cl-count">' + val.toLocaleString() + '</span>' +
          '<span class="cl-pct">' + pct + '%</span>' +
        '</div>';
      }).join('');
  }

  // ── Sort helpers ──
  function sortData(sorted) {
    var arr = sorted.slice();
    arr.sort(function (a, b) { return (b[1].count || 0) - (a[1].count || 0); });
    return arr;
  }

  // ── Render country list ──
  function renderCountryList(sorted, total, _unit) {
    var cl = document.getElementById('country-list');
    var lang = M.lang;
    var unitLabel;
    if (_unit === 'capacity') {
      unitLabel = 'BTC';
    } else {
      unitLabel = _unit === 'nodes' ? t('node_label') : t('block_label');
    }
    var titleLabel = _unit === 'nodes'
      ? (lang === 'ko' ? '\uAD6D\uAC00\uBCC4 \uB178\uB4DC' : lang === 'ja' ? '\u56FD\u5225\u30CE\u30FC\u30C9' : 'Nodes by Country')
      : _unit === 'capacity'
        ? (lang === 'ko' ? '\uAD6D\uAC00\uBCC4 \uC6A9\uB7C9' : lang === 'ja' ? '\u56FD\u5225\u5BB9\u91CF' : 'Capacity by Country')
        : (lang === 'ko' ? '\uAD6D\uAC00\uBCC4 \uBE14\uB85D' : lang === 'ja' ? '\u56FD\u5225\u30D6\u30ED\u30C3\u30AF' : 'Blocks by Country');

    var displayData = sortData(sorted);
    cl._sortedData = sorted;
    cl._total = total;
    cl._unit = _unit;

    var searchPlaceholder = lang === 'ko' ? '\uAD6D\uAC00 \uAC80\uC0C9...' : lang === 'ja' ? '\u56FD\u3092\u691C\u7D22...' : 'Search country...';

    cl.innerHTML =
      '<input type="text" class="cl-search-input" placeholder="' + escHtml(searchPlaceholder) + '" id="cl-search-input" />' +
      '<h3 class="section-title">' + escHtml(titleLabel) + '</h3>' +
      '<div class="cl-header"><span>#</span><span>' + escHtml(t('country')) + '</span><span>' + escHtml(unitLabel) + '</span><span>%</span></div>' +
      displayData.map(function (entry, i) {
        var cc = entry[0];
        var v = entry[1];
        var val = v.count || 0;
        var pct = ((val / total) * 100).toFixed(1);
        var displayVal = _unit === 'capacity' ? (val / 1e8).toFixed(2) : val.toLocaleString();
        return '<div class="cl-row" data-cc="' + escHtml(cc) + '" data-name="' + escHtml(getName(cc)) + '" tabindex="0" role="button">' +
          '<span class="cl-rank">' + (i + 1) + '</span>' +
          '<span class="cl-flag">' + escHtml(FLAGS[cc] || '') + '</span>' +
          '<span class="cl-name">' + escHtml(getName(cc)) + '</span>' +
          '<span class="cl-count">' + displayVal + '</span>' +
          '<span class="cl-pct">' + pct + '%</span>' +
        '</div>';
      }).join('');

    // Search filter
    var searchInput = document.getElementById('cl-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var query = searchInput.value.toLowerCase().trim();
        cl.querySelectorAll('.cl-row').forEach(function (row) {
          var name = (row.dataset.name || '').toLowerCase();
          var cc = (row.dataset.cc || '').toLowerCase();
          if (!query || name.indexOf(query) !== -1 || cc.indexOf(query) !== -1) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    // Country click -> zoom + filter
    cl.querySelectorAll('.cl-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var cc = row.dataset.cc;
        if (!cc) return;
        cl.querySelectorAll('.cl-row').forEach(function (r) { r.classList.remove('highlighted'); });
        row.classList.add('highlighted');
        if (globeState && globeState.zoomToCountry) globeState.zoomToCountry(cc);
        document.dispatchEvent(new CustomEvent('country-selected', { detail: { cc: cc } }));
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') row.click();
      });
    });
  }

  // ── Render map data on globe (mobile single-globe mode) ──
  function renderMap(mapData) {
    if (!mapData || !globeState) return;
    if (worldGeoRaw) {
      globeState.buildCountryFills(worldGeoRaw, mapData);
      globeState.buildCountryOutlines(worldGeoRaw);
    }
    globeState.buildDataPoints(mapData);
    if (!prefersReducedMotion) {
      globeState.startArcAnimation(mapData);
    }
  }

  // ── Update globe theme ──
  function updateGlobeTheme() {
    if (globeState && globeState.updateTheme) {
      globeState.updateTheme();
      if (!isMobileView) {
        // Rebuild all quad groups with new theme
        buildAllQuadGroups();
      } else {
        var mapData = window._mapData;
        if (mapData && worldGeoRaw) {
          globeState.buildCountryFills(worldGeoRaw, mapData);
          globeState.buildCountryOutlines(worldGeoRaw);
          globeState.buildDataPoints(mapData);
        }
      }
    }
  }

  // ── Build all quad data groups ──
  function buildAllQuadGroups() {
    if (!globeState) return;
    ['ln', 'mining', 'fullnode', 'isp'].forEach(function (qName) {
      var mapData = quadMapData[qName];
      if (!mapData) return;
      globeState.buildQuadDataPoints(qName, mapData);
    });
    // Also build country outlines and fills based on active quad
    if (worldGeoRaw) {
      globeState.buildCountryOutlines(worldGeoRaw);
    }
    // Start arc animation for LN
    if (!prefersReducedMotion && quadMapData.ln) {
      globeState.startArcAnimation(quadMapData.ln);
    }
  }

  // ── City coordinates for night lights ──
  var CITY_COORDS = [
    [40.7,-74.0],[51.5,-0.1],[48.9,2.3],[35.7,139.7],[55.8,37.6],
    [31.2,121.5],[22.3,114.2],[-33.9,151.2],[37.6,127.0],[19.4,-99.1],
    [34.1,-118.2],[41.9,-87.6],[52.5,13.4],[39.9,116.4],[-23.5,-46.6],
    [1.3,103.8],[28.6,77.2],[33.9,35.5],[25.3,55.3],[30.0,31.2],
    [59.3,18.1],[50.1,14.4],[47.5,19.1],[38.7,-9.1],[41.0,29.0],
    [45.5,-73.6],[37.8,-122.4],[29.8,-95.4],[43.7,-79.4],[35.2,-80.8],
    [-34.6,-58.4],[52.4,4.9],[-1.3,36.8],[14.6,121.0],[13.8,100.5],
    [48.2,16.4],[46.2,6.1],[-6.2,106.8],[16.9,96.2],[6.5,3.4],
    [-26.2,28.0],[47.6,-122.3],[42.4,-71.1],[60.2,24.9],[53.3,-6.3],
    [56.9,24.1],[54.7,25.3],[35.7,51.4],[33.3,44.4],[36.8,10.2],
  ];

  // ── Three.js Globe ──
  async function initGlobe() {
    var THREE = window.__THREE;
    var OrbitControls = window.__OrbitControls;
    var Line2 = window.__Line2;
    var LineMaterial = window.__LineMaterial;
    var LineGeometry = window.__LineGeometry;

    var canvas = document.getElementById('globe-canvas');
    if (!canvas) return;

    var GLOBE_RADIUS = 1.0;
    var isDark = function () { return document.documentElement.getAttribute('data-theme') !== 'light'; };

    var isMobile = window.innerWidth < 768;
    var defaultCamZ = isMobile ? 3.5 : 3.0;

    // Scene setup
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0.3, defaultCamZ);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(isDark() ? 0x050a12 : 0xf0f4f8);

    // Controls
    var controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    controls.enablePan = false;
    controls.autoRotate = !prefersReducedMotion;
    controls.autoRotateSpeed = 0.4;

    // Auto-rotate idle logic
    var idleTimer = null;
    function onInteractionStart() {
      controls.autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
    }
    function onInteractionEnd() {
      if (idleTimer) clearTimeout(idleTimer);
      if (prefersReducedMotion) return;
      idleTimer = setTimeout(function () { controls.autoRotate = true; }, 3000);
    }
    canvas.addEventListener('pointerdown', onInteractionStart);
    canvas.addEventListener('pointerup', onInteractionEnd);
    canvas.addEventListener('wheel', function () { onInteractionStart(); onInteractionEnd(); });

    // Lighting
    var ambientLight = new THREE.AmbientLight(0x334466, 0.4);
    scene.add(ambientLight);
    var dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);
    var fillLight = new THREE.DirectionalLight(0x4488cc, 0.3);
    fillLight.position.set(-3, -1, -3);
    scene.add(fillLight);

    var sunDir = new THREE.Vector3(5, 3, 5).normalize();

    // Earth sphere
    var textureLoader = new THREE.TextureLoader();
    var earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    var earthMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 15,
      specular: new THREE.Color(0x333333),
    });
    textureLoader.load('/images/earth-texture.jpg', function (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      if (!isDark()) { earthMat.color.set(0xcccccc); }
      earthMat.needsUpdate = true;
    });
    textureLoader.load('/images/earth-bump.jpg', function (tex) {
      earthMat.bumpMap = tex;
      earthMat.bumpScale = 0.015;
      earthMat.needsUpdate = true;
    });
    textureLoader.load('/images/earth-specular.png', function (tex) {
      earthMat.specularMap = tex;
      earthMat.needsUpdate = true;
    });

    var earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Country fill texture mesh
    var fillTextureCanvas = document.createElement('canvas');
    fillTextureCanvas.width = 2048;
    fillTextureCanvas.height = 1024;
    var fillTexture = new THREE.CanvasTexture(fillTextureCanvas);
    fillTexture.wrapS = THREE.ClampToEdgeWrapping;
    fillTexture.wrapT = THREE.ClampToEdgeWrapping;
    var fillGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 64, 64);
    var fillMat = new THREE.MeshBasicMaterial({
      map: fillTexture,
      transparent: true,
      depthWrite: false,
    });
    var fillMesh = new THREE.Mesh(fillGeo, fillMat);

    // Atmosphere glow
    var atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 64, 64);
    var atmosMat = new THREE.ShaderMaterial({
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
        '  vNormal = normalize(normalMatrix * normal);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
        '  float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);',
        '  gl_FragColor = vec4(0.1, 0.5, 0.9, 1.0) * intensity * 0.5;',
        '}'
      ].join('\n'),
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    var atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // Star field
    var starField = null;
    (function initStars() {
      var starCount = 500;
      var positions = new Float32Array(starCount * 3);
      var sizes = new Float32Array(starCount);
      for (var i = 0; i < starCount; i++) {
        var r = 30 + Math.random() * 50;
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        sizes[i] = 0.05 + Math.random() * 0.1;
      }
      var starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      var starMat = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8,
        sizeAttenuation: true, depthWrite: false,
      });
      starField = new THREE.Points(starGeo, starMat);
      starField.visible = isDark();
      scene.add(starField);
    })();

    // City lights
    var cityLightsGroup = new THREE.Group();
    scene.add(cityLightsGroup);
    var cityLightSprites = [];
    (function initCityLights() {
      var lightCanvas = document.createElement('canvas');
      lightCanvas.width = 16;
      lightCanvas.height = 16;
      var lCtx = lightCanvas.getContext('2d');
      var g = lCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, 'rgba(255,238,221,1)');
      g.addColorStop(0.5, 'rgba(255,238,221,0.4)');
      g.addColorStop(1, 'rgba(255,238,221,0)');
      lCtx.fillStyle = g;
      lCtx.fillRect(0, 0, 16, 16);
      var lightTex = new THREE.CanvasTexture(lightCanvas);

      CITY_COORDS.forEach(function (coord) {
        var pos = latLngToVector3(coord[0], coord[1], GLOBE_RADIUS * 1.003);
        var mat = new THREE.SpriteMaterial({
          map: lightTex, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
        });
        var sprite = new THREE.Sprite(mat);
        sprite.position.copy(pos);
        sprite.scale.set(0.008, 0.008, 1);
        sprite._cityPos = pos.clone().normalize();
        cityLightsGroup.add(sprite);
        cityLightSprites.push(sprite);
      });
    })();

    // Country outlines group
    var bordersGroup = new THREE.Group();
    scene.add(bordersGroup);

    // ── QUAD DATA GROUPS ──
    // Each quad has its own THREE.Group for data points
    var quadGroups = {
      ln: new THREE.Group(),
      mining: new THREE.Group(),
      fullnode: new THREE.Group(),
      isp: new THREE.Group(),
    };
    quadGroups.ln.name = 'quad-ln';
    quadGroups.mining.name = 'quad-mining';
    quadGroups.fullnode.name = 'quad-fullnode';
    quadGroups.isp.name = 'quad-isp';
    Object.values(quadGroups).forEach(function (g) { scene.add(g); });

    // Single data points group for mobile
    var dataPointsGroup = new THREE.Group();
    scene.add(dataPointsGroup);

    // Arcs group
    var arcsGroup = new THREE.Group();
    scene.add(arcsGroup);

    // Per-quad point meshes for animation
    var quadPointMeshes = { ln: [], mining: [], fullnode: [], isp: [] };

    // Lat/Lng to 3D
    function latLngToVector3(lat, lng, radius) {
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (lng + 180) * Math.PI / 180;
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    // Clear group with full dispose
    function clearGroup(group) {
      while (group.children.length > 0) {
        var child = group.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          if (child.material.alphaMap) child.material.alphaMap.dispose();
          if (child.material.envMap) child.material.envMap.dispose();
          child.material.dispose();
        }
        group.remove(child);
      }
    }

    // Build country fills
    function buildCountryFills(geoData, mapData) {
      var features = topojson.feature(geoData, geoData.objects.countries).features;
      var valMap = {};
      var maxVal = 0;
      if (mapData && mapData.data) {
        mapData.data.forEach(function (entry) {
          var cc = entry[0];
          var val = entry[1] ? (entry[1].count || entry[1].blocks || 0) : (entry.count || 0);
          valMap[cc] = val;
          if (val > maxVal) maxVal = val;
        });
      }

      var dark = isDark();
      var w = fillTextureCanvas.width;
      var h = fillTextureCanvas.height;
      var ctx = fillTextureCanvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.filter = heatmapMode ? 'blur(8px)' : 'none';

      features.forEach(function (feature) {
        if (!feature.geometry) return;
        var name = feature.properties.name;
        var cc = NAME_TO_ISO2[name] || '';
        var val = valMap[cc] || 0;
        var intensity = maxVal > 0 ? Math.pow(val / maxVal, 0.4) : 0;
        var r, g, b, a;
        if (val <= 0) {
          if (dark) { r = 15; g = 20; b = 35; a = 0.15; }
          else { r = 180; g = 195; b = 210; a = 0.2; }
        } else {
          if (dark) {
            if (intensity < 0.5) {
              var t2 = intensity * 2;
              r = Math.round(13 + t2 * (6 - 13));
              g = Math.round(40 + t2 * (182 - 40));
              b = Math.round(71 + t2 * (212 - 71));
            } else {
              var t2 = (intensity - 0.5) * 2;
              r = Math.round(6 + t2 * (247 - 6));
              g = Math.round(182 + t2 * (147 - 182));
              b = Math.round(212 + t2 * (26 - 212));
            }
            a = 0.35 + intensity * 0.45;
          } else {
            if (intensity < 0.5) {
              var t2 = intensity * 2;
              r = Math.round(210 + t2 * (14 - 210));
              g = Math.round(220 + t2 * (165 - 220));
              b = Math.round(235 + t2 * (233 - 235));
            } else {
              var t2 = (intensity - 0.5) * 2;
              r = Math.round(14 + t2 * (188 - 14));
              g = Math.round(165 + t2 * (78 - 165));
              b = Math.round(233 + t2 * (0 - 233));
            }
            a = 0.3 + intensity * 0.45;
          }
        }

        var coords = feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.type === 'MultiPolygon'
            ? feature.geometry.coordinates : [];

        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        coords.forEach(function (polygon) {
          polygon.forEach(function (ring, ringIdx) {
            ctx.beginPath();
            ring.forEach(function (coord, j) {
              var x = ((coord[0] + 180) / 360) * w;
              var y = ((90 - coord[1]) / 180) * h;
              if (j === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.closePath();
            if (ringIdx === 0) {
              ctx.fill();
            } else {
              ctx.save();
              ctx.globalCompositeOperation = 'destination-out';
              ctx.fill();
              ctx.restore();
            }
          });
        });
      });
      ctx.filter = 'none';
      fillTexture.needsUpdate = true;
    }

    // Build country outlines
    function buildCountryOutlines(geoData) {
      clearGroup(bordersGroup);
      var dark = isDark();
      var borderColor = dark ? 0x1a2844 : 0xa0b0c0;
      var mesh = topojson.mesh(geoData, geoData.objects.countries);
      if (mesh && mesh.coordinates) {
        var useLine2 = !!(Line2 && LineMaterial && LineGeometry);
        mesh.coordinates.forEach(function (line) {
          if (line.length < 2) return;
          if (useLine2) {
            var positions = [];
            line.forEach(function (coord) {
              var v = latLngToVector3(coord[1], coord[0], GLOBE_RADIUS * 1.002);
              positions.push(v.x, v.y, v.z);
            });
            var geometry = new LineGeometry();
            geometry.setPositions(positions);
            var material = new LineMaterial({
              color: borderColor, linewidth: 1.5,
              transparent: true, opacity: 0.4,
              resolution: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
            });
            var lineObj = new Line2(geometry, material);
            lineObj.computeLineDistances();
            bordersGroup.add(lineObj);
          } else {
            var points = [];
            line.forEach(function (coord) {
              points.push(latLngToVector3(coord[1], coord[0], GLOBE_RADIUS * 1.002));
            });
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            var material = new THREE.LineBasicMaterial({ color: borderColor, transparent: true, opacity: 0.35 });
            bordersGroup.add(new THREE.Line(geometry, material));
          }
        });
      }
    }

    // ── Build data points for a specific quad ──
    function buildQuadDataPoints(qName, mapData) {
      var group = quadGroups[qName];
      clearGroup(group);
      quadPointMeshes[qName] = [];
      if (!mapData) return;

      var dark = isDark();

      // Create glow texture
      var glowCanvas = document.createElement('canvas');
      glowCanvas.width = 64;
      glowCanvas.height = 64;
      var ctx = glowCanvas.getContext('2d');

      // Different glow colors per quad type
      var glowColors = {
        ln: { r: 247, g: 147, b: 26 },     // Orange (Bitcoin)
        mining: { r: 255, g: 80, b: 80 },   // Red
        fullnode: { r: 80, g: 200, b: 120 }, // Green
        isp: { r: 100, g: 150, b: 255 },    // Blue
      };
      var gc = glowColors[qName] || glowColors.ln;

      var gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(' + gc.r + ',' + gc.g + ',' + gc.b + ',1)');
      gradient.addColorStop(0.25, 'rgba(' + gc.r + ',' + gc.g + ',' + gc.b + ',0.6)');
      gradient.addColorStop(0.6, 'rgba(' + gc.r + ',' + gc.g + ',' + gc.b + ',0.15)');
      gradient.addColorStop(1, 'rgba(' + gc.r + ',' + gc.g + ',' + gc.b + ',0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      var glowTexture = new THREE.CanvasTexture(glowCanvas);

      if (qName === 'isp') {
        // ISP: use ISP_LOCATIONS with color-coded dots
        var maxVal = 0;
        mapData.data.forEach(function (isp) { if (isp.count > maxVal) maxVal = isp.count; });

        mapData.data.forEach(function (isp, idx) {
          var pos = latLngToVector3(isp.lat, isp.lng, GLOBE_RADIUS * 1.005);
          var val = isp.count || 0;
          var sizeFactor = maxVal > 0 ? Math.sqrt(val / maxVal) : 0.3;
          var baseSize = 0.02 + sizeFactor * 0.06;
          var glowScale = baseSize * 3;

          // Use ISP-specific color
          var ispColor = ISP_COLORS[isp.colorIdx || (idx % ISP_COLORS.length)];
          var colorObj = new THREE.Color(ispColor);

          // Create ISP glow
          var ispGlowCanvas = document.createElement('canvas');
          ispGlowCanvas.width = 64;
          ispGlowCanvas.height = 64;
          var ispCtx = ispGlowCanvas.getContext('2d');
          var ir = Math.round(colorObj.r * 255);
          var ig = Math.round(colorObj.g * 255);
          var ib = Math.round(colorObj.b * 255);
          var ispGrad = ispCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
          ispGrad.addColorStop(0, 'rgba(' + ir + ',' + ig + ',' + ib + ',1)');
          ispGrad.addColorStop(0.3, 'rgba(' + ir + ',' + ig + ',' + ib + ',0.5)');
          ispGrad.addColorStop(1, 'rgba(' + ir + ',' + ig + ',' + ib + ',0)');
          ispCtx.fillStyle = ispGrad;
          ispCtx.fillRect(0, 0, 64, 64);
          var ispGlowTex = new THREE.CanvasTexture(ispGlowCanvas);

          var spriteMat = new THREE.SpriteMaterial({
            map: ispGlowTex, transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false,
            opacity: 0.5 + sizeFactor * 0.4,
          });
          var sprite = new THREE.Sprite(spriteMat);
          sprite.position.copy(pos);
          sprite.scale.set(glowScale, glowScale, 1);
          sprite._cc = isp.name;
          sprite._baseScale = glowScale;
          group.add(sprite);

          quadPointMeshes[qName].push({ sprite: sprite, baseSize: glowScale, cc: isp.name, pos: pos });
        });
      } else {
        // Country-based data (ln, mining, fullnode)
        var maxVal = 0;
        var valMap = {};
        mapData.data.forEach(function (entry) {
          var cc = entry[0];
          var val = entry[1].count || entry[1].blocks || 0;
          valMap[cc] = val;
          if (val > maxVal) maxVal = val;
        });

        mapData.data.forEach(function (entry) {
          var cc = entry[0];
          var v = entry[1];
          var cen = CENTROIDS[cc];
          if (!cen) return;
          var val = v.count || v.blocks || 0;
          if (val <= 0) return;

          var pos = latLngToVector3(cen[1], cen[0], GLOBE_RADIUS * 1.005);
          var sizeFactor = Math.sqrt(val / maxVal);
          var baseSize = 0.02 + sizeFactor * 0.07;
          var glowScale = baseSize * 3;

          var spriteMat = new THREE.SpriteMaterial({
            map: glowTexture, transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false,
            opacity: 0.4 + sizeFactor * 0.5,
          });
          var sprite = new THREE.Sprite(spriteMat);
          sprite.position.copy(pos);
          sprite.scale.set(glowScale, glowScale, 1);
          sprite._cc = cc;
          sprite._baseScale = glowScale;
          group.add(sprite);

          quadPointMeshes[qName].push({ sprite: sprite, baseSize: glowScale, cc: cc, pos: pos });
        });
      }
    }

    // ── Build data points for mobile single-globe mode ──
    var pointMeshes = [];
    function buildDataPoints(mapData) {
      clearGroup(dataPointsGroup);
      pointMeshes = [];
      if (!mapData) return;

      var dark = isDark();
      var maxVal = 0;
      var valMap = {};
      mapData.data.forEach(function (entry) {
        var cc = entry[0];
        var val = entry[1].count || entry[1].blocks || 0;
        valMap[cc] = val;
        if (val > maxVal) maxVal = val;
      });

      globeState._valMap = valMap;
      globeState._maxVal = maxVal;
      globeState._mapData = mapData;

      var glowCanvas = document.createElement('canvas');
      glowCanvas.width = 64;
      glowCanvas.height = 64;
      var ctx = glowCanvas.getContext('2d');
      var gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(247,147,26,1)');
      gradient.addColorStop(0.25, 'rgba(247,147,26,0.6)');
      gradient.addColorStop(0.6, 'rgba(247,147,26,0.15)');
      gradient.addColorStop(1, 'rgba(247,147,26,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      var glowTexture = new THREE.CanvasTexture(glowCanvas);

      mapData.data.forEach(function (entry) {
        var cc = entry[0];
        var v = entry[1];
        var cen = CENTROIDS[cc];
        if (!cen) return;
        var val = v.count || v.blocks || 0;
        if (val <= 0) return;

        var pos = latLngToVector3(cen[1], cen[0], GLOBE_RADIUS * 1.005);
        var sizeFactor = Math.sqrt(val / maxVal);
        var baseSize = 0.02 + sizeFactor * 0.07;
        var glowScale = baseSize * 3;

        var spriteMat = new THREE.SpriteMaterial({
          map: glowTexture, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false,
          opacity: 0.4 + sizeFactor * 0.5,
        });
        var sprite = new THREE.Sprite(spriteMat);
        sprite.position.copy(pos);
        sprite.scale.set(glowScale, glowScale, 1);
        sprite._cc = cc;
        sprite._baseScale = glowScale;
        dataPointsGroup.add(sprite);

        pointMeshes.push({ sprite: sprite, baseSize: glowScale, cc: cc, pos: pos });
      });
    }

    // ── Arc animation ──
    var arcFlowParticles = [];
    function createArc(fromCC, toCC) {
      var fromCen = CENTROIDS[fromCC];
      var toCen = CENTROIDS[toCC];
      if (!fromCen || !toCen) return;
      var start = latLngToVector3(fromCen[1], fromCen[0], GLOBE_RADIUS * 1.005);
      var end = latLngToVector3(toCen[1], toCen[0], GLOBE_RADIUS * 1.005);
      var mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      var dist = start.distanceTo(end);
      mid.normalize().multiplyScalar(GLOBE_RADIUS + dist * 0.35);
      var curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      var arcPoints = curve.getPoints(50);
      var arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
      var arcMat = new THREE.LineBasicMaterial({ color: 0xf7931a, transparent: true, opacity: 0 });
      var arcLine = new THREE.Line(arcGeo, arcMat);
      arcsGroup.add(arcLine);

      var flowCount = 2 + Math.floor(Math.random() * 2);
      var flowParticles = [];
      if (!prefersReducedMotion) {
        var flowGeo = new THREE.SphereGeometry(0.005, 6, 6);
        var flowMat = new THREE.MeshBasicMaterial({ color: 0xf7931a, transparent: true, opacity: 0.9 });
        for (var fi = 0; fi < flowCount; fi++) {
          var fMesh = new THREE.Mesh(flowGeo, flowMat.clone());
          fMesh.visible = false;
          arcsGroup.add(fMesh);
          flowParticles.push({ mesh: fMesh, offset: fi / flowCount });
        }
      }

      var startTime = performance.now();
      var duration = 4000;
      var arcEntry = { line: arcLine, particles: flowParticles, curve: curve, startTime: startTime, duration: duration, removed: false };
      arcFlowParticles.push(arcEntry);

      function animateArc() {
        if (arcEntry.removed) return;
        var elapsed = performance.now() - startTime;
        var progress = elapsed / duration;
        if (progress >= 1) {
          arcsGroup.remove(arcLine);
          arcGeo.dispose();
          arcMat.dispose();
          flowParticles.forEach(function (fp) {
            arcsGroup.remove(fp.mesh);
            fp.mesh.geometry.dispose();
            fp.mesh.material.dispose();
          });
          arcEntry.removed = true;
          return;
        }
        if (progress < 0.5) {
          var drawRange = Math.floor(progress * 2 * 51);
          arcGeo.setDrawRange(0, drawRange);
          arcMat.opacity = Math.min(progress * 4, 0.5);
        } else if (progress < 0.75) {
          arcGeo.setDrawRange(0, 51);
          arcMat.opacity = 0.5;
        } else {
          arcGeo.setDrawRange(0, 51);
          arcMat.opacity = 0.5 * (1 - (progress - 0.75) / 0.25);
        }
        if (!prefersReducedMotion) {
          flowParticles.forEach(function (fp) {
            var tVal = ((progress * 2 + fp.offset) % 1);
            if (progress > 0.1 && progress < 0.9) {
              fp.mesh.visible = true;
              var pt = curve.getPoint(tVal);
              fp.mesh.position.copy(pt);
              fp.mesh.material.opacity = arcMat.opacity * 1.5;
            } else {
              fp.mesh.visible = false;
            }
          });
        }
        requestAnimationFrame(animateArc);
      }
      requestAnimationFrame(animateArc);
    }

    var ARC_PAIRS_FALLBACK = [
      ['US','DE'],['US','GB'],['US','CN'],['US','JP'],['US','SG'],
      ['DE','NL'],['DE','FR'],['GB','FR'],['CN','JP'],['US','CA'],
      ['US','BR'],['DE','CH'],['JP','KR'],['US','AU'],['GB','IN'],
      ['FR','IT'],['DE','PL'],['US','MX'],['CN','HK'],['SG','AU'],
    ];

    function buildDynamicArcPairs(mapData) {
      if (!mapData || !mapData.data || mapData.data.length < 2) return ARC_PAIRS_FALLBACK;
      var topCountries = mapData.data.slice(0, 8).map(function (e) { return e[0]; })
        .filter(function (cc) { return !!CENTROIDS[cc]; });
      if (topCountries.length < 2) return ARC_PAIRS_FALLBACK;
      var pairs = [];
      for (var i = 0; i < topCountries.length && pairs.length < 5; i++) {
        for (var j = i + 1; j < topCountries.length && pairs.length < 5; j++) {
          pairs.push([topCountries[i], topCountries[j]]);
        }
      }
      var merged = pairs.concat(ARC_PAIRS_FALLBACK.slice(0, 15));
      var seen = {};
      return merged.filter(function (p) {
        var key = p[0] + '-' + p[1];
        var keyRev = p[1] + '-' + p[0];
        if (seen[key] || seen[keyRev]) return false;
        seen[key] = true;
        return true;
      });
    }

    var arcInterval = null;
    var currentArcPairs = ARC_PAIRS_FALLBACK;
    function startArcAnimation(mapData) {
      if (arcInterval) clearInterval(arcInterval);
      if (prefersReducedMotion) return;
      currentArcPairs = buildDynamicArcPairs(mapData);
      for (var i = 0; i < 3; i++) {
        var pair = currentArcPairs[Math.floor(Math.random() * currentArcPairs.length)];
        createArc(pair[0], pair[1]);
      }
      arcInterval = setInterval(function () {
        var pair = currentArcPairs[Math.floor(Math.random() * currentArcPairs.length)];
        createArc(pair[0], pair[1]);
      }, 2500);
    }

    // ── Click-to-zoom ──
    var zoomAnimation = null;
    function zoomToCountry(cc) {
      var cen = CENTROIDS[cc];
      if (!cen) return;
      controls.autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
      var targetPos = latLngToVector3(cen[1], cen[0], camera.position.length());
      var targetLookAt = new THREE.Vector3(0, 0, 0);
      var startPos = camera.position.clone();
      var startTarget = controls.target.clone();
      var frame = 0;
      var totalFrames = 60;
      if (zoomAnimation) cancelAnimationFrame(zoomAnimation);
      function animateZoom() {
        frame++;
        var progress = frame / totalFrames;
        var eased = 1 - Math.pow(1 - progress, 3);
        camera.position.lerpVectors(startPos, targetPos, eased);
        controls.target.lerpVectors(startTarget, targetLookAt, eased);
        controls.update();
        if (frame < totalFrames) {
          zoomAnimation = requestAnimationFrame(animateZoom);
        } else {
          zoomAnimation = null;
          if (!prefersReducedMotion) {
            idleTimer = setTimeout(function () { controls.autoRotate = true; }, 5000);
          }
        }
      }
      zoomAnimation = requestAnimationFrame(animateZoom);
    }

    // ── View reset ──
    function resetView() {
      controls.autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
      var startPos = camera.position.clone();
      var startTarget = controls.target.clone();
      var targetPos = new THREE.Vector3(0, 0.3, defaultCamZ);
      var targetLookAt = new THREE.Vector3(0, 0, 0);
      var frame = 0;
      var totalFrames = 60;
      if (zoomAnimation) cancelAnimationFrame(zoomAnimation);
      function animateReset() {
        frame++;
        var progress = frame / totalFrames;
        var eased = 1 - Math.pow(1 - progress, 3);
        camera.position.lerpVectors(startPos, targetPos, eased);
        controls.target.lerpVectors(startTarget, targetLookAt, eased);
        controls.update();
        if (frame < totalFrames) {
          zoomAnimation = requestAnimationFrame(animateReset);
        } else {
          zoomAnimation = null;
          if (!prefersReducedMotion) { controls.autoRotate = true; }
        }
      }
      zoomAnimation = requestAnimationFrame(animateReset);
    }

    // ── Raycaster ──
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var hoveredCC = null;
    var _rayThrottle = false;

    function doRaycast(event) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // In quad mode, raycast against the visible quad group
      var targets = [];
      if (!isMobileView && quadMode) {
        var qName = getQuadFromMouse(event);
        if (qName && quadGroups[qName]) {
          targets = quadGroups[qName].children;
        }
      } else if (!isMobileView && !quadMode && expandedQuad) {
        targets = quadGroups[expandedQuad].children;
      } else {
        targets = dataPointsGroup.children;
      }

      raycaster.setFromCamera(mouse, camera);
      var intersects = raycaster.intersectObjects(targets, true);
      var tooltip = document.getElementById('map-tooltip');

      if (intersects.length > 0) {
        var obj = intersects[0].object;
        var cc = obj._cc;
        if (cc) {
          hoveredCC = cc;
          var qn = getQuadFromMouse(event) || activeQuad;
          var mapData = quadMapData[qn] || window._mapData;
          var val = 0;
          var total = mapData ? mapData.total : 1;
          // Find value
          if (mapData && mapData.data) {
            if (mapData.type === 'isp') {
              for (var di = 0; di < mapData.data.length; di++) {
                if (mapData.data[di].name === cc) { val = mapData.data[di].count; break; }
              }
            } else {
              for (var di = 0; di < mapData.data.length; di++) {
                if (mapData.data[di][0] === cc) { val = mapData.data[di][1].count || 0; break; }
              }
            }
          }
          var pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
          var label = mapData && mapData.type === 'isp' ? 'nodes' : (qn === 'mining' ? t('block_label') : t('node_label'));
          var displayName = mapData && mapData.type === 'isp' ? cc : ((FLAGS[cc] || '') + ' ' + getName(cc));
          tooltip.innerHTML = '<b>' + escHtml(displayName) + '</b><br>' + val.toLocaleString() + ' ' + escHtml(label) + ' (' + pct + '%)';
          tooltip.style.setProperty('--x', (event.clientX - rect.left + 12) + 'px');
          tooltip.style.setProperty('--y', (event.clientY - rect.top - 10) + 'px');
          tooltip.classList.remove('hidden');
          canvas.style.cursor = 'pointer';
        }
      } else {
        if (hoveredCC) {
          tooltip.classList.add('hidden');
          hoveredCC = null;
          canvas.style.cursor = 'grab';
        }
      }
    }

    function onMouseMove(e) {
      if (_rayThrottle) return;
      _rayThrottle = true;
      var ev = e;
      requestAnimationFrame(function () {
        doRaycast(ev);
        _rayThrottle = false;
      });
    }

    function onClick(event) {
      // In desktop quad mode: check if clicking on a quad to expand
      if (!isMobileView && quadMode) {
        var qName = getQuadFromMouse(event);
        if (qName) {
          expandQuad(qName);
          return;
        }
      }

      var rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      var targets = [];
      if (!isMobileView && !quadMode && expandedQuad) {
        targets = quadGroups[expandedQuad].children;
      } else {
        targets = dataPointsGroup.children;
      }

      raycaster.setFromCamera(mouse, camera);
      var intersects = raycaster.intersectObjects(targets, true);

      if (intersects.length > 0) {
        var obj = intersects[0].object;
        var cc = obj._cc;
        if (cc && CENTROIDS[cc]) {
          zoomToCountry(cc);
          document.dispatchEvent(new CustomEvent('country-selected', { detail: { cc: cc } }));
          // Highlight in list
          var rows = document.querySelectorAll('.cl-row');
          rows.forEach(function (r) { r.classList.remove('highlighted'); });
          var name = getName(cc);
          rows.forEach(function (r) {
            if (r.querySelector('.cl-name')?.textContent === name) {
              r.classList.add('highlighted');
              r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          });
        }
      }
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    // Touch support
    canvas.addEventListener('touchend', function (e) {
      if (e.changedTouches.length > 0) {
        var touch = e.changedTouches[0];
        var mouseEvent = new MouseEvent('click', { clientX: touch.clientX, clientY: touch.clientY });
        onClick(mouseEvent);
      }
    });

    // ── Determine which quad a mouse event is in ──
    function getQuadFromMouse(event) {
      var rect = canvas.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var midX = rect.width / 2;
      var midY = rect.height / 2;

      if (x < midX && y < midY) return 'ln';
      if (x >= midX && y < midY) return 'mining';
      if (x < midX && y >= midY) return 'fullnode';
      if (x >= midX && y >= midY) return 'isp';
      return null;
    }

    // ── Quad expand/collapse ──
    // Expand/collapse animation state
    var expandAnim = null; // { from: {x,y,w,h}, to: {x,y,w,h}, progress: 0, qName, direction: 'expand'|'collapse' }
    var EXPAND_DURATION = 0.4; // seconds

    function expandQuad(qName) {
      activeQuad = qName;
      M.activeQuad = qName;

      // Start expand animation from quad position to full canvas
      var quadPositions = { ln: 0, mining: 1, fullnode: 2, isp: 3 };
      var idx = quadPositions[qName] || 0;
      var col = idx % 2, row = idx < 2 ? 1 : 0; // Three.js Y is bottom-up
      expandAnim = {
        qName: qName,
        direction: 'expand',
        progress: 0,
        fromX: col * 0.5, fromY: row * 0.5, fromW: 0.5, fromH: 0.5,
      };

      // Update grid UI
      var grid = document.getElementById('quad-grid');
      if (grid) {
        grid.classList.add('quad-expanded');
        grid.querySelectorAll('.quad-cell').forEach(function (cell) {
          cell.classList.toggle('quad-expanded-active', cell.dataset.quad === qName);
        });
      }

      updateRightPanel(qName);
    }

    function collapseQuad() {
      if (quadMode && !expandAnim) return;

      // Start collapse animation from full to quad position
      var qName = expandedQuad || (expandAnim ? expandAnim.qName : 'ln');
      var quadPositions = { ln: 0, mining: 1, fullnode: 2, isp: 3 };
      var idx = quadPositions[qName] || 0;
      var col = idx % 2, row = idx < 2 ? 1 : 0;
      expandAnim = {
        qName: qName,
        direction: 'collapse',
        progress: 0,
        fromX: col * 0.5, fromY: row * 0.5, fromW: 0.5, fromH: 0.5,
      };

      var grid = document.getElementById('quad-grid');
      if (grid) {
        grid.classList.remove('quad-expanded');
        grid.querySelectorAll('.quad-cell').forEach(function (cell) {
          cell.classList.remove('quad-expanded-active');
        });
      }
    }

    // ── Keyboard: ESC to collapse ──
    document.addEventListener('keydown', function (e) {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape' && !quadMode) {
        collapseQuad();
        e.preventDefault();
        return;
      }

      var handled = false;
      var keyRotateSpeed = 0.03;
      switch (e.key) {
        case 'ArrowLeft':
          controls.autoRotate = false;
          if (idleTimer) clearTimeout(idleTimer);
          camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), keyRotateSpeed));
          controls.update();
          onInteractionEnd();
          handled = true;
          break;
        case 'ArrowRight':
          controls.autoRotate = false;
          if (idleTimer) clearTimeout(idleTimer);
          camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -keyRotateSpeed));
          controls.update();
          onInteractionEnd();
          handled = true;
          break;
        case 'ArrowUp':
          controls.autoRotate = false;
          if (idleTimer) clearTimeout(idleTimer);
          var right = new THREE.Vector3().crossVectors(camera.position.clone().normalize(), new THREE.Vector3(0, 1, 0)).normalize();
          camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(right, -keyRotateSpeed));
          controls.update();
          onInteractionEnd();
          handled = true;
          break;
        case 'ArrowDown':
          controls.autoRotate = false;
          if (idleTimer) clearTimeout(idleTimer);
          var rightD = new THREE.Vector3().crossVectors(camera.position.clone().normalize(), new THREE.Vector3(0, 1, 0)).normalize();
          camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(rightD, keyRotateSpeed));
          controls.update();
          onInteractionEnd();
          handled = true;
          break;
        case 'Enter':
          if (document.activeElement && document.activeElement.classList.contains('cl-row')) {
            document.activeElement.click();
            handled = true;
          }
          break;
      }
      if (handled) e.preventDefault();
    });

    // ── Quad cell click & hover handlers (on header/list, not cell itself) ──
    document.querySelectorAll('.quad-cell').forEach(function (cell) {
      // Click on header or mini-list to expand
      var clickTargets = cell.querySelectorAll('.quad-header, .quad-mini-list');
      clickTargets.forEach(function (target) {
        target.addEventListener('click', function (e) {
          var qName = cell.dataset.quad;
          if (!qName) return;
          if (quadMode) {
            expandQuad(qName);
          } else if (expandedQuad === qName) {
            collapseQuad();
          }
          e.stopPropagation();
        });
        // Hover on header/list: update right panel
        target.addEventListener('mouseenter', function () {
          var qName = cell.dataset.quad;
          if (qName && quadMode) {
            updateRightPanel(qName);
          }
        });
      });
    });

    // ── Double-click to collapse ──
    canvas.addEventListener('dblclick', function () {
      if (!quadMode) {
        collapseQuad();
      }
    });

    // ── Spark / Pulse Effects ──
    var sparkTargets = [];
    var lastSparkTime = 0;
    var SPARK_INTERVAL = 3.5;
    var SPARK_DURATION = 1.2;

    function triggerSparks(elapsed, pmList) {
      if (prefersReducedMotion) return;
      if (pmList.length === 0) return;
      if (elapsed - lastSparkTime < SPARK_INTERVAL) return;
      lastSparkTime = elapsed;
      var count = 2 + Math.floor(Math.random() * 2);
      var available = pmList.slice();
      for (var s = 0; s < count && available.length > 0; s++) {
        var idx = Math.floor(Math.random() * available.length);
        var pm = available.splice(idx, 1)[0];
        sparkTargets.push({ pm: pm, startTime: elapsed, duration: SPARK_DURATION });
      }
    }

    function updateSparks(elapsed) {
      for (var i = sparkTargets.length - 1; i >= 0; i--) {
        var spark = sparkTargets[i];
        var progress = (elapsed - spark.startTime) / spark.duration;
        if (progress >= 1) {
          spark.pm.sprite.material.opacity = spark.pm._baseOpacity || 0.7;
          sparkTargets.splice(i, 1);
          continue;
        }
        var eased = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;
        var scaleMult = 1 + eased * 0.6;
        var opacityBoost = eased * 0.4;
        spark.pm.sprite.scale.set(spark.pm.baseSize * scaleMult, spark.pm.baseSize * scaleMult, 1);
        spark.pm.sprite.material.opacity = (spark.pm._baseOpacity || 0.7) + opacityBoost;
      }
    }

    function storeBaseOpacities(pmList) {
      pmList.forEach(function (pm) { pm._baseOpacity = pm.sprite.material.opacity; });
    }

    // City light frame counter
    var cityLightFrame = 0;

    // Animation loop
    var clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      var elapsed = clock.getElapsedTime();
      controls.update();

      // Get canvas dimensions & sync renderer size every frame
      var canvasW = canvas.clientWidth;
      var canvasH = canvas.clientHeight;
      var pixelRatio = renderer.getPixelRatio();
      var bufW = Math.floor(canvasW * pixelRatio);
      var bufH = Math.floor(canvasH * pixelRatio);
      if (canvas.width !== bufW || canvas.height !== bufH) {
        renderer.setSize(canvasW, canvasH, false);
      }

      // ── EXPAND/COLLAPSE ANIMATION ──
      if (expandAnim) {
        var dt = clock.getDelta() || 0.016;
        expandAnim.progress += dt / EXPAND_DURATION;
        if (expandAnim.progress >= 1) {
          expandAnim.progress = 1;
          if (expandAnim.direction === 'expand') {
            quadMode = false;
            expandedQuad = expandAnim.qName;
          } else {
            quadMode = true;
            expandedQuad = null;
          }
          expandAnim = null;
        }

        if (expandAnim) {
          var p = expandAnim.progress;
          // Ease in-out cubic
          var t = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

          var fx = expandAnim.fromX, fy = expandAnim.fromY;
          var fw = expandAnim.fromW, fh = expandAnim.fromH;
          var vx, vy, vw, vh;

          if (expandAnim.direction === 'expand') {
            vx = fx * (1 - t) * canvasW;
            vy = fy * (1 - t) * canvasH;
            vw = (fw + (1 - fw) * t) * canvasW;
            vh = (fh + (1 - fh) * t) * canvasH;
          } else {
            vx = fx * t * canvasW;
            vy = fy * t * canvasH;
            vw = (1 - (1 - fw) * t) * canvasW;
            vh = (1 - (1 - fh) * t) * canvasH;
          }

          renderer.setScissorTest(true);
          renderer.setViewport(vx, vy, vw, vh);
          renderer.setScissor(vx, vy, vw, vh);
          camera.aspect = vw / vh;
          camera.updateProjectionMatrix();

          Object.keys(quadGroups).forEach(function (qn) {
            quadGroups[qn].visible = (qn === expandAnim.qName);
          });
          dataPointsGroup.visible = false;
          arcsGroup.visible = (expandAnim.qName === 'ln');

          renderer.render(scene, camera);
          renderer.setScissorTest(false);
        }
      }

      if (expandAnim) {
        // Skip normal rendering during animation
      } else if (!isMobileView && !quadMode && expandedQuad) {
        // ── SINGLE EXPANDED QUAD ──
        renderer.setScissorTest(false);

        // Show only the expanded quad group
        Object.keys(quadGroups).forEach(function (qn) {
          quadGroups[qn].visible = (qn === expandedQuad);
        });
        dataPointsGroup.visible = false;
        arcsGroup.visible = (expandedQuad === 'ln');

        // Pulse effects on active quad
        var activePMs = quadPointMeshes[expandedQuad] || [];
        if (activePMs.length > 0 && !activePMs[0]._baseOpacity) {
          storeBaseOpacities(activePMs);
        }
        if (!prefersReducedMotion && activePMs.length > 0) {
          activePMs.forEach(function (pm) {
            var pulse = 1 + Math.sin(elapsed * 2 + (pm.cc || '').charCodeAt(0)) * 0.12;
            pm.sprite.scale.set(pm.baseSize * pulse, pm.baseSize * pulse, 1);
          });
          triggerSparks(elapsed, activePMs);
          updateSparks(elapsed);
        }

        renderer.render(scene, camera);

      } else if (!isMobileView && quadMode) {
        // ── QUAD VIEWPORT MODE ──
        renderer.setScissorTest(true);
        dataPointsGroup.visible = false;

        // All 4 viewports use identical size (exact half of canvas)
        var hw = canvasW * 0.5;
        var hh = canvasH * 0.5;
        var quadAspect = hw / hh;

        // Only update projection once (same aspect for all quads)
        camera.aspect = quadAspect;
        camera.updateProjectionMatrix();

        // Three.js Y=0 is bottom: top row y=hh, bottom row y=0
        var quadViewports = [
          { name: 'ln',       vx: 0,  vy: hh },
          { name: 'mining',   vx: hw, vy: hh },
          { name: 'fullnode', vx: 0,  vy: 0  },
          { name: 'isp',      vx: hw, vy: 0  },
        ];

        quadViewports.forEach(function (q) {
          renderer.setViewport(q.vx, q.vy, hw, hh);
          renderer.setScissor(q.vx, q.vy, hw, hh);

          // Toggle visibility: show only this quad's group
          Object.keys(quadGroups).forEach(function (qn) {
            quadGroups[qn].visible = (qn === q.name);
          });

          // Only show arcs in LN viewport
          arcsGroup.visible = (q.name === 'ln');

          renderer.render(scene, camera);
        });

        renderer.setScissorTest(false);

        // Pulse effects on all quad point meshes
        ['ln', 'mining', 'fullnode', 'isp'].forEach(function (qn) {
          var pms = quadPointMeshes[qn];
          if (pms && pms.length > 0) {
            if (!pms[0]._baseOpacity) storeBaseOpacities(pms);
            if (!prefersReducedMotion) {
              pms.forEach(function (pm) {
                var pulse = 1 + Math.sin(elapsed * 2 + (pm.cc || '').charCodeAt(0)) * 0.12;
                pm.sprite.scale.set(pm.baseSize * pulse, pm.baseSize * pulse, 1);
              });
            }
          }
        });
        if (!prefersReducedMotion) {
          var allPMs = [].concat(quadPointMeshes.ln, quadPointMeshes.mining, quadPointMeshes.fullnode, quadPointMeshes.isp);
          triggerSparks(elapsed, allPMs);
          updateSparks(elapsed);
        }

      } else {
        // ── MOBILE SINGLE GLOBE MODE ──
        renderer.setScissorTest(false);
        Object.keys(quadGroups).forEach(function (qn) { quadGroups[qn].visible = false; });
        dataPointsGroup.visible = true;
        arcsGroup.visible = true;

        if (pointMeshes.length > 0 && !pointMeshes[0]._baseOpacity) {
          storeBaseOpacities(pointMeshes);
        }
        if (!prefersReducedMotion && pointMeshes.length > 0) {
          pointMeshes.forEach(function (pm) {
            var pulse = 1 + Math.sin(elapsed * 2 + pm.cc.charCodeAt(0)) * 0.12;
            pm.sprite.scale.set(pm.baseSize * pulse, pm.baseSize * pulse, 1);
          });
          triggerSparks(elapsed, pointMeshes);
          updateSparks(elapsed);
        }

        renderer.render(scene, camera);
      }

      // Star field rotation
      if (starField) {
        starField.visible = isDark();
        if (!prefersReducedMotion && starField.visible) {
          starField.rotation.y += 0.0001;
        }
      }

      // City lights
      cityLightFrame++;
      if (cityLightFrame % 30 === 0) {
        cityLightSprites.forEach(function (sprite) {
          var dot = sprite._cityPos.dot(sunDir);
          if (dot < 0 && isDark()) {
            sprite.material.opacity = Math.min(-dot * 1.5, 0.8);
          } else {
            sprite.material.opacity = 0;
          }
        });
      }
    }

    // Handle resize
    function handleResize() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        bordersGroup.children.forEach(function (child) {
          if (child.material && child.material.resolution) {
            child.material.resolution.set(w, h);
          }
        });
      }

      var nowMobile = window.innerWidth < 768;
      var targetZ = nowMobile ? 3.5 : 3.0;
      if (Math.abs(camera.position.length() - targetZ) > 0.3) {
        camera.position.normalize().multiplyScalar(targetZ);
      }

      // Check mobile state change
      var wasMobile = isMobileView;
      isMobileView = window.innerWidth < 769;
      if (wasMobile !== isMobileView) {
        if (isMobileView) {
          // Switched to mobile: use single globe
          quadMode = false;
          expandedQuad = null;
          loadData();
        } else {
          // Switched to desktop: use quad mode
          quadMode = true;
          expandedQuad = null;
          loadAllQuadData();
        }
      }
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', function () {
      setTimeout(handleResize, 100);
    });

    // Store state
    globeState = {
      scene: scene, camera: camera, renderer: renderer, controls: controls,
      earthMesh: earthMesh, atmosMesh: atmosMesh, fillMesh: fillMesh,
      bordersGroup: bordersGroup, dataPointsGroup: dataPointsGroup, arcsGroup: arcsGroup,
      quadGroups: quadGroups,
      buildCountryOutlines: buildCountryOutlines,
      buildCountryFills: buildCountryFills,
      buildDataPoints: buildDataPoints,
      buildQuadDataPoints: buildQuadDataPoints,
      startArcAnimation: startArcAnimation,
      zoomToCountry: zoomToCountry,
      resetView: resetView,
      expandQuad: expandQuad,
      collapseQuad: collapseQuad,
      GLOBE_RADIUS: GLOBE_RADIUS, latLngToVector3: latLngToVector3, isDark: isDark,
      THREE: THREE,
      _valMap: {},
      _maxVal: 0,
      _mapData: null,
      handleResize: handleResize,
      updateTheme: function () {
        var dark = isDark();
        renderer.setClearColor(dark ? 0x050a12 : 0xf0f4f8);
        earthMat.color.set(dark ? 0xffffff : 0xcccccc);
        earthMat.needsUpdate = true;
        ambientLight.color.set(dark ? 0x334466 : 0x888888);
        ambientLight.intensity = dark ? 0.4 : 0.6;
        dirLight.intensity = dark ? 1.0 : 0.8;
        fillLight.intensity = dark ? 0.3 : 0.1;
        if (starField) starField.visible = dark;
      },
    };

    animate();
    return globeState;
  }

  // Wait for Three.js
  function waitForThree() {
    return new Promise(function (resolve) {
      if (window.__THREE) return resolve();
      var attempts = 0;
      var timer = setInterval(function () {
        if (window.__THREE || ++attempts > 100) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  }

  // ── Create mining period selector UI (mobile) ──
  function createMiningPeriodUI() {
    var tabOverlay = document.querySelector('#mobile-tab-overlay');
    if (!tabOverlay || document.getElementById('mining-period-wrap')) return;

    var wrap = document.createElement('div');
    wrap.id = 'mining-period-wrap';
    wrap.className = 'mining-period-wrap';
    wrap.style.display = currentTab === 'mining' ? '' : 'none';

    var periods = [
      { key: '24h', label: '24H' },
      { key: '3d', label: '3D' },
      { key: '1w', label: '1W' },
      { key: '1m', label: '1M' },
    ];

    periods.forEach(function (p) {
      var btn = document.createElement('button');
      btn.className = 'period-btn' + (p.key === currentMiningPeriod ? ' active' : '');
      btn.dataset.period = p.key;
      btn.textContent = p.label;
      btn.addEventListener('click', function () { setMiningPeriod(p.key); });
      wrap.appendChild(btn);
    });

    tabOverlay.appendChild(wrap);
  }

  // ── Globe action buttons ──
  function createGlobeActionButtons() {
    var globeCol = document.querySelector('.map-globe-col');
    if (!globeCol || document.getElementById('globe-actions')) return;

    var wrap = document.createElement('div');
    wrap.id = 'globe-actions';
    wrap.className = 'globe-actions';

    // Screenshot
    var ssBtn = document.createElement('button');
    ssBtn.className = 'globe-action-btn';
    ssBtn.title = M.lang === 'ko' ? '\uC2A4\uD06C\uB9B0\uC0F7' : M.lang === 'ja' ? '\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8' : 'Screenshot';
    ssBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    ssBtn.addEventListener('click', function () {
      var gs = globeState;
      if (!gs || !gs.renderer) return;
      gs.renderer.render(gs.scene, gs.camera);
      var dataUrl = gs.renderer.domElement.toDataURL('image/png');
      var link = document.createElement('a');
      link.download = 'bitcoin-node-map-' + new Date().toISOString().slice(0, 10) + '.png';
      link.href = dataUrl;
      link.click();
    });
    wrap.appendChild(ssBtn);

    // Fullscreen
    var fsBtn = document.createElement('button');
    fsBtn.className = 'globe-action-btn';
    fsBtn.title = M.lang === 'ko' ? '\uC804\uCCB4\uD654\uBA74' : M.lang === 'ja' ? '\u30D5\u30EB\u30B9\u30AF\u30EA\u30FC\u30F3' : 'Fullscreen';
    fsBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
    fsBtn.addEventListener('click', function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        globeCol.requestFullscreen().catch(function () {});
      }
    });
    wrap.appendChild(fsBtn);

    // Reset view
    var rvBtn = document.createElement('button');
    rvBtn.className = 'globe-action-btn';
    rvBtn.title = M.lang === 'ko' ? '\uBDF0 \uCD08\uAE30\uD654' : M.lang === 'ja' ? '\u30D3\u30E5\u30FC\u30EA\u30BB\u30C3\u30C8' : 'Reset View';
    rvBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
    rvBtn.addEventListener('click', function () {
      if (globeState && globeState.resetView) globeState.resetView();
      if (!quadMode) collapseQuad();
    });
    wrap.appendChild(rvBtn);

    globeCol.appendChild(wrap);

    // Add ESC hint element
    var escHint = document.createElement('div');
    escHint.className = 'quad-esc-hint';
    escHint.id = 'quad-esc-hint';
    escHint.textContent = t('press_esc');
    var grid = document.getElementById('quad-grid');
    if (grid) grid.appendChild(escHint);

    // Expose collapse function
    function collapseQuad() {
      if (globeState && globeState.collapseQuad) globeState.collapseQuad();
    }
  }

  // ── Init ──
  async function init() {
    try {
      await waitForThree();
      if (!window.__THREE) { console.error('Three.js failed to load'); return; }
      await initGlobe();

      createMiningPeriodUI();
      createGlobeActionButtons();

      var geo = await cachedFetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', 15000).then(function (r) { return r.json(); });
      worldGeoRaw = geo;

      // Build country outlines once
      if (globeState && worldGeoRaw) {
        globeState.buildCountryOutlines(worldGeoRaw);
      }

      if (isMobileView) {
        loadData();
      } else {
        loadAllQuadData();
      }
    } catch (e) {
      console.error('init error:', e);
      worldGeoRaw = null;
      loadData();
    }
  }
  init();

  // ── Expose on shared namespace ──
  M.globeState = globeState;
  M.getGlobeState = function () { return globeState; };
  M.switchTab = switchTab;
  M.loadData = loadData;
  M.loadAllQuadData = loadAllQuadData;
  M.renderMap = renderMap;
  M.updateGlobeTheme = updateGlobeTheme;
  M.renderCountryList = renderCountryList;
  M.setMiningPeriod = setMiningPeriod;
  M.cachedFetch = cachedFetch;
  M.activeQuad = activeQuad;
})();
