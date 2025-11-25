import exportParser from '../exportParser.js';
import {
  getSettings,
} from '../iterateJsdoc.js';
import {
  enforcedContexts,
  exemptSpeciaMethods,
  getContextObject,
  getFunctionParameterNames,
  getIndent,
  hasReturnValue,
  isConstructor,
} from '../jsdocUtils.js';
import {
  getDecorator,
  getJSDocComment,
  getReducedASTNode,
} from '@es-joy/jsdoccomment';

/**
 * @typedef {{
 *   ancestorsOnly: boolean,
 *   esm: boolean,
 *   initModuleExports: boolean,
 *   initWindow: boolean
 * }} RequireJsdocOpts
 */

/**
 * @typedef {import('eslint').Rule.Node|
 *   import('@typescript-eslint/types').TSESTree.Node} ESLintOrTSNode
 */

/** @type {import('json-schema').JSONSchema4} */
const OPTIONS_SCHEMA = {
  additionalProperties: false,
  description: 'Has the following optional keys.\n',
  properties: {
    checkConstructors: {
      default: true,
      description: `A value indicating whether \`constructor\`s should be checked. Defaults to
\`true\`. When \`true\`, \`exemptEmptyConstructors\` may still avoid reporting when
no parameters or return values are found.`,
      type: 'boolean',
    },
    checkGetters: {
      anyOf: [
        {
          type: 'boolean',
        },
        {
          enum: [
            'no-setter',
          ],
          type: 'string',
        },
      ],
      default: true,
      description: `A value indicating whether getters should be checked. Besides setting as a
boolean, this option can be set to the string \`"no-setter"\` to indicate that
getters should be checked but only when there is no setter. This may be useful
if one only wishes documentation on one of the two accessors. Defaults to
\`false\`.`,
    },
    checkSetters: {
      anyOf: [
        {
          type: 'boolean',
        },
        {
          enum: [
            'no-getter',
          ],
          type: 'string',
        },
      ],
      default: true,
      description: `A value indicating whether setters should be checked. Besides setting as a
boolean, this option can be set to the string \`"no-getter"\` to indicate that
setters should be checked but only when there is no getter. This may be useful
if one only wishes documentation on one of the two accessors. Defaults to
\`false\`.`,
    },
    contexts: {
      description: `Set this to an array of strings or objects representing the additional AST
contexts where you wish the rule to be applied (e.g., \`Property\` for
properties). If specified as an object, it should have a \`context\` property
and can have an \`inlineCommentBlock\` property which, if set to \`true\`, will
add an inline \`/** */\` instead of the regular, multi-line, indented jsdoc
block which will otherwise be added. Defaults to an empty array. Contexts
may also have their own \`minLineCount\` property which is an integer
indicating a minimum number of lines expected for a node in order
for it to require documentation.

Note that you may need to disable \`require\` items (e.g., \`MethodDefinition\`)
if you are specifying a more precise form in \`contexts\` (e.g., \`MethodDefinition:not([accessibility="private"] > FunctionExpression\`).

See the ["AST and Selectors"](../#advanced-ast-and-selectors)
section of our Advanced docs for more on the expected format.`,
      items: {
        anyOf: [
          {
            type: 'string',
          },
          {
            additionalProperties: false,
            properties: {
              context: {
                type: 'string',
              },
              inlineCommentBlock: {
                type: 'boolean',
              },
              minLineCount: {
                type: 'integer',
              },
            },
            type: 'object',
          },
        ],
      },
      type: 'array',
    },
    enableFixer: {
      default: true,
      description: `A boolean on whether to enable the fixer (which adds an empty JSDoc block).
Defaults to \`true\`.`,
      type: 'boolean',
    },
    exemptEmptyConstructors: {
      default: false,
      description: `When \`true\`, the rule will not report missing JSDoc blocks above constructors
with no parameters or return values (this is enabled by default as the class
name or description should be seen as sufficient to convey intent).

Defaults to \`true\`.`,
      type: 'boolean',
    },
    exemptEmptyFunctions: {
      default: false,
      description: `When \`true\`, the rule will not report missing JSDoc blocks above
functions/methods with no parameters or return values (intended where
function/method names are sufficient for themselves as documentation).

Defaults to \`false\`.`,
      type: 'boolean',
    },
    exemptOverloadedImplementations: {
      default: false,
      description: `If set to \`true\` will avoid checking an overloaded function's implementation.

Defaults to \`false\`.`,
      type: 'boolean',
    },
    fixerMessage: {
      default: '',
      description: `An optional message to add to the inserted JSDoc block. Defaults to the
empty string.`,
      type: 'string',
    },
    minLineCount: {
      description: `An integer to indicate a minimum number of lines expected for a node in order
for it to require documentation. Defaults to \`undefined\`. This option will
apply to any context; see \`contexts\` for line counts specific to a context.`,
      type: 'integer',
    },
    publicOnly: {
      description: `This option will insist that missing JSDoc blocks are only reported for
function bodies / class declarations that are exported from the module.
May be a boolean or object. If set to \`true\`, the defaults below will be
used. If unset, JSDoc block reporting will not be limited to exports.

This object supports the following optional boolean keys (\`false\` unless
otherwise noted):

- \`ancestorsOnly\` - Optimization to only check node ancestors to check if node is exported
- \`esm\` - ESM exports are checked for JSDoc comments (Defaults to \`true\`)
- \`cjs\` - CommonJS exports are checked for JSDoc comments  (Defaults to \`true\`)
- \`window\` - Window global exports are checked for JSDoc comments`,
      oneOf: [
        {
          default: false,
          type: 'boolean',
        },
        {
          additionalProperties: false,
          default: {},
          properties: {
            ancestorsOnly: {
              type: 'boolean',
            },
            cjs: {
              type: 'boolean',
            },
            esm: {
              type: 'boolean',
            },
            window: {
              type: 'boolean',
            },
          },
          type: 'object',
        },
      ],
    },
    require: {
      additionalProperties: false,
      default: {},
      description: `An object with the following optional boolean keys which all default to
\`false\` except for \`FunctionDeclaration\` which defaults to \`true\`.`,
      properties: {
        ArrowFunctionExpression: {
          default: false,
          description: 'Whether to check arrow functions like `() => {}`',
          type: 'boolean',
        },
        ClassDeclaration: {
          default: false,
          description: 'Whether to check declarations like `class A {}`',
          type: 'boolean',
        },
        ClassExpression: {
          default: false,
          description: 'Whether to check class expressions like `const myClass = class {}`',
          type: 'boolean',
        },
        FunctionDeclaration: {
          default: true,
          description: 'Whether to check function declarations like `function a {}`',
          type: 'boolean',
        },
        FunctionExpression: {
          default: false,
          description: 'Whether to check function expressions like `const a = function {}`',
          type: 'boolean',
        },
        MethodDefinition: {
          default: false,
          description: 'Whether to check method definitions like `class A { someMethodDefinition () {} }`',
          type: 'boolean',
        },
      },
      type: 'object',
    },
    skipInterveningOverloadedDeclarations: {
      default: true,
      description: `If \`true\`, will skip above uncommented overloaded functions to check
for a comment block (e.g., at the top of a set of overloaded functions).

If \`false\`, will force each overloaded function to be checked for a
comment block.

Defaults to \`true\`.`,
      type: 'boolean',
    },
  },
  type: 'object',
};

