// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as AutofillManager from '../../../../../front_end/models/autofill_manager/autofill_manager.js';
import * as Autofill from '../../../../../front_end/panels/autofill/autofill.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertElement, assertShadowRoot, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertGridContents} from '../../ui/components/DataGridHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

const addressFormFilledEvent = {
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
};

describeWithMockConnection('AutofillView', () => {
  let target: SDK.Target.Target;
  let view: Autofill.AutofillView.AutofillView;

  beforeEach(() => {
    target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
  });

  const assertViewShowsEventData = (shadowRoot: ShadowRoot): void => {
    const addressDivs = shadowRoot.querySelectorAll('.address div');
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
  };

  it('renders autofilled address and filled fields and clears content on navigation', async () => {
    const autofillManager = AutofillManager.AutofillManager.AutofillManager.instance({forceNew: true});

    view = new Autofill.AutofillView.AutofillView();
    renderElementIntoDOM(view);
    await view.render();
    await coordinator.done();
    assertShadowRoot(view.shadowRoot);
    let placeholderText = view.shadowRoot.querySelector('.placeholder')?.textContent?.trim();
    assert.strictEqual(placeholderText, 'No Autofill event detected');

    autofillManager.dispatchEventToListeners(
        AutofillManager.AutofillManager.Events.AddressFormFilled,
        {autofillModel: {} as SDK.AutofillModel.AutofillModel, event: addressFormFilledEvent});
    await coordinator.done();
    assertViewShowsEventData(view.shadowRoot);

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

  it('shows content if the view is created after the event was received', async () => {
    const autofillModel = target.model(SDK.AutofillModel.AutofillModel);
    assertNotNullOrUndefined(autofillModel);
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    AutofillManager.AutofillManager.AutofillManager.instance({forceNew: true});

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));

    view = new Autofill.AutofillView.AutofillView();
    renderElementIntoDOM(view);
    await view.render();
    await coordinator.done();
    assertShadowRoot(view.shadowRoot);
    assertViewShowsEventData(view.shadowRoot);

    showViewStub.restore();
  });

  it('auto-open can be turned off/on', async () => {
    const autofillModel = target.model(SDK.AutofillModel.AutofillModel);
    assertNotNullOrUndefined(autofillModel);
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    AutofillManager.AutofillManager.AutofillManager.instance({forceNew: true});

    view = new Autofill.AutofillView.AutofillView();
    renderElementIntoDOM(view);
    await view.render();
    await coordinator.done();
    assertShadowRoot(view.shadowRoot);

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    showViewStub.reset();

    const checkbox = view.shadowRoot.querySelector('input');
    assertElement(checkbox, HTMLInputElement);
    assert.isTrue(checkbox.checked);
    checkbox.checked = false;
    let event = new Event('change');
    checkbox.dispatchEvent(event);

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.notCalled);

    checkbox.checked = true;
    event = new Event('change');
    checkbox.dispatchEvent(event);

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    await coordinator.done();
    showViewStub.restore();
  });
});
