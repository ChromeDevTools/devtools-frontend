// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ts from 'typescript';

import {nodeIsPrimitive, valueForTypeNode} from './value_for_type_node.js';
import {WalkerState} from './walk_tree.js';

export const generateCreatorFunction = (state: WalkerState): string[] => {
  if (!state.componentClass || !state.componentClass.name || !state.customElementsDefineCall) {
    throw new Error('No component class or custom elements define call found: cannot generate creator function.');
  }
  const componentClassName = state.componentClass.name.escapedText.toString();

  const call = state.customElementsDefineCall.expression as ts.CallExpression;
  const customElementTagArgument = call.arguments[0] as ts.StringLiteral;
  const customElementTagName = customElementTagArgument.text;
  const componentClassCamelCased = componentClassName[0].toUpperCase() + componentClassName.slice(1);

  const interfaceName = generatedClassInterfaceName(state.componentClass);

  const output: string[] = [
    '/**',
    `* @return {!${interfaceName}}`,
    '*/',
    `export function create${componentClassCamelCased}() {`,
    `  return /** @type {!${interfaceName}} */ (document.createElement('${customElementTagName}'));`,
    '}',
  ];
  return output;
};

const generatedClassInterfaceName = (componentClass: ts.ClassDeclaration): string => {
  const className = componentClass.name && componentClass.name.escapedText;
  // the name needs to differ from the TypeScript name so there's no TS/Closure conflicts
  return `${className}ClosureInterface`;
};

const indent = (str: string, amountOfSpaces: number): string => {
  return ' '.repeat(amountOfSpaces) + str;
};

const paramIsMarkedAsOptionalOrRequired = (param: string) => {
  const startChars = ['!', '?'];
  return startChars.some(c => param.startsWith(c));
};

interface TypeNodeToJSDocOptions {
  paramName: string;
  nodeIsOptional: boolean;
  docType: 'param'|'return';
}

const typeNodeToJSDocClosureType = (node: ts.TypeNode, options: TypeNodeToJSDocOptions): string => {
  const paramValue = valueForTypeNode(node, true);
  const {nodeIsOptional, paramName, docType} = options;

  const paramNameIfRequired = docType === 'param' ? ` ${paramName}` : '';

  /* the rules for ? or ! inside params are subtle when we are given
   * an interface that's optional in TypeScript land we need to tell
   * Closure that it's optional _but not nullable_.?Foo in Closure
   * would let Foo be null so instead we go for {!Foo=} which states
   * it's optional but not nullable. but note that if we pass a
   * union of Foo | Null, that should become {?Foo}, which is dealt
   * with within valueForTypeNode().
   *
   * additionally, primitive optionals in TS aren't as
   * straightforward as throwing a ? on it as that makes it
   * nullable, not optional
   *
   * we also don't need a ! at the start of primitive non-optional
   * types, but do need the ! at the start of non-optional
   * interfaces
   *
   * TS                    <|> Closure
   * person?: Person       <|> {!Person=}
   * person: Person | null <|> {?Person}
   * name?: string         <|> {(string|undefined)=}
   */

  if (ts.isTypeReferenceNode(node)) {
    const paramString = ['!', paramValue, nodeIsOptional ? '=' : ''].join('');
    return `* @${docType} {${paramString}}${paramNameIfRequired}`;
  }

  if (ts.isArrayTypeNode(node)) {
    /* a required array = !Array.<!Foo>
     * an optional array = (!Array.<!Foo>|undefined)=
     * so we first construct the param as if it was required
     * because if it's optional we just add |undefined and wrap in braces
     */

    let output = '!Array.<';

    const internalType = node.elementType;
    if (nodeIsPrimitive(internalType)) {
      output += valueForTypeNode(internalType, true);
    } else if (ts.isTypeReferenceNode(internalType)) {
      // interfaces need the ! so they are non-nullable in Closure land
      output += `!${valueForTypeNode(internalType, true)}`;
    } else {
      throw new Error(`Unsupported Array<X> type: ${ts.SyntaxKind[internalType.kind]}`);
    }
    output += '>';

    if (nodeIsOptional) {
      output = `(${output}|undefined)=`;
    }

    return `* @${docType} {${output}}${paramNameIfRequired}`;
  }


  // valueForTypeNode() may have added a ! or ? in which case we don't need to.
  const needsOptionalModifier = paramIsMarkedAsOptionalOrRequired(paramValue) === false;

  if (nodeIsOptional) {
    const paramString = ['(', paramValue, '|', 'undefined', ')='].join('');
    return `* @${docType} {${paramString}}${paramNameIfRequired}`;
  }

  let paramOptionalModifier = '';
  if (needsOptionalModifier) {
    if (nodeIsOptional) {
      paramOptionalModifier = '?';
    } else if (nodeIsPrimitive(node) || ts.isTypeLiteralNode(node)) {
      /* primitive types don't need an explicit ! when they are required
       * and type literals (object literals) don't either.
       */
      paramOptionalModifier = '';
    } else {
      paramOptionalModifier = '!';
    }
  }

  return `* @${docType} {${paramOptionalModifier}${paramValue}}${paramNameIfRequired}`;
};

