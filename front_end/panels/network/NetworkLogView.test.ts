// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as HAR from '../../models/har/har.js';
import * as Logs from '../../models/logs/logs.js';
import {
  findMenuItemWithLabel,
  getContextMenuForElement,
  getMenu,
  getMenuItemLabels,
} from '../../testing/ContextMenuHelpers.js';
import {dispatchClickEvent, raf} from '../../testing/DOMHelpers.js';
import {createTarget, registerNoopActions, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
import {stubFileManager} from '../../testing/FileManagerHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../testing/MockConnection.js';
import {activate} from '../../testing/ResourceTreeHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('NetworkLogView', () => {
  let target: SDK.Target.Target;
  let networkLogView: Network.NetworkLogView.NetworkLogView;
  let networkLog: Logs.NetworkLog.NetworkLog;

  beforeEach(() => {
    const dummyStorage = new Common.Settings.SettingsStorage({});

    for (const settingName of ['network-color-code-resource-types', 'network.group-by-frame']) {
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
    registerNoopActions(['network.toggle-recording', 'inspector-main.reload']);

    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
    networkLog = Logs.NetworkLog.NetworkLog.instance();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  afterEach(() => {
    if (networkLogView) {
      networkLogView.detach();
    }
  });

  let nextId = 0;
  function createNetworkRequest(
      url: string,
      options: {requestHeaders?: SDK.NetworkRequest.NameValue[], finished?: boolean, target?: SDK.Target.Target}):
      SDK.NetworkRequest.NetworkRequest {
    const effectiveTarget = options.target || target;
    const networkManager = effectiveTarget.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
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
    assert.exists(request);
    request.requestMethod = 'GET';
    if (options.requestHeaders) {
      request.setRequestHeaders(options.requestHeaders);
    }
    if (options.finished) {
      request.finished = true;
    }
    return request;
  }

  function createEnvironment() {
    const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    networkLogView = createNetworkLogView(filterBar);
    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    const rootNode = networkLogView.columns().dataGrid().rootNode();

    return {rootNode, filterBar, networkLogView};
  }

  it('generates a valid curl command when some headers don\'t have values', async () => {
    const request = createNetworkRequest(urlString`http://localhost`, {
      requestHeaders: [
        {name: 'header-with-value', value: 'some value'},
        {name: 'no-value-header', value: ''},
      ],
    });
    const actual = await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix');
    const expected =
        'curl \'http://localhost\' \\\n  -H \'header-with-value: some value\' \\\n  -H \'no-value-header;\'';
    assert.strictEqual(actual, expected);
  });

  // Note this isn't an ideal test as the internal headers are generated rather than explicitly added,
  // are only added on HTTP/2 and HTTP/3, have a preceeding colon like `:authority` but it still tests
  // the stripping function.
  it('generates a valid curl command while stripping internal headers', async () => {
    const request = createNetworkRequest(urlString`http://localhost`, {
      requestHeaders: [
        {name: 'authority', value: 'www.example.com'},
      ],
    });
    const actual = await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix');
    const expected = 'curl \'http://localhost\'';
    assert.strictEqual(actual, expected);
  });

  it('generates a valid curl command when header values contain double quotes', async () => {
    const request = createNetworkRequest(urlString`http://localhost`, {
      requestHeaders: [{name: 'cookie', value: 'eva="Sg4="'}],
    });
    assert.strictEqual(
        await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix'),
        'curl \'http://localhost\' -b \'eva=\"Sg4=\"\'',
    );
    assert.strictEqual(
        await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'win'),
        'curl ^"http://localhost^" -b ^"eva=^\\^"Sg4=^\\^"^"',
    );
  });

  it('generates a valid curl command when header values contain percentages', async () => {
    const request = createNetworkRequest(urlString`http://localhost`, {
      requestHeaders: [{name: 'cookie', value: 'eva=%22Sg4%3D%22'}],
    });
    assert.strictEqual(
        await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix'),
        'curl \'http://localhost\' -b \'eva=%22Sg4%3D%22\'',
    );
    assert.strictEqual(
        await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'win'),
        'curl ^"http://localhost^" -b ^"eva=^%^22Sg4^%^3D^%^22^"',
    );
  });

  it('generates a valid curl command when header values contain newline and ampersand', async () => {
    const request = createNetworkRequest(urlString`http://localhost`, {
      requestHeaders: [{name: 'cookie', value: 'query=evil\n\n & cmd /c calc.exe \n\n'}],
    });
    assert.strictEqual(
        await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix'),
        'curl \'http://localhost\' -b $\'query=evil\\n\\n & cmd /c calc.exe \\n\\n\'',
    );
    assert.strictEqual(
        await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'win'),
        'curl ^\"http://localhost^\" -b ^\"query=evil^\n\n^\n\n ^& cmd /c calc.exe ^\n\n^\n\n^\"',
    );
  });

  const tests = (inScope: boolean) => () => {
    beforeEach(() => {
      networkLogView = createNetworkLogView();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    });

    it('adds dividers on main frame load events', async () => {
      const addEventDividers = sinon.spy(networkLogView.columns(), 'addEventDividers');

      networkLogView.setRecording(true);

      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
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
      target.setInspectedURL(urlString`${`http://${URL_HOST}/foo`}`);
      const fileManager = stubFileManager();

      const FINISHED_REQUEST_1 = createNetworkRequest('http://example.com/', {finished: true});
      const FINISHED_REQUEST_2 = createNetworkRequest('http://example.com/favicon.ico', {finished: true});
      const UNFINISHED_REQUEST = createNetworkRequest('http://example.com/background.bmp', {finished: false});
      sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requests').returns([
        FINISHED_REQUEST_1,
        FINISHED_REQUEST_2,
        UNFINISHED_REQUEST,
      ]);
      await networkLogView.exportAll({sanitize: false});

      if (inScope) {
        assert.isTrue(
            harWriterWrite.calledOnceWith(sinon.match.any, [FINISHED_REQUEST_1, FINISHED_REQUEST_2], sinon.match.any));
        assert.isTrue(fileManager.save.calledOnce);
        assert.isTrue(fileManager.close.calledOnce);
      } else {
        assert.isFalse(harWriterWrite.called);
        assert.isFalse(fileManager.save.called);
        assert.isFalse(fileManager.close.called);
      }
    });

    it('can import and filter from HAR', async () => {
      const URL_1 = urlString`http://example.com/`;
      const URL_2 = urlString`http://example.com/favicon.ico`;
      function makeHarEntry(url: Platform.DevToolsPath.UrlString) {
        return {
          request: {method: 'GET', url, headersSize: -1, bodySize: 0},
          response: {status: 0, content: {size: 0, mimeType: 'x-unknown'}, headersSize: -1, bodySize: -1},
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
      await RenderCoordinator.done({waitForWork: true});

      const rootNode = networkLogView.columns().dataGrid().rootNode();
      assert.deepEqual(
          rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [URL_1, URL_2]);

      networkLogView.setTextFilterValue('favicon');
      assert.deepEqual(
          rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [URL_2]);
    });

    it('shows summary toolbar with content', () => {
      target.setInspectedURL(urlString`http://example.com/`);
      const request = createNetworkRequest('http://example.com/', {finished: true});
      request.endTime = 0.669414;
      request.setIssueTime(0.435136, 0.435136);
      request.setResourceType(Common.ResourceType.resourceTypes.Document);

      networkLogView.setRecording(true);
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 0.686191});
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 0.683709);
      networkLogView.markAsRoot();
      networkLogView.show(document.body);

      const toolbar = networkLogView.summaryToolbar();
      const textElements = toolbar.querySelectorAll('.toolbar-text');
      assert.exists(textElements);
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
        assert.lengthOf(textElements, 0);
      }
    });
  };
  describe('in scope', tests(true));
  describe('out of scope', tests(false));

  const handlesSwitchingScope = (preserveLog: boolean) => async () => {
    Common.Settings.Settings.instance().moduleSetting('network-log.preserve-log').set(preserveLog);
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const anotherTarget = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const request1 = createNetworkRequest('url1', {target});
    const request2 = createNetworkRequest('url2', {target});
    const request3 = createNetworkRequest('url3', {target: anotherTarget});
    networkLogView = createNetworkLogView();
    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    await RenderCoordinator.done();

    const rootNode = networkLogView.columns().dataGrid().rootNode();
    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()), [request1, request2]);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(anotherTarget);
    await RenderCoordinator.done();
    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()),
        preserveLog ? [request1, request2, request3] : [request3]);
  };

  it('replaces requests when switching scope with preserve log off', handlesSwitchingScope(false));
  it('appends requests when switching scope with preserve log on', handlesSwitchingScope(true));

  it('appends requests on prerender activation with preserve log on', async () => {
    Common.Settings.Settings.instance().moduleSetting('network-log.preserve-log').set(true);
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const anotherTarget = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const request1 = createNetworkRequest('url1', {target});
    const request2 = createNetworkRequest('url2', {target});
    const request3 = createNetworkRequest('url3', {target: anotherTarget});
    networkLogView = createNetworkLogView();
    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    await RenderCoordinator.done();

    const rootNode = networkLogView.columns().dataGrid().rootNode();
    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()), [request1, request2]);

    activate(target);
    await RenderCoordinator.done();
    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()),
        [request1, request2, request3]);
  });

  it('hide Chrome extension requests from checkbox', async () => {
    createNetworkRequest('chrome-extension://url1', {target});
    createNetworkRequest('url2', {target});
    let rootNode;
    let filterBar;
    ({rootNode, filterBar, networkLogView} = createEnvironment());
    const hideExtCheckbox = getCheckbox(filterBar, 'Hide \'chrome-extension://\' URLs');

    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()),
        [urlString`chrome-extension://url1`, urlString`url2`]);

    clickCheckbox(hideExtCheckbox);
    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [urlString`url2`]);
  });

  it('can hide Chrome extension requests from dropdown', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN);
    createNetworkRequest('chrome-extension://url1', {target});
    createNetworkRequest('url2', {target});
    let rootNode;
    let filterBar;
    ({rootNode, filterBar, networkLogView} = createEnvironment());

    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()),
        [urlString`chrome-extension://url1`, urlString`url2`]);

    const dropdown = await getMoreTypesDropdown(filterBar);
    if (!dropdown) {
      return;
    }
    let softMenu = getMenu(() => dropdown.click());
    let hideExtensionURL = getDropdownItem(softMenu, 'Hide extension URLs');
    assert.isFalse(hideExtensionURL.buildDescriptor().checked);
    softMenu.invokeHandler(hideExtensionURL.id());
    softMenu.discard();

    softMenu = getMenu(() => dropdown.click());
    hideExtensionURL = getDropdownItem(softMenu, 'Hide extension URLs');
    assert.isTrue(hideExtensionURL.buildDescriptor().checked);

    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [urlString`url2`]);

    softMenu.discard();
  });

  it('displays correct count for more filters', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN);
    let filterBar;
    ({filterBar, networkLogView} = createEnvironment());
    const dropdown = await getMoreTypesDropdown(filterBar);
    if (!dropdown) {
      return;
    }

    assert.strictEqual(getMoreFiltersActiveCount(filterBar), '0');
    assert.isTrue(getCountAdorner(filterBar)?.classList.contains('hidden'));

    const softMenu = getMenu(() => dropdown.click());
    await selectMoreFiltersOption(softMenu, 'Hide extension URLs');

    assert.strictEqual(getMoreFiltersActiveCount(filterBar), '1');
    assert.isFalse(getCountAdorner(filterBar)?.classList.contains('hidden'));

    softMenu.discard();
  });

  it('can filter requests with blocked response cookies from checkbox', async () => {
    const request1 = createNetworkRequest('url1', {target});
    request1.blockedResponseCookies = () => [{
      blockedReasons: [Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure],
      cookie: null,
      cookieLine: 'foo=bar; SameSite=None',
    }];
    createNetworkRequest('url2', {target});
    let rootNode;
    let filterBar;
    ({rootNode, filterBar, networkLogView} = createEnvironment());
    const blockedCookiesCheckbox = getCheckbox(filterBar, 'Show only requests with blocked response cookies');
    clickCheckbox(blockedCookiesCheckbox);
    assert.deepEqual(rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [
      urlString`url1`,
    ]);
  });

  it('can filter requests with blocked response cookies from dropdown', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN);

    const request1 = createNetworkRequest('url1', {target});
    request1.blockedResponseCookies = () => [{
      blockedReasons: [Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure],
      cookie: null,
      cookieLine: 'foo=bar; SameSite=None',
    }];
    createNetworkRequest('url2', {target});
    let rootNode;
    let filterBar;
    ({rootNode, filterBar, networkLogView} = createEnvironment());

    assert.deepEqual(
        rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()),
        [urlString`url1`, urlString`url2`]);

    const dropdown = await getMoreTypesDropdown(filterBar);
    if (!dropdown) {
      return;
    }
    let softMenu = getMenu(() => dropdown.click());
    let blockedResponseCookies = getDropdownItem(softMenu, 'Blocked response cookies');
    assert.isFalse(blockedResponseCookies.buildDescriptor().checked);
    softMenu.invokeHandler(blockedResponseCookies.id());
    softMenu.discard();

    softMenu = getMenu(() => dropdown.click());
    blockedResponseCookies = getDropdownItem(softMenu, 'Blocked response cookies');
    assert.isTrue(blockedResponseCookies.buildDescriptor().checked);

    assert.deepEqual(rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [
      urlString`url1`,
    ]);

    softMenu.discard();
  });

  it('lists selected options in more filters tooltip', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN);
    let filterBar;
    ({filterBar, networkLogView} = createEnvironment());

    const dropdown = await getMoreTypesDropdown(filterBar);
    assert.exists(dropdown);

    assert.strictEqual(dropdown.title, 'Show only/hide requests');

    const softMenu = getMenu(() => dropdown.click());
    await selectMoreFiltersOption(softMenu, 'Blocked response cookies');
    await selectMoreFiltersOption(softMenu, 'Hide extension URLs');

    assert.strictEqual(dropdown.title, 'Hide extension URLs, Blocked response cookies');

    softMenu.discard();
  });

  it('updates tooltip to default when more filters option deselected', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN);
    let filterBar;
    ({filterBar, networkLogView} = createEnvironment());

    const dropdown = await getMoreTypesDropdown(filterBar);
    assert.exists(dropdown);

    assert.strictEqual(dropdown.title, 'Show only/hide requests');

    const softMenu = getMenu(() => dropdown.click());
    await selectMoreFiltersOption(softMenu, 'Blocked response cookies');

    assert.strictEqual(dropdown.title, 'Blocked response cookies');

    await selectMoreFiltersOption(softMenu, 'Blocked response cookies');

    assert.strictEqual(dropdown.title, 'Show only/hide requests');

    softMenu.discard();
  });

  it('can remove requests', async () => {
    networkLogView = createNetworkLogView();
    const request = createNetworkRequest('url1', {target});
    networkLogView.markAsRoot();
    networkLogView.show(document.body);

    const rootNode = networkLogView.columns().dataGrid().rootNode();
    assert.lengthOf(rootNode.children, 1);

    networkLog.dispatchEventToListeners(Logs.NetworkLog.Events.RequestRemoved, {request});
    assert.lengthOf(rootNode.children, 0);
  });

  it('correctly shows/hides "Copy all as HAR (with sensitive data)" menu item', async () => {
    const networkShowOptionsToGenerateHarWithSensitiveDataSetting = Common.Settings.Settings.instance().createSetting(
        'network.show-options-to-generate-har-with-sensitive-data', false);
    createNetworkRequest('url1', {target});
    networkLogView = createNetworkLogView(new UI.FilterBar.FilterBar('network-panel', true));
    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    networkLogView.columns().dataGrid().rootNode().children[0].select();
    const {element} = networkLogView.columns().dataGrid();

    {
      // Setting is disabled (default), menu item must be hidden.
      networkShowOptionsToGenerateHarWithSensitiveDataSetting.set(false);
      const contextMenu = getContextMenuForElement(element);
      const clipboardSection = contextMenu.clipboardSection();
      const copyMenu = findMenuItemWithLabel(clipboardSection, 'Copy') as UI.ContextMenu.SubMenu;
      assert.isUndefined(findMenuItemWithLabel(copyMenu.footerSection(), 'Copy all as HAR (with sensitive data)'));
    }

    {
      // Setting is enabled, menu item must be shown.
      networkShowOptionsToGenerateHarWithSensitiveDataSetting.set(true);
      const contextMenu = getContextMenuForElement(element);
      const clipboardSection = contextMenu.clipboardSection();
      const copyMenu = findMenuItemWithLabel(clipboardSection, 'Copy') as UI.ContextMenu.SubMenu;
      assert.isDefined(findMenuItemWithLabel(copyMenu.footerSection(), 'Copy all as HAR (with sensitive data)'));
    }
  });

  it('correctly shows and hides waterfall column', async () => {
    const columnSettings = Common.Settings.Settings.instance().createSetting('network-log-columns', {});
    columnSettings.set({
      waterfall: {visible: false, title: 'waterfall'},
    });
    networkLogView = createNetworkLogView();
    let columns = networkLogView.columns();
    let networkColumnWidget = columns.dataGrid().asWidget().parentWidget();
    assert.instanceOf(networkColumnWidget, UI.SplitWidget.SplitWidget);
    assert.strictEqual((networkColumnWidget).showMode(), UI.SplitWidget.ShowMode.ONLY_MAIN);

    columnSettings.set({
      waterfall: {visible: true, title: 'waterfall'},
    });
    networkLogView = createNetworkLogView();
    columns = networkLogView.columns();
    columns.switchViewMode(true);
    networkColumnWidget = columns.dataGrid().asWidget().parentWidget();
    assert.instanceOf(networkColumnWidget, UI.SplitWidget.SplitWidget);
    assert.strictEqual((networkColumnWidget).showMode(), UI.SplitWidget.ShowMode.BOTH);
  });

  function createOverrideRequests() {
    const urlNotOverridden = urlString`url-not-overridden`;
    const urlHeaderOverridden = urlString`url-header-overridden`;
    const urlContentOverridden = urlString`url-content-overridden`;
    const urlHeaderAndContentOverridden = urlString`url-header-und-content-overridden`;

    createNetworkRequest(urlNotOverridden, {target});
    const r2 = createNetworkRequest(urlHeaderOverridden, {target});
    const r3 = createNetworkRequest(urlContentOverridden, {target});
    const r4 = createNetworkRequest(urlHeaderAndContentOverridden, {target});

    // set up overrides
    r2.originalResponseHeaders = [{name: 'content-type', value: 'x'}];
    r2.responseHeaders = [{name: 'content-type', value: 'overriden'}];
    r3.hasOverriddenContent = true;
    r4.originalResponseHeaders = [{name: 'age', value: 'x'}];
    r4.responseHeaders = [{name: 'age', value: 'overriden'}];
    r4.hasOverriddenContent = true;

    return {urlNotOverridden, urlHeaderOverridden, urlContentOverridden, urlHeaderAndContentOverridden};
  }

  it('can apply filter - has-overrides:yes', async () => {
    const {urlHeaderOverridden, urlContentOverridden, urlHeaderAndContentOverridden} = createOverrideRequests();

    const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    networkLogView = createNetworkLogView(filterBar);
    networkLogView.setTextFilterValue('has-overrides:yes');

    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    const rootNode = networkLogView.columns().dataGrid().rootNode();

    assert.deepEqual(rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [
      urlHeaderOverridden,
      urlContentOverridden,
      urlHeaderAndContentOverridden,
    ]);
  });

  it('can apply filter - has-overrides:no', async () => {
    const {urlNotOverridden} = createOverrideRequests();

    const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    networkLogView = createNetworkLogView(filterBar);
    networkLogView.setTextFilterValue('has-overrides:no');

    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    const rootNode = networkLogView.columns().dataGrid().rootNode();

    assert.deepEqual(rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [
      urlNotOverridden,
    ]);
  });

  it('can apply filter - has-overrides:headers', async () => {
    const {urlHeaderOverridden, urlHeaderAndContentOverridden} = createOverrideRequests();

    const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    networkLogView = createNetworkLogView(filterBar);
    networkLogView.setTextFilterValue('has-overrides:headers');

    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    const rootNode = networkLogView.columns().dataGrid().rootNode();

    assert.deepEqual(rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [
      urlHeaderOverridden,
      urlHeaderAndContentOverridden,
    ]);
  });

  it('can apply filter - has-overrides:content', async () => {
    const {urlContentOverridden, urlHeaderAndContentOverridden} = createOverrideRequests();

    const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    networkLogView = createNetworkLogView(filterBar);
    networkLogView.setTextFilterValue('has-overrides:content');

    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    const rootNode = networkLogView.columns().dataGrid().rootNode();

    assert.deepEqual(rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [
      urlContentOverridden,
      urlHeaderAndContentOverridden,
    ]);
  });

  it('can apply filter - has-overrides:tent', async () => {
    const {urlHeaderAndContentOverridden, urlContentOverridden} = createOverrideRequests();

    const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    networkLogView = createNetworkLogView(filterBar);
    networkLogView.setTextFilterValue('has-overrides:tent');  // partial text

    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    const rootNode = networkLogView.columns().dataGrid().rootNode();

    assert.deepEqual(rootNode.children.map(n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url()), [
      urlContentOverridden,
      urlHeaderAndContentOverridden,
    ]);
  });

  it('filters localized resource categories', async () => {
    // "simulate" other locale by stubbing out resource categories with a different text
    sinon.stub(Common.ResourceType.resourceCategories.Document, 'title')
        .returns(i18n.i18n.lockedString('<localized document>'));
    sinon.stub(Common.ResourceType.resourceCategories.XHR, 'title').returns(i18n.i18n.lockedString('<localized xhr>'));

    const documentRequest = createNetworkRequest('urlDocument', {finished: true});
    documentRequest.setResourceType(Common.ResourceType.resourceTypes.Document);
    const fetchRequest = createNetworkRequest('urlFetch', {finished: true});
    fetchRequest.setResourceType(Common.ResourceType.resourceTypes.Fetch);

    const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    networkLogView = createNetworkLogView(filterBar);

    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    const rootNode = networkLogView.columns().dataGrid().rootNode();
    const shownRequestUrls = () => rootNode.children.map(
        n => (n as Network.NetworkDataGridNode.NetworkNode).request()?.url() as string | undefined);

    const setting = Common.Settings.Settings.instance().createSetting('network-resource-type-filters', {});
    setting.set({all: true});
    assert.deepEqual(shownRequestUrls(), ['urlDocument', 'urlFetch']);

    setting.set({[Common.ResourceType.resourceCategories.Document.name]: true});
    assert.deepEqual(shownRequestUrls(), ['urlDocument']);

    setting.set({[Common.ResourceType.resourceCategories.XHR.name]: true});
    assert.deepEqual(shownRequestUrls(), ['urlFetch']);
  });

  it('"Copy all" commands respects filters', async () => {
    createOverrideRequests();

    const filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    networkLogView = createNetworkLogView(filterBar);
    networkLogView.markAsRoot();
    networkLogView.show(document.body);
    const copyText = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText').resolves();

    // Set network filter
    networkLogView.setTextFilterValue('has-overrides:headers');

    // Get DataGrid
    const dataGrid = networkLogView.columns().dataGrid().element;
    assert.isDefined(dataGrid);
    // Select first element
    networkLogView.columns().dataGrid().rootNode().children[0].select();
    // Get context menu, clipboard section
    const contextMenu = getContextMenuForElement(dataGrid);
    const clipboardSection = contextMenu.clipboardSection();
    // Assert that there is only one entry (for 'Copy') in the clipboard section
    assert.deepEqual(['Copy'], getMenuItemLabels(clipboardSection));
    const copyItem = clipboardSection.items[0];
    // Use the 'Copy' sub-menu, get menu items from the footer section
    const footerSection = (copyItem as UI.ContextMenu.SubMenu).footerSection();

    const copyAllURLs = findMenuItemWithLabel(footerSection, 'Copy all listed URLs');
    assert.isDefined(copyAllURLs);
    contextMenu.invokeHandler(copyAllURLs.id());
    await expectCalled(copyText);
    assert.strictEqual(copyText.callCount, 1);
    assert.deepEqual(copyText.lastCall.args, [`url-header-overridden
url-header-und-content-overridden`]);
    copyText.resetHistory();

    const copyAllCurlComnmands = findMenuItemWithLabel(
        footerSection, Host.Platform.isWin() ? 'Copy all listed as cURL (bash)' : 'Copy all listed as cURL');
    assert.isDefined(copyAllCurlComnmands);
    contextMenu.invokeHandler(copyAllCurlComnmands.id());
    await expectCalled(copyText);
    assert.strictEqual(copyText.callCount, 1);
    assert.deepEqual(copyText.lastCall.args, [`curl 'url-header-overridden' ;
curl 'url-header-und-content-overridden'`]);
    copyText.resetHistory();

    const copyAllFetchCall = findMenuItemWithLabel(footerSection, 'Copy all listed as fetch');
    assert.isDefined(copyAllFetchCall);
    contextMenu.invokeHandler(copyAllFetchCall.id());
    await expectCalled(copyText);
    assert.strictEqual(copyText.callCount, 1);
    assert.deepEqual(copyText.lastCall.args, [`fetch("url-header-overridden", {
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "omit"
}); ;
fetch("url-header-und-content-overridden", {
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "omit"
});`]);
    copyText.resetHistory();

    const copyAllPowerShell = findMenuItemWithLabel(footerSection, 'Copy all listed as PowerShell');
    assert.isDefined(copyAllPowerShell);
    contextMenu.invokeHandler(copyAllPowerShell.id());
    await expectCalled(copyText);
    assert.strictEqual(copyText.callCount, 1);
    assert.deepEqual(copyText.lastCall.args, [`Invoke-WebRequest -UseBasicParsing -Uri "url-header-overridden";\r
Invoke-WebRequest -UseBasicParsing -Uri "url-header-und-content-overridden"`]);
    // Clear network filter
    networkLogView.setTextFilterValue('');
    copyText.resetHistory();

    contextMenu.invokeHandler(copyAllURLs.id());
    await expectCalled(copyText);
    assert.strictEqual(copyText.callCount, 1);
    assert.deepEqual(copyText.lastCall.args, [`url-not-overridden
url-header-overridden
url-content-overridden
url-header-und-content-overridden`]);
    copyText.resetHistory();

    contextMenu.invokeHandler(copyAllCurlComnmands.id());
    await expectCalled(copyText);
    assert.strictEqual(copyText.callCount, 1);
    assert.deepEqual(copyText.lastCall.args, [`curl 'url-not-overridden' ;
curl 'url-header-overridden' ;
curl 'url-content-overridden' ;
curl 'url-header-und-content-overridden'`]);
    copyText.resetHistory();

    contextMenu.invokeHandler(copyAllFetchCall.id());
    await expectCalled(copyText);
    assert.strictEqual(copyText.callCount, 1);
    assert.deepEqual(copyText.lastCall.args, [`fetch("url-not-overridden", {
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "omit"
}); ;
fetch("url-header-overridden", {
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "omit"
}); ;
fetch("url-content-overridden", {
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "omit"
}); ;
fetch("url-header-und-content-overridden", {
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "omit"
});`]);
    copyText.resetHistory();

    contextMenu.invokeHandler(copyAllPowerShell.id());
    await expectCalled(copyText);
    assert.strictEqual(copyText.callCount, 1);
    assert.deepEqual(copyText.lastCall.args, [`Invoke-WebRequest -UseBasicParsing -Uri "url-not-overridden";\r
Invoke-WebRequest -UseBasicParsing -Uri "url-header-overridden";\r
Invoke-WebRequest -UseBasicParsing -Uri "url-content-overridden";\r
Invoke-WebRequest -UseBasicParsing -Uri "url-header-und-content-overridden"`]);
    copyText.resetHistory();
  });

  it('skips unknown columns without title in persistence setting', async () => {
    const columnSettings = Common.Settings.Settings.instance().createSetting('network-log-columns', {});
    columnSettings.set({
      '--this-does-not-exist-for-sure': {visible: false},
    });
    networkLogView = createNetworkLogView();
    const columns = networkLogView.columns().dataGrid().columns;
    assert.notExists(columns['--this-does-not-exist-for-sure']);
  });

  it('treats unknown columns with title in persistence setting as custom header', async () => {
    const columnSettings = Common.Settings.Settings.instance().createSetting('network-log-columns', {});
    columnSettings.set({
      'custom-header-for-test': {visible: false, title: 'Custom-Header'},
    });
    networkLogView = createNetworkLogView();
    const dataGrid = networkLogView.columns().dataGrid();
    const columns = dataGrid.columns;
    assert.exists(columns['custom-header-for-test']);

    const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const header = dataGrid.element.querySelector('thead');
    const event = new MouseEvent('contextmenu');
    sinon.stub(event, 'target').value(header);
    dataGrid.element.dispatchEvent(event);

    assert.isTrue(contextMenuShow.calledOnce);
    const responseHeadersSubMenu = contextMenuShow.thisValues[0].footerSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Response Headers');
    assert.exists(responseHeadersSubMenu);
    assert.instanceOf(responseHeadersSubMenu, UI.ContextMenu.SubMenu);
    const customHeaderItem = responseHeadersSubMenu.defaultSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Custom-Header');
    assert.exists(customHeaderItem);
  });
});

