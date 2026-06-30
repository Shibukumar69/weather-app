/**
 * Live Weather Dashboard - Main Application Orchestrator
 */

import { getWeatherData } from './api.js';
import { updateTempChart, updateWindChart } from './charts.js';
import { showToast, requestNotificationPermission, triggerSevereAlertNotification } from './notifications.js';
import { VoiceAssistant } from './voice.js';

/* ==========================================================================
   APP STATE
   ========================================================================== */
const state = {
  currentCity: '',
  weatherData: null,
  unit: 'C', // 'C' or 'F'
  theme: 'dark', // 'dark' or 'light'
  favorites: [],
  history: [],
  apiKey: '',
  voiceFeedback: true,
  currentBackground: 'Sunny',
  autoRefreshInterval: null
};

/* ==========================================================================
   STATIC DATA: AUTO-SUGGESTIONS & CITIES
   ========================================================================== */
const SUGGESTED_CITIES = [
  'London', 'New York', 'Tokyo', 'Paris', 'Berlin', 'Sydney', 'Mumbai', 
  'Delhi', 'Patna', 'Cairo', 'Cape Town', 'Rio de Janeiro', 'Moscow', 
  'Toronto', 'Dubai', 'Singapore', 'Chicago', 'Los Angeles', 'San Francisco',
  'Seattle', 'Miami', 'Hong Kong', 'Beijing', 'Seoul', 'Bangkok', 'Rome',
  'Madrid', 'Amsterdam', 'Vienna', 'Stockholm', 'Oslo', 'Zurich', 'Istanbul'
];

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
const el = {
  // Splash & Body
  body: document.body,
  splash: document.getElementById('splash-screen'),
  
  // Search & Navigation
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  voiceSearchBtn: document.getElementById('voice-search-btn'),
  geoBtn: document.getElementById('geo-btn'),
  suggestionsBox: document.getElementById('suggestions-box'),
  favoritesList: document.getElementById('favorites-list'),
  historyList: document.getElementById('history-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  offlineBadge: document.getElementById('offline-badge'),
  
  // Header Actions
  greetingMsg: document.getElementById('greeting-msg'),
  liveClock: document.getElementById('live-clock'),
  currentDate: document.getElementById('current-date'),
  unitCBtn: document.getElementById('unit-c-btn'),
  unitFBtn: document.getElementById('unit-f-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  favoriteToggleBtn: document.getElementById('favorite-toggle-btn'),
  shareBtn: document.getElementById('share-btn'),
  pdfBtn: document.getElementById('pdf-btn'),
  screenshotBtn: document.getElementById('screenshot-btn'),
  fullscreenBtn: document.getElementById('fullscreen-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  
  // Weather Hero Card
  demoBadge: document.getElementById('demo-badge'),
  heroCity: document.getElementById('hero-city'),
  heroDate: document.getElementById('hero-date'),
  heroTemp: document.getElementById('hero-temp'),
  heroCondition: document.getElementById('hero-condition'),
  heroHighLow: document.getElementById('hero-high-low'),
  heroIconWrapper: document.getElementById('hero-weather-icon-wrapper'),
  heroFeelsLike: document.getElementById('hero-feels-like'),
  
  // Forecasts & Charts
  hourlyContainer: document.getElementById('hourly-forecast-container'),
  forecast5dayList: document.getElementById('forecast-5day-list'),
  tabTempBtn: document.getElementById('tab-temp-btn'),
  tabWindBtn: document.getElementById('tab-wind-btn'),
  chartTempWrapper: document.getElementById('chart-temp-wrapper'),
  chartWindWrapper: document.getElementById('chart-wind-wrapper'),
  
  // Highlights Cards
  uvValue: document.getElementById('highlight-uv'),
  uvSliderThumb: document.getElementById('uv-slider-thumb'),
  uvDesc: document.getElementById('uv-desc'),
  sunriseVal: document.getElementById('highlight-sunrise'),
  sunsetVal: document.getElementById('highlight-sunset'),
  sunArcFill: document.getElementById('sun-arc-fill'),
  sunIndicator: document.getElementById('sun-indicator'),
  windVal: document.getElementById('highlight-wind'),
  windDirDesc: document.getElementById('wind-dir-desc'),
  compassNeedle: document.getElementById('compass-needle'),
  humidityVal: document.getElementById('highlight-humidity'),
  humidityCircleFill: document.getElementById('humidity-circle-fill'),
  humidityDesc: document.getElementById('humidity-desc'),
  visibilityVal: document.getElementById('highlight-visibility'),
  visibilityDesc: document.getElementById('visibility-desc'),
  aqiVal: document.getElementById('highlight-aqi'),
  aqiIndicator: document.getElementById('aqi-indicator'),
  aqiDesc: document.getElementById('aqi-desc'),
  rainVal: document.getElementById('highlight-rain'),
  rainBarFill: document.getElementById('rain-bar-fill'),
  rainDesc: document.getElementById('rain-desc'),
  pressureVal: document.getElementById('highlight-pressure'),
  pressureDesc: document.getElementById('pressure-desc'),
  
  // Modals & Overlays
  voiceOverlay: document.getElementById('voice-overlay'),
  voiceStatusText: document.getElementById('voice-status-text'),
  voiceTranscriptText: document.getElementById('voice-transcript-text'),
  voiceCloseBtn: document.getElementById('voice-close-btn'),
  settingsModal: document.getElementById('settings-modal'),
  settingsCloseBtn: document.getElementById('settings-close-btn'),
  apiKeyInput: document.getElementById('api-key-input'),
  toggleKeyVisibility: document.getElementById('toggle-key-visibility'),
  voiceFeedbackToggle: document.getElementById('voice-feedback-toggle'),
  notificationToggle: document.getElementById('browser-notification-toggle'),
  settingsResetBtn: document.getElementById('settings-reset-btn'),
  settingsSaveBtn: document.getElementById('settings-save-btn'),
  
  // Background Canvas
  bgCanvas: document.getElementById('weather-background-canvas')
};

// Canvas context
const ctx = el.bgCanvas.getContext('2d');
let animationFrameId = null;
let particles = [];
let lightningFlash = false;
let flashOpacity = 0;

/* ==========================================================================
   INITIALIZATION & SETUP
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  loadLocalStorage();
  setupEventListeners();
  initClock();
  initCanvas();
  initServiceWorker();
  
  // Trigger initial search to populate dashboard
  const defaultCity = state.favorites[0] || state.history[0] || 'London';
  performSearch(defaultCity, true);
  
  // Start auto refresh
  startAutoRefresh();

  // Hide splash screen after brief timeout to show premium loading transition
  setTimeout(() => {
    el.splash.classList.add('fade-out');
    setTimeout(() => el.splash.style.display = 'none', 800);
  }, 1800);
});

// Load settings and data from LocalStorage
function loadLocalStorage() {
  state.apiKey = localStorage.getItem('live_weather_api_key') || '';
  state.unit = localStorage.getItem('live_weather_unit') || 'C';
  state.theme = localStorage.getItem('live_weather_theme') || 'dark';
  state.voiceFeedback = localStorage.getItem('live_weather_voice_feedback') !== 'false';
  
  try {
    state.favorites = JSON.parse(localStorage.getItem('live_weather_favorites')) || ['London', 'New York', 'Tokyo'];
    state.history = JSON.parse(localStorage.getItem('live_weather_history')) || ['Delhi', 'Patna', 'Paris'];
  } catch (e) {
    state.favorites = ['London', 'New York', 'Tokyo'];
    state.history = ['Delhi', 'Patna', 'Paris'];
  }

  // Set unit switch active class
  if (state.unit === 'C') {
    el.unitCBtn.classList.add('active');
    el.unitFBtn.classList.remove('active');
  } else {
    el.unitFBtn.classList.add('active');
    el.unitCBtn.classList.remove('active');
  }

  // Set visual mode based on theme state
  if (state.theme === 'light') {
    el.body.classList.add('light-theme');
  } else {
    el.body.classList.remove('light-theme');
  }

  // Synchronize modal controls
  el.apiKeyInput.value = state.apiKey;
  el.voiceFeedbackToggle.checked = state.voiceFeedback;
  el.notificationToggle.checked = Notification.permission === 'granted';

  renderFavorites();
  renderHistory();
}

function saveFavorites() {
  localStorage.setItem('live_weather_favorites', JSON.stringify(state.favorites));
}

function saveHistory() {
  localStorage.setItem('live_weather_history', JSON.stringify(state.history));
}

/* ==========================================================================
   EVENT LISTENERS & BINDINGS
   ========================================================================== */
function setupEventListeners() {
  // Search actions
  el.searchBtn.addEventListener('click', () => searchFromInput());
  el.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchFromInput();
  });
  
  // Keyboard Shortcut: Ctrl + M triggers voice search
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      triggerVoiceSearch();
    }
  });

  // Autocomplete suggestions
  el.searchInput.addEventListener('input', () => {
    const val = el.searchInput.value.trim().toLowerCase();
    if (!val) {
      el.suggestionsBox.classList.add('hidden');
      return;
    }
    const filtered = SUGGESTED_CITIES.filter(city => city.toLowerCase().startsWith(val));
    if (filtered.length === 0) {
      el.suggestionsBox.classList.add('hidden');
      return;
    }
    el.suggestionsBox.innerHTML = '';
    filtered.slice(0, 5).forEach(city => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.innerText = city;
      div.addEventListener('click', () => {
        el.searchInput.value = city;
        el.suggestionsBox.classList.add('hidden');
        performSearch(city);
      });
      el.suggestionsBox.appendChild(div);
    });
    el.suggestionsBox.classList.remove('hidden');
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!el.searchInput.contains(e.target) && !el.suggestionsBox.contains(e.target)) {
      el.suggestionsBox.classList.add('hidden');
    }
  });

  // Geolocation
  el.geoBtn.addEventListener('click', () => fetchWeatherFromGeolocation());

  // Action controls
  el.unitCBtn.addEventListener('click', () => toggleUnits('C'));
  el.unitFBtn.addEventListener('click', () => toggleUnits('F'));
  el.refreshBtn.addEventListener('click', () => {
    if (state.currentCity) performSearch(state.currentCity);
  });

  // Favorites logic
  el.favoriteToggleBtn.addEventListener('click', () => {
    if (!state.weatherData) return;
    const city = state.weatherData.city;
    const idx = state.favorites.findIndex(c => c.toLowerCase() === city.toLowerCase());
    
    if (idx !== -1) {
      state.favorites.splice(idx, 1);
      el.favoriteToggleBtn.classList.remove('favorited');
      showToast(`${city} removed from favorites`, 'info');
    } else {
      state.favorites.push(city);
      el.favoriteToggleBtn.classList.add('favorited');
      showToast(`${city} added to favorites`, 'success');
    }
    saveFavorites();
    renderFavorites();
  });

  // Clear history
  el.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    saveHistory();
    renderHistory();
    showToast('Search history cleared', 'info');
  });

  // Theme settings button (double-click triggers mode swap, or toggle in action bar)
  // Let's use Fullscreen / Settings / Refresh. Wait, let's map Double-Click on logo or a shortcut for quick theme swap!
  document.querySelector('.sidebar-header').addEventListener('dblclick', () => {
    toggleTheme();
  });

  // Fullscreen
  el.fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        showToast(`Error enabling fullscreen: ${err.message}`, 'error');
      });
    } else {
      document.exitFullscreen();
    }
  });

  // Share
  el.shareBtn.addEventListener('click', () => shareWeatherData());

  // PDF & Screenshot
  el.pdfBtn.addEventListener('click', () => exportPDF());
  el.screenshotBtn.addEventListener('click', () => saveScreenshot());

  // Chart switching tabs
  el.tabTempBtn.addEventListener('click', () => {
    el.tabTempBtn.classList.add('active');
    el.tabWindBtn.classList.remove('active');
    el.chartTempWrapper.classList.remove('hidden');
    el.chartWindWrapper.classList.add('hidden');
  });
  el.tabWindBtn.addEventListener('click', () => {
    el.tabTempBtn.classList.remove('active');
    el.tabWindBtn.classList.add('active');
    el.chartTempWrapper.classList.add('hidden');
    el.chartWindWrapper.classList.remove('hidden');
  });

  // Settings Modal Controls
  el.settingsBtn.addEventListener('click', () => {
    el.settingsModal.classList.remove('hidden');
  });
  el.settingsCloseBtn.addEventListener('click', () => {
    el.settingsModal.classList.add('hidden');
  });
  el.settingsModal.addEventListener('click', (e) => {
    if (e.target === el.settingsModal) el.settingsModal.classList.add('hidden');
  });

  el.toggleKeyVisibility.addEventListener('click', () => {
    if (el.apiKeyInput.type === 'password') {
      el.apiKeyInput.type = 'text';
      el.toggleKeyVisibility.innerText = 'Hide';
    } else {
      el.apiKeyInput.type = 'password';
      el.toggleKeyVisibility.innerText = 'Show';
    }
  });

  el.settingsResetBtn.addEventListener('click', () => {
    el.apiKeyInput.value = '';
    el.voiceFeedbackToggle.checked = true;
    el.notificationToggle.checked = false;
  });

  el.settingsSaveBtn.addEventListener('click', () => {
    state.apiKey = el.apiKeyInput.value.trim();
    state.voiceFeedback = el.voiceFeedbackToggle.checked;
    
    localStorage.setItem('live_weather_api_key', state.apiKey);
    localStorage.setItem('live_weather_voice_feedback', state.voiceFeedback);
    
    if (el.notificationToggle.checked) {
      requestNotificationPermission().then(granted => {
        el.notificationToggle.checked = granted;
      });
    }

    el.settingsModal.classList.add('hidden');
    showToast('Settings saved successfully', 'success');
    
    // Refresh weather if we have a current city
    if (state.currentCity) performSearch(state.currentCity);
  });

  // Mobile Pull to Refresh gestures
  setupSwipeToRefresh();
}

