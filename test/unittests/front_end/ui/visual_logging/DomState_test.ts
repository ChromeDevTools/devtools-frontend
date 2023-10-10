// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';
import {renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('DomState', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  const el = (id: string) => document.getElementById(id) as Element;

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
    const {loggables} = VisualLogging.DomState.getDomState();
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

    const {loggables} = VisualLogging.DomState.getDomState();
    assert.sameDeepMembers(loggables, [
      {element: el('1'), parent: undefined},
      {element: shadow.getElementById('1311') as Element, parent: el('1')},
      {element: el('12'), parent: el('1')},
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
    const {shadowRoots} = VisualLogging.DomState.getDomState();
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

    assert.isTrue(VisualLogging.DomState.isVisible(el('1'), new DOMRect(0, 0, 200, 200)));
    assert.isTrue(VisualLogging.DomState.isVisible(el('2'), new DOMRect(0, 0, 200, 200)));

    assert.isTrue(VisualLogging.DomState.isVisible(el('1'), new DOMRect(0, 0, 100, 100)));
    assert.isTrue(VisualLogging.DomState.isVisible(el('2'), new DOMRect(0, 0, 100, 100)));

    assert.isFalse(VisualLogging.DomState.isVisible(el('1'), new DOMRect(0, 0, 50, 50)));
    assert.isFalse(VisualLogging.DomState.isVisible(el('2'), new DOMRect(0, 0, 50, 50)));

    assert.isFalse(VisualLogging.DomState.isVisible(el('1'), new DOMRect(0, 0, 50, 100)));
    assert.isTrue(VisualLogging.DomState.isVisible(el('2'), new DOMRect(0, 0, 50, 100)));

    assert.isFalse(VisualLogging.DomState.isVisible(el('1'), new DOMRect(25, 25, 25, 50)));
    assert.isTrue(VisualLogging.DomState.isVisible(el('2'), new DOMRect(25, 25, 25, 50)));

    assert.isFalse(VisualLogging.DomState.isVisible(el('1'), new DOMRect(25, 25, 30, 30)));
    assert.isFalse(VisualLogging.DomState.isVisible(el('2'), new DOMRect(25, 25, 30, 30)));
  });
});
