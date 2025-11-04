// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
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
export class BezierPopoverIcon {
    treeElement;
    swatchPopoverHelper;
    swatch;
    bezierText;
    boundBezierChanged;
    boundOnScroll;
    bezierEditor;
    scrollerElement;
    originalPropertyText;
    constructor({ treeElement, swatchPopoverHelper, swatch, bezierText, }) {
        this.treeElement = treeElement;
        this.swatchPopoverHelper = swatchPopoverHelper;
        this.swatch = swatch;
        this.bezierText = bezierText;
        UI.Tooltip.Tooltip.install(this.swatch, i18nString(UIStrings.openCubicBezierEditor));
        this.swatch.addEventListener('click', this.iconClick.bind(this), false);
        this.swatch.addEventListener('keydown', this.iconClick.bind(this), false);
        this.swatch.addEventListener('mousedown', (event) => event.consume(), false);
        this.boundBezierChanged = this.bezierChanged.bind(this);
        this.boundOnScroll = this.onScroll.bind(this);
    }
    iconClick(event) {
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
        this.bezierEditor.addEventListener("BezierChanged" /* InlineEditor.BezierEditor.Events.BEZIER_CHANGED */, this.boundBezierChanged);
        this.swatchPopoverHelper.show(this.bezierEditor, this.swatch, this.onPopoverHidden.bind(this));
        this.scrollerElement = this.swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
        if (this.scrollerElement) {
            this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
        }
        this.originalPropertyText = this.treeElement.property.propertyText;
        this.treeElement.parentPane().setEditingStyle(true);
        const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(this.treeElement.property, false /* forName */);
        if (uiLocation) {
            void Common.Revealer.reveal(uiLocation, true /* omitFocus */);
        }
    }
    bezierChanged(event) {
        this.bezierText.textContent = event.data;
        void this.treeElement.applyStyleText(this.treeElement.renderedPropertyText(), false);
    }
    onScroll(_event) {
        this.swatchPopoverHelper.hide(true);
    }
    onPopoverHidden(commitEdit) {
        if (this.scrollerElement) {
            this.scrollerElement.removeEventListener('scroll', this.boundOnScroll, false);
        }
        if (this.bezierEditor) {
            this.bezierEditor.removeEventListener("BezierChanged" /* InlineEditor.BezierEditor.Events.BEZIER_CHANGED */, this.boundBezierChanged);
        }
        this.bezierEditor = undefined;
        const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || '';
        void this.treeElement.applyStyleText(propertyText, true);
        this.treeElement.parentPane().setEditingStyle(false);
        delete this.originalPropertyText;
    }
}
export class ColorSwatchPopoverIcon extends Common.ObjectWrapper.ObjectWrapper {
    treeElement;
    swatchPopoverHelper;
    swatch;
    contrastInfo;
    boundSpectrumChanged;
    boundOnScroll;
    spectrum;
    scrollerElement;
    originalPropertyText;
    constructor(treeElement, swatchPopoverHelper, swatch) {
        super();
        this.treeElement = treeElement;
        this.swatchPopoverHelper = swatchPopoverHelper;
        this.swatch = swatch;
        this.swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, this.iconClick.bind(this));
        this.contrastInfo = null;
        this.boundSpectrumChanged = this.spectrumChanged.bind(this);
        this.boundOnScroll = this.onScroll.bind(this);
    }
    generateCSSVariablesPalette() {
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
        return { title: 'CSS Variables', mutable: false, matchUserFormat: true, colors, colorNames };
    }
    setContrastInfo(contrastInfo) {
        this.contrastInfo = contrastInfo;
    }
    iconClick(event) {
        event.consume(true);
        this.showPopover();
    }
    async toggleEyeDropper() {
        await this.spectrum?.toggleColorPicker();
    }
    showPopover() {
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
        this.spectrum.addEventListener("SizeChanged" /* ColorPicker.Spectrum.Events.SIZE_CHANGED */, this.spectrumResized, this);
        this.spectrum.addEventListener("ColorChanged" /* ColorPicker.Spectrum.Events.COLOR_CHANGED */, this.boundSpectrumChanged);
        this.swatchPopoverHelper.show(this.spectrum, this.swatch, this.onPopoverHidden.bind(this));
        this.scrollerElement = this.swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');
        if (this.scrollerElement) {
            this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
        }
        this.originalPropertyText = this.treeElement.property.propertyText;
        this.treeElement.parentPane().setEditingStyle(true);
        const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(this.treeElement.property, false /* forName */);
        if (uiLocation) {
            void Common.Revealer.reveal(uiLocation, true /* omitFocus */);
        }
        UI.Context.Context.instance().setFlavor(ColorSwatchPopoverIcon, this);
    }
    spectrumResized() {
        this.swatchPopoverHelper.reposition();
    }
    async spectrumChanged(event) {
        const getColor = (colorText) => {
            const color = Common.Color.parse(colorText);
            const customProperty = this.spectrum?.colorName()?.startsWith('--') && `var(${this.spectrum.colorName()})`;
            if (!color || !customProperty) {
                return color;
            }
            if (color.is("hex" /* Common.Color.Format.HEX */) || color.is("hexa" /* Common.Color.Format.HEXA */) ||
                color.is("rgb" /* Common.Color.Format.RGB */) || color.is("rgba" /* Common.Color.Format.RGBA */)) {
                return new Common.Color.Legacy(color.rgba(), color.format(), customProperty);
            }
            if (color.is("hsl" /* Common.Color.Format.HSL */)) {
                return new Common.Color.HSL(color.h, color.s, color.l, color.alpha, customProperty);
            }
            if (color.is("hwb" /* Common.Color.Format.HWB */)) {
                return new Common.Color.HWB(color.h, color.w, color.b, color.alpha, customProperty);
            }
            if (color.is("lch" /* Common.Color.Format.LCH */)) {
                return new Common.Color.LCH(color.l, color.c, color.h, color.alpha, customProperty);
            }
            if (color.is("oklch" /* Common.Color.Format.OKLCH */)) {
                return new Common.Color.Oklch(color.l, color.c, color.h, color.alpha, customProperty);
            }
            if (color.is("lab" /* Common.Color.Format.LAB */)) {
                return new Common.Color.Lab(color.l, color.a, color.b, color.alpha, customProperty);
            }
            if (color.is("oklab" /* Common.Color.Format.OKLAB */)) {
                return new Common.Color.Oklab(color.l, color.a, color.b, color.alpha, customProperty);
            }
            if (color.is("srgb" /* Common.Color.Format.SRGB */) || color.is("srgb-linear" /* Common.Color.Format.SRGB_LINEAR */) ||
                color.is("display-p3" /* Common.Color.Format.DISPLAY_P3 */) || color.is("a98-rgb" /* Common.Color.Format.A98_RGB */) ||
                color.is("prophoto-rgb" /* Common.Color.Format.PROPHOTO_RGB */) || color.is("rec2020" /* Common.Color.Format.REC_2020 */) ||
                color.is("xyz" /* Common.Color.Format.XYZ */) || color.is("xyz-d50" /* Common.Color.Format.XYZ_D50 */) ||
                color.is("xyz-d65" /* Common.Color.Format.XYZ_D65 */)) {
                return new Common.Color.ColorFunction(color.colorSpace, color.p0, color.p1, color.p2, color.alpha, customProperty);
            }
            throw new Error(`Forgot to handle color format ${color.format()}`);
        };
        const color = getColor(event.data);
        if (!color) {
            return;
        }
        this.swatch.renderColor(color);
        this.dispatchEventToListeners("colorchanged" /* ColorSwatchPopoverIconEvents.COLOR_CHANGED */, color);
    }
    onScroll(_event) {
        this.swatchPopoverHelper.hide(true);
    }
    onPopoverHidden(commitEdit) {
        if (this.scrollerElement) {
            this.scrollerElement.removeEventListener('scroll', this.boundOnScroll, false);
        }
        if (this.spectrum) {
            this.spectrum.removeEventListener("ColorChanged" /* ColorPicker.Spectrum.Events.COLOR_CHANGED */, this.boundSpectrumChanged);
        }
        this.spectrum = undefined;
        const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || '';
        void this.treeElement.applyStyleText(propertyText, true);
        this.treeElement.parentPane().setEditingStyle(false);
        delete this.originalPropertyText;
        UI.Context.Context.instance().setFlavor(ColorSwatchPopoverIcon, null);
    }
}
export class ShadowSwatchPopoverHelper extends Common.ObjectWrapper.ObjectWrapper {
    treeElement;
    swatchPopoverHelper;
    shadowSwatch;
    iconElement;
    boundShadowChanged;
    boundOnScroll;
    cssShadowEditor;
    scrollerElement;
    originalPropertyText;
    constructor(treeElement, swatchPopoverHelper, shadowSwatch) {
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
    keyDown(event) {
        if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            event.consume(true);
            this.showPopover();
        }
    }
    iconClick(event) {
        event.consume(true);
        this.showPopover();
    }
    showPopover() {
        if (this.swatchPopoverHelper.isShowing()) {
            this.swatchPopoverHelper.hide(true);
            return;
        }
        this.cssShadowEditor = new InlineEditor.CSSShadowEditor.CSSShadowEditor();
        this.cssShadowEditor.element.classList.toggle('with-padding', true);
        this.cssShadowEditor.setModel(this.shadowSwatch.model());
        this.cssShadowEditor.addEventListener("ShadowChanged" /* InlineEditor.CSSShadowEditor.Events.SHADOW_CHANGED */, this.boundShadowChanged);
        this.swatchPopoverHelper.show(this.cssShadowEditor, this.iconElement, this.onPopoverHidden.bind(this));
        this.scrollerElement = this.iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');
        if (this.scrollerElement) {
            this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
        }
        this.originalPropertyText = this.treeElement.property.propertyText;
        this.treeElement.parentPane().setEditingStyle(true);
        const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(this.treeElement.property, false /* forName */);
        if (uiLocation) {
            void Common.Revealer.reveal(uiLocation, true /* omitFocus */);
        }
    }
    shadowChanged(event) {
        this.dispatchEventToListeners("shadowChanged" /* ShadowEvents.SHADOW_CHANGED */, event.data);
    }
    onScroll(_event) {
        this.swatchPopoverHelper.hide(true);
    }
    onPopoverHidden(commitEdit) {
        if (this.scrollerElement) {
            this.scrollerElement.removeEventListener('scroll', this.boundOnScroll, false);
        }
        if (this.cssShadowEditor) {
            this.cssShadowEditor.removeEventListener("ShadowChanged" /* InlineEditor.CSSShadowEditor.Events.SHADOW_CHANGED */, this.boundShadowChanged);
        }
        this.cssShadowEditor = undefined;
        const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || '';
        void this.treeElement.applyStyleText(propertyText, true);
        this.treeElement.parentPane().setEditingStyle(false);
        delete this.originalPropertyText;
    }
}
export class FontEditorSectionManager {
    treeElementMap;
    swatchPopoverHelper;
    section;
    parentPane;
    fontEditor;
    scrollerElement;
    boundFontChanged;
    boundOnScroll;
    boundResized;
    constructor(swatchPopoverHelper, section) {
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
    fontChanged(event) {
        const { propertyName, value } = event.data;
        const treeElement = this.treeElementMap.get(propertyName);
        void this.updateFontProperty(propertyName, value, treeElement);
    }
    async updateFontProperty(propertyName, value, treeElement) {
        if (treeElement?.treeOutline && treeElement.valueElement && treeElement.property.parsedOk &&
            treeElement.property.range) {
            let elementRemoved = false;
            treeElement.valueElement.textContent = value;
            treeElement.property.value = value;
            let styleText;
            const propertyName = treeElement.property.name;
            if (value.length) {
                styleText = treeElement.renderedPropertyText();
            }
            else {
                styleText = '';
                elementRemoved = true;
                this.fixIndex(treeElement.property.index);
            }
            this.treeElementMap.set(propertyName, treeElement);
            await treeElement.applyStyleText(styleText, true);
            if (elementRemoved) {
                this.treeElementMap.delete(propertyName);
            }
        }
        else if (value.length) {
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
    fontEditorResized() {
        this.swatchPopoverHelper.reposition();
    }
    fixIndex(removedIndex) {
        for (const treeElement of this.treeElementMap.values()) {
            if (treeElement.property.index > removedIndex) {
                treeElement.property.index -= 1;
            }
        }
    }
    createPropertyValueMap() {
        const propertyMap = new Map();
        for (const fontProperty of this.treeElementMap) {
            const propertyName = (fontProperty[0]);
            const treeElement = fontProperty[1];
            if (treeElement.property.value.length) {
                propertyMap.set(propertyName, treeElement.property.value);
            }
            else {
                this.treeElementMap.delete(propertyName);
            }
        }
        return propertyMap;
    }
    registerFontProperty(treeElement) {
        const propertyName = treeElement.property.name;
        if (this.treeElementMap.has(propertyName)) {
            const treeElementFromMap = this.treeElementMap.get(propertyName);
            if (!treeElement.overloaded() || (treeElementFromMap?.overloaded())) {
                this.treeElementMap.set(propertyName, treeElement);
            }
        }
        else {
            this.treeElementMap.set(propertyName, treeElement);
        }
    }
    async showPopover(iconElement, parentPane) {
        if (this.swatchPopoverHelper.isShowing()) {
            this.swatchPopoverHelper.hide(true);
            return;
        }
        this.parentPane = parentPane;
        const propertyValueMap = this.createPropertyValueMap();
        this.fontEditor = new InlineEditor.FontEditor.FontEditor(propertyValueMap);
        this.fontEditor.addEventListener("FontChanged" /* InlineEditor.FontEditor.Events.FONT_CHANGED */, this.boundFontChanged);
        this.fontEditor.addEventListener("FontEditorResized" /* InlineEditor.FontEditor.Events.FONT_EDITOR_RESIZED */, this.boundResized);
        this.swatchPopoverHelper.show(this.fontEditor, iconElement, this.onPopoverHidden.bind(this));
        this.scrollerElement = iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');
        if (this.scrollerElement) {
            this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
        }
        this.parentPane.setEditingStyle(true);
    }
    onScroll() {
        this.swatchPopoverHelper.hide(true);
    }
    onPopoverHidden() {
        if (this.scrollerElement) {
            this.scrollerElement.removeEventListener('scroll', this.boundOnScroll, false);
        }
        this.section.onpopulate();
        if (this.fontEditor) {
            this.fontEditor.removeEventListener("FontChanged" /* InlineEditor.FontEditor.Events.FONT_CHANGED */, this.boundFontChanged);
        }
        this.fontEditor = null;
        if (this.parentPane) {
            this.parentPane.setEditingStyle(false);
        }
        this.section.resetToolbars();
        this.section.onpopulate();
    }
}
//# sourceMappingURL=ColorSwatchPopoverIcon.js.map