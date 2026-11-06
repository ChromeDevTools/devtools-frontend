// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Library to identify and templatize manually construction of widgets.
 */
import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {isLitHtmlRenderCall, isLitHtmlTemplateCall, isViewFunction} from '../utils/lit.ts';

import {
  getEnclosingClassDeclaration,
  getEnclosingExpression,
  isIdentifier,
  isIdentifierChain,
  isMemberExpression,
  type RuleCreator,
} from './ast.ts';
import {ClassMember} from './class-member.ts';
import {DomFragment} from './dom-fragment.ts';

type CallExpression = TSESTree.CallExpression;
type Identifier = TSESTree.Identifier;
type MemberExpression = TSESTree.MemberExpression;
type Node = TSESTree.Node;
type SourceCode = TSESLint.SourceCode;
type ViewFunction = TSESTree.FunctionDeclaration|TSESTree.FunctionExpression|TSESTree.ArrowFunctionExpression;

function isOnlyClassUsingViewFunction(
    enclosingClass: Node,
    viewFn: ViewFunction,
    sourceCode: Readonly<SourceCode>,
    ): boolean {
  if (getEnclosingClassDeclaration(viewFn) === enclosingClass) {
    return true;
  }
  let declaredVars: readonly TSESLint.Scope.Variable[] = [];
  if (viewFn.type === 'FunctionDeclaration') {
    declaredVars = sourceCode.getDeclaredVariables(viewFn);
  } else {
    let parent: Node|undefined = viewFn.parent;
    while (parent?.type === 'TSAsExpression' || parent?.type === 'TSSatisfiesExpression') {
      parent = parent.parent;
    }
    if (parent?.type === 'VariableDeclarator') {
      declaredVars = sourceCode.getDeclaredVariables(parent);
    }
  }
  let usedByEnclosingClass = false;
  for (const variable of declaredVars) {
    for (const ref of variable.references) {
      if (ref.init || ref.isValueReference === false) {
        continue;
      }
      const refClass = getEnclosingClassDeclaration(ref.identifier);
      if (!refClass) {
        continue;
      }
      if (refClass === enclosingClass) {
        usedByEnclosingClass = true;
      } else {
        return false;
      }
    }
  }
  return usedByEnclosingClass;
}

function insertStylesIntoTemplate(
    fixer: TSESLint.RuleFixer,
    template: TSESTree.TaggedTemplateExpression,
    styleArgs: TSESTree.Expression[],
    sourceCode: Readonly<SourceCode>,
    ): TSESLint.RuleFix {
  const {quasis} = template.quasi;
  let quasiIndex = 0;
  let offsetInQuasi = 0;
  let lastStyleEndOffset: number|undefined;
  let lastStyleIndent = '';

  while (quasiIndex < quasis.length) {
    const raw = quasis[quasiIndex].value.raw;
    const leadingMatch = /^(?:\s|<!--[\s\S]*?-->)*/.exec(raw.slice(offsetInQuasi));
    const leadingText = leadingMatch?.[0] ?? '';
    const openStart = offsetInQuasi + leadingText.length;
    const openMatch = /^<style(?:\s[^>]*)?>/i.exec(raw.slice(openStart));
    if (!openMatch) {
      break;
    }

    let searchQuasi = quasiIndex;
    let searchOffset = openStart + openMatch[0].length;
    let foundClose = false;
    while (searchQuasi < quasis.length) {
      const searchSlice = quasis[searchQuasi].value.raw.slice(searchOffset);
      const closeMatch = /<\/style\s*>/i.exec(searchSlice);
      if (closeMatch) {
        const closeEndInQuasi = searchOffset + closeMatch.index + closeMatch[0].length;
        lastStyleEndOffset = quasis[searchQuasi].range[0] + 1 + closeEndInQuasi;
        lastStyleIndent = /(\r?\n[ \t]*)$/.exec(leadingText)?.[1] ?? '';
        quasiIndex = searchQuasi;
        offsetInQuasi = closeEndInQuasi;
        foundClose = true;
        break;
      }
      searchQuasi++;
      searchOffset = 0;
    }
    if (!foundClose) {
      break;
    }
  }

  if (lastStyleEndOffset !== undefined) {
    const styleTags = styleArgs.map(arg => `${lastStyleIndent}<style>\${${sourceCode.getText(arg)}}</style>`).join('');
    return fixer.insertTextBeforeRange([lastStyleEndOffset, lastStyleEndOffset], styleTags);
  }

  const firstRaw = quasis[0].value.raw;
  const leadingMatch = /^(?:\s|<!--[\s\S]*?-->)*/.exec(firstRaw);
  const leadingText = leadingMatch?.[0] ?? '';
  const indentMatch = /(\r?\n[ \t]*)$/.exec(leadingText);
  if (indentMatch) {
    const indent = indentMatch[1];
    const insertOffset = quasis[0].range[0] + 1 + leadingText.length - indent.length;
    const styleTags = styleArgs.map(arg => `${indent}<style>\${${sourceCode.getText(arg)}}</style>`).join('');
    return fixer.insertTextBeforeRange([insertOffset, insertOffset], styleTags);
  }

  const insertOffset = template.quasi.range[0] + 1;
  const styleTags = styleArgs.map(arg => `<style>\${${sourceCode.getText(arg)}}</style>`).join('');
  return fixer.insertTextBeforeRange([insertOffset, insertOffset], styleTags);
}

