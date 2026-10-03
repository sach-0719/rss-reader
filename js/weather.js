// ========================================
// OpenWeatherMap 天気取得 & 詳細モーダル
// ========================================

const STORAGE_KEY_API = 'openweather_api_key';
const STORAGE_KEY_CITY = 'openweather_city_name';
const DEFAULT_CITY = 'Tokyo';

let currentWeatherData = null;
let currentForecastData = null;
let currentAqiData = null;
let leafletMapInstance = null; // 雨雲レーダーマップのインスタンス保持用

function getMaterialIconName(iconCode) {
  switch (iconCode) {
    case '01d': return 'wb_sunny';
    case '01n': return 'nights_stay';
    case '02d': return 'wb_cloudy';
    case '02n': return 'cloud_queue';
    case '03d': case '03n':
    case '04d': case '04n': return 'cloud';
    case '09d': case '09n': return 'grain';
    case '10d': case '10n': return 'umbrella';
    case '11d': case '11n': return 'flash_on';
    case '13d': case '13n': return 'ac_unit';
    case '50d': case '50n': return 'filter_drama';
    default: return 'wb_sunny';
  }
}

function getColor(iconCode) {
  switch (iconCode) {
    case '01d': return '#f59842';
    case '01n': return '#0b3163';
    case '02d': return '#aeb0a7';
    case '02n': return '#aeb0a7';
    case '03d': case '03n':
    case '04d': case '04n': return '#aeb0a7';
    case '09d': case '09n': return '#53cced';
    case '10d': case '10n': return '#2768f5';
    case '11d': case '11n': return '#ede553';
    case '13d': case '13n': return '#91cfff';
    case '50d': case '50n': return '#aeb0a7';
    default: return '#f59842';
  }
}

/**
 * AQI（大気質指数）の数値テキスト変換
 */
function getAqiLabel(aqi) {
  switch (aqi) {
    case 1: return '良い (1)';
    case 2: return '普通 (2)';
    case 3: return 'やや悪 (3)';
    case 4: return '悪い (4)';
    case 5: return '非常に悪い (5)';
    default: return '--';
  }
}

/**
 * 天気データ（現在・大気質・5日間予報）の取得
 */
async function fetchWeather() {
  const weatherTrigger = document.getElementById('weather-trigger');
  const iconElement = document.getElementById('weather-icon');
  const backgroundElement = document.getElementById('background');
  const tempElement = document.querySelector('#weather-trigger span');

  if (!weatherTrigger || !iconElement || !tempElement) return;

  const apiKey = (localStorage.getItem(STORAGE_KEY_API) || '').trim();
  const cityName = (localStorage.getItem(STORAGE_KEY_CITY) || DEFAULT_CITY).trim();

  if (!apiKey) {
    weatherTrigger.classList.add('hidden');
    return;
  }

  weatherTrigger.classList.remove('hidden');

  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&lang=ja&appid=${apiKey}`;

  try {
    const response = await fetch(apiUrl);

    if (response.status === 401) {
      tempElement.textContent = 'キー無効';
      iconElement.textContent = 'error_outline';
      currentWeatherData = null;
      return;
    }

    if (response.status === 404) {
      tempElement.textContent = '地域不明';
      iconElement.textContent = 'location_off';
      currentWeatherData = null;
      return;
    }

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const data = await response.json();
    currentWeatherData = data;

    const temp = Math.round(data.main.temp);
    const iconCode = data.weather[0]?.icon || '01d';

    iconElement.textContent = getMaterialIconName(iconCode);
    if (backgroundElement) {
      backgroundElement.style.backgroundColor = getColor(iconCode);
    }
    tempElement.textContent = `${temp}°C`;

    // 緯度・経度をもとにサブデータ（大気質・5日間予報）を追加取得
    const { lat, lon } = data.coord;
    fetchAdditionalWeatherData(lat, lon, apiKey);

  } catch (error) {
    console.error('Weather API Error:', error);
    tempElement.textContent = '--°C';
    iconElement.textContent = 'cloud_off';
    currentWeatherData = null;
  }
}

/**
 * 大気質・5日間予報データを非同期で取得
 */
async function fetchAdditionalWeatherData(lat, lon, apiKey) {
  try {
    // 1. 大気質指数（AQI）
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const aqiRes = await fetch(aqiUrl);
    if (aqiRes.ok) {
      currentAqiData = await aqiRes.json();
    }

    // 2. 5日間/3時間予報
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ja&appid=${apiKey}`;
    const forecastRes = await fetch(forecastUrl);
    if (forecastRes.ok) {
      currentForecastData = await forecastRes.json();
    }
  } catch (err) {
    console.error('Sub Weather Data Fetch Error:', err);
  }
}

/**
 * 雨雲レーダー（Leaflet.js）の描画
 */
