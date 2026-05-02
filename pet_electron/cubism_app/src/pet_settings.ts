export type PetPersonaStyle = 'playful' | 'gentle' | 'calm' | 'energetic';
export type PetNotificationStyle = 'companion' | 'productivity';
export type PetLanguage = 'zh-CN' | 'en';
export type PetDisplayLanguageMode =
  | 'ui-only-bilingual'
  | 'prefer-english-demo';
export type PetChatDockState = 'collapsed' | 'peek' | 'expanded';
export type PetUtilityTab = 'status' | 'focus' | 'tools';

export interface PetSettings {
  assistantName: string;
  userName: string;
  wsUrl: string;
  personaStyle: PetPersonaStyle;
  speakingEnergy: number;
  idleEnergy: number;
  accentEnergy: number;
  autoGreeting: boolean;
  lowDisturbMode: boolean;
  notificationStyle: PetNotificationStyle;
  enableSystemCard: boolean;
  enableSedentaryReminder: boolean;
  enablePomodoro: boolean;
  enableNetworkReminder: boolean;
  pomodoroMinutes: number;
  language: PetLanguage;
  displayLanguageMode: PetDisplayLanguageMode;
  defaultChatDockState: PetChatDockState;
  defaultUtilityTab: PetUtilityTab;
}

const SETTINGS_KEY = 'ENT_PET_SETTINGS_V1';
const LEGACY_WS_KEY = 'ENT_WS_URL';
const DEFAULT_WS = 'ws://192.168.133.140:8770';

export function getDefaultPetSettings(): PetSettings {
  return {
    assistantName: '小闪',
    userName: '主人',
    wsUrl: DEFAULT_WS,
    personaStyle: 'playful',
    speakingEnergy: 0.82,
    idleEnergy: 0.58,
    accentEnergy: 0.78,
    autoGreeting: true,
    lowDisturbMode: true,
    notificationStyle: 'companion',
    enableSystemCard: true,
    enableSedentaryReminder: true,
    enablePomodoro: true,
    enableNetworkReminder: true,
    pomodoroMinutes: 25,
    language: 'zh-CN',
    displayLanguageMode: 'prefer-english-demo',
    defaultChatDockState: 'peek',
    defaultUtilityTab: 'status'
  };
}

export function loadPetSettings(): PetSettings {
  const defaults = getDefaultPetSettings();
  const raw = localStorage.getItem(SETTINGS_KEY);
  const legacyWsUrl = localStorage.getItem(LEGACY_WS_KEY);

  if (!raw) {
    return {
      ...defaults,
      wsUrl: legacyWsUrl || defaults.wsUrl
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PetSettings>;
    return sanitizeSettings({
      ...defaults,
      ...parsed,
      wsUrl: parsed.wsUrl || legacyWsUrl || defaults.wsUrl
    });
  } catch {
    return {
      ...defaults,
      wsUrl: legacyWsUrl || defaults.wsUrl
    };
  }
}

export function savePetSettings(settings: PetSettings): PetSettings {
  const sanitized = sanitizeSettings(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitized));
  localStorage.setItem(LEGACY_WS_KEY, sanitized.wsUrl);
  return sanitized;
}

export function sanitizeSettings(settings: Partial<PetSettings>): PetSettings {
  const defaults = getDefaultPetSettings();

  return {
    assistantName:
      String(settings.assistantName || defaults.assistantName).trim() ||
      defaults.assistantName,
    userName:
      String(settings.userName || defaults.userName).trim() ||
      defaults.userName,
    wsUrl: String(settings.wsUrl || defaults.wsUrl).trim() || defaults.wsUrl,
    personaStyle: normalizePersonaStyle(settings.personaStyle),
    speakingEnergy: clampNumber(
      settings.speakingEnergy,
      defaults.speakingEnergy,
      0.2,
      1
    ),
    idleEnergy: clampNumber(settings.idleEnergy, defaults.idleEnergy, 0.1, 1),
    accentEnergy: clampNumber(
      settings.accentEnergy,
      defaults.accentEnergy,
      0.1,
      1
    ),
    autoGreeting:
      typeof settings.autoGreeting === 'boolean'
        ? settings.autoGreeting
        : defaults.autoGreeting,
    lowDisturbMode:
      typeof settings.lowDisturbMode === 'boolean'
        ? settings.lowDisturbMode
        : defaults.lowDisturbMode,
    notificationStyle: normalizeNotificationStyle(settings.notificationStyle),
    enableSystemCard:
      typeof settings.enableSystemCard === 'boolean'
        ? settings.enableSystemCard
        : defaults.enableSystemCard,
    enableSedentaryReminder:
      typeof settings.enableSedentaryReminder === 'boolean'
        ? settings.enableSedentaryReminder
        : defaults.enableSedentaryReminder,
    enablePomodoro:
      typeof settings.enablePomodoro === 'boolean'
        ? settings.enablePomodoro
        : defaults.enablePomodoro,
    enableNetworkReminder:
      typeof settings.enableNetworkReminder === 'boolean'
        ? settings.enableNetworkReminder
        : defaults.enableNetworkReminder,
    pomodoroMinutes: clampNumber(
      settings.pomodoroMinutes,
      defaults.pomodoroMinutes,
      5,
      90
    ),
    language: normalizeLanguage(settings.language),
    displayLanguageMode: normalizeDisplayLanguageMode(
      settings.displayLanguageMode
    ),
    defaultChatDockState: normalizeChatDockState(
      settings.defaultChatDockState
    ),
    defaultUtilityTab: normalizeUtilityTab(settings.defaultUtilityTab)
  };
}

function normalizePersonaStyle(
  value?: PetSettings['personaStyle']
): PetPersonaStyle {
  if (
    value === 'playful' ||
    value === 'gentle' ||
    value === 'calm' ||
    value === 'energetic'
  ) {
    return value;
  }

  return getDefaultPetSettings().personaStyle;
}

function normalizeNotificationStyle(
  value?: PetSettings['notificationStyle']
): PetNotificationStyle {
  if (value === 'companion' || value === 'productivity') {
    return value;
  }

  return getDefaultPetSettings().notificationStyle;
}

function normalizeLanguage(value?: PetSettings['language']): PetLanguage {
  if (value === 'zh-CN' || value === 'en') {
    return value;
  }

  return getDefaultPetSettings().language;
}

function normalizeDisplayLanguageMode(
  value?: PetSettings['displayLanguageMode']
): PetDisplayLanguageMode {
  if (value === 'ui-only-bilingual' || value === 'prefer-english-demo') {
    return value;
  }

  return getDefaultPetSettings().displayLanguageMode;
}

function normalizeChatDockState(
  value?: PetSettings['defaultChatDockState']
): PetChatDockState {
  if (value === 'collapsed' || value === 'peek' || value === 'expanded') {
    return value;
  }

  return getDefaultPetSettings().defaultChatDockState;
}

function normalizeUtilityTab(
  value?: PetSettings['defaultUtilityTab']
): PetUtilityTab {
  if (value === 'status' || value === 'focus' || value === 'tools') {
    return value;
  }

  return getDefaultPetSettings().defaultUtilityTab;
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}
