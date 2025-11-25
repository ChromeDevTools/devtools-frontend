import iterateJsdoc from '../iterateJsdoc.js';

/**
 * @param {import('@es-joy/jsdoccomment').JsdocBlockWithInline} jsdoc
 * @param {import('../iterateJsdoc.js').Utils} utils
 * @param {number} requireSingleLineUnderCount
 */
const checkForShortTags = (jsdoc, utils, requireSingleLineUnderCount) => {
  if (!requireSingleLineUnderCount || !jsdoc.tags.length) {
    return false;
  }

  let lastLineWithTag = 0;
  let isUnderCountLimit = false;
  let hasMultiDescOrType = false;
  const tagLines = jsdoc.source.reduce((acc, {
    tokens: {
      delimiter,
      description: desc,
      name,
      postDelimiter,
      postName,
      postTag,
      postType,
      start,
      tag,
      type,
    },
  }, idx) => {
    if (tag.length) {
      lastLineWithTag = idx;
      if (
        start.length + delimiter.length + postDelimiter.length +
        type.length + postType.length + name.length + postName.length +
        tag.length + postTag.length + desc.length <
          requireSingleLineUnderCount
      ) {
        isUnderCountLimit = true;
      }

      return acc + 1;
    } else if (desc.length || type.length) {
      hasMultiDescOrType = true;
      return acc;
    }

    return acc;
  }, 0);
  // Could be tagLines > 1
  if (!hasMultiDescOrType && isUnderCountLimit && tagLines === 1) {
    const fixer = () => {
      const tokens = jsdoc.source[lastLineWithTag].tokens;
      jsdoc.source = [
        {
          number: 0,
          source: '',
          tokens: utils.seedTokens({
            delimiter: '/**',
            description: tokens.description.trimEnd() + ' ',
            end: '*/',
            name: tokens.name,
            postDelimiter: ' ',
            postName: tokens.postName,
            postTag: tokens.postTag,
            postType: tokens.postType,
            start: jsdoc.source[0].tokens.start,
            tag: tokens.tag,
            type: tokens.type,
          }),
        },
      ];
    };

    utils.reportJSDoc(
      'Description is too short to be multi-line.',
      null,
      fixer,
    );
    return true;
  }

  return false;
};

/**
 * @param {import('@es-joy/jsdoccomment').JsdocBlockWithInline} jsdoc
 * @param {import('../iterateJsdoc.js').Utils} utils
 * @param {number} requireSingleLineUnderCount
 */
const checkForShortDescriptions = (jsdoc, utils, requireSingleLineUnderCount) => {
  if (!requireSingleLineUnderCount || jsdoc.tags.length) {
    return false;
  }

  let lastLineWithDesc = 0;
  let isUnderCountLimit = false;
  const descLines = jsdoc.source.reduce((acc, {
    tokens: {
      delimiter,
      description: desc,
      postDelimiter,
      start,
    },
  }, idx) => {
    if (desc.length) {
      lastLineWithDesc = idx;
      if (
        start.length + delimiter.length + postDelimiter.length + desc.length <
          requireSingleLineUnderCount
      ) {
        isUnderCountLimit = true;
      }

      return acc + 1;
    }

    return acc;
  }, 0);
  // Could be descLines > 1
  if (isUnderCountLimit && descLines === 1) {
    const fixer = () => {
      const desc = jsdoc.source[lastLineWithDesc].tokens.description;
      jsdoc.source = [
        {
          number: 0,
          source: '',
          tokens: utils.seedTokens({
            delimiter: '/**',
            description: desc.trimEnd() + ' ',
            end: '*/',
            postDelimiter: ' ',
            start: jsdoc.source[0].tokens.start,
          }),
        },
      ];
    };

    utils.reportJSDoc(
      'Description is too short to be multi-line.',
      null,
      fixer,
    );
    return true;
  }

  return false;
};

