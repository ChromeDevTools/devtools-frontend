// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
export class ContrastInfo extends Common.ObjectWrapper.ObjectWrapper {
    #isNull;
    #contrastRatio;
    #contrastRatioAPCA;
    contrastRatioThresholds;
    #contrastRatioAPCAThreshold;
    fgColor;
    #bgColor;
    #colorFormat;
    constructor(contrastInfo) {
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
    isNull() {
        return this.#isNull;
    }
    setColor(fgColor, colorFormat) {
        this.fgColor = fgColor;
        this.#colorFormat = colorFormat;
        this.updateContrastRatio();
        this.dispatchEventToListeners("ContrastInfoUpdated" /* Events.CONTRAST_INFO_UPDATED */);
    }
    colorFormat() {
        return this.#colorFormat;
    }
    color() {
        return this.fgColor;
    }
    contrastRatio() {
        return this.#contrastRatio;
    }
    contrastRatioAPCA() {
        return this.#contrastRatioAPCA;
    }
    contrastRatioAPCAThreshold() {
        return this.#contrastRatioAPCAThreshold;
    }
    setBgColor(bgColor) {
        this.#setBgColor(bgColor);
        this.dispatchEventToListeners("ContrastInfoUpdated" /* Events.CONTRAST_INFO_UPDATED */);
    }
    #setBgColor(bgColor) {
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
            this.#bgColor = new Common.Color.Legacy(blendedRGBA, "rgba" /* Common.Color.Format.RGBA */);
        }
        this.#contrastRatio = Common.ColorUtils.contrastRatio(fgRGBA, this.#bgColor.rgba());
        this.#contrastRatioAPCA = Common.ColorUtils.contrastRatioAPCA(this.fgColor.rgba(), this.#bgColor.rgba());
    }
    bgColor() {
        return this.#bgColor;
    }
    updateContrastRatio() {
        if (!this.#bgColor || !this.fgColor) {
            return;
        }
        this.#contrastRatio = Common.ColorUtils.contrastRatio(this.fgColor.rgba(), this.#bgColor.rgba());
        this.#contrastRatioAPCA = Common.ColorUtils.contrastRatioAPCA(this.fgColor.rgba(), this.#bgColor.rgba());
    }
    contrastRatioThreshold(level) {
        if (!this.contrastRatioThresholds) {
            return null;
        }
        return this.contrastRatioThresholds[level];
    }
}
//# sourceMappingURL=ContrastInfo.js.map