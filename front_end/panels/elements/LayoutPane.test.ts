// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithMockConnection('LayoutPane', () => {
  let target: SDK.Target.Target;
  let domModel: SDK.DOMModel.DOMModel;
  let overlayModel: SDK.OverlayModel.OverlayModel;
  let getNodesByStyle: sinon.SinonStub;
  beforeEach(() => {
    target = createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    assert.exists(domModel);
    getNodesByStyle = sinon.stub(domModel, 'getNodesByStyle').resolves([]);
    overlayModel = target.model(SDK.OverlayModel.OverlayModel) as SDK.OverlayModel.OverlayModel;
    assert.exists(overlayModel);
  });

  async function renderComponent() {
    const component = new Elements.LayoutPane.LayoutPane();
    const performUpdateSpy = spyCall(component, 'performUpdate');
    renderElementIntoDOM(component);
    component.wasShown();
    await (await performUpdateSpy).result;
    return component;
  }

  function queryLabels(component: HTMLElement, selector: string) {
    return Array.from(component.querySelectorAll(selector)).map(label => {
      const input = label.querySelector('[data-input]');
      assert.instanceOf(input, HTMLElement);

      return {
        label: label.getAttribute('title'),
        input: input.tagName,
      };
    });
  }

  it('renders settings', async () => {
    Common.Settings.Settings.instance()
        .moduleSetting('show-grid-line-labels')
        .setTitle('Enum setting title' as Platform.UIString.LocalizedString);
    Common.Settings.Settings.instance()
        .moduleSetting('show-grid-track-sizes')
        .setTitle('Boolean setting title' as Platform.UIString.LocalizedString);

    const component = await renderComponent();
    assert.deepEqual(
        queryLabels(component.contentElement, '[data-enum-setting]'), [{label: 'Enum setting title', input: 'SELECT'}]);
    const checkboxesTitles =
        Array.from(component.contentElement.querySelectorAll('[data-boolean-setting]')).map(checkbox => {
          assert.instanceOf(checkbox, UI.UIUtils.CheckboxLabel);
          return checkbox.title;
        });
    assert.deepEqual(checkboxesTitles, ['Boolean setting title', '', '']);
  });

  it('stores a setting when changed', async () => {
    const component = await renderComponent();

    assert.isTrue(Common.Settings.Settings.instance().moduleSetting('show-grid-track-sizes').get());
    const input = component.contentElement.querySelector('[data-boolean-setting]');
    assert.instanceOf(input, UI.UIUtils.CheckboxLabel);

    input.click();

    assert.isFalse(Common.Settings.Settings.instance().moduleSetting('show-grid-track-sizes').get());
  });

  function makeNode(id: Protocol.DOM.NodeId) {
    return {
      id,
      path: () => 'body > div',
      ancestorUserAgentShadowRoot: () => false,
      localName: () => 'div',
      getAttribute: () => '',
      scrollIntoView: () => {},
      highlight: () => {},
      domModel: () => domModel,
    } as unknown as SDK.DOMModel.DOMNode;
  }

  const ID_1 = 1 as Protocol.DOM.NodeId;
  const ID_2 = 2 as Protocol.DOM.NodeId;
  const ID_3 = 3 as Protocol.DOM.NodeId;

  it('renders grid elements', async () => {
    getNodesByStyle
        .withArgs([
          {name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'},
          {name: 'display', value: 'masonry'}, {name: 'display', value: 'inline-masonry'}
        ])
        .resolves([
          ID_1,
          ID_2,
          ID_3,
        ]);
    sinon.stub(domModel, 'nodeForId')
        .withArgs(ID_1)
        .returns(makeNode(ID_1))
        .withArgs(ID_2)
        .returns(makeNode(ID_2))
        .withArgs(ID_3)
        .returns(makeNode(ID_2));

    const component = await renderComponent();

    assert.lengthOf(component.contentElement.querySelectorAll('[data-element]'), 3);
  });

  it('renders flex elements', async () => {
    getNodesByStyle.withArgs([{name: 'display', value: 'flex'}, {name: 'display', value: 'inline-flex'}]).resolves([
      ID_1,
      ID_2,
      ID_3,
    ]);
    sinon.stub(domModel, 'nodeForId')
        .withArgs(ID_1)
        .returns(makeNode(ID_1))
        .withArgs(ID_2)
        .returns(makeNode(ID_2))
        .withArgs(ID_3)
        .returns(makeNode(ID_3));

    const component = await renderComponent();

    assert.lengthOf(component.contentElement.querySelectorAll('[data-element]'), 3);
  });

  it('send an event when an element overlay is toggled', async () => {
    getNodesByStyle
        .withArgs([
          {name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'},
          {name: 'display', value: 'masonry'}, {name: 'display', value: 'inline-masonry'}
        ])
        .resolves([
          ID_1,
        ]);
    sinon.stub(domModel, 'nodeForId').withArgs(ID_1).returns(makeNode(ID_1));
    const highlightGrid = sinon.spy(overlayModel, 'highlightGridInPersistentOverlay');

    const component = await renderComponent();

    const input = component.contentElement.querySelector('[data-element]');
    assert.instanceOf(input, UI.UIUtils.CheckboxLabel);
    input.click();
    assert.isTrue(highlightGrid.calledOnceWith(ID_1));
  });

  it('send an event when an element’s Show element button is pressed', async () => {
    getNodesByStyle
        .withArgs([
          {name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'},
          {name: 'display', value: 'masonry'}, {name: 'display', value: 'inline-masonry'}
        ])
        .resolves([
          ID_1,
        ]);
    const node = makeNode(ID_1);
    sinon.stub(domModel, 'nodeForId').withArgs(ID_1).returns(node);
    const reveal = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal').resolves();

    const component = await renderComponent();

    const button = component.contentElement.querySelector('.show-element');
    assert.instanceOf(button, HTMLElement);
    button.click();
    assert.isTrue(reveal.calledOnceWith(node, false));
  });

  it('expands/collapses <details> using ArrowLeft/ArrowRight keys', async () => {
    const component = await renderComponent();
    const details = component.contentElement.querySelector('details');
    assert.instanceOf(details, HTMLDetailsElement);
    const summary = details.querySelector('summary');
    assert.instanceOf(summary, HTMLElement);
    assert(details.open, 'The first details were not expanded by default');
    summary.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'ArrowLeft'}));
    assert.isNotOk(details.open, 'The details were not collapsed after sending ArrowLeft');
    summary.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'ArrowRight'}));
    assert(details.open, 'The details were not expanded after sending ArrowRight');
  });

  const updatesUiOnEvent = <T extends keyof SDK.OverlayModel.EventTypes>(
      event: Platform.TypeScriptUtilities.NoUnion<T>, inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const renderSpy = sinon.spy(Elements.LayoutPane.LayoutPane.prototype, 'requestUpdate');
    await renderComponent();

    renderSpy.resetHistory();
    overlayModel.dispatchEventToListeners(
        event,
        ...[{nodeId: 42, enabled: true}] as unknown as
            Common.EventTarget.EventPayloadToRestParameters<SDK.OverlayModel.EventTypes, T>);
    assert.strictEqual(renderSpy.called, inScope);
  };

  it('updates UI on in scope grid overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PERSISTENT_GRID_OVERLAY_STATE_CHANGED, true));
  it('does not update UI on out of scope grid overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PERSISTENT_GRID_OVERLAY_STATE_CHANGED, false));
  it('updates UI on in scope flex overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED, true));
  it('does not update UI on out of scope flex overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED, false));
});
