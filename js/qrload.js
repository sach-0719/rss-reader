document.addEventListener("click", (e) => {

const btn = e.target.closest(".qr-btn");
if (!btn) return;

const url = btn.dataset.link;

const modal = M.Modal.getInstance(
document.getElementById("qr-modal")
);

const loading = document.getElementById("qr-loading");
const img = document.getElementById("qr-image");

// 初期状態
loading.style.display = "block";
img.style.display = "none";

img.onload = () => {
loading.style.display = "none";
img.style.display = "block";
};

img.onerror = () => {
loading.innerHTML = `       <p class="red-text">
        QRコードの生成に失敗しました       </p>
    `;
};

img.src =
`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

document.getElementById("qr-url").textContent = url;

modal.open();
});
