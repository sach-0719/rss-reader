/**
 * News-Spot アプリケーション UI制御スクリプト (js/app-control.js)
 * (テーマ切り替え・サイドバー開閉・各モーダル制御の統合版)
 */
document.addEventListener('DOMContentLoaded', function () {
  
  // --------------------------------------------------
  // 1. テーマ切り替え機能 (Tailwind CSS 同期)
  // --------------------------------------------------
  const themeSelect = document.getElementById("theme-select");

  function applyTheme(mode){
    const html = document.documentElement;
    html.classList.remove("dark");

    if(mode === "dark"){
      html.classList.add("dark");
    } else if(mode === "system"){
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if(isDark) html.classList.add("dark");
    }
    localStorage.setItem("theme", mode);
  }

  // 起動時の初期テーマ適用
  const savedTheme = localStorage.getItem("theme") || "system";
  applyTheme(savedTheme);
  
  if(themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener("change", (e) => {
      applyTheme(e.target.value);
    });
  }

  // --------------------------------------------------
  // 2. サイドバー (Sidenav) の開閉ロジック
  // --------------------------------------------------
  const menuTrigger = document.getElementById('menu-trigger');
  const menuClose = document.getElementById('menu-close');
  const sideNav = document.getElementById('nav-mobile');
  const sideNavOverlay = document.getElementById('nav-mobile-overlay');

  function openSideNav() {
    if (sideNav && sideNavOverlay) {
      sideNav.classList.remove('-translate-x-full');
      sideNavOverlay.classList.remove('hidden');
    }
  }

  function closeSideNav() {
    if (sideNav && sideNavOverlay) {
      sideNav.classList.add('-translate-x-full');
      sideNavOverlay.classList.add('hidden');
    }
  }

  if(menuTrigger) menuTrigger.addEventListener('click', openSideNav);
  if(menuClose) menuClose.addEventListener('click', closeSideNav);
  if(sideNavOverlay) sideNavOverlay.addEventListener('click', closeSideNav);

  // --------------------------------------------------
  // 3. 詳細検索モーダルの開閉ロジック
  // --------------------------------------------------
  const searchTrigger = document.getElementById('search-modal-trigger');
  const searchClose = document.getElementById('search-modal-close');
  const searchApply = document.getElementById('search-apply');
  const searchModal = document.getElementById('search-modal');

  function openSearchModal() { 
    if (searchModal) searchModal.classList.replace('hidden', 'flex'); 
  }
  
  function closeSearchModal() { 
    if (searchModal) searchModal.classList.replace('flex', 'hidden'); 
  }

  if(searchTrigger) searchTrigger.addEventListener('click', openSearchModal);
  if(searchClose) searchClose.addEventListener('click', closeSearchModal);
  if(searchApply) searchApply.addEventListener('click', closeSearchModal);

  // --------------------------------------------------
  // 4. QRモーダルの手動閉じるイベント補足
  // --------------------------------------------------
  const qrClose = document.getElementById('qr-modal-close');
  const qrModal = document.getElementById('qr-modal');

  if(qrClose && qrModal) {
    qrClose.addEventListener('click', () => {
      qrModal.classList.replace('flex', 'hidden');
    });
    
    // モーダルの黒い背景部分をクリックしても閉じるように親切化
    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) {
        qrModal.classList.replace('flex', 'hidden');
      }
    });
  }
});