describeWithMockConnection('NetworkLogView placeholder', () => {
  const START_RECORDING_ID = 'network.toggle-recording';
  const RELOAD_ID = 'inspector-main.reload';

  beforeEach(() => {
    stubNoopSettings();
    UI.ActionRegistration.registerActionExtension({
      actionId: START_RECORDING_ID,
      category: UI.ActionRegistration.ActionCategory.NETWORK,
      title: () => 'mock' as Platform.UIString.LocalizedString,
      toggleable: true,
    });
    UI.ActionRegistration.registerActionExtension({
      actionId: RELOAD_ID,
      category: UI.ActionRegistration.ActionCategory.NETWORK,
      title: () => 'mock' as Platform.UIString.LocalizedString,
      toggleable: true,
    });
    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => 'Ctrl',
      shortcutsForAction: () => [new UI.KeyboardShortcut.KeyboardShortcut(
          [{key: UI.KeyboardShortcut.Keys.Ctrl.code, name: 'Ctrl'}], '', UI.KeyboardShortcut.Type.DEFAULT_SHORTCUT)],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
  });

  it('shows instruction to start recording', async () => {
    const networkLogView = createNetworkLogView();
    testPlaceholderText(
        networkLogView, 'No network activity recorded',
        'Record network log to display network activity by using the \"Start recording\" button or by hitting Ctrl.');
    testPlaceholderButton(networkLogView, 'Start recording', START_RECORDING_ID);
  });

  it('shows placeholder with instruction to reload page if already recording', async () => {
    const networkLogView = createNetworkLogView();
    networkLogView.setRecording(true);

    testPlaceholderText(
        networkLogView, 'Currently recording network activity',
        'Perform a request or reload the page by using the \"Reload page\" button or by hitting Ctrl.');
    testPlaceholderButton(networkLogView, 'Reload page', RELOAD_ID);
  });
});

