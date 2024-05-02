// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Root from '../../../../core/root/root.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';

import {type ContrastInfo, Events as ContrastInfoEvents} from './ContrastInfo.js';

const UIStrings = {
  /**
   *@description Label for when no contrast information is available in the color picker
   */
  noContrastInformationAvailable: 'No contrast information available',
  /**
   *@description Text of a DOM element in Contrast Details of the Color Picker
   */
  contrastRatio: 'Contrast ratio',
  /**
   *@description Text to show more content
   */
  showMore: 'Show more',
  /**
   *@description Choose bg color text content in Contrast Details of the Color Picker
   */
  pickBackgroundColor: 'Pick background color',
  /**
   *@description Tooltip text that appears when hovering over largeicon eyedropper button in Contrast Details of the Color Picker
   */
  toggleBackgroundColorPicker: 'Toggle background color picker',
  /**
   *@description Text of a button in Contrast Details of the Color Picker
   *@example {rgba(0 0 0 / 100%) } PH1
   */
  useSuggestedColorStoFixLow: 'Use suggested color {PH1}to fix low contrast',
  /**
   *@description Label for the APCA contrast in Color Picker
   */
  apca: 'APCA',
  /**
   *@description Label aa text content in Contrast Details of the Color Picker
   */
  aa: 'AA',
  /**
   *@description Text that starts with a colon and includes a placeholder
   *@example {3.0} PH1
   */
  placeholderWithColon: ': {PH1}',
  /**
   *@description Label aaa text content in Contrast Details of the Color Picker
   */
  aaa: 'AAA',
  /**
   *@description Text to show less content
   */
  showLess: 'Show less',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/color_picker/ContrastDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ContrastDetails extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private contrastInfo: ContrastInfo;
  private readonly elementInternal: HTMLElement;
  private readonly toggleMainColorPicker:
      (arg0?: boolean|undefined, arg1?: Common.EventTarget.EventTargetEvent<unknown>|undefined) => void;
  private readonly expandedChangedCallback: () => void;
  private readonly colorSelectedCallback: (arg0: Common.Color.Legacy) => void;
  private expandedInternal: boolean;
  private passesAA: boolean;
  private contrastUnknown: boolean;
  private visibleInternal: boolean;
  private readonly noContrastInfoAvailable: Element;
  private readonly contrastValueBubble: HTMLElement;
  private contrastValue: HTMLElement;
  private readonly contrastValueBubbleIcons: Node[];
  private readonly expandButton: UI.Toolbar.ToolbarButton;
  private readonly expandedDetails: HTMLElement;
  private readonly contrastThresholds: HTMLElement;
  private readonly contrastAA: HTMLElement;
  private contrastPassFailAA: HTMLElement;
  private readonly contrastAAA: HTMLElement;
  private contrastPassFailAAA: HTMLElement;
  private readonly contrastAPCA: HTMLElement;
  private contrastPassFailAPCA: HTMLElement;
  private readonly chooseBgColor: HTMLElement;
  private bgColorPickerButton: UI.Toolbar.ToolbarToggle;
  private readonly bgColorPickedBound:
      (event: Common.EventTarget.EventTargetEvent<Host.InspectorFrontendHostAPI.EyeDropperPickedColorEvent>) => void;
  private readonly bgColorSwatch: Swatch;
  constructor(
      contrastInfo: ContrastInfo, contentElement: Element,
      toggleMainColorPickerCallback:
          (arg0?: boolean|undefined, arg1?: Common.EventTarget.EventTargetEvent<unknown>|undefined) => void,
      expandedChangedCallback: () => void, colorSelectedCallback: (arg0: Common.Color.Legacy) => void) {
    super();
    this.contrastInfo = contrastInfo;
    this.elementInternal = contentElement.createChild('div', 'spectrum-contrast-details collapsed') as HTMLElement;

    this.toggleMainColorPicker = toggleMainColorPickerCallback;

    this.expandedChangedCallback = expandedChangedCallback;

    this.colorSelectedCallback = colorSelectedCallback;

    this.expandedInternal = false;

    this.passesAA = true;

    this.contrastUnknown = false;

    // This will not be visible if we don't get ContrastInfo,
    // e.g. for a non-font color property such as border-color.
    this.visibleInternal = false;

    // No contrast info message is created to show if it's not possible to provide the extended details.

    this.noContrastInfoAvailable = contentElement.createChild('div', 'no-contrast-info-available');
    this.noContrastInfoAvailable.textContent = i18nString(UIStrings.noContrastInformationAvailable);
    this.noContrastInfoAvailable.classList.add('hidden');

    const contrastValueRow = this.elementInternal.createChild('div');
    contrastValueRow.addEventListener('click', this.topRowClicked.bind(this));
    const contrastValueRowContents = contrastValueRow.createChild('div', 'container');
    UI.UIUtils.createTextChild(contrastValueRowContents, i18nString(UIStrings.contrastRatio));

    this.contrastValueBubble = contrastValueRowContents.createChild('span', 'contrast-details-value');
    this.contrastValue = this.contrastValueBubble.createChild('span');
    this.contrastValueBubbleIcons = [];
    this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create('checkmark')));
    this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create('check-double')));
    this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create('clear')));
    this.contrastValueBubbleIcons.forEach(button => button.addEventListener('click', (event: Event) => {
      ContrastDetails.showHelp();
      event.consume(false);
    }));

    const expandToolbar = new UI.Toolbar.Toolbar('expand', contrastValueRowContents);
    this.expandButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showMore), 'chevron-down');
    this.expandButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.expandButtonClicked.bind(this));
    UI.ARIAUtils.setExpanded(this.expandButton.element, false);
    expandToolbar.appendToolbarItem(this.expandButton);

    this.expandedDetails = this.elementInternal.createChild('div', 'expanded-details');
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

    const pickerToolbar = new UI.Toolbar.Toolbar('spectrum-eye-dropper', bgColorContainer);
    this.bgColorPickerButton = new UI.Toolbar.ToolbarToggle(
        i18nString(UIStrings.toggleBackgroundColorPicker), 'color-picker', 'color-picker-filled');
    this.bgColorPickerButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this.toggleBackgroundColorPickerInternal.bind(this, undefined, true));
    pickerToolbar.appendToolbarItem(this.bgColorPickerButton);
    this.bgColorPickedBound = this.bgColorPicked.bind(this);

    this.bgColorSwatch = new Swatch(bgColorContainer);

    this.contrastInfo.addEventListener(ContrastInfoEvents.ContrastInfoUpdated, this.update.bind(this));
  }

  private showNoContrastInfoAvailableMessage(): void {
    this.noContrastInfoAvailable.classList.remove('hidden');
  }

  private hideNoContrastInfoAvailableMessage(): void {
    this.noContrastInfoAvailable.classList.add('hidden');
  }

  private computeSuggestedColor(threshold: string): Common.Color.Legacy|null|undefined {
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

  private onSuggestColor(threshold: string): void {
    const color = this.computeSuggestedColor(threshold);
    if (color) {
      this.colorSelectedCallback(color);
    }
  }

  private createFixColorButton(parent: Element, suggestedColor: Common.Color.Color): HTMLElement {
    const button = parent.createChild('button', 'contrast-fix-button') as HTMLElement;
    const originalColorFormat = this.contrastInfo.colorFormat();
    const colorFormat = originalColorFormat && originalColorFormat !== Common.Color.Format.Nickname ?
        originalColorFormat :
        Common.Color.Format.HEXA;
    const formattedColor = suggestedColor.asString(colorFormat);
    const suggestedColorString = formattedColor ? formattedColor + ' ' : '';
    const label = i18nString(UIStrings.useSuggestedColorStoFixLow, {PH1: suggestedColorString});
    UI.ARIAUtils.setLabel(button, label);
    UI.Tooltip.Tooltip.install(button, label);
    button.tabIndex = 0;
    button.style.backgroundColor = suggestedColorString;
    return button;
  }

  private update(): void {
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
        const iconCheckmark = new IconButton.Icon.Icon();
        iconCheckmark
            .data = {iconName: 'checkmark', color: 'var(--icon-checkmark-green)', width: '20px', height: '14px'};
        this.contrastPassFailAPCA.appendChild(iconCheckmark);
      } else {
        const iconNo = new IconButton.Icon.Icon();
        iconNo.data = {iconName: 'clear', color: 'var(--icon-error)', width: '14px', height: '14px'};
        this.contrastPassFailAPCA.appendChild(iconNo);
        const suggestedColor = this.computeSuggestedColor('APCA');
        if (suggestedColor) {
          const fixAPCA = this.createFixColorButton(this.contrastPassFailAPCA, suggestedColor);
          fixAPCA.addEventListener('click', () => this.onSuggestColor('APCA'));
        }
      }
      labelAPCA.addEventListener('click', (_event: Event) => ContrastDetails.showHelp());
      this.elementInternal.classList.toggle('contrast-fail', !passesAPCA);
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
        i18nString(UIStrings.placeholderWithColon, {PH1: aa.toFixed(1)});
    if (this.passesAA) {
      const iconCheckmark = new IconButton.Icon.Icon();
      iconCheckmark.data = {iconName: 'checkmark', color: 'var(--icon-checkmark-green)', width: '20px', height: '14px'};
      this.contrastPassFailAA.appendChild(iconCheckmark);
    } else {
      const iconNo = new IconButton.Icon.Icon();
      iconNo.data = {iconName: 'clear', color: 'var(--icon-error)', width: '14px', height: '14px'};
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
        i18nString(UIStrings.placeholderWithColon, {PH1: aaa.toFixed(1)});
    if (passesAAA) {
      const iconCheckmark = new IconButton.Icon.Icon();
      iconCheckmark.data = {iconName: 'checkmark', color: 'var(--icon-checkmark-green)', width: '20px', height: '14px'};
      this.contrastPassFailAAA.appendChild(iconCheckmark);
    } else {
      const iconNo = new IconButton.Icon.Icon();
      iconNo.data = {iconName: 'clear', color: 'var(--icon-error)', width: '14px', height: '14px'};
      this.contrastPassFailAAA.appendChild(iconNo);
      const suggestedColor = this.computeSuggestedColor('aaa');
      if (suggestedColor) {
        const fixAAA = this.createFixColorButton(this.contrastPassFailAAA, suggestedColor);
        fixAAA.addEventListener('click', () => this.onSuggestColor('aaa'));
      }
    }

    [labelAA, labelAAA].forEach(e => e.addEventListener('click', () => ContrastDetails.showHelp()));

    this.elementInternal.classList.toggle('contrast-fail', !this.passesAA);
    // show checkmark icon when passes AA, but not AAA
    this.contrastValueBubble.classList.toggle('contrast-aa', this.passesAA && !passesAAA);
    this.contrastValueBubble.classList.toggle('contrast-aaa', passesAAA);
  }

  private static showHelp(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(UI.UIUtils.addReferrerToURL(
        'https://web.dev/color-and-contrast-accessibility/' as Platform.DevToolsPath.UrlString));
  }

  setVisible(visible: boolean): void {
    this.visibleInternal = visible;
    this.elementInternal.classList.toggle('hidden', !visible);
  }

  visible(): boolean {
    return this.visibleInternal;
  }

  element(): HTMLElement {
    return this.elementInternal;
  }

  private expandButtonClicked(): void {
    const selection = this.contrastValueBubble.getComponentSelection();
    if (selection) {
      selection.empty();
    }
    this.toggleExpanded();
  }

  private topRowClicked(event: Event): void {
    const selection = this.contrastValueBubble.getComponentSelection();
    if (selection) {
      selection.empty();
    }
    this.toggleExpanded();
    event.consume(true);
  }

  private toggleExpanded(): void {
    this.expandedInternal = !this.expandedInternal;
    UI.ARIAUtils.setExpanded(this.expandButton.element, this.expandedInternal);
    this.elementInternal.classList.toggle('collapsed', !this.expandedInternal);
    if (this.expandedInternal) {
      this.toggleMainColorPicker(false);
      this.expandButton.setGlyph('chevron-up');
      this.expandButton.setTitle(i18nString(UIStrings.showLess));
      if (this.contrastUnknown) {
        this.toggleBackgroundColorPickerInternal(true);
      }
    } else {
      this.toggleBackgroundColorPickerInternal(false);
      this.expandButton.setGlyph('chevron-down');
      this.expandButton.setTitle(i18nString(UIStrings.showMore));
    }
    this.expandedChangedCallback();
  }

  collapse(): void {
    this.elementInternal.classList.remove('expanded');
    this.toggleBackgroundColorPickerInternal(false);
    this.toggleMainColorPicker(false);
  }

  expanded(): boolean {
    return this.expandedInternal;
  }

  backgroundColorPickerEnabled(): boolean {
    return this.bgColorPickerButton.toggled();
  }

  toggleBackgroundColorPicker(enabled: boolean): void {
    this.toggleBackgroundColorPickerInternal(enabled, false);
  }

  private toggleBackgroundColorPickerInternal(enabled?: boolean, shouldTriggerEvent: boolean|undefined = true): void {
    if (enabled === undefined) {
      enabled = !this.bgColorPickerButton.toggled();
    }
    this.bgColorPickerButton.setToggled(enabled);

    if (shouldTriggerEvent) {
      this.dispatchEventToListeners(Events.BackgroundColorPickerWillBeToggled, enabled);
    }

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setEyeDropperActive(enabled);
    if (enabled) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.bgColorPickedBound);
    } else {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
          Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.bgColorPickedBound);
    }
  }

  private bgColorPicked({
    data: rgbColor,
  }: Common.EventTarget.EventTargetEvent<Host.InspectorFrontendHostAPI.EyeDropperPickedColorEvent>): void {
    const rgba = [rgbColor.r, rgbColor.g, rgbColor.b, (rgbColor.a / 2.55 | 0) / 100];
    const color = Common.Color.Legacy.fromRGBA(rgba);
    this.contrastInfo.setBgColor(color);
    this.toggleBackgroundColorPickerInternal(false);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
  }
}

