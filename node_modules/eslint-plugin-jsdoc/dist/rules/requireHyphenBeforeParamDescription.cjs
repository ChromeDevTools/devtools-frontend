"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  jsdoc,
  utils
}) => {
  const [mainCircumstance, {
    tags = null
  } = {}] = context.options;
  const tgs =
  /**
   * @type {null|"any"|{[key: string]: "always"|"never"}}
   */
  tags;

  /**
   * @param {import('@es-joy/jsdoccomment').JsdocTagWithInline} jsdocTag
   * @param {string} targetTagName
   * @param {"always"|"never"} [circumstance]
   * @returns {void}
   */
  const checkHyphens = (jsdocTag, targetTagName, circumstance = mainCircumstance) => {
    const always = !circumstance || circumstance === 'always';
    const desc = /** @type {string} */utils.getTagDescription(jsdocTag);
    if (!desc.trim()) {
      return;
    }
    const startsWithHyphen = /^\s*-/v.test(desc);
    const hyphenNewline = /^\s*-\n/v.test(desc);
    let lines = 0;
    for (const {
      tokens
    } of jsdocTag.source) {
      if (tokens.description) {
        break;
      }
      lines++;
    }
    if (always && !hyphenNewline) {
      if (!startsWithHyphen) {
        let fixIt = true;
        for (const {
          tokens
        } of jsdocTag.source) {
          if (tokens.description) {
            tokens.description = tokens.description.replace(/^(\s*)/v, '$1- ');
            break;
          }

          // Linebreak after name since has no description
          if (tokens.name) {
            fixIt = false;
            break;
          }
        }
        if (fixIt) {
          utils.reportJSDoc(`There must be a hyphen before @${targetTagName} description.`, {
            line: jsdocTag.source[0].number + lines
          }, () => {});
        }
      }
    } else if (startsWithHyphen) {
      utils.reportJSDoc(always ? `There must be no hyphen followed by newline after the @${targetTagName} name.` : `There must be no hyphen before @${targetTagName} description.`, {
        line: jsdocTag.source[0].number + lines
      }, () => {
        for (const {
          tokens
        } of jsdocTag.source) {
          if (tokens.description) {
            tokens.description = tokens.description.replace(/^\s*-\s*/v, '');
            if (hyphenNewline) {
              tokens.postName = '';
            }
            break;
          }
        }
      }, true);
    }
  };
  utils.forEachPreferredTag('param', checkHyphens);
  if (tgs) {
    const tagEntries = Object.entries(tgs);
    for (const [tagName, circumstance] of tagEntries) {
      if (tagName === '*') {
        const preferredParamTag = utils.getPreferredTagName({
          tagName: 'param'
        });
        for (const {
          tag
        } of jsdoc.tags) {
          if (tag === preferredParamTag || tagEntries.some(([tagNme]) => {
            return tagNme !== '*' && tagNme === tag;
          })) {
            continue;
          }
          utils.forEachPreferredTag(tag, (jsdocTag, targetTagName) => {
            checkHyphens(jsdocTag, targetTagName, /** @type {"always"|"never"} */circumstance);
          });
        }
        continue;
      }
      utils.forEachPreferredTag(tagName, (jsdocTag, targetTagName) => {
        checkHyphens(jsdocTag, targetTagName, /** @type {"always"|"never"} */circumstance);
      });
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Requires a hyphen before the `@param` description (and optionally before `@property` descriptions).',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-hyphen-before-param-description.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      description: `If the string is \`"always"\` then a problem is raised when there is no hyphen
before the description. If it is \`"never"\` then a problem is raised when there
is a hyphen before the description. The default value is \`"always"\`.

Even if hyphens are set to "always" appear after the tag name, they will
actually be forbidden in the event that they are followed immediately by
the end of a line (this will otherwise cause Visual Studio Code to display
incorrectly).`,
      enum: ['always', 'never'],
      type: 'string'
    }, {
      additionalProperties: false,
      description: `The options object may have the following property to indicate behavior for
other tags besides the \`@param\` tag (or the \`@arg\` tag if so set).`,
      properties: {
        tags: {
          anyOf: [{
            patternProperties: {
              '.*': {
                enum: ['always', 'never'],
                type: 'string'
              }
            },
            type: 'object'
          }, {
            enum: ['any'],
            type: 'string'
          }],
          description: `Object whose keys indicate different tags to check for the
  presence or absence of hyphens; the key value should be "always" or "never",
  indicating how hyphens are to be applied, e.g., \`{property: 'never'}\`
  to ensure \`@property\` never uses hyphens. A key can also be set as \`*\`, e.g.,
  \`'*': 'always'\` to apply hyphen checking to any tag (besides the preferred
  \`@param\` tag which follows the main string option setting and besides any
  other \`tags\` entries).`
        }
      },
      type: 'object'
    }],
    type: 'layout'
  }
});
module.exports = exports.default;
//# sourceMappingURL=requireHyphenBeforeParamDescription.cjs.map