// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Emulation.Geolocation = class {
  /**
   * @param {number} latitude
   * @param {number} longitude
   * @param {boolean} error
   */
  constructor(latitude, longitude, error) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.error = error;
  }

  /**
   * @return {!Emulation.Geolocation}
   */
  static parseSetting(value) {
    if (value) {
      var splitError = value.split(':');
      if (splitError.length === 2) {
        var splitPosition = splitError[0].split('@');
        if (splitPosition.length === 2)
          return new Emulation.Geolocation(parseFloat(splitPosition[0]), parseFloat(splitPosition[1]), splitError[1]);
      }
    }
    return new Emulation.Geolocation(0, 0, false);
  }

  /**
   * @param {string} latitudeString
   * @param {string} longitudeString
   * @param {string} errorStatus
   * @return {?Emulation.Geolocation}
   */
  static parseUserInput(latitudeString, longitudeString, errorStatus) {
    if (!latitudeString && !longitudeString)
      return null;

    var isLatitudeValid = Emulation.Geolocation.latitudeValidator(latitudeString);
    var isLongitudeValid = Emulation.Geolocation.longitudeValidator(longitudeString);

    if (!isLatitudeValid && !isLongitudeValid)
      return null;

    var latitude = isLatitudeValid ? parseFloat(latitudeString) : -1;
    var longitude = isLongitudeValid ? parseFloat(longitudeString) : -1;
    return new Emulation.Geolocation(latitude, longitude, !!errorStatus);
  }

  /**
   * @param {string} value
   * @return {boolean}
   */
  static latitudeValidator(value) {
    var numValue = parseFloat(value);
    return /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -90 && numValue <= 90;
  }

  /**
   * @param {string} value
   * @return {boolean}
   */
  static longitudeValidator(value) {
    var numValue = parseFloat(value);
    return /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -180 && numValue <= 180;
  }

  /**
   * @return {string}
   */
  toSetting() {
    return (typeof this.latitude === 'number' && typeof this.longitude === 'number' && typeof this.error === 'string') ?
        this.latitude + '@' + this.longitude + ':' + this.error :
        '';
  }

  apply() {
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Browser)) {
      if (this.error) {
        target.emulationAgent().setGeolocationOverride();
      } else {
        target.emulationAgent().setGeolocationOverride(
            this.latitude, this.longitude, Emulation.Geolocation.DefaultMockAccuracy);
      }
    }
  }

  clear() {
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Browser))
      target.emulationAgent().clearGeolocationOverride();
  }
};


Emulation.Geolocation.DefaultMockAccuracy = 150;
