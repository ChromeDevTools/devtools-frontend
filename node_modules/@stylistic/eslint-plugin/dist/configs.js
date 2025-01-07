'use strict';

var utils = require('./utils.js');
var arrayBracketNewline = require('./rules/array-bracket-newline.js');
var arrayBracketSpacing = require('./rules/array-bracket-spacing.js');
var arrayElementNewline = require('./rules/array-element-newline.js');
var arrowParens = require('./rules/arrow-parens.js');
var arrowSpacing = require('./rules/arrow-spacing.js');
var blockSpacing = require('./rules/block-spacing.js');
var braceStyle = require('./rules/brace-style.js');
var commaDangle = require('./rules/comma-dangle.js');
var commaSpacing = require('./rules/comma-spacing.js');
var commaStyle = require('./rules/comma-style.js');
var computedPropertySpacing = require('./rules/computed-property-spacing.js');
var curlyNewline = require('./rules/curly-newline.js');
var dotLocation = require('./rules/dot-location.js');
var eolLast = require('./rules/eol-last.js');
var functionCallArgumentNewline = require('./rules/function-call-argument-newline.js');
var functionCallSpacing = require('./rules/function-call-spacing.js');
var functionParenNewline = require('./rules/function-paren-newline.js');
var generatorStarSpacing = require('./rules/generator-star-spacing.js');
var implicitArrowLinebreak = require('./rules/implicit-arrow-linebreak.js');
var indent = require('./rules/indent.js');
var indentBinaryOps = require('./rules/indent-binary-ops.js');
var jsxChildElementSpacing = require('./rules/jsx-child-element-spacing.js');
var jsxClosingBracketLocation = require('./rules/jsx-closing-bracket-location.js');
var jsxClosingTagLocation = require('./rules/jsx-closing-tag-location.js');
var jsxCurlyBracePresence = require('./rules/jsx-curly-brace-presence.js');
var jsxCurlyNewline = require('./rules/jsx-curly-newline.js');
var jsxCurlySpacing = require('./rules/jsx-curly-spacing.js');
var jsxEqualsSpacing = require('./rules/jsx-equals-spacing.js');
var jsxFirstPropNewLine = require('./rules/jsx-first-prop-new-line.js');
var jsxFunctionCallNewline = require('./rules/jsx-function-call-newline.js');
var jsxIndent = require('./rules/jsx-indent.js');
var jsxIndentProps = require('./rules/jsx-indent-props.js');
var jsxMaxPropsPerLine = require('./rules/jsx-max-props-per-line.js');
var jsxNewline = require('./rules/jsx-newline.js');
var jsxOneExpressionPerLine = require('./rules/jsx-one-expression-per-line.js');
var jsxPascalCase = require('./rules/jsx-pascal-case.js');
var jsxPropsNoMultiSpaces = require('./rules/jsx-props-no-multi-spaces.js');
var jsxQuotes = require('./rules/jsx-quotes.js');
var jsxSelfClosingComp = require('./rules/jsx-self-closing-comp.js');
var jsxSortProps = require('./rules/jsx-sort-props.js');
var jsxTagSpacing = require('./rules/jsx-tag-spacing.js');
var jsxWrapMultilines = require('./rules/jsx-wrap-multilines.js');
var keySpacing = require('./rules/key-spacing.js');
var keywordSpacing = require('./rules/keyword-spacing.js');
var lineCommentPosition = require('./rules/line-comment-position.js');
var linebreakStyle = require('./rules/linebreak-style.js');
var linesAroundComment = require('./rules/lines-around-comment.js');
var linesBetweenClassMembers = require('./rules/lines-between-class-members.js');
var maxLen = require('./rules/max-len.js');
var maxStatementsPerLine = require('./rules/max-statements-per-line.js');
var memberDelimiterStyle = require('./rules/member-delimiter-style.js');
var multilineCommentStyle = require('./rules/multiline-comment-style.js');
var multilineTernary = require('./rules/multiline-ternary.js');
var newParens = require('./rules/new-parens.js');
var newlinePerChainedCall = require('./rules/newline-per-chained-call.js');
var noConfusingArrow = require('./rules/no-confusing-arrow.js');
var noExtraParens = require('./rules/no-extra-parens.js');
var noExtraSemi = require('./rules/no-extra-semi.js');
var noFloatingDecimal = require('./rules/no-floating-decimal.js');
var noMixedOperators = require('./rules/no-mixed-operators.js');
var noMixedSpacesAndTabs = require('./rules/no-mixed-spaces-and-tabs.js');
var noMultiSpaces = require('./rules/no-multi-spaces.js');
var noMultipleEmptyLines = require('./rules/no-multiple-empty-lines.js');
var noTabs = require('./rules/no-tabs.js');
var noTrailingSpaces = require('./rules/no-trailing-spaces.js');
var noWhitespaceBeforeProperty = require('./rules/no-whitespace-before-property.js');
var nonblockStatementBodyPosition = require('./rules/nonblock-statement-body-position.js');
var objectCurlyNewline = require('./rules/object-curly-newline.js');
var objectCurlySpacing = require('./rules/object-curly-spacing.js');
var objectPropertyNewline = require('./rules/object-property-newline.js');
var oneVarDeclarationPerLine = require('./rules/one-var-declaration-per-line.js');
var operatorLinebreak = require('./rules/operator-linebreak.js');
var paddedBlocks = require('./rules/padded-blocks.js');
var paddingLineBetweenStatements = require('./rules/padding-line-between-statements.js');
var quoteProps = require('./rules/quote-props.js');
var quotes = require('./rules/quotes.js');
var restSpreadSpacing = require('./rules/rest-spread-spacing.js');
var semi = require('./rules/semi.js');
var semiSpacing = require('./rules/semi-spacing.js');
var semiStyle = require('./rules/semi-style.js');
var spaceBeforeBlocks = require('./rules/space-before-blocks.js');
var spaceBeforeFunctionParen = require('./rules/space-before-function-paren.js');
var spaceInParens = require('./rules/space-in-parens.js');
var spaceInfixOps = require('./rules/space-infix-ops.js');
var spaceUnaryOps = require('./rules/space-unary-ops.js');
var spacedComment = require('./rules/spaced-comment.js');
var switchColonSpacing = require('./rules/switch-colon-spacing.js');
var templateCurlySpacing = require('./rules/template-curly-spacing.js');
var templateTagSpacing = require('./rules/template-tag-spacing.js');
var typeAnnotationSpacing = require('./rules/type-annotation-spacing.js');
var typeGenericSpacing = require('./rules/type-generic-spacing.js');
var typeNamedTupleSpacing = require('./rules/type-named-tuple-spacing.js');
var wrapIife = require('./rules/wrap-iife.js');
var wrapRegex = require('./rules/wrap-regex.js');
var yieldStarSpacing = require('./rules/yield-star-spacing.js');

