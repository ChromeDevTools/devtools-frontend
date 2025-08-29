import iterateJsdoc from '../iterateJsdoc.js';

const defaultEmptyTags = new Set([
  'abstract', 'async', 'generator', 'global', 'hideconstructor',

  // jsdoc doesn't use this form in its docs, but allow for compatibility with
  //  TypeScript which allows and Closure which requires
  'ignore',

  // jsdoc doesn't use but allow for TypeScript
  'inheritDoc', 'inner', 'instance',
  'internal',

  'overload',

  'override',
  'readonly',
]);

const emptyIfNotClosure = new Set([
  // Closure doesn't allow with this casing
  'inheritdoc', 'package', 'private', 'protected', 'public',

  'static',
]);

const emptyIfClosure = new Set([
  'interface',
]);

export default iterateJsdoc(({
  jsdoc,
  settings,
  utils,
}) => {
  const emptyTags = utils.filterTags(({
    tag: tagName,
  }) => {
    return defaultEmptyTags.has(tagName) ||
      utils.hasOptionTag(tagName) && jsdoc.tags.some(({
        tag,
      }) => {
        return tag === tagName;
      }) ||
      settings.mode === 'closure' && emptyIfClosure.has(tagName) ||
      settings.mode !== 'closure' && emptyIfNotClosure.has(tagName);
  });

  for (const [
    key,
    tag,
  ] of emptyTags.entries()) {
    const content = tag.name || tag.description || tag.type;
    if (content.trim() && (
      // Allow for JSDoc-block final asterisks
      key !== emptyTags.length - 1 || !(/^\s*\*+$/u).test(content)
    )) {
      const fix = () => {
        // By time of call in fixer, `tag` will have `line` added
        utils.setTag(
          /**
           * @type {import('comment-parser').Spec & {
           *   line: import('../iterateJsdoc.js').Integer
           * }}
           */ (tag),
        );
      };

      utils.reportJSDoc(`@${tag.tag} should be empty.`, tag, fix, true);
    }
  }
}, {
  checkInternal: true,
  checkPrivate: true,
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Expects specific tags to be empty of any content.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/empty-tags.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          tags: {
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
