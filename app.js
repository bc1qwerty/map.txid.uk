function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
async function fetchRetry(url,timeout,retries){for(let i=0,m=retries||2;i<=m;i++){try{return await fetch(url,{signal:AbortSignal.timeout(timeout||10000)});}catch(e){if(i>=m)throw e;await new Promise(r=>setTimeout(r,1000<<i));}}}
'use strict';

// ── 언어 ──
let lang = localStorage.getItem('lang') || 'ko';
const LABELS = {
  ko: {탐색기:'탐색기', 도구:'도구', 시각화:'시각화', 통계:'통계', 노드:'노드', 지도:'지도', 포트폴리오:'포트폴리오', 전송:'전송', 배우기:'배우기', 앱모음:'앱모음'},
  en: {탐색기:'Explorer', 도구:'Tools', 시각화:'Viz', 통계:'Stats', 노드:'Nodes', 지도:'Map', 포트폴리오:'Portfolio', 전송:'TX', 배우기:'Learn', 앱모음:'Apps'},
  ja: {탐색기:'探索', 도구:'ツール', 시각화:'可視化', 통계:'統計', 노드:'ノード', 지도:'地図', 포트폴리오:'資産', 전송:'送金', 배우기:'学習', 앱모음:'アプリ'},
};

const i18n = {
  ko: {
    loading: '로딩 중…',
    total_nodes: '총 노드 수', channels: '채널 수', capacity: '총 용량',
    active_pools: '활성 마이닝 풀', blocks_7d: '최근 7일 블록',
    node_label: '노드', block_label: '블록',
    load_fail: '데이터 로드 실패',
  },
  en: {
    loading: 'Loading…',
    total_nodes: 'Total Nodes', channels: 'Channels', capacity: 'Capacity',
    active_pools: 'Active Pools', blocks_7d: '7-day Blocks',
    node_label: 'nodes', block_label: 'blocks',
    load_fail: 'Failed to load data',
  },
  ja: {
    loading: '読み込み中…',
    total_nodes: '総ノード数', channels: 'チャンネル数', capacity: '総容量',
    active_pools: 'アクティブプール', blocks_7d: '7日間ブロック',
    node_label: 'ノード', block_label: 'ブロック',
    load_fail: 'データ取得失敗',
  },
};
function t(k){ return (i18n[lang]&&i18n[lang][k])||i18n.ko[k]||k; }
function setLang(l){
  lang=l; localStorage.setItem('lang',lang);
  const btn=document.getElementById('lang-btn');
  if(btn) btn.textContent={ko:'KO',en:'EN',ja:'JA'}[lang]||'KO';
  document.getElementById('lang-menu')?.classList.remove('open');
  document.querySelectorAll('[data-ko]').forEach(el=>{
    const val=el.dataset[lang]||el.dataset.en||el.dataset.ko;
    if(val) el.textContent=val;
  });
  // 컨텐츠 재로드
  if(window._mapData) loadData();
}
function toggleLang(){const m=document.getElementById('lang-menu');m?.classList.toggle('open');document.getElementById('lang-btn')?.setAttribute('aria-expanded',m?.classList.contains('open')||false);}
document.addEventListener('click',e=>{const m=document.getElementById('lang-menu');if(m&&!e.target.closest('.lang-dropdown')){m.classList.remove('open');document.getElementById('lang-btn')?.setAttribute('aria-expanded','false');}});
(function(){setLang(lang);})();

const API = 'https://mempool.space/api';
let currentTab = 'ln';

