// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {findNodeForTypeReferenceName} from './utils';

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
  foundEnums: Set<ts.EnumDeclaration>;
  typeReferencesToConvert: Set<string>;
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

/**
 * Takes a Node and looks for any type references within that Node. This is done
 * so that if an interface references another within its definition, that other
 * interface is found and generated within the bridge.
 */
const findTypeReferencesWithinNode = (node: ts.Node): Set<string> => {
  const foundInterfaces = new Set<string>();
  /*
   * If the Node is ReadOnly<X>, then we want to ditch the ReadOnly and recurse to
   * parse the inner type to check if that's an interface.
   */
  if (nodeIsReadOnlyInterfaceReference(node) || nodeIsReadOnlyArrayInterfaceReference(node)) {
    if (!node.typeArguments) {
      throw new Error('Found ReadOnly interface with no type arguments; invalid TS detected.');
    }
    return findTypeReferencesWithinNode(node.typeArguments[0]);
  }

  if (ts.isArrayTypeNode(node) && ts.isTypeReferenceNode(node.elementType) &&
      ts.isIdentifier(node.elementType.typeName)) {
    foundInterfaces.add(node.elementType.typeName.escapedText.toString());

  } else if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    if (node.typeName.escapedText === 'Map' || node.typeName.escapedText === 'Set') {
      // Map<X, Y> or Set<X> - we need to check the type arguments for any references>
      if (!node.typeArguments) {
        throw new Error(`Found a ${node.typeName.escapedText} without type arguments.`);
      }
      const referencesWithinGenerics = node.typeArguments.flatMap(node => [...findTypeReferencesWithinNode(node)]);
      referencesWithinGenerics.forEach(r => foundInterfaces.add(r));
    } else {
      foundInterfaces.add(node.typeName.escapedText.toString());
    }
  } else if (ts.isTypeReferenceNode(node) && ts.isQualifiedName(node.typeName)) {
    // We will need only the left type to support enum member references (e.g., 'MyEnum.Member').
    const left = node.typeName.left;
    foundInterfaces.add((left as ts.Identifier).escapedText.toString());
  } else if (ts.isUnionTypeNode(node)) {
    /**
     * If the param is something like `x: Foo|null` we want to loop over each type
     * because we need to pull the `Foo` out.
     */
    node.types.forEach(unionTypeMember => {
      findTypeReferencesWithinNode(unionTypeMember).forEach(i => foundInterfaces.add(i));
    });
  } else if (ts.isTypeLiteralNode(node)) {
    /* type literal here means it's an object: data: { x: string; y: number, z: SomeInterface , ... }
     * so we loop over each member and recurse to find any references we need
     */
    node.members.forEach(member => {
      if (ts.isPropertySignature(member) && member.type) {
        const extraInterfaces = findTypeReferencesWithinNode(member.type);
        extraInterfaces.forEach(i => foundInterfaces.add(i));
      }
    });
  }

  return foundInterfaces;
};

const isPrivate = (node: ts.MethodDeclaration|ts.GetAccessorDeclaration|ts.SetAccessorDeclaration): boolean => {
  return node.modifiers && node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword) || false;
};

// We want to check that the identifier is either LitHtml.html or just html.
// If it's not a LitHtml.html call, we don't care about this node.
const taggedTemplateExpressionIsLitHtmlCall = (node: ts.TaggedTemplateExpression): boolean => {
  // This means it's .y`blah` - so need to check if X.y is LitHtml.html
  if (ts.isPropertyAccessExpression(node.tag) && ts.isIdentifier(node.tag.expression) &&
      ts.isIdentifier(node.tag.name)) {
    const objectName = node.tag.expression.escapedText.toString();
    const propertyName = node.tag.name.escapedText.toString();
    return objectName === 'LitHtml' && propertyName === 'html';
  }

  // This means it's just x`blah` - so check if x is named `html`.
  if (ts.isIdentifier(node.tag)) {
    return node.tag.escapedText.toString() === 'html';
  }

  return false;
};

