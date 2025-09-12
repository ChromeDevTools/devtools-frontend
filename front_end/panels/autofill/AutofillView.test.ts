// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Protocol from '../../generated/protocol.js';
import * as AutofillManager from '../../models/autofill_manager/autofill_manager.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Autofill from './autofill.js';

describeWithEnvironment('AutofillView', () => {
  const frameId = 'frame#1' as Protocol.Page.FrameId;

  it('renders nothing if there\'s no last filled address form', async () => {
    const view = createViewFunctionStub(Autofill.AutofillView.AutofillView);
    const autofillManager = sinon.createStubInstance(AutofillManager.AutofillManager.AutofillManager);
    const autofillView = new Autofill.AutofillView.AutofillView(autofillManager, view);
    autofillManager.getLastFilledAddressForm.returns(null);

    renderElementIntoDOM(autofillView);

    const input = await view.nextInput;
    assert.isEmpty(input.address);
    assert.isEmpty(input.filledFields);
    assert.isEmpty(input.matches);
    assert.isEmpty(input.highlightedMatches);
  });

  it('correctly renders the last filled address form', async () => {
    const address = 'Max Mustermann\nMusterstrasse 4\n12345 Musterstadt';
    const filledFields: Protocol.Autofill.FilledField[] = [
      {
        htmlType: 'text',
        id: 'name',
        name: 'name',
        value: 'Max Mustermann',
        autofillType: 'FULL_NAME',
        fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        frameId,
        fieldId: 1 as Protocol.DOM.BackendNodeId,
      },
      {
        htmlType: 'text',
        id: 'street',
        name: 'street',
        value: 'Musterstrasse 4',
        autofillType: 'STREET',
        fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        frameId,
        fieldId: 2 as Protocol.DOM.BackendNodeId,
      },
      {
        htmlType: 'text',
        id: 'city',
        name: 'city',
        value: 'Musterstadt',
        autofillType: 'FULL_NAME',
        fillingStrategy: Protocol.Autofill.FillingStrategy.AutocompleteAttribute,
        frameId,
        fieldId: 3 as Protocol.DOM.BackendNodeId,
      },
    ];
    const matches: AutofillManager.AutofillManager.Match[] = [{
      startIndex: 0,
      endIndex: 14,
      filledFieldIndex: 0,
    }];
    const view = createViewFunctionStub(Autofill.AutofillView.AutofillView);
    const autofillManager = sinon.createStubInstance(AutofillManager.AutofillManager.AutofillManager);
    const autofillView = new Autofill.AutofillView.AutofillView(autofillManager, view);
    autofillManager.getLastFilledAddressForm.returns({
      address,
      filledFields,
      matches,
    });

    renderElementIntoDOM(autofillView);

    const input = await view.nextInput;
    assert.strictEqual(input.address, address);
    assert.strictEqual(input.filledFields, filledFields);
    assert.strictEqual(input.matches, matches);
    assert.isEmpty(input.highlightedMatches);
  });

  it('correctly highlights matches in the address', async () => {
    const address = 'Max Mustermann\nMusterstadt';
    const filledFields: Protocol.Autofill.FilledField[] = [
      {
        htmlType: 'text',
        id: 'firstname',
        name: 'firstname',
        value: 'Max',
        autofillType: 'FIRST_NAME',
        fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        frameId,
        fieldId: 1 as Protocol.DOM.BackendNodeId,
      },
      {
        htmlType: 'text',
        id: 'lastname',
        name: 'lastname',
        value: 'Mustermann',
        autofillType: 'LAST_NAME',
        fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        frameId,
        fieldId: 2 as Protocol.DOM.BackendNodeId,
      },
    ];
    const matches: AutofillManager.AutofillManager.Match[] = [
      {
        startIndex: 0,
        endIndex: 3,
        filledFieldIndex: 0,
      },
      {
        startIndex: 4,
        endIndex: 14,
        filledFieldIndex: 1,
      },
    ];
    const view = createViewFunctionStub(Autofill.AutofillView.AutofillView);
    const autofillManager = sinon.createStubInstance(AutofillManager.AutofillManager.AutofillManager);
    const autofillView = new Autofill.AutofillView.AutofillView(autofillManager, view);
    autofillManager.getLastFilledAddressForm.returns({
      address,
      filledFields,
      matches,
    });
    renderElementIntoDOM(autofillView);
    let input = await view.nextInput;

    input.onHighlightMatchesInAddress(5);

    input = await view.nextInput;
    assert.deepEqual(input.highlightedMatches, [{startIndex: 4, endIndex: 14, filledFieldIndex: 1}]);

    input.onClearHighlightedMatches();

    input = await view.nextInput;
    assert.isEmpty(input.highlightedMatches);
  });

  it('correctly rerenders upon AddressFormFilled events', async () => {
    const address = 'Foo Bar';
    const filledFields: Protocol.Autofill.FilledField[] = [];
    const matches: AutofillManager.AutofillManager.Match[] = [];
    const view = createViewFunctionStub(Autofill.AutofillView.AutofillView);
    const autofillManager = sinon.createStubInstance(AutofillManager.AutofillManager.AutofillManager);
    const autofillView = new Autofill.AutofillView.AutofillView(autofillManager, view);
    autofillManager.getLastFilledAddressForm.returns(null);
    renderElementIntoDOM(autofillView);
    await view.nextInput;

    Reflect.apply(autofillManager.addEventListener.lastCall.args[1], autofillView, [
      {data: {address, filledFields, matches}},
    ]);

    const input = await view.nextInput;
    assert.strictEqual(input.address, address);
  });

  it('correctly highlights DOM nodes for filled fields', async () => {
    const address = 'John\nDenver';
    const filledFields: Protocol.Autofill.FilledField[] = [
      {
        htmlType: 'text',
        id: 'firstname',
        name: 'firstname',
        value: 'John',
        autofillType: 'FIRST_NAME',
        fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        frameId,
        fieldId: 1 as Protocol.DOM.BackendNodeId,
      },
      {
        htmlType: 'text',
        id: 'city',
        name: 'city',
        value: 'Denver',
        autofillType: 'CITY',
        fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
        frameId,
        fieldId: 2 as Protocol.DOM.BackendNodeId,
      },
    ];
    const matches: AutofillManager.AutofillManager.Match[] = [
      {
        startIndex: 0,
        endIndex: 4,
        filledFieldIndex: 0,
      },
      {
        startIndex: 6,
        endIndex: 12,
        filledFieldIndex: 1,
      },
    ];
    const view = createViewFunctionStub(Autofill.AutofillView.AutofillView);
    const autofillManager = sinon.createStubInstance(AutofillManager.AutofillManager.AutofillManager);
    const autofillView = new Autofill.AutofillView.AutofillView(autofillManager, view);
    autofillManager.getLastFilledAddressForm.returns({
      address,
      filledFields,
      matches,
    });
    renderElementIntoDOM(autofillView);
    let input = await view.nextInput;

    input.onHighlightMatchesInFilledFiels(1);

    sinon.assert.calledOnceWithExactly(autofillManager.highlightFilledField, filledFields[1]);
    input = await view.nextInput;
    assert.deepEqual(input.highlightedMatches, [{startIndex: 6, endIndex: 12, filledFieldIndex: 1}]);

    input.onClearHighlightedMatches();

    sinon.assert.calledOnce(autofillManager.clearHighlightedFilledFields);
    input = await view.nextInput;
    assert.isEmpty(input.highlightedMatches);
  });

  describe('onAddressFormFilled handling', () => {
    function dispatchFormFilledEvent(manager: AutofillManager.AutofillManager.AutofillManager): void {
      const filledFields = [
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
      ];
      manager.dispatchEventToListeners(AutofillManager.AutofillManager.Events.ADDRESS_FORM_FILLED, {
        address: '1 Test Road',
        filledFields,
        matches: [{startIndex: 0, endIndex: 9, filledFieldIndex: 0}],
      });
    }

    function setupView(): {
      manager: AutofillManager.AutofillManager.AutofillManager,
      view: Autofill.AutofillView.AutofillView,
      showViewStub: sinon.SinonStub,
      actionTakenStub: sinon.SinonStub,
    } {
      const viewManager = UI.ViewManager.ViewManager.instance({forceNew: true});
      const showViewStub = sinon.stub(viewManager, 'showView').resolves();
      const actionTakenStub = sinon.stub(Host.userMetrics, 'actionTaken');

      const view = createViewFunctionStub(Autofill.AutofillView.AutofillView);
      const autofillManager = AutofillManager.AutofillManager.AutofillManager.instance({forceNew: true});
      const autofillView = new Autofill.AutofillView.AutofillView(autofillManager, view);
      renderElementIntoDOM(autofillView);
      return {manager: autofillManager, view: autofillView, showViewStub, actionTakenStub};
    }

    it('shows the autofill-view when an address form is filled', async () => {
      const {showViewStub, actionTakenStub, view, manager} = setupView();
      const setting = Common.Settings.Settings.instance().createSetting('auto-open-autofill-view-on-event', true);
      setting.set(true);

      dispatchFormFilledEvent(manager);
      await view.updateComplete;

      sinon.assert.calledOnce(showViewStub);
      sinon.assert.calledOnceWithExactly(actionTakenStub, Host.UserMetrics.Action.AutofillReceivedAndTabAutoOpened);
    });

    it('does not show the autofill view if the setting is false', async () => {
      const {showViewStub, actionTakenStub, view, manager} = setupView();
      const setting = Common.Settings.Settings.instance().createSetting('auto-open-autofill-view-on-event', true);
      setting.set(false);

      dispatchFormFilledEvent(manager);
      await view.updateComplete;

      sinon.assert.calledOnceWithExactly(actionTakenStub, Host.UserMetrics.Action.AutofillReceived);
      sinon.assert.notCalled(showViewStub);
    });
  });
});
