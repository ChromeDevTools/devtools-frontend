// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Elements from '../elements/elements.js';

import heapDetachedElementsDataGridStyles from './heapDetachedElementsDataGrid.css.js';

const {html, render} = Lit;

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

export interface HeapDetachedElements {
  detachedElements: Protocol.DOM.DetachedElementInfo[];
  domModel: SDK.DOMModel.DOMModel;
}

export interface ParsedElement {
  elementInfo: Protocol.DOM.DetachedElementInfo;
  node: SDK.DOMModel.DOMNode;
  nodeCount: number;
}

export interface ViewInput {
  parsedElements: ParsedElement[];
}

export type ViewOutput = undefined;

const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement|ShadowRoot): void => {
  // clang-format off
  render(html`
    <devtools-data-grid striped name=${i18nString(UIStrings.detachedElementsList)}>
      <table>
        <tr>
          <th id="detached-node">${i18nString(UIStrings.detachedNodes)}</th>
          <th id="detached-node-count">${i18nString(UIStrings.nodeSize)}</th>
        </tr>
        ${input.parsedElements.map(parsed => html`
          <tr jslog=${VisualLogging.tableRow('detached-element')}>
            <td>
              <devtools-widget
                ${widget(Elements.ElementsTreeOutline.DOMTreeWidget, {
                  omitRootDOMNode: false,
                  selectEnabled: true,
                  hideGutter: true,
                  rootDOMNode: parsed.node,
                  showSelectionOnKeyboardFocus: true,
                  preventTabOrder: true,
                  deindentSingleNode: true,
                })}
              ></devtools-widget>
            </td>
            <td>${parsed.nodeCount}</td>
          </tr>
        `)}
      </table>
    </devtools-data-grid>
  `, target);
  // clang-format on
};

function calculateDetachedNodeCount(treeNode?: Protocol.DOM.Node): number {
  if (!treeNode) {
    return 0;
  }
  let count = 1;
  const queue: Protocol.DOM.Node[] = [];
  let node: Protocol.DOM.Node|undefined;
  queue.push(treeNode);
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

type View = typeof DEFAULT_VIEW;

export class HeapDetachedElementsDataGrid extends UI.Widget.Widget {
  #view: View;
  #parsedElements: ParsedElement[] = [];

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.registerRequiredCSS(heapDetachedElementsDataGridStyles);
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({parsedElements: this.#parsedElements}, undefined, this.contentElement);
  }

  set data(data: HeapDetachedElements) {
    this.#parsedElements = [];
    if (!data || !data.detachedElements || !data.domModel) {
      this.requestUpdate();
      return;
    }
    for (const elementInfo of data.detachedElements) {
      const retainedNodeIds = new Set((elementInfo.retainedNodeIds ?? []) as unknown as Protocol.DOM.BackendNodeId[]);
      const node = SDK.DOMModel.DOMNode.create(data.domModel, null, false, elementInfo.treeNode, retainedNodeIds);
      node.detached = true;

      this.#parsedElements.push({elementInfo, node, nodeCount: calculateDetachedNodeCount(elementInfo.treeNode)});
    }
    this.requestUpdate();
  }
}
