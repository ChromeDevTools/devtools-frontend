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
      return { valid: true, errorMessage: void 0 };
    }
    function latValidator(_item, _index, input) {
      const minLat = -90;
      const maxLat = 90;
      const value = input.value.trim();
      const parsedValue = Number(value);
      if (!value) {
        return { valid: true, errorMessage: void 0 };
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
      return { valid: true, errorMessage: void 0 };
    }
    function longValidator(_item, _index, input) {
      const minLong = -180;
      const maxLong = 180;
      const value = input.value.trim();
      const parsedValue = Number(value);
      if (!value) {
        return { valid: true, errorMessage: void 0 };
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
      return { valid: true, errorMessage: void 0 };
    }
    function timezoneIdValidator(_item, _index, input) {
      const value = input.value.trim();
      if (value === "" || /[a-zA-Z]/.test(value)) {
        return { valid: true, errorMessage: void 0 };
      }
      const errorMessage = i18nString(UIStrings.timezoneIdMustContainAlphabetic);
      return { valid: false, errorMessage };
    }
    function localeValidator(_item, _index, input) {
      const value = input.value.trim();
      if (value === "" || /[a-zA-Z]{2}/.test(value)) {
        return { valid: true, errorMessage: void 0 };
      }
      const errorMessage = i18nString(UIStrings.localeMustContainAlphabetic);
      return { valid: false, errorMessage };
    }
    function accuracyValidator(_item, _index, input) {
      const minAccuracy = 0;
      const value = input.value.trim();
      const parsedValue = Number(value);
      if (!value) {
        return { valid: true, errorMessage: void 0 };
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
      return { valid: true, errorMessage: void 0 };
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
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
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
      jslog: `${VisualLogging2.panel("sensors").track({ resize: true })}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(sensors_css_default);
    this.contentElement.classList.add("sensors-view");
    this.#locationSetting = Common2.Settings.Settings.instance().createSetting("emulation.location-override", "");
    this.#location = SDK2.EmulationModel.Location.parseSetting(this.#locationSetting.get());
    this.#locationOverrideEnabled = false;
    this.createLocationSection(this.#location);
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
  createLocationSection(location) {
    const geogroup = this.contentElement.createChild("section", "sensors-group");
    geogroup.setAttribute("jslog", `${VisualLogging2.section("location")}`);
    const geogroupTitle = UI2.UIUtils.createLabel(i18nString2(UIStrings2.location), "sensors-group-title");
    geogroup.appendChild(geogroupTitle);
    const fields = geogroup.createChild("div", "geo-fields");
    let selectedIndex = 0;
    const noOverrideOption = { title: i18nString2(UIStrings2.noOverride), location: NonPresetOptions.NoOverride };
    this.locationSelectElement = fields.createChild("select");
    this.locationSelectElement.setAttribute("jslog", `${VisualLogging2.dropDown().track({ change: true })}`);
    UI2.ARIAUtils.bindLabelToControl(geogroupTitle, this.locationSelectElement);
    this.locationSelectElement.appendChild(UI2.UIUtils.createOption(noOverrideOption.title, noOverrideOption.location, "no-override"));
    this.customLocationsGroup = this.locationSelectElement.createChild("optgroup");
    this.customLocationsGroup.label = i18nString2(UIStrings2.overrides);
    const customLocations = Common2.Settings.Settings.instance().moduleSetting("emulation.locations");
    const manageButton = UI2.UIUtils.createTextButton(i18nString2(UIStrings2.manage), () => Common2.Revealer.reveal(customLocations), { className: "manage-locations", jslogContext: "sensors.manage-locations" });
    UI2.ARIAUtils.setLabel(manageButton, i18nString2(UIStrings2.manageTheListOfLocations));
    fields.appendChild(manageButton);
    const fillCustomSettings = () => {
      if (!this.customLocationsGroup) {
        return;
      }
      this.customLocationsGroup.removeChildren();
      for (const [i, customLocation] of customLocations.get().entries()) {
        this.customLocationsGroup.appendChild(UI2.UIUtils.createOption(customLocation.title, JSON.stringify(customLocation), "custom"));
        if (location.latitude === customLocation.lat && location.longitude === customLocation.long) {
          selectedIndex = i + 1;
        }
      }
    };
    customLocations.addChangeListener(fillCustomSettings);
    fillCustomSettings();
    const customLocationOption = { title: i18nString2(UIStrings2.other), location: NonPresetOptions.Custom };
    this.locationSelectElement.appendChild(UI2.UIUtils.createOption(customLocationOption.title, customLocationOption.location, "other"));
    const group = this.locationSelectElement.createChild("optgroup");
    group.label = i18nString2(UIStrings2.error);
    group.appendChild(UI2.UIUtils.createOption(i18nString2(UIStrings2.locationUnavailable), NonPresetOptions.Unavailable, "unavailable"));
    this.locationSelectElement.selectedIndex = selectedIndex;
    this.locationSelectElement.addEventListener("change", this.#locationSelectChanged.bind(this));
    this.fieldsetElement = fields.createChild("fieldset");
    this.fieldsetElement.disabled = !this.#locationOverrideEnabled;
    this.fieldsetElement.id = "location-override-section";
    const latitudeGroup = this.fieldsetElement.createChild("div", "latlong-group");
    const longitudeGroup = this.fieldsetElement.createChild("div", "latlong-group");
    const timezoneGroup = this.fieldsetElement.createChild("div", "latlong-group");
    const localeGroup = this.fieldsetElement.createChild("div", "latlong-group");
    const accuracyGroup = this.fieldsetElement.createChild("div", "latlong-group");
    const cmdOrCtrl = Host.Platform.isMac() ? "\u2318" : "Ctrl";
    const modifierKeyMessage = i18nString2(UIStrings2.adjustWithMousewheelOrUpdownKeys, { PH1: cmdOrCtrl });
    this.latitudeInput = UI2.UIUtils.createInput("", "number", "latitude");
    latitudeGroup.appendChild(this.latitudeInput);
    this.latitudeInput.setAttribute("step", "any");
    this.latitudeInput.value = "0";
    this.latitudeSetter = UI2.UIUtils.bindInput(this.latitudeInput, this.applyLocationUserInput.bind(this), SDK2.EmulationModel.Location.latitudeValidator, true, 0.1);
    this.latitudeSetter(String(location.latitude));
    UI2.Tooltip.Tooltip.install(this.latitudeInput, modifierKeyMessage);
    latitudeGroup.appendChild(UI2.UIUtils.createLabel(i18nString2(UIStrings2.latitude), "latlong-title", this.latitudeInput));
    this.longitudeInput = UI2.UIUtils.createInput("", "number", "longitude");
    longitudeGroup.appendChild(this.longitudeInput);
    this.longitudeInput.setAttribute("step", "any");
    this.longitudeInput.value = "0";
    this.longitudeSetter = UI2.UIUtils.bindInput(this.longitudeInput, this.applyLocationUserInput.bind(this), SDK2.EmulationModel.Location.longitudeValidator, true, 0.1);
    this.longitudeSetter(String(location.longitude));
    UI2.Tooltip.Tooltip.install(this.longitudeInput, modifierKeyMessage);
    longitudeGroup.appendChild(UI2.UIUtils.createLabel(i18nString2(UIStrings2.longitude), "latlong-title", this.longitudeInput));
    this.timezoneInput = UI2.UIUtils.createInput("", "text", "timezone");
    timezoneGroup.appendChild(this.timezoneInput);
    this.timezoneInput.value = "Europe/Berlin";
    this.timezoneSetter = UI2.UIUtils.bindInput(this.timezoneInput, this.applyLocationUserInput.bind(this), SDK2.EmulationModel.Location.timezoneIdValidator, false);
    this.timezoneSetter(location.timezoneId);
    timezoneGroup.appendChild(UI2.UIUtils.createLabel(i18nString2(UIStrings2.timezoneId), "timezone-title", this.timezoneInput));
    this.timezoneError = timezoneGroup.createChild("div", "timezone-error");
    this.localeInput = UI2.UIUtils.createInput("", "text", "locale");
    localeGroup.appendChild(this.localeInput);
    this.localeInput.value = "en-US";
    this.localeSetter = UI2.UIUtils.bindInput(this.localeInput, this.applyLocationUserInput.bind(this), SDK2.EmulationModel.Location.localeValidator, false);
    this.localeSetter(location.locale);
    localeGroup.appendChild(UI2.UIUtils.createLabel(i18nString2(UIStrings2.locale), "locale-title", this.localeInput));
    this.localeError = localeGroup.createChild("div", "locale-error");
    this.accuracyInput = UI2.UIUtils.createInput("", "number", "accuracy");
    accuracyGroup.appendChild(this.accuracyInput);
    this.accuracyInput.step = "any";
    this.accuracyInput.value = SDK2.EmulationModel.Location.DEFAULT_ACCURACY.toString();
    this.accuracySetter = UI2.UIUtils.bindInput(this.accuracyInput, this.applyLocationUserInput.bind(this), (value) => SDK2.EmulationModel.Location.accuracyValidator(value).valid, true, 1);
    this.accuracySetter(String(location.accuracy || SDK2.EmulationModel.Location.DEFAULT_ACCURACY));
    accuracyGroup.appendChild(UI2.UIUtils.createLabel(i18nString2(UIStrings2.accuracy), "accuracy-title", this.accuracyInput));
    this.accuracyError = accuracyGroup.createChild("div", "accuracy-error");
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
      this.latitudeSetter(coordinates.lat);
      this.longitudeSetter(coordinates.long);
      this.timezoneSetter(coordinates.timezoneId);
      this.localeSetter(coordinates.locale);
      this.accuracySetter(String(coordinates.accuracy || SDK2.EmulationModel.Location.DEFAULT_ACCURACY));
    }
    this.applyLocation();
    if (value === NonPresetOptions.Custom) {
      this.latitudeInput.focus();
    }
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
    this.latitudeSetter("0");
    this.longitudeSetter("0");
    this.timezoneSetter("");
    this.localeSetter("");
    this.accuracySetter(SDK2.EmulationModel.Location.DEFAULT_ACCURACY.toString());
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
      this.alphaSetter(String(roundAngle(deviceOrientation.alpha)));
      this.betaSetter(String(roundAngle(deviceOrientation.beta)));
      this.gammaSetter(String(roundAngle(deviceOrientation.gamma)));
    }
    const animate = modificationSource !== "userDrag";
    this.setBoxOrientation(deviceOrientation, animate);
    this.deviceOrientation = deviceOrientation;
    this.applyDeviceOrientation();
    UI2.ARIAUtils.LiveAnnouncer.alert(i18nString2(UIStrings2.deviceOrientationSetToAlphaSBeta, { PH1: deviceOrientation.alpha, PH2: deviceOrientation.beta, PH3: deviceOrientation.gamma }));
  }
  createAxisInput(parentElement, input, label, validator) {
    const div = parentElement.createChild("div", "orientation-axis-input-container");
    div.appendChild(input);
    div.appendChild(UI2.UIUtils.createLabel(
      label,
      /* className */
      "",
      input
    ));
    return UI2.UIUtils.bindInput(input, this.applyDeviceOrientationUserInput.bind(this), validator, true);
  }
  createDeviceOrientationOverrideElement(deviceOrientation) {
    const fieldsetElement = document.createElement("fieldset");
    fieldsetElement.classList.add("device-orientation-override-section");
    const cellElement = fieldsetElement.createChild("td", "orientation-inputs-cell");
    this.alphaElement = UI2.UIUtils.createInput("", "number", "alpha");
    this.alphaElement.setAttribute("step", "any");
    this.alphaSetter = this.createAxisInput(cellElement, this.alphaElement, i18nString2(UIStrings2.alpha), SDK2.EmulationModel.DeviceOrientation.alphaAngleValidator);
    this.alphaSetter(String(deviceOrientation.alpha));
    this.betaElement = UI2.UIUtils.createInput("", "number", "beta");
    this.betaElement.setAttribute("step", "any");
    this.betaSetter = this.createAxisInput(cellElement, this.betaElement, i18nString2(UIStrings2.beta), SDK2.EmulationModel.DeviceOrientation.betaAngleValidator);
    this.betaSetter(String(deviceOrientation.beta));
    this.gammaElement = UI2.UIUtils.createInput("", "number", "gamma");
    this.gammaElement.setAttribute("step", "any");
    this.gammaSetter = this.createAxisInput(cellElement, this.gammaElement, i18nString2(UIStrings2.gamma), SDK2.EmulationModel.DeviceOrientation.gammaAngleValidator);
    this.gammaSetter(String(deviceOrientation.gamma));
    const resetButton = UI2.UIUtils.createTextButton(i18nString2(UIStrings2.reset), this.resetDeviceOrientation.bind(this), { className: "orientation-reset-button", jslogContext: "sensors.reset-device-orientiation" });
    UI2.ARIAUtils.setLabel(resetButton, i18nString2(UIStrings2.resetDeviceOrientation));
    resetButton.setAttribute("type", "reset");
    cellElement.appendChild(resetButton);
    return fieldsetElement;
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
