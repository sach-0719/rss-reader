// ========================================
// OpenWeatherMap 天気取得 & スマホ風詳細モーダル
// ========================================

const STORAGE_KEY_API = 'openweather_api_key';
const STORAGE_KEY_CITY = 'openweather_city_name';
const DEFAULT_CITY = 'Tokyo';

let currentWeatherData = null;

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
function getColor(iconCode)
{
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
function getWeatherGradient(iconCode) {
  if (!iconCode) return 'from-blue-500 via-indigo-600 to-slate-900';
  if (iconCode.endsWith('n')) return 'from-slate-800 via-indigo-950 to-black';

  switch (iconCode.slice(0, 2)) {
    case '01': return 'from-sky-400 via-blue-500 to-indigo-700';
    case '02': case '03': case '04': return 'from-blue-400 via-slate-500 to-gray-700';
    case '09': case '10': case '11': return 'from-slate-600 via-slate-700 to-zinc-900';
    case '13': return 'from-blue-200 via-indigo-300 to-slate-700';
    default: return 'from-blue-500 via-indigo-600 to-slate-900';
  }
}

/**
 * 天気データの取得
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
    backgroundElement.style.backgroundColor = getColor(iconCode);
    tempElement.textContent = `${temp}°C`;

  } catch (error) {
    console.error('Weather API Error:', error);
    tempElement.textContent = '--°C';
    iconElement.textContent = 'cloud_off';
    currentWeatherData = null;
  }
}

/**
 * 詳細モーダルを開く
 */
/**
 * 詳細モーダルを開く（画像レイアウト準拠）
 */
function openWeatherDetailModal() {
  if (!currentWeatherData) return;

  const modal = document.getElementById('weather-detail-modal');
  if (!modal) return;

  const iconCode = currentWeatherData.weather[0]?.icon || '';

  // 各要素へデータを流し込み
  document.getElementById('detail-icon').textContent = getMaterialIconName(iconCode);
  document.getElementById('detail-city').textContent = currentWeatherData.name || '東京都';
  document.getElementById('detail-temp').textContent = `${Math.round(currentWeatherData.main.temp)}°C`; 
  document.getElementById('background').style.backgroundColor = getColor(iconCode);
  // 最高/最低気温の表示 format: "20°C/18°C"
  const maxTemp = Math.round(currentWeatherData.main.temp_max);
  const minTemp = Math.round(currentWeatherData.main.temp_min);
  document.getElementById('detail-temp-range').textContent = `${maxTemp}°C/${minTemp}°C`;

  // 湿度と風速
  document.getElementById('detail-humidity').textContent = `${currentWeatherData.main.humidity}%`;
  document.getElementById('detail-wind').textContent = `${currentWeatherData.wind.speed}m/s`;

  modal.classList.remove('hidden');
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
