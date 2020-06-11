// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {click, getBrowserAndPages, goToResource, step, waitFor} from '../../shared/helper.js';
import {addBreakpointForLine, createSelectorsForWorkerFile, getBreakpointDecorators, getExecutionLine, getOpenSources, openNestedWorkerFile, PAUSE_BUTTON, RESUME_BUTTON} from '../helpers/sources-helpers.js';

async function validateSourceTabs() {
  await step('Validate exactly one source file is open', async () => {
    assert.deepEqual(await getOpenSources(), ['multi-workers.js']);
  });
}


describe('Multi-Workers', async function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  [false, true].forEach(sourceMaps => {
    const withOrWithout = sourceMaps ? 'with source maps' : 'without source maps';
    const targetPage = sourceMaps ? 'sources/multi-workers-sourcemap.html' : 'sources/multi-workers.html';
    const scriptFile = sourceMaps ? 'multi-workers.min.js' : 'multi-workers.js';
    function workerFileSelectors(workerIndex: number) {
      return createSelectorsForWorkerFile(scriptFile, 'test/e2e/resources/sources', 'multi-workers.js', workerIndex);
    }

    async function validateNavigationTree() {
      await step('Ensure 10 works exist', async () => {
        await waitFor(workerFileSelectors(10).rootSelector);
      });
    }

    async function validateBreakpoints(frontend: puppeteer.Page) {
      assert.deepEqual(await getBreakpointDecorators(frontend), [6, 12]);
      assert.deepEqual(await getBreakpointDecorators(frontend, true), [6]);
    }

    it(`loads scripts exactly once on reload ${withOrWithout}`, async () => {
      // Have the target load the page.
      await goToResource(targetPage);

      await click('#tab-sources');
      await validateNavigationTree();
      await openNestedWorkerFile(workerFileSelectors(1));

      // Look at source tabs
      await validateSourceTabs();

      // Reload page
      await goToResource(targetPage);

      // Check workers again
      await validateNavigationTree();

      // Look at source tabs again
      await validateSourceTabs();
    });

    it(`loads scripts exactly once on break ${withOrWithout}`, async () => {
      const {target} = getBrowserAndPages();

      // Have the target load the page.
      await goToResource(targetPage);

      await click('#tab-sources');

      await validateNavigationTree();

      // Send message to a worker to trigger break
      await target.evaluate('workers[3].postMessage({command:"break"});');

      // Should automatically switch to sources tab.

      // Validate that we are paused by locating the resume button
      await waitFor(RESUME_BUTTON);

      // Look at source tabs
      await validateSourceTabs();

      // Continue
      await click(RESUME_BUTTON);
      // Verify that we have resumed.
      await waitFor(PAUSE_BUTTON);

      await target.evaluate('workers[7].postMessage({command:"break"});');

      // Validate that we are paused
      await waitFor(RESUME_BUTTON);

      // Look at source tabs
      await validateSourceTabs();
    });

    describe(`copies breakpoints between workers ${withOrWithout}`, () => {
      beforeEach(async () => {
        const {frontend} = getBrowserAndPages();
        // Have the target load the page.
        await goToResource(targetPage);

        await click('#tab-sources');
        // Wait for all workers to load
        await validateNavigationTree();
        // Open file from second worker
        await openNestedWorkerFile(workerFileSelectors(2));
        // Set two breakpoints
        await addBreakpointForLine(frontend, 6);
        // Disable first breakpoint
        const bpEntry = await waitFor('.breakpoint-entry');
        const bpCheckbox = await waitFor('input', bpEntry);
        if (!bpCheckbox) {
          assert.fail('Could not find checkbox to disable breakpoint');
          return;
        }
        await bpCheckbox.evaluate(n => (n as HTMLElement).click());
        await frontend.waitFor('.cm-breakpoint-disabled');
        // Add another breakpoint
        await addBreakpointForLine(frontend, 12);

        // Check breakpoints
        await validateBreakpoints(frontend);

        // Close tab
        await click('[aria-label="Close multi-workers.js"]');
      });

      it('when opening different file in editor', async () => {
        const {frontend} = getBrowserAndPages();

        // Open different worker
        await openNestedWorkerFile(workerFileSelectors(3));

        // Check breakpoints
        await validateBreakpoints(frontend);
      });

      it('after reloading', async () => {
        const {target, frontend} = getBrowserAndPages();

        await target.reload();

        // Open different worker
        await openNestedWorkerFile(workerFileSelectors(4));

        // Check breakpoints
        await validateBreakpoints(frontend);
      });
    });

    describe(`hits breakpoints added to workers ${withOrWithout}`, () => {
      beforeEach(async () => {
        const {frontend} = getBrowserAndPages();

        // Have the target load the page.
        await goToResource(targetPage);

        await step('Open sources panel', async () => {
          await click('#tab-sources');
        });

        await validateNavigationTree();

        await step('Open second worker file', async () => {
          await openNestedWorkerFile(workerFileSelectors(2));
        });

        await step('Set breakpoint', async () => {
          await addBreakpointForLine(frontend, 6);
        });
      });

      it('for pre-loaded workers', async () => {
        const {target} = getBrowserAndPages();
        // Send message to a worker to trigger break
        await target.evaluate('workers[5].postMessage({});');

        // Validate that we are paused by locating the resume button
        await waitFor(RESUME_BUTTON);

        // Validate that the source line is highlighted
        assert.strictEqual(await getExecutionLine(), 6);

        // Look at source tabs
        await validateSourceTabs();
      });

      // Flaky test
      it.skip('[crbug.com/1073406] for newly created workers', async () => {
        const {target} = getBrowserAndPages();
        await step('Launch new worker to hit breakpoint', async () => {
          await target.evaluate(`new Worker('${scriptFile}').postMessage({});`);
        });

        await step('Validate that we are paused', async () => {
          await waitFor(RESUME_BUTTON);
        });

        await step('Validate source line is highlighted', async () => {
          assert.strictEqual(await getExecutionLine(), 6);
        });

        await validateSourceTabs();
      });
    });
  });
});