export const enum Events {
  BackgroundColorPickerWillBeToggled = 'BackgroundColorPickerWillBeToggled',
}

export type EventTypes = {
  [Events.BackgroundColorPickerWillBeToggled]: boolean,
};

export class Swatch {
  private readonly parentElement: Element;
  private readonly swatchElement: Element;
  private swatchInnerElement: HTMLElement;
  private textPreview: HTMLElement;
  constructor(parentElement: Element) {
    this.parentElement = parentElement;
    this.swatchElement = parentElement.createChild('span', 'swatch contrast swatch-inner-white');
    this.swatchInnerElement = this.swatchElement.createChild('span', 'swatch-inner') as HTMLElement;
    this.textPreview = this.swatchElement.createChild('div', 'text-preview') as HTMLElement;
    this.textPreview.textContent = 'Aa';
  }

  setColors(fgColor: Common.Color.Legacy, bgColor: Common.Color.Legacy): void {
    this.textPreview.style.color = fgColor.asString(Common.Color.Format.RGBA) as string;
    this.swatchInnerElement.style.backgroundColor = bgColor.asString(Common.Color.Format.RGBA) as string;
    // Show border if the swatch is white.
    this.swatchElement.classList.toggle('swatch-inner-white', bgColor.as(Common.Color.Format.HSL).l > 0.9);
  }
}
