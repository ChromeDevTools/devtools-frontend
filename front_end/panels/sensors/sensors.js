var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/sensors/LocationsSettingsTab.js
var LocationsSettingsTab_exports = {};
__export(LocationsSettingsTab_exports, {
  LocationsSettingsTab: () => LocationsSettingsTab
});
import "./../../ui/kit/kit.js";
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sensors/locationsSettingsTab.css.js
var locationsSettingsTab_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.add-locations-button {
  margin-bottom: var(--sys-size-5);
  border: none;
}

.locations-list {
  margin-top: var(--sys-size-3);
  flex: auto;
}

.locations-list-item {
  padding: 3px 6px;
  height: 30px;
  display: flex;
  align-items: center;
  position: relative;
  flex: auto 1 1;
}

.locations-list-text {
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-basis: 170px;
  user-select: none;
  color: var(--sys-color-on-surface);
  position: relative;
  overflow: hidden;
}

.locations-list-title {
  text-align: start;
}

.locations-list-title-text {
  overflow: hidden;
  flex: auto;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.locations-list-separator {
  flex: 0 0 1px;
  background-color: var(--sys-color-divider);
  height: 30px;
  margin: 0 4px;
}

.locations-list-separator-invisible {
  visibility: hidden;
  height: 100% !important; /* stylelint-disable-line declaration-no-important */
}

.locations-edit-row {
  display: flex;
  flex-direction: row;
  margin: 6px 5px;
}

.locations-edit-row input {
  width: 100%;
  text-align: inherit;
}

.locations-input-container {
  padding: 1px;
}

.settings-card-container-wrapper {
  scrollbar-gutter: stable;
  padding: var(--sys-size-8) 0;
  overflow: auto;
  position: absolute;
  inset: var(--sys-size-8) 0 0;
}

.settings-card-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sys-size-9);
}

