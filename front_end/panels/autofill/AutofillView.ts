// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../ui/components/adorners/adorners.js';
import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as AutofillManager from '../../models/autofill_manager/autofill_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import autofillViewStyles from './autofillView.css.js';

const {html, render, Directives: {styleMap}} = Lit;
const {FillingStrategy} = Protocol.Autofill;
const {bindToSetting} = UI.SettingsUI;

const UIStrings = {
  /**
   * @description Text shown when there is no data on autofill available.
   */
  noAutofill: 'No autofill detected',
  /**
   * @description Explanation for how to populate the autofill panel with data. Shown when there is
   * no data available.
   */
  toStartDebugging: 'To start debugging autofill, use Chrome\'s autofill menu to fill an address form.',
  /**
   * @description Column header for column containing form field values
   */
  value: 'Value',
  /**
   * @description Column header for column containing the predicted autofill categories
   */
  predictedAutofillValue: 'Predicted autofill value',
  /**
   * @description Column header for column containing the name/label/id of form fields
   */
  formField: 'Form field',
  /**
   * @description Tooltip for an adorner for form fields which have an autocomplete attribute
   * (http://go/mdn/HTML/Attributes/autocomplete)
   */
  autocompleteAttribute: 'Autocomplete attribute',
  /**
   * @description Abbreviation of 'attribute'. Text content of an adorner for form fields which
   * have an autocomplete attribute (http://go/mdn/HTML/Attributes/autocomplete)
   */
  attr: 'attr',
  /**
   * @description Tooltip for an adorner for form fields which don't have an autocomplete attribute
   * (http://go/mdn/HTML/Attributes/autocomplete) and for which Chrome used heuristics to deduce
   * the form field's autocomplete category.
   */
  inferredByHeuristics: 'Inferred by heuristics',
  /**
   * @description Abbreviation of 'heuristics'. Text content of an adorner for form fields which
   * don't have an autocomplete attribute (http://go/mdn/HTML/Attributes/autocomplete) and for
   * which Chrome used heuristics to deduce the form field's autocomplete category.
   */
  heur: 'heur',
  /**
   * @description Label for checkbox in the Autofill panel. If checked, this panel will open
   * automatically whenever a form is being autofilled.
   */
  autoShow: 'Automatically open this panel',
  /**
   * @description Label for checkbox in the Autofill panel. If checked, test addresses will be added to the Autofill popup.
   */
  showTestAddressesInAutofillMenu: 'Show test addresses in autofill menu',
  /**
   * @description Tooltip text for a checkbox label in the Autofill panel. If checked, this panel
   * will open automatically whenever a form is being autofilled.
   */
  autoShowTooltip: 'Open the autofill panel automatically when an autofill activity is detected.',
  /**
   * @description Aria text for the section of the autofill view containing a preview of the autofilled address.
   */
  addressPreview: 'Address preview',
  /**
   * @description Aria text for the section of the autofill view containing the info about the autofilled form fields.
   */
  formInspector: 'Form inspector',
  /**
   * @description Link text for a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   * @description Link text for a hyperlink to webpage for leaving user feedback
   */
  sendFeedback: 'Send feedback',
} as const;

const AUTOFILL_INFO_URL = 'https://goo.gle/devtools-autofill-panel' as Platform.DevToolsPath.UrlString;
const AUTOFILL_FEEDBACK_URL = 'https://crbug.com/329106326' as Platform.DevToolsPath.UrlString;

const str_ = i18n.i18n.registerUIStrings('panels/autofill/AutofillView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  autoOpenViewSetting: Common.Settings.Setting<boolean>;
  showTestAddressesInAutofillMenuSetting: Common.Settings.Setting<boolean>;

  address: string;
  filledFields: Protocol.Autofill.FilledField[];
  matches: AutofillManager.AutofillManager.Match[];
  highlightedMatches: AutofillManager.AutofillManager.Match[];

  onHighlightMatchesInAddress: (startIndex: number) => void;
  onHighlightMatchesInFilledFiels: (rowIndex: number) => void;
  onClearHighlightedMatches: () => void;
}

type ViewOutput = unknown;

