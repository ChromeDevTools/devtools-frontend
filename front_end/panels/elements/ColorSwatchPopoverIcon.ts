// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {StylePropertiesSection} from './StylePropertiesSection.js';
import type {StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import type {StylesSidebarPane} from './StylesSidebarPane.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('panels/elements/ColorSwatchPopoverIcon.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface BezierPopoverIconParams {
  treeElement: StylePropertyTreeElement;
  swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  swatch: InlineEditor.Swatches.BezierSwatch;
}

export class BezierPopoverIcon {
  private treeElement: StylePropertyTreeElement;
  private readonly swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  private swatch: InlineEditor.Swatches.BezierSwatch;
  private readonly boundBezierChanged: (event: Common.EventTarget.EventTargetEvent<string>) => void;
  private readonly boundOnScroll: (event: Event) => void;
  private bezierEditor?: InlineEditor.BezierEditor.BezierEditor;
  private scrollerElement?: Element;
  private originalPropertyText?: string|null;

  constructor({
    treeElement,
    swatchPopoverHelper,
    swatch,
  }: BezierPopoverIconParams) {
    this.treeElement = treeElement;
    this.swatchPopoverHelper = swatchPopoverHelper;
    this.swatch = swatch;

    UI.Tooltip.Tooltip.install(this.swatch.iconElement(), i18nString(UIStrings.openCubicBezierEditor));
    this.swatch.iconElement().addEventListener('click', this.iconClick.bind(this), false);
    this.swatch.iconElement().addEventListener('mousedown', (event: Event) => event.consume(), false);

    this.boundBezierChanged = this.bezierChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
  }

  private iconClick(event: Event): void {
    event.consume(true);
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }

    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse(this.swatch.bezierText()) ||
        InlineEditor.AnimationTimingModel.LINEAR_BEZIER;
    this.bezierEditor = new InlineEditor.BezierEditor.BezierEditor(model);
    this.bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BEZIER_CHANGED, this.boundBezierChanged);
    this.swatchPopoverHelper.show(this.bezierEditor, this.swatch.iconElement(), this.onPopoverHidden.bind(this));
    this.scrollerElement = this.swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
    }

    this.originalPropertyText = this.treeElement.property.propertyText;
    this.treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this.treeElement.property, false /* forName */);
    if (uiLocation) {
      void Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  private bezierChanged(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.swatch.setBezierText(event.data);
    void this.treeElement.applyStyleText(this.treeElement.renderedPropertyText(), false);
  }

  private onScroll(_event: Event): void {
    this.swatchPopoverHelper.hide(true);
  }

  private onPopoverHidden(commitEdit: boolean): void {
    if (this.scrollerElement) {
      this.scrollerElement.removeEventListener('scroll', this.boundOnScroll, false);
    }

    if (this.bezierEditor) {
      this.bezierEditor.removeEventListener(InlineEditor.BezierEditor.Events.BEZIER_CHANGED, this.boundBezierChanged);
    }
    this.bezierEditor = undefined;

    const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || '';
    void this.treeElement.applyStyleText(propertyText, true);
    this.treeElement.parentPane().setEditingStyle(false);
    delete this.originalPropertyText;
  }
}

export const enum ColorSwatchPopoverIconEvents {
  COLOR_CHANGED = 'colorchanged',
}

export type ColorSwatchPopoverIconEventTypes = {
  [ColorSwatchPopoverIconEvents.COLOR_CHANGED]: string,
};

export class ColorSwatchPopoverIcon extends Common.ObjectWrapper.ObjectWrapper<ColorSwatchPopoverIconEventTypes> {
  private treeElement: StylePropertyTreeElement;
  private readonly swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  private swatch: InlineEditor.ColorSwatch.ColorSwatch;
  private contrastInfo: ColorPicker.ContrastInfo.ContrastInfo|null;
  private readonly boundSpectrumChanged: (event: Common.EventTarget.EventTargetEvent<string>) => void;
  private readonly boundOnScroll: (event: Event) => void;
  private spectrum?: ColorPicker.Spectrum.Spectrum;
  private scrollerElement?: Element;
  private originalPropertyText?: string|null;

