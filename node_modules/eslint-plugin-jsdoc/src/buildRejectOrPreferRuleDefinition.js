import iterateJsdoc from './iterateJsdoc.js';
import {
  parse,
  stringify,
  traverse,
  tryParse,
} from '@es-joy/jsdoccomment';

/**
 * Adjusts the parent type node `meta` for generic matches (or type node
 * `type` for `JsdocTypeAny`) and sets the type node `value`.
 * @param {string} type The actual type
 * @param {string} preferred The preferred type
 * @param {boolean} isGenericMatch
 * @param {string} typeNodeName
 * @param {import('jsdoc-type-pratt-parser').NonRootResult} node
 * @param {import('jsdoc-type-pratt-parser').NonRootResult|undefined} parentNode
 * @returns {void}
 */
const adjustNames = (type, preferred, isGenericMatch, typeNodeName, node, parentNode) => {
  let ret = preferred;
  if (isGenericMatch) {
    const parentMeta = /** @type {import('jsdoc-type-pratt-parser').GenericResult} */ (
      parentNode
    ).meta;
    if (preferred === '[]') {
      parentMeta.brackets = 'square';
      parentMeta.dot = false;
      ret = 'Array';
    } else {
      const dotBracketEnd = preferred.match(/\.(?:<>)?$/v);
      if (dotBracketEnd) {
        parentMeta.brackets = 'angle';
        parentMeta.dot = true;
        ret = preferred.slice(0, -dotBracketEnd[0].length);
      } else {
        const bracketEnd = preferred.endsWith('<>');
        if (bracketEnd) {
          parentMeta.brackets = 'angle';
          parentMeta.dot = false;
          ret = preferred.slice(0, -2);
        } else if (
          parentMeta?.brackets === 'square' &&
          (typeNodeName === '[]' || typeNodeName === 'Array')
        ) {
          parentMeta.brackets = 'angle';
          parentMeta.dot = false;
        }
      }
    }
  } else if (type === 'JsdocTypeAny') {
    node.type = 'JsdocTypeName';
  }

  /** @type {import('jsdoc-type-pratt-parser').NameResult} */ (
    node
  ).value = ret.replace(/(?:\.|<>|\.<>|\[\])$/v, '');

  // For bare pseudo-types like `<>`
  if (!ret) {
    /** @type {import('jsdoc-type-pratt-parser').NameResult} */ (
      node
    ).value = typeNodeName;
  }
};

/**
 * @param {boolean} [upperCase]
 * @returns {string}
 */
const getMessage = (upperCase) => {
  return 'Use object shorthand or index signatures instead of ' +
  '`' + (upperCase ? 'O' : 'o') + 'bject`, e.g., `{[key: string]: string}`';
};

/**
 * @type {{
 *   message: string,
 *   replacement: false
 * }}
 */
const info = {
  message: getMessage(),
  replacement: false,
};

/**
 * @type {{
 *   message: string,
 *   replacement: false
 * }}
 */
const infoUC = {
  message: getMessage(true),
  replacement: false,
};

/**
 * @param {{
 *   checkNativeTypes?: import('./rules/checkTypes.js').CheckNativeTypes|null
 *   overrideSettings?: import('./iterateJsdoc.js').Settings['preferredTypes']|null,
 *   description?: string,
 *   schema?: import('eslint').Rule.RuleMetaData['schema'],
 *   typeName?: string,
 *   url?: string,
 * }} cfg
 * @returns {import('eslint').Rule.RuleModule}
 */
