// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('AppManifestView', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let emptyView: UI.EmptyWidget.EmptyWidget;
    let reportView: UI.ReportView.ReportView;
    let throttler: Common.Throttler.Throttler;
    let view: Application.AppManifestView.AppManifestView;
    let onScheduled: () => void;
    beforeEach(() => {
      stubNoopSettings();
      target = targetFactory();
      emptyView = new UI.EmptyWidget.EmptyWidget('');
      reportView = new UI.ReportView.ReportView('');
      throttler = new Common.Throttler.Throttler(0);
      onScheduled = () => {};
      sinon.stub(throttler, 'schedule').callsFake(async (work: () => (Promise<unknown>), _?: boolean) => {
        await work();
        onScheduled();
        return Promise.resolve();
      });
    });

    afterEach(() => {
      view.detach();
    });

    it('shows report view once manifest available', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);

      const URL = 'http://example.com' as Platform.DevToolsPath.UrlString;
      const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
      fetchAppManifest.onCall(0).resolves({url: URL, data: null, errors: []});
      fetchAppManifest.onCall(1).resolves({url: URL, data: '{}', errors: []});
      sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
      sinon.stub(resourceTreeModel, 'getManifestIcons').resolves({primaryIcon: null});
      sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

      view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
      view.markAsRoot();
      view.show(document.body);

      await new Promise<void>(resolve => {
        onScheduled = resolve;
      });
      assert.isTrue(emptyView.isShowing());
      assert.isFalse(reportView.isShowing());

      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
      await new Promise<void>(resolve => {
        onScheduled = resolve;
      });
      assert.isFalse(emptyView.isShowing());
      assert.isTrue(reportView.isShowing());
    });
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
