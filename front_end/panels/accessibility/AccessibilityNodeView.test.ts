// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import {render} from '../../ui/lit/lit.js';

import * as Accessibility from './accessibility.js';

const BACKEND_NODE_ID = 42 as Protocol.DOM.BackendNodeId;

describe('AccessibilityNodeView view', () => {
  setupLocaleHooks();

  function renderSampleIgnoredView(onRevealNode: sinon.SinonStub = sinon.stub()): HTMLDivElement {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    render(
        Accessibility.AccessibilityNodeView.renderIgnoredView({
          roleName: 'presentation',
          ignoredReasons: [
            {
              name: 'ariaHiddenElement' as Protocol.Accessibility.AXPropertyName,
              value: {type: Protocol.Accessibility.AXValueType.Boolean, value: true},
            },
            {
              name: 'presentationalRole' as Protocol.Accessibility.AXPropertyName,
              value: {type: Protocol.Accessibility.AXValueType.Boolean, value: true},
            },
            {
              name: 'activeModalDialog' as Protocol.Accessibility.AXPropertyName,
              value: {
                type: Protocol.Accessibility.AXValueType.Idref,
                value: 'dialog-1',
                relatedNodes: [{backendDOMNodeId: BACKEND_NODE_ID, text: 'Modal dialog'}],
              },
            },
          ],
          resolvedNodes: new Map(),
          onRevealNode,
        }),
        container,
    );
    return container;
  }

  it('renders ignored state empty widget', () => {
    const container = renderSampleIgnoredView();

    const emptyWidget = container.querySelector('devtools-widget');
    assert.exists(emptyWidget);
    const widgetInstance = UI.Widget.Widget.get(emptyWidget);
    assert.instanceOf(widgetInstance, UI.EmptyWidget.EmptyWidget);
    assert.include(widgetInstance.contentElement.textContent, 'Accessibility node not exposed');
  });

  it('renders ignored reasons in devtools-tree', () => {
    const container = renderSampleIgnoredView();

    const tree = container.querySelector('devtools-tree');
    assert.exists(tree);
    tree.flushPendingUpdatesForTesting();

    const rootChildren = tree.getInternalTreeOutlineForTest().rootElement().children();
    assert.lengthOf(rootChildren, 3);
    assert.strictEqual(rootChildren[0].listItemElement.textContent, 'Element is aria-hidden');
    assert.strictEqual(rootChildren[1].listItemElement.textContent, 'Element has role=presentation');
  });

  it('reveals related node on Enter', () => {
    const onRevealNode = sinon.stub();
    const container = renderSampleIgnoredView(onRevealNode);

    const tree = container.querySelector('devtools-tree');
    assert.exists(tree);
    tree.flushPendingUpdatesForTesting();

    const rootChildren = tree.getInternalTreeOutlineForTest().rootElement().children();
    const modalChildren = rootChildren[2].children();
    assert.lengthOf(modalChildren, 1);
    modalChildren[0].onenter();
    sinon.assert.calledOnceWithExactly(onRevealNode, BACKEND_NODE_ID);
  });

  it('renders properties, value sources, and IDRefs in renderExposedView', () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        Accessibility.AccessibilityNodeView.renderExposedView({
          properties: [
            {
              name: 'name',
              value: {
                type: Protocol.Accessibility.AXValueType.ComputedString,
                value: 'Line 1\nLine 2',
                sources: [
                  {
                    type: Protocol.Accessibility.AXValueSourceType.Attribute,
                    attribute: 'aria-labelledby',
                    attributeValue: {
                      type: Protocol.Accessibility.AXValueType.IdrefList,
                      value: 'label-1 missing-id',
                      relatedNodes: [{backendDOMNodeId: BACKEND_NODE_ID, idref: 'label-1', text: 'Line 1'}],
                    },
                  },
                  {
                    type: Protocol.Accessibility.AXValueSourceType.Attribute,
                    attribute: 'aria-label',
                    value: {type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Ignored label'},
                    superseded: true,
                  },
                  {type: Protocol.Accessibility.AXValueSourceType.Placeholder, attribute: 'placeholder', invalid: true},
                ],
              },
            },
            {name: 'role', value: {type: Protocol.Accessibility.AXValueType.Role, value: 'button'}},
          ],
          resolvedNodes: new Map(),
          onRevealNode: sinon.stub(),
        }),
        container,
    );

    const tree = container.querySelector('devtools-tree');
    assert.exists(tree);
    tree.flushPendingUpdatesForTesting();
    const [nameElement] = tree.getInternalTreeOutlineForTest().rootElement().children();
    assert.isTrue(nameElement.selected);
    assert.isTrue(nameElement.expanded);
    assert.strictEqual(nameElement.listItemElement.textContent, 'Name:\xA0"Line 1\u21B5Line 2"');

    const sourceChildren = nameElement.children();
    assert.lengthOf(sourceChildren, 3);
    assert.isTrue(sourceChildren[1].listItemElement.classList.contains('ax-value-source-superseded'));
    assert.isTrue(sourceChildren[2].listItemElement.classList.contains('ax-value-source-invalid'));
    assert.include(sourceChildren[2].listItemElement.textContent, 'Not specified');
    const idrefChildren = sourceChildren[0].children();
    assert.lengthOf(idrefChildren, 2);
    assert.include(idrefChildren[0].listItemElement.textContent, '"Line 1"');
    assert.exists(idrefChildren[1].listItemElement.querySelector('.invalid'));
  });

  it('updates an existing value source with warning icon, value, and invalid styling in renderExposedView', () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});

    render(
        Accessibility.AccessibilityNodeView.renderExposedView({
          properties: [
            {
              name: 'name',
              value: {
                type: Protocol.Accessibility.AXValueType.ComputedString,
                value: '',
                sources: [
                  {
                    type: Protocol.Accessibility.AXValueSourceType.RelatedElement,
                    attribute: 'aria-labelledby',
                  },
                ],
              },
            },
          ],
          resolvedNodes: new Map(),
          onRevealNode: sinon.stub(),
        }),
        container,
    );

    const tree = container.querySelector('devtools-tree');
    assert.exists(tree);
    tree.flushPendingUpdatesForTesting();
    let [sourceElement] = tree.getInternalTreeOutlineForTest().rootElement().children()[0].children();
    assert.notExists(sourceElement.listItemElement.querySelector('devtools-icon'));
    assert.include(sourceElement.listItemElement.textContent, 'Not specified');

    render(
        Accessibility.AccessibilityNodeView.renderExposedView({
          properties: [
            {
              name: 'name',
              value: {
                type: Protocol.Accessibility.AXValueType.ComputedString,
                value: 'Click me',
                sources: [
                  {
                    type: Protocol.Accessibility.AXValueSourceType.RelatedElement,
                    attribute: 'aria-labelledby',
                    attributeValue: {
                      type: Protocol.Accessibility.AXValueType.String,
                      value: 'does-not-exist',
                    },
                    invalid: true,
                  },
                ],
              },
            },
          ],
          resolvedNodes: new Map(),
          onRevealNode: sinon.stub(),
        }),
        container,
    );
    tree.flushPendingUpdatesForTesting();

    [sourceElement] = tree.getInternalTreeOutlineForTest().rootElement().children()[0].children();
    assert.isTrue(sourceElement.listItemElement.classList.contains('ax-value-source-invalid'));
    assert.isFalse(sourceElement.listItemElement.classList.contains('ax-value-source-unused'));
    assert.strictEqual(sourceElement.listItemElement.textContent, 'aria-labelledby:\xA0"does-not-exist"\xA0');
    const icon = sourceElement.listItemElement.querySelector('devtools-icon');
    assert.exists(icon);
    assert.strictEqual(icon.getAttribute('name'), 'warning-filled');
    assert.strictEqual(getComputedStyle(icon).left, '-11px');
    const nameSpan = sourceElement.listItemElement.querySelector('.ax-name');
    assert.exists(nameSpan);
    assert.strictEqual(getComputedStyle(nameSpan).marginLeft, '-11px');
    assert.include(getComputedStyle(sourceElement.listItemElement).textDecorationLine, 'line-through');
    assert.strictEqual(getComputedStyle(sourceElement.listItemElement).display, 'block');
  });
});
