"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contains = contains;
exports.parseCaniuseData = parseCaniuseData;
exports.cleanBrowsersList = cleanBrowsersList;
const browserslist_1 = __importDefault(require("browserslist"));
function contains(str, substr) {
    return str.indexOf(substr) !== -1;
}
function parseCaniuseData(feature, browsers) {
    const support = {};
    browsers.forEach((browser) => {
        support[browser] = {};
        const stats = feature.stats[browser];
        for (const version in stats) {
            const letters = stats[version].replace(/#\d+/, "").trim().split(" ");
            const info = parseFloat(version.split("-")[0]); // if it's a range, take the left bound
            if (isNaN(info))
                continue;
            for (const letter of letters) {
                if (letter === "d")
                    continue; // skip: we don't support this letter yet
                const current = support[browser][letter];
                // `y` => keep the minimum supported version; anything else => keep the maximum
                const better = letter === "y" ? info < current : info > current;
                if (current === undefined || better) {
                    support[browser][letter] = info;
                }
            }
        }
    });
    return support;
}
function cleanBrowsersList(browserList) {
    return [
        ...new Set((0, browserslist_1.default)(browserList).map((browser) => browser.split(" ")[0])),
    ];
}
