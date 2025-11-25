"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
var _jsdocUtils = require("../jsdocUtils.cjs");
var _jsdoccomment = require("@es-joy/jsdoccomment");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const digitRegex = /^(\d+(\.\d*)?|\.\d+)([eE][\-+]?\d+)?$/v;
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  indent,
  jsdoc,
  settings,
  utils
  // eslint-disable-next-line complexity -- Todo
}) => {
  const {
    arrayBrackets = 'square',
    arrowFunctionPostReturnMarkerSpacing = ' ',
    arrowFunctionPreReturnMarkerSpacing = ' ',
    enableFixer = true,
    functionOrClassParameterSpacing = ' ',
    functionOrClassPostGenericSpacing = '',
    functionOrClassPostReturnMarkerSpacing = ' ',
    functionOrClassPreReturnMarkerSpacing = '',
    functionOrClassTypeParameterSpacing = ' ',
    genericAndTupleElementSpacing = ' ',
    genericDot = false,
    keyValuePostColonSpacing = ' ',
    keyValuePostKeySpacing = '',
    keyValuePostOptionalSpacing = '',
    keyValuePostVariadicSpacing = '',
    methodQuotes = 'double',
    objectFieldIndent = '',
    objectFieldQuote = null,
    objectFieldSeparator = 'comma',
    objectFieldSeparatorOptionalLinebreak = true,
    objectFieldSeparatorTrailingPunctuation = false,
    parameterDefaultValueSpacing = ' ',
    postMethodNameSpacing = '',
    postNewSpacing = ' ',
    // propertyQuotes = null,
    separatorForSingleObjectField = false,
    stringQuotes = 'double',
    typeBracketSpacing = '',
    unionSpacing = ' '
  } = context.options[0] || {};
  const {
    mode
  } = settings;

  /**
   * @param {import('@es-joy/jsdoccomment').JsdocTagWithInline} tag
   */
  const checkTypeFormats = tag => {
    const potentialType = tag.type;
    let parsedType;
    try {
      parsedType = mode === 'permissive' ? (0, _jsdoccomment.tryParse)(/** @type {string} */potentialType) : (0, _jsdoccomment.parse)(/** @type {string} */potentialType, mode);
    } catch {
      return;
    }
    const fix = () => {
      (0, _jsdocUtils.rewireByParsedType)(jsdoc, tag, parsedType, indent, typeBracketSpacing);
    };

    /** @type {string[]} */
    const errorMessages = [];
    if (typeBracketSpacing && (!tag.type.startsWith(typeBracketSpacing) || !tag.type.endsWith(typeBracketSpacing))) {
      errorMessages.push(`Must have initial and final "${typeBracketSpacing}" spacing`);
    } else if (!typeBracketSpacing && (/^\s/v.test(tag.type) || /\s$/v.test(tag.type))) {
      errorMessages.push('Must have no initial spacing');
    }

    // eslint-disable-next-line complexity -- Todo
    (0, _jsdoccomment.traverse)(parsedType, nde => {
      let errorMessage = '';

      /**
       * @param {Partial<import('jsdoc-type-pratt-parser').FunctionResult['meta']> & {
       *   postNewSpacing?: string,
       *   postMethodNameSpacing?: string
       * }} meta
       * @returns {Required<import('jsdoc-type-pratt-parser').FunctionResult['meta']> & {
       *   postNewSpacing?: string,
       *   postMethodNameSpacing?: string
       * }}
       */
      const conditionalAdds = meta => {
        const typNode =
        /**
         * @type {import('jsdoc-type-pratt-parser').FunctionResult|
         *   import('jsdoc-type-pratt-parser').CallSignatureResult|
         *   import('jsdoc-type-pratt-parser').ComputedMethodResult|
         *   import('jsdoc-type-pratt-parser').ConstructorSignatureResult|
         *   import('jsdoc-type-pratt-parser').MethodSignatureResult
         * }
         */
        nde;

        /**
         * @type {Required<import('jsdoc-type-pratt-parser').FunctionResult['meta']> & {
         *   postNewSpacing?: string,
         *   postMethodNameSpacing?: string
         * }}
         */
        const newMeta = {
          parameterSpacing: meta.parameterSpacing ?? typNode.meta?.parameterSpacing ?? ' ',
          postGenericSpacing: meta.postGenericSpacing ?? typNode.meta?.postGenericSpacing ?? '',
          postReturnMarkerSpacing: meta.postReturnMarkerSpacing ?? typNode.meta?.postReturnMarkerSpacing ?? ' ',
          preReturnMarkerSpacing: meta.preReturnMarkerSpacing ?? typNode.meta?.preReturnMarkerSpacing ?? '',
          typeParameterSpacing: meta.typeParameterSpacing ?? typNode.meta?.typeParameterSpacing ?? ' '
        };
        if (typNode.type === 'JsdocTypeConstructorSignature') {
          newMeta.postNewSpacing = meta.postNewSpacing;
        }
        if (typNode.type === 'JsdocTypeMethodSignature') {
          newMeta.postMethodNameSpacing = meta.postMethodNameSpacing ?? typNode.meta?.postMethodNameSpacing ?? '';
        }
        return newMeta;
      };
      switch (nde.type) {
        case 'JsdocTypeConstructorSignature':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').ConstructorSignatureResult} */nde;
            /* c8 ignore next -- Guard */
            if ((typeNode.meta?.postNewSpacing ?? ' ') !== postNewSpacing) {
              typeNode.meta =
              /**
               * @type {Required<import('jsdoc-type-pratt-parser').FunctionResult['meta']> & {
               *   postNewSpacing: string,
               * }}
               */
              conditionalAdds({
                postNewSpacing
              });
              errorMessage = `Post-\`new\` spacing should be "${postNewSpacing}"`;
              break;
            }
          }
        case 'JsdocTypeFunction':
          {
            const typeNode =
            /**
             * @type {import('jsdoc-type-pratt-parser').FunctionResult}
             */
            nde;
            if ('arrow' in typeNode && typeNode.arrow) {
              /* c8 ignore next -- Guard */
              if ((typeNode.meta?.postReturnMarkerSpacing ?? ' ') !== arrowFunctionPostReturnMarkerSpacing) {
                typeNode.meta =
                /**
                 * @type {Required<import('jsdoc-type-pratt-parser').FunctionResult['meta']> & {
                 *   postNewSpacing: string,
                 * }}
                 */
                conditionalAdds({
                  postReturnMarkerSpacing: arrowFunctionPostReturnMarkerSpacing,
                  /* c8 ignore next -- Guard */
                  preReturnMarkerSpacing: typeNode.meta?.preReturnMarkerSpacing ?? ' '
                });
                errorMessage = `Post-return-marker spacing should be "${arrowFunctionPostReturnMarkerSpacing}"`;
                break;
                /* c8 ignore next -- Guard */
              } else if ((typeNode.meta?.preReturnMarkerSpacing ?? ' ') !== arrowFunctionPreReturnMarkerSpacing) {
                typeNode.meta =
                /**
                 * @type {Required<import('jsdoc-type-pratt-parser').FunctionResult['meta']> & {
                 *   postNewSpacing: string,
                 * }}
                 */
                conditionalAdds({
                  /* c8 ignore next -- Guard */
                  postReturnMarkerSpacing: typeNode.meta?.postReturnMarkerSpacing ?? ' ',
                  preReturnMarkerSpacing: arrowFunctionPreReturnMarkerSpacing
                });
                errorMessage = `Pre-return-marker spacing should be "${arrowFunctionPreReturnMarkerSpacing}"`;
                break;
              }
              break;
            }
          }
        case 'JsdocTypeCallSignature':
        case 'JsdocTypeComputedMethod':
        case 'JsdocTypeMethodSignature':
          {
            const typeNode =
            /**
             * @type {import('jsdoc-type-pratt-parser').FunctionResult|
             *   import('jsdoc-type-pratt-parser').CallSignatureResult|
             *   import('jsdoc-type-pratt-parser').ComputedMethodResult|
             *   import('jsdoc-type-pratt-parser').ConstructorSignatureResult|
             *   import('jsdoc-type-pratt-parser').MethodSignatureResult
             * }
             */
            nde;
            if (typeNode.type === 'JsdocTypeMethodSignature' && (typeNode.meta?.postMethodNameSpacing ?? '') !== postMethodNameSpacing) {
              typeNode.meta = {
                quote: typeNode.meta.quote,
                ...conditionalAdds({
                  postMethodNameSpacing
                })
              };
              errorMessage = `Post-method-name spacing should be "${postMethodNameSpacing}"`;
              break;
            } else if (typeNode.type === 'JsdocTypeMethodSignature' && typeNode.meta.quote !== undefined && typeNode.meta.quote !== methodQuotes) {
              typeNode.meta = {
                ...conditionalAdds({
                  postMethodNameSpacing: typeNode.meta.postMethodNameSpacing ?? ''
                }),
                quote: methodQuotes
              };
              errorMessage = `Method quoting style should be "${methodQuotes}"`;
              break;
            }
            if ((typeNode.meta?.parameterSpacing ?? ' ') !== functionOrClassParameterSpacing) {
              typeNode.meta = conditionalAdds({
                parameterSpacing: functionOrClassParameterSpacing
              });
              errorMessage = `Parameter spacing should be "${functionOrClassParameterSpacing}"`;
            } else if ((typeNode.meta?.postGenericSpacing ?? '') !== functionOrClassPostGenericSpacing) {
              typeNode.meta = conditionalAdds({
                postGenericSpacing: functionOrClassPostGenericSpacing
              });
              errorMessage = `Post-generic spacing should be "${functionOrClassPostGenericSpacing}"`;
            } else if ((typeNode.meta?.postReturnMarkerSpacing ?? ' ') !== functionOrClassPostReturnMarkerSpacing) {
              typeNode.meta = conditionalAdds({
                postReturnMarkerSpacing: functionOrClassPostReturnMarkerSpacing
              });
              errorMessage = `Post-return-marker spacing should be "${functionOrClassPostReturnMarkerSpacing}"`;
            } else if ((typeNode.meta?.preReturnMarkerSpacing ?? '') !== functionOrClassPreReturnMarkerSpacing) {
              typeNode.meta = conditionalAdds({
                preReturnMarkerSpacing: functionOrClassPreReturnMarkerSpacing
              });
              errorMessage = `Pre-return-marker spacing should be "${functionOrClassPreReturnMarkerSpacing}"`;
            } else if ((typeNode.meta?.typeParameterSpacing ?? ' ') !== functionOrClassTypeParameterSpacing) {
              typeNode.meta = conditionalAdds({
                typeParameterSpacing: functionOrClassTypeParameterSpacing
              });
              errorMessage = `Type parameter spacing should be "${functionOrClassTypeParameterSpacing}"`;
            }
            break;
          }
        case 'JsdocTypeGeneric':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').GenericResult} */nde;
            if ('value' in typeNode.left && typeNode.left.value === 'Array') {
              if (typeNode.meta.brackets !== arrayBrackets) {
                typeNode.meta.brackets = arrayBrackets;
                errorMessage = `Array bracket style should be ${arrayBrackets}`;
              }
            } else if (typeNode.meta.dot !== genericDot) {
              typeNode.meta.dot = genericDot;
              errorMessage = `Dot usage should be ${genericDot}`;
            } else if ((typeNode.meta.elementSpacing ?? ' ') !== genericAndTupleElementSpacing) {
              typeNode.meta.elementSpacing = genericAndTupleElementSpacing;
              errorMessage = `Element spacing should be "${genericAndTupleElementSpacing}"`;
            }
            break;
          }
        case 'JsdocTypeKeyValue':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').KeyValueResult} */nde;
            /* c8 ignore next -- Guard */
            if ((typeNode.meta?.postKeySpacing ?? '') !== keyValuePostKeySpacing) {
              typeNode.meta = {
                /* c8 ignore next -- Guard */
                postColonSpacing: typeNode.meta?.postColonSpacing ?? ' ',
                postKeySpacing: keyValuePostKeySpacing,
                /* c8 ignore next 2 -- Guard */
                postOptionalSpacing: typeNode.meta?.postOptionalSpacing ?? '',
                postVariadicSpacing: typeNode.meta?.postVariadicSpacing ?? ''
              };
              errorMessage = `Post key spacing should be "${keyValuePostKeySpacing}"`;
              /* c8 ignore next -- Guard */
            } else if ((typeNode.meta?.postColonSpacing ?? ' ') !== keyValuePostColonSpacing) {
              typeNode.meta = {
                postColonSpacing: keyValuePostColonSpacing,
                /* c8 ignore next 3 -- Guard */
                postKeySpacing: typeNode.meta?.postKeySpacing ?? '',
                postOptionalSpacing: typeNode.meta?.postOptionalSpacing ?? '',
                postVariadicSpacing: typeNode.meta?.postVariadicSpacing ?? ''
              };
              errorMessage = `Post colon spacing should be "${keyValuePostColonSpacing}"`;
              /* c8 ignore next -- Guard */
            } else if ((typeNode.meta?.postOptionalSpacing ?? '') !== keyValuePostOptionalSpacing) {
              typeNode.meta = {
                /* c8 ignore next 2 -- Guard */
                postColonSpacing: typeNode.meta?.postColonSpacing ?? ' ',
                postKeySpacing: typeNode.meta?.postKeySpacing ?? '',
                postOptionalSpacing: keyValuePostOptionalSpacing,
                /* c8 ignore next -- Guard */
                postVariadicSpacing: typeNode.meta?.postVariadicSpacing ?? ''
              };
              errorMessage = `Post optional (\`?\`) spacing should be "${keyValuePostOptionalSpacing}"`;
              /* c8 ignore next -- Guard */
            } else if (typeNode.variadic && (typeNode.meta?.postVariadicSpacing ?? '') !== keyValuePostVariadicSpacing) {
              typeNode.meta = {
                /* c8 ignore next 3 -- Guard */
                postColonSpacing: typeNode.meta?.postColonSpacing ?? ' ',
                postKeySpacing: typeNode.meta?.postKeySpacing ?? '',
                postOptionalSpacing: typeNode.meta?.postOptionalSpacing ?? '',
                postVariadicSpacing: keyValuePostVariadicSpacing
              };
              errorMessage = `Post variadic (\`...\`) spacing should be "${keyValuePostVariadicSpacing}"`;
            }
            break;
          }
        case 'JsdocTypeObject':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').ObjectResult} */nde;
            /* c8 ignore next -- Guard */
            const separator = typeNode.meta.separator ?? 'comma';
            if (separator !== objectFieldSeparator && (!objectFieldSeparatorOptionalLinebreak || !(objectFieldSeparator.endsWith('-linebreak') && objectFieldSeparator.startsWith(separator))) || (typeNode.meta.separatorForSingleObjectField ?? false) !== separatorForSingleObjectField || (typeNode.meta.propertyIndent ?? '') !== objectFieldIndent && separator.endsWith('-linebreak') || (typeNode.meta.trailingPunctuation ?? false) !== objectFieldSeparatorTrailingPunctuation) {
              typeNode.meta.separator = objectFieldSeparatorOptionalLinebreak && !separator.endsWith('and-linebreak') ? objectFieldSeparator.replace(/-and-linebreak$/v, '') : objectFieldSeparator;
              typeNode.meta.separatorForSingleObjectField = separatorForSingleObjectField;
              typeNode.meta.propertyIndent = objectFieldIndent;
              typeNode.meta.trailingPunctuation = objectFieldSeparatorTrailingPunctuation;
              errorMessage = `Inconsistent ${objectFieldSeparator} separator usage`;
            }
            break;
          }
        case 'JsdocTypeObjectField':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').ObjectFieldResult} */nde;
            if ((objectFieldQuote || typeof typeNode.key === 'string' && (/^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/v.test(typeNode.key) || digitRegex.test(typeNode.key))) && typeNode.meta.quote !== (objectFieldQuote ?? undefined) && (typeof typeNode.key !== 'string' || !digitRegex.test(typeNode.key))) {
              typeNode.meta.quote = objectFieldQuote ?? undefined;
              errorMessage = `Inconsistent object field quotes ${objectFieldQuote}`;
            } else if ((typeNode.meta?.postKeySpacing ?? '') !== keyValuePostKeySpacing) {
              typeNode.meta.postKeySpacing = keyValuePostKeySpacing;
              errorMessage = `Post key spacing should be "${keyValuePostKeySpacing}"`;
            } else if ((typeNode.meta?.postColonSpacing ?? ' ') !== keyValuePostColonSpacing) {
              typeNode.meta.postColonSpacing = keyValuePostColonSpacing;
              errorMessage = `Post colon spacing should be "${keyValuePostColonSpacing}"`;
            } else if ((typeNode.meta?.postOptionalSpacing ?? '') !== keyValuePostOptionalSpacing) {
              typeNode.meta.postOptionalSpacing = keyValuePostOptionalSpacing;
              errorMessage = `Post optional (\`?\`) spacing should be "${keyValuePostOptionalSpacing}"`;
            }
            break;
          }
        case 'JsdocTypeStringValue':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').StringValueResult} */nde;
            if (typeNode.meta.quote !== stringQuotes) {
              typeNode.meta.quote = stringQuotes;
              errorMessage = `Inconsistent ${stringQuotes} string quotes usage`;
            }
            break;
          }

        // Only suitable for namepaths (and would need changes); see https://github.com/gajus/eslint-plugin-jsdoc/issues/1524
        // case 'JsdocTypeProperty': {
        //   const typeNode = /** @type {import('jsdoc-type-pratt-parser').PropertyResult} */ (nde);

        //   if ((propertyQuotes ||
        //     (typeof typeNode.value === 'string' && !(/\s/v).test(typeNode.value))) &&
        //     typeNode.meta.quote !== (propertyQuotes ?? undefined)
        //   ) {
        //     typeNode.meta.quote = propertyQuotes ?? undefined;
        //     errorMessage = `Inconsistent ${propertyQuotes} property quotes usage`;
        //   }

        //   break;
        // }

        case 'JsdocTypeTuple':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').TupleResult} */nde;
            /* c8 ignore next -- Guard */
            if ((typeNode.meta?.elementSpacing ?? ' ') !== genericAndTupleElementSpacing) {
              typeNode.meta = {
                elementSpacing: genericAndTupleElementSpacing
              };
              errorMessage = `Element spacing should be "${genericAndTupleElementSpacing}"`;
            }
            break;
          }
        case 'JsdocTypeTypeParameter':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').TypeParameterResult} */nde;
            /* c8 ignore next -- Guard */
            if (typeNode.defaultValue && (typeNode.meta?.defaultValueSpacing ?? ' ') !== parameterDefaultValueSpacing) {
              typeNode.meta = {
                defaultValueSpacing: parameterDefaultValueSpacing
              };
              errorMessage = `Default value spacing should be "${parameterDefaultValueSpacing}"`;
            }
            break;
          }
        case 'JsdocTypeUnion':
          {
            const typeNode = /** @type {import('jsdoc-type-pratt-parser').UnionResult} */nde;
            /* c8 ignore next -- Guard */
            if ((typeNode.meta?.spacing ?? ' ') !== unionSpacing) {
              typeNode.meta = {
                spacing: unionSpacing
              };
              errorMessage = `Inconsistent "${unionSpacing}" union spacing usage`;
            }
            break;
          }
        default:
          break;
      }
      if (errorMessage) {
        errorMessages.push(errorMessage);
      }
    });
    const differentResult = tag.type !== typeBracketSpacing + (0, _jsdoccomment.stringify)(parsedType) + typeBracketSpacing;
    if (errorMessages.length && differentResult) {
      for (const errorMessage of errorMessages) {
        utils.reportJSDoc(errorMessage, tag, enableFixer ? fix : null);
      }
      // Stringification may have been equal previously (and thus no error reported)
      //   because the stringification doesn't preserve everything
    } else if (differentResult) {
      utils.reportJSDoc('There was an error with type formatting', tag, enableFixer ? fix : null);
    }
  };
  const tags = utils.getPresentTags(['param', 'property', 'returns', 'this', 'throws', 'type', 'typedef', 'yields']);
  for (const tag of tags) {
    if (tag.type) {
      checkTypeFormats(tag);
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Formats JSDoc type values.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/type-formatting.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      additionalProperties: false,
      properties: {
        arrayBrackets: {
          description: 'Determines how array generics are represented. Set to `angle` for the style `Array<type>` or `square` for the style `type[]`. Defaults to "square".',
          enum: ['angle', 'square'],
          type: 'string'
        },
        arrowFunctionPostReturnMarkerSpacing: {
          description: 'The space character (if any) to use after return markers (`=>`). Defaults to " ".',
          type: 'string'
        },
        arrowFunctionPreReturnMarkerSpacing: {
          description: 'The space character (if any) to use before return markers (`=>`). Defaults to " ".',
          type: 'string'
        },
        enableFixer: {
          description: 'Whether to enable the fixer. Defaults to `true`.',
          type: 'boolean'
        },
        functionOrClassParameterSpacing: {
          description: 'The space character (if any) to use between function or class parameters. Defaults to " ".',
          type: 'string'
        },
        functionOrClassPostGenericSpacing: {
          description: 'The space character (if any) to use after a generic expression in a function or class. Defaults to "".',
          type: 'string'
        },
        functionOrClassPostReturnMarkerSpacing: {
          description: 'The space character (if any) to use after return markers (`:`). Defaults to "".',
          type: 'string'
        },
        functionOrClassPreReturnMarkerSpacing: {
          description: 'The space character (if any) to use before return markers (`:`). Defaults to "".',
          type: 'string'
        },
        functionOrClassTypeParameterSpacing: {
          description: 'The space character (if any) to use between type parameters in a function or class. Defaults to " ".',
          type: 'string'
        },
        genericAndTupleElementSpacing: {
          description: 'The space character (if any) to use between elements in generics and tuples. Defaults to " ".',
          type: 'string'
        },
        genericDot: {
          description: 'Boolean value of whether to use a dot before the angled brackets of a generic (e.g., `SomeType.<AnotherType>`). Defaults to `false`.',
          type: 'boolean'
        },
        keyValuePostColonSpacing: {
          description: 'The amount of spacing (if any) after the colon of a key-value or object-field pair. Defaults to " ".',
          type: 'string'
        },
        keyValuePostKeySpacing: {
          description: 'The amount of spacing (if any) immediately after keys in a key-value or object-field pair. Defaults to "".',
          type: 'string'
        },
        keyValuePostOptionalSpacing: {
          description: 'The amount of spacing (if any) after the optional operator (`?`) in a key-value or object-field pair. Defaults to "".',
          type: 'string'
        },
        keyValuePostVariadicSpacing: {
          description: 'The amount of spacing (if any) after a variadic operator (`...`) in a key-value pair. Defaults to "".',
          type: 'string'
        },
        methodQuotes: {
          description: 'The style of quotation mark for surrounding method names when quoted. Defaults to `double`',
          enum: ['double', 'single'],
          type: 'string'
        },
        objectFieldIndent: {
          description: `A string indicating the whitespace to be added on each line preceding an
object property-value field. Defaults to the empty string.`,
          type: 'string'
        },
        objectFieldQuote: {
          description: `Whether and how object field properties should be quoted (e.g., \`{"a": string}\`).
Set to \`single\`, \`double\`, or \`null\`. Defaults to \`null\` (no quotes unless
required due to special characters within the field). Digits will be kept as is,
regardless of setting (they can either represent a digit or a string digit).`,
          enum: ['double', 'single', null]
        },
        objectFieldSeparator: {
          description: `For object properties, specify whether a "semicolon", "comma", "linebreak",
"semicolon-and-linebreak", or "comma-and-linebreak" should be used after
each object property-value pair.

Defaults to \`"comma"\`.`,
          enum: ['comma', 'comma-and-linebreak', 'linebreak', 'semicolon', 'semicolon-and-linebreak'],
          type: 'string'
        },
        objectFieldSeparatorOptionalLinebreak: {
          description: `Whether \`objectFieldSeparator\` set to \`"semicolon-and-linebreak"\` or
\`"comma-and-linebreak"\` should be allowed to optionally drop the linebreak.

Defaults to \`true\`.`,
          type: 'boolean'
        },
        objectFieldSeparatorTrailingPunctuation: {
          description: `If \`separatorForSingleObjectField\` is not in effect (i.e., if it is \`false\`
or there are multiple property-value object fields present), this property
will determine whether to add punctuation corresponding to the
\`objectFieldSeparator\` (e.g., a semicolon) to the final object field.
Defaults to \`false\`.`,
          type: 'boolean'
        },
        parameterDefaultValueSpacing: {
          description: 'The space character (if any) to use between the equal signs of a default value. Defaults to " ".',
          type: 'string'
        },
        postMethodNameSpacing: {
          description: 'The space character (if any) to add after a method name. Defaults to "".',
          type: 'string'
        },
        postNewSpacing: {
          description: 'The space character (if any) to add after "new" in a constructor. Defaults to " ".',
          type: 'string'
        },
        //           propertyQuotes: {
        //             description: `Whether and how namepath properties should be quoted (e.g., \`ab."cd"."ef"\`).
        // Set to \`single\`, \`double\`, or \`null\`. Defaults to \`null\` (no quotes unless
        // required due to whitespace within the property).`,
        //             enum: [
        //               'double',
        //               'single',
        //               null,
        //             ],
        //           },
        separatorForSingleObjectField: {
          description: `Whether to apply the \`objectFieldSeparator\` (e.g., a semicolon) when there
is only one property-value object field present. Defaults to \`false\`.`,
          type: 'boolean'
        },
        stringQuotes: {
          description: `How string literals should be quoted (e.g., \`"abc"\`). Set to \`single\`
or \`double\`. Defaults to 'double'.`,
          enum: ['double', 'single'],
          type: 'string'
        },
        typeBracketSpacing: {
          description: `A string of spaces that will be added immediately after the type's initial
curly bracket and immediately before its ending curly bracket. Defaults
to the empty string.`,
          type: 'string'
        },
        unionSpacing: {
          description: 'Determines the spacing to add to unions (`|`). Defaults to a single space (`" "`).',
          type: 'string'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=typeFormatting.cjs.map