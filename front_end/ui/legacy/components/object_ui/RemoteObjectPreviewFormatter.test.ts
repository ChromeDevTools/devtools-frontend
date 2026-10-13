// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';

import * as Protocol from '../../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {render} from '../../../lit/lit.js';

import * as ObjectUI from './object_ui.js';

describeWithEnvironment('RemoteObjectPreviewFormatter', () => {
  let formatter: ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter;

  beforeEach(() => {
    formatter = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
  });

  function renderPreview(preview: Protocol.Runtime.ObjectPreview): string {
    const template = formatter.renderObjectPreview(preview);
    const container = document.createElement('div');
    render(template, container);
    return container.textContent || '';
  }

  it('formats array values on Array.prototype[]', () => {
    const scenarios = [
      {
        name: 'a0',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(0)',
          overflow: false,
          properties: [],
        },
        expected: '[]',
      },
      {
        name: 'a1',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(1)',
          overflow: false,
          properties: [],
        },
        expected: '[empty]',
      },
      {
        name: 'a2',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(5)',
          overflow: false,
          properties: [],
        },
        expected: '(5) [empty × 5]',
      },
      {
        name: 'a3',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(3)',
          overflow: false,
          properties: [
            {name: '1', type: Protocol.Runtime.PropertyPreviewType.Number, value: '2'},
            {name: '2', type: Protocol.Runtime.PropertyPreviewType.Number, value: '3'},
          ],
        },
        expected: '(3) [empty, 2, 3]',
      },
      {
        name: 'a4',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(15)',
          overflow: false,
          properties: [],
        },
        expected: '(15) [empty × 15]',
      },
      {
        name: 'a5',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(15)',
          overflow: false,
          properties: [
            {name: '8', type: Protocol.Runtime.PropertyPreviewType.Number, value: '8'},
          ],
        },
        expected: '(15) [empty × 8, 8, empty × 6]',
      },
      {
        name: 'a6',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(15)',
          overflow: false,
          properties: [
            {name: '0', type: Protocol.Runtime.PropertyPreviewType.Number, value: '0'},
            {name: '10', type: Protocol.Runtime.PropertyPreviewType.Number, value: '10'},
          ],
        },
        expected: '(15) [0, empty × 9, 10, empty × 4]',
      },
      {
        name: 'a7',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(15)',
          overflow: true,
          properties: [
            {name: '3', type: Protocol.Runtime.PropertyPreviewType.Number, value: '4'},
            {name: 'index0', type: Protocol.Runtime.PropertyPreviewType.Number, value: '0'},
            {name: 'index1', type: Protocol.Runtime.PropertyPreviewType.Number, value: '1'},
            {name: 'index2', type: Protocol.Runtime.PropertyPreviewType.Number, value: '2'},
            {name: 'index3', type: Protocol.Runtime.PropertyPreviewType.Number, value: '3'},
            {name: 'index4', type: Protocol.Runtime.PropertyPreviewType.Number, value: '4'},
          ],
        },
        expected: '(15) [3: 4, index0: 0, index1: 1, index2: 2, index3: 3, index4: 4, …]',
      },
      {
        name: 'a8',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(10)',
          overflow: false,
          properties: [
            {name: '0', type: Protocol.Runtime.PropertyPreviewType.Number, value: '0'},
            {name: '1', type: Protocol.Runtime.PropertyPreviewType.Number, value: '1'},
            {name: '2', type: Protocol.Runtime.PropertyPreviewType.Number, value: '2'},
            {name: '3', type: Protocol.Runtime.PropertyPreviewType.Number, value: '3'},
            {name: '4', type: Protocol.Runtime.PropertyPreviewType.Number, value: '4'},
            {name: '5', type: Protocol.Runtime.PropertyPreviewType.Number, value: '5'},
            {name: '6', type: Protocol.Runtime.PropertyPreviewType.Number, value: '6'},
            {name: '7', type: Protocol.Runtime.PropertyPreviewType.Number, value: '7'},
            {name: '8', type: Protocol.Runtime.PropertyPreviewType.Number, value: '8'},
            {name: '9', type: Protocol.Runtime.PropertyPreviewType.Number, value: '9'},
          ],
        },
        expected: '(10) [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]',
      },
      {
        name: 'a9',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(11)',
          overflow: false,
          properties: [
            {name: '1', type: Protocol.Runtime.PropertyPreviewType.Number, value: '1'},
            {name: '2', type: Protocol.Runtime.PropertyPreviewType.Number, value: '2'},
            {name: '3', type: Protocol.Runtime.PropertyPreviewType.Number, value: '3'},
            {name: '4', type: Protocol.Runtime.PropertyPreviewType.Number, value: '4'},
            {name: '6', type: Protocol.Runtime.PropertyPreviewType.Number, value: '6'},
            {name: '7', type: Protocol.Runtime.PropertyPreviewType.Number, value: '7'},
            {name: '8', type: Protocol.Runtime.PropertyPreviewType.Number, value: '8'},
            {name: '9', type: Protocol.Runtime.PropertyPreviewType.Number, value: '9'},
            {name: 'foo', type: Protocol.Runtime.PropertyPreviewType.String, value: 'bar'},
          ],
        },
        expected: '(11) [empty, 1, 2, 3, 4, empty, 6, 7, 8, 9, empty, foo: \'bar\']',
      },
      {
        name: 'a10',
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          description: 'Array',
          overflow: false,
          properties: [],
        },
        expected: 'Array {}',
      },
    ];

    for (const {name, preview, expected} of scenarios) {
      const text = renderPreview(preview);
      const cleanText = text.replace(/\xa0/g, ' ');
      assert.strictEqual(cleanText, expected, `Scenario ${name} failed`);
    }
  });
});
