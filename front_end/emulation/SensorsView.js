// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Emulation.SensorsView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('emulation/sensors.css');
    this.contentElement.classList.add('sensors-view');

    this._geolocationSetting = Common.settings.createSetting('emulation.geolocationOverride', '');
    this._geolocation = Emulation.Geolocation.parseSetting(this._geolocationSetting.get());
    this._geolocationOverrideEnabled = false;
    this._createGeolocationSection(this._geolocation);

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this._deviceOrientationSetting = Common.settings.createSetting('emulation.deviceOrientationOverride', '');
    this._deviceOrientation = Emulation.DeviceOrientation.parseSetting(this._deviceOrientationSetting.get());
    this._deviceOrientationOverrideEnabled = false;
    this._createDeviceOrientationSection();

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this._appendTouchControl();
  }

  /**
   * @return {!Emulation.SensorsView}
   */
  static instance() {
    if (!Emulation.SensorsView._instanceObject)
      Emulation.SensorsView._instanceObject = new Emulation.SensorsView();
    return Emulation.SensorsView._instanceObject;
  }

  /**
   * @param {!Emulation.Geolocation} geolocation
   */
  _createGeolocationSection(geolocation) {
    var geogroup = this.contentElement.createChild('section', 'sensors-group');
    geogroup.createChild('div', 'sensors-group-title').textContent = Common.UIString('Geolocation');
    var fields = geogroup.createChild('div', 'geo-fields');

    const noOverrideOption = {
      title: Common.UIString('No override'),
      location: Emulation.SensorsView.NonPresetOptions.NoOverride
    };
    const customLocationOption = {
      title: Common.UIString('Custom location...'),
      location: Emulation.SensorsView.NonPresetOptions.Custom
    };
    this._locationSelectElement = this.contentElement.createChild('select', 'chrome-select');
    this._locationSelectElement.appendChild(new Option(noOverrideOption.title, noOverrideOption.location));
    this._locationSelectElement.appendChild(new Option(customLocationOption.title, customLocationOption.location));

    var locationGroups = Emulation.SensorsView.PresetLocations;
    for (var i = 0; i < locationGroups.length; ++i) {
      var group = locationGroups[i].value;
      var groupElement = this._locationSelectElement.createChild('optgroup');
      groupElement.label = locationGroups[i].title;
      for (var j = 0; j < group.length; ++j)
        groupElement.appendChild(new Option(group[j].title, group[j].location));
    }
    this._locationSelectElement.selectedIndex = 0;
    fields.appendChild(this._locationSelectElement);
    this._locationSelectElement.addEventListener('change', this._geolocationSelectChanged.bind(this));

    // Validated input fieldset.
    this._fieldsetElement = fields.createChild('fieldset');
    this._fieldsetElement.disabled = !this._geolocationOverrideEnabled;
    this._fieldsetElement.id = 'geolocation-override-section';

    var latitudeGroup = this._fieldsetElement.createChild('div', 'latlong-group');
    var longitudeGroup = this._fieldsetElement.createChild('div', 'latlong-group');

    this._latitudeInput = latitudeGroup.createChild('input');
    this._latitudeInput.setAttribute('type', 'number');
    this._latitudeInput.value = 0;
    this._latitudeSetter = UI.bindInput(
        this._latitudeInput, this._applyGeolocationUserInput.bind(this), Emulation.Geolocation.latitudeValidator, true);
    this._latitudeSetter(String(geolocation.latitude));

    this._longitudeInput = longitudeGroup.createChild('input');
    this._longitudeInput.setAttribute('type', 'number');
    this._longitudeInput.value = 0;
    this._longitudeSetter = UI.bindInput(
        this._longitudeInput, this._applyGeolocationUserInput.bind(this), Emulation.Geolocation.longitudeValidator,
        true);
    this._longitudeSetter(String(geolocation.longitude));

    latitudeGroup.createChild('div', 'latlong-title').textContent = Common.UIString('Latitude');
    longitudeGroup.createChild('div', 'latlong-title').textContent = Common.UIString('Longitude');
  }

  _geolocationSelectChanged() {
    this._fieldsetElement.disabled = false;
    var value = this._locationSelectElement.options[this._locationSelectElement.selectedIndex].value;
    if (value === Emulation.SensorsView.NonPresetOptions.NoOverride) {
      this._geolocationOverrideEnabled = false;
      this._fieldsetElement.disabled = true;
    } else if (value === Emulation.SensorsView.NonPresetOptions.Custom) {
      this._geolocationOverrideEnabled = true;
    } else if (value === Emulation.SensorsView.NonPresetOptions.Unavailable) {
      this._geolocationOverrideEnabled = true;
      this._geolocation = new Emulation.Geolocation(0, 0, true);
    } else {
      this._geolocationOverrideEnabled = true;
      var coordinates = JSON.parse(value);
      this._geolocation = new Emulation.Geolocation(coordinates[0], coordinates[1], false);
      this._latitudeSetter(coordinates[0]);
      this._longitudeSetter(coordinates[1]);
    }

    this._applyGeolocation();
    if (value === Emulation.SensorsView.NonPresetOptions.Custom)
      this._latitudeInput.focus();
  }

  _applyGeolocationUserInput() {
    var geolocation =
        Emulation.Geolocation.parseUserInput(this._latitudeInput.value.trim(), this._longitudeInput.value.trim(), '');
    if (!geolocation)
      return;

    this._setSelectElementLabel(this._locationSelectElement, Emulation.SensorsView.NonPresetOptions.Custom);
    this._geolocation = geolocation;
    this._applyGeolocation();
  }

  _applyGeolocation() {
    if (this._geolocationOverrideEnabled) {
      this._geolocationSetting.set(this._geolocation.toSetting());
      this._geolocation.apply();
    } else {
      this._geolocation.clear();
    }
  }

  _createDeviceOrientationSection() {
    var orientationGroup = this.contentElement.createChild('section', 'sensors-group');
    orientationGroup.createChild('div', 'sensors-group-title').textContent = Common.UIString('Orientation');
    var orientationContent = orientationGroup.createChild('div', 'orientation-content');
    var fields = orientationContent.createChild('div', 'orientation-fields');

    const orientationOffOption = {
      title: Common.UIString('Off'),
      orientation: Emulation.SensorsView.NonPresetOptions.NoOverride
    };
    const customOrientationOption = {
      title: Common.UIString('Custom orientation...'),
      orientation: Emulation.SensorsView.NonPresetOptions.Custom
    };
    this._orientationSelectElement = this.contentElement.createChild('select', 'chrome-select');
    this._orientationSelectElement.appendChild(
        new Option(orientationOffOption.title, orientationOffOption.orientation));
    this._orientationSelectElement.appendChild(
        new Option(customOrientationOption.title, customOrientationOption.orientation));

    var orientationGroups = Emulation.SensorsView.PresetOrientations;
    for (var i = 0; i < orientationGroups.length; ++i) {
      var groupElement = this._orientationSelectElement.createChild('optgroup');
      groupElement.label = orientationGroups[i].title;
      var group = orientationGroups[i].value;
      for (var j = 0; j < group.length; ++j)
        groupElement.appendChild(new Option(group[j].title, group[j].orientation));
    }
    this._orientationSelectElement.selectedIndex = 0;
    fields.appendChild(this._orientationSelectElement);
    this._orientationSelectElement.addEventListener('change', this._orientationSelectChanged.bind(this));

    this._deviceOrientationFieldset = this._createDeviceOrientationOverrideElement(this._deviceOrientation);

    this._stageElement = orientationContent.createChild('div', 'orientation-stage');
    this._stageElement.title = Common.UIString('Shift+drag horizontally to rotate around the y-axis');
    this._orientationLayer = this._stageElement.createChild('div', 'orientation-layer');
    this._boxElement = this._orientationLayer.createChild('section', 'orientation-box orientation-element');

    this._boxElement.createChild('section', 'orientation-front orientation-element');
    this._boxElement.createChild('section', 'orientation-top orientation-element');
    this._boxElement.createChild('section', 'orientation-back orientation-element');
    this._boxElement.createChild('section', 'orientation-left orientation-element');
    this._boxElement.createChild('section', 'orientation-right orientation-element');
    this._boxElement.createChild('section', 'orientation-bottom orientation-element');

    UI.installDragHandle(
        this._stageElement, this._onBoxDragStart.bind(this), this._onBoxDrag.bind(this), null, '-webkit-grabbing',
        '-webkit-grab');

    fields.appendChild(this._deviceOrientationFieldset);
    this._enableOrientationFields(true);
    this._setBoxOrientation(this._deviceOrientation, false);
  }

  /**
   * @param {?boolean} disable
   */
  _enableOrientationFields(disable) {
    if (disable) {
      this._deviceOrientationFieldset.disabled = true;
      this._stageElement.classList.add('disabled');
    } else {
      this._deviceOrientationFieldset.disabled = false;
      this._stageElement.classList.remove('disabled');
    }
  }

  _orientationSelectChanged() {
    var value = this._orientationSelectElement.options[this._orientationSelectElement.selectedIndex].value;
    this._enableOrientationFields(false);

    if (value === Emulation.SensorsView.NonPresetOptions.NoOverride) {
      this._deviceOrientationOverrideEnabled = false;
      this._enableOrientationFields(true);
    } else if (value === Emulation.SensorsView.NonPresetOptions.Custom) {
      this._deviceOrientationOverrideEnabled = true;
      this._alphaElement.focus();
    } else {
      var parsedValue = JSON.parse(value);
      this._deviceOrientationOverrideEnabled = true;
      this._deviceOrientation = new Emulation.DeviceOrientation(parsedValue[0], parsedValue[1], parsedValue[2]);
      this._setDeviceOrientation(
          this._deviceOrientation, Emulation.SensorsView.DeviceOrientationModificationSource.SelectPreset);
    }
  }

  _applyDeviceOrientation() {
    if (this._deviceOrientationOverrideEnabled) {
      this._deviceOrientationSetting.set(this._deviceOrientation.toSetting());
      this._deviceOrientation.apply();
    } else {
      this._deviceOrientation.clear();
    }
  }

  /**
   * @param {!Element} selectElement
   * @param {string} labelValue
   */
  _setSelectElementLabel(selectElement, labelValue) {
    var optionValues = Array.prototype.map.call(selectElement.options, x => x.value);
    selectElement.selectedIndex = optionValues.indexOf(labelValue);
  }

  _applyDeviceOrientationUserInput() {
    this._setDeviceOrientation(
        Emulation.DeviceOrientation.parseUserInput(
            this._alphaElement.value.trim(), this._betaElement.value.trim(), this._gammaElement.value.trim()),
        Emulation.SensorsView.DeviceOrientationModificationSource.UserInput);
    this._setSelectElementLabel(this._orientationSelectElement, Emulation.SensorsView.NonPresetOptions.Custom);
  }

  _resetDeviceOrientation() {
    this._setDeviceOrientation(
        new Emulation.DeviceOrientation(0, 90, 0),
        Emulation.SensorsView.DeviceOrientationModificationSource.ResetButton);
    this._setSelectElementLabel(this._orientationSelectElement, '[0, 90, 0]');
  }

  /**
   * @param {?Emulation.DeviceOrientation} deviceOrientation
   * @param {!Emulation.SensorsView.DeviceOrientationModificationSource} modificationSource
   */
  _setDeviceOrientation(deviceOrientation, modificationSource) {
    if (!deviceOrientation)
      return;

    /**
     * @param {number} angle
     * @return {number}
     */
    function roundAngle(angle) {
      return Math.round(angle * 10000) / 10000;
    }

    if (modificationSource !== Emulation.SensorsView.DeviceOrientationModificationSource.UserInput) {
      this._alphaSetter(roundAngle(deviceOrientation.alpha));
      this._betaSetter(roundAngle(deviceOrientation.beta));
      this._gammaSetter(roundAngle(deviceOrientation.gamma));
    }

    var animate = modificationSource !== Emulation.SensorsView.DeviceOrientationModificationSource.UserDrag;
    this._setBoxOrientation(deviceOrientation, animate);

    this._deviceOrientation = deviceOrientation;
    this._applyDeviceOrientation();
  }

  /**
   * @param {!Element} parentElement
   * @param {!Element} input
   * @param {string} label
   * @return {function(string)}
   */
  _createAxisInput(parentElement, input, label) {
    var div = parentElement.createChild('div', 'orientation-axis-input-container');
    div.appendChild(input);
    div.createTextChild(label);
    input.type = 'number';
    return UI.bindInput(
        input, this._applyDeviceOrientationUserInput.bind(this), Emulation.DeviceOrientation.validator, true);
  }

  /**
   * @param {!Emulation.DeviceOrientation} deviceOrientation
   * @return {!Element}
   */
  _createDeviceOrientationOverrideElement(deviceOrientation) {
    var fieldsetElement = createElement('fieldset');
    fieldsetElement.classList.add('device-orientation-override-section');
    var cellElement = fieldsetElement.createChild('td', 'orientation-inputs-cell');

    this._alphaElement = createElement('input');
    this._alphaSetter = this._createAxisInput(cellElement, this._alphaElement, Common.UIString('\u03B1 (alpha)'));
    this._alphaSetter(String(deviceOrientation.alpha));

    this._betaElement = createElement('input');
    this._betaSetter = this._createAxisInput(cellElement, this._betaElement, Common.UIString('\u03B2 (beta)'));
    this._betaSetter(String(deviceOrientation.beta));

    this._gammaElement = createElement('input');
    this._gammaSetter = this._createAxisInput(cellElement, this._gammaElement, Common.UIString('\u03B3 (gamma)'));
    this._gammaSetter(String(deviceOrientation.gamma));

    cellElement.appendChild(UI.createTextButton(
        Common.UIString('Reset'), this._resetDeviceOrientation.bind(this), 'orientation-reset-button'));
    return fieldsetElement;
  }

  /**
   * @param {!Emulation.DeviceOrientation} deviceOrientation
   * @param {boolean} animate
   */
  _setBoxOrientation(deviceOrientation, animate) {
    if (animate)
      this._stageElement.classList.add('is-animating');
    else
      this._stageElement.classList.remove('is-animating');

    // The CSS transform should not depend on matrix3d, which does not interpolate well.
    var matrix = new WebKitCSSMatrix();
    this._boxMatrix = matrix.rotate(-deviceOrientation.beta, deviceOrientation.gamma, -deviceOrientation.alpha);
    var eulerAngles =
        new UI.Geometry.EulerAngles(deviceOrientation.alpha, deviceOrientation.beta, deviceOrientation.gamma);
    this._orientationLayer.style.transform = eulerAngles.toRotate3DString();
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _onBoxDrag(event) {
    var mouseMoveVector = this._calculateRadiusVector(event.x, event.y);
    if (!mouseMoveVector)
      return true;

    event.consume(true);
    var axis, angle;
    if (event.shiftKey) {
      axis = new UI.Geometry.Vector(0, 0, -1);
      angle = (this._mouseDownVector.x - mouseMoveVector.x) * Emulation.SensorsView.ShiftDragOrientationSpeed;
    } else {
      axis = UI.Geometry.crossProduct(this._mouseDownVector, mouseMoveVector);
      angle = UI.Geometry.calculateAngle(this._mouseDownVector, mouseMoveVector);
    }

    // The mouse movement vectors occur in the screen space, which is offset by 90 degrees from
    // the actual device orientation.
    var currentMatrix = new WebKitCSSMatrix();
    currentMatrix = currentMatrix.rotate(-90, 0, 0)
                        .rotateAxisAngle(axis.x, axis.y, axis.z, angle)
                        .rotate(90, 0, 0)
                        .multiply(this._originalBoxMatrix);

    var eulerAngles = UI.Geometry.EulerAngles.fromRotationMatrix(currentMatrix);
    var newOrientation = new Emulation.DeviceOrientation(-eulerAngles.alpha, -eulerAngles.beta, eulerAngles.gamma);
    this._setDeviceOrientation(newOrientation, Emulation.SensorsView.DeviceOrientationModificationSource.UserDrag);
    this._setSelectElementLabel(this._orientationSelectElement, Emulation.SensorsView.NonPresetOptions.Custom);
    return false;
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _onBoxDragStart(event) {
    if (!this._deviceOrientationOverrideEnabled)
      return false;

    this._mouseDownVector = this._calculateRadiusVector(event.x, event.y);
    this._originalBoxMatrix = this._boxMatrix;

    if (!this._mouseDownVector)
      return false;

    event.consume(true);
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {?UI.Geometry.Vector}
   */
  _calculateRadiusVector(x, y) {
    var rect = this._stageElement.getBoundingClientRect();
    var radius = Math.max(rect.width, rect.height) / 2;
    var sphereX = (x - rect.left - rect.width / 2) / radius;
    var sphereY = (y - rect.top - rect.height / 2) / radius;
    var sqrSum = sphereX * sphereX + sphereY * sphereY;
    if (sqrSum > 0.5)
      return new UI.Geometry.Vector(sphereX, sphereY, 0.5 / Math.sqrt(sqrSum));

    return new UI.Geometry.Vector(sphereX, sphereY, Math.sqrt(1 - sqrSum));
  }

  _appendTouchControl() {
    var groupElement = this.contentElement.createChild('div', 'sensors-group');
    var title = groupElement.createChild('div', 'sensors-group-title');
    var fieldsElement = groupElement.createChild('div', 'sensors-group-fields');

    title.textContent = Common.UIString('Touch');
    var select = fieldsElement.createChild('select', 'chrome-select');
    select.appendChild(new Option(Common.UIString('Device-based'), 'auto'));
    select.appendChild(new Option(Common.UIString('Force enabled'), 'enabled'));
    select.addEventListener('change', applyTouch, false);

    function applyTouch() {
      Emulation.MultitargetTouchModel.instance().setCustomTouchEnabled(select.value === 'enabled');
    }
  }
};

/** @enum {string} */
Emulation.SensorsView.DeviceOrientationModificationSource = {
  UserInput: 'userInput',
  UserDrag: 'userDrag',
  ResetButton: 'resetButton',
  SelectPreset: 'selectPreset'
};

/** {string} */
Emulation.SensorsView.NonPresetOptions = {
  'NoOverride': 'noOverride',
  'Custom': 'custom',
  'Unavailable': 'unavailable'
};

/** @type {!Array.<{title: string, value: !Array.<{title: string, location: string}>}>} */
Emulation.SensorsView.PresetLocations = [
  {
    title: 'Presets',
    value: [
      {title: Common.UIString('Berlin'), location: '[52.520007, 13.404954]'},
      {title: Common.UIString('London'), location: '[51.507351, -0.127758]'},
      {title: Common.UIString('Moscow'), location: '[55.755826, 37.617300]'},
      {title: Common.UIString('Mountain View'), location: '[37.386052, -122.083851]'},
      {title: Common.UIString('Mumbai'), location: '[19.075984, 72.877656]'},
      {title: Common.UIString('San Francisco'), location: '[37.774929, -122.419416]'},
      {title: Common.UIString('Shanghai'), location: '[31.230416, 121.473701]'},
      {title: Common.UIString('São Paulo'), location: '[-23.550520, -46.633309]'},
      {title: Common.UIString('Tokyo'), location: '[35.689487, 139.691706]'},
    ]
  },
  {
    title: 'Error',
    value: [
      {title: Common.UIString('Location unavailable'), location: Emulation.SensorsView.NonPresetOptions.Unavailable}
    ]
  }
];

/** @type {!Array.<{title: string, value: !Array.<{title: string, orientation: !Emulation.DeviceOrientation}>}>} */
Emulation.SensorsView.PresetOrientations = [{
  title: 'Presets',
  value: [
    {title: Common.UIString('Portrait'), orientation: '[0, 90, 0]'},
    {title: Common.UIString('Portrait upside down'), orientation: '[180, -90, 0]'},
    {title: Common.UIString('Landscape left'), orientation: '[0, 90, -90]'},
    {title: Common.UIString('Landscape right'), orientation: '[0, 90, 90]'},
    {title: Common.UIString('Display up'), orientation: '[0, 0, 0]'},
    {title: Common.UIString('Display down'), orientation: '[0, 180, 0]'}
  ]
}];


/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Emulation.SensorsView.ShowActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    UI.viewManager.showView('sensors');
    return true;
  }
};

Emulation.SensorsView.ShiftDragOrientationSpeed = 16;
