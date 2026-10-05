// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Elements from './elements.js';

describeWithEnvironment('DOMPath', () => {
  let target: SDK.Target.Target;
  let domModel: SDK.DOMModel.DOMModel;

  beforeEach(() => {
    target = createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
  });

  interface NodeSpec {
    nodeType: number;
    nodeName: string;
    localName?: string;
    nodeValue?: string;
    attributes?: Record<string, string>;
    children?: NodeSpec[];
  }

  let nextNodeId = 1;
  function buildPayload(spec: NodeSpec): Protocol.DOM.Node {
    const id = nextNodeId++;
    const attributes: string[] = [];
    if (spec.attributes) {
      for (const [key, value] of Object.entries(spec.attributes)) {
        attributes.push(key, value);
      }
    }
    return {
      nodeId: id as Protocol.DOM.NodeId,
      backendNodeId: id as Protocol.DOM.BackendNodeId,
      nodeType: spec.nodeType,
      nodeName: spec.nodeName,
      localName: spec.localName ?? spec.nodeName.toLowerCase(),
      nodeValue: spec.nodeValue ?? '',
      attributes,
      children: spec.children ? spec.children.map(buildPayload) : undefined,
      childNodeCount: spec.children ? spec.children.length : 0,
    };
  }

  function createDOMNode(spec: NodeSpec): SDK.DOMModel.DOMNode {
    const payload = buildPayload(spec);
    return SDK.DOMModel.DOMNode.create(domModel, null, false, payload);
  }

  const htmlSpec: NodeSpec = {
    nodeType: Node.DOCUMENT_NODE,
    nodeName: '#document',
    children: [{
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'HTML',
      children: [
        {nodeType: Node.ELEMENT_NODE, nodeName: 'HEAD', children: [{nodeType: Node.ELEMENT_NODE, nodeName: 'BASE'}]},
        {
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'BODY',
          children: [
            {nodeType: Node.ELEMENT_NODE, nodeName: 'ARTICLE'},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'ARTICLE'},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'number'}},
            {
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'DIV',
              attributes: {id: 'ids'},
              children: [
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV'},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'inner-id'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '__proto__'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '#"ridiculous".id'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '\'quoted.value\''}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '.foo.bar'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '-'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '-a'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '-0'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '7'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'ид'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '#'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '#foo'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '##'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '#.#.#'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '_'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '{}'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '.fake-class'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'foo.bar'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: ':hover'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: ':hover:focus:active'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '[attr=value]'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'f/o/o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'foo'}},  // f\o\o -> foo
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'f*o*o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'f!o!o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'f\'o\'o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'f~o~o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'f+o+o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'text', id: 'input-id'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'text'}},
                {
                  nodeType: Node.ELEMENT_NODE,
                  nodeName: 'INPUT',
                  attributes: {type: 'something-invalid-\'-"-and-weird'},
                },
                {nodeType: Node.ELEMENT_NODE, nodeName: 'P'},
              ],
            },
            {
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'DIV',
              attributes: {id: 'classes'},
              children: [
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'foo bar'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: ' foo foo '}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '.foo'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '.foo.bar'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '-'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '-a'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '-0'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '--a'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '---a'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '7'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'класс'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '__proto__'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '__proto__ foo'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '#'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '#foo'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '##'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '#.#.#'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '_'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '{}'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: ':hover'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: ':hover:focus:active'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: '[attr=value]'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'f/o/o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'foo'}},  // f\o\o -> foo
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'f*o*o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'f!o!o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'f\'o\'o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'f~o~o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'f+o+o'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', attributes: {class: 'bar'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'id-with-class', class: 'moo'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'text', class: 'input-class-one'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'text', class: 'input-class-two'}},
              ],
            },
            {
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'DIV',
              attributes: {id: 'non-unique-classes'},
              children: [
                {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', attributes: {class: 'c1'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', attributes: {class: 'c1'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', attributes: {class: 'c1 c2'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', attributes: {class: 'c1 c2 c3'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN'},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'c1'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'c1 c2'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'c3 c2'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'c3 c4'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'c1 c4'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'text', class: 'input-class'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'text', class: 'input-class'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV'},
              ],
            },
          ],
        },
      ],
    }],
  };

  const expectedPaths = [
    'html',
    'head',
    'head > base',
    'body',
    'body > article:nth-child(1)',
    'body > article:nth-child(2)',
    'body > input[type=number]',
    '#ids',
    '#ids > div:nth-child(1)',
    '#inner-id',
    '#__proto__',
    '#\\#\\"ridiculous\\"\\.id',
    '#\\\'quoted\\.value\\\'',
    '#\\.foo\\.bar',
    '#\\-',
    '#-a',
    '#-\\30 ',
    '#\\37 ',
    '#ид',
    '#\\#',
    '#\\#foo',
    '#\\#\\#',
    '#\\#\\.\\#\\.\\#',
    '#_',
    '#\\{\\}',
    '#\\.fake-class',
    '#foo\\.bar',
    '#\\:hover',
    '#\\:hover\\:focus\\:active',
    '#\\[attr\\=value\\]',
    '#f\\/o\\/o',
    '#foo',
    '#f\\*o\\*o',
    '#f\\!o\\!o',
    '#f\\\'o\\\'o',
    '#f\\~o\\~o',
    '#f\\+o\\+o',
    '#input-id',
    '#ids > input[type=text]:nth-child(31)',
    '#ids > input[type=something-invalid-\\\'-\\"-and-weird]:nth-child(32)',
    '#ids > p',
    '#classes',
    '#classes > div.foo.bar',
    '#classes > div:nth-child(2)',
    '#classes > div.\\.foo',
    '#classes > div.\\.foo\\.bar',
    '#classes > div.\\-',
    '#classes > div.-a',
    '#classes > div.-\\30 ',
    '#classes > div.--a',
    '#classes > div.---a',
    '#classes > div.\\37 ',
    '#classes > div.класс',
    '#classes > div:nth-child(12)',
    '#classes > div.__proto__.foo',
    '#classes > div.\\#',
    '#classes > div.\\#foo',
    '#classes > div.\\#\\#',
    '#classes > div.\\#\\.\\#\\.\\#',
    '#classes > div._',
    '#classes > div.\\{\\}',
    '#classes > div.\\:hover',
    '#classes > div.\\:hover\\:focus\\:active',
    '#classes > div.\\[attr\\=value\\]',
    '#classes > div.f\\/o\\/o',
    '#classes > div:nth-child(24)',
    '#classes > div.f\\*o\\*o',
    '#classes > div.f\\!o\\!o',
    '#classes > div.f\\\'o\\\'o',
    '#classes > div.f\\~o\\~o',
    '#classes > div.f\\+o\\+o',
    '#classes > span',
    '#id-with-class',
    '#classes > input.input-class-one',
    '#classes > input.input-class-two',
    '#non-unique-classes',
    '#non-unique-classes > span:nth-child(1)',
    '#non-unique-classes > span:nth-child(2)',
    '#non-unique-classes > span:nth-child(3)',
    '#non-unique-classes > span.c1.c2.c3',
    '#non-unique-classes > span:nth-child(5)',
    '#non-unique-classes > div:nth-child(6)',
    '#non-unique-classes > div.c1.c2',
    '#non-unique-classes > div.c3.c2',
    '#non-unique-classes > div.c3.c4',
    '#non-unique-classes > div.c1.c4',
    '#non-unique-classes > input:nth-child(11)',
    '#non-unique-classes > input:nth-child(12)',
    '#non-unique-classes > div:nth-child(13)',
  ];

  it('DOMNode.cssPath() matches expectations', () => {
    const rootNode = createDOMNode(htmlSpec);
    const paths: string[] = [];

    function collectPaths(node: SDK.DOMModel.DOMNode) {
      if (node.nodeType() === Node.ELEMENT_NODE) {
        paths.push(Elements.DOMPath.cssPath(node, true));
      }
      const children = node.children();
      if (children) {
        for (const child of children) {
          collectPaths(child);
        }
      }
    }

    const children = rootNode.children();
    assert.exists(children);
    for (const child of children!) {
      collectPaths(child);
    }

    assert.deepEqual(paths, expectedPaths);
  });

  it('computes jsPath escaping quotes, special IDs, and class selectors', () => {
    const rootNode = createDOMNode({
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      children: [{
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'HTML',
        children: [{
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'BODY',
          children: [
            {nodeType: Node.ELEMENT_NODE, nodeName: 'ARTICLE'},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'ARTICLE'},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'number'}},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'inner-id'}},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '__proto__'}},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '#"ridiculous".id'}},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: '\'quoted.value\''}},
            {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: ':hover'}},
            {
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'DIV',
              attributes: {id: 'classes'},
              children: [
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'foo bar'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'baz'}},
              ],
            },
          ],
        }],
      }],
    });

    const jsPaths: string[] = [];
    const collect = (node: SDK.DOMModel.DOMNode) => {
      if (node.nodeType() === Node.ELEMENT_NODE) {
        jsPaths.push(Elements.DOMPath.jsPath(node, true));
      }
      node.children()?.forEach(collect);
    };
    collect(rootNode);

    assert.deepEqual(jsPaths, [
      'document.querySelector("html")',
      'document.querySelector("body")',
      'document.querySelector("body > article:nth-child(1)")',
      'document.querySelector("body > article:nth-child(2)")',
      'document.querySelector("body > input[type=number]")',
      'document.querySelector("#inner-id")',
      'document.querySelector("#__proto__")',
      'document.querySelector("#\\\\#\\\\\\"ridiculous\\\\\\"\\\\.id")',
      'document.querySelector("#\\\\\'quoted\\\\.value\\\\\'")',
      'document.querySelector("#\\\\:hover")',
      'document.querySelector("#classes")',
      'document.querySelector("#classes > div.foo.bar")',
      'document.querySelector("#classes > div.baz")',
    ]);
  });

  it('computes xPath with and without optimization for nested elements, sibling indices, and IDs', () => {
    const docNode = createDOMNode({
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      children: [{
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'HTML',
        children: [{
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'BODY',
          children: [
            {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV'},
            {
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'DIV',
              attributes: {id: 'anchor-id'},
              children: [
                {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN'},
                {
                  nodeType: Node.ELEMENT_NODE,
                  nodeName: 'SPAN',
                  children: [{nodeType: Node.TEXT_NODE, nodeName: '#text', nodeValue: 'hello'}],
                },
                {nodeType: Node.COMMENT_NODE, nodeName: '#comment', nodeValue: 'note'},
              ],
            },
          ],
        }],
      }],
    });

    const bodyNode = docNode.children()![0].children()![0];
    const [firstDiv, secondDiv] = bodyNode.children()!;
    const [firstSpan, secondSpan, commentNode] = secondDiv.children()!;
    const textNode = secondSpan.children()![0];

    assert.strictEqual(Elements.DOMPath.xPath(docNode, true), '/');
    assert.strictEqual(Elements.DOMPath.xPath(firstDiv, false), '/html/body/div[1]');
    assert.strictEqual(Elements.DOMPath.xPath(firstDiv, true), '/html/body/div[1]');
    assert.strictEqual(Elements.DOMPath.xPath(secondDiv, false), '/html/body/div[2]');
    assert.strictEqual(Elements.DOMPath.xPath(secondDiv, true), '//*[@id="anchor-id"]');
    assert.strictEqual(Elements.DOMPath.xPath(firstSpan, false), '/html/body/div[2]/span[1]');
    assert.strictEqual(Elements.DOMPath.xPath(firstSpan, true), '//*[@id="anchor-id"]/span[1]');
    assert.strictEqual(Elements.DOMPath.xPath(secondSpan, false), '/html/body/div[2]/span[2]');
    assert.strictEqual(Elements.DOMPath.xPath(secondSpan, true), '//*[@id="anchor-id"]/span[2]');
    assert.strictEqual(Elements.DOMPath.xPath(textNode, false), '/html/body/div[2]/span[2]/text()');
    assert.strictEqual(Elements.DOMPath.xPath(textNode, true), '//*[@id="anchor-id"]/span[2]/text()');
    assert.strictEqual(Elements.DOMPath.xPath(commentNode, true), '//*[@id="anchor-id"]/comment()');
  });

  it('computes jsPath and xPath for nodes inside nested shadow roots', () => {
    const innerShadow = Object.assign(buildPayload({
                                        nodeType: Node.DOCUMENT_FRAGMENT_NODE,
                                        nodeName: '#document-fragment',
                                        localName: '',
                                        children: [{
                                          nodeType: Node.ELEMENT_NODE,
                                          nodeName: 'SPAN',
                                          attributes: {id: 'deep-shadow-target'},
                                          children: [{nodeType: Node.ELEMENT_NODE, nodeName: 'B'}],
                                        }],
                                      }),
                                      {shadowRootType: 'open' as Protocol.DOM.ShadowRootType});
    const innerHost =
        Object.assign(buildPayload({nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'inner-host'}}),
                      {shadowRoots: [innerShadow]});
    const outerShadow = Object.assign(
        buildPayload({nodeType: Node.DOCUMENT_FRAGMENT_NODE, nodeName: '#document-fragment', localName: ''}),
        {shadowRootType: 'open' as Protocol.DOM.ShadowRootType, children: [innerHost]});
    const outerHost =
        Object.assign(buildPayload({nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'outer-host'}}),
                      {shadowRoots: [outerShadow]});
    const docPayload = buildPayload({
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      children: [
        {nodeType: Node.ELEMENT_NODE, nodeName: 'HTML', children: [{nodeType: Node.ELEMENT_NODE, nodeName: 'BODY'}]},
      ],
    });
    docPayload.children![0].children![0].children = [outerHost];

    const doc = SDK.DOMModel.DOMNode.create(domModel, null, false, docPayload);
    const deepTarget = doc.children()![0]
                           .children()![0]
                           .children()![0]
                           .shadowRoots()[0]
                           .children()![0]
                           .shadowRoots()[0]
                           .children()![0];
    const deepChild = deepTarget.children()![0];

    assert.isTrue(Elements.DOMPath.canGetJSPath(deepTarget));
    assert.strictEqual(
        Elements.DOMPath.jsPath(deepTarget, true),
        'document.querySelector("#outer-host").shadowRoot.querySelector("#inner-host").shadowRoot.querySelector("#deep-shadow-target")');
    assert.strictEqual(
        Elements.DOMPath.jsPath(deepChild, true),
        'document.querySelector("#outer-host").shadowRoot.querySelector("#inner-host").shadowRoot.querySelector("#deep-shadow-target > b")');
    assert.strictEqual(Elements.DOMPath.xPath(deepTarget, true), '//*[@id="deep-shadow-target"]');
    assert.strictEqual(Elements.DOMPath.xPath(deepChild, true), '//*[@id="deep-shadow-target"]/b');
  });

  it('computes xPath text()[n] across mixed text/CDATA siblings and document-level comment()[n]', () => {
    // Mirrors legacy elements/node-xpath (resources/node-xpath.xhtml).
    const doc = createDOMNode({
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      children: [
        {nodeType: Node.COMMENT_NODE, nodeName: '#comment', nodeValue: ' Pre-comment '},
        {
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'html',
          children: [
            {
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'head',
              children: [{
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'script',
                children: [
                  {nodeType: Node.TEXT_NODE, nodeName: '#text', nodeValue: '\n// Comment\n//'},
                  {nodeType: Node.CDATA_SECTION_NODE, nodeName: '#cdata-section', nodeValue: '\nfunction f() {}\n//'},
                ],
              }],
            },
            {
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'body',
              children: [
                {nodeType: Node.ELEMENT_NODE, nodeName: 'div', attributes: {id: 'id1'}},
                {nodeType: Node.ELEMENT_NODE, nodeName: 'div', attributes: {id: 'id2'}},
                {
                  nodeType: Node.ELEMENT_NODE,
                  nodeName: 'div',
                  attributes: {id: 'container'},
                  children: [
                    {
                      nodeType: Node.ELEMENT_NODE,
                      nodeName: 'div',
                      attributes: {id: 'id3'},
                      children: [
                        {nodeType: Node.TEXT_NODE, nodeName: '#text', nodeValue: '3 Prefix '},
                        {
                          nodeType: Node.CDATA_SECTION_NODE,
                          nodeName: '#cdata-section',
                          nodeValue: '<greeting>Hello, world!</greeting>',
                        },
                        {nodeType: Node.TEXT_NODE, nodeName: '#text', nodeValue: ' Suffix'},
                      ],
                    },
                    {
                      nodeType: Node.ELEMENT_NODE,
                      nodeName: 'div',
                      attributes: {id: 'id4'},
                      children: [{nodeType: Node.TEXT_NODE, nodeName: '#text', nodeValue: '4'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {nodeType: Node.COMMENT_NODE, nodeName: '#comment', nodeValue: ' Post-comment '},
      ],
    });

    const lines: string[] = [];
    const dump = (node: SDK.DOMModel.DOMNode) => {
      lines.push(`${node.nodeName()} - ${Elements.DOMPath.xPath(node, true)} - ${Elements.DOMPath.xPath(node, false)}`);
      node.children()?.forEach(dump);
    };
    dump(doc);

    assert.deepEqual(lines, [
      '#document - / - /',
      '#comment - /comment()[1] - /comment()[1]',
      'html - /html - /html',
      'head - /html/head - /html/head',
      'script - /html/head/script - /html/head/script',
      '#text - /html/head/script/text()[1] - /html/head/script/text()[1]',
      '#cdata-section - /html/head/script/text()[2] - /html/head/script/text()[2]',
      'body - /html/body - /html/body',
      'div - //*[@id="id1"] - /html/body/div[1]',
      'div - //*[@id="id2"] - /html/body/div[2]',
      'div - //*[@id="container"] - /html/body/div[3]',
      'div - //*[@id="id3"] - /html/body/div[3]/div[1]',
      '#text - //*[@id="id3"]/text()[1] - /html/body/div[3]/div[1]/text()[1]',
      '#cdata-section - //*[@id="id3"]/text()[2] - /html/body/div[3]/div[1]/text()[2]',
      '#text - //*[@id="id3"]/text()[3] - /html/body/div[3]/div[1]/text()[3]',
      'div - //*[@id="id4"] - /html/body/div[3]/div[2]',
      '#text - //*[@id="id4"]/text() - /html/body/div[3]/div[2]/text()',
      '#comment - /comment()[2] - /comment()[2]',
    ]);
  });

  it('computes non-optimized xPath and jsPath across shadow boundaries', () => {
    // Mirrors legacy elements/shadow/inspect-deep-shadow-element.
    function shadowTree(targetTag: string, targetId: string): Protocol.DOM.Node {
      return Object.assign(buildPayload({
                             nodeType: Node.DOCUMENT_FRAGMENT_NODE,
                             nodeName: '#document-fragment',
                             localName: '',
                             children: [{
                               nodeType: Node.ELEMENT_NODE,
                               nodeName: 'DIV',
                               children: [{
                                 nodeType: Node.ELEMENT_NODE,
                                 nodeName: 'DIV',
                                 children: [{
                                   nodeType: Node.ELEMENT_NODE,
                                   nodeName: targetTag,
                                   attributes: {id: targetId},
                                   children: [{nodeType: Node.TEXT_NODE, nodeName: '#text', nodeValue: 'Shadow'}],
                                 }],
                               }],
                             }],
                           }),
                           {shadowRootType: 'open' as Protocol.DOM.ShadowRootType});
    }
    const host = Object.assign(buildPayload({nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'host'}}),
                               {shadowRoots: [shadowTree('SPAN', 'shadow')]});
    const hostOpen =
        Object.assign(buildPayload({nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', attributes: {id: 'hostOpen'}}),
                      {shadowRoots: [shadowTree('SPAN', 'shadow-open')]});
    const docPayload = buildPayload({
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      children: [{
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'HTML',
        children: [{
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'BODY',
          children: [{
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'DIV',
            children: [{nodeType: Node.ELEMENT_NODE, nodeName: 'DIV'}],
          }],
        }],
      }],
    });
    const innerDivPayload = docPayload.children![0].children![0].children![0].children![0];
    innerDivPayload.children = [host, hostOpen];
    innerDivPayload.childNodeCount = 2;

    const doc = SDK.DOMModel.DOMNode.create(domModel, null, false, docPayload);
    const innerDiv = doc.children()![0].children()![0].children()![0].children()![0];
    const [hostNode, hostOpenNode] = innerDiv.children()!;
    const target = hostNode.shadowRoots()[0].children()![0].children()![0].children()![0];
    const targetOpen = hostOpenNode.shadowRoots()[0].children()![0].children()![0].children()![0];
    assert.strictEqual(target.getAttribute('id'), 'shadow');
    assert.strictEqual(targetOpen.getAttribute('id'), 'shadow-open');

    assert.strictEqual(Elements.DOMPath.xPath(target, false), '/html/body/div/div/div//div/div/span');
    assert.strictEqual(Elements.DOMPath.jsPath(target, false),
                       'document.querySelector("div#host").shadowRoot.querySelector("span#shadow")');
    assert.strictEqual(Elements.DOMPath.xPath(targetOpen, false), '/html/body/div/div/span//div/div/span');
    assert.strictEqual(Elements.DOMPath.jsPath(targetOpen, false),
                       'document.querySelector("span#hostOpen").shadowRoot.querySelector("span#shadow-open")');
  });

  it('computes simpleSelector for tags, IDs, classes, and input types', () => {
    const container = createDOMNode({
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'SECTION',
      children: [
        {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN'},
        {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV'},
        {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {id: 'header'}},
        {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', attributes: {class: 'class1 class2'}},
        {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', attributes: {class: 'class1 class2'}},
        {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'text'}},
        {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'checkbox', id: 'agree'}},
        {nodeType: Node.ELEMENT_NODE, nodeName: 'INPUT', attributes: {type: 'submit', class: 'primary'}},
      ],
    });

    assert.deepEqual(container.children()!.map(node => node.simpleSelector()), [
      'span',
      'div',
      'div#header',
      '.class1.class2',
      'span.class1.class2',
      'input[type="text"]',
      'input#agree',
      'input.primary',
    ]);
  });

  it('computes valid CSS selectors for pseudo-elements', () => {
    const divNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
      nodeId: 100 as Protocol.DOM.NodeId,
      backendNodeId: 100 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['id', 'target'],
      pseudoElements: [
        {
          nodeId: 101 as Protocol.DOM.NodeId,
          backendNodeId: 101 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: '::before',
          localName: '::before',
          nodeValue: '',
          pseudoType: 'before' as Protocol.DOM.PseudoType,
        },
        {
          nodeId: 102 as Protocol.DOM.NodeId,
          backendNodeId: 102 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: '::after',
          localName: '::after',
          nodeValue: '',
          pseudoType: 'after' as Protocol.DOM.PseudoType,
        },
      ],
    });

    const beforeNode = divNode.beforePseudoElement();
    assert.exists(beforeNode);
    assert.strictEqual(Elements.DOMPath.cssPath(beforeNode, true), '#target::before');

    const afterNode = divNode.afterPseudoElement();
    assert.exists(afterNode);
    assert.strictEqual(Elements.DOMPath.cssPath(afterNode, true), '#target::after');
  });

  it('escapes pseudo-element identifiers in CSS selectors', () => {
    const divNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
      nodeId: 100 as Protocol.DOM.NodeId,
      backendNodeId: 100 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['id', 'target'],
      pseudoElements: [
        {
          nodeId: 101 as Protocol.DOM.NodeId,
          backendNodeId: 101 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: '::view-transition-group',
          localName: '::view-transition-group',
          nodeValue: '',
          pseudoType: 'view-transition-group' as Protocol.DOM.PseudoType,
          pseudoIdentifier: 'page transition',
        },
        {
          nodeId: 102 as Protocol.DOM.NodeId,
          backendNodeId: 102 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: '::view-transition-group',
          localName: '::view-transition-group',
          nodeValue: '',
          pseudoType: 'view-transition-group' as Protocol.DOM.PseudoType,
          pseudoIdentifier: '123.foo',
        },
      ],
    });

    const vtGroupNodes = divNode.pseudoElements().get('view-transition-group');
    assert.exists(vtGroupNodes);
    assert.lengthOf(vtGroupNodes, 2);

    assert.strictEqual(Elements.DOMPath.cssPath(vtGroupNodes[0], true),
                       '#target::view-transition-group(page\\ transition)');
    assert.strictEqual(Elements.DOMPath.cssPath(vtGroupNodes[1], true),
                       '#target::view-transition-group(\\31 23\\.foo)');
  });

  it('computes valid CSS selectors for nested view-transition pseudo-elements', () => {
    const htmlNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
      nodeId: 200 as Protocol.DOM.NodeId,
      backendNodeId: 200 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'HTML',
      localName: 'html',
      nodeValue: '',
      pseudoElements: [
        {
          nodeId: 201 as Protocol.DOM.NodeId,
          backendNodeId: 201 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: '::view-transition',
          localName: '::view-transition',
          nodeValue: '',
          pseudoType: 'view-transition' as Protocol.DOM.PseudoType,
          pseudoElements: [
            {
              nodeId: 202 as Protocol.DOM.NodeId,
              backendNodeId: 202 as Protocol.DOM.BackendNodeId,
              nodeType: Node.ELEMENT_NODE,
              nodeName: '::view-transition-group',
              localName: '::view-transition-group',
              nodeValue: '',
              pseudoType: 'view-transition-group' as Protocol.DOM.PseudoType,
              pseudoIdentifier: 'root',
              pseudoElements: [
                {
                  nodeId: 203 as Protocol.DOM.NodeId,
                  backendNodeId: 203 as Protocol.DOM.BackendNodeId,
                  nodeType: Node.ELEMENT_NODE,
                  nodeName: '::view-transition-image-pair',
                  localName: '::view-transition-image-pair',
                  nodeValue: '',
                  pseudoType: 'view-transition-image-pair' as Protocol.DOM.PseudoType,
                  pseudoIdentifier: 'root',
                  pseudoElements: [
                    {
                      nodeId: 204 as Protocol.DOM.NodeId,
                      backendNodeId: 204 as Protocol.DOM.BackendNodeId,
                      nodeType: Node.ELEMENT_NODE,
                      nodeName: '::view-transition-old',
                      localName: '::view-transition-old',
                      nodeValue: '',
                      pseudoType: 'view-transition-old' as Protocol.DOM.PseudoType,
                      pseudoIdentifier: 'root',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const transitionNode = htmlNode.viewTransitionPseudoElements().find(n => n.pseudoType() === 'view-transition');
    assert.exists(transitionNode);

    const groupNode =
        transitionNode.viewTransitionPseudoElements().find(n => n.pseudoType() === 'view-transition-group');
    assert.exists(groupNode);

    const imagePairNode =
        groupNode.viewTransitionPseudoElements().find(n => n.pseudoType() === 'view-transition-image-pair');
    assert.exists(imagePairNode);

    const oldNode = imagePairNode.viewTransitionPseudoElements().find(n => n.pseudoType() === 'view-transition-old');
    assert.exists(oldNode);

    assert.strictEqual(Elements.DOMPath.cssPath(transitionNode, true), 'html::view-transition');
    assert.strictEqual(Elements.DOMPath.cssPath(groupNode, true), 'html::view-transition-group(root)');
    assert.strictEqual(Elements.DOMPath.cssPath(imagePairNode, true), 'html::view-transition-image-pair(root)');
    assert.strictEqual(Elements.DOMPath.cssPath(oldNode, true), 'html::view-transition-old(root)');
  });
});
