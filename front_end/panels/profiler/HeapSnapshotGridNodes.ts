/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as HeapSnapshotModel from '../../models/heap_snapshot_model/heap_snapshot_model.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {type ChildrenProvider} from './ChildrenProvider.js';
import {
  type AllocationDataGrid,
  type HeapSnapshotConstructorsDataGrid,
  type HeapSnapshotDiffDataGrid,
  type HeapSnapshotSortableDataGrid,
  HeapSnapshotSortableDataGridEvents,
} from './HeapSnapshotDataGrids.js';
import {type HeapSnapshotProviderProxy, type HeapSnapshotProxy} from './HeapSnapshotProxy.js';
import {type DataDisplayDelegate} from './ProfileHeader.js';

const UIStrings = {
  /**
   *@description Generic text with two placeholders separated by a comma
   *@example {1 613 680} PH1
   *@example {44 %} PH2
   */
  genericStringsTwoPlaceholders: '{PH1}, {PH2}',
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  internalArray: '(internal array)[]',
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  userObjectReachableFromWindow: 'User object reachable from window',
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  detachedFromDomTree: 'Detached from DOM tree',
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  previewIsNotAvailable: 'Preview is not available',
  /**
   *@description A context menu item in the Heap Profiler Panel of a profiler tool
   */
  revealInSummaryView: 'Reveal in Summary view',
  /**
   *@description Text for the summary view
   */
  summary: 'Summary',
  /**
   *@description A context menu item in the Heap Profiler Panel of a profiler tool
   *@example {SomeClassConstructor} PH1
   *@example {12345} PH2
   */
  revealObjectSWithIdSInSummary: 'Reveal object \'\'{PH1}\'\' with id @{PH2} in Summary view',
  /**
   *@description Text to store an HTML element or JavaScript variable or expression result as a global variable
   */
  storeAsGlobalVariable: 'Store as global variable',
  /**
   *@description Text to ignore an object shown in the Retainers pane
   */
  ignoreThisRetainer: 'Ignore this retainer',
  /**
   *@description Text to undo the "Ignore this retainer" action
   */
  stopIgnoringThisRetainer: 'Stop ignoring this retainer',
  /**
   *@description Text indicating that a node has been ignored with the "Ignore this retainer" action
   */
  ignored: 'ignored',
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool that indicates an element contained in another
   * element.
   */
  inElement: 'in',
  /**
   *@description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#compiled-code
   */
  compiledCodeSummary: 'Internal data which V8 uses to run functions defined by JavaScript or WebAssembly.',
  /**
   *@description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#concatenated-string
   */
  concatenatedStringSummary: 'A string which represents the contents of two other strings joined together.',
  /**
   *@description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#system-context
   */
  contextSummary:
      'An internal object containing variables from a JavaScript scope which may be needed by a function created within that scope.',
  /**
   *@description A short description of the data type internal type DescriptorArray, which is described more fully at https://v8.dev/blog/fast-properties
   */
  descriptorArraySummary: 'A list of the property names used by a JavaScript Object.',
  /**
   *@description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#array
   */
  internalArraySummary: 'An internal array-like data structure (not a JavaScript Array).',
  /**
   *@description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#internal-node
   */
  internalNodeSummary: 'An object allocated by a component other than V8, such as C++ objects defined by Blink.',
  /**
   *@description A short description of the data type "system / Map" described at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#object-shape
   */
  mapSummary: 'An internal object representing the shape of a JavaScript Object (not a JavaScript Map).',
  /**
   *@description A short summary of the "(object elements)[]" described at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#array
   */
  objectElementsSummary:
      'An internal object which stores the indexed properties in a JavaScript Object, such as the contents of an Array.',
  /**
   *@description A short summary of the "(object properties)[]" described at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#array
   */
  objectPropertiesSummary: 'An internal object which stores the named properties in a JavaScript Object.',
  /**
   *@description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#sliced-string
   */
  slicedStringSummary: 'A string which represents some of the characters from another string.',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapSnapshotGridNodes.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class HeapSnapshotGridNodeBase extends DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode> {}

export class HeapSnapshotGridNode extends
    Common.ObjectWrapper.eventMixin<HeapSnapshotGridNode.EventTypes, typeof HeapSnapshotGridNodeBase>(
        HeapSnapshotGridNodeBase) {
  dataGridInternal: HeapSnapshotSortableDataGrid;
  instanceCount: number;
  readonly savedChildren: Map<number, HeapSnapshotGridNode>;
  retrievedChildrenRanges: {
    from: number,
    to: number,
  }[];
  providerObject: ChildrenProvider|null;
  reachableFromWindow: boolean;
  populated?: boolean;

  constructor(tree: HeapSnapshotSortableDataGrid, hasChildren: boolean) {
    super(null, hasChildren);
    this.dataGridInternal = tree;
    this.instanceCount = 0;

    this.savedChildren = new Map();

    /**
     * List of position ranges for all visible nodes: [startPos1, endPos1),...,[startPosN, endPosN)
     * Position is an item position in the provider.
     */
    this.retrievedChildrenRanges = [];

    this.providerObject = null;
    this.reachableFromWindow = false;
  }

  get name(): string|undefined {
    return undefined;
  }

  heapSnapshotDataGrid(): HeapSnapshotSortableDataGrid {
    return this.dataGridInternal;
  }

  createProvider(): ChildrenProvider {
    throw new Error('Not implemented.');
  }

  comparator(): HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    throw new Error('Not implemented.');
  }

  getHash(): number {
    throw new Error('Not implemented.');
  }
  createChildNode(_item: HeapSnapshotModel.HeapSnapshotModel.Node|
                  HeapSnapshotModel.HeapSnapshotModel.Edge): HeapSnapshotGridNode {
    throw new Error('Not implemented.');
  }

  retainersDataSource(): {
    snapshot: HeapSnapshotProxy,
    snapshotNodeIndex: number,
    snapshotNodeId: number|undefined,
  }|null {
    return null;
  }

  provider(): ChildrenProvider {
    if (!this.providerObject) {
      this.providerObject = this.createProvider();
    }
    return this.providerObject;
  }

  override createCell(columnId: string): HTMLElement {
    return super.createCell(columnId);
  }

  override collapse(): void {
    super.collapse();
    this.dataGridInternal.updateVisibleNodes(true);
  }

  override expand(): void {
    super.expand();
    this.dataGridInternal.updateVisibleNodes(true);
  }

  dispose(): void {
    if (this.providerObject) {
      this.providerObject.dispose();
    }
    for (let node: (HeapSnapshotGridNode|null) = (this.children[0] as HeapSnapshotGridNode | null); node;
         node = (node.traverseNextNode(true, this, true) as HeapSnapshotGridNode | null)) {
      node.dispose();
    }
  }

  queryObjectContent(_heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel, _objectGroupName: string):
      Promise<SDK.RemoteObject.RemoteObject|{description: string, link: string}> {
    throw new Error('Not implemented.');
  }

  tryQueryObjectContent(_heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel, _objectGroupName: string):
      Promise<SDK.RemoteObject.RemoteObject|null> {
    throw new Error('Not implemented.');
  }

  populateContextMenu(
      _contextMenu: UI.ContextMenu.ContextMenu, _dataDisplayDelegate: DataDisplayDelegate,
      _heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null): void {
  }

  toPercentString(num: number): string {
    return num.toFixed(0) + '\xa0%';  // \xa0 is a non-breaking space.
  }

  toUIDistance(distance: number): string {
    const baseSystemDistance = HeapSnapshotModel.HeapSnapshotModel.baseSystemDistance;
    return distance >= 0 && distance < baseSystemDistance ? distance.toString() : '\u2212';
  }

  allChildren(): HeapSnapshotGridNode[] {
    return this.dataGridInternal.allChildren(this) as HeapSnapshotGridNode[];
  }

  removeChildByIndex(index: number): void {
    this.dataGridInternal.removeChildByIndex(this, index);
  }

  childForPosition(nodePosition: number): HeapSnapshotGridNode|null {
    let indexOfFirstChildInRange = 0;
    for (let i = 0; i < this.retrievedChildrenRanges.length; i++) {
      const range = this.retrievedChildrenRanges[i];
      if (range.from <= nodePosition && nodePosition < range.to) {
        const childIndex = indexOfFirstChildInRange + nodePosition - range.from;
        return this.allChildren()[childIndex];
      }
      indexOfFirstChildInRange += range.to - range.from + 1;
    }
    return null;
  }

  createValueCell(columnId: string): HTMLElement {
    const jslog = VisualLogging.tableCell('numeric-column').track({click: true});
    const cell = (UI.Fragment.html`<td class="numeric-column" jslog=${jslog} />` as HTMLElement);
    const dataGrid = (this.dataGrid as HeapSnapshotSortableDataGrid);
    if (dataGrid.snapshot && dataGrid.snapshot.totalSize !== 0) {
      const div = document.createElement('div');
      const valueSpan = UI.Fragment.html`<span>${this.data[columnId]}</span>`;
      div.appendChild(valueSpan);
      const percentColumn = columnId + '-percent';
      if (percentColumn in this.data) {
        const percentSpan = UI.Fragment.html`<span class="percent-column">${this.data[percentColumn]}</span>`;
        div.appendChild(percentSpan);
        div.classList.add('profile-multiple-values');
        UI.ARIAUtils.markAsHidden(valueSpan);
        UI.ARIAUtils.markAsHidden(percentSpan);
        this.setCellAccessibleName(
            i18nString(
                UIStrings.genericStringsTwoPlaceholders, {PH1: this.data[columnId], PH2: this.data[percentColumn]}),
            cell, columnId);
      }
      cell.appendChild(div);
    }
    return cell;
  }

  override populate(): void {
    if (this.populated) {
      return;
    }
    this.populated = true;
    void this.provider().sortAndRewind(this.comparator()).then(() => this.populateChildren());
  }

  expandWithoutPopulate(): Promise<void> {
    // Make sure default populate won't take action.
    this.populated = true;
    this.expand();
    return this.provider().sortAndRewind(this.comparator());
  }

  childHashForEntity(entity: HeapSnapshotModel.HeapSnapshotModel.Node|
                     HeapSnapshotModel.HeapSnapshotModel.Edge): number {
    if ('edgeIndex' in entity) {
      return entity.edgeIndex;
    }
    return entity.id;
  }

  populateChildren(fromPosition?: number|null, toPosition?: number|null): Promise<void> {
    return new Promise(resolve => {
      fromPosition = fromPosition || 0;
      toPosition = toPosition || fromPosition + this.dataGridInternal.defaultPopulateCount();
      let firstNotSerializedPosition: number = fromPosition;
      serializeNextChunk.call(this, toPosition);

      function serializeNextChunk(this: HeapSnapshotGridNode, toPosition: number): void {
        if (firstNotSerializedPosition >= toPosition) {
          return;
        }
        const end = Math.min(firstNotSerializedPosition + this.dataGridInternal.defaultPopulateCount(), toPosition);
        void this.provider()
            .serializeItemsRange(firstNotSerializedPosition, end)
            .then(itemsRange => childrenRetrieved.call(this, itemsRange, toPosition));
        firstNotSerializedPosition = end;
      }

      function insertRetrievedChild(
          this: HeapSnapshotGridNode,
          item: HeapSnapshotModel.HeapSnapshotModel.Node|HeapSnapshotModel.HeapSnapshotModel.Edge,
          insertionIndex: number): void {
        if (this.savedChildren) {
          const hash = this.childHashForEntity(item);
          const child = this.savedChildren.get(hash);
          if (child) {
            this.dataGridInternal.insertChild(this, child, insertionIndex);
            return;
          }
        }
        this.dataGridInternal.insertChild(this, this.createChildNode(item), insertionIndex);
      }

      function insertShowMoreButton(
          this: HeapSnapshotGridNode, from: number, to: number, insertionIndex: number): void {
        const button = (new DataGrid.ShowMoreDataGridNode.ShowMoreDataGridNode(
            this.populateChildren.bind(this), from, to, this.dataGridInternal.defaultPopulateCount()));
        this.dataGridInternal.insertChild(this, (button as unknown as HeapSnapshotGridNode), insertionIndex);
      }

      function childrenRetrieved(
          this: HeapSnapshotGridNode, itemsRange: HeapSnapshotModel.HeapSnapshotModel.ItemsRange,
          toPosition: number): void {
        let itemIndex = 0;
        let itemPosition: number = itemsRange.startPosition;
        const items = itemsRange.items;
        let insertionIndex = 0;

        if (!this.retrievedChildrenRanges.length) {
          if (itemsRange.startPosition > 0) {
            this.retrievedChildrenRanges.push({from: 0, to: 0});
            insertShowMoreButton.call(this, 0, itemsRange.startPosition, insertionIndex++);
          }
          this.retrievedChildrenRanges.push({from: itemsRange.startPosition, to: itemsRange.endPosition});
          for (let i = 0, l = items.length; i < l; ++i) {
            insertRetrievedChild.call(this, items[i], insertionIndex++);
          }
          if (itemsRange.endPosition < itemsRange.totalLength) {
            insertShowMoreButton.call(this, itemsRange.endPosition, itemsRange.totalLength, insertionIndex++);
          }
        } else {
          let rangeIndex = 0;
          let found = false;
          let range: {
            from: number,
            to: number,
          } = {from: 0, to: 0};
          while (rangeIndex < this.retrievedChildrenRanges.length) {
            range = this.retrievedChildrenRanges[rangeIndex];
            if (range.to >= itemPosition) {
              found = true;
              break;
            }
            insertionIndex += range.to - range.from;
            // Skip the button if there is one.
            if (range.to < itemsRange.totalLength) {
              insertionIndex += 1;
            }
            ++rangeIndex;
          }

          if (!found || itemsRange.startPosition < range.from) {
            // Update previous button.
            const button =
                this.allChildren()[insertionIndex - 1] as unknown as DataGrid.ShowMoreDataGridNode.ShowMoreDataGridNode;
            button.setEndPosition(itemsRange.startPosition);
            insertShowMoreButton.call(
                this, itemsRange.startPosition, found ? range.from : itemsRange.totalLength, insertionIndex);
            range = {from: itemsRange.startPosition, to: itemsRange.startPosition};
            if (!found) {
              rangeIndex = this.retrievedChildrenRanges.length;
            }
            this.retrievedChildrenRanges.splice(rangeIndex, 0, range);
          } else {
            insertionIndex += itemPosition - range.from;
          }
          // At this point insertionIndex is always an index before button or between nodes.
          // Also it is always true here that range.from <= itemPosition <= range.to

          // Stretch the range right bound to include all new items.
          while (range.to < itemsRange.endPosition) {
            // Skip already added nodes.
            const skipCount = range.to - itemPosition;
            insertionIndex += skipCount;
            itemIndex += skipCount;
            itemPosition = range.to;

            // We're at the position before button: ...<?node>x<button>
            const nextRange = this.retrievedChildrenRanges[rangeIndex + 1];
            let newEndOfRange: number = nextRange ? nextRange.from : itemsRange.totalLength;
            if (newEndOfRange > itemsRange.endPosition) {
              newEndOfRange = itemsRange.endPosition;
            }
            while (itemPosition < newEndOfRange) {
              insertRetrievedChild.call(this, items[itemIndex++], insertionIndex++);
              ++itemPosition;
            }

            // Merge with the next range.
            if (nextRange && newEndOfRange === nextRange.from) {
              range.to = nextRange.to;
              // Remove "show next" button if there is one.
              this.removeChildByIndex(insertionIndex);
              this.retrievedChildrenRanges.splice(rangeIndex + 1, 1);
            } else {
              range.to = newEndOfRange;
              // Remove or update next button.
              if (newEndOfRange === itemsRange.totalLength) {
                this.removeChildByIndex(insertionIndex);
              } else {
                (this.allChildren()[insertionIndex] as unknown as DataGrid.ShowMoreDataGridNode.ShowMoreDataGridNode)
                    .setStartPosition(itemsRange.endPosition);
              }
            }
          }
        }

        this.instanceCount += items.length;
        if (firstNotSerializedPosition < toPosition && firstNotSerializedPosition < itemsRange.totalLength) {
          serializeNextChunk.call(this, toPosition);
          return;
        }

        if (this.expanded) {
          this.dataGridInternal.updateVisibleNodes(true);
        }
        resolve();
        this.dispatchEventToListeners(HeapSnapshotGridNode.Events.PopulateComplete);
      }
    });
  }

  saveChildren(): void {
    this.savedChildren.clear();
    const children = this.allChildren();
    for (let i = 0, l = children.length; i < l; ++i) {
      const child = children[i];
      if (!child.expanded) {
        continue;
      }
      this.savedChildren.set(child.getHash(), child);
    }
  }

  async sort(): Promise<void> {
    this.dataGridInternal.recursiveSortingEnter();

    await this.provider().sortAndRewind(this.comparator());

    this.saveChildren();
    this.dataGridInternal.removeAllChildren(this);
    this.retrievedChildrenRanges = [];
    const instanceCount = this.instanceCount;
    this.instanceCount = 0;

    await this.populateChildren(0, instanceCount);

    for (const child of this.allChildren()) {
      if (child.expanded) {
        void child.sort();
      }
    }
    this.dataGridInternal.recursiveSortingLeave();
  }
}

