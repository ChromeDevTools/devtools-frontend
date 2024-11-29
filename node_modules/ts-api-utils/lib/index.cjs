"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/constants.js"(exports, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/debug.js"(exports, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/re.js"(exports, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module2.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NUMERICIDENTIFIER]}|${src[t.NONNUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NUMERICIDENTIFIERLOOSE]}|${src[t.NONNUMERICIDENTIFIER]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/parse-options.js"(exports, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/identifiers.js"(exports, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/semver.js"(exports, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (!identifier && identifierBase === false) {
              throw new Error("invalid increment argument: identifier is empty");
            }
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/parse.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/valid.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/clean.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/inc.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/diff.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (highVersion.patch) {
          return "patch";
        }
        if (highVersion.minor) {
          return "minor";
        }
        return "major";
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module2.exports = diff;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/major.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module2.exports = major;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/minor.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/patch.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/prerelease.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/rcompare.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module2.exports = rcompare;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare-loose.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare-build.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/sort.js"(exports, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module2.exports = sort;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/rsort.js"(exports, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module2.exports = rsort;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/gt.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/lt.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/eq.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/neq.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/gte.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/lte.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/cmp.js"(exports, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/coerce.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/lrucache.js"(exports, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/range.js"(exports, module2) {
    "use strict";
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.format();
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().split(/\s+/).join(" ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.format();
      }
      format() {
        this.range = this.set.map((comps) => comps.join(" ").trim()).join("||").trim();
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/comparator.js"(exports, module2) {
    "use strict";
    var ANY = Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/satisfies.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/to-comparators.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/max-satisfying.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/min-satisfying.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/min-version.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/valid.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/outside.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/gtr.js"(exports, module2) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/ltr.js"(exports, module2) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/intersects.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module2.exports = intersects;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/simplify.js"(exports, module2) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/subset.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER:
        for (const simpleSub of sub.set) {
          for (const simpleDom of dom.set) {
            const isSub = simpleSubset(simpleSub, simpleDom, options);
            sawNonNull = sawNonNull || isSub !== null;
            if (isSub) {
              continue OUTER;
            }
          }
          if (sawNonNull) {
            return false;
          }
        }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module2.exports = subset;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/index.js"(exports, module2) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module2.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  AccessKind: () => AccessKind,
  DeclarationDomain: () => DeclarationDomain,
  UsageDomain: () => UsageDomain,
  collectVariableUsage: () => collectVariableUsage,
  forEachComment: () => forEachComment,
  forEachToken: () => forEachToken,
  getAccessKind: () => getAccessKind,
  getCallSignaturesOfType: () => getCallSignaturesOfType,
  getPropertyOfType: () => getPropertyOfType,
  getWellKnownSymbolPropertyOfType: () => getWellKnownSymbolPropertyOfType,
  hasDecorators: () => hasDecorators,
  hasExpressionInitializer: () => hasExpressionInitializer,
  hasInitializer: () => hasInitializer,
  hasJSDoc: () => hasJSDoc,
  hasModifiers: () => hasModifiers,
  hasType: () => hasType,
  hasTypeArguments: () => hasTypeArguments,
  includesModifier: () => includesModifier,
  intersectionTypeParts: () => intersectionTypeParts,
  isAbstractKeyword: () => isAbstractKeyword,
  isAccessExpression: () => isAccessExpression,
  isAccessibilityModifier: () => isAccessibilityModifier,
  isAccessorDeclaration: () => isAccessorDeclaration,
  isAccessorKeyword: () => isAccessorKeyword,
  isAnyKeyword: () => isAnyKeyword,
  isArrayBindingElement: () => isArrayBindingElement,
  isArrayBindingOrAssignmentPattern: () => isArrayBindingOrAssignmentPattern,
  isAssertKeyword: () => isAssertKeyword,
  isAssertsKeyword: () => isAssertsKeyword,
  isAssignmentKind: () => isAssignmentKind,
  isAssignmentPattern: () => isAssignmentPattern,
  isAsyncKeyword: () => isAsyncKeyword,
  isAwaitKeyword: () => isAwaitKeyword,
  isBigIntKeyword: () => isBigIntKeyword,
  isBigIntLiteralType: () => isBigIntLiteralType,
  isBindingOrAssignmentElementRestIndicator: () => isBindingOrAssignmentElementRestIndicator,
  isBindingOrAssignmentElementTarget: () => isBindingOrAssignmentElementTarget,
  isBindingOrAssignmentPattern: () => isBindingOrAssignmentPattern,
  isBindingPattern: () => isBindingPattern,
  isBlockLike: () => isBlockLike,
  isBooleanKeyword: () => isBooleanKeyword,
  isBooleanLiteral: () => isBooleanLiteral,
  isBooleanLiteralType: () => isBooleanLiteralType,
  isClassLikeDeclaration: () => isClassLikeDeclaration,
  isClassMemberModifier: () => isClassMemberModifier,
  isColonToken: () => isColonToken,
  isCompilerOptionEnabled: () => isCompilerOptionEnabled,
  isConditionalType: () => isConditionalType,
  isConstAssertionExpression: () => isConstAssertionExpression,
  isConstKeyword: () => isConstKeyword,
  isDeclarationName: () => isDeclarationName,
  isDeclarationWithTypeParameterChildren: () => isDeclarationWithTypeParameterChildren,
  isDeclarationWithTypeParameters: () => isDeclarationWithTypeParameters,
  isDeclareKeyword: () => isDeclareKeyword,
  isDefaultKeyword: () => isDefaultKeyword,
  isDestructuringPattern: () => isDestructuringPattern,
  isDotToken: () => isDotToken,
  isEndOfFileToken: () => isEndOfFileToken,
  isEntityNameExpression: () => isEntityNameExpression,
  isEntityNameOrEntityNameExpression: () => isEntityNameOrEntityNameExpression,
  isEnumType: () => isEnumType,
  isEqualsGreaterThanToken: () => isEqualsGreaterThanToken,
  isEqualsToken: () => isEqualsToken,
  isEvolvingArrayType: () => isEvolvingArrayType,
  isExclamationToken: () => isExclamationToken,
  isExportKeyword: () => isExportKeyword,
  isFalseKeyword: () => isFalseKeyword,
  isFalseLiteral: () => isFalseLiteral,
  isFalseLiteralType: () => isFalseLiteralType,
  isFalsyType: () => isFalsyType,
  isForInOrOfStatement: () => isForInOrOfStatement,
  isFreshableIntrinsicType: () => isFreshableIntrinsicType,
  isFreshableType: () => isFreshableType,
  isFunctionLikeDeclaration: () => isFunctionLikeDeclaration,
  isFunctionScopeBoundary: () => isFunctionScopeBoundary,
  isImportExpression: () => isImportExpression,
  isImportKeyword: () => isImportKeyword,
  isInKeyword: () => isInKeyword,
  isIndexType: () => isIndexType,
  isIndexedAccessType: () => isIndexedAccessType,
  isInputFiles: () => isInputFiles,
  isInstantiableType: () => isInstantiableType,
  isIntersectionType: () => isIntersectionType,
  isIntrinsicAnyType: () => isIntrinsicAnyType,
  isIntrinsicBigIntType: () => isIntrinsicBigIntType,
  isIntrinsicBooleanType: () => isIntrinsicBooleanType,
  isIntrinsicESSymbolType: () => isIntrinsicESSymbolType,
  isIntrinsicErrorType: () => isIntrinsicErrorType,
  isIntrinsicNeverType: () => isIntrinsicNeverType,
  isIntrinsicNonPrimitiveType: () => isIntrinsicNonPrimitiveType,
  isIntrinsicNullType: () => isIntrinsicNullType,
  isIntrinsicNumberType: () => isIntrinsicNumberType,
  isIntrinsicStringType: () => isIntrinsicStringType,
  isIntrinsicType: () => isIntrinsicType,
  isIntrinsicUndefinedType: () => isIntrinsicUndefinedType,
  isIntrinsicUnknownType: () => isIntrinsicUnknownType,
  isIntrinsicVoidType: () => isIntrinsicVoidType,
  isIterationStatement: () => isIterationStatement,
  isJSDocComment: () => isJSDocComment,
  isJSDocNamespaceBody: () => isJSDocNamespaceBody,
  isJSDocNamespaceDeclaration: () => isJSDocNamespaceDeclaration,
  isJSDocText: () => isJSDocText,
  isJSDocTypeReferencingNode: () => isJSDocTypeReferencingNode,
  isJsonMinusNumericLiteral: () => isJsonMinusNumericLiteral,
  isJsonObjectExpression: () => isJsonObjectExpression,
  isJsxAttributeLike: () => isJsxAttributeLike,
  isJsxAttributeValue: () => isJsxAttributeValue,
  isJsxChild: () => isJsxChild,
  isJsxTagNameExpression: () => isJsxTagNameExpression,
  isJsxTagNamePropertyAccess: () => isJsxTagNamePropertyAccess,
  isLiteralToken: () => isLiteralToken,
  isLiteralType: () => isLiteralType,
  isModifierFlagSet: () => isModifierFlagSet,
  isModuleBody: () => isModuleBody,
  isModuleName: () => isModuleName,
  isModuleReference: () => isModuleReference,
  isNamedDeclarationWithName: () => isNamedDeclarationWithName,
  isNamedImportBindings: () => isNamedImportBindings,
  isNamedImportsOrExports: () => isNamedImportsOrExports,
  isNamespaceBody: () => isNamespaceBody,
  isNamespaceDeclaration: () => isNamespaceDeclaration,
  isNeverKeyword: () => isNeverKeyword,
  isNodeFlagSet: () => isNodeFlagSet,
  isNullKeyword: () => isNullKeyword,
  isNullLiteral: () => isNullLiteral,
  isNumberKeyword: () => isNumberKeyword,
  isNumberLiteralType: () => isNumberLiteralType,
  isNumericOrStringLikeLiteral: () => isNumericOrStringLikeLiteral,
  isNumericPropertyName: () => isNumericPropertyName,
  isObjectBindingOrAssignmentElement: () => isObjectBindingOrAssignmentElement,
  isObjectBindingOrAssignmentPattern: () => isObjectBindingOrAssignmentPattern,
  isObjectFlagSet: () => isObjectFlagSet,
  isObjectKeyword: () => isObjectKeyword,
  isObjectType: () => isObjectType,
  isObjectTypeDeclaration: () => isObjectTypeDeclaration,
  isOutKeyword: () => isOutKeyword,
  isOverrideKeyword: () => isOverrideKeyword,
  isParameterPropertyModifier: () => isParameterPropertyModifier,
  isPrivateKeyword: () => isPrivateKeyword,
  isPropertyAccessEntityNameExpression: () => isPropertyAccessEntityNameExpression,
  isPropertyNameLiteral: () => isPropertyNameLiteral,
  isPropertyReadonlyInType: () => isPropertyReadonlyInType,
  isProtectedKeyword: () => isProtectedKeyword,
  isPseudoLiteralToken: () => isPseudoLiteralToken,
  isPublicKeyword: () => isPublicKeyword,
  isQuestionDotToken: () => isQuestionDotToken,
  isQuestionToken: () => isQuestionToken,
  isReadonlyKeyword: () => isReadonlyKeyword,
  isSignatureDeclaration: () => isSignatureDeclaration,
  isStaticKeyword: () => isStaticKeyword,
  isStrictCompilerOptionEnabled: () => isStrictCompilerOptionEnabled,
  isStringKeyword: () => isStringKeyword,
  isStringLiteralType: () => isStringLiteralType,
  isStringMappingType: () => isStringMappingType,
  isSubstitutionType: () => isSubstitutionType,
  isSuperElementAccessExpression: () => isSuperElementAccessExpression,
  isSuperExpression: () => isSuperExpression,
  isSuperKeyword: () => isSuperKeyword,
  isSuperProperty: () => isSuperProperty,
  isSuperPropertyAccessExpression: () => isSuperPropertyAccessExpression,
  isSymbolFlagSet: () => isSymbolFlagSet,
  isSymbolKeyword: () => isSymbolKeyword,
  isSyntaxList: () => isSyntaxList,
  isTemplateLiteralType: () => isTemplateLiteralType,
  isThenableType: () => isThenableType,
  isThisExpression: () => isThisExpression,
  isThisKeyword: () => isThisKeyword,
  isTransientSymbolLinksFlagSet: () => isTransientSymbolLinksFlagSet,
  isTrueKeyword: () => isTrueKeyword,
  isTrueLiteral: () => isTrueLiteral,
  isTrueLiteralType: () => isTrueLiteralType,
  isTupleType: () => isTupleType,
  isTupleTypeReference: () => isTupleTypeReference,
  isTypeFlagSet: () => isTypeFlagSet,
  isTypeOnlyCompatibleAliasDeclaration: () => isTypeOnlyCompatibleAliasDeclaration,
  isTypeParameter: () => isTypeParameter,
  isTypeReference: () => isTypeReference,
  isTypeReferenceType: () => isTypeReferenceType,
  isTypeVariable: () => isTypeVariable,
  isUndefinedKeyword: () => isUndefinedKeyword,
  isUnionOrIntersectionType: () => isUnionOrIntersectionType,
  isUnionOrIntersectionTypeNode: () => isUnionOrIntersectionTypeNode,
  isUnionType: () => isUnionType,
  isUniqueESSymbolType: () => isUniqueESSymbolType,
  isUnknownKeyword: () => isUnknownKeyword,
  isUnknownLiteralType: () => isUnknownLiteralType,
  isUnparsedPrologue: () => isUnparsedPrologue,
  isUnparsedSourceText: () => isUnparsedSourceText,
  isUnparsedSyntheticReference: () => isUnparsedSyntheticReference,
  isValidPropertyAccess: () => isValidPropertyAccess,
  isVariableLikeDeclaration: () => isVariableLikeDeclaration,
  isVoidKeyword: () => isVoidKeyword,
  symbolHasReadonlyDeclaration: () => symbolHasReadonlyDeclaration,
  typeIsLiteral: () => typeIsLiteral,
  typeParts: () => typeParts,
  unionTypeParts: () => unionTypeParts
});
module.exports = __toCommonJS(src_exports);

// src/comments.ts
var import_typescript2 = __toESM(require("typescript"), 1);

// src/tokens.ts
var import_typescript = __toESM(require("typescript"), 1);
function forEachToken(node, callback, sourceFile = node.getSourceFile()) {
  const queue = [];
  while (true) {
    if (import_typescript.default.isTokenKind(node.kind)) {
      callback(node);
    } else if (
      // eslint-disable-next-line deprecation/deprecation -- need for support of TS < 4.7
      node.kind !== import_typescript.default.SyntaxKind.JSDocComment
    ) {
      const children = node.getChildren(sourceFile);
      if (children.length === 1) {
        node = children[0];
        continue;
      }
      for (let i = children.length - 1; i >= 0; --i) {
        queue.push(children[i]);
      }
    }
    if (queue.length === 0) {
      break;
    }
    node = queue.pop();
  }
}

// src/comments.ts
function canHaveTrailingTrivia(token) {
  switch (token.kind) {
    case import_typescript2.default.SyntaxKind.CloseBraceToken:
      return token.parent.kind !== import_typescript2.default.SyntaxKind.JsxExpression || !isJsxElementOrFragment(token.parent.parent);
    case import_typescript2.default.SyntaxKind.GreaterThanToken:
      switch (token.parent.kind) {
        case import_typescript2.default.SyntaxKind.JsxOpeningElement:
          return token.end !== token.parent.end;
        case import_typescript2.default.SyntaxKind.JsxOpeningFragment:
          return false;
        case import_typescript2.default.SyntaxKind.JsxSelfClosingElement:
          return token.end !== token.parent.end || // if end is not equal, this is part of the type arguments list
          !isJsxElementOrFragment(token.parent.parent);
        case import_typescript2.default.SyntaxKind.JsxClosingElement:
        case import_typescript2.default.SyntaxKind.JsxClosingFragment:
          return !isJsxElementOrFragment(token.parent.parent.parent);
      }
  }
  return true;
}
function isJsxElementOrFragment(node) {
  return node.kind === import_typescript2.default.SyntaxKind.JsxElement || node.kind === import_typescript2.default.SyntaxKind.JsxFragment;
}
function forEachComment(node, callback, sourceFile = node.getSourceFile()) {
  const fullText = sourceFile.text;
  const notJsx = sourceFile.languageVariant !== import_typescript2.default.LanguageVariant.JSX;
  return forEachToken(
    node,
    (token) => {
      if (token.pos === token.end) {
        return;
      }
      if (token.kind !== import_typescript2.default.SyntaxKind.JsxText) {
        import_typescript2.default.forEachLeadingCommentRange(
          fullText,
          // skip shebang at position 0
          token.pos === 0 ? (import_typescript2.default.getShebang(fullText) ?? "").length : token.pos,
          commentCallback
        );
      }
      if (notJsx || canHaveTrailingTrivia(token)) {
        return import_typescript2.default.forEachTrailingCommentRange(
          fullText,
          token.end,
          commentCallback
        );
      }
    },
    sourceFile
  );
  function commentCallback(pos, end, kind) {
    callback(fullText, { end, kind, pos });
  }
}

// src/compilerOptions.ts
var import_typescript3 = __toESM(require("typescript"), 1);
function isCompilerOptionEnabled(options, option) {
  switch (option) {
    case "stripInternal":
    case "declarationMap":
    case "emitDeclarationOnly":
      return options[option] === true && isCompilerOptionEnabled(options, "declaration");
    case "declaration":
      return options.declaration || isCompilerOptionEnabled(options, "composite");
    case "incremental":
      return options.incremental === void 0 ? isCompilerOptionEnabled(options, "composite") : options.incremental;
    case "skipDefaultLibCheck":
      return options.skipDefaultLibCheck || isCompilerOptionEnabled(options, "skipLibCheck");
    case "suppressImplicitAnyIndexErrors":
      return options.suppressImplicitAnyIndexErrors === true && isCompilerOptionEnabled(options, "noImplicitAny");
    case "allowSyntheticDefaultImports":
      return options.allowSyntheticDefaultImports !== void 0 ? options.allowSyntheticDefaultImports : isCompilerOptionEnabled(options, "esModuleInterop") || options.module === import_typescript3.default.ModuleKind.System;
    case "noUncheckedIndexedAccess":
      return options.noUncheckedIndexedAccess === true && isCompilerOptionEnabled(options, "strictNullChecks");
    case "allowJs":
      return options.allowJs === void 0 ? isCompilerOptionEnabled(options, "checkJs") : options.allowJs;
    case "noImplicitAny":
    case "noImplicitThis":
    case "strictNullChecks":
    case "strictFunctionTypes":
    case "strictPropertyInitialization":
    case "alwaysStrict":
    case "strictBindCallApply":
      return isStrictCompilerOptionEnabled(
        options,
        option
      );
  }
  return options[option] === true;
}
function isStrictCompilerOptionEnabled(options, option) {
  return (options.strict ? options[option] !== false : options[option] === true) && (option !== "strictPropertyInitialization" || isStrictCompilerOptionEnabled(options, "strictNullChecks"));
}

// src/flags.ts
var import_typescript4 = __toESM(require("typescript"), 1);
function isFlagSet(allFlags, flag) {
  return (allFlags & flag) !== 0;
}
function isFlagSetOnObject(obj, flag) {
  return isFlagSet(obj.flags, flag);
}
function isModifierFlagSet(node, flag) {
  return isFlagSet(import_typescript4.default.getCombinedModifierFlags(node), flag);
}
var isNodeFlagSet = isFlagSetOnObject;
function isObjectFlagSet(objectType, flag) {
  return isFlagSet(objectType.objectFlags, flag);
}
var isSymbolFlagSet = isFlagSetOnObject;
function isTransientSymbolLinksFlagSet(links, flag) {
  return isFlagSet(links.checkFlags, flag);
}
var isTypeFlagSet = isFlagSetOnObject;

// src/modifiers.ts
function includesModifier(modifiers, ...kinds) {
  if (modifiers === void 0) {
    return false;
  }
  for (const modifier of modifiers) {
    if (kinds.includes(modifier.kind)) {
      return true;
    }
  }
  return false;
}

// src/nodes/access.ts
var import_typescript6 = __toESM(require("typescript"), 1);

// src/syntax.ts
var import_typescript5 = __toESM(require("typescript"), 1);
function isAssignmentKind(kind) {
  return kind >= import_typescript5.default.SyntaxKind.FirstAssignment && kind <= import_typescript5.default.SyntaxKind.LastAssignment;
}
function isNumericPropertyName(name) {
  return String(+name) === name;
}
function charSize(ch) {
  return ch >= 65536 ? 2 : 1;
}
function isValidPropertyAccess(text, languageVersion = import_typescript5.default.ScriptTarget.Latest) {
  if (text.length === 0) {
    return false;
  }
  let ch = text.codePointAt(0);
  if (!import_typescript5.default.isIdentifierStart(ch, languageVersion)) {
    return false;
  }
  for (let i = charSize(ch); i < text.length; i += charSize(ch)) {
    ch = text.codePointAt(i);
    if (!import_typescript5.default.isIdentifierPart(ch, languageVersion)) {
      return false;
    }
  }
  return true;
}

// src/nodes/access.ts
var AccessKind = /* @__PURE__ */ ((AccessKind2) => {
  AccessKind2[AccessKind2["None"] = 0] = "None";
  AccessKind2[AccessKind2["Read"] = 1] = "Read";
  AccessKind2[AccessKind2["Write"] = 2] = "Write";
  AccessKind2[AccessKind2["Delete"] = 4] = "Delete";
  AccessKind2[AccessKind2["ReadWrite"] = 3] = "ReadWrite";
  return AccessKind2;
})(AccessKind || {});
function getAccessKind(node) {
  const parent = node.parent;
  switch (parent.kind) {
    case import_typescript6.default.SyntaxKind.DeleteExpression:
      return 4 /* Delete */;
    case import_typescript6.default.SyntaxKind.PostfixUnaryExpression:
      return 3 /* ReadWrite */;
    case import_typescript6.default.SyntaxKind.PrefixUnaryExpression:
      return parent.operator === import_typescript6.default.SyntaxKind.PlusPlusToken || parent.operator === import_typescript6.default.SyntaxKind.MinusMinusToken ? 3 /* ReadWrite */ : 1 /* Read */;
    case import_typescript6.default.SyntaxKind.BinaryExpression:
      return parent.right === node ? 1 /* Read */ : !isAssignmentKind(parent.operatorToken.kind) ? 1 /* Read */ : parent.operatorToken.kind === import_typescript6.default.SyntaxKind.EqualsToken ? 2 /* Write */ : 3 /* ReadWrite */;
    case import_typescript6.default.SyntaxKind.ShorthandPropertyAssignment:
      return parent.objectAssignmentInitializer === node ? 1 /* Read */ : isInDestructuringAssignment(parent) ? 2 /* Write */ : 1 /* Read */;
    case import_typescript6.default.SyntaxKind.PropertyAssignment:
      return parent.name === node ? 0 /* None */ : isInDestructuringAssignment(parent) ? 2 /* Write */ : 1 /* Read */;
    case import_typescript6.default.SyntaxKind.ArrayLiteralExpression:
    case import_typescript6.default.SyntaxKind.SpreadElement:
    case import_typescript6.default.SyntaxKind.SpreadAssignment:
      return isInDestructuringAssignment(
        parent
      ) ? 2 /* Write */ : 1 /* Read */;
    case import_typescript6.default.SyntaxKind.ParenthesizedExpression:
    case import_typescript6.default.SyntaxKind.NonNullExpression:
    case import_typescript6.default.SyntaxKind.TypeAssertionExpression:
    case import_typescript6.default.SyntaxKind.AsExpression:
      return getAccessKind(parent);
    case import_typescript6.default.SyntaxKind.ForOfStatement:
    case import_typescript6.default.SyntaxKind.ForInStatement:
      return parent.initializer === node ? 2 /* Write */ : 1 /* Read */;
    case import_typescript6.default.SyntaxKind.ExpressionWithTypeArguments:
      return parent.parent.token === import_typescript6.default.SyntaxKind.ExtendsKeyword && parent.parent.parent.kind !== import_typescript6.default.SyntaxKind.InterfaceDeclaration ? 1 /* Read */ : 0 /* None */;
    case import_typescript6.default.SyntaxKind.ComputedPropertyName:
    case import_typescript6.default.SyntaxKind.ExpressionStatement:
    case import_typescript6.default.SyntaxKind.TypeOfExpression:
    case import_typescript6.default.SyntaxKind.ElementAccessExpression:
    case import_typescript6.default.SyntaxKind.ForStatement:
    case import_typescript6.default.SyntaxKind.IfStatement:
    case import_typescript6.default.SyntaxKind.DoStatement:
    case import_typescript6.default.SyntaxKind.WhileStatement:
    case import_typescript6.default.SyntaxKind.SwitchStatement:
    case import_typescript6.default.SyntaxKind.WithStatement:
    case import_typescript6.default.SyntaxKind.ThrowStatement:
    case import_typescript6.default.SyntaxKind.CallExpression:
    case import_typescript6.default.SyntaxKind.NewExpression:
    case import_typescript6.default.SyntaxKind.TaggedTemplateExpression:
    case import_typescript6.default.SyntaxKind.JsxExpression:
    case import_typescript6.default.SyntaxKind.Decorator:
    case import_typescript6.default.SyntaxKind.TemplateSpan:
    case import_typescript6.default.SyntaxKind.JsxOpeningElement:
    case import_typescript6.default.SyntaxKind.JsxSelfClosingElement:
    case import_typescript6.default.SyntaxKind.JsxSpreadAttribute:
    case import_typescript6.default.SyntaxKind.VoidExpression:
    case import_typescript6.default.SyntaxKind.ReturnStatement:
    case import_typescript6.default.SyntaxKind.AwaitExpression:
    case import_typescript6.default.SyntaxKind.YieldExpression:
    case import_typescript6.default.SyntaxKind.ConditionalExpression:
    case import_typescript6.default.SyntaxKind.CaseClause:
    case import_typescript6.default.SyntaxKind.JsxElement:
      return 1 /* Read */;
    case import_typescript6.default.SyntaxKind.ArrowFunction:
      return parent.body === node ? 1 /* Read */ : 2 /* Write */;
    case import_typescript6.default.SyntaxKind.PropertyDeclaration:
    case import_typescript6.default.SyntaxKind.VariableDeclaration:
    case import_typescript6.default.SyntaxKind.Parameter:
    case import_typescript6.default.SyntaxKind.EnumMember:
    case import_typescript6.default.SyntaxKind.BindingElement:
    case import_typescript6.default.SyntaxKind.JsxAttribute:
      return parent.initializer === node ? 1 /* Read */ : 0 /* None */;
    case import_typescript6.default.SyntaxKind.PropertyAccessExpression:
      return parent.expression === node ? 1 /* Read */ : 0 /* None */;
    case import_typescript6.default.SyntaxKind.ExportAssignment:
      return parent.isExportEquals ? 1 /* Read */ : 0 /* None */;
  }
  return 0 /* None */;
}
function isInDestructuringAssignment(node) {
  switch (node.kind) {
    case import_typescript6.default.SyntaxKind.ShorthandPropertyAssignment:
      if (node.objectAssignmentInitializer !== void 0) {
        return true;
      }
    case import_typescript6.default.SyntaxKind.PropertyAssignment:
    case import_typescript6.default.SyntaxKind.SpreadAssignment:
      node = node.parent;
      break;
    case import_typescript6.default.SyntaxKind.SpreadElement:
      if (node.parent.kind !== import_typescript6.default.SyntaxKind.ArrayLiteralExpression) {
        return false;
      }
      node = node.parent;
  }
  while (true) {
    switch (node.parent.kind) {
      case import_typescript6.default.SyntaxKind.BinaryExpression:
        return node.parent.left === node && node.parent.operatorToken.kind === import_typescript6.default.SyntaxKind.EqualsToken;
      case import_typescript6.default.SyntaxKind.ForOfStatement:
        return node.parent.initializer === node;
      case import_typescript6.default.SyntaxKind.ArrayLiteralExpression:
      case import_typescript6.default.SyntaxKind.ObjectLiteralExpression:
        node = node.parent;
        break;
      case import_typescript6.default.SyntaxKind.SpreadAssignment:
      case import_typescript6.default.SyntaxKind.PropertyAssignment:
        node = node.parent.parent;
        break;
      case import_typescript6.default.SyntaxKind.SpreadElement:
        if (node.parent.parent.kind !== import_typescript6.default.SyntaxKind.ArrayLiteralExpression) {
          return false;
        }
        node = node.parent.parent;
        break;
      default:
        return false;
    }
  }
}

// src/nodes/typeGuards/compound.ts
var import_typescript10 = __toESM(require("typescript"), 1);

// src/nodes/typeGuards/single.ts
var import_typescript7 = __toESM(require("typescript"), 1);
function isAbstractKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.AbstractKeyword;
}
function isAccessorKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.AccessorKeyword;
}
function isAnyKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.AnyKeyword;
}
function isAssertKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.AssertKeyword;
}
function isAssertsKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.AssertsKeyword;
}
function isAsyncKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.AsyncKeyword;
}
function isAwaitKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.AwaitKeyword;
}
function isBigIntKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.BigIntKeyword;
}
function isBooleanKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.BooleanKeyword;
}
function isColonToken(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ColonToken;
}
function isConstKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ConstKeyword;
}
function isDeclareKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.DeclareKeyword;
}
function isDefaultKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.DefaultKeyword;
}
function isDotToken(node) {
  return node.kind === import_typescript7.default.SyntaxKind.DotToken;
}
function isEndOfFileToken(node) {
  return node.kind === import_typescript7.default.SyntaxKind.EndOfFileToken;
}
function isEqualsGreaterThanToken(node) {
  return node.kind === import_typescript7.default.SyntaxKind.EqualsGreaterThanToken;
}
function isEqualsToken(node) {
  return node.kind === import_typescript7.default.SyntaxKind.EqualsToken;
}
function isExclamationToken(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ExclamationToken;
}
function isExportKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ExportKeyword;
}
function isFalseKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.FalseKeyword;
}
function isFalseLiteral(node) {
  return node.kind === import_typescript7.default.SyntaxKind.FalseKeyword;
}
function isImportExpression(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ImportKeyword;
}
function isImportKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ImportKeyword;
}
function isInKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.InKeyword;
}
function isInputFiles(node) {
  return node.kind === import_typescript7.default.SyntaxKind.InputFiles;
}
function isJSDocText(node) {
  return node.kind === import_typescript7.default.SyntaxKind.JSDocText;
}
function isJsonMinusNumericLiteral(node) {
  return node.kind === import_typescript7.default.SyntaxKind.PrefixUnaryExpression;
}
function isNeverKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.NeverKeyword;
}
function isNullKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.NullKeyword;
}
function isNullLiteral(node) {
  return node.kind === import_typescript7.default.SyntaxKind.NullKeyword;
}
function isNumberKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.NumberKeyword;
}
function isObjectKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ObjectKeyword;
}
function isOutKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.OutKeyword;
}
function isOverrideKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.OverrideKeyword;
}
function isPrivateKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.PrivateKeyword;
}
function isProtectedKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ProtectedKeyword;
}
function isPublicKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.PublicKeyword;
}
function isQuestionDotToken(node) {
  return node.kind === import_typescript7.default.SyntaxKind.QuestionDotToken;
}
function isQuestionToken(node) {
  return node.kind === import_typescript7.default.SyntaxKind.QuestionToken;
}
function isReadonlyKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ReadonlyKeyword;
}
function isStaticKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.StaticKeyword;
}
function isStringKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.StringKeyword;
}
function isSuperExpression(node) {
  return node.kind === import_typescript7.default.SyntaxKind.SuperKeyword;
}
function isSuperKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.SuperKeyword;
}
function isSymbolKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.SymbolKeyword;
}
function isSyntaxList(node) {
  return node.kind === import_typescript7.default.SyntaxKind.SyntaxList;
}
function isThisExpression(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ThisKeyword;
}
function isThisKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.ThisKeyword;
}
function isTrueKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.TrueKeyword;
}
function isTrueLiteral(node) {
  return node.kind === import_typescript7.default.SyntaxKind.TrueKeyword;
}
function isUndefinedKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.UndefinedKeyword;
}
function isUnknownKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.UnknownKeyword;
}
function isUnparsedPrologue(node) {
  return node.kind === import_typescript7.default.SyntaxKind.UnparsedPrologue;
}
function isUnparsedSyntheticReference(node) {
  return node.kind === import_typescript7.default.SyntaxKind.UnparsedSyntheticReference;
}
function isVoidKeyword(node) {
  return node.kind === import_typescript7.default.SyntaxKind.VoidKeyword;
}

