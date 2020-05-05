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
    } else if (nodeIsPrimitive(node)) {
      // as noted above, primitive types don't need an explicit ! when they are required
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
  output.push(`class ${generatedClassName} extends HTMLElement {`);

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
    output.push(indent(`${methodName}(${argsForFunc}) {}`, 2));
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
    output.push(indent(`get ${getterName}() {}`, 2));
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

    output.push(indent(`set ${setterName}(${setterParamName}) {}`, 2));
  });

  output.push('}');
  return output;
};


const generateInterfaceMembers = (members: ts.NodeArray<ts.TypeElement>): string[] => {
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

      output.push(`* ${keyName}:${nodeValue}`);
    }
  });

  return output;
};

export const generateInterfaces = (state: WalkerState): Array<string[]> => {
  const finalCode: Array<string[]> = [];

  state.interfaceNamesToConvert.forEach(interfaceName => {
    const interfaceDec = Array.from(state.foundInterfaces).find(dec => {
      return dec.name.escapedText === interfaceName;
    });

    if (!interfaceDec) {
      throw new Error(`Could not find interface: ${interfaceName}`);
    }

    const interfaceBits: string[] = [];
    interfaceBits.push('/**');
    interfaceBits.push('* @typedef {{');
    interfaceBits.push(...generateInterfaceMembers(interfaceDec.members));
    interfaceBits.push('* }}');
    interfaceBits.push('*/');
    interfaceBits.push('// @ts-ignore we export this for Closure not TS');
    interfaceBits.push(`export let ${interfaceName};`);

    finalCode.push(interfaceBits);
  });

  return finalCode;
};

export interface GeneratedCode {
  interfaces: string[][];
  closureClass: string[];
  creatorFunction: string[];
}

export const generateClosureBridge = (state: WalkerState): GeneratedCode => {
  /* To find the interfaces to convert we go through all the public
   * methods that we found and look at any interfaces that they take in
   * as arguments
   */
  const interfacesToConvert = new Set<string>();

  state.publicMethods.forEach(method => {
    method.parameters.forEach(param => {
      if (!param.type) {
        return;
      }
      // this case matches foo: Array<X> or foo: X[] and pulls out X as an interface we care about
      if (ts.isArrayTypeNode(param.type) && ts.isTypeReferenceNode(param.type.elementType) &&
          ts.isIdentifier(param.type.elementType.typeName)) {
        interfacesToConvert.add(param.type.elementType.typeName.escapedText.toString());

      } else if (ts.isTypeReferenceNode(param.type) && ts.isIdentifier(param.type.typeName)) {
        interfacesToConvert.add(param.type.typeName.escapedText.toString());
      }
    });
  });

  const result: GeneratedCode = {
    interfaces: generateInterfaces(state),
    closureClass: generateClosureClass(state),
    creatorFunction: generateCreatorFunction(state),
  };

  return result;
};