export namespace HeapSnapshotGridNode {
  export enum Events {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    PopulateComplete = 'PopulateComplete',
    /* eslint-enable @typescript-eslint/naming-convention */
  }

  export type EventTypes = {
    [Events.PopulateComplete]: void,
  };
}

export abstract class HeapSnapshotGenericObjectNode extends HeapSnapshotGridNode {
  referenceName?: string|null;
  readonly nameInternal: string|undefined;
  readonly type: string|undefined;
  readonly distance: number|undefined;
  shallowSize: number|undefined;
  readonly retainedSize: number|undefined;
  snapshotNodeId: number|undefined;
  snapshotNodeIndex: number|undefined;
  detachedDOMTreeNode: boolean|undefined;
  linkElement?: Element;

  constructor(dataGrid: HeapSnapshotSortableDataGrid, node: HeapSnapshotModel.HeapSnapshotModel.Node) {
    super(dataGrid, false);
    // node is null for DataGrid root nodes.
    if (!node) {
      return;
    }
    this.referenceName = null;
    this.nameInternal = node.name;
    this.type = node.type;
    this.distance = node.distance;
    this.shallowSize = node.selfSize;
    this.retainedSize = node.retainedSize;
    this.snapshotNodeId = node.id;
    this.snapshotNodeIndex = node.nodeIndex;
    if (this.type === 'string') {
      this.reachableFromWindow = true;
    } else if (this.type === 'object' && this.nameInternal.startsWith('Window')) {
      this.nameInternal = this.shortenWindowURL(this.nameInternal, false);
      this.reachableFromWindow = true;
    } else if (node.canBeQueried) {
      this.reachableFromWindow = true;
    }
    if (node.detachedDOMTreeNode) {
      this.detachedDOMTreeNode = true;
    }

    const snapshot = (dataGrid.snapshot as HeapSnapshotProxy);
    const shallowSizePercent = this.shallowSize / snapshot.totalSize * 100.0;
    const retainedSizePercent = this.retainedSize / snapshot.totalSize * 100.0;
    this.data = {
      distance: this.toUIDistance(this.distance),
      shallowSize: Platform.NumberUtilities.withThousandsSeparator(this.shallowSize),
      retainedSize: Platform.NumberUtilities.withThousandsSeparator(this.retainedSize),
      'shallowSize-percent': this.toPercentString(shallowSizePercent),
      'retainedSize-percent': this.toPercentString(retainedSizePercent),
    };
  }

