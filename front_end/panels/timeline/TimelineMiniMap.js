// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as TimelineComponents from './components/components.js';
import { ModificationsManager } from './ModificationsManager.js';
import { TimelineEventOverviewCPUActivity, TimelineEventOverviewMemory, TimelineEventOverviewNetwork, TimelineEventOverviewResponsiveness, TimelineFilmStripOverview, } from './TimelineEventOverview.js';
import miniMapStyles from './timelineMiniMap.css.js';
import { TimelineUIUtils } from './TimelineUIUtils.js';
/**
 * This component wraps the generic PerfUI Overview component and configures it
 * specifically for the Performance Panel, including injecting the CSS we use
 * to customize how the components render within the Performance Panel.
 *
 * It is also responsible for listening to events from the OverviewPane to
 * update the visible trace window, and when this happens it will update the
 * TraceBounds service with the new values.
 */
export class TimelineMiniMap extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    #overviewComponent = new PerfUI.TimelineOverviewPane.TimelineOverviewPane('timeline');
    #controls = [];
    breadcrumbs = null;
    #breadcrumbsUI;
    #data = null;
    #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
    constructor() {
        super();
        this.registerRequiredCSS(miniMapStyles);
        this.element.classList.add('timeline-minimap', 'no-trace-active');
        this.#breadcrumbsUI = new TimelineComponents.BreadcrumbsUI.BreadcrumbsUI();
        this.element.prepend(this.#breadcrumbsUI);
        this.#overviewComponent.show(this.element);
        this.#overviewComponent.addEventListener("OverviewPaneWindowChanged" /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_WINDOW_CHANGED */, event => {
            this.#onOverviewPanelWindowChanged(event);
        });
        this.#overviewComponent.addEventListener("OverviewPaneBreadcrumbAdded" /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_BREADCRUMB_ADDED */, event => {
            this.addBreadcrumb(event.data);
        });
        // We want to add/remove an overlay for these two events, and the overlay system is controlled by
        // `TimelineFlameChartView`, so we need to dispatch them up to the `TimelinePanel` level to call
        // `TimelineFlameChartView` -> `addOverlay()/removeOverlay()`.
        this.#overviewComponent.addEventListener("OverviewPaneMouseMove" /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_MOVE */, event => {
            this.dispatchEventToListeners("OverviewPaneMouseMove" /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_MOVE */, event.data);
        });
        this.#overviewComponent.addEventListener("OverviewPaneMouseLeave" /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_LEAVE */, () => {
            this.dispatchEventToListeners("OverviewPaneMouseLeave" /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_LEAVE */);
        });
        this.#breadcrumbsUI.addEventListener(TimelineComponents.BreadcrumbsUI.BreadcrumbActivatedEvent.eventName, event => {
            const { breadcrumb, childBreadcrumbsRemoved } = event;
            this.#activateBreadcrumb(breadcrumb, { removeChildBreadcrumbs: Boolean(childBreadcrumbsRemoved), updateVisibleWindow: true });
        });
        this.#overviewComponent.enableCreateBreadcrumbsButton();
        TraceBounds.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
        // Set the initial bounds for the overview. Otherwise if we mount & there
        // is not an immediate RESET event, then we don't render correctly.
        const state = TraceBounds.TraceBounds.BoundsManager.instance().state();
        if (state) {
            const { timelineTraceWindow, minimapTraceBounds } = state.milli;
            this.#overviewComponent.setWindowTimes(timelineTraceWindow.min, timelineTraceWindow.max);
            this.#overviewComponent.setBounds(minimapTraceBounds.min, minimapTraceBounds.max);
        }
    }
    #onOverviewPanelWindowChanged(event) {
        const parsedTrace = this.#data?.parsedTrace;
        if (!parsedTrace) {
            return;
        }
        const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
        if (!traceBoundsState) {
            return;
        }
        const left = (event.data.startTime > 0) ? event.data.startTime : traceBoundsState.milli.entireTraceBounds.min;
        const right = Number.isFinite(event.data.endTime) ? event.data.endTime : traceBoundsState.milli.entireTraceBounds.max;
        TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(Trace.Helpers.Timing.traceWindowFromMilliSeconds(Trace.Types.Timing.Milli(left), Trace.Types.Timing.Milli(right)), {
            shouldAnimate: true,
        });
    }
    #onTraceBoundsChange(event) {
        if (event.updateType === 'RESET' || event.updateType === 'VISIBLE_WINDOW') {
            this.#overviewComponent.setWindowTimes(event.state.milli.timelineTraceWindow.min, event.state.milli.timelineTraceWindow.max);
            // If the visible window has changed because we are revealing a certain
            // time period to the user, we need to ensure that this new time
            // period fits within the current minimap bounds. If it doesn't, we
            // do some work to update the minimap bounds. Note that this only
            // applies if the user has created breadcrumbs, which scope the
            // minimap. If they have not, the entire trace is the minimap, and
            // therefore there is no work to be done.
            const newWindowFitsBounds = Trace.Helpers.Timing.windowFitsInsideBounds({
                window: event.state.micro.timelineTraceWindow,
                bounds: event.state.micro.minimapTraceBounds,
            });
            if (!newWindowFitsBounds) {
                this.#updateMiniMapBoundsToFitNewWindow(event.state.micro.timelineTraceWindow);
            }
        }
        if (event.updateType === 'RESET' || event.updateType === 'MINIMAP_BOUNDS') {
            this.#overviewComponent.setBounds(event.state.milli.minimapTraceBounds.min, event.state.milli.minimapTraceBounds.max);
        }
    }
    #updateMiniMapBoundsToFitNewWindow(newWindow) {
        if (!this.breadcrumbs) {
            return;
        }
        // Find the smallest breadcrumb that fits this window.
        // Breadcrumbs are a linked list from largest to smallest so we have to
        // walk through until we find one that does not fit, and pick the last
        // before that.
        let currentBreadcrumb = this.breadcrumbs.initialBreadcrumb;
        let lastBreadcrumbThatFits = this.breadcrumbs.initialBreadcrumb;
        while (currentBreadcrumb) {
            const fits = Trace.Helpers.Timing.windowFitsInsideBounds({
                window: newWindow,
                bounds: currentBreadcrumb.window,
            });
            if (fits) {
                lastBreadcrumbThatFits = currentBreadcrumb;
            }
            else {
                // If this breadcrumb does not fit, none of its children (which are all
                // smaller by definition) will, so we can exit the loop early.
                break;
            }
            currentBreadcrumb = currentBreadcrumb.child;
        }
        // Activate the breadcrumb that fits the visible window. We do not update
        // the visible window here as we are doing this work as a reaction to
        // something else triggering a change in the window visibility.
        this.#activateBreadcrumb(lastBreadcrumbThatFits, { removeChildBreadcrumbs: false, updateVisibleWindow: false });
    }
    addBreadcrumb({ startTime, endTime }) {
        if (!this.breadcrumbs) {
            console.warn('ModificationsManager has not been created, therefore Breadcrumbs can not be added');
            return;
        }
        const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
        if (!traceBoundsState) {
            return;
        }
        const bounds = traceBoundsState.milli.minimapTraceBounds;
        // The OverviewPane can emit 0 and Infinity as numbers for the range; in
        // this case we change them to be the min and max values of the minimap
        // bounds.
        const breadcrumbTimes = {
            startTime: Trace.Types.Timing.Milli(Math.max(startTime, bounds.min)),
            endTime: Trace.Types.Timing.Milli(Math.min(endTime, bounds.max)),
        };
        const newVisibleTraceWindow = Trace.Helpers.Timing.traceWindowFromMilliSeconds(breadcrumbTimes.startTime, breadcrumbTimes.endTime);
        const addedBreadcrumb = this.breadcrumbs.add(newVisibleTraceWindow);
        this.#breadcrumbsUI.data = {
            initialBreadcrumb: this.breadcrumbs.initialBreadcrumb,
            activeBreadcrumb: addedBreadcrumb,
        };
    }
    highlightBounds(bounds, withBracket = false) {
        this.#overviewComponent.highlightBounds(bounds, withBracket);
    }
    clearBoundsHighlight() {
        this.#overviewComponent.clearBoundsHighlight();
    }
    /**
     * Activates a given breadcrumb.
     * @param options.removeChildBreadcrumbs if true, any child breadcrumbs will be removed.
     * @param options.updateVisibleWindow if true, the visible window will be updated to match the bounds of the breadcrumb
     */
    #activateBreadcrumb(breadcrumb, options) {
        if (!this.breadcrumbs) {
            return;
        }
        this.breadcrumbs.setActiveBreadcrumb(breadcrumb, options);
        // Only the initial breadcrumb is passed in because breadcrumbs are stored in a linked list and breadcrumbsUI component iterates through them
        this.#breadcrumbsUI.data = {
            initialBreadcrumb: this.breadcrumbs.initialBreadcrumb,
            activeBreadcrumb: breadcrumb,
        };
    }
    reset() {
        this.#data = null;
        this.#overviewComponent.reset();
    }
    #setMarkers(parsedTrace) {
        const markers = new Map();
        const { Meta } = parsedTrace.data;
        // Only add markers for navigation start times.
        const navStartEvents = Meta.mainFrameNavigations;
        const minTimeInMilliseconds = Trace.Helpers.Timing.microToMilli(Meta.traceBounds.min);
        for (const event of navStartEvents) {
            const { startTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
            markers.set(startTime, TimelineUIUtils.createEventDivider(event, minTimeInMilliseconds));
        }
        this.#overviewComponent.setMarkers(markers);
    }
    #setNavigationStartEvents(parsedTrace) {
        this.#overviewComponent.setNavStartTimes(parsedTrace.data.Meta.mainFrameNavigations);
    }
    getControls() {
        return this.#controls;
    }
    setData(data) {
        this.element.classList.toggle('no-trace-active', data === null);
        if (data === null) {
            this.#data = null;
            this.#controls = [];
            return;
        }
        if (this.#data?.parsedTrace === data.parsedTrace) {
            return;
        }
        this.#data = data;
        this.#controls = [];
        this.#setMarkers(data.parsedTrace);
        this.#setNavigationStartEvents(data.parsedTrace);
        this.#controls.push(new TimelineEventOverviewResponsiveness(data.parsedTrace));
        this.#controls.push(new TimelineEventOverviewCPUActivity(data.parsedTrace));
        this.#controls.push(new TimelineEventOverviewNetwork(data.parsedTrace));
        if (data.settings.showScreenshots) {
            const filmStrip = Trace.Extras.FilmStrip.fromHandlerData(data.parsedTrace.data);
            if (filmStrip.frames.length) {
                this.#controls.push(new TimelineFilmStripOverview(filmStrip));
            }
        }
        if (data.settings.showMemory) {
            this.#controls.push(new TimelineEventOverviewMemory(data.parsedTrace));
        }
        this.#overviewComponent.setOverviewControls(this.#controls);
        this.#overviewComponent.showingScreenshots = data.settings.showScreenshots;
        this.#setInitialBreadcrumb();
    }
    #setInitialBreadcrumb() {
        // Set the initial breadcrumb that ModificationsManager created from the initial full window
        // or loaded from the file.
        this.breadcrumbs = ModificationsManager.activeManager()?.getTimelineBreadcrumbs() ?? null;
        if (!this.breadcrumbs) {
            return;
        }
        let lastBreadcrumb = this.breadcrumbs.initialBreadcrumb;
        while (lastBreadcrumb.child !== null) {
            lastBreadcrumb = lastBreadcrumb.child;
        }
        this.#breadcrumbsUI.data = {
            initialBreadcrumb: this.breadcrumbs.initialBreadcrumb,
            activeBreadcrumb: lastBreadcrumb,
        };
    }
}
//# sourceMappingURL=TimelineMiniMap.js.map