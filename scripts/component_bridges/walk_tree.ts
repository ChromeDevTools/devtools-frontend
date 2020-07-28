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
  /* Whilst these are technically different things, for the bridge generation we
   * can treat them the same - the Closure output is similar for both - and the
   * overhead of an extra piece of state and another set to check isn't worth it
   */
  foundInterfaces: Set<ts.InterfaceDeclaration|ts.TypeAliasDeclaration>;
  interfaceNamesToConvert: Set<string>;
  componentClass?: ts.ClassDeclaration;
  publicMethods: Set<ts.MethodDeclaration>;
  customElementsDefineCall?: ts.ExpressionStatement;
  imports: Set<ExternalImport>;
  getters: Set<ts.GetAccessorDeclaration>;
  setters: Set<ts.SetAccessorDeclaration>;
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

/*
 * Detects if a Node is of type Readonly<X>.
 */
export const nodeIsReadOnlyInterfaceReference = (node: ts.Node): node is ts.TypeReferenceNode => {
  return ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.escapedText === 'Readonly';
};
/*
 * Detects if a Node is of type ReadonlyArray<X>.
 */
export const nodeIsReadOnlyArrayInterfaceReference = (node: ts.Node): node is ts.TypeReferenceNode => {
  return ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) &&
      node.typeName.escapedText === 'ReadonlyArray';
};
/* takes a type and checks if it's either an array of interfaces or an interface
 * e.g, we're looking for: Array<Foo> or Foo
 * and not for primitives like string, number, etc
 *
 * This is so we gather a list of all user defined type references that we might need
 * to convert into Closure typedefs.
 */
const findInterfacesFromType = (node: ts.Node): Set<string> => {
  const foundInterfaces = new Set<string>();

  /*
   * If the Node is ReadOnly<X>, then we want to ditch the ReadOnly and recurse to
   * parse the inner type to check if that's an interface.
   */
  if (nodeIsReadOnlyInterfaceReference(node) || nodeIsReadOnlyArrayInterfaceReference(node)) {
    if (!node.typeArguments) {
      throw new Error('Found ReadOnly interface with no type arguments; invalid TS detected.');
    }
    return findInterfacesFromType(node.typeArguments[0]);
  }

  if (ts.isArrayTypeNode(node) && ts.isTypeReferenceNode(node.elementType) &&
      ts.isIdentifier(node.elementType.typeName)) {
    foundInterfaces.add(node.elementType.typeName.escapedText.toString());

  } else if (ts.isTypeReferenceNode(node)) {
    if (!ts.isIdentifier(node.typeName)) {
      /*
      * This means that an interface is being referenced via a qualifier, e.g.:
      * `Interfaces.Person` rather than `Person`.
      * We don't support this - all interfaces must be referenced directly.
      */
      throw new Error(
          'Found an interface that was referenced indirectly. You must reference interfaces directly, rather than via a qualifier. For example, `Person` rather than `Foo.Person`');
    }
    foundInterfaces.add(node.typeName.escapedText.toString());
  } else if (ts.isUnionTypeNode(node)) {
    /**
     * If the param is something like `x: Foo|null` we want to loop over each type
     * because we need to pull the `Foo` out.
     */
    node.types.forEach(unionTypeMember => {
      findInterfacesFromType(unionTypeMember).forEach(i => foundInterfaces.add(i));
    });
  } else if (ts.isTypeLiteralNode(node)) {
    /* type literal here means it's an object: data: { x: string; y: number, z: SomeInterface , ... }
     * so we loop over each member and recurse to find any references we need
     */
    node.members.forEach(member => {
      if (ts.isPropertySignature(member) && member.type) {
        const extraInterfaces = findInterfacesFromType(member.type);
        extraInterfaces.forEach(i => foundInterfaces.add(i));
      }
    });
  }

  return foundInterfaces;
};

const isPrivate = (node: ts.MethodDeclaration|ts.GetAccessorDeclaration|ts.SetAccessorDeclaration): boolean => {
  return node.modifiers && node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword) || false;
};

const CUSTOM_ELEMENTS_LIFECYCLE_METHODS = new Set([
  'connectedCallback',
  'disconnectedCallback',
  'adoptedCallback',
  'attributeChangedCallback',
]);

