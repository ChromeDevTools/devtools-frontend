import iterateJsdoc from '../iterateJsdoc.js';

/**
 * @typedef {{
 *   comment: string,
 *   context: string,
 *   message: string,
 *   minimum: import('../iterateJsdoc.js').Integer
 * }} ContextObject
 */

/**
 * @typedef {string|ContextObject} Context
 */

/**
 * @param {import('../iterateJsdoc.js').StateObject} state
 * @returns {void}
 */
const setDefaults = (state) => {
  if (!state.selectorMap) {
    state.selectorMap = {};
  }
};

/**
 * @param {import('../iterateJsdoc.js').StateObject} state
 * @param {string} selector
 * @param {string} comment
 * @returns {void}
 */
const incrementSelector = (state, selector, comment) => {
  if (!state.selectorMap[selector]) {
    state.selectorMap[selector] = {};
  }

  if (!state.selectorMap[selector][comment]) {
    state.selectorMap[selector][comment] = 0;
  }

  state.selectorMap[selector][comment]++;
};

export default iterateJsdoc(({
  context,
  info: {
    comment,
  },
  state,
  utils,
}) => {
  if (!context.options[0]) {
    // Handle error later
    return;
  }

  /**
   * @type {Context[]}
   */
  const contexts = context.options[0].contexts;

  const {
    contextStr,
  } = utils.findContext(contexts, comment);

  setDefaults(state);

  incrementSelector(state, contextStr, String(comment));
}, {
  contextSelected: true,
  exit ({
    context,
    settings,
    state,
  }) {
    if (!context.options.length && !settings.contexts) {
      context.report({
        loc: {
          end: {
            column: 1,
            line: 1,
          },
          start: {
            column: 1,
            line: 1,
          },
        },
        message: 'Rule `no-missing-syntax` is missing a `contexts` option.',
      });

      return;
    }

    setDefaults(state);

    /**
     * @type {Context[]}
     */
    const contexts = (context.options[0] ?? {}).contexts ?? settings?.contexts;

    // Report when MISSING
    contexts.some((cntxt) => {
      const contextStr = typeof cntxt === 'object' ? cntxt.context ?? 'any' : cntxt;
      const comment = typeof cntxt === 'string' ? '' : cntxt?.comment ?? '';

      const contextKey = contextStr === 'any' ? 'undefined' : contextStr;

      if (
        (!state.selectorMap[contextKey] ||
        !state.selectorMap[contextKey][comment] ||
        state.selectorMap[contextKey][comment] < (
          // @ts-expect-error comment would need an object, not string
          cntxt?.minimum ?? 1
        )) &&
        (contextStr !== 'any' || Object.values(state.selectorMap).every((cmmnt) => {
          return !cmmnt[comment] || cmmnt[comment] < (
            // @ts-expect-error comment would need an object, not string
            cntxt?.minimum ?? 1
          );
        }))
      ) {
        const message = typeof cntxt === 'string' ?
          'Syntax is required: {{context}}' :
          cntxt?.message ?? ('Syntax is required: {{context}}' +
            (comment ? ' with {{comment}}' : ''));
        context.report({
          data: {
            comment,
            context: contextStr,
          },
          loc: {
            end: {
              column: 1,
              line: 1,
            },
            start: {
              column: 1,
              line: 1,
            },
          },
          message,
        });

        return true;
      }

      return false;
    });
  },
  matchContext: true,
  meta: {
    docs: {
      description: 'Reports when certain comment structures are always expected.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/no-missing-syntax.md#repos-sticky-header',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          contexts: {
            description: `Set this to an array of strings representing the AST context (or an object with
optional \`context\` and \`comment\` properties) where you wish the rule to be applied.

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Use the \`minimum\` property (defaults to 1) to indicate how many are required
for the rule to be reported.

Use the \`message\` property to indicate the specific error to be shown when an
error is reported for that context being found missing. You may use
\`{{context}}\` and \`{{comment}}\` with such messages. Defaults to
\`"Syntax is required: {{context}}"\`, or with a comment, to
\`"Syntax is required: {{context}} with {{comment}}"\`.

Set to \`"any"\` if you want the rule to apply to any JSDoc block throughout
your files (as is necessary for finding function blocks not attached to a
function declaration or expression, i.e., \`@callback\` or \`@function\` (or its
aliases \`@func\` or \`@method\`) (including those associated with an \`@interface\`).

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
                    comment: {
                      type: 'string',
                    },
                    context: {
                      type: 'string',
                    },
                    message: {
                      type: 'string',
                    },
                    minimum: {
                      type: 'integer',
                    },
                  },
                  type: 'object',
                },
              ],
            },
            type: 'array',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
