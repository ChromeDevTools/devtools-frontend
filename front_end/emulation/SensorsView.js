// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.SensorsView = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("emulation/sensors.css");
    this.contentElement.classList.add("sensors-view");

    this._geolocationSetting = WebInspector.settings.createSetting("emulation.geolocationOverride", "");
    this._geolocation = WebInspector.Geolocation.parseSetting(this._geolocationSetting.get());
    this._geolocationOverrideEnabled = false;
    this._createGeolocationSection(this._geolocation);

    this.contentElement.createChild("div").classList.add("panel-section-separator");

    this._deviceOrientationSetting = WebInspector.settings.createSetting("emulation.deviceOrientationOverride", "");
    this._deviceOrientation = WebInspector.DeviceOrientation.parseSetting(this._deviceOrientationSetting.get());
    this._deviceOrientationOverrideEnabled = false;
    this._createDeviceOrientationSection();

    this.contentElement.createChild("div").classList.add("panel-section-separator");

    this._appendTouchControl();
}

WebInspector.SensorsView.prototype = {
    /**
     * @param {!WebInspector.Geolocation} geolocation
     */
    _createGeolocationSection: function(geolocation)
    {
        var geogroup = this.contentElement.createChild("section", "sensors-group");
        geogroup.createChild("div", "sensors-group-title").textContent = WebInspector.UIString("Geolocation");
        var fields = geogroup.createChild("div", "geo-fields");

        const noOverrideOption = {title: WebInspector.UIString("No override"), location: WebInspector.SensorsView.NonPresetOptions.NoOverride};
        const customLocationOption = {title: WebInspector.UIString("Custom location..."), location: WebInspector.SensorsView.NonPresetOptions.Custom};
        this._locationSelectElement = this.contentElement.createChild("select", "chrome-select");
        this._locationSelectElement.appendChild(new Option(noOverrideOption.title, noOverrideOption.location));
        this._locationSelectElement.appendChild(new Option(customLocationOption.title, customLocationOption.location));

        var locationGroups = WebInspector.SensorsView.PresetLocations;
        for (var i = 0; i < locationGroups.length; ++i) {
            var group = locationGroups[i].value;
            var groupElement = this._locationSelectElement.createChild("optgroup");
            groupElement.label = locationGroups[i].title;
            for (var j = 0; j < group.length; ++j)
                groupElement.appendChild(new Option(group[j].title, group[j].location));
        }
        this._locationSelectElement.selectedIndex = 0;
        fields.appendChild(this._locationSelectElement);
        this._locationSelectElement.addEventListener("change", this._geolocationSelectChanged.bind(this));

        // Validated input fieldset.
        this._fieldsetElement = fields.createChild("fieldset");
        this._fieldsetElement.disabled = !this._geolocationOverrideEnabled;
        this._fieldsetElement.id = "geolocation-override-section";

        var latitudeGroup = this._fieldsetElement.createChild("div", "latlong-group");
        var longitudeGroup = this._fieldsetElement.createChild("div", "latlong-group");

        this._latitudeInput = latitudeGroup.createChild("input");
        this._latitudeInput.setAttribute("type", "number");
        this._latitudeInput.value = 0;
        this._latitudeSetter = WebInspector.bindInput(this._latitudeInput, this._applyGeolocationUserInput.bind(this), WebInspector.Geolocation.latitudeValidator, true);
        this._latitudeSetter(String(geolocation.latitude));

        this._longitudeInput = longitudeGroup.createChild("input");
        this._longitudeInput.setAttribute("type", "number");
        this._longitudeInput.value = 0;
        this._longitudeSetter = WebInspector.bindInput(this._longitudeInput, this._applyGeolocationUserInput.bind(this), WebInspector.Geolocation.longitudeValidator, true);
        this._longitudeSetter(String(geolocation.longitude));

        latitudeGroup.createChild("div", "latlong-title").textContent = WebInspector.UIString("Latitude");
        longitudeGroup.createChild("div", "latlong-title").textContent = WebInspector.UIString("Longitude");
    },

    _geolocationSelectChanged: function()
    {
        this._fieldsetElement.disabled = false;
        var value = this._locationSelectElement.options[this._locationSelectElement.selectedIndex].value;
        if (value === WebInspector.SensorsView.NonPresetOptions.NoOverride) {
            this._geolocationOverrideEnabled = false;
            this._fieldsetElement.disabled = true;
        } else if (value === WebInspector.SensorsView.NonPresetOptions.Custom) {
            this._geolocationOverrideEnabled = true;
        } else if (value === WebInspector.SensorsView.NonPresetOptions.Unavailable) {
            this._geolocationOverrideEnabled = true;
            this._geolocation = new WebInspector.Geolocation(0, 0, true);
        } else {
            this._geolocationOverrideEnabled = true;
            var coordinates = JSON.parse(value);
            this._geolocation = new WebInspector.Geolocation(coordinates[0], coordinates[1], false);
            this._latitudeSetter(coordinates[0]);
            this._longitudeSetter(coordinates[1]);
        }

        this._applyGeolocation();
        if (value === WebInspector.SensorsView.NonPresetOptions.Custom)
            this._latitudeInput.focus();
    },

    _applyGeolocationUserInput: function()
    {
        var geolocation = WebInspector.Geolocation.parseUserInput(this._latitudeInput.value.trim(), this._longitudeInput.value.trim(), "");
        if (!geolocation)
            return;

        this._setSelectElementLabel(this._locationSelectElement, WebInspector.SensorsView.NonPresetOptions.Custom);
        this._geolocation = geolocation;
        this._applyGeolocation();
    },

    _applyGeolocation: function()
    {
        if (this._geolocationOverrideEnabled) {
            this._geolocationSetting.set(this._geolocation.toSetting());
            this._geolocation.apply();
        } else {
            this._geolocation.clear();
        }
    },

    _createDeviceOrientationSection: function()
    {
        var orientationGroup = this.contentElement.createChild("section", "sensors-group");
        orientationGroup.createChild("div", "sensors-group-title").textContent = WebInspector.UIString("Accelerometer");
        var fields = orientationGroup.createChild("div", "geo-fields");

        const accelerometerOffOption = {title: WebInspector.UIString("Off"), orientation: WebInspector.SensorsView.NonPresetOptions.NoOverride};
        const customOrientationOption = {title: WebInspector.UIString("Custom orientation..."), orientation: WebInspector.SensorsView.NonPresetOptions.Custom};
        this._orientationSelectElement = this.contentElement.createChild("select", "chrome-select");
        this._orientationSelectElement.appendChild(new Option(accelerometerOffOption.title, accelerometerOffOption.orientation));
        this._orientationSelectElement.appendChild(new Option(customOrientationOption.title, customOrientationOption.orientation));

        var orientationGroups = WebInspector.SensorsView.PresetOrientations;
        for (var i = 0; i < orientationGroups.length; ++i) {
            var groupElement = this._orientationSelectElement.createChild("optgroup");
            groupElement.label = orientationGroups[i].title;
            var group = orientationGroups[i].value;
            for (var j = 0; j < group.length; ++j)
                groupElement.appendChild(new Option(group[j].title, group[j].orientation));
        }
        this._orientationSelectElement.selectedIndex = 0;
        fields.appendChild(this._orientationSelectElement);
        this._orientationSelectElement.addEventListener("change", this._orientationSelectChanged.bind(this));

        this._deviceOrientationFieldset = this._createDeviceOrientationOverrideElement(this._deviceOrientation);
        this._deviceOrientationFieldset.disabled = true;
        fields.appendChild(this._deviceOrientationFieldset);
    },

    _orientationSelectChanged: function()
    {
        var value = this._orientationSelectElement.options[this._orientationSelectElement.selectedIndex].value;
        this._deviceOrientationFieldset.disabled = false;

        if (value === WebInspector.SensorsView.NonPresetOptions.NoOverride) {
            this._deviceOrientationOverrideEnabled = false;
            this._deviceOrientationFieldset.disabled = true;
        } else if (value === WebInspector.SensorsView.NonPresetOptions.Custom) {
            this._deviceOrientationOverrideEnabled = true;
            this._alphaElement.focus();
        } else {
            var parsedValue = JSON.parse(value);
            this._deviceOrientationOverrideEnabled = true;
            this._deviceOrientation = new WebInspector.DeviceOrientation(parsedValue[0], parsedValue[1], parsedValue[2]);
            this._setDeviceOrientation(this._deviceOrientation, WebInspector.SensorsView.DeviceOrientationModificationSource.SelectPreset);
        }
    },

    _applyDeviceOrientation: function()
    {
        if (this._deviceOrientationOverrideEnabled) {
            this._deviceOrientationSetting.set(this._deviceOrientation.toSetting());
            this._deviceOrientation.apply();
        } else {
            this._deviceOrientation.clear();
        }
    },

    /**
     * @param {!Element} selectElement
     * @param {string} labelValue
     */
    _setSelectElementLabel: function(selectElement, labelValue)
    {
        var optionValues = Array.prototype.map.call(selectElement.options, x => x.value);
        selectElement.selectedIndex = optionValues.indexOf(labelValue);
    },

    _applyDeviceOrientationUserInput: function()
    {
        this._setDeviceOrientation(WebInspector.DeviceOrientation.parseUserInput(this._alphaElement.value.trim(), this._betaElement.value.trim(), this._gammaElement.value.trim()), WebInspector.SensorsView.DeviceOrientationModificationSource.UserInput);
        this._setSelectElementLabel(this._orientationSelectElement, WebInspector.SensorsView.NonPresetOptions.Custom);
    },

    _resetDeviceOrientation: function()
    {
        this._setDeviceOrientation(new WebInspector.DeviceOrientation(0, 0, 0), WebInspector.SensorsView.DeviceOrientationModificationSource.ResetButton);
        this._setSelectElementLabel(this._orientationSelectElement, "[0, 0, 0]");
    },

    /**
     * @param {?WebInspector.DeviceOrientation} deviceOrientation
     * @param {!WebInspector.SensorsView.DeviceOrientationModificationSource} modificationSource
     */
    _setDeviceOrientation: function(deviceOrientation, modificationSource)
    {
        if (!deviceOrientation)
            return;

        /**
         * @param {number} angle
         * @return {number}
         */
        function roundAngle(angle)
        {
            return Math.round(angle*10000)/10000;
        }

        if (modificationSource != WebInspector.SensorsView.DeviceOrientationModificationSource.UserInput) {
            this._alphaSetter(roundAngle(deviceOrientation.alpha));
            this._betaSetter(roundAngle(deviceOrientation.beta));
            this._gammaSetter(roundAngle(deviceOrientation.gamma));
        }

        if (modificationSource != WebInspector.SensorsView.DeviceOrientationModificationSource.UserDrag)
            this._setBoxOrientation(deviceOrientation);
        else
            this._boxElement.classList.remove("smooth-transition");

        this._deviceOrientation = deviceOrientation;
        this._applyDeviceOrientation();
    },

    /**
     * @param {!Element} parentElement
     * @param {!Element} input
     * @param {string} label
     * @return {function(string)}
     */
    _createAxisInput: function(parentElement, input, label)
    {
        var div = parentElement.createChild("div", "accelerometer-axis-input-container");
        div.appendChild(input);
        div.createTextChild(label);
        input.type = "number";
        return WebInspector.bindInput(input, this._applyDeviceOrientationUserInput.bind(this), WebInspector.DeviceOrientation.validator, true);
    },

    /**
     * @param {!WebInspector.DeviceOrientation} deviceOrientation
     * @return {!Element}
     */
    _createDeviceOrientationOverrideElement: function(deviceOrientation)
    {
        var fieldsetElement = createElement("fieldset");
        fieldsetElement.classList.add("device-orientation-override-section");
        var tableElement = fieldsetElement.createChild("table");
        var rowElement = tableElement.createChild("tr");
        var cellElement = rowElement.createChild("td", "accelerometer-inputs-cell");

        this._alphaElement = createElement("input");
        this._alphaSetter = this._createAxisInput(cellElement, this._alphaElement, WebInspector.UIString("\u03B1 (alpha)"));
        this._alphaSetter(String(deviceOrientation.alpha));

        this._betaElement = createElement("input");
        this._betaSetter = this._createAxisInput(cellElement, this._betaElement, WebInspector.UIString("\u03B2 (beta)"));
        this._betaSetter(String(deviceOrientation.beta));

        this._gammaElement = createElement("input");
        this._gammaSetter = this._createAxisInput(cellElement, this._gammaElement, WebInspector.UIString("\u03B3 (gamma)"));
        this._gammaSetter(String(deviceOrientation.gamma));

        cellElement.appendChild(createTextButton(WebInspector.UIString("Reset"), this._resetDeviceOrientation.bind(this), "accelerometer-reset-button"));

        this._stageElement = rowElement.createChild("td","accelerometer-stage");
        this._boxElement = this._stageElement.createChild("section", "accelerometer-box");

        this._boxElement.createChild("section", "front");
        this._boxElement.createChild("section", "top");
        this._boxElement.createChild("section", "back");
        this._boxElement.createChild("section", "left");
        this._boxElement.createChild("section", "right");
        this._boxElement.createChild("section", "bottom");

        WebInspector.installDragHandle(this._stageElement, this._onBoxDragStart.bind(this), this._onBoxDrag.bind(this), this._onBoxDragEnd.bind(this), "-webkit-grabbing", "-webkit-grab");
        this._setBoxOrientation(deviceOrientation);
        return fieldsetElement;
    },

    /**
     * @param {!WebInspector.DeviceOrientation} deviceOrientation
     */
    _setBoxOrientation: function(deviceOrientation)
    {
        var matrix = new WebKitCSSMatrix();
        this._boxMatrix = matrix.rotate(-deviceOrientation.beta, deviceOrientation.gamma, -deviceOrientation.alpha);
        this._boxElement.classList.add("smooth-transition");
        this._boxElement.style.webkitTransform = this._boxMatrix.toString();
    },

    /**
     * @param {!MouseEvent} event
     * @return {boolean}
     */
    _onBoxDrag: function(event)
    {
        var mouseMoveVector = this._calculateRadiusVector(event.x, event.y);
        if (!mouseMoveVector)
            return true;

        event.consume(true);
        var axis = WebInspector.Geometry.crossProduct(this._mouseDownVector, mouseMoveVector);
        axis.normalize();
        var angle = WebInspector.Geometry.calculateAngle(this._mouseDownVector, mouseMoveVector);
        var matrix = new WebKitCSSMatrix();
        var rotationMatrix = matrix.rotateAxisAngle(axis.x, axis.y, axis.z, angle);
        this._currentMatrix = rotationMatrix.multiply(this._boxMatrix);
        this._boxElement.style.webkitTransform = this._currentMatrix;
        var eulerAngles = WebInspector.Geometry.EulerAngles.fromRotationMatrix(this._currentMatrix);
        var newOrientation = new WebInspector.DeviceOrientation(-eulerAngles.alpha, -eulerAngles.beta, eulerAngles.gamma);
        this._setDeviceOrientation(newOrientation, WebInspector.SensorsView.DeviceOrientationModificationSource.UserDrag);
        this._setSelectElementLabel(this._orientationSelectElement, WebInspector.SensorsView.NonPresetOptions.Custom);
        return false;
    },

    /**
     * @param {!MouseEvent} event
     * @return {boolean}
     */
    _onBoxDragStart: function(event)
    {
        if (!this._deviceOrientationOverrideEnabled)
            return false;

        this._mouseDownVector = this._calculateRadiusVector(event.x, event.y);

        if (!this._mouseDownVector)
            return false;

        event.consume(true);
        return true;
    },

    _onBoxDragEnd: function()
    {
        this._boxMatrix = this._currentMatrix;
    },

    /**
     * @param {number} x
     * @param {number} y
     * @return {?WebInspector.Geometry.Vector}
     */
    _calculateRadiusVector: function(x, y)
    {
        var rect = this._stageElement.getBoundingClientRect();
        var radius = Math.max(rect.width, rect.height) / 2;
        var sphereX = (x - rect.left - rect.width / 2) / radius;
        var sphereY = (y - rect.top - rect.height / 2) / radius;
        var sqrSum = sphereX * sphereX + sphereY * sphereY;
        if (sqrSum > 0.5)
            return new WebInspector.Geometry.Vector(sphereX, sphereY, 0.5 / Math.sqrt(sqrSum));

        return new WebInspector.Geometry.Vector(sphereX, sphereY, Math.sqrt(1 - sqrSum));
    },

    _appendTouchControl: function()
    {
        var groupElement = this.contentElement.createChild("div", "sensors-group");
        var title = groupElement.createChild("div", "sensors-group-title");
        var fieldsElement = groupElement.createChild("div", "sensors-group-fields");

        title.textContent = WebInspector.UIString("Touch");
        var select = fieldsElement.createChild("select", "chrome-select");
        select.appendChild(new Option(WebInspector.UIString("Device-based"), "auto"));
        select.appendChild(new Option(WebInspector.UIString("Force enabled"), "enabled"));
        select.addEventListener("change", applyTouch, false);

        function applyTouch()
        {
            WebInspector.MultitargetTouchModel.instance().setCustomTouchEnabled(select.value === "enabled");
        }
    },

    __proto__ : WebInspector.VBox.prototype
}