var rules = {
  "array-bracket-newline": arrayBracketNewline,
  "array-bracket-spacing": arrayBracketSpacing,
  "array-element-newline": arrayElementNewline,
  "arrow-parens": arrowParens,
  "arrow-spacing": arrowSpacing,
  "block-spacing": blockSpacing,
  "brace-style": braceStyle,
  "comma-dangle": commaDangle,
  "comma-spacing": commaSpacing,
  "comma-style": commaStyle,
  "computed-property-spacing": computedPropertySpacing,
  "curly-newline": curlyNewline,
  "dot-location": dotLocation,
  "eol-last": eolLast,
  "func-call-spacing": functionCallSpacing,
  "function-call-argument-newline": functionCallArgumentNewline,
  "function-call-spacing": functionCallSpacing,
  "function-paren-newline": functionParenNewline,
  "generator-star-spacing": generatorStarSpacing,
  "implicit-arrow-linebreak": implicitArrowLinebreak,
  "indent": indent,
  "indent-binary-ops": indentBinaryOps,
  "jsx-child-element-spacing": jsxChildElementSpacing,
  "jsx-closing-bracket-location": jsxClosingBracketLocation,
  "jsx-closing-tag-location": jsxClosingTagLocation,
  "jsx-curly-brace-presence": jsxCurlyBracePresence,
  "jsx-curly-newline": jsxCurlyNewline,
  "jsx-curly-spacing": jsxCurlySpacing,
  "jsx-equals-spacing": jsxEqualsSpacing,
  "jsx-first-prop-new-line": jsxFirstPropNewLine,
  "jsx-function-call-newline": jsxFunctionCallNewline,
  "jsx-indent": jsxIndent,
  "jsx-indent-props": jsxIndentProps,
  "jsx-max-props-per-line": jsxMaxPropsPerLine,
  "jsx-newline": jsxNewline,
  "jsx-one-expression-per-line": jsxOneExpressionPerLine,
  "jsx-pascal-case": jsxPascalCase,
  "jsx-props-no-multi-spaces": jsxPropsNoMultiSpaces,
  "jsx-quotes": jsxQuotes,
  "jsx-self-closing-comp": jsxSelfClosingComp,
  "jsx-sort-props": jsxSortProps,
  "jsx-tag-spacing": jsxTagSpacing,
  "jsx-wrap-multilines": jsxWrapMultilines,
  "key-spacing": keySpacing,
  "keyword-spacing": keywordSpacing,
  "line-comment-position": lineCommentPosition,
  "linebreak-style": linebreakStyle,
  "lines-around-comment": linesAroundComment,
  "lines-between-class-members": linesBetweenClassMembers,
  "max-len": maxLen,
  "max-statements-per-line": maxStatementsPerLine,
  "member-delimiter-style": memberDelimiterStyle,
  "multiline-comment-style": multilineCommentStyle,
  "multiline-ternary": multilineTernary,
  "new-parens": newParens,
  "newline-per-chained-call": newlinePerChainedCall,
  "no-confusing-arrow": noConfusingArrow,
  "no-extra-parens": noExtraParens,
  "no-extra-semi": noExtraSemi,
  "no-floating-decimal": noFloatingDecimal,
  "no-mixed-operators": noMixedOperators,
  "no-mixed-spaces-and-tabs": noMixedSpacesAndTabs,
  "no-multi-spaces": noMultiSpaces,
  "no-multiple-empty-lines": noMultipleEmptyLines,
  "no-tabs": noTabs,
  "no-trailing-spaces": noTrailingSpaces,
  "no-whitespace-before-property": noWhitespaceBeforeProperty,
  "nonblock-statement-body-position": nonblockStatementBodyPosition,
  "object-curly-newline": objectCurlyNewline,
  "object-curly-spacing": objectCurlySpacing,
  "object-property-newline": objectPropertyNewline,
  "one-var-declaration-per-line": oneVarDeclarationPerLine,
  "operator-linebreak": operatorLinebreak,
  "padded-blocks": paddedBlocks,
  "padding-line-between-statements": paddingLineBetweenStatements,
  "quote-props": quoteProps,
  "quotes": quotes,
  "rest-spread-spacing": restSpreadSpacing,
  "semi": semi,
  "semi-spacing": semiSpacing,
  "semi-style": semiStyle,
  "space-before-blocks": spaceBeforeBlocks,
  "space-before-function-paren": spaceBeforeFunctionParen,
  "space-in-parens": spaceInParens,
  "space-infix-ops": spaceInfixOps,
  "space-unary-ops": spaceUnaryOps,
  "spaced-comment": spacedComment,
  "switch-colon-spacing": switchColonSpacing,
  "template-curly-spacing": templateCurlySpacing,
  "template-tag-spacing": templateTagSpacing,
  "type-annotation-spacing": typeAnnotationSpacing,
  "type-generic-spacing": typeGenericSpacing,
  "type-named-tuple-spacing": typeNamedTupleSpacing,
  "wrap-iife": wrapIife,
  "wrap-regex": wrapRegex,
  "yield-star-spacing": yieldStarSpacing
};

