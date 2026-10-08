// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createFakeSetting, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import type {TestUniverse} from '../../testing/TestUniverse.js';
import {createContentProviderUISourceCode, createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html} from '../../ui/lit/lit.js';

import * as SourcesComponents from './components/components.js';
import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describe('TabbedEditorContainer', () => {

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
    let viewStub: ViewFunctionStub<typeof Sources.TabbedEditorContainer.TabbedEditorContainer>;
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

      viewStub = createViewFunctionStub(Sources.TabbedEditorContainer.TabbedEditorContainer);
      const setting = createFakeSetting<LocalSerializedHistoryItem[]>('previously-viewed-files', []);
      tabbedEditorContainer =
          new Sources.TabbedEditorContainer.TabbedEditorContainer(undefined, viewStub, uiSourceCode => {
            let view = views.get(uiSourceCode);
            if (!view) {
              view = new UI.Widget.Widget();
              views.set(uiSourceCode, view);
            }
            return view;
          });
      tabbedEditorContainer.previouslyViewedFilesSetting = setting;
    });

    afterEach(() => {
      Root.DevToolsContext.setGlobalInstance(null);
    });

    it('renders shortcuts in placeholder', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container, {includeCommonStyles: true});

      const input: Sources.TabbedEditorContainer.TabbedEditorViewInput = {
        openTabs: [],
        leftToolbarItems: [],
        rightToolbarItems: [],
        tabDelegate: {closeTabs: () => {}, onContextMenu: () => {}},
        shortcuts: [
          {
            description: 'Open file' as Platform.UIString.LocalizedString,
            onClick: () => {},
            keys: ['Ctrl+P'],
          },
          {
            description: '' as Platform.UIString.LocalizedString,
            onClick: () => {},
            keys: [],
          },
        ],
        onAddFileSystemClicked: () => {},
        onConnectAutomaticFileSystem: () => {},
        onClose: () => {},
        onTabOrderChanged: () => {},
        onSelect: () => {},
      };

      Sources.TabbedEditorContainer.DEFAULT_VIEW(input, undefined, container);
      await raf();

      const tabbedPane = container.querySelector('devtools-tabbed-pane');
      const placeholder = tabbedPane?.shadowRoot?.querySelector('.sources-placeholder') as HTMLElement;
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
      const addFileSystemStub = sinon.stub();
      const container = document.createElement('div');
      renderElementIntoDOM(container, {includeCommonStyles: true});

      const input: Sources.TabbedEditorContainer.TabbedEditorViewInput = {
        openTabs: [],
        leftToolbarItems: [],
        rightToolbarItems: [],
        tabDelegate: {closeTabs: () => {}, onContextMenu: () => {}},
        shortcuts: [],
        onAddFileSystemClicked: addFileSystemStub,
        onConnectAutomaticFileSystem: () => {},
        onClose: () => {},
        onTabOrderChanged: () => {},
        onSelect: () => {},
      };

      Sources.TabbedEditorContainer.DEFAULT_VIEW(input, undefined, container);
      await raf();

      const tabbedPane = container.querySelector('devtools-tabbed-pane');
      const placeholder = tabbedPane?.shadowRoot?.querySelector('.sources-placeholder') as HTMLElement;
      assert.exists(placeholder);

      const button = placeholder.querySelector('button');
      assert.exists(button);
      assert.strictEqual(button?.textContent, 'Select folder');

      button?.click();
      sinon.assert.calledOnce(addFileSystemStub);
    });

    it('renders open tabs correctly', async () => {
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '300px';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      renderElementIntoDOM(container, {includeCommonStyles: true});

      const stubUiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);

      const input: Sources.TabbedEditorContainer.TabbedEditorViewInput = {
        openTabs: [
          {
            tabId: 'tab-active',
            title: 'active.js',
            tooltip: 'active.js',
            uiSourceCode: stubUiSourceCode,
            isCloseable: true,
            hasLoadError: false,
            hasUnsavedCommittedChanges: false,
          },
          {
            tabId: 'tab-error',
            title: 'error.js',
            tooltip: 'error.js',
            uiSourceCode: stubUiSourceCode,
            isCloseable: true,
            hasLoadError: true,
            hasUnsavedCommittedChanges: false,
          },
          {
            tabId: 'tab-persisted',
            title: 'persisted.js',
            tooltip: 'persisted.js',
            uiSourceCode: stubUiSourceCode,
            isCloseable: true,
            hasLoadError: false,
            hasUnsavedCommittedChanges: false,
            icon: html`<devtools-icon class="small dot green" name="document"></devtools-icon>`,
          },
          {
            tabId: 'tab-unsaved',
            title: 'unsaved.js',
            tooltip: 'unsaved.js',
            uiSourceCode: stubUiSourceCode,
            isCloseable: true,
            hasLoadError: false,
            hasUnsavedCommittedChanges: true,
          },
        ],
        activeTabId: 'tab-active',
        leftToolbarItems: [],
        rightToolbarItems: [],
        tabDelegate: {
          closeTabs: () => {},
          onContextMenu: () => {},
        },
        shortcuts: [],
        onAddFileSystemClicked: () => {},
        onConnectAutomaticFileSystem: () => {},
        onClose: () => {},
        onTabOrderChanged: () => {},
        onSelect: () => {},
      };

      Sources.TabbedEditorContainer.DEFAULT_VIEW(input, undefined, container);
      await raf();
      await assertScreenshot('sources/tabbed-editor-container-tabs.png');
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

      // Verify initial tabs.
      assert.lengthOf(viewStub.input.openTabs, 3);
      assert.strictEqual(viewStub.input.openTabs[0].title, 'bar.js');
      assert.strictEqual(viewStub.input.openTabs[1].title, 'foo.js');
      assert.strictEqual(viewStub.input.openTabs[2].title, 'foo.js');
      assert.strictEqual(viewStub.input.activeTabId, viewStub.input.openTabs[2].tabId);

      // Create binding.
      const binding = new Persistence.Persistence.PersistenceBinding(networkSourceCode, fsSourceCode);
      await persistence.addBinding(binding);

      // Verify tabs after binding.
      assert.lengthOf(viewStub.input.openTabs, 2);
      assert.strictEqual(viewStub.input.openTabs[0].title, 'bar.js');
      assert.strictEqual(viewStub.input.openTabs[1].title, 'foo.js');
      assert.strictEqual(viewStub.input.activeTabId, viewStub.input.openTabs[1].tabId);
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

      // Verify that the network tab is opened.
      assert.lengthOf(viewStub.input.openTabs, 1);
      assert.strictEqual(viewStub.input.openTabs[0].uiSourceCode, networkSourceCode);

      // Create binding.
      const binding = new Persistence.Persistence.PersistenceBinding(networkSourceCode, fsSourceCode);
      await persistence.addBinding(binding);

      // Verify tabs after binding: network tab is replaced by the file system tab.
      assert.lengthOf(viewStub.input.openTabs, 1);
      assert.strictEqual(viewStub.input.openTabs[0].uiSourceCode, fsSourceCode);
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

      // Verify that the filesystem tab is opened, not the network one.
      assert.lengthOf(viewStub.input.openTabs, 1);
      assert.strictEqual(viewStub.input.openTabs[0].uiSourceCode, fsSourceCode);
      assert.strictEqual(tabbedEditorContainer.currentFile(), fsSourceCode);
    });

    it('creates new source view of updated type when renamed file requires a different viewer', async () => {
      const editorContainer = new Sources.TabbedEditorContainer.TabbedEditorContainer();
      const {uiSourceCode, project} = createFileSystemUISourceCode({
        url: urlString`file:///path/to/overrides/example.html`,
        mimeType: 'text/html',
        universe: testUniverse,
      });
      project.canSetFileContent = () => true;
      project.rename = (_uiSourceCode: Workspace.UISourceCode.UISourceCode, newName: string,
                        callback: (arg0: boolean, arg1?: string, arg2?: Platform.DevToolsPath.UrlString,
                                   arg3?: Common.ResourceType.ResourceType) => void) => {
        const newURL = urlString`${'file:///path/to/overrides/' + newName}`;
        let newContentType = Common.ResourceType.resourceTypes.Document;
        if (newName.endsWith('.jpg')) {
          newContentType = Common.ResourceType.resourceTypes.Image;
        } else if (newName.endsWith('.woff')) {
          newContentType = Common.ResourceType.resourceTypes.Font;
        }
        callback(true, newName, newURL, newContentType);
      };

      editorContainer.viewForFile(uiSourceCode);
      assert.instanceOf(editorContainer.getCreatedSourceView(uiSourceCode),
                        Sources.UISourceCodeFrame.UISourceCodeFrame);

      await uiSourceCode.rename('newName.html' as Platform.DevToolsPath.RawPathString);
      assert.instanceOf(editorContainer.getCreatedSourceView(uiSourceCode),
                        Sources.UISourceCodeFrame.UISourceCodeFrame);

      await uiSourceCode.rename('image.jpg' as Platform.DevToolsPath.RawPathString);
      assert.instanceOf(editorContainer.getCreatedSourceView(uiSourceCode), SourceFrame.ImageView.ImageView);

      await uiSourceCode.rename('font.woff' as Platform.DevToolsPath.RawPathString);
      assert.instanceOf(editorContainer.getCreatedSourceView(uiSourceCode), SourceFrame.FontView.FontView);
      editorContainer.detach();
    });

    it('creates a HeadersView when the filename is \'.headers\'', () => {
      const editorContainer = new Sources.TabbedEditorContainer.TabbedEditorContainer();
      const uiSourceCode = new Workspace.UISourceCode.UISourceCode(
          {} as Persistence.FileSystemWorkspaceBinding.FileSystem,
          urlString`file:///path/to/overrides/www.example.com/.headers`, Common.ResourceType.resourceTypes.Document);
      sinon.stub(uiSourceCode, 'mimeType').returns('text/plain');
      editorContainer.viewForFile(uiSourceCode);
      assert.instanceOf(editorContainer.getCreatedSourceView(uiSourceCode), SourcesComponents.HeadersView.HeadersView);
      editorContainer.detach();
    });

    it('records the correct media type in the DevTools.SourcesPanelFileOpened metric', async () => {
      const editorContainer = new Sources.TabbedEditorContainer.TabbedEditorContainer();
      const {uiSourceCode} = createFileSystemUISourceCode({
        url: urlString`file:///path/to/project/example.ts`,
        mimeType: 'text/typescript',
        content: 'export class Foo {}',
        universe: testUniverse,
      });
      const sourcesPanelFileOpenedSpy = sinon.spy(Host.userMetrics, 'sourcesPanelFileOpened');
      const contentLoadedPromise = new Promise(res => window.addEventListener('source-file-loaded', res));
      const widget = editorContainer.viewForFile(uiSourceCode);
      assert.instanceOf(widget, Sources.UISourceCodeFrame.UISourceCodeFrame);

      sinon.stub(widget, 'loadPlugins' as keyof typeof widget);
      widget.wasShown();

      await contentLoadedPromise;

      sinon.assert.calledWithExactly(sourcesPanelFileOpenedSpy, 'text/typescript');
      editorContainer.detach();
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
      const viewStub = createViewFunctionStub(Sources.TabbedEditorContainer.TabbedEditorContainer);
      const tabbedEditorContainer =
          new Sources.TabbedEditorContainer.TabbedEditorContainer(undefined, viewStub, () => new UI.Widget.Widget());
      tabbedEditorContainer.previouslyViewedFilesSetting = setting;

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

      const tabTitles = viewStub.input.openTabs.map(t => t.title);
      assert.deepEqual(tabTitles, ['foo.js', 'bar.js', 'baz.js']);
      assert.strictEqual(tabbedEditorContainer.currentFile(), fsUiSourceCode3);
    });
  });
});
