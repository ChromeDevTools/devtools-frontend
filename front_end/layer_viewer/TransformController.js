// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class TransformController extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!HTMLElement} element
   * @param {boolean=} disableRotate
   */
  constructor(element, disableRotate) {
    super();
    /**
     * @type {!Modes}
     */
    this._mode;
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
    element.addEventListener('mousewheel', this._onMouseWheel.bind(this), false);
    this._minScale = 0;
    this._maxScale = Infinity;

    this._controlPanelToolbar = new UI.Toolbar.Toolbar('transform-control-panel');

    /** @type {!Object<string, !UI.Toolbar.ToolbarToggle>} */
    this._modeButtons = {};
    if (!disableRotate) {
      const panModeButton = new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Pan mode (X)'), 'largeicon-pan');
      panModeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._setMode.bind(this, Modes.Pan));
      this._modeButtons[Modes.Pan] = panModeButton;
      this._controlPanelToolbar.appendToolbarItem(panModeButton);
      const rotateModeButton =
          new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Rotate mode (V)'), 'largeicon-rotate');
      rotateModeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._setMode.bind(this, Modes.Rotate));
      this._modeButtons[Modes.Rotate] = rotateModeButton;
      this._controlPanelToolbar.appendToolbarItem(rotateModeButton);
    }
    this._setMode(Modes.Pan);

    const resetButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Reset transform (0)'), 'largeicon-center');
    resetButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.resetAndNotify.bind(this, undefined));
    this._controlPanelToolbar.appendToolbarItem(resetButton);

    this._reset();
  }

  /**
   * @return {!UI.Toolbar.Toolbar}
   */
  toolbar() {
    return this._controlPanelToolbar;
  }

  _registerShortcuts() {
    const zoomFactor = 1.1;
    UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.element, {
      'layers.reset-view': async () => {
        this.resetAndNotify();
        return true;
      },
      'layers.pan-mode': async () => {
        this._setMode(Modes.Pan);
        return true;
      },
      'layers.rotate-mode': async () => {
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

  _postChangeEvent() {
    this.dispatchEventToListeners(Events.TransformChanged);
  }

  _reset() {
    this._scale = 1;
    this._offsetX = 0;
    this._offsetY = 0;
    this._rotateX = 0;
    this._rotateY = 0;
  }

  /**
   * @param {!Modes} mode
   */
  _setMode(mode) {
    if (this._mode === mode) {
      return;
    }
    this._mode = mode;
    this._updateModeButtons();
  }

  _updateModeButtons() {
    for (const mode in this._modeButtons) {
      this._modeButtons[mode].setToggled(mode === this._mode);
    }
  }

  /**
   * @param {!Event=} event
   */
  resetAndNotify(event) {
    this._reset();
    this._postChangeEvent();
    if (event) {
      event.preventDefault();
    }
    this.element.focus();
  }

  /**
   * @param {number} minScale
   * @param {number} maxScale
   */
  setScaleConstraints(minScale, maxScale) {
    this._minScale = minScale;
    this._maxScale = maxScale;
    this._scale = Platform.NumberUtilities.clamp(this._scale, minScale, maxScale);
  }

  /**
   * @param {number} minX
   * @param {number} maxX
   * @param {number} minY
   * @param {number} maxY
   */
  clampOffsets(minX, maxX, minY, maxY) {
    this._offsetX = Platform.NumberUtilities.clamp(this._offsetX, minX, maxX);
    this._offsetY = Platform.NumberUtilities.clamp(this._offsetY, minY, maxY);
  }

  /**
   * @return {number}
   */
  scale() {
    return this._scale;
  }

  /**
   * @return {number}
   */
  offsetX() {
    return this._offsetX;
  }

  /**
   * @return {number}
   */
  offsetY() {
    return this._offsetY;
  }

  /**
   * @return {number}
   */
  rotateX() {
    return this._rotateX;
  }

  /**
   * @return {number}
   */
  rotateY() {
    return this._rotateY;
  }

  /**
   * @param {number} scaleFactor
   * @param {number} x
   * @param {number} y
   */
  _onScale(scaleFactor, x, y) {
    scaleFactor =
        Platform.NumberUtilities.clamp(this._scale * scaleFactor, this._minScale, this._maxScale) / this._scale;
    this._scale *= scaleFactor;
    this._offsetX -= (x - this._offsetX) * (scaleFactor - 1);
    this._offsetY -= (y - this._offsetY) * (scaleFactor - 1);
    this._postChangeEvent();
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  _onPan(offsetX, offsetY) {
    this._offsetX += offsetX;
    this._offsetY += offsetY;
    this._postChangeEvent();
  }

  /**
   * @param {number} rotateX
   * @param {number} rotateY
   */
  _onRotate(rotateX, rotateY) {
    this._rotateX = rotateX;
    this._rotateY = rotateY;
    this._postChangeEvent();
  }

  /**
   * @param {number} zoomFactor
   * @return {!Promise.<boolean>}
   */
  async _onKeyboardZoom(zoomFactor) {
    this._onScale(zoomFactor, this.element.clientWidth / 2, this.element.clientHeight / 2);
    return true;
  }

  /**
   * @param {number} xMultiplier
   * @param {number} yMultiplier
   * @return {!Promise.<boolean>}
   */
  async _onKeyboardPanOrRotate(xMultiplier, yMultiplier) {
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

  /**
   * @param {!Event} event
   */
  _onMouseWheel(event) {
    /** @const */
    const zoomFactor = 1.1;
    /** @const */
    const mouseWheelZoomSpeed = 1 / 120;
    const mouseEvent = /** @type {*} */ (event);
    const scaleFactor = Math.pow(zoomFactor, mouseEvent.wheelDeltaY * mouseWheelZoomSpeed);
    this._onScale(
        scaleFactor, mouseEvent.clientX - this.element.totalOffsetLeft(),
        mouseEvent.clientY - this.element.totalOffsetTop());
  }

  /**
   * @param {!Event} event
   */
  _onDrag(event) {
    const {clientX, clientY} = /** @type {!MouseEvent} */ (event);
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

  /**
   * @param {!MouseEvent} event
   */
  _onDragStart(event) {
    this.element.focus();
    this._originX = event.clientX;
    this._originY = event.clientY;
    this._oldRotateX = this._rotateX;
    this._oldRotateY = this._rotateY;
    return true;
  }

  _onDragEnd() {
    this._originX = 0;
    this._originY = 0;
    this._oldRotateX = 0;
    this._oldRotateY = 0;
  }
}

/** @enum {symbol} */
export const Events = {
  TransformChanged: Symbol('TransformChanged')
};

/**
 * @enum {string}
 */
export const Modes = {
  Pan: 'Pan',
  Rotate: 'Rotate',
};