(function() {
  const t = localStorage.getItem('theme') || 'dark';
  const isDark = t !== 'light';
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('theme-btn').innerHTML=isDark?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';document.getElementById('theme-btn').title=isDark?'라이트 모드로 전환':'다크 모드로 전환';
})();
function updateThemeBtn(){
  const btn=document.getElementById('theme-btn');if(!btn)return;
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  btn.innerHTML=isDark?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  btn.title=isDark?'라이트 모드로 전환':'다크 모드로 전환';
}
function toggleTheme() {
  const h = document.documentElement;
  const next = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  h.setAttribute('data-theme', next); localStorage.setItem('theme', next);
  updateThemeBtn();
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
  IS:'🇮🇸',IE:'🇮🇪',LU:'🇱🇺',SI:'🇸🇮',CL:'🇨🇱',CO:'🇨🇴',NZ:'🇳🇿',UY:'🇺🇾',PY:'🇵🇾',
  PE:'🇵🇪',VE:'🇻🇪',BO:'🇧🇴',NG:'🇳🇬',KE:'🇰🇪',GH:'🇬🇭',MA:'🇲🇦',EG:'🇪🇬',TN:'🇹🇳',
  IR:'🇮🇷',IQ:'🇮🇶',SY:'🇸🇾',LB:'🇱🇧',QA:'🇶🇦',KW:'🇰🇼',BH:'🇧🇭',OM:'🇴🇲',JO:'🇯🇴',
  PK:'🇵🇰',BD:'🇧🇩',LK:'🇱🇰',NP:'🇳🇵',MM:'🇲🇲',KH:'🇰🇭',VN:'🇻🇳',
  BY:'🇧🇾',MD:'🇲🇩',AM:'🇦🇲',GE:'🇬🇪',AZ:'🇦🇿',KZ:'🇰🇿',KG:'🇰🇬',UZ:'🇺🇿',
  AL:'🇦🇱',RS:'🇷🇸',BA:'🇧🇦',ME:'🇲🇪',MK:'🇲🇰',MT:'🇲🇹',CY:'🇨🇾',LI:'🇱🇮',AD:'🇦🇩',
  CU:'🇨🇺',DO:'🇩🇴',CR:'🇨🇷',PA:'🇵🇦',SV:'🇸🇻',GT:'🇬🇹',HN:'🇭🇳',NI:'🇳🇮',BZ:'🇧🇿',
  PR:'🇵🇷',JM:'🇯🇲',BS:'🇧🇸',BM:'🇧🇲',VG:'🇻🇬',AI:'🇦🇮',CW:'🇨🇼',
  AO:'🇦🇴',ZM:'🇿🇲',ZW:'🇿🇼',MZ:'🇲🇿',TZ:'🇹🇿',ET:'🇪🇹',
  VA:'🇻🇦',SM:'🇸🇲',MC:'🇲🇨',FO:'🇫🇴',
};
const NAMES = {
  US:'미국',DE:'독일',GB:'영국',FR:'프랑스',NL:'네덜란드',CA:'캐나다',SG:'싱가포르',JP:'일본',
  AU:'호주',CH:'스위스',FI:'핀란드',SE:'스웨덴',NO:'노르웨이',BR:'브라질',KR:'한국',IN:'인도',
  RU:'러시아',IT:'이탈리아',ES:'스페인',PL:'폴란드',AT:'오스트리아',CZ:'체코',UA:'우크라이나',
  TR:'터키',AR:'아르헨티나',MX:'멕시코',ZA:'남아공',TH:'태국',ID:'인도네시아',TW:'대만',HK:'홍콩',
  CN:'중국',MY:'말레이시아',PH:'필리핀',VN:'베트남',
  // 추가
  BE:'벨기에',SK:'슬로바키아',LT:'리투아니아',LV:'라트비아',EE:'에스토니아',
  RO:'루마니아',HU:'헝가리',DK:'덴마크',GR:'그리스',BG:'불가리아',
  HR:'크로아티아',IE:'아일랜드',PT:'포르투갈',IL:'이스라엘',AE:'아랍에미리트',
  SA:'사우디아라비아',IS:'아이슬란드',LU:'룩셈부르크',SI:'슬로베니아',
  CL:'칠레',CO:'콜롬비아',NZ:'뉴질랜드',UY:'우루과이',PY:'파라과이',
  PE:'페루',VE:'베네수엘라',BO:'볼리비아',EC:'에콰도르',
  NG:'나이지리아',KE:'케냐',GH:'가나',ZM:'잠비아',ET:'에티오피아',
  JP:'일본',KP:'북한',MN:'몽골',KZ:'카자흐스탄',UZ:'우즈베키스탄',
  IR:'이란',IQ:'이라크',SY:'시리아',LB:'레바논',JO:'요르단',
  QA:'카타르',KW:'쿠웨이트',BH:'바레인',OM:'오만',
  TZ:'탄자니아',ZA:'남아공',MA:'모로코',EG:'이집트',TN:'튀니지',
  PK:'파키스탄',BD:'방글라데시',LK:'스리랑카',NP:'네팔',MM:'미얀마',
  CU:'쿠바',DO:'도미니카공화국',CR:'코스타리카',PA:'파나마',SV:'엘살바도르',
  PR:'푸에르토리코',JM:'자메이카',TT:'트리니다드토바고',
  BY:'벨라루스',MD:'몰도바',AM:'아르메니아',GE:'조지아',AZ:'아제르바이잔',
  AL:'알바니아',RS:'세르비아',BA:'보스니아헤르체고비나',ME:'몬테네그로',MK:'북마케도니아',
  MT:'몰타',CY:'키프로스',LI:'리히텐슈타인',AD:'안도라',
  KG:'키르기스스탄',TJ:'타지키스탄',TM:'투르크메니스탄',
  KH:'캄보디아',LA:'라오스',MY:'말레이시아',
  MO:'마카오',FO:'페로제도',JE:'저지섬',IM:'맨섬',GI:'지브롤터',
  IS:'아이슬란드',AO:'앙골라',MZ:'모잠비크',ZW:'짐바브웨',
  VA:'바티칸',SM:'산마리노',MC:'모나코',
  BZ:'벨리즈',HN:'온두라스',GT:'과테말라',NI:'니카라과',
  BM:'버뮤다',BS:'바하마',BB:'바베이도스',KY:'케이맨제도',
  VG:'영국령버진아일랜드',AI:'앵귈라',CW:'퀴라소',
  RE:'레위니옹',YT:'마요트',GF:'프랑스령기아나',
  KR:'한국',
};