export const generateClosureClass = (state: WalkerState): string[] => {
  const customElementClass = state.componentClass;
  if (!customElementClass) {
    throw new Error('No component class: cannot generate Closure class.');
  }
  const output: string[] = [];
  const generatedClassName = generatedClassInterfaceName(customElementClass);
  // the line is used as a Closure typedoc so it is used
  output.push('// eslint-disable-next-line no-unused-vars');
  output.push(`export class ${generatedClassName} extends HTMLElement {`);

  state.publicMethods.forEach(method => {
    let methodName = '';
    if (ts.isIdentifier(method.name)) {
      methodName = method.name.escapedText.toString();
    }

    // get the arguments for the function so we can place them in the definition
    const argsForFunc = method.parameters
                            .map(param => {
                              return (param.name as ts.Identifier).escapedText.toString();
                            })
                            .join(', ');

    let jsDocForFunc = ['/**'];
    method.parameters.forEach(param => {
      if (!param.type) {
        return;
      }
      const paramName = (param.name as ts.Identifier).escapedText.toString();
      const parsedParam = typeNodeToJSDocClosureType(param.type, {
        paramName,
        nodeIsOptional: !!param.questionToken,
        docType: 'param',
      });

      jsDocForFunc.push(parsedParam);
    });

    jsDocForFunc.push('*/');
    jsDocForFunc = jsDocForFunc.map(line => indent(line, 2));

    output.push(jsDocForFunc.join('\n'));
    /* We split the closing brace onto its own line as that's how Clang format
     * does things - so doing it here means we save an extra change when the presubmit
     * checks run Clang and reformat the braces.
     */
    output.push(indent(`${methodName}(${argsForFunc}) {`, 2));
    output.push(indent('}', 2));
  });

  state.getters.forEach(getter => {
    let jsDocForFunc = ['/**'];
    const getterName = (getter.name as ts.Identifier).escapedText.toString();

    if (!getter.type) {
      throw new Error(`Found invalid getter with no return type: ${getterName}`);
    }

    const returnTypeClosure = typeNodeToJSDocClosureType(getter.type, {
      paramName: getterName,
      /* return types in TypeScript are never optional
       * you can do Foo | null but that's not optional, that's a union type
       */
      nodeIsOptional: false,
      docType: 'return',
    });

    jsDocForFunc.push(returnTypeClosure);
    jsDocForFunc.push('*/');
    jsDocForFunc = jsDocForFunc.map(line => indent(line, 2));

    output.push(jsDocForFunc.join('\n'));
    output.push(indent(`get ${getterName}() {`, 2));
    output.push(indent('}', 2));
  });

  state.setters.forEach(setter => {
    let jsDocForFunc = ['/**'];
    const setterName = (setter.name as ts.Identifier).escapedText.toString();

    if (setter.parameters.length === 0) {
      throw new Error(`Found invalid setter with no parameter: ${setterName}`);
    }

    const setterParamName = (setter.parameters[0].name as ts.Identifier).escapedText.toString();
    const setterParamType = setter.parameters[0].type;

    if (!setterParamType) {
      throw new Error(`Found invalid setter with no explicit parameter type: ${setterName}`);
    }

    const parsedType = typeNodeToJSDocClosureType(setterParamType, {
      docType: 'param',
      nodeIsOptional: !!setter.parameters[0].questionToken,
      paramName: setterParamName,
    });

    jsDocForFunc.push(parsedType);
    jsDocForFunc.push('*/');
    jsDocForFunc = jsDocForFunc.map(line => indent(line, 2));
    output.push(jsDocForFunc.join('\n'));

    output.push(indent(`set ${setterName}(${setterParamName}) {`, 2));
    output.push(indent('}', 2));
  });

  output.push('}');
  return output;
};


