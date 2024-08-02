// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as AutofillManager from '../../models/autofill_manager/autofill_manager.js';
import {assertGridContents, getBodyRowByAriaIndex, getDataGrid} from '../../testing/DataGridHelpers.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import * as Coordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Autofill from './autofill.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const addressFormFilledEvent = {
  addressUi: {
    addressFields: [
      {
        fields: [
          {name: 'NAME_FULL', value: 'Crocodile Middle Dundee'},
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
      fieldId: 1 as Protocol.DOM.BackendNodeId,
      frameId: '1' as Protocol.Page.FrameId,
    },
    {
      htmlType: 'text',
      id: '',
      name: 'input2',
      value: 'Dundee',
      autofillType: 'Last name',
      fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
      fieldId: 2 as Protocol.DOM.BackendNodeId,
      frameId: '1' as Protocol.Page.FrameId,
    },
    {
      htmlType: 'text',
      id: 'input3',
      name: '',
      value: 'Australia',
      autofillType: 'Country',
      fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
      fieldId: 3 as Protocol.DOM.BackendNodeId,
      frameId: '1' as Protocol.Page.FrameId,
    },
    {
      htmlType: 'text',
      id: 'input4',
      name: '',
      value: '12345',
      autofillType: 'Zip code',
      fillingStrategy: Protocol.Autofill.FillingStrategy.AutocompleteAttribute,
      fieldId: 4 as Protocol.DOM.BackendNodeId,
      frameId: '1' as Protocol.Page.FrameId,
    },
  ],
};

describeWithMockConnection('AutofillView', () => {
  let target: SDK.Target.Target;
  let autofillModel: SDK.AutofillModel.AutofillModel;
  let showViewStub: sinon.SinonStub;

  beforeEach(() => {
    Root.Runtime.experiments.register('apca', '');
    target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const maybeAutofillModel = target.model(SDK.AutofillModel.AutofillModel);
    assert.exists(maybeAutofillModel);
    autofillModel = maybeAutofillModel;
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.AUTOFILL_VIEW);
    showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    AutofillManager.AutofillManager.AutofillManager.instance({forceNew: true});
  });

  afterEach(() => {
    showViewStub.restore();
  });

  const renderAutofillView = async () => {
    const view = new Autofill.AutofillView.AutofillView();
    renderElementIntoDOM(view);
    await view.render();
    await coordinator.done();
    return view;
  };

  const assertViewShowsEventData = (view: Autofill.AutofillView.AutofillView) => {
    const addressSpans = view.shadowRoot!.querySelectorAll('.address span');
    const addressText = [...addressSpans].map(div => div.textContent);
    assert.deepStrictEqual(
        addressText, ['Crocodile', ' Middle ', 'Dundee', 'Uluru ToursOutback Road 1Bundaberg Queensland ', '12345']);
    const expectedHeaders = ['Form field', 'Predicted autofill value', 'Value', 'filledFieldIndex'];
    const expectedRows = [
      ['#input1 (text)', 'First name \nheur', '"Crocodile"', ''],
      ['input2 (text)', 'Last name \nheur', '"Dundee"', ''],
      ['#input3 (text)', 'Country \nheur', '"Australia"', ''],
      ['#input4 (text)', 'Zip code \nattr', '"12345"', ''],
    ];
    assertGridContents(view, expectedHeaders, expectedRows);
  };

  it('renders autofilled address and filled fields and clears content on navigation', async () => {
    const expectedPlaceholder = 'To start debugging autofill, use Chrome\'s autofill menu to fill an address form.';
    const view = await renderAutofillView();
    let placeholderText = view.shadowRoot!.querySelector('.placeholder div')!.textContent!.trim();
    assert.strictEqual(placeholderText, expectedPlaceholder);

    autofillModel.addressFormFilled(addressFormFilledEvent);
    await coordinator.done({waitForWork: true});
    assertViewShowsEventData(view);

    navigate(getMainFrame(target));

    await coordinator.done();
    placeholderText = view.shadowRoot!.querySelector('.placeholder div')!.textContent!.trim();
    assert.strictEqual(placeholderText, expectedPlaceholder);
  });

  it('shows content if the view is created after the event was received', async () => {
    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    const view = await renderAutofillView();
    assert.isNotNull(view.shadowRoot);
    assertViewShowsEventData(view);
    await coordinator.done();
  });

  it('auto-open can be turned off/on', async () => {
    const view = await renderAutofillView();

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    showViewStub.reset();

    // The auto-opening checkbox is the second one.
    const checkbox = view.shadowRoot!.querySelectorAll('input')[1];
    assert.isNotNull(checkbox);
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
  });

  it('showing test addresses in autofill menu can be turned off/on', async () => {
    const view = await renderAutofillView();

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    showViewStub.reset();

    // The show test addresses checkbox is the first one.
    const checkbox = view.shadowRoot!.querySelectorAll('input')[0];
    assert.isNotNull(checkbox);
    assert.isFalse(checkbox.checked);

    const setAddressSpy = sinon.spy(autofillModel!.agent, 'invoke_setAddresses');
    assert.isTrue(setAddressSpy.notCalled);

    checkbox.checked = true;
    const event = new Event('change');
    checkbox.dispatchEvent(event);
    assert.isTrue(setAddressSpy.calledOnce);

    await coordinator.done();
  });

  it('highlights corresponding grid row when hovering over address span', async () => {
    const monospaceStyles = 'font-family:var(--monospace-font-family);font-size:var(--monospace-font-size);';

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    const view = await renderAutofillView();
    assertViewShowsEventData(view);

    const addressSpans = view.shadowRoot!.querySelectorAll('.address span');
    const crocodileSpan = addressSpans[0];
    assert.strictEqual(crocodileSpan.textContent, 'Crocodile');
    assert.isFalse(crocodileSpan.classList.contains('highlighted'));
    const grid = getDataGrid(view);
    assert.isNotNull(grid.shadowRoot);
    const firstGridRow = getBodyRowByAriaIndex(grid.shadowRoot, 1);
    let styles = firstGridRow.getAttribute('style') || '';
    assert.strictEqual(styles.replace(/\s/g, ''), monospaceStyles);

    crocodileSpan.dispatchEvent(new MouseEvent('mouseenter'));
    await coordinator.done({waitForWork: true});
    assert.isTrue(crocodileSpan.classList.contains('highlighted'));
    styles = firstGridRow.getAttribute('style') || '';
    assert.strictEqual(
        styles.replace(/\s/g, ''), monospaceStyles + 'background-color:var(--sys-color-state-hover-on-subtle);');

    crocodileSpan.dispatchEvent(new MouseEvent('mouseleave'));
    await coordinator.done({waitForWork: true});
    assert.isFalse(crocodileSpan.classList.contains('highlighted'));
    styles = firstGridRow.getAttribute('style') || '';
    assert.strictEqual(styles.replace(/\s/g, ''), monospaceStyles);
  });

  it('highlights corresponding address span and DOM node when hovering over grid row', async () => {
    stubNoopSettings();
    const mockFrame = {
      resourceTreeModel: () => ({
        target: () => target,
      }),
    } as SDK.ResourceTreeModel.ResourceTreeFrame;
    const getFrameStub = sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame').callsFake(frameId => {
      return frameId === addressFormFilledEvent.filledFields[3].frameId ? mockFrame : null;
    });

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    const view = await renderAutofillView();
    assertViewShowsEventData(view);

    const domModel = target.model(SDK.DOMModel.DOMModel);
    const overlayModel = domModel?.overlayModel();
    assert.exists(overlayModel);
    const overlaySpy = sinon.spy(overlayModel, 'highlightInOverlay');
    const hideOverlaySpy = sinon.spy(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    const addressSpans = view.shadowRoot!.querySelectorAll('.address span');
    const zipCodeSpan = addressSpans[4];
    assert.strictEqual(zipCodeSpan.textContent, '12345');
    assert.isFalse(zipCodeSpan.classList.contains('highlighted'));
    const grid = getDataGrid(view);
    assert.isNotNull(grid.shadowRoot);
    const fourthGridRow = getBodyRowByAriaIndex(grid.shadowRoot, 4);
    fourthGridRow.dispatchEvent(new MouseEvent('mouseenter'));
    await coordinator.done({waitForWork: true});
    assert.isTrue(zipCodeSpan.classList.contains('highlighted'));
    assert.isTrue(overlaySpy.calledOnce);
    const deferredNode =
        (overlaySpy.getCall(0).args[0] as unknown as SDK.OverlayModel.HighlightDeferredNode).deferredNode;
    assert.strictEqual(deferredNode.backendNodeId(), 4);
    assert.isTrue(hideOverlaySpy.notCalled);

    fourthGridRow.dispatchEvent(new MouseEvent('mouseleave'));
    await coordinator.done({waitForWork: true});
    assert.isFalse(zipCodeSpan.classList.contains('highlighted'));
    assert.isTrue(hideOverlaySpy.calledOnce);
    getFrameStub.restore();
  });
});
