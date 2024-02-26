// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as AutofillManager from '../../models/autofill_manager/autofill_manager.js';
import {assertGridContents, getBodyRowByAriaIndex, getDataGrid} from '../../testing/DataGridHelpers.js';
import {assertElement, assertShadowRoot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as Coordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Autofill from './autofill.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

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
    assertNotNullOrUndefined(maybeAutofillModel);
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
    assertShadowRoot(view.shadowRoot);
    const addressSpans = view.shadowRoot.querySelectorAll('.address span');
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
    const view = await renderAutofillView();
    assertShadowRoot(view.shadowRoot);
    let placeholderText = view.shadowRoot.querySelector('.placeholder')?.textContent?.trim();
    assert.strictEqual(placeholderText, 'No Autofill event detected');

    autofillModel.addressFormFilled(addressFormFilledEvent);
    await coordinator.done({waitForWork: true});
    assertViewShowsEventData(view);

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
    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    const view = await renderAutofillView();
    assertShadowRoot(view.shadowRoot);
    assertViewShowsEventData(view);
    await coordinator.done();
  });

  it('auto-open can be turned off/on', async () => {
    const view = await renderAutofillView();
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
  });

  it('highlights corresponding grid row when hovering over address span', async () => {
    const monospaceStyles = 'font-family:var(--monospace-font-family);font-size:var(--monospace-font-size);';

    autofillModel.addressFormFilled(addressFormFilledEvent);
    assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
    const view = await renderAutofillView();
    assertShadowRoot(view.shadowRoot);
    assertViewShowsEventData(view);

    const addressSpans = view.shadowRoot.querySelectorAll('.address span');
    const crocodileSpan = addressSpans[0];
    assert.strictEqual(crocodileSpan.textContent, 'Crocodile');
    assert.isFalse(crocodileSpan.classList.contains('highlighted'));
    const grid = getDataGrid(view);
    assertShadowRoot(grid.shadowRoot);
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
    assertShadowRoot(view.shadowRoot);
    assertViewShowsEventData(view);

    const domModel = target.model(SDK.DOMModel.DOMModel);
    const overlayModel = domModel?.overlayModel();
    assertNotNullOrUndefined(overlayModel);
    const overlaySpy = sinon.spy(overlayModel, 'highlightInOverlay');
    const hideOverlaySpy = sinon.spy(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    const addressSpans = view.shadowRoot.querySelectorAll('.address span');
    const zipCodeSpan = addressSpans[4];
    assert.strictEqual(zipCodeSpan.textContent, '12345');
    assert.isFalse(zipCodeSpan.classList.contains('highlighted'));
    const grid = getDataGrid(view);
    assertShadowRoot(grid.shadowRoot);
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
