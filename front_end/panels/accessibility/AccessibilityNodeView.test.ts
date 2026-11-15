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
});
