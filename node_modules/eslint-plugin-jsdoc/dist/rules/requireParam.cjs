"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @typedef {[string, boolean, () => RootNamerReturn]} RootNamerReturn
 */

/**
 * @param {string[]} desiredRoots
 * @param {number} currentIndex
 * @returns {RootNamerReturn}
 */
const rootNamer = (desiredRoots, currentIndex) => {
  /** @type {string} */
  let name;
  let idx = currentIndex;
  const incremented = desiredRoots.length <= 1;
  if (incremented) {
    const base = desiredRoots[0];
    const suffix = idx++;
    name = `${base}${suffix}`;
  } else {
    name = /** @type {string} */desiredRoots.shift();
  }
  return [name, incremented, () => {
    return rootNamer(desiredRoots, idx);
  }];
};

/* eslint-disable complexity -- Temporary */
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  jsdoc,
  node,
  utils
}) => {
  /* eslint-enable complexity -- Temporary */
  if (utils.avoidDocs()) {
    return;
  }

  // Param type is specified by type in @type
  if (utils.hasTag('type')) {
    return;
  }
  const {
    autoIncrementBase = 0,
    checkDestructured = true,
    checkDestructuredRoots = true,
    checkRestProperty = false,
    checkTypesPattern = '/^(?:[oO]bject|[aA]rray|PlainObject|Generic(?:Object|Array))$/',
    enableFixer = true,
    enableRestElementFixer = true,
    enableRootFixer = true,
    ignoreWhenAllParamsMissing = false,
    interfaceExemptsParamsCheck = false,
    unnamedRootBase = ['root'],
    useDefaultObjectProperties = false
  } = context.options[0] || {};
  if (interfaceExemptsParamsCheck && node && node.parent?.type === 'VariableDeclarator' && 'typeAnnotation' in node.parent.id && node.parent.id.typeAnnotation) {
    return;
  }
  const preferredTagName = /** @type {string} */utils.getPreferredTagName({
    tagName: 'param'
  });
  if (!preferredTagName) {
    return;
  }
  const functionParameterNames = utils.getFunctionParameterNames(useDefaultObjectProperties, interfaceExemptsParamsCheck);
  if (!functionParameterNames.length) {
    return;
  }
  const jsdocParameterNames =
  /**
   * @type {{
   *   idx: import('../iterateJsdoc.js').Integer;
   *   name: string;
   *   type: string;
   * }[]}
   */
  utils.getJsdocTagsDeep(preferredTagName);
  if (ignoreWhenAllParamsMissing && !jsdocParameterNames.length) {
    return;
  }
  const shallowJsdocParameterNames = jsdocParameterNames.filter(tag => {
    return !tag.name.includes('.');
  }).map((tag, idx) => {
    return {
      ...tag,
      idx
    };
  });
  const checkTypesRegex = utils.getRegexFromString(checkTypesPattern);

  /**
   * @type {{
   *   functionParameterIdx: import('../iterateJsdoc.js').Integer,
   *   functionParameterName: string,
   *   inc: boolean|undefined,
   *   remove?: true,
   *   type?: string|undefined
   * }[]}
   */
  const missingTags = [];
  const flattenedRoots = utils.flattenRoots(functionParameterNames).names;

  /**
   * @type {{
   *   [key: string]: import('../iterateJsdoc.js').Integer
   * }}
   */
  const paramIndex = {};

  /**
   * @param {string} cur
   * @returns {boolean}
   */
  const hasParamIndex = cur => {
    return utils.dropPathSegmentQuotes(String(cur)) in paramIndex;
  };

  /**
   *
   * @param {string|number|undefined} cur
   * @returns {import('../iterateJsdoc.js').Integer}
   */
  const getParamIndex = cur => {
    return paramIndex[utils.dropPathSegmentQuotes(String(cur))];
  };

  /**
   *
   * @param {string} cur
   * @param {import('../iterateJsdoc.js').Integer} idx
   * @returns {void}
   */
  const setParamIndex = (cur, idx) => {
    paramIndex[utils.dropPathSegmentQuotes(String(cur))] = idx;
  };
  for (const [idx, cur] of flattenedRoots.entries()) {
    setParamIndex(cur, idx);
  }

  /**
   *
   * @param {(import('@es-joy/jsdoccomment').JsdocTagWithInline & {
   *   newAdd?: boolean
   * })[]} jsdocTags
   * @param {import('../iterateJsdoc.js').Integer} indexAtFunctionParams
   * @returns {{
   *   foundIndex: import('../iterateJsdoc.js').Integer,
   *   tagLineCount: import('../iterateJsdoc.js').Integer,
   * }}
   */
  const findExpectedIndex = (jsdocTags, indexAtFunctionParams) => {
    // Get the parameters that come after the current index in the flattened order
    const remainingFlattenedRoots = flattenedRoots.slice((indexAtFunctionParams || 0) + 1);

    // Find the first existing tag that comes after the current parameter in the flattened order
    const foundIndex = jsdocTags.findIndex(({
      name,
      newAdd
    }) => {
      if (newAdd) {
        return false;
      }

      // Check if the tag name matches any of the remaining flattened roots
      return remainingFlattenedRoots.some(flattenedRoot => {
        // The flattened roots don't have the root prefix (e.g., "bar", "bar.baz")
        // but JSDoc tags do (e.g., "root0", "root0.bar", "root0.bar.baz")
        // So we need to check if the tag name ends with the flattened root

        // Check if tag name ends with ".<flattenedRoot>"
        if (name.endsWith(`.${flattenedRoot}`)) {
          return true;
        }

        // Also check if tag name exactly matches the flattenedRoot
        //   (for single-level params)
        if (name === flattenedRoot) {
          return true;
        }
        return false;
      });
    });
    const tags = foundIndex > -1 ? jsdocTags.slice(0, foundIndex) : jsdocTags.filter(({
      tag
    }) => {
      return tag === preferredTagName;
    });
    let tagLineCount = 0;
    for (const {
      source
    } of tags) {
      for (const {
        tokens: {
          end
        }
      } of source) {
        if (!end) {
          tagLineCount++;
        }
      }
    }
    return {
      foundIndex,
      tagLineCount
    };
  };
  let [nextRootName, incremented, namer] = rootNamer([...unnamedRootBase], autoIncrementBase);
  const thisOffset = functionParameterNames[0] === 'this' ? 1 : 0;
  for (const [functionParameterIdx, functionParameterName] of functionParameterNames.entries()) {
    let inc;
    if (Array.isArray(functionParameterName)) {
      const matchedJsdoc = shallowJsdocParameterNames[functionParameterIdx - thisOffset];

      /** @type {string} */
      let rootName;
      if (functionParameterName[0]) {
        rootName = functionParameterName[0];
      } else if (matchedJsdoc && matchedJsdoc.name) {
        rootName = matchedJsdoc.name;
        if (matchedJsdoc.type && matchedJsdoc.type.search(checkTypesRegex) === -1) {
          continue;
        }
      } else {
        rootName = nextRootName;
        inc = incremented;
      }
      [nextRootName, incremented, namer] = namer();
      const {
        hasPropertyRest,
        hasRestElement,
        names,
        rests
      } =
      /**
       * @type {import('../jsdocUtils.js').FlattendRootInfo & {
       *   annotationParamName?: string | undefined;
       * }}
       */
      functionParameterName[1];
      const notCheckingNames = [];
      if (!enableRestElementFixer && hasRestElement) {
        continue;
      }
      if (!checkDestructuredRoots) {
        continue;
      }
      for (const [idx, paramName] of names.entries()) {
        // Add root if the root name is not in the docs (and is not already
        //  in the tags to be fixed)
        if (!jsdocParameterNames.find(({
          name
        }) => {
          return name === rootName;
        }) && !missingTags.find(({
          functionParameterName: fpn
        }) => {
          return fpn === rootName;
        })) {
          const emptyParamIdx = jsdocParameterNames.findIndex(({
            name
          }) => {
            return !name;
          });
          if (emptyParamIdx > -1) {
            missingTags.push({
              functionParameterIdx: emptyParamIdx,
              functionParameterName: rootName,
              inc,
              remove: true
            });
          } else {
            missingTags.push({
              functionParameterIdx: hasParamIndex(rootName) ? getParamIndex(rootName) : getParamIndex(paramName),
              functionParameterName: rootName,
              inc
            });
          }
        }
        if (!checkDestructured) {
          continue;
        }
        if (!checkRestProperty && rests[idx]) {
          continue;
        }
        const fullParamName = `${rootName}.${paramName}`;
        const notCheckingName = jsdocParameterNames.find(({
          name,
          type: paramType
        }) => {
          return utils.comparePaths(name)(fullParamName) && paramType.search(checkTypesRegex) === -1 && paramType !== '';
        });
        if (notCheckingName !== undefined) {
          notCheckingNames.push(notCheckingName.name);
        }
        if (notCheckingNames.find(name => {
          return fullParamName.startsWith(name);
        })) {
          continue;
        }
        if (jsdocParameterNames && !jsdocParameterNames.find(({
          name
        }) => {
          return utils.comparePaths(name)(fullParamName);
        })) {
          missingTags.push({
            functionParameterIdx: getParamIndex(functionParameterName[0] ? fullParamName : paramName),
            functionParameterName: fullParamName,
            inc,
            type: hasRestElement && !hasPropertyRest ? '{...any}' : undefined
          });
        }
      }
      continue;
    }

    /** @type {string} */
    let funcParamName;
    let type;
    if (typeof functionParameterName === 'object') {
      if (!enableRestElementFixer && functionParameterName.restElement) {
        continue;
      }
      funcParamName = /** @type {string} */functionParameterName.name;
      type = '{...any}';
    } else {
      funcParamName = /** @type {string} */functionParameterName;
    }
    if (jsdocParameterNames && !jsdocParameterNames.find(({
      name
    }) => {
      return name === funcParamName;
    }) && funcParamName !== 'this') {
      missingTags.push({
        functionParameterIdx: getParamIndex(funcParamName),
        functionParameterName: funcParamName,
        inc,
        type
      });
    }
  }

  /**
   *
   * @param {{
   *   functionParameterIdx: import('../iterateJsdoc.js').Integer,
   *   functionParameterName: string,
   *   remove?: true,
   *   inc?: boolean,
   *   type?: string
   * }} cfg
   */
  const fix = ({
    functionParameterIdx,
    functionParameterName,
    inc,
    remove,
    type
  }) => {
    if (inc && !enableRootFixer) {
      return;
    }

    /**
     *
     * @param {import('../iterateJsdoc.js').Integer} tagIndex
     * @param {import('../iterateJsdoc.js').Integer} sourceIndex
     * @param {import('../iterateJsdoc.js').Integer} spliceCount
     * @returns {void}
     */
    const createTokens = (tagIndex, sourceIndex, spliceCount) => {
      // console.log(sourceIndex, tagIndex, jsdoc.tags, jsdoc.source);
      const tokens = {
        number: sourceIndex + 1,
        source: '',
        tokens: {
          delimiter: '*',
          description: '',
          end: '',
          lineEnd: '',
          name: functionParameterName,
          newAdd: true,
          postDelimiter: ' ',
          postName: '',
          postTag: ' ',
          postType: type ? ' ' : '',
          start: jsdoc.source[sourceIndex].tokens.start,
          tag: `@${preferredTagName}`,
          type: type ?? ''
        }
      };

      /**
       * @type {(import('@es-joy/jsdoccomment').JsdocTagWithInline & {
       *   newAdd?: true
       * })[]}
       */
      jsdoc.tags.splice(tagIndex, spliceCount, {
        description: '',
        inlineTags: [],
        name: functionParameterName,
        newAdd: true,
        optional: false,
        problems: [],
        source: [tokens],
        tag: preferredTagName,
        type: type ?? ''
      });
      const firstNumber = jsdoc.source[0].number;
      jsdoc.source.splice(sourceIndex, spliceCount, tokens);
      for (const [idx, src] of jsdoc.source.slice(sourceIndex).entries()) {
        src.number = firstNumber + sourceIndex + idx;
      }
    };
    const offset = jsdoc.source.findIndex(({
      tokens: {
        end,
        tag
      }
    }) => {
      return tag || end;
    });
    if (remove) {
      createTokens(functionParameterIdx, offset + functionParameterIdx, 1);
    } else {
      const {
        foundIndex,
        tagLineCount: expectedIdx
      } = findExpectedIndex(jsdoc.tags, functionParameterIdx);
      const firstParamLine = jsdoc.source.findIndex(({
        tokens
      }) => {
        return tokens.tag === `@${preferredTagName}`;
      });
      const baseOffset = foundIndex > -1 || firstParamLine === -1 ? offset : firstParamLine;
      createTokens(expectedIdx, baseOffset + expectedIdx, 0);
    }
  };

  /**
   * @returns {void}
   */
  const fixer = () => {
    for (const missingTag of missingTags) {
      fix(missingTag);
    }
  };
  if (missingTags.length && jsdoc.source.length === 1) {
    utils.makeMultiline();
  }
  for (const {
    functionParameterName
  } of missingTags) {
    utils.reportJSDoc(`Missing JSDoc @${preferredTagName} "${functionParameterName}" declaration.`, null, enableFixer ? fixer : null);
  }
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'Requires that all function parameters are documented with a `@param` tag.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-param.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      additionalProperties: false,
      properties: {
        autoIncrementBase: {
          default: 0,
          description: `Numeric to indicate the number at which to begin auto-incrementing roots.
Defaults to \`0\`.`,
          type: 'integer'
        },
        checkConstructors: {
          default: true,
          description: `A value indicating whether \`constructor\`s should be checked. Defaults to
\`true\`.`,
          type: 'boolean'
        },
        checkDestructured: {
          default: true,
          description: 'Whether to require destructured properties. Defaults to `true`.',
          type: 'boolean'
        },
        checkDestructuredRoots: {
          default: true,
          description: `Whether to check the existence of a corresponding \`@param\` for root objects
of destructured properties (e.g., that for \`function ({a, b}) {}\`, that there
is something like \`@param myRootObj\` defined that can correspond to
the \`{a, b}\` object parameter).

If \`checkDestructuredRoots\` is \`false\`, \`checkDestructured\` will also be
implied to be \`false\` (i.e., the inside of the roots will not be checked
either, e.g., it will also not complain if \`a\` or \`b\` do not have their own
documentation). Defaults to \`true\`.`,
          type: 'boolean'
        },
        checkGetters: {
          default: false,
          description: 'A value indicating whether getters should be checked. Defaults to `false`.',
          type: 'boolean'
        },
        checkRestProperty: {
          default: false,
          description: `If set to \`true\`, will report (and add fixer insertions) for missing rest
properties. Defaults to \`false\`.

If set to \`true\`, note that you can still document the subproperties of the
rest property using other jsdoc features, e.g., \`@typedef\`:

\`\`\`js
/**
 * @typedef ExtraOptions
 * @property innerProp1
 * @property innerProp2
 */

/**
 * @param cfg
 * @param cfg.num
 * @param {ExtraOptions} extra
 */
function quux ({num, ...extra}) {
}
\`\`\`

Setting this option to \`false\` (the default) may be useful in cases where
you already have separate \`@param\` definitions for each of the properties
within the rest property.

For example, with the option disabled, this will not give an error despite
\`extra\` not having any definition:

\`\`\`js
/**
 * @param cfg
 * @param cfg.num
 */
function quux ({num, ...extra}) {
}
\`\`\`

Nor will this:

\`\`\`js
/**
 * @param cfg
 * @param cfg.num
 * @param cfg.innerProp1
 * @param cfg.innerProp2
 */
function quux ({num, ...extra}) {
}
\`\`\``,
          type: 'boolean'
        },
        checkSetters: {
          default: false,
          description: 'A value indicating whether setters should be checked. Defaults to `false`.',
          type: 'boolean'
        },
        checkTypesPattern: {
          description: `When one specifies a type, unless it is of a generic type, like \`object\`
or \`array\`, it may be considered unnecessary to have that object's
destructured components required, especially where generated docs will
link back to the specified type. For example:

\`\`\`js
/**
 * @param {SVGRect} bbox - a SVGRect
 */
export const bboxToObj = function ({x, y, width, height}) {
  return {x, y, width, height};
};
\`\`\`

By default \`checkTypesPattern\` is set to
\`/^(?:[oO]bject|[aA]rray|PlainObject|Generic(?:Object|Array))$/v\`,
meaning that destructuring will be required only if the type of the \`@param\`
(the text between curly brackets) is a match for "Object" or "Array" (with or
without initial caps), "PlainObject", or "GenericObject", "GenericArray" (or
if no type is present). So in the above example, the lack of a match will
mean that no complaint will be given about the undocumented destructured
parameters.

Note that the \`/\` delimiters are optional, but necessary to add flags.

Defaults to using (only) the \`v\` flag, so to add your own flags, encapsulate
your expression as a string, but like a literal, e.g., \`/^object$/vi\`.

You could set this regular expression to a more expansive list, or you
could restrict it such that even types matching those strings would not
need destructuring.`,
          type: 'string'
        },
        contexts: {
          description: `Set this to an array of strings representing the AST context (or an object with
optional \`context\` and \`comment\` properties) where you wish the rule to be applied.

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Overrides the default contexts (\`ArrowFunctionExpression\`, \`FunctionDeclaration\`,
\`FunctionExpression\`). May be useful for adding such as
\`TSMethodSignature\` in TypeScript or restricting the contexts
which are checked.

See the ["AST and Selectors"](../#advanced-ast-and-selectors)
section of our Advanced docs for more on the expected format.`,
          items: {
            anyOf: [{
              type: 'string'
            }, {
              additionalProperties: false,
              properties: {
                comment: {
                  type: 'string'
                },
                context: {
                  type: 'string'
                }
              },
              type: 'object'
            }]
          },
          type: 'array'
        },
        enableFixer: {
          description: 'Whether to enable the fixer. Defaults to `true`.',
          type: 'boolean'
        },
        enableRestElementFixer: {
          description: `Whether to enable the rest element fixer.

The fixer will automatically report/insert
[JSDoc repeatable parameters](https://jsdoc.app/tags-param.html#multiple-types-and-repeatable-parameters)
if missing.

\`\`\`js
/**
  * @param {GenericArray} cfg
  * @param {number} cfg."0"
 */
function baar ([a, ...extra]) {
  //
}
\`\`\`

...becomes:

\`\`\`js
/**
  * @param {GenericArray} cfg
  * @param {number} cfg."0"
  * @param {...any} cfg."1"
 */
function baar ([a, ...extra]) {
  //
}
\`\`\`

Note that the type \`any\` is included since we don't know of any specific
type to use.

Defaults to \`true\`.`,
          type: 'boolean'
        },
        enableRootFixer: {
          description: `Whether to enable the auto-adding of incrementing roots.

The default behavior of \`true\` is for "root" to be auto-inserted for missing
roots, followed by a 0-based auto-incrementing number.

So for:

\`\`\`js
function quux ({foo}, {bar}, {baz}) {
}
\`\`\`

...the default JSDoc that would be added if the fixer is enabled would be:

\`\`\`js
/**
* @param root0
* @param root0.foo
* @param root1
* @param root1.bar
* @param root2
* @param root2.baz
*/
\`\`\`

Has no effect if \`enableFixer\` is set to \`false\`.`,
          type: 'boolean'
        },
        exemptedBy: {
          description: `Array of tags (e.g., \`['type']\`) whose presence on the document block
avoids the need for a \`@param\`. Defaults to an array with
\`inheritdoc\`. If you set this array, it will overwrite the default,
so be sure to add back \`inheritdoc\` if you wish its presence to cause
exemption of the rule.`,
          items: {
            type: 'string'
          },
          type: 'array'
        },
        ignoreWhenAllParamsMissing: {
          description: `Set to \`true\` to ignore reporting when all params are missing. Defaults to
\`false\`.`,
          type: 'boolean'
        },
        interfaceExemptsParamsCheck: {
          description: `Set if you wish TypeScript interfaces to exempt checks for the existence of
\`@param\`'s.

Will check for a type defining the function itself (on a variable
declaration) or if there is a single destructured object with a type.
Defaults to \`false\`.`,
          type: 'boolean'
        },
        unnamedRootBase: {
          description: `An array of root names to use in the fixer when roots are missing. Defaults
to \`['root']\`. Note that only when all items in the array besides the last
are exhausted will auto-incrementing occur. So, with
\`unnamedRootBase: ['arg', 'config']\`, the following:

\`\`\`js
function quux ({foo}, [bar], {baz}) {
}
\`\`\`

...will get the following JSDoc block added:

\`\`\`js
/**
* @param arg
* @param arg.foo
* @param config0
* @param config0."0" (\`bar\`)
* @param config1
* @param config1.baz
*/
\`\`\``,
          items: {
            type: 'string'
          },
          type: 'array'
        },
        useDefaultObjectProperties: {
          description: `Set to \`true\` if you wish to expect documentation of properties on objects
supplied as default values. Defaults to \`false\`.`,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  },
  // We cannot cache comment nodes as the contexts may recur with the
  //  same comment node but a different JS node, and we may need the different
  //  JS node to ensure we iterate its context
  noTracking: true
});
module.exports = exports.default;
//# sourceMappingURL=requireParam.cjs.map