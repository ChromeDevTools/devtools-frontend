// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Autofill from '../../../../../front_end/panels/autofill/autofill.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertGridContents} from '../../ui/components/DataGridHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

describeWithMockConnection('AutofillView', () => {
  let target: SDK.Target.Target;
  let view: Autofill.AutofillView.AutofillView;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
  });

  it('renders autofilled address and filled fields and resets on navigation', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const autofillModel = target.model(SDK.AutofillModel.AutofillModel);
    assertNotNullOrUndefined(autofillModel);

    view = new Autofill.AutofillView.AutofillView();
    renderElementIntoDOM(view);
    await view.render();
    await coordinator.done();
    assertShadowRoot(view.shadowRoot);
    let placeholderText = view.shadowRoot.querySelector('.placeholder')?.textContent?.trim();
    assert.strictEqual(placeholderText, 'No Autofill event detected');

    autofillModel.addressFormFilled({
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
      filledFields: [
        {
          htmlType: 'text',
          id: 'input1',
          name: '',
          value: 'Crocodile',
          autofillType: 'First name',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        },
        {
          htmlType: 'text',
          id: '',
          name: 'input2',
          value: 'Dundee',
          autofillType: 'Last name',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        },
        {
          htmlType: 'text',
          id: 'input3',
          name: '',
          value: 'Australia',
          autofillType: 'Country',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        },
        {
          htmlType: 'text',
          id: 'input4',
          name: '',
          value: '12345',
          autofillType: 'Zip code',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutocompleteAttribute,
        },
      ],
    });

    await coordinator.done();
    const addressDivs = view.shadowRoot.querySelectorAll('.address div');
    const addressLines = [...addressDivs].map(div => div.textContent);
    assert.deepStrictEqual(
        addressLines, ['Crocodile Dundee', 'Uluru Tours', 'Outback Road 1', 'Bundaberg Queensland 12345']);
    const expectedHeaders = ['Form field', 'Predicted autofill value', 'Value'];
    const expectedRows = [
      ['#input1 (text)', 'First name \nheur', '"Crocodile"'],
      ['input2 (text)', 'Last name \nheur', '"Dundee"'],
      ['#input3 (text)', 'Country \nheur', '"Australia"'],
      ['#input4 (text)', 'Zip code \nattr', '"12345"'],
    ];
    assertGridContents(view, expectedHeaders, expectedRows);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
      type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation,
      frame: {} as SDK.ResourceTreeModel.ResourceTreeFrame,
    });

    await coordinator.done();
    placeholderText = view.shadowRoot.querySelector('.placeholder')?.textContent?.trim();
    assert.strictEqual(placeholderText, 'No Autofill event detected');
  });
});
