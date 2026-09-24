// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as Workspace from '../workspace/workspace.js';

import * as Persistence from './persistence.js';

const {urlString} = Platform.DevToolsPath;

describe('FileSystemWorkspaceBinding', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('does not conflict when file system paths share a prefix', async () => {
    const fsPath1 = 'file:///var/www';
    const fsPath2 = 'file:///var/www_suffix';

    const {project: project1, uiSourceCode: fooSourceCode} = createFileSystemUISourceCode({
      url: urlString`file:///var/www/foo.js`,
      content: 'foo',
      fileSystemPath: fsPath1,
      mimeType: 'text/javascript',
      universe,
    });

    const {project: project2, uiSourceCode: barSourceCode} = createFileSystemUISourceCode({
      url: urlString`file:///var/www_suffix/bar.js`,
      content: 'bar',
      fileSystemPath: fsPath2,
      mimeType: 'text/javascript',
      universe,
    });

    const workspace = universe.workspace;

    // Ensure the UISourceCodes are added to the workspace
    assert.strictEqual(
        workspace.uiSourceCodeForURL(urlString`file:///var/www/foo.js`),
        fooSourceCode,
    );
    assert.strictEqual(
        workspace.uiSourceCodeForURL(urlString`file:///var/www_suffix/bar.js`),
        barSourceCode,
    );

    assert.strictEqual(
        fooSourceCode.project(),
        project1,
        'foo.js should be in the first filesystem project',
    );
    assert.strictEqual(
        barSourceCode.project(),
        project2,
        'bar.js should be in the second filesystem project',
    );

    // Make sure path isolation works and it does not incorrectly truncate paths.
    assert.strictEqual(project1.fileSystemPath(), fsPath1);
    assert.strictEqual(project2.fileSystemPath(), fsPath2);

    // Update content and ensure it reflects correctly
    barSourceCode.setWorkingCopy('Why!?');
    const fooContent = await fooSourceCode.requestContentData();
    assert.isNotOk(TextUtils.ContentData.ContentData.isError(fooContent));
    assert.strictEqual(
        (fooContent as TextUtils.ContentData.ContentData).text,
        'foo',
    );
    assert.strictEqual(fooSourceCode.workingCopy(), 'foo');
    assert.strictEqual(barSourceCode.workingCopy(), 'Why!?');
  });

  it('creates file atomically with content', async () => {
    const fsPath = 'file:///var/www';
    const {project} = createFileSystemUISourceCode({
      url: urlString`file:///var/www/existing.js`,
      content: 'existing content',
      fileSystemPath: fsPath,
      mimeType: 'text/javascript',
      universe,
    });

    const platformFileSystem = project.fileSystem();

    // Stub createFile to simulate successful file creation on disk.
    const createFileStub = sinon.stub(platformFileSystem, 'createFile');
    createFileStub.callsFake(
        async (
            path: Platform.DevToolsPath.EncodedPathString,
            name: Platform.DevToolsPath.RawPathString|null,
            ) => {
          return ((path ? path + '/' : '') + name) as Platform.DevToolsPath.EncodedPathString;
        },
    );

    // Stub contentType to return the correct resource type.
    const contentTypeStub = sinon.stub(platformFileSystem, 'contentType');
    contentTypeStub.returns(Common.ResourceType.resourceTypes.Script);

    const workspace = universe.workspace;
    const addedPromise = new Promise<Workspace.UISourceCode.UISourceCode>(
        resolve => {
          const listener = (
              event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>,
              ) => {
            const uiSourceCode = event.data;
            if (uiSourceCode.url() === 'file:///var/www/new_file.js') {
              workspace.removeEventListener(
                  Workspace.Workspace.Events.UISourceCodeAdded,
                  listener,
              );
              resolve(uiSourceCode);
            }
          };
          workspace.addEventListener(
              Workspace.Workspace.Events.UISourceCodeAdded,
              listener,
          );
        },
    );

    const newFileContent = 'new file content';
    const uiSourceCode = await project.createFile(
        '' as Platform.DevToolsPath.EncodedPathString,
        'new_file.js' as Platform.DevToolsPath.RawPathString,
        newFileContent,
    );

    assert.exists(uiSourceCode);
    const addedUISourceCode = await addedPromise;
    assert.strictEqual(addedUISourceCode, uiSourceCode);

    const contentData = await addedUISourceCode.requestContentData();
    assert.isFalse(TextUtils.ContentData.ContentData.isError(contentData));
    assert.strictEqual(
        (contentData as TextUtils.ContentData.ContentData).text,
        newFileContent,
    );
  });
  describe('FileSystem', () => {
    it('deletes file from PlatformFileSystem and removes it from Project', async () => {
      const fileSystemPath = urlString`file:///var/www`;
      const fileUrl = urlString`${fileSystemPath}/script.js`;
      const {uiSourceCode, project} = createFileSystemUISourceCode({
        url: fileUrl,
        mimeType: 'text/javascript',
        content: 'testme',
        fileSystemPath,
        universe,
      });

      const platformFileSystem = project.fileSystem();
      const deleteFileStub = sinon.stub(platformFileSystem, 'deleteFile').resolves(true);

      assert.lengthOf([...project.uiSourceCodes()], 1);
      assert.strictEqual([...project.uiSourceCodes()][0], uiSourceCode);

      const workspace = universe.workspace;
      const uiSourceCodeRemovedPromise = new Promise<void>(resolve => {
        const listener = (
            event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>,
            ) => {
          if (event.data === uiSourceCode) {
            workspace.removeEventListener(
                Workspace.Workspace.Events.UISourceCodeRemoved,
                listener,
            );
            resolve();
          }
        };
        workspace.addEventListener(
            Workspace.Workspace.Events.UISourceCodeRemoved,
            listener,
        );
      });

      project.deleteFile(uiSourceCode);

      await uiSourceCodeRemovedPromise;

      sinon.assert.callCount(deleteFileStub, 1);
      assert.strictEqual(
          deleteFileStub.firstCall.args[0],
          '/script.js' as Platform.DevToolsPath.EncodedPathString,
      );
      assert.lengthOf([...project.uiSourceCodes()], 0);
    });

    it('does not remove file from Project if PlatformFileSystem deletion fails', async () => {
      const fileSystemPath = urlString`file:///var/www`;
      const fileUrl = urlString`${fileSystemPath}/script.js`;
      const {uiSourceCode, project} = createFileSystemUISourceCode({
        url: fileUrl,
        mimeType: 'text/javascript',
        content: 'testme',
        fileSystemPath,
        universe,
      });

      const platformFileSystem = project.fileSystem();
      const deleteFileStub = sinon.stub(platformFileSystem, 'deleteFile').resolves(false);

      assert.lengthOf([...project.uiSourceCodes()], 1);

      project.deleteFile(uiSourceCode);

      await deleteFileStub.firstCall.returnValue;

      sinon.assert.callCount(deleteFileStub, 1);
      assert.lengthOf([...project.uiSourceCodes()], 1);
      assert.strictEqual([...project.uiSourceCodes()][0], uiSourceCode);
    });
  });

  describe('with a file system root that has a trailing slash', () => {
    const embedderPath = '/tmp/wstest/' as Platform.DevToolsPath.RawPathString;
    const changedEmbedderPath = '/tmp/wstest/app.js' as Platform.DevToolsPath.RawPathString;
    const fileSystemURL = urlString`file:///tmp/wstest`;
    const fileURL = urlString`file:///tmp/wstest/app.js`;

    function createFakeDOMFileSystem():
        ReturnType<Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI['isolatedFileSystem']> {
      const fileEntry = {isFile: true, isDirectory: false, name: 'app.js', fullPath: '/app.js'};
      const rootEntry = {
        isFile: false,
        isDirectory: true,
        name: '',
        fullPath: '/',
        createReader() {
          let done = false;
          return {
            readEntries(successCallback: (entries: unknown[]) => void) {
              const entries = done ? [] : [fileEntry];
              done = true;
              successCallback(entries);
            },
          };
        },
        getDirectory(_path: string, _options: unknown, successCallback: (entry: unknown) => void) {
          successCallback(rootEntry);
        },
      };
      return {name: 'wstest', root: rootEntry} as unknown as
          ReturnType<Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI['isolatedFileSystem']>;
    }

    async function addFileSystem(manager: Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager):
        Promise<Persistence.PlatformFileSystem.PlatformFileSystem> {
      const hostInstance = Host.InspectorFrontendHost.InspectorFrontendHostInstance;
      sinon.stub(hostInstance, 'isolatedFileSystem').returns(createFakeDOMFileSystem());
      const fileSystemAdded = manager.once(Persistence.IsolatedFileSystemManager.Events.FileSystemAdded);
      hostInstance.events.dispatchEventToListeners(Host.InspectorFrontendHostAPI.Events.FileSystemAdded, {
        fileSystem: {
          type: '',
          fileSystemName: 'wstest',
          rootURL: 'filesystem:devtools://devtools/isolated/wstest',
          fileSystemPath: embedderPath,
        },
      });
      return await fileSystemAdded;
    }

    function removeFileSystem(): void {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
          Host.InspectorFrontendHostAPI.Events.FileSystemRemoved, embedderPath);
    }

    function changeFile(): void {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
          Host.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved,
          {changed: [changedEmbedderPath], added: [], removed: []});
    }

    it('does not create a duplicate UISourceCode when an existing file changes', async () => {
      const workspace = universe.workspace;
      const manager = universe.isolatedFileSystemManager;
      const binding = universe.fileSystemWorkspaceBinding;
      try {
        await addFileSystem(manager);
        const [project] = workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem);
        assert.exists(project);
        const [uiSourceCode] = project.uiSourceCodes();
        assert.exists(uiSourceCode);

        changeFile();

        assert.deepEqual([...project.uiSourceCodes()], [uiSourceCode],
                         'the change must be reported to the existing UISourceCode instead of creating a new one');
        assert.strictEqual(workspace.uiSourceCodeForURL(fileURL), uiSourceCode);
      } finally {
        removeFileSystem();
        binding.dispose();
      }
    });

    it('uses canonical URLs, but keeps the embedder path verbatim', async () => {
      const workspace = universe.workspace;
      const manager = universe.isolatedFileSystemManager;
      const binding = universe.fileSystemWorkspaceBinding;
      try {
        const fileSystem = await addFileSystem(manager);
        assert.strictEqual(fileSystem.path(), fileSystemURL);
        assert.strictEqual(fileSystem.embedderPath(), embedderPath);
        assert.strictEqual(manager.fileSystem(fileSystemURL), fileSystem);

        const project = workspace.project(fileSystemURL) as Persistence.FileSystemWorkspaceBinding.FileSystem;
        assert.exists(project);
        assert.strictEqual(project.fileSystemPath(), fileSystemURL);
        assert.strictEqual(project.fileSystemBaseURL, urlString`file:///tmp/wstest/`);
        assert.strictEqual(project.displayName(), 'wstest');

        const uiSourceCode = workspace.uiSourceCodeForURL(fileURL);
        assert.exists(uiSourceCode);
        assert.strictEqual(uiSourceCode.project(), project);
        assert.strictEqual(project.fullDisplayName(uiSourceCode), 'wstest/app.js');
        assert.deepEqual(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode),
                         ['app.js' as Platform.DevToolsPath.EncodedPathString]);
      } finally {
        removeFileSystem();
        binding.dispose();
      }
    });

    it('removes the file system when the embedder reports its removal', async () => {
      const workspace = universe.workspace;
      const manager = universe.isolatedFileSystemManager;
      const binding = universe.fileSystemWorkspaceBinding;
      try {
        await addFileSystem(manager);
        assert.lengthOf(manager.fileSystems(), 1);
        assert.lengthOf(workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem), 1);

        removeFileSystem();

        assert.lengthOf(manager.fileSystems(), 0);
        assert.lengthOf(workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem), 0);
        assert.isNull(workspace.uiSourceCodeForURL(fileURL));
      } finally {
        binding.dispose();
      }
    });
  });
});
