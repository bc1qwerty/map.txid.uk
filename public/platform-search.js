/**
 * platform-search.js — txid.uk Unified Platform Search
 * Usage: <script src="https://apps.txid.uk/platform-search.js" defer></script>
 * Shortcut: Ctrl+Shift+K / Cmd+Shift+K
 */
(function () {
  'use strict';

  /* ── Search Index ─────────────────────────────────────────── */
  var INDEX = [
    // ── Apps (subdomain sites) ──
    { title: { en: 'Bitcoin Explorer', ko: '비트코인 탐색기', ja: 'ビットコイン探索' }, desc: { en: 'Search blocks, transactions, and addresses', ko: '블록, 트랜잭션, 주소 검색', ja: 'ブロック・TX・アドレス検索' }, url: 'https://txid.uk', cat: 'apps', kw: ['explorer', 'block', 'transaction', 'address', 'mempool', '블록', '주소', '탐색'] },
    { title: { en: 'Tools', ko: '도구 모음', ja: 'ツール' }, desc: { en: 'Bitcoin developer tools & utilities', ko: '비트코인 개발자 도구 및 유틸리티', ja: 'Bitcoin開発者ツール集' }, url: 'https://tools.txid.uk', cat: 'apps', kw: ['tools', 'developer', '개발자', '도구', 'ツール'] },
    { title: { en: 'On-chain Stats', ko: '온체인 통계', ja: 'オンチェーン統計' }, desc: { en: 'Hashrate, difficulty, block size, mining pools', ko: '해시레이트, 난이도, 블록 크기, 마이닝 풀', ja: 'ハッシュレート・難易度・ブロックサイズ' }, url: 'https://stats.txid.uk', cat: 'apps', kw: ['stats', 'hashrate', 'difficulty', 'mining', '통계', '해시레이트', '난이도'] },
    { title: { en: 'Map & Nodes', ko: '지도 & 노드', ja: '地図 & ノード' }, desc: { en: 'World map, LN node explorer & mining pool distribution', ko: '세계 지도, 라이트닝 노드 탐색기 & 마이닝 풀 분포', ja: '世界地図、LNノード探索 & マイニングプール分布' }, url: 'https://map.txid.uk', cat: 'apps', kw: ['map', 'world', 'distribution', 'country', 'lightning', 'nodes', 'ln', 'channel', '지도', '분포', '地図', '라이트닝', '노드', 'ライトニング'] },
    { title: { en: 'Portfolio Tracker', ko: '포트폴리오 트래커', ja: 'ポートフォリオ' }, desc: { en: 'Track multiple BTC address balances', ko: '여러 BTC 주소 잔액 추적', ja: '複数BTCアドレス残高追跡' }, url: 'https://portfolio.txid.uk', cat: 'apps', kw: ['portfolio', 'balance', 'wallet', 'tracker', '포트폴리오', '잔액', '지갑'] },
    { title: { en: 'TX Builder', ko: 'TX 빌더', ja: 'TXビルダー' }, desc: { en: 'Raw TX decoder & broadcast', ko: 'Raw TX 디코더 및 브로드캐스트', ja: 'Raw TXデコーダ・ブロードキャスト' }, url: 'https://tx.txid.uk', cat: 'apps', kw: ['tx', 'transaction', 'raw', 'broadcast', 'decode', '브로드캐스트', '디코더'] },
    { title: { en: 'App Hub', ko: '앱 모음', ja: 'アプリ一覧' }, desc: { en: 'All txid.uk services in one place', ko: 'txid.uk 전체 서비스 모음', ja: 'txid.uk全サービス一覧' }, url: 'https://apps.txid.uk', cat: 'apps', kw: ['apps', 'hub', 'services', '앱', '모음', 'サービス'] },
    { title: { en: 'LNURL Auth', ko: 'LNURL 인증', ja: 'LNURL認証' }, desc: { en: 'Login with Lightning wallet (passwordless)', ko: '라이트닝 지갑으로 로그인 (비밀번호 없음)', ja: 'ライトニングウォレットでログイン' }, url: 'https://id.txid.uk', cat: 'apps', kw: ['lnurl', 'auth', 'login', 'lightning', '인증', '로그인'] },

    // ── Tools (tools.txid.uk) ──
    { title: { en: 'Address Validator', ko: '주소 검증', ja: 'アドレス検証' }, desc: { en: 'Validate & analyze Bitcoin addresses', ko: '비트코인 주소 유효성 검증 및 분석', ja: 'Bitcoinアドレスの検証・分析' }, url: 'https://tools.txid.uk#tool-address', cat: 'tools', kw: ['address', 'validate', 'verify', 'p2pkh', 'p2sh', 'bech32', '주소', '검증', 'アドレス'] },
    { title: { en: 'Script Decoder', ko: '스크립트 디코더', ja: 'スクリプトデコーダー' }, desc: { en: 'Decode scriptPubKey hex to opcodes', ko: 'scriptPubKey hex를 OP 코드로 디코드', ja: 'scriptPubKey hexをOPコードにデコード' }, url: 'https://tools.txid.uk#tool-script', cat: 'tools', kw: ['script', 'decode', 'pubkey', 'opcode', 'hex', '스크립트', 'デコード'] },
    { title: { en: 'BTC Unit Converter', ko: 'BTC 단위 변환기', ja: 'BTC単位変換器' }, desc: { en: 'Convert between BTC, satoshi, mBTC, bits', ko: 'BTC, 사토시, mBTC, bits 간 변환', ja: 'BTC・satoshi・mBTC・bits間の変換' }, url: 'https://tools.txid.uk#tool-unit', cat: 'tools', kw: ['unit', 'convert', 'satoshi', 'mbtc', 'bits', '단위', '변환', '사토시', '変換'] },
    { title: { en: 'Bech32 Decoder', ko: 'Bech32 디코더', ja: 'Bech32デコーダー' }, desc: { en: 'Decode Bech32 and Base58 encodings', ko: 'Bech32 및 Base58 인코딩 디코드', ja: 'Bech32・Base58エンコードのデコード' }, url: 'https://tools.txid.uk#tool-bech32', cat: 'tools', kw: ['bech32', 'base58', 'decode', 'segwit', 'encoding', '디코더'] },
    { title: { en: 'TX Broadcast', ko: 'TX 브로드캐스트', ja: 'TXブロードキャスト' }, desc: { en: 'Broadcast signed transactions to the network', ko: '서명된 트랜잭션을 네트워크에 전송', ja: '署名済みTXをネットワークに送信' }, url: 'https://tools.txid.uk#tool-broadcast', cat: 'tools', kw: ['broadcast', 'send', 'push', 'transmit', '전송', 'ブロードキャスト'] },
    { title: { en: 'OP Code Dictionary', ko: 'OP 코드 사전', ja: 'OPコード辞典' }, desc: { en: 'Complete Bitcoin Script opcode reference', ko: '비트코인 스크립트 OP 코드 전체 목록', ja: 'Bitcoin Script OPコード一覧' }, url: 'https://tools.txid.uk#tool-opcodes', cat: 'tools', kw: ['opcode', 'op_dup', 'op_hash', 'script', 'dictionary', 'OP코드', '사전', '辞典'] },
    { title: { en: 'Hash Calculator', ko: '해시 계산기', ja: 'ハッシュ計算機' }, desc: { en: 'SHA-256, RIPEMD-160, Hash160, Hash256', ko: 'SHA-256, RIPEMD-160, Hash160, Hash256 계산', ja: 'SHA-256, RIPEMD-160, Hash160, Hash256計算' }, url: 'https://tools.txid.uk#tool-hash', cat: 'tools', kw: ['hash', 'sha256', 'ripemd160', 'hash160', '해시', 'ハッシュ'] },
    { title: { en: 'Timestamp Converter', ko: '타임스탬프 변환', ja: 'タイムスタンプ変換' }, desc: { en: 'Unix timestamp to date converter', ko: 'Unix 타임스탬프 ↔ 날짜 변환', ja: 'Unixタイムスタンプ↔日付変換' }, url: 'https://tools.txid.uk#tool-time', cat: 'tools', kw: ['timestamp', 'unix', 'date', 'time', 'epoch', '타임스탬프', '날짜'] },
    { title: { en: 'Hex / Text Converter', ko: 'Hex / 텍스트 변환', ja: 'Hex/テキスト変換' }, desc: { en: 'Convert between hex and UTF-8 text', ko: 'Hex ↔ UTF-8 텍스트 변환', ja: 'Hex↔UTF-8テキスト変換' }, url: 'https://tools.txid.uk#tool-hex', cat: 'tools', kw: ['hex', 'text', 'utf8', 'convert', '변환', 'テキスト'] },

    // ── Learn (learn.txid.uk) ──
    { title: { en: 'Learn Bitcoin', ko: '비트코인 배우기', ja: 'ビットコインを学ぶ' }, desc: { en: 'Comprehensive Bitcoin learning platform', ko: '비트코인 종합 학습 플랫폼', ja: 'ビットコイン総合学習プラットフォーム' }, url: 'https://learn.txid.uk', cat: 'learn', kw: ['learn', 'education', 'tutorial', '학습', '배우기', '교육', '学習'] },
    { title: { en: 'Blog', ko: '블로그', ja: 'ブログ' }, desc: { en: 'Bitcoin articles and deep dives', ko: '비트코인 글 모음 및 심화 분석', ja: 'ビットコイン記事・深掘り分析' }, url: 'https://learn.txid.uk/en/blog/', cat: 'learn', kw: ['blog', 'article', 'post', '블로그', '글', 'ブログ'] },
    { title: { en: 'Getting Started', ko: '시작하기', ja: 'はじめる' }, desc: { en: 'Bitcoin basics for beginners', ko: '초보자를 위한 비트코인 기초', ja: '初心者向けビットコイン基礎' }, url: 'https://learn.txid.uk/en/start/', cat: 'learn', kw: ['start', 'beginner', 'basics', 'introduction', '시작', '초보', '기초', '入門'] },
    { title: { en: 'Ideas & Concepts', ko: '아이디어 · 개념', ja: 'アイデア・概念' }, desc: { en: 'Bitcoin concepts and thought experiments', ko: '비트코인 개념과 사고 실험', ja: 'ビットコインの概念と思考実験' }, url: 'https://learn.txid.uk/en/ideas/', cat: 'learn', kw: ['ideas', 'concepts', 'theory', '아이디어', '개념', '이론', 'アイデア'] },
    { title: { en: 'Book Reviews', ko: '도서 리뷰', ja: '書籍レビュー' }, desc: { en: 'Bitcoin and crypto book reviews', ko: '비트코인 관련 도서 리뷰', ja: 'ビットコイン関連書籍レビュー' }, url: 'https://learn.txid.uk/en/books/', cat: 'learn', kw: ['books', 'review', 'reading', '도서', '책', '리뷰', '書籍'] },
    { title: { en: 'People', ko: '인물', ja: '人物' }, desc: { en: 'Notable figures in Bitcoin history', ko: '비트코인 역사 속 주요 인물', ja: 'ビットコイン史上の重要人物' }, url: 'https://learn.txid.uk/en/people/', cat: 'learn', kw: ['people', 'satoshi', 'nakamoto', 'finney', '인물', '사토시', '人物'] },
    { title: { en: 'FAQ', ko: '자주 묻는 질문', ja: 'よくある質問' }, desc: { en: 'Frequently asked questions about Bitcoin', ko: '비트코인에 대해 자주 묻는 질문', ja: 'ビットコインに関するよくある質問' }, url: 'https://learn.txid.uk/en/faq/', cat: 'learn', kw: ['faq', 'question', 'answer', '질문', '답변', 'FAQ'] },
    { title: { en: 'Community', ko: '커뮤니티', ja: 'コミュニティ' }, desc: { en: 'Bitcoin community discussion board', ko: '비트코인 커뮤니티 게시판', ja: 'ビットコインコミュニティ掲示板' }, url: 'https://learn.txid.uk/en/community/', cat: 'learn', kw: ['community', 'forum', 'discussion', 'board', '커뮤니티', '게시판', 'コミュニティ'] },
    { title: { en: 'Dashboard', ko: '대시보드', ja: 'ダッシュボード' }, desc: { en: 'Learning progress dashboard', ko: '학습 진행 현황 대시보드', ja: '学習進捗ダッシュボード' }, url: 'https://learn.txid.uk/en/dashboard/', cat: 'learn', kw: ['dashboard', 'progress', '대시보드', '진행', 'ダッシュボード'] },
    { title: { en: 'Quests', ko: '퀘스트', ja: 'クエスト' }, desc: { en: 'Interactive Bitcoin learning quests', ko: '인터랙티브 비트코인 학습 퀘스트', ja: 'インタラクティブBitcoin学習クエスト' }, url: 'https://learn.txid.uk/en/quests/', cat: 'learn', kw: ['quest', 'challenge', 'gamify', '퀘스트', '도전', 'クエスト'] },
    { title: { en: 'Kids Zone', ko: '어린이 존', ja: 'キッズゾーン' }, desc: { en: 'Bitcoin explained for kids', ko: '어린이를 위한 비트코인 설명', ja: '子供向けビットコイン解説' }, url: 'https://learn.txid.uk/en/kids/', cat: 'learn', kw: ['kids', 'children', 'easy', 'simple', '어린이', '쉬운', 'キッズ'] },
    { title: { en: 'Levels', ko: '레벨', ja: 'レベル' }, desc: { en: 'Bitcoin knowledge by difficulty level', ko: '난이도별 비트코인 지식', ja: '難易度別ビットコイン知識' }, url: 'https://learn.txid.uk/en/levels/', cat: 'learn', kw: ['level', 'difficulty', 'beginner', 'advanced', '레벨', '난이도', 'レベル'] },
    { title: { en: 'Tags', ko: '태그', ja: 'タグ' }, desc: { en: 'Browse content by topic tags', ko: '주제 태그별 콘텐츠 탐색', ja: 'トピックタグ別コンテンツ閲覧' }, url: 'https://learn.txid.uk/en/tags/', cat: 'learn', kw: ['tags', 'topic', 'category', '태그', '주제', 'タグ'] },

    // ── Learn (specific topics) ──
    { title: { en: 'What is Bitcoin?', ko: '비트코인이란?', ja: 'ビットコインとは？' }, desc: { en: 'Introduction to Bitcoin for newcomers', ko: '비트코인 입문자를 위한 소개', ja: 'ビットコイン初心者向け紹介' }, url: 'https://learn.txid.uk/en/start/', cat: 'learn', kw: ['what', 'bitcoin', 'intro', '뭐', '무엇', '소개'] },
    { title: { en: 'Bitcoin Wallet Addresses', ko: '비트코인 지갑 주소', ja: 'ビットコインウォレットアドレス' }, desc: { en: 'How Bitcoin addresses work (P2PKH, P2SH, Bech32)', ko: '비트코인 주소의 작동 원리', ja: 'Bitcoinアドレスの仕組み' }, url: 'https://learn.txid.uk/en/blog/bitcoin-wallet-address/', cat: 'learn', kw: ['wallet', 'address', 'p2pkh', 'p2sh', 'bech32', 'taproot', '지갑', '주소'] },
    { title: { en: 'How to Read a Transaction', ko: '트랜잭션 읽는 법', ja: 'トランザクションの読み方' }, desc: { en: 'Understanding Bitcoin transaction structure', ko: '비트코인 트랜잭션 구조 이해하기', ja: 'Bitcoinトランザクション構造の理解' }, url: 'https://learn.txid.uk/en/blog/how-to-read-bitcoin-transaction/', cat: 'learn', kw: ['transaction', 'read', 'input', 'output', 'utxo', '트랜잭션', '읽기'] },
    { title: { en: 'Satoshi Nakamoto', ko: '사토시 나카모토', ja: 'サトシ・ナカモト' }, desc: { en: 'The mysterious creator of Bitcoin', ko: '비트코인의 신비로운 창시자', ja: 'ビットコインの謎の創設者' }, url: 'https://learn.txid.uk/en/people/', cat: 'learn', kw: ['satoshi', 'nakamoto', 'creator', 'founder', '사토시', '나카모토', '창시자'] },
    { title: { en: 'Bitcoin Halving', ko: '비트코인 반감기', ja: 'ビットコイン半減期' }, desc: { en: 'Understanding Bitcoin block reward halvings', ko: '비트코인 블록 보상 반감기 이해', ja: 'ビットコインブロック報酬半減期の理解' }, url: 'https://learn.txid.uk/en/blog/', cat: 'learn', kw: ['halving', 'halvening', 'reward', 'supply', '반감기', '보상', '공급'] },
    { title: { en: 'Bitcoin Mining', ko: '비트코인 채굴', ja: 'ビットコインマイニング' }, desc: { en: 'How proof-of-work mining secures Bitcoin', ko: '작업증명 채굴이 비트코인을 보호하는 방법', ja: 'プルーフオブワークマイニングの仕組み' }, url: 'https://learn.txid.uk/en/blog/', cat: 'learn', kw: ['mining', 'miner', 'proof', 'work', 'pow', 'nonce', '채굴', '마이닝'] },
    { title: { en: 'Lightning Network', ko: '라이트닝 네트워크', ja: 'ライトニングネットワーク' }, desc: { en: 'Layer 2 payment channels for instant Bitcoin payments', ko: '즉시 비트코인 결제를 위한 레이어 2 결제 채널', ja: '即時BTC決済のためのレイヤー2ペイメントチャンネル' }, url: 'https://learn.txid.uk/en/blog/', cat: 'learn', kw: ['lightning', 'network', 'layer2', 'l2', 'payment', 'channel', '라이트닝', 'ライトニング'] },
    { title: { en: 'SegWit Explained', ko: '세그윗 설명', ja: 'SegWit解説' }, desc: { en: 'Segregated Witness upgrade explained', ko: 'Segregated Witness 업그레이드 설명', ja: 'Segregated Witnessアップグレード解説' }, url: 'https://learn.txid.uk/en/blog/', cat: 'learn', kw: ['segwit', 'segregated', 'witness', 'malleability', '세그윗'] },

    // ── Actions (quick links) ──
    { title: { en: 'Search TXID', ko: 'TXID 검색', ja: 'TXID検索' }, desc: { en: 'Look up a transaction by TXID', ko: 'TXID로 트랜잭션 조회', ja: 'TXIDでトランザクション検索' }, url: 'https://txid.uk', cat: 'actions', kw: ['txid', 'search', 'lookup', 'transaction', '검색', '조회', '検索'] },
    { title: { en: 'Search Address', ko: '주소 검색', ja: 'アドレス検索' }, desc: { en: 'Look up a Bitcoin address', ko: '비트코인 주소 조회', ja: 'Bitcoinアドレス検索' }, url: 'https://txid.uk', cat: 'actions', kw: ['address', 'search', 'balance', '주소', '잔액', 'アドレス'] },
    { title: { en: 'Search Block', ko: '블록 검색', ja: 'ブロック検索' }, desc: { en: 'Look up a block by height or hash', ko: '높이 또는 해시로 블록 조회', ja: '高さまたはハッシュでブロック検索' }, url: 'https://txid.uk', cat: 'actions', kw: ['block', 'height', 'hash', '블록', '높이', 'ブロック'] },
    { title: { en: 'Validate Address', ko: '주소 검증하기', ja: 'アドレスを検証' }, desc: { en: 'Check if a Bitcoin address is valid', ko: '비트코인 주소 유효성 확인', ja: 'Bitcoinアドレスの有効性確認' }, url: 'https://tools.txid.uk#tool-address', cat: 'actions', kw: ['validate', 'check', 'verify', 'address', '검증', '확인'] },
    { title: { en: 'Convert Units', ko: '단위 변환', ja: '単位変換' }, desc: { en: 'BTC ↔ Satoshi ↔ KRW ↔ USD', ko: 'BTC ↔ 사토시 ↔ 원 ↔ 달러', ja: 'BTC ↔ satoshi ↔ KRW ↔ USD' }, url: 'https://tools.txid.uk#tool-unit', cat: 'actions', kw: ['convert', 'btc', 'satoshi', 'krw', 'usd', 'price', '변환', '환산'] },
    { title: { en: 'Track Portfolio', ko: '포트폴리오 관리', ja: 'ポートフォリオ管理' }, desc: { en: 'Add addresses to track your BTC holdings', ko: '주소를 추가해 BTC 보유량 추적', ja: 'アドレスを追加してBTC保有量追跡' }, url: 'https://portfolio.txid.uk', cat: 'actions', kw: ['portfolio', 'track', 'holdings', 'watch', '추적', '보유', '管理'] },
    { title: { en: 'Broadcast Transaction', ko: '트랜잭션 전송', ja: 'TX送信' }, desc: { en: 'Push a signed TX to the Bitcoin network', ko: '서명된 TX를 비트코인 네트워크에 전송', ja: '署名済みTXをBitcoinネットワークに送信' }, url: 'https://tools.txid.uk#tool-broadcast', cat: 'actions', kw: ['broadcast', 'push', 'send', 'signed', '전송', '전파', '送信'] },
    { title: { en: 'Explore Lightning', ko: '라이트닝 탐색', ja: 'ライトニング探索' }, desc: { en: 'Browse Lightning Network nodes & channels', ko: '라이트닝 네트워크 노드 · 채널 탐색', ja: 'ライトニングネットワークのノード・チャンネル閲覧' }, url: 'https://map.txid.uk', cat: 'actions', kw: ['lightning', 'explore', 'channels', 'routing', '탐색', 'ライトニング'] },
    { title: { en: 'Mining Pool Map', ko: '마이닝 풀 지도', ja: 'マイニングプール地図' }, desc: { en: 'See global mining pool distribution', ko: '전 세계 마이닝 풀 분포 확인', ja: '世界のマイニングプール分布を確認' }, url: 'https://map.txid.uk', cat: 'actions', kw: ['mining', 'pool', 'map', 'global', '마이닝', '풀', '지도'] },
  ];

  /* ── i18n ──────────────────────────────────────────────────── */
  var LABELS = {
    placeholder: { en: 'Search txid.uk platform...', ko: 'txid.uk 전체 검색...', ja: 'txid.uk 全体検索...' },
    apps:    { en: 'Apps',    ko: '앱',      ja: 'アプリ' },
    tools:   { en: 'Tools',   ko: '도구',    ja: 'ツール' },
    learn:   { en: 'Learn',   ko: '학습',    ja: '学習' },
    actions: { en: 'Actions', ko: '바로가기', ja: 'アクション' },
    noResults: { en: 'No results found', ko: '검색 결과 없음', ja: '検索結果なし' },
    hint:    { en: 'to navigate', ko: '이동', ja: '移動' },
    close:   { en: 'close', ko: '닫기', ja: '閉じる' },
    select:  { en: 'select', ko: '선택', ja: '選択' },
  };

  function getLang() {
    try { return localStorage.getItem('lang') || 'en'; } catch (e) { return 'en'; }
  }

  function t(obj) {
    var lang = getLang();
    return (obj && (obj[lang] || obj.en || obj.ko)) || '';
  }

  /* ── Fuzzy Match ──────────────────────────────────────────── */
  function fuzzyScore(query, text) {
    if (!query || !text) return 0;
    var q = query.toLowerCase();
    var s = text.toLowerCase();
    if (s.indexOf(q) !== -1) return 100 + (q.length / s.length) * 50;
    var qi = 0, score = 0, consecutive = 0, lastIdx = -1;
    for (var si = 0; si < s.length && qi < q.length; si++) {
      if (s[si] === q[qi]) {
        score += 10;
        if (lastIdx === si - 1) { consecutive++; score += consecutive * 5; } else { consecutive = 0; }
        if (si === 0 || s[si - 1] === ' ' || s[si - 1] === '-' || s[si - 1] === '_') score += 8;
        lastIdx = si;
        qi++;
      }
    }
    return qi === q.length ? score : 0;
  }

  function searchIndex(query) {
    if (!query || !query.trim()) return INDEX;
    var q = query.trim().toLowerCase();
    var lang = getLang();
    var scored = [];
    for (var i = 0; i < INDEX.length; i++) {
      var item = INDEX[i];
      var titleStr = (item.title[lang] || item.title.en || '') + ' ' + (item.title.en || '');
      var descStr = (item.desc[lang] || item.desc.en || '') + ' ' + (item.desc.en || '');
      var kwStr = (item.kw || []).join(' ');
      var best = Math.max(
        fuzzyScore(q, titleStr) * 1.5,
        fuzzyScore(q, descStr),
        fuzzyScore(q, kwStr) * 1.2
      );
      if (best > 0) scored.push({ item: item, score: best });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (s) { return s.item; });
  }

  /* ── Category Icons (SVG) ─────────────────────────────────── */
  var CAT_ICONS = {
    apps: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    tools: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    learn: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
    actions: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  };

  /* ── CSS ───────────────────────────────────────────────────── */
  var STYLE_ID = 'txid-platform-search-css';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/platform-search.css';
    document.head.appendChild(link);
  }

  /* ── Modal ────────────────────────────────────────────────── */
  var modal = null;
  var input = null;
  var listEl = null;
  var activeIdx = -1;
  var visibleItems = [];

  function createModal() {
    if (modal) return;
    var wrap = document.createElement('div');
    wrap.id = 'ps-overlay';
    wrap.innerHTML =
      '<div id="ps-modal" role="dialog" aria-modal="true" aria-label="Platform Search">' +
        '<div id="ps-input-wrap">' +
          '<svg id="ps-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input id="ps-input" type="text" autocomplete="off" spellcheck="false">' +
          '<kbd id="ps-esc-hint">esc</kbd>' +
        '</div>' +
        '<div id="ps-results"></div>' +
        '<div id="ps-footer">' +
          '<span class="ps-foot-item"><kbd>&uarr;</kbd><kbd>&darr;</kbd> ' + t(LABELS.hint) + '</span>' +
          '<span class="ps-foot-item"><kbd>&crarr;</kbd> ' + t(LABELS.select) + '</span>' +
          '<span class="ps-foot-item"><kbd>esc</kbd> ' + t(LABELS.close) + '</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    modal = wrap;
    input = document.getElementById('ps-input');
    listEl = document.getElementById('ps-results');
    input.placeholder = t(LABELS.placeholder);
    input.addEventListener('input', onInput);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) closeModal();
    });
    renderResults(INDEX);
  }

  function openModal() {
    injectStyles();
    createModal();
    modal.classList.add('ps-open');
    document.body.style.overflow = 'hidden';
    input.value = '';
    input.placeholder = t(LABELS.placeholder);
    activeIdx = -1;
    renderResults(INDEX);
    requestAnimationFrame(function () { input.focus(); });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('ps-open');
    document.body.style.overflow = '';
  }

  function isOpen() {
    return modal && modal.classList.contains('ps-open');
  }

  /* ── Render ───────────────────────────────────────────────── */
  function renderResults(items) {
    if (!listEl) return;
    visibleItems = items;
    activeIdx = items.length > 0 ? 0 : -1;
    if (items.length === 0) {
      listEl.innerHTML = '<div class="ps-no-results">' + t(LABELS.noResults) + '</div>';
      return;
    }
    var cats = {};
    var catOrder = ['actions', 'apps', 'tools', 'learn'];
    for (var i = 0; i < items.length; i++) {
      var c = items[i].cat;
      if (!cats[c]) cats[c] = [];
      cats[c].push(items[i]);
    }
    var html = '';
    var globalIdx = 0;
    for (var ci = 0; ci < catOrder.length; ci++) {
      var catKey = catOrder[ci];
      if (!cats[catKey]) continue;
      html += '<div class="ps-group">';
      html += '<div class="ps-group-label">' + (CAT_ICONS[catKey] || '') + ' ' + t(LABELS[catKey]) + '</div>';
      for (var j = 0; j < cats[catKey].length; j++) {
        var it = cats[catKey][j];
        html += '<a class="ps-item' + (globalIdx === activeIdx ? ' ps-active' : '') +
          '" href="' + it.url + '" data-idx="' + globalIdx + '">' +
          '<span class="ps-item-title">' + t(it.title) + '</span>' +
          '<span class="ps-item-desc">' + t(it.desc) + '</span>' +
          '</a>';
        globalIdx++;
      }
      html += '</div>';
    }
    listEl.innerHTML = html;
    // reorder visibleItems to match render order
    var ordered = [];
    for (var oi = 0; oi < catOrder.length; oi++) {
      if (cats[catOrder[oi]]) ordered = ordered.concat(cats[catOrder[oi]]);
    }
    visibleItems = ordered;
  }

  function setActive(idx) {
    if (idx < 0 || idx >= visibleItems.length) return;
    var prev = listEl.querySelector('.ps-active');
    if (prev) prev.classList.remove('ps-active');
    activeIdx = idx;
    var el = listEl.querySelector('[data-idx="' + idx + '"]');
    if (el) {
      el.classList.add('ps-active');
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  function selectActive() {
    if (activeIdx >= 0 && activeIdx < visibleItems.length) {
      window.location.href = visibleItems[activeIdx].url;
    }
  }

  /* ── Events ───────────────────────────────────────────────── */
  function onInput() {
    var q = input.value;
    var results = searchIndex(q);
    renderResults(results);
  }

  document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + Shift + K — toggle platform search
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) { closeModal(); } else { openModal(); }
      return;
    }
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIdx + 1, visibleItems.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIdx - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      selectActive();
      return;
    }
  }, true);

  // Click on items
  document.addEventListener('click', function (e) {
    var item = e.target.closest && e.target.closest('.ps-item');
    if (item) {
      // let the link work naturally
      closeModal();
    }
  });

  // Expose global API
  window.txidPlatformSearch = { open: openModal, close: closeModal };
})();
