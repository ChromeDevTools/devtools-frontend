// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {CSSModel} from './CSSModel.js';
import {MultitargetNetworkManager} from './NetworkManager.js';
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
      this._overlayModel.addEventListener(Events.InspectModeWillBeToggled, () => {
        this._updateTouch();
      }, this);
    }

    const disableJavascriptSetting = Common.Settings.Settings.instance().moduleSetting('javaScriptDisabled');
    disableJavascriptSetting.addChangeListener(
        async () =>
            await this._emulationAgent.invoke_setScriptExecutionDisabled({value: disableJavascriptSetting.get()}));
    if (disableJavascriptSetting.get()) {
      this._emulationAgent.invoke_setScriptExecutionDisabled({value: true});
    }

    const touchSetting = Common.Settings.Settings.instance().moduleSetting('emulation.touch');
    touchSetting.addChangeListener(() => {
      const settingValue = touchSetting.get();

      this.overrideEmulateTouch(settingValue === 'force');
    });

    const idleDetectionSetting = Common.Settings.Settings.instance().moduleSetting('emulation.idleDetection');
    idleDetectionSetting.addChangeListener(async () => {
      const settingValue = idleDetectionSetting.get();
      if (settingValue === 'none') {
        await this.clearIdleOverride();
        return;
      }

      const emulationParams =
          /** @type {{isUserActive: boolean, isScreenUnlocked: boolean}} */ (JSON.parse(settingValue));
      await this.setIdleOverride(emulationParams);
    });

    const mediaTypeSetting = Common.Settings.Settings.instance().moduleSetting('emulatedCSSMedia');
    const mediaFeaturePrefersColorSchemeSetting =
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeaturePrefersColorScheme');
    const mediaFeaturePrefersReducedMotionSetting =
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeaturePrefersReducedMotion');
    const mediaFeaturePrefersReducedDataSetting =
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeaturePrefersReducedData');
    const mediaFeatureColorGamutSetting =
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeatureColorGamut');
    // Note: this uses a different format than what the CDP API expects,
    // because we want to update these values per media type/feature
    // without having to search the `features` array (inefficient) or
    // hardcoding the indices (not readable/maintainable).
    this._mediaConfiguration = new Map([
      ['type', mediaTypeSetting.get()],
      ['prefers-color-scheme', mediaFeaturePrefersColorSchemeSetting.get()],
      ['prefers-reduced-motion', mediaFeaturePrefersReducedMotionSetting.get()],
      ['prefers-reduced-data', mediaFeaturePrefersReducedDataSetting.get()],
      ['color-gamut', mediaFeatureColorGamutSetting.get()],
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
    mediaFeaturePrefersReducedDataSetting.addChangeListener(() => {
      this._mediaConfiguration.set('prefers-reduced-data', mediaFeaturePrefersReducedDataSetting.get());
      this._updateCssMedia();
    });
    mediaFeatureColorGamutSetting.addChangeListener(() => {
      this._mediaConfiguration.set('color-gamut', mediaFeatureColorGamutSetting.get());
      this._updateCssMedia();
    });
    this._updateCssMedia();

    const visionDeficiencySetting = Common.Settings.Settings.instance().moduleSetting('emulatedVisionDeficiency');
    visionDeficiencySetting.addChangeListener(() => this._emulateVisionDeficiency(visionDeficiencySetting.get()));
    if (visionDeficiencySetting.get()) {
      this._emulateVisionDeficiency(visionDeficiencySetting.get());
    }

    const localFontsDisabledSetting = Common.Settings.Settings.instance().moduleSetting('localFontsDisabled');
    localFontsDisabledSetting.addChangeListener(() => this._setLocalFontsDisabled(localFontsDisabledSetting.get()));
    if (localFontsDisabledSetting.get()) {
      this._setLocalFontsDisabled(localFontsDisabledSetting.get());
    }

    const avifFormatDisabledSetting = Common.Settings.Settings.instance().moduleSetting('avifFormatDisabled');
    const webpFormatDisabledSetting = Common.Settings.Settings.instance().moduleSetting('webpFormatDisabled');

    const updateDisabledImageFormats = () => {
      const types = [];
      if (avifFormatDisabledSetting.get()) {
        types.push(Protocol.Emulation.DisabledImageType.Avif);
      }
      if (webpFormatDisabledSetting.get()) {
        types.push(Protocol.Emulation.DisabledImageType.Webp);
      }
      this._setDisabledImageTypes(types);
    };

    avifFormatDisabledSetting.addChangeListener(updateDisabledImageFormats);
    webpFormatDisabledSetting.addChangeListener(updateDisabledImageFormats);

    if (webpFormatDisabledSetting.get() || avifFormatDisabledSetting.get()) {
      updateDisabledImageFormats();
    }

    this._touchEnabled = false;
    this._touchMobile = false;
    this._customTouchEnabled = false;
    this._touchConfiguration = {
      enabled: false,
      configuration: Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Mobile,
    };
  }

  /**
   * @return {boolean}
   */
  supportsDeviceEmulation() {
    return this.target().hasAllCapabilities(Capability.DeviceEmulation);
  }

  /**
   * @return {!Promise<void>}
   */
  async resetPageScaleFactor() {
    await this._emulationAgent.invoke_resetPageScaleFactor();
  }

  /**
   * @param {?Protocol.Page.SetDeviceMetricsOverrideRequest} metrics
   * @return {!Promise<?>}
   */
  async emulateDevice(metrics) {
    if (metrics) {
      await this._emulationAgent.invoke_setDeviceMetricsOverride(metrics);
    } else {
      await this._emulationAgent.invoke_clearDeviceMetricsOverride();
    }
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
    if (!location || location.error) {
      await Promise.all([
        this._emulationAgent.invoke_clearGeolocationOverride(),
        this._emulationAgent.invoke_setTimezoneOverride({timezoneId: ''}),
        this._emulationAgent.invoke_setLocaleOverride({locale: ''}),
        this._emulationAgent.invoke_setUserAgentOverride(
            {userAgent: MultitargetNetworkManager.instance().currentUserAgent()}),
      ]);
    } else {
      /**
       * @param {string} errorType
       * @param {*} result
       */
      function processEmulationResult(errorType, result) {
        const errorMessage = result.getError();
        if (errorMessage) {
          return Promise.reject({
            type: errorType,
            message: errorMessage,
          });
        }
        return Promise.resolve();
      }

      await Promise.all([
        this._emulationAgent
            .invoke_setGeolocationOverride({
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: Location.DefaultGeoMockAccuracy,
            })
            .then(result => processEmulationResult('emulation-set-location', result)),
        this._emulationAgent
            .invoke_setTimezoneOverride({
              timezoneId: location.timezoneId,
            })
            .then(result => processEmulationResult('emulation-set-timezone', result)),
        this._emulationAgent
            .invoke_setLocaleOverride({
              locale: location.locale,
            })
            .then(result => processEmulationResult('emulation-set-locale', result)),
        this._emulationAgent
            .invoke_setUserAgentOverride({
              userAgent: MultitargetNetworkManager.instance().currentUserAgent(),
              acceptLanguage: location.locale,
            })
            .then(result => processEmulationResult('emulation-set-user-agent', result)),
      ]);
    }
  }

  /**
   * @param {?DeviceOrientation} deviceOrientation
   * @returns {!Promise<void>}
   */
  async emulateDeviceOrientation(deviceOrientation) {
    if (deviceOrientation) {
      await this._deviceOrientationAgent.invoke_setDeviceOrientationOverride(
          {alpha: deviceOrientation.alpha, beta: deviceOrientation.beta, gamma: deviceOrientation.gamma});
    } else {
      await this._deviceOrientationAgent.invoke_clearDeviceOrientationOverride();
    }
  }

  /**
   * @param {{isUserActive: boolean, isScreenUnlocked: boolean}} emulationParams
   */
  async setIdleOverride(emulationParams) {
    await this._emulationAgent.invoke_setIdleOverride(emulationParams);
  }

  async clearIdleOverride() {
    await this._emulationAgent.invoke_clearIdleOverride();
  }

  /**
   * @param {string} type
   * @param {!Array<{name: string, value: string}>} features
   * @returns {!Promise<void>}
   */
  async _emulateCSSMedia(type, features) {
    await this._emulationAgent.invoke_setEmulatedMedia({media: type, features});
    if (this._cssModel) {
      this._cssModel.mediaQueryResultChanged();
    }
  }

  /**
   * @param {!Protocol.Emulation.SetEmulatedVisionDeficiencyRequestType} type
   * @returns {!Promise<void>}
   */
  async _emulateVisionDeficiency(type) {
    await this._emulationAgent.invoke_setEmulatedVisionDeficiency({type});
  }

  /**
   *
   * @param {boolean} disabled
   */
  _setLocalFontsDisabled(disabled) {
    if (!this._cssModel) {
      return;
    }
    this._cssModel.setLocalFontsEnabled(!disabled);
  }

  /**
   * @param {!Array<!Protocol.Emulation.DisabledImageType>} imageTypes
   */
  _setDisabledImageTypes(imageTypes) {
    this._emulationAgent.invoke_setDisabledImageTypes({imageTypes});
  }

  /**
   * @param {number} rate
   * @returns {!Promise<void>}
   */
  async setCPUThrottlingRate(rate) {
    await this._emulationAgent.invoke_setCPUThrottlingRate({rate});
  }

  /**
   * @param {boolean} enabled
   * @param {boolean} mobile
   * @returns {!Promise<void>}
   */
  async emulateTouch(enabled, mobile) {
    this._touchEnabled = enabled;
    this._touchMobile = mobile;
    await this._updateTouch();
  }

  /**
   * @param {boolean} enabled
   * @returns {!Promise<void>}
   */
  async overrideEmulateTouch(enabled) {
    this._customTouchEnabled = enabled;
    await this._updateTouch();
  }

  async _updateTouch() {
    let configuration = {
      enabled: this._touchEnabled,
      configuration: this._touchMobile ? Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Mobile :
                                         Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Desktop,
    };
    if (this._customTouchEnabled) {
      configuration = {
        enabled: true,
        configuration: Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Mobile,
      };
    }

    if (this._overlayModel && this._overlayModel.inspectModeEnabled()) {
      configuration = {
        enabled: false,
        configuration: Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Mobile,
      };
    }

    if (!this._touchConfiguration.enabled && !configuration.enabled) {
      return;
    }
    if (this._touchConfiguration.enabled && configuration.enabled &&
        this._touchConfiguration.configuration === configuration.configuration) {
      return;
    }

    this._touchConfiguration = configuration;
    await this._emulationAgent.invoke_setTouchEmulationEnabled({enabled: configuration.enabled, maxTouchPoints: 1});
    await this._emulationAgent.invoke_setEmitTouchEventsForMouse(
        {enabled: configuration.enabled, configuration: configuration.configuration});
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
      {
        name: 'prefers-reduced-data',
        value: this._mediaConfiguration.get('prefers-reduced-data'),
      },
      {
        name: 'color-gamut',
        value: this._mediaConfiguration.get('color-gamut'),
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
   * @param {string} value
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
   * @param {string} locale
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
    return {valid, errorMessage: undefined};
  }

  /**
   * @param {string} value
   * @return {{valid: boolean, errorMessage: (string|undefined)}}
   */
  static longitudeValidator(value) {
    const numValue = parseFloat(value);
    const valid = /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -180 && numValue <= 180;
    return {valid, errorMessage: undefined};
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
    return {valid, errorMessage: undefined};
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
    return {valid, errorMessage: undefined};
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
   * @param {string} value
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
   * @param {string} alphaString
   * @param {string} betaString
   * @param {string} gammaString
   * @return {?DeviceOrientation}
   */
  static parseUserInput(alphaString, betaString, gammaString) {
    if (!alphaString && !betaString && !gammaString) {
      return null;
    }

    const {valid: isAlphaValid} = DeviceOrientation.alphaAngleValidator(alphaString);
    const {valid: isBetaValid} = DeviceOrientation.betaAngleValidator(betaString);
    const {valid: isGammaValid} = DeviceOrientation.gammaAngleValidator(gammaString);

    if (!isAlphaValid && !isBetaValid && !isGammaValid) {
      return null;
    }

    const alpha = isAlphaValid ? parseFloat(alphaString) : -1;
    const beta = isBetaValid ? parseFloat(betaString) : -1;
    const gamma = isGammaValid ? parseFloat(gammaString) : -1;

    return new DeviceOrientation(alpha, beta, gamma);
  }

  /**
   * @param {!string} value
   * @param {Object} interval
   * @param {number} interval.minimum Minimum interval range (inclusive)
   * @param {number} interval.maximum Maximum interval range (exclusive)
   */
  static angleRangeValidator(value, interval) {
    const numValue = parseFloat(value);
    const valid =
        /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= interval.minimum && numValue < interval.maximum;
    return {valid, errorMessage: undefined};
  }

  /**
  * @param {string} value
  * @return {{valid: boolean, errorMessage: (string|undefined)}}
  */
  static alphaAngleValidator(value) {
    return DeviceOrientation.angleRangeValidator(value, {minimum: 0, maximum: 360});
  }

  /**
  * @param {string} value
  * @return {{valid: boolean, errorMessage: (string|undefined)}}
  */
  static betaAngleValidator(value) {
    return DeviceOrientation.angleRangeValidator(value, {minimum: -180, maximum: 180});
  }

  /**
  * @param {string} value
  * @return {{valid: boolean, errorMessage: (string|undefined)}}
  */
  static gammaAngleValidator(value) {
    return DeviceOrientation.angleRangeValidator(value, {minimum: -90, maximum: 90});
  }

  /**
   * @return {string}
   */
  toSetting() {
    return JSON.stringify(this);
  }
}

SDKModel.register(EmulationModel, Capability.Emulation, true);