  constructor(
      treeElement: StylePropertyTreeElement, swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper,
      swatch: InlineEditor.ColorSwatch.ColorSwatch) {
    super();

    this.treeElement = treeElement;
    this.swatchPopoverHelper = swatchPopoverHelper;
    this.swatch = swatch;
    this.swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, this.iconClick.bind(this));
    this.contrastInfo = null;

    this.boundSpectrumChanged = this.spectrumChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
  }

  private generateCSSVariablesPalette(): ColorPicker.Spectrum.Palette {
    const matchedStyles = this.treeElement.matchedStyles();
    const style = this.treeElement.property.ownerStyle;
    const cssVariables = matchedStyles.availableCSSVariables(style);
    const colors = [];
    const colorNames = [];
    for (const cssVariable of cssVariables) {
      if (cssVariable === this.treeElement.property.name) {
        continue;
      }
      const value = matchedStyles.computeCSSVariable(style, cssVariable);
      if (!value) {
        continue;
      }
      const color = Common.Color.parse(value.value);
      if (!color) {
        continue;
      }
      colors.push(value.value);
      colorNames.push(cssVariable);
    }
    return {title: 'CSS Variables', mutable: false, matchUserFormat: true, colors, colorNames};
  }

  setContrastInfo(contrastInfo: ColorPicker.ContrastInfo.ContrastInfo): void {
    this.contrastInfo = contrastInfo;
  }

  private iconClick(event: Event): void {
    event.consume(true);
    this.showPopover();
  }

  async toggleEyeDropper(): Promise<void> {
    await this.spectrum?.toggleColorPicker();
  }

  showPopover(): void {
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }

    const color = this.swatch.getColor();
    if (!color) {
      return;
    }

    this.spectrum = new ColorPicker.Spectrum.Spectrum(this.contrastInfo);
    this.spectrum.setColor(color);
    this.spectrum.addPalette(this.generateCSSVariablesPalette());

    this.spectrum.addEventListener(ColorPicker.Spectrum.Events.SIZE_CHANGED, this.spectrumResized, this);
    this.spectrum.addEventListener(ColorPicker.Spectrum.Events.COLOR_CHANGED, this.boundSpectrumChanged);
    this.swatchPopoverHelper.show(this.spectrum, this.swatch, this.onPopoverHidden.bind(this));
    this.scrollerElement = this.swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
    }

    this.originalPropertyText = this.treeElement.property.propertyText;
    this.treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this.treeElement.property, false /* forName */);
    if (uiLocation) {
      void Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }

    UI.Context.Context.instance().setFlavor(ColorSwatchPopoverIcon, this);
  }

  private spectrumResized(): void {
    this.swatchPopoverHelper.reposition();
  }

  private async spectrumChanged(event: Common.EventTarget.EventTargetEvent<string>): Promise<void> {
    const color = Common.Color.parse(event.data);
    if (!color) {
      return;
    }

    const colorName = this.spectrum ? this.spectrum.colorName() : undefined;
    const text =
        colorName && colorName.startsWith('--') ? `var(${colorName})` : (color.getAuthoredText() ?? color.asString());

    this.swatch.renderColor(color);
    const value = this.swatch.firstElementChild;
    if (value) {
      value.remove();
      this.swatch.createChild('span').textContent = text;
    }

    // `asString` somehow can return null.
    if (text) {
      this.dispatchEventToListeners(ColorSwatchPopoverIconEvents.COLOR_CHANGED, text);
    }
  }

  private onScroll(_event: Event): void {
    this.swatchPopoverHelper.hide(true);
  }

  private onPopoverHidden(commitEdit: boolean): void {
    if (this.scrollerElement) {
      this.scrollerElement.removeEventListener('scroll', this.boundOnScroll, false);
    }

    if (this.spectrum) {
      this.spectrum.removeEventListener(ColorPicker.Spectrum.Events.COLOR_CHANGED, this.boundSpectrumChanged);
    }
    this.spectrum = undefined;

    const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || '';
    void this.treeElement.applyStyleText(propertyText, true);
    this.treeElement.parentPane().setEditingStyle(false);
    delete this.originalPropertyText;

    UI.Context.Context.instance().setFlavor(ColorSwatchPopoverIcon, null);
  }
}

