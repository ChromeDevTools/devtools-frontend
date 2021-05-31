// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Recorder from '../../../../../front_end/models/recorder/recorder.js';

const setup = Recorder.RecordingClient.setupRecordingClient;

function assertDefined<T>(val: T|undefined): asserts val is T {
  assert.isDefined(val);
}

describe('Recorder', () => {
  function withImports(callback: (imports: Recorder.RecordingClient.Exports) => void) {
    const imports: Recorder.RecordingClient.Exports = {};
    try {
      callback(imports);
    } finally {
      assertDefined(imports.teardown);
      imports.teardown();
    }
  }

  describe('RecordingClient', () => {
    it('should create click steps from events', () => {
      withImports(imports => {
        const getAccessibleName = () => 'testName';
        const getAccessibleRole = () => 'button';
        setup({getAccessibleName, getAccessibleRole}, false, false, imports);
        assertDefined(imports.createStepFromEvent);
        const event = new Event('click');
        const button = document.createElement('button');
        assert.deepStrictEqual(imports.createStepFromEvent(event, button, true), {
          type: 'click',
          selector: 'aria/testName',
        });
      });
    });

    it('should create keydown steps from events', () => {
      withImports(imports => {
        const getAccessibleName = () => 'testName';
        const getAccessibleRole = () => 'button';
        setup({getAccessibleName, getAccessibleRole}, false, false, imports);
        assertDefined(imports.createStepFromEvent);
        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
        });
        const button = document.createElement('button');
        assert.deepStrictEqual(imports.createStepFromEvent(event, button, true), {
          type: 'keydown',
          altKey: false,
          metaKey: false,
          shiftKey: false,
          ctrlKey: false,
          key: 'Escape',
        });
      });
    });

    it('should create keyup steps from events', () => {
      withImports(imports => {
        const getAccessibleName = () => 'testName';
        const getAccessibleRole = () => 'button';
        setup({getAccessibleName, getAccessibleRole}, false, false, imports);
        assertDefined(imports.createStepFromEvent);
        const event = new KeyboardEvent('keyup', {
          key: 'Escape',
        });
        const button = document.createElement('button');
        assert.deepStrictEqual(imports.createStepFromEvent(event, button, true), {
          type: 'keyup',
          altKey: false,
          metaKey: false,
          shiftKey: false,
          ctrlKey: false,
          key: 'Escape',
        });
      });
    });

    it('should get a selector for elements', () => {
      withImports(imports => {
        const getAccessibleName = () => '';
        const getAccessibleRole = () => 'button';
        setup({getAccessibleName, getAccessibleRole}, false, false, imports);
        assertDefined(imports.getSelector);
        const button = document.createElement('button');
        button.id = 'customId';
        assert.deepStrictEqual(imports.getSelector(button), 'button#customId');
      });
    });
  });
});
