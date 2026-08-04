// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

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

describeWithEnvironment('IsolatedFileSystemManager', () => {
  it('does not propagate events for ignored files', () => {
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    const manager = Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();
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
    const universe = new TestUniverse();
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
});
