// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as ProtocolMonitor from '../../../../../front_end/panels/protocol_monitor/protocol_monitor.js';
import {
  getEventPromise,
  dispatchKeyDownEvent,
  dispatchMouseMoveEvent,
  renderElementIntoDOM,
  raf,
} from '../../helpers/DOMHelpers.js';
import * as ProtocolComponents from '../../../../../front_end/panels/protocol_monitor/components/components.js';
import type * as RecorderComponents from '../../../../../front_end/panels/recorder/components/components.js';
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

  describeWithEnvironment('JSONEditor', async () => {
    const renderJSONEditor = () => {
      const jsonEditor = new ProtocolComponents.JSONEditor.JSONEditor();
      jsonEditor.metadataByCommand = new Map();
      jsonEditor.typesByName = new Map();
      jsonEditor.connectedCallback();
      renderElementIntoDOM(jsonEditor);
      return jsonEditor;
    };

    const populateMetadata = async(jsonEditor: ProtocolComponents.JSONEditor.JSONEditor): Promise<void> => {
      const mockDomain = [
        {
          domain: 'Test',
          metadata: {
            'Test.test': {
              parameters: [{
                name: 'test',
                type: 'string',
                optional: true,
              }],
              description: 'Description1.',
              replyArgs: ['Test1'],
            },
            'Test.test2': {
              parameters: [{
                'optional': true,
                'type': 'array',
                'name': 'test2',
                'typeRef': 'string',
              }],
            },
            'Test.test3': {
              parameters: [{
                'optional': true,
                'type': 'object',
                'value': [
                  {
                    'optional': true,
                    'type': 'string',
                    'name': 'param1',
                  },
                  {
                    'optional': true,
                    'type': 'string',
                    'name': 'param2',
                  },
                ],
                'name': 'test3',
                'typeRef': 'string',
              }],
            },
          },
        },
      ] as Iterable<ProtocolMonitor.ProtocolMonitor.ProtocolDomain>;

      const metadataByCommand = ProtocolMonitor.ProtocolMonitor.buildProtocolMetadata(mockDomain);
      jsonEditor.metadataByCommand = metadataByCommand;
      await jsonEditor.updateComplete;
    };

    const renderPopup = async (element: Element|null) => {
      if (element) {
        const clock = sinon.useFakeTimers();
        try {
          dispatchMouseMoveEvent(element, {
            bubbles: true,
            composed: true,
          });
          clock.tick(300);
          clock.restore();
        } finally {
          clock.restore();
        }
        await raf();
      } else {
        throw new Error('No parameter has been found');
      }
    };

    const serializePopupContent = (): string|null|undefined => {
      const container = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]');
      const hintDetailView = container?.shadowRoot?.querySelector('devtools-css-hint-details-view');
      return hintDetailView?.shadowRoot?.textContent?.replaceAll(/\s/g, '');
    };

    const renderEditorForCommand = async(command: string, parameters: {[paramName: string]: unknown}):
        Promise<{inputs: NodeListOf<RecorderComponents.RecorderInput.RecorderInput>, displayedCommand: string}> => {
          const typesByName = new Map();
          typesByName.set('string', [
            {name: 'param1', type: 'string', optional: false, description: 'display a string', typeRef: null},
            {name: 'param2', type: 'string', optional: false, description: 'displays another string', typeRef: null},
          ]);

          const jsonEditor = renderJSONEditor();

          await populateMetadata(jsonEditor);
          jsonEditor.typesByName = typesByName;

          jsonEditor.displayCommand(command, parameters);

          await jsonEditor.updateComplete;
          const shadowRoot = jsonEditor.renderRoot;
          const inputs = shadowRoot.querySelectorAll('devtools-recorder-input');
          const displayedCommand = jsonEditor.command;
          return {inputs, displayedCommand};
        };

    it('should return the parameters in a format understandable by the ProtocolMonitor', async () => {
      const jsonEditor = renderJSONEditor();

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

      jsonEditor.parameters = inputParameters as ProtocolComponents.JSONEditor.Parameter[];
      const responsePromise = getEventPromise(jsonEditor, ProtocolComponents.JSONEditor.SubmitEditorEvent.eventName);

      dispatchKeyDownEvent(jsonEditor, {key: 'Enter', ctrlKey: true, metaKey: true});

      const response = await responsePromise as ProtocolComponents.JSONEditor.SubmitEditorEvent;

      assert.deepStrictEqual(response.data.parameters, expectedParameters);
    });

    it('checks that the selection of a target works', async () => {
      const jsonEditor = renderJSONEditor();
      await jsonEditor.updateComplete;
      const targetId = 'target1';
      const event = new Menus.SelectMenu.SelectMenuItemSelectedEvent('target1');

      const shadowRoot = jsonEditor.renderRoot;
      const selectMenu = shadowRoot.querySelector('devtools-select-menu');
      selectMenu?.dispatchEvent(event);
      const expectedId = jsonEditor.targetId;

      assert.deepStrictEqual(targetId, expectedId);
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

      const jsonEditor = renderJSONEditor();
      jsonEditor.parameters = inputParameters as ProtocolComponents.JSONEditor.Parameter[];
      await jsonEditor.updateComplete;

      const shadowRoot = jsonEditor.renderRoot;

      const parameterIndex = 0;
      const deleteButtons = shadowRoot.querySelectorAll('devtools-button[title="Delete"]');
      if (deleteButtons.length > parameterIndex) {
        deleteButtons[parameterIndex].dispatchEvent(new Event('click'));
      }

      const resultedParams = jsonEditor.getParameters();
      assert.deepStrictEqual(expectedParams, resultedParams);
    });

    it('should show the popup with the correct description for the description of parameters', async () => {
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
          description: 'test.',
        },
      ] as ProtocolComponents.JSONEditor.Parameter[];
      const jsonEditor = renderJSONEditor();

      jsonEditor.parameters = inputParameters;
      await jsonEditor.updateComplete;
      const param = jsonEditor.renderRoot.querySelector('[data-paramId]');

      await renderPopup(param);
      const popupContent = serializePopupContent();
      const expectedPopupContent = 'test.Type:arrayLearnMore';
      assert.deepStrictEqual(popupContent, expectedPopupContent);
    });

    it('should show the popup with the correct description for the description of command', async () => {
      const cdpCommand = 'Test.test';
      const jsonEditor = renderJSONEditor();

      await populateMetadata(jsonEditor);
      jsonEditor.command = cdpCommand;
      await jsonEditor.updateComplete;

      const command = jsonEditor.renderRoot.querySelector('.command');
      await renderPopup(command);

      const popupContent = serializePopupContent();

      const expectedPopupContent = 'Description1.Returns:Test1LearnMore';
      assert.deepStrictEqual(popupContent, expectedPopupContent);
    });

    it('should show the command written in the input bar inside the editor when parameters are strings with the correct value',
       async () => {
         const cdpCommand = {
           'command': 'Test.test',
           'parameters': {
             'test': 'test',
           },
         };

         const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify(cdpCommand));
         const {inputs} = await renderEditorForCommand(command, parameters);
         const parameterRecorderInput = inputs[1];
         const value = parameterRecorderInput.renderRoot.textContent?.replaceAll(/\s/g, '');
         const expectedValue = 'test';
         assert.deepStrictEqual(value, expectedValue);
       });

    it('should show the command written in the input bar inside the editor when parameters are arrays with the correct value',
       async () => {
         const cdpCommand = {
           'command': 'Test.test2',
           'parameters': {
             'test2': ['test'],
           },
         };
         const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify(cdpCommand));
         const {inputs} = await renderEditorForCommand(command, parameters);
         const parameterRecorderInput = inputs[1];
         const value = parameterRecorderInput.renderRoot.textContent?.replaceAll(/\s/g, '');
         const expectedValue = 'test';
         assert.deepStrictEqual(value, expectedValue);
       });

    it('should show the command written in the input bar inside the editor when parameters are object with the correct value',
       async () => {
         const cdpCommand = {
           'command': 'Test.test3',
           'parameters': {
             'test3': {
               'param1': 'test1',
               'param2': 'test2',
             },
           },
         };

         const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify(cdpCommand));
         const {inputs} = await renderEditorForCommand(command, parameters);
         const parameterRecorderInput = inputs[1];
         const value = parameterRecorderInput.renderRoot.textContent?.replaceAll(/\s/g, '');
         const expectedValue = 'test1';
         assert.deepStrictEqual(value, expectedValue);
       });

    it('does not output parameters if the input is invalid json', async () => {
      const cdpCommand = '"command": "Test.test", "parameters":';
      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(cdpCommand);

      const {inputs} = await renderEditorForCommand(command, parameters);

      assert.deepStrictEqual(inputs.length, Object.keys(parameters).length + 1);
    });

    it('does not output parameters if the parameters field is not an object', async () => {
      const cdpCommand = '"command": "test", "parameters": 1234';

      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(cdpCommand);

      const {inputs} = await renderEditorForCommand(command, parameters);

      assert.deepStrictEqual(inputs.length, Object.keys(parameters).length + 1);
    });

    it('does not output parameters if there is no parameter inserted in the input bar', async () => {
      const cdpCommand = '"command": "test"';

      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(cdpCommand);

      const {inputs} = await renderEditorForCommand(command, parameters);

      assert.deepStrictEqual(inputs.length, Object.keys(parameters).length + 1);
    });

    it('checks that the command input field remains empty when there is no command parameter entered', async () => {
      const cdpCommand = {
        'parameters': {
          'test': 'test',
        },
      };

      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify(cdpCommand));

      const {displayedCommand} = await renderEditorForCommand(command, parameters);

      assert.deepStrictEqual(displayedCommand, '');
    });

    it('checks that the command input field remains if the command is not supported', async () => {
      const cdpCommand = 'dummyCommand';

      const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify(cdpCommand));
      const {displayedCommand} = await renderEditorForCommand(command, parameters);

      assert.deepStrictEqual(displayedCommand, '');
    });
  });
});
