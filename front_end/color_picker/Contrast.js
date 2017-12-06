// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

ColorPicker.ContrastInfo = class extends Common.Object {
  constructor() {
    super();

    /** @type {?Array<number>} */
    this._hsva = null;

    /** @type {?Common.Color} */
    this._fgColor = null;

    /** @type {?Common.Color} */
    this._bgColor = null;

    /** @type {?number} */
    this._contrastRatio = null;

    /** @type {?Object<string, number>} */
    this._contrastRatioThresholds = null;

    /** @type {string} */
    this._colorString = '';

    /** @type {boolean} */
    this._isNull = true;
  }

  /**
   * @param {?SDK.CSSModel.ContrastInfo} contrastInfo
   */
  update(contrastInfo) {
    this._isNull = true;
    this._contrastRatio = null;
    this._contrastRatioThresholds = null;
    this._bgColor = null;

    if (contrastInfo.computedFontSize && contrastInfo.computedFontWeight && contrastInfo.computedBodyFontSize) {
      this._isNull = false;
      var isLargeFont = ColorPicker.ContrastInfo.computeIsLargeFont(
          contrastInfo.computedFontSize, contrastInfo.computedFontWeight, contrastInfo.computedBodyFontSize);

      this._contrastRatioThresholds =
          ColorPicker.ContrastInfo._ContrastThresholds[(isLargeFont ? 'largeFont' : 'normalFont')];
    }

    if (contrastInfo.backgroundColors && contrastInfo.backgroundColors.length === 1) {
      var bgColorText = contrastInfo.backgroundColors[0];
      var bgColor = Common.Color.parse(bgColorText);
      if (bgColor)
        this._setBgColorInternal(bgColor);
    }

    this.dispatchEventToListeners(ColorPicker.ContrastInfo.Events.ContrastInfoUpdated);
  }

  /**
   * @return {boolean}
   */
  isNull() {
    return this._isNull;
  }

  /**
   * @param {!Array<number>} hsva
   * @param {string} colorString
   */
  setColor(hsva, colorString) {
    this._hsva = hsva;
    this._fgColor = Common.Color.fromHSVA(hsva);
    this._colorString = colorString;
    this._updateContrastRatio();
    this.dispatchEventToListeners(ColorPicker.ContrastInfo.Events.ContrastInfoUpdated);
  }

  /**
   * @return {?number}
   */
  contrastRatio() {
    return this._contrastRatio;
  }

  /**
   * @return {string}
   */
  colorString() {
    return this._colorString;
  }

  /**
   * @return {?Array<number>}
   */
  hsva() {
    return this._hsva;
  }

  /**
   * @param {!Common.Color} bgColor
   */
  setBgColor(bgColor) {
    this._setBgColorInternal(bgColor);
    this.dispatchEventToListeners(ColorPicker.ContrastInfo.Events.ContrastInfoUpdated);
  }

  /**
   * @param {!Common.Color} bgColor
   */
  _setBgColorInternal(bgColor) {
    this._bgColor = bgColor;

    if (!this._fgColor)
      return;

    var fgRGBA = this._fgColor.rgba();

    // If we have a semi-transparent background color over an unknown
    // background, draw the line for the "worst case" scenario: where
    // the unknown background is the same color as the text.
    if (bgColor.hasAlpha) {
      var blendedRGBA = [];
      Common.Color.blendColors(bgColor.rgba(), fgRGBA, blendedRGBA);
      this._bgColor = new Common.Color(blendedRGBA, Common.Color.Format.RGBA);
    }

    this._contrastRatio = Common.Color.calculateContrastRatio(fgRGBA, this._bgColor.rgba());
  }

  /**
   * @return {?Common.Color}
   */
  bgColor() {
    return this._bgColor;
  }

  _updateContrastRatio() {
    if (!this._bgColor || !this._fgColor)
      return;
    this._contrastRatio = Common.Color.calculateContrastRatio(this._fgColor.rgba(), this._bgColor.rgba());
  }

  /**
   * @param {string} level
   * @return {?number}
   */
  contrastRatioThreshold(level) {
    if (!this._contrastRatioThresholds)
      return null;
    return this._contrastRatioThresholds[level];
  }

  /**
   * @param {string} fontSize
   * @param {string} fontWeight
   * @param {?string} bodyFontSize
   * @return {boolean}
   */
  static computeIsLargeFont(fontSize, fontWeight, bodyFontSize) {
    const boldWeights = ['bold', 'bolder', '600', '700', '800', '900'];

    var fontSizePx = parseFloat(fontSize.replace('px', ''));
    var isBold = (boldWeights.indexOf(fontWeight) !== -1);

    if (bodyFontSize) {
      var bodyFontSizePx = parseFloat(bodyFontSize.replace('px', ''));
      if (isBold) {
        if (fontSizePx >= (bodyFontSizePx * 1.2))
          return true;
      } else if (fontSizePx >= (bodyFontSizePx * 1.5)) {
        return true;
      }
      return false;
    }

    var fontSizePt = Math.ceil(fontSizePx * 72 / 96);
    if (isBold)
      return fontSizePt >= 14;
    else
      return fontSizePt >= 18;
  }
};

