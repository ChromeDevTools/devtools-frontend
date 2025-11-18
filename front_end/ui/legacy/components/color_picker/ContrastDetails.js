// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../legacy.js';
import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Root from '../../../../core/root/root.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import * as UIHelpers from '../../../helpers/helpers.js';
import * as UI from '../../legacy.js';
const UIStrings = {
    /**
     * @description Label for when no contrast information is available in the color picker
     */
    noContrastInformationAvailable: 'No contrast information available',
    /**
     * @description Text of a DOM element in Contrast Details of the Color Picker
     */
    contrastRatio: 'Contrast ratio',
    /**
     * @description Text to show more content
     */
    showMore: 'Show more',
    /**
     * @description Choose bg color text content in Contrast Details of the Color Picker
     */
    pickBackgroundColor: 'Pick background color',
    /**
     * @description Tooltip text that appears when hovering over largeicon eyedropper button in Contrast Details of the Color Picker
     */
    toggleBackgroundColorPicker: 'Toggle background color picker',
    /**
     * @description Text of a button in Contrast Details of the Color Picker
     * @example {rgba(0 0 0 / 100%) } PH1
     */
    useSuggestedColorStoFixLow: 'Use suggested color {PH1}to fix low contrast',
    /**
     * @description Label for the APCA contrast in Color Picker
     */
    apca: 'APCA',
    /**
     * @description Label aa text content in Contrast Details of the Color Picker
     */
    aa: 'AA',
    /**
     * @description Text that starts with a colon and includes a placeholder
     * @example {3.0} PH1
     */
    placeholderWithColon: ': {PH1}',
    /**
     * @description Label aaa text content in Contrast Details of the Color Picker
     */
    aaa: 'AAA',
    /**
     * @description Text to show less content
     */
    showLess: 'Show less',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/color_picker/ContrastDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ContrastDetails extends Common.ObjectWrapper.ObjectWrapper {
    contrastInfo;
    #element;
    toggleMainColorPicker;
    expandedChangedCallback;
    colorSelectedCallback;
    #expanded;
    passesAA;
    contrastUnknown;
    #visible;
    noContrastInfoAvailable;
    contrastValueBubble;
    contrastValue;
    contrastValueBubbleIcons;
    expandButton;
    expandedDetails;
    contrastThresholds;
    contrastAA;
    contrastPassFailAA;
    contrastAAA;
    contrastPassFailAAA;
    contrastAPCA;
    contrastPassFailAPCA;
    chooseBgColor;
    bgColorPickerButton;
    bgColorPickedBound;
    bgColorSwatch;
    constructor(contrastInfo, contentElement, toggleMainColorPickerCallback, expandedChangedCallback, colorSelectedCallback) {
        super();
        this.contrastInfo = contrastInfo;
        this.#element = contentElement.createChild('div', 'spectrum-contrast-details collapsed');
        this.toggleMainColorPicker = toggleMainColorPickerCallback;
        this.expandedChangedCallback = expandedChangedCallback;
        this.colorSelectedCallback = colorSelectedCallback;
        this.#expanded = false;
        this.passesAA = true;
        this.contrastUnknown = false;
        // This will not be visible if we don't get ContrastInfo,
        // e.g. for a non-font color property such as border-color.
        this.#visible = false;
        // No contrast info message is created to show if it's not possible to provide the extended details.
        this.noContrastInfoAvailable = contentElement.createChild('div', 'no-contrast-info-available');
        this.noContrastInfoAvailable.textContent = i18nString(UIStrings.noContrastInformationAvailable);
        this.noContrastInfoAvailable.classList.add('hidden');
        const contrastValueRow = this.#element.createChild('div');
        contrastValueRow.addEventListener('click', this.topRowClicked.bind(this));
        const contrastValueRowContents = contrastValueRow.createChild('div', 'container');
        UI.UIUtils.createTextChild(contrastValueRowContents, i18nString(UIStrings.contrastRatio));
        this.contrastValueBubble = contrastValueRowContents.createChild('span', 'contrast-details-value');
        this.contrastValue = this.contrastValueBubble.createChild('span');
        this.contrastValueBubbleIcons = [];
        this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create('checkmark')));
        this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create('check-double')));
        this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create('clear')));
        this.contrastValueBubbleIcons.forEach(button => button.addEventListener('click', (event) => {
            ContrastDetails.showHelp();
            event.consume(false);
        }));
        const expandToolbar = contrastValueRowContents.createChild('devtools-toolbar', 'expand');
        this.expandButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showMore), 'chevron-down');
        this.expandButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.expandButtonClicked.bind(this));
        UI.ARIAUtils.setExpanded(this.expandButton.element, false);
        expandToolbar.appendToolbarItem(this.expandButton);
        this.expandedDetails = this.#element.createChild('div', 'expanded-details');
        UI.ARIAUtils.setControls(this.expandButton.element, this.expandedDetails);
        this.contrastThresholds = this.expandedDetails.createChild('div', 'contrast-thresholds');
        this.contrastAA = this.contrastThresholds.createChild('div', 'contrast-threshold');
        this.contrastPassFailAA = this.contrastAA.createChild('div', 'contrast-pass-fail');
        this.contrastAAA = this.contrastThresholds.createChild('div', 'contrast-threshold');
        this.contrastPassFailAAA = this.contrastAAA.createChild('div', 'contrast-pass-fail');
        this.contrastAPCA = this.contrastThresholds.createChild('div', 'contrast-threshold');
        this.contrastPassFailAPCA = this.contrastAPCA.createChild('div', 'contrast-pass-fail');
        this.chooseBgColor = this.expandedDetails.createChild('div', 'contrast-choose-bg-color');
        this.chooseBgColor.textContent = i18nString(UIStrings.pickBackgroundColor);
        const bgColorContainer = this.expandedDetails.createChild('div', 'background-color');
        const pickerToolbar = bgColorContainer.createChild('devtools-toolbar', 'spectrum-eye-dropper');
        this.bgColorPickerButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleBackgroundColorPicker), 'color-picker', 'color-picker-filled');
        this.bgColorPickerButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.#toggleBackgroundColorPicker.bind(this, undefined, true));
        pickerToolbar.appendToolbarItem(this.bgColorPickerButton);
        this.bgColorPickedBound = this.bgColorPicked.bind(this);
        this.bgColorSwatch = new Swatch(bgColorContainer);
        this.contrastInfo.addEventListener("ContrastInfoUpdated" /* ContrastInfoEvents.CONTRAST_INFO_UPDATED */, this.update.bind(this));
    }
    showNoContrastInfoAvailableMessage() {
        this.noContrastInfoAvailable.classList.remove('hidden');
    }
    hideNoContrastInfoAvailableMessage() {
        this.noContrastInfoAvailable.classList.add('hidden');
    }
    computeSuggestedColor(threshold) {
        const fgColor = this.contrastInfo.color();
        const bgColor = this.contrastInfo.bgColor();
        if (!fgColor || !bgColor) {
            return;
        }
        if (threshold === 'APCA') {
            const requiredContrast = this.contrastInfo.contrastRatioAPCAThreshold();
            if (requiredContrast === null) {
                return;
            }
            // We add 1% to the min required contrast to make sure we are over the limit.
            return Common.Color.findFgColorForContrastAPCA(fgColor, bgColor, requiredContrast + 1);
        }
        const requiredContrast = this.contrastInfo.contrastRatioThreshold(threshold);
        if (!requiredContrast) {
            return;
        }
        // We add a bit to the required contrast to make sure we are over the limit.
        return Common.Color.findFgColorForContrast(fgColor, bgColor, requiredContrast + 0.1);
    }
    onSuggestColor(threshold) {
        const color = this.computeSuggestedColor(threshold);
        if (color) {
            this.colorSelectedCallback(color);
        }
    }
    createFixColorButton(parent, suggestedColor) {
        const button = parent.createChild('button', 'contrast-fix-button');
        const formattedColor = suggestedColor.asString(this.contrastInfo.colorFormat());
        const suggestedColorString = formattedColor ? formattedColor + ' ' : '';
        const label = i18nString(UIStrings.useSuggestedColorStoFixLow, { PH1: suggestedColorString });
        UI.ARIAUtils.setLabel(button, label);
        UI.Tooltip.Tooltip.install(button, label);
        button.tabIndex = 0;
        button.style.backgroundColor = suggestedColorString;
        return button;
    }
    update() {
        if (this.contrastInfo.isNull()) {
            this.showNoContrastInfoAvailableMessage();
            this.setVisible(false);
            return;
        }
        this.setVisible(true);
        this.hideNoContrastInfoAvailableMessage();
        const isAPCAEnabled = Root.Runtime.experiments.isEnabled('apca');
        const fgColor = this.contrastInfo.color();
        const bgColor = this.contrastInfo.bgColor();
        if (isAPCAEnabled) {
            const apcaContrastRatio = this.contrastInfo.contrastRatioAPCA();
            if (apcaContrastRatio === null || !bgColor || !fgColor) {
                this.contrastUnknown = true;
                this.contrastValue.textContent = '';
                this.contrastValueBubble.classList.add('contrast-unknown');
                this.chooseBgColor.classList.remove('hidden');
                this.contrastThresholds.classList.add('hidden');
                this.showNoContrastInfoAvailableMessage();
                return;
            }
            this.contrastUnknown = false;
            this.chooseBgColor.classList.add('hidden');
            this.contrastThresholds.classList.remove('hidden');
            this.contrastValueBubble.classList.remove('contrast-unknown');
            this.contrastValue.textContent = `${Platform.NumberUtilities.floor(apcaContrastRatio, 2)}%`;
            const apcaThreshold = this.contrastInfo.contrastRatioAPCAThreshold();
            const passesAPCA = apcaContrastRatio && apcaThreshold ? Math.abs(apcaContrastRatio) >= apcaThreshold : false;
            this.contrastPassFailAPCA.removeChildren();
            const labelAPCA = this.contrastPassFailAPCA.createChild('span', 'contrast-link-label');
            labelAPCA.textContent = i18nString(UIStrings.apca);
            if (apcaThreshold !== null) {
                this.contrastPassFailAPCA.createChild('span').textContent = `: ${apcaThreshold.toFixed(2)}%`;
            }
            if (passesAPCA) {
                const iconCheckmark = createIconCheckmark();
                this.contrastPassFailAPCA.appendChild(iconCheckmark);
            }
            else {
                const iconNo = createIconNo();
                this.contrastPassFailAPCA.appendChild(iconNo);
                const suggestedColor = this.computeSuggestedColor('APCA');
                if (suggestedColor) {
                    const fixAPCA = this.createFixColorButton(this.contrastPassFailAPCA, suggestedColor);
                    fixAPCA.addEventListener('click', () => this.onSuggestColor('APCA'));
                }
            }
            labelAPCA.addEventListener('click', (_event) => ContrastDetails.showHelp());
            this.#element.classList.toggle('contrast-fail', !passesAPCA);
            this.contrastValueBubble.classList.toggle('contrast-aa', passesAPCA);
            this.bgColorSwatch.setColors(fgColor, bgColor);
            return;
        }
        const contrastRatio = this.contrastInfo.contrastRatio();
        if (!contrastRatio || !bgColor || !fgColor) {
            this.contrastUnknown = true;
            this.contrastValue.textContent = '';
            this.contrastValueBubble.classList.add('contrast-unknown');
            this.chooseBgColor.classList.remove('hidden');
            this.contrastThresholds.classList.add('hidden');
            this.showNoContrastInfoAvailableMessage();
            return;
        }
        this.contrastUnknown = false;
        this.chooseBgColor.classList.add('hidden');
        this.contrastThresholds.classList.remove('hidden');
        this.contrastValueBubble.classList.remove('contrast-unknown');
        this.contrastValue.textContent = String(Platform.NumberUtilities.floor(contrastRatio, 2));
        this.bgColorSwatch.setColors(fgColor, bgColor);
        // In greater then comparisons we can substite null with 0.
        const aa = this.contrastInfo.contrastRatioThreshold('aa') || 0;
        this.passesAA = (this.contrastInfo.contrastRatio() || 0) >= aa;
        this.contrastPassFailAA.removeChildren();
        const labelAA = this.contrastPassFailAA.createChild('span', 'contrast-link-label');
        labelAA.textContent = i18nString(UIStrings.aa);
        this.contrastPassFailAA.createChild('span').textContent =
            i18nString(UIStrings.placeholderWithColon, { PH1: aa.toFixed(1) });
        if (this.passesAA) {
            const iconCheckmark = createIconCheckmark();
            this.contrastPassFailAA.appendChild(iconCheckmark);
        }
        else {
            const iconNo = createIconNo();
            this.contrastPassFailAA.appendChild(iconNo);
            const suggestedColor = this.computeSuggestedColor('aa');
            if (suggestedColor) {
                const fixAA = this.createFixColorButton(this.contrastPassFailAA, suggestedColor);
                fixAA.addEventListener('click', () => this.onSuggestColor('aa'));
            }
        }
        // In greater then comparisons we can substite null with 0.
        const aaa = this.contrastInfo.contrastRatioThreshold('aaa') || 0;
        const passesAAA = (this.contrastInfo.contrastRatio() || 0) >= aaa;
        this.contrastPassFailAAA.removeChildren();
        const labelAAA = this.contrastPassFailAAA.createChild('span', 'contrast-link-label');
        labelAAA.textContent = i18nString(UIStrings.aaa);
        this.contrastPassFailAAA.createChild('span').textContent =
            i18nString(UIStrings.placeholderWithColon, { PH1: aaa.toFixed(1) });
        if (passesAAA) {
            const iconCheckmark = createIconCheckmark();
            this.contrastPassFailAAA.appendChild(iconCheckmark);
        }
        else {
            const iconNo = createIconNo();
            this.contrastPassFailAAA.appendChild(iconNo);
            const suggestedColor = this.computeSuggestedColor('aaa');
            if (suggestedColor) {
                const fixAAA = this.createFixColorButton(this.contrastPassFailAAA, suggestedColor);
                fixAAA.addEventListener('click', () => this.onSuggestColor('aaa'));
            }
        }
        [labelAA, labelAAA].forEach(e => e.addEventListener('click', () => ContrastDetails.showHelp()));
        this.#element.classList.toggle('contrast-fail', !this.passesAA);
        // show checkmark icon when passes AA, but not AAA
        this.contrastValueBubble.classList.toggle('contrast-aa', this.passesAA && !passesAAA);
        this.contrastValueBubble.classList.toggle('contrast-aaa', passesAAA);
    }
    static showHelp() {
        UIHelpers.openInNewTab('https://web.dev/color-and-contrast-accessibility/');
    }
    setVisible(visible) {
        this.#visible = visible;
        this.#element.classList.toggle('hidden', !visible);
    }
    visible() {
        return this.#visible;
    }
    element() {
        return this.#element;
    }
    expandButtonClicked() {
        const selection = this.contrastValueBubble.getComponentSelection();
        if (selection) {
            selection.empty();
        }
        this.toggleExpanded();
    }
    topRowClicked(event) {
        const selection = this.contrastValueBubble.getComponentSelection();
        if (selection) {
            selection.empty();
        }
        this.toggleExpanded();
        event.consume(true);
    }
    toggleExpanded() {
        this.#expanded = !this.#expanded;
        UI.ARIAUtils.setExpanded(this.expandButton.element, this.#expanded);
        this.#element.classList.toggle('collapsed', !this.#expanded);
        if (this.#expanded) {
            this.toggleMainColorPicker(false);
            this.expandButton.setGlyph('chevron-up');
            this.expandButton.setTitle(i18nString(UIStrings.showLess));
            if (this.contrastUnknown) {
                this.#toggleBackgroundColorPicker(true);
            }
        }
        else {
            this.#toggleBackgroundColorPicker(false);
            this.expandButton.setGlyph('chevron-down');
            this.expandButton.setTitle(i18nString(UIStrings.showMore));
        }
        this.expandedChangedCallback();
    }
    collapse() {
        this.#element.classList.remove('expanded');
        this.#toggleBackgroundColorPicker(false);
        this.toggleMainColorPicker(false);
    }
    expanded() {
        return this.#expanded;
    }
    backgroundColorPickerEnabled() {
        return this.bgColorPickerButton.isToggled();
    }
    toggleBackgroundColorPicker(enabled) {
        this.#toggleBackgroundColorPicker(enabled, false);
    }
    #toggleBackgroundColorPicker(enabled, shouldTriggerEvent = true) {
        if (enabled === undefined) {
            enabled = this.bgColorPickerButton.isToggled();
        }
        if (shouldTriggerEvent) {
            this.dispatchEventToListeners("BackgroundColorPickerWillBeToggled" /* Events.BACKGROUND_COLOR_PICKER_WILL_BE_TOGGLED */, enabled);
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.setEyeDropperActive(enabled);
        if (enabled) {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.bgColorPickedBound);
        }
        else {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.bgColorPickedBound);
        }
    }
    bgColorPicked({ data: rgbColor, }) {
        const rgba = [rgbColor.r, rgbColor.g, rgbColor.b, (rgbColor.a / 2.55 | 0) / 100];
        const color = Common.Color.Legacy.fromRGBA(rgba);
        this.contrastInfo.setBgColor(color);
        this.#toggleBackgroundColorPicker(false);
        this.bgColorPickerButton.toggled(false);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
    }
}
export class Swatch {
    swatchElement;
    swatchInnerElement;
    textPreview;
    constructor(parentElement) {
        this.swatchElement = parentElement.createChild('span', 'swatch contrast swatch-inner-white');
        this.swatchInnerElement = this.swatchElement.createChild('span', 'swatch-inner');
        this.textPreview = this.swatchElement.createChild('div', 'text-preview');
        this.textPreview.textContent = 'Aa';
    }
    setColors(fgColor, bgColor) {
        this.textPreview.style.color = fgColor.asString("rgba" /* Common.Color.Format.RGBA */);
        this.swatchInnerElement.style.backgroundColor = bgColor.asString("rgba" /* Common.Color.Format.RGBA */);
        // Show border if the swatch is white.
        this.swatchElement.classList.toggle('swatch-inner-white', bgColor.as("hsl" /* Common.Color.Format.HSL */).l > 0.9);
    }
}
function createIconCheckmark() {
    const icon = new IconButton.Icon.Icon();
    icon.name = 'checkmark';
    icon.style.color = 'var(--icon-checkmark-green)';
    icon.style.width = 'var(--sys-size-9)';
    icon.style.height = 'var(--sys-size-7)';
    return icon;
}
function createIconNo() {
    const icon = new IconButton.Icon.Icon();
    icon.name = 'clear';
    icon.style.color = 'var(--icon-error)';
    icon.classList.add('small');
    return icon;
}
//# sourceMappingURL=ContrastDetails.js.map