const EN_NAMES = {
  US:'United States',DE:'Germany',GB:'United Kingdom',FR:'France',NL:'Netherlands',
  CA:'Canada',SG:'Singapore',JP:'Japan',AU:'Australia',CH:'Switzerland',
  FI:'Finland',SE:'Sweden',NO:'Norway',BR:'Brazil',KR:'South Korea',IN:'India',
  RU:'Russia',IT:'Italy',ES:'Spain',PL:'Poland',AT:'Austria',CZ:'Czechia',
  UA:'Ukraine',TR:'Turkey',AR:'Argentina',MX:'Mexico',ZA:'South Africa',
  TH:'Thailand',ID:'Indonesia',TW:'Taiwan',HK:'Hong Kong',CN:'China',
  MY:'Malaysia',PH:'Philippines',VN:'Vietnam',BE:'Belgium',SK:'Slovakia',
  LT:'Lithuania',LV:'Latvia',EE:'Estonia',RO:'Romania',HU:'Hungary',
  DK:'Denmark',GR:'Greece',BG:'Bulgaria',HR:'Croatia',IE:'Ireland',
  PT:'Portugal',IL:'Israel',AE:'UAE',SA:'Saudi Arabia',IS:'Iceland',
  LU:'Luxembourg',SI:'Slovenia',CL:'Chile',CO:'Colombia',NZ:'New Zealand',
  UY:'Uruguay',PY:'Paraguay',PE:'Peru',VE:'Venezuela',BO:'Bolivia',
  NG:'Nigeria',KE:'Kenya',GH:'Ghana',IR:'Iran',SY:'Syria',LB:'Lebanon',
  QA:'Qatar',KW:'Kuwait',BH:'Bahrain',BY:'Belarus',MD:'Moldova',
  AM:'Armenia',GE:'Georgia',AZ:'Azerbaijan',AL:'Albania',RS:'Serbia',
  BA:'Bosnia',ME:'Montenegro',MT:'Malta',CY:'Cyprus',LI:'Liechtenstein',
  AD:'Andorra',KG:'Kyrgyzstan',KH:'Cambodia',MO:'Macao',FO:'Faroe Islands',
  AO:'Angola',VA:'Vatican',CU:'Cuba',DO:'Dominican Republic',CR:'Costa Rica',
  PA:'Panama',SV:'El Salvador',PR:'Puerto Rico',BZ:'Belize',
  BM:'Bermuda',BS:'Bahamas',VG:'British Virgin Islands',AI:'Anguilla',CW:'Curaçao',
  MA:'Morocco',EG:'Egypt',TN:'Tunisia',PK:'Pakistan',BD:'Bangladesh',
  LK:'Sri Lanka',NP:'Nepal',MM:'Myanmar',
};
function getName(cc){ return lang==='ko' ? (NAMES[cc]||cc) : (EN_NAMES[cc]||cc); }
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