  override get name(): string|undefined {
    return this.nameInternal;
  }

  override retainersDataSource(): {
    snapshot: HeapSnapshotProxy,
    snapshotNodeIndex: number,
    snapshotNodeId: number|undefined,
  }|null {
    return this.snapshotNodeIndex === undefined ? null : {
      snapshot: (this.dataGridInternal.snapshot as HeapSnapshotProxy),
      snapshotNodeIndex: this.snapshotNodeIndex,
      snapshotNodeId: this.snapshotNodeId,
    };
  }

  override createCell(columnId: string): HTMLElement {
    const cell = columnId !== 'object' ? this.createValueCell(columnId) : this.createObjectCell();
    return cell;
  }

  createObjectCell(): HTMLElement {
    let value: string|(string | undefined) = this.nameInternal;
    let valueStyle = 'object';
    switch (this.type) {
      case 'concatenated string':
      case 'string':
        value = `"${value}"`;
        valueStyle = 'string';
        break;
      case 'regexp':
        value = `/${value}/`;
        valueStyle = 'string';
        break;
      case 'closure':
        value = `${value}()`;
        valueStyle = 'function';
        break;
      case 'bigint':
        valueStyle = 'bigint';
        break;
      case 'number':
        valueStyle = 'number';
        break;
      case 'hidden':
      case 'object shape':
        valueStyle = 'null';
        break;
      case 'array':
        value = value ? `${value}[]` : i18nString(UIStrings.internalArray);
        break;
    }
    return this.createObjectCellWithValue(valueStyle, value || '');
  }

