import iterateJsdoc from '../iterateJsdoc.js';
import {
  rewireByParsedType,
} from '../jsdocUtils.js';
import {
  parse as parseType,
  traverse,
} from '@es-joy/jsdoccomment';

export default iterateJsdoc(({
  context,
  indent,
  jsdoc,
  settings,
  utils,
}) => {
  if (settings.mode !== 'typescript') {
    return;
  }

  const {
    enableFixer = true,
  } = context.options[0] ?? {};

  /**
   * @param {import('@es-joy/jsdoccomment').JsdocTagWithInline} tag
   */
  const checkType = (tag) => {
    const potentialType = tag.type;
    /** @type {import('jsdoc-type-pratt-parser').RootResult} */
    let parsedType;
    try {
      parsedType = parseType(
        /** @type {string} */ (potentialType), 'typescript',
      );
    } catch {
      return;
    }

    traverse(parsedType, (nde, parentNode, property, index) => {
      switch (nde.type) {
        case 'JsdocTypeTemplateLiteral': {
          const stringInterpolationIndex = nde.interpolations.findIndex((interpolation) => {
            return interpolation.type === 'JsdocTypeStringValue';
          });
          if (stringInterpolationIndex > -1) {
            utils.reportJSDoc(
              'Found an unnecessary string literal within a template.',
              tag,
              enableFixer ? () => {
                nde.literals.splice(
                  stringInterpolationIndex,
                  2,
                  nde.literals[stringInterpolationIndex] +
                    /** @type {import('jsdoc-type-pratt-parser').StringValueResult} */
                    (nde.interpolations[stringInterpolationIndex]).value +
                    nde.literals[stringInterpolationIndex + 1],
                );

                nde.interpolations.splice(
                  stringInterpolationIndex, 1,
                );

                rewireByParsedType(jsdoc, tag, parsedType, indent);
              } : null,
            );
          } else if (nde.literals.length === 2 && nde.literals[0] === '' &&
            nde.literals[1] === ''
          ) {
            utils.reportJSDoc(
              'Found a lone template expression within a template.',
              tag,
              enableFixer ? () => {
                const interpolation = nde.interpolations[0];

                if (parentNode && property) {
                  if (typeof index === 'number') {
                    // @ts-expect-error Safe
                    parentNode[property][index] = interpolation;
                  } else {
                    // @ts-expect-error Safe
                    parentNode[property] = interpolation;
                  }
                } else {
                  parsedType = interpolation;
                }

                rewireByParsedType(jsdoc, tag, parsedType, indent);
              } : null,
            );
          }
        }
      }
    });
  };

  const tags = utils.filterTags(({
    tag,
  }) => {
    return Boolean(tag !== 'import' && utils.tagMightHaveTypePosition(tag));
  });

  for (const tag of tags) {
    if (tag.type) {
      checkType(tag);
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Catches unnecessary template expressions such as string expressions within a template literal.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/ts-no-unnecessary-template-expression.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          enableFixer: {
            description: 'Whether to enable the fixer. Defaults to `true`.',
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
