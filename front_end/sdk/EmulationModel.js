// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {CSSModel} from './CSSModel.js';
import {Events, OverlayModel} from './OverlayModel.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class EmulationModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._emulationAgent = target.emulationAgent();
    this._pageAgent = target.pageAgent();
    this._deviceOrientationAgent = target.deviceOrientationAgent();
    this._cssModel = target.model(CSSModel);
    this._overlayModel = target.model(OverlayModel);
    if (this._overlayModel) {
      this._overlayModel.addEventListener(Events.InspectModeWillBeToggled, this._updateTouch, this);
    }

    const disableJavascriptSetting = Common.Settings.Settings.instance().moduleSetting('javaScriptDisabled');
    disableJavascriptSetting.addChangeListener(
        () => this._emulationAgent.setScriptExecutionDisabled(disableJavascriptSetting.get()));
    if (disableJavascriptSetting.get()) {
      this._emulationAgent.setScriptExecutionDisabled(true);
    }

    const mediaTypeSetting = Common.Settings.Settings.instance().moduleSetting('emulatedCSSMedia');
    const mediaFeaturePrefersColorSchemeSetting =
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeaturePrefersColorScheme');
    const mediaFeaturePrefersReducedMotionSetting =
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeaturePrefersReducedMotion');
    // Note: this uses a different format than what the CDP API expects,
    // because we want to update these values per media type/feature
    // without having to search the `features` array (inefficient) or
    // hardcoding the indices (not readable/maintainable).
    this._mediaConfiguration = new Map([
      ['type', mediaTypeSetting.get()],
      ['prefers-color-scheme', mediaFeaturePrefersColorSchemeSetting.get()],
      ['prefers-reduced-motion', mediaFeaturePrefersReducedMotionSetting.get()],
    ]);
    mediaTypeSetting.addChangeListener(() => {
      this._mediaConfiguration.set('type', mediaTypeSetting.get());
      this._updateCssMedia();
    });
    mediaFeaturePrefersColorSchemeSetting.addChangeListener(() => {
      this._mediaConfiguration.set('prefers-color-scheme', mediaFeaturePrefersColorSchemeSetting.get());
      this._updateCssMedia();
    });
    mediaFeaturePrefersReducedMotionSetting.addChangeListener(() => {
      this._mediaConfiguration.set('prefers-reduced-motion', mediaFeaturePrefersReducedMotionSetting.get());
      this._updateCssMedia();
    });
    this._updateCssMedia();

    const visionDeficiencySetting = Common.Settings.Settings.instance().moduleSetting('emulatedVisionDeficiency');
    visionDeficiencySetting.addChangeListener(() => this._emulateVisionDeficiency(visionDeficiencySetting.get()));
    if (visionDeficiencySetting.get()) {
      this._emulateVisionDeficiency(visionDeficiencySetting.get());
    }

    this._touchEnabled = false;
    this._touchMobile = false;
    this._customTouchEnabled = false;
    this._touchConfiguration = {enabled: false, configuration: 'mobile', scriptId: ''};
  }

  /**
   * @return {boolean}
   */
  supportsDeviceEmulation() {
    return this.target().hasAllCapabilities(Capability.DeviceEmulation);
  }

  /**
   * @return {!Promise}
   */
  resetPageScaleFactor() {
    return this._emulationAgent.resetPageScaleFactor();
  }

  /**
   * @param {?Protocol.PageAgent.SetDeviceMetricsOverrideRequest} metrics
   * @return {!Promise}
   */
  emulateDevice(metrics) {
    if (metrics) {
      return this._emulationAgent.invoke_setDeviceMetricsOverride(metrics);
    }
    return this._emulationAgent.clearDeviceMetricsOverride();
  }

  /**
   * @return {?OverlayModel}
   */
  overlayModel() {
    return this._overlayModel;
  }

  /**
   * @param {?Location} location
   */
  async emulateLocation(location) {
    if (!location) {
      this._emulationAgent.clearGeolocationOverride();
      this._emulationAgent.setTimezoneOverride('');
      this._emulationAgent.setLocaleOverride('');
      this._emulationAgent.setUserAgentOverride(SDK.multitargetNetworkManager.currentUserAgent());
    }

    if (location.error) {
      this._emulationAgent.setGeolocationOverride();
      this._emulationAgent.setTimezoneOverride('');
      this._emulationAgent.setLocaleOverride('');
      this._emulationAgent.setUserAgentOverride(SDK.multitargetNetworkManager.currentUserAgent());
    } else {
      return Promise.all([
        this._emulationAgent
            .setGeolocationOverride(location.latitude, location.longitude, Location.DefaultGeoMockAccuracy)
            .catch(err => Promise.reject({type: 'emulation-set-location', message: err.message})),
        this._emulationAgent.setTimezoneOverride(location.timezoneId)
            .catch(err => Promise.reject({type: 'emulation-set-timezone', message: err.message})),
        this._emulationAgent.setLocaleOverride(location.locale)
            .catch(err => Promise.reject({type: 'emulation-set-locale', message: err.message})),
        this._emulationAgent.setUserAgentOverride(SDK.multitargetNetworkManager.currentUserAgent(), location.locale)
            .catch(err => Promise.reject({type: 'emulation-set-user-agent', message: err.message})),
      ]);
    }
  }

  /**
   * @param {?DeviceOrientation} deviceOrientation
   */
  emulateDeviceOrientation(deviceOrientation) {
    if (deviceOrientation) {
      this._deviceOrientationAgent.setDeviceOrientationOverride(
          deviceOrientation.alpha, deviceOrientation.beta, deviceOrientation.gamma);
    } else {
      this._deviceOrientationAgent.clearDeviceOrientationOverride();
    }
  }

  /**
   * @param {string} type
   * @param {!Array<{name: string, value: string}>} features
   */
  _emulateCSSMedia(type, features) {
    this._emulationAgent.setEmulatedMedia(type, features);
    if (this._cssModel) {
      this._cssModel.mediaQueryResultChanged();
    }
  }

  /**
   * @param {string} type
   */
  _emulateVisionDeficiency(type) {
    this._emulationAgent.setEmulatedVisionDeficiency(type);
  }

  /**
   * @param {number} rate
   */
  setCPUThrottlingRate(rate) {
    this._emulationAgent.setCPUThrottlingRate(rate);
  }

  /**
   * @param {boolean} enabled
   * @param {boolean} mobile
   */
  emulateTouch(enabled, mobile) {
    this._touchEnabled = enabled;
    this._touchMobile = mobile;
    this._updateTouch();
  }

  /**
   * @param {boolean} enabled
   */
  overrideEmulateTouch(enabled) {
    this._customTouchEnabled = enabled;
    this._updateTouch();
  }

  _updateTouch() {
    let configuration = {
      enabled: this._touchEnabled,
      configuration: this._touchMobile ? 'mobile' : 'desktop',
    };
    if (this._customTouchEnabled) {
      configuration = {enabled: true, configuration: 'mobile'};
    }

    if (this._overlayModel && this._overlayModel.inspectModeEnabled()) {
      configuration = {enabled: false, configuration: 'mobile'};
    }

    if (!this._touchConfiguration.enabled && !configuration.enabled) {
      return;
    }
    if (this._touchConfiguration.enabled && configuration.enabled &&
        this._touchConfiguration.configuration === configuration.configuration) {
      return;
    }

    this._touchConfiguration = configuration;
    this._emulationAgent.setTouchEmulationEnabled(configuration.enabled, 1);
    this._emulationAgent.setEmitTouchEventsForMouse(configuration.enabled, configuration.configuration);
  }

  _updateCssMedia() {
    // See the note above, where this._mediaConfiguration is defined.
    const type = this._mediaConfiguration.get('type');
    const features = [
      {
        name: 'prefers-color-scheme',
        value: this._mediaConfiguration.get('prefers-color-scheme'),
      },
      {
        name: 'prefers-reduced-motion',
        value: this._mediaConfiguration.get('prefers-reduced-motion'),
      },
    ];
    this._emulateCSSMedia(type, features);
  }
}

