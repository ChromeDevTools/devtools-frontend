"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @param {string} targetTagName
 * @param {boolean} allowExtraTrailingParamDocs
 * @param {boolean} checkDestructured
 * @param {boolean} checkRestProperty
 * @param {RegExp} checkTypesRegex
 * @param {boolean} disableExtraPropertyReporting
 * @param {boolean} disableMissingParamChecks
 * @param {boolean} enableFixer
 * @param {import('../jsdocUtils.js').ParamNameInfo[]} functionParameterNames
 * @param {import('comment-parser').Block} jsdoc
 * @param {import('../iterateJsdoc.js').Utils} utils
 * @param {import('../iterateJsdoc.js').Report} report
 * @returns {boolean}
 */
const validateParameterNames = (targetTagName, allowExtraTrailingParamDocs, checkDestructured, checkRestProperty, checkTypesRegex, disableExtraPropertyReporting, disableMissingParamChecks, enableFixer, functionParameterNames, jsdoc, utils, report) => {
  const paramTags = Object.entries(jsdoc.tags).filter(([, tag]) => {
    return tag.tag === targetTagName;
  });
  const paramTagsNonNested = paramTags.filter(([, tag]) => {
    return !tag.name.includes('.');
  });
  let dotted = 0;
  let thisOffset = 0;
  return paramTags.some(([, tag
  // eslint-disable-next-line complexity
  ], index) => {
    /** @type {import('../iterateJsdoc.js').Integer} */
    let tagsIndex;
    const dupeTagInfo = paramTags.find(([tgsIndex, tg], idx) => {
      tagsIndex = Number(tgsIndex);
      return tg.name === tag.name && idx !== index;
    });
    if (dupeTagInfo) {
      utils.reportJSDoc(`Duplicate @${targetTagName} "${tag.name}"`, dupeTagInfo[1], enableFixer ? () => {
        utils.removeTag(tagsIndex);
      } : null);
      return true;
    }
    if (tag.name.includes('.')) {
      dotted++;
      return false;
    }
    let functionParameterName = functionParameterNames[index - dotted + thisOffset];
    if (functionParameterName === 'this' && tag.name.trim() !== 'this') {
      ++thisOffset;
      functionParameterName = functionParameterNames[index - dotted + thisOffset];
    }
    if (!functionParameterName) {
      if (allowExtraTrailingParamDocs) {
        return false;
      }
      report(`@${targetTagName} "${tag.name}" does not match an existing function parameter.`, null, tag);
      return true;
    }
    if (typeof functionParameterName === 'object' && 'name' in functionParameterName && Array.isArray(functionParameterName.name)) {
      const actualName = tag.name.trim();
      const expectedName = functionParameterName.name[index];
      if (actualName === expectedName) {
        thisOffset--;
        return false;
      }
      report(`Expected @${targetTagName} name to be "${expectedName}". Got "${actualName}".`, null, tag);
      return true;
    }
    if (Array.isArray(functionParameterName)) {
      if (!checkDestructured) {
        return false;
      }
      if (tag.type && tag.type.search(checkTypesRegex) === -1) {
        return false;
      }
      const [parameterName, {
        annotationParamName,
        hasPropertyRest,
        names: properties,
        rests
      }] =
      /**
       * @type {[string | undefined, import('../jsdocUtils.js').FlattendRootInfo & {
       *   annotationParamName?: string | undefined;
        }]} */
      functionParameterName;
      if (annotationParamName !== undefined) {
        const name = tag.name.trim();
        if (name !== annotationParamName) {
          report(`@${targetTagName} "${name}" does not match parameter name "${annotationParamName}"`, null, tag);
        }
      }
      const tagName = parameterName === undefined ? tag.name.trim() : parameterName;
      const expectedNames = properties.map(name => {
        return `${tagName}.${name}`;
      });
      const actualNames = paramTags.map(([, paramTag]) => {
        return paramTag.name.trim();
      });
      const actualTypes = paramTags.map(([, paramTag]) => {
        return paramTag.type;
      });
      const missingProperties = [];

      /** @type {string[]} */
      const notCheckingNames = [];
      for (const [idx, name] of expectedNames.entries()) {
        if (notCheckingNames.some(notCheckingName => {
          return name.startsWith(notCheckingName);
        })) {
          continue;
        }
        const actualNameIdx = actualNames.findIndex(actualName => {
          return utils.comparePaths(name)(actualName);
        });
        if (actualNameIdx === -1) {
          if (!checkRestProperty && rests[idx]) {
            continue;
          }
          const missingIndex = actualNames.findIndex(actualName => {
            return utils.pathDoesNotBeginWith(name, actualName);
          });
          const line = tag.source[0].number - 1 + (missingIndex > -1 ? missingIndex : actualNames.length);
          missingProperties.push({
            name,
            tagPlacement: {
              line: line === 0 ? 1 : line
            }
          });
        } else if (actualTypes[actualNameIdx].search(checkTypesRegex) === -1 && actualTypes[actualNameIdx] !== '') {
          notCheckingNames.push(name);
        }
      }
      const hasMissing = missingProperties.length;
      if (hasMissing) {
        for (const {
          name: missingProperty,
          tagPlacement
        } of missingProperties) {
          report(`Missing @${targetTagName} "${missingProperty}"`, null, tagPlacement);
        }
      }
      if (!hasPropertyRest || checkRestProperty) {
        /** @type {[string, import('comment-parser').Spec][]} */
        const extraProperties = [];
        for (const [idx, name] of actualNames.entries()) {
          const match = name.startsWith(tag.name.trim() + '.');
          if (match && !expectedNames.some(utils.comparePaths(name)) && !utils.comparePaths(name)(tag.name) && (!disableExtraPropertyReporting || properties.some(prop => {
            return prop.split('.').length >= name.split('.').length - 1;
          }))) {
            extraProperties.push([name, paramTags[idx][1]]);
          }
        }
        if (extraProperties.length) {
          for (const [extraProperty, tg] of extraProperties) {
            report(`@${targetTagName} "${extraProperty}" does not exist on ${tag.name}`, null, tg);
          }
          return true;
        }
      }
      return hasMissing;
    }
    let funcParamName;
    if (typeof functionParameterName === 'object') {
      const {
        name
      } = functionParameterName;
      funcParamName = name;
    } else {
      funcParamName = functionParameterName;
    }
    if (funcParamName !== tag.name.trim()) {
      // Todo: Improve for array or object child items
      const actualNames = paramTagsNonNested.map(([, {
        name
      }]) => {
        return name.trim();
      });
      const expectedNames = functionParameterNames.map((item, idx) => {
        if (
        /**
         * @type {[string|undefined, (import('../jsdocUtils.js').FlattendRootInfo & {
         *   annotationParamName?: string,
          })]} */
        item?.[1]?.names) {
          return actualNames[idx];
        }
        return item;
      }).filter(item => {
        return item !== 'this';
      });

      // When disableMissingParamChecks is true tag names can be omitted.
      // Report when the tag names do not match the expected names or they are used out of order.
      if (disableMissingParamChecks) {
        const usedExpectedNames = expectedNames.map(a => {
          return a?.toString();
        }).filter(expectedName => {
          return expectedName && actualNames.includes(expectedName);
        });
        const usedInOrder = actualNames.every((actualName, idx) => {
          return actualName === usedExpectedNames[idx];
        });
        if (usedInOrder) {
          return false;
        }
      }
      report(`Expected @${targetTagName} names to be "${expectedNames.map(expectedName => {
        return typeof expectedName === 'object' && 'name' in expectedName && expectedName.restElement ? '...' + expectedName.name : expectedName;
      }).join(', ')}". Got "${actualNames.join(', ')}".`, null, tag);
      return true;
    }
    return false;
  });
};