// src/nodes/typeGuards/union.ts
var import_typescript9 = __toESM(require("typescript"), 1);

// src/utils.ts
var import_typescript8 = __toESM(require("typescript"), 1);
var [tsMajor, tsMinor] = import_typescript8.default.versionMajorMinor.split(".").map((raw) => Number.parseInt(raw, 10));
function isTsVersionAtLeast(major, minor = 0) {
  return tsMajor > major || tsMajor === major && tsMinor >= minor;
}

// src/nodes/typeGuards/union.ts
function isAccessExpression(node) {
  return import_typescript9.default.isPropertyAccessExpression(node) || import_typescript9.default.isElementAccessExpression(node);
}
function isAccessibilityModifier(node) {
  return isPublicKeyword(node) || isPrivateKeyword(node) || isProtectedKeyword(node);
}
function isAccessorDeclaration(node) {
  return import_typescript9.default.isGetAccessorDeclaration(node) || import_typescript9.default.isSetAccessorDeclaration(node);
}
function isArrayBindingElement(node) {
  return import_typescript9.default.isBindingElement(node) || import_typescript9.default.isOmittedExpression(node);
}
function isArrayBindingOrAssignmentPattern(node) {
  return import_typescript9.default.isArrayBindingPattern(node) || import_typescript9.default.isArrayLiteralExpression(node);
}
function isAssignmentPattern(node) {
  return import_typescript9.default.isObjectLiteralExpression(node) || import_typescript9.default.isArrayLiteralExpression(node);
}
function isBindingOrAssignmentElementRestIndicator(node) {
  if (import_typescript9.default.isSpreadElement(node) || import_typescript9.default.isSpreadAssignment(node)) {
    return true;
  }
  if (isTsVersionAtLeast(4, 4)) {
    return import_typescript9.default.isDotDotDotToken(node);
  }
  return false;
}
function isBindingOrAssignmentElementTarget(node) {
  return isBindingOrAssignmentPattern(node) || import_typescript9.default.isIdentifier(node) || import_typescript9.default.isPropertyAccessExpression(node) || import_typescript9.default.isElementAccessExpression(node) || import_typescript9.default.isOmittedExpression(node);
}
function isBindingOrAssignmentPattern(node) {
  return isObjectBindingOrAssignmentPattern(node) || isArrayBindingOrAssignmentPattern(node);
}
function isBindingPattern(node) {
  return import_typescript9.default.isObjectBindingPattern(node) || import_typescript9.default.isArrayBindingPattern(node);
}
function isBlockLike(node) {
  return import_typescript9.default.isSourceFile(node) || import_typescript9.default.isBlock(node) || import_typescript9.default.isModuleBlock(node) || import_typescript9.default.isCaseOrDefaultClause(node);
}
function isBooleanLiteral(node) {
  return isTrueLiteral(node) || isFalseLiteral(node);
}
function isClassLikeDeclaration(node) {
  return import_typescript9.default.isClassDeclaration(node) || import_typescript9.default.isClassExpression(node);
}
function isClassMemberModifier(node) {
  return isAccessibilityModifier(node) || isReadonlyKeyword(node) || isStaticKeyword(node) || isAccessorKeyword(node);
}
function isDeclarationName(node) {
  return import_typescript9.default.isIdentifier(node) || import_typescript9.default.isPrivateIdentifier(node) || import_typescript9.default.isStringLiteralLike(node) || import_typescript9.default.isNumericLiteral(node) || import_typescript9.default.isComputedPropertyName(node) || import_typescript9.default.isElementAccessExpression(node) || isBindingPattern(node) || isEntityNameExpression(node);
}
function isDeclarationWithTypeParameterChildren(node) {
  return isSignatureDeclaration(node) || // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
  isClassLikeDeclaration(node) || import_typescript9.default.isInterfaceDeclaration(node) || import_typescript9.default.isTypeAliasDeclaration(node) || import_typescript9.default.isJSDocTemplateTag(node);
}
function isDeclarationWithTypeParameters(node) {
  return isDeclarationWithTypeParameterChildren(node) || import_typescript9.default.isJSDocTypedefTag(node) || import_typescript9.default.isJSDocCallbackTag(node) || import_typescript9.default.isJSDocSignature(node);
}
function isDestructuringPattern(node) {
  return isBindingPattern(node) || import_typescript9.default.isObjectLiteralExpression(node) || import_typescript9.default.isArrayLiteralExpression(node);
}
function isEntityNameExpression(node) {
  return import_typescript9.default.isIdentifier(node) || isPropertyAccessEntityNameExpression(node);
}
function isEntityNameOrEntityNameExpression(node) {
  return import_typescript9.default.isEntityName(node) || isEntityNameExpression(node);
}
function isForInOrOfStatement(node) {
  return import_typescript9.default.isForInStatement(node) || import_typescript9.default.isForOfStatement(node);
}
function isFunctionLikeDeclaration(node) {
  return import_typescript9.default.isFunctionDeclaration(node) || import_typescript9.default.isMethodDeclaration(node) || import_typescript9.default.isGetAccessorDeclaration(node) || import_typescript9.default.isSetAccessorDeclaration(node) || import_typescript9.default.isConstructorDeclaration(node) || import_typescript9.default.isFunctionExpression(node) || import_typescript9.default.isArrowFunction(node);
}
function hasDecorators(node) {
  return import_typescript9.default.isParameter(node) || import_typescript9.default.isPropertyDeclaration(node) || import_typescript9.default.isMethodDeclaration(node) || import_typescript9.default.isGetAccessorDeclaration(node) || import_typescript9.default.isSetAccessorDeclaration(node) || import_typescript9.default.isClassExpression(node) || import_typescript9.default.isClassDeclaration(node);
}
function hasExpressionInitializer(node) {
  return import_typescript9.default.isVariableDeclaration(node) || import_typescript9.default.isParameter(node) || import_typescript9.default.isBindingElement(node) || import_typescript9.default.isPropertyDeclaration(node) || import_typescript9.default.isPropertyAssignment(node) || import_typescript9.default.isEnumMember(node);
}
function hasInitializer(node) {
  return hasExpressionInitializer(node) || import_typescript9.default.isForStatement(node) || import_typescript9.default.isForInStatement(node) || import_typescript9.default.isForOfStatement(node) || import_typescript9.default.isJsxAttribute(node);
}
function hasJSDoc(node) {
  if (
    // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
    isAccessorDeclaration(node) || import_typescript9.default.isArrowFunction(node) || import_typescript9.default.isBlock(node) || import_typescript9.default.isBreakStatement(node) || import_typescript9.default.isCallSignatureDeclaration(node) || import_typescript9.default.isCaseClause(node) || // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
    isClassLikeDeclaration(node) || import_typescript9.default.isConstructorDeclaration(node) || import_typescript9.default.isConstructorTypeNode(node) || import_typescript9.default.isConstructSignatureDeclaration(node) || import_typescript9.default.isContinueStatement(node) || import_typescript9.default.isDebuggerStatement(node) || import_typescript9.default.isDoStatement(node) || import_typescript9.default.isEmptyStatement(node) || isEndOfFileToken(node) || import_typescript9.default.isEnumDeclaration(node) || import_typescript9.default.isEnumMember(node) || import_typescript9.default.isExportAssignment(node) || import_typescript9.default.isExportDeclaration(node) || import_typescript9.default.isExportSpecifier(node) || import_typescript9.default.isExpressionStatement(node) || import_typescript9.default.isForInStatement(node) || import_typescript9.default.isForOfStatement(node) || import_typescript9.default.isForStatement(node) || import_typescript9.default.isFunctionDeclaration(node) || import_typescript9.default.isFunctionExpression(node) || import_typescript9.default.isFunctionTypeNode(node) || import_typescript9.default.isIfStatement(node) || import_typescript9.default.isImportDeclaration(node) || import_typescript9.default.isImportEqualsDeclaration(node) || import_typescript9.default.isIndexSignatureDeclaration(node) || import_typescript9.default.isInterfaceDeclaration(node) || import_typescript9.default.isJSDocFunctionType(node) || import_typescript9.default.isLabeledStatement(node) || import_typescript9.default.isMethodDeclaration(node) || import_typescript9.default.isMethodSignature(node) || import_typescript9.default.isModuleDeclaration(node) || import_typescript9.default.isNamedTupleMember(node) || import_typescript9.default.isNamespaceExportDeclaration(node) || import_typescript9.default.isParameter(node) || import_typescript9.default.isParenthesizedExpression(node) || import_typescript9.default.isPropertyAssignment(node) || import_typescript9.default.isPropertyDeclaration(node) || import_typescript9.default.isPropertySignature(node) || import_typescript9.default.isReturnStatement(node) || import_typescript9.default.isShorthandPropertyAssignment(node) || import_typescript9.default.isSpreadAssignment(node) || import_typescript9.default.isSwitchStatement(node) || import_typescript9.default.isThrowStatement(node) || import_typescript9.default.isTryStatement(node) || import_typescript9.default.isTypeAliasDeclaration(node) || import_typescript9.default.isVariableDeclaration(node) || import_typescript9.default.isVariableStatement(node) || import_typescript9.default.isWhileStatement(node) || import_typescript9.default.isWithStatement(node)
  ) {
    return true;
  }
  if (isTsVersionAtLeast(4, 4) && import_typescript9.default.isClassStaticBlockDeclaration(node)) {
    return true;
  }
  if (isTsVersionAtLeast(5, 0) && (import_typescript9.default.isBinaryExpression(node) || import_typescript9.default.isElementAccessExpression(node) || import_typescript9.default.isIdentifier(node) || import_typescript9.default.isJSDocSignature(node) || import_typescript9.default.isObjectLiteralExpression(node) || import_typescript9.default.isPropertyAccessExpression(node) || import_typescript9.default.isTypeParameterDeclaration(node))) {
    return true;
  }
  return false;
}
function hasModifiers(node) {
  return import_typescript9.default.isTypeParameterDeclaration(node) || import_typescript9.default.isParameter(node) || import_typescript9.default.isConstructorTypeNode(node) || import_typescript9.default.isPropertySignature(node) || import_typescript9.default.isPropertyDeclaration(node) || import_typescript9.default.isMethodSignature(node) || import_typescript9.default.isMethodDeclaration(node) || import_typescript9.default.isConstructorDeclaration(node) || import_typescript9.default.isGetAccessorDeclaration(node) || import_typescript9.default.isSetAccessorDeclaration(node) || import_typescript9.default.isIndexSignatureDeclaration(node) || import_typescript9.default.isFunctionExpression(node) || import_typescript9.default.isArrowFunction(node) || import_typescript9.default.isClassExpression(node) || import_typescript9.default.isVariableStatement(node) || import_typescript9.default.isFunctionDeclaration(node) || import_typescript9.default.isClassDeclaration(node) || import_typescript9.default.isInterfaceDeclaration(node) || import_typescript9.default.isTypeAliasDeclaration(node) || import_typescript9.default.isEnumDeclaration(node) || import_typescript9.default.isModuleDeclaration(node) || import_typescript9.default.isImportEqualsDeclaration(node) || import_typescript9.default.isImportDeclaration(node) || import_typescript9.default.isExportAssignment(node) || import_typescript9.default.isExportDeclaration(node);
}
function hasType(node) {
  return isSignatureDeclaration(node) || import_typescript9.default.isVariableDeclaration(node) || import_typescript9.default.isParameter(node) || import_typescript9.default.isPropertySignature(node) || import_typescript9.default.isPropertyDeclaration(node) || import_typescript9.default.isTypePredicateNode(node) || import_typescript9.default.isParenthesizedTypeNode(node) || import_typescript9.default.isTypeOperatorNode(node) || import_typescript9.default.isMappedTypeNode(node) || import_typescript9.default.isAssertionExpression(node) || import_typescript9.default.isTypeAliasDeclaration(node) || import_typescript9.default.isJSDocTypeExpression(node) || import_typescript9.default.isJSDocNonNullableType(node) || import_typescript9.default.isJSDocNullableType(node) || import_typescript9.default.isJSDocOptionalType(node) || import_typescript9.default.isJSDocVariadicType(node);
}
function hasTypeArguments(node) {
  return import_typescript9.default.isCallExpression(node) || import_typescript9.default.isNewExpression(node) || import_typescript9.default.isTaggedTemplateExpression(node) || import_typescript9.default.isJsxOpeningElement(node) || import_typescript9.default.isJsxSelfClosingElement(node);
}
function isJSDocComment(node) {
  if (isJSDocText(node)) {
    return true;
  }
  if (isTsVersionAtLeast(4, 4)) {
    return import_typescript9.default.isJSDocLink(node) || import_typescript9.default.isJSDocLinkCode(node) || import_typescript9.default.isJSDocLinkPlain(node);
  }
  return false;
}
function isJSDocNamespaceBody(node) {
  return import_typescript9.default.isIdentifier(node) || isJSDocNamespaceDeclaration(node);
}
function isJSDocTypeReferencingNode(node) {
  return import_typescript9.default.isJSDocVariadicType(node) || import_typescript9.default.isJSDocOptionalType(node) || import_typescript9.default.isJSDocNullableType(node) || import_typescript9.default.isJSDocNonNullableType(node);
}
function isJsonObjectExpression(node) {
  return import_typescript9.default.isObjectLiteralExpression(node) || import_typescript9.default.isArrayLiteralExpression(node) || isJsonMinusNumericLiteral(node) || import_typescript9.default.isNumericLiteral(node) || import_typescript9.default.isStringLiteral(node) || isBooleanLiteral(node) || isNullLiteral(node);
}
function isJsxAttributeLike(node) {
  return import_typescript9.default.isJsxAttribute(node) || import_typescript9.default.isJsxSpreadAttribute(node);
}
function isJsxAttributeValue(node) {
  return import_typescript9.default.isStringLiteral(node) || import_typescript9.default.isJsxExpression(node) || import_typescript9.default.isJsxElement(node) || import_typescript9.default.isJsxSelfClosingElement(node) || import_typescript9.default.isJsxFragment(node);
}
function isJsxChild(node) {
  return import_typescript9.default.isJsxText(node) || import_typescript9.default.isJsxExpression(node) || import_typescript9.default.isJsxElement(node) || import_typescript9.default.isJsxSelfClosingElement(node) || import_typescript9.default.isJsxFragment(node);
}
function isJsxTagNameExpression(node) {
  return import_typescript9.default.isIdentifier(node) || isThisExpression(node) || isJsxTagNamePropertyAccess(node);
}
function isLiteralToken(node) {
  return import_typescript9.default.isNumericLiteral(node) || import_typescript9.default.isBigIntLiteral(node) || import_typescript9.default.isStringLiteral(node) || import_typescript9.default.isJsxText(node) || import_typescript9.default.isRegularExpressionLiteral(node) || import_typescript9.default.isNoSubstitutionTemplateLiteral(node);
}
function isModuleBody(node) {
  return isNamespaceBody(node) || isJSDocNamespaceBody(node);
}
function isModuleName(node) {
  return import_typescript9.default.isIdentifier(node) || import_typescript9.default.isStringLiteral(node);
}
function isModuleReference(node) {
  return import_typescript9.default.isEntityName(node) || import_typescript9.default.isExternalModuleReference(node);
}
function isNamedImportBindings(node) {
  return import_typescript9.default.isNamespaceImport(node) || import_typescript9.default.isNamedImports(node);
}
function isNamedImportsOrExports(node) {
  return import_typescript9.default.isNamedImports(node) || import_typescript9.default.isNamedExports(node);
}
function isNamespaceBody(node) {
  return import_typescript9.default.isModuleBlock(node) || isNamespaceDeclaration(node);
}
function isObjectBindingOrAssignmentElement(node) {
  return import_typescript9.default.isBindingElement(node) || import_typescript9.default.isPropertyAssignment(node) || import_typescript9.default.isShorthandPropertyAssignment(node) || import_typescript9.default.isSpreadAssignment(node);
}
function isObjectBindingOrAssignmentPattern(node) {
  return import_typescript9.default.isObjectBindingPattern(node) || import_typescript9.default.isObjectLiteralExpression(node);
}
function isObjectTypeDeclaration(node) {
  return (
    // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
    isClassLikeDeclaration(node) || import_typescript9.default.isInterfaceDeclaration(node) || import_typescript9.default.isTypeLiteralNode(node)
  );
}
function isParameterPropertyModifier(node) {
  return isAccessibilityModifier(node) || isReadonlyKeyword(node);
}
function isPropertyNameLiteral(node) {
  return import_typescript9.default.isIdentifier(node) || import_typescript9.default.isStringLiteralLike(node) || import_typescript9.default.isNumericLiteral(node);
}
function isPseudoLiteralToken(node) {
  return import_typescript9.default.isTemplateHead(node) || import_typescript9.default.isTemplateMiddle(node) || import_typescript9.default.isTemplateTail(node);
}
function isSignatureDeclaration(node) {
  return import_typescript9.default.isCallSignatureDeclaration(node) || import_typescript9.default.isConstructSignatureDeclaration(node) || import_typescript9.default.isMethodSignature(node) || import_typescript9.default.isIndexSignatureDeclaration(node) || import_typescript9.default.isFunctionTypeNode(node) || import_typescript9.default.isConstructorTypeNode(node) || import_typescript9.default.isJSDocFunctionType(node) || import_typescript9.default.isFunctionDeclaration(node) || import_typescript9.default.isMethodDeclaration(node) || import_typescript9.default.isConstructorDeclaration(node) || // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
  isAccessorDeclaration(node) || import_typescript9.default.isFunctionExpression(node) || import_typescript9.default.isArrowFunction(node);
}
function isSuperProperty(node) {
  return isSuperPropertyAccessExpression(node) || isSuperElementAccessExpression(node);
}
function isTypeOnlyCompatibleAliasDeclaration(node) {
  if (import_typescript9.default.isImportClause(node) || import_typescript9.default.isImportEqualsDeclaration(node) || import_typescript9.default.isNamespaceImport(node) || import_typescript9.default.isImportOrExportSpecifier(node)) {
    return true;
  }
  if (isTsVersionAtLeast(5, 0) && (import_typescript9.default.isExportDeclaration(node) || import_typescript9.default.isNamespaceExport(node))) {
    return true;
  }
  return false;
}
function isTypeReferenceType(node) {
  return import_typescript9.default.isTypeReferenceNode(node) || import_typescript9.default.isExpressionWithTypeArguments(node);
}
function isUnionOrIntersectionTypeNode(node) {
  return import_typescript9.default.isUnionTypeNode(node) || import_typescript9.default.isIntersectionTypeNode(node);
}
function isUnparsedSourceText(node) {
  return import_typescript9.default.isUnparsedPrepend(node) || import_typescript9.default.isUnparsedTextLike(node);
}
function isVariableLikeDeclaration(node) {
  return import_typescript9.default.isVariableDeclaration(node) || import_typescript9.default.isParameter(node) || import_typescript9.default.isBindingElement(node) || import_typescript9.default.isPropertyDeclaration(node) || import_typescript9.default.isPropertyAssignment(node) || import_typescript9.default.isPropertySignature(node) || import_typescript9.default.isJsxAttribute(node) || import_typescript9.default.isShorthandPropertyAssignment(node) || import_typescript9.default.isEnumMember(node) || import_typescript9.default.isJSDocPropertyTag(node) || import_typescript9.default.isJSDocParameterTag(node);
}