/* ==========================================================================
   UI UTILITIES: CLOCK, SYSTEM THEME
   ========================================================================== */
function initClock() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  function update() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    
    // Clock
    el.liveClock.innerText = `${hrs}:${mins}:${secs}`;
    
    // Greeting
    const hour = now.getHours();
    if (hour < 12) {
      el.greetingMsg.innerText = 'Good Morning';
    } else if (hour < 18) {
      el.greetingMsg.innerText = 'Good Afternoon';
    } else {
      el.greetingMsg.innerText = 'Good Evening';
    }

    // Date
    el.currentDate.innerText = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  }
  
  update();
  setInterval(update, 1000);
}

function toggleTheme() {
  if (state.theme === 'dark') {
    state.theme = 'light';
    el.body.classList.add('light-theme');
  } else {
    state.theme = 'dark';
    el.body.classList.remove('light-theme');
  }
  localStorage.setItem('aura_theme', state.theme);
  showToast(`Switched to ${state.theme} mode`, 'info');
  
  // Re-draw charts with new theme colors
  if (state.weatherData) {
    updateCharts();
  }
}

/* ==========================================================================
   SWIPE TO REFRESH / PULL TO REFRESH (MOBILE)
   ========================================================================== */
function setupSwipeToRefresh() {
  let touchStart = 0;
  let touchDelta = 0;
  const pullThreshold = 100;
  
  window.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      touchStart = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (touchStart === 0) return;
    const clientY = e.touches[0].clientY;
    touchDelta = clientY - touchStart;

    if (touchDelta > 0 && window.scrollY === 0) {
      // Pulling down
      el.body.style.transform = `translateY(${Math.min(touchDelta * 0.4, 60)}px)`;
      el.body.style.transition = 'none';
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (touchStart === 0) return;
    
    el.body.style.transform = '';
    el.body.style.transition = 'transform 0.4s ease';
    
    if (touchDelta > pullThreshold && window.scrollY === 0) {
      if (state.currentCity) {
        showToast('Refreshing weather...', 'info');
        performSearch(state.currentCity);
      }
    }
    
    touchStart = 0;
    touchDelta = 0;
  });
}

