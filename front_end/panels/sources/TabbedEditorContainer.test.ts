// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createFakeSetting, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import type {TestUniverse} from '../../testing/TestUniverse.js';
import {createContentProviderUISourceCode, createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describe('TabbedEditorContainer', () => {
  describe('HistoryItem', () => {
    const {HistoryItem} = Sources.TabbedEditorContainer;
    const url = urlString`http://localhost`;

    describe('fromObject', () => {
      it('rejects invalid resource type names', () => {
        assert.throws(() => {
          HistoryItem.fromObject({url, resourceTypeName: 'some-invalid-resource-type-name'});
        });
      });

      it('correctly deserializes resource type names', () => {
        for (const resourceType of Object.values(Common.ResourceType.resourceTypes)) {
          const resourceTypeName = resourceType.name();
          assert.propertyVal(HistoryItem.fromObject({url, resourceTypeName}), 'resourceType', resourceType);
        }
      });
    });

    describe('toObject', () => {
      it('correctly serializes resource types', () => {
        for (const resourceType of Object.values(Common.ResourceType.resourceTypes)) {
          const item = new HistoryItem(url, resourceType);
          assert.propertyVal(item.toObject(), 'resourceTypeName', resourceType.name());
        }
      });
    });
  });

  describe('History', () => {
    const {History, HistoryItem} = Sources.TabbedEditorContainer;

    describe('fromObject', () => {
      it('deserializes correctly', () => {
        const history = History.fromObject([
          {url: 'http://localhost/foo.js', resourceTypeName: 'script'},
          {url: 'webpack:///src/foo.vue', resourceTypeName: 'sm-script', scrollLineNumber: 5},
          {url: 'http://localhost/foo.js', resourceTypeName: 'sm-script'},
        ]);
        const keys = history.keys();
        assert.lengthOf(keys, 3);
        assert.propertyVal(keys[0], 'url', 'http://localhost/foo.js');
        assert.propertyVal(keys[0], 'resourceType', Common.ResourceType.resourceTypes.Script);
        assert.isUndefined(history.selectionRange(keys[0]));
        assert.isUndefined(history.scrollLineNumber(keys[0]));
        assert.propertyVal(keys[1], 'url', 'webpack:///src/foo.vue');
        assert.propertyVal(keys[1], 'resourceType', Common.ResourceType.resourceTypes.SourceMapScript);
        assert.isUndefined(history.selectionRange(keys[1]));
        assert.strictEqual(history.scrollLineNumber(keys[1]), 5);
        assert.propertyVal(keys[2], 'url', 'http://localhost/foo.js');
        assert.propertyVal(keys[2], 'resourceType', Common.ResourceType.resourceTypes.SourceMapScript);
        assert.isUndefined(history.selectionRange(keys[2]));
        assert.isUndefined(history.scrollLineNumber(keys[2]));
      });

      it('gracefully ignores items with invalid resource type names', () => {
        const history = History.fromObject([
          {url: 'http://localhost/foo.js', resourceTypeName: 'script'},
          {url: 'http://localhost/baz.js', resourceTypeName: 'some-invalid-resource-type-name'},
          {url: 'http://localhost/bar.js', resourceTypeName: 'sm-script'},
        ]);
        const keys = history.keys();
        assert.lengthOf(keys, 2);
        assert.propertyVal(keys[0], 'url', 'http://localhost/foo.js');
        assert.propertyVal(keys[1], 'url', 'http://localhost/bar.js');
      });
    });

    describe('toObject', () => {
      it('serializes correctly', () => {
        const history = new History([
          new HistoryItem(urlString`http://localhost/foo.js`, Common.ResourceType.resourceTypes.Script),
          new HistoryItem(
              urlString`webpack:///src/foo.vue`, Common.ResourceType.resourceTypes.SourceMapScript, undefined, 5),
          new HistoryItem(urlString`http://localhost/foo.js`, Common.ResourceType.resourceTypes.SourceMapScript),
        ]);
        const serializedHistory = history.toObject();
        assert.lengthOf(serializedHistory, 3);
        assert.propertyVal(serializedHistory[0], 'url', 'http://localhost/foo.js');
        assert.propertyVal(serializedHistory[0], 'resourceTypeName', 'script');
        assert.propertyVal(serializedHistory[1], 'url', 'webpack:///src/foo.vue');
        assert.propertyVal(serializedHistory[1], 'resourceTypeName', 'sm-script');
        assert.propertyVal(serializedHistory[1], 'scrollLineNumber', 5);
        assert.propertyVal(serializedHistory[2], 'url', 'http://localhost/foo.js');
        assert.propertyVal(serializedHistory[2], 'resourceTypeName', 'sm-script');
      });
    });

    describe('update', () => {
      it('moves items referenced by keys to the beginning', () => {
        const history = new History([
          new HistoryItem(urlString`webpack:///src/foo.vue`, Common.ResourceType.resourceTypes.SourceMapScript),
          new HistoryItem(urlString`http://localhost/foo.js`, Common.ResourceType.resourceTypes.Script),
          new HistoryItem(urlString`http://localhost/foo.js`, Common.ResourceType.resourceTypes.SourceMapScript),
        ]);
        history.update([{
          url: urlString`http://localhost/foo.js`,
          resourceType: Common.ResourceType.resourceTypes.Script,
        }]);
        assert.strictEqual(
            history.index({
              url: urlString`http://localhost/foo.js`,
              resourceType: Common.ResourceType.resourceTypes.Script,
            }),
            0,
        );
      });
    });
  });

  interface LocalSerializedHistoryItem {
    url: string;
    resourceTypeName: string;
    selectionRange?: TextUtils.TextRange.SerializedTextRange;
    scrollLineNumber?: number;
  }

  describeWithEnvironment('TabbedEditorContainer View', () => {
    let testUniverse: TestUniverse;
    let persistence: Persistence.Persistence.PersistenceImpl;
    let tabbedEditorContainer: Sources.TabbedEditorContainer.TabbedEditorContainer;
    const views = new Map<Workspace.UISourceCode.UISourceCode, UI.Widget.Widget>();

    beforeEach(() => {
      views.clear();
      const backend = new MockDebuggerBackend();
      testUniverse = backend.universe;
      Root.DevToolsContext.setGlobalInstance(testUniverse.context as Root.DevToolsContext.WritableDevToolsContext);
      persistence = testUniverse.persistence;
      const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
      UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
      void testUniverse.networkPersistenceManager;

      const setting = createFakeSetting<LocalSerializedHistoryItem[]>('previously-viewed-files', []);
      tabbedEditorContainer = new Sources.TabbedEditorContainer.TabbedEditorContainer();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabbedEditorContainer.historyManager = {trackSourceFrameCursorJumps: () => {}} as any;
      tabbedEditorContainer.previouslyViewedFilesSetting = setting;
      // Hook getOrCreateSourceView for tests replacing the view caching
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sinon.stub(tabbedEditorContainer as any, 'getOrCreateSourceView').callsFake(uiSourceCode => {
        let view = views.get(uiSourceCode as Workspace.UISourceCode.UISourceCode);
        if (!view) {
          view = new UI.Widget.Widget();
          views.set(uiSourceCode as Workspace.UISourceCode.UISourceCode, view);
        }
        return view;
      });
    });

    afterEach(() => {
      Root.DevToolsContext.setGlobalInstance(null);
    });

    it('renders shortcuts in placeholder', async () => {
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry.instance(), 'shortcutsForAction').callsFake(actionId => {
        if (actionId === 'quick-open.show') {
          return [{descriptors: [{name: 'Ctrl+P'}]}] as unknown as UI.KeyboardShortcut.KeyboardShortcut[];
        }
        return [];
      });
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'getAction').callsFake(_ => {
        return {execute: () => Promise.resolve()} as unknown as UI.ActionRegistration.Action;
      });

      const setting = createFakeSetting<LocalSerializedHistoryItem[]>('previously-viewed-files', []);
      const container = new Sources.TabbedEditorContainer.TabbedEditorContainer();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      container.historyManager = {trackSourceFrameCursorJumps: () => {}} as any;
      container.previouslyViewedFilesSetting = setting;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sinon.stub(container as any, 'getOrCreateSourceView').returns(new UI.Widget.Widget());

      renderElementIntoDOM(container);
      const tabbedPane = container.tabbedPaneForTesting;
      await tabbedPane.updateComplete;

      const placeholder = tabbedPane.element.shadowRoot?.querySelector('.sources-placeholder') as HTMLElement;
      assert.exists(placeholder);

      const shortcutLines = placeholder.querySelectorAll('.shortcut-line');
      assert.lengthOf(shortcutLines, 2);

      const button = shortcutLines[0].querySelector('button');
      assert.exists(button);
      assert.strictEqual(button?.textContent, 'Open file');

      const keys = Array.from(shortcutLines[0].querySelectorAll('.keybinds-key span')).map(span => span.textContent);
      assert.lengthOf(keys, 1);

      assert.notExists(shortcutLines[1].querySelector('button'));
    });

    it('triggers addFileSystem when select folder button is clicked', async () => {
      const addFileSystemStub =
          sinon.stub(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(), 'addFileSystem')
              .resolves(null);

      renderElementIntoDOM(tabbedEditorContainer);
      const tabbedPane = tabbedEditorContainer.tabbedPaneForTesting;
      await tabbedPane.updateComplete;

      const placeholder = tabbedPane.element.shadowRoot?.querySelector('.sources-placeholder') as HTMLElement;
      assert.exists(placeholder);

      const button = placeholder.querySelector('button');
      assert.exists(button);
      assert.strictEqual(button?.textContent, 'Select folder');

      button?.click();
      sinon.assert.calledOnce(addFileSystemStub);
    });

    it('keeps selected tab when persistence binding is created', async () => {
      const networkUrl = urlString`https://example.com/foo.js`;
      const fsUrlfoo = urlString`file:///var/www/foo.js`;
      const fsUrlbar = urlString`file:///var/www/bar.js`;

      const {uiSourceCode: networkSourceCode} = createContentProviderUISourceCode({
        url: networkUrl,
        mimeType: 'text/javascript',
        projectType: Workspace.Workspace.projectTypes.Network,
        universe: testUniverse,
      });

      const {uiSourceCode: fsSourceCode} = createFileSystemUISourceCode({
        url: fsUrlfoo,
        mimeType: 'text/javascript',
        fileSystemPath: 'file:///var/www',
        autoMapping: true,
        universe: testUniverse,
      });

      const {uiSourceCode: barSourceCode} = createFileSystemUISourceCode({
        url: fsUrlbar,
        mimeType: 'text/javascript',
        fileSystemPath: 'file:///var/www',
        universe: testUniverse,
      });

      // Open tabs.
      tabbedEditorContainer.showFile(barSourceCode);
      tabbedEditorContainer.showFile(networkSourceCode);
      tabbedEditorContainer.showFile(fsSourceCode);

      const tabbedPane = tabbedEditorContainer.tabbedPaneForTesting;

      // Verify initial tabs.
      let tabs = tabbedPane.tabs;
      assert.lengthOf(tabs, 3);
      assert.strictEqual(tabs[0].title, 'bar.js');
      assert.strictEqual(tabbedPane.tabView(tabs[0].id), views.get(barSourceCode));
      assert.strictEqual(tabs[1].title, 'foo.js');
      assert.strictEqual(tabbedPane.tabView(tabs[1].id), views.get(networkSourceCode));
      assert.strictEqual(tabs[2].title, 'foo.js');
      assert.strictEqual(tabbedPane.tabView(tabs[2].id), views.get(fsSourceCode));
      assert.isTrue(tabs[2].selected);

      // Create binding.
      const binding = new Persistence.Persistence.PersistenceBinding(networkSourceCode, fsSourceCode);
      await persistence.addBinding(binding);

      // Verify tabs after binding.
      tabs = tabbedPane.tabs;
      assert.lengthOf(tabs, 2);
      assert.strictEqual(tabs[0].title, 'bar.js');
      assert.strictEqual(tabbedPane.tabView(tabs[0].id), views.get(barSourceCode));
      assert.strictEqual(tabs[1].title, 'foo.js');
      assert.strictEqual(tabbedPane.tabView(tabs[1].id), views.get(fsSourceCode));
      assert.isTrue(tabs[1].selected);
    });

    it('replaces network tab with file system tab when persistence binding is established', async () => {
      const networkUrl = urlString`http://127.0.0.1:8000/devtools/persistence/resources/foo.js`;
      const fsUrl = urlString`file:///var/www/devtools/persistence/resources/foo.js`;

      const {uiSourceCode: networkSourceCode} = createContentProviderUISourceCode({
        url: networkUrl,
        mimeType: 'text/javascript',
        projectType: Workspace.Workspace.projectTypes.Network,
        universe: testUniverse,
      });

      const {uiSourceCode: fsSourceCode} = createFileSystemUISourceCode({
        url: fsUrl,
        mimeType: 'text/javascript',
        fileSystemPath: 'file:///var/www',
        autoMapping: true,
        universe: testUniverse,
      });

      // Open the network tab.
      tabbedEditorContainer.showFile(networkSourceCode);

      const tabbedPane = tabbedEditorContainer.tabbedPaneForTesting;

      // Verify that the network tab is opened.
      let tabs = tabbedPane.tabs;
      assert.lengthOf(tabs, 1);
      assert.strictEqual(tabbedPane.tabView(tabs[0].id), views.get(networkSourceCode));

      // Create binding.
      const binding = new Persistence.Persistence.PersistenceBinding(networkSourceCode, fsSourceCode);
      await persistence.addBinding(binding);

      // Verify tabs after binding: network tab is replaced by the file system tab.
      tabs = tabbedPane.tabs;
      assert.lengthOf(tabs, 1);
      assert.strictEqual(tabbedPane.tabView(tabs[0].id), views.get(fsSourceCode));
    });

    it('opens filesystem UISourceCode when network UISourceCode with persistence binding is shown', async () => {
      const networkUrl = urlString`http://127.0.0.1:8000/devtools/persistence/resources/foo.js`;
      const fsUrl = urlString`file:///var/www/devtools/persistence/resources/foo.js`;

      const {uiSourceCode: networkSourceCode} = createContentProviderUISourceCode({
        url: networkUrl,
        mimeType: 'text/javascript',
        projectType: Workspace.Workspace.projectTypes.Network,
        universe: testUniverse,
      });

      const {uiSourceCode: fsSourceCode} = createFileSystemUISourceCode({
        url: fsUrl,
        mimeType: 'text/javascript',
        fileSystemPath: 'file:///var/www',
        autoMapping: true,
        universe: testUniverse,
      });

      // Create binding.
      const binding = new Persistence.Persistence.PersistenceBinding(networkSourceCode, fsSourceCode);
      await persistence.addBinding(binding);

      // Show the network file.
      tabbedEditorContainer.showFile(networkSourceCode);

      const tabbedPane = tabbedEditorContainer.tabbedPaneForTesting;

      // Verify that the filesystem tab is opened, not the network one.
      const tabs = tabbedPane.tabs;
      assert.lengthOf(tabs, 1);
      assert.strictEqual(tabbedPane.tabView(tabs[0].id), views.get(fsSourceCode));
      assert.strictEqual(tabbedEditorContainer.currentFile(), fsSourceCode);
    });
  });
});

