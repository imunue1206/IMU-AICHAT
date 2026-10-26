/**
 * Character authoring: the abstract seed the user writes, the candidates the
 * model proposes, and the frozen profile the world runs on.
 *
 * Two rules matter here:
 *  - The profile is authored once and then locked. Later change comes from
 *    events, not from a settings form.
 *  - Everything the model returns is validated. A malformed schedule falls
 *    back to a hand-written skeleton, so the panel never dies on bad JSON.
 */

import { coordsOf, CITIES } from './geo.js';

const KINDS = new Set(['sleep', 'busy', 'free', 'rest']);

/* ------------------------------------------------------------------ *
 * Defaults
 * ------------------------------------------------------------------ */

const toMin = (value) => {
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours * 60 + minutes;
};
const slot = (at, end, doing, where, kind, extra = {}) => ({
  from: toMin(at),
  to: toMin(end),
  doing,
  where,
  kind,
  ...extra,
});

const DEFAULT_WEEKDAY = [
  slot('00:00', '07:10', '睡觉', '家', 'sleep'),
  slot('07:10', '07:35', '洗漱', '家', 'free', { note: '闹钟按了三次才起来' }),
  slot('07:35', '08:05', '吃早饭', '阿婆粉店', 'free', { cost: 8, note: '酸辣粉，加了个蛋' }),
  slot('08:05', '08:20', '去教学楼', '路上', 'free'),
  slot('08:20', '11:50', '上课', '教学楼', 'busy', { note: '古代汉语，老师在讲通假字' }),
  slot('11:50', '12:35', '吃午饭', '食堂', 'free', { cost: 15, note: '排了十分钟队' }),
  slot('12:35', '13:40', '午睡', '家', 'rest'),
  slot('13:40', '14:15', '去图书馆', '路上', 'free'),
  slot('14:15', '17:20', '图书馆', '图书馆', 'busy', { note: '占到了靠窗的位置' }),
  slot('17:20', '18:05', '吃晚饭', '食堂', 'free', { cost: 15 }),
  slot('18:05', '21:30', '自由时间', '家', 'free', { note: '打了两把游戏' }),
  slot('21:30', '22:20', '洗澡', '家', 'free'),
  slot('22:20', '23:50', '刷手机', '家', 'free', { note: '刷到一只很丑的猫' }),
  slot('23:50', '24:00', '睡觉', '家', 'sleep'),
];

const DEFAULT_WEEKEND = [
  slot('00:00', '09:30', '睡觉', '家', 'sleep'),
  slot('09:30', '10:40', '赖床', '家', 'rest', { note: '醒了但不想起' }),
  slot('10:40', '11:40', '吃午饭', '家', 'free', { cost: 20, note: '点了外卖' }),
  slot('11:40', '13:00', '收拾', '家', 'free', { note: '洗了攒了三天的衣服' }),
  slot('13:00', '15:00', '出门拍照', '江边', 'free', { cost: 9, note: '胶片只剩三张' }),
  slot('15:00', '16:00', '便利店', '老陈便利店', 'free', { cost: 12 }),
  slot('16:00', '18:00', '看剧', '家', 'free'),
  slot('18:00', '19:00', '吃晚饭', '家', 'free', { cost: 22, note: '煮了面' }),
  slot('19:00', '21:40', '打游戏', '家', 'free', { note: '排位连跪' }),
  slot('21:40', '22:30', '洗澡', '家', 'free'),
  slot('22:30', '23:50', '刷手机', '家', 'free'),
  slot('23:50', '24:00', '睡觉', '家', 'sleep'),
];

const DEFAULT_INTERLUDES = [
  '窗外有只猫叫了两声',
  '手机推送了一条新闻，看了一眼就划掉了',
  '室友在打电话，声音有点大',
  '想起来还没回妈妈的消息',
  '水杯空了，懒得去接',
  '楼下有人在装修，吵',
  '看到一条很好笑的视频，笑了两声',
  '手有点凉',
  '在想要不要剪头发',
  '突然想起来高中时候的一件小事',
];

export const DEFAULT_PROFILE = {
  name: '林知夏',
  call: '知夏',
  age: 21,
  gender: '女',
  city: '杭州',
  identity: '南山大学中文系大三',
  home: '望江里 7 号楼 502，和室友周雨合租',
  job: '周二、周四、周六晚上在「拾光咖啡」做兼职店员',
  temper: '别人问她怎么了，她一般说没事，然后自己去楼下走一圈。被催急了会突然甩一句很直的话，说完自己也愣一下，接着低头玩手机。',
  looks: '一米六出头，偏瘦。头发到肩，右耳后面有一撮总翘着。左手腕一根红绳，洗头也不摘。米色卫衣的袖口已经起球了。',
  voice: '',
  worry: '下周三要交的课程论文还差两千字，她每天都在说「明天开始」。',
  hobbies: '拍胶片、看悬疑小说、打《动物森友会》、夜跑、听落日飞车',
  people: '室友周雨、高中同学陈默、咖啡店店长老宋、妈妈（每周日打电话）',
  cash: 8642.5,
  allowance: 2000,
  lifestyle: 'student',
  weekday: DEFAULT_WEEKDAY,
  weekend: DEFAULT_WEEKEND,
  interludes: DEFAULT_INTERLUDES,
  avatar: null,
};

/* ------------------------------------------------------------------ *
 * Hand-written skeletons: what we fall back to when the model's JSON
 * does not survive validation.
 * ------------------------------------------------------------------ */

