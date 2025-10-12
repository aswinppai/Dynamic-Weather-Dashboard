const API_KEY = "fab2f7edcbf8e8590ab61d6d0a8f81ce";
let useCelsius = true;
let currentLat = 9.931308, currentLon = 76.2674136;
let lastCurrentData = null;
let lastForecastData = null;

/* ===== HELPERS ===== */

// Auto-refresh weather every 10 minutes (600,000 ms)
setInterval(() => {
  updateWeather(currentLat, currentLon);
}, 10 * 60 * 1000); // 10 minutes


function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDay(ts) {
  return new Date(ts * 1000).toLocaleDateString([], { weekday: "short" });
}
function calculateDewPoint(temp, humidity) {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  return dewPoint.toFixed(1);
}
function getWindDirection(deg) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}
function formatLocalTime(offset) {
  const nowUTC = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
  const local = new Date(nowUTC + offset * 1000);
  return local.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ===== UNIT TOGGLE ===== */
document.getElementById("unitToggle").addEventListener("click", () => {
  useCelsius = !useCelsius;
  if (lastCurrentData && lastForecastData) {
    renderCurrent(lastCurrentData);
    renderHourly(lastForecastData);
    renderWeekly(lastForecastData);
  }
});
function calculateWindChill(tempC, windKmh) {
  return (
    13.12 +
    0.6215 * tempC -
    11.37 * Math.pow(windKmh, 0.16) +
    0.3965 * tempC * Math.pow(windKmh, 0.16)
  );
}

function calculateHeatIndex(tempC, humidity) {
  const T = tempC;
  const H = humidity;
  return (
    -8.7847 +
    1.6114 * T +
    2.3385 * H -
    0.1461 * T * H -
    0.0123 * T * T -
    0.0164 * H * H +
    0.0022 * T * T * H +
    0.0007 * T * H * H -
    0.0003 * T * T * H * H
  );
}

function calculateFeelsLike(tempC, humidity, windMs) {
  const windKmh = windMs * 3.6;

  if (tempC <= 10 && windKmh > 4.8) {
    return calculateWindChill(tempC, windKmh);
  } else if (tempC >= 27 && humidity >= 40) {
    return calculateHeatIndex(tempC, humidity);
  } else {
    return tempC;
  }
}

/* ===== API CALLS ===== */
async function fetchCurrent(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed: " + res.status);
  return res.json();
}
async function fetchForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Forecast fetch failed: " + res.status);
  return res.json();
}

/* ===== RENDER ===== */
function renderCurrent(data) {
  document.getElementById("locationName").textContent = data.name;
  const temp = useCelsius ? data.main.temp : (data.main.temp * 9/5) + 32;
  document.getElementById("curTemp").textContent = Math.round(temp) + (useCelsius ? "°C" : "°F");

  const iconCode = data.weather[0].icon;
  if (iconCode.includes("d")) {
    document.body.style.background = "linear-gradient(145deg, #1A4D8C 0%, #3B82F6 50%, #60A5FA 100%)";
  } else {
    document.body.style.background = "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #334155 100%)";
  }

  document.getElementById("curDesc").textContent = data.weather[0].description;
  document.getElementById("curHum").textContent = data.main.humidity + "%";
  document.getElementById("curWind").textContent = data.wind.speed + " m/s";
  document.getElementById("curIcon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  document.getElementById("localTime").textContent = formatLocalTime(data.timezone);
  document.getElementById("visibility").textContent = (data.visibility / 1000).toFixed(1) + " km";
  document.getElementById("dewPoint").textContent = calculateDewPoint(data.main.temp, data.main.humidity) + "°C";
  document.getElementById("windDir").textContent = getWindDirection(data.wind.deg);
  const feels = useCelsius ? data.main.feels_like : (data.main.feels_like * 9/5) + 32;
  document.getElementById("feelsLike").textContent = Math.round(feels) + (useCelsius ? "°C" : "°F");


  document.getElementById("pressure").textContent = data.main.pressure + " hPa";
  document.getElementById("sunrise").textContent = formatTime(data.sys.sunrise);
  document.getElementById("sunset").textContent = formatTime(data.sys.sunset);
  document.getElementById("unitToggle").textContent = useCelsius ? "°F" : "°C";
}

function renderHourly(forecast) {
  const hourly = forecast.list.slice(0, 24);
  const container = document.getElementById("hourly");
  container.innerHTML = "";
  hourly.forEach(h => {
    const temp = useCelsius ? h.main.temp : (h.main.temp * 9/5) + 32;
    const div = document.createElement("div");
    div.className = "hourly-item";
    div.innerHTML = `
      <div>${formatTime(h.dt)}</div>
      <img src="https://openweathermap.org/img/wn/${h.weather[0].icon}.png" width="40"/>
      <div>${Math.round(temp)}${useCelsius ? "°C" : "°F"}</div>
    `;
    container.appendChild(div);
  });
}

function renderWeekly(forecast) {
  const dailyMap = {};
  forecast.list.forEach(item => {
    const day = formatDay(item.dt);
    if (!dailyMap[day]) dailyMap[day] = [];
    dailyMap[day].push(item.main.temp);
  });

  const container = document.getElementById("weekly");
  container.innerHTML = "";
  Object.entries(dailyMap).slice(0, 5).forEach(([day, temps]) => {
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const minTemp = useCelsius ? min : (min * 9/5) + 32;
    const maxTemp = useCelsius ? max : (max * 9/5) + 32;

    const card = document.createElement("div");
    card.className = "weekly-item";
    card.innerHTML = `<strong>${day}</strong><br/>High ${Math.round(maxTemp)}${useCelsius ? "°C" : "°F"} / Low ${Math.round(minTemp)}${useCelsius ? "°C" : "°F"}`;
    container.appendChild(card);
  });
}

/* ===== MAIN ===== */
async function updateWeather(lat, lon, customName = null) {
  try {
    currentLat = lat;
    currentLon = lon;

    const current = await fetchCurrent(lat, lon);
    const forecast = await fetchForecast(lat, lon);
    lastCurrentData = current;
    lastForecastData = forecast;

    // Override name if customName provided
    if (customName) {
      current.name = customName;
    }

    renderCurrent(current);
    renderHourly(forecast);
    renderWeekly(forecast);
  } catch (err) {
    alert(err.message);
  }
}


/* ===== EVENTS ===== */
document.getElementById("searchForm").addEventListener("submit", async e => {
  e.preventDefault();
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
  const res = await fetch(geoUrl);
  const data = await res.json();
  if (data[0]) updateWeather(data[0].lat, data[0].lon);
  else alert("City not found");
});

document.getElementById("locateBtn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      updateWeather(pos.coords.latitude, pos.coords.longitude);
    });
  }
});
document.getElementById("prevHour").addEventListener("click", () => {
  document.getElementById("hourly").scrollBy({ left: -200, behavior: "smooth" });
});
document.getElementById("nextHour").addEventListener("click", () => {
  document.getElementById("hourly").scrollBy({ left: 200, behavior: "smooth" });
});

/* INIT */
/* ===== INIT with Geolocation or fallback to Kochi (empty input) ===== */
window.addEventListener("load", async () => {
  // Step 1: Load Kochi by default (immediate render)
  updateWeather(9.9312, 76.2673, "Kochi");

  // Step 2: Try to get user's real location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        updateWeather(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        console.warn("Geolocation failed or blocked. Staying with Kochi.");
      },
      { timeout: 5000 }
    );
  } else {
    console.warn("Geolocation not supported. Staying with Kochi.");
  }
});