const generateInterfaceMembers = (members: ts.NodeArray<ts.TypeElement|ts.TypeNode>): string[] => {
  const output: string[] = [];

  members.forEach(member => {
    if (ts.isPropertySignature(member)) {
      if (!member.type) {
        throw new Error(`Interface member ${ts.SyntaxKind[member.kind]} did not have a type key, aborting.`);
      }

      const keyIdentifer = member.name as ts.Identifier;
      const memberIsOptional = !!member.questionToken;
      const keyName = keyIdentifer.escapedText;
      let nodeValue = valueForTypeNode(member.type);

      if (memberIsOptional) {
        if (nodeIsPrimitive(member.type)) {
          nodeValue = `(${nodeValue}|undefined)`;
        } else {
          nodeValue = `(!${nodeValue}|undefined)`;
        }
      }

      output.push(`* ${keyName}:${nodeValue},`);
    }
  });

  return output;
};

/**
 * Takes a type reference node, looks up the state of found interface for it,
 * and returns its members.
 */
const membersForTypeReference = (foundInterfaces: WalkerState['foundInterfaces'],
                                 typeReference: ts.TypeReferenceNode): ts.NodeArray<ts.TypeElement|ts.TypeNode> => {
  if (!ts.isIdentifierOrPrivateIdentifier(typeReference.typeName)) {
    throw new Error('Unexpected type reference without an identifier.');
  }
  const interfaceName = typeReference.typeName.escapedText.toString();

  const interfaceOrTypeAlias = Array.from(foundInterfaces).find(dec => {
    return dec.name.escapedText === interfaceName;
  });

  if (!interfaceOrTypeAlias) {
    throw new Error(`Could not find interface or type alias: ${interfaceName}`);
  }

  if (ts.isInterfaceDeclaration(interfaceOrTypeAlias)) {
    return interfaceOrTypeAlias.members;
  }

  if (ts.isTypeAliasDeclaration(interfaceOrTypeAlias) && ts.isUnionTypeNode(interfaceOrTypeAlias.type)) {
    return interfaceOrTypeAlias.type.types;
  }

  if (ts.isTypeAliasDeclaration(interfaceOrTypeAlias) && ts.isTypeLiteralNode(interfaceOrTypeAlias.type)) {
    return interfaceOrTypeAlias.type.members;
  }

  throw new Error(`Unexpected type reference: ${ts.SyntaxKind[interfaceOrTypeAlias.kind]}`);
};