/**
 * @param {string} targetTagName
 * @param {boolean} _allowExtraTrailingParamDocs
 * @param {{
 *   name: string,
 *   idx: import('../iterateJsdoc.js').Integer
 * }[]} jsdocParameterNames
 * @param {import('comment-parser').Block} jsdoc
 * @param {import('../iterateJsdoc.js').Report} report
 * @returns {boolean}
 */
const validateParameterNamesDeep = (targetTagName, _allowExtraTrailingParamDocs, jsdocParameterNames, jsdoc, report) => {
  /** @type {string} */
  let lastRealParameter;
  return jsdocParameterNames.some(({
    idx,
    name: jsdocParameterName
  }) => {
    const isPropertyPath = jsdocParameterName.includes('.');
    if (isPropertyPath) {
      if (!lastRealParameter) {
        report(`@${targetTagName} path declaration ("${jsdocParameterName}") appears before any real parameter.`, null, jsdoc.tags[idx]);
        return true;
      }
      let pathRootNodeName = jsdocParameterName.slice(0, jsdocParameterName.indexOf('.'));
      if (pathRootNodeName.endsWith('[]')) {
        pathRootNodeName = pathRootNodeName.slice(0, -2);
      }
      if (pathRootNodeName !== lastRealParameter) {
        report(`@${targetTagName} path declaration ("${jsdocParameterName}") root node name ("${pathRootNodeName}") ` + `does not match previous real parameter name ("${lastRealParameter}").`, null, jsdoc.tags[idx]);
        return true;
      }
    } else {
      lastRealParameter = jsdocParameterName;
    }
    return false;
  });
};
const allowedNodes = ['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression', 'TSDeclareFunction',
// Add this to above defaults
'TSMethodSignature'];
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  jsdoc,
  node,
  report,
  utils
}) => {
  const {
    allowExtraTrailingParamDocs,
    checkDestructured = true,
    checkRestProperty = false,
    checkTypesPattern = '/^(?:[oO]bject|[aA]rray|PlainObject|Generic(?:Object|Array))$/',
    disableExtraPropertyReporting = false,
    disableMissingParamChecks = false,
    enableFixer = false,
    useDefaultObjectProperties = false
  } = context.options[0] || {};

  // Although we might just remove global settings contexts from applying to
  //   this rule (as they can cause problems with `getFunctionParameterNames`
  //   checks if they are not functions but say variables), the user may
  //   instead wish to narrow contexts in those settings, so this check
  //   is still useful
  if (!allowedNodes.includes(/** @type {import('estree').Node} */node.type)) {
    return;
  }
  const checkTypesRegex = utils.getRegexFromString(checkTypesPattern);
  const jsdocParameterNamesDeep = utils.getJsdocTagsDeep('param');
  if (!jsdocParameterNamesDeep || !jsdocParameterNamesDeep.length) {
    return;
  }
  const functionParameterNames = utils.getFunctionParameterNames(useDefaultObjectProperties);
  const targetTagName = /** @type {string} */utils.getPreferredTagName({
    tagName: 'param'
  });
  const isError = validateParameterNames(targetTagName, allowExtraTrailingParamDocs, checkDestructured, checkRestProperty, checkTypesRegex, disableExtraPropertyReporting, disableMissingParamChecks, enableFixer, functionParameterNames, jsdoc, utils, report);
  if (isError || !checkDestructured) {
    return;
  }
  validateParameterNamesDeep(targetTagName, allowExtraTrailingParamDocs, jsdocParameterNamesDeep, jsdoc, report);
}, {
  contextDefaults: allowedNodes,
  meta: {
    docs: {
      description: 'Checks for dupe `@param` names, that nested param names have roots, and that parameter names in function declarations match JSDoc param names.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/check-param-names.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      additionalProperties: false,
      properties: {
        allowExtraTrailingParamDocs: {
          description: `If set to \`true\`, this option will allow extra \`@param\` definitions (e.g.,
representing future expected or virtual params) to be present without needing
their presence within the function signature. Other inconsistencies between
\`@param\`'s and present function parameters will still be reported.`,
          type: 'boolean'
        },
        checkDestructured: {
          description: 'Whether to check destructured properties. Defaults to `true`.',
          type: 'boolean'
        },
        checkRestProperty: {
          description: `If set to \`true\`, will require that rest properties are documented and
that any extraneous properties (which may have been within the rest property)
are documented. Defaults to \`false\`.`,
          type: 'boolean'
        },
        checkTypesPattern: {
          description: `Defines a regular expression pattern to indicate which types should be
checked for destructured content (and that those not matched should not
be checked).

When one specifies a type, unless it is of a generic type, like \`object\`
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
        disableExtraPropertyReporting: {
          description: `Whether to check for extra destructured properties. Defaults to \`false\`. Change
to \`true\` if you want to be able to document properties which are not actually
destructured. Keep as \`false\` if you expect properties to be documented in
their own types. Note that extra properties will always be reported if another
item at the same level is destructured as destructuring will prevent other
access and this option is only intended to permit documenting extra properties
that are available and actually used in the function.`,
          type: 'boolean'
        },
        disableMissingParamChecks: {
          description: 'Whether to avoid checks for missing `@param` definitions. Defaults to `false`. Change to `true` if you want to be able to omit properties.',
          type: 'boolean'
        },
        enableFixer: {
          description: `Set to \`true\` to auto-remove \`@param\` duplicates (based on identical
names).

Note that this option will remove duplicates of the same name even if
the definitions do not match in other ways (e.g., the second param will
be removed even if it has a different type or description).`,
          type: 'boolean'
        },
        useDefaultObjectProperties: {
          description: `Set to \`true\` if you wish to avoid reporting of child property documentation
where instead of destructuring, a whole plain object is supplied as default
value but you wish its keys to be considered as signalling that the properties
are present and can therefore be documented. Defaults to \`false\`.`,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=checkParamNames.cjs.map