/* ==========================================================================
   GEOLOCATION INTEGRATION
   ========================================================================== */
function fetchWeatherFromGeolocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'warning');
    return;
  }
  
  showToast('Locating your position...', 'info');
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      // Since OpenWeatherMap requires a reverse geocoding to get city name for standard requests,
      // or we can use custom coordinate endpoints, let's reverse lookup or use coordinates.
      // For fallback/mock or if key exists, we fetch.
      // We will perform weather lookup by coordinates.
      // Let's implement coordinates lookups. To make it simple, we can fetch from an online API,
      // or reverse geocode.
      // Reverse geocoding endpoint: `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
      // Directly search coordinates via Open-Meteo
      performSearch(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    },
    (error) => {
      let msg = 'Location access denied';
      if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location info unavailable';
      else if (error.code === error.TIMEOUT) msg = 'Location request timed out';
      showToast(msg, 'error');
    }
  );
}

/* ==========================================================================
   SEARCH & WEATHER DATA UPDATE
   ========================================================================== */
function searchFromInput() {
  const query = el.searchInput.value.trim();
  if (!query) {
    showToast('Please enter a city name', 'warning');
    return;
  }
  el.suggestionsBox.classList.add('hidden');
  performSearch(query);
}

export async function performSearch(city, skipHistory = false) {
  setLoadingState(true);
  
  try {
    const data = await getWeatherData(city, state.apiKey);
    
    state.weatherData = data;
    state.currentCity = data.city;
    
    // Set background condition theme
    state.currentBackground = data.current.mainCondition;
    applyWeatherTheme(data.current.mainCondition);
    
    // Render sections
    renderWeatherHero(data);
    renderHourlyForecast(data.hourly);
    render5DayForecast(data.forecast);
    renderHighlights(data.current);
    updateCharts();
    
    // Add to history list if successful
    if (!skipHistory && !data.isMock) {
      addToHistory(data.city);
    }
    
    // Manage favorite button state
    const isFav = state.favorites.some(c => c.toLowerCase() === data.city.toLowerCase());
    if (isFav) {
      el.favoriteToggleBtn.classList.add('favorited');
    } else {
      el.favoriteToggleBtn.classList.remove('favorited');
    }
    
    // Show badges & notifications
    if (data.isMock) {
      el.demoBadge.classList.remove('hidden');
    } else {
      el.demoBadge.classList.add('hidden');
    }
    
    showToast(`Weather updated for ${data.city}`, 'success');

    // Trigger browser notifications if enabled & extreme condition
    if (data.current.mainCondition === 'Thunderstorm' || data.current.mainCondition === 'Snow') {
      triggerSevereAlertNotification(
        `Weather Alert: ${data.city}`, 
        `Alert: ${data.current.description}. Current temperature is ${formatTemp(data.current.temp)}.`
      );
    }
    
    // Voice feedback synthesizer
    if (state.voiceFeedback && window.voiceAssistantInstance) {
      const speechText = `The weather in ${data.city} is currently ${data.current.description} with a temperature of ${formatTemp(data.current.temp)}.`;
      window.voiceAssistantInstance.speak(speechText);
    }
    
  } catch (error) {
    if (error.message === 'CITY_NOT_FOUND') {
      showToast(`City "${city}" not found. Try again.`, 'error');
    } else if (error.message === 'INVALID_API_KEY') {
      showToast('Invalid API Key. Using fallback data.', 'warning');
      // If API fails, fetch from mock directly
      const mockData = await getWeatherData(city, '');
      performSearch(city, skipHistory);
    } else {
      showToast('Network error. Serving offline cached data.', 'warning');
    }
  } finally {
    setLoadingState(false);
  }
}

