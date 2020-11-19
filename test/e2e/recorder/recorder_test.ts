// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {enableExperiment, getBrowserAndPages, getHostedModeServerPort, goToResource} from '../../shared/helper.js';
import {createNewRecording, openRecorderSubPane, openSourcesPanel} from '../helpers/sources-helpers.js';

function retrieveCodeMirrorEditorContent() {
  // @ts-ignore
  return Array.from(document.querySelectorAll('.CodeMirror-line'), l => l.textContent).join('\n').trim();
}

async function getCode() {
  const {frontend} = getBrowserAndPages();
  const textContent = await frontend.evaluate(retrieveCodeMirrorEditorContent);
  // TODO: Change to replaceAll once it's supported in Node.js.
  return textContent.replace(new RegExp(`localhost:${getHostedModeServerPort()}`, 'g'), '<url>').replace(/\u200b/g, '');
}

describe('Recorder', () => {
  it('should connect to the browser via DevTools own connection', async () => {
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');

    // Record
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await target.bringToFront();
    await target.click('#test');
    await target.click('#form-button');
    await target.click('#span');
    await target.click('#span2');
    await target.type('#input', 'test');
    await target.keyboard.press('Enter');
    await target.click('pierce/#inner-span');

    const iframe = await target.$('#iframe').then(x => x ? x.contentFrame() : null);
    // @ts-ignore
    await iframe.click('#in-iframe');
    await frontend.bringToFront();
    await frontend.click('aria/Stop');

    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer')

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    await page.click("aria/Test Button");
    await page.submit("html > body > div > form.form1");
    await page.click("aria/Hello World");
    await page.click("span#span2");
    await page.type("aria/Input", "test");
    await page.click("aria/Hello World");
})();

`);
  });
});