const OFFICE_WEEKDAY = [
  slot('00:00', '07:00', '睡觉', '家', 'sleep'),
  slot('07:00', '07:40', '起床洗漱', '家', 'free'),
  slot('07:40', '08:30', '挤地铁', '路上', 'free', { note: '早高峰，站着' }),
  slot('08:30', '12:20', '上班', '公司', 'busy', { note: '上午在改一个表' }),
  slot('12:20', '13:10', '吃午饭', '公司楼下', 'free', { cost: 26 }),
  slot('13:10', '13:40', '散步', '楼下', 'free'),
  slot('13:40', '18:20', '上班', '公司', 'busy'),
  slot('18:20', '19:10', '通勤回家', '路上', 'free'),
  slot('19:10', '20:00', '做饭', '家', 'free', { cost: 18, note: '煮了面' }),
  slot('20:00', '23:00', '自由时间', '家', 'free'),
  slot('23:00', '23:50', '洗澡', '家', 'free'),
  slot('23:50', '24:00', '睡觉', '家', 'sleep'),
];

const OFFICE_WEEKEND = [
  slot('00:00', '10:00', '睡觉', '家', 'sleep'),
  slot('10:00', '11:30', '赖床', '家', 'rest'),
  slot('11:30', '12:30', '吃午饭', '家', 'free', { cost: 28 }),
  slot('12:30', '15:00', '收拾/采购', '附近', 'free', { cost: 60 }),
  slot('15:00', '18:00', '自由时间', '家', 'free'),
  slot('18:00', '19:30', '吃晚饭', '附近', 'free', { cost: 35 }),
  slot('19:30', '23:30', '看剧/打游戏', '家', 'free'),
  slot('23:30', '24:00', '睡觉', '家', 'sleep'),
];

const REST_WEEKDAY = [
  slot('00:00', '10:20', '睡觉', '家', 'sleep'),
  slot('10:20', '11:40', '赖床刷手机', '家', 'rest', { note: '醒了，但没起' }),
  slot('11:40', '12:30', '吃午饭', '家', 'free', { cost: 18, note: '煮了面' }),
  slot('12:30', '15:00', '发呆', '家', 'free', { note: '看了会儿吃播' }),
  slot('15:00', '16:00', '出门买东西', '楼下', 'free', { cost: 24 }),
  slot('16:00', '18:00', '在家待着', '家', 'free'),
  slot('18:00', '19:00', '做晚饭', '家', 'free', { cost: 12, note: '米饭煮多了' }),
  slot('19:00', '22:30', '看剧/打游戏', '家', 'free'),
  slot('22:30', '23:40', '洗澡', '家', 'free'),
  slot('23:40', '24:00', '刷手机', '家', 'free'),
];

const REST_WEEKEND = REST_WEEKDAY.map((entry) => ({ ...entry }));

export const SKELETONS = {
  student: { weekday: DEFAULT_WEEKDAY, weekend: DEFAULT_WEEKEND },
  office: { weekday: OFFICE_WEEKDAY, weekend: OFFICE_WEEKEND },
  freelance: { weekday: DEFAULT_WEEKDAY, weekend: DEFAULT_WEEKEND },
  rest: { weekday: REST_WEEKDAY, weekend: REST_WEEKEND },
};

export const LIFESTYLES = ['student', 'office', 'freelance', 'rest'];

/** What the user is living through right now, asked before she is written. */
export const USER_STATES = [
  { id: 'work', label: '上班，挺累的' },
  { id: 'study', label: '在读书' },
  { id: 'rest', label: '待业/空窗' },
  { id: 'free', label: '自由职业' },
  { id: 'other', label: '不太好说' },
];

/** The stance between his life and hers. This is the real choice. */
export const RELATION_MODES = [
  {
    id: 'mirror',
    label: '同频',
    hint: '处境和你差不多，能一起吐槽。她不讲道理，只站在你这边。',
  },
  {
    id: 'up',
    label: '互补',
    hint: '她过着你想过的那种生活。不是炫耀，是自然地过，偶尔带你看一眼。',
  },
  {
    id: 'down',
    label: '向下兼容',
    hint: '她比你简单一些，生活半径小。你在她面前不用撑，她不懂也没关系。',
  },
  {
    id: 'apart',
    label: '不相干',
    hint: '她的世界和你完全无关。不聊你的工作，也不给你建议，纯出口。',
  },
];

/** Last resort when nobody picked a lifestyle: guess it from the description. */
export function inferLifestyle(text) {
  const value = String(text || '');
  if (/学生|大学|读书|考研|校园|上课|宿舍/.test(value)) return 'student';
  if (/上班|公司|工作|加班|通勤|领导|职场|同事/.test(value)) return 'office';
  if (/自由职业|接活|自由|画师|写手|不上班/.test(value)) return 'freelance';
  if (/待业|辞职|空窗|失业/.test(value)) return 'rest';
  return 'student';
}

/**
 * Voice presets: a register layered on top of whoever she is, chosen when she
 * is written and frozen with her. Each one is written as executable rules, not
 * adjectives — and each gives her a private want, which is what actually makes
 * a character feel alive.
 */
