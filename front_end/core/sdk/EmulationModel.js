// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import { CSSModel } from './CSSModel.js';
import { MultitargetNetworkManager } from './NetworkManager.js';
import { OverlayModel } from './OverlayModel.js';
import { SDKModel } from './SDKModel.js';
export class EmulationModel extends SDKModel {
    #emulationAgent;
    #deviceOrientationAgent;
    #cssModel;
    #overlayModel;
    #mediaConfiguration;
    #cpuPressureEnabled;
    #touchEnabled;
    #touchMobile;
    #touchEmulationAllowed;
    #customTouchEnabled;
    #touchConfiguration;
    constructor(target) {
        super(target);
        this.#emulationAgent = target.emulationAgent();
        this.#deviceOrientationAgent = target.deviceOrientationAgent();
        this.#cssModel = target.model(CSSModel);
        this.#overlayModel = target.model(OverlayModel);
        if (this.#overlayModel) {
            this.#overlayModel.addEventListener("InspectModeWillBeToggled" /* Events.INSPECT_MODE_WILL_BE_TOGGLED */, () => {
                void this.updateTouch();
            }, this);
        }
        const disableJavascriptSetting = Common.Settings.Settings.instance().moduleSetting('java-script-disabled');
        disableJavascriptSetting.addChangeListener(async () => await this.#emulationAgent.invoke_setScriptExecutionDisabled({ value: disableJavascriptSetting.get() }));
        if (disableJavascriptSetting.get()) {
            void this.#emulationAgent.invoke_setScriptExecutionDisabled({ value: true });
        }
        const touchSetting = Common.Settings.Settings.instance().moduleSetting('emulation.touch');
        touchSetting.addChangeListener(() => {
            const settingValue = touchSetting.get();
            void this.overrideEmulateTouch(settingValue === 'force');
        });
        const idleDetectionSetting = Common.Settings.Settings.instance().moduleSetting('emulation.idle-detection');
        idleDetectionSetting.addChangeListener(async () => {
            const settingValue = idleDetectionSetting.get();
            if (settingValue === 'none') {
                await this.clearIdleOverride();
                return;
            }
            const emulationParams = JSON.parse(settingValue);
            await this.setIdleOverride(emulationParams);
        });
        const cpuPressureDetectionSetting = Common.Settings.Settings.instance().moduleSetting('emulation.cpu-pressure');
        cpuPressureDetectionSetting.addChangeListener(async () => {
            const settingValue = cpuPressureDetectionSetting.get();
            if (settingValue === 'none') {
                await this.setPressureSourceOverrideEnabled(false);
                this.#cpuPressureEnabled = false;
                return;
            }
            if (!this.#cpuPressureEnabled) {
                this.#cpuPressureEnabled = true;
                await this.setPressureSourceOverrideEnabled(true);
            }
            await this.setPressureStateOverride(settingValue);
        });
        const mediaTypeSetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media');
        const mediaFeatureColorGamutSetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-color-gamut');
        const mediaFeaturePrefersColorSchemeSetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-color-scheme');
        const mediaFeatureForcedColorsSetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-forced-colors');
        const mediaFeaturePrefersContrastSetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-contrast');
        const mediaFeaturePrefersReducedDataSetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-reduced-data');
        const mediaFeaturePrefersReducedTransparencySetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-reduced-transparency');
        const mediaFeaturePrefersReducedMotionSetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-reduced-motion');
        // Note: this uses a different format than what the CDP API expects,
        // because we want to update these values per media type/feature
        // without having to search the `features` array (inefficient) or
        // hardcoding the indices (not readable/maintainable).
        this.#mediaConfiguration = new Map([
            ['type', mediaTypeSetting.get()],
            ['color-gamut', mediaFeatureColorGamutSetting.get()],
            ['prefers-color-scheme', mediaFeaturePrefersColorSchemeSetting.get()],
            ['forced-colors', mediaFeatureForcedColorsSetting.get()],
            ['prefers-contrast', mediaFeaturePrefersContrastSetting.get()],
            ['prefers-reduced-data', mediaFeaturePrefersReducedDataSetting.get()],
            ['prefers-reduced-motion', mediaFeaturePrefersReducedMotionSetting.get()],
            ['prefers-reduced-transparency', mediaFeaturePrefersReducedTransparencySetting.get()],
        ]);
        mediaTypeSetting.addChangeListener(() => {
            this.#mediaConfiguration.set('type', mediaTypeSetting.get());
            void this.updateCssMedia();
        });
        mediaFeatureColorGamutSetting.addChangeListener(() => {
            this.#mediaConfiguration.set('color-gamut', mediaFeatureColorGamutSetting.get());
            void this.updateCssMedia();
        });
        mediaFeaturePrefersColorSchemeSetting.addChangeListener(() => {
            this.#mediaConfiguration.set('prefers-color-scheme', mediaFeaturePrefersColorSchemeSetting.get());
            void this.updateCssMedia();
        });
        mediaFeatureForcedColorsSetting.addChangeListener(() => {
            this.#mediaConfiguration.set('forced-colors', mediaFeatureForcedColorsSetting.get());
            void this.updateCssMedia();
        });
        mediaFeaturePrefersContrastSetting.addChangeListener(() => {
            this.#mediaConfiguration.set('prefers-contrast', mediaFeaturePrefersContrastSetting.get());
            void this.updateCssMedia();
        });
        mediaFeaturePrefersReducedDataSetting.addChangeListener(() => {
            this.#mediaConfiguration.set('prefers-reduced-data', mediaFeaturePrefersReducedDataSetting.get());
            void this.updateCssMedia();
        });
        mediaFeaturePrefersReducedMotionSetting.addChangeListener(() => {
            this.#mediaConfiguration.set('prefers-reduced-motion', mediaFeaturePrefersReducedMotionSetting.get());
            void this.updateCssMedia();
        });
        mediaFeaturePrefersReducedTransparencySetting.addChangeListener(() => {
            this.#mediaConfiguration.set('prefers-reduced-transparency', mediaFeaturePrefersReducedTransparencySetting.get());
            void this.updateCssMedia();
        });
        void this.updateCssMedia();
        const autoDarkModeSetting = Common.Settings.Settings.instance().moduleSetting('emulate-auto-dark-mode');
        autoDarkModeSetting.addChangeListener(() => {
            const enabled = autoDarkModeSetting.get();
            mediaFeaturePrefersColorSchemeSetting.setDisabled(enabled);
            mediaFeaturePrefersColorSchemeSetting.set(enabled ? 'dark' : '');
            void this.emulateAutoDarkMode(enabled);
        });
        if (autoDarkModeSetting.get()) {
            mediaFeaturePrefersColorSchemeSetting.setDisabled(true);
            mediaFeaturePrefersColorSchemeSetting.set('dark');
            void this.emulateAutoDarkMode(true);
        }
        const visionDeficiencySetting = Common.Settings.Settings.instance().moduleSetting('emulated-vision-deficiency');
        visionDeficiencySetting.addChangeListener(() => this.emulateVisionDeficiency(visionDeficiencySetting.get()));
        if (visionDeficiencySetting.get()) {
            void this.emulateVisionDeficiency(visionDeficiencySetting.get());
        }
        const osTextScaleSetting = Common.Settings.Settings.instance().moduleSetting('emulated-os-text-scale');
        osTextScaleSetting.addChangeListener(() => {
            void this.emulateOSTextScale(parseFloat(osTextScaleSetting.get()) || undefined);
        });
        if (osTextScaleSetting.get()) {
            void this.emulateOSTextScale(parseFloat(osTextScaleSetting.get()) || undefined);
        }
        const localFontsDisabledSetting = Common.Settings.Settings.instance().moduleSetting('local-fonts-disabled');
        localFontsDisabledSetting.addChangeListener(() => this.setLocalFontsDisabled(localFontsDisabledSetting.get()));
        if (localFontsDisabledSetting.get()) {
            this.setLocalFontsDisabled(localFontsDisabledSetting.get());
        }
        const avifFormatDisabledSetting = Common.Settings.Settings.instance().moduleSetting('avif-format-disabled');
        const webpFormatDisabledSetting = Common.Settings.Settings.instance().moduleSetting('webp-format-disabled');
        const updateDisabledImageFormats = () => {
            const types = [];
            if (avifFormatDisabledSetting.get()) {
                types.push("avif" /* Protocol.Emulation.DisabledImageType.Avif */);
            }
            if (webpFormatDisabledSetting.get()) {
                types.push("webp" /* Protocol.Emulation.DisabledImageType.Webp */);
            }
            this.setDisabledImageTypes(types);
        };
        avifFormatDisabledSetting.addChangeListener(updateDisabledImageFormats);
        webpFormatDisabledSetting.addChangeListener(updateDisabledImageFormats);
        if (avifFormatDisabledSetting.get() || webpFormatDisabledSetting.get()) {
            updateDisabledImageFormats();
        }
        this.#cpuPressureEnabled = false;
        this.#touchEmulationAllowed = true;
        this.#touchEnabled = false;
        this.#touchMobile = false;
        this.#customTouchEnabled = false;
        this.#touchConfiguration = {
            enabled: false,
            configuration: "mobile" /* Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Mobile */,
        };
    }
    setTouchEmulationAllowed(touchEmulationAllowed) {
        this.#touchEmulationAllowed = touchEmulationAllowed;
    }
    supportsDeviceEmulation() {
        return this.target().hasAllCapabilities(4096 /* Capability.DEVICE_EMULATION */);
    }
    async resetPageScaleFactor() {
        await this.#emulationAgent.invoke_resetPageScaleFactor();
    }
    async emulateDevice(metrics) {
        if (metrics) {
            await this.#emulationAgent.invoke_setDeviceMetricsOverride(metrics);
        }
        else {
            await this.#emulationAgent.invoke_clearDeviceMetricsOverride();
        }
    }
    overlayModel() {
        return this.#overlayModel;
    }
    async setPressureSourceOverrideEnabled(enabled) {
        await this.#emulationAgent.invoke_setPressureSourceOverrideEnabled({ source: "cpu" /* Protocol.Emulation.PressureSource.Cpu */, enabled });
    }
    async setPressureStateOverride(pressureState) {
        await this.#emulationAgent.invoke_setPressureStateOverride({
            source: "cpu" /* Protocol.Emulation.PressureSource.Cpu */,
            state: pressureState,
        });
    }
    async emulateLocation(location) {
        if (!location) {
            await Promise.all([
                this.#emulationAgent.invoke_clearGeolocationOverride(),
                this.#emulationAgent.invoke_setTimezoneOverride({ timezoneId: '' }),
                this.#emulationAgent.invoke_setLocaleOverride({ locale: '' }),
                this.#emulationAgent.invoke_setUserAgentOverride({ userAgent: MultitargetNetworkManager.instance().currentUserAgent() }),
            ]);
        }
        else if (location.unavailable) {
            await Promise.all([
                this.#emulationAgent.invoke_setGeolocationOverride({}),
                this.#emulationAgent.invoke_setTimezoneOverride({ timezoneId: '' }),
                this.#emulationAgent.invoke_setLocaleOverride({ locale: '' }),
                this.#emulationAgent.invoke_setUserAgentOverride({ userAgent: MultitargetNetworkManager.instance().currentUserAgent() }),
            ]);
        }
        else {
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
                this.#emulationAgent
                    .invoke_setGeolocationOverride({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                })
                    .then(result => processEmulationResult('emulation-set-location', result)),
                this.#emulationAgent
                    .invoke_setTimezoneOverride({
                    timezoneId: location.timezoneId,
                })
                    .then(result => processEmulationResult('emulation-set-timezone', result)),
                this.#emulationAgent
                    .invoke_setLocaleOverride({
                    locale: location.locale,
                })
                    .then(result => processEmulationResult('emulation-set-locale', result)),
                this.#emulationAgent
                    .invoke_setUserAgentOverride({
                    userAgent: MultitargetNetworkManager.instance().currentUserAgent(),
                    acceptLanguage: location.locale,
                })
                    .then(result => processEmulationResult('emulation-set-user-agent', result)),
            ]);
        }
    }
    async emulateDeviceOrientation(deviceOrientation) {
        if (deviceOrientation) {
            await this.#deviceOrientationAgent.invoke_setDeviceOrientationOverride({ alpha: deviceOrientation.alpha, beta: deviceOrientation.beta, gamma: deviceOrientation.gamma });
        }
        else {
            await this.#deviceOrientationAgent.invoke_clearDeviceOrientationOverride();
        }
    }
    async setIdleOverride(emulationParams) {
        await this.#emulationAgent.invoke_setIdleOverride(emulationParams);
    }
    async clearIdleOverride() {
        await this.#emulationAgent.invoke_clearIdleOverride();
    }
    async emulateCSSMedia(type, features) {
        await this.#emulationAgent.invoke_setEmulatedMedia({ media: type, features });
        if (this.#cssModel) {
            this.#cssModel.mediaQueryResultChanged();
        }
    }
    async emulateAutoDarkMode(enabled) {
        if (enabled) {
            this.#mediaConfiguration.set('prefers-color-scheme', 'dark');
            await this.updateCssMedia();
        }
        // We never send `enabled: false` since that would explicitly disable
        // autodark mode. We either enable it or clear any existing override.
        await this.#emulationAgent.invoke_setAutoDarkModeOverride({ enabled: enabled || undefined });
    }
    async emulateVisionDeficiency(type) {
        await this.#emulationAgent.invoke_setEmulatedVisionDeficiency({ type });
    }
    async emulateOSTextScale(scale) {
        await this.#emulationAgent.invoke_setEmulatedOSTextScale({ scale: scale || undefined });
    }
    setLocalFontsDisabled(disabled) {
        if (!this.#cssModel) {
            return;
        }
        void this.#cssModel.setLocalFontsEnabled(!disabled);
    }
    setDisabledImageTypes(imageTypes) {
        void this.#emulationAgent.invoke_setDisabledImageTypes({ imageTypes });
    }
    async setDataSaverOverride(dataSaverOverride) {
        const dataSaverEnabled = dataSaverOverride === "unset" /* DataSaverOverride.UNSET */ ? undefined :
            dataSaverOverride === "enabled" /* DataSaverOverride.ENABLED */ ? true :
                false;
        await this.#emulationAgent.invoke_setDataSaverOverride({ dataSaverEnabled });
    }
    async setCPUThrottlingRate(rate) {
        await this.#emulationAgent.invoke_setCPUThrottlingRate({ rate });
    }
    async setHardwareConcurrency(hardwareConcurrency) {
        if (hardwareConcurrency < 1) {
            throw new Error('hardwareConcurrency must be a positive value');
        }
        await this.#emulationAgent.invoke_setHardwareConcurrencyOverride({ hardwareConcurrency });
    }
    async emulateTouch(enabled, mobile) {
        this.#touchEnabled = enabled && this.#touchEmulationAllowed;
        this.#touchMobile = mobile && this.#touchEmulationAllowed;
        await this.updateTouch();
    }
    async overrideEmulateTouch(enabled) {
        this.#customTouchEnabled = enabled && this.#touchEmulationAllowed;
        await this.updateTouch();
    }
    async updateTouch() {
        let configuration = {
            enabled: this.#touchEnabled,
            configuration: this.#touchMobile ? "mobile" /* Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Mobile */ :
                "desktop" /* Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Desktop */,
        };
        if (this.#customTouchEnabled) {
            configuration = {
                enabled: true,
                configuration: "mobile" /* Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Mobile */,
            };
        }
        if (this.#overlayModel && this.#overlayModel.inspectModeEnabled()) {
            configuration = {
                enabled: false,
                configuration: "mobile" /* Protocol.Emulation.SetEmitTouchEventsForMouseRequestConfiguration.Mobile */,
            };
        }
        if (!this.#touchConfiguration.enabled && !configuration.enabled) {
            return;
        }
        if (this.#touchConfiguration.enabled && configuration.enabled &&
            this.#touchConfiguration.configuration === configuration.configuration) {
            return;
        }
        this.#touchConfiguration = configuration;
        await this.#emulationAgent.invoke_setTouchEmulationEnabled({ enabled: configuration.enabled, maxTouchPoints: 1 });
        await this.#emulationAgent.invoke_setEmitTouchEventsForMouse({ enabled: configuration.enabled, configuration: configuration.configuration });
    }
    async updateCssMedia() {
        // See the note above, where this.#mediaConfiguration is defined.
        const type = this.#mediaConfiguration.get('type') ?? '';
        const features = [
            {
                name: 'color-gamut',
                value: this.#mediaConfiguration.get('color-gamut') ?? '',
            },
            {
                name: 'prefers-color-scheme',
                value: this.#mediaConfiguration.get('prefers-color-scheme') ?? '',
            },
            {
                name: 'forced-colors',
                value: this.#mediaConfiguration.get('forced-colors') ?? '',
            },
            {
                name: 'prefers-contrast',
                value: this.#mediaConfiguration.get('prefers-contrast') ?? '',
            },
            {
                name: 'prefers-reduced-data',
                value: this.#mediaConfiguration.get('prefers-reduced-data') ?? '',
            },
            {
                name: 'prefers-reduced-motion',
                value: this.#mediaConfiguration.get('prefers-reduced-motion') ?? '',
            },
            {
                name: 'prefers-reduced-transparency',
                value: this.#mediaConfiguration.get('prefers-reduced-transparency') ?? '',
            },
        ];
        return await this.emulateCSSMedia(type, features);
    }
}
export class Location {
    static DEFAULT_ACCURACY = 150;
    latitude;
    longitude;
    timezoneId;
    locale;
    accuracy;
    unavailable;
    constructor(latitude, longitude, timezoneId, locale, accuracy, unavailable) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.timezoneId = timezoneId;
        this.locale = locale;
        this.accuracy = accuracy;
        this.unavailable = unavailable;
    }
    static parseSetting(value) {
        if (value) {
            const [position, timezoneId, locale, unavailable, ...maybeAccuracy] = value.split(':');
            const accuracy = maybeAccuracy.length ? Number(maybeAccuracy[0]) : Location.DEFAULT_ACCURACY;
            const [latitude, longitude] = position.split('@');
            return new Location(parseFloat(latitude), parseFloat(longitude), timezoneId, locale, accuracy, Boolean(unavailable));
        }
        return new Location(0, 0, '', '', Location.DEFAULT_ACCURACY, false);
    }
    static parseUserInput(latitudeString, longitudeString, timezoneId, locale, accuracyString) {
        if (!latitudeString && !longitudeString && !accuracyString) {
            return null;
        }
        const isLatitudeValid = Location.latitudeValidator(latitudeString);
        const isLongitudeValid = Location.longitudeValidator(longitudeString);
        const { valid: isAccuracyValid } = Location.accuracyValidator(accuracyString);
        if (!isLatitudeValid && !isLongitudeValid && !isAccuracyValid) {
            return null;
        }
        const latitude = isLatitudeValid ? parseFloat(latitudeString) : -1;
        const longitude = isLongitudeValid ? parseFloat(longitudeString) : -1;
        const accuracy = isAccuracyValid ? parseFloat(accuracyString) : Location.DEFAULT_ACCURACY;
        return new Location(latitude, longitude, timezoneId, locale, accuracy, false);
    }
    static latitudeValidator(value) {
        const numValue = parseFloat(value);
        return /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -90 && numValue <= 90;
    }
    static longitudeValidator(value) {
        const numValue = parseFloat(value);
        return /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= -180 && numValue <= 180;
    }
    static timezoneIdValidator(value) {
        // Chromium uses ICU's timezone implementation, which is very
        // liberal in what it accepts. ICU does not simply use an allowlist
        // but instead tries to make sense of the input, even for
        // weird-looking timezone IDs. There's not much point in validating
        // the input other than checking if it contains at least one alphabet.
        // The empty string resets the override, and is accepted as well.
        return value === '' || /[a-zA-Z]/.test(value);
    }
    static localeValidator(value) {
        // Similarly to timezone IDs, there's not much point in validating
        // input locales other than checking if it contains at least two
        // alphabetic characters.
        // https://unicode.org/reports/tr35/#Unicode_language_identifier
        // The empty string resets the override, and is accepted as
        // well.
        return value === '' || /[a-zA-Z]{2}/.test(value);
    }
    static accuracyValidator(value) {
        if (!value) {
            return { valid: true, errorMessage: undefined };
        }
        const numValue = parseFloat(value);
        const valid = /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= 0;
        return { valid, errorMessage: undefined };
    }
    toSetting() {
        return `${this.latitude}@${this.longitude}:${this.timezoneId}:${this.locale}:${this.unavailable || ''}:${this.accuracy || ''}`;
    }
}
export class DeviceOrientation {
    alpha;
    beta;
    gamma;
    constructor(alpha, beta, gamma) {
        this.alpha = alpha;
        this.beta = beta;
        this.gamma = gamma;
    }
    static parseSetting(value) {
        if (value) {
            const jsonObject = JSON.parse(value);
            return new DeviceOrientation(jsonObject.alpha, jsonObject.beta, jsonObject.gamma);
        }
        return new DeviceOrientation(0, 0, 0);
    }
    static parseUserInput(alphaString, betaString, gammaString) {
        if (!alphaString && !betaString && !gammaString) {
            return null;
        }
        const isAlphaValid = DeviceOrientation.alphaAngleValidator(alphaString);
        const isBetaValid = DeviceOrientation.betaAngleValidator(betaString);
        const isGammaValid = DeviceOrientation.gammaAngleValidator(gammaString);
        if (!isAlphaValid && !isBetaValid && !isGammaValid) {
            return null;
        }
        const alpha = isAlphaValid ? parseFloat(alphaString) : -1;
        const beta = isBetaValid ? parseFloat(betaString) : -1;
        const gamma = isGammaValid ? parseFloat(gammaString) : -1;
        return new DeviceOrientation(alpha, beta, gamma);
    }
    static angleRangeValidator(value, interval) {
        const numValue = parseFloat(value);
        return /^([+-]?[\d]+(\.\d+)?|[+-]?\.\d+)$/.test(value) && numValue >= interval.minimum &&
            numValue < interval.maximum;
    }
    static alphaAngleValidator(value) {
        // https://w3c.github.io/deviceorientation/#device-orientation-model
        // Alpha must be within the [0, 360) interval.
        return DeviceOrientation.angleRangeValidator(value, { minimum: 0, maximum: 360 });
    }
    static betaAngleValidator(value) {
        // https://w3c.github.io/deviceorientation/#device-orientation-model
        // Beta must be within the [-180, 180) interval.
        return DeviceOrientation.angleRangeValidator(value, { minimum: -180, maximum: 180 });
    }
    static gammaAngleValidator(value) {
        // https://w3c.github.io/deviceorientation/#device-orientation-model
        // Gamma must be within the [-90, 90) interval.
        return DeviceOrientation.angleRangeValidator(value, { minimum: -90, maximum: 90 });
    }
    toSetting() {
        return JSON.stringify(this);
    }
}
SDKModel.register(EmulationModel, { capabilities: 256 /* Capability.EMULATION */, autostart: true });
//# sourceMappingURL=EmulationModel.js.map