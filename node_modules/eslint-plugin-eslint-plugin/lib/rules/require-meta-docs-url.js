/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 */

'use strict';

// -----------------------------------------------------------------------------
// Requirements
// -----------------------------------------------------------------------------

const path = require('path');
const utils = require('../utils');
const { getStaticValue } = require('@eslint-community/eslint-utils');

// -----------------------------------------------------------------------------
// Rule Definition
// -----------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require rules to implement a `meta.docs.url` property',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-docs-url.md',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description:
              "A pattern to enforce rule's document URL. It replaces `{{name}}` placeholder by each rule name. The rule name is the basename of each rule file. Omitting this allows any URL.",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      mismatch: '`meta.docs.url` property must be `{{expectedUrl}}`.',
      missing: '`meta.docs.url` property is missing.',
      wrongType: '`meta.docs.url` property must be a string.',
    },
  },

  /**
   * Creates AST event handlers for require-meta-docs-url.
   * @param {RuleContext} context - The rule context.
   * @returns {Object} AST event handlers.
   */
  create(context) {
    const options = context.options[0] || {};
    const filename = context.filename || context.getFilename(); // TODO: just use context.filename when dropping eslint < v9
    const ruleName =
      filename === '<input>'
        ? undefined
        : path.basename(filename, path.extname(filename));
    const expectedUrl =
      !options.pattern || !ruleName
        ? undefined
        : options.pattern.replaceAll(/{{\s*name\s*}}/g, ruleName);

    /**
     * Check whether a given URL is the expected URL.
     * @param {string} url The URL to check.
     * @returns {boolean} `true` if the node is the expected URL.
     */
    function isExpectedUrl(url) {
      return Boolean(
        typeof url === 'string' &&
          (expectedUrl === undefined || url === expectedUrl),
      );
    }

    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    return {
      Program(ast) {
        const scope = sourceCode.getScope?.(ast) || context.getScope(); // TODO: just use sourceCode.getScope() when we drop support for ESLint < v9.0.0
        const { scopeManager } = sourceCode;

        const {
          docsNode,
          metaNode,
          metaPropertyNode: urlPropNode,
        } = utils.getMetaDocsProperty('url', ruleInfo, scopeManager);

        const staticValue = urlPropNode
          ? getStaticValue(urlPropNode.value, scope)
          : undefined;
        if (urlPropNode && !staticValue) {
          // Ignore non-static values since we can't determine what they look like.
          return;
        }

        if (isExpectedUrl(staticValue && staticValue.value)) {
          return;
        }

        context.report({
          node:
            (urlPropNode && urlPropNode.value) ||
            (docsNode && docsNode.value) ||
            metaNode ||
            ruleInfo.create,

          // eslint-disable-next-line unicorn/no-negated-condition -- actually more clear like this
          messageId: !urlPropNode
            ? 'missing'
            : // eslint-disable-next-line unicorn/no-nested-ternary,unicorn/no-negated-condition -- this is fine for now
              !expectedUrl
              ? 'wrongType'
              : /* otherwise */ 'mismatch',

          data: {
            expectedUrl,
          },

          fix(fixer) {
            if (!expectedUrl) {
              return null;
            }

            const urlString = JSON.stringify(expectedUrl);
            if (urlPropNode) {
              if (
                urlPropNode.value.type === 'Literal' ||
                utils.isUndefinedIdentifier(urlPropNode.value)
              ) {
                return fixer.replaceText(urlPropNode.value, urlString);
              }
            } else if (docsNode && docsNode.value.type === 'ObjectExpression') {
              return utils.insertProperty(
                fixer,
                docsNode.value,
                `url: ${urlString}`,
                sourceCode,
              );
            } else if (
              !docsNode &&
              metaNode &&
              metaNode.type === 'ObjectExpression'
            ) {
              return utils.insertProperty(
                fixer,
                metaNode,
                `docs: {\nurl: ${urlString}\n}`,
                sourceCode,
              );
            }

            return null;
          },
        });
      },
    };
  },
};
