// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directive, Directives, html, i18nTemplate, noChange, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
class AutoWidthSelectDirective extends Directive.Directive {
    static itemWidthCache = new Map();
    constructor(partInfo) {
        super(partInfo);
        if (partInfo.type !== Directive.PartType.ELEMENT) {
            throw new Error('AutoWidthSelectDirective must be used as an element directive');
        }
    }
    update(part, [text]) {
        /* eslint-disable @devtools/no-imperative-dom-api */
        const select = part.element;
        let widthPx = AutoWidthSelectDirective.itemWidthCache.get(text);
        if (!widthPx) {
            const measuringElement = document.createElement('select');
            measuringElement.className = select.className;
            measuringElement.style.width = 'fit-content';
            measuringElement.style.position = 'absolute';
            measuringElement.style.visibility = 'hidden';
            measuringElement.style.pointerEvents = 'none';
            measuringElement.appendChild(document.createElement('option'));
            measuringElement.options[0].textContent = text;
            // Append to the select's parent so it inherits the exact same Shadow DOM styles
            select.parentElement?.appendChild(measuringElement);
            const width = measuringElement.offsetWidth;
            measuringElement.remove();
            widthPx = width ? `${width}px` : '';
            if (width > 0) {
                AutoWidthSelectDirective.itemWidthCache.set(text, widthPx);
            }
        }
        select.style.width = widthPx;
        /* eslint-enable @devtools/no-imperative-dom-api */
        return this.render(text);
    }
    render(_text) {
        return noChange;
    }
}
const autoWidthSelect = Directive.directive(AutoWidthSelectDirective);
const UIStrings = {
    /**
     * @description Title of the device dimensions selection item in the Device Mode Toolbar.
     * webpage in pixels.
     * @example {Responsive} PH1
     */
    dimensions: 'Dimensions: {PH1}',
    /**
     * @description Title of the device pixel ratio selection item in the Device Mode Toolbar.
     * @example {2.0} PH1
     */
    dpr: 'DPR: {PH1}',
    /**
     * @description Title of the width input textbox in the Device Mode Toolbar, for the width of the
     * webpage in pixels.
     */
    width: 'Width',
    /**
     * @description Title of the height input textbox in the Device Mode Toolbar, for the height of the
     * webpage in pixels. 'leave empty for full' is an instruction to the user - the webpage will be
     * full-height if this textbox is left empty.
     */
    heightLeaveEmptyForFull: 'Height (leave empty for full)',
    /**
     * @description Tooltip text for a drop-down menu where the user can select the zoom percentage of
     * the webpage preview.
     */
    zoom: 'Zoom',
    /**
     * @description Tooltip tip for a drop-down menu where the user can select the device pixel ratio
     * (the ratio between the physical pixels on a screen and CSS logical pixels) of the webpage
     * preview.
     */
    devicePixelRatio: 'Device pixel ratio',
    /**
     * @description Tooltip tip for a drop-down menu where the user can select the device type e.g.
     * Mobile, Desktop.
     */
    deviceType: 'Device type',
    /**
     * @description Tooltip text for a 'three dots' style menu button which shows an expanded set of options.
     */
    moreOptions: 'More options',
    /**
     * @description A menu item in the drop-down box that allows the user to select the zoom level.
     * Labels the option to automatically fit the preview to the available window space. In the Device Mode Toolbar.
     */
    fitToWindow: 'Fit to window',
    /**
     * @description A menu item in the drop-down box that allows the user to select the device pixel
     * ratio. Labels the default value which varies between device types, represented by the
     * placeholder, which is a number. In the Device Mode Toolbar.
     * @example {4.3} PH1
     */
    defaultF: '{PH1} (default)',
    /**
     * @description Command to hide the frame (like a picture frame) around the mobile device screen.
     */
    hideDeviceFrame: 'Hide device frame',
    /**
     * @description Command to show the frame (like a picture frame) around the mobile device screen.
     */
    showDeviceFrame: 'Show device frame',
    /**
     * @description Command to hide a display in the Device Mode Toolbar that shows the different media
     * queries for the device, above the device screen.
     * https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries
     */
    hideMediaQueries: 'Hide media queries',
    /**
     * @description Command to show a display in the Device Mode Toolbar that shows the different media
     * queries for the device, above the device screen.
     * https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries
     */
    showMediaQueries: 'Show media queries',
    /**
     * @description Command in the Device Mode Toolbar to hide a virtual ruler (for measuring),
     * displayed above and next to the device screen.
     */
    hideRulers: 'Hide rulers',
    /**
     * @description Command in the Device Mode Toolbar to show a virtual ruler (for measuring),
     * displayed above and next to the device screen.
     */
    showRulers: 'Show rulers',
    /**
     * @description Command in the Device Mode Toolbar to remove the drop-down menu from the toolbar
     * that lets the user override the device pixel ratio of the emulated device.
     */
    removeDevicePixelRatio: 'Remove device pixel ratio',
    /**
     * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
     * that lets the user override the device pixel ratio of the emulated device.
     */
    addDevicePixelRatio: 'Add device pixel ratio',
    /**
     * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
     * that lets the user set the device type (e.g. Desktop or Mobile).
     */
    removeDeviceType: 'Remove device type',
    /**
     * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
     * that lets the user add the device type (e.g. Desktop or Mobile).
     */
    addDeviceType: 'Add device type',
    /**
     * @description A context menu item in the Device Mode Toolbar that resets all settings back to
     * their default values.
     */
    resetToDefaults: 'Reset to defaults',
    /**
     * @description A menu command in the Device Mode Toolbar that closes DevTools.
     */
    closeDevtools: 'Close DevTools',
    /**
     * @description Title of the device selected in the Device Mode Toolbar. The 'response' device is
     * not a specific phone/tablet model but a virtual device that can change its height and width
     * dynamically by clicking and dragging the sides. 'Response' refers to response design:
     * https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design
     */
    responsive: 'Responsive',
    /**
     * @description A context menu item in the Device Mode Toolbar that takes the user to a new screen
     * where they can add/edit/remove custom devices.
     */
    edit: 'Edit…',
    /**
     * @description Text describing the current orientation of the phone/device (vs. landscape).
     */
    portrait: 'Portrait',
    /**
     * @description Text describing the current orientation of the phone/device (vs. portrait).
     */
    landscape: 'Landscape',
    /**
     * @description Title of button in the Device Mode Toolbar which rotates the device 90 degrees.
     */
    rotate: 'Rotate',
    /**
     * @description Tooltip of the rotate/screen orientation button.
     */
    screenOrientationOptions: 'Screen orientation options',
    /**
     * @description Tooltip shown on the rotate button when screen orientation is locked by the page
     * via screen.orientation.lock().
     */
    screenOrientationLocked: 'Screen orientation is locked by the page',
    /**
     * @description Tooltip for a button which turns on/off dual-screen mode, which emulates devices
     * like tablets which have two screens.
     */
    toggleDualscreenMode: 'Toggle dual-screen mode',
    /**
     * @description Tooltip tip for a drop-down menu where the user can select the device
     * posture e.g. Continuous, Folded.
     */
    devicePosture: 'Device posture',
    /**
     * @description Title of the network throttling selection in the Device Mode Toolbar.
     */
    throttling: 'Throttling',
};
const str_ = i18n.i18n.registerUIStrings('panels/emulation/DeviceModeToolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { ifDefined, live } = Directives;
const { widget } = UI.Widget;
function createSizeInput(title, jslogContext, value, disabled, placeholder, onChange) {
    return html `
      <input type="number"
             max=${EmulationModel.DeviceModeModel.MaxDeviceSize}
             min=${EmulationModel.DeviceModeModel.MinDeviceSize}
             title=${title}
             class="device-mode-size-input"
             .disabled=${disabled ?? false}
             jslog=${VisualLogging.textField().track({ change: true }).context(jslogContext)}
             .value=${value ?? ''}
             placeholder=${ifDefined(placeholder)}
             @change=${onChange}
             @keydown=${(event) => {
        const input = event.target;
        let modifiedValue = UI.UIUtils.modifiedFloatNumber(Number(input.value), event);
        if (modifiedValue === null) {
            return;
        }
        modifiedValue = Math.min(modifiedValue, EmulationModel.DeviceModeModel.MaxDeviceSize);
        modifiedValue = Math.max(modifiedValue, EmulationModel.DeviceModeModel.MinDeviceSize);
        event.preventDefault();
        input.value = String(modifiedValue);
        input.dispatchEvent(new Event('change'));
    }}>`;
}
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <devtools-toolbar class="main-toolbar">
      <div class="device-mode-empty-toolbar-element"></div>
      ${i18nTemplate(str_, UIStrings.dimensions, { PH1: html `
        <select class="dark-text toolbar-has-dropdown-shrinkable"
                ${autoWidthSelect(input.deviceText)}
                title=${i18nString(UIStrings.deviceType)}
                aria-label=${i18nString(UIStrings.deviceType)}
                @change=${input.onDeviceChange}
                .value=${live(input.selectedDeviceOption === input.deviceModeOptions.responsive ? 'Responsive' : (input.selectedDeviceOption?.title || 'Responsive'))}
                jslog=${VisualLogging.dropDown().track({ change: true }).context('device')}>
          <option value="Responsive" ?selected=${input.deviceModeOptions.responsive.selected} jslog=${VisualLogging.item(input.deviceModeOptions.responsive.jslogContext).track({ click: true })}>
            ${input.deviceModeOptions.responsive.title}
          </option>
          ${input.deviceModeOptions.standard.length > 0 ? html `
            <optgroup label="Standard">
              ${input.deviceModeOptions.standard.map(o => html `<option value=${o.title} ?selected=${o.selected} jslog=${VisualLogging.item(o.jslogContext).track({ click: true })}>${o.title}</option>`)}
            </optgroup>
          ` : ''}
          ${input.deviceModeOptions.custom.length > 0 ? html `
            <optgroup label="Custom">
              ${input.deviceModeOptions.custom.map(o => html `<option value=${o.title} ?selected=${o.selected} jslog=${VisualLogging.item(o.jslogContext).track({ click: true })}>${o.title}</option>`)}
            </optgroup>
          ` : ''}
          <option value="Edit" jslog=${VisualLogging.item(input.deviceModeOptions.edit.jslogContext).track({ click: true })}>
            ${input.deviceModeOptions.edit.title}
          </option>
        </select>` })}

      ${createSizeInput(i18nString(UIStrings.width), 'width', input.widthValue, !input.isResponsive, '', input.onWidthChange)}

      <div class="device-mode-x">×</div>
      ${createSizeInput(i18nString(UIStrings.heightLeaveEmptyForFull), 'height', input.heightValue, !input.isResponsive, input.heightPlaceholder, input.onHeightChange)}

      <div class="device-mode-empty-toolbar-element"></div>
      <select class="dark-text toolbar-has-dropdown-shrinkable"
              ${autoWidthSelect(input.scaleText)}
              title=${i18nString(UIStrings.zoom)}
              aria-label=${i18nString(UIStrings.zoom)}
              @change=${input.onScaleChange}
              .value=${String(input.scaleOptions.find(o => o.selected)?.value ?? '')}
              jslog=${VisualLogging.dropDown().track({ change: true }).context('scale')}>
        ${input.scaleOptions.map(o => html `<option value=${o.value} ?selected=${o.selected} jslog=${VisualLogging.item(o.jslogContext).track({ click: true })}>${o.title}</option>`)}
      </select>

      <div class="device-mode-empty-toolbar-element"></div>

      ${input.showDeviceScaleFactorSetting.get() ? html `
        <div class="toolbar-text">
          ${i18nTemplate(str_, UIStrings.dpr, {
        PH1: html `
              <select class="dark-text toolbar-has-dropdown-shrinkable"
                      ${autoWidthSelect(input.dprText)}
                    title=${i18nString(UIStrings.devicePixelRatio)}
                    aria-label=${i18nString(UIStrings.devicePixelRatio)}
                    @change=${input.onDeviceScaleChange}
                    .value=${String(input.dprOptions.find(o => o.selected)?.value ?? '')}
                    jslog=${VisualLogging.dropDown().track({ change: true }).context('device-pixel-ratio')}
                    ?disabled=${!input.isResponsive}>
                ${input.dprOptions.map(o => html `<option value=${o.value} ?selected=${o.selected} jslog=${VisualLogging.item(o.jslogContext).track({ click: true })}>${o.title}</option>`)}
              </select>`
    })}
        </div>` : ''}

      <div class="device-mode-empty-toolbar-element"></div>
      ${input.showUserAgentTypeSetting.get() ? html `
        <select class="dark-text toolbar-has-dropdown-shrinkable"
                ${autoWidthSelect(input.uaText)}
                title=${i18nString(UIStrings.deviceType)}
                aria-label=${i18nString(UIStrings.deviceType)}
                @change=${input.onUAChange}
                .value=${input.uaOptions.find(o => o.selected)?.value || ''}
                jslog=${VisualLogging.dropDown().track({ change: true }).context('device-type')}
                ?disabled=${!input.isResponsive}>
          ${input.uaOptions.map(o => html `<option value=${o.value} ?selected=${o.selected} jslog=${VisualLogging.item(o.jslogContext).track({ click: true })}>${o.title}</option>`)}
        </select>` : ''}
      <select class="dark-text" ${widget(MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect, {
        title: i18nString(UIStrings.throttling),
        bindToGlobalConditions: true,
    })}></select>
      <select class="dark-text toolbar-has-dropdown-shrinkable" ${widget(MobileThrottling.ThrottlingManager.SaveDataOverrideSelect)}></select>

      <div class="device-mode-empty-toolbar-element"></div>
      <devtools-button class="toolbar-button"
                       .data=${{ variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */, iconName: 'screen-rotation' }}
                       jslog=${VisualLogging.action('screen-rotation').track({ click: true })}
                       @click=${input.onModeMenuClick}
                       .title=${input.modeButtonTitle}
                       .disabled=${input.modeButtonDisabled}>
      </devtools-button>

      <!-- Show dual screen toolbar -->
      ${input.showSpanButton ? html `
        <devtools-button class="toolbar-button"
                         .data=${{ variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */, iconName: 'device-fold' }}
                         jslog=${VisualLogging.action('device-fold').track({ click: true })}
                         .title=${i18nString(UIStrings.toggleDualscreenMode)}
                         @click=${input.onSpanClick}>
        </devtools-button>` : ''}

      <!-- Show posture toolbar menu for foldable devices. -->
      <div class="device-mode-empty-toolbar-element"></div>
      ${input.showPostureItem ? html `
        <select class="dark-text toolbar-has-dropdown-shrinkable"
                ${autoWidthSelect(input.postureText)}
                title=${i18nString(UIStrings.devicePosture)}
                aria-label=${i18nString(UIStrings.devicePosture)}
                @change=${input.onPostureChange}
                .value=${input.postureOptions.find(o => o.selected)?.value || ''}
                jslog=${VisualLogging.dropDown().track({ change: true }).context('device-posture')}>
          ${input.postureOptions.map(o => html `<option value=${o.value} ?selected=${o.selected} jslog=${VisualLogging.item(o.value.toLowerCase()).track({ click: true })}>${o.title}</option>`)}
        </select>` : ''}
    </devtools-toolbar>
    <devtools-toolbar class="device-mode-toolbar-options" wrappable>
      <div class="device-mode-empty-toolbar-element"></div>
      <devtools-button
        .data=${{ variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */, iconName: 'dots-vertical', title: i18nString(UIStrings.moreOptions) }}
        @click=${input.onMoreOptionsClick}
        jslog=${VisualLogging.dropDown('more-options').track({ click: true })}
      ></devtools-button></devtools-toolbar>
  `, target, { container: {
            classes: ['device-mode-toolbar'],
            attributes: { jslog: `${VisualLogging.toolbar('device-mode').track({ resize: true })}`,
            }
        } });
    // clang-format on
};
export class DeviceModeToolbar extends UI.Widget.Widget {
    model;
    showMediaInspectorSetting;
    showRulersSetting;
    deviceOutlineSetting;
    showDeviceScaleFactorSetting;
    showUserAgentTypeSetting;
    autoAdjustScaleSetting;
    lastMode;
    emulatedDevicesList;
    persistenceSetting;
    view;
    constructor(model, showMediaInspectorSetting, showRulersSetting, view = DEFAULT_VIEW) {
        super();
        this.view = view;
        this.model = model;
        this.showMediaInspectorSetting = showMediaInspectorSetting;
        this.showRulersSetting = showRulersSetting;
        this.deviceOutlineSetting = this.model.deviceOutlineSetting();
        this.showDeviceScaleFactorSetting =
            Common.Settings.Settings.instance().createSetting('emulation.show-device-scale-factor', false);
        this.showDeviceScaleFactorSetting.addChangeListener(this.requestUpdate, this);
        this.showUserAgentTypeSetting =
            Common.Settings.Settings.instance().createSetting('emulation.show-user-agent-type', false);
        this.showUserAgentTypeSetting.addChangeListener(this.requestUpdate, this);
        this.autoAdjustScaleSetting =
            Common.Settings.Settings.instance().createSetting('emulation.auto-adjust-scale', true);
        this.autoAdjustScaleSetting.addChangeListener(this.requestUpdate, this);
        this.lastMode = new Map();
        this.emulatedDevicesList = EmulationModel.EmulatedDevices.EmulatedDevicesList.instance();
        this.emulatedDevicesList.addEventListener("CustomDevicesUpdated" /* EmulationModel.EmulatedDevices.Events.CUSTOM_DEVICES_UPDATED */, this.deviceListChanged, this);
        this.emulatedDevicesList.addEventListener("StandardDevicesUpdated" /* EmulationModel.EmulatedDevices.Events.STANDARD_DEVICES_UPDATED */, this.deviceListChanged, this);
        this.persistenceSetting = Common.Settings.Settings.instance().createSetting('emulation.device-mode-value', { device: '', orientation: '', mode: '' });
        this.model.toolbarControlsEnabledSetting().addChangeListener(this.requestUpdate, this);
        this.model.scaleSetting().addChangeListener(this.requestUpdate, this);
        this.model.uaSetting().addChangeListener(this.requestUpdate, this);
        this.model.deviceScaleFactorSetting().addChangeListener(this.requestUpdate, this);
        this.model.addEventListener("Updated" /* EmulationModel.DeviceModeModel.Events.UPDATED */, this.requestUpdate, this);
        this.performUpdate();
    }
    performUpdate() {
        const isResponsive = this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive;
        const isFullHeight = isResponsive && this.model.isFullHeight();
        const size = this.model.appliedDeviceSize();
        const widthValue = String(size.width);
        const heightValue = isFullHeight ? '' : String(size.height);
        const heightPlaceholder = String(size.height);
        const device = this.model.device();
        if (this.model.type() !== EmulationModel.DeviceModeModel.Type.None) {
            if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device && device) {
                this.lastMode.set(device, this.model.mode());
            }
            const value = this.persistenceSetting.get();
            const currentMode = this.model.mode();
            if (device) {
                value.device = device.title;
                value.orientation = currentMode ? currentMode.orientation : '';
                value.mode = currentMode ? currentMode.title : '';
            }
            else {
                value.device = '';
                value.orientation = '';
                value.mode = '';
            }
            this.persistenceSetting.set(value);
        }
        let modeButtonTitle = i18nString(UIStrings.rotate);
        let modeButtonDisabled = false;
        if (this.model.isScreenOrientationLocked()) {
            modeButtonDisabled = true;
            modeButtonTitle = i18nString(UIStrings.screenOrientationLocked);
        }
        else if (device) {
            const modeCount = device.modes.length;
            modeButtonDisabled = modeCount < 2;
            modeButtonTitle = modeCount === 2 ? i18nString(UIStrings.rotate) : i18nString(UIStrings.screenOrientationOptions);
        }
        else if (isResponsive) {
            modeButtonDisabled = false;
            modeButtonTitle = i18nString(UIStrings.rotate);
        }
        else {
            modeButtonDisabled = true;
        }
        const showSpanButton = Boolean(device?.isDualScreen);
        const showPostureItem = Boolean(!device?.isDualScreen && device?.isFoldableScreen);
        const deviceModeOptions = this.getDeviceModeOptions();
        const scaleOptions = this.getScaleOptions();
        const dprOptions = this.getDeviceScaleFactorOptions();
        const uaOptions = this.getUserAgentOptions();
        const postureOptions = this.getDevicePostureOptions();
        const selectedDeviceOption = [
            deviceModeOptions.responsive,
            ...deviceModeOptions.standard,
            ...deviceModeOptions.custom,
        ].find(o => o.selected);
        const deviceText = selectedDeviceOption ? selectedDeviceOption.title : deviceModeOptions.responsive.title;
        let scaleText = scaleOptions.find(o => o.selected)?.title || '';
        if (scaleText.includes(' (')) {
            scaleText = scaleText.substring(0, scaleText.indexOf(' ('));
        }
        let dprText = dprOptions.find(o => o.selected)?.title || '';
        if (dprText.includes(' (')) {
            dprText = dprText.substring(0, dprText.indexOf(' ('));
        }
        const uaText = uaOptions.find(o => o.selected)?.title || '';
        const postureText = postureOptions.find(o => o.selected)?.title || '';
        const enabled = this.model.toolbarControlsEnabledSetting().get();
        this.contentElement.classList.toggle('disabled', !enabled);
        const input = {
            isResponsive,
            isFullHeight,
            widthValue,
            heightValue,
            heightPlaceholder,
            modeButtonTitle,
            modeButtonDisabled,
            showSpanButton,
            showPostureItem,
            deviceModeOptions,
            scaleOptions,
            dprOptions,
            uaOptions,
            postureOptions,
            selectedDeviceOption,
            deviceText,
            scaleText,
            dprText,
            uaText,
            postureText,
            onDeviceChange: this.onDeviceChange.bind(this),
            onWidthChange: (event) => {
                const width = Number(event.target.value);
                if (this.autoAdjustScaleSetting.get()) {
                    this.model.setWidthAndScaleToFit(width);
                }
                else {
                    this.model.setWidth(width);
                }
            },
            onHeightChange: (event) => {
                const height = Number(event.target.value);
                if (this.autoAdjustScaleSetting.get()) {
                    this.model.setHeightAndScaleToFit(height);
                }
                else {
                    this.model.setHeight(height);
                }
            },
            onScaleChange: this.onScaleChange.bind(this),
            onDeviceScaleChange: this.onDeviceScaleChange.bind(this),
            onUAChange: this.onUAChange.bind(this),
            onPostureChange: this.onPostureChange.bind(this),
            onModeMenuClick: this.modeMenuClicked.bind(this),
            onSpanClick: this.spanClicked.bind(this),
            onMoreOptionsClick: (event) => {
                const contextMenu = new UI.ContextMenu.ContextMenu(event);
                this.appendOptionsMenuItems(contextMenu);
                void contextMenu.show();
            },
            autoAdjustScaleSetting: this.autoAdjustScaleSetting,
            showDeviceScaleFactorSetting: this.showDeviceScaleFactorSetting,
            showUserAgentTypeSetting: this.showUserAgentTypeSetting,
        };
        this.view(input, {}, this.contentElement);
    }
    getDevicePostureOptions() {
        const currentPosture = this.currentDevicePosture();
        return ['Continuous', 'Folded'].map(title => ({ title, value: title, selected: currentPosture === title }));
    }
    onPostureChange(event) {
        const value = event.target.value;
        if (value !== this.currentDevicePosture()) {
            this.spanClicked();
        }
    }
    currentDevicePosture() {
        const mode = this.model.mode();
        if (mode &&
            (mode.orientation === EmulationModel.EmulatedDevices.VerticalSpanned ||
                mode.orientation === EmulationModel.EmulatedDevices.HorizontalSpanned)) {
            return 'Folded';
        }
        return 'Continuous';
    }
    getScaleOptions() {
        const values = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const isAutoAdjusting = this.autoAdjustScaleSetting.get();
        const currentScale = this.model.scaleSetting().get();
        if (!isAutoAdjusting && !values.includes(currentScale)) {
            values.push(currentScale);
            values.sort((a, b) => a - b);
        }
        const options = [
            {
                title: i18nString(UIStrings.fitToWindow),
                value: 0,
                selected: isAutoAdjusting,
                jslogContext: 'fit-to-window',
            },
        ];
        for (const value of values) {
            const title = (value * 100).toFixed(0) + '%';
            options.push({
                title,
                value,
                selected: !isAutoAdjusting && currentScale === value,
                jslogContext: title,
            });
        }
        return options;
    }
    onScaleChange(event) {
        const value = Number(event.target.value);
        if (value === 0) {
            this.autoAdjustScaleSetting.set(true);
            if (this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
                const appliedSize = this.model.appliedDeviceSize();
                this.model.setSizeAndScaleToFit(appliedSize.width, appliedSize.height);
            }
            else {
                const device = this.model.device();
                const mode = this.model.mode();
                if (device && mode) {
                    this.model.emulate(EmulationModel.DeviceModeModel.Type.Device, device, mode, undefined);
                }
            }
        }
        else {
            this.autoAdjustScaleSetting.set(false);
            this.model.scaleSetting().set(value);
        }
    }
    getDeviceScaleFactorOptions() {
        const deviceScaleFactorSetting = this.model.deviceScaleFactorSetting();
        const defaultValue = this.model.uaSetting().get() === "Mobile" /* EmulationModel.DeviceModeModel.UA.MOBILE */ ||
            this.model.uaSetting().get() === "Mobile (no touch)" /* EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH */ ?
            EmulationModel.DeviceModeModel.defaultMobileScaleFactor :
            window.devicePixelRatio;
        const values = [1, 2, 3];
        if (!values.includes(defaultValue)) {
            values.push(defaultValue);
            values.sort((a, b) => a - b);
        }
        const currentDPR = deviceScaleFactorSetting.get();
        return values.map(value => {
            let title = String(value);
            let jslogContext = `dpr-${value}`;
            if (value === defaultValue) {
                title = i18nString(UIStrings.defaultF, { PH1: value });
                jslogContext = 'dpr-default';
            }
            return {
                title,
                value: value === defaultValue ? 0 : value,
                selected: currentDPR === value || (value === defaultValue && currentDPR === 0),
                jslogContext
            };
        });
    }
    onDeviceScaleChange(event) {
        const value = Number(event.target.value);
        this.model.deviceScaleFactorSetting().set(value);
    }
    getUserAgentOptions() {
        const uaSetting = this.model.uaSetting();
        const currentUserAgent = uaSetting.get();
        return [
            "Mobile" /* EmulationModel.DeviceModeModel.UA.MOBILE */,
            "Mobile (no touch)" /* EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH */,
            "Desktop" /* EmulationModel.DeviceModeModel.UA.DESKTOP */,
            "Desktop (touch)" /* EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH */,
        ].map(value => ({
            title: value,
            value,
            selected: currentUserAgent === value,
            jslogContext: Platform.StringUtilities.toKebabCase(value)
        }));
    }
    onUAChange(event) {
        const value = event.target.value;
        this.model.uaSetting().set(value);
    }
    appendOptionsMenuItems(contextMenu) {
        const model = this.model;
        appendToggleItem(contextMenu.headerSection(), this.deviceOutlineSetting, i18nString(UIStrings.hideDeviceFrame), i18nString(UIStrings.showDeviceFrame), !model.canShowDeviceFrame(), 'device-frame');
        appendToggleItem(contextMenu.headerSection(), this.showMediaInspectorSetting, i18nString(UIStrings.hideMediaQueries), i18nString(UIStrings.showMediaQueries), undefined, 'media-queries');
        appendToggleItem(contextMenu.headerSection(), this.showRulersSetting, i18nString(UIStrings.hideRulers), i18nString(UIStrings.showRulers), undefined, 'rulers');
        appendToggleItem(contextMenu.defaultSection(), this.showDeviceScaleFactorSetting, i18nString(UIStrings.removeDevicePixelRatio), i18nString(UIStrings.addDevicePixelRatio), undefined, 'device-pixel-ratio');
        appendToggleItem(contextMenu.defaultSection(), this.showUserAgentTypeSetting, i18nString(UIStrings.removeDeviceType), i18nString(UIStrings.addDeviceType), undefined, 'device-type');
        contextMenu.appendItemsAtLocation('deviceModeMenu');
        contextMenu.footerSection().appendItem(i18nString(UIStrings.resetToDefaults), this.reset.bind(this), { jslogContext: 'reset-to-defaults' });
        contextMenu.footerSection().appendItem(i18nString(UIStrings.closeDevtools), Host.InspectorFrontendHost.InspectorFrontendHostInstance.closeWindow.bind(Host.InspectorFrontendHost.InspectorFrontendHostInstance), { jslogContext: 'close-dev-tools' });
        function appendToggleItem(section, setting, title1, title2, disabled, context) {
            if (typeof disabled === 'undefined') {
                disabled = model.type() === EmulationModel.DeviceModeModel.Type.None;
            }
            const isEnabled = Boolean(setting.get() && !disabled);
            const jslogContext = `${context}-${isEnabled ? 'disable' : 'enable'}`;
            section.appendItem(isEnabled ? title1 : title2, setting.set.bind(setting, !setting.get()), { disabled, jslogContext });
        }
    }
    reset() {
        this.deviceOutlineSetting.set(false);
        this.showDeviceScaleFactorSetting.set(false);
        this.showUserAgentTypeSetting.set(false);
        this.showMediaInspectorSetting.set(false);
        this.showRulersSetting.set(false);
        this.model.reset();
    }
    emulateDevice(device) {
        const scale = this.autoAdjustScaleSetting.get() ? undefined : this.model.scaleSetting().get();
        this.model.emulate(EmulationModel.DeviceModeModel.Type.Device, device, this.lastMode.get(device) || device.modes[0], scale);
    }
    switchToResponsive() {
        this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
    }
    filterDevices(devices) {
        devices = devices.filter(function (d) {
            return d.show();
        });
        devices.sort(EmulationModel.EmulatedDevices.EmulatedDevice.deviceComparator);
        return devices;
    }
    standardDevices() {
        return this.filterDevices(this.emulatedDevicesList.standard());
    }
    customDevices() {
        return this.filterDevices(this.emulatedDevicesList.custom());
    }
    allDevices() {
        return this.standardDevices().concat(this.customDevices());
    }
    getDeviceModeOptions() {
        return {
            responsive: {
                title: i18nString(UIStrings.responsive),
                selected: this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive,
                jslogContext: 'responsive'
            },
            standard: this.standardDevices().map(device => ({
                device,
                title: device.title,
                selected: this.model.device() === device,
                jslogContext: Platform.StringUtilities.toKebabCase(device.title)
            })),
            custom: this.customDevices().map(device => ({
                device,
                title: device.title,
                selected: this.model.device() === device,
                jslogContext: Platform.StringUtilities.toKebabCase(device.title)
            })),
            edit: {
                title: i18nString(UIStrings.edit),
                jslogContext: 'edit',
            }
        };
    }
    onDeviceChange(event) {
        const value = event.target.value;
        if (value === 'Edit') {
            this.emulatedDevicesList.revealCustomSetting();
            this.requestUpdate();
        }
        else if (value === 'Responsive') {
            this.switchToResponsive();
        }
        else {
            for (const device of this.allDevices()) {
                if (device.title === value) {
                    this.emulateDevice(device);
                    break;
                }
            }
        }
    }
    deviceListChanged() {
        this.requestUpdate();
        const device = this.model.device();
        if (!device) {
            return;
        }
        const devices = this.allDevices();
        if (devices.indexOf(device) === -1) {
            if (devices.length) {
                this.emulateDevice(devices[0]);
            }
            else {
                this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
            }
        }
        else {
            this.emulateDevice(device);
        }
    }
    spanClicked() {
        const device = this.model.device();
        if (!device || (!device.isDualScreen && !device.isFoldableScreen)) {
            return;
        }
        const scale = this.autoAdjustScaleSetting.get() ? undefined : this.model.scaleSetting().get();
        const mode = this.model.mode();
        if (!mode) {
            return;
        }
        const newMode = device.getSpanPartner(mode);
        if (!newMode) {
            return;
        }
        this.model.emulate(this.model.type(), device, newMode, scale);
        return;
    }
    modeMenuClicked(event) {
        if (this.model.isScreenOrientationLocked()) {
            return;
        }
        const device = this.model.device();
        const model = this.model;
        const autoAdjustScaleSetting = this.autoAdjustScaleSetting;
        if (model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
            const appliedSize = model.appliedDeviceSize();
            if (autoAdjustScaleSetting.get()) {
                model.setSizeAndScaleToFit(appliedSize.height, appliedSize.width);
            }
            else {
                model.setWidth(appliedSize.height);
                model.setHeight(appliedSize.width);
            }
            return;
        }
        if (!device) {
            return;
        }
        if ((device.isDualScreen || device.isFoldableScreen || device.modes.length === 2) &&
            device.modes[0].orientation !== device.modes[1].orientation) {
            const scale = autoAdjustScaleSetting.get() ? undefined : model.scaleSetting().get();
            const mode = model.mode();
            if (!mode) {
                return;
            }
            const rotationPartner = device.getRotationPartner(mode);
            if (!rotationPartner) {
                return;
            }
            model.emulate(model.type(), model.device(), rotationPartner, scale);
            return;
        }
        const modeButton = event.target;
        const contextMenu = new UI.ContextMenu.ContextMenu(event, {
            x: modeButton.getBoundingClientRect().left,
            y: modeButton.getBoundingClientRect().top + modeButton.offsetHeight,
        });
        addOrientation(EmulationModel.EmulatedDevices.Vertical, i18nString(UIStrings.portrait));
        addOrientation(EmulationModel.EmulatedDevices.Horizontal, i18nString(UIStrings.landscape));
        void contextMenu.show();
        function addOrientation(orientation, title) {
            if (!device) {
                return;
            }
            const modes = device.modesForOrientation(orientation);
            if (!modes.length) {
                return;
            }
            if (modes.length === 1) {
                addMode(modes[0], title);
            }
            else {
                for (let index = 0; index < modes.length; index++) {
                    addMode(modes[index], title + ' \u2013 ' + modes[index].title);
                }
            }
        }
        function addMode(mode, title) {
            contextMenu.defaultSection().appendCheckboxItem(title, applyMode.bind(null, mode), { checked: model.mode() === mode, jslogContext: 'device-mode' });
        }
        function applyMode(mode) {
            const scale = autoAdjustScaleSetting.get() ? undefined : model.scaleSetting().get();
            model.emulate(model.type(), model.device(), mode, scale);
        }
    }
    getPrettyFitZoomPercentage() {
        return `${(this.model.fitScale() * 100).toFixed(0)}`;
    }
    getPrettyZoomPercentage() {
        return `${(this.model.scale() * 100).toFixed(0)}`;
    }
    restore() {
        for (const device of this.allDevices()) {
            if (device.title === this.persistenceSetting.get().device) {
                for (const mode of device.modes) {
                    if (mode.orientation === this.persistenceSetting.get().orientation &&
                        mode.title === this.persistenceSetting.get().mode) {
                        this.lastMode.set(device, mode);
                        this.emulateDevice(device);
                        return;
                    }
                }
            }
        }
        this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
    }
}
//# sourceMappingURL=DeviceModeToolbar.js.map