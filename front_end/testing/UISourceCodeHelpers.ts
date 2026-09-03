// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../core/common/common.js';
import * as Platform from '../core/platform/platform.js';
import type * as SDK from '../core/sdk/sdk.js';
import * as TextUtils from '../core/text_utils/text_utils.js';
import type * as Foundation from '../foundation/foundation.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as Workspace from '../models/workspace/workspace.js';

const {urlString} = Platform.DevToolsPath;

export function createContentProviderUISourceCodes(options: {
  items: Array<{
    url: Platform.DevToolsPath.UrlString,
    mimeType: string,
    content?: string,
    resourceType?: Common.ResourceType.ResourceType,
    metadata?: Workspace.UISourceCode.UISourceCodeMetadata,
  }>,
  projectType?: Workspace.Workspace.projectTypes,
  projectId?: string,
  target?: SDK.Target.Target,
  universe?: Foundation.Universe.Universe,
}): {
  project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
  uiSourceCodes: Workspace.UISourceCode.UISourceCode[],
} {
  const workspace = options.universe?.workspace || Workspace.Workspace.WorkspaceImpl.instance();
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
  mimeType: string,
  content?: string,
  projectType?: Workspace.Workspace.projectTypes,
  projectId?: string,
  metadata?: Workspace.UISourceCode.UISourceCodeMetadata,
  target?: SDK.Target.Target,
  universe?: Foundation.Universe.Universe,
}): {
  project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
  uiSourceCode: Workspace.UISourceCode.UISourceCode,
} {
  const {url, content, mimeType, metadata, projectType, projectId, target, universe} = options;
  const {project, uiSourceCodes} = createContentProviderUISourceCodes(
      {items: [{url, content, mimeType, metadata}], projectType, projectId, target, universe});
  return {project, uiSourceCode: uiSourceCodes[0]};
}

class TestPlatformFileSystem extends Persistence.PlatformFileSystem.PlatformFileSystem {
  readonly #mimeType: string;
  readonly #autoMapping: boolean;
  readonly #files = new Set<Platform.DevToolsPath.UrlString>();

  constructor(
      path: Platform.DevToolsPath.UrlString, type: Persistence.PlatformFileSystem.PlatformFileSystemType,
      mimeType: string, autoMapping: boolean) {
    super(path, type, false);
    this.#mimeType = mimeType;
    this.#autoMapping = autoMapping;
  }
  addFileForSearch(url: Platform.DevToolsPath.UrlString): void {
    this.#files.add(url);
  }
  override tooltipForURL(_url: Platform.DevToolsPath.UrlString): string {
    return 'tooltip-for-url';
  }
  override supportsAutomapping(): boolean {
    return this.#autoMapping;
  }
  override contentType(_path: string): Common.ResourceType.ResourceType {
    return Common.ResourceType.ResourceType.fromMimeType(this.#mimeType);
  }
  override mimeFromPath(_path: Platform.DevToolsPath.UrlString): string {
    return this.#mimeType;
  }
  override searchInPath(_query: string, _progress: Common.Progress.Progress): Promise<string[]> {
    return Promise.resolve([...this.#files]);
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
      Promise<TextUtils.ContentData.ContentDataOrError> {
    return Promise.resolve(new TextUtils.ContentData.ContentData(this.#content, /* isBase64 */ false, 'text/plain'));
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
  type?: Persistence.PlatformFileSystem.PlatformFileSystemType,
  metadata?: Workspace.UISourceCode.UISourceCodeMetadata,
  universe?: Foundation.Universe.Universe,
}): {uiSourceCode: Workspace.UISourceCode.UISourceCode, project: Persistence.FileSystemWorkspaceBinding.FileSystem} {
  const workspace = options.universe?.workspace || Workspace.Workspace.WorkspaceImpl.instance();
  const isolatedFileSystemManager = options.universe?.isolatedFileSystemManager ||
      Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();
  const fileSystemWorkspaceBinding =
      new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(isolatedFileSystemManager, workspace);
  const fileSystemPath = urlString`${options.fileSystemPath || ''}`;
  const type = options.type || '';
  const content = options.content || '';
  const platformFileSystem = new TestPlatformFileSystem(
      fileSystemPath, type || Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT, options.mimeType,
      Boolean(options.autoMapping));
  platformFileSystem.addFileForSearch(options.url);
  const metadata = options.metadata || new Workspace.UISourceCode.UISourceCodeMetadata(null, null);

  const project = new TestFileSystem({fileSystemWorkspaceBinding, platformFileSystem, workspace, content, metadata});

  const uiSourceCode =
      project.createUISourceCode(options.url, Common.ResourceType.ResourceType.fromMimeType(options.mimeType));
  project.addUISourceCode(uiSourceCode);
  return {uiSourceCode, project};
}

export function setupMockedUISourceCode(url = 'https://example.com/'): { sut: Workspace.UISourceCode.UISourceCode, projectStub: sinon.SinonStubbedInstance<Bindings.ContentProviderBasedProject.ContentProviderBasedProject>, contentTypeStub: sinon.SinonStubbedInstance<Common.ResourceType.ResourceType> } {
  const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
  const urlStringTagExample = urlString`${url}`;
  const contentTypeStub = sinon.createStubInstance(Common.ResourceType.ResourceType);

  const uiSourceCode = new Workspace.UISourceCode.UISourceCode(projectStub, urlStringTagExample, contentTypeStub);

  return {sut: uiSourceCode, projectStub, contentTypeStub};
}
