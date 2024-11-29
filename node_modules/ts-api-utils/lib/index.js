var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/constants.js"(exports, module) {
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
    module.exports = {
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
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module.exports = {};
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
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/parse-options.js"(exports, module) {
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
    module.exports = parseOptions;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/identifiers.js"(exports, module) {
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
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/semver.js"(exports, module) {
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
    module.exports = SemVer;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/parse.js"(exports, module) {
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
    module.exports = parse;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module.exports = valid;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module.exports = clean;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/inc.js"(exports, module) {
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
    module.exports = inc;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/diff.js"(exports, module) {
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
    module.exports = diff;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module.exports = major;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module.exports = minor;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module.exports = patch;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module.exports = compare;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module.exports = rcompare;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module.exports = compareLoose;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module.exports = sort;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module.exports = rsort;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module.exports = gt;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module.exports = lt;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module.exports = eq;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module.exports = neq;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module.exports = gte;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module.exports = lte;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/cmp.js"(exports, module) {
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
    module.exports = cmp;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/coerce.js"(exports, module) {
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
    module.exports = coerce;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/internal/lrucache.js"(exports, module) {
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
    module.exports = LRUCache;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/range.js"(exports, module) {
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
    module.exports = Range;
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
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/classes/comparator.js"(exports, module) {
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
    module.exports = Comparator;
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
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/functions/satisfies.js"(exports, module) {
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
    module.exports = satisfies;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module.exports = toComparators;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/max-satisfying.js"(exports, module) {
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
    module.exports = maxSatisfying;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/min-satisfying.js"(exports, module) {
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
    module.exports = minSatisfying;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/min-version.js"(exports, module) {
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
    module.exports = minVersion;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module.exports = validRange;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/outside.js"(exports, module) {
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
    module.exports = outside;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module.exports = gtr;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module.exports = ltr;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module.exports = intersects;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module.exports = (versions, range, options) => {
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
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/ranges/subset.js"(exports, module) {
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
    module.exports = subset;
  }
});

