// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as ProtocolMonitor from '../../../../../../front_end/panels/protocol_monitor/protocol_monitor.js';
import {
  getEventPromise,
  dispatchKeyDownEvent,
  dispatchMouseMoveEvent,
  dispatchClickEvent,
  renderElementIntoDOM,
  raf,
} from '../../../helpers/DOMHelpers.js';
import * as ProtocolComponents from '../../../../../../front_end/panels/protocol_monitor/components/components.js';
import type * as SuggestionInput from '../../../../../../front_end/ui/components/suggestion_input/suggestion_input.js';
import type * as IconButton from '../../../../../../front_end/ui/components/icon_button/icon_button.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import * as Menus from '../../../../../../front_end/ui/components/menus/menus.js';
import * as Host from '../../../../../../front_end/core/host/host.js';
import * as UI from '../../../../../../front_end/ui/legacy/legacy.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('JSONEditor', () => {
  const renderJSONEditor = () => {
    const jsonEditor = new ProtocolComponents.JSONEditor.JSONEditor();
    jsonEditor.metadataByCommand = new Map();
    jsonEditor.typesByName = new Map();
    jsonEditor.enumsByName = new Map();
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
              optional: false,
              typeRef: 'Test.testRef',
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
              'optional': false,
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
          'Test.test4': {
            parameters: [{
              name: 'test',
              type: 'boolean',
              optional: false,
            }],
            description: 'Description4.',
            replyArgs: ['Test4'],
          },
          'Test.test5': {
            parameters: [
              {
                name: 'test',
                type: 'string',
                optional: true,
              },
              {
                name: 'test2',
                type: 'string',
                optional: true,
              },
            ],
            description: 'Description5.',
            replyArgs: ['Test5'],
          },
          'Test.test6': {
            parameters: [{
              name: 'test',
              type: 'number',
              optional: true,
            }],
            description: 'Description6.',
            replyArgs: ['Test6'],
          },
          'Test.test7': {
            parameters: [{
              name: 'test',
              type: 'boolean',
              optional: true,
            }],
            description: 'Description7.',
            replyArgs: ['Test7'],
          },
          'Test.test8': {
            parameters: [{
              name: 'test',
              type: 'number',
              optional: false,
            }],
            description: 'Description8.',
            replyArgs: ['Test8'],
          },
          'Test.test9': {
            parameters: [
              {
                'name': 'traceConfig',
                'type': 'object',
                'optional': false,
                'description': '',
                'typeRef': 'Tracing.TraceConfig',
              },
            ],
            description: 'Description9.',
            replyArgs: ['Test9'],
          },
          'Test.test10': {
            parameters: [
              {
                'name': 'NoTypeRef',
                'type': 'object',
                'optional': true,
                'description': '',
                'typeRef': 'NoTypeRef',
              },
            ],
            description: 'Description10.',
            replyArgs: ['Test10'],
          },
          'Test.test11': {
            parameters: [{
              'optional': false,
              'type': 'array',
              'name': 'test11',
              'typeRef': 'Test.arrayTypeRef',
            }],
          },
          'Test.test12': {
            parameters: [{
              'optional': true,
              'type': 'object',
              'value': [
                {
                  'optional': false,
                  'type': 'string',
                  'name': 'param1',
                },
                {
                  'optional': false,
                  'type': 'number',
                  'name': 'param2',
                },
              ],
              'name': 'test12',
              'typeRef': 'Optional.Object',
            }],
          },
          'Test.test13': {
            parameters: [{
              name: 'newTest',
              type: 'string',
              optional: false,
              typeRef: 'Test.newTestRef',
            }],
            description: 'Description13.',
            replyArgs: ['Test13'],
          },
          'Test.test14': {
            parameters: [
              {
                'name': 'NoTypeRef',
                'type': 'object',
                'optional': true,
                'description': '',
              },
            ],
            description: 'Description14.',
            replyArgs: ['Test14'],
          },
        },
      },
    ] as Iterable<ProtocolMonitor.ProtocolMonitor.ProtocolDomain>;

    const metadataByCommand = ProtocolMonitor.ProtocolMonitor.buildProtocolMetadata(mockDomain);
    jsonEditor.metadataByCommand = metadataByCommand;
    await jsonEditor.updateComplete;
  };

  const renderHoveredElement = async (element: Element|null) => {
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

  const renderSuggestionBox = async(
      command: string, jsonEditor: ProtocolComponents.JSONEditor.JSONEditor,
      enumsByName?: Map<string, Record<string, string>>): Promise<string[]> => {
    jsonEditor.command = command;
    if (enumsByName) {
      jsonEditor.enumsByName = enumsByName;
    }
    jsonEditor.populateParametersForCommandWithDefaultValues();
    await jsonEditor.updateComplete;

    const inputs = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input');
    // inputs[0] corresponds to the devtools-suggestion-input of the command
    const suggestionInput = inputs[1];
    // Reset the value to empty string because for boolean it will be set to false by default and the correct suggestions will not show
    suggestionInput.value = '';
    suggestionInput.focus();

    await suggestionInput.updateComplete;
    const suggestionBox = suggestionInput.renderRoot.querySelector('devtools-suggestion-box');

    if (!suggestionBox) {
      throw new Error('No suggestion box shown');
    }
    const suggestions = Array.from(suggestionBox.renderRoot.querySelectorAll('li')).map(item => {
      if (!item.textContent) {
        throw new Error('No text inside suggestion');
      }
      return (item.textContent.replaceAll(/\s/g, ''));
    });
    return suggestions;
  };

  const serializePopupContent = (): string|null|undefined => {
    const container = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]');
    const hintDetailView = container?.shadowRoot?.querySelector('devtools-css-hint-details-view');
    return hintDetailView?.shadowRoot?.textContent?.replaceAll(/\s/g, '');
  };

  const renderEditorForCommand = async(command: string, parameters: {[paramName: string]: unknown}): Promise<{
    inputs: NodeListOf<SuggestionInput.SuggestionInput.SuggestionInput>,
    displayedCommand: string,
    jsonEditor: ProtocolComponents.JSONEditor.JSONEditor,
  }> => {
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
    const inputs = shadowRoot.querySelectorAll('devtools-suggestion-input');
    const displayedCommand = jsonEditor.command;
    return {inputs, displayedCommand, jsonEditor};
  };

  const renderParamsWithDefaultValues =
      async(command: string): Promise<SuggestionInput.SuggestionInput.SuggestionInput> => {
    const jsonEditor = renderJSONEditor();

    await populateMetadata(jsonEditor);
    jsonEditor.command = command;
    jsonEditor.populateParametersForCommandWithDefaultValues();
    await jsonEditor.updateComplete;

    const param = jsonEditor.renderRoot.querySelector('[data-paramId]');
    await renderHoveredElement(param);

    const setDefaultValueButton = jsonEditor.renderRoot.querySelector('devtools-button');
    if (!setDefaultValueButton) {
      throw new Error('No button');
    }
    dispatchClickEvent(setDefaultValueButton, {
      bubbles: true,
      composed: true,
    });

    await jsonEditor.updateComplete;

    const input = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input');
    const paramInput = input[1];

    if (!paramInput) {
      throw new Error('No input shown');
    }
    return paramInput;
  };

  const renderWarningIcon =
      async(command: string, enumsByName?: Map<string, Record<string, string>>): Promise<IconButton.Icon.Icon> => {
    const jsonEditor = renderJSONEditor();
    await populateMetadata(jsonEditor);
    jsonEditor.command = command;
    if (enumsByName) {
      jsonEditor.enumsByName = enumsByName;
    }
    jsonEditor.populateParametersForCommandWithDefaultValues();
    await jsonEditor.updateComplete;

    // inputs[0] corresponds to the devtools-suggestion-input of the command
    const input = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input')[1];
    if (!input) {
      throw Error('No editable content displayed');
    }
    input.value = 'Not an accepted value';
    await jsonEditor.updateComplete;
    input.focus();
    input.blur();
    await jsonEditor.updateComplete;
    const warningIcon = jsonEditor.renderRoot.querySelector('devtools-icon');
    if (!warningIcon) {
      throw Error('No icon displayed');
    }
    return warningIcon;
  };

  describe('Binding input bar', () => {
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

    it('should should every parameter of a command as undefined even if some parameters have not been entered inside the input bar',
       async () => {
         const cdpCommand = {
           'command': 'Test.test5',
           'parameters': {
             'test': 'test',
           },
         };
         const {command, parameters} = ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify(cdpCommand));

         const jsonEditor = renderJSONEditor();

         await populateMetadata(jsonEditor);

         jsonEditor.displayCommand(command, parameters);

         await jsonEditor.updateComplete;
         const shadowRoot = jsonEditor.renderRoot;
         const displayedParameters = shadowRoot.querySelectorAll('.parameter');
         // Two parameters (test and test2) should be displayed because in the metadata, Test.test5 accepts two parameters
         assert.deepStrictEqual(displayedParameters.length, 2);
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

  describe('Display command written in editor inside input bar', () => {
    it('should display the command edited inside the CDP editor into the input bar', async () => {
      const split = new UI.SplitWidget.SplitWidget(true, false, 'protocol-monitor-split-container', 400);
      const editorWidget = new ProtocolMonitor.ProtocolMonitor.EditorWidget();
      const jsonEditor = editorWidget.jsonEditor;
      jsonEditor.command = 'Test.test';
      jsonEditor.parameters = [
        {
          name: 'test',
          type: ProtocolComponents.JSONEditor.ParameterType.String,
          description: 'test',
          optional: false,
          value: 'test',
        },
      ];
      const dataGrid = new ProtocolMonitor.ProtocolMonitor.ProtocolMonitorDataGrid(split);
      split.setMainWidget(dataGrid);
      split.setSidebarWidget(editorWidget);
      split.toggleSidebar();
      await coordinator.done();

      // The first input bar corresponds to the filter bar, so we query the second one which corresponds to the CDP one.
      const toolbarInput = dataGrid.element.shadowRoot?.querySelectorAll('.toolbar')[1].shadowRoot?.querySelector(
          '.toolbar-input-prompt');
      assert.deepStrictEqual(toolbarInput?.innerHTML, '{"command":"Test.test","parameters":{"test":"test"}}');
    });

    it('should update the selected target inside the input bar', async () => {
      const split = new UI.SplitWidget.SplitWidget(true, false, 'protocol-monitor-split-container', 400);
      const editorWidget = new ProtocolMonitor.ProtocolMonitor.EditorWidget();
      const jsonEditor = editorWidget.jsonEditor;
      jsonEditor.targetId = 'value2';
      const dataGrid = new ProtocolMonitor.ProtocolMonitor.ProtocolMonitorDataGrid(split);
      const selector = dataGrid.selector;

      selector.createOption('Option 1', 'value1');
      selector.createOption('Option 2', 'value2');
      selector.createOption('Option 3', 'value3');

      split.setMainWidget(dataGrid);
      split.setSidebarWidget(editorWidget);

      split.toggleSidebar();
      await coordinator.done();

      // Should be index 1 because the targetId equals "value2" which corresponds to the index number 1
      assert.deepStrictEqual(selector.selectedIndex(), 1);
    });

    // Flaky test.
    it.skip(
        '[crbug.com/1484534]: should not display the command into the input bar if the command is empty string',
        async () => {
          const split = new UI.SplitWidget.SplitWidget(true, false, 'protocol-monitor-split-container', 400);
          const editorWidget = new ProtocolMonitor.ProtocolMonitor.EditorWidget();
          const jsonEditor = editorWidget.jsonEditor;
          jsonEditor.command = '';
          const dataGrid = new ProtocolMonitor.ProtocolMonitor.ProtocolMonitorDataGrid(split);
          split.setMainWidget(dataGrid);
          split.setSidebarWidget(editorWidget);
          split.toggleSidebar();

          await coordinator.done();

          // The first input bar corresponds to the filter bar, so we query the second one which corresponds to the CDP one.
          const toolbarInput = dataGrid.element.shadowRoot?.querySelectorAll('.toolbar')[1].shadowRoot?.querySelector(
              '.toolbar-input-prompt');
          assert.deepStrictEqual(toolbarInput?.innerHTML, '');
        });
  });
  describe('Descriptions', () => {
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

      await renderHoveredElement(param);
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
      await renderHoveredElement(command);

      const popupContent = serializePopupContent();

      const expectedPopupContent = 'Description1.Returns:Test1LearnMore';
      assert.deepStrictEqual(popupContent, expectedPopupContent);
    });
  });

  describe('Suggestion box', () => {
    it('should display suggestion box with correct suggestions when the parameter is an enum', async () => {
      const enumsByName = new Map([
        ['Test.testRef', {'Test': 'test', 'Test1': 'test1', 'Test2': 'test2'}],
      ]);
      const command = 'Test.test';

      const jsonEditor = renderJSONEditor();

      await populateMetadata(jsonEditor);

      const suggestions = await renderSuggestionBox(command, jsonEditor, enumsByName);
      assert.deepStrictEqual(suggestions, ['test', 'test1', 'test2']);
    });

    it('should display suggestion box with correct suggestions when the parameter is a boolean', async () => {
      const command = 'Test.test4';

      const jsonEditor = renderJSONEditor();

      await populateMetadata(jsonEditor);

      const suggestions = await renderSuggestionBox(command, jsonEditor);

      assert.deepStrictEqual(suggestions, ['false', 'true']);
    });

    it('should show the suggestion box for enum parameters nested inside arrays', async () => {
      const enumsByName = new Map([
        ['Test.arrayTypeRef', {'Test': 'test', 'Test1': 'test1', 'Test2': 'test2'}],
      ]);
      const command = 'Test.test11';

      const jsonEditor = renderJSONEditor();

      await populateMetadata(jsonEditor);
      jsonEditor.enumsByName = enumsByName;
      jsonEditor.command = command;
      jsonEditor.populateParametersForCommandWithDefaultValues();

      await jsonEditor.updateComplete;

      const param = jsonEditor.renderRoot.querySelector('[data-paramId]');
      await renderHoveredElement(param);

      const addParamButton = jsonEditor.renderRoot.querySelector('devtools-button[title="Add a parameter"]');
      if (!addParamButton) {
        throw new Error('No button');
      }
      dispatchClickEvent(addParamButton, {
        bubbles: true,
        composed: true,
      });

      await jsonEditor.updateComplete;

      const inputs = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input');
      // inputs[0] corresponds to the devtools-suggestion-input of the command
      const suggestionInput = inputs[1];
      // Reset the value to empty string because for boolean it will be set to false by default and the correct suggestions will not show
      suggestionInput.value = '';
      suggestionInput.focus();

      await suggestionInput.updateComplete;
      const suggestionBox = suggestionInput.renderRoot.querySelector('devtools-suggestion-box');

      if (!suggestionBox) {
        throw new Error('No suggestion box shown');
      }
      const suggestions = Array.from(suggestionBox.renderRoot.querySelectorAll('li')).map(item => {
        if (!item.textContent) {
          throw new Error('No text inside suggestion');
        }
        return (item.textContent.replaceAll(/\s/g, ''));
      });

      assert.deepStrictEqual(suggestions, ['test', 'test1', 'test2']);
    });

    it('should update the values inside the suggestion box when the command changes', async () => {
      const enumsByName = new Map();
      enumsByName.set('Test.testRef', {'Test': 'test', 'Test1': 'test1', 'Test2': 'test2'});
      enumsByName.set('Test.newTestRef', {'NewTest': 'newtest', 'NewTest1': 'newtest1', 'NewTest2': 'newtest2'});

      const command = 'Test.test';

      const jsonEditor = renderJSONEditor();

      await populateMetadata(jsonEditor);

      await renderSuggestionBox(command, jsonEditor, enumsByName);

      const newCommand = 'Test.test13';

      const newSuggestions = await renderSuggestionBox(newCommand, jsonEditor, enumsByName);

      assert.deepStrictEqual(newSuggestions, ['newtest', 'newtest1', 'newtest2']);
    });

    it('should not display suggestion box when the parameter is neither a string or a boolean', async () => {
      const command = 'Test.test8';

      const jsonEditor = renderJSONEditor();

      await populateMetadata(jsonEditor);

      const suggestions = await renderSuggestionBox(command, jsonEditor);

      assert.deepStrictEqual(suggestions, []);
    });
  });

  describe('Display with default values', () => {
    it('should show <empty_string> inside the placeholder when clicking on plus button for optional string parameter',
       async () => {
         const command = 'Test.test5';

         const placeholder = (await renderParamsWithDefaultValues(command)).placeholder;

         const expectedPlaceholder = '<empty_string>';

         assert.deepStrictEqual(placeholder, expectedPlaceholder);
       });

    it('should show 0 as a value inside input when clicking on plus button for optional number parameter', async () => {
      const command = 'Test.test6';

      const value = Number((await renderParamsWithDefaultValues(command)).value);

      const expectedValue = 0;

      assert.deepStrictEqual(value, expectedValue);
    });

    it('should show false as a value inside input when clicking on plus button for optional boolean parameter',
       async () => {
         const command = 'Test.test7';

         const value = Boolean((await renderParamsWithDefaultValues(command)).value);

         const expectedValue = false;

         assert.deepStrictEqual(value, expectedValue);
       });

    it('should show the keys with default values when clicking of plus button for optional object parameters',
       async () => {
         const command = 'Test.test12';
         const typesByName = new Map();
         typesByName.set('Optional.Object', [
           {
             'optional': false,
             'type': 'string',
             'name': 'param1',
           },
           {
             'optional': false,
             'type': 'number',
             'name': 'param2',
           },
         ]);
         const jsonEditor = renderJSONEditor();
         jsonEditor.typesByName = typesByName;
         await populateMetadata(jsonEditor);
         jsonEditor.command = command;
         jsonEditor.populateParametersForCommandWithDefaultValues();
         await jsonEditor.updateComplete;

         const param = jsonEditor.renderRoot.querySelector('[data-paramId]');
         await renderHoveredElement(param);

         const showDefaultValuesButton =
             jsonEditor.renderRoot.querySelector('devtools-button[title="Add a parameter"]');
         if (!showDefaultValuesButton) {
           throw new Error('No button');
         }

         dispatchClickEvent(showDefaultValuesButton, {
           bubbles: true,
           composed: true,
         });

         await jsonEditor.updateComplete;

         // The -1 is need to not take into account the input for the command
         const numberOfInputs = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input').length - 1;

         assert.deepStrictEqual(numberOfInputs, 2);
       });

  });

  describe('Reset to default values', () => {
    it('should reset the value of keys of object parameter to default value when clicking on clear button',
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
         const {jsonEditor} = await renderEditorForCommand(command, parameters);

         const param = jsonEditor.renderRoot.querySelector('[data-paramId=\'test3\']');

         await renderHoveredElement(param);

         const setDefaultValueButton = jsonEditor.renderRoot.querySelector('devtools-button');

         if (!setDefaultValueButton) {
           throw new Error('No button');
         }
         dispatchClickEvent(setDefaultValueButton, {
           bubbles: true,
           composed: true,
         });

         await jsonEditor.updateComplete;

         const input = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input');
         const values = [input[1].value, input[2].value];

         const expectedValues = ['', ''];

         assert.deepStrictEqual(values, expectedValues);
       });

    it('should reset the value of array parameter to empty array when clicking on clear button', async () => {
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

      const jsonEditor = renderJSONEditor();
      jsonEditor.parameters = inputParameters as ProtocolComponents.JSONEditor.Parameter[];
      await jsonEditor.updateComplete;

      const param = jsonEditor.renderRoot.querySelector('[data-paramId=\'arrayParam\']');

      await renderHoveredElement(param);

      const setDefaultValueButton =
          jsonEditor.renderRoot.querySelector('devtools-button[title="Reset to default value"]');

      if (!setDefaultValueButton) {
        throw new Error('No button');
      }
      dispatchClickEvent(setDefaultValueButton, {
        bubbles: true,
        composed: true,
      });

      await jsonEditor.updateComplete;

      const value = jsonEditor.parameters[0].value;

      assert.deepStrictEqual(value, []);
    });

    it('should reset the value of optional object parameter to undefined after clicking on clear button', async () => {
      const command = 'Test.test12';
      const typesByName = new Map();
      typesByName.set('Optional.Object', [
        {
          'optional': false,
          'type': 'string',
          'name': 'param1',
        },
        {
          'optional': false,
          'type': 'number',
          'name': 'param2',
        },
      ]);
      const jsonEditor = renderJSONEditor();
      jsonEditor.typesByName = typesByName;
      await populateMetadata(jsonEditor);
      jsonEditor.command = command;
      jsonEditor.populateParametersForCommandWithDefaultValues();
      await jsonEditor.updateComplete;

      const param = jsonEditor.renderRoot.querySelector('[data-paramId]');
      await renderHoveredElement(param);

      const showDefaultValuesButton = jsonEditor.renderRoot.querySelector('devtools-button[title="Add a parameter"]');
      if (!showDefaultValuesButton) {
        throw new Error('No button');
      }

      dispatchClickEvent(showDefaultValuesButton, {
        bubbles: true,
        composed: true,
      });

      await jsonEditor.updateComplete;

      await renderHoveredElement(param);
      const clearButton = jsonEditor.renderRoot.querySelector('devtools-button[title="Reset to default value"]');

      if (!clearButton) {
        throw new Error('No clear button');
      }

      dispatchClickEvent(clearButton, {
        bubbles: true,
        composed: true,
      });

      await jsonEditor.updateComplete;
      // The -1 is need to not take into account the input for the command
      const numberOfInputs = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input').length - 1;

      assert.deepStrictEqual(numberOfInputs, 0);
    });
  });

  describe('Delete and add for array parameters', () => {
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
      const deleteButtons = shadowRoot.querySelectorAll('devtools-button[title="Delete parameter"]');
      if (deleteButtons.length > parameterIndex) {
        deleteButtons[parameterIndex].dispatchEvent(new Event('click'));
      }

      const resultedParams = jsonEditor.getParameters();
      assert.deepStrictEqual(expectedParams, resultedParams);
    });

    it('should add parameters when clicking on "Plus" button for array parameters', async () => {
      const command = 'Test.test2';

      const jsonEditor = renderJSONEditor();

      await populateMetadata(jsonEditor);
      jsonEditor.command = command;
      jsonEditor.populateParametersForCommandWithDefaultValues();
      await jsonEditor.updateComplete;

      const param = jsonEditor.renderRoot.querySelector('[data-paramId]');
      await renderHoveredElement(param);

      const addParamButton = jsonEditor.renderRoot.querySelector('devtools-button[title="Add a parameter"]');
      if (!addParamButton) {
        throw new Error('No button');
      }
      dispatchClickEvent(addParamButton, {
        bubbles: true,
        composed: true,
      });
      dispatchClickEvent(addParamButton, {
        bubbles: true,
        composed: true,
      });

      await jsonEditor.updateComplete;

      // The -1 is need to not take into account the input for the command
      const numberOfInputs = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input').length - 1;

      assert.deepStrictEqual(numberOfInputs, 2);
    });
  });

  describe('Send parameters in a correct format', () => {
    it('should return the parameters in a format understandable by the ProtocolMonitor when sending a command via CTRL + Enter',
       async () => {
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

    it('should return the parameters in a format understandable by the ProtocolMonitor when sending a command via the send button',
       async () => {
         const jsonEditor = renderJSONEditor();
         jsonEditor.command = 'Test.test';
         jsonEditor.parameters = [
           {
             name: 'testName',
             type: ProtocolComponents.JSONEditor.ParameterType.String,
             description: 'test',
             optional: false,
             value: 'testValue',
           },
         ];
         await jsonEditor.updateComplete;

         const toolbar = jsonEditor.renderRoot.querySelector('devtools-pm-toolbar');
         if (!toolbar) {
           throw Error('No toolbar found !');
         }
         const event = new ProtocolComponents.Toolbar.SendCommandEvent();
         const responsePromise = getEventPromise(jsonEditor, ProtocolComponents.JSONEditor.SubmitEditorEvent.eventName);

         toolbar.dispatchEvent(event);
         const response = await responsePromise as ProtocolComponents.JSONEditor.SubmitEditorEvent;

         const expectedParameters = {
           'testName': 'testValue',
         };

         assert.deepStrictEqual(response.data.parameters, expectedParameters);
       });
  });

  describe('Verify the type of the entered value', async () => {
    it('should show a warning icon if the type of the parameter is number but the entered value is not', async () => {
      const command = 'Test.test8';

      const warningIcon = await renderWarningIcon(command);
      assert.isNotNull(warningIcon);
    });
    it('should show a warning icon if the type of the parameter is boolean but the entered value is not true or false',
       async () => {
         const command = 'Test.test4';
         const warningIcon = await renderWarningIcon(command);
         assert.isNotNull(warningIcon);
       });
    it('should show a warning icon if the type of the parameter is enum but the entered value is not among the accepted values',
       async () => {
         const enumsByName = new Map([
           ['Test.testRef', {'Test': 'test', 'Test1': 'test1', 'Test2': 'test2'}],
         ]);
         const command = 'Test.test';
         const warningIcon = await renderWarningIcon(command, enumsByName);
         assert.isNotNull(warningIcon);
       });
  });

  it('should not display parameters if a command is unknown', async () => {
    const cdpCommand = 'Unknown';
    const jsonEditor = renderJSONEditor();

    await populateMetadata(jsonEditor);
    jsonEditor.command = cdpCommand;
    await jsonEditor.updateComplete;

    const inputs = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input');
    const addButtons = jsonEditor.renderRoot.querySelectorAll('devtools-button[title="Add a parameter"]');

    assert.deepStrictEqual(inputs.length, 1);
    assert.deepStrictEqual(addButtons.length, 0);
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

  it('should copy the CDP command to clipboard via copy event', async () => {
    const jsonEditor = renderJSONEditor();
    jsonEditor.command = 'Test.test';
    jsonEditor.parameters = [
      {
        name: 'test',
        type: ProtocolComponents.JSONEditor.ParameterType.String,
        description: 'test',
        optional: false,
        value: 'test',
      },
    ];
    await jsonEditor.updateComplete;
    const isCalled = sinon.promise();
    const copyText = sinon
                         .stub(
                             Host.InspectorFrontendHost.InspectorFrontendHostInstance,
                             'copyText',
                             )
                         .callsFake(() => {
                           void isCalled.resolve(true);
                         });
    const toolbar = jsonEditor.renderRoot.querySelector('devtools-pm-toolbar');
    if (!toolbar) {
      throw Error('No toolbar found !');
    }
    const event = new ProtocolComponents.Toolbar.CopyCommandEvent();
    toolbar.dispatchEvent(event);
    await isCalled;

    assert.isTrue(copyText.calledWith(JSON.stringify({command: 'Test.test', parameters: {'test': 'test'}})));
  });

  it('should display the correct parameters with a command with array nested inside object', async () => {
    const command = 'Test.test9';
    const typesByName = new Map();
    // This nested object contains every subtype including array
    typesByName.set('Tracing.TraceConfig', [
      {
        'name': 'recordMode',
        'type': 'string',
        'optional': true,
        'description': 'Controls how the trace buffer stores data.',
        'typeRef': null,
      },
      {
        'name': 'traceBufferSizeInKb',
        'type': 'number',
        'optional': true,
        'description':
            'Size of the trace buffer in kilobytes. If not specified or zero is passed, a default value of 200 MB would be used.',
        'typeRef': null,
      },
      {
        'name': 'enableSystrace',
        'type': 'boolean',
        'optional': true,
        'description': 'Turns on system tracing.',
        'typeRef': null,
      },
      {
        'name': 'includedCategories',
        'type': 'array',
        'optional': true,
        'description': 'Included category filters.',
        'typeRef': 'string',
      },
      {
        'name': 'memoryDumpConfig',
        'type': 'object',
        'optional': true,
        'description': 'Configuration for memory dump triggers. Used only when \\"memory-infra\\" category is enabled.',
        'typeRef':
            'Tracing.MemoryDumpConfig',  // This typeref is on purpose not added to show that this param will be treated as a string parameter
      },
    ]);

    const jsonEditor = renderJSONEditor();

    await populateMetadata(jsonEditor);
    jsonEditor.typesByName = typesByName;
    jsonEditor.command = command;
    jsonEditor.populateParametersForCommandWithDefaultValues();
    await jsonEditor.updateComplete;
    const shadowRoot = jsonEditor.renderRoot;
    const parameters = shadowRoot.querySelectorAll('.parameter');
    // This expected value is equal to 6 because there are 5 different parameters inside typesByName + 1
    // for the name of the parameter (traceConfig)
    assert.deepStrictEqual(parameters.length, 6);
  });

  it('should return the parameters in a format understandable by the ProtocolMonitor when sending a command with object parameter that has no typeRef found in map',
     async () => {
       const command = 'Test.test10';
       const typesByName = new Map();
       // We set the map typesBynames without the key NoTypeRef
       typesByName.set('Tracing.TraceConfig', [
         {
           'name': 'memoryDumpConfig',
           'type': 'object',
           'optional': true,
           'description':
               'Configuration for memory dump triggers. Used only when \\"memory-infra\\" category is enabled.',
           'typeRef':
               'Tracing.MemoryDumpConfig',  // This typeref is on purpose not added to show that this param will be treated as a string parameter
         },
       ]);

       const jsonEditor = renderJSONEditor();

       await populateMetadata(jsonEditor);
       jsonEditor.typesByName = typesByName;
       jsonEditor.command = command;
       jsonEditor.populateParametersForCommandWithDefaultValues();
       await jsonEditor.updateComplete;
       const shadowRoot = jsonEditor.renderRoot;
       const parameters = shadowRoot.querySelector('.parameter');

       await renderHoveredElement(parameters);

       const addParamButton = jsonEditor.renderRoot.querySelector('devtools-button[title="Add custom property"]');
       if (!addParamButton) {
         throw new Error('No button');
       }
       // We click two times to display two parameters with key/value pairs
       dispatchClickEvent(addParamButton, {
         bubbles: true,
         composed: true,
       });
       dispatchClickEvent(addParamButton, {
         bubbles: true,
         composed: true,
       });

       await jsonEditor.updateComplete;
       const editors = shadowRoot.querySelectorAll('devtools-suggestion-input');

       // Editors[0] refers to the command editor, so we start at index 1
       // We populate the key/value pairs
       editors[1].value = 'testName1';
       await jsonEditor.updateComplete;
       editors[1].focus();
       editors[1].blur();
       await jsonEditor.updateComplete;

       editors[2].value = 'testValue1';
       await jsonEditor.updateComplete;
       editors[2].focus();
       editors[2].blur();
       await jsonEditor.updateComplete;

       editors[3].value = 'testName2';
       await jsonEditor.updateComplete;
       editors[3].focus();
       editors[3].blur();
       await jsonEditor.updateComplete;

       editors[4].value = 'testValue2';
       await jsonEditor.updateComplete;
       editors[4].focus();
       editors[4].blur();
       await jsonEditor.updateComplete;

       const responsePromise = getEventPromise(jsonEditor, ProtocolComponents.JSONEditor.SubmitEditorEvent.eventName);

       // We send the command
       dispatchKeyDownEvent(jsonEditor, {key: 'Enter', ctrlKey: true, metaKey: true});

       const response = await responsePromise as ProtocolComponents.JSONEditor.SubmitEditorEvent;

       const expectedParameters = {
         'NoTypeRef': {
           'testName1': 'testValue1',
           'testName2': 'testValue2',
         },
       };

       assert.deepStrictEqual(response.data.parameters, expectedParameters);
     });

  it('should show the custom editor for an object param that has no type ref', async () => {
    const command = 'Test.test14';
    const jsonEditor = renderJSONEditor();

    await populateMetadata(jsonEditor);
    jsonEditor.command = command;
    jsonEditor.populateParametersForCommandWithDefaultValues();
    await jsonEditor.updateComplete;
    const shadowRoot = jsonEditor.renderRoot;
    const parameters = shadowRoot.querySelector('.parameter');

    await renderHoveredElement(parameters);

    const addParamButton = jsonEditor.renderRoot.querySelector('devtools-button[title="Add custom property"]');
    if (!addParamButton) {
      throw new Error('No button');
    }
    // We click two times to display two parameters with key/value pairs
    dispatchClickEvent(addParamButton, {
      bubbles: true,
      composed: true,
    });
    dispatchClickEvent(addParamButton, {
      bubbles: true,
      composed: true,
    });

    await jsonEditor.updateComplete;
    // The -1 is need to not take into account the input for the command

    const numberOfInputs = jsonEditor.renderRoot.querySelectorAll('devtools-suggestion-input').length - 1;

    assert.deepStrictEqual(numberOfInputs, 4);
  });

  describe('Command suggestion filter', () => {
    it('filters the commands by substring match', async () => {
      assert(ProtocolComponents.JSONEditor.suggestionFilter('Test', 'Tes'));
      assert(ProtocolComponents.JSONEditor.suggestionFilter('Test', 'est'));
      assert(!ProtocolComponents.JSONEditor.suggestionFilter('Test', 'dest'));
    });
  });
});
