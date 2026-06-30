/**
 * Aura Weather Dashboard - API Module
 * Fetches from Open-Meteo (No-Key Free Real Weather) or OpenWeatherMap (Custom Key)
 * Falls back to Seeded Mock Data if offline.
 */

// Helper to seed random numbers based on a string (for fallback mock weather)
function seededRandom(seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return function() {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

// Generate fallback mock weather data (used if network is completely down)
export function generateMockWeatherData(city) {
  const normalizedCity = city.trim().toLowerCase();
  const rand = seededRandom(normalizedCity);
  
  const lat = (rand() * 140) - 70;
  const lon = (rand() * 360) - 180;
  
  const conditions = ['Sunny', 'Rain', 'Snow', 'Cloudy', 'Thunderstorm'];
  const conditionIdx = Math.floor(rand() * conditions.length);
  let mainCondition = conditions[conditionIdx];

  if (normalizedCity.includes('london')) mainCondition = 'Cloudy';
  else if (normalizedCity.includes('delhi') || normalizedCity.includes('patna')) mainCondition = 'Sunny';
  else if (normalizedCity.includes('mumbai')) mainCondition = 'Rain';
  else if (normalizedCity.includes('siberia') || normalizedCity.includes('oslo')) mainCondition = 'Snow';

  const absLat = Math.abs(lat);
  let baseTemp = 35 - (absLat * 0.7);
  if (mainCondition === 'Rain') baseTemp -= 3;
  if (mainCondition === 'Snow') baseTemp = -2 - (rand() * 8);
  if (mainCondition === 'Thunderstorm') baseTemp -= 2;
  
  const temp = Math.round(baseTemp * 10) / 10;
  const feelsLike = Math.round((temp + (rand() * 4 - 2)) * 10) / 10;
  const humidity = Math.floor(45 + rand() * 45);
  const windSpeed = Math.round((2 + rand() * 10) * 10) / 10;
  const windDir = Math.floor(rand() * 360);
  const pressure = Math.floor(1008 + rand() * 10);
  const visibility = Math.floor(6000 + rand() * 4000);
  const uvIndex = Math.round((2 + rand() * 8) * 10) / 10;
  const clouds = Math.floor(10 + rand() * 80);
  const aqi = Math.floor(1 + rand() * 5);
  const rainProbability = Math.floor(10 + rand() * 80);

  const hourly = [];
  const startHour = new Date().getHours();
  const weatherIcons = {
    'Sunny': '01d', 'Cloudy': '03d', 'Rain': '10d', 'Snow': '13d', 'Thunderstorm': '11d', 'Night': '01n'
  };

  for (let i = 0; i < 8; i++) {
    const forecastHour = (startHour + i * 3) % 24;
    const isNightHour = forecastHour < 6 || forecastHour > 19;
    let hourTemp = temp + Math.sin((forecastHour - 6) / 24 * Math.PI * 2) * 4;
    hourTemp = Math.round(hourTemp * 10) / 10;
    
    let hourCondition = mainCondition;
    if (isNightHour && mainCondition === 'Sunny') hourCondition = 'Night';
    
    let icon = weatherIcons[hourCondition] || '02d';
    if (isNightHour && icon.endsWith('d')) icon = icon.replace('d', 'n');

    hourly.push({
      time: `${String(forecastHour).padStart(2, '0')}:00`,
      temp: hourTemp,
      condition: hourCondition,
      icon: icon
    });
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  const forecast = [];
  
  for (let i = 1; i <= 5; i++) {
    const dayName = days[(todayIdx + i) % 7];
    const dayRand = seededRandom(normalizedCity + dayName);
    let dayCondition = conditions[Math.floor(dayRand() * conditions.length)];
    let tMin = temp - 3 - (dayRand() * 3);
    let tMax = temp + 3 + (dayRand() * 3);
    
    forecast.push({
      day: dayName,
      tempMin: Math.round(tMin),
      tempMax: Math.round(tMax),
      condition: dayCondition,
      icon: weatherIcons[dayCondition] || '02d'
    });
  }

  return {
    city: city.charAt(0).toUpperCase() + city.slice(1),
    country: 'FALLBACK',
    lat: Math.round(lat * 10) / 10,
    lon: Math.round(lon * 10) / 10,
    isMock: true,
    current: {
      temp: temp,
      feelsLike: feelsLike,
      description: 'Mock: ' + mainCondition,
      mainCondition: mainCondition,
      humidity: humidity,
      windSpeed: windSpeed,
      windDir: windDir,
      pressure: pressure,
      visibility: visibility,
      uvIndex: uvIndex,
      sunrise: Math.floor(Date.now() / 1000 - 18000),
      sunset: Math.floor(Date.now() / 1000 + 18000),
      clouds: clouds,
      aqi: aqi,
      rainProbability: rainProbability
    },
    hourly: hourly,
    forecast: forecast
  };
}

// Map WMO Weather Codes to unified conditions
function parseWMOCode(code, isDay) {
  let mainCondition = 'Cloudy';
  let description = 'Overcast';
  let icon = isDay ? '03d' : '03n';

  if (code === 0) {
    mainCondition = isDay ? 'Sunny' : 'Night';
    description = isDay ? 'Clear sky' : 'Clear night';
    icon = isDay ? '01d' : '01n';
  } else if (code >= 1 && code <= 3) {
    if (code === 1) {
      mainCondition = isDay ? 'Sunny' : 'Night';
      description = 'Mainly clear';
      icon = isDay ? '02d' : '02n';
    } else if (code === 2) {
      mainCondition = 'Cloudy';
      description = 'Partly cloudy';
      icon = isDay ? '02d' : '02n';
    } else {
      mainCondition = 'Cloudy';
      description = 'Overcast';
      icon = isDay ? '03d' : '03n';
    }
  } else if (code === 45 || code === 48) {
    mainCondition = 'Cloudy';
    description = 'Foggy mist';
    icon = isDay ? '50d' : '50n';
  } else if ((code >= 51 && code <= 57) || (code >= 80 && code <= 82)) {
    mainCondition = 'Rain';
    description = 'Light rain showers';
    icon = isDay ? '09d' : '09n';
  } else if (code >= 61 && code <= 67) {
    mainCondition = 'Rain';
    description = 'Continuous rain';
    icon = isDay ? '10d' : '10n';
  } else if (code >= 71 && code <= 77 || code === 85 || code === 86) {
    mainCondition = 'Snow';
    description = 'Snowfall';
    icon = isDay ? '13d' : '13n';
  } else if (code >= 95 && code <= 99) {
    mainCondition = 'Thunderstorm';
    description = 'Thunderstorms';
    icon = isDay ? '11d' : '11n';
  }

  return { mainCondition, description, icon };
}

// Fetch weather from Open-Meteo (Zero Key Live API)
async function getOpenMeteoData(city) {
  let lat, lon, cityName, country;

  // Check if city input is in coordinate format, e.g. "Lat: 25.59, Lon: 85.13" or "25.59, 85.13"
  const coordMatch = city.match(/(?:lat:?\s*)?([-\d.]+),\s*(?:lon:?\s*)?([-\d.]+)/i);
  if (coordMatch) {
    lat = parseFloat(coordMatch[1]);
    lon = parseFloat(coordMatch[2]);
    cityName = `Coordinates (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    country = 'GPS';
  } else {
    // 1. Geocode
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) throw new Error('NETWORK_ERROR');
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error('CITY_NOT_FOUND');
    }
    
    const loc = geoData.results[0];
    lat = loc.latitude;
    lon = loc.longitude;
    cityName = loc.name;
    country = loc.country_code;
  }

  // 2. Parallel Fetch: Forecast & AQI
  const [weatherRes, aqiRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,visibility&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`)
  ]);

  if (!weatherRes.ok || !aqiRes.ok) throw new Error('NETWORK_ERROR');
  
  const wData = await weatherRes.json();
  const aData = await aqiRes.json();

  const currentW = wData.current;
  const isDay = currentW.is_day === 1;
  const { mainCondition, description, icon } = parseWMOCode(currentW.weather_code, isDay);

  // Hourly mapping (24h trend, 3-hourly items for layout)
  const currentHour = new Date().getHours();
  const hourly = [];
  for (let i = 0; i < 8; i++) {
    const idx = (currentHour + i * 3) % 24;
    const hTime = wData.hourly.time[idx];
    const hTemp = wData.hourly.temperature_2m[idx];
    const hCode = wData.hourly.weather_code[idx];
    const hHourStr = new Date(hTime).getHours();
    const hIsDay = hHourStr >= 6 && hHourStr <= 19;
    const { mainCondition: hCond, icon: hIcon } = parseWMOCode(hCode, hIsDay);
    
    hourly.push({
      time: `${String(hHourStr).padStart(2, '0')}:00`,
      temp: Math.round(hTemp * 10) / 10,
      condition: hCond,
      icon: hIcon
    });
  }

  // 5-Day mapping
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const forecast = [];
  for (let i = 1; i <= 5; i++) {
    const dateStr = wData.daily.time[i];
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = days[dateObj.getDay()];
    const dCode = wData.daily.weather_code[i];
    const { mainCondition: dCond, icon: dIcon } = parseWMOCode(dCode, true);
    
    forecast.push({
      day: dayName,
      tempMin: Math.round(wData.daily.temperature_2m_min[i]),
      tempMax: Math.round(wData.daily.temperature_2m_max[i]),
      condition: dCond,
      icon: dIcon
    });
  }

  // Map AQI to 1-5 index
  // European AQI ranges from 1 (very good) to 5 (very poor)
  const aqiIndex = aData.current?.european_aqi || 1;

  // Rain Probability (Max of today)
  const rainProb = wData.hourly.precipitation_probability.slice(0, 24).reduce((max, val) => Math.max(max, val), 0);

  return {
    city: cityName,
    country: country,
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100,
    isMock: false,
    current: {
      temp: Math.round(currentW.temperature_2m * 10) / 10,
      feelsLike: Math.round(currentW.apparent_temperature * 10) / 10,
      description: description,
      mainCondition: mainCondition,
      humidity: currentW.relative_humidity_2m,
      windSpeed: Math.round(currentW.wind_speed_10m / 3.6 * 10) / 10, // convert km/h to m/s
      windDir: currentW.wind_direction_10m,
      pressure: Math.round(currentW.pressure_msl),
      visibility: currentW.visibility || 10000,
      uvIndex: wData.daily.uv_index_max[0] || 1,
      sunrise: Math.floor(Date.parse(wData.daily.sunrise[0]) / 1000),
      sunset: Math.floor(Date.parse(wData.daily.sunset[0]) / 1000),
      clouds: currentW.cloud_cover,
      aqi: Math.min(Math.max(aqiIndex, 1), 5),
      rainProbability: rainProb
    },
    hourly: hourly,
    forecast: forecast
  };
}

// Fetch from OpenWeatherMap (OWM)
async function getOpenWeatherData(city, apiKey) {
  // Current Weather
  const currentRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`
  );
  
  if (!currentRes.ok) {
    if (currentRes.status === 404) throw new Error('CITY_NOT_FOUND');
    if (currentRes.status === 401) throw new Error('INVALID_API_KEY');
    throw new Error('NETWORK_ERROR');
  }
  
  const currentData = await currentRes.json();
  const { lat, lon } = currentData.coord;

  // Forecast & Air Pollution
  const [forecastRes, aqiRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`),
    fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`)
  ]);

  if (!forecastRes.ok || !aqiRes.ok) throw new Error('NETWORK_ERROR');

  const forecastData = await forecastRes.json();
  const aqiData = await aqiRes.json();

  const weatherId = currentData.weather[0].id;
  let mainCondition = 'Cloudy';
  if (weatherId === 800) {
    const localTime = Date.now() / 1000 + currentData.timezone;
    const isNight = localTime < (currentData.sys.sunrise + currentData.timezone) || 
                    localTime > (currentData.sys.sunset + currentData.timezone);
    mainCondition = isNight ? 'Night' : 'Sunny';
  } else if (weatherId >= 200 && weatherId < 300) mainCondition = 'Thunderstorm';
  else if (weatherId >= 300 && weatherId < 600) mainCondition = 'Rain';
  else if (weatherId >= 600 && weatherId < 700) mainCondition = 'Snow';

  const hourly = forecastData.list.slice(0, 8).map(item => {
    const hour = new Date(item.dt * 1000).getHours();
    let hCond = 'Cloudy';
    const hId = item.weather[0].id;
    if (hId === 800) hCond = (hour < 6 || hour > 19) ? 'Night' : 'Sunny';
    else if (hId >= 200 && hId < 300) hCond = 'Thunderstorm';
    else if (hId >= 300 && hId < 600) hCond = 'Rain';
    else if (hId >= 600 && hId < 700) hCond = 'Snow';
    
    return {
      time: `${String(hour).padStart(2, '0')}:00`,
      temp: Math.round(item.main.temp * 10) / 10,
      condition: hCond,
      icon: item.weather[0].icon
    };
  });

  const dayGroups = {};
  forecastData.list.forEach(item => {
    const dayName = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' });
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    if (dayName === todayName) return;
    if (!dayGroups[dayName]) dayGroups[dayName] = [];
    dayGroups[dayName].push(item);
  });

  const forecast = Object.keys(dayGroups).slice(0, 5).map(dayName => {
    const list = dayGroups[dayName];
    let tempMin = Infinity;
    let tempMax = -Infinity;
    list.forEach(item => {
      if (item.main.temp_min < tempMin) tempMin = item.main.temp_min;
      if (item.main.temp_max > tempMax) tempMax = item.main.temp_max;
    });

    const cond = list[0].weather[0].main;
    let dCond = 'Cloudy';
    if (cond.includes('Clear')) dCond = 'Sunny';
    else if (cond.includes('Rain') || cond.includes('Drizzle')) dCond = 'Rain';
    else if (cond.includes('Snow')) dCond = 'Snow';
    else if (cond.includes('Thunder')) dCond = 'Thunderstorm';

    return {
      day: dayName,
      tempMin: Math.round(tempMin),
      tempMax: Math.round(tempMax),
      condition: dCond,
      icon: list[0].weather[0].icon
    };
  });

  return {
    city: currentData.name,
    country: currentData.sys.country,
    lat: lat,
    lon: lon,
    isMock: false,
    current: {
      temp: Math.round(currentData.main.temp * 10) / 10,
      feelsLike: Math.round(currentData.main.feels_like * 10) / 10,
      description: currentData.weather[0].description,
      mainCondition: mainCondition,
      humidity: currentData.main.humidity,
      windSpeed: currentData.wind.speed,
      windDir: currentData.wind.deg || 0,
      pressure: currentData.main.pressure,
      visibility: currentData.visibility,
      uvIndex: 5.0, // OWM key fallback UV
      sunrise: currentData.sys.sunrise,
      sunset: currentData.sys.sunset,
      clouds: currentData.clouds.all,
      aqi: aqiData.list[0]?.main?.aqi || 1,
      rainProbability: forecastData.list[0]?.pop ? Math.round(forecastData.list[0].pop * 100) : 0
    },
    hourly: hourly,
    forecast: forecast
  };
}

// Master Fetch Handler
export async function getWeatherData(city, apiKey = '') {
  // If API Key is present, try OpenWeatherMap (OWM)
  if (apiKey) {
    try {
      return await getOpenWeatherData(city, apiKey);
    } catch (e) {
      console.warn('OpenWeatherMap API call failed. Trying Open-Meteo fallback...', e);
    }
  }

  // Otherwise, default directly to Open-Meteo for real data without keys!
  try {
    return await getOpenMeteoData(city);
  } catch (error) {
    // If Open-Meteo fails or there is no internet, use mock generator
    console.error('[Open-Meteo Error] serving offline mock data instead:', error);
    return generateMockWeatherData(city);
  }
}