// node_modules/.pnpm/semver@7.6.2/node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/.pnpm/semver@7.6.2/node_modules/semver/index.js"(exports, module) {
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
    module.exports = {
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

// src/comments.ts
import ts2 from "typescript";

// src/tokens.ts
import ts from "typescript";
function forEachToken(node, callback, sourceFile = node.getSourceFile()) {
  const queue = [];
  while (true) {
    if (ts.isTokenKind(node.kind)) {
      callback(node);
    } else if (
      // eslint-disable-next-line deprecation/deprecation -- need for support of TS < 4.7
      node.kind !== ts.SyntaxKind.JSDocComment
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
    case ts2.SyntaxKind.CloseBraceToken:
      return token.parent.kind !== ts2.SyntaxKind.JsxExpression || !isJsxElementOrFragment(token.parent.parent);
    case ts2.SyntaxKind.GreaterThanToken:
      switch (token.parent.kind) {
        case ts2.SyntaxKind.JsxOpeningElement:
          return token.end !== token.parent.end;
        case ts2.SyntaxKind.JsxOpeningFragment:
          return false;
        case ts2.SyntaxKind.JsxSelfClosingElement:
          return token.end !== token.parent.end || // if end is not equal, this is part of the type arguments list
          !isJsxElementOrFragment(token.parent.parent);
        case ts2.SyntaxKind.JsxClosingElement:
        case ts2.SyntaxKind.JsxClosingFragment:
          return !isJsxElementOrFragment(token.parent.parent.parent);
      }
  }
  return true;
}
function isJsxElementOrFragment(node) {
  return node.kind === ts2.SyntaxKind.JsxElement || node.kind === ts2.SyntaxKind.JsxFragment;
}
function forEachComment(node, callback, sourceFile = node.getSourceFile()) {
  const fullText = sourceFile.text;
  const notJsx = sourceFile.languageVariant !== ts2.LanguageVariant.JSX;
  return forEachToken(
    node,
    (token) => {
      if (token.pos === token.end) {
        return;
      }
      if (token.kind !== ts2.SyntaxKind.JsxText) {
        ts2.forEachLeadingCommentRange(
          fullText,
          // skip shebang at position 0
          token.pos === 0 ? (ts2.getShebang(fullText) ?? "").length : token.pos,
          commentCallback
        );
      }
      if (notJsx || canHaveTrailingTrivia(token)) {
        return ts2.forEachTrailingCommentRange(
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
import ts3 from "typescript";
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
      return options.allowSyntheticDefaultImports !== void 0 ? options.allowSyntheticDefaultImports : isCompilerOptionEnabled(options, "esModuleInterop") || options.module === ts3.ModuleKind.System;
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
import ts4 from "typescript";
function isFlagSet(allFlags, flag) {
  return (allFlags & flag) !== 0;
}
function isFlagSetOnObject(obj, flag) {
  return isFlagSet(obj.flags, flag);
}
function isModifierFlagSet(node, flag) {
  return isFlagSet(ts4.getCombinedModifierFlags(node), flag);
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
import ts6 from "typescript";

// src/syntax.ts
import ts5 from "typescript";
function isAssignmentKind(kind) {
  return kind >= ts5.SyntaxKind.FirstAssignment && kind <= ts5.SyntaxKind.LastAssignment;
}
function isNumericPropertyName(name) {
  return String(+name) === name;
}
function charSize(ch) {
  return ch >= 65536 ? 2 : 1;
}
function isValidPropertyAccess(text, languageVersion = ts5.ScriptTarget.Latest) {
  if (text.length === 0) {
    return false;
  }
  let ch = text.codePointAt(0);
  if (!ts5.isIdentifierStart(ch, languageVersion)) {
    return false;
  }
  for (let i = charSize(ch); i < text.length; i += charSize(ch)) {
    ch = text.codePointAt(i);
    if (!ts5.isIdentifierPart(ch, languageVersion)) {
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
    case ts6.SyntaxKind.DeleteExpression:
      return 4 /* Delete */;
    case ts6.SyntaxKind.PostfixUnaryExpression:
      return 3 /* ReadWrite */;
    case ts6.SyntaxKind.PrefixUnaryExpression:
      return parent.operator === ts6.SyntaxKind.PlusPlusToken || parent.operator === ts6.SyntaxKind.MinusMinusToken ? 3 /* ReadWrite */ : 1 /* Read */;
    case ts6.SyntaxKind.BinaryExpression:
      return parent.right === node ? 1 /* Read */ : !isAssignmentKind(parent.operatorToken.kind) ? 1 /* Read */ : parent.operatorToken.kind === ts6.SyntaxKind.EqualsToken ? 2 /* Write */ : 3 /* ReadWrite */;
    case ts6.SyntaxKind.ShorthandPropertyAssignment:
      return parent.objectAssignmentInitializer === node ? 1 /* Read */ : isInDestructuringAssignment(parent) ? 2 /* Write */ : 1 /* Read */;
    case ts6.SyntaxKind.PropertyAssignment:
      return parent.name === node ? 0 /* None */ : isInDestructuringAssignment(parent) ? 2 /* Write */ : 1 /* Read */;
    case ts6.SyntaxKind.ArrayLiteralExpression:
    case ts6.SyntaxKind.SpreadElement:
    case ts6.SyntaxKind.SpreadAssignment:
      return isInDestructuringAssignment(
        parent
      ) ? 2 /* Write */ : 1 /* Read */;
    case ts6.SyntaxKind.ParenthesizedExpression:
    case ts6.SyntaxKind.NonNullExpression:
    case ts6.SyntaxKind.TypeAssertionExpression:
    case ts6.SyntaxKind.AsExpression:
      return getAccessKind(parent);
    case ts6.SyntaxKind.ForOfStatement:
    case ts6.SyntaxKind.ForInStatement:
      return parent.initializer === node ? 2 /* Write */ : 1 /* Read */;
    case ts6.SyntaxKind.ExpressionWithTypeArguments:
      return parent.parent.token === ts6.SyntaxKind.ExtendsKeyword && parent.parent.parent.kind !== ts6.SyntaxKind.InterfaceDeclaration ? 1 /* Read */ : 0 /* None */;
    case ts6.SyntaxKind.ComputedPropertyName:
    case ts6.SyntaxKind.ExpressionStatement:
    case ts6.SyntaxKind.TypeOfExpression:
    case ts6.SyntaxKind.ElementAccessExpression:
    case ts6.SyntaxKind.ForStatement:
    case ts6.SyntaxKind.IfStatement:
    case ts6.SyntaxKind.DoStatement:
    case ts6.SyntaxKind.WhileStatement:
    case ts6.SyntaxKind.SwitchStatement:
    case ts6.SyntaxKind.WithStatement:
    case ts6.SyntaxKind.ThrowStatement:
    case ts6.SyntaxKind.CallExpression:
    case ts6.SyntaxKind.NewExpression:
    case ts6.SyntaxKind.TaggedTemplateExpression:
    case ts6.SyntaxKind.JsxExpression:
    case ts6.SyntaxKind.Decorator:
    case ts6.SyntaxKind.TemplateSpan:
    case ts6.SyntaxKind.JsxOpeningElement:
    case ts6.SyntaxKind.JsxSelfClosingElement:
    case ts6.SyntaxKind.JsxSpreadAttribute:
    case ts6.SyntaxKind.VoidExpression:
    case ts6.SyntaxKind.ReturnStatement:
    case ts6.SyntaxKind.AwaitExpression:
    case ts6.SyntaxKind.YieldExpression:
    case ts6.SyntaxKind.ConditionalExpression:
    case ts6.SyntaxKind.CaseClause:
    case ts6.SyntaxKind.JsxElement:
      return 1 /* Read */;
    case ts6.SyntaxKind.ArrowFunction:
      return parent.body === node ? 1 /* Read */ : 2 /* Write */;
    case ts6.SyntaxKind.PropertyDeclaration:
    case ts6.SyntaxKind.VariableDeclaration:
    case ts6.SyntaxKind.Parameter:
    case ts6.SyntaxKind.EnumMember:
    case ts6.SyntaxKind.BindingElement:
    case ts6.SyntaxKind.JsxAttribute:
      return parent.initializer === node ? 1 /* Read */ : 0 /* None */;
    case ts6.SyntaxKind.PropertyAccessExpression:
      return parent.expression === node ? 1 /* Read */ : 0 /* None */;
    case ts6.SyntaxKind.ExportAssignment:
      return parent.isExportEquals ? 1 /* Read */ : 0 /* None */;
  }
  return 0 /* None */;
}
function isInDestructuringAssignment(node) {
  switch (node.kind) {
    case ts6.SyntaxKind.ShorthandPropertyAssignment:
      if (node.objectAssignmentInitializer !== void 0) {
        return true;
      }
    case ts6.SyntaxKind.PropertyAssignment:
    case ts6.SyntaxKind.SpreadAssignment:
      node = node.parent;
      break;
    case ts6.SyntaxKind.SpreadElement:
      if (node.parent.kind !== ts6.SyntaxKind.ArrayLiteralExpression) {
        return false;
      }
      node = node.parent;
  }
  while (true) {
    switch (node.parent.kind) {
      case ts6.SyntaxKind.BinaryExpression:
        return node.parent.left === node && node.parent.operatorToken.kind === ts6.SyntaxKind.EqualsToken;
      case ts6.SyntaxKind.ForOfStatement:
        return node.parent.initializer === node;
      case ts6.SyntaxKind.ArrayLiteralExpression:
      case ts6.SyntaxKind.ObjectLiteralExpression:
        node = node.parent;
        break;
      case ts6.SyntaxKind.SpreadAssignment:
      case ts6.SyntaxKind.PropertyAssignment:
        node = node.parent.parent;
        break;
      case ts6.SyntaxKind.SpreadElement:
        if (node.parent.parent.kind !== ts6.SyntaxKind.ArrayLiteralExpression) {
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
import ts10 from "typescript";

// src/nodes/typeGuards/single.ts
import ts7 from "typescript";
function isAbstractKeyword(node) {
  return node.kind === ts7.SyntaxKind.AbstractKeyword;
}
function isAccessorKeyword(node) {
  return node.kind === ts7.SyntaxKind.AccessorKeyword;
}
function isAnyKeyword(node) {
  return node.kind === ts7.SyntaxKind.AnyKeyword;
}
function isAssertKeyword(node) {
  return node.kind === ts7.SyntaxKind.AssertKeyword;
}
function isAssertsKeyword(node) {
  return node.kind === ts7.SyntaxKind.AssertsKeyword;
}
function isAsyncKeyword(node) {
  return node.kind === ts7.SyntaxKind.AsyncKeyword;
}
function isAwaitKeyword(node) {
  return node.kind === ts7.SyntaxKind.AwaitKeyword;
}
function isBigIntKeyword(node) {
  return node.kind === ts7.SyntaxKind.BigIntKeyword;
}
function isBooleanKeyword(node) {
  return node.kind === ts7.SyntaxKind.BooleanKeyword;
}
function isColonToken(node) {
  return node.kind === ts7.SyntaxKind.ColonToken;
}
function isConstKeyword(node) {
  return node.kind === ts7.SyntaxKind.ConstKeyword;
}
function isDeclareKeyword(node) {
  return node.kind === ts7.SyntaxKind.DeclareKeyword;
}
function isDefaultKeyword(node) {
  return node.kind === ts7.SyntaxKind.DefaultKeyword;
}
function isDotToken(node) {
  return node.kind === ts7.SyntaxKind.DotToken;
}
function isEndOfFileToken(node) {
  return node.kind === ts7.SyntaxKind.EndOfFileToken;
}
function isEqualsGreaterThanToken(node) {
  return node.kind === ts7.SyntaxKind.EqualsGreaterThanToken;
}
function isEqualsToken(node) {
  return node.kind === ts7.SyntaxKind.EqualsToken;
}
function isExclamationToken(node) {
  return node.kind === ts7.SyntaxKind.ExclamationToken;
}
function isExportKeyword(node) {
  return node.kind === ts7.SyntaxKind.ExportKeyword;
}
function isFalseKeyword(node) {
  return node.kind === ts7.SyntaxKind.FalseKeyword;
}
function isFalseLiteral(node) {
  return node.kind === ts7.SyntaxKind.FalseKeyword;
}
function isImportExpression(node) {
  return node.kind === ts7.SyntaxKind.ImportKeyword;
}
function isImportKeyword(node) {
  return node.kind === ts7.SyntaxKind.ImportKeyword;
}
function isInKeyword(node) {
  return node.kind === ts7.SyntaxKind.InKeyword;
}
function isInputFiles(node) {
  return node.kind === ts7.SyntaxKind.InputFiles;
}
function isJSDocText(node) {
  return node.kind === ts7.SyntaxKind.JSDocText;
}
function isJsonMinusNumericLiteral(node) {
  return node.kind === ts7.SyntaxKind.PrefixUnaryExpression;
}
function isNeverKeyword(node) {
  return node.kind === ts7.SyntaxKind.NeverKeyword;
}
function isNullKeyword(node) {
  return node.kind === ts7.SyntaxKind.NullKeyword;
}
function isNullLiteral(node) {
  return node.kind === ts7.SyntaxKind.NullKeyword;
}
function isNumberKeyword(node) {
  return node.kind === ts7.SyntaxKind.NumberKeyword;
}
function isObjectKeyword(node) {
  return node.kind === ts7.SyntaxKind.ObjectKeyword;
}
function isOutKeyword(node) {
  return node.kind === ts7.SyntaxKind.OutKeyword;
}
function isOverrideKeyword(node) {
  return node.kind === ts7.SyntaxKind.OverrideKeyword;
}
function isPrivateKeyword(node) {
  return node.kind === ts7.SyntaxKind.PrivateKeyword;
}
function isProtectedKeyword(node) {
  return node.kind === ts7.SyntaxKind.ProtectedKeyword;
}
function isPublicKeyword(node) {
  return node.kind === ts7.SyntaxKind.PublicKeyword;
}
function isQuestionDotToken(node) {
  return node.kind === ts7.SyntaxKind.QuestionDotToken;
}
function isQuestionToken(node) {
  return node.kind === ts7.SyntaxKind.QuestionToken;
}
function isReadonlyKeyword(node) {
  return node.kind === ts7.SyntaxKind.ReadonlyKeyword;
}
function isStaticKeyword(node) {
  return node.kind === ts7.SyntaxKind.StaticKeyword;
}
function isStringKeyword(node) {
  return node.kind === ts7.SyntaxKind.StringKeyword;
}
function isSuperExpression(node) {
  return node.kind === ts7.SyntaxKind.SuperKeyword;
}
function isSuperKeyword(node) {
  return node.kind === ts7.SyntaxKind.SuperKeyword;
}
function isSymbolKeyword(node) {
  return node.kind === ts7.SyntaxKind.SymbolKeyword;
}
function isSyntaxList(node) {
  return node.kind === ts7.SyntaxKind.SyntaxList;
}
function isThisExpression(node) {
  return node.kind === ts7.SyntaxKind.ThisKeyword;
}
function isThisKeyword(node) {
  return node.kind === ts7.SyntaxKind.ThisKeyword;
}
function isTrueKeyword(node) {
  return node.kind === ts7.SyntaxKind.TrueKeyword;
}
function isTrueLiteral(node) {
  return node.kind === ts7.SyntaxKind.TrueKeyword;
}
function isUndefinedKeyword(node) {
  return node.kind === ts7.SyntaxKind.UndefinedKeyword;
}
function isUnknownKeyword(node) {
  return node.kind === ts7.SyntaxKind.UnknownKeyword;
}
function isUnparsedPrologue(node) {
  return node.kind === ts7.SyntaxKind.UnparsedPrologue;
}
function isUnparsedSyntheticReference(node) {
  return node.kind === ts7.SyntaxKind.UnparsedSyntheticReference;
}
function isVoidKeyword(node) {
  return node.kind === ts7.SyntaxKind.VoidKeyword;
}

// src/nodes/typeGuards/union.ts
import ts9 from "typescript";

// src/utils.ts
import ts8 from "typescript";
var [tsMajor, tsMinor] = ts8.versionMajorMinor.split(".").map((raw) => Number.parseInt(raw, 10));
function isTsVersionAtLeast(major, minor = 0) {
  return tsMajor > major || tsMajor === major && tsMinor >= minor;
}

// src/nodes/typeGuards/union.ts
function isAccessExpression(node) {
  return ts9.isPropertyAccessExpression(node) || ts9.isElementAccessExpression(node);
}
function isAccessibilityModifier(node) {
  return isPublicKeyword(node) || isPrivateKeyword(node) || isProtectedKeyword(node);
}
function isAccessorDeclaration(node) {
  return ts9.isGetAccessorDeclaration(node) || ts9.isSetAccessorDeclaration(node);
}
function isArrayBindingElement(node) {
  return ts9.isBindingElement(node) || ts9.isOmittedExpression(node);
}
function isArrayBindingOrAssignmentPattern(node) {
  return ts9.isArrayBindingPattern(node) || ts9.isArrayLiteralExpression(node);
}
function isAssignmentPattern(node) {
  return ts9.isObjectLiteralExpression(node) || ts9.isArrayLiteralExpression(node);
}
function isBindingOrAssignmentElementRestIndicator(node) {
  if (ts9.isSpreadElement(node) || ts9.isSpreadAssignment(node)) {
    return true;
  }
  if (isTsVersionAtLeast(4, 4)) {
    return ts9.isDotDotDotToken(node);
  }
  return false;
}
function isBindingOrAssignmentElementTarget(node) {
  return isBindingOrAssignmentPattern(node) || ts9.isIdentifier(node) || ts9.isPropertyAccessExpression(node) || ts9.isElementAccessExpression(node) || ts9.isOmittedExpression(node);
}
function isBindingOrAssignmentPattern(node) {
  return isObjectBindingOrAssignmentPattern(node) || isArrayBindingOrAssignmentPattern(node);
}
function isBindingPattern(node) {
  return ts9.isObjectBindingPattern(node) || ts9.isArrayBindingPattern(node);
}
function isBlockLike(node) {
  return ts9.isSourceFile(node) || ts9.isBlock(node) || ts9.isModuleBlock(node) || ts9.isCaseOrDefaultClause(node);
}
function isBooleanLiteral(node) {
  return isTrueLiteral(node) || isFalseLiteral(node);
}
function isClassLikeDeclaration(node) {
  return ts9.isClassDeclaration(node) || ts9.isClassExpression(node);
}
function isClassMemberModifier(node) {
  return isAccessibilityModifier(node) || isReadonlyKeyword(node) || isStaticKeyword(node) || isAccessorKeyword(node);
}
function isDeclarationName(node) {
  return ts9.isIdentifier(node) || ts9.isPrivateIdentifier(node) || ts9.isStringLiteralLike(node) || ts9.isNumericLiteral(node) || ts9.isComputedPropertyName(node) || ts9.isElementAccessExpression(node) || isBindingPattern(node) || isEntityNameExpression(node);
}
function isDeclarationWithTypeParameterChildren(node) {
  return isSignatureDeclaration(node) || // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
  isClassLikeDeclaration(node) || ts9.isInterfaceDeclaration(node) || ts9.isTypeAliasDeclaration(node) || ts9.isJSDocTemplateTag(node);
}
function isDeclarationWithTypeParameters(node) {
  return isDeclarationWithTypeParameterChildren(node) || ts9.isJSDocTypedefTag(node) || ts9.isJSDocCallbackTag(node) || ts9.isJSDocSignature(node);
}
function isDestructuringPattern(node) {
  return isBindingPattern(node) || ts9.isObjectLiteralExpression(node) || ts9.isArrayLiteralExpression(node);
}
function isEntityNameExpression(node) {
  return ts9.isIdentifier(node) || isPropertyAccessEntityNameExpression(node);
}
function isEntityNameOrEntityNameExpression(node) {
  return ts9.isEntityName(node) || isEntityNameExpression(node);
}
function isForInOrOfStatement(node) {
  return ts9.isForInStatement(node) || ts9.isForOfStatement(node);
}
function isFunctionLikeDeclaration(node) {
  return ts9.isFunctionDeclaration(node) || ts9.isMethodDeclaration(node) || ts9.isGetAccessorDeclaration(node) || ts9.isSetAccessorDeclaration(node) || ts9.isConstructorDeclaration(node) || ts9.isFunctionExpression(node) || ts9.isArrowFunction(node);
}
function hasDecorators(node) {
  return ts9.isParameter(node) || ts9.isPropertyDeclaration(node) || ts9.isMethodDeclaration(node) || ts9.isGetAccessorDeclaration(node) || ts9.isSetAccessorDeclaration(node) || ts9.isClassExpression(node) || ts9.isClassDeclaration(node);
}
function hasExpressionInitializer(node) {
  return ts9.isVariableDeclaration(node) || ts9.isParameter(node) || ts9.isBindingElement(node) || ts9.isPropertyDeclaration(node) || ts9.isPropertyAssignment(node) || ts9.isEnumMember(node);
}
function hasInitializer(node) {
  return hasExpressionInitializer(node) || ts9.isForStatement(node) || ts9.isForInStatement(node) || ts9.isForOfStatement(node) || ts9.isJsxAttribute(node);
}
function hasJSDoc(node) {
  if (
    // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
    isAccessorDeclaration(node) || ts9.isArrowFunction(node) || ts9.isBlock(node) || ts9.isBreakStatement(node) || ts9.isCallSignatureDeclaration(node) || ts9.isCaseClause(node) || // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
    isClassLikeDeclaration(node) || ts9.isConstructorDeclaration(node) || ts9.isConstructorTypeNode(node) || ts9.isConstructSignatureDeclaration(node) || ts9.isContinueStatement(node) || ts9.isDebuggerStatement(node) || ts9.isDoStatement(node) || ts9.isEmptyStatement(node) || isEndOfFileToken(node) || ts9.isEnumDeclaration(node) || ts9.isEnumMember(node) || ts9.isExportAssignment(node) || ts9.isExportDeclaration(node) || ts9.isExportSpecifier(node) || ts9.isExpressionStatement(node) || ts9.isForInStatement(node) || ts9.isForOfStatement(node) || ts9.isForStatement(node) || ts9.isFunctionDeclaration(node) || ts9.isFunctionExpression(node) || ts9.isFunctionTypeNode(node) || ts9.isIfStatement(node) || ts9.isImportDeclaration(node) || ts9.isImportEqualsDeclaration(node) || ts9.isIndexSignatureDeclaration(node) || ts9.isInterfaceDeclaration(node) || ts9.isJSDocFunctionType(node) || ts9.isLabeledStatement(node) || ts9.isMethodDeclaration(node) || ts9.isMethodSignature(node) || ts9.isModuleDeclaration(node) || ts9.isNamedTupleMember(node) || ts9.isNamespaceExportDeclaration(node) || ts9.isParameter(node) || ts9.isParenthesizedExpression(node) || ts9.isPropertyAssignment(node) || ts9.isPropertyDeclaration(node) || ts9.isPropertySignature(node) || ts9.isReturnStatement(node) || ts9.isShorthandPropertyAssignment(node) || ts9.isSpreadAssignment(node) || ts9.isSwitchStatement(node) || ts9.isThrowStatement(node) || ts9.isTryStatement(node) || ts9.isTypeAliasDeclaration(node) || ts9.isVariableDeclaration(node) || ts9.isVariableStatement(node) || ts9.isWhileStatement(node) || ts9.isWithStatement(node)
  ) {
    return true;
  }
  if (isTsVersionAtLeast(4, 4) && ts9.isClassStaticBlockDeclaration(node)) {
    return true;
  }
  if (isTsVersionAtLeast(5, 0) && (ts9.isBinaryExpression(node) || ts9.isElementAccessExpression(node) || ts9.isIdentifier(node) || ts9.isJSDocSignature(node) || ts9.isObjectLiteralExpression(node) || ts9.isPropertyAccessExpression(node) || ts9.isTypeParameterDeclaration(node))) {
    return true;
  }
  return false;
}
function hasModifiers(node) {
  return ts9.isTypeParameterDeclaration(node) || ts9.isParameter(node) || ts9.isConstructorTypeNode(node) || ts9.isPropertySignature(node) || ts9.isPropertyDeclaration(node) || ts9.isMethodSignature(node) || ts9.isMethodDeclaration(node) || ts9.isConstructorDeclaration(node) || ts9.isGetAccessorDeclaration(node) || ts9.isSetAccessorDeclaration(node) || ts9.isIndexSignatureDeclaration(node) || ts9.isFunctionExpression(node) || ts9.isArrowFunction(node) || ts9.isClassExpression(node) || ts9.isVariableStatement(node) || ts9.isFunctionDeclaration(node) || ts9.isClassDeclaration(node) || ts9.isInterfaceDeclaration(node) || ts9.isTypeAliasDeclaration(node) || ts9.isEnumDeclaration(node) || ts9.isModuleDeclaration(node) || ts9.isImportEqualsDeclaration(node) || ts9.isImportDeclaration(node) || ts9.isExportAssignment(node) || ts9.isExportDeclaration(node);
}
function hasType(node) {
  return isSignatureDeclaration(node) || ts9.isVariableDeclaration(node) || ts9.isParameter(node) || ts9.isPropertySignature(node) || ts9.isPropertyDeclaration(node) || ts9.isTypePredicateNode(node) || ts9.isParenthesizedTypeNode(node) || ts9.isTypeOperatorNode(node) || ts9.isMappedTypeNode(node) || ts9.isAssertionExpression(node) || ts9.isTypeAliasDeclaration(node) || ts9.isJSDocTypeExpression(node) || ts9.isJSDocNonNullableType(node) || ts9.isJSDocNullableType(node) || ts9.isJSDocOptionalType(node) || ts9.isJSDocVariadicType(node);
}
function hasTypeArguments(node) {
  return ts9.isCallExpression(node) || ts9.isNewExpression(node) || ts9.isTaggedTemplateExpression(node) || ts9.isJsxOpeningElement(node) || ts9.isJsxSelfClosingElement(node);
}
function isJSDocComment(node) {
  if (isJSDocText(node)) {
    return true;
  }
  if (isTsVersionAtLeast(4, 4)) {
    return ts9.isJSDocLink(node) || ts9.isJSDocLinkCode(node) || ts9.isJSDocLinkPlain(node);
  }
  return false;
}
function isJSDocNamespaceBody(node) {
  return ts9.isIdentifier(node) || isJSDocNamespaceDeclaration(node);
}
function isJSDocTypeReferencingNode(node) {
  return ts9.isJSDocVariadicType(node) || ts9.isJSDocOptionalType(node) || ts9.isJSDocNullableType(node) || ts9.isJSDocNonNullableType(node);
}
function isJsonObjectExpression(node) {
  return ts9.isObjectLiteralExpression(node) || ts9.isArrayLiteralExpression(node) || isJsonMinusNumericLiteral(node) || ts9.isNumericLiteral(node) || ts9.isStringLiteral(node) || isBooleanLiteral(node) || isNullLiteral(node);
}
function isJsxAttributeLike(node) {
  return ts9.isJsxAttribute(node) || ts9.isJsxSpreadAttribute(node);
}
function isJsxAttributeValue(node) {
  return ts9.isStringLiteral(node) || ts9.isJsxExpression(node) || ts9.isJsxElement(node) || ts9.isJsxSelfClosingElement(node) || ts9.isJsxFragment(node);
}
function isJsxChild(node) {
  return ts9.isJsxText(node) || ts9.isJsxExpression(node) || ts9.isJsxElement(node) || ts9.isJsxSelfClosingElement(node) || ts9.isJsxFragment(node);
}
function isJsxTagNameExpression(node) {
  return ts9.isIdentifier(node) || isThisExpression(node) || isJsxTagNamePropertyAccess(node);
}
function isLiteralToken(node) {
  return ts9.isNumericLiteral(node) || ts9.isBigIntLiteral(node) || ts9.isStringLiteral(node) || ts9.isJsxText(node) || ts9.isRegularExpressionLiteral(node) || ts9.isNoSubstitutionTemplateLiteral(node);
}
function isModuleBody(node) {
  return isNamespaceBody(node) || isJSDocNamespaceBody(node);
}
function isModuleName(node) {
  return ts9.isIdentifier(node) || ts9.isStringLiteral(node);
}
function isModuleReference(node) {
  return ts9.isEntityName(node) || ts9.isExternalModuleReference(node);
}
function isNamedImportBindings(node) {
  return ts9.isNamespaceImport(node) || ts9.isNamedImports(node);
}
function isNamedImportsOrExports(node) {
  return ts9.isNamedImports(node) || ts9.isNamedExports(node);
}
function isNamespaceBody(node) {
  return ts9.isModuleBlock(node) || isNamespaceDeclaration(node);
}
function isObjectBindingOrAssignmentElement(node) {
  return ts9.isBindingElement(node) || ts9.isPropertyAssignment(node) || ts9.isShorthandPropertyAssignment(node) || ts9.isSpreadAssignment(node);
}
function isObjectBindingOrAssignmentPattern(node) {
  return ts9.isObjectBindingPattern(node) || ts9.isObjectLiteralExpression(node);
}
function isObjectTypeDeclaration(node) {
  return (
    // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
    isClassLikeDeclaration(node) || ts9.isInterfaceDeclaration(node) || ts9.isTypeLiteralNode(node)
  );
}
function isParameterPropertyModifier(node) {
  return isAccessibilityModifier(node) || isReadonlyKeyword(node);
}
function isPropertyNameLiteral(node) {
  return ts9.isIdentifier(node) || ts9.isStringLiteralLike(node) || ts9.isNumericLiteral(node);
}
function isPseudoLiteralToken(node) {
  return ts9.isTemplateHead(node) || ts9.isTemplateMiddle(node) || ts9.isTemplateTail(node);
}
function isSignatureDeclaration(node) {
  return ts9.isCallSignatureDeclaration(node) || ts9.isConstructSignatureDeclaration(node) || ts9.isMethodSignature(node) || ts9.isIndexSignatureDeclaration(node) || ts9.isFunctionTypeNode(node) || ts9.isConstructorTypeNode(node) || ts9.isJSDocFunctionType(node) || ts9.isFunctionDeclaration(node) || ts9.isMethodDeclaration(node) || ts9.isConstructorDeclaration(node) || // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts <5
  isAccessorDeclaration(node) || ts9.isFunctionExpression(node) || ts9.isArrowFunction(node);
}
function isSuperProperty(node) {
  return isSuperPropertyAccessExpression(node) || isSuperElementAccessExpression(node);
}
function isTypeOnlyCompatibleAliasDeclaration(node) {
  if (ts9.isImportClause(node) || ts9.isImportEqualsDeclaration(node) || ts9.isNamespaceImport(node) || ts9.isImportOrExportSpecifier(node)) {
    return true;
  }
  if (isTsVersionAtLeast(5, 0) && (ts9.isExportDeclaration(node) || ts9.isNamespaceExport(node))) {
    return true;
  }
  return false;
}
function isTypeReferenceType(node) {
  return ts9.isTypeReferenceNode(node) || ts9.isExpressionWithTypeArguments(node);
}
function isUnionOrIntersectionTypeNode(node) {
  return ts9.isUnionTypeNode(node) || ts9.isIntersectionTypeNode(node);
}
function isUnparsedSourceText(node) {
  return ts9.isUnparsedPrepend(node) || ts9.isUnparsedTextLike(node);
}
function isVariableLikeDeclaration(node) {
  return ts9.isVariableDeclaration(node) || ts9.isParameter(node) || ts9.isBindingElement(node) || ts9.isPropertyDeclaration(node) || ts9.isPropertyAssignment(node) || ts9.isPropertySignature(node) || ts9.isJsxAttribute(node) || ts9.isShorthandPropertyAssignment(node) || ts9.isEnumMember(node) || ts9.isJSDocPropertyTag(node) || ts9.isJSDocParameterTag(node);
}

// src/nodes/typeGuards/compound.ts
function isConstAssertionExpression(node) {
  return ts10.isTypeReferenceNode(node.type) && ts10.isIdentifier(node.type.typeName) && node.type.typeName.escapedText === "const";
}
function isIterationStatement(node) {
  switch (node.kind) {
    case ts10.SyntaxKind.DoStatement:
    case ts10.SyntaxKind.ForInStatement:
    case ts10.SyntaxKind.ForOfStatement:
    case ts10.SyntaxKind.ForStatement:
    case ts10.SyntaxKind.WhileStatement:
      return true;
    default:
      return false;
  }
}
function isJSDocNamespaceDeclaration(node) {
  return ts10.isModuleDeclaration(node) && ts10.isIdentifier(node.name) && (node.body === void 0 || isJSDocNamespaceBody(node.body));
}
function isJsxTagNamePropertyAccess(node) {
  return ts10.isPropertyAccessExpression(node) && // eslint-disable-next-line deprecation/deprecation -- Keep compatibility with ts < 5
  isJsxTagNameExpression(node.expression);
}
function isNamedDeclarationWithName(node) {
  return "name" in node && node.name !== void 0 && node.name !== null && isDeclarationName(node.name);
}
function isNamespaceDeclaration(node) {
  return ts10.isModuleDeclaration(node) && ts10.isIdentifier(node.name) && node.body !== void 0 && isNamespaceBody(node.body);
}
function isNumericOrStringLikeLiteral(node) {
  switch (node.kind) {
    case ts10.SyntaxKind.StringLiteral:
    case ts10.SyntaxKind.NumericLiteral:
    case ts10.SyntaxKind.NoSubstitutionTemplateLiteral:
      return true;
    default:
      return false;
  }
}
function isPropertyAccessEntityNameExpression(node) {
  return ts10.isPropertyAccessExpression(node) && ts10.isIdentifier(node.name) && isEntityNameExpression(node.expression);
}
function isSuperElementAccessExpression(node) {
  return ts10.isElementAccessExpression(node) && isSuperExpression(node.expression);
}
function isSuperPropertyAccessExpression(node) {
  return ts10.isPropertyAccessExpression(node) && isSuperExpression(node.expression);
}

// src/scopes.ts
import ts11 from "typescript";
function isFunctionScopeBoundary(node) {
  switch (node.kind) {
    case ts11.SyntaxKind.FunctionExpression:
    case ts11.SyntaxKind.ArrowFunction:
    case ts11.SyntaxKind.Constructor:
    case ts11.SyntaxKind.ModuleDeclaration:
    case ts11.SyntaxKind.ClassDeclaration:
    case ts11.SyntaxKind.ClassExpression:
    case ts11.SyntaxKind.EnumDeclaration:
    case ts11.SyntaxKind.MethodDeclaration:
    case ts11.SyntaxKind.FunctionDeclaration:
    case ts11.SyntaxKind.GetAccessor:
    case ts11.SyntaxKind.SetAccessor:
    case ts11.SyntaxKind.MethodSignature:
    case ts11.SyntaxKind.CallSignature:
    case ts11.SyntaxKind.ConstructSignature:
    case ts11.SyntaxKind.ConstructorType:
    case ts11.SyntaxKind.FunctionType:
      return true;
    case ts11.SyntaxKind.SourceFile:
      return ts11.isExternalModule(node);
    default:
      return false;
  }
}

// src/types/getters.ts
import ts16 from "typescript";

// src/types/typeGuards/intrinsic.ts
import ts12 from "typescript";
function isIntrinsicAnyType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.Any);
}
function isIntrinsicBooleanType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.Boolean);
}
function isIntrinsicBigIntType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.BigInt);
}
function isIntrinsicErrorType(type) {
  return isIntrinsicType(type) && type.intrinsicName === "error";
}
function isIntrinsicESSymbolType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.ESSymbol);
}
var IntrinsicTypeFlags = ts12.TypeFlags.Intrinsic ?? ts12.TypeFlags.Any | ts12.TypeFlags.Unknown | ts12.TypeFlags.String | ts12.TypeFlags.Number | ts12.TypeFlags.BigInt | ts12.TypeFlags.Boolean | ts12.TypeFlags.BooleanLiteral | ts12.TypeFlags.ESSymbol | ts12.TypeFlags.Void | ts12.TypeFlags.Undefined | ts12.TypeFlags.Null | ts12.TypeFlags.Never | ts12.TypeFlags.NonPrimitive;
function isIntrinsicType(type) {
  return isTypeFlagSet(type, IntrinsicTypeFlags);
}
function isIntrinsicNeverType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.Never);
}
function isIntrinsicNonPrimitiveType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.NonPrimitive);
}
function isIntrinsicNullType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.Null);
}
function isIntrinsicNumberType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.Number);
}
function isIntrinsicStringType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.String);
}
function isIntrinsicUndefinedType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.Undefined);
}
function isIntrinsicUnknownType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.Unknown);
}
function isIntrinsicVoidType(type) {
  return isTypeFlagSet(type, ts12.TypeFlags.Void);
}

