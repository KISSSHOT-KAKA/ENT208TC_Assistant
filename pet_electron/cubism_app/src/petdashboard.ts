import { LAppDelegate } from './lappdelegate';
import { PetMotionController } from './pet_motion_controller';
import { PetRichSignal, PetTransportState } from './pet_motion_config';
import { ReminderEvent, SystemSnapshot } from './pet_desktop_types';
import { PetReminderController } from './pet_reminder_controller';
import {
  PetChatDockState,
  PetDisplayLanguageMode,
  PetLanguage,
  PetNotificationStyle,
  PetPersonaStyle,
  PetSettings,
  PetUtilityTab,
  getDefaultPetSettings,
  loadPetSettings,
  sanitizeSettings,
  savePetSettings
} from './pet_settings';
import {
  getDisplayLanguageModeLabel,
  getNotificationStyleLabel,
  getPersonaLabel,
  t
} from './pet_i18n';

type PetTouchZone = 'head' | 'face' | 'chest' | 'hands' | 'lower';
type GreetingSlot = 'late' | 'morning' | 'noon' | 'afternoon' | 'evening';
type LogKind = 'system' | 'user' | 'assistant';
type PetMood = 'guarded' | 'steady' | 'warm';

const UI_MOOD_LABELS: Record<PetLanguage, Record<PetMood, string>> = {
  'zh-CN': {
    guarded: '警惕',
    steady: '安稳',
    warm: '亲近'
  },
  en: {
    guarded: 'Guarded',
    steady: 'Steady',
    warm: 'Warm'
  }
};

const UI_STATE_LABELS: Record<PetLanguage, Record<PetTransportState, string>> =
  {
    'zh-CN': {
      idle: '待机',
      listening: '倾听中',
      thinking: '思考中',
      speaking: '说话中',
      unknown: '未知'
    },
    en: {
      idle: 'Idle',
      listening: 'Listening',
      thinking: 'Thinking',
      speaking: 'Speaking',
      unknown: 'Unknown'
    }
  };

const PERSONA_LABELS: Record<PetPersonaStyle, string> = {
  playful: '活泼',
  gentle: '温柔',
  calm: '安静',
  energetic: '元气'
};

const MOOD_LABELS: Record<PetMood, string> = {
  guarded: '警惕',
  steady: '安稳',
  warm: '亲近'
};

const STATE_LABELS: Record<PetTransportState, string> = {
  idle: '待机',
  listening: '倾听中',
  thinking: '思考中',
  speaking: '说话中',
  unknown: '未知'
};

const AUTO_GREET_COOLDOWN_MS = 3 * 60 * 1000;
const COMPANION_CHECK_MS = 45 * 1000;
const COMPANION_MIN_IDLE_MS = 2 * 60 * 1000;
const COMPANION_COOLDOWN_MS = 4 * 60 * 1000;
const TOUCH_STREAK_WINDOW_MS = 2200;
const TOUCH_HOLD_MS = 560;
const TOUCH_HOVER_MS = 1250;
const TOUCH_HOVER_COOLDOWN_MS = 6500;
const TOUCH_DRAG_THRESHOLD_PX = 18;
const TOUCH_DRAG_REACT_MS = 900;
const POMODORO_TICK_MS = 1000;

const TAP_RESPONSES: Record<PetPersonaStyle, Record<PetTouchZone, string[]>> = {
  playful: {
    head: [
      '摸头这套你已经很熟练了嘛。',
      '突然摸头会让我分心的。',
      '头顶确认，今天的好运加一。'
    ],
    face: [
      '离这么近，是想看我表情吗？',
      '别一直盯着我看，我会有点不好意思。',
      '脸这边轻一点，我可是会记仇的。'
    ],
    chest: [
      '收到收到，我在线呢。',
      '别急，我一直在陪你。',
      '状态已回传，继续下一步吧。'
    ],
    hands: [
      '抓到我的手势节奏了？',
      '碰到这边就像在催我动起来。',
      '手边区域命中，我配合你一下。'
    ],
    lower: [
      '这个位置就别总逗我了。',
      '再戳下去我要小声抗议了。',
      '下半身区域收到，轻一点啦。'
    ]
  },
  gentle: {
    head: [
      '嗯，这样摸头会让我安静一点。',
      '轻轻碰一下就很好。',
      '我感受到啦，不用担心。'
    ],
    face: [
      '离得这么近，我会有点害羞。',
      '脸这边还是温柔一点比较好。',
      '我有在看着你。'
    ],
    chest: [
      '我会一直陪着你。',
      '不用着急，我在这里。',
      '好，我有听见你。'
    ],
    hands: [
      '像是在拉着我一起往前走。',
      '这样会让我更想跟上你。',
      '我会配合你的节奏。'
    ],
    lower: [
      '这里还是轻一点比较好。',
      '我知道你是在和我互动。',
      '慢一点，我还在。'
    ]
  },
  calm: {
    head: [
      '收到，头部接触已记录。',
      '这里反应正常。',
      '你继续，我在。'
    ],
    face: [
      '观察得很仔细。',
      '面部区域反馈正常。',
      '嗯，已感知。'
    ],
    chest: [
      '收到，继续。',
      '状态正常，可以推进。',
      '我还在这里。'
    ],
    hands: [
      '动作输入有效。',
      '这边会让我更专注一点。',
      '已接收你的互动。'
    ],
    lower: [
      '下方区域反馈已收到。',
      '轻触正常。',
      '嗯，别太频繁就好。'
    ]
  },
  energetic: {
    head: [
      '摸头加成生效，我更有干劲了。',
      '好耶，这一下直接把我点亮。',
      '头顶确认，继续冲。'
    ],
    face: [
      '这么近也没关系，我顶得住。',
      '这个距离，气氛直接拉满。',
      '脸这边一碰，我就更来劲了。'
    ],
    chest: [
      '收到指令，继续冲。',
      '好，我已经准备好了。',
      '状态拉满，下一步干什么？'
    ],
    hands: [
      '这里一碰我就想开始表演。',
      '手边区域命中，动作欲望提升。',
      '再来一下，我还能更活跃。'
    ],
    lower: [
      '这个位置也敢点，你挺会玩的。',
      '好好好，我知道你在逗我。',
      '行，那我就继续配合你。'
    ]
  }
};

const TAP_ESCALATION_RESPONSES: Record<
  PetPersonaStyle,
  Record<'repeat' | 'overload', Record<PetTouchZone, string[]>>
> = {
  playful: {
    repeat: {
      head: ['喂喂，头顶这边已经被你点出连击了。'],
      face: ['你这是在研究我的表情变化吗？'],
      chest: ['好啦好啦，我知道你在确认我有没有认真陪你。'],
      hands: ['再点这边我真的要开始表演了。'],
      lower: ['你怎么专挑这边反复逗我？']
    },
    overload: {
      head: ['头顶连击成立，我现在可要把注意力全放你身上了。'],
      face: ['你盯得这么认真，我不多给点反应都不礼貌了。'],
      chest: ['收到高频互动，我这边已经切到全神贯注模式。'],
      hands: ['好了，手边区域已经被你点成高能模式了。'],
      lower: ['这边连续命中太多次，我要开始闹小脾气了。']
    }
  },
  gentle: {
    repeat: {
      head: ['一直这样摸头的话，我会变得更依赖你。'],
      face: ['你靠得太近了，我真的会害羞。'],
      chest: ['我知道啦，我会一直在这里回应你。'],
      hands: ['这样轻轻拉着我，我会跟上你的节奏。'],
      lower: ['这里就不要一直试探我啦。']
    },
    overload: {
      head: ['再这样摸下去，我就真的会乖乖不动让你摸了。'],
      face: ['你这样一直看着我，我会有点撑不住的。'],
      chest: ['我已经把注意力都放到你这边了。'],
      hands: ['好，我跟着你，一起往前走。'],
      lower: ['嗯，这边还是请你温柔一点。']
    }
  },
  calm: {
    repeat: {
      head: ['头部区域重复输入已确认。'],
      face: ['面部区域连续反馈已记录。'],
      chest: ['核心区域交互频率正在上升。'],
      hands: ['手部区域连续输入有效。'],
      lower: ['下方区域重复触发已识别。']
    },
    overload: {
      head: ['头部区域高频交互，当前优先级提升。'],
      face: ['面部区域持续命中，已进入高关注状态。'],
      chest: ['核心区域高频输入，响应等级上调。'],
      hands: ['手部区域连续触发，动作反馈增强。'],
      lower: ['下方区域高频交互，已给出额外反馈。']
    }
  },
  energetic: {
    repeat: {
      head: ['还来？这下我的状态真的被你点燃了。'],
      face: ['连续点脸是吧，好，那我反应给满。'],
      chest: ['收到高频确认，我这边直接更来劲了。'],
      hands: ['手边这块再点下去我可要起舞了。'],
      lower: ['你这连点有点挑衅意味，我记住了。']
    },
    overload: {
      head: ['头顶三连已经把我彻底激活了。'],
      face: ['好，这波脸部连击我就认真接招了。'],
      chest: ['胸口区域高频互动成立，状态直接拉满。'],
      hands: ['手边这块已经进入表演模式，别怪我太活跃。'],
      lower: ['这边你还敢一直点，那我也不客气了。']
    }
  }
};

const HOLD_RESPONSES: Record<PetPersonaStyle, Record<PetTouchZone, string[]>> = {
  playful: {
    head: ['喂，头顶这边被你按住的话，我真的会乖下来一点。'],
    face: ['你这样按着不放，我可要认真盯回去了。'],
    chest: ['好啦好啦，我知道你是在确认我有没有好好陪你。'],
    hands: ['这边长按会让我很想直接开始动起来。'],
    lower: ['这边别按太久，不然我可真要闹腾了。']
  },
  gentle: {
    head: ['这样慢慢按着，会让我很安心。'],
    face: ['你停在这里太久，我会有点不好意思。'],
    chest: ['嗯，我会安静地把注意力留给你。'],
    hands: ['像是你在牵着我，不急，我们慢慢来。'],
    lower: ['这里还是别按太久，温柔一点就好。']
  },
  calm: {
    head: ['头部区域长按已识别，反馈增强。'],
    face: ['面部区域长按中，已进入高关注状态。'],
    chest: ['核心区域长按成立，当前响应已抬升。'],
    hands: ['手部区域长按有效，动作反馈增强。'],
    lower: ['下方区域长按已记录，我会给出克制反馈。']
  },
  energetic: {
    head: ['头顶这边被你按住，我的状态直接被拉高了。'],
    face: ['行，这种长按我就当你是在正式点名我。'],
    chest: ['好，这一下我就认真把注意力全切过来。'],
    hands: ['这里长按很危险，我真的会想开始表演。'],
    lower: ['这边你还敢按住不放，那我也要开始有反应了。']
  }
};

const HOVER_RESPONSES: Record<PetPersonaStyle, Record<PetTouchZone, string[]>> = {
  playful: {
    head: ['你在头顶这边停了好久，是不是很满意这个手感？'],
    face: ['一直看着我这边，是在等我先有反应吗？'],
    chest: ['停在这里不动，我会默认你在和我贴贴。'],
    hands: ['鼠标在手边徘徊，我已经准备配合你了。'],
    lower: ['这边你都盯这么久了，我很难不注意到。']
  },
  gentle: {
    head: ['你停在这里的时间有点久，我感受到了。'],
    face: ['我知道你在看着我。'],
    chest: ['你这样停留着，我会更专心陪你。'],
    hands: ['像是在轻轻牵住我一样。'],
    lower: ['这边轻轻停一下就够了。']
  },
  calm: {
    head: ['头部区域停留检测完成。'],
    face: ['面部区域停留中，反馈已同步。'],
    chest: ['核心区域停留状态有效。'],
    hands: ['手部区域停留已识别。'],
    lower: ['下方区域停留已记录。']
  },
  energetic: {
    head: ['头顶这边停留太久，我要默认你在给我蓄力。'],
    face: ['一直悬在这里，是想看我先动起来吗？'],
    chest: ['停在这里不走，我这边已经开始进入备战状态了。'],
    hands: ['手边停留检测通过，我快忍不住想动了。'],
    lower: ['这里停太久，我可就要主动回应你了。']
  }
};

