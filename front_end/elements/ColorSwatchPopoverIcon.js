// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as ColorPicker from '../color_picker/color_picker.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as InlineEditor from '../inline_editor/inline_editor.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';            // eslint-disable-line no-unused-vars
import {StylePropertiesSection, StylesSidebarPane} from './StylesSidebarPane.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  * @description Tooltip text for an icon that opens the cubic bezier editor, which is a tool that
  * allows the user to edit cubic-bezier CSS properties directly.
  */
  openCubicBezierEditor: 'Open cubic bezier editor',
  /**
  * @description Tooltip text for an icon that opens shadow editor. The shadow editor is a tool
  * which allows the user to edit CSS shadow properties.
  */
  openShadowEditor: 'Open shadow editor',
};
const str_ = i18n.i18n.registerUIStrings('elements/ColorSwatchPopoverIcon.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BezierPopoverIcon {
  /**
   * @param {!StylePropertyTreeElement} treeElement
   * @param {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper} swatchPopoverHelper
   * @param {!InlineEditor.Swatches.BezierSwatch} swatch
   */
  constructor(treeElement, swatchPopoverHelper, swatch) {
    this._treeElement = treeElement;
    this._swatchPopoverHelper = swatchPopoverHelper;
    this._swatch = swatch;

    UI.Tooltip.Tooltip.install(this._swatch.iconElement(), i18nString(UIStrings.openCubicBezierEditor));
    this._swatch.iconElement().addEventListener('click', this._iconClick.bind(this), false);
    this._swatch.iconElement().addEventListener(
        'mousedown', /** @param {!Event} event */ event => event.consume(), false);

    this._boundBezierChanged = this._bezierChanged.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
  }

  /**
   * @param {!Event} event
   */
  _iconClick(event) {
    if (Root.Runtime.experiments.isEnabled('fontEditor')) {
      Host.userMetrics.cssEditorOpened('bezierEditor');
    }
    event.consume(true);
    if (this._swatchPopoverHelper.isShowing()) {
      this._swatchPopoverHelper.hide(true);
      return;
    }

    const cubicBezier = UI.Geometry.CubicBezier.parse(this._swatch.bezierText()) ||
        /** @type {!UI.Geometry.CubicBezier} */ (UI.Geometry.CubicBezier.parse('linear'));
    this._bezierEditor = new InlineEditor.BezierEditor.BezierEditor(cubicBezier);
    this._bezierEditor.setBezier(cubicBezier);
    this._bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BezierChanged, this._boundBezierChanged);
    this._swatchPopoverHelper.show(this._bezierEditor, this._swatch.iconElement(), this._onPopoverHidden.bind(this));
    this._scrollerElement = this._swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this._scrollerElement) {
      this._scrollerElement.addEventListener('scroll', this._boundOnScroll, false);
    }

    this._originalPropertyText = this._treeElement.property.propertyText;
    this._treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this._treeElement.property, false /* forName */);
    if (uiLocation) {
      Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _bezierChanged(event) {
    this._swatch.setBezierText(/** @type {string} */ (event.data));
    this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(), false);
  }

  /**
   * @param {!Event} event
   */
  _onScroll(event) {
    this._swatchPopoverHelper.hide(true);
  }

  /**
   * @param {boolean} commitEdit
   */
  _onPopoverHidden(commitEdit) {
    if (this._scrollerElement) {
      this._scrollerElement.removeEventListener('scroll', this._boundOnScroll, false);
    }

    if (this._bezierEditor) {
      this._bezierEditor.removeEventListener(InlineEditor.BezierEditor.Events.BezierChanged, this._boundBezierChanged);
    }
    this._bezierEditor = undefined;

    const propertyText = commitEdit ? this._treeElement.renderedPropertyText() : this._originalPropertyText || '';
    this._treeElement.applyStyleText(propertyText, true);
    this._treeElement.parentPane().setEditingStyle(false);
    delete this._originalPropertyText;
  }
}

export class ColorSwatchPopoverIcon {
  /**
   * @param {!StylePropertyTreeElement} treeElement
   * @param {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper} swatchPopoverHelper
   * @param {!InlineEditor.ColorSwatch.ColorSwatch} swatch
   */
  constructor(treeElement, swatchPopoverHelper, swatch) {
    this._treeElement = treeElement;
    this._swatchPopoverHelper = swatchPopoverHelper;
    this._swatch = swatch;
    this._swatch.addEventListener('swatch-click', this._iconClick.bind(this));
    this._contrastInfo = null;

    this._boundSpectrumChanged = this._spectrumChanged.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
  }

