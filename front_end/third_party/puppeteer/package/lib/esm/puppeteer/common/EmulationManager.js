import { assert } from '../util/assert.js';
import { isErrorLike } from '../util/ErrorLike.js';
/**
 * @internal
 */
export class EmulationManager {
    #client;
    #emulatingMobile = false;
    #hasTouch = false;
    #javascriptEnabled = true;
    constructor(client) {
        this.#client = client;
    }
    get javascriptEnabled() {
        return this.#javascriptEnabled;
    }
    async emulateViewport(viewport) {
        const mobile = viewport.isMobile || false;
        const width = viewport.width;
        const height = viewport.height;
        const deviceScaleFactor = viewport.deviceScaleFactor ?? 1;
        const screenOrientation = viewport.isLandscape
            ? { angle: 90, type: 'landscapePrimary' }
            : { angle: 0, type: 'portraitPrimary' };
        const hasTouch = viewport.hasTouch || false;
        await Promise.all([
            this.#client.send('Emulation.setDeviceMetricsOverride', {
                mobile,
                width,
                height,
                deviceScaleFactor,
                screenOrientation,
            }),
            this.#client.send('Emulation.setTouchEmulationEnabled', {
                enabled: hasTouch,
            }),
        ]);
        const reloadNeeded = this.#emulatingMobile !== mobile || this.#hasTouch !== hasTouch;
        this.#emulatingMobile = mobile;
        this.#hasTouch = hasTouch;
        return reloadNeeded;
    }
    async emulateIdleState(overrides) {
        if (overrides) {
            await this.#client.send('Emulation.setIdleOverride', {
                isUserActive: overrides.isUserActive,
                isScreenUnlocked: overrides.isScreenUnlocked,
            });
        }
        else {
            await this.#client.send('Emulation.clearIdleOverride');
        }
    }
    async emulateTimezone(timezoneId) {
        try {
            await this.#client.send('Emulation.setTimezoneOverride', {
                timezoneId: timezoneId || '',
            });
        }
        catch (error) {
            if (isErrorLike(error) && error.message.includes('Invalid timezone')) {
                throw new Error(`Invalid timezone ID: ${timezoneId}`);
            }
            throw error;
        }
    }
    async emulateVisionDeficiency(type) {
        const visionDeficiencies = new Set([
            'none',
            'achromatopsia',
            'blurredVision',
            'deuteranopia',
            'protanopia',
            'tritanopia',
        ]);
        try {
            assert(!type || visionDeficiencies.has(type), `Unsupported vision deficiency: ${type}`);
            await this.#client.send('Emulation.setEmulatedVisionDeficiency', {
                type: type || 'none',
            });
        }
        catch (error) {
            throw error;
        }
    }
    async emulateCPUThrottling(factor) {
        assert(factor === null || factor >= 1, 'Throttling rate should be greater or equal to 1');
        await this.#client.send('Emulation.setCPUThrottlingRate', {
            rate: factor ?? 1,
        });
    }
    async emulateMediaFeatures(features) {
        if (!features) {
            await this.#client.send('Emulation.setEmulatedMedia', {});
        }
        if (Array.isArray(features)) {
            for (const mediaFeature of features) {
                const name = mediaFeature.name;
                assert(/^(?:prefers-(?:color-scheme|reduced-motion)|color-gamut)$/.test(name), 'Unsupported media feature: ' + name);
            }
            await this.#client.send('Emulation.setEmulatedMedia', {
                features: features,
            });
        }
    }
    async emulateMediaType(type) {
        assert(type === 'screen' ||
            type === 'print' ||
            (type ?? undefined) === undefined, 'Unsupported media type: ' + type);
        await this.#client.send('Emulation.setEmulatedMedia', {
            media: type || '',
        });
    }
    async setGeolocation(options) {
        const { longitude, latitude, accuracy = 0 } = options;
        if (longitude < -180 || longitude > 180) {
            throw new Error(`Invalid longitude "${longitude}": precondition -180 <= LONGITUDE <= 180 failed.`);
        }
        if (latitude < -90 || latitude > 90) {
            throw new Error(`Invalid latitude "${latitude}": precondition -90 <= LATITUDE <= 90 failed.`);
        }
        if (accuracy < 0) {
            throw new Error(`Invalid accuracy "${accuracy}": precondition 0 <= ACCURACY failed.`);
        }
        await this.#client.send('Emulation.setGeolocationOverride', {
            longitude,
            latitude,
            accuracy,
        });
    }
    /**
     * Resets default white background
     */
    async resetDefaultBackgroundColor() {
        await this.#client.send('Emulation.setDefaultBackgroundColorOverride');
    }
    /**
     * Hides default white background
     */
    async setTransparentBackgroundColor() {
        await this.#client.send('Emulation.setDefaultBackgroundColorOverride', {
            color: { r: 0, g: 0, b: 0, a: 0 },
        });
    }
    async setJavaScriptEnabled(enabled) {
        if (this.#javascriptEnabled === enabled) {
            return;
        }
        this.#javascriptEnabled = enabled;
        await this.#client.send('Emulation.setScriptExecutionDisabled', {
            value: !enabled,
        });
    }
}
//# sourceMappingURL=EmulationManager.js.map