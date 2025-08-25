// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {findMenuItemWithLabel} from '../../testing/ContextMenuHelpers.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {stubFileManager} from '../../testing/FileManagerHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as ProtocolMonitor from './protocol_monitor.js';

const {InspectorBackend} = ProtocolClient;
const {ProtocolMonitorImpl} = ProtocolMonitor.ProtocolMonitor;
type ProtocolMonitorImpl = ProtocolMonitor.ProtocolMonitor.ProtocolMonitorImpl;
const {JSONEditor} = ProtocolMonitor.JSONEditor;
type JSONEditor = ProtocolMonitor.JSONEditor.JSONEditor;

let view!: ViewFunctionStub<typeof ProtocolMonitorImpl>;
let protocolMonitor!: ProtocolMonitorImpl;
let jsonEditor!: JSONEditor;
let sendRawMessageStub!: sinon.SinonStub;

describeWithEnvironment('ProtocolMonitor', () => {
  let originalSendRawMessage: typeof InspectorBackend.test.sendRawMessage;
  beforeEach(() => {
    sendRawMessageStub = sinon.stub();
    originalSendRawMessage = InspectorBackend.test.sendRawMessage;
    InspectorBackend.test.sendRawMessage = sendRawMessageStub;
    jsonEditor = new JSONEditor(document.createElement('div'));
    view = createViewFunctionStub(ProtocolMonitorImpl, {editorWidget: jsonEditor});
    protocolMonitor = new ProtocolMonitorImpl(view);
  });

  afterEach(() => {
    InspectorBackend.test.sendRawMessage = originalSendRawMessage;
  });

  it('sends commands', async () => {
    view.input.onCommandSubmitted(
        new CustomEvent('submit', {detail: '{"command":"Test.test","parameters":{"test":"test"}}'}));
    sinon.assert.calledOnce(sendRawMessageStub);
    sinon.assert.calledOnce(sendRawMessageStub);
    assert.strictEqual(sendRawMessageStub.getCall(0).args[0], 'Test.test');
    assert.deepEqual(sendRawMessageStub.getCall(0).args[1], {test: 'test'});
    assert.deepEqual(sendRawMessageStub.getCall(0).args[3], '');
  });

  it('includes previous commands into autocomplete', async () => {
    view.input.onCommandSubmitted(new CustomEvent('submit', {detail: 'Test.test1'}));
    view.input.onCommandSubmitted(new CustomEvent('submit', {detail: 'Test.test2'}));
    protocolMonitor.requestUpdate();
    assert.includeOrderedMembers(
        (await view.nextInput).commandSuggestions, ['Test.test2', 'Test.test1', 'Accessibility.disable']);
  });

  it('records commands', async () => {
    protocolMonitor.wasShown();
    InspectorBackend.test.onMessageSent?.({domain: 'Test', method: 'Test.test', params: {test: 'test'}, id: 1}, null);
    assert.deepEqual((await view.nextInput).messages.map(m => ({method: m.method, params: m.params, id: m.id})), [
      {
        method: 'Test.test',
        params: {test: 'test'},
        id: 1,
      },
    ]);

    InspectorBackend.test.onMessageReceived?.(
        {
          id: 1,
          method: 'Test.test',
          params: {test: 'test'},
          requestTime: 0,
          result: {test: 'test'},
        },
        null);
    assert.deepEqual(
        (await view.nextInput).messages.map(m => ({method: m.method, params: m.params, id: m.id, result: m.result})), [
          {
            method: 'Test.test',
            params: {test: 'test'},
            id: 1,
            result: {test: 'test'},
          },
        ]);
  });

  it('only records commands if recording is enabled', async () => {
    InspectorBackend.test.onMessageSent?.({domain: 'Test', method: 'Test.test', params: {test: 'test'}, id: 1}, null);

    protocolMonitor.wasShown();
    InspectorBackend.test.onMessageSent?.({domain: 'Test', method: 'Test.test', params: {test: 'test'}, id: 2}, null);
    assert.deepEqual((await view.nextInput).messages.map(m => ({method: m.method, params: m.params, id: m.id})), [
      {
        method: 'Test.test',
        params: {test: 'test'},
        id: 2,
      },
    ]);

    view.input.onRecord({target: {toggled: false}} as unknown as Event);
    InspectorBackend.test.onMessageSent?.({domain: 'Test', method: 'Test.test', params: {test: 'test'}, id: 3}, null);
    view.input.onRecord({target: {toggled: true}} as unknown as Event);
    InspectorBackend.test.onMessageSent?.({domain: 'Test', method: 'Test.test', params: {test: 'test'}, id: 4}, null);
    assert.deepEqual((await view.nextInput).messages.map(m => ({method: m.method, params: m.params, id: m.id})), [
      {
        method: 'Test.test',
        params: {test: 'test'},
        id: 2,
      },
      {
        method: 'Test.test',
        params: {test: 'test'},
        id: 4,
      },
    ]);
  });

  it('clears messages', async () => {
    protocolMonitor.wasShown();
    InspectorBackend.test.onMessageSent?.({domain: 'Test', method: 'Test.test', params: {test: 'test'}, id: 2}, null);
    assert.lengthOf((await view.nextInput).messages, 1);

    view.input.onClear();
    assert.lengthOf((await view.nextInput).messages, 0);
  });

  it('saves to file', async () => {
    const fileManager = stubFileManager();
    const fileManagerCloseCall = expectCall(fileManager.close);

    protocolMonitor.wasShown();
    InspectorBackend.test.onMessageSent?.({domain: 'Test', method: 'Test.test', params: {test: 'test'}, id: 2}, null);

    const TIMESTAMP = 42;
    const clock = sinon.useFakeTimers();
    clock.tick(TIMESTAMP);
    const FILENAME = 'ProtocolMonitor-' + Platform.DateUtilities.toISO8601Compact(new Date(TIMESTAMP)) + '.json' as
        Platform.DevToolsPath.RawPathString;

    (await view.nextInput).onSave();

    sinon.assert.calledOnce(fileManager.save);
    assert.isTrue(fileManager.save.calledOnceWith(
        FILENAME, TextUtils.ContentData.EMPTY_TEXT_CONTENT_DATA, /* forceSaveAs=*/ true));
    await fileManagerCloseCall;
    assert.isTrue(fileManager.append.calledOnceWith(FILENAME, sinon.match('"method": "Test.test"')));

    clock.restore();
  });

  describe('context menu', () => {
    let menu!: UI.ContextMenu.ContextMenu;
    let element!: HTMLElement;

    function triggerContextMenu(index: number) {
      menu = new UI.ContextMenu.ContextMenu(new Event('contextmenu'));
      element = {dataset: {index: `${index}`}} as unknown as HTMLElement;
      view.input.onSelect(new CustomEvent('select', {detail: element}));
      view.input.onContextMenu(new CustomEvent('contextmenu', {detail: {menu, element}}));
    }

    beforeEach(() => {
      menu = new UI.ContextMenu.ContextMenu(new Event('contextmenu'));
      protocolMonitor.wasShown();
      InspectorBackend.test.onMessageSent?.(
          {domain: 'Test', method: 'Test.test1', params: {test: 'test'}, id: 2}, null);
      InspectorBackend.test.onMessageSent?.(
          {domain: 'Test', method: 'Test.test2', params: {test: 'test'}, id: 2}, null);
      triggerContextMenu(1);
    });

    it('priovides edit and resend context menu item', async () => {
      assert.isFalse(view.input.sidebarVisible);

      let editAndResend = findMenuItemWithLabel(menu.editSection(), 'Edit and resend');
      assert.exists(editAndResend);
      menu.invokeHandler(editAndResend.id());

      assert.strictEqual((await view.nextInput).command, '{"command":"Test.test2","parameters":{"test":"test"}}');
      assert.isTrue(view.input.sidebarVisible);

      const displayCommandStub = sinon.stub(jsonEditor, 'displayCommand');

      triggerContextMenu(0);
      editAndResend = findMenuItemWithLabel(menu.editSection(), 'Edit and resend');
      assert.exists(editAndResend);
      menu.invokeHandler(editAndResend.id());

      assert.isTrue(displayCommandStub.calledOnceWith('Test.test1', {test: 'test'}, ''));
    });

    it('priovides filter context menu item', async () => {
      const filter = findMenuItemWithLabel(menu.editSection(), 'Filter');
      assert.exists(filter);
      menu.invokeHandler(filter.id());

      assert.strictEqual((await view.nextInput).filter, 'method:Test.test2');
    });

    it('priovides documentation context menu item', async () => {
      const documentation = findMenuItemWithLabel(menu.footerSection(), 'Documentation');
      assert.exists(documentation);

      const openInNewTabStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'openInNewTab');
      menu.invokeHandler(documentation.id());

      assert.isTrue(
          openInNewTabStub.calledOnceWith('https://chromedevtools.github.io/devtools-protocol/tot/Test#method-test2'));
    });
  });

  describe('Display command written in editor inside input bar', () => {
    it('should display the command edited inside the CDP editor into the input bar', async () => {
      jsonEditor.command = 'Test.test';
      jsonEditor.parameters = [
        {
          name: 'test',
          type: ProtocolMonitor.JSONEditor.ParameterType.STRING,
          description: 'test',
          optional: false,
          value: 'test',
        },
      ];
      view.input.onSplitChange(new CustomEvent('change', {detail: 'OnlyMain'}));
      assert.deepEqual((await view.nextInput).command, '{"command":"Test.test","parameters":{"test":"test"}}');
    });

    it('should update the selected target inside the input bar', async () => {
      jsonEditor.targetId = 'value2';
      sinon.stub(SDK.TargetManager.TargetManager.instance(), 'targets').returns([
        {id: () => 'value1'} as SDK.Target.Target,
        {id: () => 'value2'} as SDK.Target.Target,
      ]);
      view.input.onSplitChange(new CustomEvent('change', {detail: 'OnlyMain'}));
      assert.deepEqual((await view.nextInput).selectedTargetId, 'value2');
    });

    it('should not display the command into the input bar if the command is empty string', async () => {
      jsonEditor.command = '';
      view.input.onSplitChange(new CustomEvent('change', {detail: 'OnlyMain'}));

      assert.deepEqual((await view.nextInput).command, '');
    });
  });

  describe('parseCommandInput', () => {
    it('parses various JSON formats', async () => {
      const input = {
        command: 'Input.dispatchMouseEvent',
        parameters: {parameter1: 'value1'},
      };
      // "command" variations.
      assert.deepEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            command: input.command,
            parameters: input.parameters,
          })),
          input);
      assert.deepEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            cmd: input.command,
            parameters: input.parameters,
          })),
          input);
      assert.deepEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            method: input.command,
            parameters: input.parameters,
          })),
          input);

      // "parameters" variations.
      assert.deepEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            command: input.command,
            params: input.parameters,
          })),
          input);
      assert.deepEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            cmd: input.command,
            args: input.parameters,
          })),
          input);
      assert.deepEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            method: input.command,
            arguments: input.parameters,
          })),
          input);
    });

    it('parses non-JSON data as a command name', async () => {
      assert.deepEqual(ProtocolMonitor.ProtocolMonitor.parseCommandInput('Input.dispatchMouseEvent'), {
        command: 'Input.dispatchMouseEvent',
        parameters: {},
      });
    });

    it('should correctly creates a map of CDP commands with their corresponding metadata', async () => {
      const domains = [
        {
          domain: 'Test',
          metadata: {
            'Test.test': {
              parameters: [{
                name: 'test',
                type: 'test',
                optional: true,
              }],
              description: 'Description1',
              replyArgs: ['Test1'],
            },
          },
        },
        {
          domain: 'Test2',
          metadata: {
            'Test2.test2': {
              parameters: [{
                name: 'test2',
                type: 'test2',
                optional: true,
              }],
              description: 'Description2',
              replyArgs: ['Test2'],
            },
            'Test2.test3': {
              parameters: [{
                name: 'test3',
                type: 'test3',
                optional: true,
              }],
              description: 'Description3',
              replyArgs: ['Test3'],
            },
          },
        },
      ] as Iterable<ProtocolMonitor.ProtocolMonitor.ProtocolDomain>;

      const expectedCommands = new Map();
      expectedCommands.set('Test.test', {
        parameters: [{
          name: 'test',
          type: 'test',
          optional: true,
        }],
        description: 'Description1',
        replyArgs: ['Test1'],
      });
      expectedCommands.set('Test2.test2', {
        parameters: [{
          name: 'test2',
          type: 'test2',
          optional: true,
        }],
        description: 'Description2',
        replyArgs: ['Test2'],
      });
      expectedCommands.set('Test2.test3', {
        parameters: [{
          name: 'test3',
          type: 'test3',
          optional: true,
        }],
        description: 'Description3',
        replyArgs: ['Test3'],
      });

      const metadataByCommand = ProtocolMonitor.ProtocolMonitor.buildProtocolMetadata(domains);
      assert.deepEqual(metadataByCommand, expectedCommands);
    });
  });

  describe('HistoryAutocompleteDataProvider', () => {
    it('should create completions with no history', async () => {
      const provider = new ProtocolMonitor.ProtocolMonitor.CommandAutocompleteSuggestionProvider();
      assert.deepEqual(await provider.buildTextPromptCompletions('test', 'test'), []);
    });

    it('should build completions in the reverse insertion order', async () => {
      const provider = new ProtocolMonitor.ProtocolMonitor.CommandAutocompleteSuggestionProvider();

      provider.addEntry('test1');
      provider.addEntry('test2');
      provider.addEntry('test3');
      assert.deepEqual(await provider.buildTextPromptCompletions('test', 'test'), [
        {text: 'test3'},
        {text: 'test2'},
        {text: 'test1'},
      ]);

      provider.addEntry('test1');
      assert.deepEqual(await provider.buildTextPromptCompletions('test', 'test'), [
        {text: 'test1'},
        {text: 'test3'},
        {text: 'test2'},
      ]);
    });

    it('should limit the number of completions', async () => {
      const provider = new ProtocolMonitor.ProtocolMonitor.CommandAutocompleteSuggestionProvider(2);

      provider.addEntry('test1');
      provider.addEntry('test2');
      provider.addEntry('test3');

      assert.deepEqual(await provider.buildTextPromptCompletions('test', 'test'), [
        {text: 'test3'},
        {text: 'test2'},
      ]);
    });
  });

  describe('view', () => {
    let target!: HTMLElement;
    const view = ProtocolMonitor.ProtocolMonitor.DEFAULT_VIEW;

    beforeEach(async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      const widget = new UI.Widget.Widget();
      widget.markAsRoot();
      widget.show(container);
      target = widget.element;
      target.style.display = 'flex';
      target.style.width = '780px';
      target.style.height = '400px';
    });

    it('basic', async () => {
      const viewInput = {
        messages: [
          {
            id: 1,
            method: 'Test.test1',
            result: {result: 'Test1'},
            params: {test: 'Test'},
            requestTime: 1,
            elapsedTime: 2,
          },
          {
            id: 2,
            method: 'Test.test2',
            params: {test: 'Test'},
            requestTime: 1,
            elapsedTime: 2,
          },
          {
            method: 'Test.test2',
            result: {test: 'Test'},
            requestTime: 1,
            elapsedTime: 2,
          }
        ],
        selectedMessage: undefined,
        sidebarVisible: false,
        command: 'Test.test3',
        commandSuggestions: [],
        filterKeys: ['method', 'request', 'response', 'target', 'session'],
        filter: '',
        parseFilter: (_: string) => [],
        onSplitChange: (_: CustomEvent<string>) => {},
        onRecord: (_: Event) => {},
        onClear: () => {},
        onSave: () => {},
        onSelect: (_: CustomEvent<HTMLElement|null>) => {},
        onContextMenu: (_: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => {},
        onCommandChange: (_: CustomEvent<string>) => {},
        onCommandSubmitted: (_: CustomEvent<string>) => {},
        onFilterChanged: (_: CustomEvent<string>) => {},
        onTargetChange: (_: Event) => {},
        onToggleSidebar: (_: Event) => {},
        targets: [],
        selectedTargetId: 'main',
      };
      const viewOutput = {set editorWidget(_value: ProtocolMonitor.JSONEditor.JSONEditor) {}};

      view(viewInput, viewOutput, target);
      await assertScreenshot('protocol_monitor/basic.png');
    });

    it('advanced', async () => {
      const messages = [
        {
          id: 1,
          method: 'Test.test1',
          result: {result: 'Test1'},
          params: {test: 'Test'},
          requestTime: 1,
          elapsedTime: 2,
        },
        {
          id: 2,
          method: 'Test.test2',
          params: {test: 'Test'},
          requestTime: 1,
          elapsedTime: 2,
        },
        {
          method: 'Test.test3',
          result: {test: 'Test'},
          requestTime: 1,
          elapsedTime: 2,
        }
      ];

      const viewInput = {
        messages,
        selectedMessage: messages[2],
        sidebarVisible: false,
        command: '{"command": "Test.test3"}',
        commandSuggestions: [],
        filterKeys: ['method', 'request', 'response', 'target', 'session'],
        filter: 'method:Test.test3',
        parseFilter: (_: string) => [{key: 'method', text: 'test3', negative: false}],
        onSplitChange: (_: CustomEvent<string>) => {},
        onRecord: (_: Event) => {},
        onClear: () => {},
        onSave: () => {},
        onSelect: (_: CustomEvent<HTMLElement|null>) => {},
        onContextMenu: (_: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => {},
        onCommandChange: (_: CustomEvent<string>) => {},
        onCommandSubmitted: (_: CustomEvent<string>) => {},
        onFilterChanged: (_: CustomEvent<string>) => {},
        onTargetChange: (_: Event) => {},
        onToggleSidebar: (_: Event) => {},
        targets: [
          {id: () => 'main', name: () => 'Main', inspectedURL: () => 'www.example.com'},
          {id: () => 'prerender', name: () => 'Prerender', inspectedURL: () => 'www.example.com/prerender'}
        ] as SDK.Target.Target[],
        selectedTargetId: 'prerender',
      };
      const viewOutput = {set editorWidget(_value: ProtocolMonitor.JSONEditor.JSONEditor) {}};

      view(viewInput, viewOutput, target);
      await assertScreenshot('protocol_monitor/advanced.png');
    });
  });
});
