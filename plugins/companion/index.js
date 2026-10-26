/**
 * Host half of @local/companion.
 *
 * Owns one JSON file holding a roster of characters. Each character carries her
 * own frozen profile, her own world, her own ledger and her own messages, and
 * her clock keeps running whether or not she is the one on screen.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createCharacter,
  advance,
  describe,
  buildSystem,
  planReply,
  sanitize,
  profileOf,
  isQuestionLike,
  SILENCE,
  ITEM_MARK,
} from './world.js';
import {
  candidatesPrompt,
  expandPrompt,
  normalizeProfile,
  fallbackProfile,
  fallbackCandidates,
  extractJson,
  personaFromRaw,
  scheduleProblem,
  repairProfile,
  inferLifestyle,
  VOICES,
  voiceOf,
  BUILTINS,
  randomBrief,
  meetPrompt,
  pickRole,
  PORTRAIT_QUESTIONS,
  PORTRAIT_QUICK,
  PORTRAIT_TIERS,
  portraitPrompt,
  nextQuestionPrompt,
  LIFESTYLES,
  USER_STATES,
  RELATION_MODES,
  labelOf,
} from './character.js';

export const inject = ['llm', 'agentDefaultModel', 'webServer'];

const API = '/companion/api';
const AVATAR = '/companion/avatar';
const TICK_MS = 5000;
const MAX_BODY = 6 * 1024 * 1024;
const DAY = 86_400_000;

export function apply(ctx) {
  const dir = process.env.DSH_HOME
    ? path.join(process.env.DSH_HOME, 'companion')
    : path.join(os.homedir(), '.dsh', 'companion');
  const file = path.join(dir, 'state.json');
  const rulesFile = path.join(dir, 'voice.md');

  const root = load(dir, file);
  const replying = new Set();
  let authoring = false;
  let lastSave = 0;
  let sawClient = false;

  ensureRules();

  /** One copy a day, oldest pruned: the conversation archive is irreplaceable. */
  function backupState() {
    try {
      if (!fs.existsSync(file)) return;
      const stamp = new Date().toISOString().slice(0, 10);
      const folder = path.join(dir, 'backups');
      fs.mkdirSync(folder, { recursive: true });
      const target = path.join(folder, `state-${stamp}.json`);
      if (fs.existsSync(target)) return;
      fs.copyFileSync(file, target);
      const pattern = /^state-\d{4}-\d{2}-\d{2}\.json$/;
      const kept = fs
        .readdirSync(folder)
        .filter((name) => pattern.test(name))
        .sort();
      for (const name of kept.slice(0, Math.max(0, kept.length - 7))) {
        fs.unlinkSync(path.join(folder, name));
      }
      console.log('[companion] daily backup written:', path.basename(target));
    } catch (error) {
      console.error('[companion] backup failed:', error);
    }
  }

  backupState();
  let rulesCache = { mtime: -1, value: { append: '', sections: {} } };

  /**
   * voice.md supports two forms: bare lines are appended, while
   * `[section: style|sample|relation]` replaces that whole built-in block.
   */
  function parseRules(raw) {
    const sections = {};
    const append = [];
    let current = null;
    for (const line of String(raw).split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue;
      const marker = trimmed.match(/^\[section:\s*(style|sample|relation)\s*\]$/i);
      if (marker) {
        current = marker[1].toLowerCase();
        if (!sections[current]) sections[current] = [];
        continue;
      }
      if (current) sections[current].push(line);
      else append.push(line);
    }
    const clean = {};
    for (const [key, lines] of Object.entries(sections)) {
      const text = lines.join('\n').trim().slice(0, 3000);
      if (text) clean[key] = text;
    }
    return { append: append.join('\n').trim().slice(0, 4000), sections: clean };
  }

  function readRules() {
    try {
      const stat = fs.statSync(rulesFile);
      if (stat.mtimeMs === rulesCache.mtime) return rulesCache.value;
      const value = parseRules(fs.readFileSync(rulesFile, 'utf8'));
      rulesCache = { mtime: stat.mtimeMs, value };
      return value;
    } catch {
      return { append: '', sections: {} };
    }
  }

  function ensureRules() {
    try {
      fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(rulesFile)) return;
      fs.writeFileSync(
        rulesFile,
        [
          '# 保存后下一句就生效，不用重启。以 # 开头的行是注释，不会发给她。',
          '#',
          '# 两种写法：',
          '# 1) 直接写一行规则 —— 追加到提示词最后，优先级最高。',
          '# 2) 用 [section: xxx] 开头 —— 整段替换掉内置的那一段。',
          '#    可用：style（她怎么发消息） / sample（语气示例） / relation（你们的关系）',
          '#',
          '# 例一，追加：',
          '# - 不要用「哈哈」开头。',
          '#',
          '# 例二，换掉内置的全部语气规则：',
          '# [section: style]',
          '# - 一句话最多十个字。',
          '# - 不用句号，不用逗号。',
          '# - 只说事，不说感受。',
          '',
        ].join('\n'),
      );
    } catch (error) {
      console.error('[companion] could not create voice.md:', error);
    }
  }

  const boot = Date.now();
  for (const ch of root.characters) if (ch.status === 'locked') advance(ch, boot);

  const active = () => root.characters.find((ch) => ch.id === root.activeId) || null;

  /* ---------------------------------------------------------------- *
   * Persistence
   * ---------------------------------------------------------------- */

  function persist(force = false) {
    const now = Date.now();
    if (!force && now - lastSave < 15_000) return;
    lastSave = now;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(root));
      fs.renameSync(tmp, file);
    } catch (error) {
      console.error('[companion] could not save state:', error);
    }
  }

  /* ---------------------------------------------------------------- *
   * Messages
   * ---------------------------------------------------------------- */

  function pushMessage(ch, role, text) {
    ch.seq += 1;
    const message = { seq: ch.seq, role, kind: 'text', text, ts: Date.now() };
    ch.messages.push(message);
    if (ch.messages.length > 500) ch.messages.splice(0, ch.messages.length - 500);
    if (role === 'her') {
      ch.meta.lastHerMessageAt = message.ts;
      if (/晚安|先睡|睡了|我先睡/.test(text)) ch.meta.saidGoodnightAt = message.ts;
    }
    return message;
  }

  function sendParcel(ch, from, name, emoji, cost) {
    const now = Date.now();
    // Her side is local and quick; what you mail has to actually travel.
    const eta = from === 'her' ? 15 * 60_000 + Math.random() * 30 * 60_000
      : 30 * 60_000 + Math.random() * 5.5 * 3600_000;
    ch.parcels = Array.isArray(ch.parcels) ? ch.parcels : [];
    ch.parcels.push({
      id: `p${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      name,
      emoji,
      from,
      cost: cost || 0,
      sentAt: now,
      arrivesAt: now + eta,
    });
    if (ch.parcels.length > 40) ch.parcels.splice(0, ch.parcels.length - 40);
  }

  /** Deliver anything whose time has come, then let her react. */
  function deliverParcels(ch, now) {
    if (!Array.isArray(ch.parcels) || !ch.parcels.length) return;
    const arrived = ch.parcels.filter((parcel) => parcel.arrivesAt <= now);
    if (!arrived.length) return;
    ch.parcels = ch.parcels.filter((parcel) => parcel.arrivesAt > now);
    for (const parcel of arrived) {
      pushItem(ch, parcel.from === 'her' ? 'her' : 'user', parcel.name, parcel.emoji, '', parcel.cost);
      ch.items = Array.isArray(ch.items) ? ch.items : [];
      ch.items.push({
        name: parcel.name,
        emoji: parcel.emoji,
        from: parcel.from,
        ts: now,
      });
      if (ch.items.length > 40) ch.items.splice(0, ch.items.length - 40);
    }
    // Whatever just landed, she has something to say about it.
    if (arrived.some((parcel) => parcel.from === 'him')) {
      ch.meta.pending = { kind: 'reply', dueAt: now + 6_000, userAt: now, excuse: 'free' };
      ch.meta.skipStreak = 0;
    }
    persist(true);
  }

  function pushItem(ch, role, name, emoji, note, cost) {
    ch.seq += 1;
    const message = {
      seq: ch.seq,
      role,
      kind: 'item',
      text: note || name,
      item: { name, emoji: emoji || '🎁', note: note || '', cost: cost || 0 },
      ts: Date.now(),
    };
    ch.messages.push(message);
    if (ch.messages.length > 500) ch.messages.splice(0, ch.messages.length - 500);
    if (role === 'her') ch.meta.lastHerMessageAt = message.ts;
    return message;
  }

  function pushSticker(ch, role, text, emoji) {
    ch.seq += 1;
    const message = {
      seq: ch.seq,
      role,
      kind: 'sticker',
      text,
      sticker: { text, emoji },
      ts: Date.now(),
    };
    ch.messages.push(message);
    if (ch.messages.length > 500) ch.messages.splice(0, ch.messages.length - 500);
    if (role === 'her') ch.meta.lastHerMessageAt = message.ts;
    return message;
  }

  const STICKER_RE = /\{\{\s*sticker\s*\|\s*([^|}]{0,12})\s*\|\s*([^}]{1,8})\s*\}\}/u;

  /** One模型 reply often holds several chat bubbles; send them separately. */
  function pushBubbles(ch, segment) {
    const parts = segment
      .split(/\n+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;
    if (parts.length === 1) {
      pushMessage(ch, 'her', parts[0]);
      return;
    }
    const merged = parts.length > 4 ? [...parts.slice(0, 3), parts.slice(3).join(' ')] : parts;
    for (const part of merged) pushMessage(ch, 'her', part);
  }

  /** Split a model reply into text bubbles and sticker bubbles. */
  function emitReply(ch, raw) {
    const text = sanitize(raw);
    if (!text) return;
    let cursor = 0;
    let matched = false;
    const re = new RegExp(STICKER_RE.source, 'gu');
    let match = re.exec(text);
    while (match) {
      matched = true;
      const before = text.slice(cursor, match.index).trim();
      if (before) pushBubbles(ch, before);
      pushSticker(ch, 'her', match[1].trim(), match[2].trim());
      cursor = match.index + match[0].length;
      match = re.exec(text);
    }
    const rest = text.slice(cursor).trim();
    if (rest) pushBubbles(ch, rest);
    if (!matched && !rest && cursor === 0 && text.trim()) pushBubbles(ch, text);
  }

  /* ---------------------------------------------------------------- *
   * Model access
   * ---------------------------------------------------------------- */

  function selection() {
    const chosen = ctx.agentDefaultModel?.currentSelection?.();
    if (!chosen || !chosen.provider || !chosen.model) {
      throw new Error('还没有选择默认模型，先在设置里选一个再试');
    }
    return chosen;
  }

  async function complete(system, prompt, maxTokens = 1200, temperature = 0.85, effort = 'low') {
    const run = async (extra) => {
      const chosen = selection();
      let text = '';
      let reasoningChars = 0;
      let truncated = false;
      const stream = ctx.llm.stream({
        provider: chosen.provider,
        model: chosen.model,
        system,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
        maxTokens,
        temperature,
        ...extra,
      });
      for await (const chunk of stream) {
        if (chunk.type === 'text-delta') text += chunk.text;
        else if (chunk.type === 'reasoning-delta') reasoningChars += chunk.text.length;
        else if (chunk.type === 'finish') {
          if (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted') {
            throw new Error(chunk.reason.failure?.message || '模型调用失败');
          }
          if (chunk.reason.kind === 'max-tokens') truncated = true;
        }
      }
      return { text, truncated, reasoningChars };
    };
    // Low effort keeps a reasoning model from spending the whole budget thinking.
    try {
      return await run({ reasoningEffort: effort });
    } catch (error) {
      if (/effort|reasoning/i.test(String(error && error.message))) return run({});
      throw error;
    }
  }

  /**
   * Try decreasing budgets when a provider rejects the requested output size,
   * so a generous limit never turns into a hard failure.
   */
  async function completeWithin(system, prompt, budgets, temperature, effort) {
    let lastError;
    for (const budget of budgets) {
      try {
        return await complete(system, prompt, budget, temperature, effort);
      } catch (error) {
        lastError = error;
        console.error('[companion] generation failed at', budget, 'tokens:', String(error?.message || error));
      }
    }
    throw lastError;
  }

  async function generate(ch, kind, options) {
    const parsedRules = readRules();
    const lastUserText = options.lastUserText || '';
    const spoken = ch.messages.filter((message) => message.role === 'user').length;
    const mustReply =
      kind === 'initiate' ||
      spoken <= 1 ||
      isQuestionLike(lastUserText) ||
      (ch.meta.skipStreak || 0) >= 1;
    const system = buildSystem(ch, Date.now(), {
      kind,
      ...options,
      mustReply,
      rules: parsedRules.append,
      overrides: parsedRules.sections,
      voice: voiceOf(ch.voice),
      portrait: portraitForPrompt(),
    });
    const lastUser = [...ch.messages].reverse().find((message) => message.role === 'user');
    const prompt =
      kind === 'initiate'
        ? `（场景提示：现在是 ${describe(ch).timeLabel}。你想主动找他说句话。只说你要发的那句。）`
        : !lastUser
          ? '（对方什么也没说）'
          : lastUser.kind === 'sticker'
            ? `（他发了个表情包：${lastUser.sticker.text || ''} ${lastUser.sticker.emoji}）`
            : lastUser.text;
    const { text } = await complete(system, prompt, 700, 0.95);
    return sanitize(text);
  }

  /** Ask the interviewer which question comes next. */
  async function askNext() {
    try {
      const current = portrait();
      const limit = tierOf('deep').max;
      const asked = current.answers.map((entry) => entry.q);
      const { system, prompt } = nextQuestionPrompt(current.answers, asked, limit);
      const result = await completeWithin(system, prompt, [1200, 800], 0.7, 'medium');
      const raw = extractJson(result.text);
      const next = raw && typeof raw.question === 'string' ? raw.question.trim().slice(0, 90) : '';
      if (!raw || raw.done || !next) {
        await writePortrait();
        return;
      }
      root.portrait = { ...portrait(), status: 'asking', nextQuestion: next };
    } catch (error) {
      console.error('[companion] next question failed:', error);
      await writePortrait();
      return;
    }
    persist(true);
  }

  /** Turn the finished interview into the portrait the system reasons from. */
  async function writePortrait() {
    try {
      const current = portrait();
      const { system, prompt } = portraitPrompt(current.answers);
      const result = await completeWithin(system, prompt, [3000, 2000], 0.6, 'medium');
      const raw = extractJson(result.text);
      let summary = raw && typeof raw === 'object' && typeof raw.summary === 'string'
        ? raw.summary.trim()
        : '';
      if (!summary && raw && typeof raw === 'object') {
        summary = Object.entries(raw)
          .filter(([key, value]) => key !== 'summary' && typeof value === 'string' && value)
          .map(([, value]) => value)
          .join('\n');
      }
      if (!summary) summary = sketchFromAnswers(current.answers);
      root.portrait = {
        ...current,
        status: 'done',
        summary: summary.slice(0, 3000),
        fields: raw && typeof raw === 'object' ? raw : null,
        updatedAt: Date.now(),
      };
    } catch (error) {
      console.error('[companion] portrait failed:', error);
      root.portrait = {
        ...portrait(),
        status: 'done',
        summary: sketchFromAnswers(portrait().answers),
        updatedAt: Date.now(),
      };
    }
    persist(true);
  }

  async function pump(ch) {
    const pending = ch.meta.pending;
    if (!pending || ch.status !== 'locked' || replying.has(ch.id)) return;
    if (!profileOf(ch)) {
      ch.meta.pending = null;
      return;
    }
    if (Date.now() < pending.dueAt) return;
    replying.add(ch.id);
    ch.meta.pending = null;
    persist();
    try {
      // A reply that sat through a sleep session must not arrive claiming it
      // is three in the morning. Past half an hour, drop the situation line
      // and let the elapsed time speak for itself.
      const late = Date.now() - (pending.dueAt || Date.now());
      const excuse = late > 30 * 60_000 ? 'none' : pending.excuse || 'free';
      const lastUser = [...ch.messages].reverse().find((message) => message.role === 'user');
      const text = await generate(ch, pending.kind, {
        excuse,
        waitedMs: Date.now() - (pending.userAt || Date.now()),
        lastUserText: lastUser && lastUser.kind !== 'sticker' ? lastUser.text : '',
      });
      // Items: she can only give away what she can pay for.
      let working = text;
      let gift = null;
      const item = ITEM_MARK.exec(working);
      if (item) {
        const cost = Number(item[3]) || 0;
        if (cost > ch.life.cash) {
          working = working.replace(item[0], '').trim();
          console.log('[companion] item rejected, too expensive:', cost, '>', ch.life.cash);
          if (!working) {
            ch.meta.skipStreak = (ch.meta.skipStreak || 0) + 1;
            return;
          }
        } else {
          ch.life.cash -= cost;
          ch.ledger.push({ ts: Date.now(), amount: -cost, note: item[1] });
          sendParcel(ch, 'her', item[1].trim(), item[2].trim(), cost);
          gift = true;
          working = working.replace(item[0], '').trim();
          ch.meta.skipStreak = 0;
        }
      }
      const silent = working.includes(SILENCE);
      const cleaned = silent ? working.replace(SILENCE, '').trim() : working;
      if (silent && !cleaned && !gift) {
        ch.meta.skipStreak = (ch.meta.skipStreak || 0) + 1;
        console.log('[companion] stayed silent (streak', ch.meta.skipStreak, ')');
      } else {
        if (cleaned) emitReply(ch, cleaned);
        ch.meta.skipStreak = 0;
        ch.meta.error = null;
      }
    } catch (error) {
      console.error('[companion] reply failed:', error);
      ch.meta.error = { ts: Date.now(), message: String(error?.message || error) };
    } finally {
      replying.delete(ch.id);
      persist(true);
    }
  }

  /** After a long quiet stretch she may have something to say on her own. */
  function maybeInitiate(ch, now) {
    if (ch.status !== 'locked' || !profileOf(ch) || !ch.messages.length || ch.meta.pending) return;
    if (now - (ch.meta.lastHerMessageAt || 0) < 6 * 3600_000) return;
    if (ch.meta.lastInitAt && now - ch.meta.lastInitAt < 12 * 3600_000) return;
    if (!ch.events.some((event) => now - event.ts < 3 * 3600_000)) return;
    ch.meta.lastInitAt = now;
    ch.meta.pending = {
      kind: 'initiate',
      dueAt: now + 30_000 + Math.random() * 90_000,
      excuse: 'free',
    };
  }

  /* ---------------------------------------------------------------- *
   * Authoring
   * ---------------------------------------------------------------- */

  const portrait = () =>
    root.portrait || {
      status: 'none',
      tier: 'standard',
      index: 0,
      answers: [],
      summary: '',
      fields: null,
      nextQuestion: '',
    };

  const tierOf = (id) => PORTRAIT_TIERS.find((entry) => entry.id === id) || PORTRAIT_TIERS[1];

  /** The fixed question for the current position, or null for the adaptive tier. */
  function currentQuestion(p) {
    if (p.status !== 'asking') return null;
    if (p.tier === 'deep') {
      return p.nextQuestion ? { group: '追问', text: p.nextQuestion } : null;
    }
    const order = p.tier === 'quick' ? PORTRAIT_QUICK : PORTRAIT_QUESTIONS.map((_, i) => i);
    const at = order[p.index];
    const question = at === undefined ? null : PORTRAIT_QUESTIONS[at];
    return question ? { group: question.group, text: question.text } : null;
  }

  function portraitPayload() {
    const p = portrait();
    const tier = tierOf(p.tier);
    const order = p.tier === 'quick' ? PORTRAIT_QUICK : PORTRAIT_QUESTIONS.map((_, i) => i);
    return {
      status: p.status,
      tier: tier.id,
      tierLabel: tier.label,
      index: p.index,
      total: p.tier === 'deep' ? tier.max : order.length,
      question: currentQuestion(p),
      answers: p.answers.map((entry, i) => ({
        q: entry.q,
        a: entry.a,
        group: PORTRAIT_QUESTIONS[i] ? PORTRAIT_QUESTIONS[i].group : '',
      })),
      summary: p.summary || '',
      updatedAt: p.updatedAt || null,
    };
  }

  const portraitSummary = () => (root.portrait && root.portrait.summary) || '';

  /** One line of context for every character prompt. */
  function portraitForPrompt() {
    const summary = portraitSummary();
    return summary ? summary.slice(0, 700) : '';
  }

  const draftPayload = () => {
    const draft = root.draft;
    if (!draft) return null;
    return {
      seed: draft.seed || '',
      userState: draft.userState || '',
      mode: draft.mode || '',
      lifestyle: draft.lifestyle || '',
      voice: draft.voice || 'plain',
      candidates: draft.candidates || null,
      candidatesFallback: Boolean(draft.candidatesFallback),
      profile: draft.draftProfile || null,
    };
  };

  function roster(now = Date.now()) {
    return root.characters.map((ch) => {
      const profile = ch.profile || {};
      const last = ch.messages[ch.messages.length - 1];
      const onTrial = ch.status === 'locked' && now < ch.trialEndsAt;
      const status = describe(ch, now);
      const preview = !last
        ? ''
        : last.kind === 'sticker'
          ? `[表情] ${last.sticker.text || ''}`
          : String(last.text || '').replace(/\n+/g, ' ');
      const unread =
        ch.id === root.activeId
          ? 0
          : ch.messages.filter((m) => m.role === 'her' && m.ts > (ch.meta.lastSeenAt || 0)).length;
      return {
        id: ch.id,
        name: profile.name || '她',
        initial: (profile.name || '她').slice(-1),
        avatar: profile.avatar ? `${AVATAR}/${ch.id}?v=${profile.avatar.v}` : null,
        identity: profile.identity || '',
        status: ch.status,
        active: ch.id === root.activeId,
        trial: onTrial,
        daysLeft: Math.max(0, Math.ceil((ch.trialEndsAt - now) / DAY)),
        messages: ch.messages.length,
        lastAt: last ? last.ts : null,
        lastText: preview.slice(0, 80),
        lastMine: last ? last.role === 'user' : false,
        unread,
        activity: status.status,
        asleep: status.asleep,
        met: Boolean(ch.met || (profile && profile.met)),
      };
    });
  }

  async function makeCandidates(seed, lifestyle, context) {
    const { system, prompt } = candidatesPrompt(seed, lifestyle, context);
    // Writing a person happens a handful of times, so it gets a real budget.
    let result = await completeWithin(system, prompt, [3000, 2000, 1200], 0.95, 'medium');
    if (!result.text.trim()) {
      result = await completeWithin(system, prompt, [5000, 3000], 0.95, 'medium');
    }
    const { text, truncated, reasoningChars } = result;
    const raw = extractJson(text);
    if (!Array.isArray(raw) || !raw.length) {
      console.error(
        '[companion] candidates: falling back to built-in trio',
        truncated ? '(输出被截断)' : '',
        '| reasoning', reasoningChars,
        '| text', text.length,
        '| head:', String(text).slice(0, 160).replace(/\n/g, ' '),
      );
    }
    if (Array.isArray(raw) && raw.length) {
      const list = raw
        .filter((item) => item && typeof item === 'object' && item.name)
        .slice(0, 3)
        .map((item) => ({
          name: String(item.name).slice(0, 12),
          oneLine: String(item.oneLine || '').slice(0, 60),
          temper: String(item.temper || '').slice(0, 40),
          looks: String(item.looks || '').slice(0, 60),
          routine: String(item.routine || '').slice(0, 40),
        }));
      if (list.length) return { list, fallback: false };
    }
    return { list: fallbackCandidates(seed), fallback: true };
  }

  async function makeProfile(seed, candidate, context) {
    const lifestyle = LIFESTYLES.includes(candidate?.lifestyle)
      ? candidate.lifestyle
      : LIFESTYLES.includes(context?.lifestyle)
        ? context.lifestyle
        : inferLifestyle(seed);
    const { system, prompt } = expandPrompt(seed, candidate, lifestyle, context);
    let result = await completeWithin(system, prompt, [6000, 4096, 3000], 0.85, 'high');
    if (!result.text.trim()) {
      result = await completeWithin(system, prompt, [6000, 4096], 0.85, 'high');
    }
    const { text, truncated, reasoningChars } = result;
    const raw = extractJson(text);
    const normalized = normalizeProfile(raw, seed, lifestyle);
    if (normalized) return normalized;

    // The timetable failed, but the person may be perfectly good. Keep her and
    // borrow a hand-written day rather than sending the user back to the start.
    const persona = personaFromRaw(raw);
    const problem = scheduleProblem(raw);
    console.error(
      '[companion] schedule rejected:',
      problem,
      truncated ? '(输出被截断)' : '',
      '| reasoning', reasoningChars,
      '| len', String(text).length,
      '| tail:', String(text).slice(-90).replace(/\n/g, ' '),
    );
    if (!persona) {
      throw new Error('模型这次没按格式回，再点一次就行');
    }
    const base = fallbackProfile(seed, lifestyle || 'student');
    return {
      ...base,
      ...persona,
      lifestyle: base.lifestyle,
      fallback: false,
      degraded: true,
    };
  }

  /** Cast a stranger: profile + the moment you met, then she speaks first. */
  async function castStranger() {
    const brief = randomBrief();
    const engagement = {};
    for (const existing of root.characters) {
      if (!existing.castRole) continue;
      const spoken = existing.messages.filter((m) => m.role === 'user').length;
      engagement[existing.castRole] = (engagement[existing.castRole] || 0) + spoken;
    }
    const role = pickRole(
      root.characters.map((ch) => ch.castRole).filter(Boolean),
      engagement,
    );
    console.log('[companion] casting role:', role.id);
    const { system, prompt } = meetPrompt(brief, role, {
      userState: portraitForPrompt(),
      mode: '',
      avoid: root.characters.map((ch) => ch.profile && ch.profile.name).filter(Boolean),
    });
    let result = await completeWithin(system, prompt, [6000, 4096, 3000], 0.95, 'high');
    if (!result.text.trim()) {
      result = await completeWithin(system, prompt, [6000, 4096], 0.95, 'high');
    }
    const raw = extractJson(result.text);
    const profile = normalizeProfile(raw, '遇见', brief.life === '在读' ? 'student' : undefined);
    if (!profile) {
      console.error('[companion] cast failed | len', String(result.text).length,
        '| head:', String(result.text).slice(0, 200).replace(/\n/g, ' '));
      throw new Error('这次没碰上人，再试一次');
    }
    const encounter = raw && raw.encounter && typeof raw.encounter === 'object' ? raw.encounter : null;
    profile.encounter = {
      where: String((encounter && encounter.where) || brief.place).slice(0, 40),
      when: String((encounter && encounter.when) || brief.hour).slice(0, 40),
      moment: String((encounter && encounter.moment) || '').slice(0, 60),
      look: String((encounter && encounter.look) || '').slice(0, 80),
    };
    profile.met = true;
    profile.fallback = false;

    const now = Date.now();
    const character = createCharacter(profile, now);
    character.id = `c${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    character.voice = 'plain';
    character.met = true;
    character.castRole = role.id;
    character.relation = { mode: '', userState: '', userStateId: '' };
    root.characters.push(character);
    root.activeId = character.id;
    root.draft = null;
    // She speaks first, a few seconds after the panel catches up.
    character.meta.pending = { kind: 'initiate', dueAt: now + 2500, excuse: 'free' };
    persist(true);
    return character;
  }

  /* ---------------------------------------------------------------- *
   * Avatar
   * ---------------------------------------------------------------- */

  function saveAvatar(dataUrl, ch) {
    const match = String(dataUrl || '').match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return null;
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 3 * 1024 * 1024) throw new Error('头像太大了');
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const name = `avatar-${ch.id}.${ext}`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), buffer);
    return { file: name, v: Date.now() };
  }

  function serveAvatar(req, res) {
    const id = String(req.url || '').split('?')[0].split('/').filter(Boolean).pop();
    const ch = root.characters.find((candidate) => candidate.id === id);
    const avatar = ch && ch.profile && ch.profile.avatar;
    if (!avatar) {
      res.writeHead(404, { 'cache-control': 'no-store' });
      res.end('no avatar');
      return;
    }
    try {
      const bytes = fs.readFileSync(path.join(dir, avatar.file));
      const type = avatar.file.endsWith('.png')
        ? 'image/png'
        : avatar.file.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';
      res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=86400' });
      res.end(bytes);
    } catch {
      res.writeHead(404, { 'cache-control': 'no-store' });
      res.end('missing');
    }
  }

  /* ---------------------------------------------------------------- *
   * Payload
   * ---------------------------------------------------------------- */

  function payload(since = 0, now = Date.now()) {
    const ch = active();
    const profile = ch ? profileOf(ch) : null;
    const messages = !ch
      ? []
      : since > 0
        ? ch.messages.filter((message) => message.seq > since)
        : ch.messages.slice(-60);
    const pending = ch && ch.meta.pending;
    const typing =
      Boolean(ch && replying.has(ch.id)) || Boolean(pending && pending.dueAt - now < 45_000);
    const error =
      ch && ch.meta.error && now - ch.meta.error.ts < 60_000 ? ch.meta.error.message : null;

    return {
      ok: true,
      seq: ch ? ch.seq : 0,
      now,
      persona: profile
        ? {
            name: profile.name,
            initial: profile.name.slice(-1),
            avatar: profile.avatar ? `${AVATAR}/${ch.id}?v=${profile.avatar.v}` : null,
          }
        : null,
      status: profile ? describe(ch, now) : null,
      messages,
      typing,
      error,
      activeId: ch ? ch.id : null,
      roster: roster(now),
      builtins: BUILTINS.map(({ id, name, blurb, voice }) => ({ id, name, blurb, voice })),
      draft: draftPayload(),
      encounter: profile && profile.encounter ? profile.encounter : null,
      parcels: ch && Array.isArray(ch.parcels)
        ? ch.parcels.map((parcel) => ({
            name: parcel.name,
            emoji: parcel.emoji,
            from: parcel.from,
            minutes: Math.max(0, Math.round((parcel.arrivesAt - now) / 60_000)),
          }))
        : [],
      trial: ch && ch.status === 'locked' ? now < ch.trialEndsAt : false,
      trialDays: ch ? Math.max(0, Math.ceil((ch.trialEndsAt - now) / DAY)) : 0,
    };
  }

  /* ---------------------------------------------------------------- *
   * HTTP
   * ---------------------------------------------------------------- */

  async function handler(req, res) {
    try {
      if (req.method !== 'POST') return reply(res, 405, { ok: false, error: '只接受 POST' });
      const body = JSON.parse(await readBody(req));
      const now = Date.now();
      const ch = active();
      if (ch) {
        advance(ch, now);
        deliverParcels(ch, now);
      }
      if (!sawClient) {
        sawClient = true;
        console.log('[companion] panel connected');
      }

      switch (body.op) {
        case 'state':
          // Only an open conversation marks itself read; the list keeps counts.
          if (ch && body.read !== false) ch.meta.lastSeenAt = now;
          return reply(res, 200, payload(Number(body.since) || 0, now));

        case 'send': {
          if (!ch || !profileOf(ch)) return reply(res, 400, { ok: false, error: '她还没有被写出来' });
          const isSticker = Boolean(body.sticker && body.sticker.emoji);
          let text = '';
          if (isSticker) {
            pushSticker(
              ch,
              'user',
              String(body.sticker.text || '').slice(0, 12),
              String(body.sticker.emoji).slice(0, 8),
            );
          } else {
            text = String(body.text || '').trim().slice(0, 2000);
            if (!text) return reply(res, 400, { ok: false, error: '空消息' });
            pushMessage(ch, 'user', text);
          }
          const plan = isSticker
            ? { reply: true, delay: 8_000, excuse: 'free' }
            : planReply(ch, now, text);
          ch.meta.pending = {
            kind: 'reply',
            dueAt: now + plan.delay,
            userAt: now,
            excuse: plan.excuse,
          };
          persist(true);
          return reply(res, 200, payload(Number(body.since) || 0, now));
        }

        case 'character.seed': {
          if (authoring) return reply(res, 409, { ok: false, error: '正在生成，等一下' });
          const typed = String(body.text || '').trim().slice(0, 500);
          const userState = USER_STATES.some((entry) => entry.id === body.userState)
            ? body.userState
            : '';
          const mode = RELATION_MODES.some((entry) => entry.id === body.mode) ? body.mode : '';
          if (!typed && !mode) {
            return reply(res, 400, { ok: false, error: '写一句，或者至少选一下你想要的关系' });
          }
          const seed =
            typed ||
            `${labelOf(USER_STATES, userState) || '不太想说自己'}，想要${labelOf(RELATION_MODES, mode)}的关系`;
          const lifestyle = LIFESTYLES.includes(body.lifestyle) ? body.lifestyle : null;
          const context = { userState, mode };
          authoring = true;
          try {
            const made = await makeCandidates(seed, lifestyle, context);
            root.draft = {
              seed,
              userState,
              mode,
              lifestyle,
              voice: VOICES.some((entry) => entry.id === body.voice) ? body.voice : 'plain',
              candidates: made.list,
              candidatesFallback: made.fallback,
              draftProfile: null,
            };
            persist(true);
            return reply(res, 200, { ok: true, draft: draftPayload() });
          } catch (error) {
            return reply(res, 200, { ok: false, error: String(error?.message || error) });
          } finally {
            authoring = false;
          }
        }

        case 'character.choose': {
          if (authoring) return reply(res, 409, { ok: false, error: '正在生成，等一下' });
          const candidate = (root.draft?.candidates || [])[Number(body.index)];
          if (!candidate) return reply(res, 400, { ok: false, error: '没有这个候选人' });
          authoring = true;
          try {
            const profile = await makeProfile(root.draft.seed, candidate, {
              userState: labelOf(USER_STATES, root.draft.userState),
              mode: root.draft.mode || '',
              lifestyle: LIFESTYLES.includes(root.draft.lifestyle) ? root.draft.lifestyle : undefined,
            });
            root.draft.draftProfile = profile;
            persist(true);
            return reply(res, 200, { ok: true, draft: draftPayload() });
          } catch (error) {
            return reply(res, 200, { ok: false, error: String(error?.message || error) });
          } finally {
            authoring = false;
          }
        }

        case 'character.fallback': {
          const seed = root.draft?.seed || '';
          const lifestyle = LIFESTYLES.includes(body.lifestyle) ? body.lifestyle : 'student';
          root.draft = {
            seed,
            userState: root.draft?.userState || '',
            mode: root.draft?.mode || '',
            lifestyle,
            voice: root.draft?.voice || 'plain',
            candidates: null,
            draftProfile: fallbackProfile(seed, lifestyle),
          };
          persist(true);
          return reply(res, 200, { ok: true, draft: draftPayload() });
        }

        case 'character.lock': {
          const draft = root.draft;
          if (!draft || !draft.draftProfile) return reply(res, 400, { ok: false, error: '还没有写好的档案' });
          const character = createCharacter(draft.draftProfile, now);
          character.id = `c${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          if (body.avatar) {
            try {
              character.profile.avatar = saveAvatar(body.avatar, character);
            } catch (error) {
              return reply(res, 400, { ok: false, error: String(error?.message || error) });
            }
          }
          character.voice = draft.voice || 'plain';
          character.relation = {
            mode: draft.mode || '',
            userState: labelOf(USER_STATES, draft.userState),
            userStateId: draft.userState || '',
          };
          root.characters.push(character);
          root.activeId = character.id;
          root.draft = null;
          persist(true);
          return reply(res, 200, payload(0, now));
        }

        case 'character.restart': {
          root.draft = {
            seed: root.draft?.seed || '',
            userState: root.draft?.userState || '',
            mode: root.draft?.mode || '',
            candidates: null,
            draftProfile: null,
          };
          persist(true);
          return reply(res, 200, { ok: true, draft: draftPayload() });
        }

        case 'characters.cancel': {
          root.draft = null;
          persist(true);
          return reply(res, 200, payload(0, now));
        }

        case 'characters.builtin': {
          const definition = BUILTINS.find((entry) => entry.id === body.id);
          if (!definition) return reply(res, 404, { ok: false, error: '没有这个人' });
          const base = fallbackProfile('', definition.base);
          const profile = {
            ...base,
            ...definition.persona,
            fallback: false,
            builtin: definition.id,
            avatar: null,
          };
          const character = createCharacter(profile, now);
          character.id = `c${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          character.voice = definition.voice || 'plain';
          character.relation = { mode: '', userState: '', userStateId: '' };
          root.characters.push(character);
          root.activeId = character.id;
          root.draft = null;
          persist(true);
          return reply(res, 200, payload(0, now));
        }

        case 'portrait.get':
          return reply(res, 200, { ok: true, portrait: portraitPayload() });

        case 'portrait.answer': {
          const text = String(body.text || '').trim().slice(0, 1500);
          const current = portrait();
          if (current.status !== 'asking') {
            return reply(res, 400, { ok: false, error: '访谈还没开始' });
          }
          const question = currentQuestion(current);
          if (!question) return reply(res, 400, { ok: false, error: '没有这道题' });
          const answers = current.answers.slice();
          answers[current.index] = { q: question.text, a: text };
          const next = current.index + 1;

          if (current.tier === 'deep') {
            const limit = tierOf('deep').max;
            root.portrait = {
              ...current,
              answers,
              index: Math.min(next, limit),
              status: next >= limit ? 'writing' : 'thinking',
              nextQuestion: '',
            };
            persist(true);
            if (root.portrait.status === 'writing') void writePortrait();
            else void askNext();
            return reply(res, 200, { ok: true, portrait: portraitPayload() });
          }

          const order =
            current.tier === 'quick' ? PORTRAIT_QUICK : PORTRAIT_QUESTIONS.map((_, i) => i);
          root.portrait = {
            ...current,
            answers,
            index: Math.min(next, order.length),
            status: next >= order.length ? 'writing' : 'asking',
          };
          persist(true);
          if (root.portrait.status === 'writing') {
            void writePortrait();
          }
          return reply(res, 200, { ok: true, portrait: portraitPayload() });
        }

        case 'portrait.start': {
          const tier = PORTRAIT_TIERS.some((entry) => entry.id === body.tier) ? body.tier : 'standard';
          root.portrait = {
            status: 'asking',
            tier,
            index: 0,
            answers: [],
            summary: '',
            fields: null,
            // The adaptive tier still opens with one fixed, easy question.
            nextQuestion: tier === 'deep' ? PORTRAIT_QUESTIONS[0].text : '',
            updatedAt: Date.now(),
          };
          persist(true);
          return reply(res, 200, { ok: true, portrait: portraitPayload() });
        }

        case 'portrait.save': {
          const summary = String(body.summary || '').slice(0, 3000);
          root.portrait = { ...portrait(), summary, updatedAt: Date.now(), status: 'done' };
          if (!root.portrait.answers) root.portrait.answers = [];
          persist(true);
          return reply(res, 200, { ok: true, portrait: portraitPayload() });
        }

        case 'send.item': {
          if (!ch || !profileOf(ch)) return reply(res, 400, { ok: false, error: '她还没有被写出来' });
          const name = String(body.name || '').trim().slice(0, 16);
          if (!name) return reply(res, 400, { ok: false, error: '没有东西' });
          const emoji = String(body.emoji || '🎁').slice(0, 4);
          sendParcel(ch, 'him', name, emoji, 0);
          const plan = planReply(ch, now, name);
          ch.meta.pending = {
            kind: 'reply',
            dueAt: now + Math.min(plan.delay, 90_000),
            userAt: now,
            excuse: plan.excuse,
          };
          ch.meta.skipStreak = 0;
          persist(true);
          return reply(res, 200, payload(Number(body.since) || 0, now));
        }

        case 'characters.meet': {
          if (authoring) return reply(res, 409, { ok: false, error: '正在生成，等一下' });
          authoring = true;
          try {
            const character = await castStranger();
            return reply(res, 200, payload(0, Date.now()));
          } catch (error) {
            return reply(res, 200, { ok: false, error: String(error?.message || error) });
          } finally {
            authoring = false;
          }
        }

        case 'characters.new': {
          root.draft = {
            seed: '',
            userState: '',
            mode: '',
            voice: 'plain',
            candidates: null,
            draftProfile: null,
          };
          persist(true);
          return reply(res, 200, { ok: true, draft: draftPayload(), roster: roster(now) });
        }

        case 'characters.switch': {
          const target = root.characters.find((item) => item.id === body.id);
          if (!target) return reply(res, 404, { ok: false, error: '没有这个人' });
          target.meta.lastSeenAt = now;
          root.activeId = target.id;
          root.draft = null;
          persist(true);
          return reply(res, 200, payload(0, now));
        }

        case 'characters.status': {
          const target = root.characters.find((item) => item.id === body.id);
          if (!target) return reply(res, 404, { ok: false, error: '没有这个人' });
          target.status = body.archived ? 'archived' : 'locked';
          if (target.status === 'archived' && root.activeId === target.id) {
            const next = root.characters.find((item) => item.status === 'locked');
            root.activeId = next ? next.id : null;
          } else if (target.status === 'locked' && !root.activeId) {
            root.activeId = target.id;
          }
          persist(true);
          return reply(res, 200, payload(0, now));
        }

        case 'characters.delete': {
          const index = root.characters.findIndex((item) => item.id === body.id);
          if (index < 0) return reply(res, 404, { ok: false, error: '没有这个人' });
          const target = root.characters[index];
          if (now >= target.trialEndsAt) {
            return reply(res, 400, { ok: false, error: '她已经固定了，删不掉。只能停用。' });
          }
          root.characters.splice(index, 1);
          if (root.activeId === target.id) {
            const next = root.characters.find((item) => item.status === 'locked');
            root.activeId = next ? next.id : null;
          }
          persist(true);
          return reply(res, 200, payload(0, now));
        }

        case 'characters.retrial': {
          const target = root.characters.find((item) => item.id === body.id);
          if (!target) return reply(res, 404, { ok: false, error: '没有这个人' });
          if (now >= target.trialEndsAt) {
            return reply(res, 400, { ok: false, error: '磨合期已经过了，她固定下来了。' });
          }
          root.draft = {
            seed: String(target.profile?.seed || '').slice(0, 500),
            userState: target.relation?.userStateId || '',
            mode: target.relation?.mode || '',
            lifestyle: target.profile?.lifestyle || '',
            voice: target.voice || 'plain',
            candidates: null,
            draftProfile: null,
          };
          root.characters = root.characters.filter((item) => item.id !== target.id);
          if (root.activeId === target.id) {
            const next = root.characters.find((item) => item.status === 'locked');
            root.activeId = next ? next.id : null;
          }
          persist(true);
          return reply(res, 200, { ok: true, draft: draftPayload(), roster: roster(now) });
        }

        case 'rules.get': {
          const raw = (() => {
            try {
              return fs.readFileSync(rulesFile, 'utf8');
            } catch {
              return '';
            }
          })();
          return reply(res, 200, { ok: true, text: raw, path: rulesFile });
        }

        case 'prompt.preview': {
          if (!ch || !profileOf(ch)) {
            return reply(res, 400, { ok: false, error: '先有一个人' });
          }
          const parsed = readRules();
          const text = buildSystem(ch, now, {
            kind: 'reply',
            excuse: 'free',
            rules: parsed.append,
            overrides: parsed.sections,
            voice: voiceOf(ch.voice),
          });
          return reply(res, 200, { ok: true, text });
        }

        case 'rules.save': {
          const text = String(body.text || '').slice(0, 4000);
          try {
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(rulesFile, text);
          } catch (error) {
            return reply(res, 500, { ok: false, error: String(error?.message || error) });
          }
          return reply(res, 200, { ok: true, text: (() => {
            try {
              return fs.readFileSync(rulesFile, 'utf8');
            } catch {
              return '';
            }
          })(), path: rulesFile });
        }

        case 'world':
          return reply(res, 200, { ok: true, root, status: describe(ch, now) });

        default:
          return reply(res, 400, { ok: false, error: 'unknown op' });
      }
    } catch (error) {
      console.error('[companion] api error:', error);
      return reply(res, 500, { ok: false, error: String(error?.message || error) });
    }
  }

  /* ---------------------------------------------------------------- *
   * Wiring
   * ---------------------------------------------------------------- */

  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: API, handler }),
    'companion: api',
  );

  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: AVATAR, handler: serveAvatar }),
    'companion: avatar',
  );

  ctx.effect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const character of root.characters) {
        if (character.status !== 'locked') continue;
        advance(character, now);
        deliverParcels(character, now);
        void pump(character);
        maybeInitiate(character, now);
      }
      persist();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, 'companion: clock');

  ctx.effect(() => {
    persist(true);
    return () => persist(true);
  }, 'companion: state');

  for (const character of root.characters) maybeInitiate(character, boot);
}

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

