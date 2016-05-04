// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {number} latitude
 * @param {number} longitude
 * @param {boolean} error
 */
WebInspector.Geolocation = function(latitude, longitude, error)
{
    this.latitude = latitude;
    this.longitude = longitude;
    this.error = error;
}

WebInspector.Geolocation.prototype = {
    /**
     * @return {string}
     */
    toSetting: function()
    {
        return (typeof this.latitude === "number" && typeof this.longitude === "number" && typeof this.error === "string") ? this.latitude + "@" + this.longitude + ":" + this.error : "";
    },

    apply: function()
    {
        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page)) {
            if (this.error)
                target.emulationAgent().setGeolocationOverride();
            else
                target.emulationAgent().setGeolocationOverride(this.latitude, this.longitude, WebInspector.Geolocation.DefaultMockAccuracy);
        }
    },

    clear: function()
    {
        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page))
            target.emulationAgent().clearGeolocationOverride();
    }
}

/**
 * @return {!WebInspector.Geolocation}
 */
WebInspector.Geolocation.parseSetting = function(value)
{
    if (value) {
        var splitError = value.split(":");
        if (splitError.length === 2) {
            var splitPosition = splitError[0].split("@");
            if (splitPosition.length === 2)
                return new WebInspector.Geolocation(parseFloat(splitPosition[0]), parseFloat(splitPosition[1]), splitError[1]);
        }
    }
    return new WebInspector.Geolocation(0, 0, false);
}

/**
 * @param {string} latitudeString
 * @param {string} longitudeString
 * @param {string} errorStatus
 * @return {?WebInspector.Geolocation}
 */
WebInspector.Geolocation.parseUserInput = function(latitudeString, longitudeString, errorStatus)
{
    if (!latitudeString && !longitudeString)
        return null;

    var isLatitudeValid = WebInspector.Geolocation.latitudeValidator(latitudeString);
    var isLongitudeValid = WebInspector.Geolocation.longitudeValidator(longitudeString);

    if (!isLatitudeValid && !isLongitudeValid)
        return null;

    var latitude = isLatitudeValid ? parseFloat(latitudeString) : -1;
    var longitude = isLongitudeValid ? parseFloat(longitudeString) : -1;
    return new WebInspector.Geolocation(latitude, longitude, !!errorStatus);
}

/**
 * @param {string} value
 * @return {boolean}
 */
WebInspector.Geolocation.latitudeValidator = function(value)
{
    var numValue = parseFloat(value);
    return /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -90 && numValue <= 90;
}

/**
 * @param {string} value
 * @return {boolean}
 */
WebInspector.Geolocation.longitudeValidator = function(value)
{
    var numValue = parseFloat(value);
    return /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -180 && numValue <= 180;
}

WebInspector.Geolocation.DefaultMockAccuracy = 150;
