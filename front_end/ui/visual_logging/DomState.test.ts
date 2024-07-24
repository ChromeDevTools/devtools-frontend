// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import * as VisualLogging from './visual_logging-testing.js';

describe('DomState', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  const el = (id: string, d: Document|ShadowRoot = document) => d.getElementById(id) as Element;

  it('gets loggable elements and their parents', () => {
    container.innerHTML = `
      <div id="1">
        <div jslog="TreeItem" id="11">
          <div id="111">
            <div jslog="TreeItem" id="1111">
              <div jslog="TreeItem" id="11111"></div>
            </div>
            <div jslog="TreeItem" id="1112"></div>
          </div>
          <div id="112"><span>hello</span></div>
          <div jslog="TreeItem" id="113"></div>
        </div>
        <div id="12">
          <div jslog="TreeItem" id="121">
            <div jslog="TreeItem" id="1211"></div>
          </div>
        </div>
      <div>
      <div jslog="TreeItem" id="2"></div>`;
    const {loggables} = VisualLogging.DomState.getDomState([document]);
    assert.sameDeepMembers(loggables, [
      {element: el('2'), parent: undefined},
      {element: el('121'), parent: undefined},
      {element: el('1211'), parent: el('121')},
      {element: el('11'), parent: undefined},
      {element: el('113'), parent: el('11')},
      {element: el('1112'), parent: el('11')},
      {element: el('1111'), parent: el('11')},
      {element: el('11111'), parent: el('1111')},
    ]);
  });

  it('returns element in a BFS order', () => {
    container.innerHTML = `
      <li jslog="TreeItem" id="1">
      </li>
      <ol>
        <li jslog="TreeItem" id="11">
        </li>
        <li jslog="TreeItem" id="12">
      </ol>
      <li jslog="TreeItem" id="2">
      </li>
      <ol>
        <li jslog="TreeItem" id="21">
        </li>
        <li jslog="TreeItem" id="22">
        </li>
        </li>
      </ol>`;
    const {loggables} = VisualLogging.DomState.getDomState([document]);
    assert.deepEqual(loggables, [
      {element: el('1'), parent: undefined},
      {element: el('2'), parent: undefined},
      {element: el('11'), parent: undefined},
      {element: el('12'), parent: undefined},
      {element: el('21'), parent: undefined},
      {element: el('22'), parent: undefined},
    ]);
  });

  it('gets loggable elements across documents', () => {
    container.innerHTML = `
      <div jslog="TreeItem" id="1"></div>
      <iframe id="iframe"></iframe>`;
    const iframe = el('iframe') as HTMLIFrameElement;
    const iframeDocument = iframe.contentDocument;
    assert.exists(iframeDocument);
    iframeDocument.body.innerHTML = `
      <div jslog="TreeItem" id="2"></div>`;
    const {loggables} = VisualLogging.DomState.getDomState([document, iframeDocument]);
    assert.sameDeepMembers(loggables, [
      {element: el('1'), parent: undefined},
      {element: el('2', iframeDocument), parent: undefined},
    ]);
  });

  it('identifies parents across shadow DOM', () => {
    container.innerHTML = `
      <div jslog="TreeItem" id="1">
        <div jslog="TreeItem" id="12"></div>
        <div id="13"></div>
      </div>`;

    const shadow = el('13').attachShadow({mode: 'open'});
    const shadowContent = document.createElement('div');
    shadowContent.innerHTML = `
      <div id="131">
        <div jslog="TreeItem" id="1311"></div>
      </div>`;
    shadow.appendChild(shadowContent);

    const {loggables} = VisualLogging.DomState.getDomState([document]);
    assert.sameDeepMembers(loggables, [
      {element: el('1'), parent: undefined},
      {element: el('1311', shadow) as Element, parent: el('1')},
      {element: el('12'), parent: el('1')},
    ]);
  });

  it('walks slots in the assigned order', () => {
    class TestComponent extends HTMLElement {
      private render() {
        const shadow = this.attachShadow({mode: 'open'});
        shadow.innerHTML = `
          <div jslog="TreeItem" id="c1"><slot id="slot-1" name="slot-1"></slot></div>
          <div jslog="TreeItem" id="c2"><slot id="slot-2" name="slot-2"></slot></div>`;
      }

      connectedCallback() {
        this.render();
      }
    }
    customElements.define('ve-test-component', class extends TestComponent {});

    container.innerHTML = `
      <div id="0" jslog="TreeItem">
        <ve-test-component id="1" jslog="TreeItem">
          <div jslog="TreeItem" id="11" slot="slot-1">
            <div id="111" jslog="TreeItem"></div>
          </div>
          <div id="12" slot="slot-2" jslog="TreeItem">
        </ve-test-component>
      </div>`;
    const {loggables} = VisualLogging.DomState.getDomState([document]);
    const shadow = el('1').shadowRoot as ShadowRoot;
    assert.sameDeepMembers(loggables, [
      {element: el('0'), parent: undefined},
      {element: el('1'), parent: el('0')},
      {element: el('c1', shadow), parent: el('1')},
      {element: el('11'), parent: el('c1', shadow)},
      {element: el('111'), parent: el('11')},
      {element: el('c2', shadow), parent: el('1')},
      {element: el('12'), parent: el('c2', shadow)},
    ]);
  });

  it('returns shadow roots', () => {
    container.innerHTML = `
      <div id="1">
        <div class="shadow" id="11"></div>
      </div>
      <div class="shadow" id="2"></div>`;
    const addedShadowRoots: ShadowRoot[] = [];
    const attachShadows = (el: HTMLElement|ShadowRoot) => {
      for (const target of el.querySelectorAll('.shadow')) {
        const shadow = target.attachShadow({mode: 'open'});
        const content = document.createElement('div');
        content.innerHTML = '<div></div><div class="shadow></div>';
        shadow.appendChild(content);
        addedShadowRoots.push(shadow);
      }
    };

    attachShadows(container);
    for (const shadow of addedShadowRoots) {
      attachShadows(shadow);
    }
    const {shadowRoots} = VisualLogging.DomState.getDomState([document]);
    assert.sameDeepMembers(shadowRoots, addedShadowRoots);
  });

  it('identifies visible elements', () => {
    container.innerHTML = `
      <style>
        .box {
          position: absolute;
          height: 100px;
          width: 100px;
        }
      </style>
      <div id="1" class="box" style="left: 50px; top: 0;"></div>
      <div id="2" class="box" style="left: 0; top: 50px;"></div>`;

    assert.deepStrictEqual(
        VisualLogging.DomState.visibleOverlap(el('1'), new DOMRect(0, 0, 200, 200)), new DOMRect(50, 0, 100, 100));
    assert.deepStrictEqual(
        VisualLogging.DomState.visibleOverlap(el('2'), new DOMRect(0, 0, 200, 200)), new DOMRect(0, 50, 100, 100));

    assert.deepStrictEqual(
        VisualLogging.DomState.visibleOverlap(el('1'), new DOMRect(0, 0, 100, 100)), new DOMRect(50, 0, 50, 100));
    assert.deepStrictEqual(
        VisualLogging.DomState.visibleOverlap(el('2'), new DOMRect(0, 0, 100, 100)), new DOMRect(0, 50, 100, 50));

    assert.isNull(VisualLogging.DomState.visibleOverlap(el('1'), new DOMRect(0, 0, 50, 50)));
    assert.isNull(VisualLogging.DomState.visibleOverlap(el('2'), new DOMRect(0, 0, 50, 50)));

    assert.isNull(VisualLogging.DomState.visibleOverlap(el('1'), new DOMRect(0, 0, 50, 100)));
    assert.deepStrictEqual(
        VisualLogging.DomState.visibleOverlap(el('2'), new DOMRect(0, 0, 50, 100)), new DOMRect(0, 50, 50, 50));

    assert.isNull(VisualLogging.DomState.visibleOverlap(el('1'), new DOMRect(25, 25, 25, 50)));
    assert.deepStrictEqual(
        VisualLogging.DomState.visibleOverlap(el('2'), new DOMRect(25, 25, 25, 50)), new DOMRect(25, 50, 25, 25));

    assert.isNull(VisualLogging.DomState.visibleOverlap(el('1'), new DOMRect(25, 25, 30, 30)));
    assert.isNull(VisualLogging.DomState.visibleOverlap(el('2'), new DOMRect(25, 25, 30, 30)));
  });

  it('identifies small visible elements', () => {
    container.innerHTML = `
      <div id="1" class="box" style="width: 100px; height: 5px;"></div>
      <div id="2" class="box" style="width: 0; height: 5px;"></div>`;

    assert.isNotNull(VisualLogging.DomState.visibleOverlap(el('1'), new DOMRect(0, 0, 200, 200)));
    assert.isNull(VisualLogging.DomState.visibleOverlap(el('2'), new DOMRect(0, 0, 200, 200)));
  });
});
