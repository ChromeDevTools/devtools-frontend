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
import * as Menus from '../../../../../front_end/ui/components/menus/menus.js';

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
            },
            'Test2.test3': {
              parameters: [{
                name: 'test3',
                type: 'test3',
                optional: true,
              }],
              description: 'Description3',
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
      });
      expectedCommands.set('Test2.test2', {
        parameters: [{
          name: 'test2',
          type: 'test2',
          optional: true,
        }],
        description: 'Description2',
      });
      expectedCommands.set('Test2.test3', {
        parameters: [{
          name: 'test3',
          type: 'test3',
          optional: true,
        }],
        description: 'Description3',
      });

      const metadataByCommand = ProtocolMonitor.ProtocolMonitor.buildProtocolMetadata(domains);
      assert.deepStrictEqual(metadataByCommand, expectedCommands);
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
      const command = 'CSS.addRule';
      const parameters = {
        'styleSheetId': '2',
        'ruleText': 'test',
        'domain': {
          'starLine': '2',
          'startColumn': '2',
          'endLine': '2',
          'endColumn': '3',
        },
      };

      const editorWidget = renderEditorWidget();
      editorWidget.jsonEditor.command = command;
      editorWidget.jsonEditor.populateParametersForCommand();
      editorWidget.setCommand(command, editorWidget.jsonEditor.parameters);
      await editorWidget.jsonEditor.updateComplete;

      const shadowRoot = editorWidget.jsonEditor.renderRoot;
      const elements = shadowRoot.querySelectorAll('devtools-recorder-input');

      const countValues = (obj: Record<string, unknown>): number => {
        let count = 0;

        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            count += countValues(obj[key] as Record<string, unknown>);
          } else {
            count++;
          }
        }
        return count;
      };

      assert.deepStrictEqual(elements.length, countValues(parameters) + numberOfCommandPromptEditor);
    });

    it('does not output parameters if the input is invalid json', async () => {
      const input = '"command": "test", "parameters":';

      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(input);
      const editorWidget = renderEditorWidget();
      editorWidget.jsonEditor.populateParametersForCommand();
      editorWidget.setCommand(command, editorWidget.jsonEditor.parameters);
      await editorWidget.jsonEditor.updateComplete;

      const shadowRoot = editorWidget.jsonEditor.renderRoot;
      const elements = shadowRoot.querySelectorAll('devtools-recorder-input');

      assert.deepStrictEqual(elements.length, Object.keys(parameters).length + numberOfCommandPromptEditor);
    });

    it('does not output parameters if the parameters field is not an object', async () => {
      const input = '"command": "test", "parameters": 1234';

      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(input);
      const editorWidget = renderEditorWidget();
      editorWidget.jsonEditor.populateParametersForCommand();
      editorWidget.setCommand(command, editorWidget.jsonEditor.parameters);
      await editorWidget.jsonEditor.updateComplete;
      const shadowRoot = editorWidget.jsonEditor.renderRoot;
      const elements = shadowRoot.querySelectorAll('devtools-recorder-input');

      assert.deepStrictEqual(elements.length, Object.keys(parameters).length + numberOfCommandPromptEditor);
    });

    it('should return the parameters in a format understandable by the ProtocolMonitor', async () => {
      const editorWidget = renderEditorWidget();

      const inputParameters = [
        {
          'optional': true,
          'type': 'string',
          'value': 'test0',
          'name': 'test0',
        },
        {
          'optional': true,
          'type': 'string',
          'value': 'test1',
          'name': 'test1',
        },
        {
          'optional': false,
          'type': 'string',
          'value': 'test2',
          'name': 'test2',
        },
        {
          'optional': true,
          'type': 'array',
          'value': [
            {
              'optional': true,
              'type': 'string',
              'value': 'param1Value',
              'name': 'param1',
            },
            {
              'optional': true,
              'type': 'string',
              'value': 'param2Value',
              'name': 'param2',
            },
          ],
          'name': 'test3',
        },
        {
          'optional': true,
          'type': 'object',
          'value': [
            {
              'optional': true,
              'type': 'string',
              'value': 'param1Value',
              'name': 'param1',
            },
            {
              'optional': true,
              'type': 'string',
              'value': 'param2Value',
              'name': 'param2',
            },
          ],
          'name': 'test4',
        },
      ];

      const expectedParameters = {
        'test0': 'test0',
        'test1': 'test1',
        'test2': 'test2',
        'test3': ['param1Value', 'param2Value'],
        'test4': {
          'param1': 'param1Value',
          'param2': 'param2Value',
        },
      };

      editorWidget.jsonEditor.parameters = inputParameters as ProtocolComponents.JSONEditor.Parameter[];
      const responsePromise =
          getEventPromise(editorWidget.jsonEditor, ProtocolComponents.JSONEditor.SubmitEditorEvent.eventName);

      dispatchKeyDownEvent(editorWidget.jsonEditor, {key: 'Enter', ctrlKey: true, metaKey: true});

      const response = await responsePromise as ProtocolComponents.JSONEditor.SubmitEditorEvent;

      assert.deepStrictEqual(response.data.parameters, expectedParameters);
    });

    it('checks that the selection of a target works', async () => {
      const editorWidget = renderEditorWidget();
      await editorWidget.jsonEditor.updateComplete;
      const targetId = 'target1';
      const event = new Menus.SelectMenu.SelectMenuItemSelectedEvent('target1');

      const shadowRoot = editorWidget.jsonEditor.renderRoot;
      const selectMenu = shadowRoot.querySelector('devtools-select-menu');
      selectMenu?.dispatchEvent(event);
      const expectedId = editorWidget.jsonEditor.targetId;

      assert.deepStrictEqual(targetId, expectedId);
    });

    it('checks that the command input field remains empty when there is no command parameter entered', async () => {
      const input = '{"parameters": {"urls" : ["chrome-extension://*"]}}';
      const {command} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(input);
      const editorWidget = renderEditorWidget();
      editorWidget.jsonEditor.populateParametersForCommand();
      editorWidget.setCommand(command, editorWidget.jsonEditor.parameters);
      await editorWidget.jsonEditor.updateComplete;

      const commandReceived = editorWidget.jsonEditor.command;
      assert.deepStrictEqual(commandReceived, '');
    });

    it('checks that the command input field remains empty when there is no command parameter entered', async () => {
      const input = '{"parameters": {"urls" : ["chrome-extension://*"]}}';
      const {command} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(input);
      const editorWidget = renderEditorWidget();
      editorWidget.jsonEditor.populateParametersForCommand();
      editorWidget.setCommand(command, editorWidget.jsonEditor.parameters);
      await editorWidget.jsonEditor.updateComplete;

      const commandReceived = editorWidget.jsonEditor.command;
      assert.deepStrictEqual(commandReceived, '');
    });
    it('should delete the specified array parameter by clicking the "Delete" button', async () => {
      const inputParameters = [
        {
          type: 'array',
          optional: false,
          value: [
            {name: '0', value: 'value0', optional: true, type: 'string'},
            {name: '1', value: 'value1', optional: true, type: 'string'},
            {name: '2', value: 'value2', optional: true, type: 'string'},
          ],
          name: 'arrayParam',
          typeRef: 'string',
        },
      ];

      const expectedParams = {
        arrayParam: ['value1', 'value2'],
      };

      const editorWidget = renderEditorWidget();
      editorWidget.jsonEditor.parameters = inputParameters as ProtocolComponents.JSONEditor.Parameter[];
      await editorWidget.jsonEditor.updateComplete;

      const shadowRoot = editorWidget.jsonEditor.renderRoot;

      const parameterIndex = 0;
      const deleteButtons = shadowRoot.querySelectorAll('devtools-button[title="Delete"]');
      if (deleteButtons.length > parameterIndex) {
        deleteButtons[parameterIndex].dispatchEvent(new Event('click'));
      }

      const resultedParams = editorWidget.jsonEditor.getParameters();
      assert.deepStrictEqual(expectedParams, resultedParams);
    });
  });
});