export const enum ShadowEvents {
  SHADOW_CHANGED = 'shadowChanged',
}

export interface ShadowEventTypes {
  [ShadowEvents.SHADOW_CHANGED]: InlineEditor.CSSShadowEditor.CSSShadowModel;
}

export class ShadowSwatchPopoverHelper extends Common.ObjectWrapper.ObjectWrapper<ShadowEventTypes> {
  private treeElement: StylePropertyTreeElement;
  private readonly swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  private readonly shadowSwatch: InlineEditor.Swatches.CSSShadowSwatch;
  private iconElement: HTMLSpanElement;
  private readonly boundShadowChanged:
      (event: Common.EventTarget.EventTargetEvent<InlineEditor.CSSShadowEditor.CSSShadowModel>) => void;
  private readonly boundOnScroll: (event: Event) => void;
  private cssShadowEditor?: InlineEditor.CSSShadowEditor.CSSShadowEditor;
  private scrollerElement?: Element;
  private originalPropertyText?: string|null;
  constructor(
      treeElement: StylePropertyTreeElement, swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper,
      shadowSwatch: InlineEditor.Swatches.CSSShadowSwatch) {
    super();
    this.treeElement = treeElement;
    this.swatchPopoverHelper = swatchPopoverHelper;
    this.shadowSwatch = shadowSwatch;
    this.iconElement = shadowSwatch.iconElement();

    UI.Tooltip.Tooltip.install(this.iconElement, i18nString(UIStrings.openShadowEditor));
    this.iconElement.addEventListener('click', this.iconClick.bind(this), false);
    this.iconElement.addEventListener('mousedown', event => event.consume(), false);

    this.boundShadowChanged = this.shadowChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
  }

  private iconClick(event: Event): void {
    event.consume(true);
    this.showPopover();
  }

  showPopover(): void {
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }

    this.cssShadowEditor = new InlineEditor.CSSShadowEditor.CSSShadowEditor();
    this.cssShadowEditor.setModel(this.shadowSwatch.model());
    this.cssShadowEditor.addEventListener(InlineEditor.CSSShadowEditor.Events.SHADOW_CHANGED, this.boundShadowChanged);
    this.swatchPopoverHelper.show(this.cssShadowEditor, this.iconElement, this.onPopoverHidden.bind(this));
    this.scrollerElement = this.iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
    }

    this.originalPropertyText = this.treeElement.property.propertyText;
    this.treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this.treeElement.property, false /* forName */);
    if (uiLocation) {
      void Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  private shadowChanged(event: Common.EventTarget.EventTargetEvent<InlineEditor.CSSShadowEditor.CSSShadowModel>): void {
    this.dispatchEventToListeners(ShadowEvents.SHADOW_CHANGED, event.data);
  }

  private onScroll(_event: Event): void {
    this.swatchPopoverHelper.hide(true);
  }

  private onPopoverHidden(commitEdit: boolean): void {
    if (this.scrollerElement) {
      this.scrollerElement.removeEventListener('scroll', this.boundOnScroll, false);
    }

    if (this.cssShadowEditor) {
      this.cssShadowEditor.removeEventListener(
          InlineEditor.CSSShadowEditor.Events.SHADOW_CHANGED, this.boundShadowChanged);
    }
    this.cssShadowEditor = undefined;

    const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || '';
    void this.treeElement.applyStyleText(propertyText, true);
    this.treeElement.parentPane().setEditingStyle(false);
    delete this.originalPropertyText;
  }
}

export class FontEditorSectionManager {
  private readonly treeElementMap: Map<string, StylePropertyTreeElement>;
  private readonly swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  private readonly section: StylePropertiesSection;
  private parentPane: StylesSidebarPane|null;
  private fontEditor: InlineEditor.FontEditor.FontEditor|null;
  private scrollerElement: Element|null;
  private readonly boundFontChanged:
      (event: Common.EventTarget.EventTargetEvent<InlineEditor.FontEditor.FontChangedEvent>) => void;
  private readonly boundOnScroll: () => void;
  private readonly boundResized: () => void;
  constructor(
      swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper, section: StylePropertiesSection) {
    this.treeElementMap = new Map();

    this.swatchPopoverHelper = swatchPopoverHelper;

    this.section = section;

    this.parentPane = null;

    this.fontEditor = null;

    this.scrollerElement = null;

    this.boundFontChanged = this.fontChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
    this.boundResized = this.fontEditorResized.bind(this);
  }

