// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import {assertElement, assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {createTarget} from '../../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../helpers/MockConnection.js';
import {TestRevealer} from '../../../helpers/RevealerHelpers.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithMockConnection('LayoutPane', async () => {
  let target: SDK.Target.Target;
  let domModel: SDK.DOMModel.DOMModel;
  let overlayModel: SDK.OverlayModel.OverlayModel;
  let getNodesByStyle: sinon.SinonStub;
  beforeEach(() => {
    target = createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    assertNotNullOrUndefined(domModel);
    getNodesByStyle = sinon.stub(domModel, 'getNodesByStyle').resolves([]);
    overlayModel = target.model(SDK.OverlayModel.OverlayModel) as SDK.OverlayModel.OverlayModel;
    assertNotNullOrUndefined(overlayModel);
    const dummyStorage = new Common.Settings.SettingsStorage({});
    Common.Settings.registerSettingExtension({
      settingName: 'showUAShadowDOM',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
    });
  });

  async function renderComponent() {
    const component = new ElementsComponents.LayoutPane.LayoutPane();
    renderElementIntoDOM(component);
    component.wasShown();
    await coordinator.done({waitForWork: true});
    return component;
  }

  function queryLabels(component: HTMLElement, selector: string) {
    assertShadowRoot(component.shadowRoot);
    return Array.from(component.shadowRoot.querySelectorAll(selector)).map(label => {
      const input = label.querySelector('[data-input]');
      assertElement(input, HTMLElement);

      return {
        label: label.getAttribute('title'),
        input: input.tagName,
      };
    });
  }

  it('renders settings', async () => {
    Common.Settings.Settings.instance().moduleSetting('showGridLineLabels').setTitle('Enum setting title');
    Common.Settings.Settings.instance().moduleSetting('showGridTrackSizes').setTitle('Boolean setting title');

    const component = await renderComponent();
    assert.deepEqual(queryLabels(component, '[data-enum-setting]'), [{label: 'Enum setting title', input: 'SELECT'}]);
    assert.deepEqual(
        queryLabels(component, '[data-boolean-setting]'),
        [{label: 'Boolean setting title', input: 'INPUT'}, {label: '', input: 'INPUT'}, {label: '', input: 'INPUT'}]);
  });

  it('stores a setting when changed', async () => {
    const component = await renderComponent();

    assertShadowRoot(component.shadowRoot);
    assert.isTrue(Common.Settings.Settings.instance().moduleSetting('showGridTrackSizes').get());
    const input = component.shadowRoot.querySelector('[data-boolean-setting] [data-input]');
    assertElement(input, HTMLInputElement);

    input.click();

    assert.isFalse(Common.Settings.Settings.instance().moduleSetting('showGridTrackSizes').get());
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
    getNodesByStyle.withArgs([{name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'}]).resolves([
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
    assertShadowRoot(component.shadowRoot);

    assert.strictEqual(queryLabels(component, '[data-element]').length, 3);
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
    assertShadowRoot(component.shadowRoot);

    assert.strictEqual(queryLabels(component, '[data-element]').length, 3);
  });

  it('send an event when an element overlay is toggled', async () => {
    getNodesByStyle.withArgs([{name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'}]).resolves([
      ID_1,
    ]);
    sinon.stub(domModel, 'nodeForId').withArgs(ID_1).returns(makeNode(ID_1));
    const highlightGrid = sinon.spy(overlayModel, 'highlightGridInPersistentOverlay');

    const component = await renderComponent();
    assertShadowRoot(component.shadowRoot);

    const input = component.shadowRoot.querySelector('[data-element] [data-input]');
    assertElement(input, HTMLInputElement);
    input.click();
    assert.isTrue(highlightGrid.calledOnceWith(ID_1));
  });

  it('send an event when an element’s Show element button is pressed', async () => {
    getNodesByStyle.withArgs([{name: 'display', value: 'grid'}, {name: 'display', value: 'inline-grid'}]).resolves([
      ID_1,
    ]);
    const node = makeNode(ID_1);
    sinon.stub(domModel, 'nodeForId').withArgs(ID_1).returns(node);
    const revealer = sinon.stub().resolves();
    TestRevealer.install(revealer);

    const component = await renderComponent();
    assertShadowRoot(component.shadowRoot);

    const button = component.shadowRoot.querySelector('devtools-icon.show-element');
    assertElement(button, HTMLElement);
    button.click();
    assert.isTrue(revealer.calledOnceWith(node));
    TestRevealer.reset();
  });

  it('expands/collapses <details> using ArrowLeft/ArrowRight keys', async () => {
    const component = await renderComponent();
    assertShadowRoot(component.shadowRoot);
    const details = component.shadowRoot.querySelector('details');
    assertElement(details, HTMLDetailsElement);
    const summary = details.querySelector('summary');
    assertElement(summary, HTMLElement);
    assert(details.open, 'The first details were not expanded by default');
    summary.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'ArrowLeft'}));
    assert(!details.open, 'The details were not collapsed after sending ArrowLeft');
    summary.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'ArrowRight'}));
    assert(details.open, 'The details were not expanded after sending ArrowRight');
  });

  const updatesUiOnEvent = <T extends keyof SDK.OverlayModel.EventTypes>(
      event: Platform.TypeScriptUtilities.NoUnion<T>, inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    await renderComponent();
    const render = sinon.spy(coordinator, 'write');
    overlayModel.dispatchEventToListeners(
        event,
        ...[{nodeId: 42, enabled: true}] as unknown as
            Common.EventTarget.EventPayloadToRestParameters<SDK.OverlayModel.EventTypes, T>);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.strictEqual(render.called, inScope);
  };

  it('updates UI on in scope grid overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PersistentGridOverlayStateChanged, true));
  it('does not update UI on out of scope grid overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PersistentGridOverlayStateChanged, false));
  it('updates UI on in scope flex overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PersistentFlexContainerOverlayStateChanged, true));
  it('does not update UI on out of scope flex overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PersistentFlexContainerOverlayStateChanged, false));
});
