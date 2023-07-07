// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';
import * as Converters from '../../../../../../front_end/panels/recorder/converters/converters.js';

describe('PuppeteerConverter', () => {
  it('should stringify a flow', async () => {
    const converter = new Converters.PuppeteerConverter.PuppeteerConverter(
        '  ',
    );
    const [result, sourceMap] = await converter.stringify({
      title: 'test',
      steps: [{type: Models.Schema.StepType.Scroll, selectors: [['.cls']]}],
    });
    const expected = `const puppeteer = require('puppeteer'); // v20.7.4 or later

(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  const timeout = 5000;
  page.setDefaultTimeout(timeout);

  {
    const targetPage = page;
    await puppeteer.Locator.race([
      targetPage.locator('.cls')
    ])
      .setTimeout(timeout)
      .scroll({ scrollTop: undefined, scrollLeft: undefined});
  }

  await browser.close();`;
    const actual = result.substring(0, expected.length);
    assert.strictEqual(actual, expected, `Unexpected start of generated result:\n${actual}`);
    assert.deepStrictEqual(sourceMap, [1, 8, 8]);
  });

  it('should stringify a step', async () => {
    const converter = new Converters.PuppeteerConverter.PuppeteerConverter(
        '  ',
    );
    const result = await converter.stringifyStep({
      type: Models.Schema.StepType.Scroll,
    });
    assert.strictEqual(
        result,
        `{
  const targetPage = page;
  await targetPage.evaluate((x, y) => { window.scroll(x, y); }, undefined, undefined)
}
`,
    );
  });
});
