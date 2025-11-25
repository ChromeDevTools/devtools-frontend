import iterateJsdoc from '../iterateJsdoc.js';

export default iterateJsdoc(({
  context,
  jsdoc,
  settings,
  utils,
}) => {
  const {
    mode,
  } = settings;

  if (mode !== 'typescript') {
    return;
  }

  const {
    allowedInlineTags = [],
    enableFixer = false,
    fixType = 'backslash',
  } = context.options[0] || {};

  const {
    description,
  } = utils.getDescription();

  /** @type {string[]} */
  const tagNames = [];

  /** @type {number[]} */
  const indexes = [];

  const unescapedInlineTagRegex = /(?:^|\s)@(\w+)/gv;
  for (const [
    idx,
    descLine,
  ] of (
      description.startsWith('\n') ? description.slice(1) : description
    ).split('\n').entries()
  ) {
    descLine.replaceAll(unescapedInlineTagRegex, (_, tagName) => {
      if (allowedInlineTags.includes(tagName)) {
        return _;
      }

      tagNames.push(tagName);
      indexes.push(idx);

      return _;
    });
  }

  for (const [
    idx,
    tagName,
  ] of tagNames.entries()) {
    utils.reportJSDoc(
      `Unexpected inline JSDoc tag. Did you mean to use {@${tagName}}, \\@${tagName}, or \`@${tagName}\`?`,
      {
        line: indexes[idx] + 1,
      },
      enableFixer ?
        () => {
          utils.setBlockDescription((info, seedTokens, descLines) => {
            return descLines.map((desc) => {
              const newDesc = desc.replaceAll(
                new RegExp(`(^|\\s)@${
                  // No need to escape, as contains only safe characters
                  tagName
                }`, 'gv'),
                fixType === 'backticks' ? '$1`@' + tagName + '`' : '$1\\@' + tagName,
              );

              return {
                number: 0,
                source: '',
                tokens: seedTokens({
                  ...info,
                  description: newDesc,
                  postDelimiter: newDesc.trim() ? ' ' : '',
                }),
              };
            });
          });
        } :
        null,
    );
  }

  /**
   * @param {string} tagName
   * @returns {[
   *   RegExp,
   *   (description: string) => string
   * ]}
   */
  const escapeInlineTags = (tagName) => {
    const regex = new RegExp(`(^|\\s)@${
      // No need to escape, as contains only safe characters
      tagName
    }`, 'gv');

    return [
      regex,
      /**
       * @param {string} desc
       */
      (desc) => {
        return desc.replaceAll(
          regex,
          fixType === 'backticks' ? '$1`@' + tagName + '`' : '$1\\@' + tagName,
        );
      },
    ];
  };

  for (const tag of jsdoc.tags) {
    if (tag.tag === 'example') {
      continue;
    }

    /** @type {string} */
    let tagName = '';
    while (/** @type {string[]} */ (
      utils.getTagDescription(tag, true)
    // eslint-disable-next-line no-loop-func -- Safe
    ).some((desc) => {
      tagName = unescapedInlineTagRegex.exec(desc)?.[1] ?? '';
      if (allowedInlineTags.includes(tagName)) {
        return false;
      }

      return tagName;
    })) {
      const line = utils.setTagDescription(tag, ...escapeInlineTags(tagName)) +
          tag.source[0].number;
      utils.reportJSDoc(
        `Unexpected inline JSDoc tag. Did you mean to use {@${tagName}}, \\@${tagName}, or \`@${tagName}\`?`,
        {
          line,
        },
        enableFixer ? () => {} : null,
        true,
      );
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Reports use of JSDoc tags in non-tag positions (in the default "typescript" mode).',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/escape-inline-tags.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowedInlineTags: {
            description: 'A listing of tags you wish to allow unescaped. Defaults to an empty array.',
            items: {
              type: 'string',
            },
            type: 'array',
          },
          enableFixer: {
            description: 'Whether to enable the fixer. Defaults to `false`.',
            type: 'boolean',
          },
          fixType: {
            description: `How to escape the inline tag.

May be "backticks" to enclose tags in backticks (treating as code segments), or
"backslash" to escape tags with a backslash, i.e., \`\\@\`

Defaults to "backslash".`,
            enum: [
              'backticks',
              'backslash',
            ],
            type: 'string',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
