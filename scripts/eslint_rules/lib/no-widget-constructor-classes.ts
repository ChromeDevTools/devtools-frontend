// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Rule to forbid passing `classes` or `jslog` in `WidgetOptions` to
 * `super(...)` in `UI.Widget` subclasses that use a Lit view function,
 * requiring `{container: {classes: [...], attributes: {jslog: ...}}}` in the
 * third parameter of `render(...)` instead.
 */
import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {isLitHtmlRenderCall} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'noWidgetConstructorClasses'|'noWidgetConstructorJslog';
type RuleOptions = [];

function findObjectProperty(optionsObj: TSESTree.ObjectExpression, propName: string): TSESTree.Property|undefined {
  for (const prop of optionsObj.properties) {
    if (prop.type === 'Property' && !prop.computed && prop.key.type === 'Identifier' && prop.key.name === propName) {
      return prop;
    }
  }
  return undefined;
}

function hasShadowRootSuperTypeArg(classNode: TSESTree.ClassDeclaration|TSESTree.ClassExpression): boolean {
  const params = classNode.superTypeArguments?.params;
  if (!params || params.length === 0) {
    return false;
  }
  const firstParam = params[0];
  return firstParam.type === 'TSTypeReference' && firstParam.typeName.type === 'Identifier' &&
      (firstParam.typeName.name === 'ShadowRoot' || firstParam.typeName.name === 'DocumentFragment');
}

function hasUseShadowDomTrue(optionsObj: TSESTree.ObjectExpression): boolean {
  const useShadowDomProp = findObjectProperty(optionsObj, 'useShadowDom');
  return Boolean(useShadowDomProp && useShadowDomProp.value.type === 'Literal' &&
                 useShadowDomProp.value.value === true);
}

function isTopLevelVariableDeclarator(node: TSESTree.VariableDeclarator): boolean {
  const decl = node.parent;
  if (decl?.type !== 'VariableDeclaration') {
    return false;
  }
  return decl.parent?.type === 'Program' || decl.parent?.type === 'ExportNamedDeclaration';
}

function isTopLevelFunctionDeclaration(node: TSESTree.FunctionDeclaration): boolean {
  return node.parent?.type === 'Program' || node.parent?.type === 'ExportNamedDeclaration';
}

function collectPatternIdentifiers(pattern: TSESTree.Node, out: Set<string>): void {
  switch (pattern.type) {
    case 'Identifier':
      out.add(pattern.name);
      break;
    case 'AssignmentPattern':
      collectPatternIdentifiers(pattern.left, out);
      break;
    case 'RestElement':
      collectPatternIdentifiers(pattern.argument, out);
      break;
    case 'ArrayPattern':
      for (const el of pattern.elements) {
        if (el) {
          collectPatternIdentifiers(el, out);
        }
      }
      break;
    case 'ObjectPattern':
      for (const prop of pattern.properties) {
        if (prop.type === 'Property') {
          collectPatternIdentifiers(prop.value, out);
        } else if (prop.type === 'RestElement') {
          collectPatternIdentifiers(prop.argument, out);
        }
      }
      break;
    case 'TSParameterProperty':
      collectPatternIdentifiers(pattern.parameter, out);
      break;
    default:
      break;
  }
}