  createObjectCellWithValue(valueStyle: string, value: string): HTMLElement {
    const jslog = VisualLogging.tableCell('object-column').track({click: true});
    const fragment = UI.Fragment.Fragment.build`
  <td class="object-column disclosure" jslog=${jslog}>
  <div class="source-code event-properties" style="overflow: visible;" $="container">
  <span class="value object-value-${valueStyle}">${value}</span>
  <span class="object-value-id">@${this.snapshotNodeId}</span>
  </div>
  </td>`;
    const div = fragment.$('container');
    this.prefixObjectCell(div);
    if (this.reachableFromWindow) {
      const frameIcon = IconButton.Icon.create('frame', 'heap-object-tag');
      UI.Tooltip.Tooltip.install(frameIcon, i18nString(UIStrings.userObjectReachableFromWindow));
      div.appendChild(frameIcon);
    }
    if (this.detachedDOMTreeNode) {
      const frameIcon = IconButton.Icon.create('scissors', 'heap-object-tag');
      UI.Tooltip.Tooltip.install(frameIcon, i18nString(UIStrings.detachedFromDomTree));
      div.appendChild(frameIcon);
    }
    void this.appendSourceLocation(div);
    const cell = (fragment.element() as HTMLElement);
    if (this.depth) {
      cell.style.setProperty(
          'padding-left', (this.depth * (this.dataGrid as HeapSnapshotSortableDataGrid).indentWidth) + 'px');
    }
    return cell;
  }

  prefixObjectCell(_div: Element): void {
  }

  async appendSourceLocation(div: Element): Promise<void> {
    const linkContainer = UI.Fragment.html`<span class="heap-object-source-link" />`;
    div.appendChild(linkContainer);
    const link = await this.dataGridInternal.dataDisplayDelegate().linkifyObject((this.snapshotNodeIndex as number));
    if (link) {
      link.setAttribute('tabindex', '0');
      linkContainer.appendChild(link);
      this.linkElement = link;
    } else {
      linkContainer.remove();
    }
  }

  override async queryObjectContent(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel,
      objectGroupName: string): Promise<SDK.RemoteObject.RemoteObject|{description: string, link: string}> {
    const remoteObject = await this.tryQueryObjectContent(heapProfilerModel, objectGroupName);
    return remoteObject || this.tryGetTooltipDescription() ||
        heapProfilerModel.runtimeModel().createRemoteObjectFromPrimitiveValue(
            i18nString(UIStrings.previewIsNotAvailable));
  }

  override async tryQueryObjectContent(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel,
      objectGroupName: string): Promise<SDK.RemoteObject.RemoteObject|null> {
    if (this.type === 'string') {
      return heapProfilerModel.runtimeModel().createRemoteObjectFromPrimitiveValue(this.nameInternal);
    }
    return await heapProfilerModel.objectForSnapshotObjectId(
        String(this.snapshotNodeId) as Protocol.HeapProfiler.HeapSnapshotObjectId, objectGroupName);
  }

  tryGetTooltipDescription(): {description: string, link: string}|undefined {
    const baseLink = 'https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#';
    switch (this.type) {
      case 'code':
        return {description: i18nString(UIStrings.compiledCodeSummary), link: baseLink + 'compiled-code'};
      case 'concatenated string':
        return {description: i18nString(UIStrings.concatenatedStringSummary), link: baseLink + 'concatenated-string'};
      case 'sliced string':
        return {description: i18nString(UIStrings.slicedStringSummary), link: baseLink + 'sliced-string'};
    }
    switch (this.type + ':' + this.nameInternal) {
      case 'array:':  // If nameInternal is empty, then the object is shown as "(internal array)[]".
        return {description: i18nString(UIStrings.internalArraySummary), link: baseLink + 'array'};
      case 'array:(object elements)':
        return {description: i18nString(UIStrings.objectElementsSummary), link: baseLink + 'array'};
      case 'array:(object properties)':
      case 'hidden:system / PropertyArray':
        return {description: i18nString(UIStrings.objectPropertiesSummary), link: baseLink + 'array'};
      case 'object:system / Context':
        return {description: i18nString(UIStrings.contextSummary), link: baseLink + 'system-context'};
      case 'object shape:system / DescriptorArray':
        return {description: i18nString(UIStrings.descriptorArraySummary), link: baseLink + 'object-shape'};
      case 'object shape:system / Map':
        return {description: i18nString(UIStrings.mapSummary), link: baseLink + 'object-shape'};
      case 'native:InternalNode':
        return {description: i18nString(UIStrings.internalNodeSummary), link: baseLink + 'internal-node'};
    }
    return undefined;
  }

  async updateHasChildren(): Promise<void> {
    const isEmpty = await this.provider().isEmpty();
    this.setHasChildren(!isEmpty);
  }

  shortenWindowURL(fullName: string, hasObjectId: boolean): string {
    const startPos = fullName.indexOf('/');
    const endPos = hasObjectId ? fullName.indexOf('@') : fullName.length;
    if (startPos === -1 || endPos === -1) {
      return fullName;
    }
    const fullURL = fullName.substring(startPos + 1, endPos).trimLeft();
    let url = Platform.StringUtilities.trimURL(fullURL);
    if (url.length > 40) {
      url = Platform.StringUtilities.trimMiddle(url, 40);
    }
    return fullName.substr(0, startPos + 2) + url + fullName.substr(endPos);
  }