const plugin = {
  rules
};

function customize(options = {}) {
  const {
    arrowParens = false,
    blockSpacing = true,
    braceStyle = "stroustrup",
    commaDangle = "always-multiline",
    flat = true,
    indent = 2,
    jsx = true,
    pluginName = "@stylistic",
    quoteProps = "consistent-as-needed",
    quotes = "single",
    semi = false
  } = options;
  let rules = {
    "@stylistic/array-bracket-spacing": ["error", "never"],
    "@stylistic/arrow-parens": ["error", arrowParens ? "always" : "as-needed", { requireForBlockBody: true }],
    "@stylistic/arrow-spacing": ["error", { after: true, before: true }],
    "@stylistic/block-spacing": ["error", blockSpacing ? "always" : "never"],
    "@stylistic/brace-style": ["error", braceStyle, { allowSingleLine: true }],
    "@stylistic/comma-dangle": ["error", commaDangle],
    "@stylistic/comma-spacing": ["error", { after: true, before: false }],
    "@stylistic/comma-style": ["error", "last"],
    "@stylistic/computed-property-spacing": ["error", "never", { enforceForClassMembers: true }],
    "@stylistic/dot-location": ["error", "property"],
    "@stylistic/eol-last": "error",
    "@stylistic/indent": ["error", indent, {
      ArrayExpression: 1,
      CallExpression: { arguments: 1 },
      flatTernaryExpressions: false,
      FunctionDeclaration: { body: 1, parameters: 1 },
      FunctionExpression: { body: 1, parameters: 1 },
      ignoreComments: false,
      ignoredNodes: [
        "TSUnionType",
        "TSIntersectionType",
        "TSTypeParameterInstantiation",
        "FunctionExpression > .params[decorators.length > 0]",
        "FunctionExpression > .params > :matches(Decorator, :not(:first-child))"
      ],
      ImportDeclaration: 1,
      MemberExpression: 1,
      ObjectExpression: 1,
      offsetTernaryExpressions: true,
      outerIIFEBody: 1,
      SwitchCase: 1,
      tabLength: indent === "tab" ? 4 : indent,
      VariableDeclarator: 1
    }],
    "@stylistic/indent-binary-ops": ["error", indent],
    "@stylistic/key-spacing": ["error", { afterColon: true, beforeColon: false }],
    "@stylistic/keyword-spacing": ["error", { after: true, before: true }],
    "@stylistic/lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
    "@stylistic/max-statements-per-line": ["error", { max: 1 }],
    "@stylistic/member-delimiter-style": ["error", {
      multiline: {
        delimiter: semi ? "semi" : "none",
        requireLast: semi
      },
      multilineDetection: "brackets",
      overrides: {
        interface: {
          multiline: {
            delimiter: semi ? "semi" : "none",
            requireLast: semi
          }
        }
      },
      singleline: {
        delimiter: semi ? "semi" : "comma"
      }
    }],
    "@stylistic/multiline-ternary": ["error", "always-multiline"],
    "@stylistic/new-parens": "error",
    "@stylistic/no-extra-parens": ["error", "functions"],
    "@stylistic/no-floating-decimal": "error",
    "@stylistic/no-mixed-operators": ["error", {
      allowSamePrecedence: true,
      groups: [
        ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
        ["&&", "||"],
        ["in", "instanceof"]
      ]
    }],
    "@stylistic/no-mixed-spaces-and-tabs": "error",
    "@stylistic/no-multi-spaces": "error",
    "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 0 }],
    "@stylistic/no-tabs": indent === "tab" ? "off" : "error",
    "@stylistic/no-trailing-spaces": "error",
    "@stylistic/no-whitespace-before-property": "error",
    "@stylistic/object-curly-spacing": ["error", "always"],
    "@stylistic/operator-linebreak": ["error", "before"],
    "@stylistic/padded-blocks": ["error", { blocks: "never", classes: "never", switches: "never" }],
    "@stylistic/quote-props": ["error", quoteProps],
    "@stylistic/quotes": ["error", quotes, { allowTemplateLiterals: true, avoidEscape: false }],
    "@stylistic/rest-spread-spacing": ["error", "never"],
    "@stylistic/semi": ["error", semi ? "always" : "never"],
    "@stylistic/semi-spacing": ["error", { after: true, before: false }],
    "@stylistic/space-before-blocks": ["error", "always"],
    "@stylistic/space-before-function-paren": ["error", { anonymous: "always", asyncArrow: "always", named: "never" }],
    "@stylistic/space-in-parens": ["error", "never"],
    "@stylistic/space-infix-ops": "error",
    "@stylistic/space-unary-ops": ["error", { nonwords: false, words: true }],
    "@stylistic/spaced-comment": ["error", "always", {
      block: {
        balanced: true,
        exceptions: ["*"],
        markers: ["!"]
      },
      line: {
        exceptions: ["/", "#"],
        markers: ["/"]
      }
    }],
    "@stylistic/template-curly-spacing": "error",
    "@stylistic/template-tag-spacing": ["error", "never"],
    "@stylistic/type-annotation-spacing": ["error", {}],
    "@stylistic/type-generic-spacing": "error",
    "@stylistic/type-named-tuple-spacing": "error",
    "@stylistic/wrap-iife": ["error", "any", { functionPrototypeMethods: true }],
    "@stylistic/yield-star-spacing": ["error", "both"],
    ...jsx ? {
      "@stylistic/jsx-closing-bracket-location": "error",
      "@stylistic/jsx-closing-tag-location": "error",
      "@stylistic/jsx-curly-brace-presence": ["error", { propElementValues: "always" }],
      "@stylistic/jsx-curly-newline": "error",
      "@stylistic/jsx-curly-spacing": ["error", "never"],
      "@stylistic/jsx-equals-spacing": "error",
      "@stylistic/jsx-first-prop-new-line": "error",
      "@stylistic/jsx-function-call-newline": ["error", "multiline"],
      "@stylistic/jsx-indent-props": ["error", indent],
      "@stylistic/jsx-max-props-per-line": ["error", { maximum: 1, when: "multiline" }],
      "@stylistic/jsx-one-expression-per-line": ["error", { allow: "single-child" }],
      "@stylistic/jsx-quotes": "error",
      "@stylistic/jsx-tag-spacing": [
        "error",
        {
          afterOpening: "never",
          beforeClosing: "never",
          beforeSelfClosing: "always",
          closingSlash: "never"
        }
      ],
      "@stylistic/jsx-wrap-multilines": [
        "error",
        {
          arrow: "parens-new-line",
          assignment: "parens-new-line",
          condition: "parens-new-line",
          declaration: "parens-new-line",
          logical: "parens-new-line",
          prop: "parens-new-line",
          propertyValue: "parens-new-line",
          return: "parens-new-line"
        }
      ]
    } : {}
  };
  if (pluginName !== "@stylistic") {
    const regex = /^@stylistic\//;
    rules = Object.fromEntries(
      Object.entries(rules).map(([ruleName, ruleConfig]) => [
        ruleName.replace(regex, `${pluginName}/`),
        ruleConfig
      ])
    );
  }
  if (flat) {
    return {
      plugins: {
        [pluginName]: plugin
      },
      rules
    };
  } else {
    if (pluginName !== "@stylistic")
      throw new Error("PluginName in non-flat config can not be customized");
    return {
      plugins: ["@stylistic"],
      rules
    };
  }
}