function canMoveExpressionToModuleScope(
    expr: TSESTree.Node,
    constructorNode: TSESTree.MethodDefinition,
    sourceCode: TSESLint.SourceCode,
    ): boolean {
  const constructorDeclaredNames = new Set<string>();
  for (const param of constructorNode.value.params) {
    collectPatternIdentifiers(param, constructorDeclaredNames);
  }

  const walkForDeclarations = (node: TSESTree.Node): void => {
    if (node.type === 'VariableDeclarator') {
      collectPatternIdentifiers(node.id, constructorDeclaredNames);
    } else if (node.type === 'FunctionDeclaration' && node.id) {
      constructorDeclaredNames.add(node.id.name);
    }
    const keys = sourceCode.visitorKeys[node.type] ?? [];
    for (const key of keys) {
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            walkForDeclarations(item as TSESTree.Node);
          }
        }
      } else if (child && typeof child === 'object' && 'type' in child) {
        walkForDeclarations(child as TSESTree.Node);
      }
    }
  };
  if (constructorNode.value.body) {
    walkForDeclarations(constructorNode.value.body);
  }

  const checkExpr = (node: TSESTree.Node, parent?: TSESTree.Node): boolean => {
    if (node.type === 'ThisExpression' || node.type === 'Super') {
      return false;
    }
    if (node.type === 'Identifier') {
      const isNonComputedMemberProp =
          parent?.type === 'MemberExpression' && !parent.computed && parent.property === node;
      const isNonComputedObjectKey = parent?.type === 'Property' && !parent.computed && parent.key === node;
      if (!isNonComputedMemberProp && !isNonComputedObjectKey && constructorDeclaredNames.has(node.name)) {
        return false;
      }
    }
    const keys = sourceCode.visitorKeys[node.type] ?? [];
    for (const key of keys) {
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            if (!checkExpr(item as TSESTree.Node, node)) {
              return false;
            }
          }
        }
      } else if (child && typeof child === 'object' && 'type' in child) {
        if (!checkExpr(child as TSESTree.Node, node)) {
          return false;
        }
      }
    }
    return true;
  };

  return checkExpr(expr);
}

function buildSuperFix(
    fixer: TSESLint.RuleFixer,
    sourceCode: TSESLint.SourceCode,
    superCall: TSESTree.CallExpression,
    optionsObj: TSESTree.ObjectExpression,
    propsToRemove: TSESTree.Property[],
    optionsArgIndex: number,
    shouldConvertUseShadowDomToPure: boolean,
    ): TSESLint.RuleFix[] {
  const removeSet = new Set<TSESTree.ObjectLiteralElement>(propsToRemove);
  const allProps = optionsObj.properties;
  if (allProps.length === removeSet.size) {
    if (optionsArgIndex === 0) {
      return [fixer.replaceText(superCall, 'super()')];
    }
    const firstArg = superCall.arguments[0];
    if (firstArg.type === 'Identifier' && firstArg.name === 'undefined') {
      return [fixer.replaceText(superCall, 'super()')];
    }
    const firstArgText = sourceCode.getText(firstArg);
    return [fixer.replaceText(superCall, `super(${firstArgText})`)];
  }

  const useShadowDomProp = findObjectProperty(optionsObj, 'useShadowDom');

  // If only one property is being removed, remove its range cleanly.
  if (propsToRemove.length === 1) {
    const prop = propsToRemove[0];
    const idx = allProps.indexOf(prop);
    const fixes: TSESLint.RuleFix[] = [];
    if (shouldConvertUseShadowDomToPure && useShadowDomProp) {
      fixes.push(fixer.replaceText(useShadowDomProp.value, '\'pure\''));
    }
    if (idx < allProps.length - 1) {
      const nextProp = allProps[idx + 1];
      fixes.push(fixer.removeRange([prop.range[0], nextProp.range[0]]));
      return fixes;
    }
    const prevProp = allProps[idx - 1];
    fixes.push(fixer.removeRange([prevProp.range[1], prop.range[1]]));
    return fixes;
  }

  // Multiple properties removed with remaining properties: rebuild the object literal.
  const remainingTexts = allProps.filter(p => !removeSet.has(p)).map(p => {
    if (shouldConvertUseShadowDomToPure && p === useShadowDomProp) {
      return 'useShadowDom: \'pure\'';
    }
    return sourceCode.getText(p);
  });
  return [fixer.replaceText(optionsObj, `{${remainingTexts.join(', ')}}`)];
}