  override populateContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, dataDisplayDelegate: DataDisplayDelegate,
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null): void {
    if (this.shallowSize !== 0) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.revealInSummaryView), () => {
        dataDisplayDelegate.showObject(String(this.snapshotNodeId), i18nString(UIStrings.summary));
      }, {jslogContext: 'reveal-in-summary'});
    }

    if (this.referenceName) {
      for (const match of this.referenceName.matchAll(/\((?<objectName>[^@)]*) @(?<snapshotNodeId>\d+)\)/g)) {
        const {objectName, snapshotNodeId} = (match.groups as {
          objectName: string,
          snapshotNodeId: string,
        });
        contextMenu.revealSection().appendItem(
            i18nString(UIStrings.revealObjectSWithIdSInSummary, {PH1: objectName, PH2: snapshotNodeId}), () => {
              dataDisplayDelegate.showObject(snapshotNodeId, i18nString(UIStrings.summary));
            }, {jslogContext: 'reveal-in-summary'});
      }
    }

    if (heapProfilerModel) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.storeAsGlobalVariable), async () => {
        const remoteObject =
            await this.tryQueryObjectContent((heapProfilerModel as SDK.HeapProfilerModel.HeapProfilerModel), '');
        if (!remoteObject) {
          Common.Console.Console.instance().error(i18nString(UIStrings.previewIsNotAvailable));
        } else {
          const consoleModel = heapProfilerModel.target().model(SDK.ConsoleModel.ConsoleModel);
          await consoleModel?.saveToTempVariable(
              UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), remoteObject);
        }
      }, {jslogContext: 'store-as-global-variable'});
    }
  }
}

export class HeapSnapshotObjectNode extends HeapSnapshotGenericObjectNode {
  override referenceName: string;
  readonly referenceType: string;
  readonly edgeIndex: number;
  readonly snapshot: HeapSnapshotProxy;
  parentObjectNode: HeapSnapshotObjectNode|null;
  readonly cycledWithAncestorGridNode: HeapSnapshotObjectNode|null;

  constructor(
      dataGrid: HeapSnapshotSortableDataGrid, snapshot: HeapSnapshotProxy,
      edge: HeapSnapshotModel.HeapSnapshotModel.Edge, parentObjectNode: HeapSnapshotObjectNode|null) {
    super(dataGrid, edge.node);
    this.referenceName = edge.name;
    this.referenceType = edge.type;
    this.edgeIndex = edge.edgeIndex;
    this.snapshot = snapshot;

    this.parentObjectNode = parentObjectNode;
    this.cycledWithAncestorGridNode = this.findAncestorWithSameSnapshotNodeId();
    if (!this.cycledWithAncestorGridNode) {
      void this.updateHasChildren();
    }

    const data = this.data;
    data['count'] = '';
    data['addedCount'] = '';
    data['removedCount'] = '';
    data['countDelta'] = '';
    data['addedSize'] = '';
    data['removedSize'] = '';
    data['sizeDelta'] = '';
  }

  override retainersDataSource(): {
    snapshot: HeapSnapshotProxy,
    snapshotNodeIndex: number,
    snapshotNodeId: number|undefined,
  }|null {
    return this.snapshotNodeIndex === undefined ?
        null :
        {snapshot: this.snapshot, snapshotNodeIndex: this.snapshotNodeIndex, snapshotNodeId: this.snapshotNodeId};
  }

  override createProvider(): HeapSnapshotProviderProxy {
    if (this.snapshotNodeIndex === undefined) {
      throw new Error('Cannot create a provider on a root node');
    }
    return this.snapshot.createEdgesProvider(this.snapshotNodeIndex);
  }

  findAncestorWithSameSnapshotNodeId(): HeapSnapshotObjectNode|null {
    let ancestor: (HeapSnapshotObjectNode|null) = this.parentObjectNode;
    while (ancestor) {
      if (ancestor.snapshotNodeId === this.snapshotNodeId) {
        return ancestor;
      }
      ancestor = ancestor.parentObjectNode;
    }
    return null;
  }

  override createChildNode(item: HeapSnapshotModel.HeapSnapshotModel.Node|
                           HeapSnapshotModel.HeapSnapshotModel.Edge): HeapSnapshotObjectNode {
    return new HeapSnapshotObjectNode(
        this.dataGridInternal, this.snapshot, (item as HeapSnapshotModel.HeapSnapshotModel.Edge), this);
  }

  override getHash(): number {
    return this.edgeIndex;
  }

  override comparator(): HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    const sortAscending = this.dataGridInternal.isSortOrderAscending();
    const sortColumnId = this.dataGridInternal.sortColumnId();
    switch (sortColumnId) {
      case 'object':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig(
            '!edgeName', sortAscending, 'retainedSize', false);
      case 'count':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('!edgeName', true, 'retainedSize', false);
      case 'shallowSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('selfSize', sortAscending, '!edgeName', true);
      case 'retainedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig(
            'retainedSize', sortAscending, '!edgeName', true);
      case 'distance':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('distance', sortAscending, 'name', true);
      default:
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('!edgeName', true, 'retainedSize', false);
    }
  }

  override prefixObjectCell(div: Element): void {
    let name: string = this.referenceName || '(empty)';
    let nameClass = 'name';
    switch (this.referenceType) {
      case 'context':
        nameClass = 'object-value-number';
        break;
      case 'internal':
      case 'hidden':
      case 'weak':
        nameClass = 'object-value-null';
        break;
      case 'element':
        name = `[${name}]`;
        break;
    }
    if (this.cycledWithAncestorGridNode) {
      div.classList.add('cycled-ancestor-node');
    }
    div.prepend(UI.Fragment.html`<span class="property-name ${nameClass}">${name}</span>
  <span class="grayed">${this.edgeNodeSeparator()}</span>`);
  }

  edgeNodeSeparator(): string {
    return '::';
  }
}

export class HeapSnapshotRetainingObjectNode extends HeapSnapshotObjectNode {
  #ignored: boolean;
  constructor(
      dataGrid: HeapSnapshotSortableDataGrid, snapshot: HeapSnapshotProxy,
      edge: HeapSnapshotModel.HeapSnapshotModel.Edge, parentRetainingObjectNode: HeapSnapshotRetainingObjectNode|null) {
    super(dataGrid, snapshot, edge, parentRetainingObjectNode);
    this.#ignored = edge.node.ignored;
    if (this.#ignored) {
      this.data['distance'] = i18nString(UIStrings.ignored);
    }
  }

  override createProvider(): HeapSnapshotProviderProxy {
    if (this.snapshotNodeIndex === undefined) {
      throw new Error('Cannot create providers on root nodes');
    }
    return this.snapshot.createRetainingEdgesProvider(this.snapshotNodeIndex);
  }