const config = {
  rules: {
    "array-bracket-newline": 0,
    "array-bracket-spacing": 0,
    "array-element-newline": 0,
    "arrow-parens": 0,
    "arrow-spacing": 0,
    "block-spacing": 0,
    "brace-style": 0,
    "comma-dangle": 0,
    "comma-spacing": 0,
    "comma-style": 0,
    "computed-property-spacing": 0,
    "dot-location": 0,
    "eol-last": 0,
    "func-call-spacing": 0,
    "function-call-argument-newline": 0,
    "function-paren-newline": 0,
    "generator-star-spacing": 0,
    "implicit-arrow-linebreak": 0,
    "indent": 0,
    "jsx-quotes": 0,
    "key-spacing": 0,
    "keyword-spacing": 0,
    "linebreak-style": 0,
    "lines-around-comment": 0,
    "lines-between-class-members": 0,
    "max-len": 0,
    "max-statements-per-line": 0,
    "multiline-ternary": 0,
    "new-parens": 0,
    "newline-per-chained-call": 0,
    "no-confusing-arrow": 0,
    "no-extra-parens": 0,
    "no-extra-semi": 0,
    "no-floating-decimal": 0,
    "no-mixed-operators": 0,
    "no-mixed-spaces-and-tabs": 0,
    "no-multi-spaces": 0,
    "no-multiple-empty-lines": 0,
    "no-tabs": 0,
    "no-trailing-spaces": 0,
    "no-whitespace-before-property": 0,
    "nonblock-statement-body-position": 0,
    "object-curly-newline": 0,
    "object-curly-spacing": 0,
    "object-property-newline": 0,
    "one-var-declaration-per-line": 0,
    "operator-linebreak": 0,
    "padded-blocks": 0,
    "padding-line-between-statements": 0,
    "quote-props": 0,
    "quotes": 0,
    "rest-spread-spacing": 0,
    "semi": 0,
    "semi-spacing": 0,
    "semi-style": 0,
    "space-before-blocks": 0,
    "space-before-function-paren": 0,
    "space-in-parens": 0,
    "space-infix-ops": 0,
    "space-unary-ops": 0,
    "spaced-comment": 0,
    "switch-colon-spacing": 0,
    "template-curly-spacing": 0,
    "template-tag-spacing": 0,
    "wrap-iife": 0,
    "wrap-regex": 0,
    "yield-star-spacing": 0,
    "@typescript-eslint/block-spacing": 0,
    "@typescript-eslint/brace-style": 0,
    "@typescript-eslint/comma-dangle": 0,
    "@typescript-eslint/comma-spacing": 0,
    "@typescript-eslint/func-call-spacing": 0,
    "@typescript-eslint/indent": 0,
    "@typescript-eslint/key-spacing": 0,
    "@typescript-eslint/keyword-spacing": 0,
    "@typescript-eslint/lines-around-comment": 0,
    "@typescript-eslint/lines-between-class-members": 0,
    "@typescript-eslint/member-delimiter-style": 0,
    "@typescript-eslint/no-extra-parens": 0,
    "@typescript-eslint/no-extra-semi": 0,
    "@typescript-eslint/object-curly-spacing": 0,
    "@typescript-eslint/padding-line-between-statements": 0,
    "@typescript-eslint/quotes": 0,
    "@typescript-eslint/semi": 0,
    "@typescript-eslint/space-before-blocks": 0,
    "@typescript-eslint/space-before-function-paren": 0,
    "@typescript-eslint/space-infix-ops": 0,
    "@typescript-eslint/type-annotation-spacing": 0,
    "react/jsx-child-element-spacing": 0,
    "react/jsx-closing-bracket-location": 0,
    "react/jsx-closing-tag-location": 0,
    "react/jsx-curly-brace-presence": 0,
    "react/jsx-curly-newline": 0,
    "react/jsx-curly-spacing": 0,
    "react/jsx-equals-spacing": 0,
    "react/jsx-first-prop-new-line": 0,
    "react/jsx-indent": 0,
    "react/jsx-indent-props": 0,
    "react/jsx-max-props-per-line": 0,
    "react/jsx-newline": 0,
    "react/jsx-one-expression-per-line": 0,
    "react/jsx-props-no-multi-spaces": 0,
    "react/jsx-self-closing-comp": 0,
    "react/jsx-sort-props": 0,
    "react/jsx-tag-spacing": 0,
    "react/jsx-wrap-multilines": 0
  }
};