/*# sourceURL=${import.meta.resolve("./locationsSettingsTab.css")} */`;

// gen/front_end/panels/sensors/LocationsSettingsTab.js
var UIStrings = {
  /**
   * @description Title in the Locations Settings Tab, where custom geographic locations that the user
   *has entered are stored.
   */
  locations: "Locations",
  /**
   * @description Label for the name of a geographic location that the user has entered.
   */
  locationName: "Location name",
  /**
   * @description Abbreviation of latitude in Locations Settings Tab of the Device Toolbar
   */
  lat: "Lat",
  /**
   * @description Abbreviation of longitude in Locations Settings Tab of the Device Toolbar
   */
  long: "Long",
  /**
   * @description Text in Sensors View of the Device Toolbar
   */
  timezoneId: "Timezone ID",
  /**
   * @description Label for text input for the locale of a particular location.
   */
  locale: "Locale",
  /**
   * @description Label for text input for the latitude of a GPS position.
   */
  latitude: "Latitude",
  /**
   * @description Label for text input for the longitude of a GPS position.
   */
  longitude: "Longitude",
  /**
   * @description Label for text input for the accuracy of a GPS position.
   */
  accuracy: "Accuracy",
  /**
   * @description Error message in the Locations settings pane that declares the location name input must not be empty
   */
  locationNameCannotBeEmpty: "Location name cannot be empty",
  /**
   * @description Error message in the Locations settings pane that declares the maximum length of the location name
   * @example {50} PH1
   */
  locationNameMustBeLessThanS: "Location name must be less than {PH1} characters",
  /**
   * @description Error message in the Locations settings pane that declares that the value for the latitude input must be a number
   */
  latitudeMustBeANumber: "Latitude must be a number",
  /**
   * @description Error message in the Locations settings pane that declares the minimum value for the latitude input
   * @example {-90} PH1
   */
  latitudeMustBeGreaterThanOrEqual: "Latitude must be greater than or equal to {PH1}",
  /**
   * @description Error message in the Locations settings pane that declares the maximum value for the latitude input
   * @example {90} PH1
   */
  latitudeMustBeLessThanOrEqualToS: "Latitude must be less than or equal to {PH1}",
  /**
   * @description Error message in the Locations settings pane that declares that the value for the longitude input must be a number
   */
  longitudeMustBeANumber: "Longitude must be a number",
  /**
   * @description Error message in the Locations settings pane that declares the minimum value for the longitude input
   * @example {-180} PH1
   */
  longitudeMustBeGreaterThanOr: "Longitude must be greater than or equal to {PH1}",
  /**
   * @description Error message in the Locations settings pane that declares the maximum value for the longitude input
   * @example {180} PH1
   */
  longitudeMustBeLessThanOrEqualTo: "Longitude must be less than or equal to {PH1}",
  /**
   * @description Error message in the Locations settings pane that declares timezone ID input invalid
   */
  timezoneIdMustContainAlphabetic: "Timezone ID must contain alphabetic characters",
  /**
   * @description Error message in the Locations settings pane that declares locale input invalid
   */
  localeMustContainAlphabetic: "Locale must contain alphabetic characters",
  /**
   * @description Error message in the Locations settings pane that declares that the value for the accuracy input must be a number
   */
  accuracyMustBeANumber: "Accuracy must be a number",
  /**
   * @description Error message in the Locations settings pane that declares the minimum value for the accuracy input
   * @example {0} PH1
   */
  accuracyMustBeGreaterThanOrEqual: "Accuracy must be greater than or equal to {PH1}",
  /**
   * @description Text of add locations button in Locations Settings Tab of the Device Toolbar
   */
  addLocation: "Add location"
};
var str_ = i18n.i18n.registerUIStrings("panels/sensors/LocationsSettingsTab.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var LocationsSettingsTab = class extends UI.Widget.VBox {
  list;
  customSetting;
  editor;
  constructor() {
    super({
      jslog: `${VisualLogging.pane("emulation-locations")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(locationsSettingsTab_css_default);
    const settingsContent = this.contentElement.createChild("div", "settings-card-container-wrapper").createChild("div");
    settingsContent.classList.add("settings-card-container");
    const locationsCard = settingsContent.createChild("devtools-card");
    locationsCard.heading = i18nString(UIStrings.locations);
    const listContainer = locationsCard.createChild("div");
    this.list = new UI.ListWidget.ListWidget(this, void 0, true);
    this.list.element.classList.add("locations-list");
    this.list.registerRequiredCSS(locationsSettingsTab_css_default);
    this.list.show(listContainer);
    this.customSetting = Common.Settings.Settings.instance().moduleSetting("emulation.locations");
    const list = this.customSetting.get().map((location) => replaceLocationTitles(location, this.customSetting.defaultValue));
    function replaceLocationTitles(location, defaultValues) {
      if (!location.title) {
        const replacement = defaultValues.find((defaultLocation) => defaultLocation.lat === location.lat && defaultLocation.long === location.long && defaultLocation.timezoneId === location.timezoneId && defaultLocation.locale === location.locale);
        if (!replacement) {
          console.error("Could not determine a location setting title");
        } else {
          return replacement;
        }
      }
      return location;
    }
    const addButton = new Buttons.Button.Button();
    addButton.classList.add("add-locations-button");
    addButton.data = {
      variant: "outlined",
      iconName: "plus",
      jslogContext: "emulation.add-location"
    };
    addButton.textContent = i18nString(UIStrings.addLocation);
    addButton.addEventListener("click", () => this.addButtonClicked());
    locationsCard.append(addButton);
    this.customSetting.set(list);
    this.customSetting.addChangeListener(this.locationsUpdated, this);
  }
  wasShown() {
    super.wasShown();
    this.locationsUpdated();
  }
  locationsUpdated() {
    this.list.clear();
    const conditions = this.customSetting.get();
    for (const condition of conditions) {
      this.list.appendItem(condition, true);
    }
    this.list.appendSeparator();
  }
  addButtonClicked() {
    this.list.addNewItem(this.customSetting.get().length, {
      title: "",
      lat: 0,
      long: 0,
      timezoneId: "",
      locale: "",
      accuracy: SDK.EmulationModel.Location.DEFAULT_ACCURACY
    });
  }
  renderItem(location, _editable) {
    const element = document.createElement("div");
    element.role = "row";
    element.classList.add("locations-list-item");
    const title = element.createChild("div", "locations-list-text locations-list-title");
    title.role = "cell";
    const titleText = title.createChild("div", "locations-list-title-text");
    titleText.textContent = location.title;
    UI.Tooltip.Tooltip.install(titleText, location.title);
    element.createChild("div", "locations-list-separator");
    const lat = element.createChild("div", "locations-list-text");
    lat.textContent = String(location.lat);
    lat.role = "cell";
    element.createChild("div", "locations-list-separator");
    const long = element.createChild("div", "locations-list-text");
    long.textContent = String(location.long);
    long.role = "cell";
    element.createChild("div", "locations-list-separator");
    const timezoneId = element.createChild("div", "locations-list-text");
    timezoneId.textContent = location.timezoneId;
    timezoneId.role = "cell";
    element.createChild("div", "locations-list-separator");
    const locale = element.createChild("div", "locations-list-text");
    locale.textContent = location.locale;
    locale.role = "cell";
    element.createChild("div", "locations-list-separator");
    element.createChild("div", "locations-list-text").textContent = String(location.accuracy || SDK.EmulationModel.Location.DEFAULT_ACCURACY);
    return element;
  }
  removeItemRequested(_item, index) {
    const list = this.customSetting.get();
    list.splice(index, 1);
    this.customSetting.set(list);
  }
  commitEdit(location, editor, isNew) {
    location.title = editor.control("title").value.trim();
    const lat = editor.control("lat").value.trim();
    location.lat = lat ? parseFloat(lat) : 0;
    const long = editor.control("long").value.trim();
    location.long = long ? parseFloat(long) : 0;
    const timezoneId = editor.control("timezone-id").value.trim();
    location.timezoneId = timezoneId;
    const locale = editor.control("locale").value.trim();
    location.locale = locale;
    const accuracy = editor.control("accuracy").value.trim();
    location.accuracy = accuracy ? parseFloat(accuracy) : SDK.EmulationModel.Location.DEFAULT_ACCURACY;
    const list = this.customSetting.get();
    if (isNew) {
      list.push(location);
    }
    this.customSetting.set(list);
  }
  beginEdit(location) {
    const editor = this.createEditor();
    editor.control("title").value = location.title;
    editor.control("lat").value = String(location.lat);
    editor.control("long").value = String(location.long);
    editor.control("timezone-id").value = location.timezoneId;
    editor.control("locale").value = location.locale;
    editor.control("accuracy").value = String(location.accuracy || SDK.EmulationModel.Location.DEFAULT_ACCURACY);
    return editor;
  }
  createEditor() {
    if (this.editor) {
      return this.editor;
    }
    const editor = new UI.ListWidget.Editor();
    this.editor = editor;
    const content = editor.contentElement();
    const titles = content.createChild("div", "locations-edit-row");
    titles.createChild("div", "locations-list-text locations-list-title").textContent = i18nString(UIStrings.locationName);
    titles.createChild("div", "locations-list-separator locations-list-separator-invisible");
    titles.createChild("div", "locations-list-text").textContent = i18nString(UIStrings.lat);
    titles.createChild("div", "locations-list-separator locations-list-separator-invisible");
    titles.createChild("div", "locations-list-text").textContent = i18nString(UIStrings.long);
    titles.createChild("div", "locations-list-separator locations-list-separator-invisible");
    titles.createChild("div", "locations-list-text").textContent = i18nString(UIStrings.timezoneId);
    titles.createChild("div", "locations-list-separator locations-list-separator-invisible");
    titles.createChild("div", "locations-list-text").textContent = i18nString(UIStrings.locale);
    titles.createChild("div", "locations-list-separator locations-list-separator-invisible");
    titles.createChild("div", "locations-list-text").textContent = i18nString(UIStrings.accuracy);
    const fields = content.createChild("div", "locations-edit-row");
    fields.createChild("div", "locations-list-text locations-list-title locations-input-container").appendChild(editor.createInput("title", "text", i18nString(UIStrings.locationName), titleValidator));
    fields.createChild("div", "locations-list-separator locations-list-separator-invisible");
    let cell = fields.createChild("div", "locations-list-text locations-input-container");
    cell.appendChild(editor.createInput("lat", "text", i18nString(UIStrings.latitude), latValidator));
    fields.createChild("div", "locations-list-separator locations-list-separator-invisible");
    cell = fields.createChild("div", "locations-list-text locations-list-text-longitude locations-input-container");
    cell.appendChild(editor.createInput("long", "text", i18nString(UIStrings.longitude), longValidator));
    fields.createChild("div", "locations-list-separator locations-list-separator-invisible");
    cell = fields.createChild("div", "locations-list-text locations-input-container");
    cell.appendChild(editor.createInput("timezone-id", "text", i18nString(UIStrings.timezoneId), timezoneIdValidator));
    fields.createChild("div", "locations-list-separator locations-list-separator-invisible");
    cell = fields.createChild("div", "locations-list-text locations-input-container");
    cell.appendChild(editor.createInput("locale", "text", i18nString(UIStrings.locale), localeValidator));
    fields.createChild("div", "locations-list-separator locations-list-separator-invisible");
    cell = fields.createChild("div", "locations-list-text locations-input-container");
    cell.appendChild(editor.createInput("accuracy", "text", i18nString(UIStrings.accuracy), accuracyValidator));
    return editor;
    function titleValidator(_item, _index, input) {
      const maxLength = 50;
      const value = input.value.trim();
      let errorMessage;
      if (!value.length) {
        errorMessage = i18nString(UIStrings.locationNameCannotBeEmpty);
      } else if (value.length > maxLength) {
        errorMessage = i18nString(UIStrings.locationNameMustBeLessThanS, { PH1: maxLength });
      }
      if (errorMessage) {
        return { valid: false, errorMessage };
      }
      return {
        valid: true
      };
    }
    function latValidator(_item, _index, input) {
      const minLat = -90;
      const maxLat = 90;
      const value = input.value.trim();
      const parsedValue = Number(value);
      if (!value) {
        return {
          valid: true
        };
      }
      let errorMessage;
      if (Number.isNaN(parsedValue)) {
        errorMessage = i18nString(UIStrings.latitudeMustBeANumber);
      } else if (parseFloat(value) < minLat) {
        errorMessage = i18nString(UIStrings.latitudeMustBeGreaterThanOrEqual, { PH1: minLat });
      } else if (parseFloat(value) > maxLat) {
        errorMessage = i18nString(UIStrings.latitudeMustBeLessThanOrEqualToS, { PH1: maxLat });
      }
      if (errorMessage) {
        return { valid: false, errorMessage };
      }
      return {
        valid: true
      };
    }
    function longValidator(_item, _index, input) {
      const minLong = -180;
      const maxLong = 180;
      const value = input.value.trim();
      const parsedValue = Number(value);
      if (!value) {
        return {
          valid: true
        };
      }
      let errorMessage;
      if (Number.isNaN(parsedValue)) {
        errorMessage = i18nString(UIStrings.longitudeMustBeANumber);
      } else if (parseFloat(value) < minLong) {
        errorMessage = i18nString(UIStrings.longitudeMustBeGreaterThanOr, { PH1: minLong });
      } else if (parseFloat(value) > maxLong) {
        errorMessage = i18nString(UIStrings.longitudeMustBeLessThanOrEqualTo, { PH1: maxLong });
      }
      if (errorMessage) {
        return { valid: false, errorMessage };
      }
      return {
        valid: true
      };
    }
    function timezoneIdValidator(_item, _index, input) {
      const value = input.value.trim();
      if (value === "" || /[a-zA-Z]/.test(value)) {
        return {
          valid: true
        };
      }
      const errorMessage = i18nString(UIStrings.timezoneIdMustContainAlphabetic);
      return { valid: false, errorMessage };
    }
    function localeValidator(_item, _index, input) {
      const value = input.value.trim();
      if (value === "" || /[a-zA-Z]{2}/.test(value)) {
        return {
          valid: true
        };
      }
      const errorMessage = i18nString(UIStrings.localeMustContainAlphabetic);
      return { valid: false, errorMessage };
    }
    function accuracyValidator(_item, _index, input) {
      const minAccuracy = 0;
      const value = input.value.trim();
      const parsedValue = Number(value);
      if (!value) {
        return {
          valid: true
        };
      }
      let errorMessage;
      if (Number.isNaN(parsedValue)) {
        errorMessage = i18nString(UIStrings.accuracyMustBeANumber);
      } else if (parseFloat(value) < minAccuracy) {
        errorMessage = i18nString(UIStrings.accuracyMustBeGreaterThanOrEqual, { PH1: minAccuracy });
      }
      if (errorMessage) {
        return { valid: false, errorMessage };
      }
      return {
        valid: true
      };
    }
  }
};

