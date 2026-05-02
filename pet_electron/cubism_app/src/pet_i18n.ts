import {
  PetChatDockState,
  PetDisplayLanguageMode,
  PetLanguage,
  PetNotificationStyle,
  PetPersonaStyle,
  PetUtilityTab
} from './pet_settings';

type UiKey =
  | 'appTitle'
  | 'appSubtitle'
  | 'headerTag'
  | 'connConnected'
  | 'connConnecting'
  | 'stateLabel'
  | 'modeLabel'
  | 'modeQuiet'
  | 'modeNormal'
  | 'settingsButton'
  | 'languageZh'
  | 'languageEn'
  | 'wsPlaceholder'
  | 'saveReconnect'
  | 'modelHint'
  | 'utilityStatus'
  | 'utilityFocus'
  | 'utilityTools'
  | 'petPanelLabel'
  | 'statusCardTitle'
  | 'cpu'
  | 'memory'
  | 'network'
  | 'battery'
  | 'online'
  | 'offline'
  | 'unavailable'
  | 'chargingSuffix'
  | 'notificationStyleLabel'
  | 'windowModeLabel'
  | 'toolsPlaceholderTitle'
  | 'toolsPlaceholderBody'
  | 'pomodoroTitle'
  | 'pomodoroReady'
  | 'pomodoroRunning'
  | 'pomodoroDisabled'
  | 'pomodoroStart'
  | 'pomodoroPause'
  | 'pomodoroResume'
  | 'pomodoroReset'
  | 'chatTitle'
  | 'chatSubtitle'
  | 'chatCollapsed'
  | 'chatPeek'
  | 'chatExpanded'
  | 'settingsTitle'
  | 'settingsClose'
  | 'settingsSave'
  | 'settingsReset'
  | 'groupProfile'
  | 'groupBehavior'
  | 'groupNotifications'
  | 'groupWorkspace'
  | 'assistantName'
  | 'assistantNameHelp'
  | 'userName'
  | 'userNameHelp'
  | 'settingsWsUrl'
  | 'settingsWsUrlHelp'
  | 'language'
  | 'languageHelp'
  | 'displayLanguageMode'
  | 'displayLanguageModeHelp'
  | 'personaStyle'
  | 'personaStyleHelp'
  | 'speakingEnergy'
  | 'idleEnergy'
  | 'accentEnergy'
  | 'notificationStyle'
  | 'notificationStyleHelp'
  | 'autoGreeting'
  | 'autoGreetingHelp'
  | 'lowDisturbMode'
  | 'lowDisturbModeHelp'
  | 'enableSystemCard'
  | 'enableSystemCardHelp'
  | 'enableSedentaryReminder'
  | 'enableSedentaryReminderHelp'
  | 'enablePomodoro'
  | 'enablePomodoroHelp'
  | 'enableNetworkReminder'
  | 'enableNetworkReminderHelp'
  | 'pomodoroMinutes'
  | 'defaultChatDockState'
  | 'defaultChatDockStateHelp'
  | 'defaultUtilityTab'
  | 'defaultUtilityTabHelp'
  | 'notificationCompanion'
  | 'notificationProductivity'
  | 'displayUiOnlyBilingual'
  | 'displayPreferEnglishDemo'
  | 'backendLanguageNotice'
  | 'personaPlayful'
  | 'personaGentle'
  | 'personaCalm'
  | 'personaEnergetic'
  | 'dockStateCollapsed'
  | 'dockStatePeek'
  | 'dockStateExpanded';

type Dictionary = Record<PetLanguage, Record<UiKey, string>>;

