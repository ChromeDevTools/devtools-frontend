"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireWildcard(require("../iterateJsdoc.cjs"));
var _jsdoccomment = require("@es-joy/jsdoccomment");
var _parseImportsExports = require("parse-imports-exports");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const extraTypes = ['null', 'undefined', 'void', 'string', 'boolean', 'object', 'function', 'symbol', 'number', 'bigint', 'NaN', 'Infinity', 'any', '*', 'never', 'unknown', 'const', 'this', 'true', 'false', 'Array', 'Object', 'RegExp', 'Date', 'Function', 'Intl'];
const globalTypes = ['globalThis', 'global', 'window', 'self'];
const typescriptGlobals = [
// https://www.typescriptlang.org/docs/handbook/utility-types.html
'Awaited', 'Partial', 'Required', 'Readonly', 'Record', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable', 'Parameters', 'ConstructorParameters', 'ReturnType', 'InstanceType', 'ThisParameterType', 'OmitThisParameter', 'ThisType', 'Uppercase', 'Lowercase', 'Capitalize', 'Uncapitalize'];

/**
 * @param {string|false|undefined} [str]
 * @returns {undefined|string|false}
 */
const stripPseudoTypes = str => {
  return str && str.replace(/(?:\.|<>|\.<>|\[\])$/v, '');
};
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  node,
  report,
  settings,
  sourceCode,
  state,
  utils
}) => {
  /** @type {string[]} */
  const foundTypedefValues = [];
  const {
    scopeManager
  } = sourceCode;

  // When is this ever `null`?
  const globalScope = /** @type {import('eslint').Scope.Scope} */
  scopeManager.globalScope;
  const
  /**
   * @type {{
   *   checkUsedTypedefs: boolean
   *   definedTypes: string[],
   *   disableReporting: boolean,
   *   markVariablesAsUsed: boolean,
   * }}
   */
  {
    checkUsedTypedefs = false,
    definedTypes = [],
    disableReporting = false,
    markVariablesAsUsed = true
  } = context.options[0] || {};

  /** @type {(string|undefined)[]} */
  let definedPreferredTypes = [];
  const {
    mode,
    preferredTypes,
    structuredTags
  } = settings;
  if (Object.keys(preferredTypes).length) {
    definedPreferredTypes = /** @type {string[]} */Object.values(preferredTypes).map(preferredType => {
      if (typeof preferredType === 'string') {
        // May become an empty string but will be filtered out below
        return stripPseudoTypes(preferredType);
      }
      if (!preferredType) {
        return undefined;
      }
      if (typeof preferredType !== 'object') {
        utils.reportSettings('Invalid `settings.jsdoc.preferredTypes`. Values must be falsy, a string, or an object.');
      }
      return stripPseudoTypes(preferredType.replacement);
    }).filter(Boolean);
  }
  const allComments = sourceCode.getAllComments();
  const comments = allComments.filter(comment => {
    return /^\*(?!\*)/v.test(comment.value);
  }).map(commentNode => {
    return (0, _iterateJsdoc.parseComment)(commentNode, '');
  });
  const globals = allComments.filter(comment => {
    return /^\s*globals/v.test(comment.value);
  }).flatMap(commentNode => {
    return commentNode.value.replace(/^\s*globals/v, '').trim().split(/,\s*/v);
  }).concat(Object.keys(context.languageOptions.globals ?? []));
  const typedefs = comments.flatMap(doc => {
    return doc.tags.filter(({
      tag
    }) => {
      return utils.isNameOrNamepathDefiningTag(tag) && !['arg', 'argument', 'param', 'prop', 'property'].includes(tag);
    });
  });
  const typedefDeclarations = typedefs.map(tag => {
    return tag.name;
  });
  const importTags = settings.mode === 'typescript' ? (/** @type {string[]} */comments.flatMap(doc => {
    return doc.tags.filter(({
      tag
    }) => {
      return tag === 'import';
    });
  }).flatMap(tag => {
    const {
      description,
      name,
      type
    } = tag;
    const typePart = type ? `{${type}} ` : '';
    const imprt = 'import ' + (description ? `${typePart}${name} ${description}` : `${typePart}${name}`);
    const importsExports = (0, _parseImportsExports.parseImportsExports)(imprt.trim());
    const types = [];
    const namedImports = Object.values(importsExports.namedImports || {})[0]?.[0];
    if (namedImports) {
      if (namedImports.default) {
        types.push(namedImports.default);
      }
      if (namedImports.names) {
        types.push(...Object.keys(namedImports.names));
      }
    }
    const namespaceImports = Object.values(importsExports.namespaceImports || {})[0]?.[0];
    if (namespaceImports) {
      if (namespaceImports.namespace) {
        types.push(namespaceImports.namespace);
      }
      if (namespaceImports.default) {
        types.push(namespaceImports.default);
      }
    }
    return types;
  }).filter(Boolean)) : [];
  const ancestorNodes = [];
  let currentNode = node;
  // No need for Program node?
  while (currentNode?.parent) {
    ancestorNodes.push(currentNode);
    currentNode = currentNode.parent;
  }

  /**
   * @param {import('eslint').Rule.Node} ancestorNode
   * @returns {import('comment-parser').Spec[]}
   */
  const getTemplateTags = function (ancestorNode) {
    const commentNode = (0, _jsdoccomment.getJSDocComment)(sourceCode, ancestorNode, settings);
    if (!commentNode) {
      return [];
    }
    const jsdc = (0, _iterateJsdoc.parseComment)(commentNode, '');
    return jsdc.tags.filter(tag => {
      return tag.tag === 'template';
    });
  };

  // `currentScope` may be `null` or `Program`, so in such a case,
  //  we look to present tags instead
  const templateTags = ancestorNodes.length ? ancestorNodes.flatMap(ancestorNode => {
    return getTemplateTags(ancestorNode);
  }) : utils.getPresentTags(['template']);
  const closureGenericTypes = templateTags.flatMap(tag => {
    return utils.parseClosureTemplateTag(tag);
  });

  // In modules, including Node, there is a global scope at top with the
  //  Program scope inside
  const cjsOrESMScope = globalScope.childScopes[0]?.block?.type === 'Program';

  /**
   * @param {import("eslint").Scope.Scope | null} scope
   * @returns {Set<string>}
   */
  const getValidRuntimeIdentifiers = scope => {
    const result = new Set();
    let scp = scope;
    while (scp) {
      for (const {
        name
      } of scp.variables) {
        result.add(name);
      }
      scp = scp.upper;
    }
    return result;
  };

  /**
   * We treat imports differently as we can't introspect their children.
   * @type {string[]}
   */
  const imports = [];
  const allDefinedTypes = new Set(globalScope.variables.map(({
    name
  }) => {
    return name;
  })

  // If the file is a module, concat the variables from the module scope.
  .concat(cjsOrESMScope ? globalScope.childScopes.flatMap(({
    variables
  }) => {
    return variables;
  }).flatMap(({
    identifiers,
    name
  }) => {
    const globalItem = /** @type {import('estree').Identifier & {parent: import('@typescript-eslint/types').TSESTree.Node}} */identifiers?.[0]?.parent;
    switch (globalItem?.type) {
      case 'ClassDeclaration':
        return [name, ...globalItem.body.body.map(item => {
          const property = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */(/** @type {import('@typescript-eslint/types').TSESTree.PropertyDefinition} */item?.key)?.name;
          /* c8 ignore next 3 -- Guard */
          if (!property) {
            return '';
          }
          return `${name}.${property}`;
        }).filter(Boolean)];
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
      case 'ImportSpecifier':
        imports.push(name);
        break;
      case 'TSInterfaceDeclaration':
        return [name, ...globalItem.body.body.map(item => {
          const property = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */(/** @type {import('@typescript-eslint/types').TSESTree.TSPropertySignature} */item?.key)?.name;
          /* c8 ignore next 3 -- Guard */
          if (!property) {
            return '';
          }
          return `${name}.${property}`;
        }).filter(Boolean)];
      case 'VariableDeclarator':
        if (/** @type {import('@typescript-eslint/types').TSESTree.Identifier} */(/** @type {import('@typescript-eslint/types').TSESTree.CallExpression} */globalItem?.init?.callee)?.name === 'require') {
          imports.push(/** @type {import('@typescript-eslint/types').TSESTree.Identifier} */globalItem.id.name);
          break;
        }

        // Module scope names are also defined
        return [name];
    }
    return [name];
    /* c8 ignore next */
  }) : []).concat(extraTypes).concat(typedefDeclarations).concat(importTags).concat(definedTypes).concat(/** @type {string[]} */definedPreferredTypes).concat((() => {
    // Other methods are not in scope, but we need them, and we grab them here
    if (node?.type === 'MethodDefinition') {
      return /** @type {import('estree').ClassBody} */node.parent.body.flatMap(methodOrProp => {
        if (methodOrProp.type === 'MethodDefinition') {
          // eslint-disable-next-line unicorn/no-lonely-if -- Pattern
          if (methodOrProp.key.type === 'Identifier') {
            return [methodOrProp.key.name, `${/** @type {import('estree').ClassDeclaration} */node.parent?.parent?.id?.name}.${methodOrProp.key.name}`];
          }
        }
        if (methodOrProp.type === 'PropertyDefinition') {
          // eslint-disable-next-line unicorn/no-lonely-if -- Pattern
          if (methodOrProp.key.type === 'Identifier') {
            return [methodOrProp.key.name, `${/** @type {import('estree').ClassDeclaration} */node.parent?.parent?.id?.name}.${methodOrProp.key.name}`];
          }
        }
        /* c8 ignore next 2 -- Not yet built */

        return '';
      }).filter(Boolean);
    }
    return [];
  })()).concat(...getValidRuntimeIdentifiers(node && (sourceCode.getScope && /* c8 ignore next 3 */
  sourceCode.getScope(node) ||
  // @ts-expect-error ESLint 8
  context.getScope()))).concat(settings.mode === 'jsdoc' ? [] : [...(settings.mode === 'typescript' ? typescriptGlobals : []), ...closureGenericTypes]));

  /**
   * @typedef {{
   *   parsedType: import('jsdoc-type-pratt-parser').RootResult;
   *   tag: import('comment-parser').Spec|import('@es-joy/jsdoccomment').JsdocInlineTagNoType & {
   *     line?: import('../iterateJsdoc.js').Integer
   *   }
   * }} TypeAndTagInfo
   */

  /**
   * @param {string} propertyName
   * @returns {(tag: (import('@es-joy/jsdoccomment').JsdocInlineTagNoType & {
   *     name?: string,
   *     type?: string,
   *     line?: import('../iterateJsdoc.js').Integer
   *   })|import('comment-parser').Spec & {
   *     namepathOrURL?: string
   *   }
   * ) => undefined|TypeAndTagInfo}
   */
  const tagToParsedType = propertyName => {
    return tag => {
      try {
        const potentialType = tag[(/** @type {"type"|"name"|"namepathOrURL"} */propertyName)];
        return {
          parsedType: mode === 'permissive' ? (0, _jsdoccomment.tryParse)(/** @type {string} */potentialType) : (0, _jsdoccomment.parse)(/** @type {string} */potentialType, mode),
          tag
        };
      } catch {
        return undefined;
      }
    };
  };
  const typeTags = utils.filterTags(({
    tag
  }) => {
    return tag !== 'import' && utils.tagMightHaveTypePosition(tag) && (tag !== 'suppress' || settings.mode !== 'closure');
  }).map(tagToParsedType('type'));
  const namepathReferencingTags = utils.filterTags(({
    tag
  }) => {
    return utils.isNamepathReferencingTag(tag);
  }).map(tagToParsedType('name'));
  const namepathOrUrlReferencingTags = utils.filterAllTags(({
    tag
  }) => {
    return utils.isNamepathOrUrlReferencingTag(tag);
  }).map(tagToParsedType('namepathOrURL'));
  const definedNamesAndNamepaths = new Set(utils.filterTags(({
    tag
  }) => {
    return utils.isNameOrNamepathDefiningTag(tag);
  }).map(({
    name
  }) => {
    return name;
  }));
  const tagsWithTypes = /** @type {TypeAndTagInfo[]} */[...typeTags, ...namepathReferencingTags, ...namepathOrUrlReferencingTags
  // Remove types which failed to parse
  ].filter(Boolean);
  for (const {
    parsedType,
    tag
  } of tagsWithTypes) {
    // eslint-disable-next-line complexity -- Refactor
    (0, _jsdoccomment.traverse)(parsedType, (nde, parentNode) => {
      /**
       * @type {import('jsdoc-type-pratt-parser').NameResult & {
       *   _parent?: import('jsdoc-type-pratt-parser').NonRootResult
       * }}
       */
      // eslint-disable-next-line canonical/id-match -- Avoid clashes
      nde._parent = parentNode;
      const {
        type,
        value
      } = /** @type {import('jsdoc-type-pratt-parser').NameResult} */nde;
      let val = value;

      /** @type {import('jsdoc-type-pratt-parser').NonRootResult|undefined} */
      let currNode = nde;
      do {
        currNode =
        /**
         * @type {import('jsdoc-type-pratt-parser').NameResult & {
         *   _parent?: import('jsdoc-type-pratt-parser').NonRootResult
         * }}
         */
        currNode._parent;
        if (
        // Avoid appending for imports and globals since we don't want to
        //  check their properties which may or may not exist
        !imports.includes(val) && !globals.includes(val) && !importTags.includes(val) && !extraTypes.includes(val) && !typedefDeclarations.includes(val) && !globalTypes.includes(val) && currNode && 'right' in currNode && currNode.right?.type === 'JsdocTypeProperty') {
          val = val + '.' + currNode.right.value;
        }
      } while (currNode?.type === 'JsdocTypeNamePath');
      if (type === 'JsdocTypeName') {
        const structuredTypes = structuredTags[tag.tag]?.type;
        if (!allDefinedTypes.has(val) && !definedNamesAndNamepaths.has(val) && (!Array.isArray(structuredTypes) || !structuredTypes.includes(val))) {
          const parent =
          /**
           * @type {import('jsdoc-type-pratt-parser').RootResult & {
           *   _parent?: import('jsdoc-type-pratt-parser').NonRootResult
           * }}
           */
          nde._parent;
          if (parent?.type === 'JsdocTypeTypeParameter') {
            return;
          }
          if (parent?.type === 'JsdocTypeFunction' && /** @type {import('jsdoc-type-pratt-parser').FunctionResult} */
          parent?.typeParameters?.some(typeParam => {
            return value === typeParam.name.value;
          })) {
            return;
          }
          if (!disableReporting) {
            report(`The type '${val}' is undefined.`, null, tag);
          }
        } else if (markVariablesAsUsed && !extraTypes.includes(val)) {
          if (sourceCode.markVariableAsUsed) {
            sourceCode.markVariableAsUsed(val);
            /* c8 ignore next 4 */
          } else {
            // @ts-expect-error ESLint 8
            context.markVariableAsUsed(val);
          }
        }
        if (checkUsedTypedefs && typedefDeclarations.includes(val)) {
          foundTypedefValues.push(val);
        }
      }
    });
  }
  state.foundTypedefValues = foundTypedefValues;
}, {
  // We use this method rather than checking at end of handler above because
  //   in that case, it is invoked too many times and would thus report errors
  //   too many times.
  exit({
    context,
    state,
    utils
  }) {
    const {
      checkUsedTypedefs = false
    } = context.options[0] || {};
    if (!checkUsedTypedefs) {
      return;
    }
    const allComments = context.sourceCode.getAllComments();
    const comments = allComments.filter(comment => {
      return /^\*(?!\*)/v.test(comment.value);
    }).map(commentNode => {
      return {
        doc: (0, _iterateJsdoc.parseComment)(commentNode, ''),
        loc: commentNode.loc
      };
    });
    const typedefs = comments.flatMap(({
      doc,
      loc
    }) => {
      const tags = doc.tags.filter(({
        tag
      }) => {
        return utils.isNameOrNamepathDefiningTag(tag);
      });
      if (!tags.length) {
        return [];
      }
      return {
        loc,
        tags
      };
    });
    for (const typedef of typedefs) {
      if (!state.foundTypedefValues.includes(typedef.tags[0].name)) {
        context.report({
          loc: (/** @type {import('@eslint/core').SourceLocation} */typedef.loc),
          message: 'This typedef was not used within the file'
        });
      }
    }
  },
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Besides some expected built-in types, prohibits any types not specified as globals or within `@typedef`.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/no-undefined-types.md#repos-sticky-header'
    },
    schema: [{
      additionalProperties: false,
      properties: {
        checkUsedTypedefs: {
          description: 'Whether to check typedefs for use within the file',
          type: 'boolean'
        },
        definedTypes: {
          description: `This array can be populated to indicate other types which
are automatically considered as defined (in addition to globals, etc.).
Defaults to an empty array.`,
          items: {
            type: 'string'
          },
          type: 'array'
        },
        disableReporting: {
          description: `Whether to disable reporting of errors. Defaults to
\`false\`. This may be set to \`true\` in order to take advantage of only
marking defined variables as used or checking used typedefs.`,
          type: 'boolean'
        },
        markVariablesAsUsed: {
          description: `Whether to mark variables as used for the purposes
of the \`no-unused-vars\` rule when they are not found to be undefined.
Defaults to \`true\`. May be set to \`false\` to enforce a practice of not
importing types unless used in code.`,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=noUndefinedTypes.cjs.map