// world-atlas name → ISO2 매핑
const NAME_TO_ISO2 = {
  'United States of America':'US','Germany':'DE','United Kingdom':'GB','France':'FR',
  'Netherlands':'NL','Canada':'CA','Singapore':'SG','Japan':'JP','Australia':'AU',
  'Switzerland':'CH','Finland':'FI','Sweden':'SE','Norway':'NO','Brazil':'BR',
  'South Korea':'KR','Korea':'KR','India':'IN','Russia':'RU','Italy':'IT',
  'Spain':'ES','Poland':'PL','Austria':'AT','Czech Republic':'CZ','Czechia':'CZ',
  'Ukraine':'UA','Turkey':'TR','Argentina':'AR','Mexico':'MX','South Africa':'ZA',
  'Thailand':'TH','Indonesia':'ID','Taiwan':'TW','Hong Kong':'HK','China':'CN',
  'Malaysia':'MY','Philippines':'PH','Vietnam':'VN','Romania':'RO','Hungary':'HU',
  'Denmark':'DK','Belgium':'BE','Portugal':'PT','Greece':'GR','Bulgaria':'BG',
  'Croatia':'HR','Lithuania':'LT','Latvia':'LV','Estonia':'EE','Israel':'IL',
  'United Arab Emirates':'AE','Saudi Arabia':'SA','Iceland':'IS','Luxembourg':'LU',
};