const DICTIONARY: Dictionary = {
  'zh-CN': {
    appTitle: 'NERV / 小闪桌宠终端',
    appSubtitle: 'Desk Companion Control Deck',
    headerTag: 'ASUKA-TYPE // PILOT HUD',
    connConnected: '已连接',
    connConnecting: '连接中',
    stateLabel: '状态',
    modeLabel: '模式',
    modeQuiet: '低打扰',
    modeNormal: '常规',
    settingsButton: '角色设置',
    languageZh: '中文',
    languageEn: 'EN',
    wsPlaceholder: '输入 WebSocket 地址',
    saveReconnect: '保存并重连',
    modelHint: '模型 Hiyori // 支持分区互动反馈',
    utilityStatus: '状态',
    utilityFocus: '专注',
    utilityTools: '工具',
    petPanelLabel: '同步状态',
    statusCardTitle: '系统状态',
    cpu: 'CPU',
    memory: '内存',
    network: '网络',
    battery: '电池',
    online: '在线',
    offline: '离线',
    unavailable: '不可用',
    chargingSuffix: ' / 充电中',
    notificationStyleLabel: '提醒风格',
    windowModeLabel: '窗口',
    toolsPlaceholderTitle: '工具舱位预留',
    toolsPlaceholderBody:
      '后续的小工具会收纳在这里，不会继续把主舞台挤满。',
    pomodoroTitle: '番茄钟',
    pomodoroReady: '准备开始一轮专注。开始后，结束提醒会跟随当前提醒风格变化。',
    pomodoroRunning: '本轮专注进行中，时间结束后会按当前提醒风格给出反馈。',
    pomodoroDisabled: '番茄钟已关闭，可在设置中重新开启。',
    pomodoroStart: '开始',
    pomodoroPause: '暂停',
    pomodoroResume: '继续',
    pomodoroReset: '重置',
    chatTitle: '对话日志',
    chatSubtitle: '对话、提醒与陪伴提示会收纳在这里',
    chatCollapsed: '收起',
    chatPeek: '半展开',
    chatExpanded: '大展开',
    settingsTitle: '角色与工作台设置',
    settingsClose: '关闭',
    settingsSave: '保存设置',
    settingsReset: '恢复默认',
    groupProfile: 'Profile',
    groupBehavior: 'Behavior',
    groupNotifications: 'Notifications',
    groupWorkspace: 'Workspace',
    assistantName: '桌宠名字',
    assistantNameHelp: '用于标题、日志和角色显示名称。',
    userName: '用户称呼',
    userNameHelp: '用于对话气泡中的用户称呼。',
    settingsWsUrl: 'WebSocket 地址',
    settingsWsUrlHelp: '保存后会同步到顶部地址栏，并可立即重连。',
    language: '界面语言',
    languageHelp: '用于系统界面、状态卡、设置面板和工具标签。',
    displayLanguageMode: '英文展示策略',
    displayLanguageModeHelp:
      '“仅界面双语”只切换前端界面；“偏英文答辩演示”会在英文模式下提示后端回复仍受官方服务语言控制。',
    personaStyle: '角色风格',
    personaStyleHelp: '会影响陪伴文案、动作节奏和互动态度。',
    speakingEnergy: '说话活跃度',
    idleEnergy: '待机活跃度',
    accentEnergy: '强调反馈强度',
    notificationStyle: '提醒风格',
    notificationStyleHelp: '决定系统提醒与番茄钟完成时的语气。',
    autoGreeting: '自动问候',
    autoGreetingHelp: '启动后或重新聚焦时，由桌宠主动打招呼。',
    lowDisturbMode: '低打扰模式',
    lowDisturbModeHelp: '窗口失焦或切到后台时，自动降低动作与提示频率。',
    enableSystemCard: '显示系统状态卡',
    enableSystemCardHelp: '显示 CPU、内存、网络、电池与提醒风格概况。',
    enableSedentaryReminder: '久坐提醒',
    enableSedentaryReminderHelp: '长时间无操作后，给出更克制的陪伴提示。',
    enablePomodoro: '启用番茄钟',
    enablePomodoroHelp: '在右侧专注页保留最小专注计时器。',
    enableNetworkReminder: '网络状态提醒',
    enableNetworkReminderHelp: '网络断开或恢复时，更新状态卡并推送气泡。',
    pomodoroMinutes: '番茄时长（分钟）',
    defaultChatDockState: '默认聊天区状态',
    defaultChatDockStateHelp: '控制底部对话 dock 启动时的展开程度。',
    defaultUtilityTab: '默认工具标签',
    defaultUtilityTabHelp: '启动后右侧工具栏默认打开的页签。',
    notificationCompanion: '陪伴优先',
    notificationProductivity: '效率优先',
    displayUiOnlyBilingual: '仅界面双语',
    displayPreferEnglishDemo: '偏英文答辩演示',
    backendLanguageNotice:
      '当前设备回复仍由官方后端决定语言，若显示中文属于预期现象。',
    personaPlayful: '活泼',
    personaGentle: '温柔',
    personaCalm: '安静',
    personaEnergetic: '元气',
    dockStateCollapsed: '收起',
    dockStatePeek: '半展开',
    dockStateExpanded: '大展开'
  },
  en: {
    appTitle: 'NERV / Xiao Shan Desk Companion',
    appSubtitle: 'Desk Companion Control Deck',
    headerTag: 'ASUKA-TYPE // PILOT HUD',
    connConnected: 'Connected',
    connConnecting: 'Connecting',
    stateLabel: 'State',
    modeLabel: 'Mode',
    modeQuiet: 'Quiet',
    modeNormal: 'Normal',
    settingsButton: 'Settings',
    languageZh: '中文',
    languageEn: 'EN',
    wsPlaceholder: 'Enter WebSocket endpoint',
    saveReconnect: 'Save & Reconnect',
    modelHint: 'Model Hiyori // multi-zone interaction enabled',
    utilityStatus: 'Status',
    utilityFocus: 'Focus',
    utilityTools: 'Tools',
    petPanelLabel: 'Companion Sync',
    statusCardTitle: 'System Status',
    cpu: 'CPU',
    memory: 'Memory',
    network: 'Network',
    battery: 'Battery',
    online: 'Online',
    offline: 'Offline',
    unavailable: 'Unavailable',
    chargingSuffix: ' / Charging',
    notificationStyleLabel: 'Reminder Style',
    windowModeLabel: 'Window',
    toolsPlaceholderTitle: 'Tools Bay Reserved',
    toolsPlaceholderBody:
      'Future mini tools will be docked here instead of crowding the main stage.',
    pomodoroTitle: 'Focus Timer',
    pomodoroReady:
      'Ready for a focus sprint. The completion reminder follows the current reminder style.',
    pomodoroRunning:
      'Focus session in progress. Completion feedback will follow the current reminder style.',
    pomodoroDisabled:
      'The focus timer is disabled. You can enable it again in settings.',
    pomodoroStart: 'Start',
    pomodoroPause: 'Pause',
    pomodoroResume: 'Resume',
    pomodoroReset: 'Reset',
    chatTitle: 'Dialogue Log',
    chatSubtitle: 'Dialogue, alerts and companion notes are collected here',
    chatCollapsed: 'Collapse',
    chatPeek: 'Peek',
    chatExpanded: 'Expand',
    settingsTitle: 'Character & Workspace Settings',
    settingsClose: 'Close',
    settingsSave: 'Save Settings',
    settingsReset: 'Restore Defaults',
    groupProfile: 'Profile',
    groupBehavior: 'Behavior',
    groupNotifications: 'Notifications',
    groupWorkspace: 'Workspace',
    assistantName: 'Companion Name',
    assistantNameHelp: 'Used in the title, logs and companion display copy.',
    userName: 'User Label',
    userNameHelp: 'Used when the dashboard renders user-side chat bubbles.',
    settingsWsUrl: 'WebSocket Endpoint',
    settingsWsUrlHelp:
      'Saved here and mirrored to the top command bar for quick reconnects.',
    language: 'Interface Language',
    languageHelp:
      'Applies to the system UI, status card, settings drawer and tool tabs.',
    displayLanguageMode: 'English Demo Strategy',
    displayLanguageModeHelp:
      'UI-Only Bilingual only switches the frontend. Prefer English Demo keeps the UI in English and explains when backend replies still follow the official service language.',
    personaStyle: 'Persona Style',
    personaStyleHelp:
      'Changes the tone, motion rhythm and interaction attitude of the companion.',
    speakingEnergy: 'Speaking Energy',
    idleEnergy: 'Idle Energy',
    accentEnergy: 'Accent Strength',
    notificationStyle: 'Reminder Style',
    notificationStyleHelp:
      'Controls the tone used for system reminders and focus completion feedback.',
    autoGreeting: 'Auto Greeting',
    autoGreetingHelp:
      'Let the companion greet you on startup or when the app regains focus.',
    lowDisturbMode: 'Low Disturb Mode',
    lowDisturbModeHelp:
      'Reduce motion intensity and pop-up frequency when the window is out of focus.',
    enableSystemCard: 'Show System Status Card',
    enableSystemCardHelp:
      'Display CPU, memory, network, battery and reminder-style indicators.',
    enableSedentaryReminder: 'Sedentary Reminder',
    enableSedentaryReminderHelp:
      'Send a light companion reminder after a long inactive period.',
    enablePomodoro: 'Enable Focus Timer',
    enablePomodoroHelp:
      'Keep a compact pomodoro timer in the right-side Focus panel.',
    enableNetworkReminder: 'Network Reminder',
    enableNetworkReminderHelp:
      'Update the status card and push a bubble when the network changes.',
    pomodoroMinutes: 'Focus Length (minutes)',
    defaultChatDockState: 'Default Chat Dock',
    defaultChatDockStateHelp:
      'Controls how open the bottom dock should be on startup.',
    defaultUtilityTab: 'Default Utility Tab',
    defaultUtilityTabHelp:
      'The tab that opens first on the right utility rail.',
    notificationCompanion: 'Companion First',
    notificationProductivity: 'Productivity First',
    displayUiOnlyBilingual: 'UI-Only Bilingual',
    displayPreferEnglishDemo: 'Prefer English Demo',
    backendLanguageNotice:
      'Backend replies still follow the official service language, so Chinese answers can still appear here.',
    personaPlayful: 'Playful',
    personaGentle: 'Gentle',
    personaCalm: 'Calm',
    personaEnergetic: 'Energetic',
    dockStateCollapsed: 'Collapsed',
    dockStatePeek: 'Peek',
    dockStateExpanded: 'Expanded'
  }
};