// Visual loading skeletons toggle
function setLoadingState(isLoading) {
  if (isLoading) {
    // Show Skeletons in list/grid
    el.hourlyContainer.innerHTML = Array(5).fill('<div class="skeleton-loader-card"></div>').join('');
    el.forecast5dayList.innerHTML = Array(5).fill('<div class="skeleton-loader-row"></div>').join('');
    
    // Clear texts / show loading animations
    el.heroCity.innerText = 'Loading...';
    el.heroTemp.innerText = '--';
    el.heroCondition.innerText = 'Updating forecasts...';
    el.heroHighLow.innerText = '--';
    el.heroFeelsLike.innerText = '--';
  }
}

function toggleUnits(unit) {
  if (state.unit === unit) return;
  state.unit = unit;
  localStorage.setItem('aura_unit', unit);
  
  if (unit === 'C') {
    el.unitCBtn.classList.add('active');
    el.unitFBtn.classList.remove('active');
  } else {
    el.unitFBtn.classList.add('active');
    el.unitCBtn.classList.remove('active');
  }
  
  // Re-render components with new units
  if (state.weatherData) {
    renderWeatherHero(state.weatherData);
    renderHourlyForecast(state.weatherData.hourly);
    render5DayForecast(state.weatherData.forecast);
    renderHighlights(state.weatherData.current);
    updateCharts();
  }
}

function startAutoRefresh() {
  if (state.autoRefreshInterval) clearInterval(state.autoRefreshInterval);
  state.autoRefreshInterval = setInterval(() => {
    if (state.currentCity) {
      console.log(`[Auto Refresh] Updating weather for ${state.currentCity}`);
      performSearch(state.currentCity, true);
    }
  }, 15 * 60 * 1000); // 15 minutes
}

/* ==========================================================================
   DOM RENDER HELPERS
   ========================================================================== */
