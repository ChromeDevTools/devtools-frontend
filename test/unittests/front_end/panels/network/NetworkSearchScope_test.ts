// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Logs from '../../../../../front_end/models/logs/logs.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Network from '../../../../../front_end/panels/network/network.js';
import type * as Search from '../../../../../front_end/panels/search/search.js';
import {describeWithLocale} from '../../helpers/EnvironmentHelpers.js';

describeWithLocale('NetworkSearchScope', () => {
  let scope: Network.NetworkSearchScope.NetworkSearchScope;

  beforeEach(() => {
    const fakeRequest1 = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeId1', 'http://example.com/main.js' as Platform.DevToolsPath.UrlString,
        'http://example.com/index.html' as Platform.DevToolsPath.UrlString, null);
    fakeRequest1.setRequestHeaders([{name: 'fooRequestHeader', value: 'value1'}]);
    fakeRequest1.responseHeaders = [{name: 'fooResponseHeader', value: 'foo value'}];
    fakeRequest1.setResourceType(Common.ResourceType.resourceTypes.Script);
    fakeRequest1.setContentDataProvider(async () => ({
                                          error: null,
                                          encoded: false,
                                          content: 'This is the response body of request 1.\nAnd a second line.\n',
                                        }));

    const fakeRequest2 = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeId1', 'http://example.com/bundle.min.js' as Platform.DevToolsPath.UrlString,
        'http://example.com/index.html' as Platform.DevToolsPath.UrlString, null);
    fakeRequest2.setRequestHeaders([{name: 'barRequestHeader', value: 'value2'}]);
    fakeRequest2.responseHeaders = [{name: 'barResponseHeader', value: 'bar value'}];
    fakeRequest2.setResourceType(Common.ResourceType.resourceTypes.Script);
    fakeRequest2.setContentDataProvider(
        async () => ({
          error: null,
          encoded: false,
          content: 'This is the first line.\nAnd another line in the response body of request 2.\n',
        }));

    const fakeLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog, {requests: [fakeRequest1, fakeRequest2]});
    scope = new Network.NetworkSearchScope.NetworkSearchScope(fakeLog);
  });

  it('calls finished callback when done', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('foo', false, false);
    const finishedStub = sinon.stub();

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), () => {}, finishedStub);

    assert.isTrue(finishedStub.calledOnceWith(true));
  });

  it('finds requests by url', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('main', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'main.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLabel(0), 'URL');
    assert.strictEqual(results[0].matchLineContent(0), 'http://example.com/main.js');
  });

  it('finds request header names', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('fooRequest', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'main.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLabel(0), 'fooRequestHeader:');
    assert.strictEqual(results[0].matchLineContent(0), 'value1');
  });

  it('finds request header values', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('value2', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'bundle.min.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLabel(0), 'barRequestHeader:');
    assert.strictEqual(results[0].matchLineContent(0), 'value2');
  });

  it('finds response header names', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('barResponse', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'bundle.min.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLabel(0), 'barResponseHeader:');
    assert.strictEqual(results[0].matchLineContent(0), 'bar value');
  });

  it('finds response header values', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('foo value', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'main.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLabel(0), 'fooResponseHeader:');
    assert.strictEqual(results[0].matchLineContent(0), 'foo value');
  });

  it('honors "file:" query prefixes to filter requests', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('f:main.js value', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'main.js');
    assert.strictEqual(results[0].matchesCount(), 2);

    assert.strictEqual(results[0].matchLabel(0), 'fooRequestHeader:');
    assert.strictEqual(results[0].matchLineContent(0), 'value1');
    assert.strictEqual(results[0].matchLabel(1), 'fooResponseHeader:');
    assert.strictEqual(results[0].matchLineContent(1), 'foo value');
  });

  it('finds matches in response bodies', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('response body', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 2);
    assert.strictEqual(results[0].label(), 'bundle.min.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLabel(0), '2');
    assert.strictEqual(results[0].matchLineContent(0), 'And another line in the response body of request 2.');

    assert.strictEqual(results[1].label(), 'main.js');
    assert.strictEqual(results[1].matchesCount(), 1);
    assert.strictEqual(results[1].matchLabel(0), '1');
    assert.strictEqual(results[1].matchLineContent(0), 'This is the response body of request 1.');
  });

  it('handles "file:" prefix correctly for response body matches', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('f:bundle.min.js response body', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'bundle.min.js');
    assert.strictEqual(results[0].matchesCount(), 1);
    assert.strictEqual(results[0].matchLabel(0), '2');
    assert.strictEqual(results[0].matchLineContent(0), 'And another line in the response body of request 2.');
  });

  it('finds matches in response bodies only if all parts of a query match', async () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('"response body""second line"', false, false);
    const results: Search.SearchScope.SearchResult[] = [];

    await scope.performSearch(searchConfig, new Common.Progress.Progress(), result => results.push(result), () => {});

    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].label(), 'main.js');
    assert.strictEqual(results[0].matchesCount(), 2);
    assert.strictEqual(results[0].matchLabel(0), '1');
    assert.strictEqual(results[0].matchLineContent(0), 'This is the response body of request 1.');
    assert.strictEqual(results[0].matchLabel(1), '2');
    assert.strictEqual(results[0].matchLineContent(1), 'And a second line.');
  });
});