const DRAG_RESPONSES: Record<PetPersonaStyle, Record<PetTouchZone, string[]>> = {
  playful: {
    head: ['你在头顶这边来回逗我，是故意让我分心吧。'],
    face: ['脸这边被你这样拖来拖去，我可要认真盯回去了。'],
    chest: ['这边被你一路带着走，我只好跟上啦。'],
    hands: ['手边一拖，我真的会忍不住开始活跃。'],
    lower: ['你怎么又在这边拖来拖去，分明是在逗我。']
  },
  gentle: {
    head: ['你这样慢慢带着我，我会放松一点。'],
    face: ['别急，慢一点，我会顺着你的节奏。'],
    chest: ['嗯，我感受到你一直停留在这里。'],
    hands: ['这样像在牵着我走。'],
    lower: ['这里还是请你别拖太久。']
  },
  calm: {
    head: ['头部区域拖拽输入有效。'],
    face: ['面部区域持续交互中。'],
    chest: ['核心区域拖拽反馈已增强。'],
    hands: ['手部区域拖拽已识别。'],
    lower: ['下方区域拖拽已记录。']
  },
  energetic: {
    head: ['头顶这边一拖，我整个人都被你带起劲了。'],
    face: ['行，这种来回拉扯我就当成正式互动了。'],
    chest: ['这边被你持续带动，我状态已经抬上来了。'],
    hands: ['手边区域拖拽成立，我真的快想表演了。'],
    lower: ['你这样拖这边，是在故意挑衅我吧。']
  }
};

const MOOD_SHIFT_LINES: Record<
  PetPersonaStyle,
  Record<'warm' | 'guarded', string[]>
> = {
  playful: {
    warm: ['好吧，我现在会更愿意往你这边靠一点。'],
    guarded: ['再这么欺负我，我可要开始提高警惕了。']
  },
  gentle: {
    warm: ['嗯，我现在会更信任你一点。'],
    guarded: ['我会稍微收着一点，但我还在。']
  },
  calm: {
    warm: ['当前陪伴状态上升，亲近度已提高。'],
    guarded: ['当前陪伴状态下降，我会先保持观察。']
  },
  energetic: {
    warm: ['好，这下我是真的被你带进状态了。'],
    guarded: ['你再这么逗，我这边就要进入防备模式了。']
  }
};

const COMPANION_LINES: Record<PetPersonaStyle, string[]> = {
  playful: [
    '我在后台偷看你认真工作的样子。',
    '要不要让我帮你把气氛撑起来？',
    '今天的进度条，别让我失望哦。',
    '你安静得太久，我差点以为你睡着了。',
    '我在这边待机，你别一个人硬撑。'
  ],
  gentle: [
    '累了就歇一会儿，我会继续陪着你。',
    '如果有点烦，可以先深呼吸一下。',
    '慢一点也没关系，稳稳地往前走就好。',
    '我不催你，你按自己的节奏来。',
    '要是觉得闷，就看看我。'
  ],
  calm: [
    '一切正常，我还在这里。',
    '你继续忙，我替你守着这边。',
    '当前状态平稳，可以继续推进。',
    '暂时没有异常，我会继续待命。',
    '不用一直确认，我还在线。'
  ],
  energetic: [
    '别停，我们今天还能再推进一段。',
    '状态不错，继续把这个任务拿下。',
    '我已经准备好陪你冲刺下一段了。',
    '再往前一点，今天还能多完成一些。',
    '现在这股劲头不错，别浪费。'
  ]
};

const GREETING_LINES: Record<PetPersonaStyle, Record<GreetingSlot, string[]>> = {
  playful: {
    late: [
      '{user}，这么晚还醒着，是又在和代码谈恋爱吗？',
      '{user}，夜深模式启动，我继续陪你熬一小会儿。'
    ],
    morning: [
      '{user}，早上好，今天要不要先拿一个漂亮开局？',
      '{user}，起床啦，我已经在等你上线了。'
    ],
    noon: [
      '{user}，中午啦，先吃点东西再继续也不迟。',
      '{user}，午间检查，别只顾着忙忘了补能量。'
    ],
    afternoon: [
      '{user}，下午好，我继续在这边给你撑场子。',
      '{user}，下午这段最容易犯困，我盯着你。'
    ],
    evening: [
      '{user}，晚上好，今天辛苦了，但我们还能再推进一点。',
      '{user}，夜间陪伴模式已上线。'
    ]
  },
  gentle: {
    late: [
      '{user}，已经很晚了，别太勉强自己。',
      '{user}，夜里也没关系，我会安静陪着你。'
    ],
    morning: [
      '{user}，早上好，今天也慢慢来就好。',
      '{user}，新的一天开始了，我还在这边。'
    ],
    noon: [
      '{user}，先休息一下，吃点东西吧。',
      '{user}，中午了，照顾好自己也很重要。'
    ],
    afternoon: [
      '{user}，下午好，如果累了就先缓一缓。',
      '{user}，我会继续在这边陪着你。'
    ],
    evening: [
      '{user}，晚上好，今天也辛苦了。',
      '{user}，接下来的时间，我会安静陪你。'
    ]
  },
  calm: {
    late: [
      '{user}，当前时间偏晚，建议别熬太久。',
      '{user}，我仍在待机，你可以继续。'
    ],
    morning: [
      '{user}，早上好，系统陪伴已恢复。',
      '{user}，今天的状态可以从稳定开始。'
    ],
    noon: [
      '{user}，已到中午，记得补充能量。',
      '{user}，午间阶段，建议短暂休整。'
    ],
    afternoon: [
      '{user}，下午好，当前状态正常。',
      '{user}，如果你准备继续，我会保持在线。'
    ],
    evening: [
      '{user}，晚上好，接下来继续稳步推进。',
      '{user}，当前时段适合整理和收尾。'
    ]
  },
  energetic: {
    late: [
      '{user}，还在冲？那我也继续陪你扛住。',
      '{user}，夜间加班局继续，我这边状态拉满。'
    ],
    morning: [
      '{user}，早！今天先狠狠干一段再说。',
      '{user}，新的一天开场，冲劲给你拉满。'
    ],
    noon: [
      '{user}，中午先补点能量，下午继续打。',
      '{user}，这个时间最适合稍微充电，后面还能继续冲。'
    ],
    afternoon: [
      '{user}，下午继续，我还没打算松劲。',
      '{user}，这段时间最容易掉速，我来帮你稳住。'
    ],
    evening: [
      '{user}，晚上好，今天最后一段也拿下吧。',
      '{user}，夜间模式开启，但气势不能掉。'
    ]
  }
};