function sketchFromAnswers(answers) {
  return (answers || [])
    .filter((entry) => entry && entry.a)
    .map((entry) => `${entry.q}\n${entry.a}`)
    .join('\n')
    .slice(0, 3000);
}

function emptyRoot() {
  return {
    version: 3,
    createdAt: Date.now(),
    characters: [],
    activeId: null,
    draft: null,
    portrait: null,
  };
}

function migrateV2(raw) {
  const character = raw.character || {};
  const root = emptyRoot();
  root.createdAt = raw.createdAt || Date.now();
  if (character.status === 'locked' && character.profile) {
    const ch = createCharacter(repairProfile(character.profile), character.lockedAt || root.createdAt);
    ch.id = `c${Date.now().toString(36)}`;
    ch.seq = raw.seq || 0;
    ch.clock = raw.clock || ch.clock;
    ch.life = raw.life || ch.life;
    ch.events = Array.isArray(raw.events) ? raw.events : [];
    ch.ledger = Array.isArray(raw.ledger) ? raw.ledger : [];
    ch.messages = Array.isArray(raw.messages) ? raw.messages : [];
    ch.meta = { ...ch.meta, ...(raw.meta || {}) };
    root.characters.push(ch);
    root.activeId = ch.id;
  } else if (character.status === 'draft') {
    root.draft = {
      seed: character.seed || '',
      candidates: character.candidates || null,
      draftProfile: character.draftProfile || null,
    };
  }
  return root;
}

