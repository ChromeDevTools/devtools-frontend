// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as ComponentHelpers from '../../ui/components/helpers/helpers.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import autofillViewStyles from './autofillView.css.js';

const UIStrings = {
  /**
   * @description Title placeholder text when no Autofill data is available.
   */
  noDataAvailable: 'No Autofill event detected',
};

const str_ = i18n.i18n.registerUIStrings('panels/autofill/AutofillView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AutofillView extends LegacyWrapper.LegacyWrapper.WrappableComponent implements
    SDK.TargetManager.SDKModelObserver<SDK.AutofillModel.AutofillModel> {
  static readonly litTagName = LitHtml.literal`devtools-autofill-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #addressUi: Protocol.Autofill.AddressUI|null = null;
  #filledFields: Protocol.Autofill.FilledField[] = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [autofillViewStyles];
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.AutofillModel.AutofillModel, this, {scoped: true});
    this.#render();
  }

  #render(): void {
    // clang-format off
    LitHtml.render(LitHtml.html`
      ${!this.#addressUi && !this.#filledFields.length ? LitHtml.html`
        <div class="container">
          <div class="placeholder">${i18nString(UIStrings.noDataAvailable)}</h1>
        </div>
      ` : LitHtml.nothing}
      ${this.#renderAddressUi()}
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderAddressUi(): LitHtml.LitTemplate {
    if (!this.#addressUi) {
      return LitHtml.nothing;
    }
    return LitHtml.html`
      <div class="address">
        ${this.#addressUi.addressFields.map(fields => this.#renderAddressRow(fields))}
      </div>
    `;
  }

  #renderAddressRow(fields: Protocol.Autofill.AddressFields): LitHtml.TemplateResult {
    return LitHtml.html`
      <div>${fields.fields.map(field => field.value).join(' ')}</div>
    `;
  }

  #addressFormFilled({data}: Common.EventTarget
                         .EventTargetEvent<SDK.AutofillModel.EventTypes[SDK.AutofillModel.Events.AddressFormFilled]>):
      void {
    ({addressUi: this.#addressUi, filledFields: this.#filledFields} = data.event);
    this.#render();
  }

  modelAdded(model: SDK.AutofillModel.AutofillModel): void {
    model.addEventListener(SDK.AutofillModel.Events.AddressFormFilled, this.#addressFormFilled, this);
  }

  modelRemoved(model: SDK.AutofillModel.AutofillModel): void {
    model.removeEventListener(SDK.AutofillModel.Events.AddressFormFilled, this.#addressFormFilled, this);
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-autofill-view', AutofillView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-autofill-view': AutofillView;
  }
}
