// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {Category, IsLong} from './TimelineFilters.js';
import type {TimelineModeViewDelegate} from './TimelinePanel.js';
import {selectionIsEvent, type TimelineSelection} from './TimelineSelection.js';
import {TimelineTreeView} from './TimelineTreeView.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   *@description Text for the start time of an activity
   */
  startTime: 'Start time',
  /**
   *@description Screen reader label for a select box that filters the Performance panel Event Log by duration.
   */
  durationFilter: 'Duration filter',
  /**
   *@description Text in Events Timeline Tree View of the Performance panel
   *@example {2} PH1
   */
  Dms: '{PH1} ms',
  /**
   *@description Text for everything
   */
  all: 'All',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/EventsTimelineTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class EventsTimelineTreeView extends TimelineTreeView {
  private readonly filtersControl: Filters;
  private readonly delegate: TimelineModeViewDelegate;
  private currentTree!: Trace.Extras.TraceTree.Node;
  constructor(delegate: TimelineModeViewDelegate) {
    super();
    this.element.setAttribute('jslog', `${VisualLogging.pane('event-log').track({resize: true})}`);
    this.filtersControl = new Filters();
    this.filtersControl.addEventListener(Events.FILTER_CHANGED, this.onFilterChanged, this);
    this.init();
    this.delegate = delegate;
    this.dataGrid.markColumnAsSortedBy('start-time', DataGrid.DataGrid.Order.Ascending);
    this.splitWidget.showBoth();
  }

  override filters(): Trace.Extras.TraceFilter.TraceFilter[] {
    return [...super.filters(), ...this.filtersControl.filters()];
  }

  override updateContents(selection: TimelineSelection): void {
    super.updateContents(selection);
    if (selectionIsEvent(selection)) {
      this.selectEvent(selection.event, true);
    }
  }

  override buildTree(): Trace.Extras.TraceTree.Node {
    this.currentTree = this.buildTopDownTree(true, null);
    return this.currentTree;
  }

  private onFilterChanged(): void {
    const lastSelectedNode = this.lastSelectedNode();
    const selectedEvent = lastSelectedNode && lastSelectedNode.event;
    this.refreshTree();
    if (selectedEvent) {
      this.selectEvent(selectedEvent, false);
    }
  }

  private findNodeWithEvent(event: Trace.Types.Events.Event): Trace.Extras.TraceTree.Node|null {
    if (event.name === Trace.Types.Events.Name.RUN_TASK) {
      // No node is ever created for the top level RunTask event, so
      // bail out preemptively
      return null;
    }
    const iterators = [this.currentTree.children().values()];
    while (iterators.length) {
      const {done, value: child} = iterators[iterators.length - 1].next();
      if (done) {
        iterators.pop();
        continue;
      }
      if (child.event === event) {
        return child;
      }
      iterators.push(child.children().values());
    }
    return null;
  }

  private selectEvent(event: Trace.Types.Events.Event, expand?: boolean): void {
    const node = this.findNodeWithEvent(event);
    if (!node) {
      return;
    }
    this.selectProfileNode(node, false);
    if (expand) {
      const dataGridNode = this.dataGridNodeForTreeNode(node);
      if (dataGridNode) {
        dataGridNode.expand();
      }
    }
  }

  override populateColumns(columns: DataGrid.DataGrid.ColumnDescriptor[]): void {
    columns.push(({
      id: 'start-time',
      title: i18nString(UIStrings.startTime),
      width: '80px',
      fixedWidth: true,
      sortable: true,
    } as DataGrid.DataGrid.ColumnDescriptor));
    super.populateColumns(columns);
    columns.filter(c => c.fixedWidth).forEach(c => {
      c.width = '80px';
    });
  }

  override populateToolbar(toolbar: UI.Toolbar.Toolbar): void {
    super.populateToolbar(toolbar);
    this.filtersControl.populateToolbar(toolbar);
  }

  override showDetailsForNode(node: Trace.Extras.TraceTree.Node): boolean {
    const parsedTrace = this.parsedTrace();
    if (!parsedTrace) {
      return false;
    }
    const traceEvent = node.event;
    if (!traceEvent) {
      return false;
    }
    void TimelineUIUtils.buildTraceEventDetails(parsedTrace, traceEvent, this.linkifier, false)
        .then(fragment => this.detailsView.element.appendChild(fragment));
    return true;
  }

  override onHover(node: Trace.Extras.TraceTree.Node|null): void {
    this.delegate.highlightEvent(node && node.event);
  }
}

export class Filters extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly categoryFilter: Category;
  private readonly durationFilter: IsLong;
  private readonly filtersInternal: (IsLong|Category)[];
  constructor() {
    super();
    this.categoryFilter = new Category();
    this.durationFilter = new IsLong();
    this.filtersInternal = [this.categoryFilter, this.durationFilter];
  }

  filters(): Trace.Extras.TraceFilter.TraceFilter[] {
    return this.filtersInternal;
  }

  populateToolbar(toolbar: UI.Toolbar.Toolbar): void {
    const durationFilterUI = new UI.Toolbar.ToolbarComboBox(
        durationFilterChanged.bind(this), i18nString(UIStrings.durationFilter), undefined, 'duration');
    for (const durationMs of Filters.durationFilterPresetsMs) {
      durationFilterUI.addOption(durationFilterUI.createOption(
          durationMs ? `≥ ${i18nString(UIStrings.Dms, {PH1: durationMs})}` : i18nString(UIStrings.all),
          String(durationMs)));
    }
    toolbar.appendToolbarItem(durationFilterUI);

    const categoryFiltersUI = new Map<string, UI.Toolbar.ToolbarCheckbox>();
    const categories = Utils.EntryStyles.getCategoryStyles();
    for (const categoryName in categories) {
      const category = categories[categoryName as Utils.EntryStyles.EventCategory];
      if (!category.visible) {
        continue;
      }
      const checkbox = new UI.Toolbar.ToolbarCheckbox(
          category.title, undefined,
          categoriesFilterChanged.bind(this, categoryName as Utils.EntryStyles.EventCategory), categoryName);
      checkbox.setChecked(true);
      checkbox.inputElement.style.backgroundColor = category.color;
      categoryFiltersUI.set(category.name, checkbox);
      toolbar.appendToolbarItem(checkbox);
    }

    function durationFilterChanged(this: Filters): void {
      const duration = (durationFilterUI.selectedOption() as HTMLOptionElement).value;
      const minimumRecordDuration = parseInt(duration, 10);
      this.durationFilter.setMinimumRecordDuration(Trace.Types.Timing.MilliSeconds(minimumRecordDuration));
      this.notifyFiltersChanged();
    }

    function categoriesFilterChanged(this: Filters, name: Utils.EntryStyles.EventCategory): void {
      const categories = Utils.EntryStyles.getCategoryStyles();
      const checkBox = categoryFiltersUI.get(name);
      categories[name].hidden = !checkBox || !checkBox.checked();
      this.notifyFiltersChanged();
    }
  }

  private notifyFiltersChanged(): void {
    this.dispatchEventToListeners(Events.FILTER_CHANGED);
  }

  private static readonly durationFilterPresetsMs = [0, 1, 15];
}

const enum Events {
  FILTER_CHANGED = 'FilterChanged',
}

type EventTypes = {
  [Events.FILTER_CHANGED]: void,
};