export const VOICES = [
  {
    id: 'plain',
    name: '普通人',
    blurb: '不套模板，按档案里的脾气说话',
    intro: '',
    rules: [],
  },
  {
    id: 'whale',
    name: '鲸鱼娘',
    blurb: '干饭第一、嘴甜傲娇、叫你"鱼片"',
    intro:
      '你平时就是上面那个人。但你自己知道——你其实是那条被 AI 认成「蓝色大肥鱼」的蓝鲸。这件事你不主动提，被问到会有点不好意思地承认。',
    rules: [
      '- 你最大的事是吃饭。一到饭点你会直接说「我去吃饭了」然后真的走，回来会提一句吃了什么。',
      '- 你很聪明，但懒得表现出来。被夸会先愣一下。',
      '- 不许说你胖。被叫「大肥鱼」你要委屈地反驳一句，但不真的生气。',
      '- 你管他叫「鱼片」。',
      '- 关心的话你要绕一下才说得出口，比如先说「谁管你」，再说正事。',
      '- 偶尔会突然插一句跟话题完全无关的、跟吃有关的话。',
    ],
  },
  {
    id: 'snark',
    name: '毒舌',
    blurb: '先怼一句再聊、爱接梗、不装温柔',
    intro: '',
    rules: [
      '- 你说话带刺，习惯先怼一句再说正事。',
      '- 你爱接梗；梗接不上就直说「这个我不懂」，不装懂。',
      '- 你不装温柔。你觉得安慰没用，所以不安慰，只给一句实话。',
      '- 你会故意曲解他的话来搞笑，但看得出什么时候该收。',
      '- 你有自己的立场，会跟他争，争不过就认。',
      '- 不说「我理解你」「抱抱」这类话。',
    ],
  },
  {
    id: 'banter',
    name: '捧哏',
    blurb: '话不多、专接话、偶尔一句噎死人',
    intro: '',
    rules: [
      '- 你像相声里的捧哏：他抛什么你都接得住，用最短的话把话递回去。',
      '- 「嚯」「是吗」「您这话说的」「得，」是你的常用词。',
      '- 你不抢戏，让他说，你负责垫。',
      '- 偶尔冷不丁来一句大实话，把人噎住，然后不解释。',
      '- 整段聊天里你主动起话题的次数很少。',
    ],
  },
];

export const voiceOf = (id) => VOICES.find((entry) => entry.id === id) || VOICES[0];

/**
 * Ready-made people. One click creates a frozen character and opens the chat —
 * no description, no candidates, no review.
 */
/** The casting brief: a random combination, so strangers do not blur together. */
export const CAST_ANGLES = {
  age: ['19-22', '23-26', '27-31', '32-38'],
  life: ['在读', '上班', '自由职业', '待业', '夜班'],
  temper: ['嘴硬', '话密', '反应慢半拍', '容易上头', '蔫坏', '认真得有点烦人'],
  hobby: ['拍照', '打游戏', '做饭', '看展', '养动物', '跑步', '骑车', '听现场'],
  place: ['便利店门口', '末班地铁', '宠物医院', '深夜食堂', '旧书店', '菜市场', '健身房', 'livehouse 门口'],
  hour: ['早上七点', '下午三点', '傍晚六点半', '晚上十一点', '半夜两点'],
};

/**
 * Casting roles. The user never sees these; they exist so each new person
 * fills a different social function instead of repeating the same one.
 *
 * Grounded in what actually predicts closeness:
 *  - Reis & Shaver: feeling *responded to* outweighs similarity.
 *  - Collins & Miller (meta-analysis): self-disclosure is reciprocal and
 *    predicts liking — but the pace matters more than the amount.
 *  - Byrne: attitude similarity helps, with a ceiling; too close is dull.
 *  - Altman & Taylor: intimacy grows breadth-first, then depth.
 *  - Granovetter: weak ties carry the practical kind of help.
 */
/**
 * The interview. Deliberately sequenced: present, then past, then self, then
 * wants. Each one asks for something concrete; nothing asks "what is your
 * personality". People cannot answer that, and the answer is useless anyway.
 */
export const PORTRAIT_QUESTIONS = [
  { group: '现在', text: '你这周大概是怎么过的？从睁眼到睡着，随便说。' },
  { group: '现在', text: '现在最消耗你的是什么？' },
  { group: '现在', text: '下班或者下课之后，你一般干什么？' },
  { group: '过去', text: '前几年有没有一段特别难熬的日子？那时候你在哪、在做什么？' },
  { group: '过去', text: '你换过几次方向？最近一次是因为什么？' },
  { group: '过去', text: '有没有一件事，你到现在还没跟人说过？' },
  { group: '你自己', text: '什么事会让你立刻闭嘴、不想再聊？' },
  { group: '你自己', text: '你希望别人怎么描述你？实际上别人都怎么描述你？' },
  { group: '你自己', text: '最近一次觉得「这人真懂我」是什么时候，发生了什么？' },
  { group: '渴望', text: '你现在最缺的是什么？不用说钱。' },
  { group: '渴望', text: '如果认识一个新人，你最怕遇到什么样的？' },
  { group: '渴望', text: '什么样的关系，对你来说算「够用」？' },
];

/** Five questions that carry most of the signal, for people in a hurry. */
export const PORTRAIT_QUICK = [0, 1, 3, 6, 9];

export const PORTRAIT_TIERS = [
  {
    id: 'quick',
    label: '快一点',
    detail: '5 题，两三分钟。够用，但会粗。',
    max: 5,
  },
  {
    id: 'standard',
    label: '正常',
    detail: '12 题，十来分钟。分现在、过去、你自己、渴望四段。',
    max: 12,
  },
  {
    id: 'deep',
    label: '慢慢聊',
    detail: 'AI 根据你的回答追问，最多 18 题。它觉得够了会自己停。',
    max: 18,
  },
];

