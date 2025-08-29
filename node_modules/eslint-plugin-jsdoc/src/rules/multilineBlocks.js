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
        'Multiline jsdoc blocks are prohibited by ' +
          'your configuration but fixing would result in a single ' +
          'line block which you have prohibited with `noSingleLineBlocks`.',
      );

      return;
    }

    if (jsdoc.tags.length > 1) {
      if (!allowMultipleTags) {
        utils.reportJSDoc(
          'Multiline jsdoc blocks are prohibited by ' +
            'your configuration but the block has multiple tags.',
        );

        return;
      }
    } else if (jsdoc.tags.length === 1 && jsdoc.description.trim()) {
      if (!allowMultipleTags) {
        utils.reportJSDoc(
          'Multiline jsdoc blocks are prohibited by ' +
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
        'Multiline jsdoc blocks are prohibited by ' +
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
      description: 'Controls how and whether jsdoc blocks can be expressed as single or multiple line blocks.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/multiline-blocks.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowMultipleTags: {
            type: 'boolean',
          },
          minimumLengthForMultiline: {
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
          },
          noFinalLineText: {
            type: 'boolean',
          },
          noMultilineBlocks: {
            type: 'boolean',
          },
          noSingleLineBlocks: {
            type: 'boolean',
          },
          noZeroLineText: {
            type: 'boolean',
          },
          requireSingleLineUnderCount: {
            type: 'number',
          },
          singleLineTags: {
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