function testPlaceholderText(
    networkLogView: Network.NetworkLogView.NetworkLogView, expectedHeaderText: string,
    expectedDescriptionText: string) {
  const emptyWidget = networkLogView.element.querySelector('.empty-state');

  const header = emptyWidget?.querySelector('.empty-state-header')?.textContent;
  const description = emptyWidget?.querySelector('.empty-state-description > span')?.textContent;

  assert.deepEqual(header, expectedHeaderText);
  assert.deepEqual(description, expectedDescriptionText);
}

function testPlaceholderButton(
    networkLogView: Network.NetworkLogView.NetworkLogView, expectedButtonText: string, actionId: string) {
  const button = networkLogView.element.querySelector('.empty-state devtools-button');
  assert.exists(button);
  assert.deepEqual(button.textContent, expectedButtonText);

  const action = UI.ActionRegistry.ActionRegistry.instance().getAction(actionId);
  const spy = sinon.spy(action, 'execute');

  assert.isTrue(spy.notCalled);
  dispatchClickEvent(button);
  assert.isTrue(spy.calledOnce);
}

function clickCheckbox(checkbox: HTMLInputElement) {
  checkbox.checked = true;
  const event = new Event('change');
  checkbox.dispatchEvent(event);
}

function getCheckbox(filterBar: UI.FilterBar.FilterBar, title: string) {
  const checkbox =
      filterBar.element.querySelector(`[title="${title}"] dt-checkbox`)?.shadowRoot?.querySelector('input') || null;
  assert.instanceOf(checkbox, HTMLInputElement);
  return checkbox;
}

