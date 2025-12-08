// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/linkifier/linkifier.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import type {SlowCSSSelectorInsightModel} from '../../../../models/trace/insights/SlowCSSSelector.js';
import * as Trace from '../../../../models/trace/trace.js';
import type * as Linkifier from '../../../../ui/components/linkifier/linkifier.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {Table} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.SlowCSSSelector;

const {html} = Lit;
const {widgetConfig} = UI.Widget;

export class SlowCSSSelector extends BaseInsightComponent<SlowCSSSelectorInsightModel> {
  override internalName = 'slow-css-selector';
  #selectorLocations = new Map<string, Protocol.CSS.SourceRange[]>();

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  private async toSourceFileLocation(cssModel: SDK.CSSModel.CSSModel, selector: Trace.Types.Events.SelectorTiming):
      Promise<Linkifier.Linkifier.LinkifierData[]|undefined> {
    if (!cssModel) {
      return undefined;
    }
    const styleSheetHeader = cssModel.styleSheetHeaderForId(selector.style_sheet_id as Protocol.DOM.StyleSheetId);
    if (!styleSheetHeader?.resourceURL()) {
      return undefined;
    }

    // get the locations from cache if available
    const key: string = JSON.stringify({selectorText: selector.selector, styleSheetId: selector.style_sheet_id});
    let ranges = this.#selectorLocations.get(key);
    if (!ranges) {
      const result = await cssModel.agent.invoke_getLocationForSelector(
          {selectorText: selector.selector, styleSheetId: selector.style_sheet_id as Protocol.DOM.StyleSheetId});
      if (result.getError() || !result.ranges) {
        return undefined;
      }
      ranges = result.ranges;
      this.#selectorLocations.set(key, ranges);
    }

    const locations = ranges.map((range, itemIndex) => {
      return {
        url: styleSheetHeader.resourceURL(),
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
      selector: Trace.Types.Events.SelectorTiming): Promise<Lit.LitTemplate> {
    if (!cssModel) {
      return Lit.nothing;
    }

    if (!selector.style_sheet_id) {
      return Lit.nothing;
    }

    const locations = await this.toSourceFileLocation(cssModel, selector);
    if (!locations) {
      return Lit.nothing;
    }

    const links = html`
    ${locations.map((location, itemIndex) => {
      const divider = itemIndex !== locations.length - 1 ? ', ' : '';
      return html`<devtools-linkifier .data=${location}></devtools-linkifier>${divider}`;
    })}`;

    return links;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const cssModel = target?.model(SDK.CSSModel.CSSModel);
    const time = (us: Trace.Types.Timing.Micro): string =>
        i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(us));

    if (!this.model.topSelectorMatchAttempts && !this.model.topSelectorElapsedMs) {
      return html`<div class="insight-section">${i18nString(UIStrings.enableSelectorData)}</div>`;
    }

    // clang-format off
    const sections = [html`
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig(Table, {
           data: {
            insight: this,
            headers: [i18nString(UIStrings.total), ''],
            rows: [
              {values: [i18nString(UIStrings.matchAttempts), this.model.totalMatchAttempts]},
              {values: [i18nString(UIStrings.matchCount), this.model.totalMatchCount]},
              {values: [i18nString(UIStrings.elapsed), i18n.TimeUtilities.millisToString(this.model.totalElapsedMs)]},
            ],
          }})}>
        </devtools-widget>
      </div>
    `];
    // clang-format on

    if (this.model.topSelectorElapsedMs) {
      const selector = this.model.topSelectorElapsedMs;
      // clang-format off
      sections.push(html`
        <div class="insight-section">
          <devtools-widget .widgetConfig=${widgetConfig(Table, {
           data: {
              insight: this,
              headers: [`${i18nString(UIStrings.topSelectorElapsedTime)}: ${time(Trace.Types.Timing.Micro(selector['elapsed (us)']))}`],
              rows: [{
                values: [html`${selector.selector} ${Lit.Directives.until(this.getSelectorLinks(cssModel, selector))}`]}]
            }})}>
          </devtools-widget>
        </div>
      `);
      // clang-format on
    }

    if (this.model.topSelectorMatchAttempts) {
      const selector = this.model.topSelectorMatchAttempts;
      // clang-format off
      sections.push(html`
        <div class="insight-section">
          <devtools-widget .widgetConfig=${widgetConfig(Table, {
           data: {
              insight: this,
              headers: [`${i18nString(UIStrings.topSelectorMatchAttempt)}: ${selector['match_attempts']}`],
              rows: [{
                  values: [html`${selector.selector} ${Lit.Directives.until(this.getSelectorLinks(cssModel, selector))}` as unknown as string],
              }]
            }})}>
          </devtools-widget>
        </div>
      `);
      // clang-format on
    }

    return html`${sections}`;
  }
}
