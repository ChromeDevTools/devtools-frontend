import { a3 as LINEBREAKS, c as createRule, a0 as isTopLevelExpressionStatement, Y as isParenthesised, J as isSurroundedBy, a4 as hasOctalOrNonOctalDecimalEscapeSequence, h as castRuleModule } from '../utils.js';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

function switchQuote(str) {
  const newQuote = this.quote;
  const oldQuote = str[0];
  if (newQuote === oldQuote)
    return str;
  return newQuote + str.slice(1, -1).replace(/\\(\$\{|\r\n?|\n|.)|["'`]|\$\{|(\r\n?|\n)/gu, (match, escaped, newline) => {
    if (escaped === oldQuote || oldQuote === "`" && escaped === "${")
      return escaped;
    if (match === newQuote || newQuote === "`" && match === "${")
      return `\\${match}`;
    if (newline && oldQuote === "`")
      return "\\n";
    return match;
  }) + newQuote;
}
const QUOTE_SETTINGS = {
  double: {
    quote: '"',
    alternateQuote: "'",
    description: "doublequote",
    convert: switchQuote
  },
  single: {
    quote: "'",
    alternateQuote: '"',
    description: "singlequote",
    convert: switchQuote
  },
  backtick: {
    quote: "`",
    alternateQuote: '"',
    description: "backtick",
    convert: switchQuote
  }
};
const UNESCAPED_LINEBREAK_PATTERN = new RegExp(String.raw`(^|[^\\])(\\\\)*[${Array.from(LINEBREAKS).join("")}]`, "u");
const AVOID_ESCAPE = "avoid-escape";
var _baseRule = createRule({
  name: "quotes",
  package: "js",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce the consistent use of either backticks, double, or single quotes"
    },
    fixable: "code",
    schema: [
      {
        type: "string",
        enum: ["single", "double", "backtick"]
      },
      {
        anyOf: [
          {
            type: "string",
            enum: ["avoid-escape"]
          },
          {
            type: "object",
            properties: {
              avoidEscape: {
                type: "boolean"
              },
              allowTemplateLiterals: {
                anyOf: [
                  {
                    type: "boolean"
                  },
                  {
                    type: "string",
                    enum: ["never", "avoidEscape", "always"]
                  }
                ]
              },
              ignoreStringLiterals: {
                type: "boolean"
              }
            },
            additionalProperties: false
          }
        ]
      }
    ],
    messages: {
      wrongQuotes: "Strings must use {{description}}."
    }
  },
  create(context) {
    const quoteOption = context.options[0];
    const settings = QUOTE_SETTINGS[quoteOption || "double"];
    const options = context.options[1];
    const sourceCode = context.sourceCode;
    let avoidEscape = false;
    let ignoreStringLiterals = false;
    let allowTemplateLiteralsAlways = false;
    let allowTemplateLiteralsToAvoidEscape = false;
    if (typeof options === "object") {
      avoidEscape = options.avoidEscape === true;
      ignoreStringLiterals = options.ignoreStringLiterals === true;
      if (typeof options.allowTemplateLiterals === "string") {
        allowTemplateLiteralsAlways = options.allowTemplateLiterals === "always";
        allowTemplateLiteralsToAvoidEscape = allowTemplateLiteralsAlways || options.allowTemplateLiterals === "avoidEscape";
      } else if (typeof options.allowTemplateLiterals === "boolean") {
        allowTemplateLiteralsAlways = options.allowTemplateLiterals === true;
        allowTemplateLiteralsToAvoidEscape = options.allowTemplateLiterals === true;
      }
    } else if (options === AVOID_ESCAPE) {
      avoidEscape = true;
    }
    function isJSXLiteral(node) {
      if (!node.parent)
        return false;
      return node.parent.type === "JSXAttribute" || node.parent.type === "JSXElement" || node.parent.type === "JSXFragment";
    }
    function isDirective(node) {
      return node.type === "ExpressionStatement" && node.expression.type === "Literal" && typeof node.expression.value === "string" && !isParenthesised(sourceCode, node.expression);
    }
    function isExpressionInOrJustAfterDirectivePrologue(node) {
      if (!node.parent)
        return false;
      if (!isTopLevelExpressionStatement(node.parent))
        return false;
      const block = node.parent.parent;
      if (!block || !("body" in block) || !Array.isArray(block.body))
        return false;
      for (let i = 0; i < block.body.length; ++i) {
        const statement = block.body[i];
        if (statement === node.parent)
          return true;
        if (!isDirective(statement))
          break;
      }
      return false;
    }
    function isAllowedAsNonBacktick(node) {
      const parent = node.parent;
      if (!parent)
        return false;
      switch (parent.type) {
        // Directive Prologues.
        case "ExpressionStatement":
          return !isParenthesised(sourceCode, node) && isExpressionInOrJustAfterDirectivePrologue(node);
        // LiteralPropertyName.
        case "Property":
        case "PropertyDefinition":
        case "MethodDefinition":
          return parent.key === node && !parent.computed;
        // ModuleSpecifier.
        case "ImportDeclaration":
        case "ExportNamedDeclaration":
          return parent.source === node;
        // ModuleExportName or ModuleSpecifier.
        case "ExportAllDeclaration":
          return parent.exported === node || parent.source === node;
        // ModuleExportName.
        case "ImportSpecifier":
          return parent.imported === node;
        // ModuleExportName.
        case "ExportSpecifier":
          return parent.local === node || parent.exported === node;
        case "ImportAttribute":
          return parent.value === node;
        // Others don't allow.
        default:
          return false;
      }
    }
    function isUsingFeatureOfTemplateLiteral(node) {
      const hasTag = node.parent.type === "TaggedTemplateExpression" && node === node.parent.quasi;
      if (hasTag)
        return true;
      const hasStringInterpolation = node.expressions.length > 0;
      if (hasStringInterpolation)
        return true;
      const isMultilineString = node.quasis.length >= 1 && UNESCAPED_LINEBREAK_PATTERN.test(node.quasis[0].value.raw);
      if (isMultilineString)
        return true;
      return false;
    }
    return {
      Literal(node) {
        if (ignoreStringLiterals)
          return;
        const val = node.value;
        const rawVal = node.raw;
        if (settings && typeof val === "string") {
          let isValid = quoteOption === "backtick" && isAllowedAsNonBacktick(node) || isJSXLiteral(node) || isSurroundedBy(rawVal, settings.quote);
          if (!isValid && avoidEscape)
            isValid = isSurroundedBy(rawVal, settings.alternateQuote) && rawVal.includes(settings.quote);
          if (!isValid) {
            context.report({
              node,
              messageId: "wrongQuotes",
              data: {
                description: settings.description
              },
              fix(fixer) {
                if (quoteOption === "backtick" && hasOctalOrNonOctalDecimalEscapeSequence(rawVal)) {
                  return null;
                }
                return fixer.replaceText(node, settings.convert(node.raw));
              }
            });
          }
        }
      },
      TemplateLiteral(node) {
        if (allowTemplateLiteralsAlways || quoteOption === "backtick" || isUsingFeatureOfTemplateLiteral(node)) {
          return;
        }
        if (allowTemplateLiteralsToAvoidEscape && avoidEscape && sourceCode.getText(node).includes(settings.quote))
          return;
        context.report({
          node,
          messageId: "wrongQuotes",
          data: {
            description: settings.description
          },
          fix(fixer) {
            if (isTopLevelExpressionStatement(node.parent) && !isParenthesised(sourceCode, node)) {
              return null;
            }
            return fixer.replaceText(node, settings.convert(sourceCode.getText(node)));
          }
        });
      }
    };
  }
});

