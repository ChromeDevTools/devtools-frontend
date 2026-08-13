// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/kit/kit.js';
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import { assertNotNullOrUndefined } from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../../../network/forward/forward.js';
import * as PreloadingHelper from '../helper/helper.js';
import * as PreloadingString from './PreloadingString.js';
import ruleSetGridStyles from './ruleSetGrid.css.js';
const { styleMap } = Directives;
const UIStrings = {
    /**
     * @description Column header: Short URL of rule set.
     */
    ruleSet: 'Rule set',
    /**
     * @description Column header: Show how many preloads are associated if valid, error counts if invalid.
     */
    status: 'Status',
    /**
     * @description button: Title of button to reveal the corresponding request of rule set in Elements panel
     */
    clickToOpenInElementsPanel: 'Click to open in Elements panel',
    /**
     * @description button: Title of button to reveal the corresponding request of rule set in Network panel
     */
    clickToOpenInNetworkPanel: 'Click to open in Network panel',
    /**
     * @description Value of status, specifying rule set contains how many errors.
     */
    errors: '{errorCount, plural, =1 {# error} other {# errors}}',
    /**
     * @description button: Title of button to reveal preloading attempts with filter by selected rule set
     */
    buttonRevealPreloadsAssociatedWithRuleSet: 'Reveal speculative loads associated with this rule set',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/RuleSetGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    let template = nothing;
    if (input.data !== null) {
        const { rows, pageURL } = input.data;
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        template =
            html `
          <style>${ruleSetGridStyles}</style>
          <div class="ruleset-container" jslog=${VisualLogging.pane('preloading-rules')}>
            <devtools-data-grid striped>
              <table>
                <tr>
                  <th id="rule-set" weight="20" sortable>
                    ${i18nString(UIStrings.ruleSet)}
                  </th>
                  <th id="status" weight="80" sortable>
                    ${i18nString(UIStrings.status)}
                  </th>
                </tr>
                ${rows.map(({ ruleSet, preloadsStatusSummary }) => {
                const location = PreloadingString.ruleSetTagOrLocationShort(ruleSet, pageURL);
                const revealInElements = ruleSet.backendNodeId !== undefined;
                const revealInNetwork = ruleSet.url !== undefined && ruleSet.requestId;
                return html `
                    <tr @select=${() => input.onSelect(ruleSet.id)}>
                      <td>
                        ${revealInElements || revealInNetwork ? html `
                          <button class="link" role="link"
                              @click=${() => {
                    if (revealInElements) {
                        input.onRevealInElements(ruleSet);
                    }
                    else {
                        input.onRevealInNetwork(ruleSet);
                    }
                }}
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
                    .track({ click: true })}
                            >
                              <devtools-icon name=${revealInElements ? 'code-circle' : 'arrow-up-down-circle'} class="medium"
                                style=${styleMap({
                    color: 'var(--icon-link)',
                    'vertical-align': 'sub',
                })}
                              ></devtools-icon>
                              ${location}
                            </button>`
                    : location}
                    </td>
                    <td>
                      ${ruleSet.errorType !== undefined ? html `
                        <span style=${styleMap({ color: 'var(--sys-color-error)' })}>
                          ${i18nString(UIStrings.errors, { errorCount: 1 })}
                        </span>` : ''} ${ruleSet.errorType !== "SourceIsNotJsonObject" /* Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject */ &&
                    ruleSet.errorType !== "InvalidRulesetLevelTag" /* Protocol.Preload.RuleSetErrorType.InvalidRulesetLevelTag */ ?
                    html `
                        <button class="link" role="link"
                          @click=${() => input.onRevealPreloadsAssociatedWithRuleSet(ruleSet)}
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
                          jslog=${VisualLogging.action('reveal-preloads').track({ click: true })}>
                          ${preloadsStatusSummary}
                        </button>` : ''}
                    </td>
                  </tr>
                `;
            })}
              </table>
            </devtools-data-grid>
          </div>`;
        // clang-format on
    }
    render(template, target);
};
/** Grid component to show SpeculationRules rule sets. **/
export class RuleSetGrid extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    #view;
    #data = null;
    constructor(view = DEFAULT_VIEW) {
        super({ useShadowDom: true });
        this.#view = view;
    }
    get data() {
        return this.#data;
    }
    set data(data) {
        this.#data = data;
        this.requestUpdate();
    }
    performUpdate() {
        const input = {
            data: this.#data,
            onSelect: this.dispatchEventToListeners.bind(this, "select" /* Events.SELECT */),
            onRevealInElements: this.#revealSpeculationRulesInElements.bind(this),
            onRevealInNetwork: this.#revealSpeculationRulesInNetwork.bind(this),
            onRevealPreloadsAssociatedWithRuleSet: this.#revealAttemptViewWithFilter.bind(this),
        };
        const output = undefined;
        this.#view(input, output, this.contentElement);
    }
    #revealSpeculationRulesInElements(ruleSet) {
        assertNotNullOrUndefined(ruleSet.backendNodeId);
        const target = SDK.TargetManager.TargetManager.instance().scopeTarget();
        if (target === null) {
            return;
        }
        void Common.Revealer.reveal(new SDK.DOMModel.DeferredDOMNode(target, ruleSet.backendNodeId));
    }
    #revealSpeculationRulesInNetwork(ruleSet) {
        assertNotNullOrUndefined(ruleSet.requestId);
        const request = SDK.TargetManager.TargetManager.instance()
            .scopeTarget()
            ?.model(SDK.NetworkManager.NetworkManager)
            ?.requestForId(ruleSet.requestId) ||
            null;
        if (request === null) {
            return;
        }
        const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(request, "preview" /* NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW */, { clearFilter: false });
        void Common.Revealer.reveal(requestLocation);
    }
    #revealAttemptViewWithFilter(ruleSet) {
        void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.AttemptViewWithFilter(ruleSet.id));
    }
}
//# sourceMappingURL=RuleSetGrid.js.map