/**
 * @param {string} interfaceName
 * @param {string} methodName
 * @param {import("eslint").Scope.Scope | null} scope
 * @returns {import('@typescript-eslint/types').TSESTree.TSMethodSignature|null}
 */
const getMethodOnInterface = (interfaceName, methodName, scope) => {
  let scp = scope;
  while (scp) {
    for (const {
      identifiers,
      name,
    } of scp.variables) {
      if (interfaceName !== name) {
        continue;
      }

      for (const identifier of identifiers) {
        const interfaceDeclaration = /** @type {import('@typescript-eslint/types').TSESTree.Identifier & {parent: import('@typescript-eslint/types').TSESTree.TSInterfaceDeclaration}} */ (
          identifier
        ).parent;
        /* c8 ignore next 3 -- TS */
        if (interfaceDeclaration.type !== 'TSInterfaceDeclaration') {
          continue;
        }

        for (const bodyItem of interfaceDeclaration.body.body) {
          const methodSig = /** @type {import('@typescript-eslint/types').TSESTree.TSMethodSignature} */ (
            bodyItem
          );
          if (methodName === /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (
            methodSig.key
          ).name) {
            return methodSig;
          }
        }
      }
    }

    scp = scp.upper;
  }

  return null;
};

/**
 * @param {import('eslint').Rule.Node} node
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('../iterateJsdoc.js').Settings} settings
 */
