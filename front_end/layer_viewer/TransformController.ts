// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Tooltip text that appears when hovering over largeicon pan button in Transform Controller of the Layers panel
  */
  panModeX: 'Pan mode (X)',
  /**
  *@description Tooltip text that appears when hovering over largeicon rotate button in Transform Controller of the Layers panel
  */
  rotateModeV: 'Rotate mode (V)',
  /**
  *@description Tooltip text that appears when hovering over the largeicon center button in the Transform Controller of the Layers panel
  */
  resetTransform: 'Reset transform (0)',
};
const str_ = i18n.i18n.registerUIStrings('layer_viewer/TransformController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TransformController extends Common.ObjectWrapper.ObjectWrapper {
  _mode!: Modes;
  _scale: number;
  _offsetX: number;
  _offsetY: number;
  _rotateX: number;
  _rotateY: number;
  _oldRotateX: number;
  _oldRotateY: number;
  _originX: number;
  _originY: number;
  element: HTMLElement;
  _minScale: number;
  _maxScale: number;
  _controlPanelToolbar: UI.Toolbar.Toolbar;
  _modeButtons: {[x: string]: UI.Toolbar.ToolbarToggle};
  constructor(element: HTMLElement, disableRotate?: boolean) {
    super();
    this._scale = 1;
    this._offsetX = 0;
    this._offsetY = 0;
    this._rotateX = 0;
    this._rotateY = 0;
    this._oldRotateX = 0;
    this._oldRotateY = 0;
    this._originX = 0;
    this._originY = 0;
    this.element = element;
    this._registerShortcuts();
    UI.UIUtils.installDragHandle(
        element, this._onDragStart.bind(this), this._onDrag.bind(this), this._onDragEnd.bind(this), 'move', null);
    element.addEventListener('wheel', this._onMouseWheel.bind(this), false);
    this._minScale = 0;
    this._maxScale = Infinity;

    this._controlPanelToolbar = new UI.Toolbar.Toolbar('transform-control-panel');

    this._modeButtons = {};
    if (!disableRotate) {
      const panModeButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.panModeX), 'largeicon-pan');
      panModeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._setMode.bind(this, Modes.Pan));
      this._modeButtons[Modes.Pan] = panModeButton;
      this._controlPanelToolbar.appendToolbarItem(panModeButton);
      const rotateModeButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.rotateModeV), 'largeicon-rotate');
      rotateModeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._setMode.bind(this, Modes.Rotate));
      this._modeButtons[Modes.Rotate] = rotateModeButton;
      this._controlPanelToolbar.appendToolbarItem(rotateModeButton);
    }
    this._setMode(Modes.Pan);

    const resetButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.resetTransform), 'largeicon-center');
    resetButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.resetAndNotify.bind(this, undefined));
    this._controlPanelToolbar.appendToolbarItem(resetButton);

    this._reset();
  }

  toolbar(): UI.Toolbar.Toolbar {
    return this._controlPanelToolbar;
  }

  _registerShortcuts(): void {
    const zoomFactor = 1.1;
    UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.element, {
      'layers.reset-view': async(): Promise<true> => {
        this.resetAndNotify();
        return true;
      },
      'layers.pan-mode': async(): Promise<true> => {
        this._setMode(Modes.Pan);
        return true;
      },
      'layers.rotate-mode': async(): Promise<true> => {
        this._setMode(Modes.Rotate);
        return true;
      },
      'layers.zoom-in': this._onKeyboardZoom.bind(this, zoomFactor),
      'layers.zoom-out': this._onKeyboardZoom.bind(this, 1 / zoomFactor),
      'layers.up': this._onKeyboardPanOrRotate.bind(this, 0, -1),
      'layers.down': this._onKeyboardPanOrRotate.bind(this, 0, 1),
      'layers.left': this._onKeyboardPanOrRotate.bind(this, -1, 0),
      'layers.right': this._onKeyboardPanOrRotate.bind(this, 1, 0),
    });
  }

  _postChangeEvent(): void {
    this.dispatchEventToListeners(Events.TransformChanged);
  }

  _reset(): void {
    this._scale = 1;
    this._offsetX = 0;
    this._offsetY = 0;
    this._rotateX = 0;
    this._rotateY = 0;
  }

  _setMode(mode: Modes): void {
    if (this._mode === mode) {
      return;
    }
    this._mode = mode;
    this._updateModeButtons();
  }

  _updateModeButtons(): void {
    for (const mode in this._modeButtons) {
      this._modeButtons[mode].setToggled(mode === this._mode);
    }
  }

  resetAndNotify(event?: Event): void {
    this._reset();
    this._postChangeEvent();
    if (event) {
      event.preventDefault();
    }
    this.element.focus();
  }

  setScaleConstraints(minScale: number, maxScale: number): void {
    this._minScale = minScale;
    this._maxScale = maxScale;
    this._scale = Platform.NumberUtilities.clamp(this._scale, minScale, maxScale);
  }

  clampOffsets(minX: number, maxX: number, minY: number, maxY: number): void {
    this._offsetX = Platform.NumberUtilities.clamp(this._offsetX, minX, maxX);
    this._offsetY = Platform.NumberUtilities.clamp(this._offsetY, minY, maxY);
  }

  scale(): number {
    return this._scale;
  }

  offsetX(): number {
    return this._offsetX;
  }

  offsetY(): number {
    return this._offsetY;
  }

  rotateX(): number {
    return this._rotateX;
  }

  rotateY(): number {
    return this._rotateY;
  }

  _onScale(scaleFactor: number, x: number, y: number): void {
    scaleFactor =
        Platform.NumberUtilities.clamp(this._scale * scaleFactor, this._minScale, this._maxScale) / this._scale;
    this._scale *= scaleFactor;
    this._offsetX -= (x - this._offsetX) * (scaleFactor - 1);
    this._offsetY -= (y - this._offsetY) * (scaleFactor - 1);
    this._postChangeEvent();
  }

  _onPan(offsetX: number, offsetY: number): void {
    this._offsetX += offsetX;
    this._offsetY += offsetY;
    this._postChangeEvent();
  }

  _onRotate(rotateX: number, rotateY: number): void {
    this._rotateX = rotateX;
    this._rotateY = rotateY;
    this._postChangeEvent();
  }

  async _onKeyboardZoom(zoomFactor: number): Promise<boolean> {
    this._onScale(zoomFactor, this.element.clientWidth / 2, this.element.clientHeight / 2);
    return true;
  }

  async _onKeyboardPanOrRotate(xMultiplier: number, yMultiplier: number): Promise<boolean> {
    const panStepInPixels = 6;
    const rotateStepInDegrees = 5;

    if (this._mode === Modes.Rotate) {
      // Sic! _onRotate treats X and Y as "rotate around X" and "rotate around Y", so swap X/Y multiplers.
      this._onRotate(
          this._rotateX + yMultiplier * rotateStepInDegrees, this._rotateY + xMultiplier * rotateStepInDegrees);
    } else {
      this._onPan(xMultiplier * panStepInPixels, yMultiplier * panStepInPixels);
    }
    return true;
  }

  _onMouseWheel(event: Event): void {
    /** @const */
    const zoomFactor = 1.1;
    /** @const */
    const wheelZoomSpeed = 1 / 53;
    const mouseEvent = event as WheelEvent;
    const scaleFactor = Math.pow(zoomFactor, -mouseEvent.deltaY * wheelZoomSpeed);
    this._onScale(
        scaleFactor, mouseEvent.clientX - this.element.totalOffsetLeft(),
        mouseEvent.clientY - this.element.totalOffsetTop());
  }

  _onDrag(event: Event): void {
    const {clientX, clientY} = event as MouseEvent;
    if (this._mode === Modes.Rotate) {
      this._onRotate(
          this._oldRotateX + (this._originY - clientY) / this.element.clientHeight * 180,
          this._oldRotateY - (this._originX - clientX) / this.element.clientWidth * 180);
    } else {
      this._onPan(clientX - this._originX, clientY - this._originY);
      this._originX = clientX;
      this._originY = clientY;
    }
  }

  _onDragStart(event: MouseEvent): boolean {
    this.element.focus();
    this._originX = event.clientX;
    this._originY = event.clientY;
    this._oldRotateX = this._rotateX;
    this._oldRotateY = this._rotateY;
    return true;
  }

  _onDragEnd(): void {
    this._originX = 0;
    this._originY = 0;
    this._oldRotateX = 0;
    this._oldRotateY = 0;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  TransformChanged = 'TransformChanged',
}

export const enum Modes {
  Pan = 'Pan',
  Rotate = 'Rotate',
}