describeWithEnvironment('TabbedEditorContainer', () => {
  describe('tabbed editor', () => {
    it('doesn\'t shuffle tabs when bindings are dropped and re-added', () => {
      const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
        workspace,
      });
      const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
        forceNew: true,
        targetManager,
        workspace,
        debuggerWorkspaceBinding,
        settings: Common.Settings.Settings.instance(),
      });
      Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
      Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
      UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});

      const setting =
          createFakeSetting<Sources.TabbedEditorContainer.SerializedHistoryItem[]>('previouslyViewedFilesSetting', []);
      const tabbedEditorContainer = new Sources.TabbedEditorContainer.TabbedEditorContainer();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabbedEditorContainer.historyManager = {trackSourceFrameCursorJumps: () => {}} as any;
      tabbedEditorContainer.previouslyViewedFilesSetting = setting;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sinon.stub(tabbedEditorContainer as any, 'getOrCreateSourceView').returns(new UI.Widget.Widget());

      const {uiSourceCode: uiSourceCode1} =
          createContentProviderUISourceCode({url: urlString`http://localhost/foo.js`, mimeType: 'text/javascript'});
      const {uiSourceCode: uiSourceCode2} =
          createContentProviderUISourceCode({url: urlString`http://localhost/bar.js`, mimeType: 'text/javascript'});
      const {uiSourceCode: uiSourceCode3} =
          createContentProviderUISourceCode({url: urlString`http://localhost/baz.js`, mimeType: 'text/javascript'});

      tabbedEditorContainer.showFile(uiSourceCode1);
      tabbedEditorContainer.showFile(uiSourceCode2);
      tabbedEditorContainer.showFile(uiSourceCode3);

      const {uiSourceCode: fsUiSourceCode1} = createFileSystemUISourceCode(
          {url: urlString`file:///var/www/devtools/persistence/resources/foo.js`, mimeType: 'text/javascript'});
      const {uiSourceCode: fsUiSourceCode2} = createFileSystemUISourceCode(
          {url: urlString`file:///var/www/devtools/persistence/resources/bar.js`, mimeType: 'text/javascript'});
      const {uiSourceCode: fsUiSourceCode3} = createFileSystemUISourceCode(
          {url: urlString`file:///var/www/devtools/persistence/resources/baz.js`, mimeType: 'text/javascript'});

      const binding1 = new Persistence.Persistence.PersistenceBinding(uiSourceCode1, fsUiSourceCode1);
      const binding2 = new Persistence.Persistence.PersistenceBinding(uiSourceCode2, fsUiSourceCode2);
      const binding3 = new Persistence.Persistence.PersistenceBinding(uiSourceCode3, fsUiSourceCode3);

      Persistence.Persistence.PersistenceImpl.instance().dispatchEventToListeners(
          Persistence.Persistence.Events.BindingCreated, binding1);
      Persistence.Persistence.PersistenceImpl.instance().dispatchEventToListeners(
          Persistence.Persistence.Events.BindingCreated, binding2);
      Persistence.Persistence.PersistenceImpl.instance().dispatchEventToListeners(
          Persistence.Persistence.Events.BindingCreated, binding3);

      const tabbedPane = tabbedEditorContainer.tabbedPaneForTesting;
      const tabTitles = tabbedPane.tabs.map(t => t.title);
      assert.deepEqual(tabTitles, ['foo.js', 'bar.js', 'baz.js']);
      assert.strictEqual(tabbedEditorContainer.currentFile(), fsUiSourceCode3);
    });
  });
});
