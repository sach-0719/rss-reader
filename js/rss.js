/**
 * RSS Scanner & Manager - Smart Header & Clean Content Version
 */
class RssScanner {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.siteTitleElement = document.getElementById('site-title'); 
        this.siteDescElement = document.getElementById('site-description'); 
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
            </div>`;

        try {
            const response = await fetch(`${this.proxy}${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error("通信に失敗しました");
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            // --- サイト全体のタイトル(Header)を更新 ---
            // タイトルがない場合は "News-Spot" と表示
            const channelTitle = xmlDoc.querySelector("channel > title, feed > title")?.textContent || "News-Spot";
            if (this.siteTitleElement) {
                this.siteTitleElement.textContent = channelTitle;
            }

            // --- サイト全体の説明文(Sub-Header)を更新 ---
            const channelDesc = xmlDoc.querySelector("channel > description, feed > subtitle")?.textContent || "";
            if (this.siteDescElement) {
                this.siteDescElement.textContent = channelDesc.replace(/<[^>]*>?/gm, '').trim();
            }

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
        
        Array.from(items).slice(0, 8).forEach((item, index) => {
            // --- 1. タイトルの取得 (ない場合は News-Spot) ---
            const title = item.querySelector("title")?.textContent || "News-Spot";
            const linkTag = item.querySelector("link");
            const link = linkTag?.getAttribute("href") || linkTag?.textContent || "#";
            const category = item.querySelector("category")?.textContent || 
                             item.querySelector("category")?.getAttribute("term") || "";

            // --- 2. 説明文の取得と「徹底空白除去」 ---
            let rawDescription = item.querySelector("description")?.textContent || 
                                item.querySelector("summary")?.textContent || 
                                item.getElementsByTagName("content:encoded")[0]?.textContent || "";
            
            let cleanDescription = rawDescription
                .replace(/&nbsp;/g, ' ')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]*>?/gm, '');

            cleanDescription = cleanDescription
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n')
                .trim();

            // --- 3. 日付の取得（相対時間表示） ---
            const dateText = item.querySelector("pubDate")?.textContent || 
                            item.querySelector("updated")?.textContent || 
                            item.getElementsByTagName("dc:date")[0]?.textContent || "";
            let displayDate = "不明";
            if (dateText) {
                const dateObj = new Date(dateText);
                if (!isNaN(dateObj.getTime())) {
                    const now = new Date();
                    const diff = Math.floor((now - dateObj) / 1000);
                    if (diff < 3600) displayDate = `${Math.floor(diff / 60)}分前`;
                    else if (diff < 86400) displayDate = `${Math.floor(diff / 3600)}時間前`;
                    else displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                }
            }

            // --- 4. 画像の取得 ---
            let imageUrl = "";
            const mediaThumb = item.getElementsByTagName("media:thumbnail")[0];
            const mediaContent = item.getElementsByTagName("media:content")[0];
            const enclosure = item.querySelector("enclosure");

            if (mediaThumb) imageUrl = mediaThumb.getAttribute("url");
            else if (mediaContent) imageUrl = mediaContent.getAttribute("url");
            else if (enclosure && enclosure.getAttribute("type")?.startsWith("image")) imageUrl = enclosure.getAttribute("url");
            else {
                const imgMatch = rawDescription.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
                if (imgMatch) imageUrl = imgMatch[1];
            }
            if (!imageUrl) imageUrl = "noimage.jpg"; 

            // --- 5. HTML組み立て ---
            const isYouTube = link.includes('youtube.com') || link.includes('youtu.be');
            const modalId = `modal_${index}`;

            const cardHtml = `
                <div class="col s12 m6 l4" style="margin-bottom: 20px; display: flex;">
                    <div class="card hoverable" style="display: flex; flex-direction: column; width: 100%; margin: 0; overflow: hidden; background-color: #fff;">
                        <div class="card-image" style="flex-shrink: 0; height: 180px; overflow: hidden; background: #eee;">
                            <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='noimage.jpg';">
                        </div>
                        
                        <div style="background: #444; color: #fff; padding: 10px; font-size: 0.9rem; font-weight: bold; line-height: 1.4; min-height: 3.5em;">
                            ${title}
                        </div>
                        ${category ? `<div style="background: #777777; color: #fff; padding: 10px; font-size: 0.9rem; font-weight: bold; line-height: 1.4; min-height: 3.5em;">${category}</div>` : ''}
                        <div class="card-content" style="padding: 12px; flex-grow: 1; position: relative; min-height: 140px;">
                            <!-- 概要がない場合は何も表示しない -->
                            ${cleanDescription ? `<p class="rss-description">${cleanDescription}</p>` : ''}
                            
                            <div style="margin-top: auto; display: flex; align-items: center;">
                                <i class="material-icons grey-text" style="font-size: 0.8rem; margin-right: 4px;">access_time</i>
                                <p class="grey-text" style="font-size: 0.75rem; margin: 0;">${displayDate}</p>
                            </div>
                        </div>

                        <div class="card-action" style="padding: 0; border-top: none;">
                            <a href="${link}" target="_blank" class="waves-effect waves-light btn-small ${isYouTube ? 'red darken-3' : 'light-blue accent-4'}" 
                               style="width: 100%; margin: 0; border-radius: 0; height: 40px; line-height: 40px; text-transform: none; display: block; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <i class="material-icons left" style="margin-right: 8px;">${isYouTube ? 'play_arrow' : 'open_in_new'}</i>${isYouTube ? 'YouTubeで見る' : '記事を読む'}
                            </a>
                            <a href="#${modalId}" class="waves-effect waves-light btn-small green darken-3 modal-trigger" 
                               style="width: 100%; margin: 0; border-radius: 0; height: 40px; line-height: 40px; text-transform: none; display: block; text-align: center;">
                                <i class="material-icons left" style="margin-right: 8px;">qr_code</i>QRコードを表示
                            </a>
                        </div>
                    </div>
                </div>

                <div id="${modalId}" class="modal" style="max-width: 350px; text-align: center;">
                    <div class="modal-content">
                        <h6 style="font-weight:bold; margin-bottom: 20px;">QRコードを読み込む</h6>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}" alt="QR Code" style="width: 200px; height: 200px;">
                        <p style="font-size: 0.7rem; color: #666; margin-top: 15px; word-break: break-all;">${link}</p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="modal-close waves-effect waves-green btn-flat">閉じる</a>
                    </div>
                </div>
            `;
            this.container.insertAdjacentHTML('beforeend', cardHtml);
        });

        M.Modal.init(document.querySelectorAll('.modal'));
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

document.addEventListener('DOMContentLoaded', () => {
    M.AutoInit();
    const scanner = new RssScanner("news-container");
    new RssConfigManager(scanner);
});1