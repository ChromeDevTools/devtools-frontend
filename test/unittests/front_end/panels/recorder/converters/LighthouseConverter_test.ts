// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';
import * as Converters from '../../../../../../front_end/panels/recorder/converters/converters.js';

describe('LighthouseConverter', () => {
  it('should stringify a flow', async () => {
    const converter = new Converters.LighthouseConverter.LighthouseConverter(
        '  ',
    );
    const [result, sourceMap] = await converter.stringify({
      title: 'test',
      steps: [
        {type: Models.Schema.StepType.Navigate, url: 'https://example.com'},
        {type: Models.Schema.StepType.Scroll, selectors: [['.cls']]},
      ],
    });
    const expected = `const fs = require('fs');
const puppeteer = require('puppeteer'); // v20.7.4 or later

(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  const timeout = 5000;
  page.setDefaultTimeout(timeout);

  const lhApi = await import('lighthouse'); // v10.0.0 or later
  const flags = {
    screenEmulation: {
      disabled: true
    }
  }
  const config = lhApi.desktopConfig;
  const lhFlow = await lhApi.startFlow(page, {name: 'test', config, flags});
  await lhFlow.startNavigation();
  {
    const targetPage = page;
    await targetPage.goto('https://example.com');
  }
  await lhFlow.endNavigation();
  await lhFlow.startTimespan();
  {
    const targetPage = page;
    await puppeteer.Locator.race([
      targetPage.locator('.cls')
    ])
      .setTimeout(timeout)
      .scroll({ scrollTop: undefined, scrollLeft: undefined});
  }
  await lhFlow.endTimespan();
  const lhFlowReport = await lhFlow.generateReport();
  fs.writeFileSync(__dirname + '/flow.report.html', lhFlowReport)

  await browser.close();`;
    const actual = result.substring(0, expected.length);
    assert.strictEqual(actual, expected, `Unexpected start of generated result:\n${actual}`);
    assert.deepStrictEqual(sourceMap, [1, 17, 6, 23, 9]);
  });

  it('should stringify a step', async () => {
    const converter = new Converters.LighthouseConverter.LighthouseConverter(
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
