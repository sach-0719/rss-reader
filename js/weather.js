// ========================================
// OpenWeatherMap 天気取得 & 設定管理スクリプト
// ========================================

const STORAGE_KEY_API = 'openweather_api_key';
const STORAGE_KEY_CITY = 'openweather_city_name';
const DEFAULT_CITY = 'Tokyo';

/**
 * Weather APIのアイコンコードを Material Icons のアイコン名に変換
 */
function getMaterialIconName(iconCode) {
  switch (iconCode) {
    case '01d': return 'wb_sunny';          // 晴れ（昼）
    case '01n': return 'nights_stay';        // 晴れ（夜）
    case '02d': return 'wb_cloudy';         // 晴れ時々曇り（昼）
    case '02n': return 'cloud_queue';       // 晴れ時々曇り（夜）
    case '03d':
    case '03n':
    case '04d':
    case '04n': return 'cloud';             // 曇り
    case '09d':
    case '09n': return 'grain';             // 小雨
    case '10d':
    case '10n': return 'umbrella';          // 雨
    case '11d':
    case '11n': return 'flash_on';          // 雷雨
    case '13d':
    case '13n': return 'ac_unit';           // 雪
    case '50d':
    case '50n': return 'filter_drama';      // 霧・モヤ
    default: return 'wb_sunny';
  }
}

/**
 * 天気データを取得してヘッダーに反映
 */
async function fetchWeather() {
  const weatherTrigger = document.getElementById('weather-trigger');
  const iconElement = document.getElementById('weather-icon');
  // ★ヌルポインタエラー防止のため、クエリセレクタを安全に指定
  const tempElement = document.querySelector('#weather-trigger span');

  if (!weatherTrigger || !iconElement || !tempElement) return;

  const apiKey = (localStorage.getItem(STORAGE_KEY_API) || '').trim();
  const cityName = (localStorage.getItem(STORAGE_KEY_CITY) || DEFAULT_CITY).trim();

  // APIキー未設定の場合は非表示
  if (!apiKey) {
    weatherTrigger.classList.add('hidden');
    return;
  }

  // キーが設定されている場合は表示
  weatherTrigger.classList.remove('hidden');

  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&lang=ja&appid=${apiKey}`;

  try {
    const response = await fetch(apiUrl);

    if (response.status === 401) {
      tempElement.textContent = 'キー無効';
      iconElement.textContent = 'error_outline';
      return;
    }

    if (response.status === 404) {
      tempElement.textContent = '地域不明';
      iconElement.textContent = 'location_off';
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const temp = Math.round(data.main.temp);
    const iconCode = data.weather[0]?.icon || '01d';

    // ヘッダー表示を動的に更新
    iconElement.textContent = getMaterialIconName(iconCode);
    tempElement.textContent = `${temp}°C`;

  } catch (error) {
    console.error('Weather API Error:', error);
    tempElement.textContent = '--°C';
    iconElement.textContent = 'cloud_off';
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

  if (apiKeyInput) {
    apiKeyInput.value = localStorage.getItem(STORAGE_KEY_API) || '';
  }
  if (cityInput) {
    cityInput.value = localStorage.getItem(STORAGE_KEY_CITY) || DEFAULT_CITY;
  }

  if (apiSubmitBtn && apiKeyInput) {
    apiSubmitBtn.addEventListener('click', () => {
      const newApiKey = apiKeyInput.value.trim();
      localStorage.setItem(STORAGE_KEY_API, newApiKey);
      alert('APIキーを保存しました');
      fetchWeather();
    });
  }

  if (localSubmitBtn && cityInput) {
    localSubmitBtn.addEventListener('click', () => {
      const newCity = cityInput.value.trim();
      if (!newCity) {
        alert('地域名を入力してください');
        return;
      }
      localStorage.setItem(STORAGE_KEY_CITY, newCity);
      alert('地域名を保存しました');
      fetchWeather();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initWeatherSettings();
  fetchWeather();
});