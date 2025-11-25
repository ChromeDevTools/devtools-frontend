import iterateJsdoc, {
  parseComment,
} from '../iterateJsdoc.js';
import {
  commentParserToESTree,
  estreeToString,
  // getJSDocComment,
  parse as parseType,
  stringify,
  traverse,
  tryParse as tryParseType,
} from '@es-joy/jsdoccomment';
import {
  parseImportsExports,
} from 'parse-imports-exports';
import toValidIdentifier from 'to-valid-identifier';

export default iterateJsdoc(({
  context,
  indent,
  jsdoc,
  settings,
  sourceCode,
  utils,
}) => {
  const {
    mode,
  } = settings;

  const {
    enableFixer = true,
    exemptTypedefs = true,
    outputType = 'namespaced-import',
  } = context.options[0] || {};

  const allComments = sourceCode.getAllComments();
  const comments = allComments
    .filter((comment) => {
      return (/^\*(?!\*)/v).test(comment.value);
    })
    .map((commentNode) => {
      return commentParserToESTree(
        parseComment(commentNode, ''), mode === 'permissive' ? 'typescript' : mode,
      );
    });

  const typedefs = comments
    .flatMap((doc) => {
      return doc.tags.filter(({
        tag,
      }) => {
        return utils.isNameOrNamepathDefiningTag(tag);
      });
    });

  const imports = comments
    .flatMap((doc) => {
      return doc.tags.filter(({
        tag,
      }) => {
        return tag === 'import';
      });
    }).map((tag) => {
      // Causes problems with stringification otherwise
      tag.delimiter = '';
      return tag;
    });

  /**
   * @param {import('@es-joy/jsdoccomment').JsdocTagWithInline} tag
   */
  const iterateInlineImports = (tag) => {
    const potentialType = tag.type;
    let parsedType;
    try {
      parsedType = mode === 'permissive' ?
        tryParseType(/** @type {string} */ (potentialType)) :
        parseType(/** @type {string} */ (potentialType), mode);
    } catch {
      return;
    }

    traverse(parsedType, (nde, parentNode) => {
      // @ts-expect-error Adding our own property for use below
      nde.parentNode = parentNode;
    });

    traverse(parsedType, (nde) => {
      const {
        element,
        type,
      } = /** @type {import('jsdoc-type-pratt-parser').ImportResult} */ (nde);
      if (type !== 'JsdocTypeImport') {
        return;
      }

      let currentNode = nde;

      /** @type {string[]} */
      const pathSegments = [];

      /** @type {import('jsdoc-type-pratt-parser').NamePathResult[]} */
      const nodes = [];

      /** @type {string[]} */
      const extraPathSegments = [];

      /** @type {(import('jsdoc-type-pratt-parser').QuoteStyle|undefined)[]} */
      const quotes = [];

      const propertyOrBrackets = /** @type {import('jsdoc-type-pratt-parser').NamePathResult['pathType'][]} */ ([]);

      // @ts-expect-error Referencing our own property added above
      while (currentNode && currentNode.parentNode) {
        // @ts-expect-error Referencing our own property added above
        currentNode = currentNode.parentNode;
        /* c8 ignore next 3 -- Guard */
        if (currentNode.type !== 'JsdocTypeNamePath') {
          break;
        }

        pathSegments.unshift(
          currentNode.right.type === 'JsdocTypeIndexedAccessIndex' ?
            stringify(currentNode.right.right) :
            currentNode.right.value,
        );
        nodes.unshift(currentNode);
        propertyOrBrackets.unshift(currentNode.pathType);
        quotes.unshift(
          currentNode.right.type === 'JsdocTypeIndexedAccessIndex' ?
            undefined :
            currentNode.right.meta.quote,
        );
      }

      /**
       * @param {string} name
       * @param {string[]} extrPathSegments
       */
      const getFixer = (name, extrPathSegments) => {
        const matchingName = toValidIdentifier(name);
        return () => {
          /** @type {import('jsdoc-type-pratt-parser').NamePathResult|undefined} */
          let node = nodes.at(0);
          if (!node) {
            // Not really a NamePathResult, but will be converted later anyways
            node = /** @type {import('jsdoc-type-pratt-parser').NamePathResult} */ (
              /** @type {unknown} */
              (nde)
            );
          }

          const keys = /** @type {(keyof import('jsdoc-type-pratt-parser').NamePathResult)[]} */ (
            Object.keys(node)
          );

          for (const key of keys) {
            delete node[key];
          }

          if (extrPathSegments.length) {
            let newNode = /** @type {import('jsdoc-type-pratt-parser').NamePathResult} */ (
              /** @type {unknown} */
              (node)
            );
            while (extrPathSegments.length && newNode) {
              newNode.type = 'JsdocTypeNamePath';
              newNode.right = {
                meta: {
                  quote: quotes.shift(),
                },
                type: 'JsdocTypeProperty',
                value: /** @type {string} */ (extrPathSegments.shift()),
              };

              newNode.pathType = /** @type {import('jsdoc-type-pratt-parser').NamePathResult['pathType']} */ (
                propertyOrBrackets.shift()
              );
              // @ts-expect-error Temporary
              newNode.left = {};
              newNode = /** @type {import('jsdoc-type-pratt-parser').NamePathResult} */ (
                newNode.left
              );
            }

            const nameNode = /** @type {import('jsdoc-type-pratt-parser').NameResult} */ (
              /** @type {unknown} */
              (newNode)
            );
            nameNode.type = 'JsdocTypeName';
            nameNode.value = matchingName;
          } else {
            const newNode = /** @type {import('jsdoc-type-pratt-parser').NameResult} */ (
              /** @type {unknown} */
              (node)
            );
            newNode.type = 'JsdocTypeName';
            newNode.value = matchingName;
          }

          for (const src of tag.source) {
            if (src.tokens.type) {
              src.tokens.type = `{${stringify(parsedType)}}`;
              break;
            }
          }
        };
      };

      /** @type {string[]} */
      let unusedPathSegments = [];

      const findMatchingTypedef = () => {
        // Don't want typedefs to find themselves
        if (!exemptTypedefs) {
          return undefined;
        }

        const pthSegments = [
          ...pathSegments,
        ];
        return typedefs.find((typedef) => {
          let typedefNode = typedef.parsedType;
          let namepathMatch;
          while (typedefNode && typedefNode.type === 'JsdocTypeNamePath') {
            const pathSegment = pthSegments.shift();
            if (!pathSegment) {
              namepathMatch = false;
              break;
            }

            if (
              (typedefNode.right.type === 'JsdocTypeIndexedAccessIndex' &&
                stringify(typedefNode.right.right) !== pathSegment) ||
              (typedefNode.right.type !== 'JsdocTypeIndexedAccessIndex' &&
                typedefNode.right.value !== pathSegment)
            ) {
              if (namepathMatch === true) {
                // It stopped matching, so stop
                break;
              }

              extraPathSegments.push(pathSegment);
              namepathMatch = false;
              continue;
            }

            namepathMatch = true;

            unusedPathSegments = pthSegments;

            typedefNode = typedefNode.left;
          }

          return namepathMatch &&
            // `import('eslint')` matches
            typedefNode &&
            typedefNode.type === 'JsdocTypeImport' &&
            typedefNode.element.value === element.value;
        });
      };

      // Check @typedef's first as should be longest match, allowing
      //   for shorter abbreviations
      const matchingTypedef = findMatchingTypedef();
      if (matchingTypedef) {
        utils.reportJSDoc(
          'Inline `import()` found; using `@typedef`',
          tag,
          enableFixer ? getFixer(matchingTypedef.name, [
            ...extraPathSegments,
            ...unusedPathSegments.slice(-1),
            ...unusedPathSegments.slice(0, -1),
          ]) : null,
        );
        return;
      }

      const findMatchingImport = () => {
        for (const imprt of imports) {
          const parsedImport = parseImportsExports(
            estreeToString(imprt).replace(/^\s*@/v, '').trim(),
          );

          const namedImportsModuleSpecifier = Object.keys(parsedImport.namedImports || {})[0];

          const namedImports = Object.values(parsedImport.namedImports || {})[0]?.[0];
          const namedImportNames = (namedImports && namedImports.names && Object.keys(namedImports.names)) ?? [];

          const namespaceImports = Object.values(parsedImport.namespaceImports || {})[0]?.[0];

          const namespaceImportsDefault = namespaceImports && namespaceImports.default;
          const namespaceImportsNamespace = namespaceImports && namespaceImports.namespace;
          const namespaceImportsModuleSpecifier = Object.keys(parsedImport.namespaceImports || {})[0];

          const lastPathSegment = pathSegments.at(-1);

          if (
            (namespaceImportsDefault &&
                namespaceImportsModuleSpecifier === element.value) ||
              (element.value === namedImportsModuleSpecifier && (
                (lastPathSegment && namedImportNames.includes(lastPathSegment)) ||
                lastPathSegment === 'default'
              )) ||
              (namespaceImportsNamespace &&
                namespaceImportsModuleSpecifier === element.value)
          ) {
            return {
              namedImportNames,
              namedImports,
              namedImportsModuleSpecifier,
              namespaceImports,
              namespaceImportsDefault,
              namespaceImportsModuleSpecifier,
              namespaceImportsNamespace,
            };
          }
        }

        return undefined;
      };

      const matchingImport = findMatchingImport();
      if (matchingImport) {
        const {
          namedImportNames,
          namedImports,
          namedImportsModuleSpecifier,
          namespaceImportsNamespace,
        } = matchingImport;
        if (!namedImportNames.length && namedImportsModuleSpecifier && namedImports.default) {
          utils.reportJSDoc(
            'Inline `import()` found; prefer `@import`',
            tag,
            enableFixer ? getFixer(namedImports.default, []) : null,
          );
          return;
        }

        const lastPthSegment = pathSegments.at(-1);
        if (lastPthSegment && namedImportNames.includes(lastPthSegment)) {
          utils.reportJSDoc(
            'Inline `import()` found; prefer `@import`',
            tag,
            enableFixer ? getFixer(lastPthSegment, pathSegments.slice(0, -1)) : null,
          );
          return;
        }

        if (namespaceImportsNamespace) {
          utils.reportJSDoc(
            'Inline `import()` found; prefer `@import`',
            tag,
            enableFixer ? getFixer(namespaceImportsNamespace, [
              ...pathSegments,
            ]) : null,
          );
          return;
        }
      }

      if (!pathSegments.length) {
        utils.reportJSDoc(
          'Inline `import()` found; prefer `@import`',
          tag,
          enableFixer ? (fixer) => {
            getFixer(element.value, [])();

            const programNode = sourceCode.ast;
            const commentNodes = sourceCode.getCommentsBefore(programNode);
            return fixer.insertTextBefore(
              // @ts-expect-error Ok
              commentNodes[0] ?? programNode,
              `/** @import * as ${toValidIdentifier(element.value)} from '${element.value}'; */${
                commentNodes[0] ? '\n' + indent : ''
              }`,
            );
          } : null,
        );
        return;
      }

      const lstPathSegment = pathSegments.at(-1);
      if (lstPathSegment && lstPathSegment === 'default') {
        utils.reportJSDoc(
          'Inline `import()` found; prefer `@import`',
          tag,
          enableFixer ? (fixer) => {
            getFixer(element.value, [])();

            const programNode = sourceCode.ast;
            const commentNodes = sourceCode.getCommentsBefore(programNode);

            return fixer.insertTextBefore(
              // @ts-expect-error Ok
              commentNodes[0] ?? programNode,
              `/** @import ${element.value} from '${element.value}'; */${
                commentNodes[0] ? '\n' + indent : ''
              }`,
            );
          } : null,
        );
        return;
      }

      utils.reportJSDoc(
        'Inline `import()` found; prefer `@import`',
        tag,
        enableFixer ? (fixer) => {
          if (outputType === 'namespaced-import') {
            getFixer(element.value, [
              ...pathSegments,
            ])();
          } else {
            getFixer(
              /** @type {string} */ (pathSegments.at(-1)),
              pathSegments.slice(0, -1),
            )();
          }

          const programNode = sourceCode.ast;
          const commentNodes = sourceCode.getCommentsBefore(programNode);
          return fixer.insertTextBefore(
            // @ts-expect-error Ok
            commentNodes[0] ?? programNode,
            outputType === 'namespaced-import' ?
              `/** @import * as ${toValidIdentifier(element.value)} from '${element.value}'; */${
                commentNodes[0] ? '\n' + indent : ''
              }` :
              `/** @import { ${toValidIdentifier(
                /* c8 ignore next -- TS */
                pathSegments.at(-1) ?? '',
              )} } from '${element.value}'; */${
                commentNodes[0] ? '\n' + indent : ''
              }`,
          );
        } : null,
      );
    });
  };

  for (const tag of jsdoc.tags) {
    const mightHaveTypePosition = utils.tagMightHaveTypePosition(tag.tag);
    const hasTypePosition = mightHaveTypePosition === true && Boolean(tag.type);
    if (hasTypePosition && (!exemptTypedefs || !utils.isNameOrNamepathDefiningTag(tag.tag))) {
      iterateInlineImports(tag);
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Prefer `@import` tags to inline `import()` statements.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/prefer-import-tag.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          enableFixer: {
            description: 'Whether or not to enable the fixer to add `@import` tags.',
            type: 'boolean',
          },
          exemptTypedefs: {
            description: 'Whether to allow `import()` statements within `@typedef`',
            type: 'boolean',
          },

          // We might add `typedef` and `typedef-local-only`, but also raises
          //   question of how deep the generated typedef should be
          outputType: {
            description: 'What kind of `@import` to generate when no matching `@typedef` or `@import` is found',
            enum: [
              'named-import',
              'namespaced-import',
            ],
            type: 'string',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
