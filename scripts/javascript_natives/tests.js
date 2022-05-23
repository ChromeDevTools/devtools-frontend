// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as assert from 'assert';
import ts from 'typescript';
import * as WebIDL2 from 'webidl2';

import {clearState, parseTSFunction, postProcess, walkRoot} from './helpers.js';

describe('NativeFunction signature generation', function() {
  this.afterEach(() => {
    clearState();
  });

  it('should produce correct signatures for IDL interface', function() {
    WebIDL2
        .parse(`
[
    Exposed=Window
] interface Document : Node {
    [CallWith=Document] constructor();
    [Affects=Nothing] HTMLCollection getElementsByTagName(DOMString localName);
    [Affects=Nothing] HTMLCollection getElementsByTagNameNS(DOMString? namespaceURI, DOMString localName);
    [Affects=Nothing] HTMLCollection getElementsByClassName(DOMString classNames);

    [NewObject, DoNotTestNewObject, PerWorldBindings, RaisesException, ImplementedAs=CreateElementForBinding] Element createElement(DOMString localName);
    [NewObject, DoNotTestNewObject, RaisesException] Element createElementNS(DOMString? namespaceURI, DOMString qualifiedName);
    [NewObject] DocumentFragment createDocumentFragment();
    [NewObject] Text createTextNode(DOMString data);
};
`).forEach(walkRoot);
    const output = postProcess(/* dryRun: */ true);
    const expected = `export const NativeFunctions = [
  {
    name: "getElementsByTagName",
    signatures: [["localName"]]
  },
  {
    name: "getElementsByTagNameNS",
    signatures: [["namespaceURI","localName"]]
  },
  {
    name: "getElementsByClassName",
    signatures: [["classNames"]]
  },
  {
    name: "createElement",
    signatures: [["localName"]]
  },
  {
    name: "createElementNS",
    signatures: [["namespaceURI","qualifiedName"]]
  },
  {
    name: "createTextNode",
    signatures: [["data"]]
  }
];`;
    assert.equal(output, expected);
  });

  it('should produce correct signatures for IDL mixin interface', function() {
    WebIDL2
        .parse(`[
    LegacyTreatAsPartialInterface,
    Exposed=(Window,Worker)
] interface mixin WindowOrWorkerGlobalScope {
    [CallWith=ScriptState] void reportError(any e);

    [RaisesException] DOMString atob(DOMString atob);
    [CallWith=ScriptState, RuntimeCallStatsCounter=WindowSetTimeout] long setTimeout(Function handler, optional long timeout = 0, any... arguments);
    [CallWith=ScriptState] long setTimeout(ScriptString handler, optional long timeout = 0, any... arguments);
};
`).forEach(walkRoot);
    const output = postProcess(/* dryRun: */ true);
    const expected = `export const NativeFunctions = [
  {
    name: "reportError",
    signatures: [["e"]]
  },
  {
    name: "atob",
    signatures: [["atob"]]
  },
  {
    name: "setTimeout",
    signatures: [["handler","?timeout","...arguments"]]
  }
];`;
    assert.equal(output, expected);
  });

  it('should produce correct signatures for Console IDL', function() {
    WebIDL2
        .parse(`
[Exposed=(Window,Worker,Worklet)]
namespace console {
  undefined assert(optional boolean condition = false, any... data);
  undefined table(optional any tabularData, optional sequence<DOMString> properties);
  undefined count(optional DOMString label = "default");
  undefined groupEnd();
};
`).forEach(walkRoot);
    const output = postProcess(/* dryRun: */ true);
    const expected = `export const NativeFunctions = [
  {
    name: "assert",
    signatures: [["?condition","...data"]]
  },
  {
    name: "table",
    signatures: [["?tabularData","?properties"]]
  },
  {
    name: "count",
    signatures: [["?label"]]
  }
];`;
    assert.equal(output, expected);
  });

  it('should produce correct signatures for Console IDL', function() {
    WebIDL2
        .parse(`
// https://html.spec.whatwg.org/C/#the-slot-element
[
    Exposed=Window,
    HTMLConstructor
] interface HTMLSlotElement : HTMLElement {
    [CEReactions, Reflect] attribute DOMString name;
    [ImplementedAs=AssignedNodesForBinding] sequence<Node> assignedNodes(optional AssignedNodesOptions options = {});
    [ImplementedAs=AssignedElementsForBinding] sequence<Element> assignedElements(optional AssignedNodesOptions options = {});
    [RaisesException] void assign((Element or Text)... nodes);
};
`).forEach(walkRoot);
    const output = postProcess(/* dryRun: */ true);
    const expected = `export const NativeFunctions = [
  {
    name: "assignedNodes",
    signatures: [["?options"]]
  },
  {
    name: "assignedElements",
    signatures: [["?options"]]
  },
  {
    name: "assign",
    signatures: [["...nodes"]]
  }
];`;
    assert.equal(output, expected);
  });

  it('should produce correct signatures for typescript typings', function() {
    const program = ts.createProgram(
        [
          new URL('test.d.ts', import.meta.url).pathname,
        ],
        {noLib: true, types: []});

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
    const output = postProcess(/* dryRun: */ true);
    const expected = `export const NativeFunctions = [
  {
    name: "at",
    signatures: [["index"]]
  },
  {
    name: "diffSig",
    signatures: [["oneSig"]],
    receivers: ["Array"]
  },
  {
    name: "diffSig",
    signatures: [["twoSig"]],
    receivers: ["ReadonlyArray"]
  }
];`;
    assert.equal(output, expected);
  });
});
