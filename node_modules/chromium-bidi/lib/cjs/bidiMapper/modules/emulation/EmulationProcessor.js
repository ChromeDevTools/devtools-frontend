"use strict";
/**
 * Copyright 2025 Google LLC.
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmulationProcessor = void 0;
exports.isValidLocale = isValidLocale;
exports.isValidTimezone = isValidTimezone;
exports.isTimeZoneOffsetString = isTimeZoneOffsetString;
const ErrorResponse_js_1 = require("../../../protocol/ErrorResponse.js");
class EmulationProcessor {
    #userContextStorage;
    #browsingContextStorage;
    #contextConfigStorage;
    constructor(browsingContextStorage, userContextStorage, contextConfigStorage) {
        this.#userContextStorage = userContextStorage;
        this.#browsingContextStorage = browsingContextStorage;
        this.#contextConfigStorage = contextConfigStorage;
    }
    async setGeolocationOverride(params) {
        if ('coordinates' in params && 'error' in params) {
            // Unreachable. Handled by params parser.
            throw new ErrorResponse_js_1.InvalidArgumentException('Coordinates and error cannot be set at the same time');
        }
        let geolocation = null;
        if ('coordinates' in params) {
            if ((params.coordinates?.altitude ?? null) === null &&
                (params.coordinates?.altitudeAccuracy ?? null) !== null) {
                throw new ErrorResponse_js_1.InvalidArgumentException('Geolocation altitudeAccuracy can be set only with altitude');
            }
            geolocation = params.coordinates;
        }
        else if ('error' in params) {
            if (params.error.type !== 'positionUnavailable') {
                // Unreachable. Handled by params parser.
                throw new ErrorResponse_js_1.InvalidArgumentException(`Unknown geolocation error ${params.error.type}`);
            }
            geolocation = params.error;
        }
        else {
            // Unreachable. Handled by params parser.
            throw new ErrorResponse_js_1.InvalidArgumentException(`Coordinates or error should be set`);
        }
        const browsingContexts = await this.#getRelatedTopLevelBrowsingContexts(params.contexts, params.userContexts);
        for (const browsingContextId of params.contexts ?? []) {
            this.#contextConfigStorage.updateBrowsingContextConfig(browsingContextId, {
                geolocation,
            });
        }
        for (const userContextId of params.userContexts ?? []) {
            this.#contextConfigStorage.updateUserContextConfig(userContextId, {
                geolocation,
            });
        }
        await Promise.all(browsingContexts.map(async (context) => await context.setGeolocationOverride(geolocation)));
        return {};
    }
    async setLocaleOverride(params) {
        const locale = params.locale ?? null;
        if (locale !== null && !isValidLocale(locale)) {
            throw new ErrorResponse_js_1.InvalidArgumentException(`Invalid locale "${locale}"`);
        }
        const browsingContexts = await this.#getRelatedTopLevelBrowsingContexts(params.contexts, params.userContexts);
        for (const browsingContextId of params.contexts ?? []) {
            this.#contextConfigStorage.updateBrowsingContextConfig(browsingContextId, {
                locale,
            });
        }
        for (const userContextId of params.userContexts ?? []) {
            this.#contextConfigStorage.updateUserContextConfig(userContextId, {
                locale,
            });
        }
        await Promise.all(browsingContexts.map(async (context) => await context.setLocaleOverride(locale)));
        return {};
    }
    async setScriptingEnabled(params) {
        const scriptingEnabled = params.enabled;
        const browsingContexts = await this.#getRelatedTopLevelBrowsingContexts(params.contexts, params.userContexts);
        for (const browsingContextId of params.contexts ?? []) {
            this.#contextConfigStorage.updateBrowsingContextConfig(browsingContextId, {
                scriptingEnabled,
            });
        }
        for (const userContextId of params.userContexts ?? []) {
            this.#contextConfigStorage.updateUserContextConfig(userContextId, {
                scriptingEnabled,
            });
        }
        await Promise.all(browsingContexts.map(async (context) => await context.setScriptingEnabled(scriptingEnabled)));
        return {};
    }
    async setScreenOrientationOverride(params) {
        const browsingContexts = await this.#getRelatedTopLevelBrowsingContexts(params.contexts, params.userContexts);
        for (const browsingContextId of params.contexts ?? []) {
            this.#contextConfigStorage.updateBrowsingContextConfig(browsingContextId, {
                screenOrientation: params.screenOrientation,
            });
        }
        for (const userContextId of params.userContexts ?? []) {
            this.#contextConfigStorage.updateUserContextConfig(userContextId, {
                screenOrientation: params.screenOrientation,
            });
        }
        await Promise.all(browsingContexts.map(async (context) => await context.setScreenOrientationOverride(params.screenOrientation)));
        return {};
    }
    /**
     * Returns a list of top-level browsing contexts.
     */
    async #getRelatedTopLevelBrowsingContexts(browsingContextIds, userContextIds, allowGlobal = false) {
        if (browsingContextIds === undefined && userContextIds === undefined) {
            if (allowGlobal) {
                return this.#browsingContextStorage.getTopLevelContexts();
            }
            throw new ErrorResponse_js_1.InvalidArgumentException('Either user contexts or browsing contexts must be provided');
        }
        if (browsingContextIds !== undefined && userContextIds !== undefined) {
            throw new ErrorResponse_js_1.InvalidArgumentException('User contexts and browsing contexts are mutually exclusive');
        }
        const result = [];
        if (browsingContextIds === undefined) {
            // userContextIds !== undefined
            if (userContextIds.length === 0) {
                throw new ErrorResponse_js_1.InvalidArgumentException('user context should be provided');
            }
            // Verify that all user contexts exist.
            await this.#userContextStorage.verifyUserContextIdList(userContextIds);
            for (const userContextId of userContextIds) {
                const topLevelBrowsingContexts = this.#browsingContextStorage
                    .getTopLevelContexts()
                    .filter((browsingContext) => browsingContext.userContext === userContextId);
                result.push(...topLevelBrowsingContexts);
            }
        }
        else {
            if (browsingContextIds.length === 0) {
                throw new ErrorResponse_js_1.InvalidArgumentException('browsing context should be provided');
            }
            for (const browsingContextId of browsingContextIds) {
                const browsingContext = this.#browsingContextStorage.getContext(browsingContextId);
                if (!browsingContext.isTopLevelContext()) {
                    throw new ErrorResponse_js_1.InvalidArgumentException('The command is only supported on the top-level context');
                }
                result.push(browsingContext);
            }
        }
        // Remove duplicates. Compare `BrowsingContextImpl` by reference is correct here, as
        // `browsingContextStorage` returns the same instance for the same id.
        return [...new Set(result).values()];
    }
    async setTimezoneOverride(params) {
        let timezone = params.timezone ?? null;
        if (timezone !== null && !isValidTimezone(timezone)) {
            throw new ErrorResponse_js_1.InvalidArgumentException(`Invalid timezone "${timezone}"`);
        }
        if (timezone !== null && isTimeZoneOffsetString(timezone)) {
            // CDP supports offset timezone with `GMT` prefix.
            timezone = `GMT${timezone}`;
        }
        const browsingContexts = await this.#getRelatedTopLevelBrowsingContexts(params.contexts, params.userContexts);
        for (const browsingContextId of params.contexts ?? []) {
            this.#contextConfigStorage.updateBrowsingContextConfig(browsingContextId, {
                timezone,
            });
        }
        for (const userContextId of params.userContexts ?? []) {
            this.#contextConfigStorage.updateUserContextConfig(userContextId, {
                timezone,
            });
        }
        await Promise.all(browsingContexts.map(async (context) => await context.setTimezoneOverride(timezone)));
        return {};
    }
    async setUserAgentOverrideParams(params) {
        if (params.userAgent === '') {
            throw new ErrorResponse_js_1.UnsupportedOperationException('empty user agent string is not supported');
        }
        const browsingContexts = await this.#getRelatedTopLevelBrowsingContexts(params.contexts, params.userContexts, true);
        for (const browsingContextId of params.contexts ?? []) {
            this.#contextConfigStorage.updateBrowsingContextConfig(browsingContextId, {
                userAgent: params.userAgent,
            });
        }
        for (const userContextId of params.userContexts ?? []) {
            this.#contextConfigStorage.updateUserContextConfig(userContextId, {
                userAgent: params.userAgent,
            });
        }
        if (params.contexts === undefined && params.userContexts === undefined) {
            this.#contextConfigStorage.updateGlobalConfig({
                userAgent: params.userAgent,
            });
        }
        await Promise.all(browsingContexts.map(async (context) => await context.setUserAgentOverrideParams(params.userAgent)));
        return {};
    }
}
exports.EmulationProcessor = EmulationProcessor;
// Export for testing.
function isValidLocale(locale) {
    try {
        new Intl.Locale(locale);
        return true;
    }
    catch (e) {
        if (e instanceof RangeError) {
            return false;
        }
        // Re-throw other errors
        throw e;
    }
}
// Export for testing.
function isValidTimezone(timezone) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    }
    catch (e) {
        if (e instanceof RangeError) {
            return false;
        }
        // Re-throw other errors
        throw e;
    }
}
// Export for testing.
function isTimeZoneOffsetString(timezone) {
    return /^[+-](?:2[0-3]|[01]\d)(?::[0-5]\d)?$/.test(timezone);
}
//# sourceMappingURL=EmulationProcessor.js.map