// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithEnvironment('LayersWidget', () => {
  let node: SDK.DOMModel.DOMNode;
  let cssModel: SDK.CSSModel.CSSModel;

  beforeEach(() => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    cssModel = domModel.cssModel();
    sinon.stub(cssModel, 'getRootLayer').resolves({name: '', order: 0});
    node = new SDK.DOMModel.DOMNode(domModel);
    sinon.stub(node, 'enclosingElementOrSelf').returns(node);
  });

  afterEach(() => {
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
  });

  it('tracks the selected DOM node while shown', () => {
    const addEventListenerSpy = sinon.spy(cssModel, 'addEventListener');
    const widget = new Elements.LayersWidget.LayersWidget(sinon.stub());
    renderElementIntoDOM(widget);

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

    sinon.assert.calledOnce(addEventListenerSpy.withArgs(SDK.CSSModel.Events.StyleSheetChanged));
    widget.detach();
  });

  it('stops tracking the selected DOM node when hidden', () => {
    const addEventListenerSpy = sinon.spy(cssModel, 'addEventListener');
    const widget = new Elements.LayersWidget.LayersWidget(sinon.stub());
    renderElementIntoDOM(widget);
    widget.detach();
    renderElementIntoDOM(widget);
    widget.detach();

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

    sinon.assert.notCalled(addEventListenerSpy.withArgs(SDK.CSSModel.Events.StyleSheetChanged));
  });
});
