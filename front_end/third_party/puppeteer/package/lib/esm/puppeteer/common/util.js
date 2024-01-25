/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { filterAsync, firstValueFrom, from, map, NEVER, Observable, raceWith, timer, } from '../../third_party/rxjs/rxjs.js';
import { isNode } from '../environment.js';
import { assert } from '../util/assert.js';
import { isErrorLike } from '../util/ErrorLike.js';
import { debug } from './Debug.js';
import { TimeoutError } from './Errors.js';
import { paperFormats } from './PDFOptions.js';
/**
 * @internal
 */
export const debugError = debug('puppeteer:error');
/**
 * @internal
 */
export const DEFAULT_VIEWPORT = Object.freeze({ width: 800, height: 600 });
/**
 * @internal
 */
const SOURCE_URL = Symbol('Source URL for Puppeteer evaluation scripts');
/**
 * @internal
 */
export class PuppeteerURL {
    static INTERNAL_URL = 'pptr:internal';
    static fromCallSite(functionName, site) {
        const url = new PuppeteerURL();
        url.#functionName = functionName;
        url.#siteString = site.toString();
        return url;
    }
    static parse = (url) => {
        url = url.slice('pptr:'.length);
        const [functionName = '', siteString = ''] = url.split(';');
        const puppeteerUrl = new PuppeteerURL();
        puppeteerUrl.#functionName = functionName;
        puppeteerUrl.#siteString = decodeURIComponent(siteString);
        return puppeteerUrl;
    };
    static isPuppeteerURL = (url) => {
        return url.startsWith('pptr:');
    };
    #functionName;
    #siteString;
    get functionName() {
        return this.#functionName;
    }
    get siteString() {
        return this.#siteString;
    }
    toString() {
        return `pptr:${[
            this.#functionName,
            encodeURIComponent(this.#siteString),
        ].join(';')}`;
    }
}
/**
 * @internal
 */
export const withSourcePuppeteerURLIfNone = (functionName, object) => {
    if (Object.prototype.hasOwnProperty.call(object, SOURCE_URL)) {
        return object;
    }
    const original = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => {
        // First element is the function.
        // Second element is the caller of this function.
        // Third element is the caller of the caller of this function
        // which is precisely what we want.
        return stack[2];
    };
    const site = new Error().stack;
    Error.prepareStackTrace = original;
    return Object.assign(object, {
        [SOURCE_URL]: PuppeteerURL.fromCallSite(functionName, site),
    });
};
/**
 * @internal
 */
export const getSourcePuppeteerURLIfAvailable = (object) => {
    if (Object.prototype.hasOwnProperty.call(object, SOURCE_URL)) {
        return object[SOURCE_URL];
    }
    return undefined;
};
/**
 * @internal
 */
export const isString = (obj) => {
    return typeof obj === 'string' || obj instanceof String;
};
/**
 * @internal
 */
export const isNumber = (obj) => {
    return typeof obj === 'number' || obj instanceof Number;
};
/**
 * @internal
 */
export const isPlainObject = (obj) => {
    return typeof obj === 'object' && obj?.constructor === Object;
};
/**
 * @internal
 */
export const isRegExp = (obj) => {
    return typeof obj === 'object' && obj?.constructor === RegExp;
};
/**
 * @internal
 */
export const isDate = (obj) => {
    return typeof obj === 'object' && obj?.constructor === Date;
};
/**
 * @internal
 */
export function evaluationString(fun, ...args) {
    if (isString(fun)) {
        assert(args.length === 0, 'Cannot evaluate a string with arguments');
        return fun;
    }
    function serializeArgument(arg) {
        if (Object.is(arg, undefined)) {
            return 'undefined';
        }
        return JSON.stringify(arg);
    }
    return `(${fun})(${args.map(serializeArgument).join(',')})`;
}
/**
 * @internal
 */
let fs = null;
/**
 * @internal
 */
export async function importFSPromises() {
    if (!fs) {
        try {
            fs = await import('fs/promises');
        }
        catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Cannot write to a path outside of a Node-like environment.');
            }
            throw error;
        }
    }
    return fs;
}
/**
 * @internal
 */
export async function getReadableAsBuffer(readable, path) {
    const buffers = [];
    if (path) {
        const fs = await importFSPromises();
        const fileHandle = await fs.open(path, 'w+');
        try {
            for await (const chunk of readable) {
                buffers.push(chunk);
                await fileHandle.writeFile(chunk);
            }
        }
        finally {
            await fileHandle.close();
        }
    }
    else {
        for await (const chunk of readable) {
            buffers.push(chunk);
        }
    }
    try {
        return Buffer.concat(buffers);
    }
    catch (error) {
        return null;
    }
}
/**
 * @internal
 */
