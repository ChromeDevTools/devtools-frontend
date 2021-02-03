// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Recorder from '../../../../front_end/recorder/recorder.js';

class TestStep extends Recorder.Steps.Step {
  constructor() {
    super('test');
  }

  toScript(): Recorder.Steps.Script {
    return ['Hello World'];
  }
}

describe('Recorder', () => {
  describe('RecordingScriptWriter', () => {
    it('should respect the given indentation', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      writer.appendStep(new TestStep());
      assert.deepEqual(writer.getScript(), `const puppeteer = require(\'puppeteer\');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  Hello World
  await browser.close();
})();
`);
    });
  });
});