// src/types/typeGuards/objects.ts
import ts14 from "typescript";

// src/types/typeGuards/single.ts
import ts13 from "typescript";
function isConditionalType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Conditional);
}
function isEnumType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Enum);
}
function isFreshableType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Freshable);
}
function isIndexType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Index);
}
function isIndexedAccessType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.IndexedAccess);
}
function isInstantiableType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Instantiable);
}
function isIntersectionType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Intersection);
}
function isObjectType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Object);
}
function isStringMappingType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.StringMapping);
}
function isSubstitutionType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Substitution);
}
function isTypeParameter(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.TypeParameter);
}
function isTypeVariable(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.TypeVariable);
}
function isUnionType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.Union);
}
function isUnionOrIntersectionType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.UnionOrIntersection);
}
function isUniqueESSymbolType(type) {
  return isTypeFlagSet(type, ts13.TypeFlags.UniqueESSymbol);
}

// src/types/typeGuards/objects.ts
function isEvolvingArrayType(type) {
  return isObjectType(type) && isObjectFlagSet(type, ts14.ObjectFlags.EvolvingArray);
}
function isTupleType(type) {
  return isObjectType(type) && isObjectFlagSet(type, ts14.ObjectFlags.Tuple);
}
function isTypeReference(type) {
  return isObjectType(type) && isObjectFlagSet(type, ts14.ObjectFlags.Reference);
}

