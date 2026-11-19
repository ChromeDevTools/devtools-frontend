// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {
  createContentProviderUISourceCode,
  createContentProviderUISourceCodes,
  createFileSystemUISourceCode,
} from '../../testing/UISourceCodeHelpers.js';
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
    Common.Settings.Settings.instance()
        .resolve(Workspace.IgnoreListManager.skipContentScriptsSettingDescriptor)
        .set(false);

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

  async function runSearch(query: string): Promise<Search.SearchScope.SearchResult[]> {
    const scope = new Sources.SourcesSearchScope.SourcesSearchScope();
    const searchConfig = new Workspace.SearchConfig.SearchConfig(query, true, false);
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
  }

  it('ignores binary files when searching', async () => {
    const matchingLine = '    const query = "AAAAAAA";';
    const {uiSourceCodes} = createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`http://127.0.0.1:8000/devtools/search/resources/pink.jpg`,
          content: 'AAAAAAA\n',
          mimeType: 'image/jpeg',
        },
        {
          url: urlString`http://127.0.0.1:8000/devtools/search/search-ignore-binary-files.js`,
          content: `${matchingLine}\n`,
          mimeType: 'text/javascript',
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      universe: backend.universe,
    });

    assert.strictEqual(uiSourceCodes[0].contentType(), Common.ResourceType.resourceTypes.Image);
    assert.isFalse(uiSourceCodes[0].contentType().isTextType());
    assert.isTrue(uiSourceCodes[1].contentType().isTextType());

    const results = await runSearch('AAAAAAA');

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'search-ignore-binary-files.js');
    assert.strictEqual(results[0].description(), '127.0.0.1:8000/devtools/search/search-ignore-binary-files.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLabel(0), '1');
    assert.strictEqual(results[0].matchLineContent(0), matchingLine);
  });

  it('excludes non-formatter service projects unless search-in-anonymous-and-content-scripts is enabled', async () => {
    const addServiceFile =
        (id: string, projectType: Workspace.Workspace.projectTypes, url: Platform.DevToolsPath.UrlString) => {
          const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
              backend.universe.workspace, id, projectType, id, true);
          const uiSourceCode = project.createUISourceCode(url, Common.ResourceType.resourceTypes.Script);
          const contentProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
              url, Common.ResourceType.resourceTypes.Script, 'const token = "AAAAAAA";\n');
          project.addUISourceCodeWithProvider(uiSourceCode, contentProvider,
                                              new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
                                              'text/javascript');
        };

    addServiceFile('debugger-service', Workspace.Workspace.projectTypes.Debugger,
                   urlString`http://example.com/debugger.js`);
    addServiceFile('formatter-service', Workspace.Workspace.projectTypes.Formatter,
                   urlString`http://example.com/formatter.js`);

    const initialResults = await runSearch('AAAAAAA');
    assert.lengthOf(initialResults, 1);
    assert.strictEqual(initialResults[0].label(), 'formatter.js');

    Common.Settings.Settings.instance()
        .resolve(SettingsUI.SourcesSettings.searchInAnonymousAndContentScriptsSettingDescriptor)
        .set(true);

    const enabledResults = await runSearch('AAAAAAA');
    assert.lengthOf(enabledResults, 2);
  });

  it('excludes overrides filesystem projects when local overrides are disabled', async () => {
    Common.Settings.Settings.instance()
        .resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor)
        .set(false);

    createFileSystemUISourceCode({
      url: urlString`file:///overrides/script.js`,
      content: 'const token = "AAAAAAA";\n',
      mimeType: 'text/javascript',
      type: Persistence.PlatformFileSystem.PlatformFileSystemType.OVERRIDES,
      fileSystemPath: 'file:///overrides',
      universe: backend.universe,
    });
    createFileSystemUISourceCode({
      url: urlString`file:///workspace/script.js`,
      content: 'const token = "AAAAAAA";\n',
      mimeType: 'text/javascript',
      type: Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT,
      fileSystemPath: 'file:///workspace',
      universe: backend.universe,
    });

    const initialResults = await runSearch('AAAAAAA');
    assert.lengthOf(initialResults, 1);
    assert.strictEqual(initialResults[0].description(), 'workspace/script.js');

    Common.Settings.Settings.instance()
        .resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor)
        .set(true);

    const enabledResults = await runSearch('AAAAAAA');
    assert.lengthOf(enabledResults, 2);
  });
});