// gen/front_end/panels/sensors/SensorsView.js
var SensorsView_exports = {};
__export(SensorsView_exports, {
  NonPresetOptions: () => NonPresetOptions,
  PressureOptions: () => PressureOptions,
  SensorsView: () => SensorsView,
  ShiftDragOrientationSpeed: () => ShiftDragOrientationSpeed,
  ShowActionDelegate: () => ShowActionDelegate
});
import * as Common2 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives, html, render } from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling from "./../mobile_throttling/mobile_throttling.js";

// gen/front_end/panels/sensors/sensors.css.js
var sensors_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.sensors-view {
  padding: 12px;
  display: block;
}

.sensors-view input {
  width: 100%;
  max-width: 120px;
  margin: -5px 10px 0 0;
  text-align: end;
}

.sensors-view input[readonly] {
  background-color: var(--sys-color-neutral-container);
}

.sensors-view fieldset {
  border: none;
  padding: 10px 0;
  flex: 0 0 auto;
  margin: 0;
}

.sensors-view fieldset[disabled] {
  opacity: 50%;
}

.orientation-axis-input-container input {
  max-width: 120px;
}

.concurrency-details {
  margin: var(--sys-size-5) var(--sys-size-10);
  display: flex;
  align-items: center;
}

.concurrency-details input {
  width: 50px;
  /* Clear out unexpected margin applied to \\'.sensors-view input\\' */
  margin: 0;
}

.concurrency-hidden {
  visibility: hidden;
}

.sensors-view input:focus::-webkit-input-placeholder {
  color: transparent !important; /* stylelint-disable-line declaration-no-important */
}

.sensors-view select {
  width: 200px;
}

.sensors-group-title {
  width: 80px;
  line-height: 24px;
}

