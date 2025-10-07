import iterateJsdoc from '../iterateJsdoc.js';
import escapeStringRegexp from 'escape-string-regexp';

// https://babeljs.io/docs/en/babel-plugin-transform-react-jsx/
const jsxTagNames = new Set([
  'jsx',
  'jsxFrag',
  'jsxImportSource',
  'jsxRuntime',
]);

const typedTagsAlwaysUnnecessary = new Set([
  'augments',
  'callback',
  'class',
  'enum',
  'implements',
  'private',
  'property',
  'protected',
  'public',
  'readonly',
  'this',
  'type',
  'typedef',
]);

const typedTagsNeedingName = new Set([
  'template',
]);

const typedTagsUnnecessaryOutsideDeclare = new Set([
  'abstract',
  'access',
  'class',
  'constant',
  'constructs',
  'default',
  'enum',
  'export',
  'exports',
  'function',
  'global',
  'inherits',
  'instance',
  'interface',
  'member',
  'memberof',
  'memberOf',
  'method',
  'mixes',
  'mixin',
  'module',
  'name',
  'namespace',
  'override',
  'property',
  'requires',
  'static',
  'this',
]);

export default iterateJsdoc(({
  context,
  jsdoc,
  jsdocNode,
  node,
  report,
  settings,
  sourceCode,
  utils,
}) => {
  const
    /**
     * @type {{
     *   definedTags: string[],
     *   enableFixer: boolean,
     *   inlineTags: string[],
     *   jsxTags: boolean,
     *   typed: boolean
     }} */ {
      definedTags = [],
      enableFixer = true,
      inlineTags = [
        'link', 'linkcode', 'linkplain', 'tutorial',
      ],
      jsxTags,
      typed,
    } = context.options[0] || {};

  /** @type {(string|undefined)[]} */
  let definedPreferredTags = [];
  const {
    structuredTags,
    tagNamePreference,
  } = settings;
  const definedStructuredTags = Object.keys(structuredTags);
  const definedNonPreferredTags = Object.keys(tagNamePreference);
  if (definedNonPreferredTags.length) {
    definedPreferredTags = Object.values(tagNamePreference).map((preferredTag) => {
      if (typeof preferredTag === 'string') {
        // May become an empty string but will be filtered out below
        return preferredTag;
      }

      if (!preferredTag) {
        return undefined;
      }

      if (typeof preferredTag !== 'object') {
        utils.reportSettings(
          'Invalid `settings.jsdoc.tagNamePreference`. Values must be falsy, a string, or an object.',
        );
      }

      return preferredTag.replacement;
    })
      .filter(Boolean);
  }

  /**
   * @param {import('eslint').Rule.Node} subNode
   * @returns {boolean}
   */
  const isInAmbientContext = (subNode) => {
    return subNode.type === 'Program' ?
      context.getFilename().endsWith('.d.ts') :
      Boolean(
        /** @type {import('@typescript-eslint/types').TSESTree.VariableDeclaration} */ (
          subNode
        ).declare,
      ) || isInAmbientContext(subNode.parent);
  };

  /**
   * @param {import('comment-parser').Spec} jsdocTag
   * @returns {boolean}
   */
  const tagIsRedundantWhenTyped = (jsdocTag) => {
    if (!typedTagsUnnecessaryOutsideDeclare.has(jsdocTag.tag)) {
      return false;
    }

    if (jsdocTag.tag === 'default') {
      return false;
    }

    if (node === null) {
      return false;
    }

    if (context.getFilename().endsWith('.d.ts') && [
      null, 'Program', undefined,
    ].includes(node?.parent?.type)) {
      return false;
    }

    if (isInAmbientContext(/** @type {import('eslint').Rule.Node} */ (node))) {
      return false;
    }

    return true;
  };

  /**
   * @param {string} message
   * @param {import('comment-parser').Spec} jsdocTag
   * @param {import('../iterateJsdoc.js').Integer} tagIndex
   * @param {Partial<import('comment-parser').Tokens>} [additionalTagChanges]
   * @returns {void}
   */
  const reportWithTagRemovalFixer = (message, jsdocTag, tagIndex, additionalTagChanges) => {
    utils.reportJSDoc(message, jsdocTag, enableFixer ? () => {
      if (jsdocTag.description.trim()) {
        utils.changeTag(jsdocTag, {
          postType: '',
          type: '',
          ...additionalTagChanges,
        });
      } else {
        utils.removeTag(tagIndex, {
          removeEmptyBlock: true,
        });
      }
    } : null, true);
  };

  /**
   * @param {import('comment-parser').Spec} jsdocTag
   * @param {import('../iterateJsdoc.js').Integer} tagIndex
   * @returns {boolean}
   */
  const checkTagForTypedValidity = (jsdocTag, tagIndex) => {
    if (typedTagsAlwaysUnnecessary.has(jsdocTag.tag)) {
      reportWithTagRemovalFixer(
        `'@${jsdocTag.tag}' is redundant when using a type system.`,
        jsdocTag,
        tagIndex,
        {
          postTag: '',
          tag: '',
        },
      );
      return true;
    }

    if (tagIsRedundantWhenTyped(jsdocTag)) {
      reportWithTagRemovalFixer(
        `'@${jsdocTag.tag}' is redundant outside of ambient (\`declare\`/\`.d.ts\`) contexts when using a type system.`,
        jsdocTag,
        tagIndex,
      );
      return true;
    }

    if (typedTagsNeedingName.has(jsdocTag.tag) && !jsdocTag.name) {
      reportWithTagRemovalFixer(
        `'@${jsdocTag.tag}' without a name is redundant when using a type system.`,
        jsdocTag,
        tagIndex,
      );
      return true;
    }

    return false;
  };

  for (let tagIndex = 0; tagIndex < jsdoc.tags.length; tagIndex += 1) {
    const jsdocTag = jsdoc.tags[tagIndex];
    const tagName = jsdocTag.tag;
    if (jsxTags && jsxTagNames.has(tagName)) {
      continue;
    }

    if (typed && checkTagForTypedValidity(jsdocTag, tagIndex)) {
      continue;
    }

    const validTags = [
      ...definedTags,
      ...(/** @type {string[]} */ (definedPreferredTags)),
      ...definedNonPreferredTags,
      ...definedStructuredTags,
      ...typed ? typedTagsNeedingName : [],
    ];

    if (utils.isValidTag(tagName, validTags)) {
      let preferredTagName = utils.getPreferredTagName({
        allowObjectReturn: true,
        defaultMessage: `Blacklisted tag found (\`@${tagName}\`)`,
        tagName,
      });
      if (!preferredTagName) {
        continue;
      }

      let message;
      if (typeof preferredTagName === 'object') {
        ({
          message,
          replacement: preferredTagName,
        } = /** @type {{message: string; replacement?: string | undefined;}} */ (
          preferredTagName
        ));
      }

      if (!message) {
        message = `Invalid JSDoc tag (preference). Replace "${tagName}" JSDoc tag with "${preferredTagName}".`;
      }

      if (preferredTagName !== tagName) {
        report(message, (fixer) => {
          const replacement = sourceCode.getText(jsdocNode).replace(
            new RegExp(`@${escapeStringRegexp(tagName)}\\b`, 'v'),
            `@${preferredTagName}`,
          );

          return fixer.replaceText(jsdocNode, replacement);
        }, jsdocTag);
      }
    } else {
      report(`Invalid JSDoc tag name "${tagName}".`, null, jsdocTag);
    }
  }

  for (const inlineTag of utils.getInlineTags()) {
    if (!inlineTags.includes(inlineTag.tag)) {
      report(`Invalid JSDoc inline tag name "${inlineTag.tag}"`, null, inlineTag);
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Reports invalid block tag names.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/check-tag-names.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          definedTags: {
            description: `Use an array of \`definedTags\` strings to configure additional, allowed tags.
The format is as follows:

\`\`\`json
{
  "definedTags": ["note", "record"]
}
\`\`\``,
            items: {
              type: 'string',
            },
            type: 'array',
          },
          enableFixer: {
            description: 'Set to `false` to disable auto-removal of types that are redundant with the [`typed` option](#typed).',
            type: 'boolean',
          },
          inlineTags: {
            description: `List of tags to allow inline.

Defaults to array of \`'link', 'linkcode', 'linkplain', 'tutorial'\``,
            items: {
              type: 'string',
            },
            type: 'array',
          },
          jsxTags: {
            description: `If this is set to \`true\`, all of the following tags used to control JSX output are allowed:

\`\`\`
jsx
jsxFrag
jsxImportSource
jsxRuntime
\`\`\`

For more information, see the [babel documentation](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx).`,
            type: 'boolean',
          },
          typed: {
            description: `If this is set to \`true\`, additionally checks for tag names that are redundant when using a type checker such as TypeScript.

These tags are always unnecessary when using TypeScript or similar:

\`\`\`
augments
callback
class
enum
implements
private
property
protected
public
readonly
this
type
typedef
\`\`\`

These tags are unnecessary except when inside a TypeScript \`declare\` context:

\`\`\`
abstract
access
class
constant
constructs
default
enum
export
exports
function
global
inherits
instance
interface
member
memberof
memberOf
method
mixes
mixin
module
name
namespace
override
property
requires
static
this
\`\`\``,
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
