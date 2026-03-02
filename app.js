'use strict';
const API = 'https://mempool.space/api';
let currentTab = 'ln';

(function() {
  const t = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('theme-btn').textContent = t === 'dark' ? '🌙' : '☀️';
})();
function toggleTheme() {
  const h = document.documentElement;
  const next = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  h.setAttribute('data-theme', next); localStorage.setItem('theme', next);
  document.getElementById('theme-btn').textContent = next === 'dark' ? '🌙' : '☀️';
  renderMap(window._mapData);
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  loadData();
}

const FLAGS = {US:'🇺🇸',DE:'🇩🇪',GB:'🇬🇧',FR:'🇫🇷',NL:'🇳🇱',CA:'🇨🇦',SG:'🇸🇬',JP:'🇯🇵',AU:'🇦🇺',CH:'🇨🇭',
  FI:'🇫🇮',SE:'🇸🇪',NO:'🇳🇴',BR:'🇧🇷',KR:'🇰🇷',IN:'🇮🇳',RU:'🇷🇺',IT:'🇮🇹',ES:'🇪🇸',PL:'🇵🇱',
  AT:'🇦🇹',CZ:'🇨🇿',UA:'🇺🇦',TR:'🇹🇷',AR:'🇦🇷',MX:'🇲🇽',ZA:'🇿🇦',TH:'🇹🇭',ID:'🇮🇩',TW:'🇹🇼',
  HK:'🇭🇰',CN:'🇨🇳',MY:'🇲🇾',PH:'🇵🇭',VN:'🇻🇳',RO:'🇷🇴',HU:'🇭🇺',SK:'🇸🇰',DK:'🇩🇰',BE:'🇧🇪',
  PT:'🇵🇹',GR:'🇬🇷',BG:'🇧🇬',HR:'🇭🇷',LT:'🇱🇹',LV:'🇱🇻',EE:'🇪🇪',IL:'🇮🇱',AE:'🇦🇪',SA:'🇸🇦',
};
const NAMES = {US:'미국',DE:'독일',GB:'영국',FR:'프랑스',NL:'네덜란드',CA:'캐나다',SG:'싱가포르',JP:'일본',
  AU:'호주',CH:'스위스',FI:'핀란드',SE:'스웨덴',NO:'노르웨이',BR:'브라질',KR:'한국',IN:'인도',
  RU:'러시아',IT:'이탈리아',ES:'스페인',PL:'폴란드',AT:'오스트리아',CZ:'체코',UA:'우크라이나',
  TR:'터키',AR:'아르헨티나',MX:'멕시코',ZA:'남아공',TH:'태국',ID:'인도네시아',TW:'대만',HK:'홍콩',
  CN:'중국',MY:'말레이시아',PH:'필리핀',VN:'베트남',
};

// ISO3166 alpha2 → approximate centroid [lon, lat]
const CENTROIDS = {
  US:[-98,38],DE:[10,51],GB:[-2,54],FR:[2,46],NL:[5.3,52],CA:[-96,60],SG:[103.8,1.3],
  JP:[138,36],AU:[133,-25],CH:[8,47],FI:[26,64],SE:[18,62],NO:[10,62],BR:[-55,-10],
  KR:[127,37],IN:[78,22],RU:[100,60],IT:[12,42],ES:[-4,40],PL:[20,52],AT:[14,47],
  CZ:[16,50],UA:[32,49],TR:[36,39],AR:[-65,-35],MX:[-102,24],ZA:[25,-30],TH:[101,15],
  ID:[118,-2],TW:[121,24],HK:[114,22],CN:[105,35],MY:[110,4],PH:[122,13],VN:[108,16],
  RO:[25,46],HU:[19,47],SK:[19,48],DK:[10,56],BE:[4,51],PT:[-8,40],GR:[22,39],
  BG:[25,43],HR:[16,45],LT:[24,56],LV:[25,57],EE:[25,59],IL:[35,31],AE:[54,24],SA:[45,24],
};

