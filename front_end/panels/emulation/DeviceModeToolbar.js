// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as EmulationComponents from './components/components.js';
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
     * Labels the value which corresponds to the 'fit to window' zoom level, represented by the
     * placeholder, which is a number. In the Device Mode Toolbar.
     * @example {30.0} PH1
     */
    fitToWindowPercentage: '{PH1}% (fit to window)',
    /**
     * @description A checkbox setting that appears in the context menu for the zoom level, in the
     * Device Mode Toolbar.
     */
    autoadjustZoom: 'Auto-adjust zoom',
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
/**
 * Even though the emulation panel uses all UI elements, the tooltips are not supported.
 * That's because the emulation elements are rendered around the page context, rather
 * than in the DevTools panel itself. Therefore, we need to fall back to using the
 * built-in tooltip by setting the title attribute on the button's element.
 */
function setTitleForButton(button, title) {
    if (button instanceof UI.Toolbar.ToolbarMenuButton) {
        button.setTitle(title);
        button.element.title = title;
    }
    else {
        button.title = title;
    }
}
export class DeviceModeToolbar {
    model;
    showMediaInspectorSetting;
    showRulersSetting;
    deviceOutlineSetting;
    showDeviceScaleFactorSetting;
    showUserAgentTypeSetting;
    autoAdjustScaleSetting;
    lastMode;
    #element;
    emulatedDevicesList;
    persistenceSetting;
    spanButton;
    postureItem;
    modeButton;
    widthInput;
    heightInput;
    deviceScaleItem;
    deviceScaleItems = [];
    deviceSelectItem;
    scaleItem;
    uaItem;
    cachedDeviceScale;
    cachedUaType;
    xItem;
    cachedModelType;
    cachedScale;
    cachedModelDevice;
    cachedModelMode;
    constructor(model, showMediaInspectorSetting, showRulersSetting) {
        this.model = model;
        this.showMediaInspectorSetting = showMediaInspectorSetting;
        this.showRulersSetting = showRulersSetting;
        this.deviceOutlineSetting = this.model.deviceOutlineSetting();
        this.showDeviceScaleFactorSetting =
            Common.Settings.Settings.instance().createSetting('emulation.show-device-scale-factor', false);
        this.showDeviceScaleFactorSetting.addChangeListener(this.updateDeviceScaleFactorVisibility, this);
        this.showUserAgentTypeSetting =
            Common.Settings.Settings.instance().createSetting('emulation.show-user-agent-type', false);
        this.showUserAgentTypeSetting.addChangeListener(this.updateUserAgentTypeVisibility, this);
        this.autoAdjustScaleSetting =
            Common.Settings.Settings.instance().createSetting('emulation.auto-adjust-scale', true);
        this.lastMode = new Map();
        this.widthInput = new EmulationComponents.DeviceSizeInputElement.SizeInputElement(i18nString(UIStrings.width), { jslogContext: 'width' });
        this.heightInput = new EmulationComponents.DeviceSizeInputElement.SizeInputElement(i18nString(UIStrings.heightLeaveEmptyForFull), { jslogContext: 'height' });
        this.#element = document.createElement('div');
        this.#element.classList.add('device-mode-toolbar');
        this.#element.setAttribute('jslog', `${VisualLogging.toolbar('device-mode').track({ resize: true })}`);
        const mainToolbar = this.createMainToolbar();
        const optionsToolbar = this.createOptionsToolbar();
        this.emulatedDevicesList = EmulationModel.EmulatedDevices.EmulatedDevicesList.instance();
        this.emulatedDevicesList.addEventListener("CustomDevicesUpdated" /* EmulationModel.EmulatedDevices.Events.CUSTOM_DEVICES_UPDATED */, this.deviceListChanged, this);
        this.emulatedDevicesList.addEventListener("StandardDevicesUpdated" /* EmulationModel.EmulatedDevices.Events.STANDARD_DEVICES_UPDATED */, this.deviceListChanged, this);
        this.persistenceSetting = Common.Settings.Settings.instance().createSetting('emulation.device-mode-value', { device: '', orientation: '', mode: '' });
        this.model.toolbarControlsEnabledSetting().addChangeListener(updateToolbarsEnabled);
        updateToolbarsEnabled();
        this.updateDeviceMenuItems();
        this.updateScaleMenuItems();
        this.updateDeviceScaleMenuItems();
        this.updateUserAgentMenuItems();
        this.updateDevicePostureItems();
        function updateToolbarsEnabled() {
            const enabled = model.toolbarControlsEnabledSetting().get();
            mainToolbar.setEnabled(enabled);
            optionsToolbar.setEnabled(enabled);
        }
    }
    appendOption(parentElement, title, value, jslogContext) {
        const option = document.createElement('option');
        option.text = title;
        option.value = value;
        option.setAttribute('jslog', `${VisualLogging.item(jslogContext).track({ click: true })}`);
        parentElement.appendChild(option);
    }
    createEmptyToolbarElement() {
        const element = document.createElement('div');
        element.classList.add('device-mode-empty-toolbar-element');
        return element;
    }
    createMainToolbar() {
        const mainToolbar = this.#element.createChild('devtools-toolbar', 'main-toolbar');
        mainToolbar.append(this.createEmptyToolbarElement());
        this.deviceSelectItem = document.createElement('select');
        this.deviceSelectItem.classList.add('dark-text', 'toolbar-has-dropdown-shrinkable');
        this.deviceSelectItem.title = i18nString(UIStrings.deviceType);
        UI.ARIAUtils.setLabel(this.deviceSelectItem, i18nString(UIStrings.deviceType));
        this.deviceSelectItem.addEventListener('change', this.onDeviceChange.bind(this));
        this.deviceSelectItem.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true }).context('device')}`);
        const dimensionsSpan = uiI18n.getFormatLocalizedString(str_, UIStrings.dimensions, { PH1: this.deviceSelectItem });
        mainToolbar.append(...dimensionsSpan.childNodes);
        mainToolbar.append(this.deviceSelectItem);
        this.widthInput.addEventListener('sizechanged', ({ size: width }) => {
            if (this.autoAdjustScaleSetting.get()) {
                this.model.setWidthAndScaleToFit(width);
            }
            else {
                this.model.setWidth(width);
            }
        });
        this.heightInput.addEventListener('sizechanged', ({ size: height }) => {
            if (this.autoAdjustScaleSetting.get()) {
                this.model.setHeightAndScaleToFit(height);
            }
            else {
                this.model.setHeight(height);
            }
        });
        mainToolbar.append(this.widthInput);
        this.xItem = document.createElement('div');
        this.xItem.classList.add('device-mode-x');
        this.xItem.textContent = '×';
        mainToolbar.append(this.xItem);
        mainToolbar.append(this.heightInput);
        mainToolbar.append(this.createEmptyToolbarElement());
        this.scaleItem = document.createElement('select');
        this.scaleItem.classList.add('dark-text', 'toolbar-has-dropdown-shrinkable');
        this.scaleItem.title = i18nString(UIStrings.zoom);
        UI.ARIAUtils.setLabel(this.scaleItem, i18nString(UIStrings.zoom));
        this.scaleItem.addEventListener('change', this.onScaleChange.bind(this));
        this.scaleItem.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true }).context('scale')}`);
        mainToolbar.append(this.scaleItem);
        const autoAdjustScaleButton = new UI.Toolbar.ToolbarSettingToggle(this.autoAdjustScaleSetting, 'center-focus-weak', i18nString(UIStrings.autoadjustZoom));
        mainToolbar.appendToolbarItem(autoAdjustScaleButton);
        mainToolbar.append(this.createEmptyToolbarElement());
        this.deviceScaleItem = document.createElement('select');
        this.deviceScaleItem.classList.add('dark-text', 'toolbar-has-dropdown-shrinkable');
        this.deviceScaleItem.title = i18nString(UIStrings.devicePixelRatio);
        UI.ARIAUtils.setLabel(this.deviceScaleItem, i18nString(UIStrings.devicePixelRatio));
        this.deviceScaleItem.addEventListener('change', this.onDeviceScaleChange.bind(this));
        this.deviceScaleItem.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true }).context('device-pixel-ratio')}`);
        const deviceScaleSpan = uiI18n.getFormatLocalizedString(str_, UIStrings.dpr, { PH1: this.deviceScaleItem });
        for (const node of Array.from(deviceScaleSpan.childNodes)) {
            if (node === this.deviceScaleItem) {
                this.deviceScaleItem.classList.toggle('hidden', !this.showDeviceScaleFactorSetting.get());
                this.deviceScaleItems.push(this.deviceScaleItem);
                mainToolbar.append(this.deviceScaleItem);
            }
            else {
                const item = new UI.Toolbar.ToolbarText(node.textContent || '');
                item.setVisible(this.showDeviceScaleFactorSetting.get());
                this.deviceScaleItems.push(item.element);
                mainToolbar.appendToolbarItem(item);
            }
        }
        mainToolbar.append(this.createEmptyToolbarElement());
        this.uaItem = document.createElement('select');
        this.uaItem.classList.add('dark-text', 'toolbar-has-dropdown-shrinkable');
        this.uaItem.title = i18nString(UIStrings.deviceType);
        UI.ARIAUtils.setLabel(this.uaItem, i18nString(UIStrings.deviceType));
        this.uaItem.addEventListener('change', this.onUAChange.bind(this));
        this.uaItem.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true }).context('device-type')}`);
        this.uaItem.classList.toggle('hidden', !this.showUserAgentTypeSetting.get());
        mainToolbar.append(this.uaItem);
        MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.createForGlobalConditions(mainToolbar, i18nString(UIStrings.throttling));
        const saveDataItem = MobileThrottling.ThrottlingManager.throttlingManager().createSaveDataOverrideSelector();
        saveDataItem.turnShrinkable();
        mainToolbar.appendToolbarItem(saveDataItem);
        mainToolbar.append(this.createEmptyToolbarElement());
        this.modeButton = new Buttons.Button.Button();
        this.modeButton.classList.add('toolbar-button');
        this.modeButton.data = { variant: "icon" /* Buttons.Button.Variant.ICON */, iconName: 'screen-rotation' };
        this.modeButton.setAttribute('jslog', `${VisualLogging.action('screen-rotation').track({ click: true })}`);
        this.modeButton.addEventListener('click', this.modeMenuClicked.bind(this));
        mainToolbar.append(this.modeButton);
        // Show dual screen toolbar.
        this.spanButton = new Buttons.Button.Button();
        this.spanButton.classList.add('toolbar-button');
        this.spanButton.data = { variant: "icon" /* Buttons.Button.Variant.ICON */, iconName: 'device-fold' };
        this.spanButton.setAttribute('jslog', `${VisualLogging.action('device-fold').track({ click: true })}`);
        this.spanButton.addEventListener('click', this.spanClicked.bind(this));
        mainToolbar.append(this.spanButton);
        // Show posture toolbar menu for foldable devices.
        mainToolbar.append(this.createEmptyToolbarElement());
        this.postureItem = document.createElement('select');
        this.postureItem.classList.add('dark-text', 'toolbar-has-dropdown-shrinkable');
        this.postureItem.title = i18nString(UIStrings.devicePosture);
        UI.ARIAUtils.setLabel(this.postureItem, i18nString(UIStrings.devicePosture));
        this.postureItem.addEventListener('change', this.onPostureChange.bind(this));
        this.postureItem.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true }).context('device-posture')}`);
        mainToolbar.append(this.postureItem);
        return mainToolbar;
    }
    createOptionsToolbar() {
        const optionsToolbar = this.#element.createChild('devtools-toolbar', 'device-mode-toolbar-options');
        optionsToolbar.wrappable = true;
        optionsToolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.createEmptyToolbarElement()));
        const moreOptionsButton = new UI.Toolbar.ToolbarMenuButton(this.appendOptionsMenuItems.bind(this), true, undefined, 'more-options', 'dots-vertical');
        moreOptionsButton.setTitle(i18nString(UIStrings.moreOptions));
        optionsToolbar.appendToolbarItem(moreOptionsButton);
        return optionsToolbar;
    }
    getDevicePostureOptions() {
        const currentPosture = this.currentDevicePosture();
        return ['Continuous', 'Folded'].map(title => ({ title, value: title, selected: currentPosture === title }));
    }
    updateDevicePostureItems() {
        this.postureItem.replaceChildren();
        for (const option of this.getDevicePostureOptions()) {
            this.appendOption(this.postureItem, option.title, option.value, option.title.toLowerCase());
        }
        const currentPosture = this.currentDevicePosture();
        if (this.postureItem.value !== currentPosture) {
            this.postureItem.value = currentPosture;
        }
        this.resizeItem(this.postureItem);
    }
    onPostureChange() {
        const value = this.postureItem.value;
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
        let fitValue = null;
        if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device) {
            fitValue = this.model.fitScale();
            const fitValuePct = (fitValue * 100).toFixed(0);
            let found = false;
            for (let i = 0; i < values.length; ++i) {
                if ((values[i] * 100).toFixed(0) === fitValuePct) {
                    found = true;
                    values[i] = fitValue;
                    break;
                }
            }
            if (!found) {
                values.push(fitValue);
                values.sort((a, b) => a - b);
            }
        }
        const currentScale = this.model.scaleSetting().get();
        return values.map(value => {
            let title = (value * 100).toFixed(0) + '%';
            let jslogContext = title;
            if (value === fitValue) {
                title = i18nString(UIStrings.fitToWindowPercentage, { PH1: (value * 100).toFixed(0) });
                jslogContext = 'fit-to-window';
            }
            return { title, value, selected: currentScale === value, jslogContext };
        });
    }
    updateScaleMenuItems() {
        this.scaleItem.replaceChildren();
        const options = this.getScaleOptions();
        for (const option of options) {
            this.appendOption(this.scaleItem, option.title, String(option.value), option.jslogContext);
        }
        const selected = options.find(o => o.selected);
        if (selected) {
            this.scaleItem.value = String(selected.value);
        }
        this.resizeItem(this.scaleItem, true);
    }
    onScaleChange() {
        const value = Number(this.scaleItem.value);
        this.model.scaleSetting().set(value);
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
    updateDeviceScaleMenuItems() {
        this.deviceScaleItem.replaceChildren();
        const options = this.getDeviceScaleFactorOptions();
        for (const option of options) {
            this.appendOption(this.deviceScaleItem, option.title, String(option.value), option.jslogContext);
        }
        const selected = options.find(o => o.selected);
        if (selected) {
            this.deviceScaleItem.value = String(selected.value);
        }
        this.resizeItem(this.deviceScaleItem, true);
    }
    onDeviceScaleChange() {
        const value = Number(this.deviceScaleItem.value);
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
    updateUserAgentMenuItems() {
        this.uaItem.replaceChildren();
        const options = this.getUserAgentOptions();
        for (const option of options) {
            this.appendOption(this.uaItem, option.title, option.value, option.jslogContext);
        }
        const selected = options.find(o => o.selected);
        if (selected) {
            this.uaItem.value = selected.value;
        }
        this.resizeItem(this.uaItem);
    }
    onUAChange() {
        const value = this.uaItem.value;
        this.model.uaSetting().set(value);
        this.resizeItem(this.uaItem);
    }
    appendOptionsMenuItems(contextMenu) {
        const model = this.model;
        appendToggleItem(contextMenu.headerSection(), this.deviceOutlineSetting, i18nString(UIStrings.hideDeviceFrame), i18nString(UIStrings.showDeviceFrame), model.type() !== EmulationModel.DeviceModeModel.Type.Device, 'device-frame');
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
            const isEnabled = setting.get();
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
    updateDeviceMenuItems() {
        this.deviceSelectItem.replaceChildren();
        const options = this.getDeviceModeOptions();
        this.appendOption(this.deviceSelectItem, options.responsive.title, 'Responsive', options.responsive.jslogContext);
        appendGroup.call(this, options.standard, 'Standard');
        appendGroup.call(this, options.custom, 'Custom');
        this.appendOption(this.deviceSelectItem, options.edit.title, 'Edit', options.edit.jslogContext);
        this.updateDeviceSelection();
        function appendGroup(group, label) {
            if (!group.length) {
                return;
            }
            const optGroup = document.createElement('optgroup');
            optGroup.label = label;
            for (const item of group) {
                this.appendOption(optGroup, item.title, item.title, item.jslogContext);
            }
            this.deviceSelectItem.appendChild(optGroup);
        }
    }
    updateDeviceSelection() {
        const device = this.model.device();
        if (this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
            this.deviceSelectItem.value = 'Responsive';
        }
        else if (device) {
            this.deviceSelectItem.value = device.title;
        }
        this.resizeItem(this.deviceSelectItem);
    }
    onDeviceChange() {
        const value = this.deviceSelectItem.value;
        if (value === 'Edit') {
            this.emulatedDevicesList.revealCustomSetting();
            this.updateDeviceSelection();
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
        this.updateDeviceMenuItems();
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
    updateDeviceScaleFactorVisibility() {
        if (this.deviceScaleItem) {
            const visible = this.showDeviceScaleFactorSetting.get();
            this.deviceScaleItem.classList.toggle('hidden', !visible);
            for (const item of this.deviceScaleItems) {
                item.classList.toggle('hidden', !visible);
            }
        }
    }
    updateUserAgentTypeVisibility() {
        if (this.uaItem) {
            const visible = this.showUserAgentTypeSetting.get();
            this.uaItem.classList.toggle('hidden', !visible);
            if (visible) {
                this.resizeItem(this.uaItem);
            }
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
        if (!this.modeButton) {
            return;
        }
        const contextMenu = new UI.ContextMenu.ContextMenu(event, {
            x: this.modeButton.getBoundingClientRect().left,
            y: this.modeButton.getBoundingClientRect().top + this.modeButton.offsetHeight,
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
    element() {
        return this.#element;
    }
    update() {
        if (this.model.type() !== this.cachedModelType) {
            this.cachedModelType = this.model.type();
            this.widthInput.disabled = this.model.type() !== EmulationModel.DeviceModeModel.Type.Responsive;
            this.heightInput.disabled = this.model.type() !== EmulationModel.DeviceModeModel.Type.Responsive;
            this.deviceScaleItem.disabled = this.model.type() !== EmulationModel.DeviceModeModel.Type.Responsive;
            this.uaItem.disabled = this.model.type() !== EmulationModel.DeviceModeModel.Type.Responsive;
            if (this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
                this.modeButton.disabled = false;
                setTitleForButton(this.modeButton, i18nString(UIStrings.rotate));
            }
            else {
                this.modeButton.disabled = true;
            }
        }
        const size = this.model.appliedDeviceSize();
        this.widthInput.size = String(size.width);
        this.heightInput.size =
            this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive && this.model.isFullHeight() ?
                '' :
                String(size.height);
        this.heightInput.placeholder = String(size.height);
        if (this.model.scale() !== this.cachedScale) {
            this.updateScaleMenuItems();
            this.cachedScale = this.model.scale();
        }
        const deviceScale = this.model.appliedDeviceScaleFactor();
        if (deviceScale !== this.cachedDeviceScale) {
            this.deviceScaleItem.value = String(deviceScale);
            this.cachedDeviceScale = deviceScale;
            this.resizeItem(this.deviceScaleItem, true);
        }
        const uaType = this.model.appliedUserAgentType();
        if (uaType !== this.cachedUaType) {
            this.uaItem.value = uaType;
            this.cachedUaType = uaType;
            this.updateDeviceScaleMenuItems();
            this.resizeItem(this.uaItem);
        }
        const device = this.model.device();
        this.updateDeviceSelection();
        if (this.model.device() !== this.cachedModelDevice) {
            const device = this.model.device();
            if (device) {
                const modeCount = device ? device.modes.length : 0;
                this.modeButton.disabled = modeCount < 2;
                setTitleForButton(this.modeButton, modeCount === 2 ? i18nString(UIStrings.rotate) : i18nString(UIStrings.screenOrientationOptions));
            }
            this.cachedModelDevice = device;
        }
        if (device?.isDualScreen) {
            this.spanButton.classList.toggle('hidden', false);
            this.postureItem.classList.toggle('hidden', true);
        }
        else if (device?.isFoldableScreen) {
            this.spanButton.classList.toggle('hidden', true);
            this.postureItem.classList.toggle('hidden', false);
            this.updateDevicePostureItems();
        }
        else {
            this.spanButton.classList.toggle('hidden', true);
            this.postureItem.classList.toggle('hidden', true);
        }
        setTitleForButton(this.spanButton, i18nString(UIStrings.toggleDualscreenMode));
        if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device) {
            this.lastMode.set(this.model.device(), this.model.mode());
        }
        if (this.model.mode() !== this.cachedModelMode && this.model.type() !== EmulationModel.DeviceModeModel.Type.None) {
            this.cachedModelMode = this.model.mode();
            const value = this.persistenceSetting.get();
            const device = this.model.device();
            if (device) {
                value.device = device.title;
                const mode = this.model.mode();
                value.orientation = mode ? mode.orientation : '';
                value.mode = mode ? mode.title : '';
            }
            else {
                value.device = '';
                value.orientation = '';
                value.mode = '';
            }
            this.persistenceSetting.set(value);
        }
        // When screen orientation is locked by the page (via screen.orientation.lock()),
        // disable the rotate button to prevent user-initiated rotation.
        // When unlocked, restore the button to its normal state.
        if (this.model.isScreenOrientationLocked()) {
            this.modeButton.disabled = true;
            setTitleForButton(this.modeButton, i18nString(UIStrings.screenOrientationLocked));
        }
        else if (this.cachedModelDevice) {
            const modeCount = this.cachedModelDevice.modes.length;
            this.modeButton.disabled = modeCount < 2;
            setTitleForButton(this.modeButton, modeCount === 2 ? i18nString(UIStrings.rotate) : i18nString(UIStrings.screenOrientationOptions));
        }
        else if (this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
            this.modeButton.disabled = false;
            setTitleForButton(this.modeButton, i18nString(UIStrings.rotate));
        }
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
    resizeItem(item, stripParens = false) {
        const selectedOption = item.options[item.selectedIndex];
        if (!selectedOption) {
            return;
        }
        const dummySelect = item.cloneNode(false);
        const dummyOption = selectedOption.cloneNode(true);
        if (stripParens) {
            const parensIndex = dummyOption.text.indexOf(' (');
            if (parensIndex >= 0) {
                dummyOption.text = dummyOption.text.substring(0, parensIndex);
            }
        }
        dummySelect.appendChild(dummyOption);
        dummySelect.style.width = 'fit-content';
        dummySelect.style.position = 'absolute';
        dummySelect.style.visibility = 'hidden';
        dummySelect.style.pointerEvents = 'none';
        item.parentElement?.appendChild(dummySelect);
        item.style.width = dummySelect.offsetWidth + 'px';
        dummySelect.remove();
    }
}
//# sourceMappingURL=DeviceModeToolbar.js.map