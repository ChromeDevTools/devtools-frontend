"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
var _jsdoccomment = require("@es-joy/jsdoccomment");
var resolve = _interopRequireWildcard(require("@es-joy/resolve.exports"));
var _nodeFs = require("node:fs");
var _nodeModule = require("node:module");
var _nodePath = require("node:path");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @type {Set<string>|null}
 */
let deps;
const setDeps = function () {
  try {
    const pkg = JSON.parse((0, _nodeFs.readFileSync)((0, _nodePath.join)(process.cwd(), './package.json'), 'utf8'));
    deps = new Set([...(pkg.dependencies ? /* c8 ignore next 2 */
    Object.keys(pkg.dependencies) : []), ...(pkg.devDependencies ? /* c8 ignore next 2 */
    Object.keys(pkg.devDependencies) : [])]);
    /* c8 ignore next -- our package.json exists */
  } catch (error) {
    /* c8 ignore next -- our package.json exists */
    deps = null;
    /* c8 ignore next 4 -- our package.json exists */
    /* eslint-disable no-console -- Inform user */
    console.log(error);
    /* eslint-enable no-console -- Inform user */
  }
};
const moduleCheck = new Map();
var _default = exports.default = (0, _iterateJsdoc.default)(({
  jsdoc,
  settings,
  utils
}) => {
  if (deps === undefined) {
    setDeps();
  }

  /* c8 ignore next 3 -- our package.json exists */
  if (deps === null) {
    return;
  }
  const {
    mode
  } = settings;
  for (const tag of jsdoc.tags) {
    let typeAst;
    try {
      typeAst = mode === 'permissive' ? (0, _jsdoccomment.tryParse)(tag.type) : (0, _jsdoccomment.parse)(tag.type, mode);
    } catch {
      continue;
    }

    // eslint-disable-next-line no-loop-func -- Safe
    (0, _jsdoccomment.traverse)(typeAst, nde => {
      /* c8 ignore next 3 -- TS guard */
      if (deps === null) {
        return;
      }
      if (nde.type === 'JsdocTypeImport') {
        let mod = nde.element.value.replace(/^(@[^\/]+\/[^\/]+|[^\/]+).*$/v, '$1');
        if (/^[.\/]/v.test(mod)) {
          return;
        }
        if ((0, _nodeModule.isBuiltin)(mod)) {
          // mod = '@types/node';
          // moduleCheck.set(mod, !deps.has(mod));
          return;
        } else if (!moduleCheck.has(mod)) {
          let pkg;
          try {
            pkg = JSON.parse((0, _nodeFs.readFileSync)((0, _nodePath.join)(process.cwd(), 'node_modules', mod, './package.json'), 'utf8'));
          } catch {
            // Ignore
          }
          if (!pkg || !pkg.types && !pkg.typings && !resolve.types(pkg)) {
            mod = `@types/${mod}`;
          }
          moduleCheck.set(mod, !deps.has(mod));
        }
        if (moduleCheck.get(mod)) {
          utils.reportJSDoc('import points to package which is not found in dependencies', tag);
        }
      }
    });
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Reports if JSDoc `import()` statements point to a package which is not listed in `dependencies` or `devDependencies`',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/imports-as-dependencies.md#repos-sticky-header'
    },
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=importsAsDependencies.cjs.map