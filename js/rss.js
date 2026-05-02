/**
 * RSS Scanner & Manager - All in One (修正版)
 */
class RssScanner {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.proxy = "https://corsproxy.io/?"; 
    }

    async load(url) {
        if (!url) return;
        
        this.container.innerHTML = `
            <div class="center-align" style="padding-top: 50px;">
                <div class="preloader-wrapper small active">
                    <div class="spinner-layer spinner-blue-only">
                        <div class="circle-clipper left"><div class="circle"></div></div>
                        <div class="gap-patch"><div class="circle"></div></div>
                        <div class="circle-clipper right"><div class="circle"></div></div>
                    </div>
                </div>
                <p>データを取得中...</p>
            </div>`;

        try {
            const response = await fetch(`${this.proxy}${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error("通信に失敗しました");
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            let items = xmlDoc.querySelectorAll("item, entry");

            if (items.length === 0) {
                this.container.innerHTML = '<p class="orange-text center-align">記事が見つかりませんでした。</p>';
            } else {
                this.render(items);
            }
        } catch (error) {
            console.error(error);
            this.container.innerHTML = `<p class="red-text center-align">エラー: ${error.message}</p>`;
        }
    }

render(items) {
        this.container.innerHTML = "";
        
        Array.from(items).slice(0, 9).forEach((item, index) => { // indexを追加
            const title = item.querySelector("title")?.textContent || "No Title";
            const linkTag = item.querySelector("link");
            const link = linkTag?.getAttribute("href") || linkTag?.textContent || "#";
            
            // --- 日付・画像取得ロジック（中略） ---
            const dateText = item.querySelector("pubDate")?.textContent || item.querySelector("updated")?.textContent || item.querySelector("published")?.textContent || "";
            let displayDate = dateText ? new Date(dateText).toLocaleDateString() : "不明";

            let imageUrl = "";
            const mediaThumb = item.getElementsByTagName("media:thumbnail")[0];
            const mediaContent = item.getElementsByTagName("media:content")[0] || item.getElementsByTagName("content")[0];
            if (mediaThumb) imageUrl = mediaThumb.getAttribute("url");
            else if (mediaContent) imageUrl = mediaContent.getAttribute("url");
            else {
                const imgMatch = (item.querySelector("description")?.textContent || "").match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
                if (imgMatch) imageUrl = imgMatch[1];
            }
            if (!imageUrl) imageUrl = "noimage.jpg";

            const isYouTube = link.includes('youtube.com') || link.includes('youtu.be');

            // IDをユニークにする（modal_0, modal_1...）
            const modalId = `modal_${index}`;

            const cardHtml = `
                <div class="col s12 m6 l4" style="margin-bottom: 20px; display: flex;">
                    <div class="card hoverable" style="display: flex; flex-direction: column; width: 100%; margin: 0; overflow: hidden; background-color: #fff;">
                        <div class="card-image" style="flex-shrink: 0; background-color: transparent;">
                            <img src="${imageUrl}" style="width: 100%; height: auto; display: block;">
                        </div>
                        
                        <div style="background: #444; color: #fff; padding: 10px; font-size: 0.9rem; line-height: 1.4; font-weight: bold;">
                            ${title}
                        </div>

                        <div class="card-content" style="padding: 12px; flex-grow: 1;">
                             <p class="grey-text" style="font-size: 0.7rem;">更新: ${displayDate}</p>
                        </div>

                        <div class="card-action" style="padding: 0; border-top: none;">
                            <a href="${link}" target="_blank" class="waves-effect waves-light btn-small ${isYouTube ? 'red darken-3' : 'light-blue accent-4'}" 
                            style="width: 100%; margin: 0; border-radius: 0; height: 40px; line-height: 40px; box-shadow: none; text-transform: none; display: block; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <i class="material-icons left" style="margin-right: 8px;">${isYouTube ? 'play_arrow' : 'open_in_new'}</i>
                                ${isYouTube ? 'YouTubeで見る' : '記事を読む'}
                            </a>

                            <!-- ボタン2：hrefをユニークなIDに合わせる -->
                            <a href="#${modalId}" class="waves-effect waves-light btn-small green darken-3 modal-trigger" 
                            style="width: 100%; margin: 0; border-radius: 0; height: 40px; line-height: 40px; box-shadow: none; text-transform: none; display: block; text-align: center;">
                                <i class="material-icons left" style="margin-right: 8px;">qr_code</i>
                                QRコードを表示
                            </a>
                        </div>
                    </div>
                </div>

                <!-- モーダル本体：IDをユニークにする -->
                <div id="${modalId}" class="modal" style="max-width: 350px; text-align: center;">
                    <div class="modal-content">
                        <h6 style="font-weight:bold; margin-bottom: 20px;">QRコードを読み込む</h6>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}" alt="QR Code" style="width: 200px; height: 200px;">
                        <p style="font-size: 0.7rem; color: #666; margin-top: 15px; word-break: break-all; overflow-wrap: break-word;">
                            ${link}
                        </p>
                        </div>
                    <div class="modal-footer">
                        <a href="#!" class="modal-close waves-effect waves-green btn-flat">閉じる</a>
                    </div>
                </div>
            `;
            this.container.insertAdjacentHTML('beforeend', cardHtml);
        });

        // 重要：HTMLを追加し終わった後に、モーダルを初期化する
        const elems = document.querySelectorAll('.modal');
        M.Modal.init(elems);
    }
}

class RssConfigManager {
    constructor(scanner) {
        this.scanner = scanner;
        this.input = document.getElementById('rss-url-input');
        this.btn = document.getElementById('save-rss-btn');
        this.key = 'user_rss_url';
        this.init();
    }

    init() {
        const savedUrl = localStorage.getItem(this.key);
        if (savedUrl) {
            this.input.value = savedUrl;
            this.scanner.load(savedUrl);
        } else {
            this.scanner.load("https://news.yahoo.co.jp/rss/topics/top-picks.xml");
        }

        this.btn.addEventListener('click', () => {
            const url = this.input.value.trim();
            if (url) {
                localStorage.setItem(this.key, url);
                this.scanner.load(url);
                const sideNav = M.Sidenav.getInstance(document.querySelector('.sidenav'));
                if (sideNav) sideNav.close();
                M.toast({html: 'URLを更新しました'});
            }
        });
    }
}

// アプリの起動
document.addEventListener('DOMContentLoaded', () => {
    M.AutoInit();
    const scanner = new RssScanner("news-container");
    new RssConfigManager(scanner);
});