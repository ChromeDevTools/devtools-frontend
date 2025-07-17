import iterateJsdoc, {
  parseComment,
} from '../iterateJsdoc.js';
import {
  getJSDocComment,
  parse as parseType,
  traverse,
  tryParse as tryParseType,
} from '@es-joy/jsdoccomment';
import {
  parseImportsExports,
} from 'parse-imports-exports';

const extraTypes = [
  'null', 'undefined', 'void', 'string', 'boolean', 'object',
  'function', 'symbol',
  'number', 'bigint', 'NaN', 'Infinity',
  'any', '*', 'never', 'unknown', 'const',
  'this', 'true', 'false',
  'Array', 'Object', 'RegExp', 'Date', 'Function', 'Intl',
];

const typescriptGlobals = [
  // https://www.typescriptlang.org/docs/handbook/utility-types.html
  'Awaited',
  'Partial',
  'Required',
  'Readonly',
  'Record',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'Parameters',
  'ConstructorParameters',
  'ReturnType',
  'InstanceType',
  'ThisParameterType',
  'OmitThisParameter',
  'ThisType',
  'Uppercase',
  'Lowercase',
  'Capitalize',
  'Uncapitalize',
];

/**
 * @param {string|false|undefined} [str]
 * @returns {undefined|string|false}
 */
const stripPseudoTypes = (str) => {
  return str && str.replace(/(?:\.|<>|\.<>|\[\])$/u, '');
};

