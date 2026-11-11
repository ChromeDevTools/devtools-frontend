// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as TimelineComponents from './components/components.js';
import { ModificationsManager } from './ModificationsManager.js';
import { TimelineEventOverviewCPUActivity, TimelineEventOverviewMemory, TimelineEventOverviewNetwork, TimelineEventOverviewResponsiveness, TimelineFilmStripOverview, } from './TimelineEventOverview.js';
import miniMapStyles from './timelineMiniMap.css.js';
import { TimelineUIUtils } from './TimelineUIUtils.js';
const { widget, widgetRef } = UI.Widget;
class MiniMapOverviewPane extends PerfUI.TimelineOverviewPane.TimelineOverviewPane {
    #bounds;
    #windowTimes;
    #parsedTrace = null;
    #showScreenshots = false;
    #showMemory = false;
    #highlightedBounds = null;
    #appliedBounds;
    #appliedWindowTimes;
    #appliedParsedTrace = null;
    #appliedShowScreenshots = false;
    #appliedShowMemory = false;
    #appliedHighlightedBounds = null;
    #controls = [];
    constructor(element) {
        super(element);
        this.enableCreateBreadcrumbsButton();
    }
    getControlsForTrace(parsedTrace) {
        return parsedTrace && this.#appliedParsedTrace === parsedTrace ? this.#controls : [];
    }
    set bounds(bounds) {
        if (this.#bounds === bounds) {
            return;
        }
        this.#bounds = bounds;
        this.requestUpdate();
    }
    set windowTimes(windowTimes) {
        if (this.#windowTimes === windowTimes) {
            return;
        }
        this.#windowTimes = windowTimes;
        this.requestUpdate();
    }
    set parsedTrace(parsedTrace) {
        if (this.#parsedTrace === parsedTrace) {
            return;
        }
        this.#parsedTrace = parsedTrace;
        this.requestUpdate();
    }
    set showScreenshots(showScreenshots) {
        if (this.#showScreenshots === showScreenshots) {
            return;
        }
        this.#showScreenshots = showScreenshots;
        this.requestUpdate();
    }
    set showMemory(showMemory) {
        if (this.#showMemory === showMemory) {
            return;
        }
        this.#showMemory = showMemory;
        this.requestUpdate();
    }
    set highlightedBounds(highlightedBounds) {
        if (this.#highlightedBounds === highlightedBounds) {
            return;
        }
        this.#highlightedBounds = highlightedBounds;
        this.requestUpdate();
    }
    #applyTraceMarkers(parsedTrace) {
        const markers = new Map();
        const { Meta } = parsedTrace.data;
        const navStartEvents = Meta.mainFrameNavigations;
        const minTimeInMilliseconds = Trace.Helpers.Timing.microToMilli(Meta.traceBounds.min);
        for (const event of navStartEvents) {
            const { startTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
            markers.set(startTime, TimelineUIUtils.createEventDivider(event, minTimeInMilliseconds));
        }
        this.setMarkers(markers);
        this.setNavStartTimes(navStartEvents);
    }
    performUpdate() {
        const traceChanged = this.#parsedTrace !== this.#appliedParsedTrace;
        const settingsChanged = this.#showScreenshots !== this.#appliedShowScreenshots || this.#showMemory !== this.#appliedShowMemory;
        if ((traceChanged || settingsChanged) && !this.#parsedTrace) {
            this.#appliedParsedTrace = null;
            this.#appliedShowScreenshots = this.#showScreenshots;
            this.#appliedShowMemory = this.#showMemory;
            this.#controls = [];
            this.setMarkers(new Map());
            this.setNavStartTimes([]);
            this.setOverviewControls([]);
            this.showingScreenshots = false;
        }
        const boundsCleared = Boolean(this.#appliedBounds && !this.#bounds);
        if (boundsCleared) {
            super.reset();
            this.#appliedWindowTimes = undefined;
            if (this.#appliedHighlightedBounds) {
                this.clearBoundsHighlight();
                this.#appliedHighlightedBounds = null;
            }
        }
        if (this.#bounds && this.#bounds !== this.#appliedBounds) {
            this.setBounds(this.#bounds.min, this.#bounds.max);
        }
        this.#appliedBounds = this.#bounds;
        if (this.#windowTimes !== this.#appliedWindowTimes) {
            if (this.#windowTimes) {
                this.setWindowTimes(this.#windowTimes.min, this.#windowTimes.max);
            }
            else {
                this.setWindowTimes(Trace.Types.Timing.Milli(0), Trace.Types.Timing.Milli(Infinity));
            }
            this.#appliedWindowTimes = this.#windowTimes;
        }
        if (this.#parsedTrace && (traceChanged || settingsChanged)) {
            this.#appliedParsedTrace = this.#parsedTrace;
            this.#appliedShowScreenshots = this.#showScreenshots;
            this.#appliedShowMemory = this.#showMemory;
            if (traceChanged || boundsCleared) {
                this.#applyTraceMarkers(this.#parsedTrace);
            }
            const controls = [
                new TimelineEventOverviewResponsiveness(this.#parsedTrace),
                new TimelineEventOverviewCPUActivity(this.#parsedTrace),
                new TimelineEventOverviewNetwork(this.#parsedTrace),
            ];
            if (this.#showScreenshots) {
                const filmStrip = Trace.Extras.FilmStrip.fromHandlerData(this.#parsedTrace.data);
                if (filmStrip.frames.length) {
                    controls.push(new TimelineFilmStripOverview(filmStrip));
                }
            }
            if (this.#showMemory) {
                controls.push(new TimelineEventOverviewMemory(this.#parsedTrace));
            }
            this.#controls = controls;
            this.setOverviewControls(controls);
            this.showingScreenshots = this.#showScreenshots;
        }
        else if (boundsCleared && this.#parsedTrace) {
            this.#applyTraceMarkers(this.#parsedTrace);
        }
        if (this.#highlightedBounds !== this.#appliedHighlightedBounds) {
            if (this.#highlightedBounds) {
                this.highlightBounds(this.#highlightedBounds.bounds, this.#highlightedBounds.withBracket);
            }
            else if (this.#appliedHighlightedBounds) {
                this.clearBoundsHighlight();
            }
            this.#appliedHighlightedBounds = this.#highlightedBounds;
        }
    }
}
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
    <style>${miniMapStyles}</style>
    ${widget(TimelineComponents.BreadcrumbsUI.BreadcrumbsUI, {
        initialBreadcrumb: input.initialBreadcrumb,
        activeBreadcrumb: input.activeBreadcrumb,
        onBreadcrumbActivated: input.onBreadcrumbActivated,
    })}
    <devtools-widget
      ${widget(MiniMapOverviewPane, {
        bounds: input.bounds,
        windowTimes: input.windowTimes,
        parsedTrace: input.data?.parsedTrace ?? null,
        showScreenshots: Boolean(input.data?.settings.showScreenshots),
        showMemory: Boolean(input.data?.settings.showMemory),
        highlightedBounds: input.highlightedBounds,
    })}
      ${widgetRef(MiniMapOverviewPane, pane => {
        output.getControls = parsedTrace => pane.getControlsForTrace(parsedTrace);
    })}
      @OverviewPaneWindowChanged=${(event) => {
        input.onOverviewWindowChanged(event.detail);
    }}
      @OverviewPaneBreadcrumbAdded=${(event) => {
        input.onOverviewBreadcrumbAdded(event.detail);
    }}
      @OverviewPaneMouseMove=${(event) => {
        input.onOverviewMouseMove(event.detail);
    }}
      @OverviewPaneMouseLeave=${() => {
        input.onOverviewMouseLeave();
    }}>
    </devtools-widget>
  `, target, {
        container: {
            classes: ['timeline-minimap', ...(input.data ? [] : ['no-trace-active'])],
        },
    });
    // clang-format on
};
/**
 * This component wraps the generic PerfUI Overview component and configures it
 * specifically for the Performance Panel, including injecting the CSS we use
 * to customize how the components render within the Performance Panel.
 *
 * It is also responsible for listening to events from the OverviewPane to
 * update the visible trace window, and when this happens it will update the
 * TraceBounds service with the new values.
 */
const TimelineMiniMapBase = Common.ObjectWrapper.eventMixin(UI.Widget.VBox);
export class TimelineMiniMap extends TimelineMiniMapBase {
    breadcrumbs = null;
    #initialBreadcrumb = null;
    #activeBreadcrumb = null;
    #data = null;
    #windowTimes;
    #bounds;
    #highlightedBounds = null;
    #view;
    #viewOutput = {};
    #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
    #onBreadcrumbActivatedBound = (breadcrumb, childBreadcrumbsRemoved) => {
        this.#activateBreadcrumb(breadcrumb, { removeChildBreadcrumbs: childBreadcrumbsRemoved, updateVisibleWindow: true });
    };
    #onOverviewWindowChangedBound = (event) => {
        this.#onOverviewPanelWindowChanged(event);
    };
    #onOverviewBreadcrumbAddedBound = (event) => {
        this.addBreadcrumb(event);
    };
    #onOverviewMouseMoveBound = (event) => {
        this.dispatchEventToListeners("OverviewPaneMouseMove" /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_MOVE */, event);
    };
    #onOverviewMouseLeaveBound = () => {
        this.dispatchEventToListeners("OverviewPaneMouseLeave" /* PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_LEAVE */);
    };
    constructor(view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        TraceBounds.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
        // Set the initial bounds for the overview. Otherwise if we mount & there
        // is not an immediate RESET event, then we don't render correctly.
        const state = TraceBounds.TraceBounds.BoundsManager.instance().state();
        if (state) {
            const { timelineTraceWindow, minimapTraceBounds } = state.milli;
            this.#windowTimes = { min: timelineTraceWindow.min, max: timelineTraceWindow.max };
            this.#bounds = { min: minimapTraceBounds.min, max: minimapTraceBounds.max };
        }
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            data: this.#data,
            initialBreadcrumb: this.#initialBreadcrumb,
            activeBreadcrumb: this.#activeBreadcrumb,
            onBreadcrumbActivated: this.#onBreadcrumbActivatedBound,
            windowTimes: this.#windowTimes,
            bounds: this.#bounds,
            highlightedBounds: this.#highlightedBounds,
            onOverviewWindowChanged: this.#onOverviewWindowChangedBound,
            onOverviewBreadcrumbAdded: this.#onOverviewBreadcrumbAddedBound,
            onOverviewMouseMove: this.#onOverviewMouseMoveBound,
            onOverviewMouseLeave: this.#onOverviewMouseLeaveBound,
        }, this.#viewOutput, this.contentElement);
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
        const left = (event.startTime > 0) ? event.startTime : traceBoundsState.milli.minimapTraceBounds.min;
        const right = Number.isFinite(event.endTime) ? event.endTime : traceBoundsState.milli.minimapTraceBounds.max;
        TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(Trace.Helpers.Timing.traceWindowFromMilliSeconds(Trace.Types.Timing.Milli(left), Trace.Types.Timing.Milli(right)), {
            shouldAnimate: false,
        });
    }
    #onTraceBoundsChange(event) {
        if (event.updateType === 'RESET' || event.updateType === 'VISIBLE_WINDOW') {
            this.#windowTimes = {
                min: event.state.milli.timelineTraceWindow.min,
                max: event.state.milli.timelineTraceWindow.max,
            };
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
            this.#bounds = {
                min: event.state.milli.minimapTraceBounds.min,
                max: event.state.milli.minimapTraceBounds.max,
            };
        }
        this.requestUpdate();
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
        this.#initialBreadcrumb = this.breadcrumbs.initialBreadcrumb;
        this.#activeBreadcrumb = addedBreadcrumb;
        this.requestUpdate();
    }
    highlightBounds(bounds, withBracket = false) {
        this.#highlightedBounds = { bounds, withBracket };
        this.requestUpdate();
    }
    clearBoundsHighlight() {
        if (this.#highlightedBounds === null) {
            return;
        }
        this.#highlightedBounds = null;
        this.requestUpdate();
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
        // Only the initial breadcrumb is passed in because breadcrumbs are stored in a linked list and breadcrumbsUI component iterates through them
        this.#initialBreadcrumb = this.breadcrumbs.initialBreadcrumb;
        this.#activeBreadcrumb = breadcrumb;
        this.requestUpdate();
    }
    reset() {
        this.#data = null;
        this.breadcrumbs = null;
        this.#initialBreadcrumb = null;
        this.#activeBreadcrumb = null;
        this.#windowTimes = undefined;
        this.#bounds = undefined;
        this.#highlightedBounds = null;
        this.requestUpdate();
    }
    getControls() {
        return this.#viewOutput.getControls?.(this.#data?.parsedTrace ?? null) ?? [];
    }
    setData(data) {
        if (data === null) {
            if (this.#data === null && this.breadcrumbs === null) {
                return;
            }
            this.#data = null;
            this.breadcrumbs = null;
            this.#initialBreadcrumb = null;
            this.#activeBreadcrumb = null;
            this.requestUpdate();
            return;
        }
        if (this.#data?.parsedTrace === data.parsedTrace) {
            return;
        }
        this.#data = data;
        this.#setInitialBreadcrumb();
        this.requestUpdate();
    }
    #setInitialBreadcrumb() {
        // Set the initial breadcrumb that ModificationsManager created from the initial full window
        // or loaded from the file.
        this.breadcrumbs = ModificationsManager.activeManager()?.getTimelineBreadcrumbs() ?? null;
        if (!this.breadcrumbs) {
            this.#initialBreadcrumb = null;
            this.#activeBreadcrumb = null;
            return;
        }
        let lastBreadcrumb = this.breadcrumbs.initialBreadcrumb;
        while (lastBreadcrumb.child !== null) {
            lastBreadcrumb = lastBreadcrumb.child;
        }
        this.#initialBreadcrumb = this.breadcrumbs.initialBreadcrumb;
        this.#activeBreadcrumb = lastBreadcrumb;
    }
}
//# sourceMappingURL=TimelineMiniMap.js.map