function load(dir, file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (raw && raw.version === 3 && Array.isArray(raw.characters)) {
      const root = emptyRoot();
      root.createdAt = raw.createdAt || Date.now();
      root.activeId = raw.activeId || null;
      root.draft = raw.draft || null;
      root.characters = raw.characters.map((entry) => {
        const base = createCharacter(entry.profile, entry.lockedAt || Date.now());
        let profile = repairProfile(entry.profile);
        // `先用默认的她` never has a seed, so an empty seed is the reliable
        // marker for a hand-written profile that a newer build may regenerate.
        const untouched = !Array.isArray(entry.messages) || entry.messages.length === 0;
        if (
          profile &&
          untouched &&
          !profile.builtin &&
          (profile.fallback === true || profile.seed === '')
        ) {
          const avatar = profile.avatar;
          profile = fallbackProfile(profile.seed || '', profile.lifestyle);
          profile.avatar = avatar || null;
        }
        return {
          ...base,
          ...entry,
          profile,
          relation: entry.relation || { mode: '', userState: '' },
          meta: { ...base.meta, ...(entry.meta || {}) },
          clock: entry.clock || base.clock,
          life: entry.life || base.life,
          events: Array.isArray(entry.events) ? entry.events : [],
          ledger: Array.isArray(entry.ledger) ? entry.ledger : [],
          messages: Array.isArray(entry.messages) ? entry.messages : [],
        };
      });
      return root;
    }
    if (raw && Array.isArray(raw.messages)) return migrateV2(raw);
  } catch {
    /* first run */
  }
  fs.mkdirSync(dir, { recursive: true });
  return emptyRoot();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function reply(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}