const generateClosureForInterface =
    (foundInterfaces: WalkerState['foundInterfaces'], interfaceName: string): string[] => {
      const interfaceOrTypeAlias = Array.from(foundInterfaces).find(dec => {
        return dec.name.escapedText === interfaceName;
      });

      if (!interfaceOrTypeAlias) {
        throw new Error(`Could not find interface or type alias: ${interfaceName}`);
      }

      const interfaceBits: string[] = ['/**'];

      if (ts.isInterfaceDeclaration(interfaceOrTypeAlias)) {
        // e.g. interface X { ... }
        interfaceBits.push('* @typedef {{');
        interfaceBits.push(...generateInterfaceMembers(interfaceOrTypeAlias.members));
        interfaceBits.push('* }}');
        interfaceBits.push('*/');
      } else if (ts.isTypeAliasDeclaration(interfaceOrTypeAlias) && ts.isUnionTypeNode(interfaceOrTypeAlias.type)) {
        // e.g. type X = A|B, type Y = string|number, etc
        const unionTypeConverted = interfaceOrTypeAlias.type.types.map(v => valueForTypeNode(v)).join('|');
        interfaceBits.push(`* @typedef {${unionTypeConverted}}`);
        interfaceBits.push('*/');
      } else if (ts.isTypeAliasDeclaration(interfaceOrTypeAlias) && ts.isTypeLiteralNode(interfaceOrTypeAlias.type)) {
        // e.g. type X = { name: string; }
        interfaceBits.push('* @typedef {{');
        interfaceBits.push(...generateInterfaceMembers(interfaceOrTypeAlias.type.members));
        interfaceBits.push('* }}');
        interfaceBits.push('*/');
      } else if (
          ts.isTypeAliasDeclaration(interfaceOrTypeAlias) && ts.isIntersectionTypeNode(interfaceOrTypeAlias.type)) {
        // e.g. type Foo = Bar & {...}
        /* Closure types don't support being extended, so in this case we define the type Foo
      * in Closure as all the members of Foo and all the members of Bar
      */
        interfaceBits.push('* @typedef {{');
        const allMembers: (ts.TypeNode|ts.TypeElement)[] = [];
        interfaceOrTypeAlias.type.types.forEach(typePart => {
          if (ts.isTypeLiteralNode(typePart)) {
            allMembers.push(...typePart.members);
          } else if (ts.isTypeReferenceNode(typePart)) {
            /** This means it's a reference to either an interface or a type alias
         * So we need to find that object in the interfaces that the tree walker found
         * And then parse out the members to Closure.
         */
            const members = membersForTypeReference(foundInterfaces, typePart);
            allMembers.push(...members);
          } else {
            throw new Error(`Unsupported: a type extended something that the bridges generator doesn't understand: ${
                ts.SyntaxKind[typePart.kind]}`);
          }
        });

        /**
          * Now we have all the members, we need to check if any override each other.
          * e.g.:
          * type Person = { name: string }
          * type Jack = Person & { name: 'jack' }
          *
          * Should generate a typedef with one `name` key, set to the string "jack".
          *
          * Because we populate the array of allMembers from left to right, that
          * means we can loop over them now and set the keys in the map as we
          * go. Any that are overriden will have their entry in the map
          * overriden accordingly
          * and then we can take the final list of members and convert those to Closure syntax.
          */
        const membersToOutput = new Map<string, ts.TypeNode|ts.TypeElement>();
        allMembers.forEach(member => {
          if (!ts.isPropertySignature(member)) {
            throw new Error(`Unexpected member without a property signature: ${ts.SyntaxKind[member.kind]}`);
          }
          const keyIdentifer = (member.name as ts.Identifier).escapedText.toString();
          membersToOutput.set(keyIdentifer, member);
        });
        const finalMembers = ts.createNodeArray([...membersToOutput.values()]);
        interfaceBits.push(...generateInterfaceMembers(finalMembers));

        interfaceBits.push('* }}');
        interfaceBits.push('*/');
      } else {
        throw new Error(`Unsupported type alias nested type: ${ts.SyntaxKind[interfaceOrTypeAlias.type.kind]}.`);
      }

      interfaceBits.push('// @ts-ignore we export this for Closure not TS');
      interfaceBits.push(`export let ${interfaceName};`);

      return interfaceBits;
    };

export const generateInterfaces = (state: WalkerState): Array<string[]> => {
  const finalCode: Array<string[]> = [];

  state.interfaceNamesToConvert.forEach(interfaceName => {
    finalCode.push(generateClosureForInterface(state.foundInterfaces, interfaceName));
  });

  return finalCode;
};

export interface GeneratedCode {
  interfaces: string[][];
  closureClass: string[];
  creatorFunction: string[];
}

export const generateClosureBridge = (state: WalkerState): GeneratedCode => {
  const result: GeneratedCode = {
    interfaces: generateInterfaces(state),
    closureClass: generateClosureClass(state),
    creatorFunction: generateCreatorFunction(state),
  };

  return result;
};
