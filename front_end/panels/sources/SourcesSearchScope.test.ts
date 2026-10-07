// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {createContentProviderUISourceCode, createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as SettingsUI from '../../ui/settings/settings.js';
import type * as Search from '../search/search.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('SourcesSearchScope', () => {
  let backend: MockDebuggerBackend;
  let previousGlobalContext: Root.DevToolsContext.WritableDevToolsContext|null;

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    previousGlobalContext = Root.DevToolsContext.globalInstance();
    Root.DevToolsContext.setGlobalInstance(backend.universe.context as Root.DevToolsContext.WritableDevToolsContext);

    // Eagerly instantiate persistence so it registers listeners
    void backend.universe.persistence;
  });

  afterEach(() => {
    Root.DevToolsContext.setGlobalInstance(previousGlobalContext);
  });

  it('can search in network files', async () => {
    const url = urlString`http://example.com/script.js`;
    const content = 'window.foo = () => "foo";\n';
    createContentProviderUISourceCode({
      url,
      content,
      mimeType: 'text/javascript',
      projectType: Workspace.Workspace.projectTypes.Network,
      universe: backend.universe,
    });

    const scope = new Sources.SourcesSearchScope.SourcesSearchScope();
    const searchConfig = new Workspace.SearchConfig.SearchConfig('window.foo', true, false);

    const results: Search.SearchScope.SearchResult[] = [];
    const progress = new Common.Progress.Progress();
    const searchPromise = new Promise<void>(resolve => {
      scope.performSearch(
          searchConfig,
          progress,
          result => results.push(result),
          () => resolve(),
      );
    });

    await searchPromise;

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'script.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLineContent(0), 'window.foo = () => "foo";');
  });

  it('returns both network and filesystem files when they are not bound', async () => {
    const networkUrl = urlString`http://example.com/script.js`;
    const content = 'window.foo = () => "foo";\n';
    createContentProviderUISourceCode({
      url: networkUrl,
      content,
      mimeType: 'text/javascript',
      projectType: Workspace.Workspace.projectTypes.Network,
      universe: backend.universe,
    });

    const fsUrl = urlString`file:///var/www/script.js`;
    createFileSystemUISourceCode({
      url: fsUrl,
      content,
      mimeType: 'text/javascript',
      universe: backend.universe,
      fileSystemPath: 'file:///var/www',
    });

    const scope = new Sources.SourcesSearchScope.SourcesSearchScope();
    const searchConfig = new Workspace.SearchConfig.SearchConfig('window.foo', true, false);

    const results: Search.SearchScope.SearchResult[] = [];
    const progress = new Common.Progress.Progress();
    const searchPromise = new Promise<void>(resolve => {
      scope.performSearch(
          searchConfig,
          progress,
          result => results.push(result),
          () => resolve(),
      );
    });

    await searchPromise;

    assert.lengthOf(results, 2);
    const urls = results.map(r => r.description());
    assert.exists(urls.find(url => url === 'example.com/script.js'));
    assert.exists(urls.find(url => url === 'www/script.js'));
  });

  it('omits network file when it is bound to filesystem file', async () => {
    const networkUrl = urlString`http://example.com/script.js`;
    const content = 'window.foo = () => "foo";\n';
    const {uiSourceCode: networkUiSourceCode} = createContentProviderUISourceCode({
      url: networkUrl,
      content,
      mimeType: 'text/javascript',
      projectType: Workspace.Workspace.projectTypes.Network,
      universe: backend.universe,
    });

    const fsUrl = urlString`file:///var/www/script.js`;
    const {uiSourceCode: fsUiSourceCode} = createFileSystemUISourceCode({
      url: fsUrl,
      content,
      mimeType: 'text/javascript',
      universe: backend.universe,
      fileSystemPath: 'file:///var/www',
    });

    // Create binding
    const binding = new Persistence.Persistence.PersistenceBinding(networkUiSourceCode, fsUiSourceCode);
    await backend.universe.persistence.addBinding(binding);

    const scope = new Sources.SourcesSearchScope.SourcesSearchScope();
    const searchConfig = new Workspace.SearchConfig.SearchConfig('window.foo', true, false);

    const results: Search.SearchScope.SearchResult[] = [];
    const progress = new Common.Progress.Progress();
    const searchPromise = new Promise<void>(resolve => {
      scope.performSearch(
          searchConfig,
          progress,
          result => results.push(result),
          () => resolve(),
      );
    });

    await searchPromise;

    // Should only find the filesystem one
    assert.lengthOf(results, 1);
    assert.isFalse(results[0].description().startsWith('http'));
    assert.isTrue(results[0].description().includes('script.js'));
  });

  it('includes content scripts only when search-in-anonymous-and-content-scripts setting is enabled', async () => {
    const url = urlString`http://example.com/content-script.js`;
    const content = 'window.foo = () => "foo";\n';
    createContentProviderUISourceCode({
      url,
      content,
      mimeType: 'text/javascript',
      projectType: Workspace.Workspace.projectTypes.ContentScripts,
      universe: backend.universe,
    });
    Common.Settings.Settings.instance().moduleSetting('skip-content-scripts').set(false);

    const scope = new Sources.SourcesSearchScope.SourcesSearchScope();
    const searchConfig = new Workspace.SearchConfig.SearchConfig('window.foo', true, false);

    const performSearch = async () => {
      const results: Search.SearchScope.SearchResult[] = [];
      const progress = new Common.Progress.Progress();
      await new Promise<void>(resolve => {
        scope.performSearch(
            searchConfig,
            progress,
            result => results.push(result),
            () => resolve(),
        );
      });
      return results;
    };

    assert.lengthOf(await performSearch(), 0);

    Common.Settings.Settings.instance()
        .resolve(SettingsUI.SourcesSettings.searchInAnonymousAndContentScriptsSettingDescriptor)
        .set(true);

    assert.lengthOf(await performSearch(), 1);
  });
});