// src/nodes/typeGuards/compound.ts
function isConstAssertionExpression(node) {
  return import_typescript10.default.isTypeReferenceNode(node.type) && import_typescript10.default.isIdentifier(node.type.typeName) && node.type.typeName.escapedText === "const";
}
function isIterationStatement(node) {
  switch (node.kind) {
    case import_typescript10.default.SyntaxKind.DoStatement:
    case import_typescript10.default.SyntaxKind.ForInStatement:
    case import_typescript10.default.SyntaxKind.ForOfStatement:
    case import_typescript10.default.SyntaxKind.ForStatement:
    case import_typescript10.default.SyntaxKind.WhileStatement:
      return true;
    default:
      return false;
  }
}
function isJSDocNamespaceDeclaration(node) {
  return import_typescript10.default.isModuleDeclaration(node) && import_typescript10.default.isIdentifier(node.name) && (node.body === void 0 || isJSDocNamespaceBody(node.body));
}
function isJsxTagNamePropertyAccess(node) {
  return import_typescript10.default.isPropertyAccessExpression(node) && // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts < 5
  isJsxTagNameExpression(node.expression);
}
function isNamedDeclarationWithName(node) {
  return "name" in node && node.name !== void 0 && node.name !== null && isDeclarationName(node.name);
}
function isNamespaceDeclaration(node) {
  return import_typescript10.default.isModuleDeclaration(node) && import_typescript10.default.isIdentifier(node.name) && node.body !== void 0 && isNamespaceBody(node.body);
}
function isNumericOrStringLikeLiteral(node) {
  switch (node.kind) {
    case import_typescript10.default.SyntaxKind.StringLiteral:
    case import_typescript10.default.SyntaxKind.NumericLiteral:
    case import_typescript10.default.SyntaxKind.NoSubstitutionTemplateLiteral:
      return true;
    default:
      return false;
  }
}
function isPropertyAccessEntityNameExpression(node) {
  return import_typescript10.default.isPropertyAccessExpression(node) && import_typescript10.default.isIdentifier(node.name) && isEntityNameExpression(node.expression);
}
function isSuperElementAccessExpression(node) {
  return import_typescript10.default.isElementAccessExpression(node) && isSuperExpression(node.expression);
}
function isSuperPropertyAccessExpression(node) {
  return import_typescript10.default.isPropertyAccessExpression(node) && isSuperExpression(node.expression);
}

