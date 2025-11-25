import iterateJsdoc from '../iterateJsdoc.js';

// If supporting Node >= 10, we could loosen the default to this for the
//   initial letter: \\p{Upper}
const matchDescriptionDefault = '^\n?([A-Z`\\d_][\\s\\S]*[.?!`\\p{RGI_Emoji}]\\s*)?$';

/**
 * @param {string} value
 * @param {string} userDefault
 * @returns {string}
 */
const stringOrDefault = (value, userDefault) => {
  return typeof value === 'string' ?
    value :
    userDefault || matchDescriptionDefault;
};

export default iterateJsdoc(({
  context,
  jsdoc,
  report,
  utils,
}) => {
  const {
    mainDescription,
    matchDescription,
    message,
    nonemptyTags = true,
    tags = {},
  } = context.options[0] || {};

  /**
   * @param {string} desc
   * @param {import('comment-parser').Spec} [tag]
   * @returns {void}
   */
  const validateDescription = (desc, tag) => {
    let mainDescriptionMatch = mainDescription;
    let errorMessage = message;
    if (typeof mainDescription === 'object') {
      mainDescriptionMatch = mainDescription.match;
      errorMessage = mainDescription.message;
    }

    if (mainDescriptionMatch === false && (
      !tag || !Object.hasOwn(tags, tag.tag))
    ) {
      return;
    }

    let tagValue = mainDescriptionMatch;
    if (tag) {
      const tagName = tag.tag;
      if (typeof tags[tagName] === 'object') {
        tagValue = tags[tagName].match;
        errorMessage = tags[tagName].message;
      } else {
        tagValue = tags[tagName];
      }
    }

    const regex = utils.getRegexFromString(
      stringOrDefault(tagValue, matchDescription),
    );

    if (!regex.test(desc)) {
      report(
        errorMessage || 'JSDoc description does not satisfy the regex pattern.',
        null,
        tag || {
          // Add one as description would typically be into block
          line: jsdoc.source[0].number + 1,
        },
      );
    }
  };

  const {
    description,
  } = utils.getDescription();
  if (description) {
    validateDescription(description);
  }

  /**
   * @param {string} tagName
   * @returns {boolean}
   */
  const hasNoTag = (tagName) => {
    return !tags[tagName];
  };

  for (const tag of [
    'description',
    'summary',
    'file',
    'classdesc',
  ]) {
    utils.forEachPreferredTag(tag, (matchingJsdocTag, targetTagName) => {
      const desc = (matchingJsdocTag.name + ' ' + utils.getTagDescription(matchingJsdocTag)).trim();
      if (hasNoTag(targetTagName)) {
        validateDescription(desc, matchingJsdocTag);
      }
    }, true);
  }

  if (nonemptyTags) {
    for (const tag of [
      'copyright',
      'example',
      'see',
      'todo',
    ]) {
      utils.forEachPreferredTag(tag, (matchingJsdocTag, targetTagName) => {
        const desc = (matchingJsdocTag.name + ' ' + utils.getTagDescription(matchingJsdocTag)).trim();

        if (hasNoTag(targetTagName) && !(/.+/v).test(desc)) {
          report(
            'JSDoc description must not be empty.',
            null,
            matchingJsdocTag,
          );
        }
      });
    }
  }

  if (!Object.keys(tags).length) {
    return;
  }

  /**
   * @param {string} tagName
   * @returns {boolean}
   */
  const hasOptionTag = (tagName) => {
    return Boolean(tags[tagName]);
  };

  const whitelistedTags = utils.filterTags(({
    tag: tagName,
  }) => {
    return hasOptionTag(tagName);
  });
  const {
    tagsWithNames,
    tagsWithoutNames,
  } = utils.getTagsByType(whitelistedTags);

  tagsWithNames.some((tag) => {
    const desc = /** @type {string} */ (
      utils.getTagDescription(tag)
    ).replace(/^[\- ]*/v, '')
      .trim();

    return validateDescription(desc, tag);
  });

  tagsWithoutNames.some((tag) => {
    const desc = (tag.name + ' ' + utils.getTagDescription(tag)).trim();

    return validateDescription(desc, tag);
  });
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'Enforces a regular expression pattern on descriptions.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/match-description.md#repos-sticky-header',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          contexts: {
            description: `Set this to an array of strings representing the AST context (or an object with
optional \`context\` and \`comment\` properties) where you wish the rule to be applied (e.g.,
\`ClassDeclaration\` for ES6 classes).

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Overrides the default contexts (\`ArrowFunctionExpression\`, \`FunctionDeclaration\`,
\`FunctionExpression\`). Set to \`"any"\` if you want the rule to apply to any
JSDoc block throughout your files.

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
                  },
                  type: 'object',
                },
              ],
            },
            type: 'array',
          },
          mainDescription: {
            description: `If you wish to override the main block description without changing the
default \`match-description\` (which can cascade to the \`tags\` with \`true\`),
you may use \`mainDescription\`:

\`\`\`js
{
  'jsdoc/match-description': ['error', {
    mainDescription: '[A-Z].*\\\\.',
    tags: {
      param: true,
      returns: true
    }
  }]
}
\`\`\`

There is no need to add \`mainDescription: true\`, as by default, the main
block description (and only the main block description) is linted, though you
may disable checking it by setting it to \`false\`.

You may also provide an object with \`message\`:

\`\`\`js
{
  'jsdoc/match-description': ['error', {
    mainDescription: {
      message: 'Capitalize first word of JSDoc block descriptions',
      match: '[A-Z].*\\\\.'
    },
    tags: {
      param: true,
      returns: true
    }
  }]
}
\`\`\``,
            oneOf: [
              {
                format: 'regex',
                type: 'string',
              },
              {
                type: 'boolean',
              },
              {
                additionalProperties: false,
                properties: {
                  match: {
                    oneOf: [
                      {
                        format: 'regex',
                        type: 'string',
                      },
                      {
                        type: 'boolean',
                      },
                    ],
                  },
                  message: {
                    type: 'string',
                  },
                },
                type: 'object',
              },
            ],
          },
          matchDescription: {
            description: `You can supply your own expression to override the default, passing a
\`matchDescription\` string on the options object.

Defaults to using (only) the \`v\` flag, so
to add your own flags, encapsulate your expression as a string, but like a
literal, e.g., \`/[A-Z].*\\./vi\`.

\`\`\`js
{
  'jsdoc/match-description': ['error', {matchDescription: '[A-Z].*\\\\.'}]
}
\`\`\``,
            format: 'regex',
            type: 'string',
          },
          message: {
            description: `You may provide a custom default message by using the following format:

\`\`\`js
{
  'jsdoc/match-description': ['error', {
    message: 'The default description should begin with a capital letter.'
  }]
}
\`\`\`

This can be overridden per tag or for the main block description by setting
\`message\` within \`tags\` or \`mainDescription\`, respectively.`,
            type: 'string',
          },
          nonemptyTags: {
            description: `If not set to \`false\`, will enforce that the following tags have at least
some content:

- \`@copyright\`
- \`@example\`
- \`@see\`
- \`@todo\`

If you supply your own tag description for any of the above tags in \`tags\`,
your description will take precedence.`,
            type: 'boolean',
          },
          tags: {
            description: `If you want different regular expressions to apply to tags, you may use
the \`tags\` option object:

\`\`\`js
{
  'jsdoc/match-description': ['error', {tags: {
    param: '\\\\- [A-Z].*\\\\.',
    returns: '[A-Z].*\\\\.'
  }}]
}
\`\`\`

In place of a string, you can also add \`true\` to indicate that a particular
tag should be linted with the \`matchDescription\` value (or the default).

\`\`\`js
{
  'jsdoc/match-description': ['error', {tags: {
    param: true,
    returns: true
  }}]
}
\`\`\`

Alternatively, you may supply an object with a \`message\` property to indicate
the error message for that tag.

\`\`\`js
{
  'jsdoc/match-description': ['error', {tags: {
    param: {message: 'Begin with a hyphen', match: '\\\\- [A-Z].*\\\\.'},
    returns: {message: 'Capitalize for returns (the default)', match: true}
  }}]
}
\`\`\`

The tags \`@param\`/\`@arg\`/\`@argument\` and \`@property\`/\`@prop\` will be properly
parsed to ensure that the matched "description" text includes only the text
after the name.

All other tags will treat the text following the tag name, a space, and
an optional curly-bracketed type expression (and another space) as part of
its "description" (e.g., for \`@returns {someType} some description\`, the
description is \`some description\` while for \`@some-tag xyz\`, the description
is \`xyz\`).`,
            patternProperties: {
              '.*': {
                oneOf: [
                  {
                    format: 'regex',
                    type: 'string',
                  },
                  {
                    enum: [
                      true,
                    ],
                    type: 'boolean',
                  },
                  {
                    additionalProperties: false,
                    properties: {
                      match: {
                        oneOf: [
                          {
                            format: 'regex',
                            type: 'string',
                          },
                          {
                            enum: [
                              true,
                            ],
                            type: 'boolean',
                          },
                        ],
                      },
                      message: {
                        type: 'string',
                      },
                    },
                    type: 'object',
                  },
                ],
              },
            },
            type: 'object',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