  /**
   * @return {!ColorPicker.Spectrum.Palette}
   */
  _generateCSSVariablesPalette() {
    const matchedStyles = this._treeElement.matchedStyles();
    const style = this._treeElement.property.ownerStyle;
    const cssVariables = matchedStyles.availableCSSVariables(style);
    const colors = [];
    const colorNames = [];
    for (const cssVariable of cssVariables) {
      if (cssVariable === this._treeElement.property.name) {
        continue;
      }
      const value = matchedStyles.computeCSSVariable(style, cssVariable);
      if (!value) {
        continue;
      }
      const color = Common.Color.Color.parse(value);
      if (!color) {
        continue;
      }
      colors.push(value);
      colorNames.push(cssVariable);
    }
    return {title: 'CSS Variables', mutable: false, matchUserFormat: true, colors: colors, colorNames: colorNames};
  }

  /**
   * @param {!ColorPicker.ContrastInfo.ContrastInfo} contrastInfo
   */
  setContrastInfo(contrastInfo) {
    this._contrastInfo = contrastInfo;
  }

  /**
   * @param {!Event} event
   */
  _iconClick(event) {
    if (Root.Runtime.experiments.isEnabled('fontEditor')) {
      Host.userMetrics.cssEditorOpened('colorPicker');
    }
    event.consume(true);
    this.showPopover();
  }

  showPopover() {
    if (this._swatchPopoverHelper.isShowing()) {
      this._swatchPopoverHelper.hide(true);
      return;
    }

    const color = this._swatch.getColor();
    let format = this._swatch.getFormat();
    if (!color || !format) {
      return;
    }

    if (format === Common.Color.Format.Original) {
      format = color.format();
    }
    this._spectrum = new ColorPicker.Spectrum.Spectrum(this._contrastInfo);
    this._spectrum.setColor(color, format);
    this._spectrum.addPalette(this._generateCSSVariablesPalette());

    this._spectrum.addEventListener(ColorPicker.Spectrum.Events.SizeChanged, this._spectrumResized, this);
    this._spectrum.addEventListener(ColorPicker.Spectrum.Events.ColorChanged, this._boundSpectrumChanged);
    this._swatchPopoverHelper.show(this._spectrum, this._swatch, this._onPopoverHidden.bind(this));
    this._scrollerElement = this._swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this._scrollerElement) {
      this._scrollerElement.addEventListener('scroll', this._boundOnScroll, false);
    }

    this._originalPropertyText = this._treeElement.property.propertyText;
    this._treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this._treeElement.property, false /* forName */);
    if (uiLocation) {
      Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _spectrumResized(event) {
    this._swatchPopoverHelper.reposition();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _spectrumChanged(event) {
    const color = Common.Color.Color.parse(/** @type {string} */ (event.data));
    if (!color) {
      return;
    }

    const colorName = this._spectrum ? this._spectrum.colorName() : undefined;
    const text = colorName && colorName.startsWith('--') ? `var(${colorName})` : color.asString();

    this._swatch.renderColor(color);
    const value = this._swatch.firstElementChild;
    if (value) {
      value.remove();
      this._swatch.createChild('span').textContent = text;
    }

    this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(), false);
  }

  /**
   * @param {!Event} event
   */
  _onScroll(event) {
    this._swatchPopoverHelper.hide(true);
  }

  /**
   * @param {boolean} commitEdit
   */
  _onPopoverHidden(commitEdit) {
    if (this._scrollerElement) {
      this._scrollerElement.removeEventListener('scroll', this._boundOnScroll, false);
    }

    if (this._spectrum) {
      this._spectrum.removeEventListener(ColorPicker.Spectrum.Events.ColorChanged, this._boundSpectrumChanged);
    }
    this._spectrum = undefined;

    const propertyText = commitEdit ? this._treeElement.renderedPropertyText() : this._originalPropertyText || '';
    this._treeElement.applyStyleText(propertyText, true);
    this._treeElement.parentPane().setEditingStyle(false);
    delete this._originalPropertyText;
  }
}