const checkTemplateSpanForTypeCastOfData = (matchingSpan: ts.TemplateSpan) => {
  const spanHasTypeCast = ts.isAsExpression(matchingSpan.expression);
  if (!spanHasTypeCast) {
    throw new Error('Error: found a lit-html .data= without an `as X` typecast.');
  }

  const typeCastIsTypeReference =
      ts.isAsExpression(matchingSpan.expression) && ts.isTypeReferenceNode(matchingSpan.expression.type);
  if (!typeCastIsTypeReference) {
    throw new Error('Error: found a lit-html .data= with an object literal typecast.');
  }
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
    foundEnums: new Set(),
    publicMethods: new Set(),
    typeReferencesToConvert: new Set(),
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

            if (!member.type) {
              throw new Error(`Public method ${methodName} needs an explicit return type annotation.`);
            }

            /* If the method returns an interface, we should include it as an
             * interface to convert. Note that this has limitations: it will
             * only work with type references, not if the type is defined
             * literally in the return type annotation. This is an accepted
             * restriction for now; we can revisit if it causes problems.
             */
            if (member.type && ts.isTypeReferenceNode(member.type) && ts.isIdentifier(member.type.typeName)) {
              state.typeReferencesToConvert.add(member.type.typeName.escapedText.toString());
            }
            state.publicMethods.add(member);
          }

          // now find its interfaces that we need to make public from the method parmeters
          member.parameters.forEach(param => {
            if (!param.type) {
              return;
            }
            const foundTypeReferences = findTypeReferencesWithinNode(param.type);
            foundTypeReferences.forEach(i => state.typeReferencesToConvert.add(i));
          });
        } else if (ts.isGetAccessorDeclaration(member)) {
          if (isPrivate(member)) {
            return;
          }

          state.getters.add(member);

          if (member.type) {
            const foundTypeReferences = findTypeReferencesWithinNode(member.type);
            foundTypeReferences.forEach(i => state.typeReferencesToConvert.add(i));
          }
        } else if (ts.isSetAccessorDeclaration(member)) {
          if (isPrivate(member)) {
            return;
          }

          state.setters.add(member);

          if (member.parameters[0]) {
            const setterParamType = member.parameters[0].type;
            if (setterParamType) {
              /* We require that setters are of the form:
               * set data(data: SomeInterface)
               * rather than defining the interface inline as an object literal.
               */
              const setterName = ts.isIdentifier(member.name) ? member.name.escapedText.toString() : '(unknown)';
              if (!ts.isTypeReferenceNode(setterParamType)) {
                throw new Error(`Setter ${setterName} has an argument whose type is not a direct type reference.`);
              }
              const foundTypeReferences = findTypeReferencesWithinNode(setterParamType);
              foundTypeReferences.forEach(i => state.typeReferencesToConvert.add(i));
            }
          }
        }
      });
    }

  } else if (ts.isInterfaceDeclaration(node)) {
    const interfaceName = node.name.escapedText.toString();
    if (builtInTypeScriptTypes.has(interfaceName)) {
      throw new Error(`Found interface ${
          interfaceName} that conflicts with TypeScript's built-in type. Please choose a different name!`);
    }
    state.foundInterfaces.add(node);
  } else if (ts.isTypeAliasDeclaration(node)) {
    const typeName = node.name.escapedText.toString();
    if (builtInTypeScriptTypes.has(typeName)) {
      throw new Error(
          `Found type ${typeName} that conflicts with TypeScript's built-in type. Please choose a different name!`);
    }
    state.foundInterfaces.add(node);
  } else if (ts.isEnumDeclaration(node)) {
    const isConstEnum = node.modifiers && node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ConstKeyword);
    if (!isConstEnum) {
      throw new Error(`Found enum ${node.name.escapedText.toString()} that is not a const enum.`);
    }

    const allMembersAreExplictlyInitialized = node.members.every(enumMember => {
      return enumMember.initializer !== undefined;
    });
    if (!allMembersAreExplictlyInitialized) {
      throw new Error(
          `Found enum ${node.name.escapedText.toString()} whose members do not have manually defined values.`);
    }

    state.foundEnums.add(node);
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
  } else if (ts.isTaggedTemplateExpression(node)) {
    if (taggedTemplateExpressionIsLitHtmlCall(node) && ts.isTemplateExpression(node.template)) {
      // Search for a template part that ends in .data=
      const dataSetterText = '.data=';

      /* This is the easy case: the template starts with it, so we grab the
       * first template span and check that.
       *
       * Here the AST will look something like:
       * TemplateExpression
       * - head: "<devtools-foo .data="
       * TemplateSpans
       * - 0: AST representing { foo: 'foo' } as X code
      */
      if (node.template.head.text.endsWith(dataSetterText)) {
        const matchingSpan = node.template.templateSpans[0];
        checkTemplateSpanForTypeCastOfData(matchingSpan);
      } else {
        /* Slightly harder case, it's not at the start, so we need to look
        * through each template span to find a template middle that ends with
        * `.data=`. A TemplateSpan contains an expression (the part being
        * interpolated) and a "middle", which is the raw text that leads up to
        * the next interpolation. Here the AST will look something like: head:
        * "foo" TemplateSpans
        * - 0:
        *   - expression representing the interpolation
        *   - middle: "<devtools-foo .data="
        * - 1:
        *   - AST representing { foo: 'foo' } as X
        *
        * So we want to find a TemplateSpan whose "middle" ends with ".data=",
        * and then look at the expression in the next TemplateSpan.
        */
        node.template.templateSpans.forEach((templateSpan, index) => {
          if (templateSpan.literal.text.endsWith(dataSetterText) && ts.isTemplateExpression(node.template)) {
            // Now we found the span with the literal text, the next span will
            // have the expression within.
            const spanWithExpression = node.template.templateSpans[index + 1];
            checkTemplateSpanForTypeCastOfData(spanWithExpression);
          }
        });
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
      const nestedInterfacesForMember = findTypeReferencesWithinNode(member.type);
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
              const nestedTypeReference = findNodeForTypeReferenceName(state, typeReferenceName);
              if (!nestedTypeReference) {
                throw new Error(`Could not find definition for type reference ${typeReferenceName}.`);
              }

              if (ts.isEnumDeclaration(nestedTypeReference)) {
                state.typeReferencesToConvert.add(nestedTypeReference.name.escapedText.toString());
              } else {
                // Recurse on the nested interface because if it references any other
                // interfaces we need to include those in the bridge.
                findNestedReferencesForTypeReference(state, nestedTypeReference)
                    .forEach(nested => foundNestedReferences.add(nested));
              }
            }
          });
        }
      } else {
        // If it wasn't a type alias, it's an interface, so walk through the interface and add any found nested types.
        const nestedInterfaces = findNestedInterfacesInInterface(interfaceOrTypeAliasDeclaration);
        nestedInterfaces.forEach(nestedInterface => foundNestedReferences.add(nestedInterface));

        // if the interface has any extensions, we need to dive into those too
        // e.g. interface X extends Y means we have to check Y for any additional type references
        if (interfaceOrTypeAliasDeclaration.heritageClauses) {
          interfaceOrTypeAliasDeclaration.heritageClauses.forEach(heritageClause => {
            const extendNames = heritageClause.types.map(heritageClauseName => {
              if (ts.isIdentifier(heritageClauseName.expression)) {
                return heritageClauseName.expression.escapedText.toString();
              }
              throw new Error('Unexpected heritageClauseName with no identifier.');
            });

            extendNames.forEach(interfaceName => {
              const interfaceDec = findNodeForTypeReferenceName(state, interfaceName);
              if (!interfaceDec) {
                throw new Error(`Could not find interface: ${interfaceName}`);
              }
              if (!ts.isInterfaceDeclaration(interfaceDec)) {
                throw new Error('Found invalid TypeScript: an interface cannot extend a type.');
              }
              const nestedInterfaces = findNestedInterfacesInInterface(interfaceDec);
              nestedInterfaces.forEach(nestedInterface => foundNestedReferences.add(nestedInterface));
            });
          });
        }
      }
      return foundNestedReferences;
    };

