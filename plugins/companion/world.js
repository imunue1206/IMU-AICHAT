/**
 * The world: a locked character's day, her money, her energy, the things that
 * happen to her, and the in-world reason she is or is not answering right now.
 *
 * Nothing here touches the network or the harness. It is a pure simulation over
 * wall-clock time, so it can be advanced by days in one go and tested alone.
 */

import { DEFAULT_PROFILE } from './character.js';
import { describeDistance } from './geo.js';

const MINUTE = 60_000;
const DAY = 86_400_000;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * One character's whole world: her profile is frozen, everything else in here
 * is hers alone. Switching characters switches this whole bundle.
 */
export function createCharacter(profile, now = Date.now()) {
  return {
    id: '',
    profile,
    status: 'locked',
    version: 1,
    createdAt: now,
    lockedAt: now,
    trialEndsAt: now + TRIAL_MS,
    seq: 0,
    clock: { lastTick: now },
    life: { cash: profile && profile.cash ? profile.cash : 0, energy: 72, mood: 6 },
    events: [],
    ledger: [],
    messages: [],
    meta: {
      lastHerMessageAt: 0,
      lastInitAt: 0,
      pending: null,
      error: null,
      saidGoodnightAt: 0,
      lastSeenAt: 0,
      skipStreak: 0,
    },
  };
}

export const profileOf = (state) => (state && state.profile) || null;

export const TRIAL_LENGTH_MS = TRIAL_MS;

/* ------------------------------------------------------------------ *
 * Schedule
 * ------------------------------------------------------------------ */

export function slotAt(profile, ms) {
  const d = new Date(ms);
  const table = d.getDay() === 0 || d.getDay() === 6 ? profile.weekend : profile.weekday;
  const minute = d.getHours() * 60 + d.getMinutes();
  for (const entry of table) if (minute >= entry.from && minute < entry.to) return entry;
  return table[0];
}

