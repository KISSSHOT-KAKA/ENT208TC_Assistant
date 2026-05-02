import { LAppLive2DManager } from './lapplive2dmanager';
import {
  MOTION_COOLDOWNS,
  PetEmotion,
  PetIntent,
  PetRichSignal,
  PetTransportState,
  clamp,
  emotionFromIntent,
  inferIntentFromText,
  normalizeEmotion,
  normalizeIntent,
  transportStateToPose
} from './pet_motion_config';
import {
  PetSettings,
  getDefaultPetSettings
} from './pet_settings';

export class PetMotionController {
  private readonly live2dManager: LAppLive2DManager;
  private transportState: PetTransportState = 'unknown';
  private speakingTimer: number | null = null;
  private settings: PetSettings = getDefaultPetSettings();

  public constructor(live2dManager: LAppLive2DManager) {
    this.live2dManager = live2dManager;
    this.live2dManager.setPosePreset(transportStateToPose(this.transportState));
    this.live2dManager.configureBehavior(this.settings);
  }

  public dispose(): void {
    if (this.speakingTimer != null) {
      window.clearTimeout(this.speakingTimer);
      this.speakingTimer = null;
    }
  }

  public setTransportState(state: PetTransportState): void {
    this.transportState = state;
    this.live2dManager.setPosePreset(transportStateToPose(state));

    if (state === 'idle') {
      this.live2dManager.playIdleVariant();
    }

    if (state !== 'speaking') {
      this.live2dManager.setSpeakingLevel(0);
    }

    if (state === 'unknown') {
      this.live2dManager.clearAccent();
    }
  }

  public setSettings(settings: PetSettings): void {
    this.settings = settings;
    this.live2dManager.configureBehavior(settings);
    this.live2dManager.setPosePreset(transportStateToPose(this.transportState));
  }

  public handleWake(keyword?: string): void {
    const intent = inferIntentFromText(keyword);
    const energy = intent === 'dance' ? 1 : 0.72;
    this.live2dManager.setIntentAccent(
      intent === 'neutral' ? 'greeting' : intent,
      'curious',
      energy,
      MOTION_COOLDOWNS.wakeAccentMs
    );
    this.live2dManager.playTapReaction();
  }

  public handleUserText(text: string): void {
    const intent = inferIntentFromText(text);
    const emotion = emotionFromIntent(intent);
    this.live2dManager.setPosePreset(transportStateToPose('thinking'));
    this.applyIntent(intent, emotion, false);
  }

  public handleAssistantText(text: string): void {
    const intent = inferIntentFromText(text);
    const emotion = emotionFromIntent(intent);

    this.live2dManager.setPosePreset(transportStateToPose('speaking'));
    this.live2dManager.setSpeakingLevel(this.settings.speakingEnergy);
    this.applyIntent(intent, emotion, true);

    if (this.speakingTimer != null) {
      window.clearTimeout(this.speakingTimer);
    }

    this.speakingTimer = window.setTimeout(() => {
      this.live2dManager.setSpeakingLevel(0);
      this.live2dManager.setPosePreset(
        transportStateToPose(this.transportState)
      );
      this.speakingTimer = null;
    }, MOTION_COOLDOWNS.speakingWindowMs);
  }

  public handleRichSignal(signal: PetRichSignal): void {
    const intent = normalizeIntent(signal.intent);
    const emotion = normalizeEmotion(signal.emotion);
    const energy = clamp((signal.energy ?? 0.65) * this.settings.accentEnergy);
    this.live2dManager.setIntentAccent(
      intent,
      emotion,
      energy,
      MOTION_COOLDOWNS.intentAccentMs
    );
  }

  public handleTtsStart(energy = 0.8): void {
    this.live2dManager.setPosePreset(transportStateToPose('speaking'));
    this.live2dManager.setSpeakingLevel(
      clamp(energy * this.settings.speakingEnergy)
    );
  }

  public handleTtsEnd(): void {
    this.live2dManager.setSpeakingLevel(0);
    this.live2dManager.setPosePreset(transportStateToPose(this.transportState));
  }

  public handleTtsEnergy(energy: number): void {
    this.live2dManager.setSpeakingLevel(
      clamp(energy * this.settings.speakingEnergy)
    );
  }

  public handlePointerEnter(): void {
    this.live2dManager.setIntentAccent(
      'greeting',
      'curious',
      clamp(this.settings.accentEnergy * 0.45),
      700
    );
  }

  public handlePointerMove(x: number, y: number): void {
    this.live2dManager.onDrag(clamp(x, -1, 1), clamp(y, -1, 1));
  }

  public handlePointerLeave(): void {
    this.live2dManager.onDrag(0, 0);
  }