  override createChildNode(item: HeapSnapshotModel.HeapSnapshotModel.Node|
                           HeapSnapshotModel.HeapSnapshotModel.Edge): HeapSnapshotRetainingObjectNode {
    return new HeapSnapshotRetainingObjectNode(
        this.dataGridInternal, this.snapshot, (item as HeapSnapshotModel.HeapSnapshotModel.Edge), this);
  }

  override edgeNodeSeparator(): string {
    // TODO(l10n): improve description or clarify intention.
    return i18nString(UIStrings.inElement);
  }

  override expand(): void {
    this.expandRetainersChain(20);
  }

  override populateContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, dataDisplayDelegate: DataDisplayDelegate,
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null): void {
    super.populateContextMenu(contextMenu, dataDisplayDelegate, heapProfilerModel);

    const snapshotNodeIndex = this.snapshotNodeIndex;
    if (snapshotNodeIndex === undefined) {
      return;
    }

    if (this.#ignored) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.stopIgnoringThisRetainer), async () => {
        await this.snapshot.unignoreNodeInRetainersView(snapshotNodeIndex);
        await this.dataGridInternal.dataSourceChanged();
      }, {jslogContext: 'stop-ignoring-this-retainer'});
    } else {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.ignoreThisRetainer), async () => {
        await this.snapshot.ignoreNodeInRetainersView(snapshotNodeIndex);
        await this.dataGridInternal.dataSourceChanged();
      }, {jslogContext: 'ignore-this-retainer'});
    }
  }

  isReachable(): boolean {
    return (this.distance ?? 0) < HeapSnapshotModel.HeapSnapshotModel.baseUnreachableDistance;
  }

  override prefixObjectCell(div: Element): void {
    super.prefixObjectCell(div);
    if (!this.isReachable()) {
      div.classList.add('unreachable-ancestor-node');
    }
  }

  expandRetainersChain(maxExpandLevels: number): void {
    if (!this.populated) {
      void this.once(HeapSnapshotGridNode.Events.PopulateComplete)
          .then(() => this.expandRetainersChain(maxExpandLevels));
      this.populate();
      return;
    }
    super.expand();
    if (--maxExpandLevels > 0 && this.children.length > 0) {
      const retainer = (this.children[0] as HeapSnapshotRetainingObjectNode);
      if ((retainer.distance || 0) > 1 && retainer.isReachable()) {
        retainer.expandRetainersChain(maxExpandLevels);
        return;
      }
    }
    this.dataGridInternal.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.ExpandRetainersComplete);
  }

  override comparator(): HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    const result = super.comparator();
    if (result.fieldName1 === 'distance') {
      result.fieldName1 = '!edgeDistance';
    }
    if (result.fieldName2 === 'distance') {
      result.fieldName2 = '!edgeDistance';
    }
    return result;
  }
}

export class HeapSnapshotInstanceNode extends HeapSnapshotGenericObjectNode {
  readonly baseSnapshotOrSnapshot: HeapSnapshotProxy;
  readonly isDeletedNode: boolean;
  constructor(
      dataGrid: HeapSnapshotSortableDataGrid, snapshot: HeapSnapshotProxy,
      node: HeapSnapshotModel.HeapSnapshotModel.Node, isDeletedNode: boolean) {
    super(dataGrid, node);
    this.baseSnapshotOrSnapshot = snapshot;
    this.isDeletedNode = isDeletedNode;
    void this.updateHasChildren();

    const data = this.data;
    data['count'] = '';
    data['countDelta'] = '';
    data['sizeDelta'] = '';
    if (this.isDeletedNode) {
      data['addedCount'] = '';
      data['addedSize'] = '';
      data['removedCount'] = '\u2022';
      data['removedSize'] = Platform.NumberUtilities.withThousandsSeparator(this.shallowSize || 0);
    } else {
      data['addedCount'] = '\u2022';
      data['addedSize'] = Platform.NumberUtilities.withThousandsSeparator(this.shallowSize || 0);
      data['removedCount'] = '';
      data['removedSize'] = '';
    }
  }

  override retainersDataSource(): {
    snapshot: HeapSnapshotProxy,
    snapshotNodeIndex: number,
    snapshotNodeId: number|undefined,
  }|null {
    return this.snapshotNodeIndex === undefined ? null : {
      snapshot: this.baseSnapshotOrSnapshot,
      snapshotNodeIndex: this.snapshotNodeIndex,
      snapshotNodeId: this.snapshotNodeId,
    };
  }

  override createProvider(): HeapSnapshotProviderProxy {
    if (this.snapshotNodeIndex === undefined) {
      throw new Error('Cannot create providers on root nodes');
    }
    return this.baseSnapshotOrSnapshot.createEdgesProvider(this.snapshotNodeIndex);
  }

  override createChildNode(item: HeapSnapshotModel.HeapSnapshotModel.Node|
                           HeapSnapshotModel.HeapSnapshotModel.Edge): HeapSnapshotObjectNode {
    return new HeapSnapshotObjectNode(
        this.dataGridInternal, this.baseSnapshotOrSnapshot, (item as HeapSnapshotModel.HeapSnapshotModel.Edge), null);
  }

  override getHash(): number {
    if (this.snapshotNodeId === undefined) {
      throw new Error('Cannot hash root nodes');
    }
    return this.snapshotNodeId;
  }

  override comparator(): HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    const sortAscending = this.dataGridInternal.isSortOrderAscending();
    const sortColumnId = this.dataGridInternal.sortColumnId();
    switch (sortColumnId) {
      case 'object':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig(
            '!edgeName', sortAscending, 'retainedSize', false);
      case 'distance':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig(
            'distance', sortAscending, 'retainedSize', false);
      case 'count':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('!edgeName', true, 'retainedSize', false);
      case 'addedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('selfSize', sortAscending, '!edgeName', true);
      case 'removedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('selfSize', sortAscending, '!edgeName', true);
      case 'shallowSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('selfSize', sortAscending, '!edgeName', true);
      case 'retainedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig(
            'retainedSize', sortAscending, '!edgeName', true);
      default:
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('!edgeName', true, 'retainedSize', false);
    }
  }
}

export class HeapSnapshotConstructorNode extends HeapSnapshotGridNode {
  readonly nameInternal: string;
  readonly nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter;
  readonly distance: number;
  readonly count: number;
  readonly shallowSize: number;
  readonly retainedSize: number;