const FOCUS_GREETINGS: Record<PetPersonaStyle, string[]> = {
  playful: [
    '{user}，你回来啦，我刚刚还在盯着你的位置。',
    '{user}，窗口恢复，陪伴继续。'
  ],
  gentle: [
    '{user}，欢迎回来，我还在这里。',
    '{user}，没关系，我们慢慢继续。'
  ],
  calm: [
    '{user}，窗口已恢复焦点，我继续待机。',
    '{user}，已切回常规模式。'
  ],
  energetic: [
    '{user}，回来得正好，我们接着冲。',
    '{user}，好，继续推进下一段。'
  ]
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function formatAssistantName(settings: PetSettings): string {
  return settings.language === 'en' && settings.assistantName.trim() === '小闪'
    ? 'Xiao Shan'
    : settings.assistantName;
}

function formatUserName(settings: PetSettings): string {
  return settings.language === 'en' && settings.userName.trim() === '主人'
    ? 'Captain'
    : settings.userName;
}

function formatLine(template: string, settings: PetSettings): string {
  return template
    .split('{user}')
    .join(formatUserName(settings))
    .split('{assistant}')
    .join(formatAssistantName(settings));
}

function getEnglishGreeting(settings: PetSettings, slot: GreetingSlot): string {
  const name = formatUserName(settings);
  const table: Record<PetPersonaStyle, Record<GreetingSlot, string[]>> = {
    playful: {
      late: [
        `${name}, you are still awake. Is this another late-night coding route?`,
        `${name}, night companion mode is online. I can stay with you a little longer.`
      ],
      morning: [
        `${name}, good morning. Want to start the day with a clean first win?`,
        `${name}, rise and shine. I was already waiting for you.`
      ],
      noon: [
        `${name}, it is noon already. Grab something to eat before the next sprint.`,
        `${name}, midday check. Please do not forget to recharge too.`
      ],
      afternoon: [
        `${name}, afternoon shift continues. I am still here to keep the mood up.`,
        `${name}, this is the sleepy part of the day, so I am watching your pace.`
      ],
      evening: [
        `${name}, good evening. Today was heavy, but we can still push a bit further.`,
        `${name}, evening companion mode is now active.`
      ]
    },
    gentle: {
      late: [
        `${name}, it is getting very late. Do not push yourself too hard.`,
        `${name}, it is okay. I can stay quietly with you tonight.`
      ],
      morning: [
        `${name}, good morning. We can take today gently.`,
        `${name}, a new day has started. I am still right here.`
      ],
      noon: [
        `${name}, please take a short break and eat something first.`,
        `${name}, it is noon now. Taking care of yourself matters too.`
      ],
      afternoon: [
        `${name}, good afternoon. If you feel tired, slow down a little.`,
        `${name}, I will keep staying beside you.`
      ],
      evening: [
        `${name}, good evening. You worked hard today.`,
        `${name}, I will stay quietly with you for the rest of the night.`
      ]
    },
    calm: {
      late: [
        `${name}, it is quite late. Try not to stay up for too long.`,
        `${name}, I am still on standby if you want to continue.`
      ],
      morning: [
        `${name}, good morning. Companion systems are stable.`,
        `${name}, the day can begin from a steady baseline.`
      ],
      noon: [
        `${name}, it is noon. Please refill your energy.`,
        `${name}, this is a good time for a short reset.`
      ],
      afternoon: [
        `${name}, good afternoon. Current status is stable.`,
        `${name}, if you are ready to continue, I will remain online.`
      ],
      evening: [
        `${name}, good evening. We can keep moving at a steady pace.`,
        `${name}, this is a good time for review and wrap-up.`
      ]
    },
    energetic: {
      late: [
        `${name}, still pushing? Then I am staying locked in with you.`,
        `${name}, night shift continues. My momentum is still up.`
      ],
      morning: [
        `${name}, morning. Let us open strong today.`,
        `${name}, new day, full charge. I am ready if you are.`
      ],
      noon: [
        `${name}, refuel at noon so we can keep the next round sharp.`,
        `${name}, charge up now and we can keep the rhythm later.`
      ],
      afternoon: [
        `${name}, afternoon push continues. I am not slowing down yet.`,
        `${name}, this is the easiest time to lose pace, so let me help you hold it.`
      ],
      evening: [
        `${name}, good evening. Let us close the day with one more clean push.`,
        `${name}, evening mode is active, but the momentum stays on.`
      ]
    }
  };
  return pickRandom(table[settings.personaStyle][slot]);
}

function getEnglishFocusGreeting(settings: PetSettings): string {
  const name = formatUserName(settings);
  const table: Record<PetPersonaStyle, string[]> = {
    playful: [
      `${name}, you are back. I was already watching your station.`,
      `${name}, focus restored. Companion mode continues.`
    ],
    gentle: [
      `${name}, welcome back. I am still here.`,
      `${name}, it is okay. We can continue slowly.`
    ],
    calm: [
      `${name}, window focus restored. I am back on standby.`,
      `${name}, normal mode resumed.`
    ],
    energetic: [
      `${name}, perfect timing. Let us continue the push.`,
      `${name}, good, back on track.`
    ]
  };
  return pickRandom(table[settings.personaStyle]);
}

function getEnglishZoneReply(
  persona: PetPersonaStyle,
  zone: PetTouchZone,
  interaction: 'tap' | 'hold' | 'hover' | 'drag',
  streak = 1
): string {
  const zoneLabel: Record<PetTouchZone, string> = {
    head: 'head',
    face: 'face',
    chest: 'center',
    hands: 'hands',
    lower: 'lower area'
  };
  const target = zoneLabel[zone];

  if (interaction === 'tap') {
    if (streak >= 3) {
      const overload: Record<PetPersonaStyle, string[]> = {
        playful: [
          `That is a full combo on my ${target}. You really wanted a reaction.`,
          `Okay, repeated taps confirmed. I am definitely paying attention now.`
        ],
        gentle: [
          `You have tapped my ${target} quite a few times. I noticed.`,
          `That is enough to make me react a little more clearly.`
        ],
        calm: [
          `Repeated input on ${target} detected. Response intensity increased.`,
          `Multiple taps registered. Companion feedback escalated.`
        ],
        energetic: [
          `You stacked a full combo on my ${target}. My state is up now.`,
          `Alright, that much tapping definitely woke me up.`
        ]
      };
      return pickRandom(overload[persona]);
    }

    if (streak >= 2) {
      const repeat: Record<PetPersonaStyle, string[]> = {
        playful: [
          `You are repeating that ${target} tap on purpose, aren't you?`,
          `Second hit on ${target}. I saw that.`
        ],
        gentle: [
          `Another touch on my ${target}. I am still with you.`,
          `You came back to the same spot. I noticed.`
        ],
        calm: [
          `Repeated ${target} interaction confirmed.`,
          `Second ${target} input received.`
        ],
        energetic: [
          `Another hit on ${target}. Good, keep the rhythm going.`,
          `Repeat input accepted. My response is getting stronger.`
        ]
      };
      return pickRandom(repeat[persona]);
    }

    const tap: Record<PetPersonaStyle, Record<PetTouchZone, string[]>> = {
      playful: {
        head: ['A head tap always gets my attention.', 'You really like tapping my head, huh?'],
        face: ['You are awfully close to my face.', 'Looking for a reaction from this side?'],
        chest: ['Signal received. I am here with you.', 'Yes, yes, I am still online.'],
        hands: ['Touching my hands makes me want to move.', 'That side always pulls me into the rhythm.'],
        lower: ['Easy there. That area still counts as teasing.', 'You really picked that spot again.']
      },
      gentle: {
        head: ['That head tap feels calming.', 'A light touch there is enough.'],
        face: ['You are very close right now.', 'Please be gentle with my face.'],
        chest: ['I am here. You do not need to rush.', 'I can stay quietly with you.'],
        hands: ['That feels like you are reaching for me.', 'I can follow your pace from here.'],
        lower: ['A softer touch would be better there.', 'Please be gentle with that area.']
      },
      calm: {
        head: ['Head interaction detected.', 'Head input received.'],
        face: ['Face interaction synchronized.', 'Face-side feedback active.'],
        chest: ['Core interaction confirmed.', 'Center input accepted.'],
        hands: ['Hand-side interaction detected.', 'Manual input recognized.'],
        lower: ['Lower-area interaction recorded.', 'Lower input accepted.']
      },
      energetic: {
        head: ['A tap there wakes me right up.', 'Head hit confirmed. My energy just went up.'],
        face: ['That is close enough to count as a challenge.', 'You touched the face side, so I am reacting properly.'],
        chest: ['Command received. I am ready.', 'That center tap pushes me into motion.'],
        hands: ['My hands side always makes me want to move.', 'That touch pulls my energy upward fast.'],
        lower: ['You really know how to provoke a reaction.', 'That area still counts as bold interaction.']
      }
    };
    return pickRandom(tap[persona][zone]);
  }

  if (interaction === 'hold') {
    const hold: Record<PetPersonaStyle, string[]> = {
      playful: [
        `If you keep holding my ${target}, I will react more honestly.`,
        `That hold on my ${target} is starting to matter.`
      ],
      gentle: [
        `Holding there like this makes me feel calmer.`,
        `A steady hold on my ${target} is easier to trust.`
      ],
      calm: [
        `Sustained interaction on ${target} detected.`,
        `${target} hold recognized. Feedback intensity elevated.`
      ],
      energetic: [
        `Holding my ${target} like that pushes my state upward fast.`,
        `Long press confirmed. I am definitely responding now.`
      ]
    };
    return pickRandom(hold[persona]);
  }

  if (interaction === 'hover') {
    const hover: Record<PetPersonaStyle, string[]> = {
      playful: [
        `You stayed near my ${target} for a while. Were you waiting for me to react first?`,
        `Hovering there that long is basically teasing.`
      ],
      gentle: [
        `You lingered by my ${target}. I noticed.`,
        `I can feel your attention staying there.`
      ],
      calm: [
        `${target} hover state detected.`,
        `Sustained cursor presence on ${target} confirmed.`
      ],
      energetic: [
        `Hovering there this long feels like a warm-up signal.`,
        `You stayed by my ${target} long enough to trigger me.`
      ]
    };
    return pickRandom(hover[persona]);
  }

  const drag: Record<PetPersonaStyle, string[]> = {
    playful: [
      `You dragged across my ${target} on purpose. I can tell.`,
      `That ${target} drag really feels like you are messing with me.`
    ],
    gentle: [
      `Move slowly. I can follow your pace from my ${target}.`,
      `That drag feels like you are guiding me instead of pushing me.`
    ],
    calm: [
      `${target} drag input accepted.`,
      `Continuous interaction on ${target} is active.`
    ],
    energetic: [
      `Dragging my ${target} like that really pulls my state upward.`,
      `That motion on ${target} is enough to get me going.`
    ]
  };
  return pickRandom(drag[persona]);
}

function getGreetingSlot(date = new Date()): GreetingSlot {
  const hour = date.getHours();
  if (hour < 5) {
    return 'late';
  }
  if (hour < 11) {
    return 'morning';
  }
  if (hour < 14) {
    return 'noon';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  return 'evening';
}

function getTimeBasedGreeting(settings: PetSettings): string {
  const slot = getGreetingSlot();
  if (settings.language === 'en') {
    return getEnglishGreeting(settings, slot);
  }
  return formatLine(
    pickRandom(GREETING_LINES[settings.personaStyle][slot]),
    settings
  );
}

function getFocusGreeting(settings: PetSettings): string {
  if (settings.language === 'en') {
    return getEnglishFocusGreeting(settings);
  }
  return formatLine(pickRandom(FOCUS_GREETINGS[settings.personaStyle]), settings);
}

function getTouchReply(
  settings: PetSettings,
  zone: PetTouchZone,
  streak = 1
): string {
  if (settings.language === 'en') {
    return getEnglishZoneReply(settings.personaStyle, zone, 'tap', streak);
  }
  const persona = settings.personaStyle;
  const bucket =
    streak >= 3
      ? TAP_ESCALATION_RESPONSES[persona].overload[zone]
      : streak >= 2
        ? TAP_ESCALATION_RESPONSES[persona].repeat[zone]
        : TAP_RESPONSES[persona][zone];

  return formatLine(pickRandom(bucket), settings);
}

function getHoldReply(settings: PetSettings, zone: PetTouchZone): string {
  if (settings.language === 'en') {
    return getEnglishZoneReply(settings.personaStyle, zone, 'hold');
  }
  return formatLine(
    pickRandom(HOLD_RESPONSES[settings.personaStyle][zone]),
    settings
  );
}

function getHoverReply(settings: PetSettings, zone: PetTouchZone): string {
  if (settings.language === 'en') {
    return getEnglishZoneReply(settings.personaStyle, zone, 'hover');
  }
  return formatLine(
    pickRandom(HOVER_RESPONSES[settings.personaStyle][zone]),
    settings
  );
}

function getDragReply(settings: PetSettings, zone: PetTouchZone): string {
  if (settings.language === 'en') {
    return getEnglishZoneReply(settings.personaStyle, zone, 'drag');
  }
  return formatLine(
    pickRandom(DRAG_RESPONSES[settings.personaStyle][zone]),
    settings
  );
}

function getEnglishCompanionLine(settings: PetSettings, mood: PetMood): string {
  const table: Record<PetPersonaStyle, string[]> = {
    playful: [
      'I have been quietly watching you work from the side.',
      'Do you want me to keep the atmosphere up for you?',
      'Do not let today’s progress bar disappoint me.',
      'You have been quiet so long that I almost thought you fell asleep.',
      'I am still on standby. You do not have to carry everything alone.'
    ],
    gentle: [
      'If you are tired, you can slow down for a moment. I am still here.',
      'Take one breath first. We can continue gently.',
      'You do not need to rush. Steady is fine.',
      'I am not trying to push you. I just want to stay with you.',
      'If things feel noisy, you can look at me for a second.'
    ],
    calm: [
      'Everything is stable. I am still here.',
      'You can keep working. I will watch this side for you.',
      'Current status remains steady. You may continue.',
      'No obvious exception detected. I will remain on standby.',
      'There is no need to keep checking. I am still online.'
    ],
    energetic: [
      'Do not stop now. We can still push this a little further.',
      'Your momentum is good. Keep it.',
      'I am ready to stay with you through the next round.',
      'One more step forward and today gets even cleaner.',
      'This pace is good. Do not waste it.'
    ]
  };

  const base = pickRandom(table[settings.personaStyle]);
  if (mood === 'warm') {
    return `${base} I am naturally leaning more toward you now.`;
  }
  if (mood === 'guarded') {
    return `${base} I am still here, but I am holding back a little.`;
  }
  return base;
}

function getEnglishMoodShiftLine(
  settings: PetSettings,
  mood: Exclude<PetMood, 'steady'>
): string {
  const table: Record<PetPersonaStyle, Record<'warm' | 'guarded', string[]>> = {
    playful: {
      warm: ['Alright, I am a little more willing to lean your way now.'],
      guarded: ['If you keep teasing me like that, I will start staying on guard.']
    },
    gentle: {
      warm: ['I think I can trust you a little more now.'],
      guarded: ['I will stay a bit more reserved, but I am still here.']
    },
    calm: {
      warm: ['Companion state elevated. Affinity has increased.'],
      guarded: ['Companion state lowered. I will observe first.']
    },
    energetic: {
      warm: ['Good. Now I am really in sync with your pace.'],
      guarded: ['Keep pushing like that and I will switch into defense mode.']
    }
  };
  return pickRandom(table[settings.personaStyle][mood]);
}

function getMoodFromScore(score: number): PetMood {
  if (score >= 3) {
    return 'warm';
  }
  if (score <= -3) {
    return 'guarded';
  }
  return 'steady';
}

function getCompanionLine(settings: PetSettings, mood: PetMood): string {
  if (settings.language === 'en') {
    return getEnglishCompanionLine(settings, mood);
  }
  const base = formatLine(
    pickRandom(COMPANION_LINES[settings.personaStyle]),
    settings
  );

  if (mood === 'warm') {
    return `${base} 我现在会更自然地把注意力放到你这边。`;
  }

  if (mood === 'guarded') {
    return `${base} 不过这会儿我会稍微收着一点。`;
  }

  return base;
}

function getMoodShiftLine(settings: PetSettings, mood: Exclude<PetMood, 'steady'>): string {
  if (settings.language === 'en') {
    return getEnglishMoodShiftLine(settings, mood);
  }
  return formatLine(
    pickRandom(MOOD_SHIFT_LINES[settings.personaStyle][mood]),
    settings
  );
}

function classifyTouchZone(
  event: MouseEvent,
  wrapElement: HTMLElement
): PetTouchZone {
  const rect = wrapElement.getBoundingClientRect();
  const nx = (event.clientX - rect.left) / Math.max(rect.width, 1);
  const ny = (event.clientY - rect.top) / Math.max(rect.height, 1);

  if (ny < 0.22) {
    return 'head';
  }
  if (ny < 0.4) {
    return 'face';
  }
  if (ny < 0.72) {
    if (nx < 0.28 || nx > 0.72) {
      return 'hands';
    }
    return 'chest';
  }
  return 'lower';
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

function sliderText(value: number): string {
  return value.toFixed(2);
}

export function initPetDashboard(): void {
  const appEl = byId<HTMLDivElement>('app');
  const titleEl = byId<HTMLDivElement>('title');
  const brandSubtitleEl = byId<HTMLDivElement>('brandSubtitle');
  const headerTagEl = byId<HTMLSpanElement>('headerTag');
  const connEl = byId<HTMLDivElement>('conn');
  const connLabelEl = byId<HTMLSpanElement>('connLabel');
  const stateEl = byId<HTMLDivElement>('state');
  const stateLabelEl = byId<HTMLSpanElement>('stateLabel');
  const modeEl = byId<HTMLDivElement>('mode');
  const modeLabelEl = byId<HTMLSpanElement>('modeLabel');
  const langZhBtnEl = byId<HTMLButtonElement>('langZhBtn');
  const langEnBtnEl = byId<HTMLButtonElement>('langEnBtn');
  const wsUrlEl = byId<HTMLInputElement>('wsUrl');
  const saveBtnEl = byId<HTMLButtonElement>('saveBtn');
  const live2dWrapEl = byId<HTMLDivElement>('live2dWrap');
  const live2dTipEl = byId<HTMLDivElement>('live2dTip');
  const utilityTabStatusEl = byId<HTMLButtonElement>('utilityTabStatus');
  const utilityTabFocusEl = byId<HTMLButtonElement>('utilityTabFocus');
  const utilityTabToolsEl = byId<HTMLButtonElement>('utilityTabTools');
  const utilityPanelStatusEl = byId<HTMLElement>('utilityPanelStatus');
  const utilityPanelFocusEl = byId<HTMLElement>('utilityPanelFocus');
  const utilityPanelToolsEl = byId<HTMLElement>('utilityPanelTools');
  const petTitleEl = byId<HTMLDivElement>('petTitle');
  const petStateEl = byId<HTMLDivElement>('petState');
  const systemCardTitleEl = byId<HTMLDivElement>('systemCardTitle');
  const cpuLabelEl = byId<HTMLSpanElement>('cpuLabel');
  const memoryLabelEl = byId<HTMLSpanElement>('memoryLabel');
  const networkLabelEl = byId<HTMLSpanElement>('networkLabel');
  const batteryLabelEl = byId<HTMLSpanElement>('batteryLabel');
  const systemCardEl = byId<HTMLElement>('systemCard');
  const cpuStatusEl = byId<HTMLDivElement>('cpuStatus');
  const cpuValueEl = byId<HTMLSpanElement>('cpuValue');
  const memoryStatusEl = byId<HTMLDivElement>('memoryStatus');
  const memoryValueEl = byId<HTMLSpanElement>('memoryValue');
  const networkStatusEl = byId<HTMLDivElement>('networkStatus');
  const networkValueEl = byId<HTMLSpanElement>('networkValue');
  const batteryStatusEl = byId<HTMLDivElement>('batteryStatus');
  const batteryValueEl = byId<HTMLSpanElement>('batteryValue');
  const notificationStyleLabelEl =
    byId<HTMLSpanElement>('notificationStyleLabel');
  const windowFocusLabelEl = byId<HTMLSpanElement>('windowFocusLabel');
  const pomodoroCardEl = byId<HTMLElement>('pomodoroCard');
  const pomodoroTitleEl = byId<HTMLDivElement>('pomodoroTitle');
  const pomodoroValueEl = byId<HTMLDivElement>('pomodoroValue');
  const pomodoroHintEl = byId<HTMLDivElement>('pomodoroHint');
  const pomodoroStartBtnEl = byId<HTMLButtonElement>('pomodoroStartBtn');
  const pomodoroPauseBtnEl = byId<HTMLButtonElement>('pomodoroPauseBtn');
  const pomodoroResetBtnEl = byId<HTMLButtonElement>('pomodoroResetBtn');
  const toolsPlaceholderTitleEl =
    byId<HTMLDivElement>('toolsPlaceholderTitle');
  const toolsPlaceholderBodyEl = byId<HTMLDivElement>('toolsPlaceholderBody');
  const chatDockEl = byId<HTMLElement>('chatDock');
  const chatDockHandleEl = byId<HTMLElement>('chatDockHandle');
  const chatDockTitleEl = byId<HTMLElement>('chatDockTitle');
  const chatDockSubtitleEl = byId<HTMLSpanElement>('chatDockSubtitle');
  const chatCollapseBtnEl = byId<HTMLButtonElement>('chatCollapseBtn');
  const chatPeekBtnEl = byId<HTMLButtonElement>('chatPeekBtn');
  const chatExpandBtnEl = byId<HTMLButtonElement>('chatExpandBtn');
  const logEl = byId<HTMLDivElement>('log');
  const settingsBtnEl = byId<HTMLButtonElement>('settingsBtn');
  const settingsBackdropEl = byId<HTMLDivElement>('settingsBackdrop');
  const settingsDrawerEl = byId<HTMLElement>('settingsDrawer');
  const settingsCloseBtnEl = byId<HTMLButtonElement>('settingsCloseBtn');
  const settingsTitleEl = byId<HTMLElement>('settingsTitle');
  const settingsAssistantNameEl = byId<HTMLInputElement>('settingsAssistantName');
  const settingsAssistantNameLabelEl = byId<HTMLLabelElement>(
    'settingsAssistantNameLabel'
  );
  const settingsAssistantNameHelpEl = byId<HTMLElement>(
    'settingsAssistantNameHelp'
  );
  const settingsUserNameEl = byId<HTMLInputElement>('settingsUserName');
  const settingsUserNameLabelEl =
    byId<HTMLLabelElement>('settingsUserNameLabel');
  const settingsUserNameHelpEl =
    byId<HTMLElement>('settingsUserNameHelp');
  const settingsLanguageEl = byId<HTMLSelectElement>('settingsLanguage');
  const settingsLanguageLabelEl =
    byId<HTMLLabelElement>('settingsLanguageLabel');
  const settingsLanguageHelpEl =
    byId<HTMLElement>('settingsLanguageHelp');
  const settingsDisplayLanguageModeEl = byId<HTMLSelectElement>(
    'settingsDisplayLanguageMode'
  );
  const settingsDisplayLanguageModeLabelEl = byId<HTMLLabelElement>(
    'settingsDisplayLanguageModeLabel'
  );
  const settingsDisplayLanguageModeHelpEl = byId<HTMLElement>(
    'settingsDisplayLanguageModeHelp'
  );
  const settingsWsUrlEl = byId<HTMLInputElement>('settingsWsUrl');
  const settingsWsUrlLabelEl = byId<HTMLLabelElement>('settingsWsUrlLabel');
  const settingsWsUrlHelpEl = byId<HTMLElement>('settingsWsUrlHelp');
  const settingsNotificationStyleEl =
    byId<HTMLSelectElement>('settingsNotificationStyle');
  const settingsNotificationStyleLabelEl = byId<HTMLLabelElement>(
    'settingsNotificationStyleLabel'
  );
  const settingsNotificationStyleHelpEl = byId<HTMLElement>(
    'settingsNotificationStyleHelp'
  );
  const settingsPersonaStyleEl =
    byId<HTMLSelectElement>('settingsPersonaStyle');
  const settingsPersonaStyleLabelEl = byId<HTMLLabelElement>(
    'settingsPersonaStyleLabel'
  );
  const settingsPersonaStyleHelpEl =
    byId<HTMLElement>('settingsPersonaStyleHelp');
  const settingsAutoGreetingEl = byId<HTMLInputElement>('settingsAutoGreeting');
  const settingsAutoGreetingTextEl =
    byId<HTMLElement>('settingsAutoGreetingText');
  const settingsAutoGreetingHelpEl =
    byId<HTMLElement>('settingsAutoGreetingHelp');
  const settingsLowDisturbModeEl =
    byId<HTMLInputElement>('settingsLowDisturbMode');
  const settingsLowDisturbModeTextEl =
    byId<HTMLElement>('settingsLowDisturbModeText');
  const settingsLowDisturbModeHelpEl =
    byId<HTMLElement>('settingsLowDisturbModeHelp');
  const settingsEnableSystemCardEl =
    byId<HTMLInputElement>('settingsEnableSystemCard');
  const settingsEnableSystemCardTextEl = byId<HTMLElement>(
    'settingsEnableSystemCardText'
  );
  const settingsEnableSystemCardHelpEl = byId<HTMLElement>(
    'settingsEnableSystemCardHelp'
  );
  const settingsEnableSedentaryReminderEl =
    byId<HTMLInputElement>('settingsEnableSedentaryReminder');
  const settingsEnableSedentaryReminderTextEl = byId<HTMLElement>(
    'settingsEnableSedentaryReminderText'
  );
  const settingsEnableSedentaryReminderHelpEl = byId<HTMLElement>(
    'settingsEnableSedentaryReminderHelp'
  );
  const settingsEnablePomodoroEl =
    byId<HTMLInputElement>('settingsEnablePomodoro');
  const settingsEnablePomodoroTextEl = byId<HTMLElement>(
    'settingsEnablePomodoroText'
  );
  const settingsEnablePomodoroHelpEl = byId<HTMLElement>(
    'settingsEnablePomodoroHelp'
  );
  const settingsEnableNetworkReminderEl =
    byId<HTMLInputElement>('settingsEnableNetworkReminder');
  const settingsEnableNetworkReminderTextEl = byId<HTMLElement>(
    'settingsEnableNetworkReminderText'
  );
  const settingsEnableNetworkReminderHelpEl = byId<HTMLElement>(
    'settingsEnableNetworkReminderHelp'
  );
  const settingsSpeakingEnergyEl =
    byId<HTMLInputElement>('settingsSpeakingEnergy');
  const settingsSpeakingEnergyLabelEl = byId<HTMLLabelElement>(
    'settingsSpeakingEnergyLabel'
  );
  const settingsSpeakingEnergyValueEl = byId<HTMLSpanElement>(
    'settingsSpeakingEnergyValue'
  );
  const settingsIdleEnergyEl = byId<HTMLInputElement>('settingsIdleEnergy');
  const settingsIdleEnergyLabelEl =
    byId<HTMLLabelElement>('settingsIdleEnergyLabel');
  const settingsIdleEnergyValueEl =
    byId<HTMLSpanElement>('settingsIdleEnergyValue');
  const settingsAccentEnergyEl =
    byId<HTMLInputElement>('settingsAccentEnergy');
  const settingsAccentEnergyLabelEl = byId<HTMLLabelElement>(
    'settingsAccentEnergyLabel'
  );
  const settingsAccentEnergyValueEl =
    byId<HTMLSpanElement>('settingsAccentEnergyValue');
  const settingsPomodoroMinutesEl =
    byId<HTMLInputElement>('settingsPomodoroMinutes');
  const settingsPomodoroMinutesLabelEl = byId<HTMLLabelElement>(
    'settingsPomodoroMinutesLabel'
  );
  const settingsPomodoroMinutesValueEl =
    byId<HTMLSpanElement>('settingsPomodoroMinutesValue');
  const settingsDefaultChatDockStateEl = byId<HTMLSelectElement>(
    'settingsDefaultChatDockState'
  );
  const settingsDefaultChatDockStateLabelEl = byId<HTMLLabelElement>(
    'settingsDefaultChatDockStateLabel'
  );
  const settingsDefaultChatDockStateHelpEl = byId<HTMLElement>(
    'settingsDefaultChatDockStateHelp'
  );
  const settingsDefaultUtilityTabEl = byId<HTMLSelectElement>(
    'settingsDefaultUtilityTab'
  );
  const settingsDefaultUtilityTabLabelEl = byId<HTMLLabelElement>(
    'settingsDefaultUtilityTabLabel'
  );
  const settingsDefaultUtilityTabHelpEl = byId<HTMLElement>(
    'settingsDefaultUtilityTabHelp'
  );
  const groupProfileTitleEl = byId<HTMLDivElement>('groupProfileTitle');
  const groupBehaviorTitleEl = byId<HTMLDivElement>('groupBehaviorTitle');
  const groupNotificationsTitleEl = byId<HTMLDivElement>(
    'groupNotificationsTitle'
  );
  const groupWorkspaceTitleEl = byId<HTMLDivElement>('groupWorkspaceTitle');
  const settingsResetBtnEl = byId<HTMLButtonElement>('settingsResetBtn');
  const settingsSaveBtnEl = byId<HTMLButtonElement>('settingsSaveBtn');

  let settings = loadPetSettings();
  let currentState: PetTransportState = 'unknown';
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let lastGreetingAt = 0;
  let lastCompanionAt = 0;
  let lastActivityAt = Date.now();
  let lastTouchZone: PetTouchZone | null = null;
  let lastTouchAt = 0;
  let touchStreak = 0;
  let moodScore = 0;
  let mood: PetMood = 'steady';
  let lastHoverReplyAt = 0;
  let hoverZone: PetTouchZone | null = null;
  let hoverTimer: number | null = null;
  let holdTimer: number | null = null;
  let dragActive = false;
  let dragZone: PetTouchZone | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let lastDragReactionAt = 0;
  let suppressClickUntil = 0;
  let isQuietMode = false;
  let desktopSnapshot: SystemSnapshot | null = null;
  let unsubscribeDesktopStatus: (() => void) | null = null;
  let pomodoroTimer: number | null = null;
  let pomodoroRunning = false;
  let pomodoroEndsAt: number | null = null;
  let pomodoroRemainingMs = 0;
  let language: PetLanguage = settings.language;
  let chatDockState: PetChatDockState = settings.defaultChatDockState;
  let utilityTabState: PetUtilityTab = settings.defaultUtilityTab;
  let lastBackendLanguageNoticeAt = 0;
  let lastSystemEventKey = '';
  let lastSystemEventAt = 0;

  const motionController = new PetMotionController(
    LAppDelegate.getInstance().getPrimarySubdelegate().getLive2DManager()
  );
  const reminderController = new PetReminderController(settings);

  function effectiveSettings(source: PetSettings): PetSettings {
    if (!isQuietMode || !source.lowDisturbMode) {
      return source;
    }

    return {
      ...source,
      speakingEnergy: Math.max(0.2, source.speakingEnergy * 0.68),
      idleEnergy: Math.max(0.1, source.idleEnergy * 0.52),
      accentEnergy: Math.max(0.1, source.accentEnergy * 0.58)
    };
  }

  function applyMotionSettings(): void {
    motionController.setSettings(effectiveSettings(settings));
  }

  function formatPercent(value?: number): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '--';
    }
    return `${Math.round(value)}%`;
  }

  function formatPomodoroTime(valueMs: number): string {
    const totalSeconds = Math.max(0, Math.ceil(valueMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function notificationStyleLabel(style: PetNotificationStyle): string {
    return style === 'productivity' ? '效率优先' : '陪伴优先';
  }

  function setStatusItemWarning(element: HTMLElement, warning: boolean): void {
    element.classList.toggle('warning', warning);
  }

  function stateLabel(state: PetTransportState): string {
    return UI_STATE_LABELS[language][state];
  }

  function moodLabel(nextMood: PetMood): string {
    return UI_MOOD_LABELS[language][nextMood];
  }

  function isEnglishMode(): boolean {
    return language === 'en';
  }

  function displayLanguageMode(): PetDisplayLanguageMode {
    return settings.displayLanguageMode;
  }

  function preferEnglishDemoMode(): boolean {
    return isEnglishMode() && displayLanguageMode() === 'prefer-english-demo';
  }

  function displayAssistantName(): string {
    if (isEnglishMode() && settings.assistantName.trim() === '小闪') {
      return 'Xiao Shan';
    }
    return settings.assistantName;
  }

  function containsChineseText(text: string): boolean {
    return /[\u3400-\u9fff\uf900-\ufaff]/.test(text);
  }

  function appendSystemOnce(
    key: string,
    text: string,
    cooldownMs = 1600
  ): void {
    const now = Date.now();
    if (lastSystemEventKey === key && now - lastSystemEventAt < cooldownMs) {
      return;
    }

    lastSystemEventKey = key;
    lastSystemEventAt = now;
    appendSystem(text);
  }

  function maybeExplainBackendLanguage(text: string): void {
    if (!preferEnglishDemoMode() || !containsChineseText(text)) {
      return;
    }

    const now = Date.now();
    if (now - lastBackendLanguageNoticeAt < 30000) {
      return;
    }

    lastBackendLanguageNoticeAt = now;
    appendSystem(t(language, 'backendLanguageNotice'));
  }

  function setSelectOptionLabels(): void {
    settingsLanguageEl.options[0].text = t(language, 'languageZh');
    settingsLanguageEl.options[1].text = 'English';
    settingsDisplayLanguageModeEl.options[0].text = getDisplayLanguageModeLabel(
      language,
      'ui-only-bilingual'
    );
    settingsDisplayLanguageModeEl.options[1].text = getDisplayLanguageModeLabel(
      language,
      'prefer-english-demo'
    );

    settingsPersonaStyleEl.options[0].text = t(language, 'personaPlayful');
    settingsPersonaStyleEl.options[1].text = t(language, 'personaGentle');
    settingsPersonaStyleEl.options[2].text = t(language, 'personaCalm');
    settingsPersonaStyleEl.options[3].text = t(language, 'personaEnergetic');

    settingsNotificationStyleEl.options[0].text = t(
      language,
      'notificationCompanion'
    );
    settingsNotificationStyleEl.options[1].text = t(
      language,
      'notificationProductivity'
    );

    settingsDefaultChatDockStateEl.options[0].text = t(
      language,
      'dockStateCollapsed'
    );
    settingsDefaultChatDockStateEl.options[1].text = t(language, 'dockStatePeek');
    settingsDefaultChatDockStateEl.options[2].text = t(
      language,
      'dockStateExpanded'
    );

    settingsDefaultUtilityTabEl.options[0].text = t(language, 'utilityStatus');
    settingsDefaultUtilityTabEl.options[1].text = t(language, 'utilityFocus');
    settingsDefaultUtilityTabEl.options[2].text = t(language, 'utilityTools');
  }

  function setChatDockState(
    nextState: PetChatDockState,
    persistAsDefault = false
  ): void {
    chatDockState = nextState;
    appEl.dataset.chatDock = nextState;
    chatDockEl.dataset.state = nextState;
    chatCollapseBtnEl.classList.toggle('is-active', nextState === 'collapsed');
    chatPeekBtnEl.classList.toggle('is-active', nextState === 'peek');
    chatExpandBtnEl.classList.toggle('is-active', nextState === 'expanded');

    if (persistAsDefault) {
      settings = savePetSettings({
        ...settings,
        defaultChatDockState: nextState
      });
    }
  }

  function setUtilityTab(
    nextTab: PetUtilityTab,
    persistAsDefault = false
  ): void {
    utilityTabState = nextTab;
    utilityTabStatusEl.classList.toggle('is-active', nextTab === 'status');
    utilityTabFocusEl.classList.toggle('is-active', nextTab === 'focus');
    utilityTabToolsEl.classList.toggle('is-active', nextTab === 'tools');
    utilityPanelStatusEl.classList.toggle('is-active', nextTab === 'status');
    utilityPanelFocusEl.classList.toggle('is-active', nextTab === 'focus');
    utilityPanelToolsEl.classList.toggle('is-active', nextTab === 'tools');

    if (persistAsDefault) {
      settings = savePetSettings({
        ...settings,
        defaultUtilityTab: nextTab
      });
    }
  }

  function applyLanguageCopy(): void {
    document.documentElement.lang = language;
    titleEl.textContent = isEnglishMode()
      ? `NERV / ${displayAssistantName()} Desk Companion`
      : `NERV / ${settings.assistantName}桌宠终端`;
    brandSubtitleEl.textContent = t(language, 'appSubtitle');
    headerTagEl.textContent = t(language, 'headerTag');
    connLabelEl.textContent = isEnglishMode() ? 'LINK' : '链路';
    stateLabelEl.textContent = isEnglishMode() ? 'STATE' : '状态';
    modeLabelEl.textContent = isEnglishMode() ? 'MODE' : '模式';
    settingsBtnEl.textContent = t(language, 'settingsButton');
    langZhBtnEl.textContent = t(language, 'languageZh');
    langEnBtnEl.textContent = t(language, 'languageEn');
    langZhBtnEl.classList.toggle('is-active', language === 'zh-CN');
    langEnBtnEl.classList.toggle('is-active', language === 'en');
    wsUrlEl.placeholder = t(language, 'wsPlaceholder');
    saveBtnEl.textContent = t(language, 'saveReconnect');
    utilityTabStatusEl.textContent = t(language, 'utilityStatus');
    utilityTabFocusEl.textContent = t(language, 'utilityFocus');
    utilityTabToolsEl.textContent = t(language, 'utilityTools');
    systemCardTitleEl.textContent = t(language, 'statusCardTitle');
    cpuLabelEl.textContent = t(language, 'cpu');
    memoryLabelEl.textContent = t(language, 'memory');
    networkLabelEl.textContent = t(language, 'network');
    batteryLabelEl.textContent = t(language, 'battery');
    pomodoroTitleEl.textContent = t(language, 'pomodoroTitle');
    toolsPlaceholderTitleEl.textContent = t(language, 'toolsPlaceholderTitle');
    toolsPlaceholderBodyEl.textContent = t(language, 'toolsPlaceholderBody');
    chatDockTitleEl.textContent = t(language, 'chatTitle');
    chatDockSubtitleEl.textContent = t(language, 'chatSubtitle');
    chatCollapseBtnEl.textContent = t(language, 'chatCollapsed');
    chatPeekBtnEl.textContent = t(language, 'chatPeek');
    chatExpandBtnEl.textContent = t(language, 'chatExpanded');
    settingsTitleEl.textContent = t(language, 'settingsTitle');
    settingsCloseBtnEl.textContent = t(language, 'settingsClose');
    settingsSaveBtnEl.textContent = t(language, 'settingsSave');
    settingsResetBtnEl.textContent = t(language, 'settingsReset');
    groupProfileTitleEl.textContent = t(language, 'groupProfile');
    groupBehaviorTitleEl.textContent = t(language, 'groupBehavior');
    groupNotificationsTitleEl.textContent = t(language, 'groupNotifications');
    groupWorkspaceTitleEl.textContent = t(language, 'groupWorkspace');
    settingsAssistantNameLabelEl.textContent = t(language, 'assistantName');
    settingsAssistantNameHelpEl.textContent = t(language, 'assistantNameHelp');
    settingsUserNameLabelEl.textContent = t(language, 'userName');
    settingsUserNameHelpEl.textContent = t(language, 'userNameHelp');
    settingsLanguageLabelEl.textContent = t(language, 'language');
    settingsLanguageHelpEl.textContent = t(language, 'languageHelp');
    settingsDisplayLanguageModeLabelEl.textContent = t(
      language,
      'displayLanguageMode'
    );
    settingsDisplayLanguageModeHelpEl.textContent = t(
      language,
      'displayLanguageModeHelp'
    );
    settingsWsUrlLabelEl.textContent = t(language, 'settingsWsUrl');
    settingsWsUrlHelpEl.textContent = t(language, 'settingsWsUrlHelp');
    settingsNotificationStyleLabelEl.textContent = t(
      language,
      'notificationStyle'
    );
    settingsNotificationStyleHelpEl.textContent = t(
      language,
      'notificationStyleHelp'
    );
    settingsPersonaStyleLabelEl.textContent = t(language, 'personaStyle');
    settingsPersonaStyleHelpEl.textContent = t(language, 'personaStyleHelp');
    settingsSpeakingEnergyLabelEl.textContent = t(language, 'speakingEnergy');
    settingsIdleEnergyLabelEl.textContent = t(language, 'idleEnergy');
    settingsAccentEnergyLabelEl.textContent = t(language, 'accentEnergy');
    settingsAutoGreetingTextEl.textContent = t(language, 'autoGreeting');
    settingsAutoGreetingHelpEl.textContent = t(language, 'autoGreetingHelp');
    settingsLowDisturbModeTextEl.textContent = t(language, 'lowDisturbMode');
    settingsLowDisturbModeHelpEl.textContent = t(
      language,
      'lowDisturbModeHelp'
    );
    settingsEnableSystemCardTextEl.textContent = t(
      language,
      'enableSystemCard'
    );
    settingsEnableSystemCardHelpEl.textContent = t(
      language,
      'enableSystemCardHelp'
    );
    settingsEnableSedentaryReminderTextEl.textContent = t(
      language,
      'enableSedentaryReminder'
    );
    settingsEnableSedentaryReminderHelpEl.textContent = t(
      language,
      'enableSedentaryReminderHelp'
    );
    settingsEnablePomodoroTextEl.textContent = t(language, 'enablePomodoro');
    settingsEnablePomodoroHelpEl.textContent = t(
      language,
      'enablePomodoroHelp'
    );
    settingsEnableNetworkReminderTextEl.textContent = t(
      language,
      'enableNetworkReminder'
    );
    settingsEnableNetworkReminderHelpEl.textContent = t(
      language,
      'enableNetworkReminderHelp'
    );
    settingsPomodoroMinutesLabelEl.textContent = t(
      language,
      'pomodoroMinutes'
    );
    settingsDefaultChatDockStateLabelEl.textContent = t(
      language,
      'defaultChatDockState'
    );
    settingsDefaultChatDockStateHelpEl.textContent = t(
      language,
      'defaultChatDockStateHelp'
    );
    settingsDefaultUtilityTabLabelEl.textContent = t(
      language,
      'defaultUtilityTab'
    );
    settingsDefaultUtilityTabHelpEl.textContent = t(
      language,
      'defaultUtilityTabHelp'
    );
    setSelectOptionLabels();
  }

  function setLanguage(
    nextLanguage: PetLanguage,
    persistAsDefault = false
  ): void {
    settings = {
      ...settings,
      language: nextLanguage
    };
    language = nextLanguage;
    reminderController.setSettings(settings);
    applyLanguageCopy();
    syncStaticCopy();
    renderSystemSnapshot(desktopSnapshot);
    syncPomodoroUi();
    setConnectionVisual(socket?.readyState === WebSocket.OPEN);
    setState(currentState);
    updateModeVisual();

    if (persistAsDefault) {
      settings = savePetSettings(settings);
      syncSettingsForm();
    }
  }

  function syncFeatureVisibility(): void {
    systemCardEl.hidden = !settings.enableSystemCard;
    pomodoroCardEl.hidden = !settings.enablePomodoro;
  }

  function renderSystemSnapshot(snapshot: SystemSnapshot | null): void {
    return renderSystemSnapshotV13(snapshot);
    desktopSnapshot = snapshot;

    cpuValueEl.textContent = snapshot ? formatPercent(snapshot.cpuPercent) : '--';
    memoryValueEl.textContent = snapshot ? formatPercent(snapshot.memoryPercent) : '--';
    networkValueEl.textContent = snapshot
      ? snapshot.networkOnline
        ? '在线'
        : '离线'
      : '--';

    if (snapshot && typeof snapshot.batteryPercent === 'number') {
      const batteryText = `${formatPercent(snapshot.batteryPercent)}${
        snapshot.batteryCharging ? ' / 充电中' : ''
      }`;
      batteryValueEl.textContent = batteryText;
    } else {
      batteryValueEl.textContent = '不可用';
    }

    notificationStyleLabelEl.textContent = `提醒风格：${notificationStyleLabel(
      settings.notificationStyle
    )}`;
    windowFocusLabelEl.textContent = `窗口：${
      snapshot?.windowFocused === false && settings.lowDisturbMode
        ? '低打扰'
        : '常规'
    }`;

    setStatusItemWarning(
      cpuStatusEl,
      typeof snapshot?.cpuPercent === 'number' && snapshot.cpuPercent >= 86
    );
    setStatusItemWarning(
      memoryStatusEl,
      typeof snapshot?.memoryPercent === 'number' && snapshot.memoryPercent >= 88
    );
    setStatusItemWarning(networkStatusEl, snapshot?.networkOnline === false);
    setStatusItemWarning(
      batteryStatusEl,
      typeof snapshot?.batteryPercent === 'number' &&
        snapshot.batteryCharging === false &&
        snapshot.batteryPercent <= 20
    );
  }

  function syncPomodoroUi(): void {
    return syncPomodoroUiV13();
    pomodoroValueEl.textContent = formatPomodoroTime(pomodoroRemainingMs);
    pomodoroPauseBtnEl.textContent = pomodoroRunning ? '暂停' : '继续';
    pomodoroPauseBtnEl.disabled = !settings.enablePomodoro;
    pomodoroResetBtnEl.disabled = !settings.enablePomodoro;

    if (!settings.enablePomodoro) {
      pomodoroStartBtnEl.disabled = true;
      pomodoroPauseBtnEl.disabled = true;
      pomodoroResetBtnEl.disabled = true;
      pomodoroHintEl.textContent = '番茄钟已关闭，可在设置中重新开启。';
      return;
    }

    pomodoroStartBtnEl.disabled = pomodoroRunning;
    pomodoroHintEl.textContent = pomodoroRunning
      ? '本轮专注进行中，时间结束后会按当前提醒风格给出反馈。'
      : '准备开始一轮专注。开始后，结束提醒会跟随当前提醒风格变化。';
  }

  function resetPomodoroState(keepHint = false): void {
    return resetPomodoroStateV13(keepHint);
    if (pomodoroTimer != null) {
      window.clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }
    pomodoroRunning = false;
    pomodoroEndsAt = null;
    pomodoroRemainingMs = settings.pomodoroMinutes * 60 * 1000;
    if (!keepHint) {
      pomodoroHintEl.textContent = '准备开始一轮专注。开始后，结束提醒会跟随当前提醒风格变化。';
    }
    syncPomodoroUi();
  }

  function triggerReminder(reminder: ReminderEvent): void {
    appendAssistant(reminder.text);
    motionController.handleRichSignal({
      intent:
        reminder.kind === 'pomodoro_complete'
          ? 'positive'
          : reminder.kind === 'network_offline' ||
              reminder.kind === 'cpu_high' ||
              reminder.kind === 'memory_high' ||
              reminder.kind === 'battery_low'
            ? 'negative'
            : 'greeting',
      emotion:
        reminder.severity === 'warning'
          ? 'error'
          : settings.notificationStyle === 'productivity'
            ? 'calm'
            : 'happy',
      energy: reminder.severity === 'warning' ? 0.72 : 0.54
    });
  }

  function consumeSnapshot(snapshot: SystemSnapshot): void {
    renderSystemSnapshot(snapshot);
    if (snapshot.windowFocused === false && settings.lowDisturbMode) {
      setQuietMode(true);
    }

    const reminders = reminderController.ingestSnapshot(snapshot);
    reminders.forEach((reminder) => {
      triggerReminder(reminder);
    });
  }

  function appendBubble(kind: LogKind, text: string): void {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${kind}`;
    bubble.textContent = text;
    logEl.appendChild(bubble);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function appendSystem(text: string): void {
    return appendSystemV13(text);
    appendBubble('system', text);
  }

  function appendUser(text: string): void {
    return appendUserV13(text);
    appendBubble('user', `${settings.userName}：${text}`);
  }

  function appendAssistant(text: string): void {
    return appendAssistantV13(text);
    appendBubble('assistant', `${settings.assistantName}：${text}`);
  }

  function setConnectionVisual(connected: boolean): void {
    return setConnectionVisualV13(connected);
    connEl.textContent = connected ? '已连接' : '连接中';
    connEl.style.color = connected ? '#22c55e' : '#f59e0b';
  }

  function setState(state: PetTransportState): void {
    return setStateV13(state);
    currentState = state;
    appEl.dataset.state = state;
    stateEl.textContent = `状态: ${STATE_LABELS[state]}`;
    petStateEl.textContent = STATE_LABELS[state].toUpperCase();
  }

  function updateModeVisual(): void {
    return updateModeVisualV13();
    const quiet = isQuietMode && settings.lowDisturbMode;
    modeEl.textContent = quiet ? '模式: 低打扰' : '模式: 常规';
    modeEl.style.color = quiet ? '#94a3b8' : '#e2e8f0';
  }

  function syncStaticCopy(): void {
    return syncStaticCopyV13();
    titleEl.textContent = `${settings.assistantName}桌宠联动面板`;
    document.title = `${settings.assistantName} Pet UI`;
    petTitleEl.textContent = `${PERSONA_LABELS[settings.personaStyle]}陪伴状态 · ${MOOD_LABELS[mood]}`;
    live2dTipEl.textContent = '模型: Hiyori · 不同部位会有不同反馈';
    notificationStyleLabelEl.textContent =
      '提醒风格：' + notificationStyleLabel(settings.notificationStyle);
  }

  function syncSettingsForm(): void {
    return syncSettingsFormV13();
    settingsAssistantNameEl.value = settings.assistantName;
    settingsUserNameEl.value = settings.userName;
    settingsWsUrlEl.value = settings.wsUrl;
    settingsNotificationStyleEl.value = settings.notificationStyle;
    settingsPersonaStyleEl.value = settings.personaStyle;
    settingsAutoGreetingEl.checked = settings.autoGreeting;
    settingsLowDisturbModeEl.checked = settings.lowDisturbMode;
    settingsEnableSystemCardEl.checked = settings.enableSystemCard;
    settingsEnableSedentaryReminderEl.checked = settings.enableSedentaryReminder;
    settingsEnablePomodoroEl.checked = settings.enablePomodoro;
    settingsEnableNetworkReminderEl.checked = settings.enableNetworkReminder;
    settingsSpeakingEnergyEl.value = String(settings.speakingEnergy);
    settingsIdleEnergyEl.value = String(settings.idleEnergy);
    settingsAccentEnergyEl.value = String(settings.accentEnergy);
    settingsPomodoroMinutesEl.value = String(settings.pomodoroMinutes);
    settingsSpeakingEnergyValueEl.textContent = sliderText(
      settings.speakingEnergy
    );
    settingsIdleEnergyValueEl.textContent = sliderText(settings.idleEnergy);
    settingsAccentEnergyValueEl.textContent = sliderText(settings.accentEnergy);
    settingsPomodoroMinutesValueEl.textContent = String(settings.pomodoroMinutes);
    wsUrlEl.value = settings.wsUrl;
    syncFeatureVisibility();
  }

  function currentFormSettings(): PetSettings {
    return currentFormSettingsV13();
    return sanitizeSettings({
      ...settings,
      assistantName: settingsAssistantNameEl.value,
      userName: settingsUserNameEl.value,
      wsUrl: settingsWsUrlEl.value,
      notificationStyle:
        settingsNotificationStyleEl.value as PetNotificationStyle,
      personaStyle: settingsPersonaStyleEl.value as PetPersonaStyle,
      autoGreeting: settingsAutoGreetingEl.checked,
      lowDisturbMode: settingsLowDisturbModeEl.checked,
      enableSystemCard: settingsEnableSystemCardEl.checked,
      enableSedentaryReminder: settingsEnableSedentaryReminderEl.checked,
      enablePomodoro: settingsEnablePomodoroEl.checked,
      enableNetworkReminder: settingsEnableNetworkReminderEl.checked,
      speakingEnergy: Number(settingsSpeakingEnergyEl.value),
      idleEnergy: Number(settingsIdleEnergyEl.value),
      accentEnergy: Number(settingsAccentEnergyEl.value),
      pomodoroMinutes: Number(settingsPomodoroMinutesEl.value)
    });
  }

  function renderSystemSnapshotV13(snapshot: SystemSnapshot | null): void {
    desktopSnapshot = snapshot;

    cpuValueEl.textContent = snapshot ? formatPercent(snapshot.cpuPercent) : '--';
    memoryValueEl.textContent = snapshot
      ? formatPercent(snapshot.memoryPercent)
      : '--';
    networkValueEl.textContent = snapshot
      ? snapshot.networkOnline
        ? t(language, 'online')
        : t(language, 'offline')
      : '--';

    if (snapshot && typeof snapshot.batteryPercent === 'number') {
      batteryValueEl.textContent = `${formatPercent(snapshot.batteryPercent)}${
        snapshot.batteryCharging ? t(language, 'chargingSuffix') : ''
      }`;
    } else {
      batteryValueEl.textContent = t(language, 'unavailable');
    }

    notificationStyleLabelEl.textContent = `${t(
      language,
      'notificationStyleLabel'
    )} / ${getNotificationStyleLabel(language, settings.notificationStyle)}`;
    windowFocusLabelEl.textContent = `${t(language, 'windowModeLabel')} / ${
      snapshot?.windowFocused === false && settings.lowDisturbMode
        ? t(language, 'modeQuiet')
        : t(language, 'modeNormal')
    }`;

    setStatusItemWarning(
      cpuStatusEl,
      typeof snapshot?.cpuPercent === 'number' && snapshot.cpuPercent >= 86
    );
    setStatusItemWarning(
      memoryStatusEl,
      typeof snapshot?.memoryPercent === 'number' &&
        snapshot.memoryPercent >= 88
    );
    setStatusItemWarning(networkStatusEl, snapshot?.networkOnline === false);
    setStatusItemWarning(
      batteryStatusEl,
      typeof snapshot?.batteryPercent === 'number' &&
        snapshot.batteryCharging === false &&
        snapshot.batteryPercent <= 20
    );
  }

  function syncPomodoroUiV13(): void {
    pomodoroValueEl.textContent = formatPomodoroTime(pomodoroRemainingMs);
    pomodoroPauseBtnEl.textContent = pomodoroRunning
      ? t(language, 'pomodoroPause')
      : t(language, 'pomodoroResume');
    pomodoroStartBtnEl.textContent = t(language, 'pomodoroStart');
    pomodoroResetBtnEl.textContent = t(language, 'pomodoroReset');
    pomodoroPauseBtnEl.disabled = !settings.enablePomodoro;
    pomodoroResetBtnEl.disabled = !settings.enablePomodoro;

    if (!settings.enablePomodoro) {
      pomodoroStartBtnEl.disabled = true;
      pomodoroPauseBtnEl.disabled = true;
      pomodoroResetBtnEl.disabled = true;
      pomodoroHintEl.textContent = t(language, 'pomodoroDisabled');
      return;
    }

    pomodoroStartBtnEl.disabled = pomodoroRunning;
    if (!pomodoroRunning && pomodoroRemainingMs <= 0) {
      pomodoroHintEl.textContent =
        settings.notificationStyle === 'productivity'
          ? isEnglishMode()
            ? 'Focus session complete. Take a short break, then move into the next sprint.'
            : '本轮番茄钟已完成，可以短暂休息后继续下一轮。'
          : isEnglishMode()
            ? 'That focus round is done. Rest for a moment and I will stay with you.'
            : '这一轮已经完成啦，休息一下也没关系，我会继续陪着你。';
      return;
    }

    pomodoroHintEl.textContent = pomodoroRunning
      ? t(language, 'pomodoroRunning')
      : t(language, 'pomodoroReady');
  }

  function resetPomodoroStateV13(keepHint = false): void {
    if (pomodoroTimer != null) {
      window.clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }
    pomodoroRunning = false;
    pomodoroEndsAt = null;
    pomodoroRemainingMs = settings.pomodoroMinutes * 60 * 1000;
    if (!keepHint) {
      pomodoroHintEl.textContent = t(language, 'pomodoroReady');
    }
    syncPomodoroUiV13();
  }

  function appendSystemV13(text: string): void {
    let normalized = text;

    if (text.includes('杩炴帴澶辫触')) {
      normalized = isEnglishMode()
        ? `Connection failed: ${settings.wsUrl}`
        : `连接失败：${settings.wsUrl}`;
    } else if (text.includes('妗屽疇鎺у埗闈㈡澘')) {
      normalized = isEnglishMode()
        ? 'Desk companion control deck ready.'
        : '桌宠控制面板已就绪。';
    } else if (text.includes('杩炴帴鎴愬姛')) {
      normalized = isEnglishMode()
        ? `Connected: ${settings.wsUrl}`
        : `连接成功：${settings.wsUrl}`;
    } else if (text.includes('杩炴帴鏂紑')) {
      normalized = isEnglishMode()
        ? `Connection lost, retrying: ${settings.wsUrl}`
        : `连接断开，自动重连：${settings.wsUrl}`;
    } else if (
      text.includes('缃戠粶鎴栦覆鍙ｅ紓甯') ||
      text.includes('serial_error')
    ) {
      normalized = isEnglishMode()
        ? 'Network or serial bridge error.'
        : '网络或串口桥接异常。';
    }

    appendBubble('system', normalized);
  }

  function appendUserV13(text: string): void {
    appendBubble(
      'user',
      isEnglishMode()
        ? `${formatUserName(settings)}: ${text}`
        : `${settings.userName}：${text}`
    );
  }

  function appendAssistantV13(text: string): void {
    const normalized =
      text.includes('鍙挌') || text.includes('敜閱掕瘝')
        ? isEnglishMode()
          ? 'Wake phrase detected. I am listening now.'
          : '叮咚，听见唤醒词了。'
        : text;
    appendBubble(
      'assistant',
      isEnglishMode()
        ? `${formatAssistantName(settings)}: ${normalized}`
        : `${settings.assistantName}：${normalized}`
    );
  }

  function setConnectionVisualV13(connected: boolean): void {
    connEl.classList.toggle('is-live', connected);
    connEl.classList.toggle('is-wait', !connected);
    connEl.lastElementChild!.textContent = connected
      ? t(language, 'connConnected')
      : t(language, 'connConnecting');
  }

  function setStateV13(state: PetTransportState): void {
    currentState = state;
    appEl.dataset.state = state;
    stateEl.lastElementChild!.textContent = `${t(language, 'stateLabel')} / ${stateLabel(
      state
    )}`;
    petStateEl.textContent = stateLabel(state).toUpperCase();
  }

  function updateModeVisualV13(): void {
    const quiet = isQuietMode && settings.lowDisturbMode;
    modeEl.lastElementChild!.textContent = `${t(language, 'modeLabel')} / ${
      quiet ? t(language, 'modeQuiet') : t(language, 'modeNormal')
    }`;
  }

  function syncStaticCopyV13(): void {
    titleEl.textContent = isEnglishMode()
      ? `NERV / ${displayAssistantName()} Desk Companion`
      : `NERV / ${settings.assistantName}桌宠终端`;
    document.title = isEnglishMode()
      ? `${displayAssistantName()} Desk Companion`
      : `${settings.assistantName} 桌宠终端`;
    petTitleEl.textContent = `${getPersonaLabel(
      language,
      settings.personaStyle
    )} / ${moodLabel(mood)}`;
    live2dTipEl.lastElementChild!.textContent = t(language, 'modelHint');
    notificationStyleLabelEl.textContent = `${t(
      language,
      'notificationStyleLabel'
    )} / ${getNotificationStyleLabel(language, settings.notificationStyle)}`;
  }

  function syncSettingsFormV13(): void {
    settingsAssistantNameEl.value = settings.assistantName;
    settingsUserNameEl.value = settings.userName;
    settingsLanguageEl.value = settings.language;
    settingsDisplayLanguageModeEl.value = settings.displayLanguageMode;
    settingsWsUrlEl.value = settings.wsUrl;
    settingsNotificationStyleEl.value = settings.notificationStyle;
    settingsPersonaStyleEl.value = settings.personaStyle;
    settingsAutoGreetingEl.checked = settings.autoGreeting;
    settingsLowDisturbModeEl.checked = settings.lowDisturbMode;
    settingsEnableSystemCardEl.checked = settings.enableSystemCard;
    settingsEnableSedentaryReminderEl.checked =
      settings.enableSedentaryReminder;
    settingsEnablePomodoroEl.checked = settings.enablePomodoro;
    settingsEnableNetworkReminderEl.checked = settings.enableNetworkReminder;
    settingsSpeakingEnergyEl.value = String(settings.speakingEnergy);
    settingsIdleEnergyEl.value = String(settings.idleEnergy);
    settingsAccentEnergyEl.value = String(settings.accentEnergy);
    settingsPomodoroMinutesEl.value = String(settings.pomodoroMinutes);
    settingsDefaultChatDockStateEl.value = settings.defaultChatDockState;
    settingsDefaultUtilityTabEl.value = settings.defaultUtilityTab;
    settingsSpeakingEnergyValueEl.textContent = sliderText(
      settings.speakingEnergy
    );
    settingsIdleEnergyValueEl.textContent = sliderText(settings.idleEnergy);
    settingsAccentEnergyValueEl.textContent = sliderText(settings.accentEnergy);
    settingsPomodoroMinutesValueEl.textContent = String(settings.pomodoroMinutes);
    wsUrlEl.value = settings.wsUrl;
    language = settings.language;
    chatDockState = settings.defaultChatDockState;
    utilityTabState = settings.defaultUtilityTab;
    applyLanguageCopy();
    syncFeatureVisibility();
    setChatDockState(chatDockState);
    setUtilityTab(utilityTabState);
  }

  function currentFormSettingsV13(): PetSettings {
    return sanitizeSettings({
      ...settings,
      assistantName: settingsAssistantNameEl.value,
      userName: settingsUserNameEl.value,
      wsUrl: settingsWsUrlEl.value,
      language: settingsLanguageEl.value as PetLanguage,
      displayLanguageMode:
        settingsDisplayLanguageModeEl.value as PetDisplayLanguageMode,
      notificationStyle:
        settingsNotificationStyleEl.value as PetNotificationStyle,
      personaStyle: settingsPersonaStyleEl.value as PetPersonaStyle,
      autoGreeting: settingsAutoGreetingEl.checked,
      lowDisturbMode: settingsLowDisturbModeEl.checked,
      enableSystemCard: settingsEnableSystemCardEl.checked,
      enableSedentaryReminder: settingsEnableSedentaryReminderEl.checked,
      enablePomodoro: settingsEnablePomodoroEl.checked,
      enableNetworkReminder: settingsEnableNetworkReminderEl.checked,
      speakingEnergy: Number(settingsSpeakingEnergyEl.value),
      idleEnergy: Number(settingsIdleEnergyEl.value),
      accentEnergy: Number(settingsAccentEnergyEl.value),
      pomodoroMinutes: Number(settingsPomodoroMinutesEl.value),
      defaultChatDockState:
        settingsDefaultChatDockStateEl.value as PetChatDockState,
      defaultUtilityTab: settingsDefaultUtilityTabEl.value as PetUtilityTab
    });
  }

  function markActivity(): void {
    lastActivityAt = Date.now();
    reminderController.markActivity(lastActivityAt);
  }

  function nudgeMood(delta: number): void {
    const previousMood = mood;
    moodScore = Math.max(-6, Math.min(6, moodScore + delta));
    mood = getMoodFromScore(moodScore);

    if (mood !== previousMood) {
      syncStaticCopy();
      if (mood === 'warm' || mood === 'guarded') {
        appendAssistant(getMoodShiftLine(settings, mood));
      }
    }
  }

  function decayMood(): void {
    if (moodScore === 0) {
      return;
    }

    const previousMood = mood;
    moodScore += moodScore > 0 ? -0.35 : 0.35;
    if (Math.abs(moodScore) < 0.4) {
      moodScore = 0;
    }
    mood = getMoodFromScore(moodScore);

    if (mood !== previousMood) {
      syncStaticCopy();
    }
  }

  function getTouchStreak(zone: PetTouchZone): number {
    const now = Date.now();
    if (lastTouchZone === zone && now - lastTouchAt <= TOUCH_STREAK_WINDOW_MS) {
      touchStreak = Math.min(3, touchStreak + 1);
    } else {
      touchStreak = 1;
    }
    lastTouchZone = zone;
    lastTouchAt = now;
    return touchStreak;
  }

  function moodDeltaForTouch(zone: PetTouchZone, streak: number): number {
    const level = Math.min(3, Math.max(1, streak));

    switch (zone) {
      case 'head':
        return level >= 3 ? 1.3 : level >= 2 ? 0.9 : 0.6;
      case 'face':
        return level >= 3 ? 1.0 : level >= 2 ? 0.7 : 0.4;
      case 'chest':
        return level >= 3 ? 1.1 : level >= 2 ? 0.8 : 0.5;
      case 'hands':
        return level >= 3 ? 1.4 : level >= 2 ? 1.0 : 0.7;
      case 'lower':
      default:
        return level >= 3 ? -1.8 : level >= 2 ? -1.2 : -0.7;
    }
  }

  function moodDeltaForHold(zone: PetTouchZone): number {
    switch (zone) {
      case 'head':
        return 1.0;
      case 'face':
        return 0.7;
      case 'chest':
        return 0.9;
      case 'hands':
        return 1.1;
      case 'lower':
      default:
        return -1.2;
    }
  }

  function moodDeltaForDrag(zone: PetTouchZone, intensity: number): number {
    const scale = Math.max(0.35, Math.min(1, intensity));
    switch (zone) {
      case 'head':
        return 0.7 * scale;
      case 'face':
        return 0.45 * scale;
      case 'chest':
        return 0.55 * scale;
      case 'hands':
        return 0.8 * scale;
      case 'lower':
      default:
        return -0.8 * scale;
    }
  }

  function clearHoverTimer(): void {
    if (hoverTimer != null) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  function clearHoldTimer(): void {
    if (holdTimer != null) {
      window.clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  function scheduleHoverReaction(zone: PetTouchZone): void {
    if (isQuietMode && settings.lowDisturbMode) {
      clearHoverTimer();
      return;
    }

    if (hoverZone === zone && hoverTimer != null) {
      return;
    }

    clearHoverTimer();
    hoverZone = zone;
    hoverTimer = window.setTimeout(() => {
      hoverTimer = null;
      if (Date.now() - lastHoverReplyAt < TOUCH_HOVER_COOLDOWN_MS) {
        return;
      }
      lastHoverReplyAt = Date.now();
      motionController.handlePointerHoverZone(zone);
      appendAssistant(getHoverReply(settings, zone));
    }, TOUCH_HOVER_MS);
  }

  function maybeAutoGreet(line: string): void {
    const now = Date.now();
    if (!settings.autoGreeting) {
      return;
    }
    if (now - lastGreetingAt < AUTO_GREET_COOLDOWN_MS) {
      return;
    }
    lastGreetingAt = now;
    appendAssistant(line);
    motionController.handlePointerEnter();
  }

  function scheduleReconnect(): void {
    if (reconnectTimer != null) {
      return;
    }
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connectWsV15();
    }, 1800);
  }

  function closeSocket(): void {
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
      socket = null;
    }
  }

  function handleRichEvent(eventType: string, payload: Record<string, unknown>): void {
    switch (eventType) {
      case 'assistant_intent':
      case 'assistant_emotion':
        motionController.handleRichSignal(payload as PetRichSignal);
        break;
      case 'tts_start':
        motionController.handleTtsStart(Number(payload.energy ?? 0.8));
        break;
      case 'tts_end':
        motionController.handleTtsEnd();
        break;
      case 'tts_viseme':
      case 'tts_energy':
        motionController.handleTtsEnergy(Number(payload.energy ?? 0));
        break;
      default:
        break;
    }
  }

  function connectWs(): void {
    closeSocket();
    setConnectionVisual(false);

    try {
      socket = new WebSocket(settings.wsUrl);
    } catch {
      appendSystem(`连接失败：${settings.wsUrl}`);
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      setConnectionVisual(true);
      appendSystem(`连接成功：${settings.wsUrl}`);
    };

    socket.onclose = () => {
      setConnectionVisual(false);
      appendSystem(`连接断开，自动重连：${settings.wsUrl}`);
      scheduleReconnect();
    };

    socket.onerror = () => {
      setConnectionVisual(false);
    };

    socket.onmessage = (message: MessageEvent<string>) => {
      markActivity();

      let parsed: any;
      try {
        parsed = JSON.parse(message.data);
      } catch {
        return;
      }

      const eventType = String(parsed.event || '');
      const payload = (parsed.payload || {}) as Record<string, unknown>;

      switch (eventType) {
        case 'state_changed': {
          const state = String(payload.state || 'unknown') as PetTransportState;
          setState(state);
          motionController.setTransportState(state);
          break;
        }
        case 'wake_detected': {
          motionController.handleWake(String(payload.keyword || ''));
          appendAssistant(
            isEnglishMode()
              ? 'Ding. Wake phrase detected. I am listening now.'
              : '叮咚，听见唤醒词了。'
          );
          break;
        }
        case 'user_text': {
          const text = String(payload.text || '');
          if (text) {
            appendUser(text);
            motionController.handleUserText(text);
          }
          break;
        }
        case 'assistant_text': {
          const text = String(payload.text || '');
          if (text) {
            appendAssistant(text);
            motionController.handleAssistantText(text);
          }
          break;
        }
        case 'network_error': {
          appendSystem(String(payload.detail || '网络或串口异常'));
          setState('unknown');
          break;
        }
        default: {
          handleRichEvent(eventType, payload);
          break;
        }
      }
    };
  }

  function connectWsV15(): void {
    closeSocket();
    setConnectionVisual(false);

    try {
      socket = new WebSocket(settings.wsUrl);
    } catch {
      appendSystemOnce(
        'connect-failed',
        isEnglishMode()
          ? `Connection failed: ${settings.wsUrl}`
          : `连接失败：${settings.wsUrl}`,
        2200
      );
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      setConnectionVisual(true);
      appendSystemOnce(
        'connect-success',
        isEnglishMode()
          ? `Connected: ${settings.wsUrl}`
          : `连接成功：${settings.wsUrl}`,
        2200
      );
    };

    socket.onclose = () => {
      setConnectionVisual(false);
      appendSystemOnce(
        'connect-closed',
        isEnglishMode()
          ? `Connection lost, retrying: ${settings.wsUrl}`
          : `连接断开，自动重连：${settings.wsUrl}`,
        2200
      );
      scheduleReconnect();
    };

    socket.onerror = () => {
      setConnectionVisual(false);
    };

    socket.onmessage = (message: MessageEvent<string>) => {
      markActivity();

      let parsed: any;
      try {
        parsed = JSON.parse(message.data);
      } catch {
        return;
      }

      const eventType = String(parsed.event || '');
      const payload = (parsed.payload || {}) as Record<string, unknown>;

      switch (eventType) {
        case 'state_changed': {
          const state = String(payload.state || 'unknown') as PetTransportState;
          setState(state);
          motionController.setTransportState(state);
          break;
        }
        case 'wake_detected': {
          motionController.handleWake(String(payload.keyword || ''));
          appendAssistant(
            isEnglishMode()
              ? 'Ding. Wake phrase detected. I am listening now.'
              : '叮咚，听见唤醒词了。'
          );
          break;
        }
        case 'user_text': {
          const text = String(payload.text || '');
          if (text) {
            appendUser(text);
            motionController.handleUserText(text);
          }
          break;
        }
        case 'assistant_text': {
          const text = String(payload.text || '');
          if (text) {
            appendAssistant(text);
            maybeExplainBackendLanguage(text);
            motionController.handleAssistantText(text);
          }
          break;
        }
        case 'network_error': {
          appendSystem(
            String(
              payload.detail ||
                (isEnglishMode()
                  ? 'Network or serial exception'
                  : '网络或串口异常')
            )
          );
          setState('unknown');
          break;
        }
        default: {
          handleRichEvent(eventType, payload);
          break;
        }
      }
    };
  }

  function saveWsAndReconnect(): void {
    settings = savePetSettings({
      ...settings,
      wsUrl: wsUrlEl.value.trim() || settings.wsUrl
    });
    reminderController.setSettings(settings);
    syncSettingsForm();
    applyMotionSettings();
    renderSystemSnapshot(desktopSnapshot);
    connectWsV15();
  }

  function setQuietMode(nextQuiet: boolean): void {
    if (isQuietMode === nextQuiet) {
      return;
    }
    isQuietMode = nextQuiet;
    updateModeVisual();
    applyMotionSettings();
    renderSystemSnapshot(desktopSnapshot);
  }

  function openSettings(): void {
    appEl.classList.add('settings-open');
    settingsDrawerEl.setAttribute('aria-hidden', 'false');
  }

  function closeSettings(): void {
    appEl.classList.remove('settings-open');
    settingsDrawerEl.setAttribute('aria-hidden', 'true');
  }

  function tickPomodoro(): void {
    if (!pomodoroRunning || pomodoroEndsAt == null) {
      return;
    }

    pomodoroRemainingMs = Math.max(0, pomodoroEndsAt - Date.now());
    syncPomodoroUi();

    if (pomodoroRemainingMs > 0) {
      return;
    }

    if (pomodoroTimer != null) {
      window.clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }

    pomodoroRunning = false;
    pomodoroEndsAt = null;
    const reminder = reminderController.createPomodoroCompleteReminder();
    pomodoroHintEl.textContent =
      settings.notificationStyle === 'productivity'
        ? '本轮番茄钟已完成，可以短暂休息后继续下一轮。'
        : '这一轮已经完成啦，休息一下，我会继续陪着你。';
    syncPomodoroUi();
    triggerReminder(reminder);
  }

  function startPomodoro(): void {
    if (!settings.enablePomodoro || pomodoroRunning) {
      return;
    }

    if (pomodoroRemainingMs <= 0) {
      pomodoroRemainingMs = settings.pomodoroMinutes * 60 * 1000;
    }

    pomodoroRunning = true;
    pomodoroEndsAt = Date.now() + pomodoroRemainingMs;
    if (pomodoroTimer != null) {
      window.clearInterval(pomodoroTimer);
    }
    pomodoroTimer = window.setInterval(tickPomodoro, POMODORO_TICK_MS);
    syncPomodoroUi();
  }

  function pausePomodoro(): void {
    if (!settings.enablePomodoro) {
      return;
    }

    if (pomodoroRunning && pomodoroEndsAt != null) {
      pomodoroRemainingMs = Math.max(0, pomodoroEndsAt - Date.now());
      pomodoroRunning = false;
      pomodoroEndsAt = null;
      if (pomodoroTimer != null) {
        window.clearInterval(pomodoroTimer);
        pomodoroTimer = null;
      }
      syncPomodoroUi();
      return;
    }

    if (!pomodoroRunning && pomodoroRemainingMs > 0) {
      startPomodoro();
    }
  }

  async function initializeDesktopBridge(): Promise<void> {
    if (!window.petDesktop) {
      return;
    }

    try {
      const snapshot = await window.petDesktop.getSnapshot();
      consumeSnapshot(snapshot);
    } catch {
      renderSystemSnapshot(null);
    }

    unsubscribeDesktopStatus?.();
    unsubscribeDesktopStatus = window.petDesktop.onStatusChanged((snapshot) => {
      consumeSnapshot(snapshot);
    });
  }

  function saveSettingsFromForm(): void {
    const previousWsUrl = settings.wsUrl;
    settings = savePetSettings(currentFormSettings());
    reminderController.setSettings(settings);
    syncSettingsForm();
    syncStaticCopy();
    updateModeVisual();
    applyMotionSettings();
    resetPomodoroState(true);
    renderSystemSnapshot(desktopSnapshot);
    closeSettings();

    if (settings.wsUrl !== previousWsUrl) {
      connectWsV15();
    }
  }

  function resetSettings(): void {
    settings = savePetSettings(getDefaultPetSettings());
    reminderController.setSettings(settings);
    syncSettingsForm();
    syncStaticCopy();
    updateModeVisual();
    applyMotionSettings();
    resetPomodoroState(true);
    renderSystemSnapshot(desktopSnapshot);
  }

  function bindPointerInteractions(): void {
    live2dWrapEl.addEventListener('mouseenter', () => {
      markActivity();
      motionController.handlePointerEnter();
    });

    live2dWrapEl.addEventListener('mousemove', (event: MouseEvent) => {
      markActivity();
      const rect = live2dWrapEl.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      motionController.handlePointerMove(x, y);
      const zone = classifyTouchZone(event, live2dWrapEl);
      scheduleHoverReaction(zone);

      if (dragZone != null) {
        const dx = event.clientX - dragStartX;
        const dy = event.clientY - dragStartY;
        const distance = Math.hypot(dx, dy);

        if (!dragActive && distance >= TOUCH_DRAG_THRESHOLD_PX) {
          dragActive = true;
          suppressClickUntil = Date.now() + 320;
        }

        if (
          dragActive &&
          Date.now() - lastDragReactionAt >= TOUCH_DRAG_REACT_MS
        ) {
          const intensity = Math.min(1, distance / 90);
          lastDragReactionAt = Date.now();
          motionController.handlePointerDragZone(dragZone, intensity);
          nudgeMood(moodDeltaForDrag(dragZone, intensity));
          appendAssistant(getDragReply(settings, dragZone));
        }
      }
    });

    live2dWrapEl.addEventListener('mouseleave', () => {
      clearHoverTimer();
      clearHoldTimer();
      hoverZone = null;
      dragZone = null;
      dragActive = false;
      motionController.handlePointerLeave();
    });

    live2dWrapEl.addEventListener('pointerdown', (event: PointerEvent) => {
      markActivity();
      const zone = classifyTouchZone(event as unknown as MouseEvent, live2dWrapEl);
      dragZone = zone;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragActive = false;
      clearHoldTimer();
      holdTimer = window.setTimeout(() => {
        holdTimer = null;
        suppressClickUntil = Date.now() + 280;
        motionController.handlePointerHoldZone(zone);
        nudgeMood(moodDeltaForHold(zone));
        appendAssistant(getHoldReply(settings, zone));
      }, TOUCH_HOLD_MS);
    });

    live2dWrapEl.addEventListener('pointerup', () => {
      clearHoldTimer();
      dragZone = null;
      dragActive = false;
    });

    live2dWrapEl.addEventListener('pointercancel', () => {
      clearHoldTimer();
      dragZone = null;
      dragActive = false;
    });

    live2dWrapEl.addEventListener('click', (event: MouseEvent) => {
      markActivity();
      if (Date.now() < suppressClickUntil) {
        return;
      }
      const zone = classifyTouchZone(event, live2dWrapEl);
      const streak = getTouchStreak(zone);
      motionController.handlePointerTapZone(zone, streak);
      nudgeMood(moodDeltaForTouch(zone, streak));
      appendAssistant(getTouchReply(settings, zone, streak));
    });
  }

  function bindSettingsInteractions(): void {
    settingsBtnEl.addEventListener('click', openSettings);
    settingsCloseBtnEl.addEventListener('click', closeSettings);
    settingsBackdropEl.addEventListener('click', closeSettings);
    settingsSaveBtnEl.addEventListener('click', saveSettingsFromForm);
    settingsResetBtnEl.addEventListener('click', resetSettings);
    saveBtnEl.addEventListener('click', saveWsAndReconnect);
    langZhBtnEl.addEventListener('click', () => {
      settingsLanguageEl.value = 'zh-CN';
      setLanguage('zh-CN', true);
    });
    langEnBtnEl.addEventListener('click', () => {
      settingsLanguageEl.value = 'en';
      setLanguage('en', true);
    });
    utilityTabStatusEl.addEventListener('click', () => {
      setUtilityTab('status');
    });
    utilityTabFocusEl.addEventListener('click', () => {
      setUtilityTab('focus');
    });
    utilityTabToolsEl.addEventListener('click', () => {
      setUtilityTab('tools');
    });
    chatCollapseBtnEl.addEventListener('click', () => {
      setChatDockState('collapsed');
    });
    chatPeekBtnEl.addEventListener('click', () => {
      setChatDockState('peek');
    });
    chatExpandBtnEl.addEventListener('click', () => {
      setChatDockState('expanded');
    });
    chatDockHandleEl.addEventListener('click', () => {
      const nextState =
        chatDockState === 'collapsed'
          ? 'peek'
          : chatDockState === 'peek'
            ? 'expanded'
            : 'collapsed';
      setChatDockState(nextState);
    });
    settingsLanguageEl.addEventListener('change', () => {
      setLanguage(settingsLanguageEl.value as PetLanguage);
    });
    settingsDefaultChatDockStateEl.addEventListener('change', () => {
      setChatDockState(
        settingsDefaultChatDockStateEl.value as PetChatDockState
      );
    });
    settingsDefaultUtilityTabEl.addEventListener('change', () => {
      setUtilityTab(settingsDefaultUtilityTabEl.value as PetUtilityTab);
    });

    settingsSpeakingEnergyEl.addEventListener('input', () => {
      settingsSpeakingEnergyValueEl.textContent = sliderText(
        Number(settingsSpeakingEnergyEl.value)
      );
    });
    settingsIdleEnergyEl.addEventListener('input', () => {
      settingsIdleEnergyValueEl.textContent = sliderText(
        Number(settingsIdleEnergyEl.value)
      );
    });
    settingsAccentEnergyEl.addEventListener('input', () => {
      settingsAccentEnergyValueEl.textContent = sliderText(
        Number(settingsAccentEnergyEl.value)
      );
    });
    settingsPomodoroMinutesEl.addEventListener('input', () => {
      settingsPomodoroMinutesValueEl.textContent = String(
        Number(settingsPomodoroMinutesEl.value)
      );
    });

    wsUrlEl.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        saveWsAndReconnect();
      }
    });

    pomodoroStartBtnEl.addEventListener('click', () => {
      startPomodoro();
    });
    pomodoroPauseBtnEl.addEventListener('click', () => {
      pausePomodoro();
    });
    pomodoroResetBtnEl.addEventListener('click', () => {
      resetPomodoroState();
    });
  }

  function bindWindowModeEvents(): void {
    window.addEventListener('blur', () => {
      setQuietMode(true);
    });

    window.addEventListener('focus', () => {
      markActivity();
      setQuietMode(false);
      maybeAutoGreet(getFocusGreeting(settings));
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        setQuietMode(true);
      } else {
        markActivity();
        setQuietMode(false);
      }
    });
  }

  function startCompanionLoop(): void {
    window.setInterval(() => {
      decayMood();
      const idleFor = Date.now() - lastActivityAt;
      if (idleFor < COMPANION_MIN_IDLE_MS) {
        return;
      }

      if (Date.now() - lastCompanionAt < COMPANION_COOLDOWN_MS) {
        return;
      }

      if (isQuietMode && settings.lowDisturbMode) {
        return;
      }

      lastCompanionAt = Date.now();
      appendAssistant(getCompanionLine(settings, mood));
      motionController.handlePointerEnter();
    }, COMPANION_CHECK_MS);
  }

  syncStaticCopy();
  syncSettingsForm();
  updateModeVisual();
  applyMotionSettings();
  resetPomodoroState(true);
  renderSystemSnapshot(null);
  setState('unknown');
  setConnectionVisual(false);
  appendSystem(
    isEnglishMode()
      ? 'Desk companion control deck is ready.'
      : '桌宠控制面板已就绪。'
  );

  bindPointerInteractions();
  bindSettingsInteractions();
  bindWindowModeEvents();
  startCompanionLoop();
  void initializeDesktopBridge();
  connectWsV15();
  maybeAutoGreet(getTimeBasedGreeting(settings));
}
