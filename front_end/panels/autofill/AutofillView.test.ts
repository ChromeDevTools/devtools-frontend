// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as AutofillManager from '../../models/autofill_manager/autofill_manager.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

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
});
