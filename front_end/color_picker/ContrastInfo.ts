// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../core/common/common.js';

export class ContrastInfo extends Common.ObjectWrapper.ObjectWrapper {
  _isNull: boolean;
  _contrastRatio: number|null;
  _contrastRatioAPCA: number|null;
  _contrastRatioThresholds: {
    [x: string]: number,
  }|null;
  _contrastRationAPCAThreshold: number|null;
  _fgColor: Common.Color.Color|null;
  _bgColor: Common.Color.Color|null;
  _colorFormat!: string|undefined;
  constructor(contrastInfo: ContrastInfoType|null) {
    super();
    this._isNull = true;
    this._contrastRatio = null;
    this._contrastRatioAPCA = null;
    this._contrastRatioThresholds = null;
    this._contrastRationAPCAThreshold = 0;
    this._fgColor = null;
    this._bgColor = null;

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

  isNull(): boolean {
    return this._isNull;
  }

  setColor(fgColor: Common.Color.Color, colorFormat?: string): void {
    this._fgColor = fgColor;
    this._colorFormat = colorFormat;
    this._updateContrastRatio();
    this.dispatchEventToListeners(Events.ContrastInfoUpdated);
  }

  colorFormat(): string|undefined {
    return this._colorFormat;
  }

  color(): Common.Color.Color|null {
    return this._fgColor;
  }

  contrastRatio(): number|null {
    return this._contrastRatio;
  }

  contrastRatioAPCA(): number|null {
    return this._contrastRatioAPCA;
  }

  contrastRatioAPCAThreshold(): number|null {
    return this._contrastRationAPCAThreshold;
  }

  setBgColor(bgColor: Common.Color.Color): void {
    this._setBgColorInternal(bgColor);
    this.dispatchEventToListeners(Events.ContrastInfoUpdated);
  }

  _setBgColorInternal(bgColor: Common.Color.Color): void {
    this._bgColor = bgColor;

    if (!this._fgColor) {
      return;
    }

    const fgRGBA = this._fgColor.rgba();

    // If we have a semi-transparent background color over an unknown
    // background, draw the line for the "worst case" scenario: where
    // the unknown background is the same color as the text.
    if (bgColor.hasAlpha()) {
      const blendedRGBA: number[] = Common.ColorUtils.blendColors(bgColor.rgba(), fgRGBA);
      this._bgColor = new Common.Color.Color(blendedRGBA, Common.Color.Format.RGBA);
    }

    this._contrastRatio = Common.ColorUtils.contrastRatio(fgRGBA, this._bgColor.rgba());
    this._contrastRatioAPCA = Common.ColorUtils.contrastRatioAPCA(this._fgColor.rgba(), this._bgColor.rgba());
  }

  bgColor(): Common.Color.Color|null {
    return this._bgColor;
  }

  _updateContrastRatio(): void {
    if (!this._bgColor || !this._fgColor) {
      return;
    }
    this._contrastRatio = Common.ColorUtils.contrastRatio(this._fgColor.rgba(), this._bgColor.rgba());
    this._contrastRatioAPCA = Common.ColorUtils.contrastRatioAPCA(this._fgColor.rgba(), this._bgColor.rgba());
  }

  contrastRatioThreshold(level: string): number|null {
    if (!this._contrastRatioThresholds) {
      return null;
    }
    return this._contrastRatioThresholds[level];
  }
}

export const enum Events {
  ContrastInfoUpdated = 'ContrastInfoUpdated',
}

export interface ContrastInfoType {
  backgroundColors: string[]|null;
  computedFontSize: string;
  computedFontWeight: string;
}