export default iterateJsdoc(({
  context,
  node,
  report,
  settings,
  sourceCode,
  utils,
}) => {
  const {
    scopeManager,
  } = sourceCode;

  // When is this ever `null`?
  const globalScope = /** @type {import('eslint').Scope.Scope} */ (
    scopeManager.globalScope
  );

  const
    /**
     * @type {{
     *   definedTypes: string[],
     *   disableReporting: boolean,
     *   markVariablesAsUsed: boolean
     * }}
     */ {
      definedTypes = [],
      disableReporting = false,
      markVariablesAsUsed = true,
    } = context.options[0] || {};

  /** @type {(string|undefined)[]} */
  let definedPreferredTypes = [];
  const {
    mode,
    preferredTypes,
    structuredTags,
  } = settings;
  if (Object.keys(preferredTypes).length) {
    definedPreferredTypes = /** @type {string[]} */ (Object.values(preferredTypes).map((preferredType) => {
      if (typeof preferredType === 'string') {
        // May become an empty string but will be filtered out below
        return stripPseudoTypes(preferredType);
      }

      if (!preferredType) {
        return undefined;
      }

      if (typeof preferredType !== 'object') {
        utils.reportSettings(
          'Invalid `settings.jsdoc.preferredTypes`. Values must be falsy, a string, or an object.',
        );
      }

      return stripPseudoTypes(preferredType.replacement);
    })
      .filter(Boolean));
  }

  const allComments = sourceCode.getAllComments();
  const comments = allComments
    .filter((comment) => {
      return (/^\*\s/u).test(comment.value);
    })
    .map((commentNode) => {
      return parseComment(commentNode, '');
    });

  const globals = allComments
    .filter((comment) => {
      return (/^\s*globals/u).test(comment.value);
    }).flatMap((commentNode) => {
      return commentNode.value.replace(/^\s*globals/u, '').trim().split(/,\s*/u);
    }).concat(Object.keys(context.languageOptions.globals ?? []));

  const typedefDeclarations = comments
    .flatMap((doc) => {
      return doc.tags.filter(({
        tag,
      }) => {
        return utils.isNamepathDefiningTag(tag);
      });
    })
    .map((tag) => {
      return tag.name;
    });

  const importTags = settings.mode === 'typescript' ? /** @type {string[]} */ (comments.flatMap((doc) => {
    return doc.tags.filter(({
      tag,
    }) => {
      return tag === 'import';
    });
  }).flatMap((tag) => {
    const {
      description,
      name,
      type,
    } = tag;
    const typePart = type ? `{${type}} ` : '';
    const imprt = 'import ' + (description ?
      `${typePart}${name} ${description}` :
      `${typePart}${name}`);

    const importsExports = parseImportsExports(imprt.trim());

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
    const commentNode = getJSDocComment(sourceCode, ancestorNode, settings);
    if (!commentNode) {
      return [];
    }

    const jsdoc = parseComment(commentNode, '');

    return jsdoc.tags.filter((tag) => {
      return tag.tag === 'template';
    });
  };

  // `currentScope` may be `null` or `Program`, so in such a case,
  //  we look to present tags instead
  const templateTags = ancestorNodes.length ?
    ancestorNodes.flatMap((ancestorNode) => {
      return getTemplateTags(ancestorNode);
    }) :
    utils.getPresentTags([
      'template',
    ]);

  const closureGenericTypes = templateTags.flatMap((tag) => {
    return utils.parseClosureTemplateTag(tag);
  });

  // In modules, including Node, there is a global scope at top with the
  //  Program scope inside
  const cjsOrESMScope = globalScope.childScopes[0]?.block?.type === 'Program';

  /**
   * @param {import("eslint").Scope.Scope | null} scope
   * @returns {Set<string>}
   */
  const getValidRuntimeIdentifiers = (scope) => {
    const result = new Set();

    let scp = scope;
    while (scp) {
      for (const {
        name,
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
    name,
  }) => {
    return name;
  })

    // If the file is a module, concat the variables from the module scope.
    .concat(
      cjsOrESMScope ?
        globalScope.childScopes.flatMap(({
          variables,
        }) => {
          return variables;
        }).flatMap(({
          identifiers,
          name,
        }) => {
          const globalItem = /** @type {import('estree').Identifier & {parent: import('@typescript-eslint/types').TSESTree.Node}} */ (
            identifiers?.[0]
          )?.parent;
          switch (globalItem?.type) {
            case 'ClassDeclaration':
              return [
                name,
                ...globalItem.body.body.map((item) => {
                  const property = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (
                    /** @type {import('@typescript-eslint/types').TSESTree.PropertyDefinition} */ (
                      item)?.key)?.name;
                  /* c8 ignore next 3 -- Guard */
                  if (!property) {
                    return '';
                  }

                  return `${name}.${property}`;
                }).filter(Boolean),
              ];
            case 'ImportDefaultSpecifier':
            case 'ImportNamespaceSpecifier':
            case 'ImportSpecifier':
              imports.push(name);
              break;
            case 'TSInterfaceDeclaration':
              return [
                name,
                ...globalItem.body.body.map((item) => {
                  const property = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (
                    /** @type {import('@typescript-eslint/types').TSESTree.TSPropertySignature} */ (
                      item)?.key)?.name;
                  /* c8 ignore next 3 -- Guard */
                  if (!property) {
                    return '';
                  }

                  return `${name}.${property}`;
                }).filter(Boolean),
              ];
            case 'VariableDeclarator':
              if (/** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (
                /** @type {import('@typescript-eslint/types').TSESTree.CallExpression} */ (
                  globalItem?.init
                )?.callee)?.name === 'require'
              ) {
                imports.push(/** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (
                  globalItem.id
                ).name);
                break;
              }

              return [];
          }

          return [
            name,
          ];
        /* c8 ignore next */
        }) : [],
    )
    .concat(extraTypes)
    .concat(typedefDeclarations)
    .concat(importTags)
    .concat(definedTypes)
    .concat(/** @type {string[]} */ (definedPreferredTypes))
    .concat((() => {
      // Other methods are not in scope, but we need them, and we grab them here
      if (node?.type === 'MethodDefinition') {
        return /** @type {import('estree').ClassBody} */ (node.parent).body.flatMap((methodOrProp) => {
          if (methodOrProp.type === 'MethodDefinition') {
            // eslint-disable-next-line unicorn/no-lonely-if -- Pattern
            if (methodOrProp.key.type === 'Identifier') {
              return [
                methodOrProp.key.name,
                `${/** @type {import('estree').ClassDeclaration} */ (
                  node.parent?.parent
                )?.id?.name}.${methodOrProp.key.name}`,
              ];
            }
          }

          if (methodOrProp.type === 'PropertyDefinition') {
            // eslint-disable-next-line unicorn/no-lonely-if -- Pattern
            if (methodOrProp.key.type === 'Identifier') {
              return [
                methodOrProp.key.name,
                `${/** @type {import('estree').ClassDeclaration} */ (
                  node.parent?.parent
                )?.id?.name}.${methodOrProp.key.name}`,
              ];
            }
          }
          /* c8 ignore next 2 -- Not yet built */

          return '';
        }).filter(Boolean);
      }

      return [];
    })())
    .concat(...getValidRuntimeIdentifiers(node && (
      (sourceCode.getScope &&
      /* c8 ignore next 2 */
      sourceCode.getScope(node)) ||
      context.getScope()
    )))
    .concat(
      settings.mode === 'jsdoc' ?
        [] :
        [
          ...settings.mode === 'typescript' ? typescriptGlobals : [],
          ...closureGenericTypes,
        ],
    ));

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
  const tagToParsedType = (propertyName) => {
    return (tag) => {
      try {
        const potentialType = tag[
          /** @type {"type"|"name"|"namepathOrURL"} */ (propertyName)
        ];
        return {
          parsedType: mode === 'permissive' ?
            tryParseType(/** @type {string} */ (potentialType)) :
            parseType(/** @type {string} */ (potentialType), mode),
          tag,
        };
      } catch {
        return undefined;
      }
    };
  };

  const typeTags = utils.filterTags(({
    tag,
  }) => {
    return tag !== 'import' && utils.tagMightHaveTypePosition(tag) && (tag !== 'suppress' || settings.mode !== 'closure');
  }).map(tagToParsedType('type'));

  const namepathReferencingTags = utils.filterTags(({
    tag,
  }) => {
    return utils.isNamepathReferencingTag(tag);
  }).map(tagToParsedType('name'));

  const namepathOrUrlReferencingTags = utils.filterAllTags(({
    tag,
  }) => {
    return utils.isNamepathOrUrlReferencingTag(tag);
  }).map(tagToParsedType('namepathOrURL'));

  const tagsWithTypes = /** @type {TypeAndTagInfo[]} */ ([
    ...typeTags,
    ...namepathReferencingTags,
    ...namepathOrUrlReferencingTags,
    // Remove types which failed to parse
  ].filter(Boolean));

  for (const {
    parsedType,
    tag,
  } of tagsWithTypes) {
    traverse(parsedType, (nde, parentNode) => {
      /**
       * @type {import('jsdoc-type-pratt-parser').NameResult & {
       *   _parent?: import('jsdoc-type-pratt-parser').NonRootResult
       * }}
       */
      // eslint-disable-next-line canonical/id-match -- Avoid clashes
      (nde)._parent = parentNode;
      const {
        type,
        value,
      } = /** @type {import('jsdoc-type-pratt-parser').NameResult} */ (nde);

      let val = value;

      /** @type {import('jsdoc-type-pratt-parser').NonRootResult|undefined} */
      let currNode = nde;
      do {
        currNode =
          /**
           * @type {import('jsdoc-type-pratt-parser').NameResult & {
           *   _parent?: import('jsdoc-type-pratt-parser').NonRootResult
           * }}
           */ (currNode)._parent;
        if (
          // Avoid appending for imports and globals since we don't want to
          //  check their properties which may or may not exist
          !imports.includes(val) && !globals.includes(val) &&
          !importTags.includes(val) &&
          !extraTypes.includes(val) &&
          !typedefDeclarations.includes(val) &&
          currNode && 'right' in currNode &&
          currNode.right?.type === 'JsdocTypeProperty') {
          val = val + '.' + currNode.right.value;
        }
      } while (currNode?.type === 'JsdocTypeNamePath');

      if (type === 'JsdocTypeName') {
        const structuredTypes = structuredTags[tag.tag]?.type;
        if (!allDefinedTypes.has(val) &&
          (!Array.isArray(structuredTypes) || !structuredTypes.includes(val))
        ) {
          if (!disableReporting) {
            report(`The type '${val}' is undefined.`, null, tag);
          }
        } else if (markVariablesAsUsed && !extraTypes.includes(val)) {
          if (sourceCode.markVariableAsUsed) {
            sourceCode.markVariableAsUsed(val);
          /* c8 ignore next 3 */
          } else {
            context.markVariableAsUsed(val);
          }
        }
      }
    });
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Checks that types in jsdoc comments are defined.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/no-undefined-types.md#repos-sticky-header',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          definedTypes: {
            items: {
              type: 'string',
            },
            type: 'array',
          },
          disableReporting: {
            type: 'boolean',
          },
          markVariablesAsUsed: {
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