function formatTemp(celsius) {
  if (state.unit === 'F') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

function formatSpeed(mps) {
  if (state.unit === 'F') {
    // Convert m/s to mph
    return Math.round(mps * 2.23694 * 10) / 10;
  }
  return mps;
}

// Convert condition string to animated inline SVG
function getWeatherSVG(condition) {
  const cleanCond = condition.toLowerCase();
  
  // Sunny / Clear Sky
  if (cleanCond.includes('sunny') || cleanCond.includes('clear')) {
    return `
      <svg viewBox="0 0 100 100" class="weather-svg-animate">
        <circle cx="50" cy="50" r="20" fill="#f59e0b" filter="drop-shadow(0 0 10px #f59e0b)"/>
        <!-- Sun rays -->
        <g class="animate-spin-slow">
          <line x1="50" y1="10" x2="50" y2="20" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
          <line x1="50" y1="80" x2="50" y2="90" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
          <line x1="10" y1="50" x2="20" y2="50" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
          <line x1="80" y1="50" x2="90" y2="50" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
          <line x1="22" y1="22" x2="29" y2="29" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
          <line x1="71" y1="71" x2="78" y2="78" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
          <line x1="22" y1="78" x2="29" y2="71" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
          <line x1="71" y1="29" x2="78" y2="22" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
        </g>
      </svg>
    `;
  }
  
  // Rain
  if (cleanCond.includes('rain') || cleanCond.includes('drizzle')) {
    return `
      <svg viewBox="0 0 100 100" class="weather-svg-animate">
        <g class="animate-drift">
          <path d="M30,60 C30,51 38,45 48,45 C52,35 62,35 68,40 C75,40 82,47 80,56 C80,63 70,65 60,65 C45,65 30,65 30,60 Z" fill="#cbd5e1"/>
        </g>
        <line x1="38" y1="70" x2="33" y2="80" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round" class="animate-rain-drop"/>
        <line x1="50" y1="72" x2="45" y2="82" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round" class="animate-rain-drop" style="animation-delay: 0.3s"/>
        <line x1="62" y1="70" x2="57" y2="80" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round" class="animate-rain-drop" style="animation-delay: 0.6s"/>
      </svg>
    `;
  }
  
  // Snow
  if (cleanCond.includes('snow')) {
    return `
      <svg viewBox="0 0 100 100" class="weather-svg-animate">
        <g class="animate-drift">
          <path d="M30,60 C30,51 38,45 48,45 C52,35 62,35 68,40 C75,40 82,47 80,56 C80,63 70,65 60,65 C45,65 30,65 30,60 Z" fill="#f8fafc"/>
        </g>
        <circle cx="38" cy="72" r="3" fill="#cbd5e1" class="animate-rain-drop"/>
        <circle cx="50" cy="76" r="3.5" fill="#cbd5e1" class="animate-rain-drop" style="animation-delay: 0.4s"/>
        <circle cx="62" cy="71" r="3.2" fill="#cbd5e1" class="animate-rain-drop" style="animation-delay: 0.8s"/>
      </svg>
    `;
  }

  // Thunderstorm
  if (cleanCond.includes('thunder') || cleanCond.includes('storm')) {
    return `
      <svg viewBox="0 0 100 100" class="weather-svg-animate">
        <g class="animate-drift">
          <path d="M30,60 C30,51 38,45 48,45 C52,35 62,35 68,40 C75,40 82,47 80,56 C80,63 70,65 60,65 C45,65 30,65 30,60 Z" fill="#64748b"/>
        </g>
        <path d="M52,65 L44,78 L52,78 L48,92 L62,74 L54,74 Z" fill="#f59e0b" filter="drop-shadow(0 0 5px #f59e0b)"/>
      </svg>
    `;
  }
  
  // Night / Clear Moon
  if (cleanCond.includes('night')) {
    return `
      <svg viewBox="0 0 100 100" class="weather-svg-animate">
        <path d="M45,30 C30,30 25,45 25,55 C25,70 38,80 55,80 C68,80 75,70 75,65 C60,67 43,58 45,30 Z" fill="#cbd5e1" filter="drop-shadow(0 0 8px #cbd5e1)"/>
        <!-- Star sparkles -->
        <circle cx="65" cy="30" r="1.5" fill="#fff" class="animate-flash" style="animation: flash 1s infinite alternate"/>
        <circle cx="30" cy="25" r="1.2" fill="#fff" class="animate-flash" style="animation: flash 1.5s infinite alternate"/>
      </svg>
    `;
  }
  
  // Cloudy (Default fallback)
  return `
    <svg viewBox="0 0 100 100" class="weather-svg-animate">
      <g class="animate-drift">
        <path d="M25,60 C25,50 34,44 44,44 C48,34 60,34 66,39 C74,39 80,47 78,56 C78,63 68,65 58,65 C43,65 25,65 25,60 Z" fill="#cbd5e1" style="opacity: 0.85"/>
        <path d="M38,62 C38,55 45,50 52,50 C55,42 64,42 69,46 C75,46 80,51 79,59 C79,64 71,66 63,66 C51,66 38,66 38,62 Z" fill="#e2e8f0"/>
      </g>
    </svg>
  `;
}

function renderWeatherHero(data) {
  el.heroCity.innerText = `${data.city}, ${data.country}`;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  el.heroDate.innerText = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  
  el.heroTemp.innerText = formatTemp(data.current.temp);
  el.heroCondition.innerText = data.current.description;
  
  // Render low/high ranges
  // Mock API structure forecast aggregates high/low values
  const todayForecast = data.forecast[0] || { tempMin: data.current.temp - 3, tempMax: data.current.temp + 4 };
  el.heroHighLow.innerHTML = `H: ${formatTemp(todayForecast.tempMax)}° &nbsp;L: ${formatTemp(todayForecast.tempMin)}°`;
  
  el.heroFeelsLike.innerText = `Feels like ${formatTemp(data.current.feelsLike)}°`;
  
  // Load SVG Icon
  el.heroIconWrapper.innerHTML = getWeatherSVG(data.current.mainCondition);
}

function renderHourlyForecast(hourlyData) {
  el.hourlyContainer.innerHTML = '';
  
  hourlyData.forEach(hour => {
    const card = document.createElement('div');
    card.className = 'hourly-card';
    
    card.innerHTML = `
      <span class="hourly-time">${hour.time}</span>
      <div class="hourly-icon">${getWeatherSVG(hour.condition)}</div>
      <span class="hourly-temp">${formatTemp(hour.temp)}°</span>
    `;
    el.hourlyContainer.appendChild(card);
  });
}

function render5DayForecast(forecastData) {
  el.forecast5dayList.innerHTML = '';
  
  forecastData.forEach(day => {
    const row = document.createElement('div');
    row.className = 'forecast-row';
    
    row.innerHTML = `
      <span class="forecast-day">${day.day}</span>
      <div class="forecast-condition-wrapper">
        <div class="forecast-icon">${getWeatherSVG(day.condition)}</div>
        <span class="forecast-condition-desc">${day.condition}</span>
      </div>
      <div class="forecast-temps">
        <span class="forecast-temp-val">${formatTemp(day.tempMax)}°</span>
        <span class="forecast-temp-val min">${formatTemp(day.tempMin)}°</span>
      </div>
    `;
    el.forecast5dayList.appendChild(row);
  });
}

function renderHighlights(current) {
  // UV Index
  el.uvValue.innerText = current.uvIndex.toFixed(1);
  const uvPercent = Math.min((current.uvIndex / 12) * 100, 100);
  el.uvSliderThumb.style.left = `${uvPercent}%`;
  
  let uvText = 'Low';
  if (current.uvIndex >= 3 && current.uvIndex < 6) uvText = 'Moderate';
  else if (current.uvIndex >= 6 && current.uvIndex < 8) uvText = 'High';
  else if (current.uvIndex >= 8 && current.uvIndex < 11) uvText = 'Very High';
  else if (current.uvIndex >= 11) uvText = 'Extreme';
  el.uvDesc.innerText = `${uvText} risk of exposure`;

  // Sunrise/Sunset Progress Indicator
  const formatTime = (ts) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  el.sunriseVal.innerText = formatTime(current.sunrise);
  el.sunsetVal.innerText = formatTime(current.sunset);
  
  // Calculate relative position of sun
  const nowTs = Date.now() / 1000;
  const totalDaylight = current.sunset - current.sunrise;
  const currentElapsed = nowTs - current.sunrise;
  
  if (currentElapsed > 0 && currentElapsed < totalDaylight) {
    const pct = currentElapsed / totalDaylight;
    el.sunArcFill.style.clipPath = `polygon(0 0, ${pct * 100}% 0, ${pct * 100}% 100%, 0 100%)`;
    
    // Position of sun indicator on circle circumference
    const angle = Math.PI - (pct * Math.PI); // 180deg down to 0
    const rX = 45; // radius X percent
    const rY = 80; // radius Y pixels
    const sunLeft = 5 + (pct * 90); // 5% to 95%
    const sunTop = 40 - (Math.sin(pct * Math.PI) * 35); // curve height
    
    el.sunIndicator.style.left = `${sunLeft}%`;
    el.sunIndicator.style.top = `${sunTop}px`;
    el.sunIndicator.innerText = '☀️';
  } else {
    // Night
    el.sunArcFill.style.clipPath = 'polygon(0 0, 0% 0, 0% 100%, 0 100%)';
    el.sunIndicator.style.left = '50%';
    el.sunIndicator.style.top = '40px';
    el.sunIndicator.innerText = '🌙';
  }

  // Wind
  const speedUnit = state.unit === 'F' ? 'mph' : 'm/s';
  el.windVal.innerText = formatSpeed(current.windSpeed);
  el.windDirDesc.innerText = `Direction: ${current.windDir}°`;
  el.compassNeedle.style.transform = `translate(-50%, -50%) rotate(${current.windDir}deg)`;

  // Humidity
  el.humidityVal.innerText = current.humidity;
  // SVG stroke-dasharray parameter
  el.humidityCircleFill.setAttribute('stroke-dasharray', `${current.humidity}, 100`);
  
  let humDesc = 'Comfortable';
  if (current.humidity < 30) humDesc = 'Dry air';
  else if (current.humidity > 60) humDesc = 'Sticky, moist';
  el.humidityDesc.innerText = humDesc;

  // Visibility
  const visDistance = state.unit === 'F' ? (current.visibility / 1609.34).toFixed(1) : (current.visibility / 1000).toFixed(1);
  const visUnit = state.unit === 'F' ? 'mi' : 'km';
  el.visibilityVal.innerText = visDistance;
  document.querySelector('.highlight-card:nth-of-type(5) .highlight-unit').innerText = visUnit;
  
  let visDesc = 'Clear view';
  const kms = current.visibility / 1000;
  if (kms < 1) visDesc = 'Thick fog';
  else if (kms < 4) visDesc = 'Hazy visibility';
  el.visibilityDesc.innerText = visDesc;

  // Air Quality
  const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
  el.aqiVal.innerText = current.aqi;
  el.aqiDesc.innerText = aqiLabels[current.aqi - 1] || 'Unknown';
  el.aqiIndicator.style.left = `${(current.aqi - 1) * 25 + 5}%`;

  // Rain Probability
  el.rainVal.innerText = current.rainProbability;
  el.rainBarFill.style.width = `${current.rainProbability}%`;
  el.rainDesc.innerText = current.rainProbability > 50 ? 'Strong chance of rain' : 'Minimal risk';

  // Pressure
  el.pressureVal.innerText = current.pressure;
  el.pressureDesc.innerText = current.pressure > 1013 ? 'High pressure system' : 'Low pressure system';
}

function updateCharts() {
  if (!state.weatherData) return;
  const isDark = state.theme === 'dark';
  
  // Format temperatures in the array based on state unit
  const formattedHourly = state.weatherData.hourly.map(h => ({
    ...h,
    temp: formatTemp(h.temp)
  }));

  updateTempChart('tempChartCanvas', formattedHourly, isDark);
  updateWindChart('windChartCanvas', state.weatherData.hourly, isDark);
}

// Render search lists
function renderFavorites() {
  el.favoritesList.innerHTML = '';
  
  if (state.favorites.length === 0) {
    el.favoritesList.innerHTML = '<span class="empty-list-text">No favorites added</span>';
    return;
  }
  
  state.favorites.forEach(city => {
    const chip = document.createElement('div');
    chip.className = 'favorite-chip';
    chip.innerHTML = `
      <span class="favorite-chip-name">${city}</span>
      <button class="favorite-chip-remove" aria-label="Remove">&times;</button>
    `;
    
    // Click city to search
    chip.querySelector('.favorite-chip-name').addEventListener('click', () => {
      performSearch(city);
    });
    
    // Click remove button
    chip.querySelector('.favorite-chip-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = state.favorites.indexOf(city);
      if (idx !== -1) {
        state.favorites.splice(idx, 1);
        saveFavorites();
        renderFavorites();
        showToast(`${city} removed from favorites`, 'info');
        // Update favorite toggle button if matches active display
        if (state.weatherData && state.weatherData.city.toLowerCase() === city.toLowerCase()) {
          el.favoriteToggleBtn.classList.remove('favorited');
        }
      }
    });
    
    el.favoritesList.appendChild(chip);
  });
}

