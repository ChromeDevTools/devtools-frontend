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
  const functionType = context.options[0] ?? 'property';
  const {
    enableFixer = true,
  } = context.options[1] ?? {};

  /**
   * @param {import('@es-joy/jsdoccomment').JsdocTagWithInline} tag
   */
  const checkType = (tag) => {
    const potentialType = tag.type;
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

    traverse(parsedType, (nde, parentNode, property, idx) => {
      switch (nde.type) {
        case 'JsdocTypeFunction': {
          if (functionType !== 'method') {
            break;
          }

          if (parentNode?.type === 'JsdocTypeObjectField' &&
            typeof parentNode.key === 'string'
          ) {
            utils.reportJSDoc(
              'Found function property; prefer method signature.',
              tag,
              enableFixer ? () => {
                const objectField = parentNode;
                const obj =
                  /**
                   * @type {import('jsdoc-type-pratt-parser').ObjectFieldResult & {
                   *   parentNode: import('jsdoc-type-pratt-parser').ObjectResult
                   * }}
                   */
                  (objectField).parentNode;

                const index = obj.elements.indexOf(parentNode);

                obj.elements[index] = {
                  /* c8 ignore next 5 -- Guard */
                  meta: nde.meta ?
                    {
                      quote: objectField.meta.quote,
                      ...nde.meta,
                    } :
                    {
                      quote: objectField.meta.quote,
                    },
                  name: /** @type {string} */ (objectField.key),
                  parameters: nde.parameters,
                  returnType: /** @type {import('jsdoc-type-pratt-parser').RootResult} */ (
                    nde.returnType
                  ),
                  type: 'JsdocTypeMethodSignature',
                  typeParameters: nde.typeParameters,
                };

                rewireByParsedType(jsdoc, tag, parsedType, indent);
              } : null,
            );
            break;
          }

          if (parentNode?.type === 'JsdocTypeParenthesis' &&
            // @ts-expect-error Our own added API
            parentNode.parentNode?.type === 'JsdocTypeIntersection' &&
            // @ts-expect-error Our own added API
            parentNode.parentNode.parentNode.type === 'JsdocTypeObjectField' &&
            // @ts-expect-error Our own added API
            typeof parentNode.parentNode.parentNode.key === 'string'
          ) {
            // @ts-expect-error Our own added API
            const intersection = parentNode.parentNode;
            const objectField = intersection.parentNode;
            const object = objectField.parentNode;
            // const objFieldIndex = object.elements.indexOf(objectField);

            /**
             * @param {import('jsdoc-type-pratt-parser').FunctionResult} func
             */
            const convertToMethod = (func) => {
              return /** @type {import('jsdoc-type-pratt-parser').MethodSignatureResult} */ ({
                /* c8 ignore next 5 -- Guard */
                meta: func.meta ?
                  {
                    quote: objectField.meta.quote,
                    ...func.meta,
                  } :
                  {
                    quote: objectField.meta.quote,
                  },
                name: /** @type {string} */ (objectField.key),
                parameters: func.parameters,
                returnType: /** @type {import('jsdoc-type-pratt-parser').RootResult} */ (
                  func.returnType
                ),
                type: 'JsdocTypeMethodSignature',
                typeParameters: func.typeParameters,
              });
            };

            /** @type {import('jsdoc-type-pratt-parser').MethodSignatureResult[]} */
            const methods = [];
            /** @type {number[]} */
            const methodIndexes = [];
            for (const [
              index,
              element,
            ] of intersection.elements.entries()) {
              if (
                element.type !== 'JsdocTypeParenthesis' ||
                element.element.type !== 'JsdocTypeFunction'
              ) {
                return;
              }

              methods.push(convertToMethod(element.element));
              methodIndexes.push(index);
            }

            utils.reportJSDoc(
              'Found function property; prefer method signature.',
              tag,
              enableFixer ? () => {
                for (const methodIndex of methodIndexes.toReversed()) {
                  object.elements.splice(methodIndex, 1);
                }

                object.elements.splice(methodIndexes[0], 0, ...methods);

                rewireByParsedType(jsdoc, tag, parsedType, indent);
              } : null,
            );
          }

          break;
        }

        case 'JsdocTypeMethodSignature': {
          if (functionType !== 'property') {
            break;
          }

          /**
           * @param {import('jsdoc-type-pratt-parser').MethodSignatureResult} node
           */
          const convertToFunction = (node) => {
            return {
              arrow: true,
              constructor: false,
              meta: /** @type {Required<import('jsdoc-type-pratt-parser').MethodSignatureResult['meta']>} */ (
                node.meta
              ),
              parameters: node.parameters,
              parenthesis: true,
              returnType: node.returnType,
              type: 'JsdocTypeFunction',
              typeParameters: node.typeParameters,
            };
          };

          utils.reportJSDoc(
            'Found method signature; prefer function property.',
            tag,
            enableFixer ? () => {
              /* c8 ignore next 3 -- TS guard */
              if (!parentNode || !property || typeof idx !== 'number') {
                throw new Error('Unexpected lack of parent or property');
              }

              const object = /** @type {import('jsdoc-type-pratt-parser').ObjectResult} */ (
                parentNode
              );

              const funcs = [];
              const removals = [];

              for (const [
                index,
                element,
              ] of object.elements.entries()) {
                if (element.type === 'JsdocTypeMethodSignature' &&
                  element.name === nde.name
                ) {
                  funcs.push(convertToFunction(element));
                  if (index !== idx) {
                    removals.push(index);
                  }
                }
              }

              if (funcs.length === 1) {
                object.elements[idx] = /** @type {import('jsdoc-type-pratt-parser').ObjectFieldResult} */ ({
                  key: nde.name,
                  meta: nde.meta,
                  optional: false,
                  readonly: false,
                  right: funcs[0],
                  type: 'JsdocTypeObjectField',
                });
              } else {
                for (const removal of removals.toReversed()) {
                  object.elements.splice(removal, 1);
                }

                object.elements[idx] = {
                  key: nde.name,
                  meta: nde.meta,
                  optional: false,
                  readonly: false,
                  right: {
                    elements: funcs.map((func) => {
                      return /** @type {import('jsdoc-type-pratt-parser').ParenthesisResult} */ ({
                        element: func,
                        type: 'JsdocTypeParenthesis',
                      });
                    }),
                    type: 'JsdocTypeIntersection',
                  },
                  type: 'JsdocTypeObjectField',
                };
              }

              rewireByParsedType(jsdoc, tag, parsedType, indent);
            } : null,
          );
        }

          break;
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
      description: 'Prefers either function properties or method signatures',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/ts-method-signature-style.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        enum: [
          'method',
          'property',
        ],
        type: 'string',
      },
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
