// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';

import * as Console from './console.js';

const {urlString} = Platform.DevToolsPath;

function addMessage(
    sidebar: Console.ConsoleSidebar.ConsoleSidebar, level: Protocol.Log.LogEntryLevel, text: string,
    url: Platform.DevToolsPath.UrlString): Console.ConsoleViewMessage.ConsoleViewMessage {
  const message = new SDK.ConsoleModel.ConsoleMessage(null, Protocol.Log.LogEntrySource.Javascript, level, text, {url});

  const consoleViewMessage = new Console.ConsoleViewMessage.ConsoleViewMessage(
      message, sinon.createStubInstance(Components.Linkifier.Linkifier),
      sinon.createStubInstance(Logs.RequestResolver.RequestResolver),
      sinon.createStubInstance(IssuesManager.IssueResolver.IssueResolver), () => {});

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
