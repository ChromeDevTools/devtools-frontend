// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Emulation from './emulation.js';

describeWithEnvironment('MediaQueryInspector', () => {
  let target: SDK.Target.Target;
  let inspector: Emulation.MediaQueryInspector.MediaQueryInspector;

  beforeEach(() => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  afterEach(() => {
    inspector.detach();
  });

  it('renders media queries', async () => {
    inspector = new Emulation.MediaQueryInspector.MediaQueryInspector();
    inspector.getWidthCallback = () => 42;
    inspector.setWidthCallback = (_: number) => {};
    renderElementIntoDOM(inspector);
    await inspector.updateComplete;
    assert.lengthOf(inspector.contentElement.querySelectorAll('.media-inspector-marker'), 0);

    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const CSS_MEDIA = {
      text: 'foo',
      source: Protocol.CSS.CSSMediaSource.MediaRule,
      mediaList: [{expressions: [{value: 42, computedLength: 42, unit: 'UNIT', feature: 'max-width'}], active: true}],
    } as unknown as Protocol.CSS.CSSMedia;
    sinon.stub(cssModel, 'getMediaQueries').resolves([new SDK.CSSMedia.CSSMedia(cssModel, CSS_MEDIA)]);
    const workScheduled = expectCall(sinon.stub(inspector.mediaThrottler, 'schedule'));
    cssModel.dispatchEventToListeners(
        SDK.CSSModel.Events.StyleSheetAdded, {} as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
    const [work] = await workScheduled;
    await work();
    await inspector.updateComplete;
    assert.lengthOf(inspector.contentElement.querySelectorAll('.media-inspector-marker'), 1);
  });

  it('only listens to CSS models and zoom changes while shown', () => {
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const zoomManager = UI.ZoomManager.ZoomManager.instance();
    inspector = new Emulation.MediaQueryInspector.MediaQueryInspector();

    renderElementIntoDOM(inspector);
    assert.isTrue(cssModel.hasEventListeners(SDK.CSSModel.Events.MediaQueryResultChanged));
    assert.isTrue(zoomManager.hasEventListeners(UI.ZoomManager.Events.ZOOM_CHANGED));

    inspector.detach();
    assert.isFalse(cssModel.hasEventListeners(SDK.CSSModel.Events.MediaQueryResultChanged));
    assert.isFalse(zoomManager.hasEventListeners(UI.ZoomManager.Events.ZOOM_CHANGED));
    const modelAdded = sinon.spy(inspector, 'modelAdded');
    const childCSSModel = createTarget({parentTarget: target}).model(SDK.CSSModel.CSSModel);
    assert.exists(childCSSModel);
    sinon.assert.notCalled(modelAdded);

    renderElementIntoDOM(inspector);
    sinon.assert.calledWith(modelAdded, childCSSModel);
    assert.isTrue(cssModel.hasEventListeners(SDK.CSSModel.Events.MediaQueryResultChanged));
    assert.isTrue(zoomManager.hasEventListeners(UI.ZoomManager.Events.ZOOM_CHANGED));
  });
});
