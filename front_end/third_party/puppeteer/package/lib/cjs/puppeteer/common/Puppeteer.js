"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Puppeteer = void 0;
const BrowserConnector_js_1 = require("./BrowserConnector.js");
const DeviceDescriptors_js_1 = require("./DeviceDescriptors.js");
const Errors_js_1 = require("./Errors.js");
const NetworkConditions_js_1 = require("./NetworkConditions.js");
const QueryHandler_js_1 = require("./QueryHandler.js");
/**
 * The main Puppeteer class.
 *
 * IMPORTANT: if you are using Puppeteer in a Node environment, you will get an
 * instance of {@link PuppeteerNode} when you import or require `puppeteer`.
 * That class extends `Puppeteer`, so has all the methods documented below as
 * well as all that are defined on {@link PuppeteerNode}.
 * @public
 */
class Puppeteer {
    /**
     * @internal
     */
    constructor(settings) {
        /**
         * @internal
         */
        this._changedProduct = false;
        this._isPuppeteerCore = settings.isPuppeteerCore;
        this.connect = this.connect.bind(this);
    }
    /**
     * This method attaches Puppeteer to an existing browser instance.
     *
     * @remarks
     *
     * @param options - Set of configurable options to set on the browser.
     * @returns Promise which resolves to browser instance.
     */
    connect(options) {
        return (0, BrowserConnector_js_1._connectToCDPBrowser)(options);
    }
    /**
     * @deprecated Import directly puppeteer.
     * @example
     *
     * ```ts
     * import {devices} from 'puppeteer';
     * ```
     */
    get devices() {
        return DeviceDescriptors_js_1.devices;
    }
    /**
     * @deprecated Import directly puppeteer.
     * @example
     *
     * ```ts
     * import {errors} from 'puppeteer';
     * ```
     */
    get errors() {
        return Errors_js_1.errors;
    }
    /**
     * @deprecated Import directly puppeteer.
     * @example
     *
     * ```ts
     * import {networkConditions} from 'puppeteer';
     * ```
     */
    get networkConditions() {
        return NetworkConditions_js_1.networkConditions;
    }
    /**
     * @deprecated Import directly puppeteer.
     * @example
     *
     * ```ts
     * import {registerCustomQueryHandler} from 'puppeteer';
     * ```
     */
    registerCustomQueryHandler(name, queryHandler) {
        return (0, QueryHandler_js_1.registerCustomQueryHandler)(name, queryHandler);
    }
    /**
     * @deprecated Import directly puppeteer.
     * @example
     *
     * ```ts
     * import {unregisterCustomQueryHandler} from 'puppeteer';
     * ```
     */
    unregisterCustomQueryHandler(name) {
        return (0, QueryHandler_js_1.unregisterCustomQueryHandler)(name);
    }
    /**
     * @deprecated Import directly puppeteer.
     * @example
     *
     * ```ts
     * import {customQueryHandlerNames} from 'puppeteer';
     * ```
     */
    customQueryHandlerNames() {
        return (0, QueryHandler_js_1.customQueryHandlerNames)();
    }
    /**
     * @deprecated Import directly puppeteer.
     * @example
     *
     * ```ts
     * import {clearCustomQueryHandlers} from 'puppeteer';
     * ```
     */
    clearCustomQueryHandlers() {
        return (0, QueryHandler_js_1.clearCustomQueryHandlers)();
    }
}
exports.Puppeteer = Puppeteer;
//# sourceMappingURL=Puppeteer.js.map