// src/scopes.ts
var import_typescript11 = __toESM(require("typescript"), 1);
function isFunctionScopeBoundary(node) {
  switch (node.kind) {
    case import_typescript11.default.SyntaxKind.FunctionExpression:
    case import_typescript11.default.SyntaxKind.ArrowFunction:
    case import_typescript11.default.SyntaxKind.Constructor:
    case import_typescript11.default.SyntaxKind.ModuleDeclaration:
    case import_typescript11.default.SyntaxKind.ClassDeclaration:
    case import_typescript11.default.SyntaxKind.ClassExpression:
    case import_typescript11.default.SyntaxKind.EnumDeclaration:
    case import_typescript11.default.SyntaxKind.MethodDeclaration:
    case import_typescript11.default.SyntaxKind.FunctionDeclaration:
    case import_typescript11.default.SyntaxKind.GetAccessor:
    case import_typescript11.default.SyntaxKind.SetAccessor:
    case import_typescript11.default.SyntaxKind.MethodSignature:
    case import_typescript11.default.SyntaxKind.CallSignature:
    case import_typescript11.default.SyntaxKind.ConstructSignature:
    case import_typescript11.default.SyntaxKind.ConstructorType:
    case import_typescript11.default.SyntaxKind.FunctionType:
      return true;
    case import_typescript11.default.SyntaxKind.SourceFile:
      return import_typescript11.default.isExternalModule(node);
    default:
      return false;
  }
}

// src/types/getters.ts
var import_typescript16 = __toESM(require("typescript"), 1);

// src/types/typeGuards/intrinsic.ts
var import_typescript12 = __toESM(require("typescript"), 1);
function isIntrinsicAnyType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.Any);
}
function isIntrinsicBooleanType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.Boolean);
}
function isIntrinsicBigIntType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.BigInt);
}
function isIntrinsicErrorType(type) {
  return isIntrinsicType(type) && type.intrinsicName === "error";
}
function isIntrinsicESSymbolType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.ESSymbol);
}
var IntrinsicTypeFlags = import_typescript12.default.TypeFlags.Intrinsic ?? import_typescript12.default.TypeFlags.Any | import_typescript12.default.TypeFlags.Unknown | import_typescript12.default.TypeFlags.String | import_typescript12.default.TypeFlags.Number | import_typescript12.default.TypeFlags.BigInt | import_typescript12.default.TypeFlags.Boolean | import_typescript12.default.TypeFlags.BooleanLiteral | import_typescript12.default.TypeFlags.ESSymbol | import_typescript12.default.TypeFlags.Void | import_typescript12.default.TypeFlags.Undefined | import_typescript12.default.TypeFlags.Null | import_typescript12.default.TypeFlags.Never | import_typescript12.default.TypeFlags.NonPrimitive;
function isIntrinsicType(type) {
  return isTypeFlagSet(type, IntrinsicTypeFlags);
}
function isIntrinsicNeverType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.Never);
}
function isIntrinsicNonPrimitiveType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.NonPrimitive);
}
function isIntrinsicNullType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.Null);
}
function isIntrinsicNumberType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.Number);
}
function isIntrinsicStringType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.String);
}
function isIntrinsicUndefinedType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.Undefined);
}
function isIntrinsicUnknownType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.Unknown);
}
function isIntrinsicVoidType(type) {
  return isTypeFlagSet(type, import_typescript12.default.TypeFlags.Void);
}

