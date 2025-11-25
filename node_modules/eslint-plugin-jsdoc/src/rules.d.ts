export interface Rules {
  /** Checks that `@access` tags have a valid value. */
  "jsdoc/check-access": [];

  /** Reports invalid alignment of JSDoc block asterisks. */
  "jsdoc/check-alignment": 
    | []
    | [
        {
          /**
           * Set to 0 if you wish to avoid the normal requirement for an inner indentation of
           * one space. Defaults to 1 (one space of normal inner indentation).
           */
          innerIndent?: number;
        }
      ];

  /** @deprecated - Use `getJsdocProcessorPlugin` processor; ensures that (JavaScript) samples within `@example` tags adhere to ESLint rules. */
  "jsdoc/check-examples": 
    | []
    | [
        {
          allowInlineConfig?: boolean;
          baseConfig?: {
            [k: string]: unknown;
          };
          captionRequired?: boolean;
          checkDefaults?: boolean;
          checkEslintrc?: boolean;
          checkParams?: boolean;
          checkProperties?: boolean;
          configFile?: string;
          exampleCodeRegex?: string;
          matchingFileName?: string;
          matchingFileNameDefaults?: string;
          matchingFileNameParams?: string;
          matchingFileNameProperties?: string;
          noDefaultExampleRules?: boolean;
          paddedIndent?: number;
          rejectExampleCodeRegex?: string;
          reportUnusedDisableDirectives?: boolean;
        }
      ];

  /** Reports invalid padding inside JSDoc blocks. */
  "jsdoc/check-indentation": 
    | []
    | [
        {
          /**
           * Array of tags (e.g., `['example', 'description']`) whose content will be
           * "hidden" from the `check-indentation` rule. Defaults to `['example']`.
           *
           * By default, the whole JSDoc block will be checked for invalid padding.
           * That would include `@example` blocks too, which can get in the way
           * of adding full, readable examples of code without ending up with multiple
           * linting issues.
           *
           * When disabled (by passing `excludeTags: []` option), the following code *will*
           * report a padding issue:
           *
           * ```js
           * /**
           *  * @example
           *  * anArray.filter((a) => {
           *  *   return a.b;
           *  * });
           *  * /
           * ```
           */
          excludeTags?: string[];
        }
      ];

  /** Reports invalid alignment of JSDoc block lines. */
  "jsdoc/check-line-alignment": 
    | []
    | ["always" | "never" | "any"]
    | [
        "always" | "never" | "any",
        {
          /**
           * An object with any of the following spacing keys set to an integer.
           * If a spacing is not defined, it defaults to one.
           */
          customSpacings?: {
            /**
             * Affects spacing after the asterisk (e.g., `*   @param`)
             */
            postDelimiter?: number;
            /**
             * Affects spacing after any hyphens in the description (e.g., `* @param {someType} name -  A description`)
             */
            postHyphen?: number;
            /**
             * Affects spacing after the name (e.g., `* @param {someType} name   `)
             */
            postName?: number;
            /**
             * Affects spacing after the tag (e.g., `* @param  `)
             */
            postTag?: number;
            /**
             * Affects spacing after the type (e.g., `* @param {someType}   `)
             */
            postType?: number;
          };
          /**
           * Disables `wrapIndent`; existing wrap indentation is preserved without changes.
           */
          disableWrapIndent?: boolean;
          /**
           * A boolean to determine whether to preserve the post-delimiter spacing of the
           * main description. If `false` or unset, will be set to a single space.
           */
          preserveMainDescriptionPostDelimiter?: boolean;
          /**
           * Use this to change the tags which are sought for alignment changes. Defaults to an array of
           * `['param', 'arg', 'argument', 'property', 'prop', 'returns', 'return', 'template']`.
           */
          tags?: string[];
          /**
           * The indent that will be applied for tag text after the first line.
           * Default to the empty string (no indent).
           */
          wrapIndent?: string;
        }
      ];

  /** Checks for dupe `@param` names, that nested param names have roots, and that parameter names in function declarations match JSDoc param names. */
  "jsdoc/check-param-names": 
    | []
    | [
        {
          /**
           * If set to `true`, this option will allow extra `@param` definitions (e.g.,
           * representing future expected or virtual params) to be present without needing
           * their presence within the function signature. Other inconsistencies between
           * `@param`'s and present function parameters will still be reported.
           */
          allowExtraTrailingParamDocs?: boolean;
          /**
           * Whether to check destructured properties. Defaults to `true`.
           */
          checkDestructured?: boolean;
          /**
           * If set to `true`, will require that rest properties are documented and
           * that any extraneous properties (which may have been within the rest property)
           * are documented. Defaults to `false`.
           */
          checkRestProperty?: boolean;
          /**
           * Defines a regular expression pattern to indicate which types should be
           * checked for destructured content (and that those not matched should not
           * be checked).
           *
           * When one specifies a type, unless it is of a generic type, like `object`
           * or `array`, it may be considered unnecessary to have that object's
           * destructured components required, especially where generated docs will
           * link back to the specified type. For example:
           *
           * ```js
           * /**
           *  * @param {SVGRect} bbox - a SVGRect
           *  * /
           * export const bboxToObj = function ({x, y, width, height}) {
           *   return {x, y, width, height};
           * };
           * ```
           *
           * By default `checkTypesPattern` is set to
           * `/^(?:[oO]bject|[aA]rray|PlainObject|Generic(?:Object|Array))$/v`,
           * meaning that destructuring will be required only if the type of the `@param`
           * (the text between curly brackets) is a match for "Object" or "Array" (with or
           * without initial caps), "PlainObject", or "GenericObject", "GenericArray" (or
           * if no type is present). So in the above example, the lack of a match will
           * mean that no complaint will be given about the undocumented destructured
           * parameters.
           *
           * Note that the `/` delimiters are optional, but necessary to add flags.
           *
           * Defaults to using (only) the `v` flag, so to add your own flags, encapsulate
           * your expression as a string, but like a literal, e.g., `/^object$/vi`.
           *
           * You could set this regular expression to a more expansive list, or you
           * could restrict it such that even types matching those strings would not
           * need destructuring.
           */
          checkTypesPattern?: string;
          /**
           * Whether to check for extra destructured properties. Defaults to `false`. Change
           * to `true` if you want to be able to document properties which are not actually
           * destructured. Keep as `false` if you expect properties to be documented in
           * their own types. Note that extra properties will always be reported if another
           * item at the same level is destructured as destructuring will prevent other
           * access and this option is only intended to permit documenting extra properties
           * that are available and actually used in the function.
           */
          disableExtraPropertyReporting?: boolean;
          /**
           * Whether to avoid checks for missing `@param` definitions. Defaults to `false`. Change to `true` if you want to be able to omit properties.
           */
          disableMissingParamChecks?: boolean;
          /**
           * Set to `true` to auto-remove `@param` duplicates (based on identical
           * names).
           *
           * Note that this option will remove duplicates of the same name even if
           * the definitions do not match in other ways (e.g., the second param will
           * be removed even if it has a different type or description).
           */
          enableFixer?: boolean;
          /**
           * Set to `true` if you wish to avoid reporting of child property documentation
           * where instead of destructuring, a whole plain object is supplied as default
           * value but you wish its keys to be considered as signalling that the properties
           * are present and can therefore be documented. Defaults to `false`.
           */
          useDefaultObjectProperties?: boolean;
        }
      ];

  /** Ensures that property names in JSDoc are not duplicated on the same block and that nested properties have defined roots. */
  "jsdoc/check-property-names": 
    | []
    | [
        {
          /**
           * Set to `true` to auto-remove `@property` duplicates (based on
           * identical names).
           *
           * Note that this option will remove duplicates of the same name even if
           * the definitions do not match in other ways (e.g., the second property will
           * be removed even if it has a different type or description).
           */
          enableFixer?: boolean;
        }
      ];

  /** Reports against syntax not valid for the mode (e.g., Google Closure Compiler in non-Closure mode). */
  "jsdoc/check-syntax": [];

  /** Reports invalid block tag names. */
  "jsdoc/check-tag-names": 
    | []
    | [
        {
          /**
           * Use an array of `definedTags` strings to configure additional, allowed tags.
           * The format is as follows:
           *
           * ```json
           * {
           *   "definedTags": ["note", "record"]
           * }
           * ```
           */
          definedTags?: string[];
          /**
           * Set to `false` to disable auto-removal of types that are redundant with the [`typed` option](#typed).
           */
          enableFixer?: boolean;
          /**
           * List of tags to allow inline.
           *
           * Defaults to array of `'link', 'linkcode', 'linkplain', 'tutorial'`
           */
          inlineTags?: string[];
          /**
           * If this is set to `true`, all of the following tags used to control JSX output are allowed:
           *
           * ```
           * jsx
           * jsxFrag
           * jsxImportSource
           * jsxRuntime
           * ```
           *
           * For more information, see the [babel documentation](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx).
           */
          jsxTags?: boolean;
          /**
           * If this is set to `true`, additionally checks for tag names that are redundant when using a type checker such as TypeScript.
           *
           * These tags are always unnecessary when using TypeScript or similar:
           *
           * ```
           * augments
           * callback
           * class
           * enum
           * implements
           * private
           * property
           * protected
           * public
           * readonly
           * this
           * type
           * typedef
           * ```
           *
           * These tags are unnecessary except when inside a TypeScript `declare` context:
           *
           * ```
           * abstract
           * access
           * class
           * constant
           * constructs
           * default
           * enum
           * export
           * exports
           * function
           * global
           * inherits
           * instance
           * interface
           * member
           * memberof
           * memberOf
           * method
           * mixes
           * mixin
           * module
           * name
           * namespace
           * override
           * property
           * requires
           * static
           * this
           * ```
           */
          typed?: boolean;
        }
      ];

  /** Checks that any `@template` names are actually used in the connected `@typedef` or type alias. */
  "jsdoc/check-template-names": [];

  /** Reports types deemed invalid (customizable and with defaults, for preventing and/or recommending replacements). */
  "jsdoc/check-types": 
    | []
    | [
        {
          /**
           * Avoids reporting when a bad type is found on a specified tag.
           */
          exemptTagContexts?: {
            /**
             * Set a key `tag` to the tag to exempt
             */
            tag?: string;
            /**
             * Set to `true` to indicate that any types on that tag will be allowed,
             * or to an array of strings which will only allow specific bad types.
             * If an array of strings is given, these must match the type exactly,
             * e.g., if you only allow `"object"`, it will not allow
             * `"object<string, string>"`. Note that this is different from the
             * behavior of `settings.jsdoc.preferredTypes`. This option is useful
             * for normally restricting generic types like `object` with
             * `preferredTypes`, but allowing `typedef` to indicate that its base
             * type is `object`.
             */
            types?: boolean | string[];
          }[];
          /**
           * Insists that only the supplied option type
           * map is to be used, and that the default preferences (such as "string"
           * over "String") will not be enforced. The option's default is `false`.
           */
          noDefaults?: boolean;
          /**
           * @deprecated Use the `preferredTypes[preferredType]` setting of the same name instead.
           * If this option is `true`, will currently override `unifyParentAndChildTypeChecks` on the `preferredTypes` setting.
           */
          unifyParentAndChildTypeChecks?: boolean;
        }
      ];

  /** This rule checks the values for a handful of tags: `@version`, `@since`, `@license` and `@author`. */
  "jsdoc/check-values": 
    | []
    | [
        {
          /**
           * An array of allowable author values. If absent, only non-whitespace will
           * be checked for.
           */
          allowedAuthors?: string[];
          /**
           * An array of allowable license values or `true` to allow any license text.
           * If present as an array, will be used in place of [SPDX identifiers](https://spdx.org/licenses/).
           */
          allowedLicenses?: string[] | boolean;
          /**
           * A string to be converted into a `RegExp` (with `v` flag) and whose first
           * parenthetical grouping, if present, will match the portion of the license
           * description to check (if no grouping is present, then the whole portion
           * matched will be used). Defaults to `/([^\n\r]*)/gv`, i.e., the SPDX expression
           * is expected before any line breaks.
           *
           * Note that the `/` delimiters are optional, but necessary to add flags.
           *
           * Defaults to using the `v` flag, so to add your own flags, encapsulate
           * your expression as a string, but like a literal, e.g., `/^mit$/vi`.
           */
          licensePattern?: string;
          /**
           * Whether to enable validation that `@variation` must be a number. Defaults to
           * `false`.
           */
          numericOnlyVariation?: boolean;
        }
      ];

  /** Converts non-JSDoc comments preceding or following nodes into JSDoc ones */
  "jsdoc/convert-to-jsdoc-comments": 
    | []
    | [
        {
          /**
           * An array of prefixes to allow at the beginning of a comment.
           *
           * Defaults to `['@ts-', 'istanbul ', 'c8 ', 'v8 ', 'eslint', 'prettier-']`.
           *
           * Supplying your own value overrides the defaults.
           */
          allowedPrefixes?: string[];
          /**
           * The contexts array which will be checked for preceding content.
           *
           * Can either be strings or an object with a `context` string and an optional, default `false` `inlineCommentBlock` boolean.
           *
           * Defaults to `ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`, `TSDeclareFunction`.
           */
          contexts?: (
            | string
            | {
                context?: string;
                inlineCommentBlock?: boolean;
              }
          )[];
          /**
           * The contexts array which will be checked for content on the same line after.
           *
           * Can either be strings or an object with a `context` string and an optional, default `false` `inlineCommentBlock` boolean.
           *
           * Defaults to an empty array.
           */
          contextsAfter?: (
            | string
            | {
                context?: string;
                inlineCommentBlock?: boolean;
              }
          )[];
          /**
           * The contexts array which will be checked for content before and on the same
           * line after.
           *
           * Can either be strings or an object with a `context` string and an optional, default `false` `inlineCommentBlock` boolean.
           *
           * Defaults to `VariableDeclarator`, `TSPropertySignature`, `PropertyDefinition`.
           */
          contextsBeforeAndAfter?: (
            | string
            | {
                context?: string;
                inlineCommentBlock?: boolean;
              }
          )[];
          /**
           * Set to `false` to disable fixing.
           */
          enableFixer?: boolean;
          /**
           * What policy to enforce on the conversion of non-JSDoc comments without
           * line breaks. (Non-JSDoc (mulitline) comments with line breaks will always
           * be converted to `multi` style JSDoc comments.)
           *
           * - `multi` - Convert to multi-line style
           * ```js
           * /**
           *  * Some text
           *  * /
           * ```
           * - `single` - Convert to single-line style
           * ```js
           * /** Some text * /
           * ```
           *
           * Defaults to `multi`.
           */
          enforceJsdocLineStyle?: "multi" | "single";
          /**
           * What style of comments to which to apply JSDoc conversion.
           *
           * - `block` - Applies to block-style comments (`/* ... * /`)
           * - `line` - Applies to line-style comments (`// ...`)
           * - `both` - Applies to both block and line-style comments
           *
           * Defaults to `both`.
           */
          lineOrBlockStyle?: "block" | "line" | "both";
        }
      ];

  /** Checks tags that are expected to be empty (e.g., `@abstract` or `@async`), reporting if they have content */
  "jsdoc/empty-tags": 
    | []
    | [
        {
          /**
           * If you want additional tags to be checked for their descriptions, you may
           * add them within this option.
           *
           * ```js
           * {
           *   'jsdoc/empty-tags': ['error', {tags: ['event']}]
           * }
           * ```
           */
          tags?: string[];
        }
      ];

  /** Reports use of JSDoc tags in non-tag positions (in the default "typescript" mode). */
  "jsdoc/escape-inline-tags": 
    | []
    | [
        {
          /**
           * A listing of tags you wish to allow unescaped. Defaults to an empty array.
           */
          allowedInlineTags?: string[];
          /**
           * Whether to enable the fixer. Defaults to `false`.
           */
          enableFixer?: boolean;
          /**
           * How to escape the inline tag.
           *
           * May be "backticks" to enclose tags in backticks (treating as code segments), or
           * "backslash" to escape tags with a backslash, i.e., `\@`
           *
           * Defaults to "backslash".
           */
          fixType?: "backticks" | "backslash";
        }
      ];

  /** Prohibits use of `@implements` on non-constructor functions (to enforce the tag only being used on classes/constructors). */
  "jsdoc/implements-on-classes": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
        }
      ];

  /** Reports if JSDoc `import()` statements point to a package which is not listed in `dependencies` or `devDependencies` */
  "jsdoc/imports-as-dependencies": [];

  /** This rule reports doc comments that only restate their attached name. */
  "jsdoc/informative-docs": 
    | []
    | [
        {
          /**
           * The `aliases` option allows indicating words as synonyms (aliases) of each other.
           *
           * For example, with `{ aliases: { emoji: ["smiley", "winkey"] } }`, the following comment would be considered uninformative:
           *
           * ```js
           * /** A smiley/winkey. * /
           * let emoji;
           * ```
           *
           * The default `aliases` option is:
           *
           * ```json
           * {
           *   "a": ["an", "our"]
           * }
           * ```
           */
          aliases?: {
            /**
             * This interface was referenced by `undefined`'s JSON-Schema definition
             * via the `patternProperty` ".*".
             */
            [k: string]: string[];
          };
          /**
           * Tags that should not be checked for valid contents.
           *
           * For example, with `{ excludedTags: ["category"] }`, the following comment would not be considered uninformative:
           *
           * ```js
           * /** @category Types * /
           * function computeTypes(node) {
           *   // ...
           * }
           * ```
           *
           * No tags are excluded by default.
           */
          excludedTags?: string[];
          /**
           * Words that are ignored when searching for one that adds meaning.
           *
           * For example, with `{ uselessWords: ["our"] }`, the following comment would be considered uninformative:
           *
           * ```js
           * /** Our text. * /
           * let text;
           * ```
           *
           * The default `uselessWords` option is:
           *
           * ```json
           * ["a", "an", "i", "in", "of", "s", "the"]
           * ```
           */
          uselessWords?: string[];
        }
      ];

  /** Enforces minimum number of newlines before JSDoc comment blocks */
  "jsdoc/lines-before-block": 
    | []
    | [
        {
          /**
           * Whether to additionally check the start of blocks, such as classes or functions.
           * Defaults to `false`.
           */
          checkBlockStarts?: boolean;
          /**
           * An array of tags whose presence in the JSDoc block will prevent the
           * application of the rule. Defaults to `['type']` (i.e., if `@type` is present,
           * lines before the block will not be added).
           */
          excludedTags?: string[];
          /**
           * This option excludes cases where the JSDoc block occurs on the same line as a
           * preceding code or comment. Defaults to `true`.
           */
          ignoreSameLine?: boolean;
          /**
           * This option excludes cases where the JSDoc block is only one line long.
           * Defaults to `true`.
           */
          ignoreSingleLines?: boolean;
          /**
           * The minimum number of lines to require. Defaults to 1.
           */
          lines?: number;
        }
      ];

  /** Enforces a regular expression pattern on descriptions. */
  "jsdoc/match-description": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied (e.g.,
           * `ClassDeclaration` for ES6 classes).
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want the rule to apply to any
           * JSDoc block throughout your files.
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * If you wish to override the main block description without changing the
           * default `match-description` (which can cascade to the `tags` with `true`),
           * you may use `mainDescription`:
           *
           * ```js
           * {
           *   'jsdoc/match-description': ['error', {
           *     mainDescription: '[A-Z].*\\.',
           *     tags: {
           *       param: true,
           *       returns: true
           *     }
           *   }]
           * }
           * ```
           *
           * There is no need to add `mainDescription: true`, as by default, the main
           * block description (and only the main block description) is linted, though you
           * may disable checking it by setting it to `false`.
           *
           * You may also provide an object with `message`:
           *
           * ```js
           * {
           *   'jsdoc/match-description': ['error', {
           *     mainDescription: {
           *       message: 'Capitalize first word of JSDoc block descriptions',
           *       match: '[A-Z].*\\.'
           *     },
           *     tags: {
           *       param: true,
           *       returns: true
           *     }
           *   }]
           * }
           * ```
           */
          mainDescription?:
            | string
            | boolean
            | {
                match?: string | boolean;
                message?: string;
              };
          /**
           * You can supply your own expression to override the default, passing a
           * `matchDescription` string on the options object.
           *
           * Defaults to using (only) the `v` flag, so
           * to add your own flags, encapsulate your expression as a string, but like a
           * literal, e.g., `/[A-Z].*\./vi`.
           *
           * ```js
           * {
           *   'jsdoc/match-description': ['error', {matchDescription: '[A-Z].*\\.'}]
           * }
           * ```
           */
          matchDescription?: string;
          /**
           * You may provide a custom default message by using the following format:
           *
           * ```js
           * {
           *   'jsdoc/match-description': ['error', {
           *     message: 'The default description should begin with a capital letter.'
           *   }]
           * }
           * ```
           *
           * This can be overridden per tag or for the main block description by setting
           * `message` within `tags` or `mainDescription`, respectively.
           */
          message?: string;
          /**
           * If not set to `false`, will enforce that the following tags have at least
           * some content:
           *
           * - `@copyright`
           * - `@example`
           * - `@see`
           * - `@todo`
           *
           * If you supply your own tag description for any of the above tags in `tags`,
           * your description will take precedence.
           */
          nonemptyTags?: boolean;
          /**
           * If you want different regular expressions to apply to tags, you may use
           * the `tags` option object:
           *
           * ```js
           * {
           *   'jsdoc/match-description': ['error', {tags: {
           *     param: '\\- [A-Z].*\\.',
           *     returns: '[A-Z].*\\.'
           *   }}]
           * }
           * ```
           *
           * In place of a string, you can also add `true` to indicate that a particular
           * tag should be linted with the `matchDescription` value (or the default).
           *
           * ```js
           * {
           *   'jsdoc/match-description': ['error', {tags: {
           *     param: true,
           *     returns: true
           *   }}]
           * }
           * ```
           *
           * Alternatively, you may supply an object with a `message` property to indicate
           * the error message for that tag.
           *
           * ```js
           * {
           *   'jsdoc/match-description': ['error', {tags: {
           *     param: {message: 'Begin with a hyphen', match: '\\- [A-Z].*\\.'},
           *     returns: {message: 'Capitalize for returns (the default)', match: true}
           *   }}]
           * }
           * ```
           *
           * The tags `@param`/`@arg`/`@argument` and `@property`/`@prop` will be properly
           * parsed to ensure that the matched "description" text includes only the text
           * after the name.
           *
           * All other tags will treat the text following the tag name, a space, and
           * an optional curly-bracketed type expression (and another space) as part of
           * its "description" (e.g., for `@returns {someType} some description`, the
           * description is `some description` while for `@some-tag xyz`, the description
           * is `xyz`).
           */
          tags?: {
            /**
             * This interface was referenced by `undefined`'s JSON-Schema definition
             * via the `patternProperty` ".*".
             */
            [k: string]:
              | string
              | true
              | {
                  match?: string | true;
                  message?: string;
                };
          };
        }
      ];

  /** Reports the name portion of a JSDoc tag if matching or not matching a given regular expression. */
  "jsdoc/match-name": 
    | []
    | [
        {
          /**
           * `match` is a required option containing an array of objects which determine
           * the conditions whereby a name is reported as being problematic.
           *
           * These objects can have any combination of the following groups of optional
           * properties, all of which act to confine one another.
           *
           * Note that `comment`, even if targeting a specific tag, is used to match the
           * whole block. So if a `comment` finds its specific tag, it may still apply
           * fixes found by the likes of `disallowName` even when a different tag has the
           * disallowed name. An alternative is to ensure that `comment` finds the specific
           * tag of the desired tag and/or name and no `disallowName` (or `allowName`) is
           * supplied. In such a case, only one error will be reported, but no fixer will
           * be applied, however.
           */
          match: {
            /**
             * Indicates which names are allowed for the given tag (or `*`).
             * Accepts a string regular expression (optionally wrapped between two
             * `/` delimiters followed by optional flags) used to match the name.
             */
            allowName?: string;
            /**
             * As with `context` but AST for the JSDoc block comment and types.
             */
            comment?: string;
            /**
             * AST to confine the allowing or disallowing to JSDoc blocks
             * associated with a particular context. See the
             * ["AST and Selectors"](../#advanced-ast-and-selectors)
             * section of our Advanced docs for more on the expected format.
             */
            context?: string;
            /**
             * As with `allowName` but indicates names that are not allowed.
             */
            disallowName?: string;
            /**
             * An optional custom message to use when there is a match.
             */
            message?: string;
            /**
             * If `disallowName` is supplied and this value is present, it
             * will replace the matched `disallowName` text.
             */
            replacement?: string;
            /**
             * This array should include tag names or `*` to indicate the
             *   match will apply for all tags (except as confined by any context
             *   properties). If `*` is not used, then these rules will only apply to
             *   the specified tags. If `tags` is omitted, then `*` is assumed.
             */
            tags?: string[];
          }[];
        }
      ];

  /** Controls how and whether JSDoc blocks can be expressed as single or multiple line blocks. */
  "jsdoc/multiline-blocks": 
    | []
    | [
        {
          /**
           * If `noMultilineBlocks` is set to `true` with this option and multiple tags are
           * found in a block, an error will not be reported.
           *
           * Since multiple-tagged lines cannot be collapsed into a single line, this option
           * prevents them from being reported. Set to `false` if you really want to report
           * any blocks.
           *
           * This option will also be applied when there is a block description and a single
           * tag (since a description cannot precede a tag on a single line, and also
           * cannot be reliably added after the tag either).
           *
           * Defaults to `true`.
           */
          allowMultipleTags?: boolean;
          /**
           * If `noMultilineBlocks` is set with this numeric option, multiline blocks will
           * be permitted if containing at least the given amount of text.
           *
           * If not set, multiline blocks will not be permitted regardless of length unless
           * a relevant tag is present and `multilineTags` is set.
           *
           * Defaults to not being in effect.
           */
          minimumLengthForMultiline?: number;
          /**
           * If `noMultilineBlocks` is set with this option, multiline blocks may be allowed
           * regardless of length as long as a tag or a tag of a certain type is present.
           *
           * If `*` is included in the array, the presence of a tags will allow for
           * multiline blocks (but not when without any tags unless the amount of text is
           * over an amount specified by `minimumLengthForMultiline`).
           *
           * If the array does not include `*` but lists certain tags, the presence of
           * such a tag will cause multiline blocks to be allowed.
           *
           * You may set this to an empty array to prevent any tag from permitting multiple
           * lines.
           *
           * Defaults to `['*']`.
           */
          multilineTags?: "*" | string[];
          /**
           * For multiline blocks, any non-whitespace text preceding the `* /` on the final
           * line will be reported. (Text preceding a newline is not reported.)
           *
           * `noMultilineBlocks` will have priority over this rule if it applies.
           *
           * Defaults to `true`.
           */
          noFinalLineText?: boolean;
          /**
           * Requires that JSDoc blocks are restricted to single lines only unless impacted
           * by the options `minimumLengthForMultiline`, `multilineTags`, or
           * `allowMultipleTags`.
           *
           * Defaults to `false`.
           */
          noMultilineBlocks?: boolean;
          /**
           * If this is `true`, any single line blocks will be reported, except those which
           * are whitelisted in `singleLineTags`.
           *
           * Defaults to `false`.
           */
          noSingleLineBlocks?: boolean;
          /**
           * For multiline blocks, any non-whitespace text immediately after the `/**` and
           * space will be reported. (Text after a newline is not reported.)
           *
           * `noMultilineBlocks` will have priority over this rule if it applies.
           *
           * Defaults to `true`.
           */
          noZeroLineText?: boolean;
          /**
           * If this number is set, it indicates a minimum line width for a single line of
           * JSDoc content spread over a multi-line comment block. If a single line is under
           * the minimum length, it will be reported so as to enforce single line JSDoc blocks
           * for such cases. Blocks are not reported which have multi-line descriptions,
           * multiple tags, a block description and tag, or tags with multi-line types or
           * descriptions.
           *
           * Defaults to `null`.
           */
          requireSingleLineUnderCount?: number;
          /**
           * An array of tags which can nevertheless be allowed as single line blocks when
           * `noSingleLineBlocks` is set.  You may set this to a empty array to
           * cause all single line blocks to be reported. If `'*'` is present, then
           * the presence of a tag will allow single line blocks (but not if a tag is
           * missing).
           *
           * Defaults to `['lends', 'type']`.
           */
          singleLineTags?: string[];
        }
      ];

  /** This rule checks for multi-line-style comments which fail to meet the criteria of a JSDoc block. */
  "jsdoc/no-bad-blocks": 
    | []
    | [
        {
          /**
           * An array of directives that will not be reported if present at the beginning of
           * a multi-comment block and at-sign `/* @`.
           *
           * Defaults to `['ts-check', 'ts-expect-error', 'ts-ignore', 'ts-nocheck']`
           * (some directives [used by TypeScript](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html#ts-check)).
           */
          ignore?: string[];
          /**
           * A boolean (defaulting to `false`) which if `true` will prevent all
           * JSDoc-like blocks with more than two initial asterisks even those without
           * apparent tag content.
           */
          preventAllMultiAsteriskBlocks?: boolean;
        }
      ];

  /** If tags are present, this rule will prevent empty lines in the block description. If no tags are present, this rule will prevent extra empty lines in the block description. */
  "jsdoc/no-blank-block-descriptions": [];

  /** Removes empty blocks with nothing but possibly line breaks */
  "jsdoc/no-blank-blocks": 
    | []
    | [
        {
          /**
           * Whether or not to auto-remove the blank block. Defaults to `false`.
           */
          enableFixer?: boolean;
        }
      ];

  /** This rule reports defaults being used on the relevant portion of `@param` or `@default`. */
  "jsdoc/no-defaults": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * Set this to `true` to report the presence of optional parameters. May be
           * used if the project is insisting on optionality being indicated by
           * the presence of ES6 default parameters (bearing in mind that such
           * "defaults" are only applied when the supplied value is missing or
           * `undefined` but not for `null` or other "falsey" values).
           */
          noOptionalParamNames?: boolean;
        }
      ];

  /** Reports when certain comment structures are always expected. */
  "jsdoc/no-missing-syntax": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Use the `minimum` property (defaults to 1) to indicate how many are required
           * for the rule to be reported.
           *
           * Use the `message` property to indicate the specific error to be shown when an
           * error is reported for that context being found missing. You may use
           * `{{context}}` and `{{comment}}` with such messages. Defaults to
           * `"Syntax is required: {{context}}"`, or with a comment, to
           * `"Syntax is required: {{context}} with {{comment}}"`.
           *
           * Set to `"any"` if you want the rule to apply to any JSDoc block throughout
           * your files (as is necessary for finding function blocks not attached to a
           * function declaration or expression, i.e., `@callback` or `@function` (or its
           * aliases `@func` or `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
                message?: string;
                minimum?: number;
              }
          )[];
        }
      ];

  /** Prevents use of multiple asterisks at the beginning of lines. */
  "jsdoc/no-multi-asterisks": 
    | []
    | [
        {
          /**
           * Set to `true` if you wish to allow asterisks after a space (as with Markdown):
           *
           * ```js
           * /**
           *  * *bold* text
           *  * /
           * ```
           *
           * Defaults to `false`.
           */
          allowWhitespace?: boolean;
          /**
           * Prevent the likes of this:
           *
           * ```js
           * /**
           *  *
           *  *
           *  ** /
           * ```
           *
           * Defaults to `true`.
           */
          preventAtEnd?: boolean;
          /**
           * Prevent the likes of this:
           *
           * ```js
           * /**
           *  *
           *  **
           *  * /
           * ```
           *
           * Defaults to `true`.
           */
          preventAtMiddleLines?: boolean;
        }
      ];

  /** Reports when certain comment structures are present. */
  "jsdoc/no-restricted-syntax": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Use the `message` property to indicate the specific error to be shown when an
           * error is reported for that context being found. Defaults to
           * `"Syntax is restricted: {{context}}"`, or with a comment, to
           * `"Syntax is restricted: {{context}} with {{comment}}"`.
           *
           * Set to `"any"` if you want the rule to apply to any JSDoc block throughout
           * your files (as is necessary for finding function blocks not attached to a
           * function declaration or expression, i.e., `@callback` or `@function` (or its
           * aliases `@func` or `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts: (
            | string
            | {
                comment?: string;
                context?: string;
                message?: string;
              }
          )[];
        }
      ];

  /** This rule reports types being used on `@param` or `@returns` (redundant with TypeScript). */
  "jsdoc/no-types": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`, `TSDeclareFunction`, `TSMethodSignature`,
           * `ClassDeclaration`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
        }
      ];

  /** Besides some expected built-in types, prohibits any types not specified as globals or within `@typedef`. */
  "jsdoc/no-undefined-types": 
    | []
    | [
        {
          /**
           * Whether to check typedefs for use within the file
           */
          checkUsedTypedefs?: boolean;
          /**
           * This array can be populated to indicate other types which
           * are automatically considered as defined (in addition to globals, etc.).
           * Defaults to an empty array.
           */
          definedTypes?: string[];
          /**
           * Whether to disable reporting of errors. Defaults to
           * `false`. This may be set to `true` in order to take advantage of only
           * marking defined variables as used or checking used typedefs.
           */
          disableReporting?: boolean;
          /**
           * Whether to mark variables as used for the purposes
           * of the `no-unused-vars` rule when they are not found to be undefined.
           * Defaults to `true`. May be set to `false` to enforce a practice of not
           * importing types unless used in code.
           */
          markVariablesAsUsed?: boolean;
        }
      ];

  /** Prefer `@import` tags to inline `import()` statements. */
  "jsdoc/prefer-import-tag": 
    | []
    | [
        {
          /**
           * Whether or not to enable the fixer to add `@import` tags.
           */
          enableFixer?: boolean;
          /**
           * Whether to allow `import()` statements within `@typedef`
           */
          exemptTypedefs?: boolean;
          /**
           * What kind of `@import` to generate when no matching `@typedef` or `@import` is found
           */
          outputType?: "named-import" | "namespaced-import";
        }
      ];

  /** Reports use of `any` or `*` type */
  "jsdoc/reject-any-type": [];

  /** Reports use of `Function` type */
  "jsdoc/reject-function-type": [];

  /** Requires that each JSDoc line starts with an `*`. */
  "jsdoc/require-asterisk-prefix": 
    | []
    | ["always" | "never" | "any"]
    | [
        "always" | "never" | "any",
        {
          /**
           * If you want different values to apply to specific tags, you may use
           * the `tags` option object. The keys are `always`, `never`, or `any` and
           * the values are arrays of tag names or the special value `*description`
           * which applies to the main JSDoc block description.
           *
           * ```js
           * {
           *   'jsdoc/require-asterisk-prefix': ['error', 'always', {
           *     tags: {
           *       always: ['*description'],
           *       any: ['example', 'license'],
           *       never: ['copyright']
           *     }
           *   }]
           * }
           * ```
           */
          tags?: {
            /**
             * If it is `"always"` then a problem is raised when there is no asterisk
             * prefix on a given JSDoc line.
             */
            always?: string[];
            /**
             * No problem is raised regardless of asterisk presence or non-presence.
             */
            any?: string[];
            /**
             * If it is `"never"` then a problem is raised
             * when there is an asterisk present.
             */
            never?: string[];
          };
        }
      ];

  /** Requires that all functions (and potentially other contexts) have a description. */
  "jsdoc/require-description": 
    | []
    | [
        {
          /**
           * A value indicating whether `constructor`s should be
           * checked. Defaults to `true`.
           */
          checkConstructors?: boolean;
          /**
           * A value indicating whether getters should be checked.
           * Defaults to `true`.
           */
          checkGetters?: boolean;
          /**
           * A value indicating whether setters should be checked.
           * Defaults to `true`.
           */
          checkSetters?: boolean;
          /**
           * Set to an array of strings representing the AST context
           * where you wish the rule to be applied (e.g., `ClassDeclaration` for ES6
           * classes).
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`,
           * `FunctionDeclaration`, `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * Whether to accept implicit descriptions (`"body"`) or
           * `@description` tags (`"tag"`) as satisfying the rule. Set to `"any"` to
           * accept either style. Defaults to `"body"`.
           */
          descriptionStyle?: "body" | "tag" | "any";
          /**
           * Array of tags (e.g., `['type']`) whose presence on the
           * document block avoids the need for a `@description`. Defaults to an
           * array with `inheritdoc`. If you set this array, it will overwrite the
           * default, so be sure to add back `inheritdoc` if you wish its presence
           * to cause exemption of the rule.
           */
          exemptedBy?: string[];
        }
      ];

  /** Requires that block description, explicit `@description`, and `@param`/`@returns` tag descriptions are written in complete sentences. */
  "jsdoc/require-description-complete-sentence": 
    | []
    | [
        {
          /**
           * You can provide an `abbreviations` options array to avoid such strings of text
           * being treated as sentence endings when followed by dots. The `.` is not
           * necessary at the end of the array items.
           */
          abbreviations?: string[];
          /**
           * When `false` (the new default), we will not assume capital letters after
           * newlines are an incorrect way to end the sentence (they may be proper
           * nouns, for example).
           */
          newlineBeforeCapsAssumesBadSentenceEnd?: boolean;
          /**
           * If you want additional tags to be checked for their descriptions, you may
           * add them within this option.
           *
           * ```js
           * {
           *   'jsdoc/require-description-complete-sentence': ['error', {
           *     tags: ['see', 'copyright']
           *   }]
           * }
           * ```
           *
           * The tags `@param`/`@arg`/`@argument` and `@property`/`@prop` will be properly
           * parsed to ensure that the checked "description" text includes only the text
           * after the name.
           *
           * All other tags will treat the text following the tag name, a space, and
           * an optional curly-bracketed type expression (and another space) as part of
           * its "description" (e.g., for `@returns {someType} some description`, the
           * description is `some description` while for `@some-tag xyz`, the description
           * is `xyz`).
           */
          tags?: string[];
        }
      ];

  /** Requires that all functions (and potentially other contexts) have examples. */
  "jsdoc/require-example": 
    | []
    | [
        {
          /**
           * A value indicating whether `constructor`s should be checked.
           * Defaults to `true`.
           */
          checkConstructors?: boolean;
          /**
           * A value indicating whether getters should be checked. Defaults to `false`.
           */
          checkGetters?: boolean;
          /**
           * A value indicating whether setters should be checked. Defaults to `false`.
           */
          checkSetters?: boolean;
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           * (e.g., `ClassDeclaration` for ES6 classes).
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want the rule to apply to any
           * JSDoc block throughout your files.
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * A boolean on whether to enable the fixer (which adds an empty `@example` block).
           * Defaults to `true`.
           */
          enableFixer?: boolean;
          /**
           * Array of tags (e.g., `['type']`) whose presence on the document
           * block avoids the need for an `@example`. Defaults to an array with
           * `inheritdoc`. If you set this array, it will overwrite the default,
           * so be sure to add back `inheritdoc` if you wish its presence to cause
           * exemption of the rule.
           */
          exemptedBy?: string[];
          /**
           * Boolean to indicate that no-argument functions should not be reported for
           * missing `@example` declarations.
           */
          exemptNoArguments?: boolean;
        }
      ];

  /** Checks that all files have one `@file`, `@fileoverview`, or `@overview` tag at the beginning of the file. */
  "jsdoc/require-file-overview": 
    | []
    | [
        {
          /**
           * The keys of this object are tag names, and the values are configuration
           * objects indicating what will be checked for these whole-file tags.
           *
           * Each configuration object has 3 potential boolean keys (which default
           * to `false` when this option is supplied).
           *
           * 1. `mustExist` - enforces that all files have a `@file`, `@fileoverview`, or `@overview` tag.
           * 2. `preventDuplicates` - enforces that duplicate file overview tags within a given file will be reported
           * 3. `initialCommentsOnly` - reports file overview tags which are not, as per
           *   [the docs](https://jsdoc.app/tags-file.html), "at the beginning of
           *   the file"–where beginning of the file is interpreted in this rule
           *   as being when the overview tag is not preceded by anything other than
           *   a comment.
           *
           * When no `tags` is present, the default is:
           *
           * ```json
           * {
           *   "file": {
           *     "initialCommentsOnly": true,
           *     "mustExist": true,
           *     "preventDuplicates": true,
           *   }
           * }
           * ```
           *
           * You can add additional tag names and/or override `file` if you supply this
           * option, e.g., in place of or in addition to `file`, giving other potential
           * file global tags like `@license`, `@copyright`, `@author`, `@module` or
           * `@exports`, optionally restricting them to a single use or preventing them
           * from being preceded by anything besides comments.
           *
           * For example:
           *
           * ```js
           * {
           *   "license": {
           *     "mustExist": true,
           *     "preventDuplicates": true,
           *   }
           * }
           * ```
           *
           * This would require one and only one `@license` in the file, though because
           * `initialCommentsOnly` is absent and defaults to `false`, the `@license`
           * can be anywhere.
           *
           * In the case of `@license`, you can use this rule along with the
           * `check-values` rule (with its `allowedLicenses` or `licensePattern` options),
           * to enforce a license whitelist be present on every JS file.
           *
           * Note that if you choose to use `preventDuplicates` with `license`, you still
           * have a way to allow multiple licenses for the whole page by using the SPDX
           * "AND" expression, e.g., `@license (MIT AND GPL-3.0)`.
           *
           * Note that the tag names are the main JSDoc tag name, so you should use `file`
           * in this configuration object regardless of whether you have configured
           * `fileoverview` instead of `file` on `tagNamePreference` (i.e., `fileoverview`
           * will be checked, but you must use `file` on the configuration object).
           */
          tags?: {
            /**
             * This interface was referenced by `undefined`'s JSON-Schema definition
             * via the `patternProperty` ".*".
             */
            [k: string]: {
              initialCommentsOnly?: boolean;
              mustExist?: boolean;
              preventDuplicates?: boolean;
            };
          };
        }
      ];

  /** Requires a hyphen before the `@param` description (and optionally before `@property` descriptions). */
  "jsdoc/require-hyphen-before-param-description": 
    | []
    | ["always" | "never"]
    | [
        "always" | "never",
        {
          /**
           * Object whose keys indicate different tags to check for the
           *   presence or absence of hyphens; the key value should be "always" or "never",
           *   indicating how hyphens are to be applied, e.g., `{property: 'never'}`
           *   to ensure `@property` never uses hyphens. A key can also be set as `*`, e.g.,
           *   `'*': 'always'` to apply hyphen checking to any tag (besides the preferred
           *   `@param` tag which follows the main string option setting and besides any
           *   other `tags` entries).
           */
          tags?:
            | {
                /**
                 * This interface was referenced by `undefined`'s JSON-Schema definition
                 * via the `patternProperty` ".*".
                 */
                [k: string]: "always" | "never";
              }
            | "any";
        }
      ];

  /** Checks for presence of JSDoc comments, on functions and potentially other contexts (optionally limited to exports). */
  "jsdoc/require-jsdoc": 
    | []
    | [
        {
          /**
           * A value indicating whether `constructor`s should be checked. Defaults to
           * `true`. When `true`, `exemptEmptyConstructors` may still avoid reporting when
           * no parameters or return values are found.
           */
          checkConstructors?: boolean;
          /**
           * A value indicating whether getters should be checked. Besides setting as a
           * boolean, this option can be set to the string `"no-setter"` to indicate that
           * getters should be checked but only when there is no setter. This may be useful
           * if one only wishes documentation on one of the two accessors. Defaults to
           * `false`.
           */
          checkGetters?: boolean | "no-setter";
          /**
           * A value indicating whether setters should be checked. Besides setting as a
           * boolean, this option can be set to the string `"no-getter"` to indicate that
           * setters should be checked but only when there is no getter. This may be useful
           * if one only wishes documentation on one of the two accessors. Defaults to
           * `false`.
           */
          checkSetters?: boolean | "no-getter";
          /**
           * Set this to an array of strings or objects representing the additional AST
           * contexts where you wish the rule to be applied (e.g., `Property` for
           * properties). If specified as an object, it should have a `context` property
           * and can have an `inlineCommentBlock` property which, if set to `true`, will
           * add an inline `/** * /` instead of the regular, multi-line, indented jsdoc
           * block which will otherwise be added. Defaults to an empty array. Contexts
           * may also have their own `minLineCount` property which is an integer
           * indicating a minimum number of lines expected for a node in order
           * for it to require documentation.
           *
           * Note that you may need to disable `require` items (e.g., `MethodDefinition`)
           * if you are specifying a more precise form in `contexts` (e.g., `MethodDefinition:not([accessibility="private"] > FunctionExpression`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                context?: string;
                inlineCommentBlock?: boolean;
                minLineCount?: number;
              }
          )[];
          /**
           * A boolean on whether to enable the fixer (which adds an empty JSDoc block).
           * Defaults to `true`.
           */
          enableFixer?: boolean;
          /**
           * When `true`, the rule will not report missing JSDoc blocks above constructors
           * with no parameters or return values (this is enabled by default as the class
           * name or description should be seen as sufficient to convey intent).
           *
           * Defaults to `true`.
           */
          exemptEmptyConstructors?: boolean;
          /**
           * When `true`, the rule will not report missing JSDoc blocks above
           * functions/methods with no parameters or return values (intended where
           * function/method names are sufficient for themselves as documentation).
           *
           * Defaults to `false`.
           */
          exemptEmptyFunctions?: boolean;
          /**
           * If set to `true` will avoid checking an overloaded function's implementation.
           *
           * Defaults to `false`.
           */
          exemptOverloadedImplementations?: boolean;
          /**
           * An optional message to add to the inserted JSDoc block. Defaults to the
           * empty string.
           */
          fixerMessage?: string;
          /**
           * An integer to indicate a minimum number of lines expected for a node in order
           * for it to require documentation. Defaults to `undefined`. This option will
           * apply to any context; see `contexts` for line counts specific to a context.
           */
          minLineCount?: number;
          /**
           * This option will insist that missing JSDoc blocks are only reported for
           * function bodies / class declarations that are exported from the module.
           * May be a boolean or object. If set to `true`, the defaults below will be
           * used. If unset, JSDoc block reporting will not be limited to exports.
           *
           * This object supports the following optional boolean keys (`false` unless
           * otherwise noted):
           *
           * - `ancestorsOnly` - Optimization to only check node ancestors to check if node is exported
           * - `esm` - ESM exports are checked for JSDoc comments (Defaults to `true`)
           * - `cjs` - CommonJS exports are checked for JSDoc comments  (Defaults to `true`)
           * - `window` - Window global exports are checked for JSDoc comments
           */
          publicOnly?:
            | boolean
            | {
                ancestorsOnly?: boolean;
                cjs?: boolean;
                esm?: boolean;
                window?: boolean;
              };
          /**
           * An object with the following optional boolean keys which all default to
           * `false` except for `FunctionDeclaration` which defaults to `true`.
           */
          require?: {
            /**
             * Whether to check arrow functions like `() => {}`
             */
            ArrowFunctionExpression?: boolean;
            /**
             * Whether to check declarations like `class A {}`
             */
            ClassDeclaration?: boolean;
            /**
             * Whether to check class expressions like `const myClass = class {}`
             */
            ClassExpression?: boolean;
            /**
             * Whether to check function declarations like `function a {}`
             */
            FunctionDeclaration?: boolean;
            /**
             * Whether to check function expressions like `const a = function {}`
             */
            FunctionExpression?: boolean;
            /**
             * Whether to check method definitions like `class A { someMethodDefinition () {} }`
             */
            MethodDefinition?: boolean;
          };
          /**
           * If `true`, will skip above uncommented overloaded functions to check
           * for a comment block (e.g., at the top of a set of overloaded functions).
           *
           * If `false`, will force each overloaded function to be checked for a
           * comment block.
           *
           * Defaults to `true`.
           */
          skipInterveningOverloadedDeclarations?: boolean;
        }
      ];

  /** Requires a description for `@next` tags */
  "jsdoc/require-next-description": [];

  /** Requires a type for `@next` tags */
  "jsdoc/require-next-type": [];

  /** Requires that all function parameters are documented with a `@param` tag. */
  "jsdoc/require-param": 
    | []
    | [
        {
          /**
           * Numeric to indicate the number at which to begin auto-incrementing roots.
           * Defaults to `0`.
           */
          autoIncrementBase?: number;
          /**
           * A value indicating whether `constructor`s should be checked. Defaults to
           * `true`.
           */
          checkConstructors?: boolean;
          /**
           * Whether to require destructured properties. Defaults to `true`.
           */
          checkDestructured?: boolean;
          /**
           * Whether to check the existence of a corresponding `@param` for root objects
           * of destructured properties (e.g., that for `function ({a, b}) {}`, that there
           * is something like `@param myRootObj` defined that can correspond to
           * the `{a, b}` object parameter).
           *
           * If `checkDestructuredRoots` is `false`, `checkDestructured` will also be
           * implied to be `false` (i.e., the inside of the roots will not be checked
           * either, e.g., it will also not complain if `a` or `b` do not have their own
           * documentation). Defaults to `true`.
           */
          checkDestructuredRoots?: boolean;
          /**
           * A value indicating whether getters should be checked. Defaults to `false`.
           */
          checkGetters?: boolean;
          /**
           * If set to `true`, will report (and add fixer insertions) for missing rest
           * properties. Defaults to `false`.
           *
           * If set to `true`, note that you can still document the subproperties of the
           * rest property using other jsdoc features, e.g., `@typedef`:
           *
           * ```js
           * /**
           *  * @typedef ExtraOptions
           *  * @property innerProp1
           *  * @property innerProp2
           *  * /
           *
           * /**
           *  * @param cfg
           *  * @param cfg.num
           *  * @param {ExtraOptions} extra
           *  * /
           * function quux ({num, ...extra}) {
           * }
           * ```
           *
           * Setting this option to `false` (the default) may be useful in cases where
           * you already have separate `@param` definitions for each of the properties
           * within the rest property.
           *
           * For example, with the option disabled, this will not give an error despite
           * `extra` not having any definition:
           *
           * ```js
           * /**
           *  * @param cfg
           *  * @param cfg.num
           *  * /
           * function quux ({num, ...extra}) {
           * }
           * ```
           *
           * Nor will this:
           *
           * ```js
           * /**
           *  * @param cfg
           *  * @param cfg.num
           *  * @param cfg.innerProp1
           *  * @param cfg.innerProp2
           *  * /
           * function quux ({num, ...extra}) {
           * }
           * ```
           */
          checkRestProperty?: boolean;
          /**
           * A value indicating whether setters should be checked. Defaults to `false`.
           */
          checkSetters?: boolean;
          /**
           * When one specifies a type, unless it is of a generic type, like `object`
           * or `array`, it may be considered unnecessary to have that object's
           * destructured components required, especially where generated docs will
           * link back to the specified type. For example:
           *
           * ```js
           * /**
           *  * @param {SVGRect} bbox - a SVGRect
           *  * /
           * export const bboxToObj = function ({x, y, width, height}) {
           *   return {x, y, width, height};
           * };
           * ```
           *
           * By default `checkTypesPattern` is set to
           * `/^(?:[oO]bject|[aA]rray|PlainObject|Generic(?:Object|Array))$/v`,
           * meaning that destructuring will be required only if the type of the `@param`
           * (the text between curly brackets) is a match for "Object" or "Array" (with or
           * without initial caps), "PlainObject", or "GenericObject", "GenericArray" (or
           * if no type is present). So in the above example, the lack of a match will
           * mean that no complaint will be given about the undocumented destructured
           * parameters.
           *
           * Note that the `/` delimiters are optional, but necessary to add flags.
           *
           * Defaults to using (only) the `v` flag, so to add your own flags, encapsulate
           * your expression as a string, but like a literal, e.g., `/^object$/vi`.
           *
           * You could set this regular expression to a more expansive list, or you
           * could restrict it such that even types matching those strings would not
           * need destructuring.
           */
          checkTypesPattern?: string;
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). May be useful for adding such as
           * `TSMethodSignature` in TypeScript or restricting the contexts
           * which are checked.
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * Whether to enable the fixer. Defaults to `true`.
           */
          enableFixer?: boolean;
          /**
           * Whether to enable the rest element fixer.
           *
           * The fixer will automatically report/insert
           * [JSDoc repeatable parameters](https://jsdoc.app/tags-param.html#multiple-types-and-repeatable-parameters)
           * if missing.
           *
           * ```js
           * /**
           *   * @param {GenericArray} cfg
           *   * @param {number} cfg."0"
           *  * /
           * function baar ([a, ...extra]) {
           *   //
           * }
           * ```
           *
           * ...becomes:
           *
           * ```js
           * /**
           *   * @param {GenericArray} cfg
           *   * @param {number} cfg."0"
           *   * @param {...any} cfg."1"
           *  * /
           * function baar ([a, ...extra]) {
           *   //
           * }
           * ```
           *
           * Note that the type `any` is included since we don't know of any specific
           * type to use.
           *
           * Defaults to `true`.
           */
          enableRestElementFixer?: boolean;
          /**
           * Whether to enable the auto-adding of incrementing roots.
           *
           * The default behavior of `true` is for "root" to be auto-inserted for missing
           * roots, followed by a 0-based auto-incrementing number.
           *
           * So for:
           *
           * ```js
           * function quux ({foo}, {bar}, {baz}) {
           * }
           * ```
           *
           * ...the default JSDoc that would be added if the fixer is enabled would be:
           *
           * ```js
           * /**
           * * @param root0
           * * @param root0.foo
           * * @param root1
           * * @param root1.bar
           * * @param root2
           * * @param root2.baz
           * * /
           * ```
           *
           * Has no effect if `enableFixer` is set to `false`.
           */
          enableRootFixer?: boolean;
          /**
           * Array of tags (e.g., `['type']`) whose presence on the document block
           * avoids the need for a `@param`. Defaults to an array with
           * `inheritdoc`. If you set this array, it will overwrite the default,
           * so be sure to add back `inheritdoc` if you wish its presence to cause
           * exemption of the rule.
           */
          exemptedBy?: string[];
          /**
           * Set to `true` to ignore reporting when all params are missing. Defaults to
           * `false`.
           */
          ignoreWhenAllParamsMissing?: boolean;
          /**
           * Set if you wish TypeScript interfaces to exempt checks for the existence of
           * `@param`'s.
           *
           * Will check for a type defining the function itself (on a variable
           * declaration) or if there is a single destructured object with a type.
           * Defaults to `false`.
           */
          interfaceExemptsParamsCheck?: boolean;
          /**
           * An array of root names to use in the fixer when roots are missing. Defaults
           * to `['root']`. Note that only when all items in the array besides the last
           * are exhausted will auto-incrementing occur. So, with
           * `unnamedRootBase: ['arg', 'config']`, the following:
           *
           * ```js
           * function quux ({foo}, [bar], {baz}) {
           * }
           * ```
           *
           * ...will get the following JSDoc block added:
           *
           * ```js
           * /**
           * * @param arg
           * * @param arg.foo
           * * @param config0
           * * @param config0."0" (`bar`)
           * * @param config1
           * * @param config1.baz
           * * /
           * ```
           */
          unnamedRootBase?: string[];
          /**
           * Set to `true` if you wish to expect documentation of properties on objects
           * supplied as default values. Defaults to `false`.
           */
          useDefaultObjectProperties?: boolean;
        }
      ];

  /** Requires that each `@param` tag has a `description` value. */
  "jsdoc/require-param-description": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * The description string to set by default for destructured roots. Defaults to
           * "The root object".
           */
          defaultDestructuredRootDescription?: string;
          /**
           * Whether to set a default destructured root description. For example, you may
           * wish to avoid manually having to set the description for a `@param`
           * corresponding to a destructured root object as it should always be the same
           * type of object. Uses `defaultDestructuredRootDescription` for the description
           * string. Defaults to `false`.
           */
          setDefaultDestructuredRootDescription?: boolean;
        }
      ];

  /** Requires that all `@param` tags have names. */
  "jsdoc/require-param-name": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
        }
      ];

  /** Requires that each `@param` tag has a type value (in curly brackets). */
  "jsdoc/require-param-type": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * The type string to set by default for destructured roots. Defaults to "object".
           */
          defaultDestructuredRootType?: string;
          /**
           * Whether to set a default destructured root type. For example, you may wish
           * to avoid manually having to set the type for a `@param`
           * corresponding to a destructured root object as it is always going to be an
           * object. Uses `defaultDestructuredRootType` for the type string. Defaults to
           * `false`.
           */
          setDefaultDestructuredRootType?: boolean;
        }
      ];

  /** Requires that all `@typedef` and `@namespace` tags have `@property` when their type is a plain `object`, `Object`, or `PlainObject`. */
  "jsdoc/require-property": [];

  /** Requires that each `@property` tag has a `description` value. */
  "jsdoc/require-property-description": [];

  /** Requires that all `@property` tags have names. */
  "jsdoc/require-property-name": [];

  /** Requires that each `@property` tag has a type value (in curly brackets). */
  "jsdoc/require-property-type": [];

  /** Requires that returns are documented with `@returns`. */
  "jsdoc/require-returns": 
    | []
    | [
        {
          /**
           * A value indicating whether `constructor`s should
           * be checked for `@returns` tags. Defaults to `false`.
           */
          checkConstructors?: boolean;
          /**
           * Boolean to determine whether getter methods should
           * be checked for `@returns` tags. Defaults to `true`.
           */
          checkGetters?: boolean;
          /**
           * Set this to an array of strings representing the AST context
           * (or objects with optional `context` and `comment` properties) where you wish
           * the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`). This
           * rule will only apply on non-default contexts when there is such a tag
           * present and the `forceRequireReturn` option is set or if the
           * `forceReturnsWithAsync` option is set with a present `@async` tag
           * (since we are not checking against the actual `return` values in these
           * cases).
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
                forceRequireReturn?: boolean;
              }
          )[];
          /**
           * Whether to enable the fixer to add a blank `@returns`.
           * Defaults to `false`.
           */
          enableFixer?: boolean;
          /**
           * Array of tags (e.g., `['type']`) whose presence on the
           * document block avoids the need for a `@returns`. Defaults to an array
           * with `inheritdoc`. If you set this array, it will overwrite the default,
           * so be sure to add back `inheritdoc` if you wish its presence to cause
           * exemption of the rule.
           */
          exemptedBy?: string[];
          /**
           * Set to `true` to always insist on
           * `@returns` documentation regardless of implicit or explicit `return`'s
           * in the function. May be desired to flag that a project is aware of an
           * `undefined`/`void` return. Defaults to `false`.
           */
          forceRequireReturn?: boolean;
          /**
           * By default `async` functions that do not explicitly
           * return a value pass this rule as an `async` function will always return a
           * `Promise`, even if the `Promise` resolves to void. You can force all
           * `async` functions (including ones with an explicit `Promise` but no
           * detected non-`undefined` `resolve` value) to require `@return`
           * documentation by setting `forceReturnsWithAsync` to `true` on the options
           * object. This may be useful for flagging that there has been consideration
           * of return type. Defaults to `false`.
           */
          forceReturnsWithAsync?: boolean;
          /**
           * This option will insist that missing `@returns` are only reported for
           * function bodies / class declarations that are exported from the module.
           * May be a boolean or object. If set to `true`, the defaults below will be
           * used. If unset, `@returns` reporting will not be limited to exports.
           *
           * This object supports the following optional boolean keys (`false` unless
           * otherwise noted):
           *
           * - `ancestorsOnly` - Optimization to only check node ancestors to check if node is exported
           * - `esm` - ESM exports are checked for `@returns` JSDoc comments (Defaults to `true`)
           * - `cjs` - CommonJS exports are checked for `@returns` JSDoc comments  (Defaults to `true`)
           * - `window` - Window global exports are checked for `@returns` JSDoc comments
           */
          publicOnly?:
            | boolean
            | {
                ancestorsOnly?: boolean;
                cjs?: boolean;
                esm?: boolean;
                window?: boolean;
              };
        }
      ];

  /** Requires a return statement in function body if a `@returns` tag is specified in JSDoc comment(and reports if multiple `@returns` tags are present). */
  "jsdoc/require-returns-check": 
    | []
    | [
        {
          /**
           * By default, functions which return a `Promise` that are not
           * detected as resolving with a non-`undefined` value and `async` functions
           * (even ones that do not explicitly return a value, as these are returning a
           * `Promise` implicitly) will be exempted from reporting by this rule.
           * If you wish to insist that only `Promise`'s which resolve to
           * non-`undefined` values or `async` functions with explicit `return`'s will
           * be exempted from reporting (i.e., that `async` functions can be reported
           * if they lack an explicit (non-`undefined`) `return` when a `@returns` is
           * present), you can set `exemptAsync` to `false` on the options object.
           */
          exemptAsync?: boolean;
          /**
           * Because a generator might be labeled as having a
           * `IterableIterator` `@returns` value (along with an iterator type
           * corresponding to the type of any `yield` statements), projects might wish to
           * leverage `@returns` in generators even without a `return` statement. This
           * option is therefore `true` by default in `typescript` mode (in "jsdoc" mode,
           * one might be more likely to take advantage of `@yields`). Set it to `false`
           * if you wish for a missing `return` to be flagged regardless.
           */
          exemptGenerators?: boolean;
          /**
           * Whether to check that async functions do not
           * indicate they return non-native types. Defaults to `true`.
           */
          noNativeTypes?: boolean;
          /**
           * If `true` and no return or
           * resolve value is found, this setting will even insist that reporting occur
           * with `void` or `undefined` (including as an indicated `Promise` type).
           * Unlike `require-returns`, with this option in the rule, one can
           * *discourage* the labeling of `undefined` types. Defaults to `false`.
           */
          reportMissingReturnForUndefinedTypes?: boolean;
        }
      ];

  /** Requires that the `@returns` tag has a `description` value (not including `void`/`undefined` type returns). */
  "jsdoc/require-returns-description": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
        }
      ];

  /** Requires that `@returns` tag has type value (in curly brackets). */
  "jsdoc/require-returns-type": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context (or an object with
           * optional `context` and `comment` properties) where you wish the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           *
           * See the ["AST and Selectors"](../#advanced-ast-and-selectors)
           * section of our Advanced docs for more on the expected format.
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
        }
      ];

  /** Requires tags be present, optionally for specific contexts */
  "jsdoc/require-tags": 
    | []
    | [
        {
          /**
           * May be an array of either strings or objects with
           * a string `tag` property and `context` string property.
           */
          tags?: (
            | string
            | {
                context?: string;
                tag?: string;
                [k: string]: unknown;
              }
          )[];
        }
      ];

  /** Requires `@template` tags be present when type parameters are used. */
  "jsdoc/require-template": 
    | []
    | [
        {
          /**
           * Array of tags (e.g., `['type']`) whose presence on the document
           * block avoids the need for a `@template`. Defaults to an array with
           * `inheritdoc`. If you set this array, it will overwrite the default,
           * so be sure to add back `inheritdoc` if you wish its presence to cause
           * exemption of the rule.
           */
          exemptedBy?: string[];
          /**
           * Requires that each template have its own separate line, i.e., preventing
           * templates of this format:
           *
           * ```js
           * /**
           *  * @template T, U, V
           *  * /
           * ```
           *
           * Defaults to `false`.
           */
          requireSeparateTemplates?: boolean;
        }
      ];

  /** Requires a description for `@template` tags */
  "jsdoc/require-template-description": [];

  /** Requires that throw statements are documented with `@throws` tags. */
  "jsdoc/require-throws": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context
           * (or objects with optional `context` and `comment` properties) where you wish
           * the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`).
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * Array of tags (e.g., `['type']`) whose presence on the
           * document block avoids the need for a `@throws`. Defaults to an array
           * with `inheritdoc`. If you set this array, it will overwrite the default,
           * so be sure to add back `inheritdoc` if you wish its presence to cause
           * exemption of the rule.
           */
          exemptedBy?: string[];
        }
      ];

  /** Requires a description for `@throws` tags */
  "jsdoc/require-throws-description": [];

  /** Requires a type for `@throws` tags */
  "jsdoc/require-throws-type": [];

  /** Requires yields are documented with `@yields` tags. */
  "jsdoc/require-yields": 
    | []
    | [
        {
          /**
           * Set this to an array of strings representing the AST context
           * (or objects with optional `context` and `comment` properties) where you wish
           * the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`). Set to `"any"` if you want
           * the rule to apply to any JSDoc block throughout your files (as is necessary
           * for finding function blocks not attached to a function declaration or
           * expression, i.e., `@callback` or `@function` (or its aliases `@func` or
           * `@method`) (including those associated with an `@interface`). This
           * rule will only apply on non-default contexts when there is such a tag
           * present and the `forceRequireYields` option is set or if the
           * `withGeneratorTag` option is set with a present `@generator` tag
           * (since we are not checking against the actual `yield` values in these
           * cases).
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * Array of tags (e.g., `['type']`) whose presence on the
           * document block avoids the need for a `@yields`. Defaults to an array
           * with `inheritdoc`. If you set this array, it will overwrite the default,
           * so be sure to add back `inheritdoc` if you wish its presence to cause
           * exemption of the rule.
           */
          exemptedBy?: string[];
          /**
           * Set to `true` to always insist on
           * `@next` documentation even if there are no `yield` statements in the
           * function or none return values. May be desired to flag that a project is
           * aware of the expected yield return being `undefined`. Defaults to `false`.
           */
          forceRequireNext?: boolean;
          /**
           * Set to `true` to always insist on
           * `@yields` documentation for generators even if there are only
           * expressionless `yield` statements in the function. May be desired to flag
           * that a project is aware of an `undefined`/`void` yield. Defaults to
           * `false`.
           */
          forceRequireYields?: boolean;
          /**
           * If `true`, this option will insist that any use of a `yield` return
           * value (e.g., `const rv = yield;` or `const rv = yield value;`) has a
           * (non-standard) `@next` tag (in addition to any `@yields` tag) so as to be
           * able to document the type expected to be supplied into the iterator
           * (the `Generator` iterator that is returned by the call to the generator
           * function) to the iterator (e.g., `it.next(value)`). The tag will not be
           * expected if the generator function body merely has plain `yield;` or
           * `yield value;` statements without returning the values. Defaults to
           * `false`.
           */
          next?: boolean;
          /**
           * If a `@generator` tag is present on a block, require
           * (non-standard ) `@next` (see `next` option). This will require using `void`
           * or `undefined` in cases where generators do not use the `next()`-supplied
           * incoming `yield`-returned value. Defaults to `false`. See `contexts` to
           * `any` if you want to catch `@generator` with `@callback` or such not
           * attached to a function.
           */
          nextWithGeneratorTag?: boolean;
          /**
           * If a `@generator` tag is present on a block, require
           * `@yields`/`@yield`. Defaults to `true`. See `contexts` to `any` if you want
           * to catch `@generator` with `@callback` or such not attached to a function.
           */
          withGeneratorTag?: boolean;
        }
      ];

  /** Ensures that if a `@yields` is present that a `yield` (or `yield` with a value) is present in the function body (or that if a `@next` is present that there is a yield with a return value present). */
  "jsdoc/require-yields-check": 
    | []
    | [
        {
          /**
           * Avoids checking the function body and merely insists
           * that all generators have `@yields`. This can be an optimization with the
           * ESLint `require-yield` rule, as that rule already ensures a `yield` is
           * present in generators, albeit assuming the generator is not empty).
           * Defaults to `false`.
           */
          checkGeneratorsOnly?: boolean;
          /**
           * Set this to an array of strings representing the AST context
           * (or objects with optional `context` and `comment` properties) where you wish
           * the rule to be applied.
           *
           * `context` defaults to `any` and `comment` defaults to no specific comment context.
           *
           * Overrides the default contexts (`ArrowFunctionExpression`, `FunctionDeclaration`,
           * `FunctionExpression`).
           */
          contexts?: (
            | string
            | {
                comment?: string;
                context?: string;
              }
          )[];
          /**
           * If `true`, this option will insist that any use of a (non-standard)
           * `@next` tag (in addition to any `@yields` tag) will be matched by a `yield`
           * which uses a return value in the body of the generator (e.g.,
           * `const rv = yield;` or `const rv = yield value;`). This (non-standard)
           * tag is intended to be used to indicate a type and/or description of
           * the value expected to be supplied by the user when supplied to the iterator
           * by its `next` method, as with `it.next(value)` (with the iterator being
           * the `Generator` iterator that is returned by the call to the generator
           * function). This option will report an error if the generator function body
           * merely has plain `yield;` or `yield value;` statements without returning
           * the values. Defaults to `false`.
           */
          next?: boolean;
        }
      ];

  /** Requires a description for `@yields` tags */
  "jsdoc/require-yields-description": [];

  /** Requires a type for `@yields` tags */
  "jsdoc/require-yields-type": [];

  /** Sorts tags by a specified sequence according to tag name, optionally adding line breaks between tag groups. */
  "jsdoc/sort-tags": 
    | []
    | [
        {
          /**
           * Defaults to `false`. Alphabetizes any items not within `tagSequence` after any
           * items within `tagSequence` (or in place of the special `-other` pseudo-tag)
           * are sorted.
           *
           * If you want all your tags alphabetized, you can supply an empty array for
           * `tagSequence` along with setting this option to `true`.
           */
          alphabetizeExtras?: boolean;
          /**
           * Indicates the number of lines to be added between tag groups. Defaults to 1.
           * Do not set to 0 or 2+ if you are using `tag-lines` and `"always"` and do not
           * set to 1+ if you are using `tag-lines` and `"never"`.
           */
          linesBetween?: number;
          /**
           * Whether to enable reporting and fixing of line breaks within tags of a given
           * tag group. Defaults to `true` which will remove any line breaks at the end of
           * such tags. Do not use with `true` if you are using `tag-lines` and `always`.
           */
          reportIntraTagGroupSpacing?: boolean;
          /**
           * Whether to enable reporting and fixing of line breaks between tag groups
           * as set by `linesBetween`. Defaults to `true`. Note that the very last tag
           * will not have spacing applied regardless. For adding line breaks there, you
           * may wish to use the `endLines` option of the `tag-lines` rule.
           */
          reportTagGroupSpacing?: boolean;
          /**
           * Allows specification by tag of a specific higher maximum number of lines. Keys are tags and values are the maximum number of lines allowed for such tags. Overrides `linesBetween`. Defaults to no special exceptions per tag.
           */
          tagExceptions?: {
            /**
             * This interface was referenced by `undefined`'s JSON-Schema definition
             * via the `patternProperty` ".*".
             */
            [k: string]: number;
          };
          /**
           * An array of tag group objects indicating the preferred sequence for sorting tags.
           *
           * Each item in the array should be an object with a `tags` property set to an array
           * of tag names.
           *
           * Tag names earlier in the list will be arranged first. The relative position of
           * tags of the same name will not be changed.
           *
           * Earlier groups will also be arranged before later groups, but with the added
           * feature that additional line breaks may be added between (or before or after)
           * such groups (depending on the setting of `linesBetween`).
           *
           * Tag names not in the list will be grouped together at the end. The pseudo-tag
           * `-other` can be used to place them anywhere else if desired. The tags will be
           * placed in their order of appearance, or alphabetized if `alphabetizeExtras`
           * is enabled, see more below about that option.
           *
           * Defaults to the array below (noting that it is just a single tag group with
           * no lines between groups by default).
           *
           * Please note that this order is still experimental, so if you want to retain
           * a fixed order that doesn't change into the future, supply your own
           * `tagSequence`.
           *
           * ```js
           * [{tags: [
           *   // Brief descriptions
           *   'summary',
           *   'typeSummary',
           *
           *   // Module/file-level
           *   'module',
           *   'exports',
           *   'file',
           *   'fileoverview',
           *   'overview',
           *   'import',
           *
           *   // Identifying (name, type)
           *   'typedef',
           *   'interface',
           *   'record',
           *   'template',
           *   'name',
           *   'kind',
           *   'type',
           *   'alias',
           *   'external',
           *   'host',
           *   'callback',
           *   'func',
           *   'function',
           *   'method',
           *   'class',
           *   'constructor',
           *
           *   // Relationships
           *   'modifies',
           *   'mixes',
           *   'mixin',
           *   'mixinClass',
           *   'mixinFunction',
           *   'namespace',
           *   'borrows',
           *   'constructs',
           *   'lends',
           *   'implements',
           *   'requires',
           *
           *   // Long descriptions
           *   'desc',
           *   'description',
           *   'classdesc',
           *   'tutorial',
           *   'copyright',
           *   'license',
           *
           *   // Simple annotations
           *   'const',
           *   'constant',
           *   'final',
           *   'global',
           *   'readonly',
           *   'abstract',
           *   'virtual',
           *   'var',
           *   'member',
           *   'memberof',
           *   'memberof!',
           *   'inner',
           *   'instance',
           *   'inheritdoc',
           *   'inheritDoc',
           *   'override',
           *   'hideconstructor',
           *
           *   // Core function/object info
           *   'param',
           *   'arg',
           *   'argument',
           *   'prop',
           *   'property',
           *   'return',
           *   'returns',
           *
           *   // Important behavior details
           *   'async',
           *   'generator',
           *   'default',
           *   'defaultvalue',
           *   'enum',
           *   'augments',
           *   'extends',
           *   'throws',
           *   'exception',
           *   'yield',
           *   'yields',
           *   'event',
           *   'fires',
           *   'emits',
           *   'listens',
           *   'this',
           *
           *   // Access
           *   'static',
           *   'private',
           *   'protected',
           *   'public',
           *   'access',
           *   'package',
           *
           *   '-other',
           *
           *   // Supplementary descriptions
           *   'see',
           *   'example',
           *
           *   // METADATA
           *
           *   // Other Closure (undocumented) metadata
           *   'closurePrimitive',
           *   'customElement',
           *   'expose',
           *   'hidden',
           *   'idGenerator',
           *   'meaning',
           *   'ngInject',
           *   'owner',
           *   'wizaction',
           *
           *   // Other Closure (documented) metadata
           *   'define',
           *   'dict',
           *   'export',
           *   'externs',
           *   'implicitCast',
           *   'noalias',
           *   'nocollapse',
           *   'nocompile',
           *   'noinline',
           *   'nosideeffects',
           *   'polymer',
           *   'polymerBehavior',
           *   'preserve',
           *   'struct',
           *   'suppress',
           *   'unrestricted',
           *
           *   // @homer0/prettier-plugin-jsdoc metadata
           *   'category',
           *
           *   // Non-Closure metadata
           *   'ignore',
           *   'author',
           *   'version',
           *   'variation',
           *   'since',
           *   'deprecated',
           *   'todo',
           * ]}];
           * ```
           */
          tagSequence?: {
            /**
             * See description on `tagSequence`.
             */
            tags?: string[];
          }[];
        }
      ];

  /** Enforces lines (or no lines) before, after, or between tags. */
  "jsdoc/tag-lines": 
    | []
    | ["always" | "any" | "never"]
    | [
        "always" | "any" | "never",
        {
          /**
           * Set to `false` and use with "always" to indicate the normal lines to be
           * added after tags should not be added after the final tag.
           *
           * Defaults to `true`.
           */
          applyToEndTag?: boolean;
          /**
           * Use with "always" to indicate the number of lines to require be present.
           *
           * Defaults to 1.
           */
          count?: number;
          /**
           * If not set to `null`, will enforce end lines to the given count on the
           * final tag only.
           *
           * Defaults to `0`.
           */
          endLines?: number | null;
          /**
           * If not set to `null`, will enforce a maximum number of lines to the given count anywhere in the block description.
           *
           * Note that if non-`null`, `maxBlockLines` must be greater than or equal to `startLines`.
           *
           * Defaults to `null`.
           */
          maxBlockLines?: number | null;
          /**
           * If not set to `null`, will enforce end lines to the given count before the
           * first tag only, unless there is only whitespace content, in which case,
           * a line count will not be enforced.
           *
           * Defaults to `0`.
           */
          startLines?: number | null;
          /**
           * Overrides the default behavior depending on specific tags.
           *
           * An object whose keys are tag names and whose values are objects with the
           * following keys:
           *
           * 1. `lines` - Set to `always`, `never`, or `any` to override.
           * 2. `count` - Overrides main `count` (for "always")
           *
           * Defaults to empty object.
           */
          tags?: {
            /**
             * This interface was referenced by `undefined`'s JSON-Schema definition
             * via the `patternProperty` ".*".
             */
            [k: string]: {
              count?: number;
              lines?: "always" | "never" | "any";
            };
          };
        }
      ];

  /** Auto-escape certain characters that are input within block and tag descriptions. */
  "jsdoc/text-escaping": 
    | []
    | [
        {
          /**
           * This option escapes all `<` and `&` characters (except those followed by
           * whitespace which are treated as literals by Visual Studio Code). Defaults to
           * `false`.
           */
          escapeHTML?: boolean;
          /**
           * This option escapes the first backtick (`` ` ``) in a paired sequence.
           * Defaults to `false`.
           */
          escapeMarkdown?: boolean;
        }
      ];

  /** Prefers either function properties or method signatures */
  "jsdoc/ts-method-signature-style": 
    | []
    | ["method" | "property"]
    | [
        "method" | "property",
        {
          /**
           * Whether to enable the fixer. Defaults to `true`.
           */
          enableFixer?: boolean;
        }
      ];

  /** Warns against use of the empty object type */
  "jsdoc/ts-no-empty-object-type": [];

  /** Catches unnecessary template expressions such as string expressions within a template literal. */
  "jsdoc/ts-no-unnecessary-template-expression": 
    | []
    | [
        {
          /**
           * Whether to enable the fixer. Defaults to `true`.
           */
          enableFixer?: boolean;
        }
      ];

  /** Prefers function types over call signatures when there are no other properties. */
  "jsdoc/ts-prefer-function-type": 
    | []
    | [
        {
          /**
           * Whether to enable the fixer or not
           */
          enableFixer?: boolean;
        }
      ];

  /** Formats JSDoc type values. */
  "jsdoc/type-formatting": 
    | []
    | [
        {
          /**
           * Determines how array generics are represented. Set to `angle` for the style `Array<type>` or `square` for the style `type[]`. Defaults to "square".
           */
          arrayBrackets?: "angle" | "square";
          /**
           * The space character (if any) to use after return markers (`=>`). Defaults to " ".
           */
          arrowFunctionPostReturnMarkerSpacing?: string;
          /**
           * The space character (if any) to use before return markers (`=>`). Defaults to " ".
           */
          arrowFunctionPreReturnMarkerSpacing?: string;
          /**
           * Whether to enable the fixer. Defaults to `true`.
           */
          enableFixer?: boolean;
          /**
           * The space character (if any) to use between function or class parameters. Defaults to " ".
           */
          functionOrClassParameterSpacing?: string;
          /**
           * The space character (if any) to use after a generic expression in a function or class. Defaults to "".
           */
          functionOrClassPostGenericSpacing?: string;
          /**
           * The space character (if any) to use after return markers (`:`). Defaults to "".
           */
          functionOrClassPostReturnMarkerSpacing?: string;
          /**
           * The space character (if any) to use before return markers (`:`). Defaults to "".
           */
          functionOrClassPreReturnMarkerSpacing?: string;
          /**
           * The space character (if any) to use between type parameters in a function or class. Defaults to " ".
           */
          functionOrClassTypeParameterSpacing?: string;
          /**
           * The space character (if any) to use between elements in generics and tuples. Defaults to " ".
           */
          genericAndTupleElementSpacing?: string;
          /**
           * Boolean value of whether to use a dot before the angled brackets of a generic (e.g., `SomeType.<AnotherType>`). Defaults to `false`.
           */
          genericDot?: boolean;
          /**
           * The amount of spacing (if any) after the colon of a key-value or object-field pair. Defaults to " ".
           */
          keyValuePostColonSpacing?: string;
          /**
           * The amount of spacing (if any) immediately after keys in a key-value or object-field pair. Defaults to "".
           */
          keyValuePostKeySpacing?: string;
          /**
           * The amount of spacing (if any) after the optional operator (`?`) in a key-value or object-field pair. Defaults to "".
           */
          keyValuePostOptionalSpacing?: string;
          /**
           * The amount of spacing (if any) after a variadic operator (`...`) in a key-value pair. Defaults to "".
           */
          keyValuePostVariadicSpacing?: string;
          /**
           * The style of quotation mark for surrounding method names when quoted. Defaults to `double`
           */
          methodQuotes?: "double" | "single";
          /**
           * A string indicating the whitespace to be added on each line preceding an
           * object property-value field. Defaults to the empty string.
           */
          objectFieldIndent?: string;
          /**
           * Whether and how object field properties should be quoted (e.g., `{"a": string}`).
           * Set to `single`, `double`, or `null`. Defaults to `null` (no quotes unless
           * required due to special characters within the field). Digits will be kept as is,
           * regardless of setting (they can either represent a digit or a string digit).
           */
          objectFieldQuote?: "double" | "single" | null;
          /**
           * For object properties, specify whether a "semicolon", "comma", "linebreak",
           * "semicolon-and-linebreak", or "comma-and-linebreak" should be used after
           * each object property-value pair.
           *
           * Defaults to `"comma"`.
           */
          objectFieldSeparator?: "comma" | "comma-and-linebreak" | "linebreak" | "semicolon" | "semicolon-and-linebreak";
          /**
           * Whether `objectFieldSeparator` set to `"semicolon-and-linebreak"` or
           * `"comma-and-linebreak"` should be allowed to optionally drop the linebreak.
           *
           * Defaults to `true`.
           */
          objectFieldSeparatorOptionalLinebreak?: boolean;
          /**
           * If `separatorForSingleObjectField` is not in effect (i.e., if it is `false`
           * or there are multiple property-value object fields present), this property
           * will determine whether to add punctuation corresponding to the
           * `objectFieldSeparator` (e.g., a semicolon) to the final object field.
           * Defaults to `false`.
           */
          objectFieldSeparatorTrailingPunctuation?: boolean;
          /**
           * The space character (if any) to use between the equal signs of a default value. Defaults to " ".
           */
          parameterDefaultValueSpacing?: string;
          /**
           * The space character (if any) to add after a method name. Defaults to "".
           */
          postMethodNameSpacing?: string;
          /**
           * The space character (if any) to add after "new" in a constructor. Defaults to " ".
           */
          postNewSpacing?: string;
          /**
           * Whether to apply the `objectFieldSeparator` (e.g., a semicolon) when there
           * is only one property-value object field present. Defaults to `false`.
           */
          separatorForSingleObjectField?: boolean;
          /**
           * How string literals should be quoted (e.g., `"abc"`). Set to `single`
           * or `double`. Defaults to 'double'.
           */
          stringQuotes?: "double" | "single";
          /**
           * A string of spaces that will be added immediately after the type's initial
           * curly bracket and immediately before its ending curly bracket. Defaults
           * to the empty string.
           */
          typeBracketSpacing?: string;
          /**
           * Determines the spacing to add to unions (`|`). Defaults to a single space (`" "`).
           */
          unionSpacing?: string;
        }
      ];

  /** Requires all types/namepaths to be valid JSDoc, Closure compiler, or TypeScript types (configurable in settings). */
  "jsdoc/valid-types": 
    | []
    | [
        {
          /**
           * Set to `false` to bulk disallow
           * empty name paths with namepath groups 2 and 4 (these might often be
           * expected to have an accompanying name path, though they have some
           * indicative value without one; these may also allow names to be defined
           * in another manner elsewhere in the block); you can use
           * `settings.jsdoc.structuredTags` with the `required` key set to "name" if you
           * wish to require name paths on a tag-by-tag basis. Defaults to `true`.
           */
          allowEmptyNamepaths?: boolean;
        }
      ];
}