  private fontChanged(event: Common.EventTarget.EventTargetEvent<InlineEditor.FontEditor.FontChangedEvent>): void {
    const {propertyName, value} = event.data;
    const treeElement = this.treeElementMap.get(propertyName);
    void this.updateFontProperty(propertyName, value, treeElement);
  }

  private async updateFontProperty(propertyName: string, value: string, treeElement?: StylePropertyTreeElement):
      Promise<void> {
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
        this.fixIndex(treeElement.property.index);
      }
      this.treeElementMap.set(propertyName, treeElement);
      await treeElement.applyStyleText(styleText, true);
      if (elementRemoved) {
        this.treeElementMap.delete(propertyName);
      }
    } else if (value.length) {
      const newProperty = this.section.addNewBlankProperty();
      if (newProperty) {
        newProperty.property.name = propertyName;
        newProperty.property.value = value;
        newProperty.updateTitle();
        await newProperty.applyStyleText(newProperty.renderedPropertyText(), true);
        this.treeElementMap.set(newProperty.property.name, newProperty);
      }
    }
    this.section.onpopulate();
    this.swatchPopoverHelper.reposition();
    return;
  }

  private fontEditorResized(): void {
    this.swatchPopoverHelper.reposition();
  }

  private fixIndex(removedIndex: number): void {
    for (const treeElement of this.treeElementMap.values()) {
      if (treeElement.property.index > removedIndex) {
        treeElement.property.index -= 1;
      }
    }
  }

  private createPropertyValueMap(): Map<string, string> {
    const propertyMap = new Map<string, string>();
    for (const fontProperty of this.treeElementMap) {
      const propertyName = (fontProperty[0] as string);
      const treeElement = fontProperty[1];
      if (treeElement.property.value.length) {
        propertyMap.set(propertyName, treeElement.property.value);
      } else {
        this.treeElementMap.delete(propertyName);
      }
    }
    return propertyMap;
  }

  registerFontProperty(treeElement: StylePropertyTreeElement): void {
    const propertyName = treeElement.property.name;
    if (this.treeElementMap.has(propertyName)) {
      const treeElementFromMap = this.treeElementMap.get(propertyName);
      if (!treeElement.overloaded() || (treeElementFromMap && treeElementFromMap.overloaded())) {
        this.treeElementMap.set(propertyName, treeElement);
      }
    } else {
      this.treeElementMap.set(propertyName, treeElement);
    }
  }

  async showPopover(iconElement: Element, parentPane: StylesSidebarPane): Promise<void> {
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }
    this.parentPane = parentPane;
    const propertyValueMap = this.createPropertyValueMap();
    this.fontEditor = new InlineEditor.FontEditor.FontEditor(propertyValueMap);
    this.fontEditor.addEventListener(InlineEditor.FontEditor.Events.FONT_CHANGED, this.boundFontChanged);
    this.fontEditor.addEventListener(InlineEditor.FontEditor.Events.FONT_EDITOR_RESIZED, this.boundResized);
    this.swatchPopoverHelper.show(this.fontEditor, iconElement, this.onPopoverHidden.bind(this));
    this.scrollerElement = iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
    }

    this.parentPane.setEditingStyle(true);
  }

  private onScroll(): void {
    this.swatchPopoverHelper.hide(true);
  }

  private onPopoverHidden(): void {
    if (this.scrollerElement) {
      this.scrollerElement.removeEventListener('scroll', this.boundOnScroll, false);
    }
    this.section.onpopulate();
    if (this.fontEditor) {
      this.fontEditor.removeEventListener(InlineEditor.FontEditor.Events.FONT_CHANGED, this.boundFontChanged);
    }
    this.fontEditor = null;
    if (this.parentPane) {
      this.parentPane.setEditingStyle(false);
    }
    this.section.resetToolbars();
    this.section.onpopulate();
  }
}
