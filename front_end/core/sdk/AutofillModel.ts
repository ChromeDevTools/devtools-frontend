// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Host from '../host/host.js';

import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

export class AutofillModel extends SDKModel<EventTypes> implements ProtocolProxyApi.AutofillDispatcher {
  readonly agent: ProtocolProxyApi.AutofillApi;
  #enabled?: boolean;

  constructor(target: Target) {
    super(target);

    this.agent = target.autofillAgent();
    target.registerAutofillDispatcher(this);
    this.enable();
  }

  enable(): void {
    if (this.#enabled || Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    void this.agent.invoke_enable();
    void this.agent.invoke_setAddresses({
      addresses: [
        {
          fields: [
            {name: 'ADDRESS_HOME_COUNTRY', value: 'US'},
            {name: 'NAME_FULL', value: 'Jon Stewart Doe'},
            {name: 'NAME_FIRST', value: 'Jon'},
            {name: 'NAME_MIDDLE', value: 'Stewart'},
            {name: 'NAME_LAST', value: 'Doe'},
            {name: 'COMPANY_NAME', value: 'Google'},
            {name: 'ADDRESS_HOME_LINE1', value: '1600 Amphitheatre Parkway'},
            {name: 'ADDRESS_HOME_LINE2', value: 'Apartment 1'},
            {name: 'ADDRESS_HOME_ZIP', value: '94043'},
            {name: 'ADDRESS_HOME_CITY', value: 'Mountain View'},
            {name: 'ADDRESS_HOME_STATE', value: 'CA'},
            {name: 'EMAIL_ADDRESS', value: 'test@example.us'},
            {name: 'PHONE_HOME_WHOLE_NUMBER', value: '+16019521325'},
          ],
        },
        {
          fields: [
            {name: 'ADDRESS_HOME_COUNTRY', value: 'BR'},
            {name: 'NAME_FULL', value: 'João Souza Silva'},
            {name: 'NAME_FIRST', value: 'João'},
            {name: 'NAME_LAST', value: 'Souza Silva'},
            {name: 'NAME_LAST_FIRST', value: 'Souza'},
            {name: 'NAME_LAST_SECOND', value: 'Silva'},
            {name: 'COMPANY_NAME', value: 'Google'},
            {name: 'ADDRESS_HOME_STREET_ADDRESS', value: 'Av. dos Andradas, 3000\nAndar 2, Apartamento 1'},
            {name: 'ADDRESS_HOME_STREET_LOCATION', value: 'Av. dos Andradas, 3000'},
            {name: 'ADDRESS_HOME_STREET_NAME', value: 'Av. dos Andradas'},
            {name: 'ADDRESS_HOME_HOUSE_NUMBER', value: '3000'},
            {name: 'ADDRESS_HOME_SUBPREMISE', value: 'Andar 2, Apartamento 1'},
            {name: 'ADDRESS_HOME_APT_NUM', value: '1'},
            {name: 'ADDRESS_HOME_FLOOR', value: '2'},
            {name: 'ADDRESS_HOME_APT', value: 'Apartamento 1'},
            {name: 'ADDRESS_HOME_APT_TYPE', value: 'Apartamento'},
            {name: 'ADDRESS_HOME_APT_NUM', value: '1'},
            {name: 'ADDRESS_HOME_DEPENDENT_LOCALITY', value: 'Santa Efigênia'},
            {name: 'ADDRESS_HOME_LANDMARK', value: 'Próximo à estação Santa Efigênia'},
            {name: 'ADDRESS_HOME_OVERFLOW', value: 'Andar 2, Apartamento 1'},
            {name: 'ADDRESS_HOME_ZIP', value: '30260-070'},
            {name: 'ADDRESS_HOME_CITY', value: 'Belo Horizonte'},
            {name: 'ADDRESS_HOME_STATE', value: 'MG'},
            {name: 'EMAIL_ADDRESS', value: 'teste@exemplo.us'},
            {name: 'PHONE_HOME_WHOLE_NUMBER', value: '+553121286800'},
          ],
        },
        {
          fields: [
            {name: 'ADDRESS_HOME_COUNTRY', value: 'MX'},
            {name: 'NAME_FULL', value: 'Juan Francisco García Flores'},
            {name: 'NAME_FIRST', value: 'Juan Francisco'},
            {name: 'NAME_LAST', value: 'García Flores'},
            {name: 'NAME_LAST_FIRST', value: 'García'},
            {name: 'NAME_LAST_SECOND', value: 'Flores'},
            {name: 'COMPANY_NAME', value: 'Google'},
            {
              name: 'ADDRESS_HOME_STREET_ADDRESS',
              value:
                  'C. Montes Urales 445\nPiso 2, Apartamento 1\nEntre calle Volcán y calle Montes Celestes, cerca de la oficina de google',
            },
            {name: 'ADDRESS_HOME_STREET_LOCATION', value: 'C. Montes Urales 445'},
            {name: 'ADDRESS_HOME_STREET_NAME', value: 'C. Montes Urales'},
            {name: 'ADDRESS_HOME_HOUSE_NUMBER', value: '445'},
            {name: 'ADDRESS_HOME_SUBPREMISE', value: 'Piso 2, Apartamento 1'},
            {name: 'ADDRESS_HOME_FLOOR', value: '2'},
            {name: 'ADDRESS_HOME_APT', value: 'Apartamento 1'},
            {name: 'ADDRESS_HOME_APT_TYPE', value: 'Apartamento'},
            {name: 'ADDRESS_HOME_APT_NUM', value: '1'},
            {name: 'ADDRESS_HOME_DEPENDENT_LOCALITY', value: 'Lomas de Chapultepec'},
            {
              name: 'ADDRESS_HOME_OVERFLOW',
              value: 'Entre calle Volcán y calle Montes Celestes, cerca de la oficina de google',
            },
            {
              name: 'ADDRESS_HOME_BETWEEN_STREETS_OR_LANDMARK',
              value: 'Entre calle Volcán y calle Montes Celestes, cerca de la oficina de google',
            },
            {name: 'ADDRESS_HOME_LANDMARK', value: 'Cerca de la oficina de google'},
            {name: 'ADDRESS_HOME_BETWEEN_STREETS', value: 'Entre calle Volcán y calle Montes Celestes'},
            {name: 'ADDRESS_HOME_BETWEEN_STREETS_1', value: 'calle Volcán'},
            {name: 'ADDRESS_HOME_BETWEEN_STREETS_2', value: 'calle Montes Celestes'},
            {name: 'ADDRESS_HOME_ADMIN_LEVEL2', value: 'Miguel Hidalgo'},
            {name: 'ADDRESS_HOME_ZIP', value: '11000'},
            {name: 'ADDRESS_HOME_CITY', value: 'Ciudad de México'},
            {name: 'ADDRESS_HOME_STATE', value: 'Distrito Federal'},
            {name: 'EMAIL_ADDRESS', value: 'ejemplo@ejemplo.mx'},
            {name: 'PHONE_HOME_WHOLE_NUMBER', value: '+525553428400'},
          ],
        },
      ],
    });
    this.#enabled = true;
  }

  disable(): void {
    if (!this.#enabled || Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    this.#enabled = false;
    void this.agent.invoke_disable();
  }

  addressFormFilled(addressFormFilledEvent: Protocol.Autofill.AddressFormFilledEvent): void {
    this.dispatchEventToListeners(Events.AddressFormFilled, {autofillModel: this, event: addressFormFilledEvent});
  }
}

SDKModel.register(AutofillModel, {capabilities: Capability.DOM, autostart: true});

export const enum Events {
  AddressFormFilled = 'AddressFormFilled',
}

export interface AddressFormFilledEvent {
  autofillModel: AutofillModel;
  event: Protocol.Autofill.AddressFormFilledEvent;
}

export type EventTypes = {
  [Events.AddressFormFilled]: AddressFormFilledEvent,
};
