/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismFramework, Option } from '@framework/live2dcubismframework';
import { CubismLogError } from '@framework/utils/cubismdebug';

import * as LAppDefine from './lappdefine';
import { LAppPal } from './lapppal';
import { LAppSubdelegate } from './lappsubdelegate';

export let s_instance: LAppDelegate = null;

export class LAppDelegate {
  public static getInstance(): LAppDelegate {
    if (s_instance == null) {
      s_instance = new LAppDelegate();
    }

    return s_instance;
  }

  public static releaseInstance(): void {
    if (s_instance != null) {
      s_instance.release();
    }

    s_instance = null;
  }

  private onPointerBegan(e: PointerEvent): void {
    for (let i = 0; i < this._subdelegates.length; i++) {
      this._subdelegates[i].onPointBegan(e.pageX, e.pageY);
    }
  }

  private onPointerMoved(e: PointerEvent): void {
    for (let i = 0; i < this._subdelegates.length; i++) {
      this._subdelegates[i].onPointMoved(e.pageX, e.pageY);
    }
  }

  private onPointerEnded(e: PointerEvent): void {
    for (let i = 0; i < this._subdelegates.length; i++) {
      this._subdelegates[i].onPointEnded(e.pageX, e.pageY);
    }
  }

  private onPointerCancel(e: PointerEvent): void {
    for (let i = 0; i < this._subdelegates.length; i++) {
      this._subdelegates[i].onTouchCancel(e.pageX, e.pageY);
    }
  }

  public onResize(): void {
    for (let i = 0; i < this._subdelegates.length; i++) {
      this._subdelegates[i].onResize();
    }
  }

  public getPrimarySubdelegate(): LAppSubdelegate | null {
    return this._subdelegates.length > 0 ? this._subdelegates[0] : null;
  }

  public run(): void {
    const loop = (): void => {
      if (s_instance == null) {
        return;
      }

      LAppPal.updateTime();

      for (let i = 0; i < this._subdelegates.length; i++) {
        this._subdelegates[i].update();
      }

      requestAnimationFrame(loop);
    };

    loop();
  }

  private release(): void {
    this.releaseEventListener();
    this.releaseSubdelegates();
    CubismFramework.dispose();
    this._cubismOption = null;
  }

  private releaseEventListener(): void {
    document.removeEventListener('pointerdown', this.pointBeganEventListener);
    this.pointBeganEventListener = null;
    document.removeEventListener('pointermove', this.pointMovedEventListener);
    this.pointMovedEventListener = null;
    document.removeEventListener('pointerup', this.pointEndedEventListener);
    this.pointEndedEventListener = null;
    document.removeEventListener('pointercancel', this.pointCancelEventListener);
    this.pointCancelEventListener = null;
  }

  private releaseSubdelegates(): void {
    for (let i = 0; i < this._subdelegates.length; i++) {
      this._subdelegates[i].release();
    }

    this._subdelegates.length = 0;
    this._subdelegates = null;
  }

  public initialize(): boolean {
    this.initializeCubism();
    this.initializeSubdelegates();
    this.initializeEventListener();

    return true;
  }

  private initializeEventListener(): void {
    this.pointBeganEventListener = this.onPointerBegan.bind(this);
    this.pointMovedEventListener = this.onPointerMoved.bind(this);
    this.pointEndedEventListener = this.onPointerEnded.bind(this);
    this.pointCancelEventListener = this.onPointerCancel.bind(this);

    document.addEventListener('pointerdown', this.pointBeganEventListener, {
      passive: true
    });
    document.addEventListener('pointermove', this.pointMovedEventListener, {
      passive: true
    });
    document.addEventListener('pointerup', this.pointEndedEventListener, {
      passive: true
    });
    document.addEventListener('pointercancel', this.pointCancelEventListener, {
      passive: true
    });
  }

  private initializeCubism(): void {
    LAppPal.updateTime();
    this._cubismOption.logFunction = LAppPal.printMessage;
    this._cubismOption.loggingLevel = LAppDefine.CubismLoggingLevel;
    CubismFramework.startUp(this._cubismOption);
    CubismFramework.initialize();
  }

  private initializeSubdelegates(): void {
    const canvasHost = document.getElementById('live2dHost');
    let width = 100;
    let height = 100;

    if (LAppDefine.CanvasNum > 3) {
      const widthUnit = Math.ceil(Math.sqrt(LAppDefine.CanvasNum));
      const heightUnit = Math.ceil(LAppDefine.CanvasNum / widthUnit);
      width = 100.0 / widthUnit;
      height = 100.0 / heightUnit;
    } else {
      width = 100.0 / LAppDefine.CanvasNum;
    }

    this._canvases.length = LAppDefine.CanvasNum;
    this._subdelegates.length = LAppDefine.CanvasNum;

    for (let i = 0; i < LAppDefine.CanvasNum; i++) {
      const canvas = document.createElement('canvas');
      this._canvases[i] = canvas;
      canvas.className = 'live2d-canvas';

      if (canvasHost && LAppDefine.CanvasNum === 1) {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvasHost.replaceChildren(canvas);
      } else {
        canvas.style.width = `${width}vw`;
        canvas.style.height = `${height}vh`;
        document.body.appendChild(canvas);
      }
    }

    for (let i = 0; i < this._canvases.length; i++) {
      const subdelegate = new LAppSubdelegate();
      subdelegate.initialize(this._canvases[i]);
      this._subdelegates[i] = subdelegate;
    }

    for (let i = 0; i < LAppDefine.CanvasNum; i++) {
      if (this._subdelegates[i].isContextLost()) {
        CubismLogError(
          `The context for Canvas at index ${i} was lost, possibly because the acquisition limit for WebGLRenderingContext was reached.`
        );
      }
    }
  }

  private constructor() {
    this._cubismOption = new Option();
    this._subdelegates = new Array<LAppSubdelegate>();
    this._canvases = new Array<HTMLCanvasElement>();
  }

  private _cubismOption: Option;
  private _canvases: Array<HTMLCanvasElement>;
  private _subdelegates: Array<LAppSubdelegate>;
  private pointBeganEventListener: (this: Document, ev: PointerEvent) => void;
  private pointMovedEventListener: (this: Document, ev: PointerEvent) => void;
  private pointEndedEventListener: (this: Document, ev: PointerEvent) => void;
  private pointCancelEventListener: (this: Document, ev: PointerEvent) => void;
}
