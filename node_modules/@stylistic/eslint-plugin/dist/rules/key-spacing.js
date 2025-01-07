'use strict';

var utils = require('../utils.js');
var utils$1 = require('@typescript-eslint/utils');
var astUtils = require('@typescript-eslint/utils/ast-utils');
require('eslint-visitor-keys');
require('espree');
require('estraverse');

function containsLineTerminator(str) {
  return utils.LINEBREAK_MATCHER.test(str);
}
function last(arr) {
  return arr[arr.length - 1];
}
function isSingleLine(node) {
  return node.loc.end.line === node.loc.start.line;
}
function isSingleLineImportAttributes(node, sourceCode) {
  const openingBrace = sourceCode.getTokenBefore(node.attributes[0], utils.isOpeningBraceToken);
  const closingBrace = sourceCode.getTokenAfter(node.attributes[node.attributes.length - 1], utils.isClosingBraceToken);
  return closingBrace.loc.end.line === openingBrace.loc.start.line;
}
function isSingleLineProperties(properties) {
  const [firstProp] = properties;
  const lastProp = last(properties);
  return firstProp.loc.start.line === lastProp.loc.end.line;
}
function initOptionProperty(toOptions, fromOptions) {
  toOptions.mode = fromOptions.mode || "strict";
  if (typeof fromOptions.beforeColon !== "undefined")
    toOptions.beforeColon = +fromOptions.beforeColon;
  else
    toOptions.beforeColon = 0;
  if (typeof fromOptions.afterColon !== "undefined")
    toOptions.afterColon = +fromOptions.afterColon;
  else
    toOptions.afterColon = 1;
  if (typeof fromOptions.align !== "undefined") {
    if (typeof fromOptions.align === "object") {
      toOptions.align = fromOptions.align;
    } else {
      toOptions.align = {
        on: fromOptions.align,
        mode: toOptions.mode,
        beforeColon: toOptions.beforeColon,
        afterColon: toOptions.afterColon
      };
    }
  }
  return toOptions;
}
function initOptions(toOptions, fromOptions) {
  if (typeof fromOptions.align === "object") {
    toOptions.align = initOptionProperty({}, fromOptions.align);
    toOptions.align.on = fromOptions.align.on || "colon";
    toOptions.align.mode = fromOptions.align.mode || "strict";
    toOptions.multiLine = initOptionProperty({}, fromOptions.multiLine || fromOptions);
    toOptions.singleLine = initOptionProperty({}, fromOptions.singleLine || fromOptions);
  } else {
    toOptions.multiLine = initOptionProperty({}, fromOptions.multiLine || fromOptions);
    toOptions.singleLine = initOptionProperty({}, fromOptions.singleLine || fromOptions);
    if (toOptions.multiLine.align) {
      toOptions.align = {
        on: toOptions.multiLine.align.on,
        mode: toOptions.multiLine.align.mode || toOptions.multiLine.mode,
        beforeColon: toOptions.multiLine.align.beforeColon,
        afterColon: toOptions.multiLine.align.afterColon
      };
    }
  }
  return toOptions;
}
var _baseRule = utils.createRule({
  name: "key-spacing",
  package: "js",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing between keys and values in object literal properties"
    },
    fixable: "whitespace",
    schema: [{
      anyOf: [
        {
          type: "object",
          properties: {
            align: {
              anyOf: [
                {
                  type: "string",
                  enum: ["colon", "value"]
                },
                {
                  type: "object",
                  properties: {
                    mode: {
                      type: "string",
                      enum: ["strict", "minimum"]
                    },
                    on: {
                      type: "string",
                      enum: ["colon", "value"]
                    },
                    beforeColon: {
                      type: "boolean"
                    },
                    afterColon: {
                      type: "boolean"
                    }
                  },
                  additionalProperties: false
                }
              ]
            },
            mode: {
              type: "string",
              enum: ["strict", "minimum"]
            },
            beforeColon: {
              type: "boolean"
            },
            afterColon: {
              type: "boolean"
            }
          },
          additionalProperties: false
        },
        {
          type: "object",
          properties: {
            singleLine: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            },
            multiLine: {
              type: "object",
              properties: {
                align: {
                  anyOf: [
                    {
                      type: "string",
                      enum: ["colon", "value"]
                    },
                    {
                      type: "object",
                      properties: {
                        mode: {
                          type: "string",
                          enum: ["strict", "minimum"]
                        },
                        on: {
                          type: "string",
                          enum: ["colon", "value"]
                        },
                        beforeColon: {
                          type: "boolean"
                        },
                        afterColon: {
                          type: "boolean"
                        }
                      },
                      additionalProperties: false
                    }
                  ]
                },
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        },
        {
          type: "object",
          properties: {
            singleLine: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            },
            multiLine: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            },
            align: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                on: {
                  type: "string",
                  enum: ["colon", "value"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      ]
    }],
    messages: {
      extraKey: "Extra space after {{computed}}key '{{key}}'.",
      extraValue: "Extra space before value for {{computed}}key '{{key}}'.",
      missingKey: "Missing space after {{computed}}key '{{key}}'.",
      missingValue: "Missing space before value for {{computed}}key '{{key}}'."
    }
  },
  create(context) {
    const options = context.options[0] || {};
    const ruleOptions = initOptions({}, options);
    const multiLineOptions = ruleOptions.multiLine;
    const singleLineOptions = ruleOptions.singleLine;
    const alignmentOptions = ruleOptions.align || null;
    const sourceCode = context.sourceCode;
    function isKeyValueProperty(property) {
      if (property.type === "ImportAttribute")
        return true;
      return !("method" in property && property.method || "shorthand" in property && property.shorthand || "kind" in property && property.kind !== "init" || property.type !== "Property");
    }
    function getNextColon(node) {
      return sourceCode.getTokenAfter(node, utils.isColonToken);
    }
    function getLastTokenBeforeColon(node) {
      const colonToken = getNextColon(node);
      return sourceCode.getTokenBefore(colonToken);
    }
    function getFirstTokenAfterColon(node) {
      const colonToken = getNextColon(node);
      return sourceCode.getTokenAfter(colonToken);
    }
    function continuesPropertyGroup(lastMember, candidate) {
      const groupEndLine = lastMember.loc.start.line;
      const candidateValueStartLine = (isKeyValueProperty(candidate) ? getFirstTokenAfterColon(candidate.key) : candidate).loc.start.line;
      if (candidateValueStartLine - groupEndLine <= 1)
        return true;
      const leadingComments = sourceCode.getCommentsBefore(candidate);
      if (leadingComments.length && leadingComments[0].loc.start.line - groupEndLine <= 1 && candidateValueStartLine - last(leadingComments).loc.end.line <= 1) {
        for (let i = 1; i < leadingComments.length; i++) {
          if (leadingComments[i].loc.start.line - leadingComments[i - 1].loc.end.line > 1)
            return false;
        }
        return true;
      }
      return false;
    }
    function getKey(property) {
      const key = property.key;
      if (property.type !== "ImportAttribute" && property.computed)
        return sourceCode.getText().slice(key.range[0], key.range[1]);
      return utils.getStaticPropertyName(property);
    }
    function report(property, side, whitespace, expected, mode) {
      const diff = whitespace.length - expected;
      if ((diff && mode === "strict" || diff < 0 && mode === "minimum" || diff > 0 && !expected && mode === "minimum") && !(expected && containsLineTerminator(whitespace))) {
        const nextColon = getNextColon(property.key);
        const tokenBeforeColon = sourceCode.getTokenBefore(nextColon, { includeComments: true });
        const tokenAfterColon = sourceCode.getTokenAfter(nextColon, { includeComments: true });
        const isKeySide = side === "key";
        const isExtra = diff > 0;
        const diffAbs = Math.abs(diff);
        const spaces = new Array(diffAbs + 1).join(" ");
        const locStart = isKeySide ? tokenBeforeColon.loc.end : nextColon.loc.start;
        const locEnd = isKeySide ? nextColon.loc.start : tokenAfterColon.loc.start;
        const missingLoc = isKeySide ? tokenBeforeColon.loc : tokenAfterColon.loc;
        const loc = isExtra ? { start: locStart, end: locEnd } : missingLoc;
        let fix;
        if (isExtra) {
          let range;
          if (isKeySide)
            range = [tokenBeforeColon.range[1], tokenBeforeColon.range[1] + diffAbs];
          else
            range = [tokenAfterColon.range[0] - diffAbs, tokenAfterColon.range[0]];
          fix = function(fixer) {
            return fixer.removeRange(range);
          };
        } else {
          if (isKeySide) {
            fix = function(fixer) {
              return fixer.insertTextAfter(tokenBeforeColon, spaces);
            };
          } else {
            fix = function(fixer) {
              return fixer.insertTextBefore(tokenAfterColon, spaces);
            };
          }
        }
        let messageId;
        if (isExtra)
          messageId = side === "key" ? "extraKey" : "extraValue";
        else
          messageId = side === "key" ? "missingKey" : "missingValue";
        context.report({
          node: property[side],
          loc,
          messageId,
          data: {
            computed: property.type !== "ImportAttribute" && property.computed ? "computed " : "",
            key: getKey(property)
          },
          fix
        });
      }
    }
    function getKeyWidth(property) {
      const startToken = sourceCode.getFirstToken(property);
      const endToken = getLastTokenBeforeColon(property.key);
      return utils.getStringLength(sourceCode.getText().slice(startToken.range[0], endToken.range[1]));
    }
    function getPropertyWhitespace(property) {
      const whitespace = /(\s*):(\s*)/u.exec(sourceCode.getText().slice(
        property.key.range[1],
        property.value.range[0]
      ));
      if (whitespace) {
        return {
          beforeColon: whitespace[1],
          afterColon: whitespace[2]
        };
      }
      return null;
    }
    function createGroups(properties) {
      if (properties.length === 1)
        return [properties];
      return properties.reduce((groups, property) => {
        const currentGroup = last(groups);
        const prev = last(currentGroup);
        if (!prev || continuesPropertyGroup(prev, property))
          currentGroup.push(property);
        else
          groups.push([property]);
        return groups;
      }, [
        []
      ]);
    }
    function verifyGroupAlignment(properties) {
      const length = properties.length;
      const widths = properties.map(getKeyWidth);
      const align = alignmentOptions.on;
      let targetWidth = Math.max(...widths);
      let beforeColon;
      let afterColon;
      let mode;
      if (alignmentOptions && length > 1) {
        beforeColon = alignmentOptions.beforeColon;
        afterColon = alignmentOptions.afterColon;
        mode = alignmentOptions.mode;
      } else {
        beforeColon = multiLineOptions.beforeColon;
        afterColon = multiLineOptions.afterColon;
        mode = alignmentOptions.mode;
      }
      targetWidth += align === "colon" ? beforeColon : afterColon;
      for (let i = 0; i < length; i++) {
        const property = properties[i];
        const whitespace = getPropertyWhitespace(property);
        if (whitespace) {
          const width = widths[i];
          if (align === "value") {
            report(property, "key", whitespace.beforeColon, beforeColon, mode);
            report(property, "value", whitespace.afterColon, targetWidth - width, mode);
          } else {
            report(property, "key", whitespace.beforeColon, targetWidth - width, mode);
            report(property, "value", whitespace.afterColon, afterColon, mode);
          }
        }
      }
    }
    function verifySpacing(node, lineOptions) {
      const actual = getPropertyWhitespace(node);
      if (actual) {
        report(node, "key", actual.beforeColon, lineOptions.beforeColon, lineOptions.mode);
        report(node, "value", actual.afterColon, lineOptions.afterColon, lineOptions.mode);
      }
    }
    function verifyListSpacing(properties, lineOptions) {
      const length = properties.length;
      for (let i = 0; i < length; i++)
        verifySpacing(properties[i], lineOptions);
    }
    function verifyAlignment(properties) {
      createGroups(properties).forEach((group) => {
        const properties2 = group.filter(isKeyValueProperty);
        if (properties2.length > 0 && isSingleLineProperties(properties2))
          verifyListSpacing(properties2, multiLineOptions);
        else
          verifyGroupAlignment(properties2);
      });
    }
    function verifyImportAttributes(node) {
      if (!node.attributes)
        return;
      if (!node.attributes.length)
        return;
      if (isSingleLineImportAttributes(node, sourceCode))
        verifyListSpacing(node.attributes, singleLineOptions);
      else
        verifyAlignment(node.attributes);
    }
    if (alignmentOptions) {
      return {
        ObjectExpression(node) {
          if (isSingleLine(node))
            verifyListSpacing(node.properties.filter(isKeyValueProperty), singleLineOptions);
          else
            verifyAlignment(node.properties);
        },
        ImportDeclaration(node) {
          verifyImportAttributes(node);
        },
        ExportNamedDeclaration(node) {
          verifyImportAttributes(node);
        },
        ExportAllDeclaration(node) {
          verifyImportAttributes(node);
        }
      };
    }
    return {
      Property(node) {
        verifySpacing(node, isSingleLine(node.parent) ? singleLineOptions : multiLineOptions);
      },
      ImportAttribute(node) {
        const parent = node.parent;
        verifySpacing(node, isSingleLineImportAttributes(parent, sourceCode) ? singleLineOptions : multiLineOptions);
      }
    };
  }
});

const baseRule = /* @__PURE__ */ utils.castRuleModule(_baseRule);
const baseSchema = Array.isArray(baseRule.meta.schema) ? baseRule.meta.schema[0] : baseRule.meta.schema;
var keySpacing = utils.createRule({
  name: "key-spacing",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing between property names and type annotations in types and interfaces"
    },
    fixable: "whitespace",
    hasSuggestions: baseRule.meta.hasSuggestions,
    schema: [baseSchema],
    messages: baseRule.meta.messages
  },
  defaultOptions: [{}],
  create(context, [_options]) {
    const options = _options || {};
    const sourceCode = context.sourceCode;
    const baseRules = baseRule.create(context);
    function adjustedColumn(position) {
      const line = position.line - 1;
      return utils.getStringLength(
        sourceCode.lines.at(line).slice(0, position.column)
      );
    }
    function getLastTokenBeforeColon(node) {
      const colonToken = sourceCode.getTokenAfter(node, astUtils.isColonToken);
      return sourceCode.getTokenBefore(colonToken);
    }
    function isKeyTypeNode(node) {
      return (node.type === utils$1.AST_NODE_TYPES.TSPropertySignature || node.type === utils$1.AST_NODE_TYPES.TSIndexSignature || node.type === utils$1.AST_NODE_TYPES.PropertyDefinition) && !!node.typeAnnotation;
    }
    function isApplicable(node) {
      return isKeyTypeNode(node) && node.typeAnnotation.loc.start.line === node.loc.end.line;
    }
    function getKeyText(node) {
      if (node.type !== utils$1.AST_NODE_TYPES.TSIndexSignature)
        return sourceCode.getText(node.key);
      const code = sourceCode.getText(node);
      return code.slice(
        0,
        sourceCode.getTokenAfter(
          node.parameters.at(-1),
          astUtils.isClosingBracketToken
        ).range[1] - node.range[0]
      );
    }
    function getKeyLocEnd(node) {
      return getLastTokenBeforeColon(
        node.type !== utils$1.AST_NODE_TYPES.TSIndexSignature ? node.key : node.parameters.at(-1)
      ).loc.end;
    }
    function checkBeforeColon(node, expectedWhitespaceBeforeColon, mode) {
      const { typeAnnotation } = node;
      const colon = typeAnnotation.loc.start.column;
      const keyEnd = getKeyLocEnd(node);
      const difference = colon - keyEnd.column - expectedWhitespaceBeforeColon;
      if (mode === "strict" ? difference : difference < 0) {
        context.report({
          node,
          messageId: difference > 0 ? "extraKey" : "missingKey",
          fix: (fixer) => {
            if (difference > 0) {
              return fixer.removeRange([
                typeAnnotation.range[0] - difference,
                typeAnnotation.range[0]
              ]);
            }
            return fixer.insertTextBefore(
              typeAnnotation,
              " ".repeat(-difference)
            );
          },
          data: {
            computed: "",
            key: getKeyText(node)
          }
        });
      }
    }
    function checkAfterColon(node, expectedWhitespaceAfterColon, mode) {
      const { typeAnnotation } = node;
      const colonToken = sourceCode.getFirstToken(typeAnnotation);
      const typeStart = sourceCode.getTokenAfter(colonToken, {
        includeComments: true
      }).loc.start.column;
      const difference = typeStart - colonToken.loc.start.column - 1 - expectedWhitespaceAfterColon;
      if (mode === "strict" ? difference : difference < 0) {
        context.report({
          node,
          messageId: difference > 0 ? "extraValue" : "missingValue",
          fix: (fixer) => {
            if (difference > 0) {
              return fixer.removeRange([
                colonToken.range[1],
                colonToken.range[1] + difference
              ]);
            }
            return fixer.insertTextAfter(colonToken, " ".repeat(-difference));
          },
          data: {
            computed: "",
            key: getKeyText(node)
          }
        });
      }
    }
    function continuesAlignGroup(lastMember, candidate) {
      const groupEndLine = lastMember.loc.start.line;
      const candidateValueStartLine = (isKeyTypeNode(candidate) ? candidate.typeAnnotation : candidate).loc.start.line;
      if (candidateValueStartLine === groupEndLine)
        return false;
      if (candidateValueStartLine - groupEndLine === 1)
        return true;
      const leadingComments = sourceCode.getCommentsBefore(candidate);
      if (leadingComments.length && leadingComments[0].loc.start.line - groupEndLine <= 1 && candidateValueStartLine - leadingComments.at(-1).loc.end.line <= 1) {
        for (let i = 1; i < leadingComments.length; i++) {
          if (leadingComments[i].loc.start.line - leadingComments[i - 1].loc.end.line > 1) {
            return false;
          }
        }
        return true;
      }
      return false;
    }
    function checkAlignGroup(group) {
      let alignColumn = 0;
      const align = (typeof options.align === "object" ? options.align.on : typeof options.multiLine?.align === "object" ? options.multiLine.align.on : options.multiLine?.align ?? options.align) ?? "colon";
      const beforeColon = (typeof options.align === "object" ? options.align.beforeColon : options.multiLine ? typeof options.multiLine.align === "object" ? options.multiLine.align.beforeColon : options.multiLine.beforeColon : options.beforeColon) ?? false;
      const expectedWhitespaceBeforeColon = beforeColon ? 1 : 0;
      const afterColon = (typeof options.align === "object" ? options.align.afterColon : options.multiLine ? typeof options.multiLine.align === "object" ? options.multiLine.align.afterColon : options.multiLine.afterColon : options.afterColon) ?? true;
      const expectedWhitespaceAfterColon = afterColon ? 1 : 0;
      const mode = (typeof options.align === "object" ? options.align.mode : options.multiLine ? typeof options.multiLine.align === "object" ? options.multiLine.align.mode ?? options.multiLine.mode : options.multiLine.mode : options.mode) ?? "strict";
      for (const node of group) {
        if (isKeyTypeNode(node)) {
          const keyEnd = adjustedColumn(getKeyLocEnd(node));
          alignColumn = Math.max(
            alignColumn,
            align === "colon" ? keyEnd + expectedWhitespaceBeforeColon : keyEnd + ":".length + expectedWhitespaceAfterColon + expectedWhitespaceBeforeColon
          );
        }
      }
      for (const node of group) {
        if (!isApplicable(node))
          continue;
        const { typeAnnotation } = node;
        const toCheck = align === "colon" ? typeAnnotation : typeAnnotation.typeAnnotation;
        const difference = adjustedColumn(toCheck.loc.start) - alignColumn;
        if (difference) {
          context.report({
            node,
            messageId: difference > 0 ? align === "colon" ? "extraKey" : "extraValue" : align === "colon" ? "missingKey" : "missingValue",
            fix: (fixer) => {
              if (difference > 0) {
                return fixer.removeRange([
                  toCheck.range[0] - difference,
                  toCheck.range[0]
                ]);
              }
              return fixer.insertTextBefore(toCheck, " ".repeat(-difference));
            },
            data: {
              computed: "",
              key: getKeyText(node)
            }
          });
        }
        if (align === "colon")
          checkAfterColon(node, expectedWhitespaceAfterColon, mode);
        else
          checkBeforeColon(node, expectedWhitespaceBeforeColon, mode);
      }
    }
    function checkIndividualNode(node, { singleLine }) {
      const beforeColon = (singleLine ? options.singleLine ? options.singleLine.beforeColon : options.beforeColon : options.multiLine ? options.multiLine.beforeColon : options.beforeColon) ?? false;
      const expectedWhitespaceBeforeColon = beforeColon ? 1 : 0;
      const afterColon = (singleLine ? options.singleLine ? options.singleLine.afterColon : options.afterColon : options.multiLine ? options.multiLine.afterColon : options.afterColon) ?? true;
      const expectedWhitespaceAfterColon = afterColon ? 1 : 0;
      const mode = (singleLine ? options.singleLine ? options.singleLine.mode : options.mode : options.multiLine ? options.multiLine.mode : options.mode) ?? "strict";
      if (isApplicable(node)) {
        checkBeforeColon(node, expectedWhitespaceBeforeColon, mode);
        checkAfterColon(node, expectedWhitespaceAfterColon, mode);
      }
    }
    function validateBody(body) {
      const isSingleLine = body.loc.start.line === body.loc.end.line;
      const members = body.type === utils$1.AST_NODE_TYPES.TSTypeLiteral ? body.members : body.body;
      let alignGroups = [];
      let unalignedElements = [];
      if (options.align || options.multiLine?.align) {
        let currentAlignGroup = [];
        alignGroups.push(currentAlignGroup);
        let prevNode;
        for (const node of members) {
          let prevAlignedNode = currentAlignGroup.at(-1);
          if (prevAlignedNode !== prevNode)
            prevAlignedNode = void 0;
          if (prevAlignedNode && continuesAlignGroup(prevAlignedNode, node)) {
            currentAlignGroup.push(node);
          } else if (prevNode?.loc.start.line === node.loc.start.line) {
            if (prevAlignedNode) {
              unalignedElements.push(prevAlignedNode);
              currentAlignGroup.pop();
            }
            unalignedElements.push(node);
          } else {
            currentAlignGroup = [node];
            alignGroups.push(currentAlignGroup);
          }
          prevNode = node;
        }
        unalignedElements = unalignedElements.concat(
          ...alignGroups.filter((group) => group.length === 1)
        );
        alignGroups = alignGroups.filter((group) => group.length >= 2);
      } else {
        unalignedElements = members;
      }
      for (const group of alignGroups)
        checkAlignGroup(group);
      for (const node of unalignedElements)
        checkIndividualNode(node, { singleLine: isSingleLine });
    }
    return {
      ...baseRules,
      TSTypeLiteral: validateBody,
      TSInterfaceBody: validateBody,
      ClassBody: validateBody
    };
  }
});

module.exports = keySpacing;