const recommendedExtends = /* @__PURE__ */ customize({ flat: false });
const allConfigsIgnore = [
  // Exclude all JSX rules
  /^jsx-/,
  // https://github.com/eslint-stylistic/eslint-stylistic/pull/548
  /^curly-newline$/
];
const configs = {
  /**
   * Disable all legacy rules from `eslint`, `@typescript-eslint` and `eslint-plugin-react`
   *
   * This config works for both flat and legacy config format
   */
  "disable-legacy": config,
  /**
   * A factory function to customize the recommended config
   */
  "customize": customize,
  /**
   * The default recommended config in Flat Config Format
   */
  "recommended-flat": /* @__PURE__ */ customize(),
  /**
   * The default recommended config in Legacy Config Format
   */
  "recommended-extends": recommendedExtends,
  /**
   * Enable all rules, in Flat Config Format
   */
  "all-flat": utils.createAllConfigs(plugin, "@stylistic", true, (name) => !allConfigsIgnore.some((re) => re.test(name))),
  /**
   * Enable all rules, in Legacy Config Format
   */
  "all-extends": utils.createAllConfigs(plugin, "@stylistic", false, (name) => !allConfigsIgnore.some((re) => re.test(name))),
  /**
   * @deprecated Use `recommended-extends` instead
   */
  "recommended-legacy": recommendedExtends
};

exports.configs = configs;
exports.plugin = plugin;
