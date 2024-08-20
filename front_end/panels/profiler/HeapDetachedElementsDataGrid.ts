// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Elements from '../elements/elements.js';

const UIStrings = {
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  detachedNodes: 'Detached nodes',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  nodeSize: 'Node count',
  /**
   *@description Label for the detached elements table
   */
  detachedElementsList: 'Detached elements list',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapDetachedElementsDataGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class HeapDetachedElementsDataGrid extends DataGrid.DataGrid.DataGridImpl<unknown> {
  constructor() {
    const columns: DataGrid.DataGrid.ColumnDescriptor[] = [];
    columns.push({
      id: 'detached-node',
      title: i18nString(UIStrings.detachedNodes),
      sortable: false,
    });
    columns.push({
      id: 'detached-node-count',
      title: i18nString(UIStrings.nodeSize),
      sortable: false,
      disclosure: true,
    });

    super({
      displayName: i18nString(UIStrings.detachedElementsList),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined,
    });

    this.setStriped(true);
  }
}

export class HeapDetachedElementsDataGridNode extends DataGrid.DataGrid.DataGridNode<unknown> {
  private detachedElementInfo: Protocol.DOM.DetachedElementInfo;
  domModel: SDK.DOMModel.DOMModel;
  retainedNodeIds: Set<number> = new Set<number>();

  constructor(detachedElementInfo: Protocol.DOM.DetachedElementInfo, domModel: SDK.DOMModel.DOMModel) {
    super(null);
    this.detachedElementInfo = detachedElementInfo;
    this.domModel = domModel;
    for (const retainedNodeId of detachedElementInfo.retainedNodeIds) {
      this.retainedNodeIds.add(retainedNodeId as number);
    }
  }

  override createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    switch (columnId) {
      case 'detached-node': {
        const DOMNode = SDK.DOMModel.DOMNode.create(this.domModel, null, false, this.detachedElementInfo.treeNode);
        cell.appendChild(this.#nodeRenderer(DOMNode));
        return cell;
      }

      case 'detached-node-count': {
        const size = this.#getNodeSize(this.detachedElementInfo);
        UI.UIUtils.createTextChild(cell, size.toString());
        return cell;
      }
    }
    return cell;
  }

  #getNodeSize(detachedElementInfo: Protocol.DOM.DetachedElementInfo): number {
    let count: number = 1;
    const queue: Protocol.DOM.Node[] = [];
    let node: Protocol.DOM.Node|undefined;
    queue.push(detachedElementInfo.treeNode);
    while (queue.length > 0) {
      node = queue.shift();
      if (!node) {
        break;
      }
      if (node.childNodeCount) {
        count += node.childNodeCount;
      }
      if (node.children) {
        for (const child of node.children) {
          queue.push(child);
        }
      }
    }

    return count;
  }

  #nodeRenderer(node: SDK.DOMModel.DOMNode): HTMLElement {
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
        /* omitRootDOMNode: */ false, /* selectEnabled: */ false, /* hideGutter: */ true);
    treeOutline.rootDOMNode = node;
    const firstChild = treeOutline.firstChild();
    if (!firstChild || (firstChild && !firstChild.isExpandable())) {
      treeOutline.element.classList.add('single-node');
    }
    treeOutline.setVisible(true);
    // @ts-ignore used in console_test_runner
    treeOutline.element.treeElementForTest = firstChild;
    treeOutline.setShowSelectionOnKeyboardFocus(/* show: */ true, /* preventTabOrder: */ true);

    const nodes: SDK.DOMModel.DOMNode[] = [node];

    // Iterate through descendants to mark the nodes that were specifically retained in JS references.
    while (nodes.length > 0) {
      const descendantNode = nodes.shift() as SDK.DOMModel.DOMNode;
      const descendantsChildren = descendantNode.children();
      if (descendantsChildren) {
        for (const child of descendantsChildren) {
          nodes.push(child);
        }
      }

      const treeElement = treeOutline.findTreeElement(descendantNode);
      // If true, this node is retained in JS, and should be marked.
      if (treeElement) {
        if (this.retainedNodeIds.has(descendantNode.backendNodeId() as number)) {
          const icon = new IconButton.Icon.Icon();
          // this needs to be updated, data field is deprecated
          icon.data = {iconName: 'small-status-dot', color: 'var(--icon-error)', width: '12px', height: '12px'};
          icon.style.setProperty('vertical-align', 'middle');
          treeElement.setLeadingIcons([icon]);
          treeElement.listItemNode.classList.add('detached-elements-detached-node');
          treeElement.listItemNode.style.setProperty('display', '-webkit-box');
          treeElement.listItemNode.setAttribute('title', 'Retained Node');
        } else {
          treeElement.listItemNode.setAttribute('title', 'Node');
        }
      }
    }

    treeOutline.findTreeElement(node as SDK.DOMModel.DOMNode)?.listItemNode.setAttribute('title', 'Detached Tree Node');

    return treeOutline.element;
  }
}