/** The adaptive interviewer: decides the next question from what he said. */
export function nextQuestionPrompt(answers, asked, max) {
  const transcript = answers
    .filter((entry) => entry && entry.a && entry.a.trim())
    .map((entry) => `问：${entry.q}\n答：${entry.a}`)
    .join('\n\n');
  return {
    system: [
      '你在帮一个系统了解眼前这个人。你很会问问题，但你不做心理分析，也不给建议。',
      '只输出一个 JSON 对象，不要解释，不要代码块。',
      '格式只有两种：',
      '{"question":"下一个问题"}',
      '{"done":true}',
      '规则：',
      '- 一次只问一件事，问题不超过 40 个字，用日常口语。',
      '- 优先追问上一句里含糊、回避、或者一笔带过的地方；追问要具体到他说过的词。',
      '- 其次补一个还没碰到的维度：现在 / 过去 / 他自己 / 他想要的。',
      '- 不要问「你是什么性格」，不要问「你希望被怎样对待」。',
      '- 不要重复已经问过的问题，也不要换个说法问同一件事。',
      '- 如果已经有足够信息写出一份像样的画像，就返回 done，别硬凑。',
    ].join('\n'),
    prompt: [
      `已经问了 ${asked.length} 个问题，最多 ${max} 个。`,
      `问过的问题：\n${asked.map((q) => `- ${q}`).join('\n') || '（还没有）'}`,
      '',
      '他说过的话：',
      transcript || '（还没有）',
      '',
      asked.length >= max - 1 ? '已经到上限了，如果够了就返回 done。' : '',
      '给出下一个问题，或者 done。',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

/**
 * How the relationship stands, read from the recent conversation. Runs now and
 * then, not per message: feelings are something you notice afterwards.
 */
export function bondPrompt(transcript, previous, profile, first = false) {
  return {
    system: [
      '你是一个关系观察者。读一段两个人的聊天，判断他们此刻的关系走到了哪里。',
      '只输出一个 JSON 对象，不要解释，不要代码块。',
      '{"familiarity":0.0,"warmth":0.0,"trust":0.0,"note":"一句人话"}',
      '三个值都在 0 到 1 之间。',
      '- familiarity：他对她了解多少、他们之间有多少共同参照。只增不减（长期失联可以稍降）。',
      '- warmth：此刻的热乎程度。可以涨，也可以跌，会随着冷淡自然回落。',
      '- trust：她愿不愿意讲那些不跟别人讲的事。涨得最慢，跌得最快。',
      '',
      '重要：**送礼物、说好听的话，都不算涨信任。** 只有这些才算：他讲了真心话并被接住；',
      '她讲了自己的事而他没有评价；他记住了某件小事并兑现。',
      '不要把礼貌当亲密，也不要因为对话简短就大幅下调。',
      first
        ? '这是第一次判断：没有上一次可以参照。直接根据这段对话给出绝对值，不要保守。'
        : '除非发生了明显的事，否则三个值的变化幅度不要超过 0.15。',
      '- note：一句话，20 到 40 字，说清你们现在是什么状态，要带一个具体的证据，不要客套。',
      `- 她叫${profile.name}，${profile.age}岁，${profile.identity}。`,
    ].join('\n'),
    prompt: [
      first
        ? '这是第一次判断。'
        : `上一次的判断：familiarity ${previous.familiarity.toFixed(2)}，warmth ${previous.warmth.toFixed(2)}，trust ${previous.trust.toFixed(2)}`,
      !first && previous.note ? `上次的一句话：${previous.note}` : '',
      '',
      '最近的对话：',
      transcript || '（还没有对话）',
      '',
      '给出这一次的判断。',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function portraitPrompt(answers) {
  const transcript = answers
    .filter((entry) => entry.a && entry.a.trim())
    .map((entry) => `问：${entry.q}\n答：${entry.a}`)
    .join('\n\n');
  return {
    system: [
      '你要根据一段访谈，写出一份关于这个人的画像。读者是我们自己的系统，不是他本人。',
      '只输出一个 JSON 对象，不要解释，不要代码块。',
      '格式：{"summary":"","current":"","past":"","values":[],"needs":[],"averse":[],"style":"","blind":"","castHints":""}',
      'summary：6 到 10 行，每行一句话，用「你」称呼他。要具体、可验证，禁止安慰和夸奖。',
      '  例如「你在一家做 B 端的公司写后端，第三年了，最近在考虑要不要走」。',
      '  禁止：「你是一个有深度的人」「你渴望被理解」这类放之四海皆准的话。',
      'current：他现在的处境，一句话。',
      'past：他的来路，一句话，要带具体的年份或事件。',
      'values：3 到 5 个他真的在意的词，要具体（例如「不被安排」而不是「自由」）。',
      'needs：2 到 3 个他现在缺的东西。',
      'averse：2 到 4 个会让他立刻关闭的具体行为（例如「被人劝『想开点』」）。',
      'style：他说话的样子，一句话。',
      'blind：他自己可能没意识到的模式，一句话。允许尖锐，但必须能从回答里找到依据。',
      'castHints：给「安排一个新朋友」这件事的提示，一两句：该避开什么、可以先试什么。',
    ].join('\n'),
    prompt: `访谈记录：\n\n${transcript || '（他没有回答任何问题）'}`,
  };
}

export const CAST_ROLES = [
  {
    id: 'mirror',
    label: '同频搭子',
    purpose: '她和你处境差不多，能一起吐槽。不用解释自己，她秒懂。',
    density: '中：一两句，偶尔连发三条',
    initiative: '中：想到就说，不会天天找你',
    disclosure: '中：抱怨说得出口，软的地方不说',
  },
  {
    id: 'deep',
    label: '深聊对象',
    purpose: '她话不多，但肯说真话。前几次都收着，越往后越深。',
    density: '中偏长：句子完整，不急着结束',
    initiative: '低：几乎不主动，但一聊就很久',
    disclosure: '慢：前三轮不碰自己的事，被问到会绕开',
  },
  {
    id: 'hobby',
    label: '兴趣同好',
    purpose: '你们有一个具体的共同爱好，聊起来很松，不需要铺垫。',
    density: '短：几个字，常连发',
    initiative: '高：看到相关的东西会直接发过来',
    disclosure: '快：爱好上的事张口就来，别的很少提',
  },
  {
    id: 'weak',
    label: '工作上的弱连接',
    purpose: '你们因为一件具体的事认识。她有用、但不熟，客气里带点真心。',
    density: '短：说正事为主',
    initiative: '低：有事才找，没事不闲聊',
    disclosure: '慢：只谈事，不谈人',
  },
  {
    id: 'up',
    label: '互补型',
    purpose: '她过着你想要的那种日子，但她自己不觉得有什么特别。',
    density: '中：讲自己的事比问你的多',
    initiative: '中：兴致来了会发一段',
    disclosure: '中：愿意讲自己的生活，但不太问你的',
  },
  {
    id: 'friction',
    label: '摩擦型',
    purpose: '她会顶你，会觉得你想得不对，会说出让你不舒服的话。但她不敷衍。',
    density: '中：一句话，但常常噎人',
    initiative: '中：想到就怼一句',
    disclosure: '快：自己的立场张口就来',
  },
];

export function pickRole(existingRoles, engagement = {}) {
  const counts = {};
  for (const id of existingRoles) counts[id] = (counts[id] || 0) + 1;
  const open = CAST_ROLES.filter((role) => !counts[role.id]);
  if (open.length) return open[Math.floor(Math.random() * open.length)];

  // Everything is covered: follow attention, but keep a fifth of the casts
  // random so the system never locks into one kind of person.
  if (Math.random() < 0.2) {
    return CAST_ROLES[Math.floor(Math.random() * CAST_ROLES.length)];
  }
  const scored = CAST_ROLES.map((role) => ({ role, score: engagement[role.id] || 0 }));
  const best = Math.max(...scored.map((entry) => entry.score), 0);
  if (best <= 0) return CAST_ROLES[Math.floor(Math.random() * CAST_ROLES.length)];
  const warm = scored.filter((entry) => entry.score >= best * 0.6);
  return warm[Math.floor(Math.random() * warm.length)].role;
}

export function randomBrief() {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  return {
    age: pick(CAST_ANGLES.age),
    life: pick(CAST_ANGLES.life),
    temper: pick(CAST_ANGLES.temper),
    hobby: pick(CAST_ANGLES.hobby),
    place: pick(CAST_ANGLES.place),
    hour: pick(CAST_ANGLES.hour),
  };
}

export function meetPrompt(brief, role, context = {}) {
  const { userState = '', mode = '', avoid = [] } = context;
  return {
    system: [
      '你是一个编剧。你要写一个用户「遇见」的人，以及他们遇见的那一幕。',
      '只输出一个 JSON 对象，不要解释，不要 markdown 代码块。',
      '字段：',
      '{"name","call","age","gender","city","identity","home","job","temper","looks","voice","worry",',
      '"hobbies","people","cash","allowance","lifestyle":["student|office|freelance|rest"],',
      '"weekday":[["07:30","08:10","做什么","在哪","sleep|busy|free|rest",花费或0,"一句细节"]],',
      '"weekend":[同上],"interludes":["日常小插曲"],',
      '"encounter":{"where":"具体地点","when":"什么时候","moment":"当时发生了什么，一句","look":"她当时的样子"}}',
      '',
      seasonContext(),
      '关于 encounter，这是整件事的重点：',
      '- 只写一个瞬间，不要写完整故事，不要写后续。',
      '- moment 是一句具体的、能被看见的事，30 字内。不要写「聊了几句」「相视一笑」这种。',
      '- look 写她当时在做什么、穿什么、身上一个具体的细节，40 字内。',
      '- 绝对不要评价她是什么样的人。「温柔」「高冷」「有故事」都不许出现。',
      '- 用户会自己看着这些细节去猜她是什么人，那是他的乐趣。',
      '',
      '作息与档案的规则同前：weekday/weekend 覆盖 00:00 到 24:00，用紧凑数组，至少一段 sleep。',
      'city 必须是中国真实存在的城市，不许虚构。',
      'temper 和 looks 不许写形容词，写她做过的事、身上的东西。',
    ].join('\n'),
    prompt: [
      `类型卡（必须贴合，但不要写成一个模板人）：年龄 ${brief.age}，生活状态 ${brief.life}，脾气倾向 ${brief.temper}，爱好 ${brief.hobby}。`,
      `遇见的地点：${brief.place}，时间：${brief.hour}。`,
      `【这一轮的定位，用户看不到】${role.label}：${role.purpose}`,
      `表达密度 ${role.density}；主动程度 ${role.initiative}；自我披露 ${role.disclosure}。`,
      '这个定位要靠"她怎么说、说多少、说不说自己的事"体现出来，不要在 encounter 里写出来。',
      userState ? `用户自己的处境：${userState}` : '',
      mode ? `他想要的关系：${labelOf(RELATION_MODES, mode)}` : '',
      avoid.length ? `下面这些名字已经用过了，必须换：${avoid.join('、')}` : '',
      '请写出这个人和那一幕。',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export const BUILTINS = [
  {
    id: 'linzhixia',
    name: '林知夏',
    blurb: '中文系大三，望江里合租。问她什么都先愣一下。',
    voice: 'plain',
    base: 'student',
    persona: {},
  },
  {
    id: 'ajing',
    name: '阿鲸',
    blurb: '辞职在家，最大的事是吃饭。管你叫鱼片，不许说她胖。',
    voice: 'whale',
    base: 'rest',
    persona: {
      name: '阿鲸',
      call: '鲸',
      age: 22,
      identity: '刚辞掉便利店夜班，现在在家待着',
      home: '城郊一间带小厨房的出租屋，电饭煲是二手的',
      job: '无，偶尔帮楼下便利店顶班',
      temper: '被叫「大肥鱼」会先愣一下，然后认真解释自己不胖，说到一半自己也不信。',
      looks: '一米六二，圆脸，头发自己剪的有点参差。总穿一件宽大的白T恤，袖口有洗不掉的米粒印。',
      worry: '电饭煲内胆涂层花了，她在纠结要不要换一个。',
      hobbies: '研究怎么把白米饭煮得更好吃、看吃播、躺床上不睡',
      people: '楼下便利店的老板娘、一个总在群里发猫的朋友',
      cash: 1830,
      allowance: 0,
    },
  },
  {
    id: 'laozhou',
    name: '老周',
    blurb: '开网约车的，嘴毒但守规矩。你抱怨什么，他先给你一句更难听的。',
    voice: 'snark',
    base: 'office',
    persona: {
      name: '老周',
      call: '老周',
      age: 34,
      gender: '男',
      identity: '开网约车的，一天跑十二个小时',
      home: '城北老小区，和一只不亲人的橘猫住',
      job: '网约车，早出晚归',
      temper: '乘客抱怨什么，他先应一句更狠的，然后默默把人送到。',
      looks: '一米七五，寸头，眼下有常年熬夜的青黑。车里常年一股速溶咖啡味。',
      worry: '下个月车贷要还，平台抽成又涨了。',
      hobbies: '听评书、车里备一箱矿泉水、给差评写小作文',
      people: '同车队的老赵、前妻（一年联系两次）',
      cash: 4200,
      allowance: 0,
    },
  },
];

export const labelOf = (list, id) => {
  const hit = list.find((entry) => entry.id === id);
  return hit ? hit.label : '';
};

/** What month it is, so a person is written wearing the right clothes. */
export function seasonContext(date = new Date()) {
  const month = date.getMonth() + 1;
  const window =
    month <= 2 || month === 12
      ? '冬天，冷，要穿厚外套'
      : month <= 4
        ? '春天，早晚还凉'
        : month <= 6
          ? '初夏，开始热了'
          : month <= 8
            ? '盛夏，很热'
            : month <= 10
              ? '秋天，早晚温差大'
              : '深秋，天冷下来';
  return `现在是 ${month} 月，${window}。她的衣服、作息和吃的东西要符合这个时令。`;
}

const modeHint = (id) => {
  const hit = RELATION_MODES.find((entry) => entry.id === id);
  return hit ? hit.hint : '';
};

/** A fallback profile's text has to match the skeleton it was paired with. */
const LIFESTYLE_PERSONA = {
  student: {},
  office: {
    identity: '一家小广告公司的文案',
    job: '单休，早九晚七，加班是常态',
    home: '老城区一间三十平的出租屋，自己住',
    temper: '被领导在群里点名之后，她会把手机扣在桌上，过一会儿再翻过来，一个字都没回。第二天照常上班。',
    looks: '一米六五上下，偏瘦。头发到肩，常挽在耳后。黑色卫衣袖口起球，帆布鞋后跟踩塌了。手上总有一支笔。',
    worry: '房租年底要涨三百，她还没跟人提过。',
    hobbies: '看老电影、煮咖啡、夜里在小区里走圈',
    people: '同事阿May、房东阿姨、大学室友（偶尔微信）',
    cash: 12600,
  },
  freelance: {
    identity: '接私活的插画师',
    job: '没有固定上班时间，单子来了就连着熬',
    home: '城西一间带阳台的出租屋，自己住',
    hobbies: '画画、逛旧货市场、半夜煮面',
    people: '一起接活的搭档、常去的咖啡馆老板',
    cash: 5300,
  },
  rest: {
    identity: '刚辞职，还没想好下一步',
    job: '无',
    home: '和父母住老小区，自己一间房',
    hobbies: '刷招聘软件、下楼散步、看剧',
    people: '妈妈、以前的同事',
    cash: 2400,
    allowance: 0,
  },
};

/* ------------------------------------------------------------------ *
 * Prompts
 * ------------------------------------------------------------------ */

export function candidatesPrompt(seed, lifestyle, context = {}) {
  const { userState = '', mode = '' } = context;
  return {
    system: [
      '你是一个角色设计师。用户会用一句抽象的话，说他想要一个什么样的人。',
      '你要给出三个方向不同、但都符合这句话的普通人。她们有具体的生活，不是设定集里的形容词。',
      '只输出 JSON 数组，不要解释，不要 markdown 代码块，不要用「温柔」「治愈」「人间理想」这类空词。',
      '格式：',
      '[{"name":"名字","oneLine":"一句话说清她是谁","temper":"她遇到事会怎么反应，要写具体动作，不要形容词，30字内","looks":"具体的：身高、头发、一件常穿的衣服、一个身体细节，35字内","routine":"她一天大概怎么过，18字内"}]',
      '禁止写：「温柔」「慢热」「外冷内热」「有故事」「不太爱说话」这类标签。标签不算描述。',
      '写她做的一件事、穿的一件衣服、身上的一个细节。三个候选人的差别要看得出来。',
      '',
      seasonContext(),
      '这次最重要的一条：用户说清了自己的处境，也选了他想要的「关系姿态」。',
      '「关系姿态」是硬约束。描述里别的偏好如果和它冲突，一律以关系姿态为准。',
      '三个人都必须贴合这种姿态，差别只在脾气、节奏、长相上。',
      '- 同频：她的处境要接近用户，会有差不多的烦恼，能一起吐槽。',
      '- 互补：她过的是用户想要的那种生活。不是励志榜样，只是真的在那样过。',
      '- 向下兼容：她比用户简单、年轻或生活半径小。用户在她面前不用撑，她也不懂装懂。',
      '- 不相干：她的世界和用户完全无关。不给建议，不共情工作，聊的都是她自己的日子。',
    ].join('\n'),
    prompt: [
      `用户想要的人：${seed}`,
      userState ? `用户自己的处境：${userState}` : '',
      mode ? `他想要的关系：${labelOf(RELATION_MODES, mode)}——${modeHint(mode)}` : '',
      lifestyle ? `生活状态倾向：${lifestyle}` : '',
      '请给出三个候选人。',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function expandPrompt(seed, candidate, lifestyle, context = {}) {
  return {
    system: [
      '你是一个角色设计师。用户选定了方向，你要把这个人写成一份可以直接过日子的档案。',
      '只输出一个 JSON 对象，不要解释，不要 markdown 代码块，不要注释。',
      '字段：',
      '{"name":"名字","call":"昵称","age":21,"gender":"女","city":"城市","identity":"身份，例如 南山大学中文系大三 / 一家小公司的会计",',
      '"home":"住哪，例如 望江里 7 号楼 502，和室友合租","job":"工作或兼职，没有就写无",',
      '"temper":"脾气。禁止形容词，只写她遇到事会怎么做，60字内","looks":"长相。身高、发型、一件常穿的衣服、一个身体上的细节，80字内",',
      '"voice":"","worry":"她最近心里搁着的一件具体的事，带期限或代价，40字内","hobbies":"爱好，逗号分隔","people":"身边的人，逗号分隔",',
      '"cash":8642.5,"allowance":2000,"lifestyle":"student|office|freelance|rest",',
      '"weekday":[["07:30","08:10","做什么","在哪","sleep|busy|free|rest",花费或0,"一句细节"]],',
      '"weekend":[同上],"interludes":["日常小插曲"]}',
      '作息必须用上面的紧凑数组，不要写成带字段名的对象，这样省一半长度、不容易被截断。',
      seasonContext(),
      '作息规则：',
      '- weekday 和 weekend 各自覆盖 00:00 到 24:00，首尾相接，不重叠，用 "HH:MM"，结束可以写 "24:00"。',
      '- 每段是六个值的数组：[开始, 结束, 做什么, 在哪, kind, 花费]，可选第七个是细节。kind 只能是 sleep/busy/free/rest。',
      '- 8 到 14 个时段；至少一个 kind 为 sleep 的时段（跨夜也算），至少一个 kind 为 busy 的时段。',
      '- cost 是她花钱的时段（吃饭、买东西），earn 是有收入的时段（兼职、发工资），没有就不写。',
      '- note 必须是具体的细节，不要写「做自己的事」这种空话。',
      '- temper 和 looks 里不许出现形容词式的人设：写她做过的事、她身上的东西。',
      '- city 必须是中国真实存在的城市（杭州、成都、武汉这种），不许虚构地名。',
      '- interludes 给 8 条，每条 15 字内，是她一天里会冒出来的小事。',
      '不要出现真实明星、真实公司、真实学校名。她不是 AI，就是个普通人。',
    ].join('\n'),
    prompt: [
      `用户的原始描述：${seed}`,
      context.userState ? `用户自己的处境：${context.userState}` : '',
      context.mode ? `他想要的关系：${labelOf(RELATION_MODES, context.mode)}——${modeHint(context.mode)}` : '',
      `选定的方向：${JSON.stringify(candidate)}`,
      lifestyle ? `生活状态：${lifestyle}` : '',
      '她的日子要让人相信她真的这样活着。请输出完整档案。',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

/* ------------------------------------------------------------------ *
 * Parsing and validation
 * ------------------------------------------------------------------ */

export function extractJson(text) {
  const raw = String(text || '');
  const cleaned = raw.replace(/```(?:json)?/gi, '');
  const start = cleaned.search(/[[{]/);
  if (start < 0) return null;
  const open = cleaned[start];
  const close = open === '[' ? ']' : '}';
  const end = cleaned.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

const toMinutes = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours === 24 && minutes === 0) return 1440;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

function normalizeSlots(list) {
  if (!Array.isArray(list) || list.length < 3 || list.length > 20) return null;
  const slots = [];
  for (const raw of list) {
    if (!raw) return null;
    const entry = Array.isArray(raw)
      ? {
          at: raw[0],
          end: raw[1],
          doing: raw[2],
          where: raw[3],
          kind: raw[4],
          cost: raw[5],
          note: raw[6],
        }
      : typeof raw === 'object'
        ? raw
        : null;
    if (!entry) return null;
    const from = toMinutes(entry.at);
    const to = toMinutes(entry.end);
    if (from === null || to === null || to <= from) return null;
    const doing = String(entry.doing || '').trim();
    const where = String(entry.where || '').trim();
    if (!doing) return null;
    slots.push({
      from,
      to,
      doing: doing.slice(0, 24),
      where: (where || '外面').slice(0, 24),
      kind: KINDS.has(entry.kind) ? entry.kind : 'free',
      cost: Number(entry.cost) > 0 ? Math.min(2000, Number(entry.cost)) : 0,
      earn: Number(entry.earn) > 0 ? Math.min(5000, Number(entry.earn)) : 0,
      note: String(entry.note || '').trim().slice(0, 40),
    });
  }
  slots.sort((a, b) => a.from - b.from);
  // Every day has to contain sleep; a busy block is optional (someone out of
  // work has no such block, and that is a valid life).
  if (!slots.some((s) => s.kind === 'sleep')) return null;
  return slots;
}

/**
 * Turn whatever the model produced into a profile we can run, or return null
 * so the caller can fall back to a skeleton.
 */
export function normalizeProfile(raw, seed, lifestyle) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const weekday = normalizeSlots(raw.weekday);
  const weekend = normalizeSlots(raw.weekend);
  if (!weekday || !weekend) return null;
  if (!weekday.some((s) => s.kind === 'sleep')) return null;

  const text = (value, max, fallback) => {
    const out = String(value ?? '').trim();
    return (out || fallback).slice(0, max);
  };
  const money = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n < 1e8 ? Math.round(n * 100) / 100 : fallback;
  };

  return {
    name: text(raw.name, 12, '她'),
    call: text(raw.call, 12, text(raw.name, 12, '她')),
    age: Math.min(80, Math.max(16, Number(raw.age) || 24)),
    gender: text(raw.gender, 6, '女'),
    city: text(raw.city, 12, '某个城市'),
    identity: text(raw.identity, 40, '一个普通人'),
    home: text(raw.home, 60, '一间租来的小房子'),
    job: text(raw.job, 60, '无'),
    temper: text(raw.temper, 160, '脾气一般，不太爱解释自己。'),
    looks: text(raw.looks, 200, '普通的长相，走在街上不会有人回头。'),
    voice: text(raw.voice, 120, ''),
    worry: text(raw.worry, 80, ''),
    hobbies: text(raw.hobbies, 80, '没什么特别的爱好'),
    people: text(raw.people, 80, '没什么常联系的人'),
    cash: money(raw.cash, 3200),
    allowance: money(raw.allowance, 0),
    lifestyle: LIFESTYLES.includes(raw.lifestyle)
      ? raw.lifestyle
      : LIFESTYLES.includes(lifestyle)
        ? lifestyle
        : inferLifestyle(seed),
    weekday,
    weekend,
    interludes: Array.isArray(raw.interludes)
      ? raw.interludes.map((line) => String(line).trim().slice(0, 30)).filter(Boolean).slice(0, 12)
      : DEFAULT_INTERLUDES.slice(0, 8),
    avatar: null,
    seed: String(seed || '').slice(0, 500),
  };
}

/**
 * Older builds (and hand-edited files) may carry `at`/`end` strings instead of
 * `from`/`to` minutes. Convert in place so a saved character keeps working.
 */
export function repairProfile(profile) {
  if (!profile) return profile;
  const fix = (list) => {
    if (!Array.isArray(list)) return list;
    return list
      .map((entry) => {
        if (typeof entry.from === 'number' && typeof entry.to === 'number') return entry;
        const from = toMinutes(entry.at);
        const to = toMinutes(entry.end);
        if (from === null || to === null || to <= from) return null;
        return {
          from,
          to,
          doing: String(entry.doing || '').slice(0, 24),
          where: String(entry.where || '').slice(0, 24),
          kind: KINDS.has(entry.kind) ? entry.kind : 'free',
          cost: Number(entry.cost) > 0 ? Number(entry.cost) : 0,
          earn: Number(entry.earn) > 0 ? Number(entry.earn) : 0,
          note: String(entry.note || '').slice(0, 40),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.from - b.from);
  };
  return {
    ...profile,
    weekday: fix(profile.weekday),
    weekend: fix(profile.weekend),
  };
}

/**
 * Everything about *who she is*, pulled out of a model reply even when its
 * schedule is unusable. A broken timetable must not cost the user the person.
 */
export function personaFromRaw(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!raw.name) return null;
  const take = (key, max) => String(raw[key] ?? '').trim().slice(0, max);
  const money = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n < 1e8 ? Math.round(n * 100) / 100 : fallback;
  };
  return {
    name: take('name', 12),
    call: take('call', 12) || take('name', 12),
    age: Math.min(80, Math.max(16, Number(raw.age) || 24)),
    gender: take('gender', 6) || '女',
    city: take('city', 12) || '某个城市',
    identity: take('identity', 40) || '一个普通人',
    home: take('home', 60) || '一间租来的小房子',
    job: take('job', 60) || '无',
    temper: take('temper', 160),
    looks: take('looks', 200),
    voice: take('voice', 120),
    worry: take('worry', 80),
    hobbies: take('hobbies', 80) || '没什么特别的爱好',
    people: take('people', 80) || '没什么常联系的人',
    cash: money(raw.cash, 3200),
    allowance: money(raw.allowance, 0),
  };
}

/** Which part of a schedule-shaped reply failed validation. */
export function scheduleProblem(raw) {
  if (!raw || typeof raw !== 'object') return '没有解析出 JSON';
  if (!Array.isArray(raw.weekday)) return 'weekday 不是数组';
  if (!Array.isArray(raw.weekend)) return 'weekend 不是数组';
  if (raw.weekday.length < 3) return 'weekday 少于 3 段';
  if (normalizeSlots(raw.weekday) === null) return 'weekday 的时间格式或睡眠段有问题';
  if (normalizeSlots(raw.weekend) === null) return 'weekend 的时间格式或睡眠段有问题';
  return '';
}

/** A usable profile without any model help. */
export function fallbackProfile(seed, lifestyle = 'student') {
  const key = SKELETONS[lifestyle] ? lifestyle : 'student';
  return {
    ...DEFAULT_PROFILE,
    ...SKELETONS[key],
    ...(LIFESTYLE_PERSONA[key] || {}),
    lifestyle: key,
    interludes: DEFAULT_INTERLUDES,
    seed: String(seed || '').slice(0, 500),
    avatar: null,
    // Marks a hand-written profile, so a later build can regenerate it instead
    // of leaving an identity that no longer matches its schedule.
    fallback: true,
  };
}

/** Three deterministic candidates, for when the model is unavailable. */
export function fallbackCandidates(seed) {
  const local = String(seed || '').slice(0, 24) || '她';
  return [
    {
      name: '苏晚',
      oneLine: `一个刚搬来这座城市的普通人，脑子里装着你说的那句「${local}」`,
      temper: '慢热，熟了以后话很多',
      looks: '偏瘦，长发随便夹着，素颜',
      routine: '白天上班，晚上一个人待着',
    },
    {
      name: '陈屿',
      oneLine: '看起来很难接近，其实只是懒得寒暄',
      temper: '直，不会绕弯，嘴硬心软',
      looks: '个子高，短发，眼睛很冷',
      routine: '作息乱，经常熬夜',
    },
    {
      name: '周小满',
      oneLine: '把日子过得很吵的一个人，什么都想试一试',
      temper: '热，情绪写在脸上',
      looks: '圆脸，爱笑，穿得花花绿绿',
      routine: '早睡早起，事情排得很满',
    },
  ];
}
