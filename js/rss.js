class RssScanner {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.titleEl = document.getElementById("site-title");
    this.descEl = document.getElementById("site-description");
    this.proxy = "https://corsproxy.io/?";
  }

  // =========================
  // タイトル（最強版）
  // =========================
  getFeedTitle(xml) {
    let title =
      xml.querySelector("channel > title")?.textContent ||
      xml.querySelector("feed > title")?.textContent ||
      xml.querySelector("rdf\\:RDF > channel > title")?.textContent ||
      xml.querySelector("dc\\:title")?.textContent;

    if (title && title.trim()) return title.trim();

    // fallback（全titleタグ）
    const all = xml.querySelectorAll("title");
    for (const t of all) {
      const txt = t.textContent?.trim();
      if (txt && txt.length > 3) return txt;
    }

    return "";
  }

  // =========================
  // 説明（最強版）
  // =========================
  getFeedDescription(xml) {
    let desc =
      xml.querySelector("channel > description")?.textContent ||
      xml.querySelector("feed > subtitle")?.textContent ||
      xml.querySelector("feed > description")?.textContent ||
      xml.querySelector("dc\\:description")?.textContent;

    if (desc && desc.trim()) return desc.trim();

    return "";
  }

  // =========================
  // 日付
  // =========================
  getDate(item) {
    const dateText =
      item.querySelector("pubDate")?.textContent ||
      item.querySelector("updated")?.textContent ||
      item.querySelector("dc\\:date")?.textContent ||
      "";

    if (!dateText) return "不明";

    const d = new Date(dateText);
    if (isNaN(d.getTime())) return "不明";

    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 10) return "たった今";
    if (diffSec < 60) return `${diffSec}秒前`;
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    if (diffDay < 15) return `${diffDay}日前`;

    const w = ["日","月","火","水","木","金","土"];
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}（${w[d.getDay()]}） ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }

  // =========================
  // ロード
  // =========================
  async load(url) {
    if (!url) return;

    this.container.innerHTML = `<p style="text-align:center;">読み込み中...</p>`;

    try {
      const res = await fetch(`${this.proxy}${encodeURIComponent(url)}`);
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "text/xml");

      if (xml.querySelector("parsererror")) {
        throw new Error("XML parse error");
      }

      // ★ここが重要（trim＋fallback）
      let title = this.getFeedTitle(xml);
      let desc = this.getFeedDescription(xml);

      if (!title || !title.trim()) title = "News-Spot";
      if (!desc || !desc.trim()) desc = "RSSフィード一覧";

      if (this.titleEl) this.titleEl.textContent = title;
      if (this.descEl) this.descEl.textContent = desc;

      const items = xml.querySelectorAll("item, entry");
      this.render(items);

    } catch (e) {
      console.error(e);
      this.container.innerHTML =
        `<p style="color:red;text-align:center;">読み込み失敗</p>`;
    }
  }

  // =========================
  // リンク取得
  // =========================
  getLink(item) {
    const linkNode = item.querySelector("link");

    const href = linkNode?.getAttribute("href");
    const text = linkNode?.textContent;

    if (href?.startsWith("http")) return href;
    if (text?.startsWith("http")) return text;

    return item.querySelector("enclosure")?.getAttribute("url") || "#";
  }

  // =========================
  // サムネ
  // =========================
  getThumbnail(item, link, rawDesc) {
    const enclosure = item.querySelector("enclosure");
    if (enclosure?.getAttribute("url")) return enclosure.getAttribute("url");

    const thumb = item.getElementsByTagName("media:thumbnail")[0];
    if (thumb) return thumb.getAttribute("url");

    if (link.includes("youtu")) {
      const id =
        link.match(/v=([^&]+)/)?.[1] ||
        link.match(/youtu\.be\/([^?&]+)/)?.[1];
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }

    const img = rawDesc.match(/<img[^>]+src=["'](.*?)["']/i);
    return img ? img[1] : "noimage.jpg";
  }

  // =========================
  // テキスト整形
  // =========================
  cleanText(text) {
    return (text || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // =========================
  // 描画
  // =========================
  render(items) {
    this.container.innerHTML = "";

    Array.from(items).slice(0, 30).forEach((item, i) => {
      const title = item.querySelector("title")?.textContent || "";
      const link = this.getLink(item);

      const rawDesc =
        item.querySelector("description")?.textContent ||
        item.querySelector("summary")?.textContent ||
        "";

      const desc = this.cleanText(rawDesc);
      const image = this.getThumbnail(item, link, rawDesc);
      const date = this.getDate(item);

      const modalId = `qr_${i}`;

      const html = `
        <div class="col s12 m6 l4">
          <div class="card">

            <div class="card-image">
              <img src="${image}" onerror="this.src='noimage.jpg'">
            </div>

            <div class="card-content">
              <span class="card-title">${title}</span>

              <p class="rss-description">${desc}</p>

              <div style="font-size:12px;color:#777;margin-top:6px;">
                <i class="material-icons" style="font-size:14px;">schedule</i>
                ${date}
              </div>
            </div>

            <div class="card-action" style="display:flex;justify-content:space-around;">
              <a href="${link}" target="_blank">
                <i class="material-icons blue-text">open_in_new</i>
              </a>

              <a href="#${modalId}" class="modal-trigger">
                <i class="material-icons green-text">qr_code</i>
              </a>
            </div>

          </div>
        </div>

        <div id="${modalId}" class="modal">
          <div class="modal-content" style="text-align:center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}">
            <p style="word-break:break-all;">${link}</p>
          </div>
        </div>
      `;

      this.container.insertAdjacentHTML("beforeend", html);
    });

    M.Modal.init(document.querySelectorAll(".modal"));
  }
}

// =========================
// URL管理
// =========================
class RssConfigManager {
  constructor(scanner) {
    this.scanner = scanner;
    this.input = document.getElementById("rss-url-input");
    this.btn = document.getElementById("save-rss-btn");
    this.key = "user_rss_url";
    this.init();
  }

  init() {
    const saved = localStorage.getItem(this.key);

    if (saved) {
      this.input.value = saved;
      this.scanner.load(saved);
    } else {
      this.scanner.load("https://news.yahoo.co.jp/rss/topics/top-picks.xml");
    }

    this.btn.addEventListener("click", () => {
      const url = this.input.value.trim();
      if (!url) return;

      localStorage.setItem(this.key, url);
      this.scanner.load(url);
    });
  }
}

// =========================
// ファイル読み込み
// =========================
class RssFileManager {
  constructor(scanner) {
    this.scanner = scanner;
    this.input = document.getElementById("rss-file-input");
    this.init();
  }

  init() {
    if (!this.input) return;

    this.input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => this.parseXml(ev.target.result);
      reader.readAsText(file);
    });
  }

  parseXml(text) {
    const xml = new DOMParser().parseFromString(text, "text/xml");

    let title = this.scanner.getFeedTitle(xml);
    let desc = this.scanner.getFeedDescription(xml);

    if (!title) title = "ローカルRSS";
    if (!desc) desc = "ローカルファイル";

    if (this.scanner.titleEl) this.scanner.titleEl.textContent = title;
    if (this.scanner.descEl) this.scanner.descEl.textContent = desc;

    const items = xml.querySelectorAll("item, entry");
    this.scanner.render(items);
  }
}

// =========================
// 初期化
// =========================
document.addEventListener("DOMContentLoaded", () => {
  M.AutoInit();

  const scanner = new RssScanner("news-container");

  new RssConfigManager(scanner);
  new RssFileManager(scanner);
});