const hhmm = (ms) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const sameDay = (a, b) => {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

const nextAt = (now, minuteOfDay) => {
  const target = new Date(now);
  if (!Number.isFinite(minuteOfDay)) return now + 8 * 3600_000;
  target.setHours(0, minuteOfDay % 1440, 0, 0);
  if (target.getTime() <= now) target.setDate(target.getDate() + 1);
  return target.getTime();
};

/* ------------------------------------------------------------------ *
 * Advancing time
 * ------------------------------------------------------------------ */

function pushEvent(state, ts, text) {
  const previous = state.events[state.events.length - 1];
  if (previous && previous.text === text) return;
  state.events.push({ ts, text });
  if (state.events.length > 200) state.events.splice(0, state.events.length - 200);
}

function pushLedger(state, ts, amount, note) {
  state.ledger.push({ ts, amount, note });
  if (state.ledger.length > 120) state.ledger.splice(0, state.ledger.length - 120);
}

function onSlotStart(state, ts, entry, previous) {
  const profile = profileOf(state);
  if (previous && previous.earn) {
    state.life.cash += previous.earn;
    pushLedger(state, ts, previous.earn, previous.doing);
    pushEvent(state, ts, `拿到了 ${previous.earn} 块`);
  }
  if (entry.cost) {
    if (state.life.cash < entry.cost) {
      pushEvent(state, ts, '钱包有点紧，忍住了没买');
    } else {
      state.life.cash -= entry.cost;
      pushLedger(state, ts, -entry.cost, entry.doing);
    }
  }
  if (entry.note) pushEvent(state, ts, entry.note);
  else if (profile && profile.interludes.length && entry.kind !== 'sleep' && Math.random() < 0.5) {
    pushEvent(state, ts, pick(profile.interludes));
  }
}

/**
 * Advance the world to `now`, emitting the events in between. Capped at 14
 * days so a long-dormant install cannot stall the Host.
 */
export function advance(state, now) {
  if (!state.clock) state.clock = { lastTick: now };
  const profile = profileOf(state);
  const from = state.clock.lastTick || now;
  if (!profile) {
    state.clock.lastTick = now;
    return false;
  }
  if (now <= from) {
    state.clock.lastTick = now;
    return false;
  }
  const floor = Math.max(from, now - 14 * DAY);
  let t = Math.ceil(floor / MINUTE) * MINUTE;
  let previous = slotAt(profile, t - 1);

  for (; t <= now; t += MINUTE) {
    const entry = slotAt(profile, t);
    if (entry !== previous) {
      onSlotStart(state, t, entry, previous);
      previous = entry;
    } else if (entry.kind !== 'sleep' && Math.random() < 0.003) {
      pushEvent(state, t, pick(profile.interludes));
    }
    if (entry.kind === 'sleep') state.life.energy += 0.11;
    else if (entry.kind === 'rest') state.life.energy += 0.04;
    else state.life.energy -= 0.06;
    state.life.energy = Math.max(3, Math.min(100, state.life.energy));
    state.life.mood = Math.max(-40, Math.min(40, state.life.mood + rand(-0.012, 0.012)));
  }
  state.clock.lastTick = now;
  return true;
}

/* ------------------------------------------------------------------ *
 * Reading the world
 * ------------------------------------------------------------------ */

function energyLabel(e) {
  if (e > 78) return '精神不错';
  if (e > 50) return '还行';
  if (e > 28) return '有点累';
  return '困得不行';
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function describe(state, now = Date.now()) {
  const profile = profileOf(state);
  const d = new Date(now);
  if (!profile) {
    return {
      now,
      dateLabel: `${WEEKDAYS[d.getDay()]} ${d.getMonth() + 1}月${d.getDate()}日`,
      timeLabel: hhmm(now),
      activity: '还没开始',
      place: '',
      status: '她还没有被写出来',
      energy: 0,
      energyLabel: '',
      cash: 0,
      busy: false,
      asleep: false,
      locked: false,
      identity: '',
      home: '',
      temper: '',
      looks: '',
      today: [],
    };
  }
  const entry = slotAt(profile, now);
  return {
    now,
    dateLabel: `${WEEKDAYS[d.getDay()]} ${d.getMonth() + 1}月${d.getDate()}日`,
    timeLabel: hhmm(now),
    activity: entry.doing,
    place: entry.where,
    status: `${entry.doing} · ${entry.where}`,
    energy: Math.round(state.life.energy),
    energyLabel: energyLabel(state.life.energy),
    cash: Math.round(state.life.cash * 100) / 100,
    busy: entry.kind === 'busy',
    asleep: entry.kind === 'sleep',
    locked: true,
    identity: profile.identity,
    home: profile.home,
    temper: profile.temper,
    looks: profile.looks,
    today: state.events.filter((event) => sameDay(event.ts, now)).slice(-8),
  };
}

/* ------------------------------------------------------------------ *
 * Why she answers when she answers
 * ------------------------------------------------------------------ */

const NIGHT_EXCUSE = {
  stirred: '你半夜起来上厕所，顺手看了一眼手机。',
  'still-up': '你本来打算睡了，其实还醒着，躺在床上刷手机。',
  goodnight: '你之前跟他说过晚安，其实根本没睡着。',
  asleep: '你睡着了，这是第二天早上醒来才看到的。',
  napping: '你在午睡，被消息震醒了。',
  busy: '你在忙，手机藏在下面偷偷看了一眼。',
  resting: '你躺着发呆，不想动。',
  free: '你正好有空。',
};

const weighted = (entries) => {
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  let roll = Math.random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
};

/**
 * When the user's message lands, decide how long she takes and what she is
 * plausibly doing in the meantime. Night excuses are the point: they let a
 * sleeping character stay reachable without breaking who she is.
 */
export const isQuestionLike = (text) =>
  /[?？]|吗|呢|怎么|为什么|什么|哪|谁|多少|几点|在不在|在吗/.test(text);

/** The model may decline to answer by returning exactly this. */
export const SILENCE = '{{silence}}';

/** Objects crossing between the two worlds. */
export const ITEM_MARK = /\{\{\s*item\s*\|\s*([^|}]{1,16})\s*\|\s*([^|{]{1,4})\s*\|\s*(\d{1,5})\s*\}\}/u;

export function planReply(state, now = Date.now(), text = '') {
  const profile = profileOf(state);
  if (!profile) return { reply: true, delay: 3_000, excuse: 'free' };
  const entry = slotAt(profile, now);
  const hour = new Date(now).getHours();
  const night = hour >= 22 || hour < 5;
  const saidGoodnight =
    state.meta.saidGoodnightAt && now - state.meta.saidGoodnightAt < 10 * 3600_000;

  if (entry.kind === 'sleep') {
    // Already talking to you tonight: she stays up for a while.
    if (now - (state.meta.lastHerMessageAt || 0) < 25 * MINUTE) {
      return { reply: true, delay: rand(5_000, 25_000), excuse: 'still-up' };
    }
    const options = [
      ['stirred', night ? 4 : 1],
      ['still-up', night ? 5 : 1],
      ['asleep', night ? 2 : 8],
    ];
    if (saidGoodnight) options.push(['goodnight', 4]);
    const excuse = weighted(options);
    if (excuse === 'asleep') {
      const delay = nextAt(now, entry.to) - now + rand(60_000, 300_000);
      return {
        reply: true,
        delay: Number.isFinite(delay) && delay > 0 ? delay : 8 * 3600_000,
        excuse,
      };
    }
    return { reply: true, delay: rand(40_000, 150_000), excuse };
  }
  if (entry.kind === 'rest') {
    return { reply: true, delay: rand(4 * MINUTE, 18 * MINUTE), excuse: 'napping' };
  }
  if (entry.kind === 'busy') {
    return { reply: true, delay: rand(35_000, 150_000), excuse: 'busy' };
  }
  return { reply: true, delay: rand(5_000, 30_000), excuse: 'free' };
}

export function excuseText(excuse) {
  return NIGHT_EXCUSE[excuse] || '';
}

/* ------------------------------------------------------------------ *
 * Prompting
 * ------------------------------------------------------------------ */

const DAYS = (a, b) => Math.max(1, Math.floor((b - a) / DAY) + 1);

const DEFAULT_STYLE = [
  '- 一条消息通常几个字到十几个字，绝大多数情况只有一句话，最多三句。',
  '- 不用句号结尾。不用「其实、毕竟、反正、说实话」开头。',
  '- 不解释自己的情绪，只说发生了什么。',
  '- 他问了什么就答什么，哪怕只答半句。答完可以顺带说自己的事。',
  '- 只有在忙、累、不想聊的时候才不答。那种时候直接说改天，不要另起一个话题装没看见。',
  '- 他说的如果跟你对不上（比如把你当成在咖啡店上班），直接说不是，别顺着编。',
  '- 不主动问「你呢」。一句话里最多一个问号，而且大部分时候不问。',
  '- 可以用 emoji，一条最多一个。偶尔单独发一个表情包：{{sticker|配文|🙃}}，配文两个字以内。',
].join('\n');

const DEFAULT_SAMPLE = [
  '他：今天加班到十点',
  '你：惨',
  '你：刚洗完澡 头发还没吹',
  '他：你那边下雨了吗',
  '你：下挺大',
].join('\n');

function inventoryLine(state) {
  const items = Array.isArray(state.items) ? state.items.slice(-6) : [];
  if (!items.length) return '你手边没什么特别的东西。';
  return `你手边有：${items.map((item) => `${item.emoji || ''}${item.name}`).join('、')}。`;
}

function distanceLine(profile, km, hisCity) {
  if (km === null || km === undefined) return '';
  if (km < 80) return '【你们之间】你们在同一座城市，但还没见过面。';
  return `【你们之间】你在${profile.city}，他在${hisCity || '另一个城市'}，${describeDistance(km)}。`;
}

function weatherLine(profile, weather) {
  if (!weather || !weather.her) return '';
  const parts = [`你在${profile.city}，${weather.her.temp}°C，${weather.her.text}`];
  if (weather.his) parts.push(`他在${weather.his.city}，${weather.his.temp}°C，${weather.his.text}`);
  return `【天气】${parts.join('；')}。现在是${weather.her.season}天。`;
}

const ROLE_LINE = {
  mirror: '你们处境相近，说话不用铺垫。抱怨可以说，软的地方先不说。',
  deep: '你话不多，也不急着填满沉默。自己的事要等熟了才说，现在还不是时候。',
  hobby: '你们有个共同爱好，聊起来很松。聊爱好时你话多，聊别的你话少。',
  weak: '你们是因为一件具体的事认识的，还不熟。多谈事，少谈人。',
  up: '你的日子过得比他有意思，你聊自己多过问他。你不觉得这有什么。',
  friction: '你不顺着他说。觉得不对就直说，不留情面，但也不敷衍。',
};

const RELATION_LINE = {
  mirror: '【你们的关系】你们处境差不多，会一起吐槽。你不给他讲道理，也不劝他振作。',
  up: '【你们的关系】你过着他想要的那种生活。你不炫耀，只是自然地过，偶尔让他看一眼。',
  down: '【你们的关系】你比他简单一些。他的世界你不太懂，但你会认真听，不评判，也不装懂。',
  apart: '【你们的关系】你的世界和他完全无关。你不问他的工作，不给建议，你们聊的是你的日子。',
};

const relationLine = (state) => RELATION_LINE[state.relation && state.relation.mode] || '';
const relationUser = (state) =>
  state.relation && state.relation.userState
    ? `他现在的处境：${state.relation.userState}。别假装懂，别讲大道理。`
    : '';

function transcript(state, limit, dropLastUser) {
  let list = state.messages.slice(-limit);
  if (dropLastUser && list.length && list[list.length - 1].role === 'user') list = list.slice(0, -1);
  return list
    .map(
      (m) =>
        `${m.role === 'user' ? '他' : '你'}：${
          m.kind === 'sticker'
            ? `[表情包：${m.sticker.text || ''} ${m.sticker.emoji}]`
            : m.kind === 'item'
              ? m.role === 'user'
                ? `[他送了你：${m.item.name} ${m.item.emoji || ''}]`
                : `[你送了他：${m.item.name} ${m.item.emoji || ''}]`
              : m.text
        }`,
    )
    .join('\n');
}

export function buildSystem(state, now = Date.now(), options = {}) {
  const profile = profileOf(state);
  if (!profile) return '';
  const {
    kind = 'reply',
    excuse = 'free',
    waitedMs = 0,
    rules = '',
    voice = null,
    overrides = {},
    portrait = '',
    mustReply = false,
    distanceKm = null,
    hisCity = '',
    weather = null,
  } = options;
  const d = describe(state, now);
  const today = d.today.map((event) => `  ${hhmm(event.ts)} ${event.text}`).join('\n') || '  （今天还没什么特别的事）';
  const known = state.messages.length
    ? `你们已经认识 ${DAYS(state.lockedAt || state.createdAt, now)} 天。`
    : '你们刚认识，还没怎么说过话。';
  const moment = excuseText(excuse);
  const late = waitedMs > 5 * MINUTE ? `他这条消息发出后过了 ${Math.round(waitedMs / MINUTE)} 分钟你才看到。` : '';

  const tired = d.energy < 35 ? '你现在很累，能少打一个字就少打一个。' : '';

  return [
    `你是${profile.name}，${profile.age}岁，${profile.city}人。${profile.identity}，住在${profile.home}。${profile.job}。`,
    profile.temper,
    profile.looks,
    `平时${profile.hobbies}。身边有${profile.people}。`,
    profile.worry ? `你最近心里搁着一件事：${profile.worry}` : '',
    '',
    distanceLine(profile, distanceKm, hisCity),
    weatherLine(profile, weather),
    state.profile.encounter
      ? `【你们怎么认识的】${state.profile.encounter.when}，${state.profile.encounter.where}。${state.profile.encounter.moment}`
      : '',
    '【此刻】',
    `${d.dateLabel} ${d.timeLabel}，你在${d.place}，正在${d.activity}。精力${d.energyLabel}。小金库 ${d.cash} 元。`,
    moment,
    late,
    tired,
    '【今天】',
    today,
    '',
    `【你和对方】${known}你们在网上认识，聊得来，但还没到非聊不可的地步。你有你的日子。`,
    overrides.relation ? overrides.relation : relationLine(state),
    overrides.relation ? '' : relationUser(state),
    portrait ? '【关于他】' : '',
    portrait,
    '',
    state.castRole && ROLE_LINE[state.castRole] ? `【你跟他的距离】${ROLE_LINE[state.castRole]}` : '',
    '【你发消息的样子】',
    overrides.style || DEFAULT_STYLE,
    '',
    '【这次要不要回】',
    '- 大多数时候你要回。',
    '- 可以不回的只有两种情况：他说的是收尾的话（晚安、去忙、好、嗯、谢谢）；或者你确实没力气、在忙，而他又没问什么。',
    `- 不回的时候，整条回复只输出 ${SILENCE}，一个字都不要多写。`,
    mustReply ? '- 这一条你必须回，不能沉默。' : '- 想回就回，不想回就不回。',
    '',
    '【你手边的东西】',
    inventoryLine(state),
    '- 偶尔可以给他一样东西，一杯奶茶、一本书、一包纸巾都行。格式：{{item|名字|🧋|花费}}。',
    `- 花费从你的小金库扣，你现在有 ${d.cash} 元。买不起就不要送，别硬撑。`,
    '- 不要每次都送。送的时候可以说一句为什么，也可以什么都不说。',
    kind === 'initiate'
      ? state.messages.length === 0
        ? '- 你们只见过那一面，这是你第一次给他发消息。不要自我介绍，不要提那次见面，说一件你此刻的事，一句话。'
        : '- 这次是你主动找他。说一件具体的小事，不要「在吗」，不要问他在干嘛。'
      : '- 他刚发了消息。',
    '',
    '【你平时发消息的样子，只学语气，不要抄内容】',
    overrides.sample || DEFAULT_SAMPLE,
    '',
    voice && voice.rules && voice.rules.length
      ? ['【你的底色】', voice.intro, ...voice.rules].filter(Boolean).join('\n')
      : '',
    rules ? '【她自己的规矩】（这部分优先于上面所有规则）\n' + rules : '',
    '【最近的聊天记录】',
    transcript(state, 16, kind === 'reply') || '（还没有记录）',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** Strip the tells that make a model read like a model. */
export function sanitize(text) {
  let out = String(text || '').trim();
  out = out.replace(/^[\u4e00-\u9fa5]{1,4}\s*[：:]\s*/u, '');
  out = out.replace(/^["“「]([\s\S]*)["”」]$/u, '$1');
  out = out.replace(/^\*+([\s\S]*?)\*+$/gu, '$1');
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out.slice(0, 400);
}

export { hhmm, sameDay, WEEKDAYS, DEFAULT_PROFILE };
