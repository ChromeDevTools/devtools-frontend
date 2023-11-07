// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Autofill from '../../../../../front_end/panels/autofill/autofill.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('AutofillView', () => {
  let target: SDK.Target.Target;
  let view: Autofill.AutofillView.AutofillView;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
  });

  it('renders autofilled address', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const model = target.model(SDK.AutofillModel.AutofillModel);
    assertNotNullOrUndefined(model);

    view = new Autofill.AutofillView.AutofillView();
    renderElementIntoDOM(view);
    await view.render();
    assertShadowRoot(view.shadowRoot);
    const placeholderText = view.shadowRoot.querySelector('.placeholder')?.textContent?.trim();
    assert.strictEqual(placeholderText, 'No Autofill event detected');

    model.addressFormFilled({
      addressUi: {
        addressFields: [
          {
            fields: [
              {name: 'NAME_FULL', value: 'Crocodile Dundee'},
            ],
          },
          {
            fields: [
              {name: 'COMPANY_NAME', value: 'Uluru Tours'},
            ],
          },
          {
            fields: [
              {name: 'ADDRESS_HOME_STREET_ADDRESS', value: 'Outback Road 1'},
            ],
          },
          {
            fields: [
              {name: 'ADDRESS_HOME_CITY', value: 'Bundaberg'},
              {name: 'ADDRESS_HOME_STATE', value: 'Queensland'},
              {name: 'ADDRESS_HOME_ZIP', value: '12345'},
            ],
          },
        ],
      },
      filledFields: [],
    });

    const addressDivs = view.shadowRoot.querySelectorAll('.address div');
    const addressLines = [...addressDivs].map(div => div.textContent);
    assert.deepStrictEqual(
        addressLines, ['Crocodile Dundee', 'Uluru Tours', 'Outback Road 1', 'Bundaberg Queensland 12345']);
  });
});
