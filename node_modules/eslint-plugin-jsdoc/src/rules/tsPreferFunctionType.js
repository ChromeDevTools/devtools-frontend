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
  utils,
}) => {
  const {
    enableFixer = true,
  } = context.options[0] || {};

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

    traverse(parsedType, (nde, parentNode) => {
      // @ts-expect-error Adding our own property for use below
      nde.parentNode = parentNode;
    });

    traverse(parsedType, (nde, parentNode, property, index) => {
      switch (nde.type) {
        case 'JsdocTypeCallSignature': {
          const object = /** @type {import('jsdoc-type-pratt-parser').ObjectResult} */ (
            parentNode
          );
          if (typeof index === 'number' && object.elements.length === 1) {
            utils.reportJSDoc(
              'Call signature found; function type preferred.',
              tag,
              enableFixer ? () => {
                const func = /** @type {import('jsdoc-type-pratt-parser').FunctionResult} */ ({
                  arrow: true,
                  constructor: false,
                  meta: /** @type {Required<import('jsdoc-type-pratt-parser').MethodSignatureResult['meta']>} */ (
                    nde.meta
                  ),
                  parameters: nde.parameters,
                  parenthesis: true,
                  returnType: nde.returnType,
                  type: 'JsdocTypeFunction',
                  typeParameters: nde.typeParameters,
                });

                if (property && 'parentNode' in object && object.parentNode) {
                  if (typeof object.parentNode === 'object' &&
                      'elements' in object.parentNode &&
                      Array.isArray(object.parentNode.elements)
                  ) {
                    const idx = object.parentNode.elements.indexOf(object);
                    object.parentNode.elements[idx] = func;
                  /* c8 ignore next 6 -- Guard */
                  } else {
                    throw new Error(
                      // @ts-expect-error Ok
                      `Rule currently unable to handle type ${object.parentNode.type}`,
                    );
                  }
                } else {
                  parsedType = func;
                }

                rewireByParsedType(jsdoc, tag, parsedType, indent);
              } : null,
            );
          }

          break;
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
      description: 'Prefers function types over call signatures when there are no other properties.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/ts-prefer-function-type.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          enableFixer: {
            description: 'Whether to enable the fixer or not',
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
