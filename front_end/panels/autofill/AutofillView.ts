// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as AutofillManager from '../../models/autofill_manager/autofill_manager.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import * as DataGrid from '../../ui/components/data_grid/data_grid.js';
import * as ComponentHelpers from '../../ui/components/helpers/helpers.js';
import * as Input from '../../ui/components/input/input.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import autofillViewStyles from './autofillView.css.js';

const UIStrings = {
  /**
   * @description Title placeholder text when no Autofill data is available.
   */
  noDataAvailable: 'No Autofill event detected',
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
  autoShow: 'Open panel on autofill',
  /**
   * @description Aria text for the section of the autofill view containing a preview of the autofilled address.
   */
  addressPreview: 'Address preview',
  /**
   * @description Aria text for the section of the autofill view containing the info about the autofilled form fields.
   */
  formInspector: 'Form inspector',
};

const str_ = i18n.i18n.registerUIStrings('panels/autofill/AutofillView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AutofillView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  static readonly litTagName = LitHtml.literal`devtools-autofill-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);
  #autoOpenViewSetting?: Common.Settings.Setting<boolean>;
  #address: string = '';
  #filledFields: Protocol.Autofill.FilledField[] = [];
  #matches: AutofillManager.AutofillManager.Match[] = [];
  #highlightedMatches: AutofillManager.AutofillManager.Match[] = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, autofillViewStyles];
    const autofillManager = AutofillManager.AutofillManager.AutofillManager.instance();
    const formFilledEvent = autofillManager.getLastFilledAddressForm();
    if (formFilledEvent) {
      ({
        address: this.#address,
        filledFields: this.#filledFields,
        matches: this.#matches,
      } = formFilledEvent);
    }
    autofillManager.addEventListener(
        AutofillManager.AutofillManager.Events.AddressFormFilled, this.#onAddressFormFilled, this);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);
    this.#autoOpenViewSetting =
        Common.Settings.Settings.instance().createSetting('auto-open-autofill-view-on-event', true);

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #onPrimaryPageChanged(): void {
    this.#address = '';
    this.#filledFields = [];
    this.#matches = [];
    this.#highlightedMatches = [];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #onAddressFormFilled(
      {data}: Common.EventTarget.EventTargetEvent<AutofillManager.AutofillManager.AddressFormFilledEvent>): void {
    ({
      address: this.#address,
      filledFields: this.#filledFields,
      matches: this.#matches,
    } = data);
    this.#highlightedMatches = [];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  async #render(): Promise<void> {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('AutofillView render was not scheduled');
    }

    if (!this.#address && !this.#filledFields.length) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
        <main>
          <div class="top-right-corner">
            <label class="checkbox-label">
              <input type="checkbox" ?checked=${this.#autoOpenViewSetting?.get()} @change=${this.#onAutoOpenCheckboxChanged.bind(this)} jslog=${VisualLogging.toggle('auto-open').track({ change: true })}>
              <span>${i18nString(UIStrings.autoShow)}</span>
            </label>
          </div>
          <div class="placeholder-container" jslog=${VisualLogging.pane('autofill-empty')}>
            <div class="placeholder">${i18nString(UIStrings.noDataAvailable)}</h1>
          </div>
        </main>
      `, this.#shadow, {host: this});
      // clang-format on
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <main>
        <div class="content-container" jslog=${VisualLogging.pane('autofill')}>
          <div class="right-to-left" role="region" aria-label=${i18nString(UIStrings.addressPreview)}>
            <div class="label-container">
              <label class="checkbox-label">
                <input type="checkbox" ?checked=${this.#autoOpenViewSetting?.get()} @change=${this.#onAutoOpenCheckboxChanged.bind(this)} jslog=${VisualLogging.toggle('auto-open').track({ change: true })}>
                <span>${i18nString(UIStrings.autoShow)}</span>
              </label>
            </div>
            ${this.#renderAddress()}
          </div>
          ${this.#renderFilledFields()}
        </div>
      </main>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #onAutoOpenCheckboxChanged(e: Event): void {
    const {checked} = e.target as HTMLInputElement;
    this.#autoOpenViewSetting?.set(checked);
  }

  #renderAddress(): LitHtml.LitTemplate {
    if (!this.#address) {
      return LitHtml.nothing;
    }

    const createSpan = (startIndex: number, endIndex: number): LitHtml.TemplateResult => {
      const textContentLines = this.#address.substring(startIndex, endIndex).split('\n');
      const templateLines =
          textContentLines.map((line, i) => i === textContentLines.length - 1 ? line : LitHtml.html`${line}<br>`);

      const spanClasses = LitHtml.Directives.classMap({
        'matches-filled-field':
            this.#matches.filter(match => match.startIndex <= startIndex && match.endIndex > startIndex).length > 0,
        highlighted:
            this.#highlightedMatches.filter(match => match.startIndex <= startIndex && match.endIndex > startIndex)
                .length > 0,
      });

      return LitHtml.html`
        <span
          class=${spanClasses}
          @mouseenter=${() => this.#onSpanMouseEnter(startIndex)}
          @mouseleave=${this.#onSpanMouseLeave}
        >${templateLines}</span>`;
    };

    // Split the address string into multiple spans. Each span is connected to
    // 0 or more matches. This allows highlighting the corresponding grid rows
    // when hovering over a span. And vice versa finding the corresponding
    // spans to highlight when hovering over a grid line.
    const spans: LitHtml.TemplateResult[] = [];
    const matchIndices = new Set<number>([0, this.#address.length]);
    for (const match of this.#matches) {
      matchIndices.add(match.startIndex);
      matchIndices.add(match.endIndex);
    }
    const sortedMatchIndices = Array.from(matchIndices).sort((a, b) => a - b);
    for (let i = 0; i < sortedMatchIndices.length - 1; i++) {
      spans.push(createSpan(sortedMatchIndices[i], sortedMatchIndices[i + 1]));
    }

    return LitHtml.html`
      <div class="address">
        ${spans}
      </div>
    `;
  }

  #onSpanMouseEnter(startIndex: number): void {
    this.#highlightedMatches =
        this.#matches.filter(match => match.startIndex <= startIndex && match.endIndex > startIndex);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #onSpanMouseLeave(): void {
    this.#highlightedMatches = [];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #renderFilledFields(): LitHtml.LitTemplate {
    if (!this.#filledFields.length) {
      return LitHtml.nothing;
    }

    const gridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'name',
          title: i18nString(UIStrings.formField),
          widthWeighting: 50,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'autofill-type',
          title: i18nString(UIStrings.predictedAutofillValue),
          widthWeighting: 50,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'value',
          title: i18nString(UIStrings.value),
          widthWeighting: 50,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'filled-field-index',
          title: 'filledFieldIndex',
          widthWeighting: 50,
          hideable: true,
          visible: false,
        },
      ],
      rows: this.#buildReportRows(),
      striped: true,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <div class="grid-wrapper" role="region" aria-label=${i18nString(UIStrings.formInspector)}>
        <${DataGrid.DataGridController.DataGridController.litTagName}
          @rowmouseenter=${this.#onGridRowMouseEnter}
          @rowmouseleave=${this.#onGridRowMouseLeave}
          class="filled-fields-grid"
          .data=${gridData as DataGrid.DataGridController.DataGridControllerData}
        >
        </${DataGrid.DataGridController.DataGridController.litTagName}>
      </div>
    `;
    // clang-format on
  }

  #onGridRowMouseEnter(event: DataGrid.DataGridEvents.RowMouseEnterEvent): void {
    const rowIndex = event.data.row.cells[3].value;
    if (typeof rowIndex !== 'number') {
      return;
    }
    this.#highlightedMatches = this.#matches.filter(match => match.filledFieldIndex === rowIndex);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);

    const backendNodeId = this.#filledFields[rowIndex].fieldId;
    const target = SDK.FrameManager.FrameManager.instance()
                       .getFrame(this.#filledFields[rowIndex].frameId)
                       ?.resourceTreeModel()
                       .target();
    if (target) {
      const deferredNode = new SDK.DOMModel.DeferredDOMNode(target, backendNodeId);
      const domModel = target.model(SDK.DOMModel.DOMModel);
      if (deferredNode && domModel) {
        domModel.overlayModel().highlightInOverlay({deferredNode}, 'all');
      }
    }
  }

  #onGridRowMouseLeave(): void {
    this.#highlightedMatches = [];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }

  #buildReportRows(): DataGrid.DataGridUtils.Row[] {
    const highlightedGridRows = new Set(this.#highlightedMatches.map(match => match.filledFieldIndex));

    return this.#filledFields.map(
        (field, index) => {
          const fieldName = field.name || `#${field.id}`;
          return {
            cells: [
              {columnId: 'name', value: `${fieldName} (${field.htmlType})`},
              {
                columnId: 'autofill-type',
                value: field.autofillType,
                renderer: () => this.#autofillTypeRenderer(field.autofillType, field.fillingStrategy),
              },
              {columnId: 'value', value: `"${field.value}"`},
              {columnId: 'filled-field-index', value: index},
            ],
            styles: {
              'font-family': 'var(--monospace-font-family)',
              'font-size': 'var(--monospace-font-size)',
              ...(highlightedGridRows.has(index) && {'background-color': 'var(--sys-color-state-hover-on-subtle)'}),
            },
          };
        },
    );
  }

  #autofillTypeRenderer(autofillType: string, fillingStrategy: Protocol.Autofill.FillingStrategy):
      LitHtml.TemplateResult {
    const adornerContent = document.createElement('span');
    let adornerTitle = '';
    switch (fillingStrategy) {
      case Protocol.Autofill.FillingStrategy.AutocompleteAttribute:
        adornerContent.textContent = i18nString(UIStrings.attr);
        adornerTitle = i18nString(UIStrings.autocompleteAttribute);
        break;
      case Protocol.Autofill.FillingStrategy.AutofillInferred:
        adornerContent.textContent = i18nString(UIStrings.heur);
        adornerTitle = i18nString(UIStrings.inferredByHeuristics);
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      ${autofillType}
      ${adornerContent.textContent ? LitHtml.html`
          <${Adorners.Adorner.Adorner.litTagName} title=${adornerTitle} .data=${{name: fillingStrategy, content: adornerContent} as Adorners.Adorner.AdornerData}>
        `: LitHtml.nothing}
    `;
    // clang-format on
  }
}

customElements.define('devtools-autofill-view', AutofillView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-autofill-view': AutofillView;
  }
}