// src/types/typeGuards/objects.ts
var import_typescript14 = __toESM(require("typescript"), 1);

// src/types/typeGuards/single.ts
var import_typescript13 = __toESM(require("typescript"), 1);
function isConditionalType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Conditional);
}
function isEnumType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Enum);
}
function isFreshableType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Freshable);
}
function isIndexType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Index);
}
function isIndexedAccessType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.IndexedAccess);
}
function isInstantiableType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Instantiable);
}
function isIntersectionType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Intersection);
}
function isObjectType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Object);
}
function isStringMappingType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.StringMapping);
}
function isSubstitutionType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Substitution);
}
function isTypeParameter(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.TypeParameter);
}
function isTypeVariable(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.TypeVariable);
}
function isUnionType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.Union);
}
function isUnionOrIntersectionType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.UnionOrIntersection);
}
function isUniqueESSymbolType(type) {
  return isTypeFlagSet(type, import_typescript13.default.TypeFlags.UniqueESSymbol);
}

// src/types/typeGuards/objects.ts
function isEvolvingArrayType(type) {
  return isObjectType(type) && isObjectFlagSet(type, import_typescript14.default.ObjectFlags.EvolvingArray);
}
function isTupleType(type) {
  return isObjectType(type) && isObjectFlagSet(type, import_typescript14.default.ObjectFlags.Tuple);
}
function isTypeReference(type) {
  return isObjectType(type) && isObjectFlagSet(type, import_typescript14.default.ObjectFlags.Reference);
}

// src/types/typeGuards/compound.ts
function isFreshableIntrinsicType(type) {
  return isIntrinsicType(type) && isFreshableType(type);
}
function isTupleTypeReference(type) {
  return isTypeReference(type) && isTupleType(type.target);
}

// src/types/typeGuards/literal.ts
var import_typescript15 = __toESM(require("typescript"), 1);
function isBooleanLiteralType(type) {
  return isTypeFlagSet(type, import_typescript15.default.TypeFlags.BooleanLiteral);
}
function isBigIntLiteralType(type) {
  return isTypeFlagSet(type, import_typescript15.default.TypeFlags.BigIntLiteral);
}
function isFalseLiteralType(type) {
  return isBooleanLiteralType(type) && type.intrinsicName === "false";
}
function isLiteralType(type) {
  return isTypeFlagSet(type, import_typescript15.default.TypeFlags.Literal);
}
function isNumberLiteralType(type) {
  return isTypeFlagSet(type, import_typescript15.default.TypeFlags.NumberLiteral);
}
function isStringLiteralType(type) {
  return isTypeFlagSet(type, import_typescript15.default.TypeFlags.StringLiteral);
}
function isTemplateLiteralType(type) {
  return isTypeFlagSet(type, import_typescript15.default.TypeFlags.TemplateLiteral);
}
function isTrueLiteralType(type) {
  return isBooleanLiteralType(type) && type.intrinsicName === "true";
}
function isUnknownLiteralType(type) {
  return isTypeFlagSet(type, import_typescript15.default.TypeFlags.Literal);
}

// src/types/getters.ts
function getCallSignaturesOfType(type) {
  if (isUnionType(type)) {
    const signatures = [];
    for (const subType of type.types) {
      signatures.push(...getCallSignaturesOfType(subType));
    }
    return signatures;
  }
  if (isIntersectionType(type)) {
    let signatures;
    for (const subType of type.types) {
      const sig = getCallSignaturesOfType(subType);
      if (sig.length !== 0) {
        if (signatures !== void 0) {
          return [];
        }
        signatures = sig;
      }
    }
    return signatures === void 0 ? [] : signatures;
  }
  return type.getCallSignatures();
}
function getPropertyOfType(type, name) {
  if (!name.startsWith("__")) {
    return type.getProperty(name);
  }
  return type.getProperties().find((s) => s.escapedName === name);
}
function getWellKnownSymbolPropertyOfType(type, wellKnownSymbolName, typeChecker) {
  const prefix = "__@" + wellKnownSymbolName;
  for (const prop of type.getProperties()) {
    if (!prop.name.startsWith(prefix)) {
      continue;
    }
    const declaration = prop.valueDeclaration ?? prop.getDeclarations()[0];
    if (!isNamedDeclarationWithName(declaration) || declaration.name === void 0 || !import_typescript16.default.isComputedPropertyName(declaration.name)) {
      continue;
    }
    const globalSymbol = typeChecker.getApparentType(
      typeChecker.getTypeAtLocation(declaration.name.expression)
    ).symbol;
    if (prop.escapedName === getPropertyNameOfWellKnownSymbol(
      typeChecker,
      globalSymbol,
      wellKnownSymbolName
    )) {
      return prop;
    }
  }
  return void 0;
}
function getPropertyNameOfWellKnownSymbol(typeChecker, symbolConstructor, symbolName) {
  const knownSymbol = symbolConstructor && typeChecker.getTypeOfSymbolAtLocation(
    symbolConstructor,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    symbolConstructor.valueDeclaration
  ).getProperty(symbolName);
  const knownSymbolType = knownSymbol && typeChecker.getTypeOfSymbolAtLocation(
    knownSymbol,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    knownSymbol.valueDeclaration
  );
  if (knownSymbolType && isUniqueESSymbolType(knownSymbolType)) {
    return knownSymbolType.escapedName;
  }
  return "__@" + symbolName;
}

// src/types/utilities.ts
var import_semver = __toESM(require_semver2(), 1);
var import_typescript18 = __toESM(require("typescript"), 1);

// src/nodes/utilities.ts
var import_typescript17 = __toESM(require("typescript"), 1);
function isBindableObjectDefinePropertyCall(node) {
  return node.arguments.length === 3 && isEntityNameExpression(node.arguments[0]) && isNumericOrStringLikeLiteral(node.arguments[1]) && import_typescript17.default.isPropertyAccessExpression(node.expression) && node.expression.name.escapedText === "defineProperty" && import_typescript17.default.isIdentifier(node.expression.expression) && node.expression.expression.escapedText === "Object";
}
function isInConstContext(node, typeChecker) {
  let current = node;
  while (true) {
    const parent = current.parent;
    outer:
      switch (parent.kind) {
        case import_typescript17.default.SyntaxKind.TypeAssertionExpression:
        case import_typescript17.default.SyntaxKind.AsExpression:
          return isConstAssertionExpression(parent);
        case import_typescript17.default.SyntaxKind.PrefixUnaryExpression:
          if (current.kind !== import_typescript17.default.SyntaxKind.NumericLiteral) {
            return false;
          }
          switch (parent.operator) {
            case import_typescript17.default.SyntaxKind.PlusToken:
            case import_typescript17.default.SyntaxKind.MinusToken:
              current = parent;
              break outer;
            default:
              return false;
          }
        case import_typescript17.default.SyntaxKind.PropertyAssignment:
          if (parent.initializer !== current) {
            return false;
          }
          current = parent.parent;
          break;
        case import_typescript17.default.SyntaxKind.ShorthandPropertyAssignment:
          current = parent.parent;
          break;
        case import_typescript17.default.SyntaxKind.ParenthesizedExpression:
        case import_typescript17.default.SyntaxKind.ArrayLiteralExpression:
        case import_typescript17.default.SyntaxKind.ObjectLiteralExpression:
        case import_typescript17.default.SyntaxKind.TemplateExpression:
          current = parent;
          break;
        case import_typescript17.default.SyntaxKind.CallExpression:
          if (!import_typescript17.default.isExpression(current)) {
            return false;
          }
          const functionSignature = typeChecker.getResolvedSignature(
            parent
          );
          if (functionSignature === void 0) {
            return false;
          }
          const argumentIndex = parent.arguments.indexOf(
            current
          );
          if (argumentIndex < 0) {
            return false;
          }
          const parameterSymbol = functionSignature.getParameters()[argumentIndex];
          if (parameterSymbol === void 0 || !("links" in parameterSymbol)) {
            return false;
          }
          const parameterSymbolLinks = parameterSymbol.links;
          const propertySymbol = parameterSymbolLinks.type?.getProperties()?.[argumentIndex];
          if (propertySymbol === void 0 || !("links" in propertySymbol)) {
            return false;
          }
          return isTransientSymbolLinksFlagSet(
            propertySymbol.links,
            import_typescript17.default.CheckFlags.Readonly
          );
        default:
          return false;
      }
  }
}

// src/types/utilities.ts
function isFalsyType(type) {
  if (isTypeFlagSet(
    type,
    import_typescript18.default.TypeFlags.Undefined | import_typescript18.default.TypeFlags.Null | import_typescript18.default.TypeFlags.Void
  )) {
    return true;
  }
  if (typeIsLiteral(type)) {
    if (typeof type.value === "object") {
      return type.value.base10Value === "0";
    } else {
      return !type.value;
    }
  }
  return isFalseLiteralType(type);
}
function intersectionTypeParts(type) {
  return isIntersectionType(type) ? type.types : [type];
}
function typeParts(type) {
  return isIntersectionType(type) || isUnionType(type) ? type.types : [type];
}
function isReadonlyPropertyIntersection(type, name, typeChecker) {
  const typeParts2 = isIntersectionType(type) ? type.types : [type];
  return typeParts2.some((subType) => {
    const prop = getPropertyOfType(subType, name);
    if (prop === void 0) {
      return false;
    }
    if (prop.flags & import_typescript18.default.SymbolFlags.Transient) {
      if (/^(?:[1-9]\d*|0)$/.test(name) && isTupleTypeReference(subType)) {
        return subType.target.readonly;
      }
      switch (isReadonlyPropertyFromMappedType(subType, name, typeChecker)) {
        case true:
          return true;
        case false:
          return false;
        default:
      }
    }
    return !!// members of namespace import
    (isSymbolFlagSet(prop, import_typescript18.default.SymbolFlags.ValueModule) || // we unwrapped every mapped type, now we can check the actual declarations
    symbolHasReadonlyDeclaration(prop, typeChecker));
  });
}
function isReadonlyPropertyFromMappedType(type, name, typeChecker) {
  if (!isObjectType(type) || !isObjectFlagSet(type, import_typescript18.default.ObjectFlags.Mapped)) {
    return;
  }
  const declaration = type.symbol.declarations[0];
  if (declaration.readonlyToken !== void 0 && !/^__@[^@]+$/.test(name)) {
    return declaration.readonlyToken.kind !== import_typescript18.default.SyntaxKind.MinusToken;
  }
  const { modifiersType } = type;
  return modifiersType && isPropertyReadonlyInType(modifiersType, name, typeChecker);
}
function isCallback(typeChecker, param, node) {
  let type = typeChecker.getApparentType(
    typeChecker.getTypeOfSymbolAtLocation(param, node)
  );
  if (param.valueDeclaration.dotDotDotToken) {
    type = type.getNumberIndexType();
    if (type === void 0) {
      return false;
    }
  }
  for (const subType of unionTypeParts(type)) {
    if (subType.getCallSignatures().length !== 0) {
      return true;
    }
  }
  return false;
}
function isPropertyReadonlyInType(type, name, typeChecker) {
  let seenProperty = false;
  let seenReadonlySignature = false;
  for (const subType of unionTypeParts(type)) {
    if (getPropertyOfType(subType, name) === void 0) {
      const index = (isNumericPropertyName(name) ? typeChecker.getIndexInfoOfType(subType, import_typescript18.default.IndexKind.Number) : void 0) ?? typeChecker.getIndexInfoOfType(subType, import_typescript18.default.IndexKind.String);
      if (index?.isReadonly) {
        if (seenProperty) {
          return true;
        }
        seenReadonlySignature = true;
      }
    } else if (seenReadonlySignature || isReadonlyPropertyIntersection(subType, name, typeChecker)) {
      return true;
    } else {
      seenProperty = true;
    }
  }
  return false;
}
function isReadonlyAssignmentDeclaration(node, typeChecker) {
  if (!isBindableObjectDefinePropertyCall(node)) {
    return false;
  }
  const descriptorType = typeChecker.getTypeAtLocation(node.arguments[2]);
  if (descriptorType.getProperty("value") === void 0) {
    return descriptorType.getProperty("set") === void 0;
  }
  const writableProp = descriptorType.getProperty("writable");
  if (writableProp === void 0) {
    return false;
  }
  const writableType = writableProp.valueDeclaration !== void 0 && import_typescript18.default.isPropertyAssignment(writableProp.valueDeclaration) ? typeChecker.getTypeAtLocation(writableProp.valueDeclaration.initializer) : typeChecker.getTypeOfSymbolAtLocation(writableProp, node.arguments[2]);
  return isFalseLiteralType(writableType);
}
function isThenableType(typeChecker, node, type = typeChecker.getTypeAtLocation(node)) {
  for (const typePart of unionTypeParts(typeChecker.getApparentType(type))) {
    const then = typePart.getProperty("then");
    if (then === void 0) {
      continue;
    }
    const thenType = typeChecker.getTypeOfSymbolAtLocation(then, node);
    for (const subTypePart of unionTypeParts(thenType)) {
      for (const signature of subTypePart.getCallSignatures()) {
        if (signature.parameters.length !== 0 && isCallback(typeChecker, signature.parameters[0], node)) {
          return true;
        }
      }
    }
  }
  return false;
}
function symbolHasReadonlyDeclaration(symbol, typeChecker) {
  return !!((symbol.flags & import_typescript18.default.SymbolFlags.Accessor) === import_typescript18.default.SymbolFlags.GetAccessor || symbol.declarations?.some(
    (node) => isModifierFlagSet(node, import_typescript18.default.ModifierFlags.Readonly) || import_typescript18.default.isVariableDeclaration(node) && isNodeFlagSet(node.parent, import_typescript18.default.NodeFlags.Const) || import_typescript18.default.isCallExpression(node) && isReadonlyAssignmentDeclaration(node, typeChecker) || import_typescript18.default.isEnumMember(node) || (import_typescript18.default.isPropertyAssignment(node) || import_typescript18.default.isShorthandPropertyAssignment(node)) && isInConstContext(node, typeChecker)
  ));
}
function unionTypeParts(type) {
  return isUnionType(type) ? type.types : [type];
}
function typeIsLiteral(type) {
  if (import_semver.default.lt(import_typescript18.default.version, "5.0.0")) {
    return isTypeFlagSet(
      type,
      import_typescript18.default.TypeFlags.StringLiteral | import_typescript18.default.TypeFlags.NumberLiteral | import_typescript18.default.TypeFlags.BigIntLiteral
    );
  } else {
    return type.isLiteral();
  }
}