async function getMoreTypesDropdown(filterBar: UI.FilterBar.FilterBar): Promise<HTMLElement> {
  return filterBar.element.querySelector('[aria-label="Show only/hide requests dropdown"]')
             ?.querySelector('.toolbar-button') as HTMLElement;
}

function getCountAdorner(filterBar: UI.FilterBar.FilterBar): HTMLElement|null {
  const button = filterBar.element.querySelector('[aria-label="Show only/hide requests dropdown"]')
                     ?.querySelector('.toolbar-button');
  return button?.querySelector('.active-filters-count') ?? null;
}

function getMoreFiltersActiveCount(filterBar: UI.FilterBar.FilterBar): string {
  const countAdorner = getCountAdorner(filterBar);
  const count = countAdorner?.querySelector('[slot="content"]')?.textContent ?? '';
  return count;
}

function getDropdownItem(softMenu: UI.ContextMenu.ContextMenu, label: string) {
  const item = findMenuItemWithLabel(softMenu.defaultSection(), label);
  assertNotNullOrUndefined(item);
  return item;
}

async function selectMoreFiltersOption(softMenu: UI.ContextMenu.ContextMenu, option: string) {
  const item = getDropdownItem(softMenu, option);
  softMenu.invokeHandler(item.id());
  await raf();
}

function createNetworkLogView(filterBar?: UI.FilterBar.FilterBar): Network.NetworkLogView.NetworkLogView {
  if (!filterBar) {
    filterBar = {addFilter: () => {}, filterButton: () => ({addEventListener: () => {}}), addDivider: () => {}} as
        unknown as UI.FilterBar.FilterBar;
  }
  return new Network.NetworkLogView.NetworkLogView(
      filterBar, document.createElement('div'),
      Common.Settings.Settings.instance().createSetting('network-log-large-rows', false));
}
