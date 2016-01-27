// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} error
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
                target.emulationAgent().setGeolocationOverride(this.latitude, this.longitude, 150);

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
    return new WebInspector.Geolocation(0, 0, "");
}

/**
 * @return {?WebInspector.Geolocation}
 */
WebInspector.Geolocation.parseUserInput = function(latitudeString, longitudeString, errorStatus)
{
    function isUserInputValid(value)
    {
        if (!value)
            return true;
        return /^[-]?[0-9]*[.]?[0-9]*$/.test(value);
    }

    if (!latitudeString && !longitudeString)
        return null;

    var isLatitudeValid = isUserInputValid(latitudeString);
    var isLongitudeValid = isUserInputValid(longitudeString);

    if (!isLatitudeValid && !isLongitudeValid)
        return null;

    var latitude = isLatitudeValid ? parseFloat(latitudeString) : -1;
    var longitude = isLongitudeValid ? parseFloat(longitudeString) : -1;

    return new WebInspector.Geolocation(latitude, longitude, errorStatus ? "PositionUnavailable" : "");
}
