/**
 * map-data.js
 * Country names (KO/EN), country code mappings, flag emojis, centroids,
 * and API fetch utilities for the Bitcoin node map.
 *
 * Exports via window.txidMap namespace.
 */
(function () {
  'use strict';

  // ── Shared namespace ──
  window.txidMap = window.txidMap || {};

  // ── Utility: HTML escape ──
  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Utility: fetch with retry ──
  async function fetchRetry(url, timeout, retries) {
    for (var i = 0, m = retries || 2; i <= m; i++) {
      try {
        return await fetch(url, { signal: AbortSignal.timeout(timeout || 10000) });
      } catch (e) {
        if (i >= m) throw e;
        await new Promise(function (r) { setTimeout(r, 1000 << i); });
      }
    }
    throw new Error('fetchRetry exhausted');
  }

  // ── Flag emojis by ISO-2 ──
  var FLAGS = {
    US:'\u{1F1FA}\u{1F1F8}',DE:'\u{1F1E9}\u{1F1EA}',GB:'\u{1F1EC}\u{1F1E7}',FR:'\u{1F1EB}\u{1F1F7}',NL:'\u{1F1F3}\u{1F1F1}',CA:'\u{1F1E8}\u{1F1E6}',SG:'\u{1F1F8}\u{1F1EC}',JP:'\u{1F1EF}\u{1F1F5}',AU:'\u{1F1E6}\u{1F1FA}',CH:'\u{1F1E8}\u{1F1ED}',
    FI:'\u{1F1EB}\u{1F1EE}',SE:'\u{1F1F8}\u{1F1EA}',NO:'\u{1F1F3}\u{1F1F4}',BR:'\u{1F1E7}\u{1F1F7}',KR:'\u{1F1F0}\u{1F1F7}',IN:'\u{1F1EE}\u{1F1F3}',RU:'\u{1F1F7}\u{1F1FA}',IT:'\u{1F1EE}\u{1F1F9}',ES:'\u{1F1EA}\u{1F1F8}',PL:'\u{1F1F5}\u{1F1F1}',
    AT:'\u{1F1E6}\u{1F1F9}',CZ:'\u{1F1E8}\u{1F1FF}',UA:'\u{1F1FA}\u{1F1E6}',TR:'\u{1F1F9}\u{1F1F7}',AR:'\u{1F1E6}\u{1F1F7}',MX:'\u{1F1F2}\u{1F1FD}',ZA:'\u{1F1FF}\u{1F1E6}',TH:'\u{1F1F9}\u{1F1ED}',ID:'\u{1F1EE}\u{1F1E9}',TW:'\u{1F1F9}\u{1F1FC}',
    HK:'\u{1F1ED}\u{1F1F0}',CN:'\u{1F1E8}\u{1F1F3}',MY:'\u{1F1F2}\u{1F1FE}',PH:'\u{1F1F5}\u{1F1ED}',VN:'\u{1F1FB}\u{1F1F3}',RO:'\u{1F1F7}\u{1F1F4}',HU:'\u{1F1ED}\u{1F1FA}',SK:'\u{1F1F8}\u{1F1F0}',DK:'\u{1F1E9}\u{1F1F0}',BE:'\u{1F1E7}\u{1F1EA}',
    PT:'\u{1F1F5}\u{1F1F9}',GR:'\u{1F1EC}\u{1F1F7}',BG:'\u{1F1E7}\u{1F1EC}',HR:'\u{1F1ED}\u{1F1F7}',LT:'\u{1F1F1}\u{1F1F9}',LV:'\u{1F1F1}\u{1F1FB}',EE:'\u{1F1EA}\u{1F1EA}',IL:'\u{1F1EE}\u{1F1F1}',AE:'\u{1F1E6}\u{1F1EA}',SA:'\u{1F1F8}\u{1F1E6}',
    IS:'\u{1F1EE}\u{1F1F8}',IE:'\u{1F1EE}\u{1F1EA}',LU:'\u{1F1F1}\u{1F1FA}',SI:'\u{1F1F8}\u{1F1EE}',CL:'\u{1F1E8}\u{1F1F1}',CO:'\u{1F1E8}\u{1F1F4}',NZ:'\u{1F1F3}\u{1F1FF}',UY:'\u{1F1FA}\u{1F1FE}',PY:'\u{1F1F5}\u{1F1FE}',
    PE:'\u{1F1F5}\u{1F1EA}',VE:'\u{1F1FB}\u{1F1EA}',BO:'\u{1F1E7}\u{1F1F4}',NG:'\u{1F1F3}\u{1F1EC}',KE:'\u{1F1F0}\u{1F1EA}',GH:'\u{1F1EC}\u{1F1ED}',MA:'\u{1F1F2}\u{1F1E6}',EG:'\u{1F1EA}\u{1F1EC}',TN:'\u{1F1F9}\u{1F1F3}',
    IR:'\u{1F1EE}\u{1F1F7}',IQ:'\u{1F1EE}\u{1F1F6}',SY:'\u{1F1F8}\u{1F1FE}',LB:'\u{1F1F1}\u{1F1E7}',QA:'\u{1F1F6}\u{1F1E6}',KW:'\u{1F1F0}\u{1F1FC}',BH:'\u{1F1E7}\u{1F1ED}',OM:'\u{1F1F4}\u{1F1F2}',JO:'\u{1F1EF}\u{1F1F4}',
    PK:'\u{1F1F5}\u{1F1F0}',BD:'\u{1F1E7}\u{1F1E9}',LK:'\u{1F1F1}\u{1F1F0}',NP:'\u{1F1F3}\u{1F1F5}',MM:'\u{1F1F2}\u{1F1F2}',KH:'\u{1F1F0}\u{1F1ED}',
    BY:'\u{1F1E7}\u{1F1FE}',MD:'\u{1F1F2}\u{1F1E9}',AM:'\u{1F1E6}\u{1F1F2}',GE:'\u{1F1EC}\u{1F1EA}',AZ:'\u{1F1E6}\u{1F1FF}',KZ:'\u{1F1F0}\u{1F1FF}',KG:'\u{1F1F0}\u{1F1EC}',UZ:'\u{1F1FA}\u{1F1FF}',
    AL:'\u{1F1E6}\u{1F1F1}',RS:'\u{1F1F7}\u{1F1F8}',BA:'\u{1F1E7}\u{1F1E6}',ME:'\u{1F1F2}\u{1F1EA}',MK:'\u{1F1F2}\u{1F1F0}',MT:'\u{1F1F2}\u{1F1F9}',CY:'\u{1F1E8}\u{1F1FE}',LI:'\u{1F1F1}\u{1F1EE}',AD:'\u{1F1E6}\u{1F1E9}',
    CU:'\u{1F1E8}\u{1F1FA}',DO:'\u{1F1E9}\u{1F1F4}',CR:'\u{1F1E8}\u{1F1F7}',PA:'\u{1F1F5}\u{1F1E6}',SV:'\u{1F1F8}\u{1F1FB}',GT:'\u{1F1EC}\u{1F1F9}',HN:'\u{1F1ED}\u{1F1F3}',NI:'\u{1F1F3}\u{1F1EE}',BZ:'\u{1F1E7}\u{1F1FF}',
    PR:'\u{1F1F5}\u{1F1F7}',JM:'\u{1F1EF}\u{1F1F2}',BS:'\u{1F1E7}\u{1F1F8}',BM:'\u{1F1E7}\u{1F1F2}',VG:'\u{1F1FB}\u{1F1EC}',AI:'\u{1F1E6}\u{1F1EE}',CW:'\u{1F1E8}\u{1F1FC}',
    AO:'\u{1F1E6}\u{1F1F4}',ZM:'\u{1F1FF}\u{1F1F2}',ZW:'\u{1F1FF}\u{1F1FC}',MZ:'\u{1F1F2}\u{1F1FF}',TZ:'\u{1F1F9}\u{1F1FF}',ET:'\u{1F1EA}\u{1F1F9}',
    VA:'\u{1F1FB}\u{1F1E6}',SM:'\u{1F1F8}\u{1F1F2}',MC:'\u{1F1F2}\u{1F1E8}',FO:'\u{1F1EB}\u{1F1F4}',
  };

  // ── Korean country names ──
  var NAMES = {
    US:'\uBBF8\uAD6D',DE:'\uB3C5\uC77C',GB:'\uC601\uAD6D',FR:'\uD504\uB791\uC2A4',NL:'\uB124\uB35C\uB780\uB4DC',CA:'\uCE90\uB098\uB2E4',SG:'\uC2F1\uAC00\uD3EC\uB974',JP:'\uC77C\uBCF8',
    AU:'\uD638\uC8FC',CH:'\uC2A4\uC704\uC2A4',FI:'\uD540\uB780\uB4DC',SE:'\uC2A4\uC6E8\uB374',NO:'\uB178\uB974\uC6E8\uC774',BR:'\uBE0C\uB77C\uC9C8',KR:'\uD55C\uAD6D',IN:'\uC778\uB3C4',
    RU:'\uB7EC\uC2DC\uC544',IT:'\uC774\uD0C8\uB9AC\uC544',ES:'\uC2A4\uD398\uC778',PL:'\uD3F4\uB780\uB4DC',AT:'\uC624\uC2A4\uD2B8\uB9AC\uC544',CZ:'\uCCB4\uCF54',UA:'\uC6B0\uD06C\uB77C\uC774\uB098',
    TR:'\uD130\uD0A4',AR:'\uC544\uB974\uD5E8\uD2F0\uB098',MX:'\uBA55\uC2DC\uCF54',ZA:'\uB0A8\uC544\uACF5',TH:'\uD0DC\uAD6D',ID:'\uC778\uB3C4\uB124\uC2DC\uC544',TW:'\uB300\uB9CC',HK:'\uD64D\uCF69',
    CN:'\uC911\uAD6D',MY:'\uB9D0\uB808\uC774\uC2DC\uC544',PH:'\uD544\uB9AC\uD540',VN:'\uBCA0\uD2B8\uB0A8',
    BE:'\uBCA8\uAE30\uC5D0',SK:'\uC2AC\uB85C\uBC14\uD0A4\uC544',LT:'\uB9AC\uD22C\uC544\uB2C8\uC544',LV:'\uB77C\uD2B8\uBE44\uC544',EE:'\uC5D0\uC2A4\uD1A0\uB2C8\uC544',
    RO:'\uB8E8\uB9C8\uB2C8\uC544',HU:'\uD5DD\uAC00\uB9AC',DK:'\uB374\uB9C8\uD06C',GR:'\uADF8\uB9AC\uC2A4',BG:'\uBD88\uAC00\uB9AC\uC544',
    HR:'\uD06C\uB85C\uC544\uD2F0\uC544',IE:'\uC544\uC77C\uB79C\uB4DC',PT:'\uD3EC\uB974\uD22C\uAC08',IL:'\uC774\uC2A4\uB77C\uC5D8',AE:'\uC544\uB78D\uC5D0\uBBF8\uB9AC\uD2B8',
    SA:'\uC0AC\uC6B0\uB514\uC544\uB77C\uBE44\uC544',IS:'\uC544\uC774\uC2AC\uB780\uB4DC',LU:'\uB8E9\uC148\uBD80\uB974\uD06C',SI:'\uC2AC\uB85C\uBCA0\uB2C8\uC544',
    CL:'\uCE60\uB808',CO:'\uCF5C\uB86C\uBE44\uC544',NZ:'\uB274\uC9C8\uB79C\uB4DC',UY:'\uC6B0\uB8E8\uACFC\uC774',PY:'\uD30C\uB77C\uACFC\uC774',
    PE:'\uD398\uB8E8',VE:'\uBCA0\uB124\uC218\uC5D8\uB77C',BO:'\uBCFC\uB9AC\uBE44\uC544',EC:'\uC5D0\uCF70\uB3C4\uB974',
    NG:'\uB098\uC774\uC9C0\uB9AC\uC544',KE:'\uCF00\uB0D0',GH:'\uAC00\uB098',ZM:'\uC7A0\uBE44\uC544',ET:'\uC5D0\uD2F0\uC624\uD53C\uC544',
    KP:'\uBD81\uD55C',MN:'\uBABD\uACE8',KZ:'\uCE74\uC790\uD750\uC2A4\uD0C4',UZ:'\uC6B0\uC988\uBCA0\uD0A4\uC2A4\uD0C4',
    IR:'\uC774\uB780',IQ:'\uC774\uB77C\uD06C',SY:'\uC2DC\uB9AC\uC544',LB:'\uB808\uBC14\uB17C',JO:'\uC694\uB974\uB2E8',
    QA:'\uCE74\uD0C0\uB974',KW:'\uCFE0\uC6E8\uC774\uD2B8',BH:'\uBC14\uB808\uC778',OM:'\uC624\uB9CC',
    TZ:'\uD0C4\uC790\uB2C8\uC544',MA:'\uBAA8\uB85C\uCF54',EG:'\uC774\uC9D1\uD2B8',TN:'\uD280\uB2C8\uC9C0',
    PK:'\uD30C\uD0A4\uC2A4\uD0C4',BD:'\uBC29\uAE00\uB77C\uB370\uC2DC',LK:'\uC2A4\uB9AC\uB791\uCE74',NP:'\uB124\uD314',MM:'\uBBF8\uC580\uB9C8',
    CU:'\uCFE0\uBC14',DO:'\uB3C4\uBBF8\uB2C8\uCE74\uACF5\uD654\uAD6D',CR:'\uCF54\uC2A4\uD0C0\uB9AC\uCE74',PA:'\uD30C\uB098\uB9C8',SV:'\uC5D8\uC0B4\uBC14\uB3C4\uB974',
    PR:'\uD478\uC5D0\uB974\uD1A0\uB9AC\uCF54',JM:'\uC790\uBA54\uC774\uCE74',TT:'\uD2B8\uB9AC\uB2C8\uB2E4\uB4DC\uD1A0\uBC14\uACE0',
    BY:'\uBCA8\uB77C\uB8E8\uC2A4',MD:'\uBAB0\uB3C4\uBC14',AM:'\uC544\uB974\uBA54\uB2C8\uC544',GE:'\uC870\uC9C0\uC544',AZ:'\uC544\uC81C\uB974\uBC14\uC774\uC794',
    AL:'\uC54C\uBC14\uB2C8\uC544',RS:'\uC138\uB974\uBE44\uC544',BA:'\uBCF4\uC2A4\uB2C8\uC544\uD5E4\uB974\uCCB4\uACE0\uBE44\uB098',ME:'\uBAAC\uD14C\uB124\uADF8\uB85C',MK:'\uBD81\uB9C8\uCF00\uB3C4\uB2C8\uC544',
    MT:'\uBAB0\uD0C0',CY:'\uD0A4\uD504\uB85C\uC2A4',LI:'\uB9AC\uD788\uD150\uC288\uD0C0\uC778',AD:'\uC548\uB3C4\uB77C',
    KG:'\uD0A4\uB974\uAE30\uC2A4\uC2A4\uD0C4',TJ:'\uD0C0\uC9C0\uD0A4\uC2A4\uD0C4',TM:'\uD22C\uB974\uD06C\uBA54\uB2C8\uC2A4\uD0C4',
    KH:'\uCE84\uBCF4\uB514\uC544',LA:'\uB77C\uC624\uC2A4',
    MO:'\uB9C8\uCE74\uC624',FO:'\uD398\uB85C\uC81C\uB3C4',JE:'\uC800\uC9C0\uC12C',IM:'\uB9E8\uC12C',GI:'\uC9C0\uBE0C\uB864\uD130',
    AO:'\uC559\uACE8\uB77C',MZ:'\uBAA8\uC7A0\uBE44\uD06C',ZW:'\uC9D0\uBC14\uBE0C\uC6E8',
    VA:'\uBC14\uD2F0\uCE78',SM:'\uC0B0\uB9C8\uB9AC\uB178',MC:'\uBAA8\uB098\uCF54',
    BZ:'\uBCA8\uB9AC\uC988',HN:'\uC628\uB450\uB77C\uC2A4',GT:'\uACFC\uD14C\uB9D0\uB77C',NI:'\uB2C8\uCE74\uB77C\uACFC',
    BM:'\uBC84\uBBA4\uB2E4',BS:'\uBC14\uD558\uB9C8',BB:'\uBC14\uBCA0\uC774\uB3C4\uC2A4',KY:'\uCF00\uC774\uB9E8\uC81C\uB3C4',
    VG:'\uC601\uAD6D\uB839\uBC84\uC9C4\uC544\uC77C\uB79C\uB4DC',AI:'\uC575\uADC8\uB77C',CW:'\uD034\uB77C\uC18C',
    RE:'\uB808\uC704\uB2C8\uC639',YT:'\uB9C8\uC694\uD2B8',GF:'\uD504\uB791\uC2A4\uB839\uAE30\uC544\uB098',
  };

  // ── English country names ──
  var EN_NAMES = {
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
    BM:'Bermuda',BS:'Bahamas',VG:'British Virgin Islands',AI:'Anguilla',CW:'Cura\u00E7ao',
    MA:'Morocco',EG:'Egypt',TN:'Tunisia',PK:'Pakistan',BD:'Bangladesh',
    LK:'Sri Lanka',NP:'Nepal',MM:'Myanmar',
  };

  // ── Country name by current lang ──
  function getName(cc) {
    var lang = window.txidMap.lang || 'ko';
    return lang === 'ko' ? (NAMES[cc] || cc) : (EN_NAMES[cc] || cc);
  }

  // ── Map centroids (lng, lat) for data points ──
  var CENTROIDS = {
    US:[-98,38],DE:[10,51],GB:[-2,54],FR:[2,46],NL:[5.3,52],CA:[-96,60],SG:[103.8,1.3],
    JP:[138,36],AU:[133,-25],CH:[8,47],FI:[26,64],SE:[18,62],NO:[10,62],BR:[-55,-10],
    KR:[127,37],IN:[78,22],RU:[100,60],IT:[12,42],ES:[-4,40],PL:[20,52],AT:[14,47],
    CZ:[16,50],UA:[32,49],TR:[36,39],AR:[-65,-35],MX:[-102,24],ZA:[25,-30],TH:[101,15],
    ID:[118,-2],TW:[121,24],HK:[114,22],CN:[105,35],MY:[110,4],PH:[122,13],VN:[108,16],
    RO:[25,46],HU:[19,47],SK:[19,48],DK:[10,56],BE:[4,51],PT:[-8,40],GR:[22,39],
    BG:[25,43],HR:[16,45],LT:[24,56],LV:[25,57],EE:[25,59],IL:[35,31],AE:[54,24],SA:[45,24],
  };

  // ── TopoJSON name -> ISO-2 mapping ──
  var NAME_TO_ISO2 = {
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

  // ── Mempool API base ──
  var API = 'https://mempool.space/api';

  // ── Expose on shared namespace ──
  window.txidMap.escHtml = escHtml;
  window.txidMap.fetchRetry = fetchRetry;
  window.txidMap.FLAGS = FLAGS;
  window.txidMap.NAMES = NAMES;
  window.txidMap.EN_NAMES = EN_NAMES;
  window.txidMap.getName = getName;
  window.txidMap.CENTROIDS = CENTROIDS;
  window.txidMap.NAME_TO_ISO2 = NAME_TO_ISO2;
  window.txidMap.API = API;
})();
