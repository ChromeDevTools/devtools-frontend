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
    this._geolocationEnabled = false;
    this._appendGeolocationOverrideControl();

    this._deviceOrientationSetting = WebInspector.settings.createSetting("emulation.deviceOrientationOverride", "");
    this._deviceOrientation = WebInspector.DeviceOrientation.parseSetting(this._deviceOrientationSetting.get());
    this._deviceOrientationEnabled = false;
    this._appendDeviceOrientationOverrideControl();
}

WebInspector.SensorsView.prototype = {
    _appendGeolocationOverrideControl: function()
    {
        var checkboxLabel = createCheckboxLabel(WebInspector.UIString("Emulate geolocation coordinates"));
        this._geolocationOverrideCheckbox = checkboxLabel.checkboxElement;
        this._geolocationOverrideCheckbox.addEventListener("click", this._geolocationOverrideCheckboxClicked.bind(this));
        this.contentElement.appendChild(checkboxLabel);
        this._geolocationFieldset = this._createGeolocationOverrideElement(this._geolocation);
        this._geolocationFieldset.disabled = true;
        this.contentElement.appendChild(this._geolocationFieldset);
    },

    _geolocationOverrideCheckboxClicked: function()
    {
        var enabled = this._geolocationOverrideCheckbox.checked;

        this._geolocationEnabled = enabled;
        this._applyGeolocation();

        if (enabled && !this._latitudeElement.value)
            this._latitudeElement.focus();
        this._geolocationFieldset.disabled = !enabled;
    },

    _applyGeolocationUserInput: function()
    {
        var geolocation = WebInspector.Geolocation.parseUserInput(this._latitudeElement.value.trim(), this._longitudeElement.value.trim(), this._geolocationErrorElement.checked);
        if (!geolocation)
            return;

        this._geolocation = geolocation;
        this._applyGeolocation();
    },

    _applyGeolocation: function()
    {
        if (this._geolocationEnabled) {
            this._geolocationSetting.set(this._geolocation.toSetting());
            this._geolocation.apply();
        } else {
            this._geolocation.clear();
        }
    },

    /**
     * @param {!WebInspector.Geolocation} geolocation
     * @return {!Element}
     */
    _createGeolocationOverrideElement: function(geolocation)
    {
        var fieldsetElement = createElement("fieldset");
        fieldsetElement.id = "geolocation-override-section";

        var tableElement = fieldsetElement.createChild("table");
        var rowElement = tableElement.createChild("tr");
        var cellElement = rowElement.createChild("td");
        cellElement = rowElement.createChild("td");
        cellElement.createTextChild(WebInspector.UIString("Lat = "));
        this._latitudeElement = cellElement.createChild("input");
        this._latitudeElement.type = "text";
        WebInspector.bindInput(this._latitudeElement, this._applyGeolocationUserInput.bind(this), WebInspector.Geolocation.latitudeValidator, true)(String(geolocation.latitude));
        cellElement.createTextChild(" , ");
        cellElement.createTextChild(WebInspector.UIString("Lon = "));
        this._longitudeElement = cellElement.createChild("input");
        this._longitudeElement.type = "text";
        WebInspector.bindInput(this._longitudeElement, this._applyGeolocationUserInput.bind(this), WebInspector.Geolocation.longitudeValidator, true)(String(geolocation.longitude));
        rowElement = tableElement.createChild("tr");
        cellElement = rowElement.createChild("td");
        cellElement.colSpan = 2;
        var geolocationErrorLabelElement = createCheckboxLabel(WebInspector.UIString("Emulate position unavailable"), !geolocation || !!geolocation.error);
        var geolocationErrorCheckboxElement = geolocationErrorLabelElement.checkboxElement;
        geolocationErrorCheckboxElement.id = "geolocation-error";
        geolocationErrorCheckboxElement.addEventListener("click", this._applyGeolocationUserInput.bind(this), false);
        this._geolocationErrorElement = geolocationErrorCheckboxElement;
        cellElement.appendChild(geolocationErrorLabelElement);

        return fieldsetElement;
    },

    _appendDeviceOrientationOverrideControl: function()
    {
        var checkboxLabel = createCheckboxLabel(WebInspector.UIString("Emulate device orientation"));
        this._overrideDeviceOrientationCheckbox = checkboxLabel.checkboxElement;
        this._overrideDeviceOrientationCheckbox.addEventListener("click", this._deviceOrientationOverrideCheckboxClicked.bind(this));
        this.contentElement.appendChild(checkboxLabel);
        this._deviceOrientationFieldset = this._createDeviceOrientationOverrideElement(this._deviceOrientation);
        this._deviceOrientationFieldset.disabled = true;
        this.contentElement.appendChild(this._deviceOrientationFieldset);
    },

    _deviceOrientationOverrideCheckboxClicked: function()
    {
        var enabled = this._overrideDeviceOrientationCheckbox.checked;

        this._deviceOrientationEnabled = enabled;
        this._applyDeviceOrientation();

        if (enabled && !this._alphaElement.value)
            this._alphaElement.focus();
        this._deviceOrientationFieldset.disabled = !enabled;
    },

    _applyDeviceOrientation: function()
    {
        if (this._deviceOrientationEnabled) {
            this._deviceOrientationSetting.set(this._deviceOrientation.toSetting());
            this._deviceOrientation.apply();
        } else {
            this._deviceOrientation.clear();
        }
    },

    _applyDeviceOrientationUserInput: function()
    {
        this._setDeviceOrientation(WebInspector.DeviceOrientation.parseUserInput(this._alphaElement.value.trim(), this._betaElement.value.trim(), this._gammaElement.value.trim()), WebInspector.SensorsView.DeviceOrientationModificationSource.UserInput);
    },

    _resetDeviceOrientation: function()
    {
        this._setDeviceOrientation(new WebInspector.DeviceOrientation(0, 0, 0), WebInspector.SensorsView.DeviceOrientationModificationSource.ResetButton);
    },

    /**
     * @param {?WebInspector.DeviceOrientation} deviceOrientation
     * @param {!WebInspector.SensorsView.DeviceOrientationModificationSource} modificationSource
     */
    _setDeviceOrientation: function(deviceOrientation, modificationSource)
    {
        if (!deviceOrientation)
            return;

        if (modificationSource != WebInspector.SensorsView.DeviceOrientationModificationSource.UserInput) {
            this._alphaSetter(deviceOrientation.alpha);
            this._betaSetter(deviceOrientation.beta);
            this._gammaSetter(deviceOrientation.gamma);
        }

        if (modificationSource != WebInspector.SensorsView.DeviceOrientationModificationSource.UserDrag)
            this._setBoxOrientation(deviceOrientation);

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
        div.createTextChild(label);
        div.appendChild(input);
        input.type = "text";
        return WebInspector.bindInput(input, this._applyDeviceOrientationUserInput.bind(this), WebInspector.DeviceOrientation.validator, true);
    },

    /**
     * @param {!WebInspector.DeviceOrientation} deviceOrientation
     */
    _createDeviceOrientationOverrideElement: function(deviceOrientation)
    {
        var fieldsetElement = createElement("fieldset");
        fieldsetElement.classList.add("device-orientation-override-section");
        var tableElement = fieldsetElement.createChild("table");
        var rowElement = tableElement.createChild("tr");
        var cellElement = rowElement.createChild("td", "accelerometer-inputs-cell");

        this._alphaElement = createElement("input");
        this._alphaSetter = this._createAxisInput(cellElement, this._alphaElement, "\u03B1: ");
        this._alphaSetter(String(deviceOrientation.alpha));

        this._betaElement = createElement("input");
        this._betaSetter = this._createAxisInput(cellElement, this._betaElement, "\u03B2: ");
        this._betaSetter(String(deviceOrientation.beta));

        this._gammaElement = createElement("input");
        this._gammaSetter = this._createAxisInput(cellElement, this._gammaElement, "\u03B3: ");
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

        WebInspector.installDragHandle(this._stageElement, this._onBoxDragStart.bind(this), this._onBoxDrag.bind(this), this._onBoxDragEnd.bind(this), "move");
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
        return false;
    },

    /**
     * @param {!MouseEvent} event
     * @return {boolean}
     */
    _onBoxDragStart: function(event)
    {
        if (!this._overrideDeviceOrientationCheckbox.checked)
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

    __proto__ : WebInspector.VBox.prototype
}

/** @enum {string} */
WebInspector.SensorsView.DeviceOrientationModificationSource = {
    UserInput: "userInput",
    UserDrag: "userDrag",
    ResetButton: "resetButton"
}

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