/** @enum {string} */
WebInspector.SensorsView.DeviceOrientationModificationSource = {
    UserInput: "userInput",
    UserDrag: "userDrag",
    ResetButton: "resetButton",
    SelectPreset: "selectPreset"
}

/** {string} */
WebInspector.SensorsView.NonPresetOptions = {
    "NoOverride": "noOverride",
    "Custom": "custom",
    "Unavailable": "unavailable"
}

/** @type {!Array.<{title: string, value: !Array.<{title: string, location: string}>}>} */
WebInspector.SensorsView.PresetLocations = [
    {
        title: "Presets",
        value: [
            {title: WebInspector.UIString("Berlin"), location: "[52.520007, 13.404954]"},
            {title: WebInspector.UIString("London"), location: "[51.507351, -0.127758]"},
            {title: WebInspector.UIString("Moscow"), location: "[55.755826, 37.617300]"},
            {title: WebInspector.UIString("Mountain View"), location: "[37.386052, -122.083851]"},
            {title: WebInspector.UIString("Mumbai"), location: "[19.075984, 72.877656]"},
            {title: WebInspector.UIString("San Francisco"), location: "[37.774929, -122.419416]"},
            {title: WebInspector.UIString("Shanghai"), location: "[31.230416, 121.473701]"},
            {title: WebInspector.UIString("São Paulo"), location: "[-23.550520, -46.633309]"},
            {title: WebInspector.UIString("Tokyo"), location: "[35.689487, 139.691706]"},
        ]
    },
    {
        title: "Error",
        value: [
            {title: WebInspector.UIString("Location unavailable"), location: WebInspector.SensorsView.NonPresetOptions.Unavailable}
        ]
    }
]

