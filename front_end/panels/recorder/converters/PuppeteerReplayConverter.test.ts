// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Models from '../models/models.js';

import * as Converters from './converters.js';

describe('PuppeteerReplayConverter', () => {
  it('should stringify a flow', async () => {
    const converter = new Converters.PuppeteerReplayConverter.PuppeteerReplayConverter('  ');
    const [result, sourceMap] = await converter.stringify({
      title: 'test',
      steps: [{type: Models.Schema.StepType.Scroll, selectors: [['.cls']]}],
    });
    assert.strictEqual(
        result,
        `import url from 'url';
import { createRunner } from '@puppeteer/replay';

export async function run(extension) {
  const runner = await createRunner(extension);

  await runner.runBeforeAllSteps();

  await runner.runStep({
    type: 'scroll',
    selectors: [
      [
        '.cls'
      ]
    ]
  });

  await runner.runAfterAllSteps();
}

if (process && import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  run()
}
`,
    );
    assert.deepStrictEqual(sourceMap, [1, 8, 8]);
  });

  it('should stringify a step', async () => {
    const converter = new Converters.PuppeteerReplayConverter.PuppeteerReplayConverter('  ');
    const result = await converter.stringifyStep({
      type: Models.Schema.StepType.Scroll,
    });
    assert.strictEqual(
        result,
        `await runner.runStep({
  type: 'scroll'
});
`,
    );
  });
});
