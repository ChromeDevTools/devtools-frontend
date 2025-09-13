// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

const UIStrings = {
  /**
   * @description Tooltip text that appears when hovering over largeicon pan button in Transform Controller of the Layers panel
   */
  panModeX: 'Pan mode (X)',
  /**
   * @description Tooltip text that appears when hovering over largeicon rotate button in Transform Controller of the Layers panel
   */
  rotateModeV: 'Rotate mode (V)',
  /**
   * @description Tooltip text that appears when hovering over the largeicon center button in the Transform Controller of the Layers panel
   */
  resetTransform: 'Reset transform (0)',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/TransformController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TransformController extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private mode!: Modes;
  #scale: number;
  #offsetX: number;
  #offsetY: number;
  #rotateX: number;
  #rotateY: number;
  private oldRotateX: number;
  private oldRotateY: number;
  private originX: number;
  private originY: number;
  element: HTMLElement;
  private minScale: number;
  private maxScale: number;
  private readonly controlPanelToolbar: UI.Toolbar.Toolbar;
  private readonly modeButtons: Record<string, UI.Toolbar.ToolbarToggle>;
  /**
   * @param element The HTML element to apply transformations to.
   * @param disableRotate Optional. If true, pan and rotate will be disabled. Defaults to false.
   * @param preventDefaultOnMousedown Optional. If true, mousedown events will be prevented from their default behavior (including focus). Defaults to true.
   */
  constructor(element: HTMLElement, disableRotate?: boolean, preventDefaultOnMouseDown = true) {
    super();
    this.#scale = 1;
    this.#offsetX = 0;
    this.#offsetY = 0;
    this.#rotateX = 0;
    this.#rotateY = 0;
    this.oldRotateX = 0;
    this.oldRotateY = 0;
    this.originX = 0;
    this.originY = 0;
    this.element = element;
    this.registerShortcuts();
    UI.UIUtils.installDragHandle(
        element, this.onDragStart.bind(this), this.onDrag.bind(this), this.onDragEnd.bind(this), 'move', null, 0,
        preventDefaultOnMouseDown);
    element.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    this.minScale = 0;
    this.maxScale = Infinity;

    this.controlPanelToolbar = document.createElement('devtools-toolbar');
    this.controlPanelToolbar.classList.add('transform-control-panel');
    this.controlPanelToolbar.setAttribute('jslog', `${VisualLogging.toolbar()}`);

    this.modeButtons = {};
    if (!disableRotate) {
      const panModeButton = new UI.Toolbar.ToolbarToggle(
          i18nString(UIStrings.panModeX), '3d-pan', undefined, 'layers.3d-pan', /* toggleOnClick */ false);
      panModeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.setMode.bind(this, Modes.PAN));
      this.modeButtons[Modes.PAN] = panModeButton;
      this.controlPanelToolbar.appendToolbarItem(panModeButton);
      const rotateModeButton = new UI.Toolbar.ToolbarToggle(
          i18nString(UIStrings.rotateModeV), '3d-rotate', undefined, 'layers.3d-rotate', /* toggleOnClick */ false);
      rotateModeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.setMode.bind(this, Modes.ROTATE));
      this.modeButtons[Modes.ROTATE] = rotateModeButton;
      this.controlPanelToolbar.appendToolbarItem(rotateModeButton);
    }
    this.setMode(Modes.PAN);

    const resetButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.resetTransform), '3d-center', undefined, 'layers.3d-center');
    resetButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.resetAndNotify.bind(this, undefined));
    this.controlPanelToolbar.appendToolbarItem(resetButton);

    this.reset();
  }

  toolbar(): UI.Toolbar.Toolbar {
    return this.controlPanelToolbar;
  }

  private registerShortcuts(): void {
    const zoomFactor = 1.1;
    UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.element, {
      'layers.reset-view': async () => {
        this.resetAndNotify();
        return true;
      },
      'layers.pan-mode': async () => {
        this.setMode(Modes.PAN);
        return true;
      },
      'layers.rotate-mode': async () => {
        this.setMode(Modes.ROTATE);
        return true;
      },
      'layers.zoom-in': this.onKeyboardZoom.bind(this, zoomFactor),
      'layers.zoom-out': this.onKeyboardZoom.bind(this, 1 / zoomFactor),
      'layers.up': this.onKeyboardPanOrRotate.bind(this, 0, -1),
      'layers.down': this.onKeyboardPanOrRotate.bind(this, 0, 1),
      'layers.left': this.onKeyboardPanOrRotate.bind(this, -1, 0),
      'layers.right': this.onKeyboardPanOrRotate.bind(this, 1, 0),
    });
  }

  private postChangeEvent(): void {
    this.dispatchEventToListeners(Events.TRANSFORM_CHANGED);
  }

  private reset(): void {
    this.#scale = 1;
    this.#offsetX = 0;
    this.#offsetY = 0;
    this.#rotateX = 0;
    this.#rotateY = 0;
  }

  private setMode(mode: Modes): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.updateModeButtons();
  }

  private updateModeButtons(): void {
    for (const mode in this.modeButtons) {
      this.modeButtons[mode].setToggled(mode === this.mode);
    }
  }

  resetAndNotify(event?: Event): void {
    this.reset();
    this.postChangeEvent();
    if (event) {
      event.preventDefault();
    }
    this.element.focus();
  }

  setScaleConstraints(minScale: number, maxScale: number): void {
    this.minScale = minScale;
    this.maxScale = maxScale;
    this.#scale = Platform.NumberUtilities.clamp(this.#scale, minScale, maxScale);
  }

  clampOffsets(minX: number, maxX: number, minY: number, maxY: number): void {
    this.#offsetX = Platform.NumberUtilities.clamp(this.#offsetX, minX, maxX);
    this.#offsetY = Platform.NumberUtilities.clamp(this.#offsetY, minY, maxY);
  }

  scale(): number {
    return this.#scale;
  }

  offsetX(): number {
    return this.#offsetX;
  }

  offsetY(): number {
    return this.#offsetY;
  }

  rotateX(): number {
    return this.#rotateX;
  }

  rotateY(): number {
    return this.#rotateY;
  }

  private onScale(scaleFactor: number, x: number, y: number): void {
    scaleFactor = Platform.NumberUtilities.clamp(this.#scale * scaleFactor, this.minScale, this.maxScale) / this.#scale;
    this.#scale *= scaleFactor;
    this.#offsetX -= (x - this.#offsetX) * (scaleFactor - 1);
    this.#offsetY -= (y - this.#offsetY) * (scaleFactor - 1);
    this.postChangeEvent();
  }

  private onPan(offsetX: number, offsetY: number): void {
    this.#offsetX += offsetX;
    this.#offsetY += offsetY;
    this.postChangeEvent();
  }

  private onRotate(rotateX: number, rotateY: number): void {
    this.#rotateX = rotateX;
    this.#rotateY = rotateY;
    this.postChangeEvent();
  }

  private async onKeyboardZoom(zoomFactor: number): Promise<boolean> {
    this.onScale(zoomFactor, this.element.clientWidth / 2, this.element.clientHeight / 2);
    return true;
  }

  private async onKeyboardPanOrRotate(xMultiplier: number, yMultiplier: number): Promise<boolean> {
    const panStepInPixels = 6;
    const rotateStepInDegrees = 5;

    if (this.mode === Modes.ROTATE) {
      // Sic! onRotate treats X and Y as "rotate around X" and "rotate around Y", so swap X/Y multipliers.
      this.onRotate(
          this.#rotateX + yMultiplier * rotateStepInDegrees, this.#rotateY + xMultiplier * rotateStepInDegrees);
    } else {
      this.onPan(xMultiplier * panStepInPixels, yMultiplier * panStepInPixels);
    }
    return true;
  }

  private onMouseWheel(event: Event): void {
    /** @constant */
    const zoomFactor = 1.1;
    /** @constant */
    const wheelZoomSpeed = 1 / 53;
    const mouseEvent = event as WheelEvent;
    const scaleFactor = Math.pow(zoomFactor, -mouseEvent.deltaY * wheelZoomSpeed);
    this.onScale(
        scaleFactor, mouseEvent.clientX - this.element.getBoundingClientRect().left,
        mouseEvent.clientY - this.element.getBoundingClientRect().top);
  }

  private onDrag(event: Event): void {
    const {clientX, clientY} = event as MouseEvent;
    if (this.mode === Modes.ROTATE) {
      this.onRotate(
          this.oldRotateX + (this.originY - clientY) / this.element.clientHeight * 180,
          this.oldRotateY - (this.originX - clientX) / this.element.clientWidth * 180);
    } else {
      this.onPan(clientX - this.originX, clientY - this.originY);
      this.originX = clientX;
      this.originY = clientY;
    }
  }

  private onDragStart(event: MouseEvent): boolean {
    this.element.focus();
    this.originX = event.clientX;
    this.originY = event.clientY;
    this.oldRotateX = this.#rotateX;
    this.oldRotateY = this.#rotateY;
    return true;
  }

  private onDragEnd(): void {
    this.originX = 0;
    this.originY = 0;
    this.oldRotateX = 0;
    this.oldRotateY = 0;
  }
}

export const enum Events {
  TRANSFORM_CHANGED = 'TransformChanged',
}

export interface EventTypes {
  [Events.TRANSFORM_CHANGED]: void;
}

export const enum Modes {
  PAN = 'Pan',
  ROTATE = 'Rotate',
}
