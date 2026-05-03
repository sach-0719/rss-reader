class RssScanner {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.titleEl = document.getElementById("site-title");
    this.descEl = document.getElementById("site-description");
    this.proxy = "https://corsproxy.io/?";
  }

  // =========================
  // 日付（完全統一版）
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

    // ① たった今
    if (diffSec < 10) return "たった今";

    // ② 秒（10〜59秒は秒表示）
    if (diffSec < 60) return `${diffSec}秒前`;

    // ③ 分
    if (diffMin < 60) return `${diffMin}分前`;

    // ④ 時間
    if (diffHour < 24) return `${diffHour}時間前`;

    // ⑤ 日（1〜14日）
    if (diffDay < 15) return `${diffDay}日前`;

    // ⑥ 詳細表示（15日以上）
    const w = ["日","月","火","水","木","金","土"];

    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const week = w[d.getDay()];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");

    return `${y}/${m}/${day}（${week}） ${hh}:${mm}`;
    }

  // =========================
  // ロード
  // =========================
  async load(url) {
    if (!url) return;

    this.container.innerHTML =
      `<p style="text-align:center;">読み込み中...</p>`;

    try {
      const res = await fetch(`${this.proxy}${encodeURIComponent(url)}`);
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "text/xml");

      if (xml.querySelector("parsererror")) {
        throw new Error("XML parse error");
      }

      // ヘッダー
      const channelTitle =
        xml.querySelector("channel > title, feed > title")?.textContent;

      const channelDesc =
        xml.querySelector(
          "channel > description, feed > subtitle, feed > description"
        )?.textContent;

      if (this.titleEl) this.titleEl.textContent = channelTitle || "News-Spot";
      if (this.descEl) this.descEl.textContent = channelDesc || "RSSフィード";

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

    const enclosure = item.querySelector("enclosure");
    if (enclosure?.getAttribute("url")) return enclosure.getAttribute("url");

    return "#";
  }

  // =========================
  // サムネ
  // =========================
  getThumbnail(item, link, rawDesc) {
    const enclosure = item.querySelector("enclosure");
    if (enclosure?.getAttribute("url")) return enclosure.getAttribute("url");

    const mediaThumb = item.getElementsByTagName("media:thumbnail")[0];
    if (mediaThumb) return mediaThumb.getAttribute("url");

    const mediaContent = item.getElementsByTagName("media:content")[0];
    if (mediaContent) return mediaContent.getAttribute("url");

    if (link.includes("youtube.com") || link.includes("youtu.be")) {
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
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<div[^>]*>/gi, "")
      .replace(/<\/div>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
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
        item.querySelector("content")?.textContent ||
        "";

      const desc = this.cleanText(rawDesc);
      const image = this.getThumbnail(item, link, rawDesc);
      const date = this.getDate(item);

      const modalId = `qr_${i}`;

      const html = `
        <div class="news-item">
          <div class="card">

            <div class="card-image">
              <img src="${image}" onerror="this.src='noimage.jpg'">
            </div>

            <div class="card-title-box">
              ${title}
            </div>

            <div class="rss-description">
              ${desc}
            </div>

            <div style="font-size:12px;color:#777;margin-top:6px;padding:0 10px;">
              <i class="material-icons" style="font-size:14px;vertical-align:middle;">schedule</i>
              ${date}
            </div>

            <div class="card-action" style="display:flex;justify-content:space-around;">
              <a href="${link}" target="_blank" rel="noopener noreferrer">
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
            <h6 style="word-break:break-all;">${link}</h6>
          </div>

          <div class="modal-footer">
            <a href="#!" class="modal-close btn-flat">
              <i class="material-icons">close</i>
            </a>
          </div>
        </div>
      `;

      this.container.insertAdjacentHTML("beforeend", html);
    });

    M.Modal.init(document.querySelectorAll(".modal"));
  }
}

/**
 * 設定管理
 */
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

      const nav = M.Sidenav.getInstance(document.querySelector(".sidenav"));
      if (nav) nav.close();

      M.toast({ html: "更新しました" });
    });
  }
}
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

      reader.onload = (event) => {
        const text = event.target.result;

        this.parseXml(text);
      };

      reader.readAsText(file);
    });
  }

  parseXml(text) {
    const xml = new DOMParser().parseFromString(text, "text/xml");

    // XMLエラー検知
    if (xml.querySelector("parsererror")) {
      alert("XMLの読み込みに失敗しました");
      return;
    }

    // タイトル反映
    const title =
      xml.querySelector("channel > title, feed > title")?.textContent;

    const desc =
      xml.querySelector(
        "channel > description, feed > subtitle, feed > description"
      )?.textContent;

    if (this.scanner.titleEl) {
      this.scanner.titleEl.textContent = title || "ローカルRSS";
    }

    if (this.scanner.descEl) {
      this.scanner.descEl.textContent = desc || "ローカルファイル";
    }

    // アイテム取得
    const items = xml.querySelectorAll("item, entry");

    this.scanner.render(items);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  M.AutoInit();

  const scanner = new RssScanner("news-container");

  new RssConfigManager(scanner);
  new RssFileManager(scanner); // ←これ追加
});