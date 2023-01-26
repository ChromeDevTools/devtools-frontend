// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Root from '../../../../core/root/root.js';
import * as UI from '../../legacy.js';

import {Events, type ContrastInfo} from './ContrastInfo.js';

export class ContrastOverlay {
  private contrastInfo: ContrastInfo;
  private visible: boolean;
  private readonly contrastRatioSVG: Element;
  private readonly contrastRatioLines: Map<string, Element>;
  private width: number;
  private height: number;
  private readonly contrastRatioLineBuilder: ContrastRatioLineBuilder;
  private readonly contrastRatioLinesThrottler: Common.Throttler.Throttler;
  private readonly drawContrastRatioLinesBound: () => Promise<void>;
  constructor(contrastInfo: ContrastInfo, colorElement: Element) {
    this.contrastInfo = contrastInfo;

    this.visible = false;

    this.contrastRatioSVG = UI.UIUtils.createSVGChild(colorElement, 'svg', 'spectrum-contrast-container fill');
    this.contrastRatioLines = new Map();
    if (Root.Runtime.experiments.isEnabled('APCA')) {
      this.contrastRatioLines.set(
          'APCA', UI.UIUtils.createSVGChild(this.contrastRatioSVG, 'path', 'spectrum-contrast-line'));
    } else {
      this.contrastRatioLines.set(
          'aa', UI.UIUtils.createSVGChild(this.contrastRatioSVG, 'path', 'spectrum-contrast-line'));
      this.contrastRatioLines.set(
          'aaa', UI.UIUtils.createSVGChild(this.contrastRatioSVG, 'path', 'spectrum-contrast-line'));
    }

    this.width = 0;
    this.height = 0;

    this.contrastRatioLineBuilder = new ContrastRatioLineBuilder(this.contrastInfo);

    this.contrastRatioLinesThrottler = new Common.Throttler.Throttler(0);
    this.drawContrastRatioLinesBound = this.drawContrastRatioLines.bind(this);

    this.contrastInfo.addEventListener(Events.ContrastInfoUpdated, this.update.bind(this));
  }

  private update(): void {
    if (!this.visible || this.contrastInfo.isNull()) {
      return;
    }
    if (Root.Runtime.experiments.isEnabled('APCA') && this.contrastInfo.contrastRatioAPCA() === null) {
      return;
    }
    if (!this.contrastInfo.contrastRatio()) {
      return;
    }
    void this.contrastRatioLinesThrottler.schedule(this.drawContrastRatioLinesBound);
  }

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.update();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.contrastRatioSVG.classList.toggle('hidden', !visible);
    this.update();
  }

  private async drawContrastRatioLines(): Promise<void> {
    for (const [level, element] of this.contrastRatioLines) {
      const path = this.contrastRatioLineBuilder.drawContrastRatioLine(this.width, this.height, level as string);
      if (path) {
        element.setAttribute('d', path);
      } else {
        element.removeAttribute('d');
      }
    }
  }
}

export class ContrastRatioLineBuilder {
  private readonly contrastInfo: ContrastInfo;
  constructor(contrastInfo: ContrastInfo) {
    this.contrastInfo = contrastInfo;
  }

  drawContrastRatioLine(width: number, height: number, level: string): string|null {
    const isAPCA = Root.Runtime.experiments.isEnabled('APCA');
    const requiredContrast =
        isAPCA ? this.contrastInfo.contrastRatioAPCAThreshold() : this.contrastInfo.contrastRatioThreshold(level);
    if (!width || !height || requiredContrast === null) {
      return null;
    }

    const dS = 0.02;
    const H = 0;
    const S = 1;
    const V = 2;
    const A = 3;

    const color = this.contrastInfo.color();
    const bgColor = this.contrastInfo.bgColor();
    if (!color || !bgColor) {
      return null;
    }

    const fgRGBA = color.rgba();
    const fgHSVA = color.as(Common.Color.Format.HSL).hsva();
    const bgRGBA = bgColor.rgba();
    const bgLuminance = Common.ColorUtils.luminance(bgRGBA);
    let blendedRGBA: number[] = Common.ColorUtils.blendColors(fgRGBA, bgRGBA);
    const fgLuminance = Common.ColorUtils.luminance(blendedRGBA);
    const fgIsLighter = fgLuminance > bgLuminance;
    const desiredLuminance = isAPCA ?
        Common.ColorUtils.desiredLuminanceAPCA(bgLuminance, requiredContrast, fgIsLighter) :
        Common.Color.desiredLuminance(bgLuminance, requiredContrast, fgIsLighter);

    if (isAPCA &&
        Math.abs(Math.round(Common.ColorUtils.contrastRatioByLuminanceAPCA(desiredLuminance, bgLuminance))) <
            requiredContrast) {
      return null;
    }

    let lastV: number = fgHSVA[V];
    let currentSlope = 0;
    const candidateHSVA: Common.ColorUtils.Color4D = [fgHSVA[H], 0, 0, fgHSVA[A]];
    let pathBuilder: string[] = [];
    const candidateRGBA: Common.ColorUtils.Color4D = [0, 0, 0, 0];
    Common.Color.hsva2rgba(candidateHSVA, candidateRGBA);
    blendedRGBA = Common.ColorUtils.blendColors(candidateRGBA, bgRGBA);

    let candidateLuminance: ((candidateHSVA: Common.ColorUtils.Color4D) => number)|
        ((candidateHSVA: Common.ColorUtils.Color4D) => number) = (candidateHSVA: Common.ColorUtils.Color4D): number => {
          return Common.ColorUtils.luminance(
              Common.ColorUtils.blendColors(Common.Color.Legacy.fromHSVA(candidateHSVA).rgba(), bgRGBA));
        };

    if (Root.Runtime.experiments.isEnabled('APCA')) {
      candidateLuminance = (candidateHSVA: Common.ColorUtils.Color4D): number => {
        return Common.ColorUtils.luminanceAPCA(
            Common.ColorUtils.blendColors(Common.Color.Legacy.fromHSVA(candidateHSVA).rgba(), bgRGBA));
      };
    }

    // Plot V for values of S such that the computed luminance approximates
    // `desiredLuminance`, until no suitable value for V can be found, or the
    // current value of S goes of out bounds.
    let s;
    for (s = 0; s < 1 + dS; s += dS) {
      s = Math.min(1, s);
      candidateHSVA[S] = s;

      // Extrapolate the approximate next value for `v` using the approximate
      // gradient of the curve.
      candidateHSVA[V] = lastV + currentSlope * dS;

      const v = Common.Color.approachColorValue(candidateHSVA, bgRGBA, V, desiredLuminance, candidateLuminance);
      if (v === null) {
        break;
      }

      // Approximate the current gradient of the curve.
      currentSlope = s === 0 ? 0 : (v - lastV) / dS;
      lastV = v;

      pathBuilder.push(pathBuilder.length ? 'L' : 'M');
      pathBuilder.push((s * width).toFixed(2));
      pathBuilder.push(((1 - v) * height).toFixed(2));
    }

    // If no suitable V value for an in-bounds S value was found, find the value
    // of S such that V === 1 and add that to the path.
    if (s < 1 + dS) {
      s -= dS;
      candidateHSVA[V] = 1;
      s = Common.Color.approachColorValue(candidateHSVA, bgRGBA, S, desiredLuminance, candidateLuminance);
      if (s !== null) {
        pathBuilder = pathBuilder.concat(['L', (s * width).toFixed(2), '-0.1']);
      }
    }
    if (pathBuilder.length === 0) {
      return null;
    }
    return pathBuilder.join(' ');
  }
}