function buildRenderFix(
    fixer: TSESLint.RuleFixer,
    sourceCode: TSESLint.SourceCode,
    renderCall: TSESTree.CallExpression,
    classesValueNode: TSESTree.Node|undefined,
    jslogValueNode: TSESTree.Node|undefined,
    ): TSESLint.RuleFix|null {
  const classesText = classesValueNode ? sourceCode.getText(classesValueNode) : undefined;
  const jslogText = jslogValueNode ? sourceCode.getText(jslogValueNode) : undefined;

  const buildContainerEntriesText = (): string => {
    const parts: string[] = [];
    if (jslogText) {
      parts.push(`attributes: {jslog: ${jslogText}}`);
    }
    if (classesText) {
      parts.push(`classes: ${classesText}`);
    }
    return parts.join(', ');
  };

  if (renderCall.arguments.length === 2) {
    const secondArg = renderCall.arguments[1];
    return fixer.insertTextAfter(secondArg, `, {container: {${buildContainerEntriesText()}}}`);
  }

  if (renderCall.arguments.length === 3) {
    const thirdArg = renderCall.arguments[2];
    if (thirdArg.type !== 'ObjectExpression') {
      return null;
    }
    const containerProp = findObjectProperty(thirdArg, 'container');
    if (!containerProp) {
      const entryText = `container: {${buildContainerEntriesText()}}`;
      if (thirdArg.properties.length === 0) {
        return fixer.replaceText(thirdArg, `{${entryText}}`);
      }
      const lastProp = thirdArg.properties[thirdArg.properties.length - 1];
      const tokenAfterLast = sourceCode.getTokenAfter(lastProp);
      if (tokenAfterLast && tokenAfterLast.value === ',') {
        return fixer.insertTextAfter(tokenAfterLast, ` ${entryText}`);
      }
      return fixer.insertTextAfter(lastProp, `, ${entryText}`);
    }

    if (containerProp.value.type !== 'ObjectExpression') {
      return null;
    }
    const containerObj = containerProp.value;

    // Handle single addition (either classes or jslog) into existing container object.
    if (classesText && !jslogText) {
      const existingClassesProp = findObjectProperty(containerObj, 'classes');
      if (existingClassesProp) {
        if (existingClassesProp.value.type === 'ArrayExpression' && classesValueNode?.type === 'ArrayExpression' &&
            existingClassesProp.value.elements.length > 0 && classesValueNode.elements.length > 0) {
          const firstExistingElem = existingClassesProp.value.elements[0];
          if (!firstExistingElem) {
            return null;
          }
          const newElementsText = classesValueNode.elements.map(el => (el ? sourceCode.getText(el) : '')).join(', ');
          return fixer.insertTextBefore(firstExistingElem, `${newElementsText}, `);
        }
        return null;
      }
      if (containerObj.properties.length === 0) {
        return fixer.replaceText(containerObj, `{classes: ${classesText}}`);
      }
      const lastContainerProp = containerObj.properties[containerObj.properties.length - 1];
      const tokenAfterLast = sourceCode.getTokenAfter(lastContainerProp);
      if (tokenAfterLast && tokenAfterLast.value === ',') {
        return fixer.insertTextAfter(tokenAfterLast, ` classes: ${classesText}`);
      }
      return fixer.insertTextAfter(lastContainerProp, `, classes: ${classesText}`);
    }

    if (jslogText && !classesText) {
      const existingAttrsProp = findObjectProperty(containerObj, 'attributes');
      if (existingAttrsProp) {
        if (existingAttrsProp.value.type !== 'ObjectExpression') {
          return null;
        }
        const attrsObj = existingAttrsProp.value;
        if (findObjectProperty(attrsObj, 'jslog')) {
          return null;
        }
        if (attrsObj.properties.length === 0) {
          return fixer.replaceText(attrsObj, `{jslog: ${jslogText}}`);
        }
        const lastAttrProp = attrsObj.properties[attrsObj.properties.length - 1];
        const tokenAfterLast = sourceCode.getTokenAfter(lastAttrProp);
        if (tokenAfterLast && tokenAfterLast.value === ',') {
          return fixer.insertTextAfter(tokenAfterLast, ` jslog: ${jslogText}`);
        }
        return fixer.insertTextAfter(lastAttrProp, `, jslog: ${jslogText}`);
      }
      if (containerObj.properties.length === 0) {
        return fixer.replaceText(containerObj, `{attributes: {jslog: ${jslogText}}}`);
      }
      const lastContainerProp = containerObj.properties[containerObj.properties.length - 1];
      const tokenAfterLast = sourceCode.getTokenAfter(lastContainerProp);
      if (tokenAfterLast && tokenAfterLast.value === ',') {
        return fixer.insertTextAfter(tokenAfterLast, ` attributes: {jslog: ${jslogText}}`);
      }
      return fixer.insertTextAfter(lastContainerProp, `, attributes: {jslog: ${jslogText}}`);
    }

    if (classesText && jslogText) {
      const existingClassesProp = findObjectProperty(containerObj, 'classes');
      const existingAttrsProp = findObjectProperty(containerObj, 'attributes');
      if (existingClassesProp) {
        return null;
      }
      if (existingAttrsProp) {
        if (existingAttrsProp.value.type !== 'ObjectExpression') {
          return null;
        }
        const attrsObj = existingAttrsProp.value;
        if (findObjectProperty(attrsObj, 'jslog')) {
          return null;
        }
        const propTexts = containerObj.properties.map(p => {
          if (p === existingAttrsProp) {
            const innerTexts = attrsObj.properties.map(ap => sourceCode.getText(ap));
            innerTexts.push(`jslog: ${jslogText}`);
            return `attributes: {${innerTexts.join(', ')}}`;
          }
          return sourceCode.getText(p);
        });
        propTexts.push(`classes: ${classesText}`);
        return fixer.replaceText(containerObj, `{${propTexts.join(', ')}}`);
      }
      if (containerObj.properties.length === 0) {
        return fixer.replaceText(containerObj, `{${buildContainerEntriesText()}}`);
      }
      const lastContainerProp = containerObj.properties[containerObj.properties.length - 1];
      const tokenAfterLast = sourceCode.getTokenAfter(lastContainerProp);
      if (tokenAfterLast && tokenAfterLast.value === ',') {
        return fixer.insertTextAfter(tokenAfterLast, ` ${buildContainerEntriesText()}`);
      }
      return fixer.insertTextAfter(lastContainerProp, `, ${buildContainerEntriesText()}`);
    }
  }
  return null;
}