/** @type {!Array.<{title: string, value: !Array.<{title: string, orientation: !WebInspector.DeviceOrientation}>}>} */
WebInspector.SensorsView.PresetOrientations = [
    {
        title: "Presets",
        value: [
            {title: WebInspector.UIString("Portrait"), orientation: "[0, 0, 0]"},
            {title: WebInspector.UIString("Portrait upside down"), orientation: "[180, 0, 0]"},
            {title: WebInspector.UIString("Landscape left"), orientation: "[90, 0, 0]"},
            {title: WebInspector.UIString("Landscape right"), orientation: "[270, 0, 0]"},
            {title: WebInspector.UIString("Display up"), orientation: "[0, 270, 0]"},
            {title: WebInspector.UIString("Display down"), orientation: "[0, 90, 0]"}
        ]
    }
]

/**
 * @return {!WebInspector.SensorsView}
 */
WebInspector.SensorsView.instance = function()
{
    if (!WebInspector.SensorsView._instanceObject)
        WebInspector.SensorsView._instanceObject = new WebInspector.SensorsView();
    return WebInspector.SensorsView._instanceObject;
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.SensorsView.ShowActionDelegate = function()
{
}

WebInspector.SensorsView.ShowActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        WebInspector.inspectorView.showViewInDrawer("sensors");
        return true;
    }
}
