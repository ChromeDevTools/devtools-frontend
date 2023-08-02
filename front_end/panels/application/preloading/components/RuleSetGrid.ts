// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as DataGrid from '../../../../ui/components/data_grid/data_grid.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import type * as UI from '../../../../ui/legacy/legacy.js';

import * as PreloadingHelper from '../helper/helper.js';

import ruleSetGridStyles from './ruleSetGrid.css.js';

const UIStrings = {
  /**
   *@description Column header for a table displaying rule sets: Indicates a rule set contains errors.
   */
  validity: 'Validity',
  /**
   *@description Column header for a table displaying rule sets: Where a rule set came from.
   */
  location: 'Location',
  /**
   *@description Column header for a table displaying rule sets: How many preloads are associated.
   */
  preloads: 'Preloads',
  /**
   *@description button: Title of button to reveal preloading attempts with filter by selected rule set
   */
  buttonRevealPreloadsAssociatedWithRuleSet: 'Reveal preloeads associated with this rule set',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/RuleSetGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface RuleSetGridRow {
  id: string;
  processLocalId: string;
  preloadsStatusSummary: string;
  ruleSetId: Protocol.Preload.RuleSetId;
  validity: string;
  location: string;
}

// Grid component to show SpeculationRules rule sets.
export class RuleSetGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
  static readonly litTagName = LitHtml.literal`devtools-resources-ruleset-grid`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #rows: RuleSetGridRow[] = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [ruleSetGridStyles];
    this.#render();
  }

  update(rows: RuleSetGridRow[]): void {
    this.#rows = rows;
    this.#render();
  }

  #render(): void {
    const reportsGridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'processLocalId',
          title: i18n.i18n.lockedString('#'),
          widthWeighting: 5,
          hideable: false,
          visible: true,
        },
        {
          id: 'validity',
          title: i18nString(UIStrings.validity),
          widthWeighting: 10,
          hideable: false,
          visible: true,
        },
        {
          id: 'location',
          title: i18nString(UIStrings.location),
          widthWeighting: 80,
          hideable: false,
          visible: true,
        },
        {
          id: 'preloadsStatusSummary',
          title: i18nString(UIStrings.preloads),
          widthWeighting: 80,
          hideable: false,
          visible: true,
        },
      ],
      rows: this.#buildReportRows(),
      striped: true,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="ruleset-container">
        <${DataGrid.DataGridController.DataGridController.litTagName} .data=${
            reportsGridData as DataGrid.DataGridController.DataGridControllerData}>
        </${DataGrid.DataGridController.DataGridController.litTagName}>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #buildReportRows(): DataGrid.DataGridUtils.Row[] {
    function preloadsStatusSummaryRenderer(
        preloadsStatusSummary: string, ruleSetId: Protocol.Preload.RuleSetId): LitHtml.TemplateResult {
      const revealAttemptViewWithFilter = (): void => {
        void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.AttemptViewWithFilter(ruleSetId));
      };

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      return LitHtml.html`
          <div>
            <button class="link" role="link"
              @click=${revealAttemptViewWithFilter}
              title=${i18nString(UIStrings.buttonRevealPreloadsAssociatedWithRuleSet)}
              style=${LitHtml.Directives.styleMap({
                color: 'var(--color-link)',
                'text-decoration': 'underline',
                padding: '0',
                border: 'none',
                background: 'none',
                'font-family': 'inherit',
                'font-size': 'inherit',
                height: '16px',
              })}
            >
              <${IconButton.Icon.Icon.litTagName}
                .data=${{
                  iconName: 'open-externally',
                  color: 'var(--icon-link)',
                  width: '16px',
                  height: '16px',
                } as IconButton.Icon.IconData}
                style=${LitHtml.Directives.styleMap({
                  'vertical-align': 'sub',
                })}
              >
              </${IconButton.Icon.Icon.litTagName}>
              ${preloadsStatusSummary}
            </button>
          </div>
      `;
      // clang-format on
    }

    return this.#rows.map(row => ({
                            cells: [
                              {columnId: 'id', value: row.id},
                              {columnId: 'processLocalId', value: row.processLocalId},
                              {
                                columnId: 'preloadsStatusSummary',
                                value: row.preloadsStatusSummary,
                                renderer: () => preloadsStatusSummaryRenderer(row.preloadsStatusSummary, row.ruleSetId),
                              },
                              {columnId: 'validity', value: row.validity},
                              {columnId: 'location', value: row.location},
                            ],
                          }));
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-resources-ruleset-grid', RuleSetGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-ruleset-grid': RuleSetGrid;
  }
}
