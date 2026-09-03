// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/linkifier/linkifier.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import timelineSelectorStatsViewStyles from './timelineSelectorStatsView.css.js';
import * as Utils from './utils/utils.js';
const UIStrings = {
    /**
     * @description Accessible name for the selector stats data grid in the Performance panel.
     */
    selectorStats: 'Selector stats',
    /**
     * @description Column header for elapsed time in the selector stats data grid.
     */
    elapsed: 'Elapsed (ms)',
    /**
     * @description Tooltip explanation for the elapsed time column in the selector stats data grid.
     */
    elapsedExplanation: 'Elapsed time spent matching a selector against the DOM in milliseconds',
    /**
     * @description Column header for the percentage of slow-path non-matches in the selector stats data grid.
     */
    slowPathNonMatches: '% of slow-path non-matches',
    /**
     * @description Tooltip explanation for the slow-path non-matches column in the selector stats data grid.
     */
    slowPathNonMatchesExplanation: 'The percentage of non-matching nodes (match attempts − match count) that couldn’t be quickly ruled out by the bloom filter due to high selector complexity. Lower is better.',
    /**
     * @description Column header for match attempts in the selector stats data grid.
     */
    matchAttempts: 'Match attempts',
    /**
     * @description Tooltip explanation for the match attempts column in the selector stats data grid.
     */
    matchAttemptsExplanation: 'Count of nodes that the engine attempted to match against a style rule',
    /**
     * @description Column header for match count in the selector stats data grid.
     */
    matchCount: 'Match count',
    /**
     * @description Tooltip explanation for the match count column in the selector stats data grid.
     */
    matchCountExplanation: 'Count of nodes that matched a style rule',
    /**
     * @description Column header for the CSS selector in the selector stats data grid.
     */
    selector: 'Selector',
    /**
     * @description Tooltip explanation for the selector column in the selector stats data grid.
     */
    selectorExplanation: 'CSS selector text of a style rule',
    /**
     * @description Column header for the stylesheet link in the selector stats data grid.
     */
    styleSheetId: 'Style sheet',
    /**
     * @description Tooltip explanation for the style sheet column in the selector stats data grid.
     */
    styleSheetIdExplanation: 'Links to the selector rule definition in the style sheets. Note that a selector rule could be defined in multiple places in a style sheet or defined in multiple style sheets. Selector rules from browser user-agent style sheet or dynamic style sheets don’t have a link.',
    /**
     * @description Context menu item to copy the selector stats table to clipboard.
     */
    copyTable: 'Copy table',
    /**
     * @description Cell value displayed when a stylesheet source file cannot be linked.
     */
    unableToLink: 'Unable to link',
    /**
     * @description Tooltip displayed when a stylesheet source file cannot be linked via its ID.
     * @example {style-sheet-4} PH1
     */
    unableToLinkViaStyleSheetId: 'Unable to link via {PH1}',
    /**
     * @description Screen reader announcement when the selector stats table is copied to clipboard.
     */
    tableCopiedToClipboard: 'Table copied to clipboard',
    /**
     * @description Row description for the aggregated totals of all selectors in the selector stats data grid.
     */
    totalForAllSelectors: '(Totals for all selectors)',
    /**
     * @description Link text showing the line and column number of a selector rule in a stylesheet.
     * @example {256} PH1
     * @example {14} PH2
     */
    lineNumber: 'Line {PH1}:{PH2}',
    /**
     * @description Column header for invalidation count in the selector stats data grid.
     */
    invalidationCount: 'Invalidation count',
    /**
     * @description Tooltip explanation for the invalidation count column in the selector stats data grid.
     */
    invalidationCountExplanation: 'Aggregated count of invalidations on nodes and subsequently had style recalculated, all of which are matched by this selector. Note that a node can be invalidated multiple times and by multiple selectors.',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineSelectorStatsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const SelectorTimingsKey = Trace.Types.Events.SelectorTimingsKey;
const DEFAULT_VIEW = (input, _output, target) => {
    render(html `
      <devtools-data-grid striped name=${i18nString(UIStrings.selectorStats)}
          @contextmenu=${input.onContextMenu.bind(input)}>
        <table>
          <tr>
            <th id=${SelectorTimingsKey.Elapsed} weight="1" sortable hideable align="right">
              <span title=${i18nString(UIStrings.elapsedExplanation)}>
              ${i18nString(UIStrings.elapsed)}</span>
            </th>
            <th id=${SelectorTimingsKey.InvalidationCount} weight="1.5" sortable hideable>
              <span title=${i18nString(UIStrings.invalidationCountExplanation)}>${i18nString(UIStrings.invalidationCount)}</span>
            </th>
            <th id=${SelectorTimingsKey.MatchAttempts} weight="1" sortable hideable align="right">
              <span title=${i18nString(UIStrings.matchAttemptsExplanation)}>
              ${i18nString(UIStrings.matchAttempts)}</span>
            </th>
            <th id=${SelectorTimingsKey.MatchCount} weight="1" sortable hideable align="right">
              <span title=${i18nString(UIStrings.matchCountExplanation)}>
              ${i18nString(UIStrings.matchCount)}</span>
            </th>
            <th id=${SelectorTimingsKey.RejectPercentage} weight="1" sortable hideable align="right">
              <span title=${i18nString(UIStrings.slowPathNonMatchesExplanation)}>${i18nString(UIStrings.slowPathNonMatches)}</span>
            </th>
            <th id=${SelectorTimingsKey.Selector} weight="3" sortable hideable>
              <span title=${i18nString(UIStrings.selectorExplanation)}>
              ${i18nString(UIStrings.selector)}</span>
            </th>
            <th id=${SelectorTimingsKey.StyleSheetId} weight="1.5" sortable hideable>
              <span title=${i18nString(UIStrings.styleSheetIdExplanation)}>
              ${i18nString(UIStrings.styleSheetId)}</span>
            </th>
          </tr>
          ${input.timings.map(timing => {
        const nonMatches = timing[SelectorTimingsKey.MatchAttempts] - timing[SelectorTimingsKey.MatchCount];
        const slowPathNonMatches = (nonMatches ? 1.0 - timing[SelectorTimingsKey.FastRejectCount] / nonMatches : 0) * 100;
        const styleSheetId = timing[SelectorTimingsKey.StyleSheetId];
        const locations = timing.locations;
        const locationMessage = locations ? null :
            locations === null ? '' :
                i18nString(UIStrings.unableToLinkViaStyleSheetId, { PH1: styleSheetId });
        return html `<tr>
            <td data-value=${timing[SelectorTimingsKey.Elapsed]}>
              ${(timing[SelectorTimingsKey.Elapsed] / 1000.0).toFixed(3)}
            </td>
            <td title=${timing[SelectorTimingsKey.InvalidationCount]}>
              ${timing[SelectorTimingsKey.InvalidationCount]}
            </td>
            <td>${timing[SelectorTimingsKey.MatchAttempts]}</td>
            <td>${timing[SelectorTimingsKey.MatchCount]}</td>
            <td data-value=${slowPathNonMatches}>
              ${slowPathNonMatches.toFixed(1)}
            </td>
            <td title=${timing[SelectorTimingsKey.Selector]}>
             ${timing[SelectorTimingsKey.Selector]}
            </td>
            <td data-value=${styleSheetId}>${locations ? html `${locations.map((location, itemIndex) => html `
                <devtools-linkifier .data=${location}></devtools-linkifier
                >${itemIndex !== locations.length - 1 ? ',' : ''}`)}` :
            locationMessage}
            </td>
          </tr>`;
    })}
        </table>
      </devtools-data-grid>`, target, { container: { attributes: { jslog: `${VisualLogging.pane('selector-stats').track({ resize: true })}` } } });
};
export class TimelineSelectorStatsView extends UI.Widget.VBox {
    #selectorLocations;
    #parsedTrace = null;
    /**
     * We store the last event (or array of events) that we renderered. We do
     * this because as the user zooms around the panel this view is updated,
     * however if the set of events that are populating the view is the same as it
     * was the last time, we can bail without doing any re-rendering work.
     * If the user views a single event, this will be set to that single event, but if they are viewing a range of events, this will be set to an array.
     * If it's null, that means we have not rendered yet.
     */
    #lastStatsSourceEventOrEvents = null;
    #view;
    #timings = [];
    constructor(parsedTrace, view = DEFAULT_VIEW) {
        super();
        this.registerRequiredCSS(timelineSelectorStatsViewStyles);
        this.#view = view;
        this.#selectorLocations = new Map();
        this.#parsedTrace = parsedTrace;
        this.performUpdate();
    }
    #onContextMenu(e) {
        const { menu } = e.detail;
        menu.defaultSection().appendItem(i18nString(UIStrings.copyTable), () => {
            const tableData = [];
            const columnName = [
                i18nString(UIStrings.elapsed),
                i18nString(UIStrings.matchAttempts),
                i18nString(UIStrings.matchCount),
                i18nString(UIStrings.slowPathNonMatches),
                i18nString(UIStrings.selector),
                i18nString(UIStrings.styleSheetId),
            ];
            tableData.push(columnName.join('\t'));
            for (const timing of this.#timings) {
                const nonMatches = timing[SelectorTimingsKey.MatchAttempts] - timing[SelectorTimingsKey.MatchCount];
                const slowPathNonMatches = (nonMatches ? 1.0 - timing[SelectorTimingsKey.FastRejectCount] / nonMatches : 0) * 100;
                const styleSheetId = timing[SelectorTimingsKey.StyleSheetId];
                let linkData = '';
                const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
                const cssModel = target?.model(SDK.CSSModel.CSSModel);
                if (cssModel) {
                    const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
                    if (styleSheetHeader) {
                        linkData = styleSheetHeader.resourceURL().toString();
                    }
                }
                if (!linkData) {
                    linkData = i18nString(UIStrings.unableToLink);
                }
                tableData.push([
                    timing[SelectorTimingsKey.Elapsed] / 1000.0,
                    timing[SelectorTimingsKey.MatchAttempts],
                    timing[SelectorTimingsKey.MatchCount],
                    slowPathNonMatches,
                    timing[SelectorTimingsKey.Selector],
                    linkData,
                ].join('\t'));
            }
            const data = tableData.join('\n');
            UI.UIUtils.copyTextToClipboard(data, i18nString(UIStrings.tableCopiedToClipboard));
        });
    }
    performUpdate() {
        const viewInput = {
            timings: this.#timings,
            onContextMenu: (event) => {
                this.#onContextMenu(event);
            },
        };
        const viewOutput = {};
        this.#view(viewInput, viewOutput, this.contentElement);
    }
    getDescendentNodeCount(node) {
        if (!node) {
            return 0;
        }
        // number of descendent nodes, including self
        let numberOfDescendentNode = 1;
        const childNodes = node.children();
        if (childNodes) {
            for (const childNode of childNodes) {
                numberOfDescendentNode += this.getDescendentNodeCount(childNode);
            }
        }
        return numberOfDescendentNode;
    }
    async updateInvalidationCount(events) {
        if (!this.#parsedTrace) {
            return;
        }
        const invalidatedNodes = this.#parsedTrace.data.SelectorStats.invalidatedNodeList;
        const invalidatedNodeMap = new Map();
        const frameIdBackendNodeIdsMap = new Map();
        for (const { frame, backendNodeId } of invalidatedNodes) {
            if (!frameIdBackendNodeIdsMap.has(frame)) {
                frameIdBackendNodeIdsMap.set(frame, new Set());
            }
            frameIdBackendNodeIdsMap.get(frame)?.add(backendNodeId);
        }
        const invalidatedNodeIdMap = new Map();
        for (const [frameId, backendNodeIds] of frameIdBackendNodeIdsMap) {
            const backendNodeIdMap = await Utils.EntryNodes.domNodesForBackendIds(frameId, backendNodeIds);
            invalidatedNodeIdMap.set(frameId, backendNodeIdMap);
        }
        for (const invalidatedNode of invalidatedNodes) {
            const invalidatedNodeDomNode = invalidatedNodeIdMap.get(invalidatedNode.frame)?.get(invalidatedNode.backendNodeId) ?? null;
            // aggregate invalidated nodes per (Selector + Recalc timestamp + Frame)
            for (const selector of invalidatedNode.selectorList) {
                const key = [
                    selector.selector,
                    selector.styleSheetId,
                    invalidatedNode.frame,
                    invalidatedNode.lastRecalcStyleEventTs,
                ].join('-');
                if (invalidatedNodeMap.has(key)) {
                    const nodes = invalidatedNodeMap.get(key);
                    nodes?.nodeList.push(invalidatedNodeDomNode);
                }
                else {
                    invalidatedNodeMap.set(key, { subtree: invalidatedNode.subtree, nodeList: [invalidatedNodeDomNode] });
                }
            }
        }
        for (const event of events) {
            const selectorStats = event ? this.#parsedTrace.data.SelectorStats.dataForRecalcStyleEvent.get(event) : undefined;
            if (!selectorStats) {
                continue;
            }
            const frameId = event.args.beginData?.frame;
            for (const timing of selectorStats.timings) {
                timing.invalidation_count = 0;
                const key = [timing.selector, timing.style_sheet_id, frameId, event.ts].join('-');
                const nodes = invalidatedNodeMap.get(key);
                if (nodes === undefined) {
                    continue;
                }
                for (const node of nodes.nodeList) {
                    if (nodes.subtree) {
                        // TODO: this count is live and might have changed since the trace event.
                        timing.invalidation_count += this.getDescendentNodeCount(node);
                    }
                    else {
                        timing.invalidation_count += 1;
                    }
                }
            }
        }
    }
    async aggregateEvents(events) {
        if (!this.#parsedTrace) {
            return;
        }
        const timings = [];
        const selectorMap = new Map();
        const sums = {
            [SelectorTimingsKey.Elapsed]: 0,
            [SelectorTimingsKey.MatchAttempts]: 0,
            [SelectorTimingsKey.MatchCount]: 0,
            [SelectorTimingsKey.FastRejectCount]: 0,
            [SelectorTimingsKey.InvalidationCount]: 0,
        };
        // Now we want to check if the set of events we have been given matches the
        // set of events we last rendered. We can't just compare the arrays because
        // they will be different events, so instead for each event in the new
        // array we see if it has a match in the old set of events at the same
        // index.
        if (Array.isArray(this.#lastStatsSourceEventOrEvents)) {
            if (this.#lastStatsSourceEventOrEvents.length === events.length && events.every((event, index) => {
                // This is true due to the isArray check, but without this cast TS
                // would want us to repeat the isArray() check inside this callback,
                // but we want to avoid that extra work.
                const previousEvents = this.#lastStatsSourceEventOrEvents;
                return event === previousEvents[index];
            })) {
                return;
            }
        }
        this.#lastStatsSourceEventOrEvents = events;
        await this.updateInvalidationCount(events);
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const selectorStats = event ? this.#parsedTrace.data.SelectorStats.dataForRecalcStyleEvent.get(event) : undefined;
            if (!selectorStats) {
                continue;
            }
            const data = selectorStats.timings;
            for (const timing of data) {
                const key = timing[SelectorTimingsKey.Selector] + '_' + timing[SelectorTimingsKey.StyleSheetId];
                const findTiming = selectorMap.get(key);
                if (findTiming !== undefined) {
                    findTiming[SelectorTimingsKey.Elapsed] += timing[SelectorTimingsKey.Elapsed];
                    findTiming[SelectorTimingsKey.FastRejectCount] += timing[SelectorTimingsKey.FastRejectCount];
                    findTiming[SelectorTimingsKey.MatchAttempts] += timing[SelectorTimingsKey.MatchAttempts];
                    findTiming[SelectorTimingsKey.MatchCount] += timing[SelectorTimingsKey.MatchCount];
                    findTiming[SelectorTimingsKey.InvalidationCount] += timing[SelectorTimingsKey.InvalidationCount];
                }
                else {
                    selectorMap.set(key, structuredClone(timing));
                }
                // Keep track of the total times for a sum row.
                sums[SelectorTimingsKey.Elapsed] += timing[SelectorTimingsKey.Elapsed];
                sums[SelectorTimingsKey.MatchAttempts] += timing[SelectorTimingsKey.MatchAttempts];
                sums[SelectorTimingsKey.MatchCount] += timing[SelectorTimingsKey.MatchCount];
                sums[SelectorTimingsKey.FastRejectCount] += timing[SelectorTimingsKey.FastRejectCount];
                sums[SelectorTimingsKey.InvalidationCount] += timing[SelectorTimingsKey.InvalidationCount];
            }
        }
        if (selectorMap.size > 0) {
            selectorMap.forEach(timing => {
                timings.push(timing);
            });
            selectorMap.clear();
        }
        else {
            this.#timings = [];
            return;
        }
        // Add the sum row.
        timings.unshift({
            [SelectorTimingsKey.Elapsed]: sums[SelectorTimingsKey.Elapsed],
            [SelectorTimingsKey.FastRejectCount]: sums[SelectorTimingsKey.FastRejectCount],
            [SelectorTimingsKey.MatchAttempts]: sums[SelectorTimingsKey.MatchAttempts],
            [SelectorTimingsKey.MatchCount]: sums[SelectorTimingsKey.MatchCount],
            [SelectorTimingsKey.Selector]: i18nString(UIStrings.totalForAllSelectors),
            [SelectorTimingsKey.StyleSheetId]: 'n/a',
            [SelectorTimingsKey.InvalidationCount]: sums[SelectorTimingsKey.InvalidationCount],
        });
        this.#timings = await this.processSelectorTimings(timings);
    }
    setAggregatedEvents(events) {
        if (!this.#parsedTrace) {
            return;
        }
        void this.aggregateEvents(events).then(() => {
            this.requestUpdate();
        });
    }
    async processSelectorTimings(timings) {
        async function toSourceFileLocation(cssModel, styleSheetId, selectorText, selectorLocations) {
            if (!cssModel) {
                return undefined;
            }
            const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
            if (!styleSheetHeader?.resourceURL()) {
                return undefined;
            }
            // get the locations from cache if available
            const key = JSON.stringify({ selectorText, styleSheetId });
            let ranges = selectorLocations.get(key);
            if (!ranges) {
                const result = await cssModel.agent.invoke_getLocationForSelector({ styleSheetId, selectorText });
                if (result.getError() || !result.ranges) {
                    return undefined;
                }
                ranges = result.ranges;
                selectorLocations.set(key, ranges);
            }
            const linkData = ranges.map(range => {
                return {
                    url: styleSheetHeader.resourceURL(),
                    lineNumber: range.startLine,
                    columnNumber: range.startColumn,
                    linkText: i18nString(UIStrings.lineNumber, { PH1: range.startLine + 1, PH2: range.startColumn + 1 }),
                    title: `${styleSheetHeader.id} line ${range.startLine + 1}:${range.startColumn + 1}`,
                };
            });
            return linkData;
        }
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const cssModel = target?.model(SDK.CSSModel.CSSModel);
        if (!cssModel) {
            return [];
        }
        return await Promise.all(timings.sort((a, b) => b[SelectorTimingsKey.Elapsed] - a[SelectorTimingsKey.Elapsed]).map(async (x) => {
            const styleSheetId = x[SelectorTimingsKey.StyleSheetId];
            const selectorText = x[SelectorTimingsKey.Selector].trim();
            const locations = styleSheetId === 'n/a' ?
                null :
                await toSourceFileLocation(cssModel, styleSheetId, selectorText, this.#selectorLocations);
            return { ...x, locations };
        }));
    }
}
//# sourceMappingURL=TimelineSelectorStatsView.js.map