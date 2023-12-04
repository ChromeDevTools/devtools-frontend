// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as AutofillManager from '../../../../../front_end/models/autofill_manager/autofill_manager.js';

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';

describeWithMockConnection('AutofillManager', () => {
  let target: SDK.Target.Target;
  let model: SDK.AutofillModel.AutofillModel;

  beforeEach(() => {
    target = createTarget();
    const maybeModel = target.model(SDK.AutofillModel.AutofillModel);
    assertNotNullOrUndefined(maybeModel);
    model = maybeModel;
  });

  it('re-emits autofill events from autofill model', async () => {
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    const autofillManager = AutofillManager.AutofillManager.AutofillManager.instance();
    const dispatchedAutofillEvents: SDK.AutofillModel.AddressFormFilledEvent[] = [];
    autofillManager.addEventListener(
        AutofillManager.AutofillManager.Events.AddressFormFilled, event => dispatchedAutofillEvents.push(event.data));

    const addressFormFilledEvent = {
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
        },
      ],
    };
    model.dispatchEventToListeners(
        SDK.AutofillModel.Events.AddressFormFilled, {autofillModel: model, event: addressFormFilledEvent});
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    assert.strictEqual(dispatchedAutofillEvents.length, 1);
    assert.deepStrictEqual(dispatchedAutofillEvents[0].event, addressFormFilledEvent);
    showViewStub.restore();
  });
});
