// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

let autofillManagerInstance: AutofillManager;

export class AutofillManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #autoOpenViewSetting: Common.Settings.Setting<boolean>;
  #address: string = '';
  #filledFields: Protocol.Autofill.FilledField[] = [];
  #matches: Match[] = [];
  #autofillModel: SDK.AutofillModel.AutofillModel|null = null;

  private constructor() {
    super();
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.AutofillModel.AutofillModel, SDK.AutofillModel.Events.AddressFormFilled, this.#addressFormFilled, this,
        {scoped: true});
    this.#autoOpenViewSetting =
        Common.Settings.Settings.instance().createSetting('auto-open-autofill-view-on-event', true);
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): AutofillManager {
    const {forceNew} = opts;
    if (!autofillManagerInstance || forceNew) {
      autofillManagerInstance = new AutofillManager();
    }
    return autofillManagerInstance;
  }

  async #addressFormFilled(
      {data}: Common.EventTarget
          .EventTargetEvent<SDK.AutofillModel.EventTypes[SDK.AutofillModel.Events.AddressFormFilled]>): Promise<void> {
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.AUTOFILL_VIEW) &&
        this.#autoOpenViewSetting.get()) {
      await UI.ViewManager.ViewManager.instance().showView('autofill-view');
    }
    this.#autofillModel = data.autofillModel;
    this.#processAddressFormFilledData(data.event);
    if (this.#address) {
      this.dispatchEventToListeners(Events.AddressFormFilled, {
        address: this.#address,
        filledFields: this.#filledFields,
        matches: this.#matches,
        autofillModel: this.#autofillModel,
      });
    }
  }

  getLastFilledAddressForm(): AddressFormFilledEvent|null {
    if (!this.#address || !this.#autofillModel) {
      return null;
    }
    return {
      address: this.#address,
      filledFields: this.#filledFields,
      matches: this.#matches,
      autofillModel: this.#autofillModel,
    };
  }

  #processAddressFormFilledData({addressUi, filledFields}: Protocol.Autofill.AddressFormFilledEvent): void {
    // Transform addressUi into a single (multi-line) string.
    const concatAddressFields = (addressFields: Protocol.Autofill.AddressFields): string =>
        addressFields.fields.filter(field => field.value.length).map(field => field.value).join(' ');
    this.#address = addressUi.addressFields.map(addressFields => concatAddressFields(addressFields))
                        .filter(str => str.length)
                        .join('\n');

    this.#filledFields = filledFields;
    this.#matches = [];

    // Populate a list of matches by searching in the address string for
    // occurences of filled field values.
    for (let i = 0; i < this.#filledFields.length; i++) {
      if (this.#filledFields[i].value === '') {
        continue;
      }
      // Regex replaces whitespace or comma/dot followed by whitespace with a single space.
      const needle = this.#filledFields[i].value.replaceAll(/[.,]*\s+/g, ' ');
      const matches = this.#address.replaceAll(/\s/g, ' ').matchAll(new RegExp(needle, 'g'));
      for (const match of matches) {
        if (typeof match.index !== 'undefined') {
          this.#matches.push({startIndex: match.index, endIndex: match.index + match[0].length, filledFieldIndex: i});
        }
      }
    }
  }
}

// A Match describes how the value of a filled field corresponds to a substring
// of address from startIndex to endIndex.
export interface Match {
  startIndex: number;
  endIndex: number;
  filledFieldIndex: number;
}

export const enum Events {
  AddressFormFilled = 'AddressFormFilled',
}

export interface AddressFormFilledEvent {
  address: string;
  filledFields: Protocol.Autofill.FilledField[];
  matches: Match[];
  autofillModel: SDK.AutofillModel.AutofillModel;
}

export type EventTypes = {
  [Events.AddressFormFilled]: AddressFormFilledEvent,
};