type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const renderAddress = (): Lit.LitTemplate => {
    const createSpan = (startIndex: number, endIndex: number): Lit.TemplateResult => {
      const textContentLines = input.address.substring(startIndex, endIndex).split('\n');
      const templateLines =
          textContentLines.map((line, i) => i === textContentLines.length - 1 ? line : html`${line}<br>`);
      const hasMatches = input.matches.some(match => match.startIndex <= startIndex && match.endIndex > startIndex);

      if (!hasMatches) {
        return html`<span>${templateLines}</span>`;
      }

      const spanClasses = Lit.Directives.classMap({
        'matches-filled-field': hasMatches,
        highlighted:
            input.highlightedMatches.some(match => match.startIndex <= startIndex && match.endIndex > startIndex),
      });
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      return html`
        <span class=${spanClasses}
              jslog=${VisualLogging.item('matched-address-item').track({hover: true})}
              @mouseenter=${() => input.onHighlightMatchesInAddress(startIndex)}
              @mouseleave=${input.onClearHighlightedMatches}>
          ${templateLines}
        </span>`;
      // clang-format on
    };

    // Split the address string into multiple spans. Each span is connected to
    // 0 or more matches. This allows highlighting the corresponding grid rows
    // when hovering over a span. And vice versa finding the corresponding
    // spans to highlight when hovering over a grid line.
    const spans: Lit.TemplateResult[] = [];
    const matchIndices = new Set<number>([0, input.address.length]);
    for (const match of input.matches) {
      matchIndices.add(match.startIndex);
      matchIndices.add(match.endIndex);
    }
    const sortedMatchIndices = Array.from(matchIndices).sort((a, b) => a - b);
    for (let i = 0; i < sortedMatchIndices.length - 1; i++) {
      spans.push(createSpan(sortedMatchIndices[i], sortedMatchIndices[i + 1]));
    }

    return html`
      <div class="address">
        ${spans}
      </div>
    `;
  };

  const renderFilledFields = (): Lit.LitTemplate => {
    const highlightedGridRows = new Set(input.highlightedMatches.map(match => match.filledFieldIndex));
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="grid-wrapper" role="region" aria-label=${i18nString(UIStrings.formInspector)}>
        <devtools-data-grid striped
                            class="filled-fields-grid">
          <table>
            <tr>
              <th id="name" weight="50" sortable>${i18nString(UIStrings.formField)}</th>
              <th id="autofill-type" weight="50" sortable>${i18nString(UIStrings.predictedAutofillValue)}</th>
              <th id="value" weight="50" sortable>${i18nString(UIStrings.value)}</th>
            </tr>
            ${input.filledFields.map((field, index) => html`
                <tr style=${styleMap({
                            'font-family': 'var(--monospace-font-family)',
                            'font-size': 'var(--monospace-font-size)',
                            'background-color': highlightedGridRows.has(index) ? 'var(--sys-color-state-hover-on-subtle)' : null})}
                    @mouseenter=${() => input.onHighlightMatchesInFilledFiels(index)}
                    @mouseleave=${input.onClearHighlightedMatches}>
                  <td>${field.name || `#${field.id}`} (${field.htmlType})</td>
                  <td>
                      ${field.autofillType}
                      ${field.fillingStrategy === FillingStrategy.AutocompleteAttribute ?
                            html`<devtools-adorner title=${i18nString(UIStrings.autocompleteAttribute)} .data=${{name: field.fillingStrategy}}>
                              <span>${i18nString(UIStrings.attr)}</span>
                            </devtools-adorner>` :
                        field.fillingStrategy === FillingStrategy.AutofillInferred ?
                            html`<devtools-adorner title=${i18nString(UIStrings.inferredByHeuristics)} .data=${{name: field.fillingStrategy}}>
                              <span>${i18nString(UIStrings.heur)}</span>
                            </devtools-adorner>` :
                            Lit.nothing}
                  </td>
                  <td>"${field.value}"</td>
                </tr>`
            )}
          </table>
        </devtools-data-grid>
      </div>
    `;
    // clang-format on
  };

  if (!input.address && !input.filledFields.length) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      render(html`
        <style>${autofillViewStyles}</style>
        <style>${UI.inspectorCommonStyles}</style>
        <main>
          <div class="top-left-corner">
            <devtools-checkbox
                ${bindToSetting(input.showTestAddressesInAutofillMenuSetting)}
                title=${i18nString(UIStrings.showTestAddressesInAutofillMenu)}
                jslog=${VisualLogging.toggle(input.showTestAddressesInAutofillMenuSetting.name).track({ change: true })}>
              ${i18nString(UIStrings.showTestAddressesInAutofillMenu)}
            </devtools-checkbox>
            <devtools-checkbox
                ${bindToSetting(input.autoOpenViewSetting)}
                title=${i18nString(UIStrings.autoShowTooltip)}
                jslog=${VisualLogging.toggle(input.autoOpenViewSetting.name).track({ change: true })}>
              ${i18nString(UIStrings.autoShow)}
            </devtools-checkbox>
            <x-link href=${AUTOFILL_FEEDBACK_URL} class="feedback link" jslog=${VisualLogging.link('feedback').track({click: true})}>${i18nString(UIStrings.sendFeedback)}</x-link>
          </div>
          <div class="placeholder-container" jslog=${VisualLogging.pane('autofill-empty')}>
            <div class="empty-state">
              <span class="empty-state-header">${i18nString(UIStrings.noAutofill)}</span>
              <div class="empty-state-description">
                <span>${i18nString(UIStrings.toStartDebugging)}</span>
                <x-link href=${AUTOFILL_INFO_URL} class="link" jslog=${VisualLogging.link('learn-more').track({click: true})}>${i18nString(UIStrings.learnMore)}</x-link>
              </div>
            </div>
          </div>
        </main>
      `, target, {host: this});
    // clang-format on
    return;
  }

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    render(html`
      <style>${autofillViewStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      <main>
        <div class="content-container" jslog=${VisualLogging.pane('autofill')}>
          <div class="right-to-left" role="region" aria-label=${i18nString(UIStrings.addressPreview)}>
            <div class="header">
              <div class="label-container">
                <devtools-checkbox
                    ${bindToSetting(input.showTestAddressesInAutofillMenuSetting)}
                    title=${i18nString(UIStrings.showTestAddressesInAutofillMenu)}
                    jslog=${VisualLogging.toggle(input.showTestAddressesInAutofillMenuSetting.name).track({ change: true })}>
                  ${i18nString(UIStrings.showTestAddressesInAutofillMenu)}
                </devtools-checkbox>
              </div>
              <div class="label-container">
                <devtools-checkbox
                    ${bindToSetting(input.autoOpenViewSetting)}
                    title=${i18nString(UIStrings.autoShowTooltip)}
                    jslog=${VisualLogging.toggle(input.autoOpenViewSetting.name).track({ change: true })}>
                  ${i18nString(UIStrings.autoShow)}
                </devtools-checkbox>
              </div>
              <x-link href=${AUTOFILL_FEEDBACK_URL} class="feedback link" jslog=${VisualLogging.link('feedback').track({click: true})}>${i18nString(UIStrings.sendFeedback)}</x-link>
            </div>
            ${renderAddress()}
          </div>
          ${renderFilledFields()}
        </div>
      </main>
    `, target, {host: this});
  // clang-format on
};

