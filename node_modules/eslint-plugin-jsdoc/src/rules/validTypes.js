import iterateJsdoc from '../iterateJsdoc.js';
import {
  parse,
  parseName,
  parseNamePath,
  traverse,
  tryParse,
} from '@es-joy/jsdoccomment';

const inlineTags = new Set([
  'link', 'linkcode', 'linkplain',
  'tutorial',
]);

const asExpression = /as\s+/v;

const suppressTypes = new Set([
  // https://github.com/google/closure-compiler/wiki/@suppress-annotations
  // https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/parsing/ParserConfig.properties#L154
  'accessControls',
  'checkDebuggerStatement',
  'checkEs5InheritanceCorrectnessConditions',
  'checkPrototypalTypes',
  'checkRegExp',
  'checkTypes',
  'checkVars',
  'closureClassChecks',
  'closureDepMethodUsageChecks',
  'const',
  'constantProperty',
  'dangerousUnrecognizedTypeError',
  'deprecated',
  'duplicate',
  'es5Strict',
  'externsValidation',
  'extraProvide',
  'extraRequire',
  'globalThis',
  'invalidCasts',
  'lateProvide',
  'legacyGoogScopeRequire',
  'lintChecks',
  'lintVarDeclarations',
  'messageConventions',
  'misplacedTypeAnnotation',
  'missingOverride',
  'missingPolyfill',
  'missingProperties',
  'missingProvide',
  'missingRequire',
  'missingReturn',
  'missingSourcesWarnings',
  'moduleLoad',
  'msgDescriptions',
  'nonStandardJsDocs',
  'partialAlias',
  'polymer',
  'reportUnknownTypes',
  'strictCheckTypes',
  'strictMissingProperties',
  'strictModuleDepCheck',
  'strictPrimitiveOperators',
  'suspiciousCode',

  // Not documented in enum
  'switch',
  'transitionalSuspiciousCodeWarnings',
  'undefinedNames',
  'undefinedVars',
  'underscore',
  'unknownDefines',
  'untranspilableFeatures',
  'unusedLocalVariables',

  // Not documented?
  'unusedPrivateMembers',
  'uselessCode',
  'useOfGoogProvide',
  'visibility',
  'with',
]);

/**
 * @param {string} path
 * @param {import('jsdoc-type-pratt-parser').ParseMode|"permissive"} mode
 * @returns {boolean}
 */
const tryParsePathIgnoreError = (path, mode) => {
  try {
    parseNamePath(path, mode === 'permissive' ? 'jsdoc' : mode, {
      includeSpecial: true,
    });

    return true;
  } catch {
    // Keep the original error for including the whole type
  }

  return false;
};

/**
 * @param {string} name
 * @param {import('jsdoc-type-pratt-parser').ParseMode} mode
 * @returns {boolean}
 */
const tryParseNameIgnoreError = (name, mode) => {
  try {
    parseName(name, mode);

    return true;
  } catch {
    // Keep the original error for including the whole type
  }

  return false;
};

