/**
 * @txid/ui — Shared Utility Functions
 *
 * txid.uk 플랫폼 전체에서 중복 사용되는 공통 유틸리티 함수 모음.
 * 브라우저 / Node.js 양쪽에서 사용 가능한 유니버설 구현.
 *
 * 사용법:
 *   import { escHtml, fetchRetry, formatBtc } from '@txid/ui/utils/index.js';
 */

// ─────────────────────────────────────────────
// 1. escHtml — HTML 이스케이프
// ─────────────────────────────────────────────
// 정규식 기반으로 브라우저 / SSR 양쪽에서 동작.
// 원본: tools.txid.uk-astro/public/tools-shared.js,
//       txid.uk-astro/public/js/core.v2.js (DOM 기반 버전도 존재)

const ESC_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const ESC_RE = /[&<>"']/g;

/**
 * 문자열의 HTML 특수문자를 이스케이프합니다.
 * XSS 방지를 위해 사용자 입력을 HTML에 삽입하기 전에 반드시 호출하세요.
 *
 * @param {string} s - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
export function escHtml(s) {
  return String(s || '').replace(ESC_RE, (ch) => ESC_MAP[ch]);
}

// ─────────────────────────────────────────────
// 2. fetchRetry — 지수 백오프 재시도 fetch
// ─────────────────────────────────────────────
// 원본: tools.txid.uk-astro/public/tools-shared.js,
//       stats.txid.uk-astro/src/pages/[lang]/index.astro

/**
 * fetch 요청을 지수 백오프로 재시도합니다.
 * 네트워크 불안정 시에도 안정적으로 API를 호출할 수 있습니다.
 *
 * @param {string} url - 요청할 URL
 * @param {number} [timeout=10000] - 요청 타임아웃 (ms)
 * @param {number} [retries=2] - 최대 재시도 횟수
 * @returns {Promise<Response>} fetch Response 객체
 * @throws {Error} 모든 재시도가 실패하면 마지막 에러를 throw
 */
export async function fetchRetry(url, timeout = 10000, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(timeout) });
    } catch (e) {
      if (i >= retries) throw e;
      // 지수 백오프: 1s, 2s, 4s, ...
      await new Promise((r) => setTimeout(r, 1000 << i));
    }
  }
  throw new Error('fetchRetry exhausted');
}

// ─────────────────────────────────────────────
// 3. formatBtc — 사토시 -> BTC 포맷
// ─────────────────────────────────────────────
// 원본: txid.uk-astro/public/js/core.v2.js

/**
 * 사토시 값을 BTC 문자열로 변환합니다.
 *
 * @param {number} sats - 사토시 단위의 금액
 * @returns {string} "0.00100000" 형태의 BTC 문자열 (8자리 소수점)
 */
export function formatBtc(sats) {
  if (sats == null || isNaN(sats)) return '0.00000000';
  return (Number(sats) / 1e8).toFixed(8);
}

// ─────────────────────────────────────────────
// 4. formatNumber — 로케일 인식 숫자 포맷
// ─────────────────────────────────────────────
// 원본: txid.uk-astro/public/js/core.v2.js (formatNum),
//       macro.txid.uk/src/pages/index.astro (fmt)

/**
 * 숫자를 로케일에 맞는 문자열로 변환합니다 (천 단위 구분자 포함).
 *
 * @param {number} n - 포맷할 숫자
 * @param {number} [decimals] - 소수점 자릿수. 미지정 시 정수 포맷
 * @returns {string} 포맷된 숫자 문자열. null/undefined이면 '--'
 */
export function formatNumber(n, decimals) {
  if (n == null) return '--';
  const opts =
    decimals != null
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : {};
  return Number(n).toLocaleString(undefined, opts);
}

// ─────────────────────────────────────────────
// 5. formatCompact — 축약 숫자 표기 (T/B/M/K)
// ─────────────────────────────────────────────
// 원본: macro.txid.uk/src/pages/index.astro (fmtCompact)

/**
 * 큰 숫자를 축약 표기합니다.
 * 1,500,000 -> "1.50M", 2,300,000,000 -> "2.30B"
 *
 * @param {number} n - 포맷할 숫자
 * @returns {string} 축약된 문자열. null이면 '--'
 */
export function formatCompact(n) {
  if (n == null) return '--';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return formatNumber(n);
}

// ─────────────────────────────────────────────
// 6. timeAgo — 상대 시간 문자열 (3개국어)
// ─────────────────────────────────────────────
// 원본: txid.uk-astro/public/js/core.v2.js (가장 완성도 높은 3개국어 버전)

const TIME_SUFFIXES = {
  en: ['s ago', 'm ago', 'h ago', 'd ago'],
  ko: ['초 전', '분 전', '시간 전', '일 전'],
  ja: ['秒前', '分前', '時間前', '日前'],
};

/**
 * Unix 타임스탬프(초)를 상대 시간 문자열로 변환합니다.
 * "3분 전", "2h ago", "5日前" 같은 형태를 반환합니다.
 *
 * @param {number} timestamp - Unix 타임스탬프 (초 단위)
 * @param {string} [lang='en'] - 언어 코드 ('en', 'ko', 'ja')
 * @returns {string} 상대 시간 문자열
 */
export function timeAgo(timestamp, lang = 'en') {
  if (!timestamp) return '';
  const sec = Math.floor(Date.now() / 1000 - timestamp);
  const sfx = TIME_SUFFIXES[lang] || TIME_SUFFIXES.en;

  if (sec < 0) return '0' + sfx[0];
  if (sec < 60) return sec + sfx[0];
  if (sec < 3600) return Math.floor(sec / 60) + sfx[1];
  if (sec < 86400) return Math.floor(sec / 3600) + sfx[2];
  return Math.floor(sec / 86400) + sfx[3];
}
