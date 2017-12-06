// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

ColorPicker.ContrastOverlay = class {
  /**
   * @param {!ColorPicker.ContrastInfo} contrastInfo
   * @param {!Element} colorElement
   */
  constructor(contrastInfo, colorElement) {
    /** @type {!ColorPicker.ContrastInfo} */
    this._contrastInfo = contrastInfo;

    this._visible = false;

    var contrastRatioSVG = colorElement.createSVGChild('svg', 'spectrum-contrast-container fill');
    this._contrastRatioLine = contrastRatioSVG.createSVGChild('path', 'spectrum-contrast-line');

    this._width = 0;
    this._height = 0;

    this._contrastRatioLineBuilder = new ColorPicker.ContrastRatioLineBuilder(this._contrastInfo);
    this._contrastRatioLineThrottler = new Common.Throttler(0);
    this._drawContrastRatioLineBound = this._drawContrastRatioLine.bind(this);

    this._contrastInfo.addEventListener(ColorPicker.ContrastInfo.Events.ContrastInfoUpdated, this._update.bind(this));
  }

  _update() {
    if (!this._visible || this._contrastInfo.isNull() || !this._contrastInfo.contrastRatio())
      return;

    this._contrastRatioLineThrottler.schedule(this._drawContrastRatioLineBound);
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  setDimensions(width, height) {
    this._width = width;
    this._height = height;
    this._update();
  }

  /**
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._visible = visible;
    this._contrastRatioLine.classList.toggle('hidden', !visible);
    this._update();
  }

  /**
   * @return {!Promise}
   */
  _drawContrastRatioLine() {
    var path = this._contrastRatioLineBuilder.drawContrastRatioLine(this._width, this._height);
    if (path)
      this._contrastRatioLine.setAttribute('d', path);
    return Promise.resolve();
  }
};

ColorPicker.ContrastRatioLineBuilder = class {
  /**
   * @param {!ColorPicker.ContrastInfo} contrastInfo
   */
  constructor(contrastInfo) {
    /** @type {!ColorPicker.ContrastInfo} */
    this._contrastInfo = contrastInfo;

    /** @type {?string} */
    this._bgColorForPreviousLine = null;

    this._hueForPreviousLine = 0;
    this._alphaForPreviousLine = 0;
  }

  /**
   * @param {number} width
   * @param {number} height
   * @return {?string}
   */
  drawContrastRatioLine(width, height) {
    var requiredContrast = this._contrastInfo.contrastRatioThreshold('aa');
    if (!width || !height || !requiredContrast)
      return null;

    const dS = 0.02;
    const epsilon = 0.0002;
    const H = 0;
    const S = 1;
    const V = 2;
    const A = 3;

    var hsva = this._contrastInfo.hsva();
    var bgColor = this._contrastInfo.bgColor();
    if (!hsva || !bgColor)
      return null;

    var bgColorString = bgColor.asString(Common.Color.Format.RGBA);

    // Don't compute a new line if it would be identical to the previous line.
    if (hsva[H] === this._hueForPreviousLine && hsva[A] === this._alphaForPreviousLine &&
        bgColorString === this._bgColorForPreviousLine)
      return null;

    var fgRGBA = [];
    Common.Color.hsva2rgba(hsva, fgRGBA);
    var bgRGBA = bgColor.rgba();
    var bgLuminance = Common.Color.luminance(bgRGBA);
    var blendedRGBA = [];
    Common.Color.blendColors(fgRGBA, bgRGBA, blendedRGBA);
    var fgLuminance = Common.Color.luminance(blendedRGBA);
    var fgIsLighter = fgLuminance > bgLuminance;
    var desiredLuminance = Common.Color.desiredLuminance(bgLuminance, requiredContrast, fgIsLighter);

    var lastV = hsva[V];
    var currentSlope = 0;
    var candidateHSVA = [hsva[H], 0, 0, hsva[A]];
    var pathBuilder = [];
    var candidateRGBA = [];
    Common.Color.hsva2rgba(candidateHSVA, candidateRGBA);
    Common.Color.blendColors(candidateRGBA, bgRGBA, blendedRGBA);

    /**
     * @param {number} index
     * @param {number} x
     */
    function updateCandidateAndComputeDelta(index, x) {
      candidateHSVA[index] = x;
      Common.Color.hsva2rgba(candidateHSVA, candidateRGBA);
      Common.Color.blendColors(candidateRGBA, bgRGBA, blendedRGBA);
      return Common.Color.luminance(blendedRGBA) - desiredLuminance;
    }

    /**
     * Approach a value of the given component of `candidateHSVA` such that the
     * calculated luminance of `candidateHSVA` approximates `desiredLuminance`.
     * @param {number} index The component of `candidateHSVA` to modify.
     * @return {?number} The new value for the modified component, or `null` if
     *     no suitable value exists.
     */
    function approach(index) {
      var x = candidateHSVA[index];
      var multiplier = 1;
      var dLuminance = updateCandidateAndComputeDelta(index, x);
      var previousSign = Math.sign(dLuminance);

      for (var guard = 100; guard; guard--) {
        if (Math.abs(dLuminance) < epsilon)
          return x;

        var sign = Math.sign(dLuminance);
        if (sign !== previousSign) {
          // If `x` overshoots the correct value, halve the step size.
          multiplier /= 2;
          previousSign = sign;
        } else if (x < 0 || x > 1) {
          // If there is no overshoot and `x` is out of bounds, there is no
          // acceptable value for `x`.
          return null;
        }

        // Adjust `x` by a multiple of `dLuminance` to decrease step size as
        // the computed luminance converges on `desiredLuminance`.
        x += multiplier * (index === V ? -dLuminance : dLuminance);

        dLuminance = updateCandidateAndComputeDelta(index, x);
      }
      // The loop should always converge or go out of bounds on its own.
      console.error('Loop exited unexpectedly');
      return null;
    }

    // Plot V for values of S such that the computed luminance approximates
    // `desiredLuminance`, until no suitable value for V can be found, or the
    // current value of S goes of out bounds.
    for (var s = 0; s < 1 + dS; s += dS) {
      s = Math.min(1, s);
      candidateHSVA[S] = s;

      // Extrapolate the approximate next value for `v` using the approximate
      // gradient of the curve.
      candidateHSVA[V] = lastV + currentSlope * dS;

      var v = approach(V);
      if (v === null)
        break;

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
      s = approach(S);
      if (s !== null)
        pathBuilder = pathBuilder.concat(['L', (s * width).toFixed(2), '-0.1']);
    }

    this._bgColorForPreviousLine = bgColorString;
    this._hueForPreviousLine = hsva[H];
    this._alphaForPreviousLine = hsva[A];

    return pathBuilder.join(' ');
  }
};
