// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

const NODE_ID = 1 as Protocol.DOM.NodeId;

describeWithMockConnection('PropertiesWidget', () => {
  let target: SDK.Target.Target;
  let view: Elements.PropertiesWidget.PropertiesWidget;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: {nodeId: NODE_ID}}));
    setMockConnectionResponseHandler('DOM.getNodesForSubtreeByStyle', () => ({nodeIds: []}));
  });

  afterEach(() => {
    view.detach();
  });

  const updatesUiOnEvent = <T extends keyof SDK.DOMModel.EventTypes>(
      event: Platform.TypeScriptUtilities.NoUnion<T>, inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);

    const node = new SDK.DOMModel.DOMNode(model);
    sinon.stub(node, 'resolveToObject').withArgs('properties-sidebar-pane').resolves({
      getAllProperties: () => ({}),
      getOwnProperties: () => ({}),
    } as unknown as SDK.RemoteObject.RemoteObject);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

    view = new Elements.PropertiesWidget.PropertiesWidget(0);
    view.markAsRoot();
    view.show(document.body);
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    const populateWithProperties =
        sinon.spy(ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement, 'populateWithProperties');
    model.dispatchEventToListeners(
        event, ...[node] as unknown as Common.EventTarget.EventPayloadToRestParameters<SDK.DOMModel.EventTypes, T>);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.strictEqual(populateWithProperties.called, inScope);
  };

  it('updates UI on in scope attribute modified event', updatesUiOnEvent(SDK.DOMModel.Events.AttrModified, true));
  it('does not update UI on out of scope attribute modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.AttrModified, false));
  it('updates UI on in scope attribute removed event', updatesUiOnEvent(SDK.DOMModel.Events.AttrRemoved, true));
  it('does not update UI on out of scope attribute removed event',
     updatesUiOnEvent(SDK.DOMModel.Events.AttrModified, false));
  it('updates UI on in scope charachter data modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.CharacterDataModified, true));
  it('does not update UI on out of scope charachter data modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.CharacterDataModified, false));
  it('updates UI on in scope child node count updated event',
     updatesUiOnEvent(SDK.DOMModel.Events.ChildNodeCountUpdated, true));
  it('does not update UI on out of scope child node count updated event',
     updatesUiOnEvent(SDK.DOMModel.Events.ChildNodeCountUpdated, false));
});
