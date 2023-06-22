// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as ProtocolMonitor from '../../../../../front_end/panels/protocol_monitor/protocol_monitor.js';
import {
  getEventPromise,
  dispatchKeyDownEvent,
} from '../../../../../test/unittests/front_end/helpers/DOMHelpers.js';
import * as ProtocolComponents from '../../../../../front_end/panels/protocol_monitor/components/components.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

describe('ProtocolMonitor', () => {
  describe('parseCommandInput', () => {
    it('parses various JSON formats', async () => {
      const input = {
        command: 'Input.dispatchMouseEvent',
        parameters: {parameter1: 'value1'},
      };

      // "command" variations.
      assert.deepStrictEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            command: input.command,
            parameters: input.parameters,
          })),
          input);
      assert.deepStrictEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            cmd: input.command,
            parameters: input.parameters,
          })),
          input);
      assert.deepStrictEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            method: input.command,
            parameters: input.parameters,
          })),
          input);

      // "parameters" variations.
      assert.deepStrictEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            command: input.command,
            params: input.parameters,
          })),
          input);
      assert.deepStrictEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            cmd: input.command,
            args: input.parameters,
          })),
          input);
      assert.deepStrictEqual(
          ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
            method: input.command,
            arguments: input.parameters,
          })),
          input);
    });

    it('parses non-JSON data as a command name', async () => {
      assert.deepStrictEqual(ProtocolMonitor.ProtocolMonitor.parseCommandInput('Input.dispatchMouseEvent'), {
        command: 'Input.dispatchMouseEvent',
        parameters: {},
      });
    });

    it('should correctly creates a map of CDP commands with their corresponding parameters', async () => {
      const domains = [
        {
          domain: 'Test',
          commandParameters: {
            'Test.test': [{
              name: 'test',
              type: 'test',
              optional: true,
            }],
          },
        },
        {
          domain: 'Test2',
          commandParameters: {
            'Test2.test2': [{
              name: 'test2',
              type: 'test2',
              optional: true,
            }],
            'Test2.test3': [{
              name: 'test3',
              type: 'test3',
              optional: true,
            }],
          },
        },
      ] as Iterable<ProtocolMonitor.ProtocolMonitor.ProtocolDomain>;

      const expectedCommands = new Map();
      expectedCommands.set('Test.test', [{
                             name: 'test',
                             type: 'test',
                             optional: true,
                           }]);
      expectedCommands.set('Test2.test2', [{
                             name: 'test2',
                             type: 'test2',
                             optional: true,
                           }]);
      expectedCommands.set('Test2.test3', [{
                             name: 'test3',
                             type: 'test3',
                             optional: true,
                           }]);

      assert.deepStrictEqual(
          ProtocolMonitor.ProtocolMonitor.buildProtocolCommandsParametersMap(domains), expectedCommands);
    });
  });

  describe('HistoryAutocompleteDataProvider', () => {
    it('should create completions with no history', async () => {
      const provider = new ProtocolMonitor.ProtocolMonitor.CommandAutocompleteSuggestionProvider();
      assert.deepStrictEqual(await provider.buildTextPromptCompletions('test', 'test'), []);
    });

    it('should build completions in the reverse insertion order', async () => {
      const provider = new ProtocolMonitor.ProtocolMonitor.CommandAutocompleteSuggestionProvider();

      provider.addEntry('test1');
      provider.addEntry('test2');
      provider.addEntry('test3');
      assert.deepStrictEqual(await provider.buildTextPromptCompletions('test', 'test'), [
        {text: 'test3'},
        {text: 'test2'},
        {text: 'test1'},
      ]);

      provider.addEntry('test1');
      assert.deepStrictEqual(await provider.buildTextPromptCompletions('test', 'test'), [
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

      assert.deepStrictEqual(await provider.buildTextPromptCompletions('test', 'test'), [
        {text: 'test3'},
        {text: 'test2'},
      ]);
    });
  });

  describeWithEnvironment('EditorWidget', async () => {
    const numberOfCommandPromptEditor = 1;
    const renderEditorWidget = () => {
      const editorWidget = new ProtocolMonitor.ProtocolMonitor.EditorWidget();
      editorWidget.jsonEditor.connectedCallback();
      return editorWidget;
    };

    it('outputs correctly the CDP command and parameters inside the Sidebar Panel', async () => {
      const command = 'Network.continueInterceptedRequest';
      const parameters = {
        'interceptionId': 'test',
        'errorReason': 'Failed',
        'rawResponse': 'response',
        'url': 'www.google.com',
        'method': 'method',
        'postData': 'data',
        'headers': {
          'Content-Type': 'application/json',
          'Authorization':
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          'X-Custom-Header': 'some value',
          'X-Another-Custom-Header': 'another value',
        },
      };
      const editorWidget = renderEditorWidget();
      const formattedParameters = ProtocolMonitor.ProtocolMonitor.formatParameters(parameters, command);
      editorWidget.setCommand(command, formattedParameters);
      await editorWidget.jsonEditor.updateComplete;

      const shadowRoot = editorWidget.jsonEditor.renderRoot;
      const elements = shadowRoot.querySelectorAll('devtools-recorder-input');

      assert.deepStrictEqual(elements.length, Object.keys(parameters).length + numberOfCommandPromptEditor);
    });

    it('does not output parameters if the input is invalid json', async () => {
      const input = '"command": "test", "parameters":';

      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(input);
      const editorWidget = renderEditorWidget();
      const formattedParameters = ProtocolMonitor.ProtocolMonitor.formatParameters(parameters, command);
      editorWidget.setCommand(command, formattedParameters);
      await editorWidget.jsonEditor.updateComplete;

      const shadowRoot = editorWidget.jsonEditor.renderRoot;
      const elements = shadowRoot.querySelectorAll('devtools-recorder-input');

      assert.deepStrictEqual(elements.length, Object.keys(parameters).length + numberOfCommandPromptEditor);
    });

    it('does not output parameters if the parameters field is not an object', async () => {
      const input = '"command": "test", "parameters": 1234';

      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(input);
      const editorWidget = renderEditorWidget();
      const formattedParameters = ProtocolMonitor.ProtocolMonitor.formatParameters(parameters, command);
      editorWidget.setCommand(command, formattedParameters);
      await editorWidget.jsonEditor.updateComplete;

      const shadowRoot = editorWidget.jsonEditor.renderRoot;
      const elements = shadowRoot.querySelectorAll('devtools-recorder-input');

      assert.deepStrictEqual(elements.length, Object.keys(parameters).length + numberOfCommandPromptEditor);
    });

    it('should return the parameters in a format understandable by the ProtocolMonitor', async () => {
      const editorWidget = renderEditorWidget();
      const inputParameters = {
        'test0': {
          'optional': true,
          'type': 'string',
          'value': 'test0',
          'name': 'test0',
        },
        'test1': {
          'optional': true,
          'type': 'string',
          'value': 'test1',
          'name': 'test1',
        },
        'test2': {
          'optional': false,
          'type': 'string',
          'value': 'test2',
          'name': 'test2',
        },
        'test3': {
          'optional': true,
          'type': 'string',
          'value': 'test3',
          'name': 'test3',
        },
      };

      const expectedParameters = {
        'test0': 'test0',
        'test1': 'test1',
        'test2': 'test2',
        'test3': 'test3',
      };

      editorWidget.jsonEditor.parameters = inputParameters;
      const responsePromise =
          getEventPromise(editorWidget.jsonEditor, ProtocolComponents.JSONEditor.SubmitEditorEvent.eventName);

      dispatchKeyDownEvent(editorWidget.jsonEditor, {key: 'Enter', ctrlKey: true, metaKey: true});

      const response = await responsePromise as ProtocolComponents.JSONEditor.SubmitEditorEvent;

      assert.deepStrictEqual(response.data.parameters, expectedParameters);
    });

    it('checks that the command input field remains empty when there is no command parameter entered', async () => {
      const input = '{"parameters": {"urls" : ["chrome-extension://*"]}}';
      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(input);
      const editorWidget = renderEditorWidget();
      const formattedParameters = ProtocolMonitor.ProtocolMonitor.formatParameters(parameters, command);
      editorWidget.setCommand(command, formattedParameters);
      await editorWidget.jsonEditor.updateComplete;

      const commandReceived = editorWidget.jsonEditor.command;
      assert.deepStrictEqual(commandReceived, '');
    });

    it('checks that the command input field remains empty when there is no command parameter entered', async () => {
      const input = '{"parameters": {"urls" : ["chrome-extension://*"]}}';
      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(input);
      const editorWidget = renderEditorWidget();
      const formattedParameters = ProtocolMonitor.ProtocolMonitor.formatParameters(parameters, command);
      editorWidget.setCommand(command, formattedParameters);
      await editorWidget.jsonEditor.updateComplete;

      const commandReceived = editorWidget.jsonEditor.command;
      assert.deepStrictEqual(commandReceived, '');
    });
  });

});
