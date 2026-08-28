// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithEnvironment('DOMTreeContextMenu', () => {
  let target: SDK.Target.Target;
  let domModel: SDK.DOMModel.DOMModel;

  beforeEach(() => {
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry});
    target = createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
  });

  function createTestNode(): SDK.DOMModel.DOMNode {
    const node = new SDK.DOMModel.DOMNode(domModel);
    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeNameInCorrectCase').returns('div');
    sinon.stub(node, 'nodeName').returns('DIV');
    sinon.stub(node, 'id').value(1 as unknown as Protocol.DOM.NodeId);
    return node;
  }

  function createContextMenuEvent(): MouseEvent {
    const element = document.createElement('div');
    const event = new MouseEvent('contextmenu');
    Object.defineProperty(event, 'target', {value: element});
    return event;
  }

  function getFlatLabels(items?: UI.SoftContextMenu.SoftContextMenuDescriptor[]): string[] {
    const labels: string[] = [];
    if (!items) {
      return labels;
    }
    for (const item of items) {
      if (item.label) {
        labels.push(item.label);
      }
      if (item.subItems) {
        labels.push(...getFlatLabels(item.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[]));
      }
    }
    return labels;
  }

  function findItem(items?: UI.SoftContextMenu.SoftContextMenuDescriptor[],
                    label?: string): UI.SoftContextMenu.SoftContextMenuDescriptor|undefined {
    if (!items) {
      return undefined;
    }
    for (const item of items) {
      if (item.label === label) {
        return item;
      }
      if (item.subItems) {
        const found = findItem(item.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[], label);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  for (const viewName of ['DECLARATIVE_VIEW', 'DEFAULT_VIEW'] as const) {
    const getView = () => viewName === 'DECLARATIVE_VIEW' ? Elements.ElementsTreeOutline.DECLARATIVE_VIEW :
                                                            Elements.ElementsTreeOutline.DEFAULT_VIEW;

    describe(viewName, () => {
      it('populates context menu with standard actions for element nodes', async () => {
        const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, getView());
        try {
          const node = createTestNode();
          const event = createContextMenuEvent();
          const contextMenu = await domTree.showContextMenu(node, event);
          assert.exists(contextMenu);

          const descriptor = contextMenu.buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor;
          const labels = getFlatLabels(descriptor.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[]);
          assert.include(labels, 'Cut');
          assert.include(labels, 'Copy');
          assert.include(labels, 'Hide element');
          assert.include(labels, 'Delete element');
          assert.include(labels, 'Scroll into view');
          assert.include(labels, 'Focus');
        } finally {
          domTree.detach();
        }
      });

      it('does not show context menu when enableContextMenu is false', async () => {
        const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, getView());
        try {
          domTree.enableContextMenu = false;
          const node = createTestNode();
          const event = createContextMenuEvent();
          const contextMenu = await domTree.showContextMenu(node, event);
          assert.isUndefined(contextMenu);
        } finally {
          domTree.detach();
        }
      });

      it('triggers performCopyOrCut, toggleHideElement, and removeNode from context menu actions', async () => {
        const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, getView());
        try {
          const node = createTestNode();
          const copyOrCutSpy = sinon.spy(domTree, 'performCopyOrCut');
          const hideSpy = sinon.spy(domTree, 'toggleHideElement');
          const removeSpy = sinon.spy(domTree, 'removeNode');

          const event = createContextMenuEvent();
          const contextMenu = await domTree.showContextMenu(node, event);
          assert.exists(contextMenu);

          const descriptor = contextMenu.buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor;

          // Trigger cut
          const cutItem = findItem(descriptor.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[], 'Cut');
          assert.exists(cutItem);
          assert.exists(cutItem.id);
          contextMenu.invokeHandler(cutItem.id);
          sinon.assert.calledWith(copyOrCutSpy, true, node);

          // Trigger hide
          const hideItem =
              findItem(descriptor.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[], 'Hide element');
          assert.exists(hideItem);
          assert.exists(hideItem.id);
          contextMenu.invokeHandler(hideItem.id);
          sinon.assert.calledWith(hideSpy, node);

          // Trigger delete
          const deleteItem =
              findItem(descriptor.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[], 'Delete element');
          assert.exists(deleteItem);
          assert.exists(deleteItem.id);
          contextMenu.invokeHandler(deleteItem.id);
          sinon.assert.calledWith(removeSpy, node);
        } finally {
          domTree.detach();
        }
      });

      it('triggers expandRecursively and collapseChildren on DOMTreeWidget', async () => {
        const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, getView());
        try {
          const node = createTestNode();
          const expandSpy = sinon.spy(domTree, 'expandRecursively');
          const collapseSpy = sinon.spy(domTree, 'collapseChildren');

          const event = createContextMenuEvent();
          const contextMenu = await domTree.showContextMenu(node, event);
          assert.exists(contextMenu);

          const descriptor = contextMenu.buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor;

          const expandItem =
              findItem(descriptor.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[], 'Expand recursively');
          assert.exists(expandItem);
          assert.exists(expandItem.id);
          contextMenu.invokeHandler(expandItem.id);
          sinon.assert.calledWith(expandSpy, node);

          const collapseItem =
              findItem(descriptor.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[], 'Collapse children');
          assert.exists(collapseItem);
          assert.exists(collapseItem.id);
          contextMenu.invokeHandler(collapseItem.id);
          sinon.assert.calledWith(collapseSpy, node);
        } finally {
          domTree.detach();
        }
      });

      it('redirects addAttribute to start tag widget when invoked on closing tag', async () => {
        const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, getView());
        try {
          const node = createTestNode();
          const startTagWidget = {
            isClosingTag: false,
            addNewAttribute: sinon.spy(),
          } as unknown as Elements.ElementsTreeElement.ElementsTreeWidget;
          const closingTagWidget = {
            isClosingTag: true,
            findStartTagWidget: () => startTagWidget,
            addNewAttribute: sinon.spy(),
          } as unknown as Elements.ElementsTreeElement.ElementsTreeWidget;

          const event = createContextMenuEvent();
          const contextMenu = await domTree.showContextMenu(node, event, closingTagWidget);
          assert.exists(contextMenu);

          const descriptor = contextMenu.buildDescriptor() as UI.SoftContextMenu.SoftContextMenuDescriptor;
          const addItem =
              findItem(descriptor.subItems as UI.SoftContextMenu.SoftContextMenuDescriptor[], 'Add attribute');
          assert.exists(addItem);
          assert.exists(addItem.id);
          contextMenu.invokeHandler(addItem.id);

          sinon.assert.calledOnce(startTagWidget.addNewAttribute as sinon.SinonSpy);
          sinon.assert.notCalled(closingTagWidget.addNewAttribute as sinon.SinonSpy);
        } finally {
          domTree.detach();
        }
      });
    });
  }

  it('declarative expandRecursively calls getSubtree on the node', async () => {
    const domTree =
        new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
    try {
      const node = createTestNode();
      const getSubtreeStub = sinon.stub(node, 'getSubtree').resolves(null);
      await domTree.expandRecursively(node);
      sinon.assert.calledWith(getSubtreeStub, 100, true);
    } finally {
      domTree.detach();
    }
  });
});
