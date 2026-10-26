/**
 * Rough geography, enough to make distance mean something.
 *
 * Coordinates are city-centre approximations (±a few km). That is far more
 * precision than a fake delivery needs, and it keeps the plugin dependency-free.
 */

const CITY_COORDS = {
  北京: [39.9, 116.41],
  上海: [31.23, 121.47],
  广州: [23.13, 113.26],
  深圳: [22.54, 114.06],
  杭州: [30.27, 120.16],
  南京: [32.06, 118.8],
  成都: [30.57, 104.07],
  重庆: [29.56, 106.55],
  武汉: [30.59, 114.31],
  西安: [34.34, 108.94],
  苏州: [31.3, 120.62],
  天津: [39.08, 117.2],
  长沙: [28.23, 112.94],
  郑州: [34.75, 113.63],
  青岛: [36.07, 120.38],
  沈阳: [41.81, 123.43],
  大连: [38.91, 121.61],
  厦门: [24.48, 118.09],
  福州: [26.07, 119.3],
  济南: [36.65, 117.12],
  合肥: [31.82, 117.23],
  昆明: [25.04, 102.72],
  哈尔滨: [45.8, 126.53],
  长春: [43.82, 125.32],
  石家庄: [38.04, 114.51],
  太原: [37.87, 112.55],
  南昌: [28.68, 115.86],
  南宁: [22.82, 108.32],
  贵阳: [26.65, 106.63],
  兰州: [36.06, 103.83],
  乌鲁木齐: [43.83, 87.62],
  海口: [20.04, 110.32],
  三亚: [18.25, 109.51],
  宁波: [29.87, 121.55],
  无锡: [31.49, 120.31],
  温州: [28.0, 120.7],
  佛山: [23.02, 113.12],
  东莞: [23.02, 113.75],
  珠海: [22.27, 113.58],
  常州: [31.81, 119.97],
};

export const CITIES = Object.keys(CITY_COORDS);

const PROVINCES = {
  北京: '北京',
  上海: '上海',
  天津: '天津',
  重庆: '重庆',
  广州: '广东',
  深圳: '广东',
  佛山: '广东',
  东莞: '广东',
  珠海: '广东',
  杭州: '浙江',
  宁波: '浙江',
  温州: '浙江',
  南京: '江苏',
  苏州: '江苏',
  无锡: '江苏',
  常州: '江苏',
  成都: '四川',
  武汉: '湖北',
  西安: '陕西',
  长沙: '湖南',
  郑州: '河南',
  青岛: '山东',
  济南: '山东',
  沈阳: '辽宁',
  大连: '辽宁',
  厦门: '福建',
  福州: '福建',
  合肥: '安徽',
  昆明: '云南',
  哈尔滨: '黑龙江',
  长春: '吉林',
  石家庄: '河北',
  太原: '山西',
  南昌: '江西',
  南宁: '广西',
  贵阳: '贵州',
  兰州: '甘肃',
  乌鲁木齐: '新疆',
  海口: '海南',
  三亚: '海南',
};

/** "浙江 杭州"; municipalities stay as one word. */
export function locationOf(name) {
  const city = normalise(name);
  if (!city) return '';
  const province = PROVINCES[city];
  if (!province || province === city) return city;
  return `${province} ${city}`;
}

/** A distance a person would actually say out loud. */
export function roughDistance(km) {
  if (km === null || km === undefined) return '';
  if (km < 80) return '同城';
  if (km < 200) return `约 ${Math.round(km / 10) * 10} 公里`;
  if (km < 1000) return `约 ${Math.round(km / 50) * 50} 公里`;
  return `约 ${Math.round(km / 100) * 100} 公里`;
}

/** Strip a trailing 市/省 so "杭州市" still resolves. */
function normalise(name) {
  return String(name || '')
    .trim()
    .replace(/[市省]$/u, '');
}

export function coordsOf(name) {
  return CITY_COORDS[normalise(name)] || null;
}

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km, or null when either city is unknown. */
export function distanceBetween(a, b) {
  const from = coordsOf(a);
  const to = coordsOf(b);
  if (!from || !to) return null;
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))));
}

/**
 * How long a parcel takes over that distance. Same-city couriers are the only
 * ones allowed to promise minutes; everything else goes by post.
 */
export function parcelHours(distanceKm) {
  const km = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 900;
  return 18 + km / 80;
}

export const SAME_CITY_KM = 80;

/** Human wording for a distance, used in prompts and the transit strip. */
export function describeDistance(km) {
  if (km === null) return '';
  if (km < SAME_CITY_KM) return '同一座城';
  if (km < 300) return `相隔约 ${km} 公里`;
  if (km < 1200) return `相隔 ${Math.round(km / 100) * 100} 公里`;
  return `相隔 ${(km / 1000).toFixed(1)} 千公里`;
}
