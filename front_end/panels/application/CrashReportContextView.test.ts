// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Application from './application.js';

describeWithMockConnection('CrashReportContextView', () => {
  const FRAME_ID = 'frame-1' as Protocol.Page.FrameId;
  const ORIGIN = 'https://example.com';
  const URL = 'https://example.com/index.html';

  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
    target.model(SDK.CrashReportContextModel.CrashReportContextModel);
    target.model(SDK.ResourceTreeModel.ResourceTreeModel);
  });

  async function createComponent() {
    const view = createViewFunctionStub(Application.CrashReportContextView.CrashReportContextView);
    const component = new Application.CrashReportContextView.CrashReportContextView(view);
    return {view, component};
  }

  it('renders frame sections and entries', async () => {
    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame').returns({
      url: URL,
      securityOrigin: ORIGIN,
      isMainFrame: () => true,
      displayName: () => URL,
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);

    setMockConnectionResponseHandler(
        'CrashReportContext.getEntries', () => ({
                                           entries: [
                                             {key: 'user_id', value: '12345', frameId: FRAME_ID},
                                           ],
                                         }));

    const {view} = await createComponent();
    const input = await view.nextInput;

    assert.lengthOf(input.frames, 1);
    assert.strictEqual(input.frames[0].url, URL);
    assert.strictEqual(input.frames[0].displayName, URL);
    assert.strictEqual(input.frames[0].entries[0].key, 'user_id');
  });

  it('groups entries by frame', async () => {
    const stub = sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame');
    stub.withArgs('frame-1' as Protocol.Page.FrameId).returns({
      url: 'https://frame1.com',
      securityOrigin: 'https://frame1.com',
      isMainFrame: () => true,
      displayName: () => 'https://frame1.com',
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);
    stub.withArgs('frame-2' as Protocol.Page.FrameId).returns({
      url: 'https://frame2.com',
      securityOrigin: 'https://frame2.com',
      isMainFrame: () => false,
      displayName: () => 'https://frame2.com',
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);

    setMockConnectionResponseHandler(
        'CrashReportContext.getEntries', () => ({
                                           entries: [
                                             {key: 'k1', value: 'v1', frameId: 'frame-1' as Protocol.Page.FrameId},
                                             {key: 'k2', value: 'v2', frameId: 'frame-2' as Protocol.Page.FrameId},
                                           ],
                                         }));

    const {view} = await createComponent();
    const input = await view.nextInput;

    assert.lengthOf(input.frames, 2);
    assert.strictEqual(input.frames[0].url, 'https://frame1.com');
    assert.strictEqual(input.frames[1].url, 'https://frame2.com');
  });

  it('handles unknown frames by showing a fallback URL', async () => {
    // Explicitly return null for the frame lookup
    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame').returns(null);

    setMockConnectionResponseHandler(
        'CrashReportContext.getEntries',
        () => ({
          entries: [
            {key: 'k1', value: 'v1', frameId: 'unknown-frame' as Protocol.Page.FrameId},
          ],
        }));

    const {view} = await createComponent();
    const input = await view.nextInput;

    assert.lengthOf(input.frames, 1);
    assert.strictEqual(input.frames[0].url, 'Unknown Frame');
  });

  it('disambiguates frames with the same URL', async () => {
    const stub = sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame');
    const SHARED_URL = 'https://shared.com';

    stub.withArgs('frame-main' as Protocol.Page.FrameId).returns({
      url: SHARED_URL,
      securityOrigin: SHARED_URL,
      isMainFrame: () => true,
      displayName: () => SHARED_URL,
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);

    stub.withArgs('frame-sub' as Protocol.Page.FrameId).returns({
      url: SHARED_URL,
      securityOrigin: SHARED_URL,
      isMainFrame: () => false,
      displayName: () => SHARED_URL,
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);

    setMockConnectionResponseHandler(
        'CrashReportContext.getEntries', () => ({
                                           entries: [
                                             {key: 'k1', value: 'v1', frameId: 'frame-main' as Protocol.Page.FrameId},
                                             {key: 'k2', value: 'v2', frameId: 'frame-sub' as Protocol.Page.FrameId},
                                           ],
                                         }));

    const {view} = await createComponent();
    const input = await view.nextInput;

    assert.lengthOf(input.frames, 2);
    assert.strictEqual(input.frames[0].displayName, SHARED_URL);
    assert.strictEqual(input.frames[1].displayName, SHARED_URL);
  });

  it('uses frame.displayName() if available to render titles', async () => {
    const stub = sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getFrame');
    const URL = 'https://example.com';
    const TITLE = 'Frame Page Title';

    stub.withArgs('frame-1' as Protocol.Page.FrameId).returns({
      url: URL,
      securityOrigin: URL,
      isMainFrame: () => true,
      displayName: () => TITLE,
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);

    setMockConnectionResponseHandler(
        'CrashReportContext.getEntries',
        () => ({
          entries: [
            {key: 'user_id', value: '12345', frameId: 'frame-1' as Protocol.Page.FrameId},
          ],
        }));

    const {view} = await createComponent();
    const input = await view.nextInput;

    assert.lengthOf(input.frames, 1);
    assert.strictEqual(input.frames[0].displayName, TITLE);
  });

  it('renders a placeholder when no context is available', async () => {
    setMockConnectionResponseHandler('CrashReportContext.getEntries', () => ({
                                                                        entries: [],
                                                                      }));

    const {view} = await createComponent();
    const input = await view.nextInput;

    assert.lengthOf(input.frames, 0);
  });

  it('handles refresh and filter correctly', async () => {
    const {view, component} = await createComponent();
    const input = await view.nextInput;

    assert.exists(input.onRefresh);
    assert.exists(input.onFilterChanged);
    assert.deepEqual(input.filters, []);

    const updateSpy = sinon.spy(component, 'requestUpdate');

    // Test Refresh
    input.onRefresh();
    sinon.assert.calledOnce(updateSpy);

    // Test Filter
    input.onFilterChanged(new CustomEvent('change', {detail: 'test'}));
    sinon.assert.calledTwice(updateSpy);

    const filteredInput = await view.nextInput;
    assert.lengthOf(filteredInput.filters, 1);
    assert.strictEqual(filteredInput.filters[0].key, 'key,value');

    // Test Clear Filter
    input.onFilterChanged(new CustomEvent('change', {detail: ''}));
    const clearedInput = await view.nextInput;
    assert.deepEqual(clearedInput.filters, []);
  });
});