let worldGeo = null;

async function loadData() {
  const gs = document.getElementById('global-stats');
  const cl = document.getElementById('country-list');
  gs.innerHTML = '<div style="color:var(--text3);font-size:.8rem;padding:8px">로딩 중…</div>';
  cl.innerHTML = '';

  try {
    if (currentTab === 'ln') {
      const [countries, stats] = await Promise.all([
        fetch(`${API}/v1/lightning/nodes/countries`).then(r=>r.json()),
        fetch(`${API}/v1/lightning/statistics/latest`).then(r=>r.json()),
      ]);
      const total = Object.values(countries).reduce((s,n) => s+(n.count||0), 0);
      const s = stats.latest || stats;
      gs.innerHTML = `
        <div class="gs-card"><div class="gs-val">${(s.node_count||0).toLocaleString()}</div><div class="gs-lbl">⚡ 총 노드 수</div></div>
        <div class="gs-card"><div class="gs-val">${(s.channel_count||0).toLocaleString()}</div><div class="gs-lbl">채널 수</div></div>
        <div class="gs-card"><div class="gs-val">${((s.total_capacity||0)/1e8).toFixed(0)} BTC</div><div class="gs-lbl">총 용량</div></div>`;

      const sorted = Object.entries(countries).sort((a,b)=>b[1].count-a[1].count);
      window._mapData = { type:'ln', data: sorted, total };
      renderMap(window._mapData);
      renderCountryList(sorted, total, 'nodes');
    } else {
      const pools = await fetch(`${API}/v1/mining/pools/1w`).then(r=>r.json());
      gs.innerHTML = `
        <div class="gs-card"><div class="gs-val">${pools.pools?.length||0}</div><div class="gs-lbl">⛏ 활성 마이닝 풀</div></div>
        <div class="gs-card"><div class="gs-val">${pools.blockCount||0}</div><div class="gs-lbl">최근 7일 블록</div></div>`;

      // 풀 국가 정보 매핑 (알려진 풀)
      const poolCountry = {
        'Foundry USA':'US','AntPool':'CN','F2Pool':'CN','ViaBTC':'CN','Binance Pool':'CN',
        'MARA Pool':'US','Luxor':'US','Braiins Pool':'CZ','SBI Crypto':'JP',
        'Poolin':'CN','BTC.com':'CN','1THash':'CN','SpiderPool':'CN',
        'Ocean':'GB','EMCDPool':'RU','Pega Pool':'KW','KuCoinPool':'SC',
      };
      const byCc = {};
      (pools.pools||[]).forEach(p => {
        const cc = poolCountry[p.name] || 'XX';
        if (!byCc[cc]) byCc[cc] = { count: 0, blocks: 0, pools: [] };
        byCc[cc].count++;
        byCc[cc].blocks += p.blockCount || 0;
        byCc[cc].pools.push(p.name);
      });
      const totalBlocks = Object.values(byCc).reduce((s,v)=>s+v.blocks, 0);
      const sorted = Object.entries(byCc).filter(([cc])=>cc!=='XX').sort((a,b)=>b[1].blocks-a[1].blocks);
      window._mapData = { type:'mining', data: sorted, total: totalBlocks };
      renderMap(window._mapData);
      renderCountryList(sorted.map(([cc,v])=>[cc,{count:v.blocks}]), totalBlocks, '블록');
    }
  } catch(e) {
    gs.innerHTML = `<div style="color:var(--red);font-size:.8rem">데이터 로드 실패: ${e.message}</div>`;
  }
}