  public handlePointerHoverZone(
    zone: 'head' | 'face' | 'chest' | 'hands' | 'lower'
  ): void {
    const personaScale = this.personaTouchScale();

    switch (zone) {
      case 'head':
        this.live2dManager.setIntentAccent(
          'greeting',
          'curious',
          clamp(this.settings.accentEnergy * 0.34 * personaScale),
          900
        );
        break;
      case 'face':
        this.live2dManager.setIntentAccent(
          'question',
          this.settings.personaStyle === 'gentle' ? 'calm' : 'curious',
          clamp(this.settings.accentEnergy * 0.3 * personaScale),
          900
        );
        break;
      case 'hands':
        this.live2dManager.setIntentAccent(
          'positive',
          'happy',
          clamp(this.settings.accentEnergy * 0.28 * personaScale),
          850
        );
        break;
      case 'chest':
        this.live2dManager.setIntentAccent(
          'positive',
          this.settings.personaStyle === 'calm' ? 'calm' : 'happy',
          clamp(this.settings.accentEnergy * 0.26 * personaScale),
          820
        );
        break;
      case 'lower':
      default:
        this.live2dManager.setIntentAccent(
          'negative',
          this.settings.personaStyle === 'playful' ? 'curious' : 'sad',
          clamp(this.settings.accentEnergy * 0.2 * personaScale),
          760
        );
        break;
    }
  }

  public handlePointerTap(): void {
    this.live2dManager.setIntentAccent(
      'positive',
      'happy',
      clamp(this.settings.accentEnergy * 0.6),
      900
    );
    this.live2dManager.playTapReaction(false);
  }

  public handlePointerTapZone(
    zone: 'head' | 'face' | 'chest' | 'hands' | 'lower',
    streak = 1
  ): void {
    const streakLevel = Math.min(3, Math.max(1, Math.floor(streak)));
    const personaScale = this.personaTouchScale();
    const streakEnergyBoost =
      streakLevel === 1 ? 1 : streakLevel === 2 ? 1.15 : 1.34;
    const streakDurationBoost =
      streakLevel === 1 ? 1 : streakLevel === 2 ? 1.18 : 1.38;

    if (streakLevel >= 2) {
      this.live2dManager.triggerRandomExpression();
    }

    switch (zone) {
      case 'head':
        this.live2dManager.triggerRandomExpression();
        if (streakLevel >= 3) {
          this.live2dManager.playTapReaction(true);
        }
        this.live2dManager.setIntentAccent(
          this.settings.personaStyle === 'calm' ? 'positive' : 'greeting',
          this.settings.personaStyle === 'energetic' ? 'excited' : 'happy',
          clamp(
            this.settings.accentEnergy *
              0.72 *
              personaScale *
              streakEnergyBoost
          ),
          1100 * streakDurationBoost
        );
        break;
      case 'face':
        this.live2dManager.triggerRandomExpression();
        if (streakLevel >= 2) {
          this.live2dManager.playTapReaction(true);
        }
        this.live2dManager.setIntentAccent(
          this.settings.personaStyle === 'gentle' ? 'greeting' : 'question',
          this.settings.personaStyle === 'calm' ? 'calm' : 'curious',
          clamp(
            this.settings.accentEnergy *
              0.64 *
              personaScale *
              streakEnergyBoost
          ),
          1200 * streakDurationBoost
        );
        break;
      case 'chest':
        this.live2dManager.setIntentAccent(
          this.settings.personaStyle === 'gentle' ? 'greeting' : 'positive',
          this.settings.personaStyle === 'calm' ? 'calm' : 'happy',
          clamp(
            this.settings.accentEnergy *
              0.82 *
              personaScale *
              streakEnergyBoost
          ),
          1000 * streakDurationBoost
        );
        this.live2dManager.playTapReaction(true);
        if (streakLevel >= 3) {
          this.live2dManager.triggerRandomExpression();
        }
        break;
      case 'hands':
        this.live2dManager.setIntentAccent(
          'dance',
          this.settings.personaStyle === 'gentle' ? 'happy' : 'excited',
          clamp(
            this.settings.accentEnergy *
              0.92 *
              personaScale *
              streakEnergyBoost
          ),
          1300 * streakDurationBoost
        );
        this.live2dManager.playTapReaction(true);
        if (streakLevel >= 2) {
          this.live2dManager.triggerRandomExpression();
        }
        break;
      case 'lower':
      default:
        this.live2dManager.setIntentAccent(
          'negative',
          this.settings.personaStyle === 'playful' ? 'curious' : 'sad',
          clamp(
            this.settings.accentEnergy *
              0.46 *
              personaScale *
              streakEnergyBoost
          ),
          900 * streakDurationBoost
        );
        this.live2dManager.playTapReaction(streakLevel >= 3);
        break;
    }
  }