export function t(language: PetLanguage, key: UiKey): string {
  return DICTIONARY[language][key];
}

export function getPersonaLabel(
  language: PetLanguage,
  persona: PetPersonaStyle
): string {
  const map: Record<PetPersonaStyle, UiKey> = {
    playful: 'personaPlayful',
    gentle: 'personaGentle',
    calm: 'personaCalm',
    energetic: 'personaEnergetic'
  };
  return t(language, map[persona]);
}

export function getNotificationStyleLabel(
  language: PetLanguage,
  style: PetNotificationStyle
): string {
  return t(
    language,
    style === 'productivity'
      ? 'notificationProductivity'
      : 'notificationCompanion'
  );
}

export function getChatDockLabel(
  language: PetLanguage,
  state: PetChatDockState
): string {
  const map: Record<PetChatDockState, UiKey> = {
    collapsed: 'dockStateCollapsed',
    peek: 'dockStatePeek',
    expanded: 'dockStateExpanded'
  };
  return t(language, map[state]);
}

export function getUtilityTabLabel(
  language: PetLanguage,
  tab: PetUtilityTab
): string {
  const map: Record<PetUtilityTab, UiKey> = {
    status: 'utilityStatus',
    focus: 'utilityFocus',
    tools: 'utilityTools'
  };
  return t(language, map[tab]);
}

export function getDisplayLanguageModeLabel(
  language: PetLanguage,
  mode: PetDisplayLanguageMode
): string {
  return t(
    language,
    mode === 'prefer-english-demo'
      ? 'displayPreferEnglishDemo'
      : 'displayUiOnlyBilingual'
  );
}