  constructor(
      dataGrid: HeapSnapshotConstructorsDataGrid, className: string,
      aggregate: HeapSnapshotModel.HeapSnapshotModel.Aggregate,
      nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter) {
    super(dataGrid, aggregate.count > 0);
    this.nameInternal = className;
    this.nodeFilter = nodeFilter;
    this.distance = aggregate.distance;
    this.count = aggregate.count;
    this.shallowSize = aggregate.self;
    this.retainedSize = aggregate.maxRet;

    const snapshot = (dataGrid.snapshot as HeapSnapshotProxy);
    const retainedSizePercent = this.retainedSize / snapshot.totalSize * 100.0;
    const shallowSizePercent = this.shallowSize / snapshot.totalSize * 100.0;
    this.data = {
      object: className,
      count: Platform.NumberUtilities.withThousandsSeparator(this.count),
      distance: this.toUIDistance(this.distance),
      shallowSize: Platform.NumberUtilities.withThousandsSeparator(this.shallowSize),
      retainedSize: Platform.NumberUtilities.withThousandsSeparator(this.retainedSize),
      'shallowSize-percent': this.toPercentString(shallowSizePercent),
      'retainedSize-percent': this.toPercentString(retainedSizePercent),
    };
  }

  override get name(): string|undefined {
    return this.nameInternal;
  }

  override createProvider(): HeapSnapshotProviderProxy {
    return (this.dataGridInternal.snapshot as HeapSnapshotProxy)
               .createNodesProviderForClass(this.nameInternal, this.nodeFilter) as HeapSnapshotProviderProxy;
  }

  async populateNodeBySnapshotObjectId(snapshotObjectId: number): Promise<HeapSnapshotGridNode[]> {
    this.dataGridInternal.resetNameFilter();
    await this.expandWithoutPopulate();

    const nodePosition = await this.provider().nodePosition(snapshotObjectId);
    if (nodePosition === -1) {
      this.collapse();
      return [];
    }

    await this.populateChildren(nodePosition, null);

    const node = (this.childForPosition(nodePosition) as HeapSnapshotGridNode | null);
    return node ? [this, node] : [];
  }

  filteredOut(filterValue: string): boolean {
    return this.nameInternal.toLowerCase().indexOf(filterValue) === -1;
  }

  override createCell(columnId: string): HTMLElement {
    const cell = columnId === 'object' ? super.createCell(columnId) : this.createValueCell(columnId);
    if (columnId === 'object' && this.count > 1) {
      cell.appendChild(UI.Fragment.html`<span class="objects-count">×${this.count}</span>`);
    }
    return cell;
  }

  override createChildNode(item: HeapSnapshotModel.HeapSnapshotModel.Node|
                           HeapSnapshotModel.HeapSnapshotModel.Edge): HeapSnapshotInstanceNode {
    return new HeapSnapshotInstanceNode(
        this.dataGridInternal, (this.dataGridInternal.snapshot as HeapSnapshotProxy),
        (item as HeapSnapshotModel.HeapSnapshotModel.Node), false);
  }

  override comparator(): HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    const sortAscending = this.dataGridInternal.isSortOrderAscending();
    const sortColumnId = this.dataGridInternal.sortColumnId();
    switch (sortColumnId) {
      case 'object':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('name', sortAscending, 'id', true);
      case 'distance':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig(
            'distance', sortAscending, 'retainedSize', false);
      case 'shallowSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('selfSize', sortAscending, 'id', true);
      case 'retainedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('retainedSize', sortAscending, 'id', true);
      default:
        throw new Error(`Invalid sort column id ${sortColumnId}`);
    }
  }
}

export class HeapSnapshotDiffNodesProvider implements ChildrenProvider {
  addedNodesProvider: HeapSnapshotProviderProxy;
  deletedNodesProvider: HeapSnapshotProviderProxy;
  addedCount: number;
  removedCount: number;
  constructor(
      addedNodesProvider: HeapSnapshotProviderProxy, deletedNodesProvider: HeapSnapshotProviderProxy,
      addedCount: number, removedCount: number) {
    this.addedNodesProvider = addedNodesProvider;
    this.deletedNodesProvider = deletedNodesProvider;
    this.addedCount = addedCount;
    this.removedCount = removedCount;
  }

  dispose(): void {
    this.addedNodesProvider.dispose();
    this.deletedNodesProvider.dispose();
  }

  nodePosition(_snapshotObjectId: number): Promise<number> {
    throw new Error('Unreachable');
  }

  isEmpty(): Promise<boolean> {
    return Promise.resolve(false);
  }

  async serializeItemsRange(beginPosition: number, endPosition: number):
      Promise<HeapSnapshotModel.HeapSnapshotModel.ItemsRange> {
    let itemsRange;
    let addedItems;
    if (beginPosition < this.addedCount) {
      itemsRange = await this.addedNodesProvider.serializeItemsRange(beginPosition, endPosition);

      for (const item of itemsRange.items) {
        item.isAddedNotRemoved = true;
      }

      if (itemsRange.endPosition >= endPosition) {
        itemsRange.totalLength = this.addedCount + this.removedCount;
        return itemsRange;
      }

      addedItems = itemsRange;
      itemsRange = await this.deletedNodesProvider.serializeItemsRange(0, endPosition - itemsRange.endPosition);
    } else {
      addedItems = new HeapSnapshotModel.HeapSnapshotModel.ItemsRange(0, 0, 0, []);
      itemsRange = await this.deletedNodesProvider.serializeItemsRange(
          beginPosition - this.addedCount, endPosition - this.addedCount);
    }

    if (!addedItems.items.length) {
      addedItems.startPosition = this.addedCount + itemsRange.startPosition;
    }
    for (const item of itemsRange.items) {
      item.isAddedNotRemoved = false;
    }
    addedItems.items.push(...itemsRange.items);
    addedItems.endPosition = this.addedCount + itemsRange.endPosition;
    addedItems.totalLength = this.addedCount + this.removedCount;
    return addedItems;
  }

  async sortAndRewind(comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig): Promise<void> {
    await this.addedNodesProvider.sortAndRewind(comparator);
    await this.deletedNodesProvider.sortAndRewind(comparator);
  }
}

export class HeapSnapshotDiffNode extends HeapSnapshotGridNode {
  readonly nameInternal: string;
  readonly addedCount: number;
  readonly removedCount: number;
  readonly countDelta: number;
  readonly addedSize: number;
  readonly removedSize: number;
  readonly sizeDelta: number;
  readonly deletedIndexes: number[];

  constructor(
      dataGrid: HeapSnapshotDiffDataGrid, className: string,
      diffForClass: HeapSnapshotModel.HeapSnapshotModel.DiffForClass) {
    super(dataGrid, true);
    this.nameInternal = className;
    this.addedCount = diffForClass.addedCount;
    this.removedCount = diffForClass.removedCount;
    this.countDelta = diffForClass.countDelta;
    this.addedSize = diffForClass.addedSize;
    this.removedSize = diffForClass.removedSize;
    this.sizeDelta = diffForClass.sizeDelta;
    this.deletedIndexes = diffForClass.deletedIndexes;
    this.data = {
      object: className,
      addedCount: Platform.NumberUtilities.withThousandsSeparator(this.addedCount),
      removedCount: Platform.NumberUtilities.withThousandsSeparator(this.removedCount),
      countDelta: this.signForDelta(this.countDelta) +
          Platform.NumberUtilities.withThousandsSeparator(Math.abs(this.countDelta)),
      addedSize: Platform.NumberUtilities.withThousandsSeparator(this.addedSize),
      removedSize: Platform.NumberUtilities.withThousandsSeparator(this.removedSize),
      sizeDelta:
          this.signForDelta(this.sizeDelta) + Platform.NumberUtilities.withThousandsSeparator(Math.abs(this.sizeDelta)),
    };
  }