export async function getReadableFromProtocolStream(client, handle) {
    // TODO: Once Node 18 becomes the lowest supported version, we can migrate to
    // ReadableStream.
    if (!isNode) {
        throw new Error('Cannot create a stream outside of Node.js environment.');
    }
    const { Readable } = await import('stream');
    let eof = false;
    return new Readable({
        async read(size) {
            if (eof) {
                return;
            }
            try {
                const response = await client.send('IO.read', { handle, size });
                this.push(response.data, response.base64Encoded ? 'base64' : undefined);
                if (response.eof) {
                    eof = true;
                    await client.send('IO.close', { handle });
                    this.push(null);
                }
            }
            catch (error) {
                if (isErrorLike(error)) {
                    this.destroy(error);
                    return;
                }
                throw error;
            }
        },
    });
}
/**
 * @internal
 */
export function validateDialogType(type) {
    let dialogType = null;
    const validDialogTypes = new Set([
        'alert',
        'confirm',
        'prompt',
        'beforeunload',
    ]);
    if (validDialogTypes.has(type)) {
        dialogType = type;
    }
    assert(dialogType, `Unknown javascript dialog type: ${type}`);
    return dialogType;
}
/**
 * @internal
 */
export function timeout(ms) {
    return ms === 0
        ? NEVER
        : timer(ms).pipe(map(() => {
            throw new TimeoutError(`Timed out after waiting ${ms}ms`);
        }));
}
/**
 * @internal
 */
export const UTILITY_WORLD_NAME = '__puppeteer_utility_world__';
/**
 * @internal
 */
export const SOURCE_URL_REGEX = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;
/**
 * @internal
 */
export function getSourceUrlComment(url) {
    return `//# sourceURL=${url}`;
}
/**
 * @internal
 */
export async function waitForHTTP(networkManager, eventName, urlOrPredicate, 
/** Time after the function will timeout */
ms, cancelation) {
    return await firstValueFrom(fromEmitterEvent(networkManager, eventName).pipe(filterAsync(async (http) => {
        if (isString(urlOrPredicate)) {
            return urlOrPredicate === http.url();
        }
        if (typeof urlOrPredicate === 'function') {
            return !!(await urlOrPredicate(http));
        }
        return false;
    }), raceWith(timeout(ms), from(cancelation.valueOrThrow()))));
}
/**
 * @internal
 */
export const NETWORK_IDLE_TIME = 500;
/**
 * @internal
 */
export function parsePDFOptions(options = {}, lengthUnit = 'in') {
    const defaults = {
        scale: 1,
        displayHeaderFooter: false,
        headerTemplate: '',
        footerTemplate: '',
        printBackground: false,
        landscape: false,
        pageRanges: '',
        preferCSSPageSize: false,
        omitBackground: false,
        tagged: false,
    };
    let width = 8.5;
    let height = 11;
    if (options.format) {
        const format = paperFormats[options.format.toLowerCase()];
        assert(format, 'Unknown paper format: ' + options.format);
        width = format.width;
        height = format.height;
    }
    else {
        width = convertPrintParameterToInches(options.width, lengthUnit) ?? width;
        height =
            convertPrintParameterToInches(options.height, lengthUnit) ?? height;
    }
    const margin = {
        top: convertPrintParameterToInches(options.margin?.top, lengthUnit) || 0,
        left: convertPrintParameterToInches(options.margin?.left, lengthUnit) || 0,
        bottom: convertPrintParameterToInches(options.margin?.bottom, lengthUnit) || 0,
        right: convertPrintParameterToInches(options.margin?.right, lengthUnit) || 0,
    };
    return {
        ...defaults,
        ...options,
        width,
        height,
        margin,
    };
}
/**
 * @internal
 */
export const unitToPixels = {
    px: 1,
    in: 96,
    cm: 37.8,
    mm: 3.78,
};
function convertPrintParameterToInches(parameter, lengthUnit = 'in') {
    if (typeof parameter === 'undefined') {
        return undefined;
    }
    let pixels;
    if (isNumber(parameter)) {
        // Treat numbers as pixel values to be aligned with phantom's paperSize.
        pixels = parameter;
    }
    else if (isString(parameter)) {
        const text = parameter;
        let unit = text.substring(text.length - 2).toLowerCase();
        let valueText = '';
        if (unit in unitToPixels) {
            valueText = text.substring(0, text.length - 2);
        }
        else {
            // In case of unknown unit try to parse the whole parameter as number of pixels.
            // This is consistent with phantom's paperSize behavior.
            unit = 'px';
            valueText = text;
        }
        const value = Number(valueText);
        assert(!isNaN(value), 'Failed to parse parameter value: ' + text);
        pixels = value * unitToPixels[unit];
    }
    else {
        throw new Error('page.pdf() Cannot handle parameter type: ' + typeof parameter);
    }
    return pixels / unitToPixels[lengthUnit];
}
/**
 * @internal
 */
export function fromEmitterEvent(emitter, eventName) {
    return new Observable(subscriber => {
        const listener = (event) => {
            subscriber.next(event);
        };
        emitter.on(eventName, listener);
        return () => {
            emitter.off(eventName, listener);
        };
    });
}
//# sourceMappingURL=util.js.map