export default iterateJsdoc(({
  context,
  jsdoc,
  utils,
}) => {
  const {
    allowMultipleTags = true,
    minimumLengthForMultiline = Number.POSITIVE_INFINITY,
    multilineTags = [
      '*',
    ],
    noFinalLineText = true,
    noMultilineBlocks = false,
    noSingleLineBlocks = false,
    noZeroLineText = true,
    requireSingleLineUnderCount = null,
    singleLineTags = [
      'lends', 'type',
    ],
  } = context.options[0] || {};

  const {
    source: [
      {
        tokens,
      },
    ],
  } = jsdoc;
  const {
    description,
    tag,
  } = tokens;
  const sourceLength = jsdoc.source.length;

  /**
   * @param {string} tagName
   * @returns {boolean}
   */
  const isInvalidSingleLine = (tagName) => {
    return noSingleLineBlocks &&
      (!tagName ||
      !singleLineTags.includes(tagName) && !singleLineTags.includes('*'));
  };

  if (sourceLength === 1) {
    if (!isInvalidSingleLine(tag.slice(1))) {
      return;
    }

    const fixer = () => {
      utils.makeMultiline();
    };

    utils.reportJSDoc(
      'Single line blocks are not permitted by your configuration.',
      null,
      fixer,
      true,
    );

    return;
  }

  if (checkForShortDescriptions(jsdoc, utils, requireSingleLineUnderCount)
  ) {
    return;
  }

  if (checkForShortTags(jsdoc, utils, requireSingleLineUnderCount)
  ) {
    return;
  }

  const lineChecks = () => {
    if (
      noZeroLineText &&
      (tag || description)
    ) {
      const fixer = () => {
        const line = {
          ...tokens,
        };
        utils.emptyTokens(tokens);
        const {
          tokens: {
            delimiter,
            start,
          },
        } = jsdoc.source[1];
        utils.addLine(1, {
          ...line,
          delimiter,
          start,
        });
      };

      utils.reportJSDoc(
        'Should have no text on the "0th" line (after the `/**`).',
        null,
        fixer,
      );

      return;
    }

    const finalLine = jsdoc.source[jsdoc.source.length - 1];
    const finalLineTokens = finalLine.tokens;
    if (
      noFinalLineText &&
      finalLineTokens.description.trim()
    ) {
      const fixer = () => {
        const line = {
          ...finalLineTokens,
        };
        line.description = line.description.trimEnd();

        const {
          delimiter,
        } = line;

        for (const prop of [
          'delimiter',
          'postDelimiter',
          'tag',
          'type',
          'lineEnd',
          'postType',
          'postTag',
          'name',
          'postName',
          'description',
        ]) {
          finalLineTokens[
            /**
             * @type {"delimiter"|"postDelimiter"|"tag"|"type"|
             *   "lineEnd"|"postType"|"postTag"|"name"|
             *   "postName"|"description"}
             */ (
              prop
            )
          ] = '';
        }

        utils.addLine(jsdoc.source.length - 1, {
          ...line,
          delimiter,
          end: '',
        });
      };

      utils.reportJSDoc(
        'Should have no text on the final line (before the `*/`).',
        null,
        fixer,
      );
    }
  };

  if (noMultilineBlocks) {
    if (
      jsdoc.tags.length &&
      (multilineTags.includes('*') || utils.hasATag(multilineTags))
    ) {
      lineChecks();

      return;
    }

    if (jsdoc.description.length >= minimumLengthForMultiline) {
      lineChecks();

      return;
    }

    if (
      noSingleLineBlocks &&
      (!jsdoc.tags.length ||
      !utils.filterTags(({
        tag: tg,
      }) => {
        return !isInvalidSingleLine(tg);
      }).length)
    ) {
      utils.reportJSDoc(
        'Multiline JSDoc blocks are prohibited by ' +
          'your configuration but fixing would result in a single ' +
          'line block which you have prohibited with `noSingleLineBlocks`.',
      );

      return;
    }

    if (jsdoc.tags.length > 1) {
      if (!allowMultipleTags) {
        utils.reportJSDoc(
          'Multiline JSDoc blocks are prohibited by ' +
            'your configuration but the block has multiple tags.',
        );

        return;
      }
    } else if (jsdoc.tags.length === 1 && jsdoc.description.trim()) {
      if (!allowMultipleTags) {
        utils.reportJSDoc(
          'Multiline JSDoc blocks are prohibited by ' +
            'your configuration but the block has a description with a tag.',
        );

        return;
      }
    } else {
      const fixer = () => {
        jsdoc.source = [
          {
            number: 1,
            source: '',
            tokens: jsdoc.source.reduce((obj, {
              tokens: {
                description: desc,
                lineEnd,
                name: nme,
                postName,
                postTag,
                postType,
                tag: tg,
                type: typ,
              },
            }) => {
              if (typ) {
                obj.type = typ;
              }

              if (tg && typ && nme) {
                obj.postType = postType;
              }

              if (nme) {
                obj.name += nme;
              }

              if (nme && desc) {
                obj.postName = postName;
              }

              obj.description += desc;

              const nameOrDescription = obj.description || obj.name;
              if (
                nameOrDescription && nameOrDescription.slice(-1) !== ' '
              ) {
                obj.description += ' ';
              }

              obj.lineEnd = lineEnd;

              // Already filtered for multiple tags
              obj.tag += tg;
              if (tg) {
                obj.postTag = postTag || ' ';
              }

              return obj;
            }, utils.seedTokens({
              delimiter: '/**',
              end: '*/',
              postDelimiter: ' ',
            })),
          },
        ];
      };

      utils.reportJSDoc(
        'Multiline JSDoc blocks are prohibited by ' +
          'your configuration.',
        null,
        fixer,
      );

      return;
    }
  }

  lineChecks();
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Controls how and whether JSDoc blocks can be expressed as single or multiple line blocks.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/multiline-blocks.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowMultipleTags: {
            description: `If \`noMultilineBlocks\` is set to \`true\` with this option and multiple tags are
found in a block, an error will not be reported.

Since multiple-tagged lines cannot be collapsed into a single line, this option
prevents them from being reported. Set to \`false\` if you really want to report
any blocks.

This option will also be applied when there is a block description and a single
tag (since a description cannot precede a tag on a single line, and also
cannot be reliably added after the tag either).

Defaults to \`true\`.`,
            type: 'boolean',
          },
          minimumLengthForMultiline: {
            description: `If \`noMultilineBlocks\` is set with this numeric option, multiline blocks will
be permitted if containing at least the given amount of text.

If not set, multiline blocks will not be permitted regardless of length unless
a relevant tag is present and \`multilineTags\` is set.

Defaults to not being in effect.`,
            type: 'integer',
          },
          multilineTags: {
            anyOf: [
              {
                enum: [
                  '*',
                ],
                type: 'string',
              }, {
                items: {
                  type: 'string',
                },
                type: 'array',
              },
            ],
            description: `If \`noMultilineBlocks\` is set with this option, multiline blocks may be allowed
regardless of length as long as a tag or a tag of a certain type is present.

If \`*\` is included in the array, the presence of a tags will allow for
multiline blocks (but not when without any tags unless the amount of text is
over an amount specified by \`minimumLengthForMultiline\`).

If the array does not include \`*\` but lists certain tags, the presence of
such a tag will cause multiline blocks to be allowed.

You may set this to an empty array to prevent any tag from permitting multiple
lines.

Defaults to \`['*']\`.`,
          },
          noFinalLineText: {
            description: `For multiline blocks, any non-whitespace text preceding the \`*/\` on the final
line will be reported. (Text preceding a newline is not reported.)

\`noMultilineBlocks\` will have priority over this rule if it applies.

Defaults to \`true\`.`,
            type: 'boolean',
          },
          noMultilineBlocks: {
            description: `Requires that JSDoc blocks are restricted to single lines only unless impacted
by the options \`minimumLengthForMultiline\`, \`multilineTags\`, or
\`allowMultipleTags\`.

Defaults to \`false\`.`,
            type: 'boolean',
          },
          noSingleLineBlocks: {
            description: `If this is \`true\`, any single line blocks will be reported, except those which
are whitelisted in \`singleLineTags\`.

Defaults to \`false\`.`,
            type: 'boolean',
          },
          noZeroLineText: {
            description: `For multiline blocks, any non-whitespace text immediately after the \`/**\` and
space will be reported. (Text after a newline is not reported.)

\`noMultilineBlocks\` will have priority over this rule if it applies.

Defaults to \`true\`.`,
            type: 'boolean',
          },
          requireSingleLineUnderCount: {
            description: `If this number is set, it indicates a minimum line width for a single line of
JSDoc content spread over a multi-line comment block. If a single line is under
the minimum length, it will be reported so as to enforce single line JSDoc blocks
for such cases. Blocks are not reported which have multi-line descriptions,
multiple tags, a block description and tag, or tags with multi-line types or
descriptions.

Defaults to \`null\`.`,
            type: 'number',
          },
          singleLineTags: {
            description: `An array of tags which can nevertheless be allowed as single line blocks when
\`noSingleLineBlocks\` is set.  You may set this to a empty array to
cause all single line blocks to be reported. If \`'*'\` is present, then
the presence of a tag will allow single line blocks (but not if a tag is
missing).

Defaults to \`['lends', 'type']\`.`,
            items: {
              type: 'string',
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