export const widget: RuleCreator = {
  create: function(context) {
    const sourceCode = context.sourceCode;
    const registerRequiredCSSCalls: CallExpression[] = [];
    const renderCalls: CallExpression[] = [];
    const viewFunctions: ViewFunction[] = [];

    return {
      ArrowFunctionExpression(node) {
        if (isViewFunction(node)) {
          viewFunctions.push(node);
        }
      },
      FunctionDeclaration(node) {
        if (isViewFunction(node)) {
          viewFunctions.push(node);
        }
      },
      FunctionExpression(node) {
        if (node.parent.type !== 'MethodDefinition' && isViewFunction(node)) {
          viewFunctions.push(node);
        }
      },
      methodCall(property, firstArg, secondArg, domFragment) {
        if (domFragment.tagName !== 'devtools-widget') {
          return false;
        }
        if (isIdentifier(property, 'setMinimumSize')) {
          domFragment.bindings.push({
            key: 'minimumSize',
            value: `{width: ${sourceCode.getText(firstArg)}, height: ${sourceCode.getText(secondArg)}}`,
          });
          return true;
        }
        return false;
      },
      propertyAssignment(property, value, domFragment) {
        if (domFragment.tagName !== 'devtools-widget') {
          return false;
        }
        if (domFragment.widgetClass &&
            isIdentifierChain(domFragment.widgetClass, ['UI', 'EmptyWidget', 'EmptyWidget']) &&
            isIdentifier(property, ['header', 'text', 'link'])) {
          domFragment.bindings.push({key: (property as Identifier).name, value});
          return true;
        }
        return false;
      },
      functionCall(call, _firstArg, _secondArg, domFragment) {
        if (isMemberExpression(call.callee, _ => true, n => isIdentifier(n, 'show'))) {
          let widget = (call.callee as MemberExpression).object;
          if (widget.type === 'CallExpression' &&
              isMemberExpression(widget.callee, _ => true, n => isIdentifier(n, 'asWidget'))) {
            widget = (widget.callee as MemberExpression).object;
          }
          domFragment.appendChild(widget, sourceCode);
          return true;
        }
        return false;
      },
      CallExpression(node) {
        if (isMemberExpression(node.callee, _ => true, n => isIdentifier(n, 'registerRequiredCSS'))) {
          registerRequiredCSSCalls.push(node);
        } else if (isLitHtmlRenderCall(node)) {
          renderCalls.push(node);
        }
      },
      MemberExpression(node) {
        if (node.object.type === 'ThisExpression' && isIdentifier(node.property, ['element', 'contentElement'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'div';
          let replacementLocation = ClassMember.getOrCreate(node, sourceCode)?.classDeclaration;
          if (replacementLocation?.parent?.type === 'ExportNamedDeclaration') {
            replacementLocation = replacementLocation.parent;
          }
          if (replacementLocation) {
            domFragment.replacer = (fixer, template) => {
              const output = template.includes('output') ? 'output' : '_output';
              const text = `
export const DEFAULT_VIEW = (input, ${output}, target) => {
  render(${template},
    target, {host: input});
};

`;
              return fixer.insertTextBefore(replacementLocation, text);
            };
          }
        }
      },
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['UI', 'EmptyWidget', 'EmptyWidget'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-widget';
          domFragment.widgetClass = node.callee;
          const header = node.arguments[0];
          const text = node.arguments[1];
          domFragment.bindings.push({key: 'header', value: header});
          domFragment.bindings.push({key: 'text', value: text});
          return true;
        }
        return false;
      },
      onProgramExit(isRenderOrViewTarget) {
        if (registerRequiredCSSCalls.length === 0) {
          return;
        }

        let singleViewFn: ViewFunction|undefined;
        let singleViewTemplate: TSESTree.TaggedTemplateExpression|undefined;
        if (viewFunctions.length === 1 && renderCalls.length === 1) {
          const viewFn = viewFunctions[0];
          const renderCall = renderCalls[0];
          const isTopLevelInView = viewFn.body === renderCall ||
              (viewFn.body.type === 'BlockStatement' && renderCall.parent?.type === 'ExpressionStatement' &&
               renderCall.parent.parent === viewFn.body);
          if (isTopLevelInView && renderCall.arguments.length >= 2 && isLitHtmlTemplateCall(renderCall.arguments[0])) {
            singleViewFn = viewFn;
            singleViewTemplate = renderCall.arguments[0];
          }
        }

        for (const call of registerRequiredCSSCalls) {
          const enclosingClass = getEnclosingClassDeclaration(call);
          const styleArgs = call.arguments.filter((arg): arg is TSESTree.Expression => arg.type !== 'SpreadElement');
          const hasValidStyleArgs = styleArgs.length > 0 && styleArgs.length === call.arguments.length;
          const widgetRootFragment =
              (viewFunctions.length === 0 && renderCalls.length === 0 && call.callee.type === 'MemberExpression' &&
               call.callee.object.type === 'ThisExpression' && hasValidStyleArgs && enclosingClass) ?
              Array.from(DomFragment.values())
                  .find(fragment => fragment.classDeclaration === enclosingClass && Boolean(fragment.replacer) &&
                            !fragment.parent && Boolean(fragment.tagName || fragment.expression) &&
                            fragment.references.some(r => r.processed) && !isRenderOrViewTarget(fragment)) :
              undefined;

          if (widgetRootFragment) {
            for (const arg of styleArgs) {
              widgetRootFragment.prependStylesheet(arg, call);
            }
            continue;
          }

          const autofixTemplate =
              (singleViewFn && singleViewTemplate && enclosingClass && call.callee.type === 'MemberExpression' &&
               call.callee.object.type === 'ThisExpression' && hasValidStyleArgs &&
               call.parent?.type === 'ExpressionStatement' &&
               isOnlyClassUsingViewFunction(enclosingClass, singleViewFn, sourceCode)) ?
              singleViewTemplate :
              undefined;

          context.report({
            node: call,
            messageId: 'preferTemplateLiterals',
            fix: autofixTemplate ?
                fixer => {
                  const enclosingExpr = getEnclosingExpression(call) ?? call.parent;
                  const range: TSESTree.Range = [...enclosingExpr.range];
                  while ([' ', '\n'].includes(sourceCode.text[range[0] - 1])) {
                    range[0]--;
                  }
                  return [
                    insertStylesIntoTemplate(fixer, autofixTemplate, styleArgs, sourceCode),
                    fixer.removeRange(range),
                  ];
                } :
                undefined,
          });
        }
      },
    };
  },
};
