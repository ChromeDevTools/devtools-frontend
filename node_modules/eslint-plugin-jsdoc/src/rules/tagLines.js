import iterateJsdoc from '../iterateJsdoc.js';

/**
 * @param {{
 *   maxBlockLines: null|number,
 *   startLines: null|number,
 *   utils: import('../iterateJsdoc.js').Utils
 * }} cfg
 */
const checkMaxBlockLines = ({
  maxBlockLines,
  startLines,
  utils,
}) => {
  if (typeof maxBlockLines !== 'number') {
    return false;
  }

  if (typeof startLines === 'number' && maxBlockLines < startLines) {
    utils.reportJSDoc(
      'If set to a number, `maxBlockLines` must be greater than or equal to `startLines`.',
    );
    return true;
  }

  const {
    description,
  } = utils.getDescription();
  const excessBlockLinesRegex = new RegExp('\n{' + (maxBlockLines + 2) + ',}', 'v');
  const excessBlockLinesMatch = description.match(excessBlockLinesRegex);
  const excessBlockLines = excessBlockLinesMatch?.[0]?.length ?? 0;
  if (excessBlockLinesMatch) {
    const excessIndexLine = description.slice(0, excessBlockLinesMatch.index).match(/\n/gv)?.length ?? 0;
    utils.reportJSDoc(
      `Expected a maximum of ${maxBlockLines} line${maxBlockLines === 1 ? '' : 's'} within block description`,
      {
        line: excessIndexLine,
      },
      () => {
        utils.setBlockDescription((info, seedTokens, descLines) => {
          return [
            ...descLines.slice(0, excessIndexLine),
            ...descLines.slice(excessIndexLine + excessBlockLines - 1 - maxBlockLines),
          ].map((desc) => {
            return {
              number: 0,
              source: '',
              tokens: seedTokens({
                ...info,
                description: desc,
                postDelimiter: desc.trim() ? ' ' : '',
              }),
            };
          });
        });
      },
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
  const [
    alwaysNever = 'never',
    {
      applyToEndTag = true,
      count = 1,
      endLines = 0,
      maxBlockLines = null,
      startLines = 0,
      tags = {},
    } = {},
  ] = context.options;

  jsdoc.tags.some((tg, tagIdx) => {
    let lastTag;

    /**
     * @type {null|import('../iterateJsdoc.js').Integer}
     */
    let lastEmpty = null;

    /**
     * @type {null|import('../iterateJsdoc.js').Integer}
     */
    let reportIndex = null;
    let emptyLinesCount = 0;
    for (const [
      idx,
      {
        tokens: {
          description,
          end,
          name,
          tag,
          type,
        },
      },
    ] of tg.source.entries()) {
      // May be text after a line break within a tag description
      if (description) {
        reportIndex = null;
      }

      if (lastTag && [
        'always', 'any',
      ].includes(tags[lastTag.slice(1)]?.lines)) {
        continue;
      }

      const empty = !tag && !name && !type && !description;
      if (
        empty && !end &&
        (alwaysNever === 'never' ||
          lastTag && tags[lastTag.slice(1)]?.lines === 'never'
        )
      ) {
        reportIndex = idx;

        continue;
      }

      if (!end) {
        if (empty) {
          emptyLinesCount++;
        } else {
          emptyLinesCount = 0;
        }

        lastEmpty = empty ? idx : null;
      }

      lastTag = tag;
    }

    if (
      typeof endLines === 'number' &&
      lastEmpty !== null && tagIdx === jsdoc.tags.length - 1
    ) {
      const lineDiff = endLines - emptyLinesCount;

      if (lineDiff < 0) {
        const fixer = () => {
          utils.removeTag(tagIdx, {
            tagSourceOffset: /** @type {import('../iterateJsdoc.js').Integer} */ (
              lastEmpty
            ) + lineDiff + 1,
          });
        };

        utils.reportJSDoc(
          `Expected ${endLines} trailing lines`,
          {
            line: tg.source[lastEmpty].number + lineDiff + 1,
          },
          fixer,
        );
      } else if (lineDiff > 0) {
        const fixer = () => {
          utils.addLines(
            tagIdx,
            /** @type {import('../iterateJsdoc.js').Integer} */ (lastEmpty),
            endLines - emptyLinesCount,
          );
        };

        utils.reportJSDoc(
          `Expected ${endLines} trailing lines`,
          {
            line: tg.source[lastEmpty].number,
          },
          fixer,
        );
      }

      return true;
    }

    if (reportIndex !== null) {
      const fixer = () => {
        utils.removeTag(tagIdx, {
          tagSourceOffset: /** @type {import('../iterateJsdoc.js').Integer} */ (
            reportIndex
          ),
        });
      };

      utils.reportJSDoc(
        'Expected no lines between tags',
        {
          line: tg.source[0].number + 1,
        },
        fixer,
      );

      return true;
    }

    return false;
  });

  (applyToEndTag ? jsdoc.tags : jsdoc.tags.slice(0, -1)).some((tg, tagIdx) => {
    /**
     * @type {{
     *   idx: import('../iterateJsdoc.js').Integer,
     *   number: import('../iterateJsdoc.js').Integer
     * }[]}
     */
    const lines = [];

    let currentTag;
    let tagSourceIdx = 0;
    for (const [
      idx,
      {
        number,
        tokens: {
          description,
          end,
          name,
          tag,
          type,
        },
      },
    ] of tg.source.entries()) {
      if (description) {
        lines.splice(0);
        tagSourceIdx = idx;
      }

      if (tag) {
        currentTag = tag;
      }

      if (!tag && !name && !type && !description && !end) {
        lines.push({
          idx,
          number,
        });
      }
    }

    const currentTg = currentTag && tags[currentTag.slice(1)];
    const tagCount = currentTg?.count;

    const defaultAlways = alwaysNever === 'always' && currentTg?.lines !== 'never' &&
      currentTg?.lines !== 'any' && lines.length < count;

    let overrideAlways;
    let fixCount = count;
    if (!defaultAlways) {
      fixCount = typeof tagCount === 'number' ? tagCount : count;
      overrideAlways = currentTg?.lines === 'always' &&
        lines.length < fixCount;
    }

    if (defaultAlways || overrideAlways) {
      const fixer = () => {
        utils.addLines(tagIdx, lines[lines.length - 1]?.idx || tagSourceIdx + 1, fixCount - lines.length);
      };

      const line = lines[lines.length - 1]?.number || tg.source[tagSourceIdx].number;
      utils.reportJSDoc(
        `Expected ${fixCount} line${fixCount === 1 ? '' : 's'} between tags but found ${lines.length}`,
        {
          line,
        },
        fixer,
      );

      return true;
    }

    return false;
  });

  if (checkMaxBlockLines({
    maxBlockLines,
    startLines,
    utils,
  })) {
    return;
  }

  if (typeof startLines === 'number') {
    if (!jsdoc.tags.length) {
      return;
    }

    const {
      description,
      lastDescriptionLine,
    } = utils.getDescription();
    if (!(/\S/v).test(description)) {
      return;
    }

    const trailingLines = description.match(/\n+$/v)?.[0]?.length;
    const trailingDiff = (trailingLines ?? 0) - startLines;
    if (trailingDiff > 0) {
      utils.reportJSDoc(
        `Expected only ${startLines} line${startLines === 1 ? '' : 's'} after block description`,
        {
          line: lastDescriptionLine - trailingDiff,
        },
        () => {
          utils.setBlockDescription((info, seedTokens, descLines) => {
            return descLines.slice(0, -trailingDiff).map((desc) => {
              return {
                number: 0,
                source: '',
                tokens: seedTokens({
                  ...info,
                  description: desc,
                  postDelimiter: desc.trim() ? info.postDelimiter : '',
                }),
              };
            });
          });
        },
      );
    } else if (trailingDiff < 0) {
      utils.reportJSDoc(
        `Expected ${startLines} lines after block description`,
        {
          line: lastDescriptionLine,
        },
        () => {
          utils.setBlockDescription((info, seedTokens, descLines) => {
            return [
              ...descLines,
              ...Array.from({
                length: -trailingDiff,
              }, () => {
                return '';
              }),
            ].map((desc) => {
              return {
                number: 0,
                source: '',
                tokens: seedTokens({
                  ...info,
                  description: desc,
                  postDelimiter: desc.trim() ? info.postDelimiter : '',
                }),
              };
            });
          });
        },
      );
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Enforces lines (or no lines) before, after, or between tags.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/tag-lines.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        description: `Defaults to "never". "any" is only useful with \`tags\` (allowing non-enforcement of lines except
for particular tags) or with \`startLines\`, \`endLines\`, or \`maxBlockLines\`. It is also
necessary if using the linebreak-setting options of the \`sort-tags\` rule
so that the two rules won't conflict in both attempting to set lines
between tags.`,
        enum: [
          'always', 'any', 'never',
        ],
        type: 'string',
      },
      {
        additionalProperties: false,
        properties: {
          applyToEndTag: {
            description: `Set to \`false\` and use with "always" to indicate the normal lines to be
added after tags should not be added after the final tag.

Defaults to \`true\`.`,
            type: 'boolean',
          },
          count: {
            description: `Use with "always" to indicate the number of lines to require be present.

Defaults to 1.`,
            type: 'integer',
          },
          endLines: {
            anyOf: [
              {
                type: 'integer',
              },
              {
                type: 'null',
              },
            ],
            description: `If not set to \`null\`, will enforce end lines to the given count on the
final tag only.

Defaults to \`0\`.`,
          },
          maxBlockLines: {
            anyOf: [
              {
                type: 'integer',
              },
              {
                type: 'null',
              },
            ],
            description: `If not set to \`null\`, will enforce a maximum number of lines to the given count anywhere in the block description.

Note that if non-\`null\`, \`maxBlockLines\` must be greater than or equal to \`startLines\`.

Defaults to \`null\`.`,
          },
          startLines: {
            anyOf: [
              {
                type: 'integer',
              },
              {
                type: 'null',
              },
            ],
            description: `If not set to \`null\`, will enforce end lines to the given count before the
first tag only, unless there is only whitespace content, in which case,
a line count will not be enforced.

Defaults to \`0\`.`,
          },
          tags: {
            description: `Overrides the default behavior depending on specific tags.

An object whose keys are tag names and whose values are objects with the
following keys:

1. \`lines\` - Set to \`always\`, \`never\`, or \`any\` to override.
2. \`count\` - Overrides main \`count\` (for "always")

Defaults to empty object.`,
            patternProperties: {
              '.*': {
                additionalProperties: false,
                properties: {
                  count: {
                    type: 'integer',
                  },
                  lines: {
                    enum: [
                      'always', 'never', 'any',
                    ],
                    type: 'string',
                  },
                },
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