function renderMap(mapData) {
  if (!mapData || !worldGeo) return;
  const svg = d3.select('#world-map');
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const W = 1000, H = 500;
  const proj = d3.geoNaturalEarth1().scale(153).translate([W/2, H/2]);
  const path = d3.geoPath().projection(proj);
  const tooltip = document.getElementById('map-tooltip');

  // 국가별 값 맵
  const valMap = {};
  let maxVal = 0;
  mapData.data.forEach(([cc, v]) => {
    const val = v.count || 0;
    valMap[cc] = val;
    if (val > maxVal) maxVal = val;
  });

  const colorScale = d3.scaleSequential()
    .domain([0, maxVal])
    .interpolator(isDark
      ? d3.interpolate('#1c2030', '#f7931a')
      : d3.interpolate('#eaeef2', '#bc4e00'));

  svg.selectAll('*').remove();

  svg.append('rect').attr('width', W).attr('height', H).attr('fill', isDark ? '#0d1117' : '#f6f8fa');

  svg.append('g').selectAll('path').data(worldGeo.features).join('path')
    .attr('class', 'country')
    .attr('d', path)
    .attr('fill', d => {
      const cc = d.properties.iso_a2;
      return valMap[cc] ? colorScale(valMap[cc]) : (isDark ? '#21262d' : '#eaeef2');
    })
    .attr('stroke', isDark ? '#30363d' : '#d0d7de')
    .attr('stroke-width', 0.5)
    .on('mouseover', (e, d) => {
      const cc = d.properties.iso_a2;
      const val = valMap[cc];
      if (!val) return;
      const pct = ((val / mapData.total) * 100).toFixed(1);
      const label = currentTab === 'ln' ? '노드' : '블록';
      tooltip.innerHTML = `<b>${FLAGS[cc]||''} ${NAMES[cc]||cc}</b><br>${val.toLocaleString()} ${label} (${pct}%)`;
      tooltip.style.display = 'block';
    })
    .on('mousemove', e => {
      const rect = document.getElementById('world-map').getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    })
    .on('mouseout', () => tooltip.style.display = 'none');

  // 버블 (상위 20개국)
  const top20 = mapData.data.slice(0, 20);
  const rScale = d3.scaleSqrt().domain([0, maxVal]).range([0, 28]);

  top20.forEach(([cc, v]) => {
    const cen = CENTROIDS[cc];
    if (!cen) return;
    const [x, y] = proj(cen);
    if (!x || !y) return;
    svg.append('circle')
      .attr('cx', x).attr('cy', y)
      .attr('r', Math.max(3, rScale(v.count||0)))
      .attr('fill', '#f7931a').attr('fill-opacity', 0.5)
      .attr('stroke', '#f7931a').attr('stroke-width', 1)
      .attr('pointer-events', 'none');
  });
}

function renderCountryList(sorted, total, unit) {
  const cl = document.getElementById('country-list');
  const top = sorted.slice(0, 30);
  cl.innerHTML = top.map(([cc, v]) => {
    const val = v.count || 0;
    const pct = ((val / total) * 100).toFixed(1);
    const w = ((val / (top[0][1].count || 1)) * 100).toFixed(0);
    return `<div class="cl-row">
      <span class="cl-flag">${FLAGS[cc]||'🌐'}</span>
      <span class="cl-name">${NAMES[cc]||cc}</span>
      <div class="cl-bar-wrap"><div class="cl-bar" style="width:${w}%"></div></div>
      <span class="cl-count">${val.toLocaleString()}</span>
      <span class="cl-pct">${pct}%</span>
    </div>`;
  }).join('');
}

// 세계지도 GeoJSON 로드 (Natural Earth 110m)
async function init() {
  try {
    const geo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json());
    const topojson = await import('https://cdn.jsdelivr.net/npm/topojson-client@3/+esm');
    worldGeo = topojson.feature(geo, geo.objects.countries);
    // ISO alpha2 코드 맞추기 위해 countries 데이터 fetch
    const codesResp = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json());
    // topojson에 iso_a2 없으면 수동 매핑으로 보완
    loadData();
  } catch(e) {
    // GeoJSON fallback
    worldGeo = { features: [] };
    loadData();
  }
}
init();