export const buildRejectOrPreferRuleDefinition = ({
  checkNativeTypes = null,
  typeName,
  description = typeName ?? 'Reports types deemed invalid (customizable and with defaults, for preventing and/or recommending replacements).',
  overrideSettings = null,
  schema = [],
  url = 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/check-types.md#repos-sticky-header',
}) => {
  return iterateJsdoc(
    ({
      context,
      jsdocNode,
      report,
      settings,
      sourceCode,
      utils,
    }) => {
      const jsdocTagsWithPossibleType = utils.filterTags((tag) => {
        return Boolean(utils.tagMightHaveTypePosition(tag.tag));
      });

      const
        /**
         * @type {{
         *   preferredTypes: import('./iterateJsdoc.js').PreferredTypes,
         *   structuredTags: import('./iterateJsdoc.js').StructuredTags,
         *   mode: import('./jsdocUtils.js').ParserMode
         * }}
         */
        {
          mode,
          preferredTypes: preferredTypesOriginal,
          structuredTags,
        } = overrideSettings ? {
          mode: settings.mode,
          preferredTypes: overrideSettings,
          structuredTags: {},
        } : settings;

      const injectObjectPreferredTypes = !overrideSettings &&
        !('Object' in preferredTypesOriginal ||
        'object' in preferredTypesOriginal ||
        'object.<>' in preferredTypesOriginal ||
        'Object.<>' in preferredTypesOriginal ||
        'object<>' in preferredTypesOriginal);

      /** @type {import('./iterateJsdoc.js').PreferredTypes} */
      const typeToInject = mode === 'typescript' ?
        {
          Object: 'object',
          'object.<>': info,
          'Object.<>': infoUC,
          'object<>': info,
          'Object<>': infoUC,
        } :
        {
          Object: 'object',
          'object.<>': 'Object<>',
          'Object.<>': 'Object<>',
          'object<>': 'Object<>',
        };

      /** @type {import('./iterateJsdoc.js').PreferredTypes} */
      const preferredTypes = {
        ...injectObjectPreferredTypes ?
          typeToInject :
          {},
        ...preferredTypesOriginal,
      };

      const
        /**
         * @type {{
         *   noDefaults: boolean,
         *   unifyParentAndChildTypeChecks: boolean,
         *   exemptTagContexts: ({
         *     tag: string,
         *     types: true|string[]
         *   })[]
         * }}
         */ {
          exemptTagContexts = [],
          noDefaults,
          unifyParentAndChildTypeChecks,
        } = context.options[0] || {};

      /**
       * Gets information about the preferred type: whether there is a matching
       * preferred type, what the type is, and whether it is a match to a generic.
       * @param {string} _type Not currently in use
       * @param {string} typeNodeName
       * @param {import('jsdoc-type-pratt-parser').NonRootResult|undefined} parentNode
       * @param {string|undefined} property
       * @returns {[hasMatchingPreferredType: boolean, typeName: string, isGenericMatch: boolean]}
       */
      const getPreferredTypeInfo = (_type, typeNodeName, parentNode, property) => {
        let hasMatchingPreferredType = false;
        let isGenericMatch = false;
        let typName = typeNodeName;

        const isNameOfGeneric = parentNode !== undefined && parentNode.type === 'JsdocTypeGeneric' && property === 'left';

        const brackets = /** @type {import('jsdoc-type-pratt-parser').GenericResult} */ (
          parentNode
        )?.meta?.brackets;
        const dot = /** @type {import('jsdoc-type-pratt-parser').GenericResult} */ (
          parentNode
        )?.meta?.dot;

        if (brackets === 'angle') {
          const checkPostFixes = dot ? [
            '.', '.<>',
          ] : [
            '<>',
          ];
          isGenericMatch = checkPostFixes.some((checkPostFix) => {
            const preferredType = preferredTypes?.[typeNodeName + checkPostFix];

            // Does `unifyParentAndChildTypeChecks` need to be checked here?
            if (
              (unifyParentAndChildTypeChecks || isNameOfGeneric ||
                /* c8 ignore next 2 -- If checking `unifyParentAndChildTypeChecks` */
                (typeof preferredType === 'object' &&
                  preferredType?.unifyParentAndChildTypeChecks)
              ) &&
              preferredType !== undefined
            ) {
              typName += checkPostFix;

              return true;
            }

            return false;
          });
        }

        if (
          !isGenericMatch && property &&
          /** @type {import('jsdoc-type-pratt-parser').NonRootResult} */ (
            parentNode
          ).type === 'JsdocTypeGeneric'
        ) {
          const checkPostFixes = dot ? [
            '.', '.<>',
          ] : [
            brackets === 'angle' ? '<>' : '[]',
          ];

          isGenericMatch = checkPostFixes.some((checkPostFix) => {
            const preferredType = preferredTypes?.[checkPostFix];
            if (
              // Does `unifyParentAndChildTypeChecks` need to be checked here?
              (unifyParentAndChildTypeChecks || isNameOfGeneric ||
                /* c8 ignore next 2 -- If checking `unifyParentAndChildTypeChecks` */
                (typeof preferredType === 'object' &&
                preferredType?.unifyParentAndChildTypeChecks)) &&
                preferredType !== undefined
            ) {
              typName = checkPostFix;

              return true;
            }

            return false;
          });
        }

        const prefType = preferredTypes?.[typeNodeName];
        const directNameMatch = prefType !== undefined &&
          !Object.values(preferredTypes).includes(typeNodeName);
        const specificUnify = typeof prefType === 'object' &&
          prefType?.unifyParentAndChildTypeChecks;
        const unifiedSyntaxParentMatch = property && directNameMatch && (unifyParentAndChildTypeChecks || specificUnify);
        isGenericMatch = isGenericMatch || Boolean(unifiedSyntaxParentMatch);

        hasMatchingPreferredType = isGenericMatch ||
          directNameMatch && !property;

        return [
          hasMatchingPreferredType, typName, isGenericMatch,
        ];
      };

      /**
       * Collect invalid type info.
       * @param {string} type
       * @param {string} value
       * @param {string} tagName
       * @param {string} nameInTag
       * @param {number} idx
       * @param {string|undefined} property
       * @param {import('jsdoc-type-pratt-parser').NonRootResult} node
       * @param {import('jsdoc-type-pratt-parser').NonRootResult|undefined} parentNode
       * @param {(string|false|undefined)[][]} invalidTypes
       * @returns {void}
       */
      const getInvalidTypes = (type, value, tagName, nameInTag, idx, property, node, parentNode, invalidTypes) => {
        let typeNodeName = type === 'JsdocTypeAny' ? '*' : value;

        const [
          hasMatchingPreferredType,
          typName,
          isGenericMatch,
        ] = getPreferredTypeInfo(type, typeNodeName, parentNode, property);

        let preferred;
        let types;
        if (hasMatchingPreferredType) {
          const preferredSetting = preferredTypes[typName];
          typeNodeName = typName === '[]' ? typName : typeNodeName;

          if (!preferredSetting) {
            invalidTypes.push([
              typeNodeName,
            ]);
          } else if (typeof preferredSetting === 'string') {
            preferred = preferredSetting;
            invalidTypes.push([
              typeNodeName, preferred,
            ]);
          } else if (preferredSetting && typeof preferredSetting === 'object') {
            const nextItem = preferredSetting.skipRootChecking && jsdocTagsWithPossibleType[idx + 1];

            if (!nextItem || !nextItem.name.startsWith(`${nameInTag}.`)) {
              preferred = preferredSetting.replacement;
              invalidTypes.push([
                typeNodeName,
                preferred,
                preferredSetting.message,
              ]);
            }
          } else {
            utils.reportSettings(
              'Invalid `settings.jsdoc.preferredTypes`. Values must be falsy, a string, or an object.',
            );

            return;
          }
        } else if (Object.entries(structuredTags).some(([
          tag,
          {
            type: typs,
          },
        ]) => {
          types = typs;

          return tag === tagName &&
            Array.isArray(types) &&
            !types.includes(typeNodeName);
        })) {
          invalidTypes.push([
            typeNodeName, types,
          ]);
        } else if (checkNativeTypes && !noDefaults && type === 'JsdocTypeName') {
          preferred = checkNativeTypes(
            preferredTypes, typeNodeName, preferred, parentNode, invalidTypes,
          );
        }

        // For fixer
        if (preferred) {
          adjustNames(type, preferred, isGenericMatch, typeNodeName, node, parentNode);
        }
      };

      for (const [
        idx,
        jsdocTag,
      ] of jsdocTagsWithPossibleType.entries()) {
        /** @type {(string|false|undefined)[][]} */
        const invalidTypes = [];
        let typeAst;

        try {
          typeAst = mode === 'permissive' ? tryParse(jsdocTag.type) : parse(jsdocTag.type, mode);
        } catch {
          continue;
        }

        const {
          name: nameInTag,
          tag: tagName,
        } = jsdocTag;

        traverse(typeAst, (node, parentNode, property) => {
          const {
            type,
            value,
          } =
            /**
             * @type {import('jsdoc-type-pratt-parser').NameResult}
             */ (node);
          if (![
            'JsdocTypeAny', 'JsdocTypeName',
          ].includes(type)) {
            return;
          }

          getInvalidTypes(type, value, tagName, nameInTag, idx, property, node, parentNode, invalidTypes);
        });

        if (invalidTypes.length) {
          const fixedType = stringify(typeAst);

          /**
           * @type {import('eslint').Rule.ReportFixer}
           */
          const fix = (fixer) => {
            return fixer.replaceText(
              jsdocNode,
              sourceCode.getText(jsdocNode).replace(
                `{${jsdocTag.type}}`,
                `{${fixedType}}`,
              ),
            );
          };

          for (const [
            badType,
            preferredType = '',
            msg,
          ] of invalidTypes) {
            const tagValue = jsdocTag.name ? ` "${jsdocTag.name}"` : '';
            if (exemptTagContexts.some(({
              tag,
              types,
            }) => {
              return tag === tagName &&
                (types === true || types.includes(jsdocTag.type));
            })) {
              continue;
            }

            report(
              msg ||
                `Invalid JSDoc @${tagName}${tagValue} type "${badType}"` +
                (preferredType ? '; ' : '.') +
                (preferredType ? `prefer: ${JSON.stringify(preferredType)}.` : ''),
              preferredType ? fix : null,
              jsdocTag,
              msg ? {
                tagName,
                tagValue,
              } : undefined,
            );
          }
        }
      }
    },
    {
      iterateAllJsdocs: true,
      meta: {
        docs: {
          description,
          url,
        },
        ...(!overrideSettings || (Object.values(overrideSettings).some((os) => {
          return os && typeof os === 'object' ?
            /* c8 ignore next -- Ok */
            os.replacement :
            typeof os === 'string';
        })) ?
          {
            fixable: 'code',
          } :
          {}
        ),
        schema,
        type: 'suggestion',
      },
    },
  );
};