function renderHistory() {
  el.historyList.innerHTML = '';
  
  if (state.history.length === 0) {
    el.historyList.innerHTML = '<span class="empty-list-text" style="font-size:0.75rem; color:var(--text-sub)">No recent searches</span>';
    return;
  }
  
  state.history.forEach(city => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <span class="history-item-name">${city}</span>
      <button class="history-delete-btn" aria-label="Delete">&times;</button>
    `;
    
    li.querySelector('.history-item-name').addEventListener('click', () => {
      performSearch(city);
    });
    
    li.querySelector('.history-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = state.history.indexOf(city);
      if (idx !== -1) {
        state.history.splice(idx, 1);
        saveHistory();
        renderHistory();
      }
    });
    
    el.historyList.appendChild(li);
  });
}

function addToHistory(city) {
  const normCity = city.trim();
  const idx = state.history.findIndex(c => c.toLowerCase() === normCity.toLowerCase());
  
  if (idx !== -1) {
    // Move to top of history
    state.history.splice(idx, 1);
  }
  state.history.unshift(normCity);
  
  // Cap history list size at 5
  if (state.history.length > 5) {
    state.history.pop();
  }
  
  saveHistory();
  renderHistory();
}

/* ==========================================================================
   UTILITY MODULES: EXPORTS & SHARING
   ========================================================================== */
async function shareWeatherData() {
  if (!state.weatherData) return;
  const shareText = `Check out the weather in ${state.weatherData.city}: ${state.weatherData.current.description}, ${formatTemp(state.weatherData.current.temp)}°${state.unit}!`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Live Weather Dashboard',
        text: shareText,
        url: window.location.href
      });
      showToast('Weather details shared successfully', 'success');
    } catch (e) {
      console.log('Share canceled or failed', e);
    }
  } else {
    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('Weather details copied to clipboard!', 'success');
    } catch (e) {
      showToast('Copying failed.', 'error');
    }
  }
}

// Generate PDF Report using html2canvas & jsPDF
function exportPDF() {
  if (!state.weatherData) return;
  showToast('Generating PDF weather report...', 'info');
  
  const element = document.getElementById('capture-area');
  
  // Configure export parameters
  const opt = {
    margin: 10,
    filename: `Live_Weather_Report_${state.weatherData.city}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2canvas(element, opt.html2canvas).then(canvas => {
    const imgData = canvas.toDataURL('image/jpeg');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF(opt.jsPDF);
    
    // Fit canvas image to PDF page
    const imgWidth = 280; // A4 landscape width
    const pageHeight = 210; // A4 landscape height
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 5;

    pdf.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight);
    pdf.save(opt.filename);
    showToast('PDF downloaded successfully!', 'success');
  }).catch(e => {
    console.error(e);
    showToast('Failed to compile PDF. Standard layout printing triggered.', 'warning');
    window.print();
  });
}

