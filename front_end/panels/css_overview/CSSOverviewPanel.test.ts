// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as CSSOverview from './css_overview.js';

describeWithMockConnection('CSSOverviewPanel', () => {
  let target: SDK.Target.Target;

  beforeEach(async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  it('reacts to start event and sends completion event', async () => {
    const view = createViewFunctionStub(CSSOverview.CSSOverviewPanel.CSSOverviewPanel);
    new CSSOverview.CSSOverviewPanel.CSSOverviewPanel(view);
    sinon.stub(target.runtimeAgent(), 'invoke_evaluate').resolves({
      result: {},
    } as unknown as Protocol.Runtime.EvaluateResponse);
    sinon.stub(target.domsnapshotAgent(), 'invoke_captureSnapshot').resolves({
      documents: [],
    } as unknown as Protocol.DOMSnapshot.CaptureSnapshotResponse);
    sinon.stub(target.cssAgent(), 'invoke_getMediaQueries').resolves({
      medias: [],
    } as unknown as Protocol.CSS.GetMediaQueriesResponse);

    view.input.onStartCapture();
    assert.strictEqual((await view.nextInput).state, 'completed');
  });
});