const isExemptedImplementer = (node, sourceCode, context, settings) => {
  if (node.type === 'FunctionExpression' &&
    node.parent.type === 'MethodDefinition' &&
    node.parent.parent.type === 'ClassBody' &&
    node.parent.parent.parent.type === 'ClassDeclaration' &&
    'implements' in node.parent.parent.parent
  ) {
    const implments = /** @type {import('@typescript-eslint/types').TSESTree.TSClassImplements[]} */ (
      node.parent.parent.parent.implements
    );

    const {
      name: methodName,
    } = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (
      node.parent.key
    );

    for (const impl of implments) {
      const {
        name: interfaceName,
      } = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (
        impl.expression
      );

      const interfaceMethodNode = getMethodOnInterface(interfaceName, methodName, node && (
        (sourceCode.getScope &&
        /* c8 ignore next 3 */
        sourceCode.getScope(node)) ||
        // @ts-expect-error ESLint 8
        context.getScope()
      ));
      if (interfaceMethodNode) {
        // @ts-expect-error Ok
        const comment = getJSDocComment(sourceCode, interfaceMethodNode, settings);
        if (comment) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('json-schema').JSONSchema4Object} baseObject
 * @param {string} option
 * @param {string} key
 * @returns {boolean|undefined}
 */
const getOption = (context, baseObject, option, key) => {
  if (context.options[0] && option in context.options[0] &&
    // Todo: boolean shouldn't be returning property, but
    //   tests currently require
    (typeof context.options[0][option] === 'boolean' ||
    key in context.options[0][option])
  ) {
    return context.options[0][option][key];
  }

  return /** @type {{[key: string]: {default?: boolean|undefined}}} */ (
    baseObject.properties
  )[key].default;
};

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('../iterateJsdoc.js').Settings} settings
 * @returns {{
 *   contexts: (string|{
 *     context: string,
 *     inlineCommentBlock: boolean,
 *     minLineCount: import('../iterateJsdoc.js').Integer
 *   })[],
 *   enableFixer: boolean,
 *   exemptEmptyConstructors: boolean,
 *   exemptEmptyFunctions: boolean,
 *   skipInterveningOverloadedDeclarations: boolean,
 *   exemptOverloadedImplementations: boolean,
 *   fixerMessage: string,
 *   minLineCount: undefined|import('../iterateJsdoc.js').Integer,
 *   publicOnly: boolean|{[key: string]: boolean|undefined}
 *   require: {[key: string]: boolean|undefined}
 * }}
 */
const getOptions = (context, settings) => {
  const {
    contexts = settings.contexts || [],
    enableFixer = true,
    exemptEmptyConstructors = true,
    exemptEmptyFunctions = false,
    exemptOverloadedImplementations = false,
    fixerMessage = '',
    minLineCount = undefined,
    publicOnly,
    skipInterveningOverloadedDeclarations = true,
  } = context.options[0] || {};

  return {
    contexts,
    enableFixer,
    exemptEmptyConstructors,
    exemptEmptyFunctions,
    exemptOverloadedImplementations,
    fixerMessage,
    minLineCount,
    publicOnly: ((baseObj) => {
      if (!publicOnly) {
        return false;
      }

      /** @type {{[key: string]: boolean|undefined}} */
      const properties = {};
      for (const prop of Object.keys(
        /** @type {import('json-schema').JSONSchema4Object} */ (
        /** @type {import('json-schema').JSONSchema4Object} */ (
            baseObj
          ).properties),
      )) {
        const opt = getOption(
          context,
          /** @type {import('json-schema').JSONSchema4Object} */ (baseObj),
          'publicOnly',
          prop,
        );

        properties[prop] = opt;
      }

      return properties;
    })(
      /** @type {import('json-schema').JSONSchema4Object} */
      (
        /** @type {import('json-schema').JSONSchema4Object} */
        (
          /** @type {import('json-schema').JSONSchema4Object} */
          (
            OPTIONS_SCHEMA.properties
          ).publicOnly
        ).oneOf
      )[1],
    ),
    require: ((baseObj) => {
      /** @type {{[key: string]: boolean|undefined}} */
      const properties = {};
      for (const prop of Object.keys(
        /** @type {import('json-schema').JSONSchema4Object} */ (
        /** @type {import('json-schema').JSONSchema4Object} */ (
            baseObj
          ).properties),
      )) {
        const opt = getOption(
          context,
          /** @type {import('json-schema').JSONSchema4Object} */
          (baseObj),
          'require',
          prop,
        );
        properties[prop] = opt;
      }

      return properties;
    })(
      /** @type {import('json-schema').JSONSchema4Object} */
      (OPTIONS_SCHEMA.properties).require,
    ),
    skipInterveningOverloadedDeclarations,
  };
};

/**
 * @param {ESLintOrTSNode} node
 */
const isFunctionWithOverload = (node) => {
  if (node.type !== 'FunctionDeclaration') {
    return false;
  }

  let parent;
  let child;

  if (node.parent?.type === 'Program') {
    parent = node.parent;
    child = node;
  } else if (node.parent?.type === 'ExportNamedDeclaration' &&
      node.parent?.parent.type === 'Program') {
    parent = node.parent?.parent;
    child = node.parent;
  }

  if (!child || !parent) {
    return false;
  }

  const functionName = node.id.name;

  const idx = parent.body.indexOf(child);
  const prevSibling = parent.body[idx - 1];

  return (
    // @ts-expect-error Should be ok
    (prevSibling?.type === 'TSDeclareFunction' &&
      // @ts-expect-error Should be ok
      functionName === prevSibling.id.name) ||
    (prevSibling?.type === 'ExportNamedDeclaration' &&
      // @ts-expect-error Should be ok
      prevSibling.declaration?.type === 'TSDeclareFunction' &&
      // @ts-expect-error Should be ok
      prevSibling.declaration?.id?.name === functionName)
  );
};

/** @type {import('eslint').Rule.RuleModule} */
export default {
  create (context) {
    /* c8 ignore next -- Fallback to deprecated method */
    const {
      sourceCode = context.getSourceCode(),
    } = context;
    const settings = getSettings(context);
    if (!settings) {
      return {};
    }

    const opts = getOptions(context, settings);

    const {
      contexts,
      enableFixer,
      exemptEmptyConstructors,
      exemptEmptyFunctions,
      exemptOverloadedImplementations,
      fixerMessage,
      minLineCount,
      require: requireOption,
      skipInterveningOverloadedDeclarations,
    } = opts;

    const publicOnly =

      /**
       * @type {{
       *   [key: string]: boolean | undefined;
       * }}
       */ (
        opts.publicOnly
      );

    /**
     * @type {import('../iterateJsdoc.js').CheckJsdoc}
     */
    const checkJsDoc = (info, _handler, node) => {
      if (
        // Optimize
        minLineCount !== undefined || contexts.some((ctxt) => {
          if (typeof ctxt === 'string') {
            return false;
          }

          const {
            minLineCount: count,
          } = ctxt;
          return count !== undefined;
        })
      ) {
        /**
         * @param {undefined|import('../iterateJsdoc.js').Integer} count
         */
        const underMinLine = (count) => {
          return count !== undefined && count >
            (sourceCode.getText(node).match(/\n/gv)?.length ?? 0) + 1;
        };

        if (underMinLine(minLineCount)) {
          return;
        }

        const {
          minLineCount: contextMinLineCount,
        } =
          /**
           * @type {{
           *   context: string;
           *   inlineCommentBlock: boolean;
           *   minLineCount: number;
           * }}
           */ (contexts.find((ctxt) => {
            if (typeof ctxt === 'string') {
              return false;
            }

            const {
              context: ctx,
            } = ctxt;
            return ctx === (info.selector || node.type);
          })) || {};
        if (underMinLine(contextMinLineCount)) {
          return;
        }
      }

      if (exemptOverloadedImplementations && isFunctionWithOverload(node)) {
        return;
      }

      const jsDocNode = getJSDocComment(
        sourceCode, node, settings, {
          checkOverloads: skipInterveningOverloadedDeclarations,
        },
      );

      if (jsDocNode) {
        return;
      }

      // For those who have options configured against ANY constructors (or
      //  setters or getters) being reported
      if (exemptSpeciaMethods(
        {
          description: '',
          inlineTags: [],
          problems: [],
          source: [],
          tags: [],
        },
        node,
        context,
        [
          OPTIONS_SCHEMA,
        ],
      )) {
        return;
      }

      if (
        // Avoid reporting param-less, return-less functions (when
        //  `exemptEmptyFunctions` option is set)
        exemptEmptyFunctions && info.isFunctionContext ||

        // Avoid reporting  param-less, return-less constructor methods (when
        //  `exemptEmptyConstructors` option is set)
        exemptEmptyConstructors && isConstructor(node)
      ) {
        const functionParameterNames = getFunctionParameterNames(node);
        if (!functionParameterNames.length && !hasReturnValue(node)) {
          return;
        }
      }

      if (isExemptedImplementer(node, sourceCode, context, settings)) {
        return;
      }

      const fix = /** @type {import('eslint').Rule.ReportFixer} */ (fixer) => {
        // Default to one line break if the `minLines`/`maxLines` settings allow
        const lines = settings.minLines === 0 && settings.maxLines >= 1 ? 1 : settings.minLines;
        /** @type {ESLintOrTSNode|import('@typescript-eslint/types').TSESTree.Decorator} */
        let baseNode = getReducedASTNode(node, sourceCode);

        const decorator = getDecorator(
          /** @type {import('eslint').Rule.Node} */
          // @ts-expect-error Bug?
          (baseNode),
        );
        if (decorator) {
          baseNode = decorator;
        }

        const indent = getIndent({
          text: sourceCode.getText(
            /** @type {import('eslint').Rule.Node} */ (baseNode),
            /** @type {import('eslint').AST.SourceLocation} */
            (
              /** @type {import('eslint').Rule.Node} */ (baseNode).loc
            ).start.column,
          ),
        });

        const {
          inlineCommentBlock,
        } =
          /**
           * @type {{
           *     context: string,
           *     inlineCommentBlock: boolean,
           *     minLineCount: import('../iterateJsdoc.js').Integer
           *   }}
           */ (contexts.find((contxt) => {
            if (typeof contxt === 'string') {
              return false;
            }

            const {
              context: ctxt,
            } = contxt;
            return ctxt === node.type;
          })) || {};
        const insertion = (inlineCommentBlock ?
          `/** ${fixerMessage}` :
          `/**\n${indent}*${fixerMessage}\n${indent}`) +
            `*/${'\n'.repeat(lines)}${indent.slice(0, -1)}`;

        return fixer.insertTextBefore(
          /** @type {import('eslint').Rule.Node} */
          (baseNode),
          insertion,
        );
      };

      const report = () => {
        const {
          start,
        } = /** @type {import('eslint').AST.SourceLocation} */ (node.loc);
        const loc = {
          end: {
            column: 0,
            line: start.line + 1,
          },
          start,
        };
        context.report({
          fix: enableFixer ? fix : null,
          loc,
          messageId: 'missingJsDoc',
          node,
        });
      };

      if (publicOnly) {
        /** @type {RequireJsdocOpts} */
        const opt = {
          ancestorsOnly: Boolean(publicOnly?.ancestorsOnly ?? false),
          esm: Boolean(publicOnly?.esm ?? true),
          initModuleExports: Boolean(publicOnly?.cjs ?? true),
          initWindow: Boolean(publicOnly?.window ?? false),
        };
        const exported = exportParser.isUncommentedExport(node, sourceCode, opt, settings);

        if (exported) {
          report();
        }
      } else {
        report();
      }
    };

    /**
     * @param {string} prop
     * @returns {boolean}
     */
    const hasOption = (prop) => {
      return requireOption[prop] || contexts.some((ctxt) => {
        return typeof ctxt === 'object' ? ctxt.context === prop : ctxt === prop;
      });
    };

    return {
      ...getContextObject(
        enforcedContexts(context, [], settings),
        checkJsDoc,
      ),
      ArrowFunctionExpression (node) {
        if (!hasOption('ArrowFunctionExpression')) {
          return;
        }

        if (
          [
            'AssignmentExpression', 'ExportDefaultDeclaration', 'VariableDeclarator',
          ].includes(node.parent.type) ||
          [
            'ClassProperty', 'ObjectProperty', 'Property', 'PropertyDefinition',
          ].includes(node.parent.type) &&
            node ===
              /**
               * @type {import('@typescript-eslint/types').TSESTree.Property|
               *   import('@typescript-eslint/types').TSESTree.PropertyDefinition
               * }
               */
              (node.parent).value
        ) {
          checkJsDoc({
            isFunctionContext: true,
          }, null, node);
        }
      },

      ClassDeclaration (node) {
        if (!hasOption('ClassDeclaration')) {
          return;
        }

        checkJsDoc({
          isFunctionContext: false,
        }, null, node);
      },

      ClassExpression (node) {
        if (!hasOption('ClassExpression')) {
          return;
        }

        checkJsDoc({
          isFunctionContext: false,
        }, null, node);
      },

      FunctionDeclaration (node) {
        if (!hasOption('FunctionDeclaration')) {
          return;
        }

        checkJsDoc({
          isFunctionContext: true,
        }, null, node);
      },

      FunctionExpression (node) {
        if (!hasOption('FunctionExpression')) {
          return;
        }

        if (
          [
            'AssignmentExpression', 'ExportDefaultDeclaration', 'VariableDeclarator',
          ].includes(node.parent.type) ||
          [
            'ClassProperty', 'ObjectProperty', 'Property', 'PropertyDefinition',
          ].includes(node.parent.type) &&
            node ===
              /**
               * @type {import('@typescript-eslint/types').TSESTree.Property|
               *   import('@typescript-eslint/types').TSESTree.PropertyDefinition
               * }
               */
              (node.parent).value
        ) {
          checkJsDoc({
            isFunctionContext: true,
          }, null, node);
        }
      },

      MethodDefinition (node) {
        if (!hasOption('MethodDefinition')) {
          return;
        }

        checkJsDoc({
          isFunctionContext: true,
          selector: 'MethodDefinition',
        }, null, /** @type {import('eslint').Rule.Node} */ (node.value));
      },
    };
  },
  meta: {
    docs: {
      category: 'Stylistic Issues',
      description: 'Checks for presence of JSDoc comments, on functions and potentially other contexts (optionally limited to exports).',
      recommended: true,
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-jsdoc.md#repos-sticky-header',
    },

    fixable: 'code',

    messages: {
      missingJsDoc: 'Missing JSDoc comment.',
    },

    schema: [
      OPTIONS_SCHEMA,
    ],

    type: 'suggestion',
  },
};