function getDefaultViewNameFromConstructor(constructorNode: TSESTree.MethodDefinition): string|undefined {
  for (const param of constructorNode.value.params) {
    if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier' && param.right.type === 'Identifier') {
      const paramName = param.left.name;
      if (paramName === 'view' || paramName === 'viewFunction') {
        return param.right.name;
      }
    }
  }
  return undefined;
}

export default createRule<RuleOptions, MessageIds>({
  name: 'no-widget-constructor-classes',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid passing `classes` or `jslog` in `WidgetOptions` to `super(...)` in `UI.Widget` ' +
          'subclasses that use a Lit view function; pass `{container: {classes: [...], attributes: {jslog: ...}}}` ' +
          'to `render(...)` instead.',
      category: 'Possible Errors',
    },
    messages: {
      noWidgetConstructorClasses: 'Pass host `classes` via the third parameter of ' +
          '`render(template, target, {container: {classes: [...]}})` in the view function ' +
          'instead of the `Widget` constructor.',
      noWidgetConstructorJslog: 'Pass host `jslog` via the third parameter of ' +
          '`render(template, target, {container: {attributes: {jslog: ...}}})` in the view function ' +
          'instead of the `Widget` constructor.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;
    const allTopLevelRenderCalls: TSESTree.CallExpression[] = [];
    const renderCallsByTopLevelFn = new Map<string, TSESTree.CallExpression[]>();
    const classesWithView = new Set<TSESTree.ClassDeclaration|TSESTree.ClassExpression>();
    const superCandidates: Array<{
      classNode: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
      constructorNode: TSESTree.MethodDefinition,
      superCall: TSESTree.CallExpression,
      optionsObj: TSESTree.ObjectExpression,
      classesProp: TSESTree.Property | undefined,
      jslogProp: TSESTree.Property | undefined,
      optionsArgIndex: number,
    }> = [];

    let currentClass: TSESTree.ClassDeclaration|TSESTree.ClassExpression|null = null;
    let currentConstructor: TSESTree.MethodDefinition|null = null;
    let currentTopLevelFnName: string|null = null;

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!currentClass && isTopLevelVariableDeclarator(node) && node.id.type === 'Identifier' && node.init &&
            (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')) {
          currentTopLevelFnName = node.id.name;
        }
      },
      'VariableDeclarator:exit'(node: TSESTree.VariableDeclarator) {
        if (!currentClass && isTopLevelVariableDeclarator(node) && node.id.type === 'Identifier' &&
            currentTopLevelFnName === node.id.name) {
          currentTopLevelFnName = null;
        }
      },
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (!currentClass && isTopLevelFunctionDeclaration(node) && node.id) {
          currentTopLevelFnName = node.id.name;
        }
      },
      'FunctionDeclaration:exit'(node: TSESTree.FunctionDeclaration) {
        if (!currentClass && isTopLevelFunctionDeclaration(node) && node.id && currentTopLevelFnName === node.id.name) {
          currentTopLevelFnName = null;
        }
      },
      'ClassDeclaration, ClassExpression'(node: TSESTree.ClassDeclaration|TSESTree.ClassExpression) {
        currentClass = node;
      },
      'ClassDeclaration, ClassExpression:exit'() {
        currentClass = null;
      },
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        if (!currentClass) {
          return;
        }
        const keyName =
            (node.key.type === 'PrivateIdentifier' || node.key.type === 'Identifier') ? node.key.name : undefined;
        if (keyName === 'view') {
          classesWithView.add(currentClass);
        }
      },
      'MethodDefinition[kind="constructor"]'(node: TSESTree.MethodDefinition) {
        currentConstructor = node;
        if (currentClass && getDefaultViewNameFromConstructor(node)) {
          classesWithView.add(currentClass);
        }
      },
      'MethodDefinition[kind="constructor"]:exit'() {
        currentConstructor = null;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (!currentClass && isLitHtmlRenderCall(node) && node.arguments.length >= 2) {
          allTopLevelRenderCalls.push(node);
          if (currentTopLevelFnName) {
            const list = renderCallsByTopLevelFn.get(currentTopLevelFnName) ?? [];
            list.push(node);
            renderCallsByTopLevelFn.set(currentTopLevelFnName, list);
          }
          return;
        }
        if (currentClass && node.callee.type === 'MemberExpression' && !node.callee.computed &&
            node.callee.object.type === 'ThisExpression' &&
            (node.callee.property.type === 'PrivateIdentifier' || node.callee.property.type === 'Identifier') &&
            node.callee.property.name === 'view') {
          classesWithView.add(currentClass);
        }
        if (!currentConstructor || !currentClass || !currentClass.superClass || node.callee.type !== 'Super') {
          return;
        }
        for (let i = 0; i < Math.min(node.arguments.length, 2); i++) {
          const arg = node.arguments[i];
          if (arg.type === 'ObjectExpression') {
            const classesProp = findObjectProperty(arg, 'classes');
            const jslogProp = findObjectProperty(arg, 'jslog');
            if (classesProp || jslogProp) {
              superCandidates.push({
                classNode: currentClass,
                constructorNode: currentConstructor,
                superCall: node,
                optionsObj: arg,
                classesProp,
                jslogProp,
                optionsArgIndex: i,
              });
              break;
            }
          }
        }
      },
      'Program:exit'() {
        if (superCandidates.length === 0 || allTopLevelRenderCalls.length === 0) {
          return;
        }

        const resolveTargetRenderCall =
            (candidate: (typeof superCandidates)[number]): TSESTree.CallExpression|undefined => {
              const viewFnName = getDefaultViewNameFromConstructor(candidate.constructorNode);
              if (viewFnName) {
                const calls = renderCallsByTopLevelFn.get(viewFnName);
                if (calls && calls.length > 0) {
                  return calls.length === 1 ? calls[0] : undefined;
                }
              }
              if (superCandidates.length === 1 && allTopLevelRenderCalls.length === 1) {
                return allTopLevelRenderCalls[0];
              }
              return undefined;
            };

        for (const candidate of superCandidates) {
          if (!classesWithView.has(candidate.classNode)) {
            continue;
          }

          const targetRenderCall = resolveTargetRenderCall(candidate);
          const {classesProp, jslogProp, constructorNode} = candidate;
          const isShadowDomTrue = hasUseShadowDomTrue(candidate.optionsObj);
          const hasShadowRootType = hasShadowRootSuperTypeArg(candidate.classNode);
          const canAutofixShadowDomClasses = !isShadowDomTrue || hasShadowRootType;
          const shouldConvertToPure = Boolean(classesProp && isShadowDomTrue && hasShadowRootType);
          const canMoveClasses = (classesProp && canAutofixShadowDomClasses) ?
              canMoveExpressionToModuleScope(classesProp.value, constructorNode, sourceCode) :
              false;
          const canMoveJslog =
              jslogProp ? canMoveExpressionToModuleScope(jslogProp.value, constructorNode, sourceCode) : false;

          if (classesProp && jslogProp) {
            // Report both properties; attach the combined autofix to the first property so fixes don't conflict.
            context.report({
              node: classesProp,
              messageId: 'noWidgetConstructorClasses',
              fix: (targetRenderCall && canMoveClasses && canMoveJslog) ?
                  fixer => {
                    const renderFix =
                        buildRenderFix(fixer, sourceCode, targetRenderCall, classesProp.value, jslogProp.value);
                    if (!renderFix) {
                      return null;
                    }
                    const superFixes = buildSuperFix(
                        fixer,
                        sourceCode,
                        candidate.superCall,
                        candidate.optionsObj,
                        [classesProp, jslogProp],
                        candidate.optionsArgIndex,
                        shouldConvertToPure,
                    );
                    return [renderFix, ...superFixes];
                  } :
                  null,
            });
            context.report({
              node: jslogProp,
              messageId: 'noWidgetConstructorJslog',
            });
          } else if (classesProp) {
            context.report({
              node: classesProp,
              messageId: 'noWidgetConstructorClasses',
              fix: (targetRenderCall && canMoveClasses) ?
                  fixer => {
                    const renderFix = buildRenderFix(fixer, sourceCode, targetRenderCall, classesProp.value, undefined);
                    if (!renderFix) {
                      return null;
                    }
                    const superFixes = buildSuperFix(
                        fixer,
                        sourceCode,
                        candidate.superCall,
                        candidate.optionsObj,
                        [classesProp],
                        candidate.optionsArgIndex,
                        shouldConvertToPure,
                    );
                    return [renderFix, ...superFixes];
                  } :
                  null,
            });
          } else if (jslogProp) {
            context.report({
              node: jslogProp,
              messageId: 'noWidgetConstructorJslog',
              fix: (targetRenderCall && canMoveJslog) ?
                  fixer => {
                    const renderFix = buildRenderFix(fixer, sourceCode, targetRenderCall, undefined, jslogProp.value);
                    if (!renderFix) {
                      return null;
                    }
                    const superFixes = buildSuperFix(
                        fixer,
                        sourceCode,
                        candidate.superCall,
                        candidate.optionsObj,
                        [jslogProp],
                        candidate.optionsArgIndex,
                        false,
                    );
                    return [renderFix, ...superFixes];
                  } :
                  null,
            });
          }
        }
      },
    };
  },
});