async function loadData() {
  const gs = document.getElementById('global-stats');
  const cl = document.getElementById('country-list');
  gs.innerHTML = `<div style="color:var(--text3);font-size:.8rem;padding:8px">${t('loading')}</div>`;
  cl.innerHTML = '';

  try {
    if (currentTab === 'ln') {
      const [countries, stats] = await Promise.all([
        fetchRetry(`${API}/v1/lightning/nodes/countries`,10000).then(r=>r.json()),
        fetchRetry(`${API}/v1/lightning/statistics/latest`,10000).then(r=>r.json()),
      ]);
      // API 응답: 배열 [{iso, count, ...}, ...]
      const total = countries.reduce((s,n) => s+(n.count||0), 0);
      const s = stats.latest || stats;
      gs.innerHTML = `
        <div class="gs-card"><div class="gs-val">${(s.node_count||0).toLocaleString()}</div><div class="gs-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ${t('total_nodes')}</div></div>
        <div class="gs-card"><div class="gs-val">${(s.channel_count||0).toLocaleString()}</div><div class="gs-lbl">${t('channels')}</div></div>
        <div class="gs-card"><div class="gs-val">${((s.total_capacity||0)/1e8).toFixed(0)} BTC</div><div class="gs-lbl">${t('capacity')}</div></div>`;

      const sorted = countries.map(n => [n.iso, {count: n.count, share: n.share}]).sort((a,b)=>b[1].count-a[1].count);
      window._mapData = { type:'ln', data: sorted, total };
      renderMap(window._mapData);
      renderCountryList(sorted, total, 'nodes');
    } else {
      const pools = await fetchRetry(`${API}/v1/mining/pools/1w`,10000).then(r=>r.json());
      gs.innerHTML = `
        <div class="gs-card"><div class="gs-val">${pools.pools?.length||0}</div><div class="gs-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><path d="M15 4l5 5-11 11H4v-5L15 4z"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${t('active_pools')}</div></div>
        <div class="gs-card"><div class="gs-val">${pools.blockCount||0}</div><div class="gs-lbl">${t('blocks_7d')}</div></div>`;

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
    console.error('loadData error:', e);
    gs.innerHTML = `<div style="color:var(--red);font-size:.8rem">${escHtml(t('load_fail'))}. <button onclick="loadData()" style="margin-left:8px;padding:2px 8px;font-size:.72rem;cursor:pointer">재시도</button></div>`;
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
      const cc = NAME_TO_ISO2[d.properties.name] || d.properties.iso_a2;
      return valMap[cc] ? colorScale(valMap[cc]) : (isDark ? '#21262d' : '#eaeef2');
    })
    .attr('stroke', isDark ? '#30363d' : '#d0d7de')
    .attr('stroke-width', 0.5)
    .on('mouseover', (e, d) => {
      const cc = NAME_TO_ISO2[d.properties.name] || d.properties.iso_a2;
      const val = valMap[cc];
      if (!val) return;
      const pct = ((val / mapData.total) * 100).toFixed(1);
      const label = currentTab === 'ln' ? t('node_label') : t('block_label');
      tooltip.innerHTML = `<b>${escHtml(FLAGS[cc]||'')} ${escHtml(getName(cc))}</b><br>${val.toLocaleString()} ${escHtml(label)} (${pct}%)`;
      tooltip.style.display = 'block';
    })
    .on('mousemove', e => {
      const rect = document.getElementById('world-map').getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    })
    .on('mouseout', () => tooltip.style.display = 'none')
    .on('click', (e, d) => {
      const cc = NAME_TO_ISO2[d.properties.name] || d.properties.iso_a2;
      const val = valMap[cc];
      if (!val) return;
      // 하이라이트
      svg.selectAll('.country').attr('stroke', isDark ? '#30363d' : '#d0d7de').attr('stroke-width', 0.5);
      d3.select(e.target).attr('stroke', '#f7931a').attr('stroke-width', 2);
      // 사이드패널 하이라이트
      const rows = document.querySelectorAll('.cl-row');
      rows.forEach(r => r.classList.remove('highlighted'));
      const names = NAMES[cc] || cc;
      rows.forEach(r => { if (r.querySelector('.cl-name')?.textContent === names) { r.classList.add('highlighted'); r.scrollIntoView({behavior:'smooth',block:'nearest'}); }});
      // 상세 패널 표시
      const pct = ((val / mapData.total) * 100).toFixed(1);
      const rank = mapData.data.findIndex(([c]) => c === cc) + 1;
      const label = currentTab === 'ln' ? t('node_label') : t('block_label');
      const detail = document.getElementById('map-detail');
      if (detail) detail.innerHTML = `<span style="font-size:1.4rem">\${FLAGS[cc]||''}</span> <b>\${getName(cc)}</b> &nbsp;<span style="color:var(--text3);font-size:.75rem">#\${rank}위</span><br><span style="color:var(--accent);font-weight:700">\${val.toLocaleString()}</span> \${label} · <span style="color:var(--text2)">\${pct}%</span>`;
    });

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
      <span class="cl-flag">${escHtml(FLAGS[cc]||'')}</span>
      <span class="cl-name">${escHtml(getName(cc))}</span>
      <div class="cl-bar-wrap"><div class="cl-bar" style="width:${w}%"></div></div>
      <span class="cl-count">${val.toLocaleString()}</span>
      <span class="cl-pct">${pct}%</span>
    </div>`;
  }).join('');
}

// 세계지도 GeoJSON 로드 (Natural Earth 110m)
async function init() {
  try {
    const geo = await fetchRetry('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',15000).then(r=>r.json());
    worldGeo = topojson.feature(geo, geo.objects.countries);
    loadData();
  } catch(e) {
    // GeoJSON fallback
    worldGeo = { features: [] };
    loadData();
  }
}
init();
