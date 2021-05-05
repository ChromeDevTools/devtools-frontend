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
  describe('RecordingClient', () => {
    it('should create click steps from events', () => {
      const imports: Recorder.RecordingClient.Exports = {};
      try {
        const getAccessibleName = () => 'testName';
        const getAccessibleRole = () => 'button';
        setup({getAccessibleName, getAccessibleRole}, false, imports);
        assertDefined(imports.createStepFromEvent);
        const event = new Event('click');
        const button = document.createElement('button');
        assert.deepStrictEqual(imports.createStepFromEvent(event, button, true), {
          type: 'click',
          selector: 'aria/testName',
          value: '',
        });
      } finally {
        assertDefined(imports.teardown);
        imports.teardown();
      }
    });

    it('should get a selector for elements', () => {
      const imports: Recorder.RecordingClient.Exports = {};
      try {
        const getAccessibleName = () => '';
        const getAccessibleRole = () => 'button';
        setup({getAccessibleName, getAccessibleRole}, false, imports);
        assertDefined(imports.getSelector);
        const button = document.createElement('button');
        button.id = 'customId';
        assert.deepStrictEqual(imports.getSelector(button), 'button#customId');
      } finally {
        assertDefined(imports.teardown);
        imports.teardown();
      }
    });
  });
});