export class Location {
  /**
   * @param {number} latitude
   * @param {number} longitude
   * @param {string} timezoneId
   * @param {string} locale
   * @param {boolean} error
   */
  constructor(latitude, longitude, timezoneId, locale, error) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.timezoneId = timezoneId;
    this.locale = locale;
    this.error = error;
  }

  /**
   * @return {!Location}
   */
  static parseSetting(value) {
    if (value) {
      const [position, timezoneId, locale, error] = value.split(':');
      const [latitude, longitude] = position.split('@');
      return new Location(parseFloat(latitude), parseFloat(longitude), timezoneId, locale, Boolean(error));
    }
    return new Location(0, 0, '', '', false);
  }

  /**
   * @param {string} latitudeString
   * @param {string} longitudeString
   * @param {string} timezoneId
   * @return {?Location}
   */
  static parseUserInput(latitudeString, longitudeString, timezoneId, locale) {
    if (!latitudeString && !longitudeString) {
      return null;
    }

    const {valid: isLatitudeValid} = Location.latitudeValidator(latitudeString);
    const {valid: isLongitudeValid} = Location.longitudeValidator(longitudeString);

    if (!isLatitudeValid && !isLongitudeValid) {
      return null;
    }

    const latitude = isLatitudeValid ? parseFloat(latitudeString) : -1;
    const longitude = isLongitudeValid ? parseFloat(longitudeString) : -1;
    return new Location(latitude, longitude, timezoneId, locale, false);
  }

  /**
   * @param {string} value
   * @return {{valid: boolean, errorMessage: (string|undefined)}}
   */
  static latitudeValidator(value) {
    const numValue = parseFloat(value);
    const valid = /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -90 && numValue <= 90;
    return {valid};
  }

  /**
   * @param {string} value
   * @return {{valid: boolean, errorMessage: (string|undefined)}}
   */
  static longitudeValidator(value) {
    const numValue = parseFloat(value);
    const valid = /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -180 && numValue <= 180;
    return {valid};
  }

  /**
   * @param {string} value
   * @return {{valid: boolean, errorMessage: (string|undefined)}}
   */
  static timezoneIdValidator(value) {
    // Chromium uses ICU's timezone implementation, which is very
    // liberal in what it accepts. ICU does not simply use an allowlist
    // but instead tries to make sense of the input, even for
    // weird-looking timezone IDs. There's not much point in validating
    // the input other than checking if it contains at least one alphabet.
    // The empty string resets the override, and is accepted as well.
    const valid = value === '' || /[a-zA-Z]/.test(value);
    return {valid};
  }

  /**
   * @param {string} value
   * @return {{valid: boolean, errorMessage: (string|undefined)}}
   */
  static localeValidator(value) {
    // Similarly to timezone IDs, there's not much point in validating
    // input locales other than checking if it contains at least two
    // alphabetic characters.
    // https://unicode.org/reports/tr35/#Unicode_language_identifier
    // The empty string resets the override, and is accepted as
    // well.
    const valid = value === '' || /[a-zA-Z]{2}/.test(value);
    return {valid};
  }

  /**
   * @return {string}
   */
  toSetting() {
    return `${this.latitude}@${this.longitude}:${this.timezoneId}:${this.locale}:${this.error || ''}`;
  }
}