// Take Screenshot of dashboard and save as PNG
function saveScreenshot() {
  if (!state.weatherData) return;
  showToast('Capturing screenshot...', 'info');
  
  const element = document.getElementById('capture-area');
  
  html2canvas(element, { useCORS: true, scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `Live_Weather_Dashboard_${state.weatherData.city}.png`;
    link.href = canvas.toDataURL();
    link.click();
    showToast('Screenshot saved successfully!', 'success');
  }).catch(() => {
    showToast('Screenshot capture failed.', 'error');
  });
}

/* ==========================================================================
   CANVAS DYNAMIC ANIMATION ENGINE
   ========================================================================== */
function initCanvas() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Start loop
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  loop();
}

function resizeCanvas() {
  el.bgCanvas.width = window.innerWidth;
  el.bgCanvas.height = window.innerHeight;
  initParticles(state.currentBackground);
}

// Generate particles based on condition
function initParticles(condition) {
  particles = [];
  const count = condition === 'Rain' || condition === 'Thunderstorm' ? 120 :
                condition === 'Snow' ? 80 :
                condition === 'Sunny' ? 25 :
                condition === 'Cloudy' ? 8 :
                condition === 'Night' ? 60 : 20;

  for (let i = 0; i < count; i++) {
    particles.push(createParticle(condition, true));
  }
}

function createParticle(condition, randomY = false) {
  const w = el.bgCanvas.width;
  const h = el.bgCanvas.height;
  
  const p = {
    x: Math.random() * w,
    y: randomY ? Math.random() * h : -20,
    size: 1,
    vx: 0,
    vy: 0,
    alpha: Math.random() * 0.5 + 0.2,
    color: '#fff',
    angle: Math.random() * Math.PI * 2,
    spin: Math.random() * 0.02 - 0.01,
    length: 0 // for rain streaks
  };

  switch (condition) {
    case 'Sunny':
      p.size = Math.random() * 8 + 4;
      p.vy = -(Math.random() * 0.4 + 0.1);
      p.vx = (Math.random() * 0.4 - 0.2);
      p.color = 'rgba(254, 240, 138, 0.25)'; // soft yellow bubbles
      p.alpha = Math.random() * 0.3 + 0.1;
      break;

    case 'Rain':
    case 'Thunderstorm':
      p.size = Math.random() * 1.5 + 0.8;
      p.vy = Math.random() * 12 + 10;
      p.vx = -2 - Math.random() * 2; // slightly wind-drifted left
      p.length = Math.random() * 25 + 15;
      p.color = 'rgba(14, 165, 233, 0.4)';
      break;

    case 'Snow':
      p.size = Math.random() * 3.5 + 1.2;
      p.vy = Math.random() * 1.2 + 0.6;
      p.vx = Math.random() * 1.5 - 0.7;
      p.color = 'rgba(255, 255, 255, 0.75)';
      break;

    case 'Cloudy':
      p.size = Math.random() * 100 + 100; // huge fog circles
      p.vy = 0;
      p.vx = Math.random() * 0.15 + 0.05; // slowly drifts right
      p.color = 'rgba(203, 213, 225, 0.04)';
      break;

    case 'Night':
      p.size = Math.random() * 1.8 + 0.4;
      p.vy = 0;
      p.vx = 0;
      p.color = '#fff';
      p.alpha = Math.random() * 0.8 + 0.2;
      p.twinkleSpeed = Math.random() * 0.02 + 0.005;
      break;
  }

  return p;
}

