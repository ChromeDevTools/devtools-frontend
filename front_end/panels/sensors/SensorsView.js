// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
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
    #locationSectionElement;
    fieldsetElement;
    timezoneError;
    locationSelectElement;
    latitudeInput;
    longitudeInput;
    timezoneInput;
    localeInput;
    accuracyInput;
    localeError;
    accuracyError;
    deviceOrientationSetting;
    deviceOrientation;
    deviceOrientationOverrideEnabled;
    deviceOrientationFieldset;
    stageElement;
    orientationSelectElement;
    alphaElement;
    betaElement;
    gammaElement;
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
        this.#locationSectionElement = this.contentElement.createChild('section', 'sensors-group');
        const customLocationsSetting = Common.Settings.Settings.instance().moduleSetting('emulation.locations');
        this.renderLocationSection(this.#location, customLocationsSetting);
        customLocationsSetting.addChangeListener(() => this.renderLocationSection(this.#location, customLocationsSetting));
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
    renderLocationSection(location, customLocationsSetting) {
        const customLocations = customLocationsSetting.get();
        let selectedIndex = 0;
        if (this.#locationOverrideEnabled) {
            if (location.unavailable) {
                selectedIndex = customLocations.length + 2;
            }
            else {
                selectedIndex = customLocations.length + 1;
                for (const [i, customLocation] of customLocations.entries()) {
                    if (location.latitude === customLocation.lat && location.longitude === customLocation.long &&
                        location.timezoneId === customLocation.timezoneId && location.locale === customLocation.locale) {
                        selectedIndex = i + 1;
                        break;
                    }
                }
            }
        }
        const cmdOrCtrl = Host.Platform.isMac() ? '\u2318' : 'Ctrl';
        const modifierKeyMessage = i18nString(UIStrings.adjustWithMousewheelOrUpdownKeys, { PH1: cmdOrCtrl });
        this.#locationSectionElement.setAttribute('jslog', `${VisualLogging.section('location')}`);
        // clang-format off
        // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
        render(html `
      <label class="sensors-group-title" id="location-select-label" for="location-select">${i18nString(UIStrings.location)}</label>
      <div class="geo-fields">
        <select
          id="location-select"
          ${Directives.ref((el) => {
            if (el) {
                this.locationSelectElement = el;
            }
        })}
          .selectedIndex=${selectedIndex}
          @change=${this.#locationSelectChanged.bind(this)}
          jslog=${VisualLogging.dropDown().track({ change: true })}
        >
          <option value=${NonPresetOptions.NoOverride} jslog=${VisualLogging.item('no-override')}>${i18nString(UIStrings.noOverride)}</option>
          <optgroup label=${i18nString(UIStrings.overrides)}>
            ${customLocations.map(customLocation => html `
              <option value=${JSON.stringify(customLocation)} jslog=${VisualLogging.item('custom')}>${customLocation.title}</option>
            `)}
          </optgroup>
          <option value=${NonPresetOptions.Custom} jslog=${VisualLogging.item('other')}>${i18nString(UIStrings.other)}</option>
          <optgroup label=${i18nString(UIStrings.error)}>
            <option value=${NonPresetOptions.Unavailable} jslog=${VisualLogging.item('unavailable')}>${i18nString(UIStrings.locationUnavailable)}</option>
          </optgroup>
        </select>
        <devtools-button
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          class="manage-locations"
          @click=${() => Common.Revealer.reveal(customLocationsSetting)}
          aria-label=${i18nString(UIStrings.manageTheListOfLocations)}
          jslog=${VisualLogging.action('sensors.manage-locations').track({ click: true })}
        >
          ${i18nString(UIStrings.manage)}
        </devtools-button>
        <fieldset
          id="location-override-section"
          ?disabled=${!this.#locationOverrideEnabled}
          ${Directives.ref((el) => {
            if (el) {
                this.fieldsetElement = el;
            }
        })}
        >
          <!-- @ts-ignore -->
          <div class="latlong-group">
            <input
              id="latitude-input"
              type="number"
              step="any"
              .value=${String(location.latitude)}
              name="latitude"
              title=${modifierKeyMessage}
              jslog=${VisualLogging.textField('latitude').track({ change: true })}
              ${Directives.ref((el) => { if (el) {
            this.latitudeInput = el;
        } })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="latlong-title" for="latitude-input">${i18nString(UIStrings.latitude)}</label>
          </div>
          <!-- @ts-ignore -->
          <div class="latlong-group">
            <input
              id="longitude-input"
              type="number"
              step="any"
              .value=${String(location.longitude)}
              name="longitude"
              title=${modifierKeyMessage}
              jslog=${VisualLogging.textField('longitude').track({ change: true })}
              ${Directives.ref((el) => { if (el) {
            this.longitudeInput = el;
        } })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="latlong-title" for="longitude-input">${i18nString(UIStrings.longitude)}</label>
          </div>
          <div class="latlong-group">
            <input
              id="timezone-input"
              type="text"
              .value=${location.timezoneId}
              name="timezone"
              jslog=${VisualLogging.textField('timezone').track({ change: true })}
              ${Directives.ref((el) => { if (el) {
            this.timezoneInput = el;
        } })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="timezone-title" for="timezone-input">${i18nString(UIStrings.timezoneId)}</label>
            <div class="timezone-error" ${Directives.ref((el) => { if (el) {
            this.timezoneError = el;
        } })}></div>
          </div>
          <div class="latlong-group">
            <input
              id="locale-input"
              type="text"
              .value=${location.locale}
              name="locale"
              jslog=${VisualLogging.textField('locale').track({ change: true })}
              ${Directives.ref((el) => { if (el) {
            this.localeInput = el;
        } })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="locale-title" for="locale-input">${i18nString(UIStrings.locale)}</label>
            <div class="locale-error" ${Directives.ref((el) => { if (el) {
            this.localeError = el;
        } })}></div>
          </div>
          <!-- @ts-ignore -->
          <div class="latlong-group">
            <input
              id="accuracy-input"
              type="number"
              step="any"
              .value=${String(location.accuracy || SDK.EmulationModel.Location.DEFAULT_ACCURACY)}
              name="accuracy"
              jslog=${VisualLogging.textField('accuracy').track({ change: true })}
              ${Directives.ref((el) => { if (el) {
            this.accuracyInput = el;
        } })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="accuracy-title" for="accuracy-input">${i18nString(UIStrings.accuracy)}</label>
            <div class="accuracy-error" ${Directives.ref((el) => { if (el) {
            this.accuracyError = el;
        } })}></div>
          </div>
        </fieldset>
      </div>
    `, this.#locationSectionElement);
        // clang-format on
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
            this.#setInputValue(this.latitudeInput, coordinates.lat);
            this.#setInputValue(this.longitudeInput, coordinates.long);
            this.#setInputValue(this.timezoneInput, coordinates.timezoneId);
            this.#setInputValue(this.localeInput, coordinates.locale);
            this.#setInputValue(this.accuracyInput, String(coordinates.accuracy || SDK.EmulationModel.Location.DEFAULT_ACCURACY));
        }
        this.applyLocation();
        if (value === NonPresetOptions.Custom) {
            this.latitudeInput.focus();
        }
    }
    #onLocationInput(event) {
        const input = event.currentTarget;
        const valid = this.#validateInput(input, input.value);
        input.classList.toggle('error-input', !valid);
    }
    #onLocationChange(event) {
        const input = event.currentTarget;
        const valid = this.#validateInput(input, input.value);
        input.classList.toggle('error-input', !valid);
        if (valid) {
            this.applyLocationUserInput();
        }
    }
    #onLocationKeyDown(event) {
        const input = event.currentTarget;
        if (event.key === 'Enter') {
            const valid = this.#validateInput(input, input.value);
            if (valid) {
                this.applyLocationUserInput();
            }
            event.preventDefault();
            return;
        }
        const isNumeric = input === this.latitudeInput || input === this.longitudeInput || input === this.accuracyInput;
        if (!isNumeric) {
            return;
        }
        const multiplier = input === this.accuracyInput ? 1 : 0.1;
        const value = UI.UIUtils.modifiedFloatNumber(parseFloat(input.value), event, multiplier);
        if (value === null) {
            return;
        }
        const stringValue = String(value);
        const valid = this.#validateInput(input, stringValue);
        if (valid) {
            this.#setInputValue(input, stringValue);
        }
        event.preventDefault();
    }
    #onLocationFocus(event) {
        const input = event.currentTarget;
        input.select();
    }
    #validateInput(input, value) {
        if (input === this.latitudeInput) {
            return SDK.EmulationModel.Location.latitudeValidator(value);
        }
        if (input === this.longitudeInput) {
            return SDK.EmulationModel.Location.longitudeValidator(value);
        }
        if (input === this.timezoneInput) {
            return SDK.EmulationModel.Location.timezoneIdValidator(value);
        }
        if (input === this.localeInput) {
            return SDK.EmulationModel.Location.localeValidator(value);
        }
        if (input === this.accuracyInput) {
            return SDK.EmulationModel.Location.accuracyValidator(value).valid;
        }
        return false;
    }
    #setInputValue(input, value) {
        if (value === input.value) {
            return;
        }
        const valid = this.#validateInput(input, value);
        input.classList.toggle('error-input', !valid);
        input.value = value;
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
        this.#setInputValue(this.latitudeInput, '0');
        this.#setInputValue(this.longitudeInput, '0');
        this.#setInputValue(this.timezoneInput, '');
        this.#setInputValue(this.localeInput, '');
        this.#setInputValue(this.accuracyInput, SDK.EmulationModel.Location.DEFAULT_ACCURACY.toString());
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
            this.#setOrientationInputValue(this.alphaElement, String(roundAngle(deviceOrientation.alpha)));
            this.#setOrientationInputValue(this.betaElement, String(roundAngle(deviceOrientation.beta)));
            this.#setOrientationInputValue(this.gammaElement, String(roundAngle(deviceOrientation.gamma)));
        }
        const animate = modificationSource !== "userDrag" /* DeviceOrientationModificationSource.USER_DRAG */;
        this.setBoxOrientation(deviceOrientation, animate);
        this.deviceOrientation = deviceOrientation;
        this.applyDeviceOrientation();
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.deviceOrientationSetToAlphaSBeta, { PH1: deviceOrientation.alpha, PH2: deviceOrientation.beta, PH3: deviceOrientation.gamma }));
    }
    #onOrientationInput(event) {
        const input = event.currentTarget;
        const valid = this.#validateOrientationInput(input, input.value);
        input.classList.toggle('error-input', !valid);
    }
    #onOrientationChange(event) {
        const input = event.currentTarget;
        const valid = this.#validateOrientationInput(input, input.value);
        input.classList.toggle('error-input', !valid);
        if (valid) {
            this.applyDeviceOrientationUserInput();
        }
    }
    #onOrientationKeyDown(event) {
        const input = event.currentTarget;
        if (event.key === 'Enter') {
            const valid = this.#validateOrientationInput(input, input.value);
            if (valid) {
                this.applyDeviceOrientationUserInput();
            }
            event.preventDefault();
            return;
        }
        const value = UI.UIUtils.modifiedFloatNumber(parseFloat(input.value), event, 1);
        if (value === null) {
            return;
        }
        const stringValue = String(value);
        const valid = this.#validateOrientationInput(input, stringValue);
        if (valid) {
            this.#setOrientationInputValue(input, stringValue);
        }
        event.preventDefault();
    }
    #onOrientationFocus(event) {
        const input = event.currentTarget;
        input.select();
    }
    #validateOrientationInput(input, value) {
        if (input === this.alphaElement) {
            return SDK.EmulationModel.DeviceOrientation.alphaAngleValidator(value);
        }
        if (input === this.betaElement) {
            return SDK.EmulationModel.DeviceOrientation.betaAngleValidator(value);
        }
        if (input === this.gammaElement) {
            return SDK.EmulationModel.DeviceOrientation.gammaAngleValidator(value);
        }
        return false;
    }
    #setOrientationInputValue(input, value) {
        if (input.value === value) {
            return;
        }
        input.value = value;
        const valid = this.#validateOrientationInput(input, value);
        input.classList.toggle('error-input', !valid);
    }
    createDeviceOrientationOverrideElement(deviceOrientation) {
        const fieldsetElement = document.createElement('fieldset');
        fieldsetElement.classList.add('device-orientation-override-section');
        const cellElement = fieldsetElement.createChild('td', 'orientation-inputs-cell');
        this.alphaElement = UI.UIUtils.createInput('', 'number', 'alpha');
        this.alphaElement.setAttribute('step', 'any');
        this.#setupAxisInput(cellElement, this.alphaElement, i18nString(UIStrings.alpha));
        this.#setOrientationInputValue(this.alphaElement, String(deviceOrientation.alpha));
        this.betaElement = UI.UIUtils.createInput('', 'number', 'beta');
        this.betaElement.setAttribute('step', 'any');
        this.#setupAxisInput(cellElement, this.betaElement, i18nString(UIStrings.beta));
        this.#setOrientationInputValue(this.betaElement, String(deviceOrientation.beta));
        this.gammaElement = UI.UIUtils.createInput('', 'number', 'gamma');
        this.gammaElement.setAttribute('step', 'any');
        this.#setupAxisInput(cellElement, this.gammaElement, i18nString(UIStrings.gamma));
        this.#setOrientationInputValue(this.gammaElement, String(deviceOrientation.gamma));
        const resetButton = UI.UIUtils.createTextButton(i18nString(UIStrings.reset), this.resetDeviceOrientation.bind(this), { className: 'orientation-reset-button', jslogContext: 'sensors.reset-device-orientiation' });
        UI.ARIAUtils.setLabel(resetButton, i18nString(UIStrings.resetDeviceOrientation));
        resetButton.setAttribute('type', 'reset');
        cellElement.appendChild(resetButton);
        return fieldsetElement;
    }
    #setupAxisInput(parentElement, input, label) {
        const div = parentElement.createChild('div', 'orientation-axis-input-container');
        div.appendChild(input);
        div.appendChild(UI.UIUtils.createLabel(label, /* className */ '', input));
        input.addEventListener('change', this.#onOrientationChange.bind(this), false);
        input.addEventListener('input', this.#onOrientationInput.bind(this), false);
        input.addEventListener('keydown', this.#onOrientationKeyDown.bind(this), false);
        input.addEventListener('focus', this.#onOrientationFocus.bind(this), false);
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