export class AutofillView extends UI.Widget.VBox {
  readonly #view: View;
  readonly #autofillManager: AutofillManager.AutofillManager.AutofillManager;
  #autoOpenViewSetting: Common.Settings.Setting<boolean>;
  #showTestAddressesInAutofillMenuSetting: Common.Settings.Setting<boolean>;
  #address = '';
  #filledFields: Protocol.Autofill.FilledField[] = [];
  #matches: AutofillManager.AutofillManager.Match[] = [];
  #highlightedMatches: AutofillManager.AutofillManager.Match[] = [];

  constructor(autofillManager = AutofillManager.AutofillManager.AutofillManager.instance(), view = DEFAULT_VIEW) {
    super({useShadowDom: true});
    this.#autofillManager = autofillManager;
    this.#view = view;
    this.#autoOpenViewSetting =
        Common.Settings.Settings.instance().createSetting('auto-open-autofill-view-on-event', true);
    this.#showTestAddressesInAutofillMenuSetting =
        Common.Settings.Settings.instance().createSetting('show-test-addresses-in-autofill-menu-on-event', false);
  }

  override wasShown(): void {
    super.wasShown();

    const formFilledEvent = this.#autofillManager.getLastFilledAddressForm();
    if (formFilledEvent) {
      ({
        address: this.#address,
        filledFields: this.#filledFields,
        matches: this.#matches,
      } = formFilledEvent);
    }
    this.#autofillManager.addEventListener(
        AutofillManager.AutofillManager.Events.ADDRESS_FORM_FILLED, this.#onAddressFormFilled, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);

    this.requestUpdate();
  }

  override willHide(): void {
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);
    this.#autofillManager.removeEventListener(
        AutofillManager.AutofillManager.Events.ADDRESS_FORM_FILLED, this.#onAddressFormFilled, this);

    super.willHide();
  }

  #onPrimaryPageChanged(): void {
    this.#address = '';
    this.#filledFields = [];
    this.#matches = [];
    this.#highlightedMatches = [];
    this.requestUpdate();
  }

  #onAddressFormFilled(
      {data}: Common.EventTarget.EventTargetEvent<AutofillManager.AutofillManager.AddressFormFilledEvent>): void {
    ({
      address: this.#address,
      filledFields: this.#filledFields,
      matches: this.#matches,
    } = data);
    this.#highlightedMatches = [];
    this.requestUpdate();
  }

  override performUpdate(): Promise<void>|void {
    const onHighlightMatchesInAddress = (startIndex: number): void => {
      this.#highlightedMatches =
          this.#matches.filter(match => match.startIndex <= startIndex && match.endIndex > startIndex);
      this.requestUpdate();
    };
    const onHighlightMatchesInFilledFiels = (rowIndex: number): void => {
      this.#autofillManager.highlightFilledField(this.#filledFields[rowIndex]);
      this.#highlightedMatches = this.#matches.filter(match => match.filledFieldIndex === rowIndex);
      this.requestUpdate();
    };
    const onClearHighlightedMatches = (): void => {
      this.#autofillManager.clearHighlightedFilledFields();
      this.#highlightedMatches = [];
      this.requestUpdate();
    };

    const input: ViewInput = {
      autoOpenViewSetting: this.#autoOpenViewSetting,
      showTestAddressesInAutofillMenuSetting: this.#showTestAddressesInAutofillMenuSetting,

      address: this.#address,
      filledFields: this.#filledFields,
      matches: this.#matches,
      highlightedMatches: this.#highlightedMatches,

      onHighlightMatchesInAddress,
      onHighlightMatchesInFilledFiels,
      onClearHighlightedMatches,
    };
    const output: ViewOutput = undefined;
    this.#view(input, output, this.contentElement);
  }
}
