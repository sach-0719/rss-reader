document.addEventListener('DOMContentLoaded', function () {
// --- 1. テーマ切り替え機能 (Tailwind対応) ---
const select = document.getElementById("theme-select");
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
const saved = localStorage.getItem("theme") || "system";
applyTheme(saved);
if(select) select.value = saved;
if(select) {
select.addEventListener("change", (e) => {
applyTheme(e.target.value);
});
}
// --- 2. サイドバー (Sidenav) の開閉ロジック ---
const menuTrigger = document.getElementById('menu-trigger');
const menuClose = document.getElementById('menu-close');
const sideNav = document.getElementById('nav-mobile');
const sideNavOverlay = document.getElementById('nav-mobile-overlay');
function openSideNav() {
sideNav.classList.remove('-translate-x-full');
sideNavOverlay.classList.remove('hidden');
}
function closeSideNav() {
sideNav.classList.add('-translate-x-full');
sideNavOverlay.classList.add('hidden');
}
if(menuTrigger) menuTrigger.addEventListener('click', openSideNav);
if(menuClose) menuClose.addEventListener('click', closeSideNav);
if(sideNavOverlay) sideNavOverlay.addEventListener('click', closeSideNav);
// --- 3. 詳細検索モーダルの開閉ロジック ---
const searchTrigger = document.getElementById('search-modal-trigger');
const searchClose = document.getElementById('search-modal-close');
const searchApply = document.getElementById('search-apply');
const searchModal = document.getElementById('search-modal');
function openSearchModal() { searchModal.classList.replace('hidden', 'flex'); }
function closeSearchModal() { searchModal.classList.replace('flex', 'hidden'); }
if(searchTrigger) searchTrigger.addEventListener('click', openSearchModal);
if(searchClose) searchClose.addEventListener('click', closeSearchModal);
if(searchApply) searchApply.addEventListener('click', closeSearchModal);
});
