/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismDefaultParameterId } from '@framework/cubismdefaultparameterid';
import { CubismIdHandle } from '@framework/id/cubismid';
import { CubismFramework } from '@framework/live2dcubismframework';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { ACubismMotion } from '@framework/motion/acubismmotion';
import { CubismWebGLOffscreenManager } from '@framework/rendering/cubismoffscreenmanager';

import * as LAppDefine from './lappdefine';
import { LAppModel } from './lappmodel';
import { LAppPal } from './lapppal';
import { LAppSubdelegate } from './lappsubdelegate';
import {
  PetEmotion,
  PetIntent,
  PetPosePreset,
  clamp
} from './pet_motion_config';
import { PetPersonaStyle, PetSettings } from './pet_settings';

export class LAppLive2DManager {
  private releaseAllModel(): void {
    this._models.length = 0;
  }

  public setOffscreenSize(width: number, height: number): void {
    for (let i = 0; i < this._models.length; i++) {
      const model: LAppModel = this._models[i];
      model?.setRenderTargetSize(width, height);
    }
  }

  public onDrag(x: number, y: number): void {
    const model: LAppModel = this._models[0];
    if (model) {
      model.setDragging(x, y);
    }
  }

  public onTap(x: number, y: number): void {
    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(
        `[APP]tap point: {x: ${x.toFixed(2)} y: ${y.toFixed(2)}}`
      );
    }

    const model: LAppModel = this._models[0];
    if (!model) {
      return;
    }

