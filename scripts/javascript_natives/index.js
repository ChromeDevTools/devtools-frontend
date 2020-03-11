// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const WebIDL2 = require('webidl2');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const glob = require('glob');
const methods = {
  __proto__: null
};
const program = ts.createProgram(
    [
      path.join(__dirname, 'node_modules', 'typescript', 'lib', 'lib.esnext.d.ts'),
    ],
    {noLib: true});
for (const file of program.getSourceFiles()) {
  ts.forEachChild(file, node => {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      for (const member of node.members) {
        if (member.kind === ts.SyntaxKind.MethodSignature) {
          parseTSFunction(member, node);
        }
      }
    }
    if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
      parseTSFunction(node, {name: {text: 'Window'}});
    }

  });
}

function parseTSFunction(func, node) {
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

glob('../../../../blink/renderer/+(core|modules)/**/*.idl', {cwd: process.env.PWD}, function(er, files) {
  for (const file of files) {
    if (file.includes('testing')) {
      continue;
    }
    const data = fs.readFileSync(path.join(process.env.PWD, file), 'utf8');
    const lines = data.split('\n');
    const newLines = [];
    for (line of lines) {
      if (!line.includes(' attribute ')) {
        newLines.push(line);
      }
    }

    try {
      WebIDL2.parse(newLines.join('\n')).forEach(walk);
    } catch (e) {
      // console.error(file);
    }
  }
  WebIDL2
      .parse(`
  namespace console {
    void assert(optional boolean condition = false, any... data);
    void clear();
    void count(optional DOMString label = "default");
    void debug(any... data);
    void dir(any item, optional object? options);
    void dirxml(any... data);
    void error(any... data);
    void group(any... data);
    void groupCollapsed(any... data);
    void groupEnd();
    void info(any... data);
    void log(any... data);
    void profile(optional DOMString title);
    void profileEnd(optional DOMString title);
    void table(any... tabularData);
    void time(optional DOMString label);
    void timeEnd(optional DOMString label);
    void timeStamp(optional DOMString name);
    void trace(any... data);
    void warn(any... data);
  };
`).forEach(walk);
  postProcess();
});

function walk(thing, parent) {
  if (thing.type === 'interface') {
    const constructor = thing.extAttrs.find(extAttr => extAttr.name === 'Constructor');
    if (constructor && constructor.arguments && thing.extAttrs.find(extAttr => extAttr.name === 'Exposed')) {
      storeMethod('Window', thing.name, constructor.arguments.map(argName));
    }

    const namedConstructor = thing.extAttrs.find(extAttr => extAttr.name === 'NamedConstructor');
    if (namedConstructor && namedConstructor.arguments) {
      storeMethod('Window', namedConstructor.rhs.value, namedConstructor.arguments.map(argName));
    }
  }
  if (thing.type.includes('operation')) {
    storeMethod(thing.static ? (parent.name + 'Constructor') : parent.name, thing.name, thing.arguments.map(argName));
    return;
  }
  if (thing.members) {
    for (const member of thing.members) {
      walk(member, thing);
    }
  }
}

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

function storeMethod(parent, name, args) {
  if (!methods[name]) {
    methods[name] = {__proto__: null};
  }
  if (!methods[name][parent]) {
    methods[name][parent] = [];
  }
  methods[name][parent].push(args);
}

function postProcess() {
  for (const name in methods) {
    const jsonParents = new Set();
    for (const parent in methods[name]) {
      const signatures = methods[name][parent];
      signatures.sort((a, b) => a.length - b.length);
      const filteredSignatures = [];
      for (const signature of signatures) {
        const smallerIndex = filteredSignatures.findIndex(smaller => startsThesame(smaller, signature));
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

      function startsThesame(smaller, bigger) {
        for (let i = 0; i < smaller.length; i++) {
          const withoutQuestion = str => /[\?]?(.*)/.exec(str)[1];
          if (withoutQuestion(smaller[i]) !== withoutQuestion(bigger[i])) {
            return false;
          }
        }
        return true;
      }

      methods[name][parent] = filteredSignatures;
      jsonParents.add(JSON.stringify(filteredSignatures));
    }
    if (jsonParents.size === 1) {
      methods[name] = {'*': JSON.parse(jsonParents.values().next().value)};
    }
    for (const parent in methods[name]) {
      const signatures = methods[name][parent];
      if (signatures.length === 1 && !signatures[0].length) {
        delete methods[name][parent];
      }
    }
    if (!Object.keys(methods[name]).length) {
      delete methods[name];
    }
  }
  const functions = [];
  for (const name in methods) {
    if (methods[name]['*']) {
      functions.push({name, signatures: methods[name]['*']});
    } else {
      for (const parent in methods[name]) {
        if (parent.endsWith('Constructor')) {
          functions.push({
            name,
            signatures: methods[name][parent],
            static: true,
            receiver: parent.substring(0, parent.length - 'Constructor'.length)
          });
        } else {
          functions.push({name, signatures: methods[name][parent], receiver: parent});
        }
      }
    }
  }

  fs.writeFileSync(
      path.join(__dirname, '..', '..', 'front_end', 'javascript_metadata', 'NativeFunctions.js'),
      `// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Generated from ${path.relative(path.join(__dirname, '..', '..'), __filename)}
export const NativeFunctions = ${JSON.stringify(functions)};
`);
}
