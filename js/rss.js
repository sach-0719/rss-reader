// ==================================================
// 1. RSS STORE（お気に入りの保存・復元ロジック）
// ==================================================
const RSSStore = {
  key: "rss_list",

  getList() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || "[]");
    } catch {
      return [];
    }
  },

  save(item) {
    const list = this.getList();
    if (list.length >= 10) list.shift();

    list.push({
      id: item.id,
      title: item.title,
      description: item.description || "",
      xml: item.xml
    });

    localStorage.setItem(this.key, JSON.stringify(list));
  },

  get(id) {
    return this.getList().find(x => x.id === id);
  }
};

// ==================================================
// 2. RSS SCANNER
// ==================================================
class RssScanner {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.allItems = [];

    if (!this.container) {
      console.error("指定されたコンテナが見つかりません");
    }
  }

  // 画像URLを安全かつ確実に抽出するロジック
  getImage(item) {
    const enclosure = item.querySelector("enclosure");
    if (enclosure?.getAttribute("url")) return enclosure.getAttribute("url");

    const media = item.getElementsByTagName("media:thumbnail");
    if (media.length > 0 && media[0].getAttribute("url")) {
      return media[0].getAttribute("url");
    }

    const desc = item.querySelector("description")?.textContent || "";
    const match = desc.match(/<img[^>]+src=["'](.*?)["']/i);

    return match ? match[1] : "noimage.jpg";
  }

  getLink(item) {
    const link = item.querySelector("link");
    if (!link) return "#";

    const text = link.textContent.trim();
    const href = link.getAttribute?.("href");

    if (text?.startsWith("http")) return text;
    if (href) return href;

    return "#";
  }

  getCategory(item) {
    return item.querySelector("category")?.textContent || "その他";
  }

  clean(text) {
    return (text || "").replace(/<[^>]+>/g, "").trim();
  }

  // 画面へニュースカードを描画する処理（Tailwind最適化）
  // ==================================================
  // 【完全連動・確定版】ニュースカード描画 ＆ イベントバインド処理
  // ==================================================
  render(items) {
    if (!this.container) return;
    this.container.innerHTML = "";

    Array.from(items).slice(0, 50).forEach(item => {
      const title = item.querySelector("title")?.textContent || "（無題）";
      const desc = item.querySelector("description")?.textContent || item.querySelector("summary")?.textContent || "";
      const link = this.getLink(item);
      const image = this.getImage(item);
      const category = this.getCategory(item);
      const dateInfo = this.formatDate(item.querySelector("pubDate")?.textContent || item.querySelector("updated")?.textContent);

      const div = document.createElement("div");
      div.className = "bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 flex flex-col justify-between h-full transform transition hover:-translate-y-0.5 hover:shadow-lg";

      div.innerHTML = `
        <div class="w-full h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
          <img src="${image}" onerror="this.src='noimage.jpg'" class="w-full h-full object-cover">
        </div>

        <div class="p-5 flex-1 flex flex-col">
          <div class="inline-block self-start mb-3 px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            ${category}
          </div>

          <div class="flex items-center text-xs text-gray-400 dark:text-gray-500 mb-2">
            <i class="material-icons text-sm mr-1">access_time</i>
            <span>${dateInfo.relative}</span>
            <span class="ml-2 opacity-60">（${dateInfo.exact}）</span>
          </div>

          <h3 class="text-base font-bold mb-2 text-gray-900 dark:text-white line-clamp-2">${title}</h3>
          <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">${this.clean(desc)}</p>
        </div>

        <div class="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start space-x-4">
          <a href="${link}" target="_blank" class="text-blue-500 hover:text-blue-600 flex items-center">
            <i class="material-icons text-xl">open_in_new</i>
          </a>
          <button class="custom-share-trigger text-purple-500 hover:text-purple-600 flex items-center bg-none border-none p-0 cursor-pointer">
            <i class="material-icons text-xl">share</i>
          </button>
          <button class="custom-qr-trigger text-green-500 hover:text-green-600 flex items-center bg-none border-none p-0 cursor-pointer">
            <i class="material-icons text-xl">qr_code</i>
          </button>
        </div>
      `;

      // --- 【解決の核】新しく生まれたボタンに対し、その場で直接100%確実に機能を紐付けます ---
      
      // 1. 共有ボタンの処理
      const shareBtn = div.querySelector(".custom-share-trigger");
      if (shareBtn) {
        shareBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          if (!navigator.share) {
            alert("このブラウザは共有機能に対応していません");
            return;
          }
          try {
            await navigator.share({ title: title, url: link });
          } catch (err) {
            if (err.name !== "AbortError") console.error(err);
          }
        });
      }

      // 2. QRコードボタンの処理
      const qrBtn = div.querySelector(".custom-qr-trigger");
      if (qrBtn) {
        qrBtn.addEventListener("click", (e) => {
          e.preventDefault();
          
          const qrImage = document.getElementById("qr-image");
          if (qrImage) {
            qrImage.src = `https://qrserver.com{encodeURIComponent(link)}`;
            qrImage.style.display = 'block';
          }

          const qrUrlText = document.getElementById("qr-url");
          if (qrUrlText) qrUrlText.textContent = link;

          const qrLoading = document.getElementById("qr-loading");
          if (qrLoading) qrLoading.style.display = 'none';

          // Tailwindの検索モーダルと同じ仕組みで、hiddenを外して手前に表示
          const qrModal = document.getElementById("qr-modal");
          if (qrModal) {
            qrModal.classList.replace('hidden', 'flex');
          }
        });
      }

      this.container.appendChild(div);
    });
    
    // 3. 【おまけ】QRモーダルの閉じるボタンのイベントをここで一度だけ安全にバインド
    const qrClose = document.getElementById('qr-modal-close');
    const qrModalElement = document.getElementById('qr-modal');
    if (qrClose && qrModalElement && !qrClose.dataset.bound) {
      qrClose.dataset.bound = "true";
      qrClose.addEventListener('click', () => {
        qrModalElement.classList.replace('flex', 'hidden');
      });
      qrModalElement.addEventListener('click', (e) => {
        if (e.target === qrModalElement) qrModalElement.classList.replace('flex', 'hidden');
      });
    }
  }

  loadFromXMLText(text) {
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const channel = xml.querySelector("channel");

    const siteTitle = channel?.querySelector("title")?.textContent?.trim() || "News-Spot";
    const siteDesc = channel?.querySelector("description")?.textContent?.trim() || "RSSニュースリーダー";

    const titleEl = document.getElementById("site-title");
    const descEl = document.getElementById("site-description");

    if (titleEl) titleEl.textContent = siteTitle;
    if (descEl) descEl.textContent = siteDesc;

    let items = xml.getElementsByTagName("item");
    if (!items.length) items = xml.getElementsByTagName("entry");

    this.allItems = Array.from(items);

    this.render(this.allItems);
    this.updateCategoryCheckboxes();
  }

  updateCategoryCheckboxes() {
    const container = document.getElementById("category-checklist");
    if (!container) return;

    const categories = [...new Set(this.allItems.map(i => this.getCategory(i)))];

    let html = `
      <div class="flex items-center space-x-2 py-1">
        <input id="category-all" type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <span id="category-all-text" class="text-sm font-medium text-gray-700 dark:text-gray-300">すべて</span>
      </div>
    `;

    categories.forEach(c => {
      html += `
        <div class="flex items-center space-x-2 py-1">
          <input type="checkbox" class="category-item rounded border-gray-300 text-blue-600 focus:ring-blue-500" value="${c}" checked />
          <span class="text-sm text-gray-600 dark:text-gray-400">${c}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  applyFilter() {
    const keyword = (document.getElementById("search-keyword")?.value || "").toLowerCase();
    const checkedCategories = Array.from(document.querySelectorAll(".category-item:checked")).map(el => el.value);
    const allCb = document.getElementById("category-all");
    const allChecked = allCb ? (allCb.checked || allCb.indeterminate) : true;

    const from = document.getElementById("date-from")?.value;
    const to = document.getElementById("date-to")?.value;

    const filtered = this.allItems.filter(item => {
      const title = item.querySelector("title")?.textContent || "";
      const desc = item.querySelector("description")?.textContent || "";
      const cat = this.getCategory(item);

      const dateText = item.querySelector("pubDate")?.textContent || item.querySelector("updated")?.textContent;
      const date = dateText ? new Date(dateText) : null;

      const matchKeyword = !keyword || title.toLowerCase().includes(keyword) || desc.toLowerCase().includes(keyword);
      const matchCategory = allChecked || checkedCategories.length === 0 || checkedCategories.includes(cat);

      let matchDate = true;
      if (from && date) matchDate = date >= new Date(from);
      if (to && date) matchDate = matchDate && date <= new Date(to);

      return matchKeyword && matchCategory && matchDate;
    });

    this.render(filtered);
  }

  formatDate(pubDateText) {
    if (!pubDateText) return { relative: "日時不明", exact: "" };
    const date = new Date(pubDateText);
    if (isNaN(date.getTime())) return { relative: "日時不明", exact: "" };

    const now = new Date();
    const diff = now - date;

    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hour = Math.floor(min / 60);
    const day = Math.floor(hour / 24);

    let relative = "";
    if (min < 1) relative = `たった今（${sec}秒前）`;
    else if (hour < 1) relative = `${min}分前`;
    else if (day < 1) relative = `${hour}時間前`;
    else if (day < 7) relative = `${day}日前`;
    else if (day < 30) relative = `${Math.floor(day / 7)}週間前`;
    else if (day < 365) relative = `${Math.floor(day / 30)}か月前`;
    else {
      relative = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
    }

    const exact = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    return { relative, exact };
  }
}

// ==================================================
// 3. SIDEBAR（お気に入りRSSリストの読み込み・Tailwind対応）
// ==================================================
class Sidebar {
  constructor(scanner) {
    this.scanner = scanner;
    this.container = document.getElementById("rss-list");

    this.render();

    document.addEventListener("click", (e) => {
      const el = e.target.closest(".rss-item");
      if (!el) return;

      const rss = RSSStore.get(el.dataset.id);
      if (rss?.xml) {
        this.scanner.loadFromXMLText(rss.xml);
        // RSSクリック時に自動でサイドバーと黒いマスクを閉じる
        const sideNav = document.getElementById('nav-mobile');
        const sideNavOverlay = document.getElementById('nav-mobile-overlay');
        if (sideNav && sideNavOverlay) {
          sideNav.classList.add('-translate-x-full');
          sideNavOverlay.classList.add('hidden');
        }
      }
    });
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = "";

    RSSStore.getList().forEach(rss => {
if (!rss?.id || !rss?.title) return;
const li = document.createElement("li");
const a = document.createElement("a");
// ★ 修正点: Materializeの「waves-effect」を排除し、Tailwindのリスト用デザインに置換
a.className = "rss-item flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition text-sm font-medium cursor-pointer";
a.href = "#!";
a.dataset.id = rss.id;
a.textContent = rss.title;
li.appendChild(a);
this.container.appendChild(li);
});
}
}
// ==================================================
// 4. FILE MANAGER
// ==================================================
class FileManager {
constructor(scanner, sidebar) {
const input = document.getElementById("rss-file-input");
input?.addEventListener("change", (e) => {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (ev) => {
const xml = ev.target.result;
const parsed = new DOMParser().parseFromString(xml, "text/xml");
const rssTitle =
parsed.querySelector("channel > title")?.textContent?.trim() ||
parsed.querySelector("feed > title")?.textContent?.trim() ||
file.name.replace(/.[^/.]+$/, "");
const rssDesc =
parsed.querySelector("channel > description")?.textContent?.trim() ||
parsed.querySelector("feed > subtitle")?.textContent?.trim() ||
"";
RSSStore.save({
id: Date.now().toString(),
title: rssTitle,
description: rssDesc,
xml
});
sidebar.render();
scanner.loadFromXMLText(xml);
};
reader.readAsText(file);
});
}
}
// ==================================================
// 5. INIT（Materializeの初期化命令を完全撤廃）
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
// ★ 修正点: クラッシュの原因だった M.AutoInit() は完全削除
window.scanner = new RssScanner("news-container");
const sidebar = new Sidebar(window.scanner);
new FileManager(window.scanner, sidebar);
document.getElementById("search-apply")
?.addEventListener("click", () => window.scanner.applyFilter());
// 検索窓のリアルタイムタイピング連動
const searchKeyword = document.getElementById("search-keyword");
if (searchKeyword) {
searchKeyword.addEventListener("input", () => {
window.scanner.applyFilter();
});
}
// チェックボックス制御の連動ロジック
document.addEventListener("change", (e) => {
const target = e.target;
const allCb = document.getElementById("category-all");
// 「すべて」
if (target.id === "category-all") {
const checked = target.checked;
document.querySelectorAll(".category-item").forEach(cb => {
cb.checked = checked;
});
if (allCb) allCb.indeterminate = false;
window.scanner.applyFilter();
return;
}
// 個別
if (target.classList.contains("category-item")) {
const items = document.querySelectorAll(".category-item");
const checked = document.querySelectorAll(".category-item:checked");
if (allCb) {
allCb.checked = items.length === checked.length;
allCb.indeterminate = checked.length > 0 && checked.length < items.length;
}
window.scanner.applyFilter();
}
});
});