// src/usage/UsageWalker.ts
var import_typescript24 = __toESM(require("typescript"), 1);

// src/usage/Scope.ts
var import_typescript19 = __toESM(require("typescript"), 1);
function isBlockScopeBoundary(node) {
  switch (node.kind) {
    case import_typescript19.default.SyntaxKind.Block: {
      const parent = node.parent;
      return parent.kind !== import_typescript19.default.SyntaxKind.CatchClause && // blocks inside SourceFile are block scope boundaries
      (parent.kind === import_typescript19.default.SyntaxKind.SourceFile || // blocks that are direct children of a function scope boundary are no scope boundary
      // for example the FunctionBlock is part of the function scope of the containing function
      !isFunctionScopeBoundary(parent)) ? 2 /* Block */ : 0 /* None */;
    }
    case import_typescript19.default.SyntaxKind.ForStatement:
    case import_typescript19.default.SyntaxKind.ForInStatement:
    case import_typescript19.default.SyntaxKind.ForOfStatement:
    case import_typescript19.default.SyntaxKind.CaseBlock:
    case import_typescript19.default.SyntaxKind.CatchClause:
    case import_typescript19.default.SyntaxKind.WithStatement:
      return 2 /* Block */;
    default:
      return 0 /* None */;
  }
}

// src/usage/declarations.ts
var import_typescript21 = __toESM(require("typescript"), 1);

// src/usage/utils.ts
var import_typescript20 = __toESM(require("typescript"), 1);
function identifierToKeywordKind(node) {
  return "identifierToKeywordKind" in import_typescript20.default ? import_typescript20.default.identifierToKeywordKind(node) : (
    // eslint-disable-next-line deprecation/deprecation
    node.originalKeywordKind
  );
}
function canHaveDecorators(node) {
  return "canHaveDecorators" in import_typescript20.default ? import_typescript20.default.canHaveDecorators(node) : "decorators" in node;
}
function getDecorators(node) {
  return "getDecorators" in import_typescript20.default ? import_typescript20.default.getDecorators(node) : node.decorators;
}

// src/usage/declarations.ts
var DeclarationDomain = /* @__PURE__ */ ((DeclarationDomain2) => {
  DeclarationDomain2[DeclarationDomain2["Import"] = 8] = "Import";
  DeclarationDomain2[DeclarationDomain2["Namespace"] = 1] = "Namespace";
  DeclarationDomain2[DeclarationDomain2["Type"] = 2] = "Type";
  DeclarationDomain2[DeclarationDomain2["Value"] = 4] = "Value";
  DeclarationDomain2[DeclarationDomain2["Any"] = 7] = "Any";
  return DeclarationDomain2;
})(DeclarationDomain || {});
function getDeclarationDomain(node) {
  switch (node.parent.kind) {
    case import_typescript21.default.SyntaxKind.TypeParameter:
    case import_typescript21.default.SyntaxKind.InterfaceDeclaration:
    case import_typescript21.default.SyntaxKind.TypeAliasDeclaration:
      return 2 /* Type */;
    case import_typescript21.default.SyntaxKind.ClassDeclaration:
    case import_typescript21.default.SyntaxKind.ClassExpression:
      return 2 /* Type */ | 4 /* Value */;
    case import_typescript21.default.SyntaxKind.EnumDeclaration:
      return 7 /* Any */;
    case import_typescript21.default.SyntaxKind.NamespaceImport:
    case import_typescript21.default.SyntaxKind.ImportClause:
      return 7 /* Any */ | 8 /* Import */;
    case import_typescript21.default.SyntaxKind.ImportEqualsDeclaration:
    case import_typescript21.default.SyntaxKind.ImportSpecifier:
      return node.parent.name === node ? 7 /* Any */ | 8 /* Import */ : void 0;
    case import_typescript21.default.SyntaxKind.ModuleDeclaration:
      return 1 /* Namespace */;
    case import_typescript21.default.SyntaxKind.Parameter:
      if (node.parent.parent.kind === import_typescript21.default.SyntaxKind.IndexSignature || identifierToKeywordKind(node) === import_typescript21.default.SyntaxKind.ThisKeyword) {
        return;
      }
    case import_typescript21.default.SyntaxKind.BindingElement:
    case import_typescript21.default.SyntaxKind.VariableDeclaration:
      return node.parent.name === node ? 4 /* Value */ : void 0;
    case import_typescript21.default.SyntaxKind.FunctionDeclaration:
    case import_typescript21.default.SyntaxKind.FunctionExpression:
      return 4 /* Value */;
  }
}

// src/usage/getPropertyName.ts
var import_typescript22 = __toESM(require("typescript"), 1);
function unwrapParentheses(node) {
  while (node.kind === import_typescript22.default.SyntaxKind.ParenthesizedExpression) {
    node = node.expression;
  }
  return node;
}
function getPropertyName(propertyName) {
  if (propertyName.kind === import_typescript22.default.SyntaxKind.ComputedPropertyName) {
    const expression = unwrapParentheses(propertyName.expression);
    if (import_typescript22.default.isPrefixUnaryExpression(expression)) {
      let negate = false;
      switch (expression.operator) {
        case import_typescript22.default.SyntaxKind.MinusToken:
          negate = true;
        case import_typescript22.default.SyntaxKind.PlusToken:
          return import_typescript22.default.isNumericLiteral(expression.operand) ? `${negate ? "-" : ""}${expression.operand.text}` : import_typescript22.default.isBigIntLiteral(expression.operand) ? `${negate ? "-" : ""}${expression.operand.text.slice(0, -1)}` : void 0;
        default:
          return;
      }
    }
    if (import_typescript22.default.isBigIntLiteral(expression)) {
      return expression.text.slice(0, -1);
    }
    if (isNumericOrStringLikeLiteral(expression)) {
      return expression.text;
    }
    return;
  }
  return propertyName.kind === import_typescript22.default.SyntaxKind.PrivateIdentifier ? void 0 : propertyName.text;
}

// src/usage/getUsageDomain.ts
var import_typescript23 = __toESM(require("typescript"), 1);
var UsageDomain = /* @__PURE__ */ ((UsageDomain2) => {
  UsageDomain2[UsageDomain2["Namespace"] = 1] = "Namespace";
  UsageDomain2[UsageDomain2["Type"] = 2] = "Type";
  UsageDomain2[UsageDomain2["TypeQuery"] = 8] = "TypeQuery";
  UsageDomain2[UsageDomain2["Value"] = 4] = "Value";
  UsageDomain2[UsageDomain2["ValueOrNamespace"] = 5] = "ValueOrNamespace";
  UsageDomain2[UsageDomain2["Any"] = 7] = "Any";
  return UsageDomain2;
})(UsageDomain || {});
function getUsageDomain(node) {
  const parent = node.parent;
  switch (parent.kind) {
    case import_typescript23.default.SyntaxKind.TypeReference:
      return identifierToKeywordKind(node) !== import_typescript23.default.SyntaxKind.ConstKeyword ? 2 /* Type */ : void 0;
    case import_typescript23.default.SyntaxKind.ExpressionWithTypeArguments:
      return parent.parent.token === import_typescript23.default.SyntaxKind.ImplementsKeyword || parent.parent.parent.kind === import_typescript23.default.SyntaxKind.InterfaceDeclaration ? 2 /* Type */ : 4 /* Value */;
    case import_typescript23.default.SyntaxKind.TypeQuery:
      return 5 /* ValueOrNamespace */ | 8 /* TypeQuery */;
    case import_typescript23.default.SyntaxKind.QualifiedName:
      if (parent.left === node) {
        if (getEntityNameParent(parent).kind === import_typescript23.default.SyntaxKind.TypeQuery) {
          return 1 /* Namespace */ | 8 /* TypeQuery */;
        }
        return 1 /* Namespace */;
      }
      break;
    case import_typescript23.default.SyntaxKind.ExportSpecifier:
      if (parent.propertyName === void 0 || parent.propertyName === node) {
        return 7 /* Any */;
      }
      break;
    case import_typescript23.default.SyntaxKind.ExportAssignment:
      return 7 /* Any */;
    case import_typescript23.default.SyntaxKind.BindingElement:
      if (parent.initializer === node) {
        return 5 /* ValueOrNamespace */;
      }
      break;
    case import_typescript23.default.SyntaxKind.Parameter:
    case import_typescript23.default.SyntaxKind.EnumMember:
    case import_typescript23.default.SyntaxKind.PropertyDeclaration:
    case import_typescript23.default.SyntaxKind.VariableDeclaration:
    case import_typescript23.default.SyntaxKind.PropertyAssignment:
    case import_typescript23.default.SyntaxKind.PropertyAccessExpression:
    case import_typescript23.default.SyntaxKind.ImportEqualsDeclaration:
      if (parent.name !== node) {
        return 5 /* ValueOrNamespace */;
      }
      break;
    case import_typescript23.default.SyntaxKind.JsxAttribute:
    case import_typescript23.default.SyntaxKind.FunctionDeclaration:
    case import_typescript23.default.SyntaxKind.FunctionExpression:
    case import_typescript23.default.SyntaxKind.NamespaceImport:
    case import_typescript23.default.SyntaxKind.ClassDeclaration:
    case import_typescript23.default.SyntaxKind.ClassExpression:
    case import_typescript23.default.SyntaxKind.ModuleDeclaration:
    case import_typescript23.default.SyntaxKind.MethodDeclaration:
    case import_typescript23.default.SyntaxKind.EnumDeclaration:
    case import_typescript23.default.SyntaxKind.GetAccessor:
    case import_typescript23.default.SyntaxKind.SetAccessor:
    case import_typescript23.default.SyntaxKind.LabeledStatement:
    case import_typescript23.default.SyntaxKind.BreakStatement:
    case import_typescript23.default.SyntaxKind.ContinueStatement:
    case import_typescript23.default.SyntaxKind.ImportClause:
    case import_typescript23.default.SyntaxKind.ImportSpecifier:
    case import_typescript23.default.SyntaxKind.TypePredicate:
    case import_typescript23.default.SyntaxKind.MethodSignature:
    case import_typescript23.default.SyntaxKind.PropertySignature:
    case import_typescript23.default.SyntaxKind.NamespaceExportDeclaration:
    case import_typescript23.default.SyntaxKind.NamespaceExport:
    case import_typescript23.default.SyntaxKind.InterfaceDeclaration:
    case import_typescript23.default.SyntaxKind.TypeAliasDeclaration:
    case import_typescript23.default.SyntaxKind.TypeParameter:
    case import_typescript23.default.SyntaxKind.NamedTupleMember:
      break;
    default:
      return 5 /* ValueOrNamespace */;
  }
}
function getEntityNameParent(name) {
  let parent = name.parent;
  while (parent.kind === import_typescript23.default.SyntaxKind.QualifiedName) {
    parent = parent.parent;
  }
  return parent;
}

