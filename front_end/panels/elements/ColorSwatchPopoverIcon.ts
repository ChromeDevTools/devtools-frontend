// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type {Icon} from '../../ui/kit/kit.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {StylePropertyTreeElement} from './StylePropertyTreeElement.js';

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/ColorSwatchPopoverIcon.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface BezierPopoverIconParams {
  treeElement: StylePropertyTreeElement;
  swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  swatch: Icon;
  bezierText: HTMLElement;
}

export class BezierPopoverIcon {
  private treeElement: StylePropertyTreeElement;
  private readonly swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  private readonly swatch: Icon;
  private readonly bezierText: HTMLElement;
  private readonly boundBezierChanged: (event: Common.EventTarget.EventTargetEvent<string>) => void;
  private readonly boundOnScroll: (event: Event) => void;
  private bezierEditor?: InlineEditor.BezierEditor.BezierEditor;
  private scrollerElement?: Element;
  private originalPropertyText?: string|null;

  constructor({
    treeElement,
    swatchPopoverHelper,
    swatch,
    bezierText,
  }: BezierPopoverIconParams) {
    this.treeElement = treeElement;
    this.swatchPopoverHelper = swatchPopoverHelper;
    this.swatch = swatch;
    this.bezierText = bezierText;

    UI.Tooltip.Tooltip.install(this.swatch, i18nString(UIStrings.openCubicBezierEditor));
    this.swatch.addEventListener('click', this.iconClick.bind(this), false);
    this.swatch.addEventListener('keydown', this.iconClick.bind(this), false);
    this.swatch.addEventListener('mousedown', (event: Event) => event.consume(), false);

    this.boundBezierChanged = this.bezierChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
  }

  private iconClick(event: MouseEvent|KeyboardEvent): void {
    if (event instanceof KeyboardEvent && !Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      return;
    }
    event.consume(true);
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }

    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse(this.bezierText.innerText) ||
        InlineEditor.AnimationTimingModel.LINEAR_BEZIER;
    this.bezierEditor = new InlineEditor.BezierEditor.BezierEditor(model);
    this.bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BEZIER_CHANGED, this.boundBezierChanged);
    this.swatchPopoverHelper.show(this.bezierEditor, this.swatch, this.onPopoverHidden.bind(this));
    this.scrollerElement = this.swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
    }

    this.originalPropertyText = this.treeElement.property.propertyText;
    this.treeElement.stylesContainer().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
        this.treeElement.property, false /* forName */);
    if (uiLocation) {
      void Common.Revealer.reveal(uiLocation, true /* omitFocus */);
    }
  }

  private bezierChanged(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.bezierText.textContent = event.data;
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
    this.treeElement.stylesContainer().setEditingStyle(false);
    delete this.originalPropertyText;
  }
}

export const enum ColorSwatchPopoverIconEvents {
  COLOR_CHANGED = 'colorchanged',
}

export interface ColorSwatchPopoverIconEventTypes {
  [ColorSwatchPopoverIconEvents.COLOR_CHANGED]: Common.Color.Color;
}

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

    const color = this.swatch.color;
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
    this.treeElement.stylesContainer().setEditingStyle(true);
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
    const getColor = (colorText: string): Common.Color.Color|null => {
      const color = Common.Color.parse(colorText);
      const customProperty = this.spectrum?.colorName()?.startsWith('--') && `var(${this.spectrum.colorName()})`;
      if (!color || !customProperty) {
        return color;
      }
      if (color.is(Common.Color.Format.HEX) || color.is(Common.Color.Format.HEXA) ||
          color.is(Common.Color.Format.RGB) || color.is(Common.Color.Format.RGBA)) {
        return new Common.Color.Legacy(color.rgba(), color.format(), customProperty);
      }
      if (color.is(Common.Color.Format.HSL)) {
        return new Common.Color.HSL(color.h, color.s, color.l, color.alpha, customProperty);
      }
      if (color.is(Common.Color.Format.HWB)) {
        return new Common.Color.HWB(color.h, color.w, color.b, color.alpha, customProperty);
      }
      if (color.is(Common.Color.Format.LCH)) {
        return new Common.Color.LCH(color.l, color.c, color.h, color.alpha, customProperty);
      }
      if (color.is(Common.Color.Format.OKLCH)) {
        return new Common.Color.Oklch(color.l, color.c, color.h, color.alpha, customProperty);
      }
      if (color.is(Common.Color.Format.LAB)) {
        return new Common.Color.Lab(color.l, color.a, color.b, color.alpha, customProperty);
      }
      if (color.is(Common.Color.Format.OKLAB)) {
        return new Common.Color.Oklab(color.l, color.a, color.b, color.alpha, customProperty);
      }
      if (color.is(Common.Color.Format.SRGB) || color.is(Common.Color.Format.SRGB_LINEAR) ||
          color.is(Common.Color.Format.DISPLAY_P3) || color.is(Common.Color.Format.A98_RGB) ||
          color.is(Common.Color.Format.PROPHOTO_RGB) || color.is(Common.Color.Format.REC_2020) ||
          color.is(Common.Color.Format.XYZ) || color.is(Common.Color.Format.XYZ_D50) ||
          color.is(Common.Color.Format.XYZ_D65)) {
        return new Common.Color.ColorFunction(
            color.colorSpace, color.p0, color.p1, color.p2, color.alpha, customProperty);
      }
      throw new Error(`Forgot to handle color format ${color.format()}`);
    };

    const color = getColor(event.data);
    if (!color) {
      return;
    }

    this.swatch.renderColor(color);
    this.dispatchEventToListeners(ColorSwatchPopoverIconEvents.COLOR_CHANGED, color);
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
    this.treeElement.stylesContainer().setEditingStyle(false);
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
    this.iconElement.addEventListener('keydown', this.keyDown.bind(this), false);
    this.iconElement.addEventListener('mousedown', event => event.consume(), false);

    this.boundShadowChanged = this.shadowChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
  }

  private keyDown(event: KeyboardEvent): void {
    if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      event.consume(true);
      this.showPopover();
    }
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
    this.cssShadowEditor.element.classList.toggle('with-padding', true);
    this.cssShadowEditor.setModel(this.shadowSwatch.model());
    this.cssShadowEditor.addEventListener(InlineEditor.CSSShadowEditor.Events.SHADOW_CHANGED, this.boundShadowChanged);
    this.swatchPopoverHelper.show(this.cssShadowEditor, this.iconElement, this.onPopoverHidden.bind(this));
    this.scrollerElement = this.iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
    }

    this.originalPropertyText = this.treeElement.property.propertyText;
    this.treeElement.stylesContainer().setEditingStyle(true);
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
    this.treeElement.stylesContainer().setEditingStyle(false);
    delete this.originalPropertyText;
  }
}
