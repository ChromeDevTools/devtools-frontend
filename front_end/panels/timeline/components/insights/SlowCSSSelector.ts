// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';
import '../../../../ui/components/linkifier/linkifier.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import type {SlowCSSSelectorInsightModel} from '../../../../models/trace/insights/SlowCSSSelector.js';
import * as Trace from '../../../../models/trace/trace.js';
import type * as Linkifier from '../../../../ui/components/linkifier/linkifier.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent, shouldRenderForCategory} from './Helpers.js';
import type * as SidebarInsight from './SidebarInsight.js';
import type {TableData} from './Table.js';
import {Category} from './types.js';

const {html} = LitHtml;

const UIStrings = {
  /**
   *@description Column name for count of elements that the engine attempted to match against a style rule
   */
  matchAttempts: 'Match attempts',
  /**
   *@description Column name for count of elements that matched a style rule
   */
  matchCount: 'Match count',
  /**
   *@description Column name for elapsed time spent computing a style rule
   */
  elapsed: 'Elapsed time',
  /**
   *@description Column name for the selectors that took the longest amount of time/effort.
   */
  topSelectors: 'Top selectors',
  /**
   *@description Column name for a total sum.
   */
  total: 'Total',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/SlowCSSSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SlowCSSSelector extends BaseInsightComponent<SlowCSSSelectorInsightModel> {
  static override readonly litTagName = LitHtml.literal`devtools-performance-slow-css-selector`;
  override insightCategory: Category = Category.ALL;
  override internalName: string = 'slow-css-selector';
  #selectorLocations: Map<string, Protocol.CSS.SourceRange[]> = new Map();

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    return [];
  }

  private async toSourceFileLocation(cssModel: SDK.CSSModel.CSSModel, selector: Trace.Types.Events.SelectorTiming):
      Promise<Linkifier.Linkifier.LinkifierData[]|undefined> {
    if (!cssModel) {
      return undefined;
    }
    const styleSheetHeader = cssModel.styleSheetHeaderForId(selector.style_sheet_id as Protocol.CSS.StyleSheetId);
    if (!styleSheetHeader || !styleSheetHeader.resourceURL()) {
      return undefined;
    }

    // get the locations from cache if available
    const key: string = JSON.stringify({selectorText: selector.selector, styleSheetId: selector.style_sheet_id});
    let ranges = this.#selectorLocations.get(key);
    if (!ranges) {
      const result = await cssModel.agent.invoke_getLocationForSelector(
          {selectorText: selector.selector, styleSheetId: selector.style_sheet_id as Protocol.CSS.StyleSheetId});
      if (result.getError() || !result.ranges) {
        return undefined;
      }
      ranges = result.ranges;
      this.#selectorLocations.set(key, ranges);
    }

    const locations = ranges.map((range, itemIndex) => {
      return {
        url: styleSheetHeader.resourceURL() as Platform.DevToolsPath.UrlString,
        lineNumber: range.startLine,
        columnNumber: range.startColumn,
        linkText: `[${itemIndex + 1}]`,
        title: `${styleSheetHeader.id} line ${range.startLine + 1}:${range.startColumn + 1}`,
      } as Linkifier.Linkifier.LinkifierData;
    });
    return locations;
  }

  private async getSelectorLinks(
      cssModel: SDK.CSSModel.CSSModel|null|undefined,
      selector: Trace.Types.Events.SelectorTiming): Promise<LitHtml.LitTemplate> {
    if (!cssModel) {
      return LitHtml.nothing;
    }

    if (!selector.style_sheet_id) {
      return LitHtml.nothing;
    }

    const locations = await this.toSourceFileLocation(cssModel, selector);
    if (!locations) {
      return LitHtml.nothing;
    }

    const links = html`
    ${locations.map((location, itemIndex) => {
      const divider = itemIndex !== locations.length - 1 ? ', ' : '';
      return html`<devtools-linkifier .data=${location as Linkifier.Linkifier.LinkifierData}></devtools-linkifier>${
          divider}`;
    })}`;

    return links;
  }

  renderSlowCSSSelector(): LitHtml.LitTemplate {
    if (!this.model) {
      return LitHtml.nothing;
    }

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const cssModel = target?.model(SDK.CSSModel.CSSModel);
    const time = (us: Trace.Types.Timing.MicroSeconds): string =>
        i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(us));

    // clang-format off
    return html`
      <div class="insights">
        <devtools-performance-sidebar-insight .data=${{
              title: this.model.title,
              description: this.model.description,
              internalName: this.internalName,
              expanded: this.isActive(),
          } as SidebarInsight.InsightDetails}
          @insighttoggleclick=${this.onSidebarClick} >
          <div slot="insight-content">
            <div class="insight-section">
              ${html`<devtools-performance-table
                .data=${{
                  insight: this,
                  headers: [i18nString(UIStrings.total), ''],
                  rows: [
                    {values: [i18nString(UIStrings.elapsed), i18n.TimeUtilities.millisToString(this.model.totalElapsedMs)]},
                    {values: [i18nString(UIStrings.matchAttempts), this.model.totalMatchAttempts]},
                    {values: [i18nString(UIStrings.matchCount), this.model.totalMatchCount]},
                  ],
                } as TableData}>
              </devtools-performance-table>`}
            </div>
            <div class="insight-section">
              ${html`<devtools-performance-table
                .data=${{
                  insight: this,
                  headers: [i18nString(UIStrings.topSelectors), i18nString(UIStrings.elapsed)],
                  rows: this.model.topElapsedMs.map(selector => {
                    return {
                      values: [
                      html`${selector.selector} ${LitHtml.Directives.until(this.getSelectorLinks(cssModel, selector))}`,
                      time(Trace.Types.Timing.MicroSeconds(selector['elapsed (us)']))],
                    };
                  }),
                } as TableData}>
              </devtools-performance-table>`}
            </div>
            <div class="insight-section">
              ${html`<devtools-performance-table
                .data=${{
                  insight: this,
                  headers: [i18nString(UIStrings.topSelectors), i18nString(UIStrings.matchAttempts)],
                  rows: this.model.topMatchAttempts.map(selector => {
                    return {
                      values: [
                      html`${selector.selector} ${LitHtml.Directives.until(this.getSelectorLinks(cssModel, selector))}` as unknown as string,
                      selector['match_attempts']],
                    };
                  }),
                } as TableData}>
              </devtools-performance-table>`}
            </div>
          </div>
        </devtools-performance-sidebar-insight>
      </div>`;
    // clang-format on
  }

  #hasDataToRender(): boolean {
    return this.model !== null && this.model.topElapsedMs.length !== 0 && this.model.topMatchAttempts.length !== 0;
  }

  override render(): void {
    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const shouldRender = matchesCategory && this.#hasDataToRender();
    const output = shouldRender ? this.renderSlowCSSSelector() : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-slow-css-selector': SlowCSSSelector;
  }
}

customElements.define('devtools-performance-slow-css-selector', SlowCSSSelector);
