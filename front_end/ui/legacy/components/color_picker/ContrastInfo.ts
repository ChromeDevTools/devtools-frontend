// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';

export class ContrastInfo extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #isNull: boolean;
  #contrastRatio: number|null;
  #contrastRatioAPCA: number|null;
  private contrastRatioThresholds: Record<string, number>|null;
  readonly #contrastRatioAPCAThreshold: number|null;
  private fgColor: Common.Color.Legacy|null;
  #bgColor: Common.Color.Legacy|null;
  #colorFormat: Common.Color.Format|undefined;
  constructor(contrastInfo: ContrastInfoType|null) {
    super();
    this.#isNull = true;
    this.#contrastRatio = null;
    this.#contrastRatioAPCA = null;
    this.contrastRatioThresholds = null;
    this.#contrastRatioAPCAThreshold = 0;
    this.fgColor = null;
    this.#bgColor = null;

    if (!contrastInfo) {
      return;
    }

    if (!contrastInfo.computedFontSize || !contrastInfo.computedFontWeight) {
      return;
    }

    this.#isNull = false;
    this.contrastRatioThresholds =
        Common.ColorUtils.getContrastThreshold(contrastInfo.computedFontSize, contrastInfo.computedFontWeight);
    this.#contrastRatioAPCAThreshold =
        Common.ColorUtils.getAPCAThreshold(contrastInfo.computedFontSize, contrastInfo.computedFontWeight);

    if (!contrastInfo.backgroundColors || contrastInfo.backgroundColors.length !== 1) {
      return;
    }
    const bgColorText = contrastInfo.backgroundColors[0];
    const bgColor = Common.Color.parse(bgColorText)?.asLegacyColor();
    if (bgColor) {
      this.#setBgColor(bgColor);
    }
  }

  isNull(): boolean {
    return this.#isNull;
  }

  setColor(fgColor: Common.Color.Legacy, colorFormat?: Common.Color.Format): void {
    this.fgColor = fgColor;
    this.#colorFormat = colorFormat;
    this.updateContrastRatio();
    this.dispatchEventToListeners(Events.CONTRAST_INFO_UPDATED);
  }

  colorFormat(): Common.Color.Format|undefined {
    return this.#colorFormat;
  }

  color(): Common.Color.Legacy|null {
    return this.fgColor;
  }

  contrastRatio(): number|null {
    return this.#contrastRatio;
  }

  contrastRatioAPCA(): number|null {
    return this.#contrastRatioAPCA;
  }

  contrastRatioAPCAThreshold(): number|null {
    return this.#contrastRatioAPCAThreshold;
  }

  setBgColor(bgColor: Common.Color.Legacy): void {
    this.#setBgColor(bgColor);
    this.dispatchEventToListeners(Events.CONTRAST_INFO_UPDATED);
  }

  #setBgColor(bgColor: Common.Color.Legacy): void {
    this.#bgColor = bgColor;

    if (!this.fgColor) {
      return;
    }

    const fgRGBA = this.fgColor.rgba();

    // If we have a semi-transparent background color over an unknown
    // background, draw the line for the "worst case" scenario: where
    // the unknown background is the same color as the text.
    if (bgColor.hasAlpha()) {
      const blendedRGBA = Common.ColorUtils.blendColors(bgColor.rgba(), fgRGBA);
      this.#bgColor = new Common.Color.Legacy(blendedRGBA, Common.Color.Format.RGBA);
    }

    this.#contrastRatio = Common.ColorUtils.contrastRatio(fgRGBA, this.#bgColor.rgba());
    this.#contrastRatioAPCA = Common.ColorUtils.contrastRatioAPCA(this.fgColor.rgba(), this.#bgColor.rgba());
  }

  bgColor(): Common.Color.Legacy|null {
    return this.#bgColor;
  }

  private updateContrastRatio(): void {
    if (!this.#bgColor || !this.fgColor) {
      return;
    }
    this.#contrastRatio = Common.ColorUtils.contrastRatio(this.fgColor.rgba(), this.#bgColor.rgba());
    this.#contrastRatioAPCA = Common.ColorUtils.contrastRatioAPCA(this.fgColor.rgba(), this.#bgColor.rgba());
  }

  contrastRatioThreshold(level: string): number|null {
    if (!this.contrastRatioThresholds) {
      return null;
    }
    return this.contrastRatioThresholds[level];
  }
}

export const enum Events {
  CONTRAST_INFO_UPDATED = 'ContrastInfoUpdated',
}

export interface EventTypes {
  [Events.CONTRAST_INFO_UPDATED]: void;
}

export interface ContrastInfoType {
  backgroundColors: string[]|null;
  computedFontSize: string;
  computedFontWeight: string;
}
