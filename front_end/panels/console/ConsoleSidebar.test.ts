// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

const {urlString} = Platform.DevToolsPath;

function createMessage(level: Protocol.Log.LogEntryLevel, text: string, url: Platform.DevToolsPath.UrlString):
    Console.ConsoleViewMessage.ConsoleViewMessage {
  const message = new SDK.ConsoleModel.ConsoleMessage(null, Protocol.Log.LogEntrySource.Javascript, level, text, {url});

  return new Console.ConsoleViewMessage.ConsoleViewMessage(
      message, sinon.createStubInstance(Components.Linkifier.Linkifier),
      sinon.createStubInstance(Logs.RequestResolver.RequestResolver),
      sinon.createStubInstance(IssuesManager.IssueResolver.IssueResolver), () => {});
}

function addMessage(
    sidebar: Console.ConsoleSidebar.ConsoleSidebar, level: Protocol.Log.LogEntryLevel, text: string,
    url: Platform.DevToolsPath.UrlString): Console.ConsoleViewMessage.ConsoleViewMessage {
  const consoleViewMessage = createMessage(level, text, url);
  sidebar.onMessageAdded(consoleViewMessage);
  return consoleViewMessage;
}

async function getGroups(view: ViewFunctionStub<typeof Console.ConsoleSidebar.ConsoleSidebar>):
    Promise<Record<string, {count: number, urls?: Record<string, number>}>> {
  const input = await view.nextInput;
  return Object.fromEntries(
      input.groups.map(group => [group.name, {
                         count: group.messageCount,
                         urls: Object.fromEntries(group.urlGroups.entries().map(([title, {count}]) => ([title, count])))
                       }]));
}