function loop() {
  ctx.clearRect(0, 0, el.bgCanvas.width, el.bgCanvas.height);
  
  // Lightning Flash Effect (thunderstorms)
  if (state.currentBackground === 'Thunderstorm') {
    if (Math.random() < 0.004 && !lightningFlash) {
      lightningFlash = true;
      flashOpacity = Math.random() * 0.7 + 0.3;
    }
    
    if (lightningFlash) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
      ctx.fillRect(0, 0, el.bgCanvas.width, el.bgCanvas.height);
      flashOpacity -= 0.04;
      if (flashOpacity <= 0) {
        lightningFlash = false;
      }
    }
  }

  // Draw Particles
  particles.forEach((p, idx) => {
    ctx.beginPath();
    
    if (state.currentBackground === 'Rain' || state.currentBackground === 'Thunderstorm') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx, p.y + p.vy);
      ctx.stroke();
      
      // Update
      p.y += p.vy;
      p.x += p.vx;
      
      if (p.y > el.bgCanvas.height || p.x < -20) {
        particles[idx] = createParticle(state.currentBackground);
      }
    } else if (state.currentBackground === 'Night') {
      // Twinkling stars
      p.alpha += p.spin; // reuse spin as delta
      if (p.alpha > 0.95 || p.alpha < 0.1) {
        p.spin = -p.spin;
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (state.currentBackground === 'Snow') {
      // Swirling snowflakes
      p.angle += p.spin;
      p.x += Math.sin(p.angle) * 0.5;
      p.y += p.vy;
      
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      if (p.y > el.bgCanvas.height) {
        particles[idx] = createParticle(state.currentBackground);
      }
    } else {
      // Sunny bubbles or Cloudy mist
      p.x += p.vx;
      p.y += p.vy;
      
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      if (p.y < -p.size * 2 || p.y > el.bgCanvas.height + p.size * 2 || p.x > el.bgCanvas.width + p.size * 2) {
        particles[idx] = createParticle(state.currentBackground);
      }
    }
  });

  animationFrameId = requestAnimationFrame(loop);
}

function applyWeatherTheme(condition) {
  // Clear themes
  el.body.className = state.theme === 'light' ? 'light-theme' : '';
  
  // Add condition class
  const themeClass = `theme-${condition.toLowerCase()}`;
  el.body.classList.add(themeClass);
  
  initParticles(condition);
}

/* ==========================================================================
   VOICE ASSISTANT SYSTEM
   ========================================================================== */
function triggerVoiceSearch() {
  if (!window.voiceAssistantInstance) {
    showToast('Voice search helper initializing...', 'info');
    return;
  }
  
  if (!window.voiceAssistantInstance.isSupported()) {
    showToast('Voice recognition is not supported on this browser.', 'warning');
    return;
  }
  
  window.voiceAssistantInstance.toggle();
}

function handleVoiceStateChange(status, payload) {
  switch (status) {
    case 'listening':
      el.voiceOverlay.classList.remove('hidden');
      el.voiceStatusText.innerText = 'Listening...';
      el.voiceTranscriptText.innerText = 'Say "Weather in London" or "Patna weather"';
      break;
      
    case 'processing':
      el.voiceStatusText.innerText = 'Thinking...';
      el.voiceTranscriptText.innerText = `"${payload}"`;
      break;
      
    case 'no-match':
      el.voiceStatusText.innerText = 'Sorry, could not understand.';
      el.voiceTranscriptText.innerText = `Recognized: "${payload}". Try saying "Weather in Mumbai"`;
      setTimeout(() => el.voiceOverlay.classList.add('hidden'), 2500);
      break;
      
    case 'inactive':
      // Delay closing overlay to let user see transcript
      setTimeout(() => {
        if (!window.voiceAssistantInstance.isListening) {
          el.voiceOverlay.classList.add('hidden');
        }
      }, 1500);
      break;
      
    case 'error':
      el.voiceStatusText.innerText = 'Voice Recognition Error';
      el.voiceTranscriptText.innerText = payload === 'not-allowed' ? 'Microphone permission denied.' : 'Service unavailable.';
      setTimeout(() => el.voiceOverlay.classList.add('hidden'), 2500);
      break;
  }
}

// Bind microphone buttons
el.voiceSearchBtn.addEventListener('click', triggerVoiceSearch);
el.voiceCloseBtn.addEventListener('click', () => {
  if (window.voiceAssistantInstance) {
    window.voiceAssistantInstance.stop();
  }
  el.voiceOverlay.classList.add('hidden');
});

// Create Global Voice Instance
const onVoiceResult = (city) => {
  el.searchInput.value = city;
  performSearch(city);
};
window.voiceAssistantInstance = new VoiceAssistant(onVoiceResult, handleVoiceStateChange);

/* ==========================================================================
   OFFLINE & PWA SERVICE WORKER INTEGRATION
   ========================================================================== */
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('[SW] Service Worker Registered successfully:', reg.scope);
        })
        .catch(err => {
          console.error('[SW] Service Worker registration failed:', err);
        });
    });

    // Detect offline status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }
}

function updateOnlineStatus() {
  if (navigator.onLine) {
    el.offlineBadge.classList.add('hidden');
    showToast('Network connection restored. Live Weather is online.', 'success');
  } else {
    el.offlineBadge.classList.remove('hidden');
    showToast('Live Weather is running in offline mode.', 'warning');
  }
}
