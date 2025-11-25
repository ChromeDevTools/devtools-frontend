"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _exportParser = _interopRequireDefault(require("../exportParser.cjs"));
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * We can skip checking for a return value, in case the documentation is inherited
 * or the method is either a constructor or an abstract method.
 *
 * In either of these cases the return value is optional or not defined.
 * @param {import('../iterateJsdoc.js').Utils} utils
 *   a reference to the utils which are used to probe if a tag is present or not.
 * @returns {boolean}
 *   true in case deep checking can be skipped; otherwise false.
 */
const canSkip = utils => {
  return utils.hasATag([
  // inheritdoc implies that all documentation is inherited
  // see https://jsdoc.app/tags-inheritdoc.html
  //
  // Abstract methods are by definition incomplete,
  // so it is not an error if it declares a return value but does not implement it.
  'abstract', 'virtual',
  // Constructors do not have a return value by definition (https://jsdoc.app/tags-class.html)
  // So we can bail out here, too.
  'class', 'constructor',
  // Return type is specified by type in @type
  'type',
  // This seems to imply a class as well
  'interface']) || utils.avoidDocs();
};
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  info: {
    comment
  },
  node,
  report,
  settings,
  utils
}) => {
  const {
    contexts,
    enableFixer = false,
    forceRequireReturn = false,
    forceReturnsWithAsync = false,
    publicOnly = false
  } = context.options[0] || {};

  // A preflight check. We do not need to run a deep check
  // in case the @returns comment is optional or undefined.
  if (canSkip(utils)) {
    return;
  }

  /** @type {boolean|undefined} */
  let forceRequireReturnContext;
  if (contexts) {
    const {
      foundContext
    } = utils.findContext(contexts, comment);
    if (typeof foundContext === 'object') {
      forceRequireReturnContext = foundContext.forceRequireReturn;
    }
  }
  const tagName = /** @type {string} */utils.getPreferredTagName({
    tagName: 'returns'
  });
  if (!tagName) {
    return;
  }
  const tags = utils.getTags(tagName);
  if (tags.length > 1) {
    report(`Found more than one @${tagName} declaration.`);
  }
  const iteratingFunction = utils.isIteratingFunction();

  // In case the code returns something, we expect a return value in JSDoc.
  const [tag] = tags;
  const missingReturnTag = typeof tag === 'undefined' || tag === null;
  const shouldReport = () => {
    if (!missingReturnTag) {
      return false;
    }
    if (publicOnly) {
      /** @type {import('./requireJsdoc.js').RequireJsdocOpts} */
      const opt = {
        ancestorsOnly: Boolean(publicOnly?.ancestorsOnly ?? false),
        esm: Boolean(publicOnly?.esm ?? true),
        initModuleExports: Boolean(publicOnly?.cjs ?? true),
        initWindow: Boolean(publicOnly?.window ?? false)
      };
      /* c8 ignore next -- Fallback to deprecated method */
      const {
        sourceCode = context.getSourceCode()
      } = context;
      const exported = _exportParser.default.isUncommentedExport(/** @type {import('eslint').Rule.Node} */node, sourceCode, opt, settings);
      if (!exported) {
        return false;
      }
    }
    if ((forceRequireReturn || forceRequireReturnContext) && (iteratingFunction || utils.isVirtualFunction())) {
      return true;
    }
    const isAsync = !iteratingFunction && utils.hasTag('async') || iteratingFunction && utils.isAsync();
    if (forceReturnsWithAsync && isAsync) {
      return true;
    }
    return iteratingFunction && utils.hasValueOrExecutorHasNonEmptyResolveValue(forceReturnsWithAsync);
  };
  if (shouldReport()) {
    utils.reportJSDoc(`Missing JSDoc @${tagName} declaration.`, null, enableFixer ? () => {
      utils.addTag(tagName);
    } : null);
  }
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'Requires that returns are documented with `@returns`.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-returns.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      additionalProperties: false,
      properties: {
        checkConstructors: {
          default: false,
          description: `A value indicating whether \`constructor\`s should
be checked for \`@returns\` tags. Defaults to \`false\`.`,
          type: 'boolean'
        },
        checkGetters: {
          default: true,
          description: `Boolean to determine whether getter methods should
be checked for \`@returns\` tags. Defaults to \`true\`.`,
          type: 'boolean'
        },
        contexts: {
          description: `Set this to an array of strings representing the AST context
(or objects with optional \`context\` and \`comment\` properties) where you wish
the rule to be applied.

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Overrides the default contexts (\`ArrowFunctionExpression\`, \`FunctionDeclaration\`,
\`FunctionExpression\`). Set to \`"any"\` if you want
the rule to apply to any JSDoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., \`@callback\` or \`@function\` (or its aliases \`@func\` or
\`@method\`) (including those associated with an \`@interface\`). This
rule will only apply on non-default contexts when there is such a tag
present and the \`forceRequireReturn\` option is set or if the
\`forceReturnsWithAsync\` option is set with a present \`@async\` tag
(since we are not checking against the actual \`return\` values in these
cases).`,
          items: {
            anyOf: [{
              type: 'string'
            }, {
              additionalProperties: false,
              properties: {
                comment: {
                  type: 'string'
                },
                context: {
                  type: 'string'
                },
                forceRequireReturn: {
                  type: 'boolean'
                }
              },
              type: 'object'
            }]
          },
          type: 'array'
        },
        enableFixer: {
          description: `Whether to enable the fixer to add a blank \`@returns\`.
Defaults to \`false\`.`,
          type: 'boolean'
        },
        exemptedBy: {
          description: `Array of tags (e.g., \`['type']\`) whose presence on the
document block avoids the need for a \`@returns\`. Defaults to an array
with \`inheritdoc\`. If you set this array, it will overwrite the default,
so be sure to add back \`inheritdoc\` if you wish its presence to cause
exemption of the rule.`,
          items: {
            type: 'string'
          },
          type: 'array'
        },
        forceRequireReturn: {
          default: false,
          description: `Set to \`true\` to always insist on
\`@returns\` documentation regardless of implicit or explicit \`return\`'s
in the function. May be desired to flag that a project is aware of an
\`undefined\`/\`void\` return. Defaults to \`false\`.`,
          type: 'boolean'
        },
        forceReturnsWithAsync: {
          default: false,
          description: `By default \`async\` functions that do not explicitly
return a value pass this rule as an \`async\` function will always return a
\`Promise\`, even if the \`Promise\` resolves to void. You can force all
\`async\` functions (including ones with an explicit \`Promise\` but no
detected non-\`undefined\` \`resolve\` value) to require \`@return\`
documentation by setting \`forceReturnsWithAsync\` to \`true\` on the options
object. This may be useful for flagging that there has been consideration
of return type. Defaults to \`false\`.`,
          type: 'boolean'
        },
        publicOnly: {
          description: `This option will insist that missing \`@returns\` are only reported for
function bodies / class declarations that are exported from the module.
May be a boolean or object. If set to \`true\`, the defaults below will be
used. If unset, \`@returns\` reporting will not be limited to exports.

This object supports the following optional boolean keys (\`false\` unless
otherwise noted):

- \`ancestorsOnly\` - Optimization to only check node ancestors to check if node is exported
- \`esm\` - ESM exports are checked for \`@returns\` JSDoc comments (Defaults to \`true\`)
- \`cjs\` - CommonJS exports are checked for \`@returns\` JSDoc comments  (Defaults to \`true\`)
- \`window\` - Window global exports are checked for \`@returns\` JSDoc comments`,
          oneOf: [{
            default: false,
            type: 'boolean'
          }, {
            additionalProperties: false,
            default: {},
            properties: {
              ancestorsOnly: {
                type: 'boolean'
              },
              cjs: {
                type: 'boolean'
              },
              esm: {
                type: 'boolean'
              },
              window: {
                type: 'boolean'
              }
            },
            type: 'object'
          }]
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=requireReturns.cjs.map