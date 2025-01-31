// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/linkifier/linkifier.js';
import '../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';
import type * as Linkifier from '../../ui/components/linkifier/linkifier.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import timelineSelectorStatsViewStylesRaw from './timelineSelectorStatsView.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const timelineSelectorStatsViewStyles = new CSSStyleSheet();
timelineSelectorStatsViewStyles.replaceSync(timelineSelectorStatsViewStylesRaw.cssContent);

const {render, html} = Lit;

const UIStrings = {
  /**
   *@description Label for selector stats data table
   */
  selectorStats: 'Selector stats',
  /**
   *@description Column name and time unit for elapsed time spent computing a style rule
   */
  elapsed: 'Elapsed (ms)',
  /**
   *@description Column name and percentage of slow mach non-matches computing a style rule
   */
  rejectPercentage: '% of slow-path non-matches',
  /**
   *@description Tooltip description '% of slow-path non-matches'
   */
  rejectPercentageExplanation:
      'The percentage of non-matching nodes (Match Attempts - Match Count) that couldn\'t be quickly ruled out by the bloom filter due to high selector complexity. Lower is better.',
  /**
   *@description Column name for count of elements that the engine attempted to match against a style rule
   */
  matchAttempts: 'Match attempts',
  /**
   *@description Column name for count of elements that matched a style rule
   */
  matchCount: 'Match count',
  /**
   *@description Column name for a style rule's CSS selector text
   */
  selector: 'Selector',
  /**
   *@description Column name for a style rule's CSS selector text
   */
  styleSheetId: 'Style Sheet',
  /**
   *@description A context menu item in data grids to copy entire table to clipboard
   */
  copyTable: 'Copy table',
  /**
   *@description A cell value displayed in table when no source file can be traced via css style
   */
  unableToLink: 'Unable to link',
  /**
   *@description Tooltip for the cell that no source file can be traced via style sheet id
   *@example {style-sheet-4} PH1
   */
  unableToLinkViaStyleSheetId: 'Unable to link via {PH1}',
  /**
   *@description Text for announcing that the entire table was copied to clipboard
   */
  tableCopiedToClipboard: 'Table copied to clipboard',
  /**
   *@description Text shown as the "Selectelector" cell value for one row of the Selector Stats table, however this particular row is the totals. While normally the Selector cell is values like "div.container", the parenthesis can denote this description is not an actual selector, but a general row description.
   */
  totalForAllSelectors: '(Totals for all selectors)',

  /**
   *@description Text for showing the location of a selector in the style sheet
   *@example {256} PH1
   *@example {14} PH2
   */
  lineNumber: 'Line {PH1}:{PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineSelectorStatsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const SelectorTimingsKey = Trace.Types.Events.SelectorTimingsKey;

type SelectorTiming =
    Trace.Types.Events.SelectorTiming&{locations: Linkifier.Linkifier.LinkifierData[] | undefined | null};

interface ViewInput {
  timings: SelectorTiming[];
  onContextMenu: (event: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => void;
}
interface ViewOutput {}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export class TimelineSelectorStatsView extends UI.Widget.VBox {
  #selectorLocations: Map<string, Protocol.CSS.SourceRange[]>;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  /**
   * We store the last event (or array of events) that we renderered. We do
   * this because as the user zooms around the panel this view is updated,
   * however if the set of events that are populating the view is the same as it
   * was the last time, we can bail without doing any re-rendering work.
   * If the user views a single event, this will be set to that single event, but if they are viewing a range of events, this will be set to an array.
   * If it's null, that means we have not rendered yet.
   */
  #lastStatsSourceEventOrEvents: Trace.Types.Events.UpdateLayoutTree|Trace.Types.Events.UpdateLayoutTree[]|null = null;
  #view: View;
  #timings: SelectorTiming[] = [];

  constructor(parsedTrace: Trace.Handlers.Types.ParsedTrace|null, view: View = (input, output, target) => {
    render(
        html`
      <devtools-new-data-grid striped name=${i18nString(UIStrings.selectorStats)}
          @contextmenu=${input.onContextMenu.bind(input)}>
        <table>
          <tr>
            <th id=${SelectorTimingsKey.Elapsed} weight="1" sortable hideable align="right">
              ${i18nString(UIStrings.elapsed)}
            </th>
            <th id=${SelectorTimingsKey.MatchAttempts} weight="1" sortable hideable align="right">
              ${i18nString(UIStrings.matchAttempts)}
            </th>
            <th id=${SelectorTimingsKey.MatchCount} weight="1" sortable hideable align="right">
              ${i18nString(UIStrings.matchCount)}
            </th>
            <th id=${SelectorTimingsKey.RejectPercentage} weight="1" sortable hideable align="right">
              <span title=${i18nString(UIStrings.rejectPercentageExplanation)}>${
            i18nString(UIStrings.rejectPercentage)}</span>
            </th>
            <th id=${SelectorTimingsKey.Selector} weight="3" sortable hideable>
              ${i18nString(UIStrings.selector)}
            </th>
            <th id=${SelectorTimingsKey.StyleSheetId} weight="1.5" sortable hideable>
              ${i18nString(UIStrings.styleSheetId)}
            </th>
          </tr>
          ${input.timings.map(timing => {
          const nonMatches = timing[SelectorTimingsKey.MatchAttempts] - timing[SelectorTimingsKey.MatchCount];
          const rejectPercentage = (nonMatches ? timing[SelectorTimingsKey.FastRejectCount] / nonMatches : 1) * 100;
          const styleSheetId = timing[SelectorTimingsKey.StyleSheetId];
          const locations = timing.locations;
          const locationMessage = locations ? null :
              locations === null            ? '' :
                                              i18nString(UIStrings.unableToLinkViaStyleSheetId, {PH1: styleSheetId});
          return html`<tr>
            <td data-value=${timing[SelectorTimingsKey.Elapsed]}>
              ${(timing[SelectorTimingsKey.Elapsed] / 1000.0).toFixed(3)}
            </td>
            <td>${timing[SelectorTimingsKey.MatchAttempts]}</td>
            <td>${timing[SelectorTimingsKey.MatchCount]}</td>
            <td data-value=${rejectPercentage}>
              ${rejectPercentage.toFixed(1)}
            </td>
            <td title=${timing[SelectorTimingsKey.Selector]}>
             ${timing[SelectorTimingsKey.Selector]}
            </td>
            <td data-value=${styleSheetId}>${
              locations ? html`${locations.map((location, itemIndex) => html`
                <devtools-linkifier .data=${location}></devtools-linkifier
                >${itemIndex !== locations.length - 1 ? ',' : ''}`)}` :
                          locationMessage}
            </td>
          </tr>`;
        })}
        </table>
      </devtools-new-data-grid>`,
        target, {host: this});
  }) {
    super();

    this.#view = view;
    this.element.setAttribute('jslog', `${VisualLogging.pane('selector-stats').track({resize: true})}`);
    this.#selectorLocations = new Map<string, Protocol.CSS.SourceRange[]>();
    this.#parsedTrace = parsedTrace;

    this.performUpdate();
  }

  #onContextMenu(e: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>): void {
    const {menu} = e.detail;
    menu.defaultSection().appendItem(i18nString(UIStrings.copyTable), () => {
      const tableData = [];
      const columnName = [
        i18nString(UIStrings.elapsed), i18nString(UIStrings.matchAttempts), i18nString(UIStrings.matchCount),
        i18nString(UIStrings.rejectPercentage), i18nString(UIStrings.selector), i18nString(UIStrings.styleSheetId)
      ];
      tableData.push(columnName.join('\t'));
      for (const timing of this.#timings) {
        const nonMatches = timing[SelectorTimingsKey.MatchAttempts] - timing[SelectorTimingsKey.MatchCount];
        const rejectPercentage = (nonMatches ? timing[SelectorTimingsKey.FastRejectCount] / nonMatches : 1) * 100;
        const styleSheetId = timing[SelectorTimingsKey.StyleSheetId] as Protocol.CSS.StyleSheetId;
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
          rejectPercentage,
          timing[SelectorTimingsKey.Selector],
          linkData,
        ].join('\t'));
      }
      const data = tableData.join('\n');
      void navigator.clipboard.writeText(data);
      UI.ARIAUtils.alert(i18nString(UIStrings.tableCopiedToClipboard));
    });
  }

  override performUpdate(): void {
    const viewInput = {
      timings: this.#timings,
      onContextMenu: (event: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => {
        this.#onContextMenu(event);
      },
    };
    const viewOutput = {};
    this.#view(viewInput, viewOutput, this.contentElement);
  }

  setEvent(event: Trace.Types.Events.UpdateLayoutTree): boolean {
    if (!this.#parsedTrace) {
      return false;
    }

    if (this.#lastStatsSourceEventOrEvents === event) {
      // The event that is populating the selector stats table has not changed,
      // so no need to do any work because the data will be the same.
      return false;
    }

    this.#lastStatsSourceEventOrEvents = event;

    const selectorStats = this.#parsedTrace.SelectorStats.dataForUpdateLayoutEvent.get(event);
    if (!selectorStats) {
      this.#timings = [];
      this.requestUpdate();
      return false;
    }

    void this.processSelectorTimings(selectorStats.timings).then(timings => {
      this.#timings = timings;
      this.requestUpdate();
    });
    return true;
  }

  setAggregatedEvents(events: Trace.Types.Events.UpdateLayoutTree[]): void {
    const timings: Trace.Types.Events.SelectorTiming[] = [];
    const selectorMap = new Map<String, Trace.Types.Events.SelectorTiming>();

    if (!this.#parsedTrace) {
      return;
    }

    const sums = {
      [SelectorTimingsKey.Elapsed]: 0,
      [SelectorTimingsKey.MatchAttempts]: 0,
      [SelectorTimingsKey.MatchCount]: 0,
      [SelectorTimingsKey.FastRejectCount]: 0,
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
            const previousEvents = this.#lastStatsSourceEventOrEvents as Trace.Types.Events.UpdateLayoutTree[];
            return event === previousEvents[index];
          })) {
        return;
      }
    }

    this.#lastStatsSourceEventOrEvents = events;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const selectorStats = event ? this.#parsedTrace.SelectorStats.dataForUpdateLayoutEvent.get(event) : undefined;
      if (!selectorStats) {
        continue;
      } else {
        const data: Trace.Types.Events.SelectorTiming[] = selectorStats.timings;
        for (const timing of data) {
          const key = timing[SelectorTimingsKey.Selector] + '_' + timing[SelectorTimingsKey.StyleSheetId];
          const findTiming = selectorMap.get(key);
          if (findTiming !== undefined) {
            findTiming[SelectorTimingsKey.Elapsed] += timing[SelectorTimingsKey.Elapsed];
            findTiming[SelectorTimingsKey.FastRejectCount] += timing[SelectorTimingsKey.FastRejectCount];
            findTiming[SelectorTimingsKey.MatchAttempts] += timing[SelectorTimingsKey.MatchAttempts];
            findTiming[SelectorTimingsKey.MatchCount] += timing[SelectorTimingsKey.MatchCount];
          } else {
            selectorMap.set(key, structuredClone(timing));
          }
          // Keep track of the total times for a sum row.
          sums[SelectorTimingsKey.Elapsed] += timing[SelectorTimingsKey.Elapsed];
          sums[SelectorTimingsKey.MatchAttempts] += timing[SelectorTimingsKey.MatchAttempts];
          sums[SelectorTimingsKey.MatchCount] += timing[SelectorTimingsKey.MatchCount];
          sums[SelectorTimingsKey.FastRejectCount] += timing[SelectorTimingsKey.FastRejectCount];
        }
      }
    }
    if (selectorMap.size > 0) {
      selectorMap.forEach(timing => {
        timings.push(timing);
      });
      selectorMap.clear();
    } else {
      this.#timings = [];
      this.requestUpdate();
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
    });

    void this.processSelectorTimings(timings).then(timings => {
      this.#timings = timings;
      this.requestUpdate();
    });
  }

  private async processSelectorTimings(timings: Trace.Types.Events.SelectorTiming[]): Promise<SelectorTiming[]> {
    async function toSourceFileLocation(
        cssModel: SDK.CSSModel.CSSModel, styleSheetId: Protocol.CSS.StyleSheetId, selectorText: string,
        selectorLocations: Map<string, Protocol.CSS.SourceRange[]>):
        Promise<Linkifier.Linkifier.LinkifierData[]|undefined> {
      if (!cssModel) {
        return undefined;
      }
      const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
      if (!styleSheetHeader || !styleSheetHeader.resourceURL()) {
        return undefined;
      }

      // get the locations from cache if available
      const key: string = JSON.stringify({selectorText, styleSheetId});
      let ranges = selectorLocations.get(key);
      if (!ranges) {
        const result = await cssModel.agent.invoke_getLocationForSelector({styleSheetId, selectorText});
        if (result.getError() || !result.ranges) {
          return undefined;
        }
        ranges = result.ranges;
        selectorLocations.set(key, ranges);
      }

      const linkData = ranges.map(range => {
        return {
          url: styleSheetHeader.resourceURL() as Platform.DevToolsPath.UrlString,
          lineNumber: range.startLine,
          columnNumber: range.startColumn,
          linkText: i18nString(UIStrings.lineNumber, {PH1: range.startLine + 1, PH2: range.startColumn + 1}),
          title: `${styleSheetHeader.id} line ${range.startLine + 1}:${range.startColumn + 1}`,
        } as Linkifier.Linkifier.LinkifierData;
      });
      return linkData;
    }

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const cssModel = target?.model(SDK.CSSModel.CSSModel);
    if (!cssModel) {
      return [];
    }

    return await Promise.all(
        timings.sort((a, b) => b[SelectorTimingsKey.Elapsed] - a[SelectorTimingsKey.Elapsed]).map(async x => {
          const styleSheetId = x[SelectorTimingsKey.StyleSheetId] as Protocol.CSS.StyleSheetId;
          const selectorText = x[SelectorTimingsKey.Selector].trim();
          const locations = styleSheetId === 'n/a' ?
              null :
              await toSourceFileLocation(cssModel, styleSheetId, selectorText, this.#selectorLocations);

          return {...x, locations};
        }));
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([timelineSelectorStatsViewStyles]);
  }
}