// src/usage/scopes.ts
var _enumScopes;
var AbstractScope = class {
  constructor(global) {
    this.global = global;
    __privateAdd(this, _enumScopes, void 0);
    this.namespaceScopes = void 0;
    this.uses = [];
    this.variables = /* @__PURE__ */ new Map();
  }
  addUse(use) {
    this.uses.push(use);
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  addUseToParent(_use) {
  }
  addVariable(identifier, name, selector, exported, domain) {
    const variables = this.getDestinationScope(selector).getVariables();
    const declaration = {
      declaration: name,
      domain,
      exported
    };
    const variable = variables.get(identifier);
    if (variable === void 0) {
      variables.set(identifier, {
        declarations: [declaration],
        domain,
        uses: []
      });
    } else {
      variable.domain |= domain;
      variable.declarations.push(declaration);
    }
  }
  applyUse(use, variables = this.variables) {
    const variable = variables.get(use.location.text);
    if (variable === void 0 || (variable.domain & use.domain) === 0) {
      return false;
    }
    variable.uses.push(use);
    return true;
  }
  applyUses() {
    for (const use of this.uses) {
      if (!this.applyUse(use)) {
        this.addUseToParent(use);
      }
    }
    this.uses = [];
  }
  createOrReuseEnumScope(name, _exported) {
    let scope;
    if (__privateGet(this, _enumScopes) === void 0) {
      __privateSet(this, _enumScopes, /* @__PURE__ */ new Map());
    } else {
      scope = __privateGet(this, _enumScopes).get(name);
    }
    if (scope === void 0) {
      scope = new EnumScope(this);
      __privateGet(this, _enumScopes).set(name, scope);
    }
    return scope;
  }
  // only relevant for the root scope
  createOrReuseNamespaceScope(name, _exported, ambient, hasExportStatement) {
    let scope;
    if (this.namespaceScopes === void 0) {
      this.namespaceScopes = /* @__PURE__ */ new Map();
    } else {
      scope = this.namespaceScopes.get(name);
    }
    if (scope === void 0) {
      scope = new NamespaceScope(ambient, hasExportStatement, this);
      this.namespaceScopes.set(name, scope);
    } else {
      scope.refresh(ambient, hasExportStatement);
    }
    return scope;
  }
  end(cb) {
    if (this.namespaceScopes !== void 0) {
      this.namespaceScopes.forEach((value) => value.finish(cb));
    }
    this.namespaceScopes = __privateSet(this, _enumScopes, void 0);
    this.applyUses();
    this.variables.forEach((variable) => {
      for (const declaration of variable.declarations) {
        const result = {
          declarations: [],
          domain: declaration.domain,
          exported: declaration.exported,
          inGlobalScope: this.global,
          uses: []
        };
        for (const other of variable.declarations) {
          if (other.domain & declaration.domain) {
            result.declarations.push(other.declaration);
          }
        }
        for (const use of variable.uses) {
          if (use.domain & declaration.domain) {
            result.uses.push(use);
          }
        }
        cb(result, declaration.declaration, this);
      }
    });
  }
  getFunctionScope() {
    return this;
  }
  getVariables() {
    return this.variables;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  markExported(_name2) {
  }
};
_enumScopes = new WeakMap();
var NonRootScope = class extends AbstractScope {
  constructor(parent, boundary) {
    super(false);
    this.parent = parent;
    this.boundary = boundary;
  }
  addUseToParent(use) {
    return this.parent.addUse(use, this);
  }
  getDestinationScope(selector) {
    return this.boundary & selector ? this : this.parent.getDestinationScope(selector);
  }
};
var EnumScope = class extends NonRootScope {
  constructor(parent) {
    super(parent, 1 /* Function */);
  }
  end() {
    this.applyUses();
  }
};
var _exportAll, _exports, _innerScope;
var RootScope = class extends AbstractScope {
  constructor(exportAll, global) {
    super(global);
    __privateAdd(this, _exportAll, void 0);
    __privateAdd(this, _exports, void 0);
    __privateAdd(this, _innerScope, new NonRootScope(this, 1 /* Function */));
    __privateSet(this, _exportAll, exportAll);
  }
  addUse(use, origin) {
    if (origin === __privateGet(this, _innerScope)) {
      return super.addUse(use);
    }
    return __privateGet(this, _innerScope).addUse(use);
  }
  addVariable(identifier, name, selector, exported, domain) {
    if (domain & 8 /* Import */) {
      return super.addVariable(identifier, name, selector, exported, domain);
    }
    return __privateGet(this, _innerScope).addVariable(
      identifier,
      name,
      selector,
      exported,
      domain
    );
  }
  end(cb) {
    __privateGet(this, _innerScope).end((value, key) => {
      value.exported ||= __privateGet(this, _exportAll) || __privateGet(this, _exports) !== void 0 && __privateGet(this, _exports).includes(key.text);
      value.inGlobalScope = this.global;
      return cb(value, key, this);
    });
    return super.end((value, key, scope) => {
      value.exported ||= scope === this && __privateGet(this, _exports) !== void 0 && __privateGet(this, _exports).includes(key.text);
      return cb(value, key, scope);
    });
  }
  getDestinationScope() {
    return this;
  }
  markExported(id) {
    if (__privateGet(this, _exports) === void 0) {
      __privateSet(this, _exports, [id.text]);
    } else {
      __privateGet(this, _exports).push(id.text);
    }
  }
};
_exportAll = new WeakMap();
_exports = new WeakMap();
_innerScope = new WeakMap();
var _ambient, _exports2, _hasExport, _innerScope2;
var NamespaceScope = class extends NonRootScope {
  constructor(ambient, hasExport, parent) {
    super(parent, 1 /* Function */);
    __privateAdd(this, _ambient, void 0);
    __privateAdd(this, _exports2, void 0);
    __privateAdd(this, _hasExport, void 0);
    __privateAdd(this, _innerScope2, new NonRootScope(this, 1 /* Function */));
    __privateSet(this, _ambient, ambient);
    __privateSet(this, _hasExport, hasExport);
  }
  addUse(use, source) {
    if (source !== __privateGet(this, _innerScope2)) {
      return __privateGet(this, _innerScope2).addUse(use);
    }
    this.uses.push(use);
  }
  createOrReuseEnumScope(name, exported) {
    if (!exported && (!__privateGet(this, _ambient) || __privateGet(this, _hasExport))) {
      return __privateGet(this, _innerScope2).createOrReuseEnumScope(name, exported);
    }
    return super.createOrReuseEnumScope(name, exported);
  }
  createOrReuseNamespaceScope(name, exported, ambient, hasExportStatement) {
    if (!exported && (!__privateGet(this, _ambient) || __privateGet(this, _hasExport))) {
      return __privateGet(this, _innerScope2).createOrReuseNamespaceScope(
        name,
        exported,
        ambient || __privateGet(this, _ambient),
        hasExportStatement
      );
    }
    return super.createOrReuseNamespaceScope(
      name,
      exported,
      ambient || __privateGet(this, _ambient),
      hasExportStatement
    );
  }
  end(cb) {
    __privateGet(this, _innerScope2).end((variable, key, scope) => {
      if (scope !== __privateGet(this, _innerScope2) || !variable.exported && (!__privateGet(this, _ambient) || __privateGet(this, _exports2) !== void 0 && !__privateGet(this, _exports2).has(key.text))) {
        return cb(variable, key, scope);
      }
      const namespaceVar = this.variables.get(key.text);
      if (namespaceVar === void 0) {
        this.variables.set(key.text, {
          declarations: variable.declarations.map(mapDeclaration),
          domain: variable.domain,
          uses: [...variable.uses]
        });
      } else {
        outer:
          for (const declaration of variable.declarations) {
            for (const existing of namespaceVar.declarations) {
              if (existing.declaration === declaration) {
                continue outer;
              }
              namespaceVar.declarations.push(mapDeclaration(declaration));
            }
          }
        namespaceVar.domain |= variable.domain;
        for (const use of variable.uses) {
          if (namespaceVar.uses.includes(use)) {
            continue;
          }
          namespaceVar.uses.push(use);
        }
      }
    });
    this.applyUses();
    __privateSet(this, _innerScope2, new NonRootScope(this, 1 /* Function */));
  }
  finish(cb) {
    return super.end(cb);
  }
  getDestinationScope() {
    return __privateGet(this, _innerScope2);
  }
  markExported(name) {
    if (__privateGet(this, _exports2) === void 0) {
      __privateSet(this, _exports2, /* @__PURE__ */ new Set());
    }
    __privateGet(this, _exports2).add(name.text);
  }
  refresh(ambient, hasExport) {
    __privateSet(this, _ambient, ambient);
    __privateSet(this, _hasExport, hasExport);
  }
};
_ambient = new WeakMap();
_exports2 = new WeakMap();
_hasExport = new WeakMap();
_innerScope2 = new WeakMap();
function mapDeclaration(declaration) {
  return {
    declaration,
    domain: getDeclarationDomain(declaration),
    exported: true
  };
}
var FunctionScope = class extends NonRootScope {
  constructor(parent) {
    super(parent, 1 /* Function */);
  }
  beginBody() {
    this.applyUses();
  }
};
var _domain, _name;
var AbstractNamedExpressionScope = class extends NonRootScope {
  constructor(name, domain, parent) {
    super(parent, 1 /* Function */);
    __privateAdd(this, _domain, void 0);
    __privateAdd(this, _name, void 0);
    __privateSet(this, _name, name);
    __privateSet(this, _domain, domain);
  }
  addUse(use, source) {
    if (source !== this.innerScope) {
      return this.innerScope.addUse(use);
    }
    if (use.domain & __privateGet(this, _domain) && use.location.text === __privateGet(this, _name).text) {
      this.uses.push(use);
    } else {
      return this.parent.addUse(use, this);
    }
  }
  end(cb) {
    this.innerScope.end(cb);
    return cb(
      {
        declarations: [__privateGet(this, _name)],
        domain: __privateGet(this, _domain),
        exported: false,
        inGlobalScope: false,
        uses: this.uses
      },
      __privateGet(this, _name),
      this
    );
  }
  getDestinationScope() {
    return this.innerScope;
  }
  getFunctionScope() {
    return this.innerScope;
  }
};
_domain = new WeakMap();
_name = new WeakMap();
var FunctionExpressionScope = class extends AbstractNamedExpressionScope {
  constructor(name, parent) {
    super(name, 4 /* Value */, parent);
    this.innerScope = new FunctionScope(this);
  }
  beginBody() {
    return this.innerScope.beginBody();
  }
};
var _functionScope;
var BlockScope = class extends NonRootScope {
  constructor(functionScope, parent) {
    super(parent, 2 /* Block */);
    __privateAdd(this, _functionScope, void 0);
    __privateSet(this, _functionScope, functionScope);
  }
  getFunctionScope() {
    return __privateGet(this, _functionScope);
  }
};
_functionScope = new WeakMap();
var ClassExpressionScope = class extends AbstractNamedExpressionScope {
  constructor(name, parent) {
    super(name, 4 /* Value */ | 2 /* Type */, parent);
    this.innerScope = new NonRootScope(this, 1 /* Function */);
  }
};
var _state;
var ConditionalTypeScope = class extends NonRootScope {
  constructor(parent) {
    super(parent, 8 /* ConditionalType */);
    __privateAdd(this, _state, 0 /* Initial */);
  }
  addUse(use) {
    if (__privateGet(this, _state) === 2 /* TrueType */) {
      return void this.uses.push(use);
    }
    return this.parent.addUse(use, this);
  }
  updateState(newState) {
    __privateSet(this, _state, newState);
  }
};
_state = new WeakMap();

// src/usage/UsageWalker.ts
var _result, _scope, _handleBindingName, handleBindingName_fn, _handleConditionalType, handleConditionalType_fn, _handleDeclaration, handleDeclaration_fn, _handleFunctionLikeDeclaration, handleFunctionLikeDeclaration_fn, _handleModule, handleModule_fn, _handleVariableDeclaration, handleVariableDeclaration_fn;
var UsageWalker = class {
  constructor() {
    __privateAdd(this, _handleBindingName);
    __privateAdd(this, _handleConditionalType);
    __privateAdd(this, _handleDeclaration);
    __privateAdd(this, _handleFunctionLikeDeclaration);
    __privateAdd(this, _handleModule);
    __privateAdd(this, _handleVariableDeclaration);
    __privateAdd(this, _result, /* @__PURE__ */ new Map());
    __privateAdd(this, _scope, void 0);
  }
  getUsage(sourceFile) {
    const variableCallback = (variable, key) => {
      __privateGet(this, _result).set(key, variable);
    };
    const isModule = import_typescript24.default.isExternalModule(sourceFile);
    __privateSet(this, _scope, new RootScope(
      sourceFile.isDeclarationFile && isModule && !containsExportStatement(sourceFile),
      !isModule
    ));
    const cb = (node) => {
      if (isBlockScopeBoundary(node)) {
        return continueWithScope(
          node,
          new BlockScope(__privateGet(this, _scope).getFunctionScope(), __privateGet(this, _scope)),
          handleBlockScope
        );
      }
      switch (node.kind) {
        case import_typescript24.default.SyntaxKind.ClassExpression:
          return continueWithScope(
            node,
            node.name !== void 0 ? new ClassExpressionScope(
              node.name,
              __privateGet(this, _scope)
            ) : new NonRootScope(__privateGet(this, _scope), 1 /* Function */)
          );
        case import_typescript24.default.SyntaxKind.ClassDeclaration:
          __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, true, 4 /* Value */ | 2 /* Type */);
          return continueWithScope(
            node,
            new NonRootScope(__privateGet(this, _scope), 1 /* Function */)
          );
        case import_typescript24.default.SyntaxKind.InterfaceDeclaration:
        case import_typescript24.default.SyntaxKind.TypeAliasDeclaration:
          __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, true, 2 /* Type */);
          return continueWithScope(
            node,
            new NonRootScope(__privateGet(this, _scope), 4 /* Type */)
          );
        case import_typescript24.default.SyntaxKind.EnumDeclaration:
          __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, true, 7 /* Any */);
          return continueWithScope(
            node,
            __privateGet(this, _scope).createOrReuseEnumScope(
              node.name.text,
              includesModifier(
                node.modifiers,
                import_typescript24.default.SyntaxKind.ExportKeyword
              )
            )
          );
        case import_typescript24.default.SyntaxKind.ModuleDeclaration:
          return __privateMethod(this, _handleModule, handleModule_fn).call(this, node, continueWithScope);
        case import_typescript24.default.SyntaxKind.MappedType:
          return continueWithScope(
            node,
            new NonRootScope(__privateGet(this, _scope), 4 /* Type */)
          );
        case import_typescript24.default.SyntaxKind.FunctionExpression:
        case import_typescript24.default.SyntaxKind.ArrowFunction:
        case import_typescript24.default.SyntaxKind.Constructor:
        case import_typescript24.default.SyntaxKind.MethodDeclaration:
        case import_typescript24.default.SyntaxKind.FunctionDeclaration:
        case import_typescript24.default.SyntaxKind.GetAccessor:
        case import_typescript24.default.SyntaxKind.SetAccessor:
        case import_typescript24.default.SyntaxKind.MethodSignature:
        case import_typescript24.default.SyntaxKind.CallSignature:
        case import_typescript24.default.SyntaxKind.ConstructSignature:
        case import_typescript24.default.SyntaxKind.ConstructorType:
        case import_typescript24.default.SyntaxKind.FunctionType:
          return __privateMethod(this, _handleFunctionLikeDeclaration, handleFunctionLikeDeclaration_fn).call(this, node, cb, variableCallback);
        case import_typescript24.default.SyntaxKind.ConditionalType:
          return __privateMethod(this, _handleConditionalType, handleConditionalType_fn).call(this, node, cb, variableCallback);
        case import_typescript24.default.SyntaxKind.VariableDeclarationList:
          __privateMethod(this, _handleVariableDeclaration, handleVariableDeclaration_fn).call(this, node);
          break;
        case import_typescript24.default.SyntaxKind.Parameter:
          if (node.parent.kind !== import_typescript24.default.SyntaxKind.IndexSignature && (node.name.kind !== import_typescript24.default.SyntaxKind.Identifier || identifierToKeywordKind(
            node.name
          ) !== import_typescript24.default.SyntaxKind.ThisKeyword)) {
            __privateMethod(this, _handleBindingName, handleBindingName_fn).call(this, node.name, false, false);
          }
          break;
        case import_typescript24.default.SyntaxKind.EnumMember:
          __privateGet(this, _scope).addVariable(
            getPropertyName(node.name),
            node.name,
            1 /* Function */,
            true,
            4 /* Value */
          );
          break;
        case import_typescript24.default.SyntaxKind.ImportClause:
        case import_typescript24.default.SyntaxKind.ImportSpecifier:
        case import_typescript24.default.SyntaxKind.NamespaceImport:
        case import_typescript24.default.SyntaxKind.ImportEqualsDeclaration:
          __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, false, 7 /* Any */ | 8 /* Import */);
          break;
        case import_typescript24.default.SyntaxKind.TypeParameter:
          __privateGet(this, _scope).addVariable(
            node.name.text,
            node.name,
            node.parent.kind === import_typescript24.default.SyntaxKind.InferType ? 8 /* InferType */ : 7 /* Type */,
            false,
            2 /* Type */
          );
          break;
        case import_typescript24.default.SyntaxKind.ExportSpecifier:
          if (node.propertyName !== void 0) {
            return __privateGet(this, _scope).markExported(
              node.propertyName,
              node.name
            );
          }
          return __privateGet(this, _scope).markExported(node.name);
        case import_typescript24.default.SyntaxKind.ExportAssignment:
          if (node.expression.kind === import_typescript24.default.SyntaxKind.Identifier) {
            return __privateGet(this, _scope).markExported(
              node.expression
            );
          }
          break;
        case import_typescript24.default.SyntaxKind.Identifier: {
          const domain = getUsageDomain(node);
          if (domain !== void 0) {
            __privateGet(this, _scope).addUse({ domain, location: node });
          }
          return;
        }
      }
      return import_typescript24.default.forEachChild(node, cb);
    };
    const continueWithScope = (node, scope, next = forEachChild) => {
      const savedScope = __privateGet(this, _scope);
      __privateSet(this, _scope, scope);
      next(node);
      __privateGet(this, _scope).end(variableCallback);
      __privateSet(this, _scope, savedScope);
    };
    const handleBlockScope = (node) => {
      if (node.kind === import_typescript24.default.SyntaxKind.CatchClause && node.variableDeclaration !== void 0) {
        __privateMethod(this, _handleBindingName, handleBindingName_fn).call(this, node.variableDeclaration.name, true, false);
      }
      return import_typescript24.default.forEachChild(node, cb);
    };
    import_typescript24.default.forEachChild(sourceFile, cb);
    __privateGet(this, _scope).end(variableCallback);
    return __privateGet(this, _result);
    function forEachChild(node) {
      return import_typescript24.default.forEachChild(node, cb);
    }
  }
};
_result = new WeakMap();
_scope = new WeakMap();
_handleBindingName = new WeakSet();
handleBindingName_fn = function(name, blockScoped, exported) {
  if (name.kind === import_typescript24.default.SyntaxKind.Identifier) {
    return __privateGet(this, _scope).addVariable(
      name.text,
      name,
      blockScoped ? 3 /* Block */ : 1 /* Function */,
      exported,
      4 /* Value */
    );
  }
  forEachDestructuringIdentifier(name, (declaration) => {
    __privateGet(this, _scope).addVariable(
      declaration.name.text,
      declaration.name,
      blockScoped ? 3 /* Block */ : 1 /* Function */,
      exported,
      4 /* Value */
    );
  });
};
_handleConditionalType = new WeakSet();
handleConditionalType_fn = function(node, cb, varCb) {
  const savedScope = __privateGet(this, _scope);
  const scope = __privateSet(this, _scope, new ConditionalTypeScope(savedScope));
  cb(node.checkType);
  scope.updateState(1 /* Extends */);
  cb(node.extendsType);
  scope.updateState(2 /* TrueType */);
  cb(node.trueType);
  scope.updateState(3 /* FalseType */);
  cb(node.falseType);
  scope.end(varCb);
  __privateSet(this, _scope, savedScope);
};
_handleDeclaration = new WeakSet();
handleDeclaration_fn = function(node, blockScoped, domain) {
  if (node.name !== void 0) {
    __privateGet(this, _scope).addVariable(
      node.name.text,
      node.name,
      blockScoped ? 3 /* Block */ : 1 /* Function */,
      includesModifier(
        node.modifiers,
        import_typescript24.default.SyntaxKind.ExportKeyword
      ),
      domain
    );
  }
};
_handleFunctionLikeDeclaration = new WeakSet();
handleFunctionLikeDeclaration_fn = function(node, cb, varCb) {
  if (canHaveDecorators(node)) {
    getDecorators(node)?.forEach(cb);
  }
  const savedScope = __privateGet(this, _scope);
  if (node.kind === import_typescript24.default.SyntaxKind.FunctionDeclaration) {
    __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, false, 4 /* Value */);
  }
  const scope = __privateSet(this, _scope, node.kind === import_typescript24.default.SyntaxKind.FunctionExpression && node.name !== void 0 ? new FunctionExpressionScope(node.name, savedScope) : new FunctionScope(savedScope));
  if (node.name !== void 0) {
    cb(node.name);
  }
  if (node.typeParameters !== void 0) {
    node.typeParameters.forEach(cb);
  }
  node.parameters.forEach(cb);
  if (node.type !== void 0) {
    cb(node.type);
  }
  if (node.body !== void 0) {
    scope.beginBody();
    cb(node.body);
  }
  scope.end(varCb);
  __privateSet(this, _scope, savedScope);
};
_handleModule = new WeakSet();
handleModule_fn = function(node, next) {
  if (node.flags & import_typescript24.default.NodeFlags.GlobalAugmentation) {
    return next(
      node,
      __privateGet(this, _scope).createOrReuseNamespaceScope("-global", false, true, false)
    );
  }
  if (node.name.kind === import_typescript24.default.SyntaxKind.Identifier) {
    const exported = isNamespaceExported(node);
    __privateGet(this, _scope).addVariable(
      node.name.text,
      node.name,
      1 /* Function */,
      exported,
      1 /* Namespace */ | 4 /* Value */
    );
    const ambient = includesModifier(
      node.modifiers,
      import_typescript24.default.SyntaxKind.DeclareKeyword
    );
    return next(
      node,
      __privateGet(this, _scope).createOrReuseNamespaceScope(
        node.name.text,
        exported,
        ambient,
        ambient && namespaceHasExportStatement(node)
      )
    );
  }
  return next(
    node,
    __privateGet(this, _scope).createOrReuseNamespaceScope(
      `"${node.name.text}"`,
      false,
      true,
      namespaceHasExportStatement(node)
    )
  );
};
_handleVariableDeclaration = new WeakSet();
handleVariableDeclaration_fn = function(declarationList) {
  const blockScoped = isBlockScopedVariableDeclarationList(declarationList);
  const exported = declarationList.parent.kind === import_typescript24.default.SyntaxKind.VariableStatement && includesModifier(
    declarationList.parent.modifiers,
    import_typescript24.default.SyntaxKind.ExportKeyword
  );
  for (const declaration of declarationList.declarations) {
    __privateMethod(this, _handleBindingName, handleBindingName_fn).call(this, declaration.name, blockScoped, exported);
  }
};
function isNamespaceExported(node) {
  return node.parent.kind === import_typescript24.default.SyntaxKind.ModuleDeclaration || includesModifier(node.modifiers, import_typescript24.default.SyntaxKind.ExportKeyword);
}
function namespaceHasExportStatement(ns) {
  if (ns.body === void 0 || ns.body.kind !== import_typescript24.default.SyntaxKind.ModuleBlock) {
    return false;
  }
  return containsExportStatement(ns.body);
}
function containsExportStatement(block) {
  for (const statement of block.statements) {
    if (statement.kind === import_typescript24.default.SyntaxKind.ExportDeclaration || statement.kind === import_typescript24.default.SyntaxKind.ExportAssignment) {
      return true;
    }
  }
  return false;
}
function isBlockScopedVariableDeclarationList(declarationList) {
  return (declarationList.flags & import_typescript24.default.NodeFlags.BlockScoped) !== 0;
}
function forEachDestructuringIdentifier(pattern, fn) {
  for (const element of pattern.elements) {
    if (element.kind !== import_typescript24.default.SyntaxKind.BindingElement) {
      continue;
    }
    let result;
    if (element.name.kind === import_typescript24.default.SyntaxKind.Identifier) {
      result = fn(element);
    } else {
      result = forEachDestructuringIdentifier(element.name, fn);
    }
    if (result) {
      return result;
    }
  }
}

