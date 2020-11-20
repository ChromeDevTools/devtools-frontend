// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

export class ContrastInfo extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {?ContrastInfoType} contrastInfo
   */
  constructor(contrastInfo) {
    super();
    this._isNull = true;
    /** @type {?number} */
    this._contrastRatio = null;
    /** @type {?number} */
    this._contrastRatioAPCA = null;
    /** @type {?Object<string, number>} */
    this._contrastRatioThresholds = null;
    this._contrastRationAPCAThreshold = 0;
    /** @type {?Common.Color.Color} */
    this._fgColor = null;
    /** @type {?Common.Color.Color} */
    this._bgColor = null;
    /** @type {string|undefined} */
    this._colorFormat;

    if (!contrastInfo) {
      return;
    }

    if (!contrastInfo.computedFontSize || !contrastInfo.computedFontWeight || !contrastInfo.backgroundColors ||
        contrastInfo.backgroundColors.length !== 1) {
      return;
    }

    this._isNull = false;
    this._contrastRatioThresholds =
        Common.ColorUtils.getContrastThreshold(contrastInfo.computedFontSize, contrastInfo.computedFontWeight);
    this._contrastRationAPCAThreshold =
        Common.ColorUtils.getAPCAThreshold(contrastInfo.computedFontSize, contrastInfo.computedFontWeight);
    const bgColorText = contrastInfo.backgroundColors[0];
    const bgColor = Common.Color.Color.parse(bgColorText);
    if (bgColor) {
      this._setBgColorInternal(bgColor);
    }
  }

  /**
   * @return {boolean}
   */
  isNull() {
    return this._isNull;
  }

  /**
   * @param {!Common.Color.Color} fgColor
   * @param {string=} colorFormat
   */
  setColor(fgColor, colorFormat) {
    this._fgColor = fgColor;
    this._colorFormat = colorFormat;
    this._updateContrastRatio();
    this.dispatchEventToListeners(Events.ContrastInfoUpdated);
  }

  /**
   * @return {string|undefined}
   */
  colorFormat() {
    return this._colorFormat;
  }

  /**
   * @return {?Common.Color.Color}
   */
  color() {
    return this._fgColor;
  }

  /**
   * @return {?number}
   */
  contrastRatio() {
    return this._contrastRatio;
  }

  /**
   * @return {?number}
   */
  contrastRatioAPCA() {
    return this._contrastRatioAPCA;
  }

  /**
   * @return {?number}
   */
  contrastRatioAPCAThreshold() {
    return this._contrastRationAPCAThreshold;
  }

  /**
   * @param {!Common.Color.Color} bgColor
   */
  setBgColor(bgColor) {
    this._setBgColorInternal(bgColor);
    this.dispatchEventToListeners(Events.ContrastInfoUpdated);
  }

  /**
   * @param {!Common.Color.Color} bgColor
   */
  _setBgColorInternal(bgColor) {
    this._bgColor = bgColor;

    if (!this._fgColor) {
      return;
    }

    const fgRGBA = this._fgColor.rgba();

    // If we have a semi-transparent background color over an unknown
    // background, draw the line for the "worst case" scenario: where
    // the unknown background is the same color as the text.
    if (bgColor.hasAlpha()) {
      /** @type {!Array<number>} */
      const blendedRGBA = Common.ColorUtils.blendColors(bgColor.rgba(), fgRGBA);
      this._bgColor = new Common.Color.Color(blendedRGBA, Common.Color.Format.RGBA);
    }

    this._contrastRatio = Common.ColorUtils.contrastRatio(fgRGBA, this._bgColor.rgba());
    this._contrastRatioAPCA = Common.ColorUtils.contrastRatioAPCA(this._fgColor.rgba(), this._bgColor.rgba());
  }

  /**
   * @return {?Common.Color.Color}
   */
  bgColor() {
    return this._bgColor;
  }

  _updateContrastRatio() {
    if (!this._bgColor || !this._fgColor) {
      return;
    }
    this._contrastRatio = Common.ColorUtils.contrastRatio(this._fgColor.rgba(), this._bgColor.rgba());
    this._contrastRatioAPCA = Common.ColorUtils.contrastRatioAPCA(this._fgColor.rgba(), this._bgColor.rgba());
  }

  /**
   * @param {string} level
   * @return {?number}
   */
  contrastRatioThreshold(level) {
    if (!this._contrastRatioThresholds) {
      return null;
    }
    return this._contrastRatioThresholds[level];
  }
}

/** @enum {symbol} */
export const Events = {
  ContrastInfoUpdated: Symbol('ContrastInfoUpdated')
};

/** @typedef {{backgroundColors: ?Array<string>, computedFontSize: string, computedFontWeight: string}} */
// @ts-ignore typedef
export let ContrastInfoType;
