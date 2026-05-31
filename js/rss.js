// =========================
// RSS STORE（統一版）
// =========================
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


// =========================
// RSS SCANNER（1つだけ！）
// =========================
class RssScanner {

  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.allItems = [];

    if (!this.container) {
      console.error("news-container が見つかりません");
    }
  }

  // -------------------------
  getImage(item) {
    const enclosure = item.querySelector("enclosure");
    if (enclosure?.getAttribute("url")) return enclosure.getAttribute("url");

    const media = item.getElementsByTagName("media:thumbnail")[0];
    if (media?.getAttribute("url")) return media.getAttribute("url");

    const desc = item.querySelector("description")?.textContent || "";
    const match = desc.match(/<img[^>]+src=["'](.*?)["']/i);

    return match ? match[1] : "noimage.jpg";
  }

  getLink(item) {
    const link = item.querySelector("link");
    if (!link) return "#";

    const text = link.textContent;
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

  // -------------------------
  render(items) {
    this.container.innerHTML = "";

    Array.from(items).slice(0, 50).forEach(item => {

      const title = item.querySelector("title")?.textContent || "（無題）";
      const desc =
        item.querySelector("description")?.textContent ||
        item.querySelector("summary")?.textContent ||
        "";

      const link = this.getLink(item);
      const image = this.getImage(item);
      const category = this.getCategory(item);
      const dateInfo = this.formatDate(item.querySelector("pubDate")?.textContent);

      const div = document.createElement("div");
      div.className = "card article";

      // ★カードUIは一切変更していない
      div.innerHTML = `
        <div class="card-image">
          <img src="${image}" onerror="this.src='noimage.jpg'">
        </div>

        <div class="card-content">

          <div style="
            display:inline-block;
            margin-bottom:8px;
            padding:3px 10px;
            font-size:11px;
            border-radius:20px;
            background:#e3f2fd;
            color:#1565c0;
            font-weight:bold;
          ">
            ${category}
          </div>

          <div style="color:#999;font-size:12px;margin-bottom:10px;">
            <i class="material-icons" style="font-size:14px;">access_time</i>
            ${dateInfo.relative}
            <span style="font-size:11px;color:#bbb;margin-left:6px;">
              （${dateInfo.exact}）
            </span>
          </div>

          <span class="card-title">${title}</span>
          <p>${this.clean(desc)}</p>
        </div>

        <div class="card-action">
          <a href="${link}" class="left" target="_blank">
            <i class="material-icons blue-text">open_in_new</i>
          </a>

          <!-- 共有ボタン（常に描画） -->
          <a href="#!" class="share-btn left" 
            data-title="${title}" 
            data-link="${link}">
            <i class="material-icons purple-text">share</i>
          </a>

          <a href="#!" class="qr-btn left" data-link="${link}">
            <i class="material-icons green-text">qr_code</i>
          </a>
        </div>
      `;

      this.container.appendChild(div);
    });
  }

  // -------------------------
loadFromXMLText(text) {

  const xml = new DOMParser().parseFromString(text, "text/xml");

  const channel = xml.querySelector("channel");

  const siteTitle =
    channel?.querySelector("title")?.textContent?.trim() || "News-Spot";

  const siteDesc =
    channel?.querySelector("description")?.textContent?.trim() || "RSSニュースリーダー";

  const titleEl = document.getElementById("site-title");
  const descEl = document.getElementById("site-description");

  if (titleEl) titleEl.textContent = siteTitle;
  if (descEl) descEl.textContent = siteDesc;

  let items = xml.getElementsByTagName("item");
  if (!items.length) items = xml.getElementsByTagName("entry");

  this.allItems = Array.from(items);

this.render(this.allItems);
this.updateCategoryCheckboxes();  // ←これ追加
updateIndeterminateState();
}

  // -------------------------
updateCategoryCheckboxes() {
  const container = document.getElementById("category-checklist");
  if (!container) return;

  const categories = [...new Set(
    this.allItems.map(i => this.getCategory(i))
  )];

  container.innerHTML = `
    <p>
      <label>
        <input id="category-all" type="checkbox" />
        <span id="category-all-text">すべて</span>
      </label>
    </p>

    ${
      categories.length > 0
        ? categories.map(c => `
          <p>
            <label>
              <input type="checkbox" class="category-item" value="${c}" />
              <span>${c}</span>
            </label>
          </p>
        `).join("")
        : ""
    }
  `;
}
  // -------------------------
applyFilter() {

  const keyword =
    (document.getElementById("search-keyword")?.value || "").toLowerCase();

  const checkedCategories =
    Array.from(document.querySelectorAll(".category-item:checked"))
      .map(el => el.value);

  const allChecked =
    document.querySelector(".category-all")?.checked ||
    document.querySelector(".category-all")?.indeterminate;

  const from = document.getElementById("date-from")?.value;
  const to = document.getElementById("date-to")?.value;

  const filtered = this.allItems.filter(item => {

    const title = item.querySelector("title")?.textContent || "";
    const desc = item.querySelector("description")?.textContent || "";
    const cat = this.getCategory(item);

    const dateText = item.querySelector("pubDate")?.textContent;
    const date = dateText ? new Date(dateText) : null;

    const matchKeyword =
      !keyword ||
      title.toLowerCase().includes(keyword) ||
      desc.toLowerCase().includes(keyword);

    const matchCategory =
      allChecked ||
      checkedCategories.length === 0 ||
      checkedCategories.includes(cat);

    let matchDate = true;
    if (from && date) matchDate = date >= new Date(from);
    if (to && date) matchDate = matchDate && date <= new Date(to);

    return matchKeyword && matchCategory && matchDate;
  });

  this.render(filtered);
}

  // -------------------------
  formatDate(pubDateText) {

    if (!pubDateText) {
      return { relative: "日時不明", exact: "" };
    }

    const date = new Date(pubDateText);
    if (isNaN(date)) {
      return { relative: "日時不明", exact: "" };
    }

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
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const h = String(date.getHours()).padStart(2, "0");
      const mi = String(date.getMinutes()).padStart(2, "0");

      relative = `${y}/${m}/${d} ${h}:${mi}`;
    }

    const exact =
      `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ` +
      `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    return { relative, exact };
  }
}


// =========================
// SIDEBAR
// =========================
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

      a.className = "waves-effect rss-item";
      a.href = "#!";
      a.dataset.id = rss.id;

      // ⭐サイドバーはRSSタイトル
      a.textContent = rss.title;

      li.appendChild(a);
      this.container.appendChild(li);
    });
  }
}


// =========================
// FILE MANAGER
// =========================
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
          file.name.replace(/\.[^/.]+$/, "");

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


// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {

  M.AutoInit();

  const scanner = new RssScanner("news-container");
  const sidebar = new Sidebar(scanner);
  new FileManager(scanner, sidebar);

  document.getElementById("search-apply")
    ?.addEventListener("click", () => scanner.applyFilter());

  // =========================
  // チェックボックス制御（ここに追加）
  // =========================
  document.addEventListener("change", (e) => {
    const target = e.target;

    // 「すべて」
    if (target.id === "category-all") {
      const checked = target.checked;

      document.querySelectorAll(".category-item").forEach(cb => {
        cb.checked = checked;
      });

      target.indeterminate = false;
      updateIndeterminateState();
      return;
    }

    // 個別
    if (target.classList.contains("category-item")) {
      updateIndeterminateState();
    }
  });

  // =========================
  // THEME などその他の処理はそのまま
  // =========================
});
const select = document.getElementById("theme-select");

function applyTheme(mode){

  if(mode === "dark"){
    document.body.classList.add("dark-mode");
  } else if(mode === "light"){
    document.body.classList.remove("dark-mode");
  } else {
    const isDark =
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    document.body.classList.toggle("dark-mode", isDark);
  }

  localStorage.setItem("theme", mode);
}

// 初期化
const saved = localStorage.getItem("theme") || "system";
applyTheme(saved);

if(select){
  select.value = saved;

  select.addEventListener("change", (e) => {
    applyTheme(e.target.value);
  });
}

// =========================
// QR CODE
// =========================
document.addEventListener("click", (e) => {

  const btn = e.target.closest(".qr-btn");
  if (!btn) return;

  const url = btn.dataset.link;

  document.getElementById("qr-image").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

  document.getElementById("qr-url").textContent = url;

  const modal = M.Modal.getInstance(document.getElementById("qr-modal"));
  modal.open();
});

document.addEventListener("click", async (e) => {

  const btn = e.target.closest(".share-btn");
  if (!btn) return;

  const title = btn.dataset.title || "";
  const url = btn.dataset.link || "";

  if (!navigator.share) {
    alert("このブラウザは共有機能に対応していません");
    return;
  }

  try {
    await navigator.share({
      title: title,
      url: url
    });
  } catch (err) {
    // キャンセルは無視
    if (err.name !== "AbortError") {
      console.error(err);
    }
  }
});
function updateIndeterminateState() {
  const all = document.getElementById("category-all");
  const items = document.querySelectorAll(".category-item");
  const checked = document.querySelectorAll(".category-item:checked");

  if (!all || items.length === 0) return;

  const total = items.length;
  const checkedCount = checked.length;

  if (checkedCount === 0) {
    all.checked = false;
    all.indeterminate = false;
  } 
  else if (checkedCount === total) {
    all.checked = true;
    all.indeterminate = false;
  } 
  else {
    all.checked = false;
    all.indeterminate = true;
  }
}
// イベントリスナー