function initRadarMap(lat, lon, apiKey) {
  const mapContainer = document.getElementById('radar-map');
  if (!mapContainer || typeof L === 'undefined') return;

  // 既存マップがあれば削除して初期化
  if (leafletMapInstance) {
    leafletMapInstance.remove();
    leafletMapInstance = null;
  }

  const map = L.map('radar-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lon], 8);

  // 地図背景（OpenStreetMap）
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  // 雨雲レーダー（OpenWeatherMap Tile API）
const radarUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`;  L.tileLayer(radarUrl, { opacity: 0.65 }).addTo(map);

  leafletMapInstance = map;

  // モーダル表示時のマップサイズ調整
  setTimeout(() => {
    map.invalidateSize();
  }, 200);
}

/**
 * 詳細モーダルを開く
 */
function openWeatherDetailModal() {
  if (!currentWeatherData) return;

  const modal = document.getElementById('weather-detail-modal');
  if (!modal) return;

  const iconCode = currentWeatherData.weather[0]?.icon || '';
  const apiKey = (localStorage.getItem(STORAGE_KEY_API) || '').trim();

  // カード背景色の設定
  const bgElement = document.getElementById('background');
  if (bgElement) {
    bgElement.style.backgroundColor = getColor(iconCode);
  }

  // 基本データ
  document.getElementById('detail-icon').textContent = getMaterialIconName(iconCode);
  document.getElementById('detail-city').textContent = currentWeatherData.name || '東京都';
  document.getElementById('detail-temp').textContent = `${Math.round(currentWeatherData.main.temp)}°C`;

  // 最高/最低気温
  const maxTemp = Math.round(currentWeatherData.main.temp_max);
  const minTemp = Math.round(currentWeatherData.main.temp_min);
  document.getElementById('detail-temp-range').textContent = `${maxTemp}°C/${minTemp}°C`;

  // 湿度・風速・気圧
  document.getElementById('detail-humidity').textContent = `${currentWeatherData.main.humidity}%`;
  document.getElementById('detail-wind').textContent = `${currentWeatherData.wind.speed}m/s`;
  
  // ★ 追加: 気圧
  const pressureEl = document.getElementById('detail-pressure');
  if (pressureEl) {
    pressureEl.textContent = `${currentWeatherData.main.pressure} hPa`;
  }

  // ★ 追加: 大気質指数 (AQI)
  const aqiEl = document.getElementById('detail-aqi');
  if (aqiEl) {
    const aqiVal = currentAqiData?.list[0]?.main?.aqi;
    aqiEl.textContent = getAqiLabel(aqiVal);
  }

  // ★ 追加: 5日間予報のレンダリング
  renderForecastList();

  // ★ 追加: 雨雲レーダーマップの表示
  if (currentWeatherData.coord && apiKey) {
    initRadarMap(currentWeatherData.coord.lat, currentWeatherData.coord.lon, apiKey);
  }

  modal.classList.remove('hidden');
}

/**
 * 5日間予報リストのレンダリング（正午 12:00 のデータ抽出）
 */
function renderForecastList() {
  const container = document.getElementById('detail-forecast-list');
  if (!container) return;

  container.innerHTML = '';

  if (!currentForecastData || !currentForecastData.list) {
    container.innerHTML = '<p class="text-xs text-center opacity-75">予報データ読み込み中...</p>';
    return;
  }

  // 12:00:00 の予報データを抽出（約5日分）
  const dailyList = currentForecastData.list.filter(item => item.dt_txt.includes('12:00:00'));

  dailyList.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayStr = `${date.getMonth() + 1}/${date.getDate()}`;
    const icon = getMaterialIconName(item.weather[0]?.icon || '01d');
    const temp = `${Math.round(item.main.temp)}°C`;

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between text-xs py-1 border-b border-white/20 last:border-none';
    row.innerHTML = `
      <span class="w-10">${dayStr}</span>
      <span class="material-icons text-base" style="color:white">${icon}</span>
      <span class="font-bold">${temp}</span>
    `;
    container.appendChild(row);
  });
}

/**
 * イベントリスナー登録
 */
function initWeatherEvents() {
  const weatherTrigger = document.getElementById('weather-trigger');
  const detailModal = document.getElementById('weather-detail-modal');
  const closeBtn = document.getElementById('close-weather-detail');

  if (weatherTrigger) {
    weatherTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openWeatherDetailModal();
    });
  }

  if (closeBtn && detailModal) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      detailModal.classList.add('hidden');
    });
  }

  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) {
        detailModal.classList.add('hidden');
      }
    });
  }
}

/**
 * 設定モーダルの初期化
 */
function initWeatherSettings() {
  const apiKeyInput = document.getElementById('weather-api-key-input');
  const cityInput = document.getElementById('weather-city-input');
  const apiSubmitBtn = document.getElementById('weather-api-submit');
  const localSubmitBtn = document.getElementById('weather-local-submit');

  if (apiKeyInput) apiKeyInput.value = localStorage.getItem(STORAGE_KEY_API) || '';
  if (cityInput) cityInput.value = localStorage.getItem(STORAGE_KEY_CITY) || DEFAULT_CITY;

  if (apiSubmitBtn && apiKeyInput) {
    apiSubmitBtn.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY_API, apiKeyInput.value.trim());
      alert('APIキーを保存しました');
      fetchWeather();
    });
  }

  if (localSubmitBtn && cityInput) {
    localSubmitBtn.addEventListener('click', () => {
      const newCity = cityInput.value.trim();
      if (!newCity) return alert('地域名を入力してください');
      localStorage.setItem(STORAGE_KEY_CITY, newCity);
      alert('地域名を保存しました');
      fetchWeather();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initWeatherSettings();
  initWeatherEvents();
  fetchWeather();
});