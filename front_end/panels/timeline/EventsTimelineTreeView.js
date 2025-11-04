// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { Category, IsLong } from './TimelineFilters.js';
import { selectionIsEvent } from './TimelineSelection.js';
import { TimelineTreeView } from './TimelineTreeView.js';
import { TimelineUIUtils } from './TimelineUIUtils.js';
const UIStrings = {
    /**
     * @description Text for the start time of an activity
     */
    startTime: 'Start time',
    /**
     * @description Screen reader label for a select box that filters the Performance panel Event Log by duration.
     */
    durationFilter: 'Duration filter',
    /**
     * @description Text for everything
     */
    all: 'All',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/EventsTimelineTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class EventsTimelineTreeView extends TimelineTreeView {
    filtersControl;
    delegate;
    currentTree;
    constructor(delegate) {
        super();
        this.element.setAttribute('jslog', `${VisualLogging.pane('event-log').track({ resize: true })}`);
        this.filtersControl = new Filters();
        this.filtersControl.addEventListener("FilterChanged" /* Events.FILTER_CHANGED */, this.onFilterChanged, this);
        this.init();
        this.delegate = delegate;
        this.dataGrid.markColumnAsSortedBy('start-time', DataGrid.DataGrid.Order.Ascending);
        this.splitWidget.showBoth();
    }
    filters() {
        return [...super.filters(), ...this.filtersControl.filters()];
    }
    updateContents(selection) {
        super.updateContents(selection);
        if (selectionIsEvent(selection)) {
            this.selectEvent(selection.event, true);
        }
    }
    buildTree() {
        this.currentTree = this.buildTopDownTree(true, null);
        return this.currentTree;
    }
    onFilterChanged() {
        const lastSelectedNode = this.lastSelectedNode();
        const selectedEvent = lastSelectedNode?.event;
        this.refreshTree();
        if (selectedEvent) {
            this.selectEvent(selectedEvent, false);
        }
    }
    selectEvent(event, expand) {
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
    populateColumns(columns) {
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
    populateToolbar(toolbar) {
        super.populateToolbar(toolbar);
        this.filtersControl.populateToolbar(toolbar);
    }
    showDetailsForNode(node) {
        const parsedTrace = this.parsedTrace();
        if (!parsedTrace) {
            return false;
        }
        const traceEvent = node.event;
        if (!traceEvent) {
            return false;
        }
        void TimelineUIUtils.buildTraceEventDetails(parsedTrace, traceEvent, this.linkifier, false, null)
            .then(fragment => this.detailsView.element.appendChild(fragment));
        return true;
    }
    onHover(node) {
        this.delegate.highlightEvent(node?.event ?? null);
    }
}
export class Filters extends Common.ObjectWrapper.ObjectWrapper {
    categoryFilter;
    durationFilter;
    #filters;
    constructor() {
        super();
        this.categoryFilter = new Category();
        this.durationFilter = new IsLong();
        this.#filters = [this.categoryFilter, this.durationFilter];
    }
    filters() {
        return this.#filters;
    }
    populateToolbar(toolbar) {
        const durationFilterUI = new UI.Toolbar.ToolbarComboBox(durationFilterChanged.bind(this), i18nString(UIStrings.durationFilter), undefined, 'duration');
        for (const durationMs of Filters.durationFilterPresetsMs) {
            durationFilterUI.addOption(durationFilterUI.createOption(durationMs ? `≥ ${i18n.TimeUtilities.millisToString(durationMs)}` : i18nString(UIStrings.all), String(durationMs)));
        }
        toolbar.appendToolbarItem(durationFilterUI);
        const categoryFiltersUI = new Map();
        const categories = Trace.Styles.getCategoryStyles();
        for (const categoryName in categories) {
            const category = categories[categoryName];
            if (!category.visible) {
                continue;
            }
            const checkbox = new UI.Toolbar.ToolbarCheckbox(category.title, undefined, categoriesFilterChanged.bind(this, categoryName), categoryName);
            checkbox.setChecked(true);
            categoryFiltersUI.set(category.name, checkbox);
            toolbar.appendToolbarItem(checkbox);
        }
        function durationFilterChanged() {
            const duration = durationFilterUI.selectedOption().value;
            const minimumRecordDuration = parseInt(duration, 10);
            this.durationFilter.setMinimumRecordDuration(Trace.Types.Timing.Milli(minimumRecordDuration));
            this.notifyFiltersChanged();
        }
        function categoriesFilterChanged(name) {
            const categories = Trace.Styles.getCategoryStyles();
            const checkBox = categoryFiltersUI.get(name);
            categories[name].hidden = !checkBox?.checked();
            this.notifyFiltersChanged();
        }
    }
    notifyFiltersChanged() {
        this.dispatchEventToListeners("FilterChanged" /* Events.FILTER_CHANGED */);
    }
    static durationFilterPresetsMs = [0, 1, 15];
}
//# sourceMappingURL=EventsTimelineTreeView.js.map