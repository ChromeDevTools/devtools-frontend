import iterateJsdoc from '../iterateJsdoc.js';

export default iterateJsdoc(({
  context,
  info: {
    lastIndex,
  },
  jsdoc,
  report,
  utils,
}) => {
  const {
    match,
  } = context.options[0] || {};
  if (!match) {
    report('Rule `no-restricted-syntax` is missing a `match` option.');

    return;
  }

  const {
    allowName,
    disallowName,
    replacement,
    tags = [
      '*',
    ],
  } = match[/** @type {import('../iterateJsdoc.js').Integer} */ (lastIndex)];

  const allowNameRegex = allowName && utils.getRegexFromString(allowName);
  const disallowNameRegex = disallowName && utils.getRegexFromString(disallowName);

  let applicableTags = jsdoc.tags;
  if (!tags.includes('*')) {
    applicableTags = utils.getPresentTags(tags);
  }

  let reported = false;
  for (const tag of applicableTags) {
    const tagName = tag.name.replace(/^\[/v, '').replace(/(=.*)?\]$/v, '');
    const allowed = !allowNameRegex || allowNameRegex.test(tagName);
    const disallowed = disallowNameRegex && disallowNameRegex.test(tagName);
    const hasRegex = allowNameRegex || disallowNameRegex;
    if (hasRegex && allowed && !disallowed) {
      continue;
    }

    if (!hasRegex && reported) {
      continue;
    }

    const fixer = () => {
      for (const src of tag.source) {
        if (src.tokens.name) {
          src.tokens.name = src.tokens.name.replace(
            disallowNameRegex, replacement,
          );
          break;
        }
      }
    };

    let {
      message,
    } = match[/** @type {import('../iterateJsdoc.js').Integer} */ (lastIndex)];
    if (!message) {
      if (hasRegex) {
        message = disallowed ?
          `Only allowing names not matching \`${disallowNameRegex}\` but found "${tagName}".` :
          `Only allowing names matching \`${allowNameRegex}\` but found "${tagName}".`;
      } else {
        message = `Prohibited context for "${tagName}".`;
      }
    }

    utils.reportJSDoc(
      message,
      hasRegex ? tag : null,

      // We could match up
      disallowNameRegex && replacement !== undefined ?
        fixer :
        null,
      false,
      {
        // Could also supply `context`, `comment`, `tags`
        allowName,
        disallowName,
        name: tagName,
      },
    );
    if (!hasRegex) {
      reported = true;
    }
  }
}, {
  matchContext: true,
  meta: {
    docs: {
      description: 'Reports the name portion of a JSDoc tag if matching or not matching a given regular expression.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/match-name.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          match: {
            description: `\`match\` is a required option containing an array of objects which determine
the conditions whereby a name is reported as being problematic.

These objects can have any combination of the following groups of optional
properties, all of which act to confine one another.

Note that \`comment\`, even if targeting a specific tag, is used to match the
whole block. So if a \`comment\` finds its specific tag, it may still apply
fixes found by the likes of \`disallowName\` even when a different tag has the
disallowed name. An alternative is to ensure that \`comment\` finds the specific
tag of the desired tag and/or name and no \`disallowName\` (or \`allowName\`) is
supplied. In such a case, only one error will be reported, but no fixer will
be applied, however.`,
            items: {
              additionalProperties: false,
              properties: {
                allowName: {
                  description: `Indicates which names are allowed for the given tag (or \`*\`).
Accepts a string regular expression (optionally wrapped between two
\`/\` delimiters followed by optional flags) used to match the name.`,
                  type: 'string',
                },
                comment: {
                  description: 'As with `context` but AST for the JSDoc block comment and types.',
                  type: 'string',
                },
                context: {
                  description: `AST to confine the allowing or disallowing to JSDoc blocks
associated with a particular context. See the
["AST and Selectors"](../#advanced-ast-and-selectors)
section of our Advanced docs for more on the expected format.`,
                  type: 'string',
                },
                disallowName: {
                  description: 'As with `allowName` but indicates names that are not allowed.',
                  type: 'string',
                },
                message: {
                  description: 'An optional custom message to use when there is a match.',
                  type: 'string',
                },
                replacement: {
                  description: `If \`disallowName\` is supplied and this value is present, it
will replace the matched \`disallowName\` text.`,
                  type: 'string',
                },
                tags: {
                  description: `This array should include tag names or \`*\` to indicate the
  match will apply for all tags (except as confined by any context
  properties). If \`*\` is not used, then these rules will only apply to
  the specified tags. If \`tags\` is omitted, then \`*\` is assumed.`,
                  items: {
                    type: 'string',
                  },
                  type: 'array',
                },
              },
              type: 'object',
            },
            type: 'array',
          },
        },
        required: [
          'match',
        ],
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