  override get name(): string|undefined {
    return this.nameInternal;
  }

  override createProvider(): HeapSnapshotDiffNodesProvider {
    const tree = this.dataGridInternal as HeapSnapshotDiffDataGrid;
    if (tree.snapshot === null || tree.baseSnapshot === undefined || tree.baseSnapshot.uid === undefined) {
      throw new Error('Data sources have not been set correctly');
    }
    const addedNodesProvider = tree.snapshot.createAddedNodesProvider(tree.baseSnapshot.uid, this.nameInternal);
    const deletedNodesProvider = tree.baseSnapshot.createDeletedNodesProvider(this.deletedIndexes);
    if (!addedNodesProvider || !deletedNodesProvider) {
      throw new Error('Failed to create node providers');
    }
    return new HeapSnapshotDiffNodesProvider(
        addedNodesProvider, deletedNodesProvider, this.addedCount, this.removedCount);
  }

  override createCell(columnId: string): HTMLElement {
    const cell = super.createCell(columnId);
    if (columnId !== 'object') {
      cell.classList.add('numeric-column');
    }
    return cell;
  }

  override createChildNode(item: HeapSnapshotModel.HeapSnapshotModel.Node|
                           HeapSnapshotModel.HeapSnapshotModel.Edge): HeapSnapshotInstanceNode {
    const dataGrid = (this.dataGridInternal as HeapSnapshotDiffDataGrid);
    if (item.isAddedNotRemoved) {
      if (dataGrid.snapshot === null) {
        throw new Error('Data sources have not been set correctly');
      }
      return new HeapSnapshotInstanceNode(
          this.dataGridInternal, dataGrid.snapshot, (item as HeapSnapshotModel.HeapSnapshotModel.Node), false);
    }
    if (dataGrid.baseSnapshot === undefined) {
      throw new Error('Data sources have not been set correctly');
    }
    return new HeapSnapshotInstanceNode(
        this.dataGridInternal, dataGrid.baseSnapshot, (item as HeapSnapshotModel.HeapSnapshotModel.Node), true);
  }

  override comparator(): HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    const sortAscending = this.dataGridInternal.isSortOrderAscending();
    const sortColumnId = this.dataGridInternal.sortColumnId();
    switch (sortColumnId) {
      case 'object':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('name', sortAscending, 'id', true);
      case 'addedCount':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('name', true, 'id', true);
      case 'removedCount':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('name', true, 'id', true);
      case 'countDelta':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('name', true, 'id', true);
      case 'addedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('selfSize', sortAscending, 'id', true);
      case 'removedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('selfSize', sortAscending, 'id', true);
      case 'sizeDelta':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('selfSize', sortAscending, 'id', true);
      default:
        throw new Error(`Invalid sort column ${sortColumnId}`);
    }
  }

  filteredOut(filterValue: string): boolean {
    return this.nameInternal.toLowerCase().indexOf(filterValue) === -1;
  }

  signForDelta(delta: number): ''|'+'|'−' {
    if (delta === 0) {
      return '';
    }
    if (delta > 0) {
      return '+';
    }
    return '\u2212';  // Math minus sign, same width as plus.
  }
}

export class AllocationGridNode extends HeapSnapshotGridNode {
  override populated: boolean;
  readonly allocationNode: HeapSnapshotModel.HeapSnapshotModel.SerializedAllocationNode;

  constructor(dataGrid: AllocationDataGrid, data: HeapSnapshotModel.HeapSnapshotModel.SerializedAllocationNode) {
    super(dataGrid, data.hasChildren);
    this.populated = false;
    this.allocationNode = data;
    this.data = {
      liveCount: Platform.NumberUtilities.withThousandsSeparator(data.liveCount),
      count: Platform.NumberUtilities.withThousandsSeparator(data.count),
      liveSize: Platform.NumberUtilities.withThousandsSeparator(data.liveSize),
      size: Platform.NumberUtilities.withThousandsSeparator(data.size),
      name: data.name,
    };
  }

  override populate(): void {
    if (this.populated) {
      return;
    }
    void this.doPopulate();
  }

  async doPopulate(): Promise<void> {
    this.populated = true;

    const callers =
        await (this.dataGridInternal.snapshot as HeapSnapshotProxy).allocationNodeCallers(this.allocationNode.id);

    const callersChain = callers.nodesWithSingleCaller;
    let parentNode: AllocationGridNode = (this as AllocationGridNode);
    const dataGrid = (this.dataGridInternal as AllocationDataGrid);
    for (const caller of callersChain) {
      const child = new AllocationGridNode(dataGrid, caller);
      dataGrid.appendNode(parentNode, child);
      parentNode = child;
      parentNode.populated = true;
      if (this.expanded) {
        parentNode.expand();
      }
    }

    const callersBranch = callers.branchingCallers;
    callersBranch.sort((this.dataGridInternal as AllocationDataGrid).createComparator());
    for (const caller of callersBranch) {
      dataGrid.appendNode(parentNode, new AllocationGridNode(dataGrid, caller));
    }
    dataGrid.updateVisibleNodes(true);
  }

  override expand(): void {
    super.expand();
    if (this.children.length === 1) {
      this.children[0].expand();
    }
  }

  override createCell(columnId: string): HTMLElement {
    if (columnId !== 'name') {
      return this.createValueCell(columnId);
    }

    const cell = super.createCell(columnId);
    const allocationNode = this.allocationNode;
    const heapProfilerModel = this.dataGridInternal.heapProfilerModel();
    if (allocationNode.scriptId) {
      const linkifier = (this.dataGridInternal as AllocationDataGrid).linkifier;
      const urlElement = linkifier.linkifyScriptLocation(
          heapProfilerModel ? heapProfilerModel.target() : null,
          String(allocationNode.scriptId) as Protocol.Runtime.ScriptId,
          allocationNode.scriptName as Platform.DevToolsPath.UrlString, allocationNode.line - 1, {
            columnNumber: allocationNode.column - 1,
            inlineFrameIndex: 0,
            className: 'profile-node-file',
          });
      urlElement.style.maxWidth = '75%';
      cell.insertBefore(urlElement, cell.firstChild);
    }
    return cell;
  }

  allocationNodeId(): number {
    return this.allocationNode.id;
  }
}
