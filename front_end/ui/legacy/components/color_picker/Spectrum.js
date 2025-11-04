// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/*
 * Copyright (C) 2011 Brian Grinstead All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import '../../legacy.js';
import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as SrgbOverlay from '../../../components/srgb_overlay/srgb_overlay.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import { colorFormatSpec } from './ColorFormatSpec.js';
import { ContrastDetails } from './ContrastDetails.js';
import { ContrastOverlay } from './ContrastOverlay.js';
import { FormatPickerContextMenu } from './FormatPickerContextMenu.js';
import spectrumStyles from './spectrum.css.js';
const UIStrings = {
    /**
     * @description Tooltip text that appears when hovering over largeicon eyedropper button in Spectrum of the Color Picker
     * @example {c} PH1
     */
    toggleColorPicker: 'Eye dropper [{PH1}]',
    /**
     * @description Aria label for hue slider in Color Picker
     */
    changeHue: 'Change hue',
    /**
     * @description Aria label for alpha slider in Color Picker. Alpha refers to the alpha channel of a
     * color, and this tool allows the user to change the alpha value.
     */
    changeAlpha: 'Change alpha',
    /**
     * @description Aria label for HEX color format input
     */
    hex: 'HEX',
    /**
     * @description Aria label for color format switcher button in Color Picker
     */
    changeColorFormat: 'Change color format',
    /**
     * @description Screen reader reads this text when palette switcher button receives focus
     */
    previewPalettes: 'Preview palettes',
    /**
     * @description Tooltip text that appears when hovering over the largeicon add button in the Spectrum of the Color Picker
     */
    addToPalette: 'Add to palette',
    /**
     * @description Title text content in Spectrum of the Color Picker
     */
    colorPalettes: 'Color Palettes',
    /**
     * @description Label for close button in Color Picker
     */
    returnToColorPicker: 'Return to color picker',
    /**
     * @description Aria label which declares hex value of a swatch in the Color Picker
     * @example {#969696} PH1
     */
    colorS: 'Color {PH1}',
    /**
     * @description Color element title in Spectrum of the Color Picker
     * @example {#9c1724} PH1
     */
    longclickOrLongpressSpaceToShow: 'Long-click or long-press space to show alternate shades of {PH1}',
    /**
     * @description A context menu item in the Color Picker to organize the user-defined color palette (removes the user-defined color to which this action is performed)"
     */
    removeColor: 'Remove color',
    /**
     * @description A context menu item in the Color Picker to organize the user-defined color palette (removes all user-defined colors to the right of the color to which this action is performed)"
     */
    removeAllToTheRight: 'Remove all to the right',
    /**
     * @description A context menu item in the Color Picker to organize the user-defined color palette (removes all user-defined colors)"
     */
    clearPalette: 'Clear palette',
    /**
     * @description Aria label for RGBA and HSLA color format inputs in Color Picker
     * @example {R} PH1
     * @example {RGBA} PH2
     */
    sInS: '{PH1} in {PH2}',
    /**
     * @description Swatch copy icon title in Spectrum of the Color Picker
     */
    copyColorToClipboard: 'Copy color to clipboard',
    /**
     * @description Aria text for the swatch position. Swatch is the color picker spectrum tool.
     */
    pressArrowKeysMessage: 'Press arrow keys with or without modifiers to move swatch position. Arrow key with Shift key moves position largely, with Ctrl key it is less and with Alt key it is even less',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/color_picker/Spectrum.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const colorElementToMutable = new WeakMap();
const colorElementToColor = new WeakMap();
const srgbGamutFormats = [
    "srgb" /* Common.Color.Format.SRGB */,
    "rgb" /* Common.Color.Format.RGB */,
    "hex" /* Common.Color.Format.HEX */,
    "hsl" /* Common.Color.Format.HSL */,
    "hwb" /* Common.Color.Format.HWB */,
];
const IS_NATIVE_EYE_DROPPER_AVAILABLE = 'EyeDropper' in window;
function doesFormatSupportDisplayP3(format) {
    return !srgbGamutFormats.includes(format);
}
function convertColorFormat(colorFormat) {
    if (colorFormat === "rgba" /* Common.Color.Format.RGBA */) {
        return "rgb" /* Common.Color.Format.RGB */;
    }
    if (colorFormat === "hsla" /* Common.Color.Format.HSLA */) {
        return "hsl" /* Common.Color.Format.HSL */;
    }
    if (colorFormat === "hwba" /* Common.Color.Format.HWBA */) {
        return "hwb" /* Common.Color.Format.HWB */;
    }
    if (colorFormat === "hexa" /* Common.Color.Format.HEXA */) {
        return "hex" /* Common.Color.Format.HEX */;
    }
    return colorFormat;
}
/**
 * HSV by itself, without a color space, doesn't map to a color and
 * it is usually interpreted as an sRGB color. However, it can also
 * represent colors in other color spaces since `HSV` -> `RGB` mapping
 * is not color space dependent. For example, color(display-p3 1 1 1) and rgb(1 1 1)
 * map to the same HSV values. The tricky thing is, `hsl()` syntax is interpreted
 * as it is in sRGB in CSS. So, when you convert those two colors and use as `hsl()`, it will
 * show an sRGB color. Though, if there was a function `color-hsl(<color-space> h s l)`
 * it was going to show the color in the color-space represented with `hsl`.
 * This function, gets the HSV values by interpreting them in the given gamut.
 **/
function getHsvFromColor(gamut, color) {
    switch (gamut) {
        case "display-p3" /* SpectrumGamut.DISPLAY_P3 */: {
            const displayP3color = color.as("display-p3" /* Common.Color.Format.DISPLAY_P3 */);
            return [
                ...Common.Color.rgb2hsv([displayP3color.p0, displayP3color.p1, displayP3color.p2]),
                displayP3color.alpha || 1,
            ];
        }
        case "srgb" /* SpectrumGamut.SRGB */: {
            return color.as("hsl" /* Common.Color.Format.HSL */).hsva();
        }
    }
}
/** Interprets the given `hsva` values in the given gamut and returns the concrete `Color` object. **/
function getColorFromHsva(gamut, hsva) {
    const color = Common.Color.Legacy.fromHSVA(hsva);
    switch (gamut) {
        case "display-p3" /* SpectrumGamut.DISPLAY_P3 */: {
            const rgba = Common.Color.hsva2rgba(hsva);
            return new Common.Color.ColorFunction("display-p3" /* Common.Color.Format.DISPLAY_P3 */, rgba[0], rgba[1], rgba[2], rgba[3], undefined);
        }
        case "srgb" /* SpectrumGamut.SRGB */: {
            return color;
        }
    }
}
export class Spectrum extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    #color;
    gamut = "srgb" /* SpectrumGamut.SRGB */;
    colorElement;
    colorDragElement;
    dragX;
    dragY;
    colorPickerButton;
    swatch;
    hueElement;
    hueSlider;
    alphaElement;
    alphaElementBackground;
    alphaSlider;
    displayContainer;
    textValues;
    textLabels;
    hexContainer;
    hexValue;
    contrastInfo;
    srgbOverlay;
    contrastOverlay;
    contrastDetails;
    contrastDetailsBackgroundColorPickerToggledBound;
    palettes;
    palettePanel;
    palettePanelShowing;
    paletteSectionContainer;
    paletteContainer;
    shadesContainer;
    deleteIconToolbar;
    deleteButton;
    addColorToolbar;
    colorPickedBound;
    hsv;
    hueAlphaWidth;
    dragWidth;
    dragHeight;
    colorDragElementHeight;
    slideHelperWidth;
    numPaletteRowsShown;
    selectedColorPalette;
    customPaletteSetting;
    colorOffset;
    closeButton;
    paletteContainerMutable;
    shadesCloseHandler;
    dragElement;
    dragHotSpotX;
    dragHotSpotY;
    #colorName;
    colorFormat = "rgb" /* Common.Color.Format.RGB */;
    eyeDropperAbortController = null;
    isFormatPickerShown = false;
    // Used to represent how the current color
    // should be stringified externally (emitted event etc.).
    // For example, this is used when a color variable
    // selected form the palettes. That time, we don't
    // want to return the value of the variable but the
    // actual variable string.
    #colorString;
    constructor(contrastInfo) {
        super({ useShadowDom: true });
        this.registerRequiredCSS(spectrumStyles);
        this.contentElement.tabIndex = 0;
        this.contentElement.setAttribute('jslog', `${VisualLogging.dialog('colorPicker').parent('mapped').track({ keydown: 'Enter|Escape' })}`);
        this.colorElement = this.contentElement.createChild('div', 'spectrum-color');
        this.colorElement.tabIndex = 0;
        this.colorElement.setAttribute('jslog', `${VisualLogging.canvas('color').track({
            click: true,
            drag: true,
            keydown: 'ArrowLeft|ArrowRight|ArrowDown|ArrowUp',
        })}`);
        this.setDefaultFocusedElement(this.colorElement);
        this.colorElement.addEventListener('keydown', this.onSliderKeydown.bind(this, positionColor.bind(this)));
        const swatchAriaText = i18nString(UIStrings.pressArrowKeysMessage);
        UI.ARIAUtils.setLabel(this.colorElement, swatchAriaText);
        UI.ARIAUtils.markAsApplication(this.colorElement);
        this.colorDragElement = this.colorElement.createChild('div', 'spectrum-sat fill')
            .createChild('div', 'spectrum-val fill')
            .createChild('div', 'spectrum-dragger');
        this.dragX = 0;
        this.dragY = 0;
        const toolsContainer = this.contentElement.createChild('div', 'spectrum-tools');
        const toolbar = toolsContainer.createChild('devtools-toolbar', 'spectrum-eye-dropper');
        const toggleEyeDropperShortcut = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('elements.toggle-eye-dropper');
        const definedShortcutKey = toggleEyeDropperShortcut[0]?.descriptors.flatMap(descriptor => descriptor.name.split(' + '))[0];
        this.colorPickerButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleColorPicker, { PH1: definedShortcutKey || '' }), 'color-picker', 'color-picker-filled', 'color-eye-dropper');
        this.colorPickerButton.setToggled(true);
        this.colorPickerButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.toggleColorPicker.bind(this, undefined));
        toolbar.appendToolbarItem(this.colorPickerButton);
        this.colorPickerButton.element.setAttribute('jslog', `${VisualLogging.colorEyeDropper().track({ click: true })}`);
        this.swatch = new Swatch(toolsContainer);
        this.hueElement = toolsContainer.createChild('div', 'spectrum-hue');
        this.hueElement.setAttribute('jslog', `${VisualLogging.slider('hue').track({
            click: true,
            drag: true,
            keydown: 'ArrowLeft|ArrowRight|ArrowDown|ArrowUp',
        })}`);
        this.hueElement.tabIndex = 0;
        this.hueElement.addEventListener('keydown', this.onSliderKeydown.bind(this, positionHue.bind(this)));
        UI.ARIAUtils.setLabel(this.hueElement, i18nString(UIStrings.changeHue));
        UI.ARIAUtils.markAsSlider(this.hueElement, 0, 360);
        this.hueSlider = this.hueElement.createChild('div', 'spectrum-slider');
        this.alphaElement = toolsContainer.createChild('div', 'spectrum-alpha');
        this.alphaElement.setAttribute('jslog', `${VisualLogging.slider('alpha').track({
            click: true,
            drag: true,
            keydown: 'ArrowLeft|ArrowRight|ArrowDown|ArrowUp',
        })}`);
        this.alphaElement.tabIndex = 0;
        this.alphaElement.addEventListener('keydown', this.onSliderKeydown.bind(this, positionAlpha.bind(this)));
        UI.ARIAUtils.setLabel(this.alphaElement, i18nString(UIStrings.changeAlpha));
        UI.ARIAUtils.markAsSlider(this.alphaElement, 0, 1);
        this.alphaElementBackground = this.alphaElement.createChild('div', 'spectrum-alpha-background');
        this.alphaSlider = this.alphaElement.createChild('div', 'spectrum-slider');
        // RGBA/HSLA/HWBA display.
        this.displayContainer = toolsContainer.createChild('div', 'spectrum-text source-code');
        UI.ARIAUtils.markAsPoliteLiveRegion(this.displayContainer, true);
        this.textValues = [];
        for (let i = 0; i < 4; ++i) {
            const inputValue = UI.UIUtils.createInput('spectrum-text-value');
            inputValue.setAttribute('jslog', `${VisualLogging.value().track({ change: true, keydown: 'ArrowUp|ArrowDown' }).context(i)}`);
            this.displayContainer.appendChild(inputValue);
            inputValue.maxLength = 4;
            this.textValues.push(inputValue);
            inputValue.addEventListener('keydown', this.inputChanged.bind(this), false);
            inputValue.addEventListener('input', this.inputChanged.bind(this), false);
            inputValue.addEventListener('wheel', this.inputChanged.bind(this), false);
            inputValue.addEventListener('paste', this.pasted.bind(this), false);
        }
        this.textLabels = this.displayContainer.createChild('div', 'spectrum-text-label');
        // HEX display.
        this.hexContainer = toolsContainer.createChild('div', 'spectrum-text spectrum-text-hex source-code');
        UI.ARIAUtils.markAsPoliteLiveRegion(this.hexContainer, true);
        this.hexValue = UI.UIUtils.createInput('spectrum-text-value');
        this.hexValue.setAttribute('jslog', `${VisualLogging.value('hex').track({ keydown: 'ArrowUp|ArrowDown', change: true })}`);
        this.hexContainer.appendChild(this.hexValue);
        this.hexValue.maxLength = 9;
        this.hexValue.addEventListener('keydown', this.inputChanged.bind(this), false);
        this.hexValue.addEventListener('input', this.inputChanged.bind(this), false);
        this.hexValue.addEventListener('wheel', this.inputChanged.bind(this), false);
        this.hexValue.addEventListener('paste', this.pasted.bind(this), false);
        const label = this.hexContainer.createChild('div', 'spectrum-text-label');
        label.textContent = i18nString(UIStrings.hex);
        UI.ARIAUtils.setLabel(this.hexValue, label.textContent);
        const displaySwitcher = toolsContainer.createChild('button', 'spectrum-display-switcher spectrum-switcher');
        displaySwitcher.setAttribute('jslog', `${VisualLogging.dropDown('color-format').track({ click: true })}`);
        appendSwitcherIcon(displaySwitcher);
        UI.UIUtils.setTitle(displaySwitcher, i18nString(UIStrings.changeColorFormat));
        displaySwitcher.tabIndex = 0;
        displaySwitcher.addEventListener('click', (ev) => {
            void this.showFormatPicker(ev);
        });
        UI.UIUtils.installDragHandle(this.hueElement, this.dragStart.bind(this, positionHue.bind(this)), positionHue.bind(this), null, 'ew-resize', 'crosshair');
        UI.UIUtils.installDragHandle(this.alphaElement, this.dragStart.bind(this, positionAlpha.bind(this)), positionAlpha.bind(this), null, 'ew-resize', 'crosshair');
        UI.UIUtils.installDragHandle(this.colorElement, this.dragStart.bind(this, positionColor.bind(this)), positionColor.bind(this), null, 'move', 'crosshair');
        // Color contrast business.
        if (contrastInfo) {
            this.contrastInfo = contrastInfo;
            this.contrastOverlay = new ContrastOverlay(this.contrastInfo, this.colorElement);
            this.contrastDetails = new ContrastDetails(this.contrastInfo, this.contentElement, this.toggleColorPicker.bind(this), this.contrastPanelExpandedChanged.bind(this), this.colorSelected.bind(this));
            this.contrastDetailsBackgroundColorPickerToggledBound =
                this.contrastDetailsBackgroundColorPickerToggled.bind(this);
        }
        this.element.classList.add('flex-none');
        this.palettes = new Map();
        this.palettePanel = this.contentElement.createChild('div', 'palette-panel');
        this.palettePanel.setAttribute('jslog', `${VisualLogging.section('palette-panel')}`);
        this.palettePanelShowing = false;
        this.paletteSectionContainer = this.contentElement.createChild('div', 'spectrum-palette-container');
        this.paletteContainer = this.paletteSectionContainer.createChild('div', 'spectrum-palette');
        this.paletteContainer.addEventListener('contextmenu', this.showPaletteColorContextMenu.bind(this, -1));
        this.shadesContainer = this.contentElement.createChild('div', 'palette-color-shades hidden');
        this.shadesContainer.setAttribute('jslog', `${VisualLogging.paletteColorShades()}`);
        UI.UIUtils.installDragHandle(this.paletteContainer, this.paletteDragStart.bind(this), this.paletteDrag.bind(this), this.paletteDragEnd.bind(this), 'default');
        const paletteSwitcher = this.paletteSectionContainer.createChild('div', 'spectrum-palette-switcher spectrum-switcher');
        paletteSwitcher.setAttribute('jslog', `${VisualLogging.dropDown('palette-switcher').track({ click: true })}`);
        appendSwitcherIcon(paletteSwitcher);
        UI.UIUtils.setTitle(paletteSwitcher, i18nString(UIStrings.previewPalettes));
        UI.ARIAUtils.markAsButton(paletteSwitcher);
        paletteSwitcher.tabIndex = 0;
        self.onInvokeElement(paletteSwitcher, event => {
            this.togglePalettePanel(true);
            event.consume(true);
        });
        this.deleteIconToolbar = document.createElement('devtools-toolbar');
        this.deleteIconToolbar.classList.add('delete-color-toolbar');
        this.deleteButton = new UI.Toolbar.ToolbarButton('', 'bin');
        this.deleteIconToolbar.appendToolbarItem(this.deleteButton);
        const overlay = this.contentElement.createChild('div', 'spectrum-overlay fill');
        overlay.addEventListener('click', this.togglePalettePanel.bind(this, false));
        this.addColorToolbar = document.createElement('devtools-toolbar');
        this.addColorToolbar.classList.add('add-color-toolbar');
        const addColorButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.addToPalette), 'plus', undefined, 'add-color');
        addColorButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.onAddColorMousedown.bind(this));
        addColorButton.element.addEventListener('keydown', this.onAddColorKeydown.bind(this));
        this.addColorToolbar.appendToolbarItem(addColorButton);
        this.colorPickedBound = this.colorPicked.bind(this);
        this.numPaletteRowsShown = -1;
        this.contentElement.addEventListener('focusout', ev => {
            // Do not propagate 'focusout' event when the format picker
            // context menu is shown. The reason is, when it is shown,
            // 'focusout' event is emitted and SwatchPopoverHelper listens
            // to it and closes the color picker. However, we don't want
            // color picker to be closed when the focus is gone for the
            // format picker context menu. That's why we stop the propagation.
            if (this.isFormatPickerShown) {
                ev.stopImmediatePropagation();
            }
        });
        this.srgbOverlay = new SrgbOverlay.SrgbOverlay.SrgbOverlay();
        this.loadPalettes();
        new PaletteGenerator(palette => {
            if (palette.colors.length) {
                this.addPalette(palette);
            }
            else if (this.selectedColorPalette.get() === palette.title) {
                this.paletteSelected(MaterialPalette);
            }
        });
        function getUpdatedSliderPosition(element, event) {
            const keyboardEvent = event;
            const elementPosition = element.getBoundingClientRect();
            switch (keyboardEvent.key) {
                case 'ArrowLeft':
                case 'ArrowDown':
                    return elementPosition.left - 1;
                case 'ArrowRight':
                case 'ArrowUp':
                    return elementPosition.right + 1;
                default:
                    return event.x;
            }
        }
        function positionHue(event) {
            const hsva = this.hsv.slice();
            const sliderPosition = getUpdatedSliderPosition(this.hueSlider, event);
            const hueAlphaLeft = this.hueElement.getBoundingClientRect().left;
            const positionFraction = (sliderPosition - hueAlphaLeft) / this.hueAlphaWidth;
            const newHue = 1 - positionFraction;
            hsva[0] = Platform.NumberUtilities.clamp(newHue, 0, 1);
            this.#setColor(hsva, '', undefined /* colorName */, undefined, ChangeSource.Other);
            const color = getColorFromHsva(this.gamut, hsva);
            const colorValues = color.as("hsl" /* Common.Color.Format.HSL */).canonicalHSLA();
            UI.ARIAUtils.setValueNow(this.hueElement, colorValues[0]);
        }
        function positionAlpha(event) {
            const hsva = this.hsv.slice();
            const sliderPosition = getUpdatedSliderPosition(this.alphaSlider, event);
            const hueAlphaLeft = this.hueElement.getBoundingClientRect().left;
            const positionFraction = (sliderPosition - hueAlphaLeft) / this.hueAlphaWidth;
            const newAlpha = Math.round(positionFraction * 100) / 100;
            hsva[3] = Platform.NumberUtilities.clamp(newAlpha, 0, 1);
            this.#setColor(hsva, '', undefined /* colorName */, undefined, ChangeSource.Other);
            const color = getColorFromHsva(this.gamut, hsva);
            const colorValues = color.as("hsl" /* Common.Color.Format.HSL */).canonicalHSLA();
            UI.ARIAUtils.setValueText(this.alphaElement, colorValues[3]);
        }
        function positionColor(event) {
            const hsva = this.hsv.slice();
            const colorPosition = getUpdatedColorPosition(this.colorDragElement, event);
            this.colorOffset = this.colorElement.getBoundingClientRect();
            hsva[1] = Platform.NumberUtilities.clamp((colorPosition.x - this.colorOffset.left) / this.dragWidth, 0, 1);
            hsva[2] = Platform.NumberUtilities.clamp(1 - (colorPosition.y - this.colorOffset.top) / this.dragHeight, 0, 1);
            this.#setColor(hsva, '', undefined /* colorName */, undefined, ChangeSource.Other);
        }
        function getUpdatedColorPosition(dragElement, event) {
            const elementPosition = dragElement.getBoundingClientRect();
            const verticalX = elementPosition.x + elementPosition.width / 2;
            const horizontalY = elementPosition.y + elementPosition.width / 2;
            const defaultUnit = elementPosition.width / 4;
            const unit = getUnitToMove(defaultUnit, event);
            const keyboardEvent = event;
            switch (keyboardEvent.key) {
                case 'ArrowLeft':
                    return { x: elementPosition.left - unit, y: horizontalY };
                case 'ArrowRight':
                    return { x: elementPosition.right + unit, y: horizontalY };
                case 'ArrowDown':
                    return { x: verticalX, y: elementPosition.bottom + unit };
                case 'ArrowUp':
                    return { x: verticalX, y: elementPosition.top - unit };
                default:
                    return {
                        x: event.x,
                        y: event.y,
                    };
            }
        }
        function getUnitToMove(unit, event) {
            const keyboardEvent = event;
            if (keyboardEvent.altKey) {
                unit = 1;
            }
            else if (keyboardEvent.ctrlKey) {
                unit = 10;
            }
            else if (keyboardEvent.shiftKey) {
                unit = 20;
            }
            return unit;
        }
        function appendSwitcherIcon(parentElement) {
            const switcherIcon = new IconButton.Icon.Icon();
            switcherIcon.name = 'fold-more';
            switcherIcon.classList.add('medium');
            parentElement.appendChild(switcherIcon);
        }
    }
    dragStart(callback, event) {
        this.colorOffset = this.colorElement.getBoundingClientRect();
        callback(event);
        return true;
    }
    contrastDetailsBackgroundColorPickerToggled(event) {
        if (event.data) {
            void this.toggleColorPicker(false);
        }
    }
    contrastPanelExpandedChanged() {
        if (!this.contrastOverlay || !this.contrastDetails) {
            return;
        }
        this.contrastOverlay.setVisible(this.contrastDetails.expanded());
        this.resizeForSelectedPalette(true);
        if (this.contrastDetails.expanded()) {
            this.hideSrgbOverlay();
        }
        else {
            this.showSrgbOverlay();
        }
    }
    updatePalettePanel() {
        this.palettePanel.removeChildren();
        const title = this.palettePanel.createChild('div', 'palette-title');
        title.textContent = i18nString(UIStrings.colorPalettes);
        const toolbar = this.palettePanel.createChild('devtools-toolbar');
        this.closeButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.returnToColorPicker), 'cross');
        this.closeButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.togglePalettePanel.bind(this, false));
        this.closeButton.element.addEventListener('keydown', this.onCloseBtnKeydown.bind(this));
        this.closeButton.element.setAttribute('jslog', `${VisualLogging.close().track({ click: true })}`);
        toolbar.appendToolbarItem(this.closeButton);
        for (const palette of this.palettes.values()) {
            this.palettePanel.appendChild(this.createPreviewPaletteElement(palette));
        }
        this.contentElement.scrollIntoView({ block: 'end' });
    }
    togglePalettePanel(show) {
        if (this.palettePanelShowing === show) {
            return;
        }
        if (show) {
            this.updatePalettePanel();
        }
        this.palettePanelShowing = show;
        this.contentElement.classList.toggle('palette-panel-showing', show);
        this.#focus();
    }
    onCloseBtnKeydown(event) {
        if (Platform.KeyboardUtilities.isEscKey(event) || Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            this.togglePalettePanel(false);
            event.consume(true);
        }
    }
    onSliderKeydown(sliderNewPosition, event) {
        const keyboardEvent = event;
        switch (keyboardEvent.key) {
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowDown':
            case 'ArrowUp':
                sliderNewPosition(event);
                event.consume(true);
        }
    }
    /**
     * (Suppress warning about preventScroll)
     */
    #focus() {
        if (!this.isShowing()) {
            return;
        }
        if (this.palettePanelShowing && this.closeButton) {
            this.closeButton.element.focus({ preventScroll: true });
        }
        else {
            this.contentElement.focus();
        }
    }
    createPaletteColor(colorText, colorName, animationDelay) {
        const element = document.createElement('div');
        element.classList.add('spectrum-palette-color');
        element.setAttribute('jslog', `${VisualLogging.item().track({
            click: true,
            drag: true,
            keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Escape|Tab',
        })}`);
        element.style.background =
            Platform.StringUtilities.sprintf('linear-gradient(%s, %s), var(--image-file-checker)', colorText, colorText);
        if (animationDelay) {
            element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100, delay: animationDelay, fill: 'backwards' });
        }
        UI.Tooltip.Tooltip.install(element, colorName || colorText);
        return element;
    }
    showPalette(palette, animate, _event) {
        this.resizeForSelectedPalette();
        this.paletteContainer.removeChildren();
        for (let i = 0; i < palette.colors.length; i++) {
            const animationDelay = animate ? i * 100 / palette.colors.length : 0;
            const colorElement = this.createPaletteColor(palette.colors[i], palette.colorNames[i], animationDelay);
            UI.ARIAUtils.markAsButton(colorElement);
            UI.ARIAUtils.setLabel(colorElement, i18nString(UIStrings.colorS, { PH1: palette.colors[i] }));
            colorElement.tabIndex = -1;
            colorElement.addEventListener('mousedown', this.onPaletteColorKeydown.bind(this, palette, i));
            colorElement.addEventListener('keydown', this.onPaletteColorKeydown.bind(this, palette, i));
            if (palette.mutable) {
                colorElementToMutable.set(colorElement, true);
                colorElementToColor.set(colorElement, palette.colors[i]);
                colorElement.addEventListener('contextmenu', this.showPaletteColorContextMenu.bind(this, i));
            }
            else if (palette === MaterialPalette) {
                colorElement.classList.add('has-material-shades');
                let shadow = colorElement.createChild('div', 'spectrum-palette-color spectrum-palette-color-shadow');
                shadow.style.background = palette.colors[i];
                shadow = colorElement.createChild('div', 'spectrum-palette-color spectrum-palette-color-shadow');
                shadow.style.background = palette.colors[i];
                const tooltipText = i18nString(UIStrings.longclickOrLongpressSpaceToShow, { PH1: palette.colors[i] });
                UI.Tooltip.Tooltip.install(colorElement, tooltipText);
                UI.ARIAUtils.setLabel(colorElement, tooltipText);
                new UI.UIUtils.LongClickController(colorElement, this.showLightnessShades.bind(this, colorElement, palette.colors[i]));
            }
            this.paletteContainer.appendChild(colorElement);
        }
        if (this.paletteContainer.childNodes.length > 0) {
            this.paletteContainer.childNodes[0].tabIndex = 0;
        }
        this.paletteContainerMutable = palette.mutable;
        if (palette.mutable) {
            this.paletteContainer.appendChild(this.addColorToolbar);
            this.paletteContainer.appendChild(this.deleteIconToolbar);
        }
        else {
            this.addColorToolbar.remove();
            this.deleteIconToolbar.remove();
        }
        this.togglePalettePanel(false);
        this.#focus();
    }
    showLightnessShades(colorElement, colorText, _event) {
        function closeLightnessShades(element) {
            this.shadesContainer.classList.add('hidden');
            element.classList.remove('spectrum-shades-shown');
            if (this.shadesCloseHandler) {
                this.shadesContainer.ownerDocument.removeEventListener('mousedown', this.shadesCloseHandler, true);
            }
            delete this.shadesCloseHandler;
        }
        if (this.shadesCloseHandler) {
            this.shadesCloseHandler();
        }
        this.shadesContainer.classList.remove('hidden');
        this.shadesContainer.removeChildren();
        this.shadesContainer.animate([{ transform: 'scaleY(0)', opacity: '0' }, { transform: 'scaleY(1)', opacity: '1' }], { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
        let shadesTop = this.paletteContainer.offsetTop + colorElement.offsetTop +
            (colorElement.parentElement ? colorElement.parentElement.offsetTop : 0);
        if (this.contrastDetails) {
            shadesTop += this.contrastDetails.element().offsetHeight;
        }
        this.shadesContainer.style.top = shadesTop + 'px';
        this.shadesContainer.style.left = colorElement.offsetLeft + 'px';
        colorElement.classList.add('spectrum-shades-shown');
        const shades = MaterialPaletteShades.get(colorText);
        if (shades !== undefined) {
            for (let i = shades.length - 1; i >= 0; i--) {
                const shadeElement = this.createPaletteColor(shades[i], undefined /* colorName */, i * 200 / shades.length + 100);
                UI.ARIAUtils.markAsButton(shadeElement);
                UI.ARIAUtils.setLabel(shadeElement, i18nString(UIStrings.colorS, { PH1: shades[i] }));
                shadeElement.tabIndex = -1;
                shadeElement.addEventListener('mousedown', this.onShadeColorKeydown.bind(this, shades[i], colorElement));
                shadeElement.addEventListener('keydown', this.onShadeColorKeydown.bind(this, shades[i], colorElement));
                this.shadesContainer.appendChild(shadeElement);
            }
        }
        if (this.shadesContainer.childNodes.length > 0) {
            this.shadesContainer.childNodes[this.shadesContainer.childNodes.length - 1].focus();
        }
        this.shadesCloseHandler = closeLightnessShades.bind(this, colorElement);
        this.shadesContainer.ownerDocument.addEventListener('mousedown', this.shadesCloseHandler, true);
    }
    slotIndexForEvent(event) {
        const mouseEvent = event;
        const localX = mouseEvent.pageX - this.paletteContainer.getBoundingClientRect().left;
        const localY = mouseEvent.pageY - this.paletteContainer.getBoundingClientRect().top;
        const col = Math.min(localX / COLOR_CHIP_SIZE | 0, ITEMS_PER_PALETTE_ROW - 1);
        const row = (localY / COLOR_CHIP_SIZE) | 0;
        return Math.min(row * ITEMS_PER_PALETTE_ROW + col, this.customPaletteSetting.get().colors.length - 1);
    }
    isDraggingToBin(event) {
        const mouseEvent = event;
        return mouseEvent.pageX > this.deleteIconToolbar.getBoundingClientRect().left;
    }
    paletteDragStart(event) {
        const element = UI.UIUtils.deepElementFromEvent(event);
        if (!element || !colorElementToMutable.get(element)) {
            return false;
        }
        const index = this.slotIndexForEvent(event);
        this.dragElement = element;
        const mouseEvent = event;
        this.dragHotSpotX = mouseEvent.pageX - (index % ITEMS_PER_PALETTE_ROW) * COLOR_CHIP_SIZE;
        this.dragHotSpotY = mouseEvent.pageY - (index / ITEMS_PER_PALETTE_ROW | 0) * COLOR_CHIP_SIZE;
        return true;
    }
    paletteDrag(event) {
        const mouseEvent = event;
        if (mouseEvent.pageX < this.paletteContainer.getBoundingClientRect().left ||
            mouseEvent.pageY < this.paletteContainer.getBoundingClientRect().top) {
            return;
        }
        if (!this.dragElement || this.dragHotSpotX === undefined || this.dragHotSpotY === undefined) {
            return;
        }
        const newIndex = this.slotIndexForEvent(event);
        const offsetX = mouseEvent.pageX - (newIndex % ITEMS_PER_PALETTE_ROW) * COLOR_CHIP_SIZE;
        const offsetY = mouseEvent.pageY - (newIndex / ITEMS_PER_PALETTE_ROW | 0) * COLOR_CHIP_SIZE;
        const isDeleting = this.isDraggingToBin(event);
        this.deleteIconToolbar.classList.add('dragging');
        this.deleteIconToolbar.classList.toggle('delete-color-toolbar-active', isDeleting);
        const dragElementTransform = 'translateX(' + (offsetX - this.dragHotSpotX) + 'px) translateY(' + (offsetY - this.dragHotSpotY) + 'px)';
        this.dragElement.style.transform = isDeleting ? dragElementTransform + ' scale(0.8)' : dragElementTransform;
        const children = [...this.paletteContainer.children];
        const index = children.indexOf(this.dragElement);
        const swatchOffsets = new Map();
        for (const swatch of children) {
            swatchOffsets.set(swatch, swatch.getBoundingClientRect());
        }
        if (index !== newIndex) {
            this.paletteContainer.insertBefore(this.dragElement, children[newIndex > index ? newIndex + 1 : newIndex]);
        }
        for (const swatch of children) {
            if (swatch === this.dragElement) {
                continue;
            }
            const before = swatchOffsets.get(swatch);
            const after = swatch.getBoundingClientRect();
            if (before && (before.left !== after.left || before.top !== after.top)) {
                swatch.animate([
                    {
                        transform: 'translateX(' + (before.left - after.left) + 'px) translateY(' + (before.top - after.top) + 'px)',
                    },
                    { transform: 'none' },
                ], { duration: 100, easing: 'cubic-bezier(0, 0, 0.2, 1)' });
            }
        }
    }
    paletteDragEnd(e) {
        if (!this.dragElement) {
            return;
        }
        if (this.isDraggingToBin(e)) {
            this.dragElement.remove();
        }
        this.dragElement.style.removeProperty('transform');
        const children = this.paletteContainer.children;
        const colors = [];
        for (let i = 0; i < children.length; ++i) {
            const color = colorElementToColor.get(children[i]);
            if (color) {
                colors.push(color);
            }
        }
        const palette = this.customPaletteSetting.get();
        palette.colors = colors;
        this.customPaletteSetting.set(palette);
        this.showPalette(palette, false);
        this.deleteIconToolbar.classList.remove('dragging');
        this.deleteIconToolbar.classList.remove('delete-color-toolbar-active');
    }
    loadPalettes() {
        this.palettes.set(MaterialPalette.title, MaterialPalette);
        const defaultCustomPalette = { title: 'Custom', colors: [], colorNames: [], mutable: true, matchUserFormat: undefined };
        this.customPaletteSetting =
            Common.Settings.Settings.instance().createSetting('custom-color-palette', defaultCustomPalette);
        const customPalette = this.customPaletteSetting.get();
        // Fallback case for custom palettes created pre-m67
        customPalette.colorNames = customPalette.colorNames || [];
        this.palettes.set(customPalette.title, customPalette);
        this.selectedColorPalette =
            Common.Settings.Settings.instance().createSetting('selected-color-palette', GeneratedPaletteTitle);
        const palette = this.palettes.get(this.selectedColorPalette.get());
        if (palette) {
            this.showPalette(palette, true);
        }
    }
    addPalette(palette) {
        this.palettes.set(palette.title, palette);
        if (this.selectedColorPalette.get() === palette.title) {
            this.showPalette(palette, true);
        }
    }
    createPreviewPaletteElement(palette) {
        const colorsPerPreviewRow = 5;
        const previewElement = document.createElement('div');
        previewElement.classList.add('palette-preview');
        UI.ARIAUtils.markAsButton(previewElement);
        previewElement.tabIndex = 0;
        const titleElement = previewElement.createChild('div', 'palette-preview-title');
        titleElement.textContent = palette.title;
        let i;
        for (i = 0; i < colorsPerPreviewRow && i < palette.colors.length; i++) {
            previewElement.appendChild(this.createPaletteColor(palette.colors[i], palette.colorNames[i]));
        }
        for (; i < colorsPerPreviewRow; i++) {
            previewElement.createChild('div', 'spectrum-palette-color empty-color');
        }
        self.onInvokeElement(previewElement, event => {
            this.paletteSelected(palette);
            event.consume(true);
        });
        return previewElement;
    }
    paletteSelected(palette) {
        this.selectedColorPalette.set(palette.title);
        this.showPalette(palette, true);
    }
    resizeForSelectedPalette(force) {
        const palette = this.palettes.get(this.selectedColorPalette.get());
        if (!palette) {
            return;
        }
        let numColors = palette.colors.length;
        if (palette === this.customPaletteSetting.get()) {
            numColors++;
        }
        const rowsNeeded = Math.max(1, Math.ceil(numColors / ITEMS_PER_PALETTE_ROW));
        if (this.numPaletteRowsShown === rowsNeeded && !force) {
            return;
        }
        this.numPaletteRowsShown = rowsNeeded;
        const paletteColorHeight = 12;
        const paletteMargin = 12;
        let paletteTop = 236;
        if (this.contrastDetails) {
            if (this.contrastDetails.expanded()) {
                paletteTop += 78;
            }
            else {
                paletteTop += 36;
            }
        }
        this.element.style.height = (paletteTop + paletteMargin + (paletteColorHeight + paletteMargin) * rowsNeeded) + 'px';
        this.dispatchEventToListeners("SizeChanged" /* Events.SIZE_CHANGED */);
    }
    onPaletteColorKeydown(palette, colorIndex, event) {
        if (event instanceof MouseEvent || Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            const colorText = palette.colors[colorIndex];
            const colorName = palette.colorNames[colorIndex];
            const color = Common.Color.parse(colorText);
            if (color) {
                this.#setColor(color, colorText, colorName, palette.matchUserFormat ? this.colorFormat : color.format(), ChangeSource.Other);
            }
            // Continue bubbling so that the color picker will close and submit the selected color.
            return;
        }
        let nextColorIndex;
        switch (event.key) {
            case 'ArrowLeft':
                nextColorIndex = colorIndex - 1;
                break;
            case 'ArrowRight':
                nextColorIndex = colorIndex + 1;
                break;
            case 'ArrowUp':
                nextColorIndex = colorIndex - ITEMS_PER_PALETTE_ROW;
                break;
            case 'ArrowDown':
                nextColorIndex = colorIndex + ITEMS_PER_PALETTE_ROW;
                break;
        }
        if (nextColorIndex !== undefined && nextColorIndex > -1 &&
            nextColorIndex < this.paletteContainer.childNodes.length) {
            this.paletteContainer.childNodes[nextColorIndex].focus();
        }
    }
    onShadeColorKeydown(shade, colorElement, event) {
        if (event instanceof MouseEvent || Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            const color = Common.Color.parse(shade);
            if (color) {
                this.#setColor(color, shade, shade, color.format(), ChangeSource.Other);
            }
            // Continue bubbling so that the color picker will close and submit the selected color.
            return;
        }
        const target = event.target;
        if (Platform.KeyboardUtilities.isEscKey(event) || event.key === 'Tab') {
            colorElement.focus();
            if (this.shadesCloseHandler) {
                this.shadesCloseHandler();
            }
            event.consume(true);
        }
        else if (event.key === 'ArrowUp' && target.previousElementSibling) {
            target.previousElementSibling.focus();
            event.consume(true);
        }
        else if (event.key === 'ArrowDown' && target.nextElementSibling) {
            target.nextElementSibling.focus();
            event.consume(true);
        }
    }
    onAddColorMousedown() {
        this.addColorToCustomPalette();
    }
    onAddColorKeydown(event) {
        if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            this.addColorToCustomPalette();
            event.consume(true);
        }
    }
    addColorToCustomPalette() {
        const palette = this.customPaletteSetting.get();
        palette.colors.push(this.colorString());
        this.customPaletteSetting.set(palette);
        this.showPalette(palette, false);
        const colorElements = this.paletteContainer.querySelectorAll('.spectrum-palette-color');
        colorElements[colorElements.length - 1].focus();
    }
    showPaletteColorContextMenu(colorIndex, event) {
        if (!this.paletteContainerMutable) {
            return;
        }
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        if (colorIndex !== -1) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeColor), this.deletePaletteColors.bind(this, colorIndex, false), { jslogContext: 'remove-color' });
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeAllToTheRight), this.deletePaletteColors.bind(this, colorIndex, true), { jslogContext: 'remove-all-to-the-right' });
        }
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.clearPalette), this.deletePaletteColors.bind(this, -1, true), { jslogContext: 'clear-palette' });
        void contextMenu.show();
    }
    deletePaletteColors(colorIndex, toRight) {
        const palette = this.customPaletteSetting.get();
        if (toRight) {
            palette.colors.splice(colorIndex + 1, palette.colors.length - colorIndex - 1);
        }
        else {
            palette.colors.splice(colorIndex, 1);
        }
        this.customPaletteSetting.set(palette);
        this.showPalette(palette, false);
    }
    setColor(color) {
        this.#setColor(color, '', undefined /* colorName */, color.format(), ChangeSource.Model);
        const colorValues = color.as("hsl" /* Common.Color.Format.HSL */).canonicalHSLA();
        UI.ARIAUtils.setValueNow(this.hueElement, colorValues[0]);
        UI.ARIAUtils.setValueText(this.alphaElement, colorValues[3]);
    }
    colorSelected(color) {
        this.#setColor(color, '', undefined /* colorName */, undefined /* colorFormat */, ChangeSource.Other);
    }
    get color() {
        if (this.#color) {
            return this.#color;
        }
        return getColorFromHsva(this.gamut, this.hsv);
    }
    #setColor(colorOrHsv, colorString, colorName, colorFormat, changeSource) {
        // It is important to do `undefined` check here since we want to update the
        // `colorStringInternal` to be empty specifically. The difference is:
        // * If we give `undefined` as an argument to this function, it means
        // we don't want to change `colorStringInternal`
        // * If we give "" as an argument to this funciton, it means
        // we want to clear the `colorStringInternal`.
        if (colorString !== undefined) {
            this.#colorString = colorString;
        }
        if (colorFormat !== undefined) {
            this.colorFormat = convertColorFormat(colorFormat);
            this.gamut = doesFormatSupportDisplayP3(this.colorFormat) ? "display-p3" /* SpectrumGamut.DISPLAY_P3 */ : "srgb" /* SpectrumGamut.SRGB */;
        }
        // For decreasing the conversion errors, if a color is given as is
        // we're storing it in `colorInternal` and using it properly.
        // Otherwise, if an `HSV` is given, we're discarding the `colorInternal`
        // and keeping HSV values as the source of truth.
        // This logic enables us to
        // * Keep color picker and the reflected color consistent (ex: lch(100 55.30 34.40) is
        //   shown with values 100, 55.30 and 34.40). If we were to get `HSV` from it
        //   and convert that HSV to `lch` color when needed, it might have resulted in rounding errors
        //   where color picker shows inconsistent values (i.e. inputs) with the selected color.
        // * Allow `HSV` values to be set independently from the color it represents.
        //   for example, lch(100 0 50) and lch(100 0 30) represents the same colors (both white)
        //   and hue component is powerless. This results in converted `h` in `hsv` to be
        //   0 as well. Meaning that, when the user comes to white, the hue will be reset to
        //   `0` which will change the state of the color picker unintentionally.
        if (Array.isArray(colorOrHsv)) {
            this.#color = undefined;
            this.hsv = colorOrHsv;
        }
        else if (colorOrHsv !== undefined) {
            this.#color = colorOrHsv;
            const oldHue = this.hsv ? this.hsv[0] : null;
            this.hsv = getHsvFromColor(this.gamut, colorOrHsv);
            // When the hue is powerless in lch color space
            // its `h` is directly set to 0 which results in
            // hue in hsv representation being 0 too.
            // For that case, we don't want to update the
            // hue slider of the color picker to keep its state consistent.
            // Otherwise, when the hue slider is set in the middle and the user
            // drags the cursor to the left most line (where c is 0)
            // it will reset hue slider of color picker to be 0 too and we don't want this.
            // The reason we convert to LCH instead of HSL to check hue's powerlessness is that
            // we don't want the color to be clipped for doing this check.
            if (oldHue !== null && colorOrHsv.as("lch" /* Common.Color.Format.LCH */).isHuePowerless()) {
                this.hsv[0] = oldHue;
            }
        }
        this.#colorName = colorName;
        if (this.contrastInfo) {
            this.contrastInfo.setColor(Common.Color.Legacy.fromHSVA(this.hsv), this.colorFormat);
        }
        this.updateHelperLocations();
        this.updateUI();
        if (changeSource !== ChangeSource.Input) {
            this.updateInput();
        }
        if (changeSource !== ChangeSource.Model) {
            this.dispatchEventToListeners("ColorChanged" /* Events.COLOR_CHANGED */, this.colorString());
        }
    }
    colorName() {
        return this.#colorName;
    }
    colorString() {
        // If the `colorStringInternal` exists and
        // if it is not an empty string, we will show that.
        // Empty string check is important here since we use
        // that to point that the colorStringInternal is cleared
        // and should not be used.
        if (this.#colorString) {
            return this.#colorString;
        }
        const color = this.color;
        let colorString = this.colorFormat && this.colorFormat !== color.format() ?
            color.asString(this.colorFormat) :
            (color.getAuthoredText() ?? color.asString());
        if (colorString) {
            return colorString;
        }
        if (this.colorFormat === "hex" /* Common.Color.Format.HEX */) {
            colorString = color.asString("hexa" /* Common.Color.Format.HEXA */);
        }
        else if (this.colorFormat === "hsl" /* Common.Color.Format.HSL */) {
            colorString = color.asString("hsla" /* Common.Color.Format.HSLA */);
        }
        else if (this.colorFormat === "hwb" /* Common.Color.Format.HWB */) {
            colorString = color.asString("hwba" /* Common.Color.Format.HWBA */);
        }
        else {
            colorString = color.asString("rgba" /* Common.Color.Format.RGBA */);
        }
        console.assert(Boolean(colorString));
        return colorString || '';
    }
    updateHelperLocations() {
        const h = this.hsv[0];
        const s = this.hsv[1];
        const v = this.hsv[2];
        const alpha = this.hsv[3];
        // Where to show the little circle that displays your current selected color.
        this.dragX = s * this.dragWidth;
        this.dragY = this.dragHeight - (v * this.dragHeight);
        const dragX = Math.max(-this.colorDragElementHeight, Math.min(this.dragWidth - this.colorDragElementHeight, this.dragX - this.colorDragElementHeight));
        const dragY = Math.max(-this.colorDragElementHeight, Math.min(this.dragHeight - this.colorDragElementHeight, this.dragY - this.colorDragElementHeight));
        this.colorDragElement.positionAt(dragX, dragY);
        // Where to show the bar that displays your current selected hue.
        const hueSlideX = (1 - h) * this.hueAlphaWidth - this.slideHelperWidth;
        this.hueSlider.style.left = hueSlideX + 'px';
        const alphaSlideX = alpha * this.hueAlphaWidth - this.slideHelperWidth;
        this.alphaSlider.style.left = alphaSlideX + 'px';
    }
    updateInput() {
        if (this.colorFormat === "hex" /* Common.Color.Format.HEX */) {
            this.hexContainer.hidden = false;
            this.displayContainer.hidden = true;
            this.hexValue.value =
                this.color.asString((this.color.alpha ?? 1) !== 1 ? "hexa" /* Common.Color.Format.HEXA */ : "hex" /* Common.Color.Format.HEX */);
        }
        else {
            // RGBA, HSLA, HWBA, color() display.
            this.hexContainer.hidden = true;
            this.displayContainer.hidden = false;
            const spec = colorFormatSpec[this.colorFormat];
            const colorValues = spec.toValues(this.color);
            this.textLabels.textContent = spec.label;
            for (let i = 0; i < this.textValues.length; ++i) {
                UI.ARIAUtils.setLabel(this.textValues[i], 
                /** R in RGBA */ i18nString(UIStrings.sInS, {
                    PH1: this.textLabels.textContent.charAt(i),
                    PH2: this.textLabels.textContent,
                }));
                this.textValues[i].value = String(colorValues[i]);
            }
        }
    }
    hideSrgbOverlay() {
        if (this.colorElement.contains(this.srgbOverlay)) {
            this.colorElement.removeChild(this.srgbOverlay);
        }
    }
    showSrgbOverlay() {
        if ((this.contrastDetails?.expanded()) || this.gamut !== "display-p3" /* SpectrumGamut.DISPLAY_P3 */) {
            return;
        }
        void this.srgbOverlay.render({
            hue: this.hsv[0],
            width: this.dragWidth,
            height: this.dragHeight,
        });
        if (!this.colorElement.contains(this.srgbOverlay)) {
            this.colorElement.appendChild(this.srgbOverlay);
        }
    }
    updateSrgbOverlay() {
        if (this.gamut === "display-p3" /* SpectrumGamut.DISPLAY_P3 */) {
            this.showSrgbOverlay();
        }
        else {
            this.hideSrgbOverlay();
        }
    }
    updateUI() {
        this.colorElement.style.backgroundColor = getColorFromHsva(this.gamut, [this.hsv[0], 1, 1, 1]).asString();
        if (this.contrastOverlay) {
            this.contrastOverlay.setDimensions(this.dragWidth, this.dragHeight);
        }
        this.updateSrgbOverlay();
        this.swatch.setColor(this.color, this.colorString());
        this.colorDragElement.style.backgroundColor = this.color.asString("lch" /* Common.Color.Format.LCH */);
        const noAlpha = Common.Color.Legacy.fromHSVA(this.hsv.slice(0, 3).concat(1));
        this.alphaElementBackground.style.backgroundImage = Platform.StringUtilities.sprintf('linear-gradient(to right, rgba(0,0,0,0), %s)', noAlpha.asString("lch" /* Common.Color.Format.LCH */));
        this.hueElement.classList.toggle('display-p3', doesFormatSupportDisplayP3(this.colorFormat));
    }
    async showFormatPicker(event) {
        const contextMenu = new FormatPickerContextMenu(this.color);
        this.isFormatPickerShown = true;
        await contextMenu.show(event, newColor => {
            this.#setColor(newColor, undefined, undefined, newColor.format(), ChangeSource.Other);
        });
        this.isFormatPickerShown = false;
    }
    /**
     * If the pasted input is parsable as a color, applies it converting to the current user format
     */
    pasted(event) {
        if (!event.clipboardData) {
            return;
        }
        const text = event.clipboardData.getData('text');
        const color = Common.Color.parse(text);
        if (!color) {
            return;
        }
        this.#setColor(color, text, undefined /* colorName */, undefined /* colorFormat */, ChangeSource.Other);
        event.preventDefault();
    }
    #getValueSteppingForInput(element) {
        const channel = this.color.channels[this.textValues.indexOf(element)];
        switch (channel) {
            case "r" /* Common.Color.ColorChannel.R */:
            case "g" /* Common.Color.ColorChannel.G */:
            case "b" /* Common.Color.ColorChannel.B */:
                return this.color instanceof Common.Color.ColorFunction ? { step: .01, range: { min: 0, max: 1 } } :
                    { step: 1, range: { min: 0, max: 255 } };
            case "alpha" /* Common.Color.ColorChannel.ALPHA */:
            case "x" /* Common.Color.ColorChannel.X */:
            case "y" /* Common.Color.ColorChannel.Y */:
            case "z" /* Common.Color.ColorChannel.Z */:
                return { step: .01, range: { min: 0, max: 1 } };
            default:
                return undefined;
        }
    }
    inputChanged(event) {
        const inputElement = event.currentTarget;
        const newValue = UI.UIUtils.createReplacementString(inputElement.value, event, undefined, this.#getValueSteppingForInput(inputElement));
        if (newValue) {
            inputElement.value = newValue;
            inputElement.selectionStart = 0;
            inputElement.selectionEnd = newValue.length;
            event.consume(true);
        }
        let color = null;
        let colorFormat;
        if (this.colorFormat === "hex" /* Common.Color.Format.HEX */) {
            color = Common.Color.parse(this.hexValue.value);
        }
        else {
            const spec = colorFormatSpec[this.colorFormat];
            const colorTextValues = this.textValues.map(element => element.value);
            if (colorTextValues.length !== 4) {
                // Somehow the `textValues` array updated to contain more elements
                // This shouldn't happen.
                return;
            }
            // Since we know that `textValues` is an array with 4 elements we're safe
            // to assert that `colorTextValues` is an array with 4 strings.
            color = spec.fromValues(colorTextValues);
        }
        if (!color) {
            return;
        }
        this.#setColor(color, undefined, undefined /* colorName */, colorFormat, ChangeSource.Input);
    }
    wasShown() {
        super.wasShown();
        this.hueAlphaWidth = this.hueElement.offsetWidth;
        this.slideHelperWidth = this.hueSlider.offsetWidth / 2;
        this.dragWidth = this.colorElement.offsetWidth;
        this.dragHeight = this.colorElement.offsetHeight;
        this.colorDragElementHeight = this.colorDragElement.offsetHeight / 2;
        this.#setColor(undefined, undefined, undefined /* colorName */, undefined, ChangeSource.Model);
        // When flag is turned on, eye dropper is not turned on by default.
        // This is because the global change of the cursor into a dropper will disturb the user.
        if (!IS_NATIVE_EYE_DROPPER_AVAILABLE) {
            void this.toggleColorPicker(true);
        }
        else {
            this.colorPickerButton.setToggled(false);
        }
        if (this.contrastDetails && this.contrastDetailsBackgroundColorPickerToggledBound) {
            this.contrastDetails.addEventListener("BackgroundColorPickerWillBeToggled" /* ContrastDetailsEvents.BACKGROUND_COLOR_PICKER_WILL_BE_TOGGLED */, this.contrastDetailsBackgroundColorPickerToggledBound);
        }
    }
    willHide() {
        super.willHide();
        void this.toggleColorPicker(false);
        if (this.contrastDetails && this.contrastDetailsBackgroundColorPickerToggledBound) {
            this.contrastDetails.removeEventListener("BackgroundColorPickerWillBeToggled" /* ContrastDetailsEvents.BACKGROUND_COLOR_PICKER_WILL_BE_TOGGLED */, this.contrastDetailsBackgroundColorPickerToggledBound);
        }
    }
    async toggleColorPicker(enabled) {
        if (enabled === undefined) {
            enabled = this.colorPickerButton.isToggled();
        }
        // This is to make sure that only one picker is open at a time (enabled is true) and
        // the background color picker gets dismissed whenever the popup is closed by an Esc (enabled is false).
        // Also have a look at this.contrastDetailsBackgroundColorPickedToggled.
        if (this.contrastDetails?.backgroundColorPickerEnabled()) {
            this.contrastDetails.toggleBackgroundColorPicker(false);
        }
        // With the old color picker, colors can only be picked up within the page.
        if (!IS_NATIVE_EYE_DROPPER_AVAILABLE) {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.setEyeDropperActive(enabled);
            if (enabled) {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.colorPickedBound);
            }
            else {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.colorPickedBound);
            }
        }
        else if (IS_NATIVE_EYE_DROPPER_AVAILABLE && enabled) {
            // Use EyeDropper API, can pick up colors outside the browser window,
            // Note: The current EyeDropper API is not designed to pick up colors continuously.
            const eyeDropper = new window.EyeDropper();
            this.eyeDropperAbortController = new AbortController();
            try {
                const hexColor = await eyeDropper.open({ signal: this.eyeDropperAbortController.signal });
                const color = Common.Color.parse(hexColor.sRGBHex);
                this.#setColor(color ?? undefined, '', undefined /* colorName */, undefined, ChangeSource.Other);
            }
            catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(error);
                }
            }
            this.colorPickerButton.setToggled(false);
        }
        else if (IS_NATIVE_EYE_DROPPER_AVAILABLE && !enabled) {
            this.eyeDropperAbortController?.abort();
            this.eyeDropperAbortController = null;
        }
    }
    colorPicked({ data: rgbColor, }) {
        const rgba = [rgbColor.r, rgbColor.g, rgbColor.b, (rgbColor.a / 2.55 | 0) / 100];
        const color = Common.Color.Legacy.fromRGBA(rgba);
        this.#setColor(color, '', undefined /* colorName */, undefined, ChangeSource.Other);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
    }
}
export const ChangeSource = {
    Input: 'Input',
    Model: 'Model',
    Other: 'Other',
};
const COLOR_CHIP_SIZE = 24;
const ITEMS_PER_PALETTE_ROW = 8;
const GeneratedPaletteTitle = 'Page colors';
export class PaletteGenerator {
    callback;
    frequencyMap = new Map();
    constructor(callback) {
        this.callback = callback;
        const stylesheetPromises = [];
        for (const cssModel of SDK.TargetManager.TargetManager.instance().models(SDK.CSSModel.CSSModel)) {
            for (const stylesheet of cssModel.allStyleSheets()) {
                stylesheetPromises.push(this.processStylesheet(stylesheet));
            }
        }
        void Promise.all(stylesheetPromises)
            .catch(error => {
            console.error(error);
        })
            .then(this.finish.bind(this));
    }
    frequencyComparator(a, b) {
        return this.frequencyMap.get(b) - this.frequencyMap.get(a);
    }
    finish() {
        function hueComparator(a, b) {
            const hsva = paletteColors.get(a).as("hsl" /* Common.Color.Format.HSL */).hsva();
            const hsvb = paletteColors.get(b).as("hsl" /* Common.Color.Format.HSL */).hsva();
            // First trim the shades of gray
            if (hsvb[1] < 0.12 && hsva[1] < 0.12) {
                return hsvb[2] * hsvb[3] - hsva[2] * hsva[3];
            }
            if (hsvb[1] < 0.12) {
                return -1;
            }
            if (hsva[1] < 0.12) {
                return 1;
            }
            // Equal hue -> sort by sat
            if (hsvb[0] === hsva[0]) {
                return hsvb[1] * hsvb[3] - hsva[1] * hsva[3];
            }
            return (hsvb[0] + 0.94) % 1 - (hsva[0] + 0.94) % 1;
        }
        let colors = [...this.frequencyMap.keys()];
        colors = colors.sort(this.frequencyComparator.bind(this));
        const paletteColors = new Map();
        const colorsPerRow = 24;
        while (paletteColors.size < colorsPerRow && colors.length) {
            const colorText = colors.shift();
            const color = Common.Color.parse(colorText);
            if (!color) {
                continue;
            }
            paletteColors.set(colorText, color);
        }
        this.callback({
            title: GeneratedPaletteTitle,
            colors: [...paletteColors.keys()].sort(hueComparator),
            colorNames: [],
            mutable: false,
            matchUserFormat: undefined,
        });
    }
    async processStylesheet(stylesheet) {
        const contentDataOrError = await stylesheet.requestContentData();
        const text = TextUtils.ContentData.ContentData.textOr(contentDataOrError, '').toLowerCase();
        const regexResult = text.matchAll(/((?:rgb|hsl|hwb)a?\([^)]+\)|#[0-9a-f]{6}|#[0-9a-f]{3})/g);
        for (const { 0: c, index } of regexResult) {
            // Check whether the match occured in a property value and not in a property name or a selector by verifying
            // that there's no colon after the match and before the next semicolon.
            if (text.indexOf(';', index) < 0 ||
                text.indexOf(':', index) > -1 && text.indexOf(':', index) < text.indexOf(';', index)) {
                continue;
            }
            const frequency = 1 + (this.frequencyMap.get(c) ?? 0);
            this.frequencyMap.set(c, frequency);
        }
    }
}
const MaterialPaletteShades = new Map([
    [
        '#F44336',
        ['#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C'],
    ],
    [
        '#E91E63',
        ['#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#C2185B', '#AD1457', '#880E4F'],
    ],
    [
        '#9C27B0',
        ['#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#6A1B9A', '#4A148C'],
    ],
    [
        '#673AB7',
        ['#EDE7F6', '#D1C4E9', '#B39DDB', '#9575CD', '#7E57C2', '#673AB7', '#5E35B1', '#512DA8', '#4527A0', '#311B92'],
    ],
    [
        '#3F51B5',
        ['#E8EAF6', '#C5CAE9', '#9FA8DA', '#7986CB', '#5C6BC0', '#3F51B5', '#3949AB', '#303F9F', '#283593', '#1A237E'],
    ],
    [
        '#2196F3',
        ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1'],
    ],
    [
        '#03A9F4',
        ['#E1F5FE', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5', '#0288D1', '#0277BD', '#01579B'],
    ],
    [
        '#00BCD4',
        ['#E0F7FA', '#B2EBF2', '#80DEEA', '#4DD0E1', '#26C6DA', '#00BCD4', '#00ACC1', '#0097A7', '#00838F', '#006064'],
    ],
    [
        '#009688',
        ['#E0F2F1', '#B2DFDB', '#80CBC4', '#4DB6AC', '#26A69A', '#009688', '#00897B', '#00796B', '#00695C', '#004D40'],
    ],
    [
        '#4CAF50',
        ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20'],
    ],
    [
        '#8BC34A',
        ['#F1F8E9', '#DCEDC8', '#C5E1A5', '#AED581', '#9CCC65', '#8BC34A', '#7CB342', '#689F38', '#558B2F', '#33691E'],
    ],
    [
        '#CDDC39',
        ['#F9FBE7', '#F0F4C3', '#E6EE9C', '#DCE775', '#D4E157', '#CDDC39', '#C0CA33', '#AFB42B', '#9E9D24', '#827717'],
    ],
    [
        '#FFEB3B',
        ['#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#FBC02D', '#F9A825', '#F57F17'],
    ],
    [
        '#FFC107',
        ['#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F', '#FFCA28', '#FFC107', '#FFB300', '#FFA000', '#FF8F00', '#FF6F00'],
    ],
    [
        '#FF9800',
        ['#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#F57C00', '#EF6C00', '#E65100'],
    ],
    [
        '#FF5722',
        ['#FBE9E7', '#FFCCBC', '#FFAB91', '#FF8A65', '#FF7043', '#FF5722', '#F4511E', '#E64A19', '#D84315', '#BF360C'],
    ],
    [
        '#795548',
        ['#EFEBE9', '#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63', '#795548', '#6D4C41', '#5D4037', '#4E342E', '#3E2723'],
    ],
    [
        '#9E9E9E',
        ['#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161', '#424242', '#212121'],
    ],
    [
        '#607D8B',
        ['#ECEFF1', '#CFD8DC', '#B0BEC5', '#90A4AE', '#78909C', '#607D8B', '#546E7A', '#455A64', '#37474F', '#263238'],
    ],
]);
export const MaterialPalette = {
    title: 'Material',
    mutable: false,
    matchUserFormat: true,
    colors: [...MaterialPaletteShades.keys()],
    colorNames: [],
};
export class Swatch {
    colorString;
    swatchInnerElement;
    swatchOverlayElement;
    swatchCopyIcon;
    constructor(parentElement) {
        const swatchElement = parentElement.createChild('span', 'swatch');
        swatchElement.setAttribute('jslog', `${VisualLogging.action('copy-color').track({ click: true })}`);
        this.swatchInnerElement = swatchElement.createChild('span', 'swatch-inner');
        this.swatchOverlayElement = swatchElement.createChild('span', 'swatch-overlay');
        UI.ARIAUtils.markAsButton(this.swatchOverlayElement);
        UI.ARIAUtils.setPressed(this.swatchOverlayElement, false);
        this.swatchOverlayElement.tabIndex = 0;
        self.onInvokeElement(this.swatchOverlayElement, this.onCopyText.bind(this));
        this.swatchOverlayElement.addEventListener('mouseout', this.onCopyIconMouseout.bind(this));
        this.swatchOverlayElement.addEventListener('blur', this.onCopyIconMouseout.bind(this));
        this.swatchCopyIcon = IconButton.Icon.create('copy', 'copy-color-icon');
        UI.Tooltip.Tooltip.install(this.swatchCopyIcon, i18nString(UIStrings.copyColorToClipboard));
        this.swatchOverlayElement.appendChild(this.swatchCopyIcon);
        UI.ARIAUtils.setLabel(this.swatchOverlayElement, this.swatchCopyIcon.title);
    }
    setColor(color, colorString) {
        const lchColor = color.as("lch" /* Common.Color.Format.LCH */);
        this.swatchInnerElement.style.backgroundColor = lchColor.asString();
        // Show border if the swatch is white.
        this.swatchInnerElement.classList.toggle('swatch-inner-white', lchColor.l > 90);
        this.colorString = colorString || null;
        if (colorString) {
            this.swatchOverlayElement.hidden = false;
        }
        else {
            this.swatchOverlayElement.hidden = true;
        }
    }
    onCopyText(event) {
        this.swatchCopyIcon.name = 'checkmark';
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.colorString);
        UI.ARIAUtils.setPressed(this.swatchOverlayElement, true);
        event.consume();
    }
    onCopyIconMouseout() {
        this.swatchCopyIcon.name = 'copy';
        UI.ARIAUtils.setPressed(this.swatchOverlayElement, false);
    }
}
//# sourceMappingURL=Spectrum.js.map