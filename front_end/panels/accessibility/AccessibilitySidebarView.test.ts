// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Accessibility from './accessibility.js';

const NODE_ID = 1 as Protocol.DOM.NodeId;

describeWithEnvironment('AccessibilitySidebarView', () => {
  let target: SDK.Target.Target;
  let view: Accessibility.AccessibilitySidebarView.AccessibilitySidebarView|undefined;

  beforeEach(() => {
    UI.ActionRegistration.maybeRemoveActionExtension('elements.toggle-a11y-tree');
    UI.ActionRegistration.registerActionExtension({
      actionId: 'elements.toggle-a11y-tree',
      category: UI.ActionRegistration.ActionCategory.ELEMENTS,
      title: () => 'Toggle Accessibility Tree' as Platform.UIString.LocalizedString,
      toggleable: true,
    });
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('DOM.getDocument',
                                 () => ({root: {nodeId: NODE_ID}} as Protocol.DOM.GetDocumentResponse));
    connection.setSuccessHandler('DOM.getNodesForSubtreeByStyle', () => ({nodeIds: []}));
    target = createTarget({connection});
  });

  afterEach(() => {
    UI.ActionRegistration.maybeRemoveActionExtension('elements.toggle-a11y-tree');
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
    view?.detach();
    view = undefined;
    UI.ViewManager.ViewManager.removeInstance();
  });

  it('notifies ViewManager when visibility is toggled', async () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view);
    await view.updateComplete;
    const viewManager = UI.ViewManager.ViewManager.instance();
    const visibilitySpy = sinon.spy();
    viewManager.addEventListener(UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED, visibilitySpy);

    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-a11y-tree');
    action.setToggled(true);
    await view.updateComplete;

    sinon.assert.calledWith(visibilitySpy, sinon.match({data: sinon.match({revealedViewId: 'aria-attributes'})}));

    action.setToggled(false);
    await view.updateComplete;

    sinon.assert.calledWith(visibilitySpy, sinon.match({data: sinon.match({hiddenViewId: 'aria-attributes'})}));
  });

  it('executes toggle action when view onToggleChange is called', async () => {
    const viewFunctionStub = createViewFunctionStub(Accessibility.AccessibilitySidebarView.AccessibilitySidebarView);
    view = new Accessibility.AccessibilitySidebarView.AccessibilitySidebarView(viewFunctionStub);
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-a11y-tree');
    const executeStub = sinon.stub(action, 'execute').resolves(true);

    const input = await viewFunctionStub.nextInput;
    input.onToggleChange(new Event('switchchange'));

    sinon.assert.calledOnce(executeStub);
  });

  it('updates view input when action is toggled', async () => {
    const viewFunctionStub = createViewFunctionStub(Accessibility.AccessibilitySidebarView.AccessibilitySidebarView);
    view = new Accessibility.AccessibilitySidebarView.AccessibilitySidebarView(viewFunctionStub);
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-a11y-tree');

    let input = await viewFunctionStub.nextInput;
    assert.isFalse(input.isToggled);

    action.setToggled(true);
    input = await viewFunctionStub.nextInput;
    assert.isTrue(input.isToggled);

    action.setToggled(false);
    input = await viewFunctionStub.nextInput;
    assert.isFalse(input.isToggled);
  });

  it('updates node on DOMNode flavor change', () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const node = new SDK.DOMModel.DOMNode(domModel);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

    assert.strictEqual(view.node(), node);
  });

  it('skips next node pull when fromAXTree is true', () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node1 = new SDK.DOMModel.DOMNode(domModel);
    const node2 = new SDK.DOMModel.DOMNode(domModel);

    view.setNode(node1, true);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node2);

    assert.strictEqual(view.node(), node1);
  });

  it('shows aria-attributes subpane for DOM node and removes it for non-DOM node', async () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view);
    await view.updateComplete;
    const accessibilityModel = target.model(SDK.AccessibilityModel.AccessibilityModel);
    assert.exists(accessibilityModel);

    const nonDomAxNode = new SDK.AccessibilityModel.AccessibilityNode(accessibilityModel, {
      nodeId: 'non-dom' as Protocol.Accessibility.AXNodeId,
      ignored: false,
      properties: [],
    });
    view.accessibilityNodeCallback(nonDomAxNode);
    await view.updateComplete;

    assert.strictEqual(view.axNode(), nonDomAxNode);
    assert.isFalse(UI.ViewManager.ViewManager.instance().hasView('aria-attributes'));

    const domAxNode = new SDK.AccessibilityModel.AccessibilityNode(accessibilityModel, {
      nodeId: 'dom' as Protocol.Accessibility.AXNodeId,
      ignored: false,
      backendDOMNodeId: 1 as Protocol.DOM.BackendNodeId,
      properties: [],
    });
    view.accessibilityNodeCallback(domAxNode);
    await view.updateComplete;

    assert.strictEqual(view.axNode(), domAxNode);
    assert.isTrue(UI.ViewManager.ViewManager.instance().hasView('aria-attributes'));
  });

  it('handles performUpdate when node is null', async () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    const accessibilityModel = target.model(SDK.AccessibilityModel.AccessibilityModel);
    assert.exists(accessibilityModel);
    const requestTreeSpy = sinon.spy(accessibilityModel, 'requestPartialAXTree');

    view.setNode(null);
    await view.performUpdate();

    sinon.assert.notCalled(requestTreeSpy);
    assert.isNull(view.node());
    assert.isNull(view.axNode());
  });

  it('requests partial AX tree and updates axNode during performUpdate', async () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const accessibilityModel = target.model(SDK.AccessibilityModel.AccessibilityModel);
    assert.exists(accessibilityModel);

    const node = new SDK.DOMModel.DOMNode(domModel);
    const axNode = new SDK.AccessibilityModel.AccessibilityNode(accessibilityModel, {
      nodeId: 'test-node' as Protocol.Accessibility.AXNodeId,
      ignored: false,
      backendDOMNodeId: 1 as Protocol.DOM.BackendNodeId,
      properties: [],
    });

    const requestPartialAXTreeStub = sinon.stub(accessibilityModel, 'requestPartialAXTree').resolves();
    sinon.stub(accessibilityModel, 'axNodeForDOMNode').withArgs(node).returns(axNode);

    view.setNode(node);
    await view.performUpdate();

    sinon.assert.calledOnceWithExactly(requestPartialAXTreeStub, node);
    assert.strictEqual(view.axNode(), axNode);
  });

  it('ignores DOM model events for a different node', async () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const node1 = new SDK.DOMModel.DOMNode(domModel);
    const node2 = new SDK.DOMModel.DOMNode(domModel);
    view.setNode(node1);
    await view.updateComplete;

    const requestUpdateSpy = sinon.spy(view, 'requestUpdate');
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.AttrModified, {node: node2, name: 'class'});

    sinon.assert.notCalled(requestUpdateSpy);
  });

  it('stops listening to DOM model events when hidden', async () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    view.setNode(node);
    await view.updateComplete;

    view.detach();

    const requestUpdateSpy = sinon.spy(view, 'requestUpdate');
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.AttrModified, {node, name: 'class'});
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.ChildNodeCountUpdated, node);

    sinon.assert.notCalled(requestUpdateSpy);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatesUiOnEvent = (event: any, inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const accessibilityModel = target.model(SDK.AccessibilityModel.AccessibilityModel);
    assert.exists(accessibilityModel);
    const requestPartialAXTree = sinon.stub(accessibilityModel, 'requestPartialAXTree');
    requestPartialAXTree.resolves();
    const node = new SDK.DOMModel.DOMNode(domModel);

    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view);
    view.setNode(node);
    await view.updateComplete;

    requestPartialAXTree.resetHistory();
    domModel.dispatchEventToListeners(event, {node});
    await view.updateComplete;
    assert.strictEqual(requestPartialAXTree.called, inScope);
  };

  it('updates UI on in scope attribute modified event', updatesUiOnEvent(SDK.DOMModel.Events.AttrModified, true));
  it('does not update UI on out of scope attribute modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.AttrModified, false));
  it('updates UI on in scope attribute removed event', updatesUiOnEvent(SDK.DOMModel.Events.AttrRemoved, true));
  it('does not update UI on out of scope attribute removed event',
     updatesUiOnEvent(SDK.DOMModel.Events.AttrRemoved, false));
  it('updates UI on in scope charachter data modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.CharacterDataModified, true));
  it('does not update UI on out of scope charachter data modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.CharacterDataModified, false));
  it('updates UI on in scope child node count updated event',
     updatesUiOnEvent(SDK.DOMModel.Events.ChildNodeCountUpdated, true));
  it('does not update UI on out of scope child node count updated event',
     updatesUiOnEvent(SDK.DOMModel.Events.ChildNodeCountUpdated, false));

  it('renders the view', async () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view, {includeCommonStyles: true});
    await assertScreenshot('accessibility/accessibility_sidebar_view.png');
  });

  it('renders the view when aria live recording is enabled in hostConfig', async () => {
    updateHostConfig({devToolsAriaLiveRecording: {enabled: true}});
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view, {includeCommonStyles: true});
    await assertScreenshot('accessibility/accessibility_sidebar_view_aria_live_recording.png');
  });

  it('renders the view when accessibility tree toggle is active', async () => {
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-a11y-tree');
    action.setToggled(true);
    renderElementIntoDOM(view, {includeCommonStyles: true});
    await assertScreenshot('accessibility/accessibility_sidebar_view_toggled.png');
  });

  it('shows announcement recording subpane when enabled in hostConfig', async () => {
    updateHostConfig({devToolsAriaLiveRecording: {enabled: true}});
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view);
    await view.updateComplete;
    assert.isTrue(UI.ViewManager.ViewManager.instance().hasView('aria-live-recording'));
  });

  it('does not show announcement recording subpane when disabled in hostConfig', async () => {
    updateHostConfig({devToolsAriaLiveRecording: {enabled: false}});
    view = Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance({forceNew: true});
    renderElementIntoDOM(view);
    await view.updateComplete;
    assert.isFalse(UI.ViewManager.ViewManager.instance().hasView('aria-live-recording'));
  });
});
