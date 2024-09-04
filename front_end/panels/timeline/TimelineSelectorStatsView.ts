// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as TraceEngine from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/components/data_grid/data_grid.js';
import * as Linkifier from '../../ui/components/linkifier/linkifier.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

const UIStrings = {
  /**
   *@description Label for selector stats data table
   */
  selectorStats: 'Selector Stats',
  /**
   *@description Column name and time unit for elapsed time spent computing a style rule
   */
  elapsed: 'Elapsed (ms)',
  /**
   *@description Column name and percentage of slow mach non-matches computing a style rule
   */
  rejectPercentage: '% of Slow-Path Non-Matches',
  /**
   *@description Tooltip description '% of slow-path non-matches'
   */
  rejectPercentageExplanation:
      'The percentage of non-matching nodes (Match Attempts - Match Count) that couldn\'t be quickly ruled out by the bloom filter. Lower is better.',
  /**
   *@description Column name for count of elements that the engine attempted to match against a style rule
   */
  matchAttempts: 'Match Attempts',
  /**
   *@description Column name for count of elements that matched a style rule
   */
  matchCount: 'Match Count',
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
  copyTable: 'Copy Table',
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

export const enum SelectorTimingsKey {
  ELAPSED = 'elapsed (us)',
  REJECT_PERCENTAGE = 'reject_percentage',
  FAST_REJECT_COUNT = 'fast_reject_count',
  MATCH_ATTEMPTS = 'match_attempts',
  MATCH_COUNT = 'match_count',
  SELECTOR = 'selector',
  STYLE_SHEET_ID = 'style_sheet_id',
}

export class TimelineSelectorStatsView extends UI.Widget.VBox {
  #datagrid: DataGrid.DataGridController.DataGridController;
  #selectorLocations: Map<string, Protocol.CSS.SourceRange[]>;
  #traceParsedData: TraceEngine.Handlers.Types.TraceParseData|null = null;
  /**
   * We store the last event (or array of events) that we renderered. We do
   * this because as the user zooms around the panel this view is updated,
   * however if the set of events that are populating the view is the same as it
   * was the last time, we can bail without doing any re-rendering work.
   * If the user views a single event, this will be set to that single event, but if they are viewing a range of events, this will be set to an array.
   * If it's null, that means we have not rendered yet.
   */
  #lastStatsSourceEventOrEvents: TraceEngine.Types.TraceEvents.TraceEventUpdateLayoutTree|
      TraceEngine.Types.TraceEvents.TraceEventUpdateLayoutTree[]|null = null;

  constructor(traceParsedData: TraceEngine.Handlers.Types.TraceParseData|null) {
    super();

    this.#datagrid = new DataGrid.DataGridController.DataGridController();
    this.element.setAttribute('jslog', `${VisualLogging.pane('selector-stats').track({resize: true})}`);
    this.#selectorLocations = new Map<string, Protocol.CSS.SourceRange[]>();
    this.#traceParsedData = traceParsedData;

    this.#datagrid.data = {
      label: i18nString(UIStrings.selectorStats),
      showScrollbar: true,
      autoScrollToBottom: false,
      initialSort: {
        columnId: SelectorTimingsKey.ELAPSED as Lowercase<string>,
        direction: DataGrid.DataGridUtils.SortDirection.DESC,
      },
      columns: [
        {
          id: SelectorTimingsKey.ELAPSED as Lowercase<string>,
          title: i18nString(UIStrings.elapsed),
          sortable: true,
          widthWeighting: 1,
          visible: true,
          hideable: true,
          styles: {
            'text-align': 'right',
          },
        },
        {
          id: SelectorTimingsKey.MATCH_ATTEMPTS as Lowercase<string>,
          title: i18nString(UIStrings.matchAttempts),
          sortable: true,
          widthWeighting: 1,
          visible: true,
          hideable: true,
          styles: {
            'text-align': 'right',
          },
        },
        {
          id: SelectorTimingsKey.MATCH_COUNT as Lowercase<string>,
          title: i18nString(UIStrings.matchCount),
          sortable: true,
          widthWeighting: 1,
          visible: true,
          hideable: true,
          styles: {
            'text-align': 'right',
          },
        },
        {
          id: SelectorTimingsKey.REJECT_PERCENTAGE as Lowercase<string>,
          title: i18nString(UIStrings.rejectPercentage),
          titleElement: LitHtml.html`<span title=${i18nString(UIStrings.rejectPercentageExplanation)}>${
              i18nString(UIStrings.rejectPercentage)}</span>`,
          sortable: true,
          widthWeighting: 1,
          visible: true,
          hideable: true,
          styles: {
            'text-align': 'right',
          },
        },
        {
          id: SelectorTimingsKey.SELECTOR as Lowercase<string>,
          title: i18nString(UIStrings.selector),
          sortable: true,
          widthWeighting: 3,
          visible: true,
          hideable: true,
        },
        {
          id: SelectorTimingsKey.STYLE_SHEET_ID as Lowercase<string>,
          title: i18nString(UIStrings.styleSheetId),
          sortable: true,
          widthWeighting: 1.5,
          visible: true,
          hideable: true,
        },
      ],
      rows: [],
      contextMenus: {
        bodyRow: (
            menu: UI.ContextMenu.ContextMenu, columns: readonly DataGrid.DataGridUtils.Column[],
            row: Readonly<DataGrid.DataGridUtils.Row>, rows: readonly DataGrid.DataGridUtils.Row[]): void => {
          menu.defaultSection().appendItem(i18nString(UIStrings.copyTable), () => {
            const tableData = [];
            const columnName = columns.map(col => col.title);
            tableData.push(columnName.join('\t'));
            for (const rowData of rows) {
              const cellsValue = rowData.cells;
              const rowValue = cellsValue.map(cell => {
                if (cell.columnId === SelectorTimingsKey.STYLE_SHEET_ID) {
                  // Export link via raw StyleSheetId data
                  const defaultLinkValue = i18nString(UIStrings.unableToLink);
                  let linkData = '';
                  const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
                  const cssModel = target?.model(SDK.CSSModel.CSSModel);
                  if (cssModel) {
                    const styleSheetHeader = cssModel.styleSheetHeaderForId(cell.value as Protocol.CSS.StyleSheetId);
                    if (styleSheetHeader) {
                      linkData = styleSheetHeader.resourceURL().toString();
                    }
                  }
                  return linkData ? linkData.toString() : defaultLinkValue;
                }
                return String(cell.value);
              });
              tableData.push(rowValue.join('\t'));
            }
            const data = tableData.join('\n');
            void navigator.clipboard.writeText(data);
            UI.ARIAUtils.alert(i18nString(UIStrings.tableCopiedToClipboard));
          });
        },
      },
    };

    this.contentElement.appendChild(this.#datagrid);
  }

  setEvent(event: TraceEngine.Types.TraceEvents.TraceEventUpdateLayoutTree): boolean {
    if (!this.#traceParsedData) {
      return false;
    }

    if (this.#lastStatsSourceEventOrEvents === event) {
      // The event that is populating the selector stats table has not changed,
      // so no need to do any work because the data will be the same.
      return false;
    }

    this.#lastStatsSourceEventOrEvents = event;

    const selectorStats = this.#traceParsedData.SelectorStats.dataForUpdateLayoutEvent.get(event);
    if (!selectorStats) {
      this.#datagrid.data = {...this.#datagrid.data, rows: []};
      return false;
    }

    const timings: TraceEngine.Types.TraceEvents.SelectorTiming[] = selectorStats.timings;
    void this.createRowsForTable(timings).then(rows => {
      this.#datagrid.data = {...this.#datagrid.data, rows};
    });

    return true;
  }

  setAggregatedEvents(events: TraceEngine.Types.TraceEvents.TraceEventUpdateLayoutTree[]): void {
    const timings: TraceEngine.Types.TraceEvents.SelectorTiming[] = [];
    const selectorMap = new Map<String, TraceEngine.Types.TraceEvents.SelectorTiming>();

    if (!this.#traceParsedData) {
      return;
    }

    const sums = {
      [SelectorTimingsKey.ELAPSED]: 0,
      [SelectorTimingsKey.MATCH_ATTEMPTS]: 0,
      [SelectorTimingsKey.MATCH_COUNT]: 0,
      [SelectorTimingsKey.FAST_REJECT_COUNT]: 0,
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
            const previousEvents =
                this.#lastStatsSourceEventOrEvents as TraceEngine.Types.TraceEvents.TraceEventUpdateLayoutTree[];
            return event === previousEvents[index];
          })) {
        return;
      }
    }

    this.#lastStatsSourceEventOrEvents = events;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const selectorStats = event ? this.#traceParsedData.SelectorStats.dataForUpdateLayoutEvent.get(event) : undefined;
      if (!selectorStats) {
        continue;
      } else {
        const data: TraceEngine.Types.TraceEvents.SelectorTiming[] = selectorStats.timings;
        for (const timing of data) {
          const key = timing[SelectorTimingsKey.SELECTOR] + '_' + timing[SelectorTimingsKey.STYLE_SHEET_ID];
          const findTiming = selectorMap.get(key);
          if (findTiming !== undefined) {
            findTiming[SelectorTimingsKey.ELAPSED] += timing[SelectorTimingsKey.ELAPSED];
            findTiming[SelectorTimingsKey.FAST_REJECT_COUNT] += timing[SelectorTimingsKey.FAST_REJECT_COUNT];
            findTiming[SelectorTimingsKey.MATCH_ATTEMPTS] += timing[SelectorTimingsKey.MATCH_ATTEMPTS];
            findTiming[SelectorTimingsKey.MATCH_COUNT] += timing[SelectorTimingsKey.MATCH_COUNT];
          } else {
            selectorMap.set(key, structuredClone(timing));
          }
          // Keep track of the total times for a sum row.
          sums[SelectorTimingsKey.ELAPSED] += timing[SelectorTimingsKey.ELAPSED];
          sums[SelectorTimingsKey.MATCH_ATTEMPTS] += timing[SelectorTimingsKey.MATCH_ATTEMPTS];
          sums[SelectorTimingsKey.MATCH_COUNT] += timing[SelectorTimingsKey.MATCH_COUNT];
          sums[SelectorTimingsKey.FAST_REJECT_COUNT] += timing[SelectorTimingsKey.FAST_REJECT_COUNT];
        }
      }
    }
    if (selectorMap.size > 0) {
      selectorMap.forEach(timing => {
        timings.push(timing);
      });
      selectorMap.clear();
    } else {
      this.#datagrid.data = {...this.#datagrid.data, rows: []};
      return;
    }

    // Add the sum row.
    timings.unshift({
      [SelectorTimingsKey.ELAPSED]: sums[SelectorTimingsKey.ELAPSED],
      [SelectorTimingsKey.FAST_REJECT_COUNT]: sums[SelectorTimingsKey.FAST_REJECT_COUNT],
      [SelectorTimingsKey.MATCH_ATTEMPTS]: sums[SelectorTimingsKey.MATCH_ATTEMPTS],
      [SelectorTimingsKey.MATCH_COUNT]: sums[SelectorTimingsKey.MATCH_COUNT],
      [SelectorTimingsKey.SELECTOR]: i18nString(UIStrings.totalForAllSelectors),
      [SelectorTimingsKey.STYLE_SHEET_ID]: 'n/a',
    });

    void this.createRowsForTable(timings).then(rows => {
      this.#datagrid.data = {...this.#datagrid.data, rows};
    });
  }

  private async createRowsForTable(timings: TraceEngine.Types.TraceEvents.SelectorTiming[]):
      Promise<DataGrid.DataGridUtils.Row[]> {
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
        } as Linkifier.Linkifier.LinkifierData;
      });
      return linkData;
    }

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const cssModel = target?.model(SDK.CSSModel.CSSModel);
    if (!cssModel) {
      return [];
    }

    const rows = await Promise.all(timings.map(async x => {
      const styleSheetId = x[SelectorTimingsKey.STYLE_SHEET_ID] as Protocol.CSS.StyleSheetId;
      const selectorText = x[SelectorTimingsKey.SELECTOR].trim();
      const elapsedTimeInMs = x[SelectorTimingsKey.ELAPSED] / 1000.0;
      const nonMatches = x[SelectorTimingsKey.MATCH_ATTEMPTS] - x[SelectorTimingsKey.MATCH_COUNT];
      const rejectPercentage = (nonMatches ? x[SelectorTimingsKey.FAST_REJECT_COUNT] / nonMatches : 1) * 100;
      const locations = styleSheetId === 'n/a' ?
          null :
          await toSourceFileLocation(cssModel, styleSheetId, selectorText, this.#selectorLocations);

      return {
        cells: [
          {
            columnId: SelectorTimingsKey.ELAPSED,
            value: elapsedTimeInMs,
            renderer(): LitHtml.TemplateResult {
              return LitHtml.html`${elapsedTimeInMs.toFixed(3)}`;
            },
          },
          {columnId: SelectorTimingsKey.MATCH_ATTEMPTS, value: x[SelectorTimingsKey.MATCH_ATTEMPTS]},
          {columnId: SelectorTimingsKey.MATCH_COUNT, value: x[SelectorTimingsKey.MATCH_COUNT]},
          {
            columnId: SelectorTimingsKey.REJECT_PERCENTAGE,
            value: rejectPercentage,
            renderer(): LitHtml.TemplateResult {
              return LitHtml.html`${rejectPercentage.toFixed(1)}`;
            },
          },
          {
            columnId: SelectorTimingsKey.SELECTOR,
            title: x[SelectorTimingsKey.SELECTOR],
            value: x[SelectorTimingsKey.SELECTOR],
          },
          {
            columnId: SelectorTimingsKey.STYLE_SHEET_ID,
            value: x[SelectorTimingsKey.STYLE_SHEET_ID],
            renderer(): LitHtml.TemplateResult {
              if (locations === null) {
                return LitHtml.html`<span></span>`;
              }
              if (locations === undefined) {
                return LitHtml.html`<span title=${i18nString(UIStrings.unableToLinkViaStyleSheetId, {
                  PH1: x[SelectorTimingsKey.STYLE_SHEET_ID],
                })} aria-label=${i18nString(UIStrings.unableToLinkViaStyleSheetId, {
                  PH1: x[SelectorTimingsKey.STYLE_SHEET_ID],
                })}>${i18nString(UIStrings.unableToLink)}</span>`;
              }
              return LitHtml.html`
              ${locations.map((location, itemIndex) => {
                if (itemIndex !== locations.length - 1) {
                  // eslint-disable-next-line rulesdir/ban_a_tags_in_lit_html
                  return LitHtml.html`<${Linkifier.Linkifier.Linkifier.litTagName} .data=${
                      location as Linkifier.Linkifier.LinkifierData}></${Linkifier.Linkifier.Linkifier.litTagName}>
                    <a>, </a>`;
                }
                return LitHtml.html`<${Linkifier.Linkifier.Linkifier.litTagName} .data=${
                    location as Linkifier.Linkifier.LinkifierData}></${Linkifier.Linkifier.Linkifier.litTagName}>`;
              })}
              `;
            },
          },
        ],
      };
    }));

    return rows;
  }
}
