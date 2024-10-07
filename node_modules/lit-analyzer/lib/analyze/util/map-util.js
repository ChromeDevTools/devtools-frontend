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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayToMap = exports.mapMap = exports.mapMerge = void 0;
function mapMerge() {
    var maps = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        maps[_i] = arguments[_i];
    }
    return new Map((function () {
        var maps_1, maps_1_1, map, map_1, map_1_1, m, e_1_1, e_2_1;
        var e_2, _a, e_1, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 14, 15, 16]);
                    maps_1 = __values(maps), maps_1_1 = maps_1.next();
                    _c.label = 1;
                case 1:
                    if (!!maps_1_1.done) return [3 /*break*/, 13];
                    map = maps_1_1.value;
                    if (!Array.isArray(map)) return [3 /*break*/, 10];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 7, 8, 9]);
                    map_1 = (e_1 = void 0, __values(map)), map_1_1 = map_1.next();
                    _c.label = 3;
                case 3:
                    if (!!map_1_1.done) return [3 /*break*/, 6];
                    m = map_1_1.value;
                    return [5 /*yield**/, __values(m)];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    map_1_1 = map_1.next();
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_1_1 = _c.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 9];
                case 8:
                    try {
                        if (map_1_1 && !map_1_1.done && (_b = map_1.return)) _b.call(map_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 9: return [3 /*break*/, 12];
                case 10: return [5 /*yield**/, __values(map)];
                case 11:
                    _c.sent();
                    _c.label = 12;
                case 12:
                    maps_1_1 = maps_1.next();
                    return [3 /*break*/, 1];
                case 13: return [3 /*break*/, 16];
                case 14:
                    e_2_1 = _c.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 16];
                case 15:
                    try {
                        if (maps_1_1 && !maps_1_1.done && (_a = maps_1.return)) _a.call(maps_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 16: return [2 /*return*/];
            }
        });
    })());
}
exports.mapMerge = mapMerge;
function mapMap(map, callback) {
    return new Map((function () {
        var _a, _b, _c, key, val, e_3_1;
        var e_3, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 5, 6, 7]);
                    _a = __values(map.entries()), _b = _a.next();
                    _e.label = 1;
                case 1:
                    if (!!_b.done) return [3 /*break*/, 4];
                    _c = __read(_b.value, 2), key = _c[0], val = _c[1];
                    return [4 /*yield*/, [key, callback(key, val)]];
                case 2:
                    _e.sent();
                    _e.label = 3;
                case 3:
                    _b = _a.next();
                    return [3 /*break*/, 1];
                case 4: return [3 /*break*/, 7];
                case 5:
                    e_3_1 = _e.sent();
                    e_3 = { error: e_3_1 };
                    return [3 /*break*/, 7];
                case 6:
                    try {
                        if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                    }
                    finally { if (e_3) throw e_3.error; }
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    })());
}
exports.mapMap = mapMap;
function arrayToMap(array, callback) {
    return new Map((function () {
        var array_1, array_1_1, val, e_4_1;
        var e_4, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, 6, 7]);
                    array_1 = __values(array), array_1_1 = array_1.next();
                    _b.label = 1;
                case 1:
                    if (!!array_1_1.done) return [3 /*break*/, 4];
                    val = array_1_1.value;
                    return [4 /*yield*/, [callback(val), val]];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    array_1_1 = array_1.next();
                    return [3 /*break*/, 1];
                case 4: return [3 /*break*/, 7];
                case 5:
                    e_4_1 = _b.sent();
                    e_4 = { error: e_4_1 };
                    return [3 /*break*/, 7];
                case 6:
                    try {
                        if (array_1_1 && !array_1_1.done && (_a = array_1.return)) _a.call(array_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    })());
}
exports.arrayToMap = arrayToMap;