export default iterateJsdoc(({
  context,
  jsdoc,
  report,
  settings,
  utils,
// eslint-disable-next-line complexity
}) => {
  const {
    allowEmptyNamepaths = false,
  } = context.options[0] || {};
  const {
    mode,
  } = settings;

  for (const tag of jsdoc.tags) {
    /**
     * @param {string} namepath
     * @param {string} [tagName]
     * @returns {boolean}
     */
    const validNamepathParsing = function (namepath, tagName) {
      if (
        tryParsePathIgnoreError(namepath, mode)
      ) {
        return true;
      }

      let handled = false;

      if (tagName) {
        switch (tagName) {
          case 'memberof':
          case 'memberof!': {
            const endChar = namepath.slice(-1);
            if ([
              '#', '.', '~',
            ].includes(endChar)) {
              handled = tryParsePathIgnoreError(namepath.slice(0, -1), mode);
            }

            break;
          }

          case 'module': case 'requires': {
            if (!namepath.startsWith('module:')) {
              handled = tryParsePathIgnoreError(`module:${namepath}`, mode);
            }

            break;
          }

          case 'borrows': {
            const startChar = namepath.charAt(0);
            if ([
              '#', '.', '~',
            ].includes(startChar)) {
              handled = tryParsePathIgnoreError(namepath.slice(1), mode);
            }
          }
        }
      }

      if (!handled) {
        report(`Syntax error in namepath: ${namepath}`, null, tag);

        return false;
      }

      return true;
    };

    /**
     * @param {string} type
     * @returns {boolean}
     */
    const validTypeParsing = function (type) {
      let parsedTypes;
      try {
        if (mode === 'permissive') {
          parsedTypes = tryParse(type, undefined, {
            classContext: true,
          });
        } else {
          parsedTypes = parse(type, mode, {
            classContext: true,
          });
        }
      } catch {
        report(`Syntax error in type: ${type}`, null, tag);

        return false;
      }

      if (mode === 'closure' || mode === 'typescript') {
        traverse(parsedTypes, (node) => {
          const {
            type: typ,
          } = node;

          if (
            (typ === 'JsdocTypeObjectField' || typ === 'JsdocTypeKeyValue') &&
            node.right?.type === 'JsdocTypeNullable' &&
            node.right?.meta?.position === 'suffix'
          ) {
            report(`Syntax error in type: ${node.right.type}`, null, tag);
          }
        });
      }

      return true;
    };

    if (tag.problems.length) {
      const msg = tag.problems.reduce((str, {
        message,
      }) => {
        return str + '; ' + message;
      }, '').slice(2);
      report(`Invalid name: ${msg}`, null, tag);
      continue;
    }

    if (tag.tag === 'import') {
      // A named import will look like a type, but not be valid; we also don't
      //  need to check the name/namepath
      continue;
    }

    if (tag.tag === 'borrows') {
      const thisNamepath = /** @type {string} */ (
        utils.getTagDescription(tag)
      ).replace(asExpression, '')
        .trim();

      if (!asExpression.test(/** @type {string} */ (
        utils.getTagDescription(tag)
      )) || !thisNamepath) {
        report(`@borrows must have an "as" expression. Found "${utils.getTagDescription(tag)}"`, null, tag);

        continue;
      }

      if (validNamepathParsing(thisNamepath, 'borrows')) {
        const thatNamepath = tag.name;

        validNamepathParsing(thatNamepath);
      }

      continue;
    }

    if (tag.tag === 'suppress' && mode === 'closure') {
      let parsedTypes;

      try {
        parsedTypes = tryParse(tag.type);
      } catch {
        // Ignore
      }

      if (parsedTypes) {
        traverse(parsedTypes, (node) => {
          let type;
          if ('value' in node && typeof node.value === 'string') {
            type = node.value;
          }

          if (type !== undefined && !suppressTypes.has(type)) {
            report(`Syntax error in suppress type: ${type}`, null, tag);
          }
        });
      }
    }

    const otherModeMaps = /** @type {import('../jsdocUtils.js').ParserMode[]} */ ([
      'jsdoc', 'typescript', 'closure', 'permissive',
    ]).filter(
      (mde) => {
        return mde !== mode;
      },
    ).map((mde) => {
      return utils.getTagStructureForMode(mde);
    });

    const tagMightHaveNamePosition = utils.tagMightHaveNamePosition(tag.tag, otherModeMaps);
    if (tagMightHaveNamePosition !== true && tag.name) {
      const modeInfo = tagMightHaveNamePosition === false ? '' : ` in "${mode}" mode`;
      report(`@${tag.tag} should not have a name${modeInfo}.`, null, tag);

      continue;
    }

    // Documentation like `@returns {@link SomeType}` is technically ambiguous. Specifically it
    // could either be intepreted as a type `"@link SomeType"` or a description `"{@link SomeType}"`.
    // However this is a good heuristic.
    if (tag.type.trim().startsWith('@')) {
      tag.description = `{${tag.type}} ${tag.description}`;
      tag.type = '';
    }

    const mightHaveTypePosition = utils.tagMightHaveTypePosition(tag.tag, otherModeMaps);
    if (mightHaveTypePosition !== true && tag.type) {
      const modeInfo = mightHaveTypePosition === false ? '' : ` in "${mode}" mode`;
      report(`@${tag.tag} should not have a bracketed type${modeInfo}.`, null, tag);

      continue;
    }

    // REQUIRED NAME
    const tagMustHaveNamePosition = utils.tagMustHaveNamePosition(tag.tag, otherModeMaps);

    // Don't handle `@param` here though it does require name as handled by
    //  `require-param-name` (`@property` would similarly seem to require one,
    //  but is handled by `require-property-name`)
    if (tagMustHaveNamePosition !== false && !tag.name && !allowEmptyNamepaths && ![
      'arg', 'argument', 'param',
      'prop', 'property',
    ].includes(tag.tag) &&
      (tag.tag !== 'see' || !utils.getTagDescription(tag).includes('{@link'))
    ) {
      const modeInfo = tagMustHaveNamePosition === true ? '' : ` in "${mode}" mode`;
      report(`Tag @${tag.tag} must have a name/namepath${modeInfo}.`, null, tag);

      continue;
    }

    // REQUIRED TYPE
    const mustHaveTypePosition = utils.tagMustHaveTypePosition(tag.tag, otherModeMaps);
    if (mustHaveTypePosition !== false && !tag.type &&
      // Auto-added to settings and has own rule already, so don't duplicate
      tag.tag !== 'next'
    ) {
      const modeInfo = mustHaveTypePosition === true ? '' : ` in "${mode}" mode`;
      report(`Tag @${tag.tag} must have a type${modeInfo}.`, null, tag);

      continue;
    }

    // REQUIRED TYPE OR NAME/NAMEPATH
    const tagMissingRequiredTypeOrNamepath = utils.tagMissingRequiredTypeOrNamepath(tag, otherModeMaps);
    if (tagMissingRequiredTypeOrNamepath !== false && !allowEmptyNamepaths) {
      const modeInfo = tagMissingRequiredTypeOrNamepath === true ? '' : ` in "${mode}" mode`;
      report(`Tag @${tag.tag} must have either a type or namepath${modeInfo}.`, null, tag);

      continue;
    }

    // VALID TYPE
    const hasTypePosition = mightHaveTypePosition === true && Boolean(tag.type);
    if (hasTypePosition && (tag.type !== 'const' || tag.tag !== 'type')) {
      validTypeParsing(tag.type);
    }

    // VALID NAME/NAMEPATH
    const hasNamepathPosition = (
      tagMustHaveNamePosition !== false ||
      utils.tagMightHaveNamepath(tag.tag)
    ) && Boolean(tag.name);

    if (hasNamepathPosition) {
      if (mode !== 'jsdoc' && tag.tag === 'template') {
        if (!tryParsePathIgnoreError(
          // May be an issue with the commas of
          //   `utils.parseClosureTemplateTag`, so first try a raw
          //   value; we really need a proper parser instead, however.
          tag.name.trim().replace(/^\[?(?<name>.*?)=.*$/v, '$<name>'),
          mode,
        )) {
          for (const namepath of utils.parseClosureTemplateTag(tag)) {
            validNamepathParsing(namepath);
          }
        }
      } else {
        validNamepathParsing(tag.name, tag.tag);
      }
    }

    const hasNamePosition = utils.tagMightHaveName(tag.tag) &&
      Boolean(tag.name);
    if (
      hasNamePosition &&
      mode === 'typescript' &&
      !tryParseNameIgnoreError(tag.name, mode)
    ) {
      report(`Syntax error in name: ${tag.name}`, null, tag);
    } else if (hasNamePosition && mode !== 'typescript') {
      validNamepathParsing(tag.name, tag.tag);
    }

    for (const inlineTag of tag.inlineTags) {
      if (inlineTags.has(inlineTag.tag) && !inlineTag.text && !inlineTag.namepathOrURL) {
        report(`Inline tag "${inlineTag.tag}" missing content`, null, tag);
      }
    }
  }

  for (const inlineTag of jsdoc.inlineTags) {
    if (inlineTags.has(inlineTag.tag) && !inlineTag.text && !inlineTag.namepathOrURL) {
      report(`Inline tag "${inlineTag.tag}" missing content`);
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Requires all types/namepaths to be valid JSDoc, Closure compiler, or TypeScript types (configurable in settings).',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/valid-types.md#repos-sticky-header',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowEmptyNamepaths: {
            default: false,
            description: `Set to \`false\` to bulk disallow
empty name paths with namepath groups 2 and 4 (these might often be
expected to have an accompanying name path, though they have some
indicative value without one; these may also allow names to be defined
in another manner elsewhere in the block); you can use
\`settings.jsdoc.structuredTags\` with the \`required\` key set to "name" if you
wish to require name paths on a tag-by-tag basis. Defaults to \`true\`.`,
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
