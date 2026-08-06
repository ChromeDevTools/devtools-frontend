// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as Elements from '../elements/elements.js';

const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Column header in detached elements table displaying detached DOM nodes.
   */
  detachedNodes: 'Detached nodes',
  /**
   * @description Column header in detached elements table displaying the number of detached DOM nodes.
   */
  nodeSize: 'Node count',
  /**
   * @description Label for the detached elements table.
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
        render(html`${size}`, cell);
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
    render(
        html`
          <devtools-widget
            ${widget(Elements.ElementsTreeOutline.DOMTreeWidget, {
          omitRootDOMNode: false,
          selectEnabled: true,
          hideGutter: true,
          rootDOMNode: node,
          showSelectionOnKeyboardFocus: true,
          preventTabOrder: true,
          deindentSingleNode: true,
        })}
          ></devtools-widget>
        `,
        target,
    );
  }
}
