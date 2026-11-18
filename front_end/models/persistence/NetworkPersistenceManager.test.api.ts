// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it, setup} from '../../../test/api/mocha-interface.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import * as Persistence from './persistence.js';

const {urlString} = Platform.DevToolsPath;

class OverridePlatformFileSystem extends Persistence.PlatformFileSystem.PlatformFileSystem {
  readonly #files: Map<Platform.DevToolsPath.EncodedPathString, string>;

  constructor(
      path: Platform.DevToolsPath.UrlString,
      files: Map<Platform.DevToolsPath.EncodedPathString, string>,
  ) {
    super(path, Persistence.PlatformFileSystem.PlatformFileSystemType.OVERRIDES, false);
    this.#files = files;
  }

  override initialFilePaths(): Platform.DevToolsPath.EncodedPathString[] {
    return [...this.#files.keys()];
  }

  override embedderPath(): Platform.DevToolsPath.RawPathString {
    return Common.ParsedURL.ParsedURL.urlToRawPathString(this.path(), Host.Platform.isWin());
  }

  override supportsAutomapping(): boolean {
    return false;
  }

  #mimeTypeForPath(path: string): string {
    const extension = Common.ParsedURL.ParsedURL.extractExtension(path);
    return Common.ResourceType.ResourceType.mimeFromExtension(extension) || 'text/plain';
  }

  override contentType(path: string): Common.ResourceType.ResourceType {
    return Common.ResourceType.ResourceType.fromMimeType(this.#mimeTypeForPath(path));
  }

  override mimeFromPath(path: Platform.DevToolsPath.UrlString): string {
    return this.#mimeTypeForPath(path);
  }

  override tooltipForURL(url: Platform.DevToolsPath.UrlString): string {
    return url;
  }

  override async requestFileContent(path: Platform.DevToolsPath.EncodedPathString):
      Promise<TextUtils.ContentData.ContentDataOrError> {
    const normalizedPath = (path.startsWith('/') ? path.slice(1) : path) as Platform.DevToolsPath.EncodedPathString;
    const content = this.#files.get(normalizedPath);
    if (content === undefined) {
      return await super.requestFileContent(path);
    }
    return new TextUtils.ContentData.ContentData(content, /* isBase64 */ false, this.#mimeTypeForPath(normalizedPath));
  }
}

describe('NetworkPersistenceManager API Test', () => {
  setup({
    targetUrl: 'about:blank',
  });

  it('binds existing override files when an overrides project is added', async ({inspectedPage, universe}) => {
    const {persistence, workspace, isolatedFileSystemManager, settings} = universe;
    // Eagerly initialize NetworkPersistenceManager and FileSystemWorkspaceBinding so they observe workspace changes.
    void universe.fileSystemWorkspaceBinding;
    const networkPersistenceManager = universe.networkPersistenceManager;

    const resourceUrl = urlString`${inspectedPage.domain()}/test/e2e/resources/empty.html`;
    const networkUISourceCodePromise = new Promise<Workspace.UISourceCode.UISourceCode>(resolve => {
      const listener = (event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void => {
        if (event.data.url() === resourceUrl) {
          workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
          resolve(event.data);
        }
      };
      workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
    });

    await inspectedPage.goToResource('empty.html');
    const networkUISourceCode = await networkUISourceCodePromise;
    assert.strictEqual(networkUISourceCode.project().type(), Workspace.Workspace.projectTypes.Network);

    const bindingPromise = persistence.once(Persistence.Persistence.Events.BindingCreated);

    const host = new URL(resourceUrl).host;
    const baseDirectory = Host.Platform.isWin() ? host.replace(':', '%3A') : host;
    const relativeFilePath =
        `${baseDirectory}/test/e2e/resources/empty.html` as Platform.DevToolsPath.EncodedPathString;
    const fileSystemPath = urlString`file:///tmp`;
    const fileSystem = new OverridePlatformFileSystem(
        fileSystemPath,
        new Map([[relativeFilePath, 'New Content']]),
    );
    isolatedFileSystemManager.addPlatformFileSystem(fileSystemPath, fileSystem);

    const enabledSetting = settings.resolve(
        Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor,
    );
    enabledSetting.set(true);

    const binding = await bindingPromise;
    assert.isTrue(networkPersistenceManager.active());
    assert.strictEqual(persistence.binding(networkUISourceCode), binding);
    assert.strictEqual(binding.network.url(), resourceUrl);
    assert.strictEqual(
        binding.fileSystem.url().replace('%253A', ':'),
        `file:///tmp/${host}/test/e2e/resources/empty.html`,
    );
  });
});
