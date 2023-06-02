// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as ProtocolMonitor from '../../../../../front_end/panels/protocol_monitor/protocol_monitor.js';

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

    it('should correctly creates a set of CDP commands', async () => {
      const provider = new ProtocolMonitor.ProtocolMonitor.CommandAutocompleteSuggestionProvider(2);
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

      const expectedCommands = new Set([
        'Test.test',
        'Test2.test2',
        'Test2.test3',
      ]);
      assert.deepStrictEqual(provider.buildProtocolCommands(domains), expectedCommands);
    });
  });

  describe('EditorWidget', () => {
    it('output correctly the CDP commands inside the Sidebar Panel', async () => {
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

      const commandAutocompleteSuggestionProvider =
          new ProtocolMonitor.ProtocolMonitor.CommandAutocompleteSuggestionProvider(2);
      const editorWidget = new ProtocolMonitor.ProtocolMonitor.EditorWidget(commandAutocompleteSuggestionProvider);
      editorWidget.setCommand(command, parameters);
      const JSONPromptEditors = editorWidget.promptList?.querySelectorAll('.json-prompt');
      const numberOfCommandPromptEditor = 1;
      assert.deepStrictEqual(JSONPromptEditors.length, Object.keys(parameters).length + numberOfCommandPromptEditor);
    });
  });
});
