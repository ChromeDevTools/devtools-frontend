"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iterableFirst = exports.iterableDefined = exports.iterableUnique = exports.iterableFind = exports.iterableFilter = exports.iterableMap = exports.iterableFlatten = void 0;
function iterableFlatten() {
    var _i, iterables_1, iterables_1_1, iterable, iterable_1, iterable_1_1, item, e_1_1, e_2_1;
    var e_2, _a, e_1, _b;
    var iterables = [];
    for (_i = 0; _i < arguments.length; _i++) {
        iterables[_i] = arguments[_i];
    }
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 11, 12, 13]);
                iterables_1 = __values(iterables), iterables_1_1 = iterables_1.next();
                _c.label = 1;
            case 1:
                if (!!iterables_1_1.done) return [3 /*break*/, 10];
                iterable = iterables_1_1.value;
                _c.label = 2;
            case 2:
                _c.trys.push([2, 7, 8, 9]);
                iterable_1 = (e_1 = void 0, __values(iterable)), iterable_1_1 = iterable_1.next();
                _c.label = 3;
            case 3:
                if (!!iterable_1_1.done) return [3 /*break*/, 6];
                item = iterable_1_1.value;
                return [4 /*yield*/, item];
            case 4:
                _c.sent();
                _c.label = 5;
            case 5:
                iterable_1_1 = iterable_1.next();
                return [3 /*break*/, 3];
            case 6: return [3 /*break*/, 9];
            case 7:
                e_1_1 = _c.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 9];
            case 8:
                try {
                    if (iterable_1_1 && !iterable_1_1.done && (_b = iterable_1.return)) _b.call(iterable_1);
                }
                finally { if (e_1) throw e_1.error; }
                return [7 /*endfinally*/];
            case 9:
                iterables_1_1 = iterables_1.next();
                return [3 /*break*/, 1];
            case 10: return [3 /*break*/, 13];
            case 11:
                e_2_1 = _c.sent();
                e_2 = { error: e_2_1 };
                return [3 /*break*/, 13];
            case 12:
                try {
                    if (iterables_1_1 && !iterables_1_1.done && (_a = iterables_1.return)) _a.call(iterables_1);
                }
                finally { if (e_2) throw e_2.error; }
                return [7 /*endfinally*/];
            case 13: return [2 /*return*/];
        }
    });
}
exports.iterableFlatten = iterableFlatten;
function iterableMap(iterable, map) {
    var iterable_2, iterable_2_1, item, e_3_1;
    var e_3, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 5, 6, 7]);
                iterable_2 = __values(iterable), iterable_2_1 = iterable_2.next();
                _b.label = 1;
            case 1:
                if (!!iterable_2_1.done) return [3 /*break*/, 4];
                item = iterable_2_1.value;
                return [4 /*yield*/, map(item)];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                iterable_2_1 = iterable_2.next();
                return [3 /*break*/, 1];
            case 4: return [3 /*break*/, 7];
            case 5:
                e_3_1 = _b.sent();
                e_3 = { error: e_3_1 };
                return [3 /*break*/, 7];
            case 6:
                try {
                    if (iterable_2_1 && !iterable_2_1.done && (_a = iterable_2.return)) _a.call(iterable_2);
                }
                finally { if (e_3) throw e_3.error; }
                return [7 /*endfinally*/];
            case 7: return [2 /*return*/];
        }
    });
}
exports.iterableMap = iterableMap;
function iterableFilter(iterable, filter) {
    var iterable_3, iterable_3_1, item, e_4_1;
    var e_4, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 5, 6, 7]);
                iterable_3 = __values(iterable), iterable_3_1 = iterable_3.next();
                _b.label = 1;
            case 1:
                if (!!iterable_3_1.done) return [3 /*break*/, 4];
                item = iterable_3_1.value;
                if (!filter(item)) return [3 /*break*/, 3];
                return [4 /*yield*/, item];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                iterable_3_1 = iterable_3.next();
                return [3 /*break*/, 1];
            case 4: return [3 /*break*/, 7];
            case 5:
                e_4_1 = _b.sent();
                e_4 = { error: e_4_1 };
                return [3 /*break*/, 7];
            case 6:
                try {
                    if (iterable_3_1 && !iterable_3_1.done && (_a = iterable_3.return)) _a.call(iterable_3);
                }
                finally { if (e_4) throw e_4.error; }
                return [7 /*endfinally*/];
            case 7: return [2 /*return*/];
        }
    });
}
exports.iterableFilter = iterableFilter;
function iterableFind(iterable, match) {
    var e_5, _a;
    try {
        for (var iterable_4 = __values(iterable), iterable_4_1 = iterable_4.next(); !iterable_4_1.done; iterable_4_1 = iterable_4.next()) {
            var item = iterable_4_1.value;
            if (match(item)) {
                return item;
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (iterable_4_1 && !iterable_4_1.done && (_a = iterable_4.return)) _a.call(iterable_4);
        }
        finally { if (e_5) throw e_5.error; }
    }
    return;
}
exports.iterableFind = iterableFind;
function iterableUnique(iterable, on) {
    var unique, iterable_5, iterable_5_1, item, u, e_6_1;
    var e_6, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                unique = new Set();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, 7, 8]);
                iterable_5 = __values(iterable), iterable_5_1 = iterable_5.next();
                _b.label = 2;
            case 2:
                if (!!iterable_5_1.done) return [3 /*break*/, 5];
                item = iterable_5_1.value;
                u = on(item);
                if (!!unique.has(u)) return [3 /*break*/, 4];
                unique.add(u);
                return [4 /*yield*/, item];
            case 3:
                _b.sent();
                _b.label = 4;
            case 4:
                iterable_5_1 = iterable_5.next();
                return [3 /*break*/, 2];
            case 5: return [3 /*break*/, 8];
            case 6:
                e_6_1 = _b.sent();
                e_6 = { error: e_6_1 };
                return [3 /*break*/, 8];
            case 7:
                try {
                    if (iterable_5_1 && !iterable_5_1.done && (_a = iterable_5.return)) _a.call(iterable_5);
                }
                finally { if (e_6) throw e_6.error; }
                return [7 /*endfinally*/];
            case 8: return [2 /*return*/];
        }
    });
}
exports.iterableUnique = iterableUnique;
function iterableDefined(iterable) {
    return iterable.filter(function (i) { return i != null; });
}
exports.iterableDefined = iterableDefined;
function iterableFirst(iterable) {
    if (iterable == null) {
        return iterable;
    }
    if (iterable instanceof Map || iterable instanceof Set) {
        return iterableFirst(iterable.values());
    }
    return iterable.next().value;
}
exports.iterableFirst = iterableFirst;