export class ShadowSwatchPopoverHelper {
  /**
   * @param {!StylePropertyTreeElement} treeElement
   * @param {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper} swatchPopoverHelper
   * @param {!InlineEditor.Swatches.CSSShadowSwatch} shadowSwatch
   */
  constructor(treeElement, swatchPopoverHelper, shadowSwatch) {
    this._treeElement = treeElement;
    this._swatchPopoverHelper = swatchPopoverHelper;
    this._shadowSwatch = shadowSwatch;
    this._iconElement = shadowSwatch.iconElement();

    UI.Tooltip.Tooltip.install(this._iconElement, i18nString(UIStrings.openShadowEditor));
    this._iconElement.addEventListener('click', this._iconClick.bind(this), false);
    this._iconElement.addEventListener('mousedown', event => event.consume(), false);

    this._boundShadowChanged = this._shadowChanged.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
  }

  /**
   * @param {!Event} event
   */
  _iconClick(event) {
    if (Root.Runtime.experiments.isEnabled('fontEditor')) {
      Host.userMetrics.cssEditorOpened('shadowEditor');
    }
    event.consume(true);
    this.showPopover();
  }

  showPopover() {
    if (this._swatchPopoverHelper.isShowing()) {
      this._swatchPopoverHelper.hide(true);
      return;
    }

    this._cssShadowEditor = new InlineEditor.CSSShadowEditor.CSSShadowEditor();
    this._cssShadowEditor.setModel(this._shadowSwatch.model());
    this._cssShadowEditor.addEventListener(InlineEditor.CSSShadowEditor.Events.ShadowChanged, this._boundShadowChanged);
    this._swatchPopoverHelper.show(this._cssShadowEditor, this._iconElement, this._onPopoverHidden.bind(this));
    this._scrollerElement = this._iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this._scrollerElement) {
      this._scrollerElement.addEventListener('scroll', this._boundOnScroll, false);
    }

    this._originalPropertyText = this._treeElement.property.propertyText;
    this._treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this._treeElement.property, false /* forName */);
    if (uiLocation) {
      Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _shadowChanged(event) {
    this._shadowSwatch.setCSSShadow(/** @type {!InlineEditor.CSSShadowModel.CSSShadowModel} */ (event.data));
    this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(), false);
  }

  /**
   * @param {!Event} event
   */
  _onScroll(event) {
    this._swatchPopoverHelper.hide(true);
  }

  /**
   * @param {boolean} commitEdit
   */
  _onPopoverHidden(commitEdit) {
    if (this._scrollerElement) {
      this._scrollerElement.removeEventListener('scroll', this._boundOnScroll, false);
    }

    if (this._cssShadowEditor) {
      this._cssShadowEditor.removeEventListener(
          InlineEditor.CSSShadowEditor.Events.ShadowChanged, this._boundShadowChanged);
    }
    this._cssShadowEditor = undefined;

    const propertyText = commitEdit ? this._treeElement.renderedPropertyText() : this._originalPropertyText || '';
    this._treeElement.applyStyleText(propertyText, true);
    this._treeElement.parentPane().setEditingStyle(false);
    delete this._originalPropertyText;
  }
}

