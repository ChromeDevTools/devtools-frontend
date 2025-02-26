// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/components/icon_button/icon_button.js';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../../../network/forward/forward.js';
import * as PreloadingHelper from '../helper/helper.js';

import * as PreloadingString from './PreloadingString.js';
import ruleSetGridStylesRaw from './ruleSetGrid.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const ruleSetGridStyles = new CSSStyleSheet();
ruleSetGridStyles.replaceSync(ruleSetGridStylesRaw.cssContent);

const {html, Directives: {styleMap}} = Lit;

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
} as const;
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

  async #revealSpeculationRules(ruleSet: Protocol.Preload.RuleSet): Promise<void> {
    if (ruleSet.backendNodeId !== undefined) {
      await this.#revealSpeculationRulesInElements(ruleSet);
    } else if (ruleSet.url !== undefined && ruleSet.requestId) {
      await this.#revealSpeculationRulesInNetwork(ruleSet);
    }
  }

  async #revealSpeculationRulesInElements(ruleSet: Protocol.Preload.RuleSet): Promise<void> {
    assertNotNullOrUndefined(ruleSet.backendNodeId);

    const target = SDK.TargetManager.TargetManager.instance().scopeTarget();
    if (target === null) {
      return;
    }

    await Common.Revealer.reveal(new SDK.DOMModel.DeferredDOMNode(target, ruleSet.backendNodeId));
  }

  async #revealSpeculationRulesInNetwork(ruleSet: Protocol.Preload.RuleSet): Promise<void> {
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
  }

  async #revealAttemptViewWithFilter(ruleSet: Protocol.Preload.RuleSet): Promise<void> {
    await Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.AttemptViewWithFilter(ruleSet.id));
  }

  #render(): void {
    if (this.#data === null) {
      return;
    }

    const {rows, pageURL} = this.#data;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      Lit.render(html`
        <div class="ruleset-container" jslog=${VisualLogging.pane('preloading-rules')}>
          <devtools-data-grid striped @select=${this.#onRowSelected}>
            <table>
              <tr>
                <th id="rule-set" weight="20" sortable>
                  ${i18nString(UIStrings.ruleSet)}
                </th>
                <th id="status" weight="80" sortable>
                  ${i18nString(UIStrings.status)}
                </th>
              </tr>
              ${rows.map(({ruleSet, preloadsStatusSummary}) => {
                const location = PreloadingString.ruleSetLocationShort(ruleSet, pageURL);
                const revealInElements = ruleSet.backendNodeId !== undefined;
                const revealInNetwork = ruleSet.url !== undefined && ruleSet.requestId;
                return html`
                  <tr data-id=${ruleSet.id}>
                    <td>
                      ${revealInElements || revealInNetwork ? html`
                        <button class="link" role="link"
                            @click=${() => this.#revealSpeculationRules(ruleSet)}
                            title=${revealInElements ? i18nString(UIStrings.clickToOpenInElementsPanel)
                                                    : i18nString(UIStrings.clickToOpenInNetworkPanel)}
                            style=${styleMap({
                              border: 'none',
                              background: 'none',
                              color: 'var(--icon-link)',
                              cursor: 'pointer',
                              'text-decoration': 'underline',
                              'padding-inline-start': '0',
                              'padding-inline-end': '0',
                            })}
                            jslog=${VisualLogging
                                .action(revealInElements ? 'reveal-in-elements' : 'reveal-in-network')
                                .track({click: true})}
                          >
                            <devtools-icon name=${revealInElements ? 'code-circle' : 'arrow-up-down-circle'}
                              style=${styleMap({
                                color: 'var(--icon-link)',
                                width: '16px',
                                height: '16px',
                                'vertical-align': 'sub',
                              })}
                            ></devtools-icon>
                            ${location}
                          </button>`
                          : location}
                  </td>
                  <td>
                    ${ruleSet.errorType !== undefined ? html`
                      <span style=${styleMap({color: 'var(--sys-color-error)'})}>
                        ${i18nString(UIStrings.errors, {errorCount: 1})}
                      </span>` : ''}
                    ${ruleSet.errorType !== Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject ? html`
                      <button class="link" role="link"
                        @click=${() => this.#revealAttemptViewWithFilter(ruleSet)}
                        title=${i18nString(UIStrings.buttonRevealPreloadsAssociatedWithRuleSet)}
                        style=${styleMap({
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
                      </button>` : ''}
                  </td>
                </tr>
              `;})}
            </table>
          </devtools-data-grid>
        </div>
      `, this.#shadow, {host: this});
    // clang-format on
  }

  #onRowSelected(event: CustomEvent<HTMLElement>): void {
    const ruleSetId = event.detail.dataset.id;
    if (ruleSetId !== undefined) {
      this.dispatchEvent(new CustomEvent('select', {detail: ruleSetId}));
    }
  }
}

customElements.define('devtools-resources-ruleset-grid', RuleSetGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-ruleset-grid': RuleSetGrid;
  }
}
