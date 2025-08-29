// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Elements from '../elements/elements.js';

const UIStrings = {
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  detachedNodes: 'Detached nodes',
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  nodeSize: 'Node count',
  /**
   * @description Label for the detached elements table
   */
  detachedElementsList: 'Detached elements list',
} as const;
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
        const node = SDK.DOMModel.DOMNode.create(
            this.domModel, null, false, this.detachedElementInfo.treeNode,
            this.retainedNodeIds as Set<Protocol.DOM.BackendNodeId>);
        node.detached = true;
        this.#renderNode(node, cell);
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
    let count = 1;
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

  // FIXME: is it a partial dupe of front_end/panels/elements/ElementsTreeOutlineRenderer.ts?
  #renderNode(node: SDK.DOMModel.DOMNode, target: HTMLElement): void {
    const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget();
    domTree.omitRootDOMNode = false;
    domTree.selectEnabled = true;
    domTree.hideGutter = true;
    domTree.rootDOMNode = node;
    domTree.showSelectionOnKeyboardFocus = true;
    domTree.preventTabOrder = true;
    domTree.deindentSingleNode = true;
    domTree.show(target, undefined, true);
  }
}
