import iterateJsdoc, {
  parseComment,
} from '../iterateJsdoc.js';
import {
  getTags,
} from '../jsdocUtils.js';
import {
  getJSDocComment,
  parse as parseType,
  traverse,
  tryParse as tryParseType,
} from '@es-joy/jsdoccomment';

export default iterateJsdoc(({
  jsdoc,
  node,
  report,
  settings,
  sourceCode,
  utils,
}) => {
  const {
    mode,
  } = settings;

  const templateTags = utils.getTags('template');

  const usedNames = new Set();
  /**
   * @param {string} potentialType
   */
  const checkForUsedTypes = (potentialType) => {
    let parsedType;
    try {
      parsedType = mode === 'permissive' ?
        tryParseType(/** @type {string} */ (potentialType)) :
        parseType(/** @type {string} */ (potentialType), mode);
    } catch {
      return;
    }

    traverse(parsedType, (nde) => {
      const {
        type,
        value,
      } = /** @type {import('jsdoc-type-pratt-parser').NameResult} */ (nde);
      if (type === 'JsdocTypeName') {
        usedNames.add(value);
      }
    });
  };

  const checkParamsAndReturnsTags = (jsdc = jsdoc) => {
    const paramName = /** @type {string} */ (utils.getPreferredTagName({
      tagName: 'param',
    }));
    const paramTags = getTags(jsdc, paramName);
    for (const paramTag of paramTags) {
      checkForUsedTypes(paramTag.type);
    }

    const returnsName = /** @type {string} */ (utils.getPreferredTagName({
      tagName: 'returns',
    }));
    const returnsTags = getTags(jsdc, returnsName);
    for (const returnsTag of returnsTags) {
      checkForUsedTypes(returnsTag.type);
    }
  };

  const checkTemplateTags = () => {
    for (const tag of templateTags) {
      const {
        name,
      } = tag;
      const names = name.split(/,\s*/u);
      for (const nme of names) {
        if (!usedNames.has(nme)) {
          report(`@template ${nme} not in use`, null, tag);
        }
      }
    }
  };

  /**
   * @param {import('@typescript-eslint/types').TSESTree.FunctionDeclaration|
   *   import('@typescript-eslint/types').TSESTree.ClassDeclaration|
   *   import('@typescript-eslint/types').TSESTree.TSInterfaceDeclaration|
   *   import('@typescript-eslint/types').TSESTree.TSTypeAliasDeclaration} aliasDeclaration
   * @param {boolean} [checkParamsAndReturns]
   */
  const checkParameters = (aliasDeclaration, checkParamsAndReturns) => {
    /* c8 ignore next -- Guard */
    const {
      params,
    } = aliasDeclaration.typeParameters ?? {
      params: [],
    };
    for (const {
      name: {
        name,
      },
    } of params) {
      usedNames.add(name);
    }

    if (checkParamsAndReturns) {
      checkParamsAndReturnsTags();
    } else if (aliasDeclaration.type === 'ClassDeclaration') {
      /* c8 ignore next -- TS */
      for (const nde of aliasDeclaration?.body?.body ?? []) {
        // @ts-expect-error Should be ok
        const commentNode = getJSDocComment(sourceCode, nde, settings);
        if (!commentNode) {
          continue;
        }

        const innerJsdoc = parseComment(commentNode, '');
        checkParamsAndReturnsTags(innerJsdoc);

        const typeName = /** @type {string} */ (utils.getPreferredTagName({
          tagName: 'type',
        }));
        const typeTags = getTags(innerJsdoc, typeName);
        for (const typeTag of typeTags) {
          checkForUsedTypes(typeTag.type);
        }
      }
    }

    checkTemplateTags();
  };

  const handleTypeAliases = () => {
    const nde = /** @type {import('@typescript-eslint/types').TSESTree.Node} */ (
      node
    );
    if (!nde) {
      return;
    }

    switch (nde.type) {
      case 'ClassDeclaration':
      case 'TSInterfaceDeclaration':
      case 'TSTypeAliasDeclaration':
        checkParameters(nde);
        break;
      case 'ExportDefaultDeclaration':
      case 'ExportNamedDeclaration':
        switch (nde.declaration?.type) {
          case 'ClassDeclaration':
          case 'TSInterfaceDeclaration':
          case 'TSTypeAliasDeclaration':
            checkParameters(nde.declaration);
            break;
          case 'FunctionDeclaration':
            checkParameters(nde.declaration, true);
            break;
        }

        break;
      case 'FunctionDeclaration':
        checkParameters(nde, true);
        break;
    }
  };

  const callbackTags = utils.getTags('callback');
  const functionTags = utils.getTags('function');
  if (callbackTags.length || functionTags.length) {
    checkParamsAndReturnsTags();
    checkTemplateTags();
    return;
  }

  const typedefTags = utils.getTags('typedef');
  if (!typedefTags.length || typedefTags.length >= 2) {
    handleTypeAliases();
    return;
  }

  const potentialTypedefType = typedefTags[0].type;
  checkForUsedTypes(potentialTypedefType);

  const propertyName = /** @type {string} */ (utils.getPreferredTagName({
    tagName: 'property',
  }));
  const propertyTags = utils.getTags(propertyName);
  for (const propertyTag of propertyTags) {
    checkForUsedTypes(propertyTag.type);
  }

  checkTemplateTags();
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Checks that any `@template` names are actually used in the connected `@typedef` or type alias.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/check-template-names.md#repos-sticky-header',
    },
    schema: [],
    type: 'suggestion',
  },
});
