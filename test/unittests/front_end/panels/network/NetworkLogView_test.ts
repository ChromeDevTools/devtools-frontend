// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Network from '../../../../../front_end/panels/network/network.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Logs from '../../../../../front_end/models/logs/logs.js';
import * as HAR from '../../../../../front_end/models/har/har.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertElement} from '../../helpers/DOMHelpers.js';

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../helpers/MockConnection.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithMockConnection('NetworkLogView', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let networkLogView: Network.NetworkLogView.NetworkLogView;

    beforeEach(() => {
      const dummyStorage = new Common.Settings.SettingsStorage({});

      for (const settingName of ['networkColorCodeResourceTypes', 'network.group-by-frame']) {
        Common.Settings.registerSettingExtension({
          settingName,
          settingType: Common.Settings.SettingType.BOOLEAN,
          defaultValue: false,
        });
      }
      Common.Settings.Settings.instance({
        forceNew: true,
        syncedStorage: dummyStorage,
        globalStorage: dummyStorage,
        localStorage: dummyStorage,
      });
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
        shortcutTitleForAction: () => {},
        shortcutsForAction: () => [],
      } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
      Logs.NetworkLog.NetworkLog.instance();
      target = targetFactory();
    });

    let nextId = 0;
    function createNetworkRequest(
        url: string,
        options: {requestHeaders?: SDK.NetworkRequest.NameValue[], finished?: boolean, target?: SDK.Target.Target}):
        SDK.NetworkRequest.NetworkRequest {
      const effectiveTarget = options.target || target;
      const networkManager = effectiveTarget.model(SDK.NetworkManager.NetworkManager);
      assertNotNullOrUndefined(networkManager);
      let request: SDK.NetworkRequest.NetworkRequest|undefined;
      const onRequestStarted = (event: Common.EventTarget.EventTargetEvent<SDK.NetworkManager.RequestStartedEvent>) => {
        request = event.data.request;
      };
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, onRequestStarted);
      dispatchEvent(
          effectiveTarget, 'Network.requestWillBeSent',
          {requestId: `request${++nextId}`, loaderId: 'loaderId', request: {url}} as unknown as
              Protocol.Network.RequestWillBeSentEvent);
      networkManager.removeEventListener(SDK.NetworkManager.Events.RequestStarted, onRequestStarted);
      assertNotNullOrUndefined(request);
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

    function createNetworkLogView(filterBar?: UI.FilterBar.FilterBar): Network.NetworkLogView.NetworkLogView {
      if (!filterBar) {
        filterBar = {addFilter: () => {}, filterButton: () => ({addEventListener: () => {}})} as unknown as
            UI.FilterBar.FilterBar;
      }
      return new Network.NetworkLogView.NetworkLogView(
          filterBar, document.createElement('div'),
          Common.Settings.Settings.instance().createSetting('networkLogLargeRows', false));
    }

    const tests = (inScope: boolean) => () => {
      beforeEach(() => {
        networkLogView = createNetworkLogView();
        SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      });

      it('adds dividers on main frame load events', async () => {
        const addEventDividers = sinon.spy(networkLogView.columns(), 'addEventDividers');

        networkLogView.setRecording(true);

        const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        assertNotNullOrUndefined(resourceTreeModel);
        resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 5});
        resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 6);
        if (inScope) {
          assert.isTrue(addEventDividers.calledTwice);
          assert.isTrue(addEventDividers.getCall(0).calledWith([5], 'network-load-divider'));
          assert.isTrue(addEventDividers.getCall(1).calledWith([6], 'network-dcl-divider'));
        } else {
          assert.isFalse(addEventDividers.called);
        }
      });

      it('can export all as HAR', async () => {
        SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
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

        if (inScope) {
          assert.isTrue(harWriterWrite.calledOnceWith(
              sinon.match.any, [FINISHED_REQUEST_1, FINISHED_REQUEST_2], sinon.match.any));
          assert.isTrue(fileManagerSave.calledOnce);
          assert.isTrue(fileManagerClose.calledOnce);
        } else {
          assert.isFalse(harWriterWrite.called);
          assert.isFalse(fileManagerSave.called);
          assert.isFalse(fileManagerClose.called);
        }
      });

      it('can import and filter from HAR', async () => {
        const URL_1 = 'http://example.com/' as Platform.DevToolsPath.UrlString;
        const URL_2 = 'http://example.com/favicon.ico' as Platform.DevToolsPath.UrlString;
        function makeHarEntry(url: Platform.DevToolsPath.UrlString) {
          return {
            request: {method: 'GET', url: url, headersSize: -1, bodySize: 0},
            response: {status: 0, content: {'size': 0, 'mimeType': 'x-unknown'}, headersSize: -1, bodySize: -1},
            startedDateTime: null,
            time: null,
            timings: {blocked: null, dns: -1, ssl: -1, connect: -1, send: 0, wait: 0, receive: 0},
          };
        }
        const har = {
          log: {
            version: '1.2',
            creator: {name: 'WebInspector', version: '537.36'},
            entries: [makeHarEntry(URL_1), makeHarEntry(URL_2)],
          },
        };
        networkLogView.markAsRoot();
        networkLogView.show(document.body);
        const blob = new Blob([JSON.stringify(har)], {type: 'text/plain'});
        const file = new File([blob], 'log.har');
        await networkLogView.onLoadFromFile(file);
        await coordinator.done({waitForWork: true});

        const rootNode = networkLogView.columns().dataGrid().rootNode();
        assert.deepEqual(
            rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()),
            [URL_1, URL_2]);

        networkLogView.setTextFilterValue('favicon');
        assert.deepEqual(
            rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [URL_2]);

        networkLogView.detach();
      });

      it('shows summary toolbar with content', () => {
        target.setInspectedURL('http://example.com/' as Platform.DevToolsPath.UrlString);
        const request = createNetworkRequest('http://example.com/', {finished: true});
        request.endTime = 0.669414;
        request.setIssueTime(0.435136, 0.435136);
        request.setResourceType(Common.ResourceType.resourceTypes.Document);

        networkLogView.setRecording(true);
        const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        assertNotNullOrUndefined(resourceTreeModel);
        resourceTreeModel.dispatchEventToListeners(
            SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 0.686191});
        resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 0.683709);
        networkLogView.markAsRoot();
        networkLogView.show(document.body);

        const toolbar = networkLogView.summaryToolbar();
        const textElements = toolbar.element.shadowRoot?.querySelectorAll('.toolbar-text');
        assertNotNullOrUndefined(textElements);
        const textContents = [...textElements].map(item => item.textContent);
        if (inScope) {
          assert.deepEqual(textContents, [
            '1 requests',
            '0\u00a0B transferred',
            '0\u00a0B resources',
            'Finish: 234\u00a0ms',
            'DOMContentLoaded: 249\u00a0ms',
            'Load: 251\u00a0ms',
          ]);
        } else {
          assert.strictEqual(textElements.length, 0);
        }
        networkLogView.detach();
      });
    };
    describe('in scope', tests(true));
    describe('out of scope', tests(false));

    const handlesSwitchingScope = (preserveLog: boolean) => async () => {
      Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log').set(preserveLog);
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      const anotherTarget = createTarget();
      const networkManager = target.model(SDK.NetworkManager.NetworkManager);
      assertNotNullOrUndefined(networkManager);
      const request1 = createNetworkRequest('url1', {target});
      const request2 = createNetworkRequest('url2', {target});
      const request3 = createNetworkRequest('url3', {target: anotherTarget});
      networkLogView = createNetworkLogView();
      networkLogView.markAsRoot();
      networkLogView.show(document.body);
      await coordinator.done();

      const rootNode = networkLogView.columns().dataGrid().rootNode();
      assert.deepEqual(
          rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()), [request1, request2]);

      SDK.TargetManager.TargetManager.instance().setScopeTarget(anotherTarget);
      await coordinator.done();
      assert.deepEqual(
          rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()),
          preserveLog ? [request1, request2, request3] : [request3]);

      networkLogView.detach();
    };

    it('replaces requests when switching scope with preserve log off', handlesSwitchingScope(false));
    it('appends requests when switching scope with preserve log on', handlesSwitchingScope(true));

    it('Hide Chrome extension requests', async () => {
      createNetworkRequest('chrome-extension://url1', {target});
      createNetworkRequest('url2', {target});
      const filterBar = new UI.FilterBar.FilterBar('networkPanel', true);
      networkLogView = createNetworkLogView(filterBar);

      networkLogView.markAsRoot();
      networkLogView.show(document.body);
      const rootNode = networkLogView.columns().dataGrid().rootNode();
      const hideExtCheckbox =
          filterBar.element.querySelector('[title="Hide requests to \'chrome-extension://\' URLs"] span')
              ?.shadowRoot?.querySelector('input') ||
          null;

      assertElement(hideExtCheckbox, HTMLInputElement);

      assert.deepEqual(
          rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()),
          ['chrome-extension://url1' as Platform.DevToolsPath.UrlString, 'url2' as Platform.DevToolsPath.UrlString]);

      hideExtCheckbox.checked = true;
      const event = new Event('change');
      hideExtCheckbox.dispatchEvent(event);

      assert.deepEqual(
          rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()),
          ['url2' as Platform.DevToolsPath.UrlString]);
      networkLogView.detach();
    });

    it('can filter requests with blocked response cookies', async () => {
      const request1 = createNetworkRequest('url1', {target});
      request1.blockedResponseCookies = () => [{
        blockedReasons: [Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure],
        cookie: null,
        cookieLine: 'foo=bar; SameSite=None',
      }];
      createNetworkRequest('url2', {target});
      const filterBar = new UI.FilterBar.FilterBar('networkPanel', true);
      networkLogView = createNetworkLogView(filterBar);
      networkLogView.markAsRoot();
      networkLogView.show(document.body);
      const rootNode = networkLogView.columns().dataGrid().rootNode();
      const blockedCookiesCheckbox =
          filterBar.element.querySelector('[title="Show only the requests with blocked response cookies"] span')
              ?.shadowRoot?.querySelector('input') ||
          null;
      assertElement(blockedCookiesCheckbox, HTMLInputElement);

      assert.deepEqual(
          rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()),
          ['url1' as Platform.DevToolsPath.UrlString, 'url2' as Platform.DevToolsPath.UrlString]);

      blockedCookiesCheckbox.checked = true;
      const event = new Event('change');
      blockedCookiesCheckbox.dispatchEvent(event);

      assert.deepEqual(rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [
        'url1' as Platform.DevToolsPath.UrlString,
      ]);

      networkLogView.detach();
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
