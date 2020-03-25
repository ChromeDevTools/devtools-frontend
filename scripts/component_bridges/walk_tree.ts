// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface ExternalImport {
  namedImports: Set<string>;
  filePath: string;
}

export interface WalkerState {
  foundInterfaces: Set<ts.InterfaceDeclaration>;
  interfaceNamesToConvert: Set<string>;
  componentClass?: ts.ClassDeclaration;
  publicMethods: Set<ts.MethodDeclaration>;
  customElementsDefineCall?: ts.ExpressionStatement;
  imports: Set<ExternalImport>;
}

const classExtendsHTMLElement = (classNode: ts.ClassDeclaration): boolean => {
  if (!classNode.heritageClauses) {
    return false;
  }

  return classNode.heritageClauses.some(clause => {
    return clause.types.find(clauseType => {
      if (ts.isIdentifier(clauseType.expression)) {
        return clauseType.expression.escapedText === 'HTMLElement';
      }
      return false;
    });
  });
};

const walkNode = (node: ts.Node, startState?: WalkerState): WalkerState => {
  const state: WalkerState = startState || {
    foundInterfaces: new Set(),
    publicMethods: new Set(),
    interfaceNamesToConvert: new Set(),
    componentClass: undefined,
    customElementsDefineCall: undefined,
    imports: new Set(),

  };

  if (ts.isClassDeclaration(node)) {
    const extendsHtmlElement = classExtendsHTMLElement(node);

    if (extendsHtmlElement) {
      state.componentClass = node;
      // now we know this is the component, hunt for its public methods
      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member)) {
          const isPrivate =
              member.modifiers && member.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword);

          if (isPrivate) {
            return;
          }
          state.publicMethods.add(member);

          // TODO: we should check the return type of the method - if
          // that's an interface we should include it in the _bridge.js
          // file.

          // now find its interfaces that we need to make public from the method parmeters
          member.parameters.forEach(param => {
            if (!param.type) {
              return;
            }
            if (ts.isArrayTypeNode(param.type) && ts.isTypeReferenceNode(param.type.elementType) &&
                ts.isIdentifier(param.type.elementType.typeName)) {
              state.interfaceNamesToConvert.add(param.type.elementType.typeName.escapedText.toString());

            } else {
              if (ts.isTypeReferenceNode(param.type) && ts.isIdentifier(param.type.typeName)) {
                state.interfaceNamesToConvert.add(param.type.typeName.escapedText.toString());
              }
            }
          });
        }
      });
    }

  } else if (ts.isInterfaceDeclaration(node)) {
    state.foundInterfaces.add(node);
  } else if (ts.isImportDeclaration(node)) {
    const filePath = (node.moduleSpecifier as ts.StringLiteral).text;

    const fileWithoutExt = path.basename(filePath, '.js');
    const sourceFile = `${fileWithoutExt}.ts`;

    if (node.importClause) {
      const namedImports = (node.importClause.namedBindings as ts.NamedImports).elements.map(namedImport => {
        return namedImport.name.escapedText.toString();
      });

      state.imports.add({
        filePath: sourceFile,
        namedImports: new Set(namedImports),
      });
    }
  } else if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
    if (ts.isPropertyAccessExpression(node.expression.expression)) {
      const propertyAccess = node.expression.expression;

      if (ts.isIdentifier(propertyAccess.expression) && ts.isIdentifier(propertyAccess.name)) {
        const leftSideText = propertyAccess.expression.escapedText.toString();
        const rightSideText = propertyAccess.name.escapedText.toString();
        if (leftSideText === 'customElements' && rightSideText === 'define') {
          state.customElementsDefineCall = node;
        }
      }
    }
  }

  node.forEachChild(node => {
    walkNode(node, state);
  });


  return state;
};

export const filePathToTypeScriptSourceFile = (filePath: string): ts.SourceFile => {
  return ts.createSourceFile(filePath, fs.readFileSync(filePath, {encoding: 'utf8'}), ts.ScriptTarget.ESNext);
};

export const walkTree = (startNode: ts.SourceFile, resolvedFilePath: string): WalkerState => {
  const state = walkNode(startNode);

  /* if we are here and found an interface passed to a public method
   * that we didn't find the definition for, that means it's imported
   * so we now need to walk that imported file
   */
  const foundInterfaceNames = new Set(Array.from(state.foundInterfaces, foundInterface => {
    return foundInterface.name.escapedText.toString();
  }));

  const missingInterfaces = Array.from(state.interfaceNamesToConvert).filter(name => {
    return foundInterfaceNames.has(name) === false;
  });

  /* now look at all the imports and see if we have the name of the missing interface
   * and if we do, walk that file to find the interface
   * else, error loudly
   */

  missingInterfaces.forEach(missingInterfaceName => {
    const importForMissingInterface = Array.from(state.imports).find(imp => imp.namedImports.has(missingInterfaceName));

    if (!importForMissingInterface) {
      throw new Error(
          `Could not find definition for interface ${missingInterfaceName} in the source file or any of its imports.`);
    }

    const fullPathToImport = path.join(path.dirname(resolvedFilePath), importForMissingInterface.filePath);

    const sourceFile = filePathToTypeScriptSourceFile(fullPathToImport);

    const stateFromSubFile = walkTree(sourceFile, fullPathToImport);

    // now merge the foundInterfaces part
    stateFromSubFile.foundInterfaces.forEach(foundInterface => {
      state.foundInterfaces.add(foundInterface);
    });
  });

  return state;
};
