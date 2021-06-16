// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */

import {assert} from 'chai';


import type {puppeteer} from '../../shared/helper.js';
import {enableExperiment, getBrowserAndPages, getResourcesPath, goToResource, timeout, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';


describe('Recorder', function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  describe('UI', () => {
    beforeEach(async () => {
      await enableExperiment('recorder', {selectedPanel: {name: 'recorder'}});
      await goToResource('recorder/recorder.html');
    });

    describe('Record', () => {
      it('should record a simple flow', async () => {
        const {target, frontend} = getBrowserAndPages();

        await frontend.click('aria/Start recording');
        await frontend.waitForSelector('aria/End recording');
        await target.bringToFront();
        // This is needed to give the recorder enough time to set up
        await timeout(1000);
        await frontend.bringToFront();
        await frontend.waitForSelector('pierce/.section');
        await target.click('#test');
        await frontend.bringToFront();

        await frontend.click('aria/End recording');

        const steps =
            await frontend.$$eval('pierce/.step .action', actions => actions.map(e => (e as HTMLElement).innerText));
        assert.deepEqual(steps, ['viewport', 'click']);
      });

      it('should replay a simple flow', async () => {
        const {target, frontend} = getBrowserAndPages();

        await frontend.click('aria/Start recording');
        await frontend.waitForSelector('aria/End recording');
        await target.bringToFront();
        // This is needed to give the recorder enough time to set up
        await timeout(1000);
        await frontend.bringToFront();
        await frontend.waitForSelector('pierce/.section');
        await target.click('a[href="recorder2.html"]');
        await frontend.bringToFront();

        await frontend.click('aria/End recording');

        const steps =
            await frontend.$$eval('pierce/.step .action', actions => actions.map(e => (e as HTMLElement).innerText));
        assert.deepEqual(steps, ['viewport', 'click']);

        await target.goto('about:blank');

        const button = await frontend.$('aria/Play recording') as puppeteer.ElementHandle<HTMLButtonElement>;

        // Wait for all steps to complete successfully
        const promise = waitForFunction(async () => {
          const successfulSteps = await frontend.$$eval(
              'pierce/.step.is-success .action', actions => actions.map(e => (e as HTMLElement).innerText));
          return steps.length === successfulSteps.length;
        });
        await button.click();
        await target.bringToFront();
        await promise;
        assert.strictEqual(target.url(), `${getResourcesPath()}/recorder/recorder2.html`);
      });
    });
  });
});
