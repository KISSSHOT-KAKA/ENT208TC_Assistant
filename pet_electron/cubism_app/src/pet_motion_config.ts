export type PetTransportState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'unknown';

export type PetIntent =
  | 'greeting'
  | 'question'
  | 'positive'
  | 'negative'
  | 'dance'
  | 'sleep'
  | 'neutral';

export type PetEmotion =
  | 'happy'
  | 'calm'
  | 'curious'
  | 'sad'
  | 'excited'
  | 'error'
  | 'neutral';

export type PetPosePreset =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'quiet'
  | 'error';

export interface PetRichSignal {
  intent?: PetIntent | string;
  emotion?: PetEmotion | string;
  energy?: number;
}

export const MOTION_COOLDOWNS = {
  idleVariantMs: 4200,
  tapReactionMs: 1000,
  speakingWindowMs: 1400,
  intentAccentMs: 1300,
  wakeAccentMs: 1400
} as const;

export const INTENT_PRIORITY: PetIntent[] = [
  'dance',
  'greeting',
  'positive',
  'negative',
  'question',
  'sleep'
];

export const INTENT_KEYWORDS: Record<Exclude<PetIntent, 'neutral'>, string[]> = {
  greeting: ['你好', '早安', '晚安', '嗨', 'hi', 'hello'],
  question: ['?', '？', '为什么', '怎么', '是否', '吗', '呢'],
  positive: ['好', '喜欢', '开心', '可以', '太棒了', '真棒', '不错', '厉害'],
  negative: ['不行', '失败', '错误', '糟糕', '抱歉', '不好', '麻烦'],
  dance: ['跳舞', '唱歌', '表演', '动一动', '来一段', '摇摆', '秀一下'],
  sleep: ['睡觉', '晚安', '安静', '休息', '睡吧', '困']
};

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeIntent(value?: string | null): PetIntent {
  const intent = String(value || 'neutral').toLowerCase();
  if (
    intent === 'greeting' ||
    intent === 'question' ||
    intent === 'positive' ||
    intent === 'negative' ||
    intent === 'dance' ||
    intent === 'sleep'
  ) {
    return intent;
  }
  return 'neutral';
}

export function normalizeEmotion(value?: string | null): PetEmotion {
  const emotion = String(value || 'neutral').toLowerCase();
  if (
    emotion === 'happy' ||
    emotion === 'calm' ||
    emotion === 'curious' ||
    emotion === 'sad' ||
    emotion === 'excited' ||
    emotion === 'error'
  ) {
    return emotion;
  }
  return 'neutral';
}

export function inferIntentFromText(text?: string | null): PetIntent {
  const source = String(text || '').toLowerCase();
  if (!source) {
    return 'neutral';
  }

  for (const intent of INTENT_PRIORITY) {
    const keywords = INTENT_KEYWORDS[intent as Exclude<PetIntent, 'neutral'>];
    const matched = keywords.some((keyword: string) =>
      source.includes(keyword.toLowerCase())
    );
    if (matched) {
      return intent;
    }
  }

  return 'neutral';
}

export function emotionFromIntent(intent: PetIntent): PetEmotion {
  switch (intent) {
    case 'greeting':
      return 'happy';
    case 'question':
      return 'curious';
    case 'positive':
      return 'happy';
    case 'negative':
      return 'sad';
    case 'dance':
      return 'excited';
    case 'sleep':
      return 'calm';
    default:
      return 'neutral';
  }
}

export function transportStateToPose(
  state: PetTransportState,
  fallbackError = false
): PetPosePreset {
  switch (state) {
    case 'idle':
      return 'idle';
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    default:
      return fallbackError ? 'error' : 'quiet';
  }
}
