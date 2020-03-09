// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as UI from '../ui/ui.js';

import {ContrastInfo, Events as ContrastInfoEvents} from './ContrastInfo.js';  // eslint-disable-line no-unused-vars

export class ContrastDetails extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!ContrastInfo} contrastInfo
   * @param {!Element} contentElement
   * @param {function(boolean=, !Common.EventTarget.EventTargetEvent=)} toggleMainColorPickerCallback
   * @param {function()} expandedChangedCallback
   */
  constructor(contrastInfo, contentElement, toggleMainColorPickerCallback, expandedChangedCallback) {
    super();
    /** @type {!ContrastInfo} */
    this._contrastInfo = contrastInfo;

    /** @type {!Element} */
    this._element = contentElement.createChild('div', 'spectrum-contrast-details collapsed');

    /** @type {function(boolean=, !Common.EventTarget.EventTargetEvent=)} */
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

    const contrastValueRow = this._element.createChild('div');
    contrastValueRow.addEventListener('click', this._topRowClicked.bind(this));
    const contrastValueRowContents = contrastValueRow.createChild('div', 'container');
    contrastValueRowContents.createTextChild(Common.UIString.UIString('Contrast ratio'));

    this._contrastValueBubble = contrastValueRowContents.createChild('span', 'contrast-details-value');
    this._contrastValue = this._contrastValueBubble.createChild('span');
    this._contrastValueBubbleIcons = [];
    this._contrastValueBubbleIcons.push(
        this._contrastValueBubble.appendChild(UI.Icon.Icon.create('smallicon-checkmark-square')));
    this._contrastValueBubbleIcons.push(
        this._contrastValueBubble.appendChild(UI.Icon.Icon.create('smallicon-checkmark-behind')));
    this._contrastValueBubbleIcons.push(this._contrastValueBubble.appendChild(UI.Icon.Icon.create('smallicon-no')));
    this._contrastValueBubbleIcons.forEach(button => button.addEventListener('click', event => {
      ContrastDetails._showHelp();
      event.consume(false);
    }));

    const expandToolbar = new UI.Toolbar.Toolbar('expand', contrastValueRowContents);
    this._expandButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Show more'), 'smallicon-expand-more');
    this._expandButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._expandButtonClicked.bind(this));
    UI.ARIAUtils.setExpanded(this._expandButton.element, false);
    expandToolbar.appendToolbarItem(this._expandButton);

    this._expandedDetails = this._element.createChild('div', 'expanded-details');
    UI.ARIAUtils.setControls(this._expandButton.element, this._expandedDetails);

    this._contrastThresholds = this._expandedDetails.createChild('div', 'contrast-thresholds');

    this._contrastAA = this._contrastThresholds.createChild('div', 'contrast-threshold');
    this._contrastPassFailAA = this._contrastAA.createChild('span', 'contrast-pass-fail');

    this._contrastAAA = this._contrastThresholds.createChild('div', 'contrast-threshold');
    this._contrastPassFailAAA = this._contrastAAA.createChild('span', 'contrast-pass-fail');

    this._chooseBgColor = this._expandedDetails.createChild('div', 'contrast-choose-bg-color');
    this._chooseBgColor.textContent = Common.UIString.UIString('Pick background color');

    const bgColorContainer = this._expandedDetails.createChild('div', 'background-color');

    const pickerToolbar = new UI.Toolbar.Toolbar('spectrum-eye-dropper', bgColorContainer);
    this._bgColorPickerButton = new UI.Toolbar.ToolbarToggle(
        Common.UIString.UIString('Toggle background color picker'), 'largeicon-eyedropper');
    this._bgColorPickerButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._toggleBackgroundColorPicker.bind(this, undefined, true));
    pickerToolbar.appendToolbarItem(this._bgColorPickerButton);
    this._bgColorPickedBound = this._bgColorPicked.bind(this);

    this._bgColorSwatch = new Swatch(bgColorContainer);

    this._contrastInfo.addEventListener(ContrastInfoEvents.ContrastInfoUpdated, this._update.bind(this));
  }

  _update() {
    if (this._contrastInfo.isNull()) {
      this.setVisible(false);
      return;
    }

    this.setVisible(true);

    const contrastRatio = this._contrastInfo.contrastRatio();
    const fgColor = this._contrastInfo.color();
    const bgColor = this._contrastInfo.bgColor();
    if (!contrastRatio || !bgColor || !fgColor) {
      this._contrastUnknown = true;
      this._contrastValue.textContent = '';
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

    this._bgColorSwatch.setColors(fgColor, bgColor);

    const aa = this._contrastInfo.contrastRatioThreshold('aa');
    this._passesAA = this._contrastInfo.contrastRatio() >= aa;
    this._contrastPassFailAA.removeChildren();
    const labelAA = this._contrastPassFailAA.createChild('span', 'contrast-link-label');
    labelAA.textContent = Common.UIString.UIString('AA');
    this._contrastPassFailAA.createChild('span').textContent = Common.UIString.UIString(': %s', aa.toFixed(1));
    if (this._passesAA) {
      this._contrastPassFailAA.appendChild(UI.Icon.Icon.create('smallicon-checkmark-square'));
    } else {
      this._contrastPassFailAA.appendChild(UI.Icon.Icon.create('smallicon-no'));
    }

    const aaa = this._contrastInfo.contrastRatioThreshold('aaa');
    const passesAAA = this._contrastInfo.contrastRatio() >= aaa;
    this._contrastPassFailAAA.removeChildren();
    const labelAAA = this._contrastPassFailAAA.createChild('span', 'contrast-link-label');
    labelAAA.textContent = Common.UIString.UIString('AAA');
    this._contrastPassFailAAA.createChild('span').textContent = Common.UIString.UIString(': %s', aaa.toFixed(1));
    if (passesAAA) {
      this._contrastPassFailAAA.appendChild(UI.Icon.Icon.create('smallicon-checkmark-square'));
    } else {
      this._contrastPassFailAAA.appendChild(UI.Icon.Icon.create('smallicon-no'));
    }

    [labelAA, labelAAA].forEach(e => e.addEventListener('click', event => ContrastDetails._showHelp()));

    this._element.classList.toggle('contrast-fail', !this._passesAA);
    this._contrastValueBubble.classList.toggle('contrast-aa', this._passesAA);
    this._contrastValueBubble.classList.toggle('contrast-aaa', passesAAA);
  }

  static _showHelp() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(UI.UIUtils.addReferrerToURL(
        'https://developers.google.com/web/fundamentals/accessibility/accessible-styles#color_and_contrast'));
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
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _expandButtonClicked(event) {
    this._contrastValueBubble.getComponentSelection().empty();
    this._toggleExpanded();
  }

  /**
   * @param {!Event} event
   */
  _topRowClicked(event) {
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
      this._expandButton.setTitle(Common.UIString.UIString('Show less'));
      if (this._contrastUnknown) {
        this._toggleBackgroundColorPicker(true);
      }
    } else {
      this._toggleBackgroundColorPicker(false);
      this._expandButton.setGlyph('smallicon-expand-more');
      this._expandButton.setTitle(Common.UIString.UIString('Show more'));
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
   * @returns {boolean}
   */
  backgroundColorPickerEnabled() {
    return this._bgColorPickerButton.toggled();
  }

  /**
   * @param {boolean} enabled
   */

  toggleBackgroundColorPicker(enabled) {
    this._toggleBackgroundColorPicker(enabled, false);
  }

  /**
   * @param {boolean=} enabled
   * @param {boolean=} shouldTriggerEvent
   */
  _toggleBackgroundColorPicker(enabled, shouldTriggerEvent = true) {
    if (enabled === undefined) {
      enabled = !this._bgColorPickerButton.toggled();
    }
    this._bgColorPickerButton.setToggled(enabled);

    if (shouldTriggerEvent) {
      this.dispatchEventToListeners(Events.BackgroundColorPickerWillBeToggled, enabled);
    }

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setEyeDropperActive(enabled);
    if (enabled) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this._bgColorPickedBound);
    } else {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
          Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this._bgColorPickedBound);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _bgColorPicked(event) {
    const rgbColor = /** @type {!{r: number, g: number, b: number, a: number}} */ (event.data);
    const rgba = [rgbColor.r, rgbColor.g, rgbColor.b, (rgbColor.a / 2.55 | 0) / 100];
    const color = Common.Color.Color.fromRGBA(rgba);
    this._contrastInfo.setBgColor(color);
    this._toggleBackgroundColorPicker(false);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
  }
}

export const Events = {
  BackgroundColorPickerWillBeToggled: Symbol('BackgroundColorPickerWillBeToggled')
};

export class Swatch {
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
   * @param {!Common.Color.Color} fgColor
   * @param {!Common.Color.Color} bgColor
   */
  setColors(fgColor, bgColor) {
    this._textPreview.style.color = /** @type {string} */ (fgColor.asString(Common.Color.Format.RGBA));
    this._swatchInnerElement.style.backgroundColor =
        /** @type {string} */ (bgColor.asString(Common.Color.Format.RGBA));
    // Show border if the swatch is white.
    this._swatchElement.classList.toggle('swatch-inner-white', bgColor.hsla()[2] > 0.9);
  }
}
