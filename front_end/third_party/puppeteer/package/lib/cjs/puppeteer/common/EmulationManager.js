"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EmulationManager_client, _EmulationManager_emulatingMobile, _EmulationManager_hasTouch, _EmulationManager_javascriptEnabled;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmulationManager = void 0;
const assert_js_1 = require("../util/assert.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
/**
 * @internal
 */
class EmulationManager {
    constructor(client) {
        _EmulationManager_client.set(this, void 0);
        _EmulationManager_emulatingMobile.set(this, false);
        _EmulationManager_hasTouch.set(this, false);
        _EmulationManager_javascriptEnabled.set(this, true);
        __classPrivateFieldSet(this, _EmulationManager_client, client, "f");
    }
    get javascriptEnabled() {
        return __classPrivateFieldGet(this, _EmulationManager_javascriptEnabled, "f");
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
            __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setDeviceMetricsOverride', {
                mobile,
                width,
                height,
                deviceScaleFactor,
                screenOrientation,
            }),
            __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setTouchEmulationEnabled', {
                enabled: hasTouch,
            }),
        ]);
        const reloadNeeded = __classPrivateFieldGet(this, _EmulationManager_emulatingMobile, "f") !== mobile || __classPrivateFieldGet(this, _EmulationManager_hasTouch, "f") !== hasTouch;
        __classPrivateFieldSet(this, _EmulationManager_emulatingMobile, mobile, "f");
        __classPrivateFieldSet(this, _EmulationManager_hasTouch, hasTouch, "f");
        return reloadNeeded;
    }
    async emulateIdleState(overrides) {
        if (overrides) {
            await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setIdleOverride', {
                isUserActive: overrides.isUserActive,
                isScreenUnlocked: overrides.isScreenUnlocked,
            });
        }
        else {
            await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.clearIdleOverride');
        }
    }
    async emulateTimezone(timezoneId) {
        try {
            await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setTimezoneOverride', {
                timezoneId: timezoneId || '',
            });
        }
        catch (error) {
            if ((0, ErrorLike_js_1.isErrorLike)(error) && error.message.includes('Invalid timezone')) {
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
            (0, assert_js_1.assert)(!type || visionDeficiencies.has(type), `Unsupported vision deficiency: ${type}`);
            await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setEmulatedVisionDeficiency', {
                type: type || 'none',
            });
        }
        catch (error) {
            throw error;
        }
    }
    async emulateCPUThrottling(factor) {
        (0, assert_js_1.assert)(factor === null || factor >= 1, 'Throttling rate should be greater or equal to 1');
        await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setCPUThrottlingRate', {
            rate: factor ?? 1,
        });
    }
    async emulateMediaFeatures(features) {
        if (!features) {
            await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setEmulatedMedia', {});
        }
        if (Array.isArray(features)) {
            for (const mediaFeature of features) {
                const name = mediaFeature.name;
                (0, assert_js_1.assert)(/^(?:prefers-(?:color-scheme|reduced-motion)|color-gamut)$/.test(name), 'Unsupported media feature: ' + name);
            }
            await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setEmulatedMedia', {
                features: features,
            });
        }
    }
    async emulateMediaType(type) {
        (0, assert_js_1.assert)(type === 'screen' ||
            type === 'print' ||
            (type ?? undefined) === undefined, 'Unsupported media type: ' + type);
        await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setEmulatedMedia', {
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
        await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setGeolocationOverride', {
            longitude,
            latitude,
            accuracy,
        });
    }
    /**
     * Resets default white background
     */
    async resetDefaultBackgroundColor() {
        await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setDefaultBackgroundColorOverride');
    }
    /**
     * Hides default white background
     */
    async setTransparentBackgroundColor() {
        await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setDefaultBackgroundColorOverride', {
            color: { r: 0, g: 0, b: 0, a: 0 },
        });
    }
    async setJavaScriptEnabled(enabled) {
        if (__classPrivateFieldGet(this, _EmulationManager_javascriptEnabled, "f") === enabled) {
            return;
        }
        __classPrivateFieldSet(this, _EmulationManager_javascriptEnabled, enabled, "f");
        await __classPrivateFieldGet(this, _EmulationManager_client, "f").send('Emulation.setScriptExecutionDisabled', {
            value: !enabled,
        });
    }
}
exports.EmulationManager = EmulationManager;
_EmulationManager_client = new WeakMap(), _EmulationManager_emulatingMobile = new WeakMap(), _EmulationManager_hasTouch = new WeakMap(), _EmulationManager_javascriptEnabled = new WeakMap();
//# sourceMappingURL=EmulationManager.js.map