// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import sensorsStyles from './sensors.css.js';
const UIStrings = {
    /**
     * @description Title for a group of cities
     */
    location: 'Location',
    /**
     * @description An option that appears in a drop-down to prevent the GPS location of the user from being overridden.
     */
    noOverride: 'No override',
    /**
     * @description Title of a section that contains overrides for the user's GPS location.
     */
    overrides: 'Overrides',
    /**
     * @description Text of button in Sensors View, takes the user to the custom location setting screen
     *where they can enter/edit custom locations.
     */
    manage: 'Manage',
    /**
     * @description Aria-label for location manage button in Sensors View
     */
    manageTheListOfLocations: 'Manage the list of locations',
    /**
     * @description Option in a drop-down input for selecting the GPS location of the user. As an
     *alternative to selecting a location from the list, the user can select this option and they are
     *prompted to enter the details for a new custom location.
     */
    other: 'Other…',
    /**
     * @description Title of a section in a drop-down input that contains error locations, e.g. to select
     *a location override that says 'the location is not available'. A noun.
     */
    error: 'Error',
    /**
     * @description A type of override where the geographic location of the user is not available.
     */
    locationUnavailable: 'Location unavailable',
    /**
     * @description Tooltip text telling the user how to change the value of a latitude/longitude input
     *text box. several shortcuts are provided for convenience. The placeholder can be different
     *keyboard keys, depending on the user's settings.
     * @example {Ctrl} PH1
     */
    adjustWithMousewheelOrUpdownKeys: 'Adjust with mousewheel or up/down keys. {PH1}: ±10, Shift: ±1, Alt: ±0.01',
    /**
     * @description Label for latitude of a GPS location.
     */
    latitude: 'Latitude',
    /**
     * @description Label for Longitude of a GPS location.
     */
    longitude: 'Longitude',
    /**
     * @description Label for the ID of a timezone for a particular location.
     */
    timezoneId: 'Timezone ID',
    /**
     * @description Label for the locale relevant to a custom location.
     */
    locale: 'Locale',
    /**
     * @description Label for Accuracy of a GPS location.
     */
    accuracy: 'Accuracy',
    /**
     * @description Label the orientation of a user's device e.g. tilt in 3D-space.
     */
    orientation: 'Orientation',
    /**
     * @description Option that when chosen, turns off device orientation override.
     */
    off: 'Off',
    /**
     * @description Option that when chosen, allows the user to enter a custom orientation for the device e.g. tilt in 3D-space.
     */
    customOrientation: 'Custom orientation',
    /**
     * @description Warning to the user they should enable the device orientation override, in order to
     *enable this input which allows them to interactively select orientation by dragging a 3D phone
     *model.
     */
    enableOrientationToRotate: 'Enable orientation to rotate',
    /**
     * @description Text telling the user how to use an input which allows them to interactively select
     *orientation by dragging a 3D phone model.
     */
    shiftdragHorizontallyToRotate: 'Shift+drag horizontally to rotate around the y-axis',
    /**
     * @description Message in the Sensors tool that is alerted (for screen readers) when the device orientation setting is changed
     * @example {180} PH1
     * @example {-90} PH2
     * @example {0} PH3
     */
    deviceOrientationSetToAlphaSBeta: 'Device orientation set to alpha: {PH1}, beta: {PH2}, gamma: {PH3}',
    /**
     * @description Text of orientation reset button in Sensors View of the Device Toolbar
     */
    reset: 'Reset',
    /**
     * @description Aria-label for orientation reset button in Sensors View. Command.
     */
    resetDeviceOrientation: 'Reset device orientation',
    /**
     * @description Description of the Touch select in Sensors tab
     */
    forcesTouchInsteadOfClick: 'Forces touch instead of click',
    /**
     * @description Description of the Emulate Idle State select in Sensors tab
     */
    forcesSelectedIdleStateEmulation: 'Forces selected idle state emulation',
    /**
     * @description Description of the Emulate CPU Pressure State select in Sensors tab
     */
    forcesSelectedPressureStateEmulation: 'Forces selected pressure state emulation',
    /**
     * @description Title for a group of configuration options in a drop-down input.
     */
    presets: 'Presets',
    /**
     * @description Drop-down input option for the orientation of a device in 3D space.
     */
    portrait: 'Portrait',
    /**
     * @description Drop-down input option for the orientation of a device in 3D space.
     */
    portraitUpsideDown: 'Portrait upside down',
    /**
     * @description Drop-down input option for the orientation of a device in 3D space.
     */
    landscapeLeft: 'Landscape left',
    /**
     * @description Drop-down input option for the orientation of a device in 3D space.
     */
    landscapeRight: 'Landscape right',
    /**
     * @description Drop-down input option for the orientation of a device in 3D space. Noun indicating
     *the display of the device is pointing up.
     */
    displayUp: 'Display up',
    /**
     * @description Drop-down input option for the orientation of a device in 3D space. Noun indicating
     *the display of the device is pointing down.
     */
    displayDown: 'Display down',
    /**
     * @description Label for one dimension of device orientation that the user can override.
     */
    alpha: '\u03B1 (alpha)',
    /**
     * @description Label for one dimension of device orientation that the user can override.
     */
    beta: '\u03B2 (beta)',
    /**
     * @description Label for one dimension of device orientation that the user can override.
     */
    gamma: '\u03B3 (gamma)',
};
const str_ = i18n.i18n.registerUIStrings('panels/sensors/SensorsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SensorsView extends UI.Widget.VBox {
    #locationSetting;
    #location;
    #locationOverrideEnabled;
    fieldsetElement;
    timezoneError;
    locationSelectElement;
    latitudeInput;
    longitudeInput;
    timezoneInput;
    localeInput;
    accuracyInput;
    latitudeSetter;
    longitudeSetter;
    timezoneSetter;
    localeSetter;
    accuracySetter;
    localeError;
    accuracyError;
    customLocationsGroup;
    deviceOrientationSetting;
    deviceOrientation;
    deviceOrientationOverrideEnabled;
    deviceOrientationFieldset;
    stageElement;
    orientationSelectElement;
    alphaElement;
    betaElement;
    gammaElement;
    alphaSetter;
    betaSetter;
    gammaSetter;
    orientationLayer;
    boxElement;
    boxMatrix;
    mouseDownVector;
    originalBoxMatrix;
    constructor() {
        super({
            jslog: `${VisualLogging.panel('sensors').track({ resize: true })}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(sensorsStyles);
        this.contentElement.classList.add('sensors-view');
        this.#locationSetting = Common.Settings.Settings.instance().createSetting('emulation.location-override', '');
        this.#location = SDK.EmulationModel.Location.parseSetting(this.#locationSetting.get());
        this.#locationOverrideEnabled = false;
        this.createLocationSection(this.#location);
        this.createPanelSeparator();
        this.deviceOrientationSetting =
            Common.Settings.Settings.instance().createSetting('emulation.device-orientation-override', '');
        this.deviceOrientation = SDK.EmulationModel.DeviceOrientation.parseSetting(this.deviceOrientationSetting.get());
        this.deviceOrientationOverrideEnabled = false;
        this.createDeviceOrientationSection();
        this.createPanelSeparator();
        this.appendTouchControl();
        this.createPanelSeparator();
        this.appendIdleEmulator();
        this.createPanelSeparator();
        this.createHardwareConcurrencySection();
        this.createPanelSeparator();
        this.createPressureSection();
        this.createPanelSeparator();
    }
    createPanelSeparator() {
        this.contentElement.createChild('div').classList.add('panel-section-separator');
    }
    createLocationSection(location) {
        const geogroup = this.contentElement.createChild('section', 'sensors-group');
        geogroup.setAttribute('jslog', `${VisualLogging.section('location')}`);
        const geogroupTitle = UI.UIUtils.createLabel(i18nString(UIStrings.location), 'sensors-group-title');
        geogroup.appendChild(geogroupTitle);
        const fields = geogroup.createChild('div', 'geo-fields');
        let selectedIndex = 0;
        const noOverrideOption = { title: i18nString(UIStrings.noOverride), location: NonPresetOptions.NoOverride };
        this.locationSelectElement = fields.createChild('select');
        this.locationSelectElement.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true })}`);
        UI.ARIAUtils.bindLabelToControl(geogroupTitle, this.locationSelectElement);
        // No override
        this.locationSelectElement.appendChild(UI.UIUtils.createOption(noOverrideOption.title, noOverrideOption.location, 'no-override'));
        this.customLocationsGroup = this.locationSelectElement.createChild('optgroup');
        this.customLocationsGroup.label = i18nString(UIStrings.overrides);
        const customLocations = Common.Settings.Settings.instance().moduleSetting('emulation.locations');
        const manageButton = UI.UIUtils.createTextButton(i18nString(UIStrings.manage), () => Common.Revealer.reveal(customLocations), { className: 'manage-locations', jslogContext: 'sensors.manage-locations' });
        UI.ARIAUtils.setLabel(manageButton, i18nString(UIStrings.manageTheListOfLocations));
        fields.appendChild(manageButton);
        const fillCustomSettings = () => {
            if (!this.customLocationsGroup) {
                return;
            }
            this.customLocationsGroup.removeChildren();
            for (const [i, customLocation] of customLocations.get().entries()) {
                this.customLocationsGroup.appendChild(UI.UIUtils.createOption(customLocation.title, JSON.stringify(customLocation), 'custom'));
                if (location.latitude === customLocation.lat && location.longitude === customLocation.long) {
                    // If the location coming from settings matches the custom location, use its index to select the option
                    selectedIndex = i + 1;
                }
            }
        };
        customLocations.addChangeListener(fillCustomSettings);
        fillCustomSettings();
        // Other location
        const customLocationOption = { title: i18nString(UIStrings.other), location: NonPresetOptions.Custom };
        this.locationSelectElement.appendChild(UI.UIUtils.createOption(customLocationOption.title, customLocationOption.location, 'other'));
        // Error location.
        const group = this.locationSelectElement.createChild('optgroup');
        group.label = i18nString(UIStrings.error);
        group.appendChild(UI.UIUtils.createOption(i18nString(UIStrings.locationUnavailable), NonPresetOptions.Unavailable, 'unavailable'));
        this.locationSelectElement.selectedIndex = selectedIndex;
        this.locationSelectElement.addEventListener('change', this.#locationSelectChanged.bind(this));
        this.fieldsetElement = fields.createChild('fieldset');
        this.fieldsetElement.disabled = !this.#locationOverrideEnabled;
        this.fieldsetElement.id = 'location-override-section';
        const latitudeGroup = this.fieldsetElement.createChild('div', 'latlong-group');
        const longitudeGroup = this.fieldsetElement.createChild('div', 'latlong-group');
        const timezoneGroup = this.fieldsetElement.createChild('div', 'latlong-group');
        const localeGroup = this.fieldsetElement.createChild('div', 'latlong-group');
        const accuracyGroup = this.fieldsetElement.createChild('div', 'latlong-group');
        const cmdOrCtrl = Host.Platform.isMac() ? '\u2318' : 'Ctrl';
        const modifierKeyMessage = i18nString(UIStrings.adjustWithMousewheelOrUpdownKeys, { PH1: cmdOrCtrl });
        this.latitudeInput = UI.UIUtils.createInput('', 'number', 'latitude');
        latitudeGroup.appendChild(this.latitudeInput);
        this.latitudeInput.setAttribute('step', 'any');
        this.latitudeInput.value = '0';
        this.latitudeSetter = UI.UIUtils.bindInput(this.latitudeInput, this.applyLocationUserInput.bind(this), SDK.EmulationModel.Location.latitudeValidator, true, 0.1);
        this.latitudeSetter(String(location.latitude));
        UI.Tooltip.Tooltip.install(this.latitudeInput, modifierKeyMessage);
        latitudeGroup.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.latitude), 'latlong-title', this.latitudeInput));
        this.longitudeInput = UI.UIUtils.createInput('', 'number', 'longitude');
        longitudeGroup.appendChild(this.longitudeInput);
        this.longitudeInput.setAttribute('step', 'any');
        this.longitudeInput.value = '0';
        this.longitudeSetter = UI.UIUtils.bindInput(this.longitudeInput, this.applyLocationUserInput.bind(this), SDK.EmulationModel.Location.longitudeValidator, true, 0.1);
        this.longitudeSetter(String(location.longitude));
        UI.Tooltip.Tooltip.install(this.longitudeInput, modifierKeyMessage);
        longitudeGroup.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.longitude), 'latlong-title', this.longitudeInput));
        this.timezoneInput = UI.UIUtils.createInput('', 'text', 'timezone');
        timezoneGroup.appendChild(this.timezoneInput);
        this.timezoneInput.value = 'Europe/Berlin';
        this.timezoneSetter = UI.UIUtils.bindInput(this.timezoneInput, this.applyLocationUserInput.bind(this), SDK.EmulationModel.Location.timezoneIdValidator, false);
        this.timezoneSetter(location.timezoneId);
        timezoneGroup.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.timezoneId), 'timezone-title', this.timezoneInput));
        this.timezoneError = timezoneGroup.createChild('div', 'timezone-error');
        this.localeInput = UI.UIUtils.createInput('', 'text', 'locale');
        localeGroup.appendChild(this.localeInput);
        this.localeInput.value = 'en-US';
        this.localeSetter = UI.UIUtils.bindInput(this.localeInput, this.applyLocationUserInput.bind(this), SDK.EmulationModel.Location.localeValidator, false);
        this.localeSetter(location.locale);
        localeGroup.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.locale), 'locale-title', this.localeInput));
        this.localeError = localeGroup.createChild('div', 'locale-error');
        this.accuracyInput = UI.UIUtils.createInput('', 'number', 'accuracy');
        accuracyGroup.appendChild(this.accuracyInput);
        this.accuracyInput.step = 'any';
        this.accuracyInput.value = SDK.EmulationModel.Location.DEFAULT_ACCURACY.toString();
        this.accuracySetter = UI.UIUtils.bindInput(this.accuracyInput, this.applyLocationUserInput.bind(this), (value) => SDK.EmulationModel.Location.accuracyValidator(value).valid, true, 1);
        this.accuracySetter(String(location.accuracy || SDK.EmulationModel.Location.DEFAULT_ACCURACY));
        accuracyGroup.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.accuracy), 'accuracy-title', this.accuracyInput));
        this.accuracyError = accuracyGroup.createChild('div', 'accuracy-error');
    }
    #locationSelectChanged() {
        this.fieldsetElement.disabled = false;
        this.timezoneError.textContent = '';
        this.accuracyError.textContent = '';
        const value = this.locationSelectElement.options[this.locationSelectElement.selectedIndex].value;
        if (value === NonPresetOptions.NoOverride) {
            this.#locationOverrideEnabled = false;
            this.clearFieldsetElementInputs();
            this.fieldsetElement.disabled = true;
        }
        else if (value === NonPresetOptions.Custom) {
            this.#locationOverrideEnabled = true;
            const location = SDK.EmulationModel.Location.parseUserInput(this.latitudeInput.value.trim(), this.longitudeInput.value.trim(), this.timezoneInput.value.trim(), this.localeInput.value.trim(), this.accuracyInput.value.trim());
            if (!location) {
                return;
            }
            this.#location = location;
        }
        else if (value === NonPresetOptions.Unavailable) {
            this.#locationOverrideEnabled = true;
            this.#location =
                new SDK.EmulationModel.Location(0, 0, '', '', SDK.EmulationModel.Location.DEFAULT_ACCURACY, true);
        }
        else {
            this.#locationOverrideEnabled = true;
            const coordinates = JSON.parse(value);
            this.#location = new SDK.EmulationModel.Location(coordinates.lat, coordinates.long, coordinates.timezoneId, coordinates.locale, coordinates.accuracy || SDK.EmulationModel.Location.DEFAULT_ACCURACY, false);
            this.latitudeSetter(coordinates.lat);
            this.longitudeSetter(coordinates.long);
            this.timezoneSetter(coordinates.timezoneId);
            this.localeSetter(coordinates.locale);
            this.accuracySetter(String(coordinates.accuracy || SDK.EmulationModel.Location.DEFAULT_ACCURACY));
        }
        this.applyLocation();
        if (value === NonPresetOptions.Custom) {
            this.latitudeInput.focus();
        }
    }
    applyLocationUserInput() {
        const location = SDK.EmulationModel.Location.parseUserInput(this.latitudeInput.value.trim(), this.longitudeInput.value.trim(), this.timezoneInput.value.trim(), this.localeInput.value.trim(), this.accuracyInput.value.trim());
        if (!location) {
            return;
        }
        this.timezoneError.textContent = '';
        this.accuracyError.textContent = '';
        this.setSelectElementLabel(this.locationSelectElement, NonPresetOptions.Custom);
        this.#location = location;
        this.applyLocation();
    }
    applyLocation() {
        if (this.#locationOverrideEnabled) {
            this.#locationSetting.set(this.#location.toSetting());
        }
        else {
            this.#locationSetting.set('');
        }
        for (const emulationModel of SDK.TargetManager.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
            emulationModel.emulateLocation(this.#locationOverrideEnabled ? this.#location : null).catch(err => {
                switch (err.type) {
                    case 'emulation-set-timezone': {
                        this.timezoneError.textContent = err.message;
                        break;
                    }
                    case 'emulation-set-locale': {
                        this.localeError.textContent = err.message;
                        break;
                    }
                    case 'emulation-set-accuracy': {
                        this.accuracyError.textContent = err.message;
                        break;
                    }
                }
            });
        }
    }
    clearFieldsetElementInputs() {
        this.latitudeSetter('0');
        this.longitudeSetter('0');
        this.timezoneSetter('');
        this.localeSetter('');
        this.accuracySetter(SDK.EmulationModel.Location.DEFAULT_ACCURACY.toString());
    }
    createDeviceOrientationSection() {
        const orientationGroup = this.contentElement.createChild('section', 'sensors-group');
        orientationGroup.setAttribute('jslog', `${VisualLogging.section('device-orientation')}`);
        const orientationTitle = UI.UIUtils.createLabel(i18nString(UIStrings.orientation), 'sensors-group-title');
        orientationGroup.appendChild(orientationTitle);
        const orientationContent = orientationGroup.createChild('div', 'orientation-content');
        const fields = orientationContent.createChild('div', 'orientation-fields');
        const orientationOffOption = {
            title: i18nString(UIStrings.off),
            orientation: NonPresetOptions.NoOverride,
            jslogContext: 'off',
        };
        const customOrientationOption = {
            title: i18nString(UIStrings.customOrientation),
            orientation: NonPresetOptions.Custom,
        };
        const orientationGroups = [{
                title: i18nString(UIStrings.presets),
                value: [
                    { title: i18nString(UIStrings.portrait), orientation: '[0, 90, 0]', jslogContext: 'portrait' },
                    {
                        title: i18nString(UIStrings.portraitUpsideDown),
                        orientation: '[180, -90, 0]',
                        jslogContext: 'portrait-upside-down',
                    },
                    { title: i18nString(UIStrings.landscapeLeft), orientation: '[90, 0, -90]', jslogContext: 'landscape-left' },
                    { title: i18nString(UIStrings.landscapeRight), orientation: '[90, -180, -90]', jslogContext: 'landscape-right' },
                    { title: i18nString(UIStrings.displayUp), orientation: '[0, 0, 0]', jslogContext: 'display-up' },
                    { title: i18nString(UIStrings.displayDown), orientation: '[0, -180, 0]', jslogContext: 'displayUp-down' },
                ],
            }];
        this.orientationSelectElement = this.contentElement.createChild('select');
        this.orientationSelectElement.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true })}`);
        UI.ARIAUtils.bindLabelToControl(orientationTitle, this.orientationSelectElement);
        this.orientationSelectElement.appendChild(UI.UIUtils.createOption(orientationOffOption.title, orientationOffOption.orientation, orientationOffOption.jslogContext));
        this.orientationSelectElement.appendChild(UI.UIUtils.createOption(customOrientationOption.title, customOrientationOption.orientation, 'custom'));
        for (let i = 0; i < orientationGroups.length; ++i) {
            const groupElement = this.orientationSelectElement.createChild('optgroup');
            groupElement.label = orientationGroups[i].title;
            const group = orientationGroups[i].value;
            for (let j = 0; j < group.length; ++j) {
                groupElement.appendChild(UI.UIUtils.createOption(group[j].title, group[j].orientation, group[j].jslogContext));
            }
        }
        this.orientationSelectElement.selectedIndex = 0;
        fields.appendChild(this.orientationSelectElement);
        this.orientationSelectElement.addEventListener('change', this.orientationSelectChanged.bind(this));
        this.deviceOrientationFieldset = this.createDeviceOrientationOverrideElement(this.deviceOrientation);
        this.stageElement = orientationContent.createChild('div', 'orientation-stage');
        this.stageElement.setAttribute('jslog', `${VisualLogging.preview().track({ drag: true })}`);
        this.orientationLayer = this.stageElement.createChild('div', 'orientation-layer');
        this.boxElement = this.orientationLayer.createChild('section', 'orientation-box orientation-element');
        this.boxElement.createChild('section', 'orientation-front orientation-element');
        this.boxElement.createChild('section', 'orientation-top orientation-element');
        this.boxElement.createChild('section', 'orientation-back orientation-element');
        this.boxElement.createChild('section', 'orientation-left orientation-element');
        this.boxElement.createChild('section', 'orientation-right orientation-element');
        this.boxElement.createChild('section', 'orientation-bottom orientation-element');
        UI.UIUtils.installDragHandle(this.stageElement, this.onBoxDragStart.bind(this), event => {
            this.onBoxDrag(event);
        }, null, '-webkit-grabbing', '-webkit-grab');
        fields.appendChild(this.deviceOrientationFieldset);
        this.enableOrientationFields(true);
        this.setBoxOrientation(this.deviceOrientation, false);
    }
    createPressureSection() {
        const container = this.contentElement.createChild('div', 'pressure-section');
        const control = SettingsUI.SettingsUI.createControlForSetting(Common.Settings.Settings.instance().moduleSetting('emulation.cpu-pressure'), i18nString(UIStrings.forcesSelectedPressureStateEmulation));
        if (control) {
            container.appendChild(control);
        }
    }
    enableOrientationFields(disable) {
        if (disable) {
            this.deviceOrientationFieldset.disabled = true;
            this.stageElement.classList.add('disabled');
            UI.Tooltip.Tooltip.install(this.stageElement, i18nString(UIStrings.enableOrientationToRotate));
        }
        else {
            this.deviceOrientationFieldset.disabled = false;
            this.stageElement.classList.remove('disabled');
            UI.Tooltip.Tooltip.install(this.stageElement, i18nString(UIStrings.shiftdragHorizontallyToRotate));
        }
    }
    orientationSelectChanged() {
        const value = this.orientationSelectElement.options[this.orientationSelectElement.selectedIndex].value;
        this.enableOrientationFields(false);
        if (value === NonPresetOptions.NoOverride) {
            this.deviceOrientationOverrideEnabled = false;
            this.enableOrientationFields(true);
            this.applyDeviceOrientation();
        }
        else if (value === NonPresetOptions.Custom) {
            this.deviceOrientationOverrideEnabled = true;
            this.resetDeviceOrientation();
            this.alphaElement.focus();
        }
        else {
            const parsedValue = JSON.parse(value);
            this.deviceOrientationOverrideEnabled = true;
            this.deviceOrientation = new SDK.EmulationModel.DeviceOrientation(parsedValue[0], parsedValue[1], parsedValue[2]);
            this.setDeviceOrientation(this.deviceOrientation, "selectPreset" /* DeviceOrientationModificationSource.SELECT_PRESET */);
        }
    }
    applyDeviceOrientation() {
        if (this.deviceOrientationOverrideEnabled) {
            this.deviceOrientationSetting.set(this.deviceOrientation.toSetting());
        }
        for (const emulationModel of SDK.TargetManager.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
            void emulationModel.emulateDeviceOrientation(this.deviceOrientationOverrideEnabled ? this.deviceOrientation : null);
        }
    }
    setSelectElementLabel(selectElement, labelValue) {
        const optionValues = Array.prototype.map.call(selectElement.options, x => x.value);
        selectElement.selectedIndex = optionValues.indexOf(labelValue);
    }
    applyDeviceOrientationUserInput() {
        this.setDeviceOrientation(SDK.EmulationModel.DeviceOrientation.parseUserInput(this.alphaElement.value.trim(), this.betaElement.value.trim(), this.gammaElement.value.trim()), "userInput" /* DeviceOrientationModificationSource.USER_INPUT */);
        this.setSelectElementLabel(this.orientationSelectElement, NonPresetOptions.Custom);
    }
    resetDeviceOrientation() {
        this.setDeviceOrientation(new SDK.EmulationModel.DeviceOrientation(0, 90, 0), "resetButton" /* DeviceOrientationModificationSource.RESET_BUTTON */);
        this.setSelectElementLabel(this.orientationSelectElement, '[0, 90, 0]');
    }
    setDeviceOrientation(deviceOrientation, modificationSource) {
        if (!deviceOrientation) {
            return;
        }
        function roundAngle(angle) {
            return Math.round(angle * 10000) / 10000;
        }
        if (modificationSource !== "userInput" /* DeviceOrientationModificationSource.USER_INPUT */) {
            // Even though the angles in |deviceOrientation| will not be rounded
            // here, their precision will be rounded by CSS when we change
            // |this.orientationLayer.style| in setBoxOrientation().
            this.alphaSetter(String(roundAngle(deviceOrientation.alpha)));
            this.betaSetter(String(roundAngle(deviceOrientation.beta)));
            this.gammaSetter(String(roundAngle(deviceOrientation.gamma)));
        }
        const animate = modificationSource !== "userDrag" /* DeviceOrientationModificationSource.USER_DRAG */;
        this.setBoxOrientation(deviceOrientation, animate);
        this.deviceOrientation = deviceOrientation;
        this.applyDeviceOrientation();
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.deviceOrientationSetToAlphaSBeta, { PH1: deviceOrientation.alpha, PH2: deviceOrientation.beta, PH3: deviceOrientation.gamma }));
    }
    createAxisInput(parentElement, input, label, validator) {
        const div = parentElement.createChild('div', 'orientation-axis-input-container');
        div.appendChild(input);
        div.appendChild(UI.UIUtils.createLabel(label, /* className */ '', input));
        return UI.UIUtils.bindInput(input, this.applyDeviceOrientationUserInput.bind(this), validator, true);
    }
    createDeviceOrientationOverrideElement(deviceOrientation) {
        const fieldsetElement = document.createElement('fieldset');
        fieldsetElement.classList.add('device-orientation-override-section');
        const cellElement = fieldsetElement.createChild('td', 'orientation-inputs-cell');
        this.alphaElement = UI.UIUtils.createInput('', 'number', 'alpha');
        this.alphaElement.setAttribute('step', 'any');
        this.alphaSetter = this.createAxisInput(cellElement, this.alphaElement, i18nString(UIStrings.alpha), SDK.EmulationModel.DeviceOrientation.alphaAngleValidator);
        this.alphaSetter(String(deviceOrientation.alpha));
        this.betaElement = UI.UIUtils.createInput('', 'number', 'beta');
        this.betaElement.setAttribute('step', 'any');
        this.betaSetter = this.createAxisInput(cellElement, this.betaElement, i18nString(UIStrings.beta), SDK.EmulationModel.DeviceOrientation.betaAngleValidator);
        this.betaSetter(String(deviceOrientation.beta));
        this.gammaElement = UI.UIUtils.createInput('', 'number', 'gamma');
        this.gammaElement.setAttribute('step', 'any');
        this.gammaSetter = this.createAxisInput(cellElement, this.gammaElement, i18nString(UIStrings.gamma), SDK.EmulationModel.DeviceOrientation.gammaAngleValidator);
        this.gammaSetter(String(deviceOrientation.gamma));
        const resetButton = UI.UIUtils.createTextButton(i18nString(UIStrings.reset), this.resetDeviceOrientation.bind(this), { className: 'orientation-reset-button', jslogContext: 'sensors.reset-device-orientiation' });
        UI.ARIAUtils.setLabel(resetButton, i18nString(UIStrings.resetDeviceOrientation));
        resetButton.setAttribute('type', 'reset');
        cellElement.appendChild(resetButton);
        return fieldsetElement;
    }
    setBoxOrientation(deviceOrientation, animate) {
        if (animate) {
            this.stageElement.classList.add('is-animating');
        }
        else {
            this.stageElement.classList.remove('is-animating');
        }
        // It is important to explain the multiple conversions happening here. A
        // few notes on coordinate spaces first:
        // 1. The CSS coordinate space is left-handed. X and Y are parallel to the
        //    screen, and Z is perpendicular to the screen. X is positive to the
        //    right, Y is positive downwards and Z increases towards the viewer.
        //    See https://drafts.csswg.org/css-transforms-2/#transform-rendering
        //    for more information.
        // 2. The Device Orientation coordinate space is right-handed. X and Y are
        //    parallel to the screen, and Z is perpenticular to the screen. X is
        //    positive to the right, Y is positive upwards and Z increases towards
        //    the viewer. See
        //    https://w3c.github.io/deviceorientation/#deviceorientation for more
        //    information.
        // 3. Additionally, the phone model we display is rotated +90 degrees in
        //    the X axis in the CSS coordinate space (i.e. when all angles are 0 we
        //    cannot see its screen in DevTools).
        //
        // |this.boxMatrix| is set in the Device Orientation coordinate space
        // because it represents the phone model we show users and also because the
        // calculations in Geometry.EulerAngles assume this coordinate space (so
        // we apply the rotations in the Z-X'-Y'' order).
        // The CSS transforms, on the other hand, are done in the CSS coordinate
        // space, so we need to convert 2) to 1) while keeping 3) in mind. We can
        // cover 3) by swapping the Y and Z axes, and 2) by inverting the X axis.
        const { alpha, beta, gamma } = deviceOrientation;
        this.boxMatrix = new DOMMatrixReadOnly().rotate(0, 0, alpha).rotate(beta, 0, 0).rotate(0, gamma, 0);
        this.orientationLayer.style.transform = `rotateY(${alpha}deg) rotateX(${-beta}deg) rotateZ(${gamma}deg)`;
    }
    onBoxDrag(event) {
        const mouseMoveVector = this.calculateRadiusVector(event.x, event.y);
        if (!mouseMoveVector) {
            return true;
        }
        if (!this.mouseDownVector) {
            return true;
        }
        event.consume(true);
        let axis, angle;
        if (event.shiftKey) {
            axis = new Geometry.Vector(0, 0, 1);
            angle = (mouseMoveVector.x - this.mouseDownVector.x) * ShiftDragOrientationSpeed;
        }
        else {
            axis = Geometry.crossProduct(this.mouseDownVector, mouseMoveVector);
            angle = Geometry.calculateAngle(this.mouseDownVector, mouseMoveVector);
        }
        // See the comment in setBoxOrientation() for a longer explanation about
        // the CSS coordinate space, the Device Orientation coordinate space and
        // the conversions we make. |axis| and |angle| are in the CSS coordinate
        // space, while |this.originalBoxMatrix| is rotated and in the Device
        // Orientation coordinate space, which is why we swap Y and Z and invert X.
        const currentMatrix = new DOMMatrixReadOnly().rotateAxisAngle(-axis.x, axis.z, axis.y, angle).multiply(this.originalBoxMatrix);
        const eulerAngles = Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(currentMatrix);
        const newOrientation = new SDK.EmulationModel.DeviceOrientation(eulerAngles.alpha, eulerAngles.beta, eulerAngles.gamma);
        this.setDeviceOrientation(newOrientation, "userDrag" /* DeviceOrientationModificationSource.USER_DRAG */);
        this.setSelectElementLabel(this.orientationSelectElement, NonPresetOptions.Custom);
        return false;
    }
    onBoxDragStart(event) {
        if (!this.deviceOrientationOverrideEnabled) {
            return false;
        }
        this.mouseDownVector = this.calculateRadiusVector(event.x, event.y);
        this.originalBoxMatrix = this.boxMatrix;
        if (!this.mouseDownVector) {
            return false;
        }
        event.consume(true);
        return true;
    }
    calculateRadiusVector(x, y) {
        const rect = this.stageElement.getBoundingClientRect();
        const radius = Math.max(rect.width, rect.height) / 2;
        const sphereX = (x - rect.left - rect.width / 2) / radius;
        const sphereY = (y - rect.top - rect.height / 2) / radius;
        const sqrSum = sphereX * sphereX + sphereY * sphereY;
        if (sqrSum > 0.5) {
            return new Geometry.Vector(sphereX, sphereY, 0.5 / Math.sqrt(sqrSum));
        }
        return new Geometry.Vector(sphereX, sphereY, Math.sqrt(1 - sqrSum));
    }
    appendTouchControl() {
        const container = this.contentElement.createChild('div', 'touch-section');
        const control = SettingsUI.SettingsUI.createControlForSetting(Common.Settings.Settings.instance().moduleSetting('emulation.touch'), i18nString(UIStrings.forcesTouchInsteadOfClick));
        if (control) {
            container.appendChild(control);
        }
    }
    appendIdleEmulator() {
        const container = this.contentElement.createChild('div', 'idle-section');
        const control = SettingsUI.SettingsUI.createControlForSetting(Common.Settings.Settings.instance().moduleSetting('emulation.idle-detection'), i18nString(UIStrings.forcesSelectedIdleStateEmulation));
        if (control) {
            container.appendChild(control);
        }
    }
    createHardwareConcurrencySection() {
        const container = this.contentElement.createChild('div', 'concurrency-section');
        const { checkbox, numericInput, reset, warning } = MobileThrottling.ThrottlingManager.throttlingManager().createHardwareConcurrencySelector();
        const div = document.createElement('div');
        div.classList.add('concurrency-details');
        div.append(numericInput.element, reset.element, warning.element);
        container.append(checkbox, div);
    }
}
export const PressureOptions = {
    NoOverride: 'no-override',
    Nominal: 'nominal',
    Fair: 'fair',
    Serious: 'serious',
    Critical: 'critical',
};
export const NonPresetOptions = {
    NoOverride: 'noOverride',
    Custom: 'custom',
    Unavailable: 'unavailable',
};
export class ShowActionDelegate {
    handleAction(_context, _actionId) {
        void UI.ViewManager.ViewManager.instance().showView('sensors');
        return true;
    }
}
export const ShiftDragOrientationSpeed = 16;
//# sourceMappingURL=SensorsView.js.map