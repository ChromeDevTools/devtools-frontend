// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithMockConnection('ComputedStyleWidget', () => {
  let target: SDK.Target.Target;
  let view: Elements.ComputedStyleWidget.ComputedStyleWidget;
  let trackComputedStyleUpdatesForNodeSpy: sinon.SinonSpy;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
    trackComputedStyleUpdatesForNodeSpy =
        sinon.spy(SDK.CSSModel.CSSModel.prototype, 'trackComputedStyleUpdatesForNode');

    const cssModel = target.model(SDK.CSSModel.CSSModel);
    sinon.stub(Elements.ComputedStyleModel.ComputedStyleModel.prototype, 'cssModel').returns(cssModel);
  });

  afterEach(() => {
    view.detach();
  });

  it('tracks computed style updates for the node when the widget is shown', () => {
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    view = new Elements.ComputedStyleWidget.ComputedStyleWidget();
    view.markAsRoot();
    view.show(document.body);

    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, node.id);
  });

  it('tracks computed style updates for the node when the selected node is changed', () => {
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    view = new Elements.ComputedStyleWidget.ComputedStyleWidget();
    view.markAsRoot();
    view.show(document.body);

    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, node.id);
    const newNode = new SDK.DOMModel.DOMNode(model);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, newNode);

    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, newNode.id);
  });

  it('removes tracking computed style updates for the node when the widget is hidden', () => {
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    view = new Elements.ComputedStyleWidget.ComputedStyleWidget();
    view.markAsRoot();
    view.show(document.body);
    view.hideWidget();

    sinon.assert.calledWith(trackComputedStyleUpdatesForNodeSpy, undefined);
  });
});