  public handlePointerHoldZone(
    zone: 'head' | 'face' | 'chest' | 'hands' | 'lower'
  ): void {
    const personaScale = this.personaTouchScale();

    switch (zone) {
      case 'head':
        this.live2dManager.triggerRandomExpression();
        this.live2dManager.playTapReaction(true);
        this.live2dManager.setIntentAccent(
          'greeting',
          this.settings.personaStyle === 'energetic' ? 'excited' : 'happy',
          clamp(this.settings.accentEnergy * 0.96 * personaScale),
          1600
        );
        break;
      case 'face':
        this.live2dManager.triggerRandomExpression();
        this.live2dManager.setIntentAccent(
          this.settings.personaStyle === 'gentle' ? 'greeting' : 'question',
          this.settings.personaStyle === 'calm' ? 'calm' : 'curious',
          clamp(this.settings.accentEnergy * 0.88 * personaScale),
          1550
        );
        break;
      case 'chest':
        this.live2dManager.playTapReaction(true);
        this.live2dManager.setIntentAccent(
          'positive',
          this.settings.personaStyle === 'calm' ? 'calm' : 'happy',
          clamp(this.settings.accentEnergy * 1.02 * personaScale),
          1500
        );
        break;
      case 'hands':
        this.live2dManager.playTapReaction(true);
        this.live2dManager.triggerRandomExpression();
        this.live2dManager.setIntentAccent(
          'dance',
          this.settings.personaStyle === 'gentle' ? 'happy' : 'excited',
          clamp(this.settings.accentEnergy * 1.08 * personaScale),
          1680
        );
        break;
      case 'lower':
      default:
        this.live2dManager.playTapReaction(false);
        this.live2dManager.setIntentAccent(
          'negative',
          this.settings.personaStyle === 'playful' ? 'curious' : 'sad',
          clamp(this.settings.accentEnergy * 0.58 * personaScale),
          1280
        );
        break;
    }
  }

  public handlePointerDragZone(
    zone: 'head' | 'face' | 'chest' | 'hands' | 'lower',
    intensity = 0.7
  ): void {
    const personaScale = this.personaTouchScale();
    const dragScale = clamp(intensity, 0.35, 1);

    switch (zone) {
      case 'head':
        this.live2dManager.triggerRandomExpression();
        this.live2dManager.setIntentAccent(
          'greeting',
          this.settings.personaStyle === 'energetic' ? 'excited' : 'curious',
          clamp(this.settings.accentEnergy * 0.54 * personaScale * dragScale),
          980
        );
        break;
      case 'face':
        this.live2dManager.triggerRandomExpression();
        this.live2dManager.setIntentAccent(
          'question',
          this.settings.personaStyle === 'gentle' ? 'calm' : 'curious',
          clamp(this.settings.accentEnergy * 0.48 * personaScale * dragScale),
          1020
        );
        break;
      case 'chest':
        this.live2dManager.playTapReaction(true);
        this.live2dManager.setIntentAccent(
          'positive',
          this.settings.personaStyle === 'calm' ? 'calm' : 'happy',
          clamp(this.settings.accentEnergy * 0.62 * personaScale * dragScale),
          1040
        );
        break;
      case 'hands':
        this.live2dManager.playTapReaction(true);
        this.live2dManager.setIntentAccent(
          'dance',
          this.settings.personaStyle === 'gentle' ? 'happy' : 'excited',
          clamp(this.settings.accentEnergy * 0.72 * personaScale * dragScale),
          1120
        );
        break;
      case 'lower':
      default:
        this.live2dManager.setIntentAccent(
          'negative',
          this.settings.personaStyle === 'playful' ? 'curious' : 'sad',
          clamp(this.settings.accentEnergy * 0.34 * personaScale * dragScale),
          880
        );
        break;
    }
  }

  private applyIntent(
    intent: PetIntent,
    emotion: PetEmotion,
    fromAssistant: boolean
  ): void {
    const energy =
      this.energyForIntent(intent, fromAssistant) * this.settings.accentEnergy;
    const duration =
      intent === 'dance'
        ? MOTION_COOLDOWNS.intentAccentMs + 500
        : MOTION_COOLDOWNS.intentAccentMs;

    this.live2dManager.setIntentAccent(intent, emotion, energy, duration);

    if (intent === 'dance' || intent === 'positive' || intent === 'greeting') {
      this.live2dManager.playTapReaction();
    } else if (intent === 'question') {
      this.live2dManager.playTapReaction(false);
    }
  }

  private energyForIntent(intent: PetIntent, fromAssistant: boolean): number {
    switch (intent) {
      case 'dance':
        return 1.0;
      case 'greeting':
        return fromAssistant ? 0.75 : 0.65;
      case 'positive':
        return 0.7;
      case 'negative':
        return 0.3;
      case 'question':
        return 0.45;
      case 'sleep':
        return 0.2;
      default:
        return fromAssistant ? 0.55 : 0.4;
    }
  }

  private personaTouchScale(): number {
    switch (this.settings.personaStyle) {
      case 'gentle':
        return 0.92;
      case 'calm':
        return 0.84;
      case 'energetic':
        return 1.12;
      default:
        return 1;
    }
  }
}
