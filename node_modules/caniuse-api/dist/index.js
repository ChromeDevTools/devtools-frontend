"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.features = void 0;
exports.getSupport = getSupport;
exports.isSupported = isSupported;
exports.find = find;
exports.getLatestStableBrowsers = getLatestStableBrowsers;
exports.setBrowserScope = setBrowserScope;
exports.getBrowserScope = getBrowserScope;
const browserslist_1 = __importDefault(require("browserslist"));
const caniuse_lite_1 = require("caniuse-lite");
const utils_ts_1 = require("./utils.js");
const featuresList = Object.keys(caniuse_lite_1.features);
exports.features = featuresList;
let browsers;
function setBrowserScope(browserList) {
    browsers = (0, utils_ts_1.cleanBrowsersList)(browserList);
}
function getBrowserScope() {
    return browsers;
}
function memoize(fn, resolver) {
    const cache = new Map();
    return (...args) => {
        const key = resolver(...args);
        if (!cache.has(key)) {
            cache.set(key, fn(...args));
        }
        return cache.get(key);
    };
}
const parse = memoize(utils_ts_1.parseCaniuseData, (feature, scope) => feature.title + scope.join());
function getSupport(query) {
    let feature;
    try {
        feature = (0, caniuse_lite_1.feature)(caniuse_lite_1.features[query]);
    }
    catch {
        const res = find(query);
        if (Array.isArray(res) && res.length === 1)
            return getSupport(res[0]);
        throw new ReferenceError(`Please provide a proper feature name. Cannot find ${query}`);
    }
    return parse(feature, browsers);
}
function isSupported(feature, browsers) {
    let data;
    try {
        data = (0, caniuse_lite_1.feature)(caniuse_lite_1.features[feature]);
    }
    catch {
        const res = find(feature);
        if (Array.isArray(res) && res.length === 1) {
            data = (0, caniuse_lite_1.feature)(caniuse_lite_1.features[res[0]]);
        }
        else {
            throw new ReferenceError(`Please provide a proper feature name. Cannot find ${feature}`);
        }
    }
    const browserList = (0, browserslist_1.default)(browsers, { ignoreUnknownVersions: true });
    // No resolvable browser (e.g. an unknown version like `safari 12.0.2`) means we
    // cannot confirm support, so we report it as unsupported rather than returning a
    // vacuously-true `[].every(…)`. We deliberately do not throw here, matching the
    // "do not throw on non existing data" behaviour expected elsewhere.
    if (browserList.length === 0) {
        return false;
    }
    return browserList
        .map((browser) => browser.split(" "))
        .every((browser) => {
        const stat = data.stats[browser[0]] && data.stats[browser[0]][browser[1]];
        // caniuse marks full support as `y`, optionally followed by a note (`y #2`)
        // or a flag (`y x`), so we only check the leading support indicator.
        return Boolean(stat) && stat[0] === "y";
    });
}
function find(query) {
    if (typeof query !== "string") {
        throw new TypeError("The `query` parameter should be a string.");
    }
    if (featuresList.indexOf(query) !== -1) { // exact match
        return query;
    }
    return featuresList.filter((file) => (0, utils_ts_1.contains)(file, query));
}
function getLatestStableBrowsers() {
    return (0, browserslist_1.default)("last 1 version");
}
setBrowserScope();
