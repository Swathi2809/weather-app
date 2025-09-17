   const OWM_KEY = 'da06676de249bc7662fab538a191ab41'; // Replace with your own OpenWeatherMap API key

const $ = (sel) => document.querySelector(sel);
const cityInput = $('#cityInput');
const searchBtn = $('#searchBtn');
const geoBtn = $('#geoBtn');
const spinner = $('#spinner');
const errorBox = $('#errorBox');
const emptyState = $('#emptyState');
const content = $('#content');
const cityName = $('#cityName');
const tempEl = $('#temp');
const desc = $('#description');
const localTime = $('#localTime');
const weatherIcon = $('#weatherIcon');
const feels = $('#feels');
const humidity = $('#humidity');
const wind = $('#wind');
const pressure = $('#pressure');
const sun = $('#sun');
const mapPreview = $('#mapPreview');
const historyList = $('#historyList');

function showSpinner() { spinner.style.display = 'block'; }
function hideSpinner() { spinner.style.display = 'none'; }
function showError(msg) { errorBox.style.display = 'block'; errorBox.textContent = msg; }
function hideError() { errorBox.style.display = 'none'; errorBox.textContent = ''; }
function getHistory() {
  try { return JSON.parse(localStorage.getItem('weather_history') || '[]'); }
  catch (e) { return []; }
}
function pushHistory(city) {
  let h = getHistory();
  h = [city, ...h.filter(x => x.toLowerCase() !== city.toLowerCase())].slice(0, 6);
  localStorage.setItem('weather_history', JSON.stringify(h));
  renderHistory();
}
function renderHistory() {
  const list = getHistory();
  historyList.innerHTML = '';
  if (!list.length) {
    historyList.innerHTML = '<div style="color:var(--muted)">No recent searches</div>';
    return;
  }
  list.forEach(c => {
    const btn = document.createElement('button');
    btn.textContent = c;
    btn.onclick = () => fetchWeatherByCity(c);
    historyList.appendChild(btn);
  });
}
renderHistory();

async function fetchWeatherByCity(city) {
  if (!city) return;
  hideError(); showSpinner();
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OWM_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) throw new Error('City not found. Check spelling.');
      throw new Error('Failed to fetch weather. HTTP ' + res.status);
    }
    const data = await res.json();
    renderWeather(data);
    pushHistory(data.name + (data.sys && data.sys.country ? ', ' + data.sys.country : ''));
  } catch (err) {
    showError(err.message);
  } finally {
    hideSpinner();
  }
}

async function fetchWeatherByCoords(lat, lon) {
  hideError(); showSpinner();
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch weather for your location.');
    const data = await res.json();
    renderWeather(data);
    pushHistory(data.name + (data.sys && data.sys.country ? ', ' + data.sys.country : ''));
  } catch (err) {
    showError(err.message);
  } finally {
    hideSpinner();
  }
}

function renderWeather(data) {
  emptyState.style.display = 'none';
  content.style.display = 'block';
  hideError();
  const w = data.weather && data.weather[0];
  weatherIcon.src = w ? `https://openweathermap.org/img/wn/${w.icon}@4x.png` : '';
  weatherIcon.alt = w ? w.description : '';
  cityName.textContent = `${data.name}${data.sys && data.sys.country ? ', ' + data.sys.country : ''}`;
  tempEl.textContent = `${Math.round(data.main.temp)}°C`;
  desc.textContent = w ? w.description : '';
  feels.textContent = `${Math.round(data.main.feels_like)}°C`;
  humidity.textContent = `${data.main.humidity}%`;
  wind.textContent = `${data.wind.speed} m/s`;
  pressure.textContent = `${data.main.pressure} hPa`;
  const tz = data.timezone || 0;
  const sunrise = new Date((data.sys.sunrise + tz) * 1000);
  const sunset = new Date((data.sys.sunset + tz) * 1000);
  sun.textContent = `${pad(sunrise.getUTCHours())}:${pad(sunrise.getUTCMinutes())} / ${pad(sunset.getUTCHours())}:${pad(sunset.getUTCMinutes())}`;
  const nowUTC = Date.now();
  const local = new Date(nowUTC + tz * 1000);
  localTime.textContent = `Local time: ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  if (data.coord) {
    const lat = data.coord.lat, lon = data.coord.lon;
    mapPreview.innerHTML = `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.2}%2C${lat-0.1}%2C${lon+0.2}%2C${lat+0.1}&layer=mapnik&marker=${lat}%2C${lon}" style="width:100%;height:100%;border:0;border-radius:8px"></iframe>`;
  }
  if (w) {
    const id = w.id;
    let bg = 'linear-gradient(180deg,#071025,#0f1724)';
    if (id >= 200 && id < 600) bg = 'linear-gradient(180deg,#0b3a56,#08212b)';
    else if (id >=600 && id <700) bg = 'linear-gradient(180deg,#0b2b3e,#001018)';
    else if (id >=700 && id <800) bg = 'linear-gradient(180deg,#3b3b3b,#0b0b0b)';
    else if (id === 800) bg = 'linear-gradient(180deg,#2b6cea,#60a5fa)';
    else if (id >800) bg = 'linear-gradient(180deg,#4b5563,#0b1220)';
    document.body.style.background = bg;
  }
}
function pad(n) { return String(n).padStart(2, '0'); }

searchBtn.addEventListener('click', () => {
  const val = cityInput.value.trim();
  if (!val) {
    showError('Please type a city name.');
    return;
  }
  fetchWeatherByCity(val);
});
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { searchBtn.click(); }
});
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation not supported by your browser.');
    return;
  }
  showSpinner();
  navigator.geolocation.getCurrentPosition(
    (pos) => { fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude); },
    (err) => { hideSpinner(); showError('Unable to get location: ' + err.message); },
    { timeout: 10000 }
  );
});

if (OWM_KEY === 'API_KEY') {
  showError('API key not set. Replace OWM_KEY in the script with your OpenWeatherMap API key.');
}
