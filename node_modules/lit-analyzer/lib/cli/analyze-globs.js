"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeGlobs = void 0;
var fast_glob_1 = __importDefault(require("fast-glob"));
var fs_1 = require("fs");
var path_1 = require("path");
var array_util_js_1 = require("../analyze/util/array-util.js");
var compile_js_1 = require("./compile.js");
//const IGNORE_GLOBS = ["!**/node_modules/**", "!**/web_modules/**"];
var IGNORE_GLOBS = [];
var DEFAULT_DIR_GLOB = "**/*.{js,jsx,ts,tsx}";
/**
 * Parses and analyses all globs and calls some callbacks while doing it.
 * @param globs
 * @param config
 * @param context
 */
function analyzeGlobs(globs, config, context) {
    if (context === void 0) { context = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var filePaths, _a, program, files, files_1, files_1_1, file, result;
        var e_1, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, expandGlobs(globs)];
                case 1:
                    filePaths = _c.sent();
                    if (config.debug) {
                        // eslint-disable-next-line no-console
                        console.log(filePaths);
                    }
                    // Callbacks
                    if (context.didExpandGlobs != null)
                        context.didExpandGlobs(filePaths);
                    if (context.willAnalyzeFiles != null)
                        context.willAnalyzeFiles(filePaths);
                    _a = (0, compile_js_1.compileTypescript)(filePaths), program = _a.program, files = _a.files;
                    try {
                        // Analyze each file
                        for (files_1 = __values(files), files_1_1 = files_1.next(); !files_1_1.done; files_1_1 = files_1.next()) {
                            file = files_1_1.value;
                            // Analyze
                            if (context.analyzeSourceFile != null) {
                                result = context.analyzeSourceFile(file, { program: program });
                                if (result === false)
                                    break;
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (files_1_1 && !files_1_1.done && (_b = files_1.return)) _b.call(files_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [2 /*return*/, { program: program, files: files }];
            }
        });
    });
}
exports.analyzeGlobs = analyzeGlobs;
/**
 * Expands the globs.
 * @param globs
 */
function expandGlobs(globs) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    globs = Array.isArray(globs) ? globs : [globs];
                    _a = array_util_js_1.arrayFlat;
                    return [4 /*yield*/, Promise.all(globs.map(function (g) {
                            try {
                                // Test if the glob points to a directory.
                                // If so, return the result of a new glob that searches for files in the directory excluding node_modules..
                                var dirExists = (0, fs_1.existsSync)(g) && (0, fs_1.lstatSync)(g).isDirectory();
                                if (dirExists) {
                                    return (0, fast_glob_1.default)(__spreadArray(__spreadArray([], __read(IGNORE_GLOBS), false), [(0, path_1.join)(g, DEFAULT_DIR_GLOB)], false), {
                                        absolute: true,
                                        followSymbolicLinks: true
                                    });
                                }
                            }
                            catch (_a) {
                                // Do nothing
                            }
                            // Return the result of globbing
                            return (0, fast_glob_1.default)(__spreadArray(__spreadArray([], __read(IGNORE_GLOBS), false), [g], false), {
                                absolute: true,
                                followSymbolicLinks: false
                            });
                        }))];
                case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
            }
        });
    });
}
