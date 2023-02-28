// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as CSSOverview from '../../../../../front_end/panels/css_overview/css_overview.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';

import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';

describeWithMockConnection('CSSOverviewPanel', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;

    beforeEach(async () => {
      target = targetFactory();
    });

    it('reacts to start event and sends completion event', async () => {
      const controller = new CSSOverview.CSSOverviewController.OverviewController();
      new CSSOverview.CSSOverviewPanel.CSSOverviewPanel(controller);
      const overviewCompleted = controller.once(CSSOverview.CSSOverviewController.Events.OverviewCompleted);
      sinon.stub(target.runtimeAgent(), 'invoke_evaluate').resolves({
        result: {},
      } as unknown as Protocol.Runtime.EvaluateResponse);
      sinon.stub(target.domsnapshotAgent(), 'invoke_captureSnapshot').resolves({
        documents: [],
      } as unknown as Protocol.DOMSnapshot.CaptureSnapshotResponse);
      sinon.stub(target.cssAgent(), 'invoke_getMediaQueries').resolves({
        medias: [],
      } as unknown as Protocol.CSS.GetMediaQueriesResponse);

      controller.dispatchEventToListeners(CSSOverview.CSSOverviewController.Events.RequestOverviewStart);
      await overviewCompleted;
    });
  };

  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTaget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTaget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTaget});
                              }));
});