/** @enum {symbol} */
ColorPicker.ContrastInfo.Events = {
  ContrastInfoUpdated: Symbol('ContrastInfoUpdated')
};

ColorPicker.ContrastInfo._ContrastThresholds = {
  largeFont: {aa: 3.0, aaa: 4.5},
  normalFont: {aa: 4.5, aaa: 7.0}
};

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

ColorPicker.ContrastDetails = class {
  /**
   * @param {!ColorPicker.ContrastInfo} contrastInfo
   * @param {!Element} contentElement
   * @param {function(boolean=, !Common.Event=)} toggleMainColorPickerCallback
   * @param {function()} expandedChangedCallback
   */
  constructor(contrastInfo, contentElement, toggleMainColorPickerCallback, expandedChangedCallback) {
    /** @type {!ColorPicker.ContrastInfo} */
    this._contrastInfo = contrastInfo;

    /** @type {!Element} */
    this._element = contentElement.createChild('div', 'spectrum-contrast-details collapsed');

    /** @type {function(boolean=, !Common.Event=)} */
    this._toggleMainColorPicker = toggleMainColorPickerCallback;

    /** @type {function()} */
    this._expandedChangedCallback = expandedChangedCallback;

    /** @type {boolean} */
    this._expanded = false;

    /** @type {boolean} */
    this._passesAA = true;

    /** @type {boolean} */
    this._contrastUnknown = false;

    // This will not be visible if we don't get ContrastInfo,
    // e.g. for a non-font color property such as border-color.
    /** @type {boolean} */
    this._visible = false;

    var contrastValueRow = this._element.createChild('div');
    contrastValueRow.addEventListener('click', this._topRowClicked.bind(this));
    var contrastValueRowContents = contrastValueRow.createChild('div', 'container');
    contrastValueRowContents.createTextChild(Common.UIString('Contrast Ratio'));

    /** @type {!Element} */
    this._contrastLink = /** @type {!Element} */ (contrastValueRowContents.appendChild(UI.createExternalLink(
        'https://developers.google.com/web/fundamentals/accessibility/accessible-styles#color_and_contrast',
        'Color and contrast on Web Fundamentals', 'contrast-link')));
    this._contrastLink.textContent = '';
    this._contrastLink.appendChild(UI.Icon.create('mediumicon-info'));
    this._contrastLink.appendChild(UI.Icon.create('mediumicon-warning'));

    this._contrastValueBubble = contrastValueRowContents.createChild('span', 'contrast-details-value');
    this._contrastValueBubble.title = Common.UIString('Copy contrast ratio to clipboard');
    this._contrastValue = this._contrastValueBubble.createChild('span');
    this._contrastValueBubbleIcons = [];
    this._contrastValueBubbleIcons.push(
        this._contrastValueBubble.appendChild(UI.Icon.create('smallicon-checkmark-square')));
    this._contrastValueBubbleIcons.push(
        this._contrastValueBubble.appendChild(UI.Icon.create('smallicon-checkmark-behind')));
    this._contrastValueBubbleIcons.push(this._contrastValueBubble.appendChild(UI.Icon.create('smallicon-no')));
    this._contrastValueBubble.addEventListener('click', this._onContrastValueBubbleClick.bind(this));

    var expandToolbar = new UI.Toolbar('expand', contrastValueRowContents);
    this._expandButton = new UI.ToolbarButton(Common.UIString('Show more'), 'smallicon-expand-more');
    this._expandButton.addEventListener(UI.ToolbarButton.Events.Click, this._expandButtonClicked.bind(this));
    UI.ARIAUtils.setExpanded(this._expandButton.element, false);
    expandToolbar.appendToolbarItem(this._expandButton);

    this._expandedDetails = this._element.createChild('div', 'container expanded-details');
    this._expandedDetails.id = 'expanded-contrast-details';
    UI.ARIAUtils.setControls(this._expandButton.element, this._expandedDetails);

    this._contrastThresholds = this._expandedDetails.createChild('div', 'contrast-thresholds');

    this._contrastAA = this._contrastThresholds.createChild('div', 'contrast-threshold');
    this._contrastAA.appendChild(UI.Icon.create('smallicon-checkmark-square'));
    this._contrastAA.appendChild(UI.Icon.create('smallicon-no'));
    this._contrastPassFailAA = this._contrastAA.createChild('span', 'contrast-pass-fail');

    this._contrastAAA = this._contrastThresholds.createChild('div', 'contrast-threshold');
    this._contrastAAA.appendChild(UI.Icon.create('smallicon-checkmark-square'));
    this._contrastAAA.appendChild(UI.Icon.create('smallicon-no'));
    this._contrastPassFailAAA = this._contrastAAA.createChild('span', 'contrast-pass-fail');

    this._chooseBgColor = this._expandedDetails.createChild('div', 'contrast-choose-bg-color');
    this._chooseBgColor.textContent = Common.UIString('Please select background color.');

    var bgColorContainer = this._expandedDetails.createChild('div', 'background-color');

    var pickerToolbar = new UI.Toolbar('spectrum-eye-dropper', bgColorContainer);
    this._bgColorPickerButton =
        new UI.ToolbarToggle(Common.UIString('Toggle background color picker'), 'largeicon-eyedropper');
    this._bgColorPickerButton.addEventListener(
        UI.ToolbarButton.Events.Click, this._toggleBackgroundColorPicker.bind(this, undefined));
    pickerToolbar.appendToolbarItem(this._bgColorPickerButton);
    this._bgColorPickedBound = this._bgColorPicked.bind(this);

    this._bgColorSwatch = new ColorPicker.ContrastDetails.Swatch(bgColorContainer);

    this._contrastInfo.addEventListener(ColorPicker.ContrastInfo.Events.ContrastInfoUpdated, this._update.bind(this));
  }

  _update() {
    if (this._contrastInfo.isNull()) {
      this.setVisible(false);
      return;
    }

    this.setVisible(true);

    var contrastRatio = this._contrastInfo.contrastRatio();
    var bgColor = this._contrastInfo.bgColor();
    if (!contrastRatio || !bgColor) {
      this._contrastUnknown = true;
      this._contrastValue.textContent = '?';
      this._contrastValueBubble.classList.add('contrast-unknown');
      this._chooseBgColor.classList.remove('hidden');
      this._contrastThresholds.classList.add('hidden');
      return;
    }

    this._contrastUnknown = false;
    this._chooseBgColor.classList.add('hidden');
    this._contrastThresholds.classList.remove('hidden');
    this._contrastValueBubble.classList.remove('contrast-unknown');
    this._contrastValue.textContent = contrastRatio.toFixed(2);

    this._bgColorSwatch.setBackgroundColor(bgColor);
    this._bgColorSwatch.setTextColor(this._contrastInfo.colorString());

    var aa = this._contrastInfo.contrastRatioThreshold('aa');
    this._passesAA = this._contrastInfo.contrastRatio() >= aa;
    this._contrastPassFailAA.textContent = '';
    this._contrastPassFailAA.createTextChild(this._passesAA ? Common.UIString('Passes ') : Common.UIString('Fails '));
    this._contrastPassFailAA.createChild('strong').textContent = Common.UIString('AA (%s)', aa.toFixed(1));
    this._contrastAA.classList.toggle('pass', this._passesAA);
    this._contrastAA.classList.toggle('fail', !this._passesAA);

    var aaa = this._contrastInfo.contrastRatioThreshold('aaa');
    var passesAAA = this._contrastInfo.contrastRatio() >= aaa;
    this._contrastPassFailAAA.textContent = '';
    this._contrastPassFailAAA.createTextChild(passesAAA ? Common.UIString('Passes ') : Common.UIString('Fails '));
    this._contrastPassFailAAA.createChild('strong').textContent = Common.UIString('AAA (%s)', aaa.toFixed(1));
    this._contrastAAA.classList.toggle('pass', passesAAA);
    this._contrastAAA.classList.toggle('fail', !passesAAA);

    this._element.classList.toggle('contrast-fail', !this._passesAA);
    this._contrastValueBubble.classList.toggle('contrast-aa', this._passesAA);
    this._contrastValueBubble.classList.toggle('contrast-aaa', passesAAA);
  }

  /**
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._visible = visible;
    this._element.classList.toggle('hidden', !visible);
  }

  /**
   * @return {boolean}
   */
  visible() {
    return this._visible;
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @param {!Common.Event} event
   */
  _expandButtonClicked(event) {
    this._contrastValueBubble.getComponentSelection().empty();
    this._toggleExpanded();
  }

  /**
   * @param {!Event} event
   */
  _topRowClicked(event) {
    if (event.path.includes(this._contrastLink) || event.path.includes(this._contrastValueBubble))
      return;
    this._contrastValueBubble.getComponentSelection().empty();
    this._toggleExpanded();
    event.consume(true);
  }

  _toggleExpanded() {
    this._expanded = !this._expanded;
    UI.ARIAUtils.setExpanded(this._expandButton.element, this._expanded);
    this._element.classList.toggle('collapsed', !this._expanded);
    if (this._expanded) {
      this._toggleMainColorPicker(false);
      this._expandButton.setGlyph('smallicon-expand-less');
      this._expandButton.setTitle(Common.UIString('Show less'));
      if (this._contrastUnknown)
        this._toggleBackgroundColorPicker(true);
    } else {
      this._toggleBackgroundColorPicker(false);
      this._expandButton.setGlyph('smallicon-expand-more');
      this._expandButton.setTitle(Common.UIString('Show more'));
    }
    this._expandedChangedCallback();
  }

  collapse() {
    this._element.classList.remove('expanded');
    this._toggleBackgroundColorPicker(false);
    this._toggleMainColorPicker(false);
  }

  /**
   * @return {boolean}
   */
  expanded() {
    return this._expanded;
  }

  /**
   * @param {!Event} event
   */
  _onContrastValueBubbleClick(event) {
    InspectorFrontendHost.copyText(this._contrastValueBubble.textContent);
    this._contrastValueBubble.getComponentSelection().selectAllChildren(this._contrastValueBubble);
  }

  /**
   * @param {boolean=} enabled
   */
  _toggleBackgroundColorPicker(enabled) {
    if (enabled === undefined)
      enabled = !this._bgColorPickerButton.toggled();
    this._bgColorPickerButton.setToggled(enabled);
    InspectorFrontendHost.setEyeDropperActive(enabled);
    if (enabled) {
      InspectorFrontendHost.events.addEventListener(
          InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this._bgColorPickedBound);
    } else {
      InspectorFrontendHost.events.removeEventListener(
          InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this._bgColorPickedBound);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _bgColorPicked(event) {
    var rgbColor = /** @type {!{r: number, g: number, b: number, a: number}} */ (event.data);
    var rgba = [rgbColor.r, rgbColor.g, rgbColor.b, (rgbColor.a / 2.55 | 0) / 100];
    var color = Common.Color.fromRGBA(rgba);
    this._contrastInfo.setBgColor(color);
    this._toggleBackgroundColorPicker(false);
    InspectorFrontendHost.bringToFront();
  }
};

ColorPicker.ContrastDetails.Swatch = class {
  /**
   * @param {!Element} parentElement
   */
  constructor(parentElement) {
    this._parentElement = parentElement;
    this._swatchElement = parentElement.createChild('span', 'swatch contrast swatch-inner-white');
    this._swatchInnerElement = this._swatchElement.createChild('span', 'swatch-inner');
    this._textPreview = this._swatchElement.createChild('div', 'text-preview');
    this._textPreview.textContent = 'Aa';
  }

  /**
   * @param {!Common.Color} color
   */
  setBackgroundColor(color) {
    this._swatchInnerElement.style.background =
        /** @type {string} */ (color.asString(Common.Color.Format.RGBA));
    // Show border if the swatch is white.
    this._swatchElement.classList.toggle('swatch-inner-white', color.hsla()[2] > 0.9);
  }

  /**
   * @param {string} colorString
   */
  setTextColor(colorString) {
    this._textPreview.style.color = colorString;
  }
};
