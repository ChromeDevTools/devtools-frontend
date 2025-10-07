import {
  buildForbidRuleDefinition,
} from '../buildForbidRuleDefinition.js';

export default buildForbidRuleDefinition({
  description: 'Requires tags be present, optionally for specific contexts',
  getContexts (context, report) {
    // Transformed options to this option in `modifyContext`:
    if (!context.options[0].contexts) {
      report('Rule `require-tags` is missing a `tags` option.');
      return false;
    }

    const {
      contexts,
    } = context.options[0];

    return contexts;
  },
  modifyContext (context) {
    const tags = /** @type {(string|{tag: string, context: string})[]} */ (
      context.options?.[0]?.tags
    );

    const cntxts = tags?.map((tag) => {
      const tagName = typeof tag === 'string' ? tag : tag.tag;
      return {
        comment: `JsdocBlock:not(*:has(JsdocTag[tag=${
          tagName
        }]))`,
        context: typeof tag === 'string' ? 'any' : tag.context,
        message: `Missing required tag "${tagName}"`,
      };
    });

    // Reproduce context object with our own `contexts`
    const propertyDescriptors = Object.getOwnPropertyDescriptors(context);
    return Object.create(
      Object.getPrototypeOf(context),
      {
        ...propertyDescriptors,
        options: {
          ...propertyDescriptors.options,
          value: [
            {
              contexts: cntxts,
            },
          ],
        },
      },
    );
  },
  schema: [
    {
      additionalProperties: false,
      properties: {
        tags: {
          description: `May be an array of either strings or objects with
a string \`tag\` property and \`context\` string property.`,
          items: {
            anyOf: [
              {
                type: 'string',
              },
              {
                properties: {
                  context: {
                    type: 'string',
                  },
                  tag: {
                    type: 'string',
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
  url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-tags.md#repos-sticky-header',
});