describeWithMockConnection('ConsoleSidebar', () => {
  it('groups logs by URL', async () => {
    const view = createViewFunctionStub(Console.ConsoleSidebar.ConsoleSidebar);
    const sidebar = new Console.ConsoleSidebar.ConsoleSidebar(undefined, view);
    addMessage(sidebar, Protocol.Log.LogEntryLevel.Info, 'message 1', urlString`https://www.example.com/a.html`);
    addMessage(sidebar, Protocol.Log.LogEntryLevel.Info, 'message 2', urlString`https://www.example.com/b.html`);
    addMessage(sidebar, Protocol.Log.LogEntryLevel.Info, 'message 3', urlString`https://www.example.com/a.html`);
    assert.deepEqual(await getGroups(view), {
      error: {count: 0, urls: {}},
      info: {
        count: 3,
        urls: {
          'https://www.example.com/a.html': 2,
          'https://www.example.com/b.html': 1,
        }
      },
      message: {
        count: 3,
        urls: {
          'https://www.example.com/a.html': 2,
          'https://www.example.com/b.html': 1,
        }
      },
      'user message': {count: 0, urls: {}},
      verbose: {count: 0, urls: {}},
      warning: {count: 0, urls: {}},
    });
  });

  it('groups logs by level', async () => {
    const view = createViewFunctionStub(Console.ConsoleSidebar.ConsoleSidebar);
    const sidebar = new Console.ConsoleSidebar.ConsoleSidebar(undefined, view);
    addMessage(sidebar, Protocol.Log.LogEntryLevel.Verbose, 'message 1', urlString`https://www.example.com/a.html`);
    addMessage(sidebar, Protocol.Log.LogEntryLevel.Error, 'message 2', urlString`https://www.example.com/b.html`);
    addMessage(sidebar, Protocol.Log.LogEntryLevel.Error, 'message 3', urlString`https://www.example.com/a.html`);
    assert.deepEqual(await getGroups(view), {
      error: {count: 2, urls: {'https://www.example.com/a.html': 1, 'https://www.example.com/b.html': 1}},
      info: {count: 0, urls: {}},
      message: {count: 3, urls: {'https://www.example.com/a.html': 2, 'https://www.example.com/b.html': 1}},
      'user message': {count: 0, urls: {}},
      verbose: {count: 1, urls: {'https://www.example.com/a.html': 1}},
      warning: {count: 0, urls: {}}
    });
  });

  it('filters by groups', async () => {
    const view = createViewFunctionStub(Console.ConsoleSidebar.ConsoleSidebar);
    const sidebar = new Console.ConsoleSidebar.ConsoleSidebar(undefined, view);
    const messages = [
      addMessage(sidebar, Protocol.Log.LogEntryLevel.Verbose, 'message 1', urlString`https://www.example.com/a.html`),
      addMessage(sidebar, Protocol.Log.LogEntryLevel.Error, 'message 2', urlString`https://www.example.com/b.html`),
      addMessage(sidebar, Protocol.Log.LogEntryLevel.Error, 'message 3', urlString`https://www.example.com/a.html`),
    ];
    const input = await view.nextInput;

    const filter = input.groups.find(group => group.name === 'error')?.filter;
    assert.exists(filter);
    const filterSelected = sinon.stub();
    sidebar.addEventListener(Console.ConsoleSidebar.Events.FILTER_SELECTED, filterSelected);
    input.onSelectionChanged(filter);
    sinon.assert.calledOnce(filterSelected);

    assert.deepEqual(messages.map(message => sidebar.shouldBeVisible(message)), [false, true, true]);
  });

  it('applies filters on selection', async () => {
    const onSelectionChanged = sinon.stub();
    const groups = [
      new Console.ConsoleSidebar.ConsoleFilterGroup(
          Console.ConsoleSidebar.GroupName.ALL, [], Console.ConsoleFilter.ConsoleFilter.allLevelsFilterValue()),
      new Console.ConsoleSidebar.ConsoleFilterGroup(
          Console.ConsoleSidebar.GroupName.ERROR, [],
          Console.ConsoleFilter.ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Error)),
    ];

    groups[1].onMessage(
        createMessage(Protocol.Log.LogEntryLevel.Error, 'message 1', urlString`https://www.example.com/a.html`));
    groups[1].onMessage(
        createMessage(Protocol.Log.LogEntryLevel.Error, 'message 2', urlString`https://www.example.com/b.html`));
    groups[1].onMessage(
        createMessage(Protocol.Log.LogEntryLevel.Error, 'message 3', urlString`https://www.example.com/a.html`));

    const input: Parameters<Console.ConsoleSidebar.View>[0] = {
      groups,
      selectedFilter: groups[0].filter,
      onSelectionChanged,
    };

    const container = renderElementIntoDOM(document.createElement('div'));
    Console.ConsoleSidebar.DEFAULT_VIEW(input, {}, container);

    // Wait for mutation observer to fire
    await new Promise(r => setTimeout(r));
    onSelectionChanged.resetHistory();

    const treeShadow = container.querySelector('devtools-tree')?.shadowRoot;
    assert.exists(treeShadow);

    const treeNode = treeShadow.querySelectorAll('li').values().find(e => e.innerText.includes('a.html'));
    assert.exists(treeNode);

    const treeElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(treeNode);
    assert.exists(treeElement);

    treeElement.select();

    const expectedFilter = groups[1].urlGroups.get('https://www.example.com/a.html')?.filter;
    assert.exists(expectedFilter);
    sinon.assert.calledOnceWithExactly(onSelectionChanged, expectedFilter);
  });

  it('allows clearing messages', async () => {
    const view = createViewFunctionStub(Console.ConsoleSidebar.ConsoleSidebar);
    const sidebar = new Console.ConsoleSidebar.ConsoleSidebar(undefined, view);
    addMessage(sidebar, Protocol.Log.LogEntryLevel.Verbose, 'message 1', urlString`https://www.example.com/a.html`);
    assert.deepEqual(await getGroups(view), {
      error: {count: 0, urls: {}},
      info: {count: 0, urls: {}},
      message: {count: 1, urls: {'https://www.example.com/a.html': 1}},
      'user message': {count: 0, urls: {}},
      verbose: {count: 1, urls: {'https://www.example.com/a.html': 1}},
      warning: {count: 0, urls: {}}
    });

    sidebar.clear();
    assert.deepEqual(await getGroups(view), {
      error: {count: 0, urls: {}},
      info: {count: 0, urls: {}},
      message: {count: 0, urls: {}},
      'user message': {count: 0, urls: {}},
      verbose: {count: 0, urls: {}},
      warning: {count: 0, urls: {}}
    });
  });
});
