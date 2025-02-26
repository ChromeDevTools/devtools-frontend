// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, stubNoopSettings, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

function createNode(target: SDK.Target.Target, {nodeId}: {nodeId: Protocol.DOM.NodeId}): SDK.DOMModel.DOMNode {
  const domModel = target.model(SDK.DOMModel.DOMModel);
  assert.exists(domModel);

  return SDK.DOMModel.DOMNode.create(domModel, null, false, {
    nodeId,
    backendNodeId: 2 as Protocol.DOM.BackendNodeId,
    nodeType: Node.ELEMENT_NODE,
    nodeName: 'div',
    localName: 'div',
    nodeValue: '',
  });
}

describeWithMockConnection('ComputedStyleModel', () => {
  let target: SDK.Target.Target;
  let computedStyleModel: Elements.ComputedStyleModel.ComputedStyleModel;
  let trackComputedStyleUpdatesForNodeSpy: sinon.SinonSpy;

  async function waitForTrackComputedStyleUpdatesForNodeCall(): Promise<void> {
    if (trackComputedStyleUpdatesForNodeSpy.getCalls().length > 0) {
      return;
    }

    await new Promise<void>(resolve => {
      requestAnimationFrame(async () => {
        await waitForTrackComputedStyleUpdatesForNodeCall();
        resolve();
      });
    });
  }

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    const cssModel = target.model(SDK.CSSModel.CSSModel);

    UI.Context.Context.instance().setFlavor(Elements.StylesSidebarPane.StylesSidebarPane, null);
    UI.Context.Context.instance().setFlavor(Elements.ComputedStyleWidget.ComputedStyleWidget, null);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);

    sinon.stub(Elements.ComputedStyleModel.ComputedStyleModel.prototype, 'cssModel').returns(cssModel);
    trackComputedStyleUpdatesForNodeSpy =
        sinon.spy(SDK.CSSModel.CSSModel.prototype, 'trackComputedStyleUpdatesForNode');
    computedStyleModel = new Elements.ComputedStyleModel.ComputedStyleModel();
  });

  afterEach(() => {
    computedStyleModel.dispose();
    trackComputedStyleUpdatesForNodeSpy.restore();
  });

  it('should track computed style updates when computed widget is shown', async () => {
    UI.Context.Context.instance().setFlavor(
        SDK.DOMModel.DOMNode, createNode(target, {nodeId: 1 as Protocol.DOM.NodeId}));
    UI.Context.Context.instance().setFlavor(
        Elements.ComputedStyleWidget.ComputedStyleWidget,
        sinon.createStubInstance(Elements.ComputedStyleWidget.ComputedStyleWidget));

    await waitForTrackComputedStyleUpdatesForNodeCall();

    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, 1);
  });

  it('should track computed style updates when styles tab is shown and DevToolsAnimationStylesInStylesTab is enabled',
     async () => {
       updateHostConfig({
         devToolsAnimationStylesInStylesTab: {
           enabled: true,
         },
       });
       UI.Context.Context.instance().setFlavor(
           SDK.DOMModel.DOMNode, createNode(target, {nodeId: 1 as Protocol.DOM.NodeId}));
       UI.Context.Context.instance().setFlavor(
           Elements.StylesSidebarPane.StylesSidebarPane,
           sinon.createStubInstance(Elements.StylesSidebarPane.StylesSidebarPane));

       await waitForTrackComputedStyleUpdatesForNodeCall();

       sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, 1);
     });

  it('should track computed style updates when the node is changed', async () => {
    UI.Context.Context.instance().setFlavor(
        SDK.DOMModel.DOMNode, createNode(target, {nodeId: 1 as Protocol.DOM.NodeId}));
    UI.Context.Context.instance().setFlavor(
        Elements.ComputedStyleWidget.ComputedStyleWidget,
        sinon.createStubInstance(Elements.ComputedStyleWidget.ComputedStyleWidget));

    await waitForTrackComputedStyleUpdatesForNodeCall();
    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, 1);
    trackComputedStyleUpdatesForNodeSpy.resetHistory();

    UI.Context.Context.instance().setFlavor(
        SDK.DOMModel.DOMNode, createNode(target, {nodeId: 2 as Protocol.DOM.NodeId}));
    await waitForTrackComputedStyleUpdatesForNodeCall();

    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, 2);
  });

  it('should stop tracking when computed widget is hidden', async () => {
    UI.Context.Context.instance().setFlavor(
        SDK.DOMModel.DOMNode, createNode(target, {nodeId: 1 as Protocol.DOM.NodeId}));
    UI.Context.Context.instance().setFlavor(
        Elements.ComputedStyleWidget.ComputedStyleWidget,
        sinon.createStubInstance(Elements.ComputedStyleWidget.ComputedStyleWidget));

    await waitForTrackComputedStyleUpdatesForNodeCall();
    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, 1);
    trackComputedStyleUpdatesForNodeSpy.resetHistory();

    UI.Context.Context.instance().setFlavor(Elements.ComputedStyleWidget.ComputedStyleWidget, null);
    await waitForTrackComputedStyleUpdatesForNodeCall();

    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, undefined);
  });

  it('should stop tracking when computed widget is hidden and styles tab is shown but the flag is not enabled',
     async () => {
       updateHostConfig({
         devToolsAnimationStylesInStylesTab: {
           enabled: false,
         },
       });
       UI.Context.Context.instance().setFlavor(
           SDK.DOMModel.DOMNode, createNode(target, {nodeId: 1 as Protocol.DOM.NodeId}));
       UI.Context.Context.instance().setFlavor(
           Elements.ComputedStyleWidget.ComputedStyleWidget,
           sinon.createStubInstance(Elements.ComputedStyleWidget.ComputedStyleWidget));

       await waitForTrackComputedStyleUpdatesForNodeCall();
       sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, 1);
       trackComputedStyleUpdatesForNodeSpy.resetHistory();

       UI.Context.Context.instance().setFlavor(Elements.ComputedStyleWidget.ComputedStyleWidget, null);
       UI.Context.Context.instance().setFlavor(
           Elements.StylesSidebarPane.StylesSidebarPane,
           sinon.createStubInstance(Elements.StylesSidebarPane.StylesSidebarPane));
       await waitForTrackComputedStyleUpdatesForNodeCall();

       sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, undefined);
     });
});
