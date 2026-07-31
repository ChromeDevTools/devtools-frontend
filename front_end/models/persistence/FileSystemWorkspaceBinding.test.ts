// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as Workspace from '../workspace/workspace.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('FileSystemWorkspaceBinding', () => {
  it('does not conflict when file system paths share a prefix', async () => {
    const fsPath1 = 'file:///var/www';
    const fsPath2 = 'file:///var/www_suffix';

    const {project: project1, uiSourceCode: fooSourceCode} = createFileSystemUISourceCode({
      url: urlString`file:///var/www/foo.js`,
      content: 'foo',
      fileSystemPath: fsPath1,
      mimeType: 'text/javascript',
    });

    const {project: project2, uiSourceCode: barSourceCode} = createFileSystemUISourceCode({
      url: urlString`file:///var/www_suffix/bar.js`,
      content: 'bar',
      fileSystemPath: fsPath2,
      mimeType: 'text/javascript',
    });

    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();

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

    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
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
      });

      const platformFileSystem = project.fileSystem();
      const deleteFileStub = sinon.stub(platformFileSystem, 'deleteFile').resolves(true);

      assert.lengthOf([...project.uiSourceCodes()], 1);
      assert.strictEqual([...project.uiSourceCodes()][0], uiSourceCode);

      // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
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
});