const populateTypeReferencesToConvert = (state: WalkerState): WalkerState => {
  state.typeReferencesToConvert.forEach(typeReferenceName => {
    const typeDeclaration = findNodeForTypeReferenceName(state, typeReferenceName);

    // if the interface isn't found, it might be imported, so just move on.
    if (!typeDeclaration) {
      return;
    }

    if (ts.isEnumDeclaration(typeDeclaration)) {
      // Enums can't have any types nested within them so we can stop at this point.
      return;
    }

    const nestedReferences = findNestedReferencesForTypeReference(state, typeDeclaration);
    nestedReferences.forEach(nested => state.typeReferencesToConvert.add(nested));
  });

  return state;
};


// This is a list of types that TS + Closure understand that aren't defined by
// the user and therefore we don't need to generate typedefs for them, and
// just convert them into Closure Note that built-in types that take generics
// are not in this list (e.g. Map, Set) because we special case parsing them
// because of the generics.
const builtInTypeScriptTypes = new Set([
  'Object',
  'Element',
  'HTMLElement',
  'HTMLDivElement',
  'HTMLTextAreaElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'HTMLOptionElement',
  'HTMLCanvasElement',
]);

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
  state = populateTypeReferencesToConvert(state);

  /* if we are here and found an interface passed to a public method
   * that we didn't find the definition for, that means it's imported
   * so we now need to walk that imported file
   */
  const allFoundTypeReferencesNames = new Set([
    ...Array.from(
        state.foundInterfaces,
        foundInterface => {
          return foundInterface.name.escapedText.toString();
        }),
    ...Array.from(
        state.foundEnums,
        foundEnum => {
          return foundEnum.name.escapedText.toString();
        }),
  ]);

  const missingTypeReferences = Array.from(state.typeReferencesToConvert).filter(name => {
    return allFoundTypeReferencesNames.has(name) === false;
  });
  /* now look at all the imports and see if we have the name of the missing interface
   * and if we do, walk that file to find the interface
   * else, error loudly
   */
  const importsToCheck = new Set<string>();

  missingTypeReferences.forEach(missingInterfaceName => {
    if (builtInTypeScriptTypes.has(missingInterfaceName)) {
      return;
    }

    const importForMissingInterface = Array.from(state.imports).find(imp => imp.namedImports.has(missingInterfaceName));

    if (!importForMissingInterface) {
      throw new Error(`Could not find definition for type reference ${
          missingInterfaceName} in the source file or any of its imports.`);
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

    stateFromSubFile.foundEnums.forEach(foundEnum => {
      state.foundEnums.add(foundEnum);
    });

    stateFromSubFile.typeReferencesToConvert.forEach(interfaceToConvert => {
      state.typeReferencesToConvert.add(interfaceToConvert);
    });
  });


  // We did this before parsing any imports from other files, but we now do it
  // again. If we found a definition in another module that we care about, we
  // need to parse it to check its nested state. This could be more efficient
  // (we have to do two passes, before and after parsing 3rd party imports), but
  // given component bridges are not going to be around forever, we will defer
  // any performance concerns here until they start slowing us down day to day.
  state = populateTypeReferencesToConvert(state);

  // If we found any nested references that reference built-in TS types we can
  // just delete them.
  builtInTypeScriptTypes.forEach(builtIn => state.typeReferencesToConvert.delete(builtIn));

  return state;
};