// src/usage/collectVariableUsage.ts
function collectVariableUsage(sourceFile) {
  return new UsageWalker().getUsage(sourceFile);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AccessKind,
  DeclarationDomain,
  UsageDomain,
  collectVariableUsage,
  forEachComment,
  forEachToken,
  getAccessKind,
  getCallSignaturesOfType,
  getPropertyOfType,
  getWellKnownSymbolPropertyOfType,
  hasDecorators,
  hasExpressionInitializer,
  hasInitializer,
  hasJSDoc,
  hasModifiers,
  hasType,
  hasTypeArguments,
  includesModifier,
  intersectionTypeParts,
  isAbstractKeyword,
  isAccessExpression,
  isAccessibilityModifier,
  isAccessorDeclaration,
  isAccessorKeyword,
  isAnyKeyword,
  isArrayBindingElement,
  isArrayBindingOrAssignmentPattern,
  isAssertKeyword,
  isAssertsKeyword,
  isAssignmentKind,
  isAssignmentPattern,
  isAsyncKeyword,
  isAwaitKeyword,
  isBigIntKeyword,
  isBigIntLiteralType,
  isBindingOrAssignmentElementRestIndicator,
  isBindingOrAssignmentElementTarget,
  isBindingOrAssignmentPattern,
  isBindingPattern,
  isBlockLike,
  isBooleanKeyword,
  isBooleanLiteral,
  isBooleanLiteralType,
  isClassLikeDeclaration,
  isClassMemberModifier,
  isColonToken,
  isCompilerOptionEnabled,
  isConditionalType,
  isConstAssertionExpression,
  isConstKeyword,
  isDeclarationName,
  isDeclarationWithTypeParameterChildren,
  isDeclarationWithTypeParameters,
  isDeclareKeyword,
  isDefaultKeyword,
  isDestructuringPattern,
  isDotToken,
  isEndOfFileToken,
  isEntityNameExpression,
  isEntityNameOrEntityNameExpression,
  isEnumType,
  isEqualsGreaterThanToken,
  isEqualsToken,
  isEvolvingArrayType,
  isExclamationToken,
  isExportKeyword,
  isFalseKeyword,
  isFalseLiteral,
  isFalseLiteralType,
  isFalsyType,
  isForInOrOfStatement,
  isFreshableIntrinsicType,
  isFreshableType,
  isFunctionLikeDeclaration,
  isFunctionScopeBoundary,
  isImportExpression,
  isImportKeyword,
  isInKeyword,
  isIndexType,
  isIndexedAccessType,
  isInputFiles,
  isInstantiableType,
  isIntersectionType,
  isIntrinsicAnyType,
  isIntrinsicBigIntType,
  isIntrinsicBooleanType,
  isIntrinsicESSymbolType,
  isIntrinsicErrorType,
  isIntrinsicNeverType,
  isIntrinsicNonPrimitiveType,
  isIntrinsicNullType,
  isIntrinsicNumberType,
  isIntrinsicStringType,
  isIntrinsicType,
  isIntrinsicUndefinedType,
  isIntrinsicUnknownType,
  isIntrinsicVoidType,
  isIterationStatement,
  isJSDocComment,
  isJSDocNamespaceBody,
  isJSDocNamespaceDeclaration,
  isJSDocText,
  isJSDocTypeReferencingNode,
  isJsonMinusNumericLiteral,
  isJsonObjectExpression,
  isJsxAttributeLike,
  isJsxAttributeValue,
  isJsxChild,
  isJsxTagNameExpression,
  isJsxTagNamePropertyAccess,
  isLiteralToken,
  isLiteralType,
  isModifierFlagSet,
  isModuleBody,
  isModuleName,
  isModuleReference,
  isNamedDeclarationWithName,
  isNamedImportBindings,
  isNamedImportsOrExports,
  isNamespaceBody,
  isNamespaceDeclaration,
  isNeverKeyword,
  isNodeFlagSet,
  isNullKeyword,
  isNullLiteral,
  isNumberKeyword,
  isNumberLiteralType,
  isNumericOrStringLikeLiteral,
  isNumericPropertyName,
  isObjectBindingOrAssignmentElement,
  isObjectBindingOrAssignmentPattern,
  isObjectFlagSet,
  isObjectKeyword,
  isObjectType,
  isObjectTypeDeclaration,
  isOutKeyword,
  isOverrideKeyword,
  isParameterPropertyModifier,
  isPrivateKeyword,
  isPropertyAccessEntityNameExpression,
  isPropertyNameLiteral,
  isPropertyReadonlyInType,
  isProtectedKeyword,
  isPseudoLiteralToken,
  isPublicKeyword,
  isQuestionDotToken,
  isQuestionToken,
  isReadonlyKeyword,
  isSignatureDeclaration,
  isStaticKeyword,
  isStrictCompilerOptionEnabled,
  isStringKeyword,
  isStringLiteralType,
  isStringMappingType,
  isSubstitutionType,
  isSuperElementAccessExpression,
  isSuperExpression,
  isSuperKeyword,
  isSuperProperty,
  isSuperPropertyAccessExpression,
  isSymbolFlagSet,
  isSymbolKeyword,
  isSyntaxList,
  isTemplateLiteralType,
  isThenableType,
  isThisExpression,
  isThisKeyword,
  isTransientSymbolLinksFlagSet,
  isTrueKeyword,
  isTrueLiteral,
  isTrueLiteralType,
  isTupleType,
  isTupleTypeReference,
  isTypeFlagSet,
  isTypeOnlyCompatibleAliasDeclaration,
  isTypeParameter,
  isTypeReference,
  isTypeReferenceType,
  isTypeVariable,
  isUndefinedKeyword,
  isUnionOrIntersectionType,
  isUnionOrIntersectionTypeNode,
  isUnionType,
  isUniqueESSymbolType,
  isUnknownKeyword,
  isUnknownLiteralType,
  isUnparsedPrologue,
  isUnparsedSourceText,
  isUnparsedSyntheticReference,
  isValidPropertyAccess,
  isVariableLikeDeclaration,
  isVoidKeyword,
  symbolHasReadonlyDeclaration,
  typeIsLiteral,
  typeParts,
  unionTypeParts
});
//# sourceMappingURL=index.cjs.map