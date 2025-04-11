// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as Common from '../common/common.js';

import * as SDK from './sdk.js';

describeWithMockConnection('AutofillModel', () => {
  beforeEach(() => {
    Common.Settings.Settings.instance().createLocalSetting('show-test-addresses-in-autofill-menu-on-event', true);
  });

  it('can enable and disable the Autofill CDP domain', () => {
    const target = createTarget();
    const autofillModel = target.model(SDK.AutofillModel.AutofillModel);
    const enableSpy = sinon.spy(autofillModel!.agent, 'invoke_enable');
    const disableSpy = sinon.spy(autofillModel!.agent, 'invoke_disable');
    sinon.assert.notCalled(enableSpy);
    sinon.assert.notCalled(disableSpy);

    autofillModel!.disable();
    sinon.assert.notCalled(enableSpy);
    sinon.assert.calledOnce(disableSpy);
    disableSpy.resetHistory();

    autofillModel!.enable();
    sinon.assert.calledOnce(enableSpy);
    sinon.assert.notCalled(disableSpy);
  });

  it('sets test addresses by calling the Autofill backend', () => {
    const target = createTarget();
    const autofillModel = target.model(SDK.AutofillModel.AutofillModel);
    const setAddressSpy = sinon.spy(autofillModel!.agent, 'invoke_setAddresses');
    sinon.assert.notCalled(setAddressSpy);

    autofillModel!.disable();
    sinon.assert.notCalled(setAddressSpy);

    autofillModel!.enable();
    sinon.assert.calledOnce(setAddressSpy);
  });

  it('dispatches addressFormFilledEvent on autofill event', () => {
    const target = createTarget();
    const autofillModel = target.model(SDK.AutofillModel.AutofillModel);

    const dispatchedEvents: SDK.AutofillModel.AddressFormFilledEvent[] = [];
    autofillModel!.addEventListener(SDK.AutofillModel.Events.ADDRESS_FORM_FILLED, e => dispatchedEvents.push(e.data));

    const addressFormFilledEvent: Protocol.Autofill.AddressFormFilledEvent = {
      addressUi: {
        addressFields: [
          {
            fields: [
              {name: 'NAME_FULL', value: 'Crocodile Dundee'},
            ],
          },
        ],
      },
      filledFields: [
        {
          htmlType: 'text',
          id: 'input1',
          name: '',
          value: 'Crocodile',
          autofillType: 'First name',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
          fieldId: 1 as Protocol.DOM.BackendNodeId,
          frameId: '1' as Protocol.Page.FrameId,
        },
      ],
    };
    autofillModel!.addressFormFilled(addressFormFilledEvent);
    assert.lengthOf(dispatchedEvents, 1);
    assert.deepEqual(dispatchedEvents[0].event, addressFormFilledEvent);
  });
});
