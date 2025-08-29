// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import thirdPartyTreeViewStyles from './thirdPartyTreeView.css.js';
import * as TimelineTreeView from './TimelineTreeView.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   * @description Unattributed text for an unattributed entity.
   */
  unattributed: '[unattributed]',
  /**
   * @description Title for the name of either 1st or 3rd Party entities.
   */
  firstOrThirdPartyName: '1st / 3rd party',
  /**
   * @description Title referencing transfer size.
   */
  transferSize: 'Transfer size',
  /**
   * @description Title referencing main thread time.
   */
  mainThreadTime: 'Main thread time',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/ThirdPartyTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ThirdPartyTreeViewWidget extends TimelineTreeView.TimelineTreeView {
  // By default the TimelineTreeView will auto-select the first row
  // when the grid is refreshed but for the ThirdParty view we only
  // want to do this when the user hovers.
  protected override autoSelectFirstChildOnRefresh = false;

  constructor() {
    super();
    this.element.setAttribute('jslog', `${VisualLogging.pane('third-party-tree').track({hover: true})}`);
    this.init();
    this.dataGrid.markColumnAsSortedBy('self', DataGrid.DataGrid.Order.Descending);
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.NEAREST);
    /**
     * By default data grids always expand when arrowing.
     * For 3P table, we don't use this feature.
     */
    this.dataGrid.expandNodesWhenArrowing = false;
  }

  override wasShown(): void {
    super.wasShown();
    this.registerRequiredCSS(thirdPartyTreeViewStyles);
  }

  override setModelWithEvents(
      selectedEvents: Trace.Types.Events.Event[]|null, parsedTrace?: Trace.Handlers.Types.ParsedTrace|null,
      entityMappings?: Utils.EntityMapper.EntityMapper|null): void {
    super.setModelWithEvents(selectedEvents, parsedTrace, entityMappings);

    const hasEvents = Boolean(selectedEvents && selectedEvents.length > 0);
    this.element.classList.toggle('empty-table', !hasEvents);
  }

  override buildTree(): Trace.Extras.TraceTree.Node {
    const parsedTrace = this.parsedTrace();
    const entityMapper = this.entityMapper();

    if (!parsedTrace || !entityMapper) {
      return new Trace.Extras.TraceTree.BottomUpRootNode([], {
        textFilter: this.textFilter(),
        filters: this.filtersWithoutTextFilter(),
        startTime: this.startTime,
        endTime: this.endTime,
        eventGroupIdCallback: this.groupingFunction.bind(this),
      });
    }

    // const events = this.#thirdPartySummaries.entityByEvent.keys();
    const relatedEvents = this.selectedEvents().sort(Trace.Helpers.Trace.eventTimeComparator);

    // The filters for this view are slightly different; we want to use the set
    // of visible event types, but also include network events, which by
    // default are not in the set of visible entries (as they are not shown on
    // the main flame chart).
    const filter = new Trace.Extras.TraceFilter.VisibleEventsFilter(
        Utils.EntryStyles.visibleTypes().concat([Trace.Types.Events.Name.SYNTHETIC_NETWORK_REQUEST]));

    const node = new Trace.Extras.TraceTree.BottomUpRootNode(relatedEvents, {
      textFilter: this.textFilter(),
      filters: [filter],
      startTime: this.startTime,
      endTime: this.endTime,
      eventGroupIdCallback: this.groupingFunction.bind(this),
      calculateTransferSize: true,
      // Ensure we group by 3P alongside eventID for correct 3P grouping.
      forceGroupIdCallback: true,
    });
    return node;
  }

  /**
   * Third party tree view doesn't require the select feature, as this expands the node.
   */
  override selectProfileNode(): void {
    return;
  }

  private groupingFunction(event: Trace.Types.Events.Event): string {
    const entity = this.entityMapper()?.entityForEvent(event);
    if (!entity) {
      return '';
    }

    return entity.name;
  }

  override populateColumns(columns: DataGrid.DataGrid.ColumnDescriptor[]): void {
    columns.push(
        {
          id: 'site',
          title: i18nString(UIStrings.firstOrThirdPartyName),
          // It's important that this width is the `.widget.vbox.timeline-tree-view` max-width (550)
          // minus the two fixed sizes below. (550-100-105) == 345
          width: '345px',
          // And with this column not-fixed-width and resizingMethod NEAREST, the name-column will appropriately flex.
          sortable: true,
        },
        {
          id: 'transfer-size',
          title: i18nString(UIStrings.transferSize),
          width: '100px',  // Mostly so there's room for the header plus sorting triangle
          fixedWidth: true,
          sortable: true,
        },
        {
          id: 'self',
          title: i18nString(UIStrings.mainThreadTime),
          width: '120px',  // Mostly to fit large self-time/main thread time plus devtools-button
          fixedWidth: true,
          sortable: true,
        });
  }

  override populateToolbar(): void {
    return;
  }

  private compareTransferSize(
      a: DataGrid.SortableDataGrid.SortableDataGridNode<TimelineTreeView.GridNode>,
      b: DataGrid.SortableDataGrid.SortableDataGridNode<TimelineTreeView.GridNode>): number {
    const nodeA = a as TimelineTreeView.TreeGridNode;
    const nodeB = b as TimelineTreeView.TreeGridNode;
    const transferA = nodeA.profileNode.transferSize ?? 0;
    const transferB = nodeB.profileNode.transferSize ?? 0;
    return transferA - transferB;
  }

  override sortingChanged(): void {
    const columnId = this.dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }

    let sortFunction:
        ((a: DataGrid.SortableDataGrid.SortableDataGridNode<TimelineTreeView.GridNode>,
          b: DataGrid.SortableDataGrid.SortableDataGridNode<TimelineTreeView.GridNode>) => number)|null;
    switch (columnId) {
      case 'transfer-size':
        sortFunction = this.compareTransferSize.bind(this);
        break;
      default:
        sortFunction = super.getSortingFunction(columnId);
        break;
    }

    if (sortFunction) {
      this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());
    }
  }

  override onHover(node: Trace.Extras.TraceTree.Node|null): void {
    if (!node) {
      this.dispatchEventToListeners(TimelineTreeView.TimelineTreeView.Events.TREE_ROW_HOVERED, {node: null});
      return;
    }
    this.#getEventsForEventDispatch(node);
    const events = this.#getEventsForEventDispatch(node);
    this.dispatchEventToListeners(
        TimelineTreeView.TimelineTreeView.Events.TREE_ROW_HOVERED,
        {node, events: events && events.length > 0 ? events : undefined});
  }

  override onClick(node: Trace.Extras.TraceTree.Node|null): void {
    if (!node) {
      this.dispatchEventToListeners(TimelineTreeView.TimelineTreeView.Events.TREE_ROW_CLICKED, {node: null});
      return;
    }
    const events = this.#getEventsForEventDispatch(node);
    this.dispatchEventToListeners(
        TimelineTreeView.TimelineTreeView.Events.TREE_ROW_CLICKED,
        {node, events: events && events.length > 0 ? events : undefined});
  }

  // For ThirdPartyTree, we should include everything in our entity mapper for full coverage.
  #getEventsForEventDispatch(node: Trace.Extras.TraceTree.Node): Trace.Types.Events.Event[]|null {
    const mapper = this.entityMapper();
    if (!mapper) {
      return null;
    }

    const entity = mapper.entityForEvent(node.event);
    return entity ? mapper.eventsForEntity(entity) ?? [] : [];
  }

  displayInfoForGroupNode(node: Trace.Extras.TraceTree.Node): {
    name: string,
    color: string,
    icon: (Element|undefined),
  } {
    const color = 'gray';
    const unattributed = i18nString(UIStrings.unattributed);
    const id = typeof node.id === 'symbol' ? undefined : node.id;
    // This `undefined` is [unattributed]
    // TODO(paulirish,aixba): Improve attribution to reduce amount of items in [unattributed].
    const domainName = id ? this.entityMapper()?.entityForEvent(node.event)?.name || id : undefined;
    return {name: domainName || unattributed, color, icon: undefined};
  }

  nodeIsFirstParty(node: Trace.Extras.TraceTree.Node): boolean {
    const mapper = this.entityMapper();
    if (!mapper) {
      return false;
    }
    const firstParty = mapper.firstPartyEntity();
    return firstParty === mapper.entityForEvent(node.event);
  }

  nodeIsExtension(node: Trace.Extras.TraceTree.Node): boolean {
    const mapper = this.entityMapper();
    if (!mapper) {
      return false;
    }
    const entity = mapper.entityForEvent(node.event);
    return Boolean(entity) && entity?.category === 'Chrome Extension';
  }
}

export class ThirdPartyTreeElement extends UI.Widget.WidgetElement<UI.Widget.Widget> {
  #treeView?: ThirdPartyTreeViewWidget;

  set treeView(treeView: ThirdPartyTreeViewWidget) {
    this.#treeView = treeView;
  }

  constructor() {
    super();
    this.style.display = 'contents';
  }

  override createWidget(): UI.Widget.Widget {
    const containerWidget = new UI.Widget.Widget(this);
    containerWidget.contentElement.style.display = 'contents';
    if (this.#treeView) {
      this.#treeView.show(containerWidget.contentElement);
    }
    return containerWidget;
  }
}

customElements.define('devtools-performance-third-party-tree-view', ThirdPartyTreeElement);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-third-party-tree-view': ThirdPartyTreeElement;
  }
}