const baseRule = /* @__PURE__ */ castRuleModule(_baseRule);
var quotes = createRule({
  name: "quotes",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce the consistent use of either backticks, double, or single quotes"
    },
    fixable: "code",
    hasSuggestions: baseRule.meta.hasSuggestions,
    messages: baseRule.meta.messages,
    schema: baseRule.meta.schema
  },
  defaultOptions: [
    "double",
    {
      allowTemplateLiterals: "never",
      avoidEscape: false,
      ignoreStringLiterals: false
    }
  ],
  create(context, [option]) {
    const rules = baseRule.create(context);
    function isAllowedAsNonBacktick(node) {
      const parent = node.parent;
      switch (parent?.type) {
        case AST_NODE_TYPES.TSAbstractMethodDefinition:
        case AST_NODE_TYPES.TSMethodSignature:
        case AST_NODE_TYPES.TSPropertySignature:
        case AST_NODE_TYPES.TSModuleDeclaration:
        case AST_NODE_TYPES.TSExternalModuleReference:
          return true;
        case AST_NODE_TYPES.TSEnumMember:
          return node === parent.id;
        case AST_NODE_TYPES.TSAbstractPropertyDefinition:
        case AST_NODE_TYPES.PropertyDefinition:
          return parent.key === node && !parent.computed;
        case AST_NODE_TYPES.TSLiteralType:
          return parent.parent?.type === AST_NODE_TYPES.TSImportType;
        default:
          return false;
      }
    }
    return {
      Literal(node) {
        if (option === "backtick" && isAllowedAsNonBacktick(node))
          return;
        rules.Literal(node);
      },
      TemplateLiteral(node) {
        rules.TemplateLiteral(node);
      }
    };
  }
});

export { quotes as default };
