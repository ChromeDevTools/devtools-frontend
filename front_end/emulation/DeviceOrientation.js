// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Emulation.DeviceOrientation = class {
  /**
   * @param {number} alpha
   * @param {number} beta
   * @param {number} gamma
   */
  constructor(alpha, beta, gamma) {
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
  }

  /**
   * @return {!Emulation.DeviceOrientation}
   */
  static parseSetting(value) {
    if (value) {
      var jsonObject = JSON.parse(value);
      return new Emulation.DeviceOrientation(jsonObject.alpha, jsonObject.beta, jsonObject.gamma);
    }
    return new Emulation.DeviceOrientation(0, 0, 0);
  }

  /**
   * @return {?Emulation.DeviceOrientation}
   */
  static parseUserInput(alphaString, betaString, gammaString) {
    if (!alphaString && !betaString && !gammaString)
      return null;

    var isAlphaValid = Emulation.DeviceOrientation.validator(alphaString);
    var isBetaValid = Emulation.DeviceOrientation.validator(betaString);
    var isGammaValid = Emulation.DeviceOrientation.validator(gammaString);

    if (!isAlphaValid && !isBetaValid && !isGammaValid)
      return null;

    var alpha = isAlphaValid ? parseFloat(alphaString) : -1;
    var beta = isBetaValid ? parseFloat(betaString) : -1;
    var gamma = isGammaValid ? parseFloat(gammaString) : -1;

    return new Emulation.DeviceOrientation(alpha, beta, gamma);
  }

  /**
   * @param {string} value
   * @return {boolean}
   */
  static validator(value) {
    return /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value);
  }

  /**
   * @return {string}
   */
  toSetting() {
    return JSON.stringify(this);
  }

  apply() {
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Browser))
      target.deviceOrientationAgent().setDeviceOrientationOverride(this.alpha, this.beta, this.gamma);
  }

  clear() {
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Browser))
      target.deviceOrientationAgent().clearDeviceOrientationOverride();
  }
};
