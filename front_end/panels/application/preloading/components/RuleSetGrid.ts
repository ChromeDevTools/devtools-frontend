// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/data_grid/data_grid.js';
import '../../../../ui/components/icon_button/icon_button.js';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import type * as DataGrid from '../../../../ui/components/data_grid/data_grid.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../../../network/forward/forward.js';
import * as PreloadingHelper from '../helper/helper.js';

import * as PreloadingString from './PreloadingString.js';
import ruleSetGridStyles from './ruleSetGrid.css.js';

const {html} = LitHtml;

const UIStrings = {
  /**
   *@description Column header: Short URL of rule set.
   */
  ruleSet: 'Rule set',
  /**
   *@description Column header: Show how many preloads are associated if valid, error counts if invalid.
   */
  status: 'Status',
  /**
   *@description button: Title of button to reveal the corresponding request of rule set in Elements panel
   */
  clickToOpenInElementsPanel: 'Click to open in Elements panel',
  /**
   *@description button: Title of button to reveal the corresponding request of rule set in Network panel
   */
  clickToOpenInNetworkPanel: 'Click to open in Network panel',
  /**
   *@description Value of status, specifying rule set contains how many errors.
   */
  errors: '{errorCount, plural, =1 {# error} other {# errors}}',
  /**
   *@description button: Title of button to reveal preloading attempts with filter by selected rule set
   */
  buttonRevealPreloadsAssociatedWithRuleSet: 'Reveal speculative loads associated with this rule set',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/RuleSetGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface RuleSetGridData {
  rows: RuleSetGridRow[];
  pageURL: Platform.DevToolsPath.UrlString;
}

export interface RuleSetGridRow {
  ruleSet: Protocol.Preload.RuleSet;
  preloadsStatusSummary: string;
}

// Grid component to show SpeculationRules rule sets.
export class RuleSetGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: RuleSetGridData|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [ruleSetGridStyles];
    this.#render();
  }

  update(data: RuleSetGridData): void {
    this.#data = data;
    this.#render();
  }

  #render(): void {
    if (this.#data === null) {
      return;
    }

    const reportsGridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'rule-set',
          title: i18nString(UIStrings.ruleSet),
          widthWeighting: 20,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'status',
          title: i18nString(UIStrings.status),
          widthWeighting: 80,
          hideable: false,
          visible: true,
          sortable: true,
        },
      ],
      rows: this.#buildReportRows(),
      striped: true,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(html`
      <div class="ruleset-container"
      jslog=${VisualLogging.pane('preloading-rules')}>
        <devtools-data-grid-controller .data=${reportsGridData}></devtools-data-grid-controller>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #buildReportRows(): DataGrid.DataGridUtils.Row[] {
    assertNotNullOrUndefined(this.#data);

    const pageURL = this.#data.pageURL;
    return this.#data.rows.map(
        row => ({
          cells: [
            {columnId: 'id', value: row.ruleSet.id},
            {
              columnId: 'rule-set',
              value: '',
              renderer: () => ruleSetRenderer(row.ruleSet, pageURL),
            },
            {
              columnId: 'status',
              value: row.preloadsStatusSummary,
              renderer: preloadsStatusSummary => statusRenderer(preloadsStatusSummary as string, row.ruleSet),
            },
          ],
        }));
  }
}

customElements.define('devtools-resources-ruleset-grid', RuleSetGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-ruleset-grid': RuleSetGrid;
  }
}

function ruleSetRenderer(
    ruleSet: Protocol.Preload.RuleSet, pageURL: Platform.DevToolsPath.UrlString): LitHtml.TemplateResult {
  function ruleSetRendererInnerDocument(ruleSet: Protocol.Preload.RuleSet, location: string): LitHtml.TemplateResult {
    assertNotNullOrUndefined(ruleSet.backendNodeId);

    const revealSpeculationRulesInElements = async(): Promise<void> => {
      assertNotNullOrUndefined(ruleSet.backendNodeId);

      const target = SDK.TargetManager.TargetManager.instance().scopeTarget();
      if (target === null) {
        return;
      }

      await Common.Revealer.reveal(new SDK.DOMModel.DeferredDOMNode(target, ruleSet.backendNodeId));
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <button class="link" role="link"
        @click=${revealSpeculationRulesInElements}
        title=${i18nString(UIStrings.clickToOpenInElementsPanel)}
        style=${LitHtml.Directives.styleMap({
          border: 'none',
          background: 'none',
          color: 'var(--icon-link)',
          cursor: 'pointer',
          'text-decoration': 'underline',
          'padding-inline-start': '0',
          'padding-inline-end': '0',
        })}
        jslog=${VisualLogging.action('reveal-in-elements').track({click: true})}
      >
        <devtools-icon
          .data=${{
            iconName: 'code-circle',
            color: 'var(--icon-link)',
            width: '16px',
            height: '16px',
          }}
          style=${LitHtml.Directives.styleMap({
            'vertical-align': 'sub',
          })}
        >
        </devtools-icon>
        ${location}
      </button>
    `;
    // clang-format on
  }

  function ruleSetRendererOutOfDocument(ruleSet: Protocol.Preload.RuleSet, location: string): LitHtml.TemplateResult {
    assertNotNullOrUndefined(ruleSet.url);
    assertNotNullOrUndefined(ruleSet.requestId);

    const revealSpeculationRulesInNetwork = async(): Promise<void> => {
      assertNotNullOrUndefined(ruleSet.requestId);
      const request = SDK.TargetManager.TargetManager.instance()
                          .scopeTarget()
                          ?.model(SDK.NetworkManager.NetworkManager)
                          ?.requestForId(ruleSet.requestId) ||
          null;
      if (request === null) {
        return;
      }

      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
          request, NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW, {clearFilter: false});
      await Common.Revealer.reveal(requestLocation);
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <button class="link" role="link"
        @click=${revealSpeculationRulesInNetwork}
        title=${i18nString(UIStrings.clickToOpenInNetworkPanel)}
        style=${LitHtml.Directives.styleMap({
          border: 'none',
          background: 'none',
          color: 'var(--icon-link)',
          cursor: 'pointer',
          'text-decoration': 'underline',
          'padding-inline-start': '0',
          'padding-inline-end': '0',
        })}
      >
        <devtools-icon
         .data=${{
            iconName: 'arrow-up-down-circle',
            color: 'var(--icon-link)',
            width: '16px',
            height: '16px',
          }}
          style=${LitHtml.Directives.styleMap({
            'vertical-align': 'sub',
          })}
        >
        </devtools-icon>
        ${location}
      </button>
    `;
    // clang-format on
  }

  const location = PreloadingString.ruleSetLocationShort(ruleSet, pageURL);

  if (ruleSet.backendNodeId !== undefined) {
    return ruleSetRendererInnerDocument(ruleSet, location);
  }

  if (ruleSet.url !== undefined && ruleSet.requestId) {
    return ruleSetRendererOutOfDocument(ruleSet, location);
  }

  return html`${location}`;
}

function statusRenderer(preloadsStatusSummary: string, ruleSet: Protocol.Preload.RuleSet): LitHtml.TemplateResult {
  function counts(preloadsStatusSummary: string, ruleSet: Protocol.Preload.RuleSet): LitHtml.TemplateResult {
    const revealAttemptViewWithFilter = async(): Promise<void> => {
      await Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.AttemptViewWithFilter(ruleSet.id));
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <button class="link" role="link"
        @click=${revealAttemptViewWithFilter}
        title=${i18nString(UIStrings.buttonRevealPreloadsAssociatedWithRuleSet)}
        style=${LitHtml.Directives.styleMap({
          color: 'var(--sys-color-primary)',
          'text-decoration': 'underline',
          cursor: 'pointer',
          border: 'none',
          background: 'none',
          'padding-inline-start': '0',
          'padding-inline-end': '0',
        })}
        jslog=${VisualLogging.action('reveal-preloads').track({click: true})}>
        ${preloadsStatusSummary}
      </button>
    `;
    // clang-format on
  }

  function errors(): LitHtml.TemplateResult {
    const nErrors = i18nString(UIStrings.errors, {errorCount: 1});
    return html`
      <span
        style=${LitHtml.Directives.styleMap({
      color: 'var(--sys-color-error)',
    })}
      >
        ${nErrors}
      </span>
    `;
  }

  switch (ruleSet.errorType) {
    case undefined:
      return counts(preloadsStatusSummary, ruleSet);
    case Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject:
      return errors();
    case Protocol.Preload.RuleSetErrorType.InvalidRulesSkipped:
      return html`${errors()} ${counts(preloadsStatusSummary, ruleSet)}`;
  }
}