// src/types/typeGuards/compound.ts
function isFreshableIntrinsicType(type) {
  return isIntrinsicType(type) && isFreshableType(type);
}
function isTupleTypeReference(type) {
  return isTypeReference(type) && isTupleType(type.target);
}

// src/types/typeGuards/literal.ts
import ts15 from "typescript";
function isBooleanLiteralType(type) {
  return isTypeFlagSet(type, ts15.TypeFlags.BooleanLiteral);
}
function isBigIntLiteralType(type) {
  return isTypeFlagSet(type, ts15.TypeFlags.BigIntLiteral);
}
function isFalseLiteralType(type) {
  return isBooleanLiteralType(type) && type.intrinsicName === "false";
}
function isLiteralType(type) {
  return isTypeFlagSet(type, ts15.TypeFlags.Literal);
}
function isNumberLiteralType(type) {
  return isTypeFlagSet(type, ts15.TypeFlags.NumberLiteral);
}
function isStringLiteralType(type) {
  return isTypeFlagSet(type, ts15.TypeFlags.StringLiteral);
}
function isTemplateLiteralType(type) {
  return isTypeFlagSet(type, ts15.TypeFlags.TemplateLiteral);
}
function isTrueLiteralType(type) {
  return isBooleanLiteralType(type) && type.intrinsicName === "true";
}
function isUnknownLiteralType(type) {
  return isTypeFlagSet(type, ts15.TypeFlags.Literal);
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
    if (!isNamedDeclarationWithName(declaration) || declaration.name === void 0 || !ts16.isComputedPropertyName(declaration.name)) {
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
import ts18 from "typescript";

// src/nodes/utilities.ts
import ts17 from "typescript";
function isBindableObjectDefinePropertyCall(node) {
  return node.arguments.length === 3 && isEntityNameExpression(node.arguments[0]) && isNumericOrStringLikeLiteral(node.arguments[1]) && ts17.isPropertyAccessExpression(node.expression) && node.expression.name.escapedText === "defineProperty" && ts17.isIdentifier(node.expression.expression) && node.expression.expression.escapedText === "Object";
}
function isInConstContext(node, typeChecker) {
  let current = node;
  while (true) {
    const parent = current.parent;
    outer:
      switch (parent.kind) {
        case ts17.SyntaxKind.TypeAssertionExpression:
        case ts17.SyntaxKind.AsExpression:
          return isConstAssertionExpression(parent);
        case ts17.SyntaxKind.PrefixUnaryExpression:
          if (current.kind !== ts17.SyntaxKind.NumericLiteral) {
            return false;
          }
          switch (parent.operator) {
            case ts17.SyntaxKind.PlusToken:
            case ts17.SyntaxKind.MinusToken:
              current = parent;
              break outer;
            default:
              return false;
          }
        case ts17.SyntaxKind.PropertyAssignment:
          if (parent.initializer !== current) {
            return false;
          }
          current = parent.parent;
          break;
        case ts17.SyntaxKind.ShorthandPropertyAssignment:
          current = parent.parent;
          break;
        case ts17.SyntaxKind.ParenthesizedExpression:
        case ts17.SyntaxKind.ArrayLiteralExpression:
        case ts17.SyntaxKind.ObjectLiteralExpression:
        case ts17.SyntaxKind.TemplateExpression:
          current = parent;
          break;
        case ts17.SyntaxKind.CallExpression:
          if (!ts17.isExpression(current)) {
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
            ts17.CheckFlags.Readonly
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
    ts18.TypeFlags.Undefined | ts18.TypeFlags.Null | ts18.TypeFlags.Void
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
    if (prop.flags & ts18.SymbolFlags.Transient) {
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
    (isSymbolFlagSet(prop, ts18.SymbolFlags.ValueModule) || // we unwrapped every mapped type, now we can check the actual declarations
    symbolHasReadonlyDeclaration(prop, typeChecker));
  });
}
function isReadonlyPropertyFromMappedType(type, name, typeChecker) {
  if (!isObjectType(type) || !isObjectFlagSet(type, ts18.ObjectFlags.Mapped)) {
    return;
  }
  const declaration = type.symbol.declarations[0];
  if (declaration.readonlyToken !== void 0 && !/^__@[^@]+$/.test(name)) {
    return declaration.readonlyToken.kind !== ts18.SyntaxKind.MinusToken;
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
      const index = (isNumericPropertyName(name) ? typeChecker.getIndexInfoOfType(subType, ts18.IndexKind.Number) : void 0) ?? typeChecker.getIndexInfoOfType(subType, ts18.IndexKind.String);
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
  const writableType = writableProp.valueDeclaration !== void 0 && ts18.isPropertyAssignment(writableProp.valueDeclaration) ? typeChecker.getTypeAtLocation(writableProp.valueDeclaration.initializer) : typeChecker.getTypeOfSymbolAtLocation(writableProp, node.arguments[2]);
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
  return !!((symbol.flags & ts18.SymbolFlags.Accessor) === ts18.SymbolFlags.GetAccessor || symbol.declarations?.some(
    (node) => isModifierFlagSet(node, ts18.ModifierFlags.Readonly) || ts18.isVariableDeclaration(node) && isNodeFlagSet(node.parent, ts18.NodeFlags.Const) || ts18.isCallExpression(node) && isReadonlyAssignmentDeclaration(node, typeChecker) || ts18.isEnumMember(node) || (ts18.isPropertyAssignment(node) || ts18.isShorthandPropertyAssignment(node)) && isInConstContext(node, typeChecker)
  ));
}
function unionTypeParts(type) {
  return isUnionType(type) ? type.types : [type];
}
function typeIsLiteral(type) {
  if (import_semver.default.lt(ts18.version, "5.0.0")) {
    return isTypeFlagSet(
      type,
      ts18.TypeFlags.StringLiteral | ts18.TypeFlags.NumberLiteral | ts18.TypeFlags.BigIntLiteral
    );
  } else {
    return type.isLiteral();
  }
}

// src/usage/UsageWalker.ts
import ts24 from "typescript";

// src/usage/Scope.ts
import ts19 from "typescript";
function isBlockScopeBoundary(node) {
  switch (node.kind) {
    case ts19.SyntaxKind.Block: {
      const parent = node.parent;
      return parent.kind !== ts19.SyntaxKind.CatchClause && // blocks inside SourceFile are block scope boundaries
      (parent.kind === ts19.SyntaxKind.SourceFile || // blocks that are direct children of a function scope boundary are no scope boundary
      // for example the FunctionBlock is part of the function scope of the containing function
      !isFunctionScopeBoundary(parent)) ? 2 /* Block */ : 0 /* None */;
    }
    case ts19.SyntaxKind.ForStatement:
    case ts19.SyntaxKind.ForInStatement:
    case ts19.SyntaxKind.ForOfStatement:
    case ts19.SyntaxKind.CaseBlock:
    case ts19.SyntaxKind.CatchClause:
    case ts19.SyntaxKind.WithStatement:
      return 2 /* Block */;
    default:
      return 0 /* None */;
  }
}

// src/usage/declarations.ts
import ts21 from "typescript";

// src/usage/utils.ts
import ts20 from "typescript";
function identifierToKeywordKind(node) {
  return "identifierToKeywordKind" in ts20 ? ts20.identifierToKeywordKind(node) : (
    // eslint-disable-next-line deprecation/deprecation
    node.originalKeywordKind
  );
}
function canHaveDecorators(node) {
  return "canHaveDecorators" in ts20 ? ts20.canHaveDecorators(node) : "decorators" in node;
}
function getDecorators(node) {
  return "getDecorators" in ts20 ? ts20.getDecorators(node) : node.decorators;
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
    case ts21.SyntaxKind.TypeParameter:
    case ts21.SyntaxKind.InterfaceDeclaration:
    case ts21.SyntaxKind.TypeAliasDeclaration:
      return 2 /* Type */;
    case ts21.SyntaxKind.ClassDeclaration:
    case ts21.SyntaxKind.ClassExpression:
      return 2 /* Type */ | 4 /* Value */;
    case ts21.SyntaxKind.EnumDeclaration:
      return 7 /* Any */;
    case ts21.SyntaxKind.NamespaceImport:
    case ts21.SyntaxKind.ImportClause:
      return 7 /* Any */ | 8 /* Import */;
    case ts21.SyntaxKind.ImportEqualsDeclaration:
    case ts21.SyntaxKind.ImportSpecifier:
      return node.parent.name === node ? 7 /* Any */ | 8 /* Import */ : void 0;
    case ts21.SyntaxKind.ModuleDeclaration:
      return 1 /* Namespace */;
    case ts21.SyntaxKind.Parameter:
      if (node.parent.parent.kind === ts21.SyntaxKind.IndexSignature || identifierToKeywordKind(node) === ts21.SyntaxKind.ThisKeyword) {
        return;
      }
    case ts21.SyntaxKind.BindingElement:
    case ts21.SyntaxKind.VariableDeclaration:
      return node.parent.name === node ? 4 /* Value */ : void 0;
    case ts21.SyntaxKind.FunctionDeclaration:
    case ts21.SyntaxKind.FunctionExpression:
      return 4 /* Value */;
  }
}

// src/usage/getPropertyName.ts
import ts22 from "typescript";
function unwrapParentheses(node) {
  while (node.kind === ts22.SyntaxKind.ParenthesizedExpression) {
    node = node.expression;
  }
  return node;
}
function getPropertyName(propertyName) {
  if (propertyName.kind === ts22.SyntaxKind.ComputedPropertyName) {
    const expression = unwrapParentheses(propertyName.expression);
    if (ts22.isPrefixUnaryExpression(expression)) {
      let negate = false;
      switch (expression.operator) {
        case ts22.SyntaxKind.MinusToken:
          negate = true;
        case ts22.SyntaxKind.PlusToken:
          return ts22.isNumericLiteral(expression.operand) ? `${negate ? "-" : ""}${expression.operand.text}` : ts22.isBigIntLiteral(expression.operand) ? `${negate ? "-" : ""}${expression.operand.text.slice(0, -1)}` : void 0;
        default:
          return;
      }
    }
    if (ts22.isBigIntLiteral(expression)) {
      return expression.text.slice(0, -1);
    }
    if (isNumericOrStringLikeLiteral(expression)) {
      return expression.text;
    }
    return;
  }
  return propertyName.kind === ts22.SyntaxKind.PrivateIdentifier ? void 0 : propertyName.text;
}

// src/usage/getUsageDomain.ts
import ts23 from "typescript";
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
    case ts23.SyntaxKind.TypeReference:
      return identifierToKeywordKind(node) !== ts23.SyntaxKind.ConstKeyword ? 2 /* Type */ : void 0;
    case ts23.SyntaxKind.ExpressionWithTypeArguments:
      return parent.parent.token === ts23.SyntaxKind.ImplementsKeyword || parent.parent.parent.kind === ts23.SyntaxKind.InterfaceDeclaration ? 2 /* Type */ : 4 /* Value */;
    case ts23.SyntaxKind.TypeQuery:
      return 5 /* ValueOrNamespace */ | 8 /* TypeQuery */;
    case ts23.SyntaxKind.QualifiedName:
      if (parent.left === node) {
        if (getEntityNameParent(parent).kind === ts23.SyntaxKind.TypeQuery) {
          return 1 /* Namespace */ | 8 /* TypeQuery */;
        }
        return 1 /* Namespace */;
      }
      break;
    case ts23.SyntaxKind.ExportSpecifier:
      if (parent.propertyName === void 0 || parent.propertyName === node) {
        return 7 /* Any */;
      }
      break;
    case ts23.SyntaxKind.ExportAssignment:
      return 7 /* Any */;
    case ts23.SyntaxKind.BindingElement:
      if (parent.initializer === node) {
        return 5 /* ValueOrNamespace */;
      }
      break;
    case ts23.SyntaxKind.Parameter:
    case ts23.SyntaxKind.EnumMember:
    case ts23.SyntaxKind.PropertyDeclaration:
    case ts23.SyntaxKind.VariableDeclaration:
    case ts23.SyntaxKind.PropertyAssignment:
    case ts23.SyntaxKind.PropertyAccessExpression:
    case ts23.SyntaxKind.ImportEqualsDeclaration:
      if (parent.name !== node) {
        return 5 /* ValueOrNamespace */;
      }
      break;
    case ts23.SyntaxKind.JsxAttribute:
    case ts23.SyntaxKind.FunctionDeclaration:
    case ts23.SyntaxKind.FunctionExpression:
    case ts23.SyntaxKind.NamespaceImport:
    case ts23.SyntaxKind.ClassDeclaration:
    case ts23.SyntaxKind.ClassExpression:
    case ts23.SyntaxKind.ModuleDeclaration:
    case ts23.SyntaxKind.MethodDeclaration:
    case ts23.SyntaxKind.EnumDeclaration:
    case ts23.SyntaxKind.GetAccessor:
    case ts23.SyntaxKind.SetAccessor:
    case ts23.SyntaxKind.LabeledStatement:
    case ts23.SyntaxKind.BreakStatement:
    case ts23.SyntaxKind.ContinueStatement:
    case ts23.SyntaxKind.ImportClause:
    case ts23.SyntaxKind.ImportSpecifier:
    case ts23.SyntaxKind.TypePredicate:
    case ts23.SyntaxKind.MethodSignature:
    case ts23.SyntaxKind.PropertySignature:
    case ts23.SyntaxKind.NamespaceExportDeclaration:
    case ts23.SyntaxKind.NamespaceExport:
    case ts23.SyntaxKind.InterfaceDeclaration:
    case ts23.SyntaxKind.TypeAliasDeclaration:
    case ts23.SyntaxKind.TypeParameter:
    case ts23.SyntaxKind.NamedTupleMember:
      break;
    default:
      return 5 /* ValueOrNamespace */;
  }
}
function getEntityNameParent(name) {
  let parent = name.parent;
  while (parent.kind === ts23.SyntaxKind.QualifiedName) {
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
    const isModule = ts24.isExternalModule(sourceFile);
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
        case ts24.SyntaxKind.ClassExpression:
          return continueWithScope(
            node,
            node.name !== void 0 ? new ClassExpressionScope(
              node.name,
              __privateGet(this, _scope)
            ) : new NonRootScope(__privateGet(this, _scope), 1 /* Function */)
          );
        case ts24.SyntaxKind.ClassDeclaration:
          __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, true, 4 /* Value */ | 2 /* Type */);
          return continueWithScope(
            node,
            new NonRootScope(__privateGet(this, _scope), 1 /* Function */)
          );
        case ts24.SyntaxKind.InterfaceDeclaration:
        case ts24.SyntaxKind.TypeAliasDeclaration:
          __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, true, 2 /* Type */);
          return continueWithScope(
            node,
            new NonRootScope(__privateGet(this, _scope), 4 /* Type */)
          );
        case ts24.SyntaxKind.EnumDeclaration:
          __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, true, 7 /* Any */);
          return continueWithScope(
            node,
            __privateGet(this, _scope).createOrReuseEnumScope(
              node.name.text,
              includesModifier(
                node.modifiers,
                ts24.SyntaxKind.ExportKeyword
              )
            )
          );
        case ts24.SyntaxKind.ModuleDeclaration:
          return __privateMethod(this, _handleModule, handleModule_fn).call(this, node, continueWithScope);
        case ts24.SyntaxKind.MappedType:
          return continueWithScope(
            node,
            new NonRootScope(__privateGet(this, _scope), 4 /* Type */)
          );
        case ts24.SyntaxKind.FunctionExpression:
        case ts24.SyntaxKind.ArrowFunction:
        case ts24.SyntaxKind.Constructor:
        case ts24.SyntaxKind.MethodDeclaration:
        case ts24.SyntaxKind.FunctionDeclaration:
        case ts24.SyntaxKind.GetAccessor:
        case ts24.SyntaxKind.SetAccessor:
        case ts24.SyntaxKind.MethodSignature:
        case ts24.SyntaxKind.CallSignature:
        case ts24.SyntaxKind.ConstructSignature:
        case ts24.SyntaxKind.ConstructorType:
        case ts24.SyntaxKind.FunctionType:
          return __privateMethod(this, _handleFunctionLikeDeclaration, handleFunctionLikeDeclaration_fn).call(this, node, cb, variableCallback);
        case ts24.SyntaxKind.ConditionalType:
          return __privateMethod(this, _handleConditionalType, handleConditionalType_fn).call(this, node, cb, variableCallback);
        case ts24.SyntaxKind.VariableDeclarationList:
          __privateMethod(this, _handleVariableDeclaration, handleVariableDeclaration_fn).call(this, node);
          break;
        case ts24.SyntaxKind.Parameter:
          if (node.parent.kind !== ts24.SyntaxKind.IndexSignature && (node.name.kind !== ts24.SyntaxKind.Identifier || identifierToKeywordKind(
            node.name
          ) !== ts24.SyntaxKind.ThisKeyword)) {
            __privateMethod(this, _handleBindingName, handleBindingName_fn).call(this, node.name, false, false);
          }
          break;
        case ts24.SyntaxKind.EnumMember:
          __privateGet(this, _scope).addVariable(
            getPropertyName(node.name),
            node.name,
            1 /* Function */,
            true,
            4 /* Value */
          );
          break;
        case ts24.SyntaxKind.ImportClause:
        case ts24.SyntaxKind.ImportSpecifier:
        case ts24.SyntaxKind.NamespaceImport:
        case ts24.SyntaxKind.ImportEqualsDeclaration:
          __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, false, 7 /* Any */ | 8 /* Import */);
          break;
        case ts24.SyntaxKind.TypeParameter:
          __privateGet(this, _scope).addVariable(
            node.name.text,
            node.name,
            node.parent.kind === ts24.SyntaxKind.InferType ? 8 /* InferType */ : 7 /* Type */,
            false,
            2 /* Type */
          );
          break;
        case ts24.SyntaxKind.ExportSpecifier:
          if (node.propertyName !== void 0) {
            return __privateGet(this, _scope).markExported(
              node.propertyName,
              node.name
            );
          }
          return __privateGet(this, _scope).markExported(node.name);
        case ts24.SyntaxKind.ExportAssignment:
          if (node.expression.kind === ts24.SyntaxKind.Identifier) {
            return __privateGet(this, _scope).markExported(
              node.expression
            );
          }
          break;
        case ts24.SyntaxKind.Identifier: {
          const domain = getUsageDomain(node);
          if (domain !== void 0) {
            __privateGet(this, _scope).addUse({ domain, location: node });
          }
          return;
        }
      }
      return ts24.forEachChild(node, cb);
    };
    const continueWithScope = (node, scope, next = forEachChild) => {
      const savedScope = __privateGet(this, _scope);
      __privateSet(this, _scope, scope);
      next(node);
      __privateGet(this, _scope).end(variableCallback);
      __privateSet(this, _scope, savedScope);
    };
    const handleBlockScope = (node) => {
      if (node.kind === ts24.SyntaxKind.CatchClause && node.variableDeclaration !== void 0) {
        __privateMethod(this, _handleBindingName, handleBindingName_fn).call(this, node.variableDeclaration.name, true, false);
      }
      return ts24.forEachChild(node, cb);
    };
    ts24.forEachChild(sourceFile, cb);
    __privateGet(this, _scope).end(variableCallback);
    return __privateGet(this, _result);
    function forEachChild(node) {
      return ts24.forEachChild(node, cb);
    }
  }
};
_result = new WeakMap();
_scope = new WeakMap();
_handleBindingName = new WeakSet();
handleBindingName_fn = function(name, blockScoped, exported) {
  if (name.kind === ts24.SyntaxKind.Identifier) {
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
        ts24.SyntaxKind.ExportKeyword
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
  if (node.kind === ts24.SyntaxKind.FunctionDeclaration) {
    __privateMethod(this, _handleDeclaration, handleDeclaration_fn).call(this, node, false, 4 /* Value */);
  }
  const scope = __privateSet(this, _scope, node.kind === ts24.SyntaxKind.FunctionExpression && node.name !== void 0 ? new FunctionExpressionScope(node.name, savedScope) : new FunctionScope(savedScope));
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
  if (node.flags & ts24.NodeFlags.GlobalAugmentation) {
    return next(
      node,
      __privateGet(this, _scope).createOrReuseNamespaceScope("-global", false, true, false)
    );
  }
  if (node.name.kind === ts24.SyntaxKind.Identifier) {
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
      ts24.SyntaxKind.DeclareKeyword
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
  const exported = declarationList.parent.kind === ts24.SyntaxKind.VariableStatement && includesModifier(
    declarationList.parent.modifiers,
    ts24.SyntaxKind.ExportKeyword
  );
  for (const declaration of declarationList.declarations) {
    __privateMethod(this, _handleBindingName, handleBindingName_fn).call(this, declaration.name, blockScoped, exported);
  }
};
function isNamespaceExported(node) {
  return node.parent.kind === ts24.SyntaxKind.ModuleDeclaration || includesModifier(node.modifiers, ts24.SyntaxKind.ExportKeyword);
}
function namespaceHasExportStatement(ns) {
  if (ns.body === void 0 || ns.body.kind !== ts24.SyntaxKind.ModuleBlock) {
    return false;
  }
  return containsExportStatement(ns.body);
}
function containsExportStatement(block) {
  for (const statement of block.statements) {
    if (statement.kind === ts24.SyntaxKind.ExportDeclaration || statement.kind === ts24.SyntaxKind.ExportAssignment) {
      return true;
    }
  }
  return false;
}
function isBlockScopedVariableDeclarationList(declarationList) {
  return (declarationList.flags & ts24.NodeFlags.BlockScoped) !== 0;
}
function forEachDestructuringIdentifier(pattern, fn) {
  for (const element of pattern.elements) {
    if (element.kind !== ts24.SyntaxKind.BindingElement) {
      continue;
    }
    let result;
    if (element.name.kind === ts24.SyntaxKind.Identifier) {
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
export {
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
};
//# sourceMappingURL=index.js.map