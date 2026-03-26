// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import thirdPartyTreeViewStyles from './thirdPartyTreeView.css.js';
import * as TimelineTreeView from './TimelineTreeView.js';

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

  #onRowHovered?: (node: Trace.Extras.TraceTree.Node|null, events?: Trace.Types.Events.Event[]) => void;
  #onBottomUpButtonClicked?: (node: Trace.Extras.TraceTree.Node|null) => void;
  #onRowClicked?: (node: Trace.Extras.TraceTree.Node|null, events?: Trace.Types.Events.Event[]) => void;

  constructor(element?: HTMLElement) {
    super(element);
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

  override isThirdPartyTreeView(): boolean {
    return true;
  }

  override wasShown(): void {
    super.wasShown();
    this.registerRequiredCSS(thirdPartyTreeViewStyles);
  }

  override set model(model: {
    selectedEvents: Trace.Types.Events.Event[]|null,
    parsedTrace: Trace.TraceModel.ParsedTrace|null,
    entityMapper: Trace.EntityMapper.EntityMapper|null,
  }) {
    super.model = model;

    const hasEvents = Boolean(model.selectedEvents && model.selectedEvents.length > 0);
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

    // The filters for this view are slightly different; we want to use the set
    // of visible event types, but also include network events, which by
    // default are not in the set of visible entries (as they are not shown on
    // the main flame chart).
    const filter = new Trace.Extras.TraceFilter.VisibleEventsFilter(
        Trace.Styles.visibleTypes().concat([Trace.Types.Events.Name.SYNTHETIC_NETWORK_REQUEST]));

    const node = new Trace.Extras.TraceTree.BottomUpRootNode(this.selectedEvents(), {
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
    icon?: Element,
  } {
    const color = 'gray';
    const unattributed = i18nString(UIStrings.unattributed);
    const id = typeof node.id === 'symbol' ? undefined : node.id;
    // This `undefined` is [unattributed]
    // TODO(paulirish): Improve attribution to reduce amount of items in [unattributed].
    const domainName = id ? this.entityMapper()?.entityForEvent(node.event)?.name || id : undefined;
    return {
      name: domainName || unattributed,
      color,
    };
  }

  override nodeIsFirstParty(node: Trace.Extras.TraceTree.Node): boolean {
    const mapper = this.entityMapper();
    if (!mapper) {
      return false;
    }
    const firstParty = mapper.firstPartyEntity();
    return firstParty === mapper.entityForEvent(node.event);
  }

  override nodeIsExtension(node: Trace.Extras.TraceTree.Node): boolean {
    const mapper = this.entityMapper();
    if (!mapper) {
      return false;
    }
    const entity = mapper.entityForEvent(node.event);
    return Boolean(entity) && entity?.category === 'Chrome Extension';
  }

  set maxRows(maxRows: number) {
    this.element.style.setProperty('--max-rows', String(maxRows));
    this.element.classList.toggle('has-max-rows', Boolean(maxRows));
  }

  set onRowHovered(callback: (node: Trace.Extras.TraceTree.Node|null, events?: Trace.Types.Events.Event[]) => void) {
    if (!this.#onRowHovered) {
      this.addEventListener(TimelineTreeView.TimelineTreeView.Events.TREE_ROW_HOVERED, ({data}) => {
        this.#onRowHovered?.(data.node, data.events);
      });
    }
    this.#onRowHovered = callback;
  }

  set onBottomUpButtonClicked(callback: (node: Trace.Extras.TraceTree.Node|null) => void) {
    if (!this.#onBottomUpButtonClicked) {
      this.addEventListener(TimelineTreeView.TimelineTreeView.Events.BOTTOM_UP_BUTTON_CLICKED, ({data}) => {
        this.#onBottomUpButtonClicked?.(data);
      });
    }
    this.#onBottomUpButtonClicked = callback;
  }

  set onRowClicked(callback: (node: Trace.Extras.TraceTree.Node|null, events?: Trace.Types.Events.Event[]) => void) {
    if (!this.#onRowClicked) {
      this.addEventListener(TimelineTreeView.TimelineTreeView.Events.TREE_ROW_CLICKED, ({data}) => {
        this.#onRowClicked?.(data.node, data.events);
      });
    }
    this.#onRowClicked = callback;
  }
}
