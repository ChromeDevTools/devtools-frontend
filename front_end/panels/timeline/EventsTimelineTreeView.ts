// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {Category, IsLong} from './TimelineFilters.js';
import type {TimelineModeViewDelegate} from './TimelinePanel.js';
import {selectionIsEvent, type TimelineSelection} from './TimelineSelection.js';
import {TimelineTreeView} from './TimelineTreeView.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';

function renderNodeDetails(input: DocumentFragment, _output: undefined, target: HTMLElement): void {
  render(html`${input}`, target);
}

interface FilterToolbarInput {
  durationPresetsMs: readonly number[];
  onDurationChange: (durationMs: number) => void;
  categories: Trace.Styles.CategoryPalette;
  onCategoryChange: (name: Trace.Styles.EventCategory, checked: boolean) => void;
}

function renderFilterToolbar(input: FilterToolbarInput, _output: undefined, target: DocumentFragment): void {
  // clang-format off
  render(html`
    <select title=${i18nString(UIStrings.durationFilter)}
        aria-label=${i18nString(UIStrings.durationFilter)}
        jslog=${VisualLogging.dropDown('duration').track({change: true})}
        @change=${(event: Event) => {
          const duration = (event.target as HTMLSelectElement).value;
          input.onDurationChange(parseInt(duration, 10));
        }}>
      ${input.durationPresetsMs.map(durationMs => html`
        <option value=${String(durationMs)}
            jslog=${VisualLogging.item(String(durationMs)).track({click: true})}>
          ${durationMs ? `≥ ${i18n.TimeUtilities.millisToString(durationMs)}` : i18nString(UIStrings.all)}
        </option>
      `)}
    </select>
    ${Object.entries(input.categories).map(([categoryName, category]) => category.visible ? html`
      <devtools-checkbox
          checked
          jslog=${VisualLogging.toggle().track({change: true}).context(categoryName)}
          @change=${(event: Event) => {
            const checkBox = event.target as UI.UIUtils.CheckboxLabel;
            input.onCategoryChange(categoryName as Trace.Styles.EventCategory, checkBox.checked);
          }}>
        ${category.title}
      </devtools-checkbox>
    ` : nothing)}
  `, target);
  // clang-format on
}

const UIStrings = {
  /**
   * @description Column header for start time in the event log tree view of the
   * Performance panel.
   */
  startTime: 'Start time',
  /**
   * @description Screen reader label for a select box that filters the event
   * log by duration in the Performance panel.
   */
  durationFilter: 'Duration filter',
  /**
   * @description Option in the duration filter dropdown to show all events in
   * the event log of the Performance panel.
   */
  all: 'All',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/EventsTimelineTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class EventsTimelineTreeView extends TimelineTreeView {
  private readonly filtersControl: Filters;
  private readonly delegate: TimelineModeViewDelegate;
  private currentTree!: Trace.Extras.TraceTree.Node;
  constructor(delegate: TimelineModeViewDelegate) {
    super(undefined, {jslog: `${VisualLogging.pane('event-log').track({resize: true})}`});
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

  override set activeSelection(selection: TimelineSelection) {
    super.activeSelection = selection;
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
    const selectedEvent = lastSelectedNode?.event;
    this.refreshTree();
    if (selectedEvent) {
      this.selectEvent(selectedEvent, false);
    }
  }

  private selectEvent(event: Trace.Types.Events.Event, expand?: boolean): void {
    const node = this.eventToTreeNode.get(event);
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
    columns.push({
      id: 'start-time',
      title: i18nString(UIStrings.startTime),
      width: '80px',
      fixedWidth: true,
      sortable: true,
    });
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
    const parsedTrace = this.parsedTrace;
    if (!parsedTrace) {
      return false;
    }
    const traceEvent = node.event;
    if (!traceEvent) {
      return false;
    }
    void TimelineUIUtils.buildTraceEventDetails(parsedTrace, traceEvent, this.linkifier, false, null).then(fragment => {
      if (this.lastSelectedNode() === node) {
        renderNodeDetails(fragment, undefined, this.detailsView.element);
      }
    });
    return true;
  }

  override onHover(node: Trace.Extras.TraceTree.Node|null): void {
    this.delegate.highlightEvent(node?.event ?? null);
  }
}

export class Filters extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly categoryFilter: Category;
  private readonly durationFilter: IsLong;
  readonly #filters: Array<IsLong|Category>;
  constructor() {
    super();
    this.categoryFilter = new Category();
    this.durationFilter = new IsLong();
    this.#filters = [this.categoryFilter, this.durationFilter];
  }

  filters(): Trace.Extras.TraceFilter.TraceFilter[] {
    return this.#filters;
  }

  populateToolbar(toolbar: UI.Toolbar.Toolbar): void {
    const categories = Trace.Styles.getCategoryStyles();
    const fragment = document.createDocumentFragment();
    renderFilterToolbar(
        {
          durationPresetsMs: Filters.durationFilterPresetsMs,
          onDurationChange: durationFilterChanged.bind(this),
          categories,
          onCategoryChange: categoriesFilterChanged.bind(this),
        },
        undefined,
        fragment,
    );
    for (const child of Array.from(fragment.children)) {
      if (child instanceof HTMLElement) {
        toolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(child));
      }
    }

    function durationFilterChanged(this: Filters, minimumRecordDuration: number): void {
      this.durationFilter.setMinimumRecordDuration(Trace.Types.Timing.Milli(minimumRecordDuration));
      this.notifyFiltersChanged();
    }

    function categoriesFilterChanged(this: Filters, name: Trace.Styles.EventCategory, checked: boolean): void {
      const categories = Trace.Styles.getCategoryStyles();
      categories[name].hidden = !checked;
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

interface EventTypes {
  [Events.FILTER_CHANGED]: void;
}
