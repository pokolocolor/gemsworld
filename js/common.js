/* ═══════════════════════════════════════
   common.js — 공통 유틸리티
   ═══════════════════════════════════════ */

/**
 * dataURL → Blob 변환
 */
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const b = atob(arr[1]);
  const ab = new ArrayBuffer(b.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < b.length; i++) ia[i] = b.charCodeAt(i);
  return new Blob([ab], { type: mime });
}

/**
 * JSZip 동적 로드
 */
function loadJSZip() {
  return new Promise((resolve, reject) => {
    if (typeof JSZip !== 'undefined') return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