const walkNode = (node: ts.Node, startState?: WalkerState): WalkerState => {
  const state: WalkerState = startState || {
    foundInterfaces: new Set(),
    publicMethods: new Set(),
    interfaceNamesToConvert: new Set(),
    componentClass: undefined,
    customElementsDefineCall: undefined,
    imports: new Set(),
    getters: new Set(),
    setters: new Set(),

  };

  if (ts.isClassDeclaration(node)) {
    const extendsHtmlElement = classExtendsHTMLElement(node);

    if (extendsHtmlElement) {
      state.componentClass = node;
      // now we know this is the component, hunt for its public methods
      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member)) {
          if (isPrivate(member)) {
            return;
          }
          const methodName = (member.name as ts.Identifier).escapedText.toString();
          if (CUSTOM_ELEMENTS_LIFECYCLE_METHODS.has(methodName) === false) {
            /* We skip custom element lifecycle methods. Whilst they are public,
            they are never called from user code, so the bridge file does not
            need to include them.*/
            state.publicMethods.add(member);
          }

          // TODO: we should check the return type of the method - if
          // that's an interface we should include it in the _bridge.js
          // file.

          // now find its interfaces that we need to make public from the method parmeters
          member.parameters.forEach(param => {
            if (!param.type) {
              return;
            }
            const foundInterfaces = findInterfacesFromType(param.type);
            foundInterfaces.forEach(i => state.interfaceNamesToConvert.add(i));
          });
        } else if (ts.isGetAccessorDeclaration(member)) {
          if (isPrivate(member)) {
            return;
          }

          state.getters.add(member);

          if (member.type) {
            const foundInterfaces = findInterfacesFromType(member.type);
            foundInterfaces.forEach(i => state.interfaceNamesToConvert.add(i));
          }
        } else if (ts.isSetAccessorDeclaration(member)) {
          if (isPrivate(member)) {
            return;
          }

          state.setters.add(member);

          if (member.parameters[0]) {
            const setterParamType = member.parameters[0].type;
            if (setterParamType) {
              const foundInterfaces = findInterfacesFromType(setterParamType);
              foundInterfaces.forEach(i => state.interfaceNamesToConvert.add(i));
            }
          }
        }
      });
    }

  } else if (ts.isInterfaceDeclaration(node)) {
    state.foundInterfaces.add(node);
  } else if (ts.isTypeAliasDeclaration(node)) {
    state.foundInterfaces.add(node);
  } else if (ts.isImportDeclaration(node)) {
    const filePath = (node.moduleSpecifier as ts.StringLiteral).text;

    const fileWithoutExt = path.basename(filePath, '.js');
    const sourceFile = `${fileWithoutExt}.ts`;

    if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      const namedImports = node.importClause.namedBindings.elements.map(namedImport => {
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

const findNestedInterfacesInInterface = (interfaceDec: ts.InterfaceDeclaration|ts.TypeLiteralNode): Set<string> => {
  const foundNestedInterfaceNames = new Set<string>();

  interfaceDec.members.forEach(member => {
    if (ts.isPropertySignature(member)) {
      if (!member.type) {
        return;
      }
      const nestedInterfacesForMember = findInterfacesFromType(member.type);
      nestedInterfacesForMember.forEach(nested => foundNestedInterfaceNames.add(nested));
    }
  });

  return foundNestedInterfaceNames;
};

const findNestedReferencesForTypeReference =
    (state: WalkerState,
     interfaceOrTypeAliasDeclaration: ts.InterfaceDeclaration|ts.TypeAliasDeclaration): Set<string> => {
      const foundNestedReferences = new Set<string>();
      if (ts.isTypeAliasDeclaration(interfaceOrTypeAliasDeclaration)) {
        if (ts.isTypeLiteralNode(interfaceOrTypeAliasDeclaration.type)) {
          /* this means it's a type Person = { name: string } */
          const nestedInterfaces = findNestedInterfacesInInterface(interfaceOrTypeAliasDeclaration.type);
          nestedInterfaces.forEach(nestedInterface => foundNestedReferences.add(nestedInterface));
        } else if (ts.isUnionTypeNode(interfaceOrTypeAliasDeclaration.type)) {
          interfaceOrTypeAliasDeclaration.type.types.forEach(unionTypeMember => {
            if (ts.isTypeReferenceNode(unionTypeMember) &&
                ts.isIdentifierOrPrivateIdentifier(unionTypeMember.typeName)) {
              foundNestedReferences.add(unionTypeMember.typeName.escapedText.toString());
            }
          });
        } else if (ts.isIntersectionTypeNode(interfaceOrTypeAliasDeclaration.type)) {
          /**
      * This means it's something like:
      *
      * type NamedThing = { foo: Foo }
      * type Person = NamedThing & { name: 'jack' };
      *
      * The bridges generator will inline types when they are extended, so we
      * _don't_ need `NamedThing` to be defined in the bridge. But `NamedThing`
      * mentions `Foo`, so we do need to include `Foo` in the bridge.
      */
          interfaceOrTypeAliasDeclaration.type.types.forEach(nestedType => {
            if (ts.isTypeLiteralNode(nestedType)) {
              // this is any `& { name: string }` parts of the type alias.
              const nestedInterfaces = findNestedInterfacesInInterface(nestedType);
              nestedInterfaces.forEach(nestedInterface => foundNestedReferences.add(nestedInterface));
            } else if (ts.isTypeReferenceNode(nestedType) && ts.isIdentifierOrPrivateIdentifier(nestedType.typeName)) {
              // This means we have a reference to another interface so we have to
              // find the interface and check for any nested interfaces within it.
              const typeReferenceName = nestedType.typeName.escapedText.toString();
              const nestedTypeReference = Array.from(state.foundInterfaces).find(dec => {
                return dec.name.escapedText === typeReferenceName;
              });
              if (!nestedTypeReference) {
                throw new Error(`Could not find definition for type reference ${typeReferenceName}.`);
              }
              // Recurse on the nested interface because if it references any other
              // interfaces we need to include those in the bridge.
              findNestedReferencesForTypeReference(state, nestedTypeReference)
                  .forEach(nested => foundNestedReferences.add(nested));
            }
          });
        }
      } else {
        // If it wasn't a type alias, it's an interface, so walk through the interface and add any found nested types.
        const nestedInterfaces = findNestedInterfacesInInterface(interfaceOrTypeAliasDeclaration);
        nestedInterfaces.forEach(nestedInterface => foundNestedReferences.add(nestedInterface));
      }
      return foundNestedReferences;
    };

const populateInterfacesToConvert = (state: WalkerState): WalkerState => {
  state.interfaceNamesToConvert.forEach(interfaceNameToConvert => {
    const interfaceOrTypeAliasDeclaration = Array.from(state.foundInterfaces).find(dec => {
      return dec.name.escapedText === interfaceNameToConvert;
    });

    // if the interface isn't found, it might be imported, so just move on.
    if (!interfaceOrTypeAliasDeclaration) {
      return;
    }

    const foundNestedInterfaces = findNestedReferencesForTypeReference(state, interfaceOrTypeAliasDeclaration);
    foundNestedInterfaces.forEach(nested => state.interfaceNamesToConvert.add(nested));
  });

  return state;
};

export const walkTree = (startNode: ts.SourceFile, resolvedFilePath: string): WalkerState => {
  let state = walkNode(startNode);

  /**
   * Now we have a list of top level interfaces we need to convert, we need to
   * go through each one and look for any interfaces referenced within e.g.:
   *
   * ```
   * interface Baz {...}
   *
   * interface Foo {
   *   x: Baz
   * }
   *
   * // in the component
   * set data(data: { foo: Foo }) {}
   * ```
   *
   * We know we have to convert the Foo interface in the _bridge.js, but we need
   * to also convert Baz because Foo references it.
   */
  state = populateInterfacesToConvert(state);

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

  const importsToCheck = new Set<string>();

  missingInterfaces.forEach(missingInterfaceName => {
    const importForMissingInterface = Array.from(state.imports).find(imp => imp.namedImports.has(missingInterfaceName));

    if (!importForMissingInterface) {
      throw new Error(
          `Could not find definition for interface ${missingInterfaceName} in the source file or any of its imports.`);
    }

    importsToCheck.add(path.join(path.dirname(resolvedFilePath), importForMissingInterface.filePath));
  });

  importsToCheck.forEach(fullPathToImport => {
    const sourceFile = filePathToTypeScriptSourceFile(fullPathToImport);
    const stateFromSubFile = walkTree(sourceFile, fullPathToImport);

    // now merge the foundInterfaces part
    stateFromSubFile.foundInterfaces.forEach(foundInterface => {
      state.foundInterfaces.add(foundInterface);
    });
  });

  return state;
};
