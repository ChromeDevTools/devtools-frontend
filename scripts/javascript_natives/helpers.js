// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

import * as fs from 'fs';
import * as path from 'path';
import {fileURLToPath} from 'url';

/** @type {Map<string, Map<string, string[][]>>} */
const methods = new Map();
/** @type {Map<string, string[]>} */
const includes = new Map();

export function clearState() {
  methods.clear();
  includes.clear();
}

export function parseTSFunction(func, node) {
  if (!func.name.escapedText) {
    return;
  }

  const args = func.parameters
                   .map(p => {
                     let text = p.name.escapedText;
                     if (p.questionToken) {
                       text = '?' + text;
                     }
                     if (p.dotDotDotToken) {
                       text = '...' + text;
                     }
                     return text;
                   })
                   .filter(x => x !== 'this');
  storeMethod(node.name.text, func.name.escapedText, args);
}

/**
 * @param {WebIDL2.IDLRootType} thing
 * */
export function walkRoot(thing) {
  switch (thing.type) {
    case 'interface':
      walkInterface(thing);
      break;
    case 'interface mixin':
    case 'namespace':
      walkMembers(thing);
      break;
    case 'includes':
      walkIncludes(thing);
      break;
  }
}

/**
 * @param {WebIDL2.IncludesType} thing
 * */
function walkIncludes(thing) {
  if (includes.has(thing.includes)) {
    includes.get(thing.includes).push(thing.target);
  } else {
    includes.set(thing.includes, [thing.target]);
  }
}
/**
 * @param {WebIDL2.InterfaceType} thing
 * */
function walkInterface(thing) {
  thing.members.forEach(member => {
    switch (member.type) {
      case 'constructor':
        storeMethod('Window', thing.name, member.arguments.map(argName));
        break;
      case 'operation':
        handleOperation(member);
    }
  });
  const namedConstructor = thing.extAttrs.find(extAttr => extAttr.name === 'NamedConstructor');
  if (namedConstructor && namedConstructor.arguments) {
    storeMethod('Window', namedConstructor.rhs.value, namedConstructor.arguments.map(argName));
  }
}

/**
 * @param {WebIDL2.NamespaceType | WebIDL2.InterfaceMixinType} thing
 * */
function walkMembers(thing) {
  thing.members.forEach(member => {
    if (member.type === 'operation') {
      handleOperation(member);
    }
  });
}

/**
 * @param {WebIDL2.OperationMemberType} member
 * */
function handleOperation(member) {
  storeMethod(member.parent.name, member.name, member.arguments.map(argName));
}

/**
 * @param {WebIDL2.Argument} a
 * */
function argName(a) {
  let name = a.name;
  if (a.optional) {
    name = '?' + name;
  }
  if (a.variadic) {
    name = '...' + name;
  }
  return name;
}

/**
 * @param {string} parent
 * @param {string} name
 * @param {Array<string>} args
 * */
function storeMethod(parent, name, args) {
  if (!methods.has(name)) {
    methods.set(name, new Map());
  }
  const method = methods.get(name);
  if (!method.has(parent)) {
    method.set(parent, []);
  }
  method.get(parent).push(args);
}

export function postProcess(dryRun = false) {
  for (const name of methods.keys()) {
    // We use the set jsonParents to track the set of different signatures across parent for this function name.
    // If all signatures are identical, we leave out the parent and emit a single NativeFunction entry without receiver.
    const jsonParents = new Set();
    for (const [parent, signatures] of methods.get(name)) {
      signatures.sort((a, b) => a.length - b.length);
      const filteredSignatures = [];
      for (const signature of signatures) {
        const smallerIndex = filteredSignatures.findIndex(smaller => startsTheSame(smaller, signature));
        if (smallerIndex !== -1) {
          filteredSignatures[smallerIndex] = (signature.map((arg, index) => {
            const otherArg = filteredSignatures[smallerIndex][index];
            if (otherArg) {
              return otherArg.length > arg.length ? otherArg : arg;
            }
            if (arg.startsWith('?') || arg.startsWith('...')) {
              return arg;
            }
            return '?' + arg;
          }));
        } else {
          filteredSignatures.push(signature);
        }
      }

      function startsTheSame(smaller, bigger) {
        for (let i = 0; i < smaller.length; i++) {
          const withoutQuestion = str => /[\?]?(.*)/.exec(str)[1];
          if (withoutQuestion(smaller[i]) !== withoutQuestion(bigger[i])) {
            return false;
          }
        }
        return true;
      }

      methods.get(name).set(parent, filteredSignatures);
      jsonParents.add(JSON.stringify(filteredSignatures));
    }
    // If all parents had the same signature for this name, we put a `*` as parent for this entry.
    if (jsonParents.size === 1) {
      methods.set(name, new Map([['*', JSON.parse(jsonParents.values().next().value)]]));
    }
    for (const [parent, signatures] of methods.get(name)) {
      if (signatures.length === 1 && !signatures[0].length) {
        methods.get(name).delete(parent);
      }
    }
    if (methods.get(name).size === 0) {
      methods.delete(name);
    }
  }
  const functions = [];
  for (const [name, method] of methods) {
    if (method.has('*')) {
      // All parents had the same signature so we emit an entry without receiver.
      functions.push({name, signatures: method.get('*')});
    } else {
      const receiversMap = new Map();
      for (const [parent, signatures] of method) {
        const receivers = receiversMap.get(JSON.stringify(signatures)) || new Set();
        if (includes.has(parent)) {
          includes.get(parent).forEach(receiver => receivers.add(receiver));
        } else {
          receivers.add(parent);
        }
        receiversMap.set(JSON.stringify(signatures), receivers);
      }
      for (const [signatures, receivers] of receiversMap) {
        functions.push({name, signatures: JSON.parse(signatures), receivers: Array.from(receivers)});
      }
    }
  }
  const output = `export const NativeFunctions = [\n${
      functions
          .map(
              entry =>
                  `  {\n${Object.entries(entry).map(kv => `    ${kv[0]}: ${JSON.stringify(kv[1])}`).join(',\n')}\n  }`)
          .join(',\n')}\n];`;

  if (dryRun) {
    return output;
  }

  fs.writeFileSync(
      (new URL('../../front_end/models/javascript_metadata/NativeFunctions.js', import.meta.url)).pathname,
      `// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Generated from ${
          path.relative(path.join(fileURLToPath(import.meta.url), '..', '..'), fileURLToPath(import.meta.url))}

${output}
`);
}
