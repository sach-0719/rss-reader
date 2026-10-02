// ==================================================
// 1. RSS STORE（お気に入りの保存・復元ロジック）
// ==================================================
const RSSStore = {
  key: "rss_list",

  getList() {
    try {
      return JSON.parse(
        localStorage.getItem(this.key) || "[]"
      );
    } catch {
      return [];
    }
  },

save(item) {
  if (!item) return;

  const title = String(item.title || "").trim();
  const xml = String(item.xml || "").trim();

  // 不正なRSSは保存しない
  if (!item.id || !title || !xml) {
    console.warn("不正なRSSデータのため保存を中止しました:", item);
    return;
  }

  const list = this.getList();

  if (list.length >= 10) {
    list.shift();
  }

  list.push({
    id: String(item.id),
    title: title,
    description: String(item.description || ""),
    xml: xml
  });

  localStorage.setItem(this.key, JSON.stringify(list));
},

  get(id) {
    return this.getList().find(
      x => x.id === id
    );
  },

  // ★ RSSを削除
  remove(id) {
    const list = this.getList();

    const newList = list.filter(
      item => item.id !== id
    );

    localStorage.setItem(
      this.key,
      JSON.stringify(newList)
    );
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
      console.error("指定されたコンテナが見つかりません:", containerId);
    }
  }

  // ------------------------------------------------
  // 画像取得
  // ------------------------------------------------
  getImage(item) {
    // enclosure
    const enclosure = item.querySelector("enclosure");
    const enclosureUrl = enclosure?.getAttribute("url");

    if (enclosureUrl) {
      return enclosureUrl;
    }

    // media:thumbnail
    const mediaThumbnail = item.getElementsByTagName("media:thumbnail");

    if (
      mediaThumbnail &&
      mediaThumbnail.length > 0 &&
      mediaThumbnail[0].getAttribute("url")
    ) {
      return mediaThumbnail[0].getAttribute("url");
    }

    // media:content
    const mediaContent = item.getElementsByTagName("media:content");

    if (
      mediaContent &&
      mediaContent.length > 0 &&
      mediaContent[0].getAttribute("url")
    ) {
      return mediaContent[0].getAttribute("url");
    }

    // description内のimg
    const desc =
      item.querySelector("description")?.textContent || "";

    if (desc) {
      const match = desc.match(
        /<img[^>]+src=["']([^"']+)["']/i
      );

      if (match && match[1]) {
        return match[1];
      }
    }

    return "noimage.jpg";
  }


  // ------------------------------------------------
  // リンク取得
  // ------------------------------------------------
  getLink(item) {
    const link = item.querySelector("link");

    if (!link) {
      return "#";
    }

    const text = link.textContent
      ? link.textContent.trim()
      : "";

    const href = link.getAttribute
      ? link.getAttribute("href")
      : "";

    if (text && /^https?:\/\//i.test(text)) {
      return text;
    }

    if (href && /^https?:\/\//i.test(href)) {
      return href;
    }

    return "#";
  }


  // ------------------------------------------------
  // カテゴリ取得
  // ------------------------------------------------
  getCategory(item) {
    return (
      item.querySelector("category")?.textContent?.trim() ||
      "その他"
    );
  }


  // ------------------------------------------------
  // HTML除去
  // ------------------------------------------------
  clean(text) {
    return (text || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }


  // ------------------------------------------------
  // HTMLエスケープ
  // XSS対策
  // ------------------------------------------------
  escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  // ------------------------------------------------
  // ニュースカード描画
  // ------------------------------------------------
  render(items) {
    if (!this.container) {
      return;
    }

    this.container.innerHTML = "";

    Array.from(items)
      .slice(0, 50)
      .forEach(item => {

        const title =
          item.querySelector("title")?.textContent ||
          "（無題）";

        const desc =
          item.querySelector("description")?.textContent ||
          item.querySelector("summary")?.textContent ||
          "";

        const link = this.getLink(item);
        const image = this.getImage(item);
        const category = this.getCategory(item);

        const dateText =
          item.querySelector("pubDate")?.textContent ||
          item.querySelector("updated")?.textContent ||
          item.querySelector("published")?.textContent ||
          "";

        const dateInfo = this.formatDate(dateText);

        const div = document.createElement("div");

        div.className =
          "bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md " +
          "border border-gray-200 dark:border-gray-700 flex flex-col " +
          "justify-between h-full transform transition hover:-translate-y-0.5 hover:shadow-lg";


        // HTMLに入れる文字列はエスケープ
        const safeTitle = this.escapeHtml(title);
        const safeDescription = this.escapeHtml(this.clean(desc));
        const safeCategory = this.escapeHtml(category);
        const safeImage = this.escapeHtml(image);
        const safeLink = this.escapeHtml(link);


        div.innerHTML = `
          <div class="w-full h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
            <img
              src="${safeImage}"
              onerror="this.onerror=null; this.src='noimage.jpg';"
              class="w-full h-full object-cover"
              alt=""
            >
          </div>

          <div class="p-5 flex-1 flex flex-col">

            <div class="
              inline-block self-start mb-3 px-2.5 py-0.5
              text-xs font-bold rounded-full
              bg-blue-50 dark:bg-blue-900/30
              text-blue-600 dark:text-blue-400
            ">
              ${safeCategory}
            </div>

            <div class="
              flex items-center
              text-xs text-gray-400 dark:text-gray-500 mb-2
            ">
              <i class="material-icons text-sm mr-1">
                access_time
              </i>

              <span>
                ${dateInfo.relative}
              </span>

              ${
                dateInfo.exact
                  ? `<span class="ml-2 opacity-60">
                      （${dateInfo.exact}）
                    </span>`
                  : ""
              }
            </div>

            <h3 class="
              text-base font-bold mb-2
              text-gray-900 dark:text-white
              line-clamp-2
            ">
              ${safeTitle}
            </h3>

            <p class="
              text-xs text-gray-600 dark:text-gray-300
              line-clamp-3
            ">
              ${safeDescription}
            </p>
          </div>

          <div class="
            px-5 py-3
            border-t border-gray-100 dark:border-gray-700
            bg-gray-50 dark:bg-gray-800/50
            flex justify-start space-x-4
          ">

            <a
              href="${safeLink}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-500 hover:text-blue-600 flex items-center"
              title="記事を開く"
            >
              <i class="material-icons text-xl">
                open_in_new
              </i>
            </a>

            <button
              type="button"
              class="
                custom-share-trigger
                text-purple-500 hover:text-purple-600
                flex items-center
                bg-none border-none p-0 cursor-pointer
              "
              title="共有"
            >
              <i class="material-icons text-xl">
                share
              </i>
            </button>

            <button
              type="button"
              class="
                custom-qr-trigger
                text-green-500 hover:text-green-600
                flex items-center
                bg-none border-none p-0 cursor-pointer
              "
              title="QRコード"
            >
              <i class="material-icons text-xl">
                qr_code
              </i>
            </button>

          </div>
        `;


        // ------------------------------------------------
        // 共有ボタン
        // ------------------------------------------------
        const shareBtn =
          div.querySelector(".custom-share-trigger");

        if (shareBtn) {
          shareBtn.addEventListener("click", async e => {
            e.preventDefault();

            if (!navigator.share) {
              alert(
                "このブラウザは共有機能に対応していません。"
              );
              return;
            }

            try {
              await navigator.share({
                title: title,
                url: link
              });
            } catch (err) {
              // ユーザーがキャンセルした場合は無視
              if (err?.name !== "AbortError") {
                console.error(
                  "共有に失敗しました:",
                  err
                );
              }
            }
          });
        }


        // ------------------------------------------------
        // QRコードボタン
        // ------------------------------------------------
        const qrBtn =
          div.querySelector(".custom-qr-trigger");

        if (qrBtn) {
          qrBtn.addEventListener("click", e => {
            e.preventDefault();

            const qrImage =
              document.getElementById("qr-image");

            const qrUrlText =
              document.getElementById("qr-url");

            const qrLoading =
              document.getElementById("qr-loading");

            const qrModal =
              document.getElementById("qr-modal");


            // ★ 元コードの重大なバグを修正
            // `${encodeURIComponent(link)}` が必要
            const qrApiUrl =
              `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;


            if (qrImage) {
              qrImage.src = qrApiUrl;
              qrImage.style.display = "block";
            }

            if (qrUrlText) {
              qrUrlText.textContent = link;
            }

            if (qrLoading) {
              qrLoading.style.display = "none";
            }

            if (qrModal) {
              qrModal.classList.remove("hidden");
              qrModal.classList.add("flex");
            }
          });
        }


        this.container.appendChild(div);
      });


    // ------------------------------------------------
    // QRモーダル閉じる処理
    // ------------------------------------------------
    const qrClose =
      document.getElementById("qr-modal-close");

    const qrModalElement =
      document.getElementById("qr-modal");


    if (
      qrClose &&
      qrModalElement &&
      !qrClose.dataset.bound
    ) {
      qrClose.dataset.bound = "true";

      qrClose.addEventListener("click", () => {
        qrModalElement.classList.remove("flex");
        qrModalElement.classList.add("hidden");
      });


      qrModalElement.addEventListener("click", e => {
        if (e.target === qrModalElement) {
          qrModalElement.classList.remove("flex");
          qrModalElement.classList.add("hidden");
        }
      });
    }
  }


  // ------------------------------------------------
  // XML読み込み
  // ------------------------------------------------
  loadFromXMLText(text) {

    if (!text) {
      console.error("XMLデータが空です");
      return;
    }

    const xml =
      new DOMParser().parseFromString(
        text,
        "text/xml"
      );


    // XML解析エラー
    if (xml.querySelector("parsererror")) {
      console.error(
        "XMLの解析に失敗しました"
      );
      return;
    }


    const channel =
      xml.querySelector("channel");

    const feed =
      xml.querySelector("feed");


    const siteTitle =
      channel?.querySelector("title")?.textContent?.trim() ||
      feed?.querySelector("title")?.textContent?.trim() ||
      "News-Spot";


    const siteDesc =
      channel?.querySelector("description")?.textContent?.trim() ||
      feed?.querySelector("subtitle")?.textContent?.trim() ||
      "RSSニュースリーダー";


    const titleEl =
      document.getElementById("site-title");

    const descEl =
      document.getElementById("site-description");


    if (titleEl) {
      titleEl.textContent = siteTitle;
    }

    if (descEl) {
      descEl.textContent = siteDesc;
    }


    let items =
      xml.getElementsByTagName("item");


    if (!items.length) {
      items =
        xml.getElementsByTagName("entry");
    }


    this.allItems =
      Array.from(items);


    this.render(this.allItems);

    this.updateCategoryCheckboxes();
  }


  // ------------------------------------------------
  // カテゴリチェックボックス
  // ------------------------------------------------
  updateCategoryCheckboxes() {

    const container =
      document.getElementById(
        "category-checklist"
      );


    if (!container) {
      return;
    }


    const categories =
      [
        ...new Set(
          this.allItems.map(
            item => this.getCategory(item)
          )
        )
      ];


    let html = `
      <div class="flex items-center space-x-2 py-1">
        <input
          id="category-all"
          type="checkbox"
          checked
          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />

        <span
          id="category-all-text"
          class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          すべて
        </span>
      </div>
    `;


    categories.forEach(category => {

      const safeCategory =
        this.escapeHtml(category);

      html += `
        <div class="flex items-center space-x-2 py-1">

          <input
            type="checkbox"
            class="
              category-item rounded
              border-gray-300 text-blue-600
              focus:ring-blue-500
            "
            value="${safeCategory}"
            checked
          />

          <span
            class="text-sm text-gray-600 dark:text-gray-400"
          >
            ${safeCategory}
          </span>

        </div>
      `;
    });


    container.innerHTML = html;
  }


  // ------------------------------------------------
  // フィルター
  // ------------------------------------------------
  applyFilter() {

    const keyword =
      (
        document.getElementById(
          "search-keyword"
        )?.value || ""
      )
        .toLowerCase()
        .trim();


    const checkedCategories =
      Array.from(
        document.querySelectorAll(
          ".category-item:checked"
        )
      ).map(
        el => el.value
      );


    const allCb =
      document.getElementById(
        "category-all"
      );


    const allChecked =
      allCb
        ? allCb.checked
        : true;


    const from =
      document.getElementById(
        "date-from"
      )?.value;


    const to =
      document.getElementById(
        "date-to"
      )?.value;


    const fromDate =
      from
        ? new Date(`${from}T00:00:00`)
        : null;


    const toDate =
      to
        ? new Date(`${to}T23:59:59.999`)
        : null;


    const filtered =
      this.allItems.filter(item => {

        const title =
          item.querySelector(
            "title"
          )?.textContent || "";


        const desc =
          item.querySelector(
            "description"
          )?.textContent ||
          item.querySelector(
            "summary"
          )?.textContent ||
          "";


        const cat =
          this.getCategory(item);


        const dateText =
          item.querySelector(
            "pubDate"
          )?.textContent ||
          item.querySelector(
            "updated"
          )?.textContent ||
          item.querySelector(
            "published"
          )?.textContent ||
          "";


        const date =
          dateText
            ? new Date(dateText)
            : null;


        const lowerTitle =
          title.toLowerCase();


        const lowerDesc =
          desc.toLowerCase();


        const matchKeyword =
          !keyword ||
          lowerTitle.includes(keyword) ||
          lowerDesc.includes(keyword);


        const matchCategory =
          allChecked ||
          checkedCategories.includes(cat);


        let matchDate = true;


        if (
          fromDate &&
          date &&
          !isNaN(date.getTime())
        ) {
          matchDate =
            date >= fromDate;
        }


        if (
          toDate &&
          date &&
          !isNaN(date.getTime())
        ) {
          matchDate =
            matchDate &&
            date <= toDate;
        }


        return (
          matchKeyword &&
          matchCategory &&
          matchDate
        );
      });


    this.render(filtered);
  }


  // ------------------------------------------------
  // 日付フォーマット
  // ------------------------------------------------
  formatDate(pubDateText) {

    if (!pubDateText) {
      return {
        relative: "日時不明",
        exact: ""
      };
    }


    const date =
      new Date(pubDateText);


    if (isNaN(date.getTime())) {
      return {
        relative: "日時不明",
        exact: ""
      };
    }


    const now =
      new Date();


    const diff =
      now.getTime() -
      date.getTime();


    // 未来の日付
    if (diff < 0) {
      const futureMinutes =
        Math.floor(
          Math.abs(diff) / 60000
        );

      return {
        relative:
          futureMinutes < 1
            ? "まもなく"
            : `${futureMinutes}分後`,
        exact:
          `${date.getFullYear()}/` +
          `${String(
            date.getMonth() + 1
          ).padStart(2, "0")}/` +
          `${String(
            date.getDate()
          ).padStart(2, "0")} ` +
          `${String(
            date.getHours()
          ).padStart(2, "0")}:` +
          `${String(
            date.getMinutes()
          ).padStart(2, "0")}`
      };
    }


    const sec =
      Math.floor(diff / 1000);


    const min =
      Math.floor(sec / 60);


    const hour =
      Math.floor(min / 60);


    const day =
      Math.floor(hour / 24);


    let relative;


    // ★ 元コードの重大な構文エラーを修正
    if (min < 1) {
      relative = `たった今（${sec}秒前）`;
    } else if (hour < 1) {
      relative = `${min}分前`;
    } else if (day < 1) {
      relative = `${hour}時間前`;
    } else if (day < 7) {
      relative = `${day}日前`;
    } else if (day < 30) {
      relative =
        `${Math.floor(day / 7)}週間前`;
    } else if (day < 365) {
      relative =
        `${Math.floor(day / 30)}か月前`;
    } else {
      relative =
        `${date.getFullYear()}/` +
        `${String(
          date.getMonth() + 1
        ).padStart(2, "0")}/` +
        `${String(
          date.getDate()
        ).padStart(2, "0")}`;
    }


    const exact =
      `${date.getFullYear()}/` +
      `${String(
        date.getMonth() + 1
      ).padStart(2, "0")}/` +
      `${String(
        date.getDate()
      ).padStart(2, "0")} ` +
      `${String(
        date.getHours()
      ).padStart(2, "0")}:` +
      `${String(
        date.getMinutes()
      ).padStart(2, "0")}`;


    return {
      relative,
      exact
    };
  }
}


// ==================================================
// 3. SIDEBAR
// ==================================================
class Sidebar {
  constructor(scanner) {
    this.scanner = scanner;
    this.container =
      document.getElementById("rss-list");

    this.render();

    document.addEventListener("click", (e) => {

      // ==========================================
      // RSS削除ボタン
      // ==========================================
      const deleteBtn =
        e.target.closest(".rss-delete");

      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();

        const id =
          deleteBtn.dataset.id;

        const rss =
          RSSStore.get(id);

        if (!rss) return;

        const confirmed =
          confirm(
            `「${rss.title}」を削除しますか？`
          );

        if (!confirmed) return;

        RSSStore.remove(id);

        // サイドバー更新
        this.render();

        return;
      }


      // ==========================================
      // RSS選択
      // ==========================================
      const el =
        e.target.closest(".rss-item");

      if (!el) return;

      const rss =
        RSSStore.get(el.dataset.id);

      if (rss?.xml) {

        this.scanner.loadFromXMLText(
          rss.xml
        );

        const sideNav =
          document.getElementById(
            "nav-mobile"
          );

        const sideNavOverlay =
          document.getElementById(
            "nav-mobile-overlay"
          );

        if (
          sideNav &&
          sideNavOverlay
        ) {
          sideNav.classList.add(
            "-translate-x-full"
          );

          sideNavOverlay.classList.add(
            "hidden"
          );
        }
      }
    });
  }


  render() {

    if (!this.container) return;

    this.container.innerHTML = "";


    RSSStore.getList().forEach(rss => {

      if (
        !rss?.id ||
        !rss?.title
      ) {
        return;
      }


      const li =
        document.createElement("li");

      li.className =
        "flex items-center gap-1";


      // ========================================
      // RSS選択ボタン
      // ========================================
      const a =
        document.createElement("a");

      a.className =
        "rss-item flex-1 flex items-center p-2 rounded-md " +
        "hover:bg-gray-100 dark:hover:bg-gray-700 " +
        "text-gray-700 dark:text-gray-300 " +
        "transition text-sm font-medium cursor-pointer";

      a.href = "#!";

      a.dataset.id =
        rss.id;

      a.textContent =
        rss.title;


      // ========================================
      // 削除ボタン
      // ========================================
      const deleteBtn =
        document.createElement("button");

      deleteBtn.type =
        "button";

      deleteBtn.className =
        "rss-delete flex-shrink-0 p-2 rounded-md " +
        "text-red-500 hover:text-red-700 " +
        "hover:bg-red-50 dark:hover:bg-red-900/20 " +
        "transition";

      deleteBtn.dataset.id =
        rss.id;

      deleteBtn.title =
        "このRSSを削除";


      deleteBtn.innerHTML =
        `<i class="material-icons text-lg">
          delete
        </i>`;


      li.appendChild(a);
      li.appendChild(deleteBtn);

      this.container.appendChild(li);
    });
  }
}


// ==================================================
// 4. FILE MANAGER
// ==================================================
class FileManager {

  constructor(scanner, sidebar) {

    const input =
      document.getElementById(
        "rss-file-input"
      );


    input?.addEventListener(
      "change",
      e => {

        const files =
          e.target.files;


        if (
          !files ||
          files.length === 0
        ) {
          return;
        }


        const file =
          files[0];


        const reader =
          new FileReader();


        reader.onload =
          ev => {

            try {

              const xml =
                ev.target.result;


              const parsed =
                new DOMParser()
                  .parseFromString(
                    xml,
                    "text/xml"
                  );


              if (
                parsed.querySelector(
                  "parsererror"
                )
              ) {
                throw new Error(
                  "XMLの解析に失敗しました。"
                );
              }


              const rssTitle =
                parsed.querySelector(
                  "channel > title"
                )?.textContent?.trim() ||

                parsed.querySelector(
                  "feed > title"
                )?.textContent?.trim() ||

                file.name.replace(
                  /\.[^/.]+$/,
                  ""
                );


              const rssDesc =
                parsed.querySelector(
                  "channel > description"
                )?.textContent?.trim() ||

                parsed.querySelector(
                  "feed > subtitle"
                )?.textContent?.trim() ||

                "";


              RSSStore.save({
                id:
                  Date.now().toString(),

                title:
                  rssTitle,

                description:
                  rssDesc,

                xml:
                  xml
              });


              sidebar.render();

              scanner.loadFromXMLText(
                xml
              );


              // 同じファイルを再選択できるようにする
              input.value = "";

            } catch (error) {

              console.error(
                error
              );

              alert(
                `RSSファイルの読み込みに失敗しました。\n${error.message}`
              );
            }
          };


        reader.onerror =
          () => {

            alert(
              "ファイルの読み込みに失敗しました。"
            );
          };


        reader.readAsText(
          file
        );
      }
    );
  }
}


// ==================================================
// 5. URL MANAGER（URLの結合バグを完全解決した確定版）
// ==================================================
class UrlManager {
  constructor(scanner, sidebar) {
    this.scanner = scanner;
    this.sidebar = sidebar;
    this.input = document.getElementById("rss-url-input");
    this.button = document.getElementById("rss-url-submit");

    if (this.button) {
      this.button.addEventListener("click", () => this.handleUrlImport());
    }
  }

  async handleUrlImport() {
    if (!this.input || !this.button) return;
    const url = this.input.value.trim();

    if (!url) {
      alert("URLを入力してください");
      return;
    }

    try {
      this.button.disabled = true;
      this.button.innerText = "読込...";

      // 【修正点】corsproxy.io の直後に「/?url=」を厳密に挿入しました
      // これにより、ブラウザが正しい通信先としてURLを100%解析できるようになります
      const proxyUrl =
      `https://polished-bush-2352.yuitokun1234.workers.dev/?url=${encodeURIComponent(url)}`;

      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error(`通信エラー (${response.status})`);
      
      const xmlText = await response.text();

      const parsed = new DOMParser().parseFromString(xmlText, "text/xml");
      if (parsed.querySelector("parsererror")) {
        throw new Error("XMLの解析に失敗しました。");
      }

      const rssTitle =
        parsed.querySelector("channel > title")?.textContent?.trim() ||
        parsed.querySelector("feed > title")?.textContent?.trim() ||
        "新しいRSSフィード";

      const rssDesc =
        parsed.querySelector("channel > description")?.textContent?.trim() ||
        parsed.querySelector("feed > subtitle")?.textContent?.trim() ||
        "";

      RSSStore.save({
        id: Date.now().toString(),
        title: rssTitle,
        description: rssDesc,
        xml: xmlText
      });

      this.sidebar.render();
      this.scanner.loadFromXMLText(xmlText);
      this.input.value = ""; 
      alert(`「${rssTitle}」のインポートに成功しました！`);

      const sideNav = document.getElementById('nav-mobile');
      const sideNavOverlay = document.getElementById('nav-mobile-overlay');
      if (sideNav && sideNavOverlay) {
        sideNav.classList.add('-translate-x-full');
        sideNavOverlay.classList.add('hidden');
      }

    } catch (error) {
      console.error(error);
      alert(`インポートに失敗しました: ${error.message}`);
    } finally {
      this.button.disabled = false;
      this.button.innerText = "追加";
    }
  }
}
// ==================================================
// 6. INIT
// ==================================================
document.addEventListener(
  "DOMContentLoaded",
  () => {

    window.scanner =
      new RssScanner(
        "news-container"
      );


    const sidebar =
      new Sidebar(
        window.scanner
      );


    new FileManager(
      window.scanner,
      sidebar
    );


    new UrlManager(
      window.scanner,
      sidebar
    );


    // ------------------------------------------------
    // 検索・フィルター適用
    // ------------------------------------------------
    document
      .getElementById(
        "search-apply"
      )
      ?.addEventListener(
        "click",
        () => {
          window.scanner.applyFilter();
        }
      );


    // ------------------------------------------------
    // Enterキーで検索
    // ------------------------------------------------
    document
      .getElementById(
        "search-keyword"
      )
      ?.addEventListener(
        "keydown",
        e => {

          if (e.key === "Enter") {
            window.scanner.applyFilter();
          }
        }
      );


    // ------------------------------------------------
    // カテゴリチェックボックス連動
    // ------------------------------------------------
    document.addEventListener(
      "change",
      e => {

        const target =
          e.target;


        const allCb =
          document.getElementById(
            "category-all"
          );


        // 「すべて」
        if (
          target.id ===
          "category-all"
        ) {

          const checked =
            target.checked;


          document
            .querySelectorAll(
              ".category-item"
            )
            .forEach(cb => {
              cb.checked =
                checked;
            });


          if (allCb) {
            allCb.indeterminate =
              false;
          }


          window.scanner.applyFilter();

          return;
        }


        // 個別カテゴリ
        if (
          target.classList.contains(
            "category-item"
          )
        ) {

          const items =
            document.querySelectorAll(
              ".category-item"
            );


          const checked =
            document.querySelectorAll(
              ".category-item:checked"
            );


          if (allCb) {

            allCb.checked =
              items.length ===
              checked.length;


            allCb.indeterminate =
              checked.length > 0 &&
              checked.length <
                items.length;
          }


          window.scanner.applyFilter();
        }
      }
    );
  }
);
document.addEventListener("DOMContentLoaded", () => {
  const tabs = new RssTabs(window.scanner);

  new FileManager(window.scanner, sidebar, tabs);
  new UrlManager(window.scanner, sidebar, tabs);

  const sidebar = new Sidebar(window.scanner);

  new FileManager(window.scanner, sidebar);
  new UrlManager(window.scanner, sidebar);

  new RssTabs(window.scanner);

  document.getElementById("search-apply")
    ?.addEventListener("click", () => {
      window.scanner.applyFilter();
    });

  // 以下既存処理...
});
class RssTabs {
  constructor(scanner) {
    this.scanner = scanner;

    // RSSタブそのもの
    this.container = document.getElementById("rss-tabs");

    // スクロールする外側の領域
    this.scrollArea = document.getElementById("rss-tabs-scroll");

    this.leftButton = document.getElementById("rss-tabs-left");
    this.rightButton = document.getElementById("rss-tabs-right");

    if (!this.container) return;

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // 左スクロール
    this.leftButton?.addEventListener("click", () => {
      this.scrollArea?.scrollBy({
        left: -300,
        behavior: "smooth"
      });
    });

    // 右スクロール
    this.rightButton?.addEventListener("click", () => {
      this.scrollArea?.scrollBy({
        left: 300,
        behavior: "smooth"
      });
    });

    // スクロール時
    this.scrollArea?.addEventListener("scroll", () => {
      this.updateButtons();
    });

    // ウィンドウサイズ変更時
    window.addEventListener("resize", () => {
      this.updateButtons();
    });
  }

  render() {
    if (!this.container) return;

  const list = RSSStore.getList().filter(rss =>
    rss &&
    rss.id &&
    typeof rss.title === "string" &&
    rss.title.trim() !== "" &&
    typeof rss.xml === "string" &&
    rss.xml.trim() !== ""
  );


    this.container.innerHTML = "";

    list.forEach((rss, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.dataset.id = rss.id;

      button.className =
        "rss-tab flex-shrink-0 px-4 py-2 rounded-lg " +
        "text-sm font-medium transition " +
        "text-gray-600 dark:text-gray-300 " +
        "hover:bg-gray-100 dark:hover:bg-gray-700";

      button.textContent = rss.title;

      button.addEventListener("click", () => {
        this.scanner.loadFromXMLText(rss.xml);

        this.setActive(button);

        // 選択したタブが見えない場合だけ表示
        button.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        });
      });

      this.container.appendChild(button);

      // 最初のRSSをアクティブにする
      if (index === 0) {
        this.setActive(button);
      }
    });

    this.updateButtons();
  }

  setActive(activeButton) {
    this.container.querySelectorAll(".rss-tab").forEach(button => {
      button.classList.remove(
        "bg-blue-500",
        "text-white"
      );

      button.classList.add(
        "text-gray-600",
        "dark:text-gray-300"
      );
    });

    activeButton.classList.remove(
      "text-gray-600",
      "dark:text-gray-300"
    );

    activeButton.classList.add(
      "bg-blue-500",
      "text-white"
    );
  }

  updateButtons() {
    if (!this.scrollArea) return;

    const currentScroll = this.scrollArea.scrollLeft;

    const maxScroll =
      this.scrollArea.scrollWidth -
      this.scrollArea.clientWidth;

    if (this.leftButton) {
      this.leftButton.disabled = currentScroll <= 1;
    }

    if (this.rightButton) {
      this.rightButton.disabled =
        currentScroll >= maxScroll - 1;
    }
  }
}
