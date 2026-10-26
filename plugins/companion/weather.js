/**
 * Weather and season for a city.
 *
 * Real forecast when the network allows it (Open-Meteo needs no key), a
 * latitude-and-month estimate when it does not. Reads never block: a cold cache
 * returns nothing and warms itself in the background.
 */

import { coordsOf } from './geo.js';

const CACHE_MS = 45 * 60_000;
const cache = new Map();

/** WMO weather codes → how a person would describe it. */
const CODES = [
  [[0], '晴'],
  [[1, 2], '多云'],
  [[3], '阴'],
  [[45, 48], '起雾'],
  [[51, 53, 54, 55, 56, 57], '毛毛雨'],
  [[61, 63, 65, 66, 67], '雨'],
  [[71, 73, 75, 77], '雪'],
  [[80, 81, 82], '阵雨'],
  [[85, 86], '阵雪'],
  [[95, 96, 99], '雷阵雨'],
];

const describeCode = (code) => {
  for (const [codes, text] of CODES) if (codes.includes(code)) return text;
  return '阴';
};

export function seasonOf(date = new Date()) {
  const month = date.getMonth();
  if (month === 11 || month <= 1) return '冬';
  if (month <= 4) return '春';
  if (month <= 7) return '夏';
  return '秋';
}

function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Plausible weather from latitude and month, stable for a given city-day. */
function estimate(city, date) {
  const coords = coordsOf(city);
  if (!coords) return null;
  const [lat] = coords;
  const seed = hash(`${city}|${date.toISOString().slice(0, 10)}`);
  const mean = 22 - (lat - 22) * 0.55;
  const swing = 5 + Math.max(0, lat - 22) * 0.5;
  const temp =
    mean + swing * Math.cos(((date.getMonth() - 6) / 12) * Math.PI * 2) + ((seed % 70) / 10 - 3.5);
  const options = temp < 2 ? ['晴', '多云', '阴', '小雪'] : ['晴', '多云', '阴', '小雨', '阵雨'];
  return {
    city,
    temp: Math.round(temp),
    text: options[seed % options.length],
    season: seasonOf(date),
    estimated: true,
    at: Date.now(),
  };
}

async function fetchReal(city) {
  const coords = coordsOf(city);
  if (!coords) return null;
  const [latitude, longitude] = coords;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,weather_code&timezone=auto';
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) return null;
  const data = await response.json();
  const current = data && data.current;
  if (!current || typeof current.temperature_2m !== 'number') return null;
  return {
    city,
    temp: Math.round(current.temperature_2m),
    text: describeCode(current.weather_code),
    season: seasonOf(new Date()),
    estimated: false,
    at: Date.now(),
  };
}

async function refresh(city) {
  if (!city || cache.has(`${city}|pending`)) return;
  cache.set(`${city}|pending`, true);
  try {
    const real = await fetchReal(city);
    cache.set(city, real || estimate(city, new Date()));
  } catch {
    cache.set(city, estimate(city, new Date()));
  } finally {
    cache.delete(`${city}|pending`);
  }
}

/** Current cached weather, warming the cache when absent or stale. */
export function weatherFor(city) {
  if (!city) return null;
  const entry = cache.get(city);
  if (!entry || typeof entry !== 'object') {
    void refresh(city);
    return null;
  }
  if (Date.now() - entry.at > CACHE_MS) {
    void refresh(city);
  }
  return entry;
}

/** One line a person would say, or '' when nothing is known yet. */
export function weatherText(entry) {
  return entry ? `${entry.temp}°C，${entry.text}` : '';
}