.sensors-group {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.manage-locations {
  margin-left: var(--sys-size-4);
}

.geo-fields {
  flex: 2 0 200px;
}

.latlong-group {
  display: flex;
  margin-bottom: 10px;
}

.latlong-title {
  width: 70px;
}

.timezone-error,
.locale-error {
  margin-left: 10px;
  color: var(--legacy-input-validation-error);
}

/* Device Orientation */

.orientation-content {
  display: flex;
  flex-wrap: wrap;
}

.orientation-fields {
  margin-right: 10px;
}

.orientation-stage {
  --override-gradient-color-1: var(--ref-palette-cyan95);
  --override-gradient-color-2: var(--ref-palette-cyan90);

  perspective: 700px;
  perspective-origin: 50% 50%;
  width: 160px;
  height: 150px;
  background: linear-gradient(var(--override-gradient-color-1) 0%, var(--override-gradient-color-1) 64%, var(--override-gradient-color-2) 64%, var(--override-gradient-color-1) 100%);
  transition: 0.2s ease opacity, 0.2s ease filter;
  overflow: hidden;
  margin-bottom: 10px;
}

.theme-with-dark-background .orientation-stage,
:host-context(.theme-with-dark-background) .orientation-stage {
  --override-gradient-color-1: var(--ref-palette-cyan10);
  --override-gradient-color-2: var(--ref-palette-cyan30);
}

.orientation-stage.disabled {
  filter: grayscale();
  opacity: 50%;
}

.orientation-element,
.orientation-element::before,
.orientation-element::after {
  position: absolute;
  box-sizing: border-box;
  transform-style: preserve-3d;
  background: no-repeat;
  background-size: cover;
  backface-visibility: hidden;
}

.orientation-box {
  width: 62px;
  height: 122px;
  inset: 0;
  margin: auto;
  transform: rotate3d(1, 0, 0, 90deg);
}

.orientation-layer {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.orientation-box.is-animating,
.is-animating .orientation-layer {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}

.orientation-front,
.orientation-back {
  width: 62px;
  height: 122px;
  border-radius: 8px;
}

.orientation-front {
  background-image: var(--image-file-accelerometer-front);
}

.orientation-back {
  transform: rotateY(180deg) translateZ(8px);
  background-image: var(--image-file-accelerometer-back);
}

.orientation-left,
.orientation-right {
  width: 8px;
  height: 106px;
  top: 8px;
  background-position: center center;
}

.orientation-left {
  left: -8px;
  transform-origin: right center;
  transform: rotateY(-90deg);
  background-image: var(--image-file-accelerometer-left);
}

.orientation-right {
  right: -8px;
  transform-origin: left center;
  transform: rotateY(90deg);
  background-image: var(--image-file-accelerometer-right);
}

.orientation-left::before,
.orientation-left::after,
.orientation-right::before,
.orientation-right::after {
  content: "";
  width: 8px;
  height: 6px;
}

.orientation-left::before,
.orientation-left::after {
  background-image: var(--image-file-accelerometer-left);
}

.orientation-right::before,
.orientation-right::after {
  background-image: var(--image-file-accelerometer-right);
}

.orientation-left::before,
.orientation-right::before {
  top: -6px;
  transform-origin: center bottom;
  transform: rotateX(26deg);
  background-position: center top;
}

.orientation-left::after,
.orientation-right::after {
  bottom: -6px;
  transform-origin: center top;
  transform: rotateX(-25deg);
  background-position: center bottom;
}

.orientation-top,
.orientation-bottom {
  width: 50px;
  height: 8px;
  left: 8px;
  background-position: center center;
}

.orientation-top {
  top: -8px;
  transform-origin: center bottom;
  transform: rotateX(90deg);
  background-image: var(--image-file-accelerometer-top);
}

.orientation-bottom {
  bottom: -8px;
  transform-origin: center top;
  transform: rotateX(-90deg);
  background-image: var(--image-file-accelerometer-bottom);
}

.orientation-top::before,
.orientation-top::after,
.orientation-bottom::before,
.orientation-bottom::after {
  content: "";
  width: 8px;
  height: 8px;
}

.orientation-top::before,
.orientation-top::after {
  background-image: var(--image-file-accelerometer-top);
}

.orientation-bottom::before,
.orientation-bottom::after {
  background-image: var(--image-file-accelerometer-bottom);
}

.orientation-top::before,
.orientation-bottom::before {
  left: -6px;
  transform-origin: right center;
  transform: rotateY(-26deg);
  background-position: left center;
}

.orientation-top::after,
.orientation-bottom::after {
  right: -6px;
  transform-origin: left center;
  transform: rotateY(26deg);
  background-position: right center;
}

.orientation-axis-input-container {
  margin-bottom: 10px;
}

.orientation-reset-button {
  min-width: 80px;
}

fieldset.device-orientation-override-section {
  margin: 0;
  display: flex;
}

.panel-section-separator {
  height: 1px;
  margin-bottom: 20px;
  margin-left: -12px;
  margin-right: -12px;
  background: var(--sys-color-divider);
}

button.text-button {
  margin: 4px 0 0 10px;
}

@media (forced-colors: active) {
  .sensors-view fieldset[disabled] {
    opacity: 100%;
  }
}

.chrome-select-label {
  margin-bottom: 16px;
}

/*# sourceURL=${import.meta.resolve("./sensors.css")} */`;

// gen/front_end/panels/sensors/SensorsView.js
var UIStrings2 = {
  /**
   * @description Title for a group of cities
   */
  location: "Location",
  /**
   * @description An option that appears in a drop-down to prevent the GPS location of the user from being overridden.
   */
  noOverride: "No override",
  /**
   * @description Title of a section that contains overrides for the user's GPS location.
   */
  overrides: "Overrides",
  /**
   * @description Text of button in Sensors View, takes the user to the custom location setting screen
   *where they can enter/edit custom locations.
   */
  manage: "Manage",
  /**
   * @description Aria-label for location manage button in Sensors View
   */
  manageTheListOfLocations: "Manage the list of locations",
  /**
   * @description Option in a drop-down input for selecting the GPS location of the user. As an
   *alternative to selecting a location from the list, the user can select this option and they are
   *prompted to enter the details for a new custom location.
   */
  other: "Other\u2026",
  /**
   * @description Title of a section in a drop-down input that contains error locations, e.g. to select
   *a location override that says 'the location is not available'. A noun.
   */
  error: "Error",
  /**
   * @description A type of override where the geographic location of the user is not available.
   */
  locationUnavailable: "Location unavailable",
  /**
   * @description Tooltip text telling the user how to change the value of a latitude/longitude input
   *text box. several shortcuts are provided for convenience. The placeholder can be different
   *keyboard keys, depending on the user's settings.
   * @example {Ctrl} PH1
   */
  adjustWithMousewheelOrUpdownKeys: "Adjust with mousewheel or up/down keys. {PH1}: \xB110, Shift: \xB11, Alt: \xB10.01",
  /**
   * @description Label for latitude of a GPS location.
   */
  latitude: "Latitude",
  /**
   * @description Label for Longitude of a GPS location.
   */
  longitude: "Longitude",
  /**
   * @description Label for the ID of a timezone for a particular location.
   */
  timezoneId: "Timezone ID",
  /**
   * @description Label for the locale relevant to a custom location.
   */
  locale: "Locale",
  /**
   * @description Label for Accuracy of a GPS location.
   */
  accuracy: "Accuracy",
  /**
   * @description Label the orientation of a user's device e.g. tilt in 3D-space.
   */
  orientation: "Orientation",
  /**
   * @description Option that when chosen, turns off device orientation override.
   */
  off: "Off",
  /**
   * @description Option that when chosen, allows the user to enter a custom orientation for the device e.g. tilt in 3D-space.
   */
  customOrientation: "Custom orientation",
  /**
   * @description Warning to the user they should enable the device orientation override, in order to
   *enable this input which allows them to interactively select orientation by dragging a 3D phone
   *model.
   */
  enableOrientationToRotate: "Enable orientation to rotate",
  /**
   * @description Text telling the user how to use an input which allows them to interactively select
   *orientation by dragging a 3D phone model.
   */
  shiftdragHorizontallyToRotate: "Shift+drag horizontally to rotate around the y-axis",
  /**
   * @description Message in the Sensors tool that is alerted (for screen readers) when the device orientation setting is changed
   * @example {180} PH1
   * @example {-90} PH2
   * @example {0} PH3
   */
  deviceOrientationSetToAlphaSBeta: "Device orientation set to alpha: {PH1}, beta: {PH2}, gamma: {PH3}",
  /**
   * @description Text of orientation reset button in Sensors View of the Device Toolbar
   */
  reset: "Reset",
  /**
   * @description Aria-label for orientation reset button in Sensors View. Command.
   */
  resetDeviceOrientation: "Reset device orientation",
  /**
   * @description Description of the Touch select in Sensors tab
   */
  forcesTouchInsteadOfClick: "Forces touch instead of click",
  /**
   * @description Description of the Emulate Idle State select in Sensors tab
   */
  forcesSelectedIdleStateEmulation: "Forces selected idle state emulation",
  /**
   * @description Description of the Emulate CPU Pressure State select in Sensors tab
   */
  forcesSelectedPressureStateEmulation: "Forces selected pressure state emulation",
  /**
   * @description Title for a group of configuration options in a drop-down input.
   */
  presets: "Presets",
  /**
   * @description Drop-down input option for the orientation of a device in 3D space.
   */
  portrait: "Portrait",
  /**
   * @description Drop-down input option for the orientation of a device in 3D space.
   */
  portraitUpsideDown: "Portrait upside down",
  /**
   * @description Drop-down input option for the orientation of a device in 3D space.
   */
  landscapeLeft: "Landscape left",
  /**
   * @description Drop-down input option for the orientation of a device in 3D space.
   */
  landscapeRight: "Landscape right",
  /**
   * @description Drop-down input option for the orientation of a device in 3D space. Noun indicating
   *the display of the device is pointing up.
   */
  displayUp: "Display up",
  /**
   * @description Drop-down input option for the orientation of a device in 3D space. Noun indicating
   *the display of the device is pointing down.
   */
  displayDown: "Display down",
  /**
   * @description Label for one dimension of device orientation that the user can override.
   */
  alpha: "\u03B1 (alpha)",
  /**
   * @description Label for one dimension of device orientation that the user can override.
   */
  beta: "\u03B2 (beta)",
  /**
   * @description Label for one dimension of device orientation that the user can override.
   */
  gamma: "\u03B3 (gamma)"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/sensors/SensorsView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var SensorsView = class extends UI2.Widget.VBox {
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
      jslog: `${VisualLogging2.panel("sensors").track({ resize: true })}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(sensors_css_default);
    this.contentElement.classList.add("sensors-view");
    this.#locationSetting = Common2.Settings.Settings.instance().createSetting("emulation.location-override", "");
    this.#location = SDK2.EmulationModel.Location.parseSetting(this.#locationSetting.get());
    this.#locationOverrideEnabled = false;
    this.#locationSectionElement = this.contentElement.createChild("section", "sensors-group");
    const customLocationsSetting = Common2.Settings.Settings.instance().moduleSetting("emulation.locations");
    this.renderLocationSection(this.#location, customLocationsSetting);
    customLocationsSetting.addChangeListener(() => this.renderLocationSection(this.#location, customLocationsSetting));
    this.createPanelSeparator();
    this.deviceOrientationSetting = Common2.Settings.Settings.instance().createSetting("emulation.device-orientation-override", "");
    this.deviceOrientation = SDK2.EmulationModel.DeviceOrientation.parseSetting(this.deviceOrientationSetting.get());
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
    this.contentElement.createChild("div").classList.add("panel-section-separator");
  }
  renderLocationSection(location, customLocationsSetting) {
    const customLocations = customLocationsSetting.get();
    let selectedIndex = 0;
    if (this.#locationOverrideEnabled) {
      if (location.unavailable) {
        selectedIndex = customLocations.length + 2;
      } else {
        selectedIndex = customLocations.length + 1;
        for (const [i, customLocation] of customLocations.entries()) {
          if (location.latitude === customLocation.lat && location.longitude === customLocation.long && location.timezoneId === customLocation.timezoneId && location.locale === customLocation.locale) {
            selectedIndex = i + 1;
            break;
          }
        }
      }
    }
    const cmdOrCtrl = Host.Platform.isMac() ? "\u2318" : "Ctrl";
    const modifierKeyMessage = i18nString2(UIStrings2.adjustWithMousewheelOrUpdownKeys, { PH1: cmdOrCtrl });
    this.#locationSectionElement.setAttribute("jslog", `${VisualLogging2.section("location")}`);
    render(html`
      <label class="sensors-group-title" id="location-select-label" for="location-select">${i18nString2(UIStrings2.location)}</label>
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
          jslog=${VisualLogging2.dropDown().track({ change: true })}
        >
          <option value=${NonPresetOptions.NoOverride} jslog=${VisualLogging2.item("no-override")}>${i18nString2(UIStrings2.noOverride)}</option>
          <optgroup label=${i18nString2(UIStrings2.overrides)}>
            ${customLocations.map((customLocation) => html`
              <option value=${JSON.stringify(customLocation)} jslog=${VisualLogging2.item("custom")}>${customLocation.title}</option>
            `)}
          </optgroup>
          <option value=${NonPresetOptions.Custom} jslog=${VisualLogging2.item("other")}>${i18nString2(UIStrings2.other)}</option>
          <optgroup label=${i18nString2(UIStrings2.error)}>
            <option value=${NonPresetOptions.Unavailable} jslog=${VisualLogging2.item("unavailable")}>${i18nString2(UIStrings2.locationUnavailable)}</option>
          </optgroup>
        </select>
        <devtools-button
          .variant=${"outlined"}
          class="manage-locations"
          @click=${() => Common2.Revealer.reveal(customLocationsSetting)}
          aria-label=${i18nString2(UIStrings2.manageTheListOfLocations)}
          jslog=${VisualLogging2.action("sensors.manage-locations").track({ click: true })}
        >
          ${i18nString2(UIStrings2.manage)}
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
              jslog=${VisualLogging2.textField("latitude").track({ change: true })}
              ${Directives.ref((el) => {
      if (el) {
        this.latitudeInput = el;
      }
    })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="latlong-title" for="latitude-input">${i18nString2(UIStrings2.latitude)}</label>
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
              jslog=${VisualLogging2.textField("longitude").track({ change: true })}
              ${Directives.ref((el) => {
      if (el) {
        this.longitudeInput = el;
      }
    })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="latlong-title" for="longitude-input">${i18nString2(UIStrings2.longitude)}</label>
          </div>
          <div class="latlong-group">
            <input
              id="timezone-input"
              type="text"
              .value=${location.timezoneId}
              name="timezone"
              jslog=${VisualLogging2.textField("timezone").track({ change: true })}
              ${Directives.ref((el) => {
      if (el) {
        this.timezoneInput = el;
      }
    })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="timezone-title" for="timezone-input">${i18nString2(UIStrings2.timezoneId)}</label>
            <div class="timezone-error" ${Directives.ref((el) => {
      if (el) {
        this.timezoneError = el;
      }
    })}></div>
          </div>
          <div class="latlong-group">
            <input
              id="locale-input"
              type="text"
              .value=${location.locale}
              name="locale"
              jslog=${VisualLogging2.textField("locale").track({ change: true })}
              ${Directives.ref((el) => {
      if (el) {
        this.localeInput = el;
      }
    })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="locale-title" for="locale-input">${i18nString2(UIStrings2.locale)}</label>
            <div class="locale-error" ${Directives.ref((el) => {
      if (el) {
        this.localeError = el;
      }
    })}></div>
          </div>
          <!-- @ts-ignore -->
          <div class="latlong-group">
            <input
              id="accuracy-input"
              type="number"
              step="any"
              .value=${String(location.accuracy || SDK2.EmulationModel.Location.DEFAULT_ACCURACY)}
              name="accuracy"
              jslog=${VisualLogging2.textField("accuracy").track({ change: true })}
              ${Directives.ref((el) => {
      if (el) {
        this.accuracyInput = el;
      }
    })}
              @input=${this.#onLocationInput.bind(this)}
              @change=${this.#onLocationChange.bind(this)}
              @keydown=${this.#onLocationKeyDown.bind(this)}
              @focus=${this.#onLocationFocus.bind(this)}
            >
            <label class="accuracy-title" for="accuracy-input">${i18nString2(UIStrings2.accuracy)}</label>
            <div class="accuracy-error" ${Directives.ref((el) => {
      if (el) {
        this.accuracyError = el;
      }
    })}></div>
          </div>
        </fieldset>
      </div>
    `, this.#locationSectionElement);
  }
  #locationSelectChanged() {
    this.fieldsetElement.disabled = false;
    this.timezoneError.textContent = "";
    this.accuracyError.textContent = "";
    const value = this.locationSelectElement.options[this.locationSelectElement.selectedIndex].value;
    if (value === NonPresetOptions.NoOverride) {
      this.#locationOverrideEnabled = false;
      this.clearFieldsetElementInputs();
      this.fieldsetElement.disabled = true;
    } else if (value === NonPresetOptions.Custom) {
      this.#locationOverrideEnabled = true;
      const location = SDK2.EmulationModel.Location.parseUserInput(this.latitudeInput.value.trim(), this.longitudeInput.value.trim(), this.timezoneInput.value.trim(), this.localeInput.value.trim(), this.accuracyInput.value.trim());
      if (!location) {
        return;
      }
      this.#location = location;
    } else if (value === NonPresetOptions.Unavailable) {
      this.#locationOverrideEnabled = true;
      this.#location = new SDK2.EmulationModel.Location(0, 0, "", "", SDK2.EmulationModel.Location.DEFAULT_ACCURACY, true);
    } else {
      this.#locationOverrideEnabled = true;
      const coordinates = JSON.parse(value);
      this.#location = new SDK2.EmulationModel.Location(coordinates.lat, coordinates.long, coordinates.timezoneId, coordinates.locale, coordinates.accuracy || SDK2.EmulationModel.Location.DEFAULT_ACCURACY, false);
      this.#setInputValue(this.latitudeInput, coordinates.lat);
      this.#setInputValue(this.longitudeInput, coordinates.long);
      this.#setInputValue(this.timezoneInput, coordinates.timezoneId);
      this.#setInputValue(this.localeInput, coordinates.locale);
      this.#setInputValue(this.accuracyInput, String(coordinates.accuracy || SDK2.EmulationModel.Location.DEFAULT_ACCURACY));
    }
    this.applyLocation();
    if (value === NonPresetOptions.Custom) {
      this.latitudeInput.focus();
    }
  }
  #onLocationInput(event) {
    const input = event.currentTarget;
    const valid = this.#validateInput(input, input.value);
    input.classList.toggle("error-input", !valid);
  }
  #onLocationChange(event) {
    const input = event.currentTarget;
    const valid = this.#validateInput(input, input.value);
    input.classList.toggle("error-input", !valid);
    if (valid) {
      this.applyLocationUserInput();
    }
  }
  #onLocationKeyDown(event) {
    const input = event.currentTarget;
    if (event.key === "Enter") {
      const valid2 = this.#validateInput(input, input.value);
      if (valid2) {
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
    const value = UI2.UIUtils.modifiedFloatNumber(parseFloat(input.value), event, multiplier);
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
      return SDK2.EmulationModel.Location.latitudeValidator(value);
    }
    if (input === this.longitudeInput) {
      return SDK2.EmulationModel.Location.longitudeValidator(value);
    }
    if (input === this.timezoneInput) {
      return SDK2.EmulationModel.Location.timezoneIdValidator(value);
    }
    if (input === this.localeInput) {
      return SDK2.EmulationModel.Location.localeValidator(value);
    }
    if (input === this.accuracyInput) {
      return SDK2.EmulationModel.Location.accuracyValidator(value).valid;
    }
    return false;
  }
  #setInputValue(input, value) {
    if (value === input.value) {
      return;
    }
    const valid = this.#validateInput(input, value);
    input.classList.toggle("error-input", !valid);
    input.value = value;
  }
  applyLocationUserInput() {
    const location = SDK2.EmulationModel.Location.parseUserInput(this.latitudeInput.value.trim(), this.longitudeInput.value.trim(), this.timezoneInput.value.trim(), this.localeInput.value.trim(), this.accuracyInput.value.trim());
    if (!location) {
      return;
    }
    this.timezoneError.textContent = "";
    this.accuracyError.textContent = "";
    this.setSelectElementLabel(this.locationSelectElement, NonPresetOptions.Custom);
    this.#location = location;
    this.applyLocation();
  }
  applyLocation() {
    if (this.#locationOverrideEnabled) {
      this.#locationSetting.set(this.#location.toSetting());
    } else {
      this.#locationSetting.set("");
    }
    for (const emulationModel of SDK2.TargetManager.TargetManager.instance().models(SDK2.EmulationModel.EmulationModel)) {
      emulationModel.emulateLocation(this.#locationOverrideEnabled ? this.#location : null).catch((err) => {
        switch (err.type) {
          case "emulation-set-timezone": {
            this.timezoneError.textContent = err.message;
            break;
          }
          case "emulation-set-locale": {
            this.localeError.textContent = err.message;
            break;
          }
          case "emulation-set-accuracy": {
            this.accuracyError.textContent = err.message;
            break;
          }
        }
      });
    }
  }
  clearFieldsetElementInputs() {
    this.#setInputValue(this.latitudeInput, "0");
    this.#setInputValue(this.longitudeInput, "0");
    this.#setInputValue(this.timezoneInput, "");
    this.#setInputValue(this.localeInput, "");
    this.#setInputValue(this.accuracyInput, SDK2.EmulationModel.Location.DEFAULT_ACCURACY.toString());
  }
  createDeviceOrientationSection() {
    const orientationGroup = this.contentElement.createChild("section", "sensors-group");
    orientationGroup.setAttribute("jslog", `${VisualLogging2.section("device-orientation")}`);
    const orientationTitle = UI2.UIUtils.createLabel(i18nString2(UIStrings2.orientation), "sensors-group-title");
    orientationGroup.appendChild(orientationTitle);
    const orientationContent = orientationGroup.createChild("div", "orientation-content");
    const fields = orientationContent.createChild("div", "orientation-fields");
    const orientationOffOption = {
      title: i18nString2(UIStrings2.off),
      orientation: NonPresetOptions.NoOverride,
      jslogContext: "off"
    };
    const customOrientationOption = {
      title: i18nString2(UIStrings2.customOrientation),
      orientation: NonPresetOptions.Custom
    };
    const orientationGroups = [{
      title: i18nString2(UIStrings2.presets),
      value: [
        { title: i18nString2(UIStrings2.portrait), orientation: "[0, 90, 0]", jslogContext: "portrait" },
        {
          title: i18nString2(UIStrings2.portraitUpsideDown),
          orientation: "[180, -90, 0]",
          jslogContext: "portrait-upside-down"
        },
        { title: i18nString2(UIStrings2.landscapeLeft), orientation: "[90, 0, -90]", jslogContext: "landscape-left" },
        { title: i18nString2(UIStrings2.landscapeRight), orientation: "[90, -180, -90]", jslogContext: "landscape-right" },
        { title: i18nString2(UIStrings2.displayUp), orientation: "[0, 0, 0]", jslogContext: "display-up" },
        { title: i18nString2(UIStrings2.displayDown), orientation: "[0, -180, 0]", jslogContext: "displayUp-down" }
      ]
    }];
    this.orientationSelectElement = this.contentElement.createChild("select");
    this.orientationSelectElement.setAttribute("jslog", `${VisualLogging2.dropDown().track({ change: true })}`);
    UI2.ARIAUtils.bindLabelToControl(orientationTitle, this.orientationSelectElement);
    this.orientationSelectElement.appendChild(UI2.UIUtils.createOption(orientationOffOption.title, orientationOffOption.orientation, orientationOffOption.jslogContext));
    this.orientationSelectElement.appendChild(UI2.UIUtils.createOption(customOrientationOption.title, customOrientationOption.orientation, "custom"));
    for (let i = 0; i < orientationGroups.length; ++i) {
      const groupElement = this.orientationSelectElement.createChild("optgroup");
      groupElement.label = orientationGroups[i].title;
      const group = orientationGroups[i].value;
      for (let j = 0; j < group.length; ++j) {
        groupElement.appendChild(UI2.UIUtils.createOption(group[j].title, group[j].orientation, group[j].jslogContext));
      }
    }
    this.orientationSelectElement.selectedIndex = 0;
    fields.appendChild(this.orientationSelectElement);
    this.orientationSelectElement.addEventListener("change", this.orientationSelectChanged.bind(this));
    this.deviceOrientationFieldset = this.createDeviceOrientationOverrideElement(this.deviceOrientation);
    this.stageElement = orientationContent.createChild("div", "orientation-stage");
    this.stageElement.setAttribute("jslog", `${VisualLogging2.preview().track({ drag: true })}`);
    this.orientationLayer = this.stageElement.createChild("div", "orientation-layer");
    this.boxElement = this.orientationLayer.createChild("section", "orientation-box orientation-element");
    this.boxElement.createChild("section", "orientation-front orientation-element");
    this.boxElement.createChild("section", "orientation-top orientation-element");
    this.boxElement.createChild("section", "orientation-back orientation-element");
    this.boxElement.createChild("section", "orientation-left orientation-element");
    this.boxElement.createChild("section", "orientation-right orientation-element");
    this.boxElement.createChild("section", "orientation-bottom orientation-element");
    UI2.UIUtils.installDragHandle(this.stageElement, this.onBoxDragStart.bind(this), (event) => {
      this.onBoxDrag(event);
    }, null, "-webkit-grabbing", "-webkit-grab");
    fields.appendChild(this.deviceOrientationFieldset);
    this.enableOrientationFields(true);
    this.setBoxOrientation(this.deviceOrientation, false);
  }
  createPressureSection() {
    const container = this.contentElement.createChild("div", "pressure-section");
    const control = SettingsUI.SettingsUI.createControlForSetting(Common2.Settings.Settings.instance().moduleSetting("emulation.cpu-pressure"), i18nString2(UIStrings2.forcesSelectedPressureStateEmulation));
    if (control) {
      container.appendChild(control);
    }
  }
  enableOrientationFields(disable) {
    if (disable) {
      this.deviceOrientationFieldset.disabled = true;
      this.stageElement.classList.add("disabled");
      UI2.Tooltip.Tooltip.install(this.stageElement, i18nString2(UIStrings2.enableOrientationToRotate));
    } else {
      this.deviceOrientationFieldset.disabled = false;
      this.stageElement.classList.remove("disabled");
      UI2.Tooltip.Tooltip.install(this.stageElement, i18nString2(UIStrings2.shiftdragHorizontallyToRotate));
    }
  }
  orientationSelectChanged() {
    const value = this.orientationSelectElement.options[this.orientationSelectElement.selectedIndex].value;
    this.enableOrientationFields(false);
    if (value === NonPresetOptions.NoOverride) {
      this.deviceOrientationOverrideEnabled = false;
      this.enableOrientationFields(true);
      this.applyDeviceOrientation();
    } else if (value === NonPresetOptions.Custom) {
      this.deviceOrientationOverrideEnabled = true;
      this.resetDeviceOrientation();
      this.alphaElement.focus();
    } else {
      const parsedValue = JSON.parse(value);
      this.deviceOrientationOverrideEnabled = true;
      this.deviceOrientation = new SDK2.EmulationModel.DeviceOrientation(parsedValue[0], parsedValue[1], parsedValue[2]);
      this.setDeviceOrientation(
        this.deviceOrientation,
        "selectPreset"
        /* DeviceOrientationModificationSource.SELECT_PRESET */
      );
    }
  }
  applyDeviceOrientation() {
    if (this.deviceOrientationOverrideEnabled) {
      this.deviceOrientationSetting.set(this.deviceOrientation.toSetting());
    }
    for (const emulationModel of SDK2.TargetManager.TargetManager.instance().models(SDK2.EmulationModel.EmulationModel)) {
      void emulationModel.emulateDeviceOrientation(this.deviceOrientationOverrideEnabled ? this.deviceOrientation : null);
    }
  }
  setSelectElementLabel(selectElement, labelValue) {
    const optionValues = Array.prototype.map.call(selectElement.options, (x) => x.value);
    selectElement.selectedIndex = optionValues.indexOf(labelValue);
  }
  applyDeviceOrientationUserInput() {
    this.setDeviceOrientation(
      SDK2.EmulationModel.DeviceOrientation.parseUserInput(this.alphaElement.value.trim(), this.betaElement.value.trim(), this.gammaElement.value.trim()),
      "userInput"
      /* DeviceOrientationModificationSource.USER_INPUT */
    );
    this.setSelectElementLabel(this.orientationSelectElement, NonPresetOptions.Custom);
  }
  resetDeviceOrientation() {
    this.setDeviceOrientation(
      new SDK2.EmulationModel.DeviceOrientation(0, 90, 0),
      "resetButton"
      /* DeviceOrientationModificationSource.RESET_BUTTON */
    );
    this.setSelectElementLabel(this.orientationSelectElement, "[0, 90, 0]");
  }
  setDeviceOrientation(deviceOrientation, modificationSource) {
    if (!deviceOrientation) {
      return;
    }
    function roundAngle(angle) {
      return Math.round(angle * 1e4) / 1e4;
    }
    if (modificationSource !== "userInput") {
      this.#setOrientationInputValue(this.alphaElement, String(roundAngle(deviceOrientation.alpha)));
      this.#setOrientationInputValue(this.betaElement, String(roundAngle(deviceOrientation.beta)));
      this.#setOrientationInputValue(this.gammaElement, String(roundAngle(deviceOrientation.gamma)));
    }
    const animate = modificationSource !== "userDrag";
    this.setBoxOrientation(deviceOrientation, animate);
    this.deviceOrientation = deviceOrientation;
    this.applyDeviceOrientation();
    UI2.ARIAUtils.LiveAnnouncer.alert(i18nString2(UIStrings2.deviceOrientationSetToAlphaSBeta, { PH1: deviceOrientation.alpha, PH2: deviceOrientation.beta, PH3: deviceOrientation.gamma }));
  }
  #onOrientationInput(event) {
    const input = event.currentTarget;
    const valid = this.#validateOrientationInput(input, input.value);
    input.classList.toggle("error-input", !valid);
  }
  #onOrientationChange(event) {
    const input = event.currentTarget;
    const valid = this.#validateOrientationInput(input, input.value);
    input.classList.toggle("error-input", !valid);
    if (valid) {
      this.applyDeviceOrientationUserInput();
    }
  }
  #onOrientationKeyDown(event) {
    const input = event.currentTarget;
    if (event.key === "Enter") {
      const valid2 = this.#validateOrientationInput(input, input.value);
      if (valid2) {
        this.applyDeviceOrientationUserInput();
      }
      event.preventDefault();
      return;
    }
    const value = UI2.UIUtils.modifiedFloatNumber(parseFloat(input.value), event, 1);
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
      return SDK2.EmulationModel.DeviceOrientation.alphaAngleValidator(value);
    }
    if (input === this.betaElement) {
      return SDK2.EmulationModel.DeviceOrientation.betaAngleValidator(value);
    }
    if (input === this.gammaElement) {
      return SDK2.EmulationModel.DeviceOrientation.gammaAngleValidator(value);
    }
    return false;
  }
  #setOrientationInputValue(input, value) {
    if (input.value === value) {
      return;
    }
    input.value = value;
    const valid = this.#validateOrientationInput(input, value);
    input.classList.toggle("error-input", !valid);
  }
  createDeviceOrientationOverrideElement(deviceOrientation) {
    const fieldsetElement = document.createElement("fieldset");
    fieldsetElement.classList.add("device-orientation-override-section");
    const cellElement = fieldsetElement.createChild("td", "orientation-inputs-cell");
    this.alphaElement = UI2.UIUtils.createInput("", "number", "alpha");
    this.alphaElement.setAttribute("step", "any");
    this.#setupAxisInput(cellElement, this.alphaElement, i18nString2(UIStrings2.alpha));
    this.#setOrientationInputValue(this.alphaElement, String(deviceOrientation.alpha));
    this.betaElement = UI2.UIUtils.createInput("", "number", "beta");
    this.betaElement.setAttribute("step", "any");
    this.#setupAxisInput(cellElement, this.betaElement, i18nString2(UIStrings2.beta));
    this.#setOrientationInputValue(this.betaElement, String(deviceOrientation.beta));
    this.gammaElement = UI2.UIUtils.createInput("", "number", "gamma");
    this.gammaElement.setAttribute("step", "any");
    this.#setupAxisInput(cellElement, this.gammaElement, i18nString2(UIStrings2.gamma));
    this.#setOrientationInputValue(this.gammaElement, String(deviceOrientation.gamma));
    const resetButton = UI2.UIUtils.createTextButton(i18nString2(UIStrings2.reset), this.resetDeviceOrientation.bind(this), { className: "orientation-reset-button", jslogContext: "sensors.reset-device-orientiation" });
    UI2.ARIAUtils.setLabel(resetButton, i18nString2(UIStrings2.resetDeviceOrientation));
    resetButton.setAttribute("type", "reset");
    cellElement.appendChild(resetButton);
    return fieldsetElement;
  }
  #setupAxisInput(parentElement, input, label) {
    const div = parentElement.createChild("div", "orientation-axis-input-container");
    div.appendChild(input);
    div.appendChild(UI2.UIUtils.createLabel(
      label,
      /* className */
      "",
      input
    ));
    input.addEventListener("change", this.#onOrientationChange.bind(this), false);
    input.addEventListener("input", this.#onOrientationInput.bind(this), false);
    input.addEventListener("keydown", this.#onOrientationKeyDown.bind(this), false);
    input.addEventListener("focus", this.#onOrientationFocus.bind(this), false);
  }
  setBoxOrientation(deviceOrientation, animate) {
    if (animate) {
      this.stageElement.classList.add("is-animating");
    } else {
      this.stageElement.classList.remove("is-animating");
    }
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
    } else {
      axis = Geometry.crossProduct(this.mouseDownVector, mouseMoveVector);
      angle = Geometry.calculateAngle(this.mouseDownVector, mouseMoveVector);
    }
    const currentMatrix = new DOMMatrixReadOnly().rotateAxisAngle(-axis.x, axis.z, axis.y, angle).multiply(this.originalBoxMatrix);
    const eulerAngles = Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(currentMatrix);
    const newOrientation = new SDK2.EmulationModel.DeviceOrientation(eulerAngles.alpha, eulerAngles.beta, eulerAngles.gamma);
    this.setDeviceOrientation(
      newOrientation,
      "userDrag"
      /* DeviceOrientationModificationSource.USER_DRAG */
    );
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
    const container = this.contentElement.createChild("div", "touch-section");
    const control = SettingsUI.SettingsUI.createControlForSetting(Common2.Settings.Settings.instance().moduleSetting("emulation.touch"), i18nString2(UIStrings2.forcesTouchInsteadOfClick));
    if (control) {
      container.appendChild(control);
    }
  }
  appendIdleEmulator() {
    const container = this.contentElement.createChild("div", "idle-section");
    const control = SettingsUI.SettingsUI.createControlForSetting(Common2.Settings.Settings.instance().moduleSetting("emulation.idle-detection"), i18nString2(UIStrings2.forcesSelectedIdleStateEmulation));
    if (control) {
      container.appendChild(control);
    }
  }
  createHardwareConcurrencySection() {
    const container = this.contentElement.createChild("div", "concurrency-section");
    const { checkbox, numericInput, reset, warning } = MobileThrottling.ThrottlingManager.throttlingManager().createHardwareConcurrencySelector();
    const div = document.createElement("div");
    div.classList.add("concurrency-details");
    div.append(numericInput.element, reset.element, warning.element);
    container.append(checkbox, div);
  }
};
var PressureOptions = {
  NoOverride: "no-override",
  Nominal: "nominal",
  Fair: "fair",
  Serious: "serious",
  Critical: "critical"
};
var NonPresetOptions = {
  NoOverride: "noOverride",
  Custom: "custom",
  Unavailable: "unavailable"
};
var ShowActionDelegate = class {
  handleAction(_context, _actionId) {
    void UI2.ViewManager.ViewManager.instance().showView("sensors");
    return true;
  }
};
var ShiftDragOrientationSpeed = 16;
export {
  LocationsSettingsTab_exports as LocationsSettingsTab,
  SensorsView_exports as SensorsView
};
//# sourceMappingURL=sensors.js.map
