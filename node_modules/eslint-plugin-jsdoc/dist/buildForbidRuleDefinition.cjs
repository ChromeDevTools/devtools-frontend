"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildForbidRuleDefinition = void 0;
var _iterateJsdoc = _interopRequireDefault(require("./iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @typedef {(string|{
 *   comment: string,
 *   context: string,
 *   message?: string
 * })[]} Contexts
 */

/**
 * @param {{
 *   contexts?: Contexts,
 *   description?: string,
 *   getContexts?: (
 *     ctxt: import('eslint').Rule.RuleContext,
 *     report: import('./iterateJsdoc.js').Report
 *   ) => Contexts|false,
 *   contextName?: string,
 *   modifyContext?: (context: import('eslint').Rule.RuleContext) => import('eslint').Rule.RuleContext,
 *   schema?: import('eslint').Rule.RuleMetaData['schema']
 *   url?: string,
 * }} cfg
 * @returns {import('eslint').Rule.RuleModule}
 */
const buildForbidRuleDefinition = ({
  contextName,
  contexts: cntxts,
  description,
  getContexts,
  modifyContext,
  schema,
  url
}) => {
  return (0, _iterateJsdoc.default)(({
    context,
    info: {
      comment
    },
    report,
    utils
  }) => {
    /** @type {Contexts|boolean|undefined} */
    let contexts = cntxts;
    if (getContexts) {
      contexts = getContexts(context, report);
      if (!contexts) {
        return;
      }
    }
    const {
      contextStr,
      foundContext
    } = utils.findContext(/** @type {Contexts} */contexts, comment);

    // We are not on the *particular* matching context/comment, so don't assume
    //   we need reporting
    if (!foundContext) {
      return;
    }
    const message = /** @type {import('./iterateJsdoc.js').ContextObject} */foundContext?.message ?? 'Syntax is restricted: {{context}}' + (comment ? ' with {{comment}}' : '');
    report(message, null, null, comment ? {
      comment,
      context: contextStr
    } : {
      context: contextStr
    });
  }, {
    contextSelected: true,
    meta: {
      docs: {
        description: description ?? contextName ?? 'Reports when certain comment structures are present.',
        url: url ?? 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/advanced.md#user-content-advanced-creating-your-own-rules'
      },
      schema: schema ?? [],
      type: 'suggestion'
    },
    modifyContext: modifyContext ?? (getContexts ? undefined : context => {
      // Reproduce context object with our own `contexts`
      const propertyDescriptors = Object.getOwnPropertyDescriptors(context);
      return Object.create(Object.getPrototypeOf(context), {
        ...propertyDescriptors,
        options: {
          ...propertyDescriptors.options,
          value: [{
            contexts: cntxts
          }]
        }
      });
    }),
    nonGlobalSettings: true
  });
};
exports.buildForbidRuleDefinition = buildForbidRuleDefinition;
//# sourceMappingURL=buildForbidRuleDefinition.cjs.map