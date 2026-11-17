// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Workspace from '../workspace/workspace.js';

import * as Persistence from './persistence.js';

const {urlString} = Platform.DevToolsPath;

class TestPlatformFileSystem extends Persistence.PlatformFileSystem.PlatformFileSystem {
  readonly #manager: Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager;
  constructor(path: Platform.DevToolsPath.UrlString,
              manager: Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager) {
    super(path, Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT, false);
    this.#manager = manager;
  }
  override isFileExcluded(folderPath: Platform.DevToolsPath.EncodedPathString): boolean {
    const regex = this.#manager.workspaceFolderExcludePatternSetting().asRegExp();
    return Boolean(regex?.test(Common.ParsedURL.ParsedURL.encodedPathToRawPathString(folderPath)));
  }
  override embedderPath(): Platform.DevToolsPath.RawPathString {
    return Common.ParsedURL.ParsedURL.urlToRawPathString(this.path(), Host.Platform.isWin());
  }
}

describe('IsolatedFileSystemManager', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  afterEach(() => {
    universe.dispose();
  });

  it('does not propagate events for ignored files', () => {
    const manager = universe.isolatedFileSystemManager;
    manager.workspaceFolderExcludePatternSetting().set('[iI]gnored');

    const fileSystemPath = urlString`file:///var/www`;
    const fileSystem = new TestPlatformFileSystem(fileSystemPath, manager);
    manager.addPlatformFileSystem(fileSystemPath, fileSystem);

    const changedFiles: string[] = [];
    const addedFiles: string[] = [];

    manager.addEventListener(Persistence.IsolatedFileSystemManager.Events.FileSystemFilesChanged, event => {
      for (const file of event.data.added.valuesArray()) {
        addedFiles.push(file);
      }
      for (const file of event.data.changed.valuesArray()) {
        changedFiles.push(file);
      }
    });

    const hostInstance = Host.InspectorFrontendHost.InspectorFrontendHostInstance;

    // Simulate adding files
    hostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved, {
          added: [
            '/var/www/ignoredFile' as Platform.DevToolsPath.RawPathString,
            '/var/www/alsoIgnoredFile' as Platform.DevToolsPath.RawPathString,
            '/var/www/friendlyFile' as Platform.DevToolsPath.RawPathString,
          ],
          changed: [],
          removed: [],
        });

    assert.deepEqual(addedFiles, ['file:///var/www/friendlyFile']);
    assert.deepEqual(changedFiles, []);

    // Reset received files
    addedFiles.length = 0;
    changedFiles.length = 0;

    // Simulate modifying files
    hostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved, {
          added: [],
          changed: [
            '/var/www/ignoredFile' as Platform.DevToolsPath.RawPathString,
            '/var/www/alsoIgnoredFile' as Platform.DevToolsPath.RawPathString,
            '/var/www/friendlyFile' as Platform.DevToolsPath.RawPathString,
          ],
          removed: [],
        });

    assert.deepEqual(addedFiles, []);
    assert.deepEqual(changedFiles, ['file:///var/www/friendlyFile']);
  });

  it('unregisters event listeners on dispose', () => {
    const manager =
        new Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager(universe.settings, universe.console);
    const events = Host.InspectorFrontendHost.InspectorFrontendHostInstance.events;

    const registeredEvents = [
      Host.InspectorFrontendHostAPI.Events.FileSystemRemoved,
      Host.InspectorFrontendHostAPI.Events.FileSystemAdded,
      Host.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved,
      Host.InspectorFrontendHostAPI.Events.IndexingTotalWorkCalculated,
      Host.InspectorFrontendHostAPI.Events.IndexingWorked,
      Host.InspectorFrontendHostAPI.Events.IndexingDone,
      Host.InspectorFrontendHostAPI.Events.SearchCompleted,
    ];

    for (const event of registeredEvents) {
      assert.isTrue(events.hasEventListeners(event), `Expected listener for ${event} to be registered`);
    }

    manager.dispose();

    for (const event of registeredEvents) {
      assert.isFalse(events.hasEventListeners(event), `Expected listener for ${event} to be unregistered`);
    }
  });

  describe('file system project', () => {
    // The DOM file system types are not available when this file is type
    // checked for Node, so derive them from the embedder API instead (they
    // resolve to the real DOM `FileSystem` / `FileSystemDirectoryEntry` types
    // in the browser build). The fakes below are structurally checked against
    // them in `asDOMFileSystem()`, so no casts are needed.
    type DOMFileSystem =
        NonNullable<ReturnType<Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI['isolatedFileSystem']>>;
    type DOMDirectoryEntry = DOMFileSystem['root'];
    type Entry = TestFileSystemEntry&DOMDirectoryEntry;
    type EntryCallback = (entry: Entry) => void;
    type ErrorCallback = (error: DOMException) => void;
    interface Flags {
      create?: boolean;
      exclusive?: boolean;
    }

    class TestFileSystemWriter extends EventTarget {
      readonly #entry: TestFileSystemEntry;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      readonly INIT = 0;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      readonly WRITING = 1;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      readonly DONE = 2;
      readyState = 0;
      position = 0;
      length = 0;
      onwritestart = (_event?: unknown): void => {};
      onprogress = (_event?: unknown): void => {};
      onwrite = (_event?: unknown): void => {};
      onabort = (_event?: unknown): void => {};
      onerror = (_event?: unknown): void => {};
      onwriteend = (_event?: unknown): void => {};
      readonly error = new Error('Write error');

      constructor(entry: TestFileSystemEntry) {
        super();
        this.#entry = entry;
        this.length = entry.content.size;
      }

      abort(): void {
      }

      seek(offset: number): void {
        this.position = offset;
      }

      write(blob: Blob): void {
        this.#entry.timestamp += 500;
        this.#entry.content = new File([blob], this.#entry.name, {type: 'text/plain'});
        this.length = blob.size;
        this.onwriteend();
      }

      truncate(num: number): void {
        this.#entry.timestamp += 500;
        this.#entry.content = new File([this.#entry.content.slice(0, num)], this.#entry.name, {type: 'text/plain'});
        this.length = this.#entry.content.size;
        this.onwriteend();
      }
    }

    class TestFileSystemEntry {
      readonly fileSystem: TestFileSystem;
      name: string;
      readonly children = new Map<string, TestFileSystemEntry>();
      readonly isDirectory: boolean;
      readonly isFile: boolean;
      timestamp = 1000000;
      parent: TestFileSystemEntry|null;
      content = new File([''], '', {type: 'text/plain'});

      constructor(fileSystem: TestFileSystem, name: string, isDirectory: boolean, parent: TestFileSystemEntry|null) {
        this.fileSystem = fileSystem;
        this.name = name;
        this.isDirectory = isDirectory;
        this.isFile = !isDirectory;
        this.parent = parent;
      }

      get filesystem(): DOMFileSystem {
        return this.fileSystem.asDOMFileSystem();
      }

      get fullPath(): string {
        return this.parent ? `${this.parent.fullPath}/${this.name}` : '';
      }

      mkdir(name: string): TestFileSystemEntry {
        const child = new TestFileSystemEntry(this.fileSystem, name, true, this);
        this.children.set(name, child);
        return child;
      }

      addFile(name: string, content = ''): TestFileSystemEntry {
        const child = new TestFileSystemEntry(this.fileSystem, name, false, this);
        this.children.set(name, child);
        child.content = new File([content], name, {type: 'text/plain'});

        if (this.fileSystem.isActive()) {
          const fullPath = (this.fileSystem.fileSystemPath + child.fullPath) as Platform.DevToolsPath.RawPathString;
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
              Host.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved,
              {changed: [], added: [fullPath], removed: []});
        }
        return child;
      }

      setContent(content: string): void {
        this.content = new File([content], this.name, {type: 'text/plain'});
        this.timestamp += 1000;
        if (this.fileSystem.isActive()) {
          const fullPath = (this.fileSystem.fileSystemPath + this.fullPath) as Platform.DevToolsPath.RawPathString;
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
              Host.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved,
              {changed: [fullPath], added: [], removed: []});
        }
      }

      createReader(): {readEntries(callback: (entries: Entry[]) => void): void} {
        let remaining: Entry[] = [...this.children.values()];
        return {
          readEntries(callback: (entries: Entry[]) => void): void {
            const entries = remaining;
            remaining = [];
            callback(entries);
          },
        };
      }

      createWriter(success: (writer: TestFileSystemWriter) => void): void {
        success(new TestFileSystemWriter(this));
      }

      file(callback: (file: File) => void): void {
        callback(this.content);
      }

      getDirectory(path: string, options?: Flags, callback?: EntryCallback, errorCallback?: ErrorCallback): void {
        this.#getEntry(path, options, callback, errorCallback);
      }

      getFile(path: string, options?: Flags, callback?: EntryCallback, errorCallback?: ErrorCallback): void {
        this.#getEntry(path, options, callback, errorCallback);
      }

      #createEntry(path: string, options: Flags, callback?: EntryCallback, errorCallback?: ErrorCallback): void {
        const tokens = path.split('/');
        const name = tokens.pop() ?? '';
        let parentEntry: TestFileSystemEntry|undefined = this;
        for (const token of tokens) {
          parentEntry = parentEntry?.children.get(token);
        }
        if (!parentEntry) {
          errorCallback?.(new DOMException(`Path not found: ${path}`, 'NotFoundError'));
          return;
        }
        let entry = parentEntry.children.get(name);
        if (entry && options.exclusive) {
          errorCallback?.(new DOMException(`File exists: ${path}`, 'InvalidModificationError'));
          return;
        }
        if (!entry) {
          entry = parentEntry.addFile(name, '');
        }
        callback?.(entry);
      }

      #getEntry(rawPath: string, options: Flags|undefined, callback?: EntryCallback,
                errorCallback?: ErrorCallback): void {
        const path = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
        if (options?.create) {
          this.#createEntry(path, options, callback, errorCallback);
          return;
        }
        if (!path) {
          callback?.(this);
          return;
        }
        let entry: TestFileSystemEntry|undefined = this;
        for (const token of path.split('/')) {
          entry = entry.children.get(token);
          if (!entry) {
            break;
          }
        }
        if (entry) {
          callback?.(entry);
        } else {
          errorCallback?.(new DOMException(`Path not found: ${path}`, 'NotFoundError'));
        }
      }

      getMetadata(success: (metadata: {modificationTime: Date, size: number}) => void): void {
        success({
          modificationTime: new Date(this.timestamp),
          size: this.isDirectory ? 0 : this.content.size,
        });
      }

      moveTo(parent: DOMDirectoryEntry, newName?: string, callback?: EntryCallback): void {
        assert.instanceOf(parent, TestFileSystemEntry);
        this.parent?.children.delete(this.name);
        this.parent = parent;
        this.name = newName ?? this.name;
        this.parent.children.set(this.name, this);
        callback?.(this);
      }

      copyTo(_parent: DOMDirectoryEntry, _newName?: string, _callback?: EntryCallback,
             errorCallback?: ErrorCallback): void {
        errorCallback?.(new DOMException('copyTo is not supported', 'NotSupportedError'));
      }

      toURL(): string {
        return `file://${this.fileSystem.fileSystemPath}${this.fullPath}`;
      }

      remove(success: () => void): void {
        this.parent?.children.delete(this.name);
        success();
      }

      removeRecursively(success: () => void): void {
        this.children.clear();
        this.remove(success);
      }

      getParent(callback?: EntryCallback): void {
        callback?.(this.parent ?? this);
      }
    }

    class TestFileSystem {
      readonly root: TestFileSystemEntry;
      readonly fileSystemPath: Platform.DevToolsPath.RawPathString;
      readonly #registry: Map<string, TestFileSystem>;
      readonly #activeSet: Set<TestFileSystem>;
      readonly #manager: Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager;

      constructor(fileSystemPath: string, registry: Map<string, TestFileSystem>, activeSet: Set<TestFileSystem>,
                  manager: Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager) {
        this.root = new TestFileSystemEntry(this, '', true, null);
        this.fileSystemPath = fileSystemPath as Platform.DevToolsPath.RawPathString;
        this.#registry = registry;
        this.#activeSet = activeSet;
        this.#manager = manager;
      }

      get name(): string {
        return this.fileSystemPath;
      }

      isActive(): boolean {
        return this.#activeSet.has(this);
      }

      asDOMFileSystem(): DOMFileSystem {
        // Structurally type checked against the DOM `FileSystem` interface.
        const domFileSystem: DOMFileSystem = this;
        return domFileSystem;
      }

      reportCreated(): Promise<Persistence.PlatformFileSystem.PlatformFileSystem> {
        this.#registry.set(this.fileSystemPath, this);
        this.#activeSet.add(this);
        const expectedURL = Common.ParsedURL.ParsedURL.rawPathToUrlString(this.fileSystemPath);

        return new Promise(resolve => {
          const onAdded =
              (event: Common.EventTarget.EventTargetEvent<Persistence.PlatformFileSystem.PlatformFileSystem>): void => {
                if (event.data.path() !== expectedURL) {
                  return;
                }
                this.#manager.removeEventListener(Persistence.IsolatedFileSystemManager.Events.FileSystemAdded,
                                                  onAdded);
                resolve(event.data);
              };
          this.#manager.addEventListener(Persistence.IsolatedFileSystemManager.Events.FileSystemAdded, onAdded);
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
              Host.InspectorFrontendHostAPI.Events.FileSystemAdded, {
                fileSystem: {
                  fileSystemPath: this.fileSystemPath,
                  fileSystemName: this.fileSystemPath,
                  rootURL: '',
                  type: '',
                },
              });
        });
      }

      reportRemoved(): void {
        if (!this.#activeSet.delete(this)) {
          return;
        }
        this.#registry.delete(this.fileSystemPath);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
            Host.InspectorFrontendHostAPI.Events.FileSystemRemoved, this.fileSystemPath);
      }
    }

    let fileSystemRegistry: Map<string, TestFileSystem>;
    let activeFileSystems: Set<TestFileSystem>;
    let binding: Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding;

    function createTestFileSystem(path: string): TestFileSystem {
      return new TestFileSystem(path, fileSystemRegistry, activeFileSystems, universe.isolatedFileSystemManager);
    }

    function fileSystemUISourceCodes(): Workspace.UISourceCode.UISourceCode[] {
      const uiSourceCodes: Workspace.UISourceCode.UISourceCode[] = [];
      const fileSystemProjects = universe.workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem);
      for (const project of fileSystemProjects) {
        for (const uiSourceCode of project.uiSourceCodes()) {
          uiSourceCodes.push(uiSourceCode);
        }
      }
      return uiSourceCodes;
    }

    async function snapshotUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<{
      url: string,
      isContentScript: boolean,
      mimeType: string,
      content: string | null,
    }> {
      const isScriptOrDoc = uiSourceCode.contentType() === Common.ResourceType.resourceTypes.Script ||
          uiSourceCode.contentType() === Common.ResourceType.resourceTypes.Document;
      assert.isTrue(isScriptOrDoc);
      const isContentScript = uiSourceCode.project().type() === Workspace.Workspace.projectTypes.ContentScripts;
      const deferred = TextUtils.ContentData.ContentData.asDeferredContent(await uiSourceCode.requestContentData());
      return {
        url: uiSourceCode.url(),
        isContentScript,
        mimeType: uiSourceCode.mimeType(),
        content: deferred.content,
      };
    }

    async function createPopulatedFileSystem(name: string): Promise<TestFileSystem> {
      const fs = createTestFileSystem(name);
      fs.root.mkdir('html').addFile('foo.js', '');
      fs.root.mkdir('.git').addFile('foogit.js', '');
      fs.root.addFile('bar.js', '');
      fs.root.mkdir('html2').addFile('foo.js', '');
      await fs.reportCreated();
      return fs;
    }

    function waitForScriptSource(workspace: Workspace.Workspace.WorkspaceImpl,
                                 scriptName: string): Promise<Workspace.UISourceCode.UISourceCode> {
      const findMatching = (): Workspace.UISourceCode.UISourceCode|undefined => {
        for (const uiSourceCode of workspace.uiSourceCodes()) {
          if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Service) {
            continue;
          }
          if (uiSourceCode.name() === scriptName) {
            return uiSourceCode;
          }
        }
        return undefined;
      };

      const existing = findMatching();
      if (existing) {
        return Promise.resolve(existing);
      }

      return new Promise(resolve => {
        const onAdded = (): void => {
          const match = findMatching();
          if (match) {
            workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, onAdded);
            resolve(match);
          }
        };
        workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, onAdded);
      });
    }

    beforeEach(() => {
      fileSystemRegistry = new Map();
      activeFileSystems = new Set();
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isolatedFileSystem')
          .callsFake(name => fileSystemRegistry.get(name)?.asDOMFileSystem() ?? null);
      binding = universe.fileSystemWorkspaceBinding;
    });

    afterEach(() => {
      for (const fs of [...activeFileSystems]) {
        fs.reportRemoved();
      }
      binding.dispose();
    });

    it('populates file system UISourceCodes across projects with revisions', async () => {
      const fs1 = createTestFileSystem('/var/www');
      const fs2 = createTestFileSystem('/foo/bar');

      const localhostDir = fs1.root.mkdir('localhost');
      localhostDir.addFile('foo.js', '<foo content>');
      fs1.root.addFile('bar.js', '<bark content>');
      fs2.root.addFile('baz.js', '<bazzz content>');

      const threeAdded = new Promise<void>(resolve => {
        let count = 3;
        const onUISourceCode = (): void => {
          if (--count === 0) {
            universe.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, onUISourceCode);
            resolve();
          }
        };
        universe.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, onUISourceCode);
      });

      const created1 = fs1.reportCreated();
      const created2 = fs2.reportCreated();
      await Promise.all([threeAdded, created1, created2]);

      const uiSourceCodes = fileSystemUISourceCodes();
      assert.lengthOf(uiSourceCodes, 3);

      const dumped: Array<{url: string, isContentScript: boolean, mimeType: string, content: string | null}> = [];
      for (const uiSourceCode of uiSourceCodes) {
        dumped.push(await snapshotUISourceCode(uiSourceCode));
      }
      assert.deepEqual(dumped, [
        {
          url: 'file:///var/www/localhost/foo.js',
          isContentScript: false,
          mimeType: 'text/javascript',
          content: '<foo content>',
        },
        {
          url: 'file:///var/www/bar.js',
          isContentScript: false,
          mimeType: 'text/javascript',
          content: '<bark content>',
        },
        {
          url: 'file:///foo/bar/baz.js',
          isContentScript: false,
          mimeType: 'text/javascript',
          content: '<bazzz content>',
        },
      ]);

      assert.deepEqual(uiSourceCodes.map(uiSourceCode => uiSourceCode.uiLocation(5).linkText()),
                       ['foo.js:6', 'bar.js:6', 'baz.js:6']);

      const committedPromise = universe.workspace.once(Workspace.Workspace.Events.WorkingCopyCommitted);
      uiSourceCodes[0].addRevision('<Modified UISourceCode content>');
      const committedEvent = await committedPromise;
      assert.strictEqual(committedEvent.uiSourceCode, uiSourceCodes[0]);
      assert.strictEqual(committedEvent.content, '<Modified UISourceCode content>');

      assert.deepEqual(await snapshotUISourceCode(uiSourceCodes[0]), {
        url: 'file:///var/www/localhost/foo.js',
        isContentScript: false,
        mimeType: 'text/javascript',
        content: '<Modified UISourceCode content>',
      });
    });

    it('excludes default version-control folders when populating a file system', async () => {
      await createPopulatedFileSystem('/var/www');
      assert.deepEqual(fileSystemUISourceCodes().map(u => u.url()), [
        'file:///var/www/html/foo.js',
        'file:///var/www/bar.js',
        'file:///var/www/html2/foo.js',
      ]);
    });

    it('excludes folders configured in the workspace-excluded-folders setting', async () => {
      universe.settings.createLocalSetting('workspace-excluded-folders', {}).set({'file:///var/www2': ['/html/']});
      await createPopulatedFileSystem('/var/www2');
      assert.deepEqual(fileSystemUISourceCodes().map(u => u.url()), [
        'file:///var/www2/bar.js',
        'file:///var/www2/html2/foo.js',
      ]);
    });

    it('excludes a folder dynamically via project.excludeFolder', async () => {
      await createPopulatedFileSystem('/var/www3');
      fileSystemUISourceCodes()[0].project().excludeFolder(urlString`file:///var/www3/html2/`);
      assert.deepEqual(fileSystemUISourceCodes().map(u => u.url()), [
        'file:///var/www3/html/foo.js',
        'file:///var/www3/bar.js',
      ]);
    });

    it('adds UISourceCodes when files are added externally', async () => {
      const fs = createTestFileSystem('/var/www4');
      const dir = fs.root.mkdir('html');
      dir.addFile('foo.js', '');
      await fs.reportCreated();

      assert.deepEqual(fileSystemUISourceCodes().map(u => u.url()), [
        'file:///var/www4/html/foo.js',
      ]);

      dir.addFile('bar.js', '');

      assert.deepEqual(fileSystemUISourceCodes().map(u => u.url()), [
        'file:///var/www4/html/foo.js',
        'file:///var/www4/html/bar.js',
      ]);
    });

    it('collects initial git folders for a file system', async () => {
      const fs = createTestFileSystem('/var/www3');
      fs.root.mkdir('project_1').mkdir('.git').addFile('foo.git');
      fs.root.mkdir('project_2').mkdir('.git').addFile('bar.git');
      fs.root.mkdir('project_3').mkdir('.svn').addFile('baz.svn');
      fs.root.mkdir('project_4').addFile('index.html');
      await fs.reportCreated();

      const isolatedFileSystem = universe.isolatedFileSystemManager.fileSystem(urlString`file:///var/www3`);
      assert.isNotNull(isolatedFileSystem);
      const folders = isolatedFileSystem.initialGitFolders().sort();
      assert.deepEqual(folders, [
        'project_1/' as Platform.DevToolsPath.EncodedPathString,
        'project_2/' as Platform.DevToolsPath.EncodedPathString,
      ]);
    });

    it('returns updated UISourceCode metadata after file modification', async () => {
      const fs = createTestFileSystem('/var/www3');
      const file = fs.root.mkdir('test').addFile('hello.js', '123456');
      const createdPromise = fs.reportCreated();
      const uiSourceCode = await waitForScriptSource(universe.workspace, 'hello.js');
      await createdPromise;

      const initialMetadata = await uiSourceCode.requestMetadata();
      assert.isNotNull(initialMetadata);
      assert.strictEqual(initialMetadata.contentSize, 6);
      assert.strictEqual(initialMetadata.modificationTime?.toISOString(), '1970-01-01T00:16:40.000Z');

      file.setContent('changed content');
      const changedMetadata = await uiSourceCode.requestMetadata();
      assert.isNotNull(changedMetadata);
      assert.strictEqual(changedMetadata.contentSize, 15);
      assert.strictEqual(changedMetadata.modificationTime?.toISOString(), '1970-01-01T00:16:41.000Z');
    });

    it('updates workspace URL mappings when renaming a file', async () => {
      const fs = createTestFileSystem('/var/www3');
      fs.root.mkdir('test').addFile('hello.js', '123456');
      const createdPromise = fs.reportCreated();
      const uiSourceCode = await waitForScriptSource(universe.workspace, 'hello.js');
      await createdPromise;

      const originalURL = uiSourceCode.url();
      assert.strictEqual(originalURL, urlString`file:///var/www3/test/hello.js`);

      const renamed = await uiSourceCode.rename('goodbye.js' as Platform.DevToolsPath.RawPathString);
      assert.isTrue(renamed);
      assert.strictEqual(uiSourceCode.url(), urlString`file:///var/www3/test/goodbye.js`);
      assert.isNull(uiSourceCode.project().workspace().uiSourceCodeForURL(originalURL));
      assert.strictEqual(uiSourceCode.project().workspace().uiSourceCodeForURL(uiSourceCode.url()), uiSourceCode);
    });
  });
});
