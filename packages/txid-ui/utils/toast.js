/**
 * @txid/ui — Toast Notification API
 *
 * 사용법:
 *   import { showToast } from '@txid/ui/utils/toast.js';
 *   showToast('저장되었습니다', 'success');
 *   showToast('오류가 발생했습니다', 'error', 6000);
 */

const ICONS = {
  success:
    '<svg class="txid-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error:
    '<svg class="txid-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info:
    '<svg class="txid-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  warning:
    '<svg class="txid-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};

/**
 * Toast 알림을 표시합니다.
 *
 * @param {string} message - 표시할 메시지
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - 토스트 타입
 * @param {number} [duration=4000] - 자동 닫힘까지의 시간 (ms). 0이면 수동 닫기만 가능
 * @returns {HTMLElement} 생성된 toast 요소
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('txid-toast-container');
  if (!container) {
    console.warn(
      '[@txid/ui] Toast container not found. <Toast /> 컴포넌트를 레이아웃에 추가하세요.'
    );
    return null;
  }

  const validTypes = ['success', 'error', 'info', 'warning'];
  if (!validTypes.includes(type)) {
    type = 'info';
  }

  // Toast 요소 생성
  const toast = document.createElement('div');
  toast.className = `txid-toast txid-toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  // 아이콘
  const iconHtml = ICONS[type] || ICONS.info;

  // 메시지 (XSS 방지를 위해 textContent 사용)
  const msgSpan = document.createElement('span');
  msgSpan.className = 'txid-toast-msg';
  msgSpan.textContent = message;

  // 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.className = 'txid-toast-close';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.innerHTML = '&#215;';
  closeBtn.addEventListener('click', () => removeToast(toast));

  // 진행 바 (duration > 0일 때만)
  let progressHtml = '';
  if (duration > 0) {
    progressHtml = `<div class="txid-toast-progress" style="animation-duration:${duration}ms"></div>`;
  }

  // 조립
  toast.innerHTML = iconHtml + progressHtml;
  toast.insertBefore(msgSpan, toast.querySelector('.txid-toast-progress'));
  toast.appendChild(closeBtn);

  // 컨테이너에 추가
  container.appendChild(toast);

  // 자동 닫기
  if (duration > 0) {
    toast._timeout = setTimeout(() => removeToast(toast), duration);
  }

  // 최대 5개까지만 표시 (오래된 것부터 제거)
  const toasts = container.querySelectorAll('.txid-toast:not(.txid-toast--removing)');
  if (toasts.length > 5) {
    removeToast(toasts[0]);
  }

  return toast;
}

/**
 * Toast를 제거합니다 (fade-out 애니메이션 후).
 *
 * @param {HTMLElement} toast - 제거할 toast 요소
 */
export function removeToast(toast) {
  if (!toast || toast.classList.contains('txid-toast--removing')) return;

  if (toast._timeout) {
    clearTimeout(toast._timeout);
    toast._timeout = null;
  }

  toast.classList.add('txid-toast--removing');
  toast.addEventListener(
    'animationend',
    () => {
      toast.remove();
    },
    { once: true }
  );
}

/**
 * 모든 Toast를 제거합니다.
 */
export function clearToasts() {
  const container = document.getElementById('txid-toast-container');
  if (!container) return;

  const toasts = container.querySelectorAll('.txid-toast');
  toasts.forEach((toast) => removeToast(toast));
}
