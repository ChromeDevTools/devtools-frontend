// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Network from '../../../../../front_end/panels/network/network.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Logs from '../../../../../front_end/models/logs/logs.js';
import * as HAR from '../../../../../front_end/models/har/har.js';

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('NetworkLogView', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let networkLogView: Network.NetworkLogView.NetworkLogView;

    beforeEach(() => {
      stubNoopSettings();
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
        shortcutTitleForAction: () => {},
        shortcutsForAction: () => [],
      } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
      networkLogView = createNetworkLogView();
      target = targetFactory();
    });

    let nextId = 0;
    function createNetworkRequest(
        url: string, options: {requestHeaders?: SDK.NetworkRequest.NameValue[], finished?: boolean}) {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          `request${++nextId}` as Protocol.Network.RequestId, url as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      request.requestMethod = 'GET';
      if (options.requestHeaders) {
        request.setRequestHeaders(options.requestHeaders);
      }
      if (options.finished) {
        request.finished = true;
      }
      return request;
    }

    it('can create curl command parameters when some headers do not have value', async () => {
      const request = createNetworkRequest('https://www.example.com/file.html' as Platform.DevToolsPath.UrlString, {
        requestHeaders: [
          {name: 'header-with-value', value: 'some value'},
          {name: 'no-value-header', value: ''},
        ],
      });
      const actual = await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix');
      const expected =
          'curl \'https://www.example.com/file.html\' \\\n  -H \'header-with-value: some value\' \\\n  -H \'no-value-header;\' \\\n  --compressed';
      assert.strictEqual(actual, expected);
    });

    function createNetworkLogView(): Network.NetworkLogView.NetworkLogView {
      return new Network.NetworkLogView.NetworkLogView(
          {addFilter: () => {}, filterButton: () => ({addEventListener: () => {}})} as unknown as
              UI.FilterBar.FilterBar,
          document.createElement('div'),
          Common.Settings.Settings.instance().createSetting('networkLogLargeRows', false));
    }

    it('adds dividers on main frame load events', async () => {
      const addEventDividers = sinon.spy(networkLogView.columns(), 'addEventDividers');

      networkLogView.setRecording(true);

      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 5});
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 6);
      assert.isTrue(addEventDividers.calledTwice);
      assert.isTrue(addEventDividers.getCall(0).calledWith([5], 'network-load-divider'));
      assert.isTrue(addEventDividers.getCall(1).calledWith([6], 'network-dcl-divider'));
    });

    it('can export all as HAR', async () => {
      const harWriterWrite = sinon.stub(HAR.Writer.Writer, 'write').resolves();
      const URL_HOST = 'example.com';
      target.setInspectedURL(`http://${URL_HOST}/foo` as Platform.DevToolsPath.UrlString);
      const FILENAME = `${URL_HOST}.har` as Platform.DevToolsPath.RawPathString;
      const fileManager = Workspace.FileManager.FileManager.instance();
      const fileManagerSave =
          sinon.stub(fileManager, 'save').withArgs(FILENAME, '', true).resolves({fileSystemPath: FILENAME});
      const fileManagerClose = sinon.stub(fileManager, 'close');

      const FINISHED_REQUEST_1 = createNetworkRequest('http://example.com/', {finished: true});
      const FINISHED_REQUEST_2 = createNetworkRequest('http://example.com/favicon.ico', {finished: true});
      const UNFINISHED_REQUEST = createNetworkRequest('http://example.com/background.bmp', {finished: false});
      sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requests').returns([
        FINISHED_REQUEST_1,
        FINISHED_REQUEST_2,
        UNFINISHED_REQUEST,
      ]);
      await networkLogView.exportAll();

      assert.isTrue(
          harWriterWrite.calledOnceWith(sinon.match.any, [FINISHED_REQUEST_1, FINISHED_REQUEST_2], sinon.match.any));
      assert.isTrue(fileManagerSave.calledOnce);
      assert.isTrue(fileManagerClose.calledOnce);
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