Location.DefaultGeoMockAccuracy = 150;

export class DeviceOrientation {
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
   * @return {!DeviceOrientation}
   */
  static parseSetting(value) {
    if (value) {
      const jsonObject = JSON.parse(value);
      return new DeviceOrientation(jsonObject.alpha, jsonObject.beta, jsonObject.gamma);
    }
    return new DeviceOrientation(0, 0, 0);
  }

  /**
   * @return {?DeviceOrientation}
   */
  static parseUserInput(alphaString, betaString, gammaString) {
    if (!alphaString && !betaString && !gammaString) {
      return null;
    }

    const {valid: isAlphaValid} = DeviceOrientation.validator(alphaString);
    const {valid: isBetaValid} = DeviceOrientation.validator(betaString);
    const {valid: isGammaValid} = DeviceOrientation.validator(gammaString);

    if (!isAlphaValid && !isBetaValid && !isGammaValid) {
      return null;
    }

    const alpha = isAlphaValid ? parseFloat(alphaString) : -1;
    const beta = isBetaValid ? parseFloat(betaString) : -1;
    const gamma = isGammaValid ? parseFloat(gammaString) : -1;

    return new DeviceOrientation(alpha, beta, gamma);
  }

  /**
   * @param {string} value
   * @return {{valid: boolean, errorMessage: (string|undefined)}}
   */
  static validator(value) {
    const valid = /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value);
    return {valid};
  }

  /**
   * @return {string}
   */
  toSetting() {
    return JSON.stringify(this);
  }
}

SDKModel.register(EmulationModel, Capability.Emulation, true);
