// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/core/common/common.js';
import type * as SDK from '../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../front_end/core/platform/platform.js';
import * as TextUtils from '../../../../front_end/models/text_utils/text_utils.js';
import * as Bindings from '../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../front_end/models/workspace/workspace.js';
import * as Persistence from '../../../../front_end/models/persistence/persistence.js';

export function createContentProviderUISourceCodes(options: {
  items: {
    url: Platform.DevToolsPath.UrlString,
    content?: string, mimeType: string,
    resourceType?: Common.ResourceType.ResourceType,
    metadata?: Workspace.UISourceCode.UISourceCodeMetadata,
  }[],
  projectType?: Workspace.Workspace.projectTypes,
  projectId?: string,
  target?: SDK.Target.Target,
}): {
  project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
  uiSourceCodes: Workspace.UISourceCode.UISourceCode[],
} {
  const workspace = Workspace.Workspace.WorkspaceImpl.instance();
  const projectType = options.projectType || Workspace.Workspace.projectTypes.Formatter;
  assert.notEqual(
      projectType, Workspace.Workspace.projectTypes.FileSystem,
      'For creating file system UISourceCodes use \'createFileSystemUISourceCode\' helper.');
  const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
      workspace, options.projectId || 'PROJECT_ID', projectType, 'Test project', false /* isServiceProject*/);
  if (options.target) {
    Bindings.NetworkProject.NetworkProject.setTargetForProject(project, options.target);
  }
  const uiSourceCodes: Workspace.UISourceCode.UISourceCode[] = [];
  for (const item of options.items) {
    const resourceType = item.resourceType || Common.ResourceType.ResourceType.fromMimeType(item.mimeType);
    const uiSourceCode = project.createUISourceCode(item.url, resourceType);
    const contentProvider =
        TextUtils.StaticContentProvider.StaticContentProvider.fromString(item.url, resourceType, item.content || '');
    const metadata = item.metadata || new Workspace.UISourceCode.UISourceCodeMetadata(null, null);
    project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, item.mimeType);
    uiSourceCodes.push(uiSourceCode);
  }
  return {project, uiSourceCodes};
}

export function createContentProviderUISourceCode(options: {
  url: Platform.DevToolsPath.UrlString,
  content?: string, mimeType: string,
  projectType?: Workspace.Workspace.projectTypes,
  projectId?: string,
  metadata?: Workspace.UISourceCode.UISourceCodeMetadata,
  target?: SDK.Target.Target,
}): {
  project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
  uiSourceCode: Workspace.UISourceCode.UISourceCode,
} {
  const {url, content, mimeType, metadata, projectType, projectId, target} = options;
  const {project, uiSourceCodes} =
      createContentProviderUISourceCodes({items: [{url, content, mimeType, metadata}], projectType, projectId, target});
  return {project, uiSourceCode: uiSourceCodes[0]};
}

class TestPlatformFileSystem extends Persistence.PlatformFileSystem.PlatformFileSystem {
  readonly #mimeType: string;
  readonly #autoMapping: boolean;

  constructor(path: Platform.DevToolsPath.UrlString, type: string, mimeType: string, autoMapping: boolean) {
    super(path, type);
    this.#mimeType = mimeType;
    this.#autoMapping = autoMapping;
  }
  override supportsAutomapping(): boolean {
    return this.#autoMapping;
  }
  override mimeFromPath(_path: Platform.DevToolsPath.UrlString): string {
    return this.#mimeType;
  }
}

class TestFileSystem extends Persistence.FileSystemWorkspaceBinding.FileSystem {
  readonly #content: string;
  readonly #metadata: Workspace.UISourceCode.UISourceCodeMetadata;

  constructor(options: {
    fileSystemWorkspaceBinding: Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding,
    platformFileSystem: Persistence.PlatformFileSystem.PlatformFileSystem,
    workspace: Workspace.Workspace.WorkspaceImpl,
    content: string,
    metadata: Workspace.UISourceCode.UISourceCodeMetadata,
  }) {
    super(options.fileSystemWorkspaceBinding, options.platformFileSystem, options.workspace);
    this.#content = options.content;
    this.#metadata = options.metadata;
  }

  override requestFileContent(_uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<TextUtils.ContentProvider.DeferredContent> {
    return Promise.resolve({content: this.#content, isEncoded: false});
  }

  override requestMetadata(_uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<Workspace.UISourceCode.UISourceCodeMetadata|null> {
    return Promise.resolve(this.#metadata);
  }
}

export function createFileSystemUISourceCode(options: {
  url: Platform.DevToolsPath.UrlString,
  mimeType: string,
  content?: string,
  fileSystemPath?: string,
  autoMapping?: boolean,
  type?: string,
  metadata?: Workspace.UISourceCode.UISourceCodeMetadata,
}): {uiSourceCode: Workspace.UISourceCode.UISourceCode, project: Persistence.FileSystemWorkspaceBinding.FileSystem} {
  const workspace = Workspace.Workspace.WorkspaceImpl.instance();
  const isolatedFileSystemManager = Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();
  const fileSystemWorkspaceBinding =
      new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(isolatedFileSystemManager, workspace);
  const fileSystemPath = (options.fileSystemPath || '') as Platform.DevToolsPath.UrlString;
  const type = options.type || '';
  const content = options.content || '';
  const platformFileSystem =
      new TestPlatformFileSystem(fileSystemPath, type, options.mimeType, Boolean(options.autoMapping));
  const metadata = options.metadata || new Workspace.UISourceCode.UISourceCodeMetadata(null, null);

  const project = new TestFileSystem({fileSystemWorkspaceBinding, platformFileSystem, workspace, content, metadata});

  const uiSourceCode =
      project.createUISourceCode(options.url, Common.ResourceType.ResourceType.fromMimeType(options.mimeType));
  project.addUISourceCode(uiSourceCode);
  return {uiSourceCode, project};
}

export function setupMockedUISourceCode(url: string = 'https://example.com/') {
  const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
  const urlStringTagExample = url as Platform.DevToolsPath.UrlString;
  const contentTypeStub = sinon.createStubInstance(Common.ResourceType.ResourceType);

  const uiSourceCode = new Workspace.UISourceCode.UISourceCode(projectStub, urlStringTagExample, contentTypeStub);

  return {sut: uiSourceCode, projectStub: projectStub, contentTypeStub: contentTypeStub};
}