    if (model.hitTest(LAppDefine.HitAreaNameHead, x, y)) {
      if (LAppDefine.DebugLogEnable) {
        LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameHead}]`);
      }
      model.setRandomExpression();
    } else if (model.hitTest(LAppDefine.HitAreaNameBody, x, y)) {
      if (LAppDefine.DebugLogEnable) {
        LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameBody}]`);
      }
      this.playTapReaction(true);
    }
  }

  public getModel(): LAppModel | null {
    return this._models.length > 0 ? this._models[0] : null;
  }

  public setPosePreset(preset: PetPosePreset): void {
    this._posePreset = preset;
  }

  public getPosePreset(): PetPosePreset {
    return this._posePreset;
  }

  public setSpeakingLevel(level: number): void {
    this._speakingLevel = clamp(level);
  }

  public triggerRandomExpression(): void {
    const model = this.getModel();
    model?.setRandomExpression();
  }

  public configureBehavior(settings: Pick<
    PetSettings,
    'personaStyle' | 'speakingEnergy' | 'idleEnergy' | 'accentEnergy'
  >): void {
    this._personaStyle = settings.personaStyle;
    this._speakingScale = clamp(settings.speakingEnergy);
    this._idleActivity = clamp(settings.idleEnergy);
    this._accentScale = clamp(settings.accentEnergy);
  }

  public playIdleVariant(force = false): boolean {
    const model = this.getModel();
    if (!model) {
      return false;
    }

    const minGap = 5.8 - this._idleActivity * 3.2;
    if (!force && this._userTimeSeconds - this._lastIdleMotionAt < minGap) {
      return false;
    }

    const handle = model.startRandomMotion(
      LAppDefine.MotionGroupIdle,
      LAppDefine.PriorityIdle,
      this.finishedMotion,
      this.beganMotion
    );

    if (handle >= 0) {
      this._lastIdleMotionAt = this._userTimeSeconds;
      return true;
    }

    return false;
  }

  public playTapReaction(force = false): boolean {
    const model = this.getModel();
    if (!model) {
      return false;
    }

    if (!force && this._userTimeSeconds - this._lastTapReactionAt < 1.0) {
      return false;
    }

    const handle = model.startRandomMotion(
      LAppDefine.MotionGroupTapBody,
      LAppDefine.PriorityNormal,
      this.finishedMotion,
      this.beganMotion
    );

    if (handle >= 0) {
      this._lastTapReactionAt = this._userTimeSeconds;
      return true;
    }

    return false;
  }

  public setIntentAccent(
    intent: PetIntent,
    emotion: PetEmotion = 'neutral',
    energy = 0.5,
    durationMs = 1300
  ): void {
    this._accentIntent = intent;
    this._accentEmotion = emotion;
      this._accentEnergy = clamp(energy) * this._accentScale;
    this._accentUntil = this._userTimeSeconds + durationMs / 1000;
  }

  public clearAccent(): void {
    this._accentIntent = 'neutral';
    this._accentEmotion = 'neutral';
    this._accentEnergy = 0;
    this._accentUntil = 0;
  }

  public onUpdate(): void {
    const deltaTimeSeconds = LAppPal.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    const gl = this._subdelegate.getGl();
    CubismWebGLOffscreenManager.getInstance().beginFrameProcess(gl);

    const { width, height } = this._subdelegate.getCanvas();
    const projection: CubismMatrix44 = new CubismMatrix44();
    const model: LAppModel = this._models[0];

    if (model?.getModel()) {
      if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
        model.getModelMatrix().setWidth(2.0);
        projection.scale(1.0, width / height);
      } else {
        projection.scale(height / width, 1.0);
      }

      if (this._viewMatrix != null) {
        projection.multiplyByMatrix(this._viewMatrix);
      }
    }

    model.update();
    this.applyRuntimeOverlay(model, deltaTimeSeconds);
    model.draw(projection);

    CubismWebGLOffscreenManager.getInstance().endFrameProcess(gl);
    CubismWebGLOffscreenManager.getInstance().releaseStaleRenderTextures(gl);
  }

  public nextScene(): void {
    const no: number = (this._sceneIndex + 1) % LAppDefine.ModelDirSize;
    this.changeScene(no);
  }

  private changeScene(index: number): void {
    this._sceneIndex = index;

    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(`[APP]model index: ${this._sceneIndex}`);
    }

    const model: string = LAppDefine.ModelDir[index];
    const modelPath: string = LAppDefine.ResourcesPath + model + '/';
    let modelJsonName: string = LAppDefine.ModelDir[index];
    modelJsonName += '.model3.json';

    this.releaseAllModel();
    const instance = new LAppModel();
    instance.setSubdelegate(this._subdelegate);
    instance.loadAssets(modelPath, modelJsonName);
    this._models.push(instance);
  }

  public setViewMatrix(m: CubismMatrix44): void {
    for (let i = 0; i < 16; i++) {
      this._viewMatrix.getArray()[i] = m.getArray()[i];
    }
  }

  public addModel(sceneIndex: number = 0): void {
    this._sceneIndex = sceneIndex;
    this.changeScene(this._sceneIndex);
  }

  public constructor() {
    this._subdelegate = null;
    this._viewMatrix = new CubismMatrix44();
    this._models = new Array<LAppModel>();
    this._sceneIndex = 0;
    this._userTimeSeconds = 0;
    this._posePreset = 'quiet';
    this._speakingLevel = 0;
    this._speakingScale = 0.82;
    this._idleActivity = 0.58;
    this._accentScale = 0.78;
    this._personaStyle = 'playful';
    this._accentIntent = 'neutral';
    this._accentEmotion = 'neutral';
    this._accentEnergy = 0;
    this._accentUntil = 0;
    this._lastIdleMotionAt = 0;
    this._lastTapReactionAt = 0;

    const idManager = CubismFramework.getIdManager();
    this._idParamAngleX = idManager.getId(CubismDefaultParameterId.ParamAngleX);
    this._idParamAngleY = idManager.getId(CubismDefaultParameterId.ParamAngleY);
    this._idParamAngleZ = idManager.getId(CubismDefaultParameterId.ParamAngleZ);
    this._idParamBodyAngleX = idManager.getId(
      CubismDefaultParameterId.ParamBodyAngleX
    );
    this._idParamEyeBallX = idManager.getId(
      CubismDefaultParameterId.ParamEyeBallX
    );
    this._idParamEyeBallY = idManager.getId(
      CubismDefaultParameterId.ParamEyeBallY
    );
    this._idParamMouthOpenY = idManager.getId(
      CubismDefaultParameterId.ParamMouthOpenY
    );
    this._idParamEyeLOpen = idManager.getId(
      CubismDefaultParameterId.ParamEyeLOpen
    );
    this._idParamEyeROpen = idManager.getId(
      CubismDefaultParameterId.ParamEyeROpen
    );
    this._idParamBreath = idManager.getId(CubismDefaultParameterId.ParamBreath);
  }

  public release(): void {}

  public initialize(subdelegate: LAppSubdelegate): void {
    this._subdelegate = subdelegate;
    this.changeScene(this._sceneIndex);
  }

  private applyRuntimeOverlay(
    model: LAppModel,
    deltaTimeSeconds: number
  ): void {
    const cubismModel = model.getModel();
    if (!cubismModel) {
      return;
    }

    const phase = this._userTimeSeconds;
    const breathing = Math.sin(phase * 2.0);
    const swaySlow = Math.sin(phase * 1.2);
    const swayFast = Math.sin(phase * 4.6);
    const accentPulse = Math.max(
      0,
      this._accentUntil > this._userTimeSeconds
        ? Math.sin(phase * 7.5) * 0.5 + 0.5
        : 0
    );

    const styleIdleFactor = this.getStyleIdleFactor();
    const styleAccentFactor = this.getStyleAccentFactor();

    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;
    let bodyAngleX = 0;
    let eyeBallX = 0;
    let eyeBallY = 0;
    let eyeOpenOffset = 0;
    let breathOffset = 0;

    switch (this._posePreset) {
      case 'idle':
        angleX = swaySlow * 4.2 * styleIdleFactor;
        angleY = breathing * 1.6;
        bodyAngleX = swaySlow * 1.4 * styleIdleFactor;
        eyeBallX = swaySlow * 0.18;
        breathOffset = breathing * (0.12 + this._idleActivity * 0.2);
        break;
      case 'listening':
        angleX = swaySlow * 3.2 * styleIdleFactor;
        angleY = -2.0 + breathing * 1.0;
        bodyAngleX = 1.4 + swaySlow * 0.8 * styleIdleFactor;
        eyeBallX = swaySlow * 0.22;
        eyeBallY = 0.18;
        eyeOpenOffset = 0.1;
        breathOffset = 0.12 + breathing * 0.16;
        break;
      case 'thinking':
        angleX = swayFast * 1.6 * styleIdleFactor;
        angleY = -4.0 + breathing * 0.8;
        angleZ = 8.0 + swaySlow * 3.2 * styleIdleFactor;
        bodyAngleX = swaySlow * 0.8 * styleIdleFactor;
        eyeBallX = -0.14 + swaySlow * 0.08;
        eyeOpenOffset = -0.08;
        breathOffset = 0.08;
        break;
      case 'speaking':
        angleX = swayFast * 3.4 * styleIdleFactor;
        angleY = breathing * 0.8;
        bodyAngleX = swaySlow * 1.9 * styleIdleFactor;
        eyeBallX = swaySlow * 0.1;
        breathOffset = 0.18 + breathing * 0.14;
        break;
      case 'error':
        angleX = swaySlow * 0.6;
        angleY = -3.0;
        eyeOpenOffset = -0.12;
        breathOffset = 0.02;
        break;
      case 'quiet':
      default:
        angleX = swaySlow * 0.8;
        angleY = -1.5 + breathing * 0.4;
        breathOffset = 0.04;
        break;
    }

    const accentStrength =
      this._accentUntil > this._userTimeSeconds
        ? this._accentEnergy * styleAccentFactor * (0.45 + accentPulse * 0.55)
        : 0;

    switch (this._accentIntent) {
      case 'greeting':
        angleY += -3.0 * accentStrength;
        angleX += swayFast * 6.0 * accentStrength;
        bodyAngleX += 1.5 * accentStrength;
        break;
      case 'question':
        angleZ += 10.0 * accentStrength;
        angleY += -2.5 * accentStrength;
        eyeBallX += -0.12 * accentStrength;
        break;
      case 'positive':
        angleX += swayFast * 7.5 * accentStrength;
        bodyAngleX += 2.4 * accentStrength;
        eyeOpenOffset += 0.1 * accentStrength;
        break;
      case 'negative':
        angleY += -3.0 * accentStrength;
        eyeOpenOffset -= 0.12 * accentStrength;
        break;
      case 'dance':
        angleX += swayFast * 12.0 * accentStrength;
        angleZ += swayFast * 7.0 * accentStrength;
        bodyAngleX += swayFast * 3.5 * accentStrength;
        eyeBallX += swayFast * 0.2 * accentStrength;
        break;
      case 'sleep':
        angleY += -5.0 * accentStrength;
        eyeOpenOffset -= 0.2 * accentStrength;
        breathOffset -= 0.05 * accentStrength;
        break;
      default:
        break;
    }

    switch (this._accentEmotion) {
      case 'happy':
        eyeOpenOffset += 0.05;
        break;
      case 'curious':
        angleZ += 2.5;
        eyeBallY += 0.05;
        break;
      case 'sad':
        angleY -= 1.0;
        eyeOpenOffset -= 0.05;
        break;
      case 'excited':
        bodyAngleX += swayFast * 1.6;
        break;
      case 'error':
        eyeOpenOffset -= 0.06;
        break;
      default:
        break;
    }

    const speakingWave =
      this._speakingLevel > 0
        ? (Math.sin(phase * 18.0) * 0.5 + 0.5) *
          this._speakingLevel *
          this._speakingScale
        : 0;
    const mouthOpen = clamp(speakingWave * 0.92);

    cubismModel.addParameterValueById(this._idParamAngleX, angleX, 1.0);
    cubismModel.addParameterValueById(this._idParamAngleY, angleY, 1.0);
    cubismModel.addParameterValueById(this._idParamAngleZ, angleZ, 1.0);
    cubismModel.addParameterValueById(
      this._idParamBodyAngleX,
      bodyAngleX,
      1.0
    );
    cubismModel.addParameterValueById(this._idParamEyeBallX, eyeBallX, 1.0);
    cubismModel.addParameterValueById(this._idParamEyeBallY, eyeBallY, 1.0);
    cubismModel.addParameterValueById(this._idParamBreath, breathOffset, 1.0);
    cubismModel.addParameterValueById(this._idParamEyeLOpen, eyeOpenOffset, 1.0);
    cubismModel.addParameterValueById(this._idParamEyeROpen, eyeOpenOffset, 1.0);

    const currentMouth = cubismModel.getParameterValueById(
      this._idParamMouthOpenY
    );
    cubismModel.setParameterValueById(
      this._idParamMouthOpenY,
      Math.max(currentMouth, mouthOpen),
      1.0
    );

    cubismModel.update();

    if (this._posePreset === 'idle' && deltaTimeSeconds >= 0) {
      this.playIdleVariant(false);
    }
  }

  private getStyleIdleFactor(): number {
    switch (this._personaStyle) {
      case 'gentle':
        return 0.78;
      case 'calm':
        return 0.68;
      case 'energetic':
        return 1.18;
      case 'playful':
      default:
        return 1.0;
    }
  }

  private getStyleAccentFactor(): number {
    switch (this._personaStyle) {
      case 'gentle':
        return 0.88;
      case 'calm':
        return 0.76;
      case 'energetic':
        return 1.2;
      case 'playful':
      default:
        return 1.0;
    }
  }

  private _subdelegate: LAppSubdelegate;
  _viewMatrix: CubismMatrix44;
  _models: Array<LAppModel>;
  private _sceneIndex: number;
  private _userTimeSeconds: number;
  private _posePreset: PetPosePreset;
  private _speakingLevel: number;
  private _speakingScale: number;
  private _idleActivity: number;
  private _accentScale: number;
  private _personaStyle: PetPersonaStyle;
  private _accentIntent: PetIntent;
  private _accentEmotion: PetEmotion;
  private _accentEnergy: number;
  private _accentUntil: number;
  private _lastIdleMotionAt: number;
  private _lastTapReactionAt: number;
  private _idParamAngleX: CubismIdHandle;
  private _idParamAngleY: CubismIdHandle;
  private _idParamAngleZ: CubismIdHandle;
  private _idParamBodyAngleX: CubismIdHandle;
  private _idParamEyeBallX: CubismIdHandle;
  private _idParamEyeBallY: CubismIdHandle;
  private _idParamMouthOpenY: CubismIdHandle;
  private _idParamEyeLOpen: CubismIdHandle;
  private _idParamEyeROpen: CubismIdHandle;
  private _idParamBreath: CubismIdHandle;

  beganMotion = (self: ACubismMotion): void => {
    LAppPal.printMessage('Motion Began:');
    console.log(self);
  };

  finishedMotion = (self: ACubismMotion): void => {
    LAppPal.printMessage('Motion Finished:');
    console.log(self);
  };
}