export class FontEditorSectionManager {
  /**
   * @param {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper} swatchPopoverHelper
   * @param {!StylePropertiesSection} section
   */
  constructor(swatchPopoverHelper, section) {
    /** @type {!Map<string, !StylePropertyTreeElement>} */
    this._treeElementMap = new Map();

    /** @type {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper} */
    this._swatchPopoverHelper = swatchPopoverHelper;

    /** @type {!StylePropertiesSection} */
    this._section = section;

    /** @type {?StylesSidebarPane} */
    this._parentPane = null;

    /** @type {?InlineEditor.FontEditor.FontEditor} */
    this._fontEditor = null;

    /** @type {?Element} */
    this._scrollerElement = null;

    this._boundFontChanged = this._fontChanged.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
    this._boundResized = this._fontEditorResized.bind(this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _fontChanged(event) {
    const {propertyName, value} = event.data;
    const treeElement = this._treeElementMap.get(propertyName);
    this._updateFontProperty(propertyName, value, treeElement);
  }

  /**
   * @param {string} propertyName
   * @param {string} value
   * @param {!StylePropertyTreeElement=} treeElement
   */
  async _updateFontProperty(propertyName, value, treeElement) {
    if (treeElement && treeElement.treeOutline && treeElement.valueElement && treeElement.property.parsedOk &&
        treeElement.property.range) {
      let elementRemoved = false;
      treeElement.valueElement.textContent = value;
      treeElement.property.value = value;
      let styleText;
      const propertyName = treeElement.property.name;
      if (value.length) {
        styleText = treeElement.renderedPropertyText();
      } else {
        styleText = '';
        elementRemoved = true;
        this._fixIndex(treeElement.property.index);
      }
      this._treeElementMap.set(propertyName, treeElement);
      await treeElement.applyStyleText(styleText, true);
      if (elementRemoved) {
        this._treeElementMap.delete(propertyName);
      }
    } else if (value.length) {
      const newProperty = this._section.addNewBlankProperty();
      if (newProperty) {
        newProperty.property.name = propertyName;
        newProperty.property.value = value;
        newProperty.updateTitle();
        await newProperty.applyStyleText(newProperty.renderedPropertyText(), true);
        this._treeElementMap.set(newProperty.property.name, newProperty);
      }
    }
    this._section.onpopulate();
    this._swatchPopoverHelper.reposition();
    return;
  }

  _fontEditorResized() {
    this._swatchPopoverHelper.reposition();
  }

  /**
   * @param {number} removedIndex
   */
  _fixIndex(removedIndex) {
    for (const treeElement of this._treeElementMap.values()) {
      if (treeElement.property.index > removedIndex) {
        treeElement.property.index -= 1;
      }
    }
  }

  /**
   * @return {!Map<string, string>}
   */
  _createPropertyValueMap() {
    const propertyMap = new Map();
    for (const fontProperty of this._treeElementMap) {
      const propertyName = /** @type {string} */ (fontProperty[0]);
      const treeElement = fontProperty[1];
      if (treeElement.property.value.length) {
        propertyMap.set(propertyName, treeElement.property.value);
      } else {
        this._treeElementMap.delete(propertyName);
      }
    }
    return propertyMap;
  }

  /**
   * @param {!StylePropertyTreeElement} treeElement
   */
  registerFontProperty(treeElement) {
    const propertyName = treeElement.property.name;
    if (this._treeElementMap.has(propertyName)) {
      const treeElementFromMap = this._treeElementMap.get(propertyName);
      if (!treeElement.overloaded() || (treeElementFromMap && treeElementFromMap.overloaded())) {
        this._treeElementMap.set(propertyName, treeElement);
      }
    } else {
      this._treeElementMap.set(propertyName, treeElement);
    }
  }

  /**
   * @param {!Element} iconElement
   * @param {!StylesSidebarPane} parentPane
   */
  async showPopover(iconElement, parentPane) {
    if (this._swatchPopoverHelper.isShowing()) {
      this._swatchPopoverHelper.hide(true);
      return;
    }
    this._parentPane = parentPane;
    const propertyValueMap = this._createPropertyValueMap();
    this._fontEditor = new InlineEditor.FontEditor.FontEditor(propertyValueMap);
    this._fontEditor.addEventListener(InlineEditor.FontEditor.Events.FontChanged, this._boundFontChanged);
    this._fontEditor.addEventListener(InlineEditor.FontEditor.Events.FontEditorResized, this._boundResized);
    this._swatchPopoverHelper.show(this._fontEditor, iconElement, this._onPopoverHidden.bind(this));
    this._scrollerElement = iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this._scrollerElement) {
      this._scrollerElement.addEventListener('scroll', this._boundOnScroll, false);
    }

    this._parentPane.setEditingStyle(true);
  }

  _onScroll() {
    this._swatchPopoverHelper.hide(true);
  }

  _onPopoverHidden() {
    if (this._scrollerElement) {
      this._scrollerElement.removeEventListener('scroll', this._boundOnScroll, false);
    }
    this._section.onpopulate();
    if (this._fontEditor) {
      this._fontEditor.removeEventListener(InlineEditor.FontEditor.Events.FontChanged, this._boundFontChanged);
    }
    this._fontEditor = null;
    if (this._parentPane) {
      this._parentPane.setEditingStyle(false);
    }
    this._section.resetToolbars();
    this._section.onpopulate();
  }
}

FontEditorSectionManager._treeElementSymbol = Symbol('FontEditorSectionManager._treeElementSymbol');
