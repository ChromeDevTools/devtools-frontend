// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {$$, click, getBrowserAndPages, goToResource, step, timeout, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, createSelectorsForWorkerFile, getBreakpointDecorators, getOpenSources, openNestedWorkerFile, RESUME_BUTTON, retrieveTopCallFrameWithoutResuming} from '../helpers/sources-helpers.js';

async function validateSourceTabs() {
  await step('Validate exactly one source file is open', async () => {
    const openSources = await waitForFunction(async () => {
      const sources = await getOpenSources();
      return sources.length ? sources : undefined;
    });
    assert.deepEqual(openSources, ['multi-workers.js']);
  });
}

describe('Multi-Workers', async function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  if (this.timeout() !== 0) {
    this.timeout(10000);
  }

  [false, true].forEach(sourceMaps => {
    const withOrWithout = sourceMaps ? 'with source maps' : 'without source maps';
    const targetPage = sourceMaps ? 'sources/multi-workers-sourcemap.html' : 'sources/multi-workers.html';
    const scriptFile = sourceMaps ? 'multi-workers.min.js' : 'multi-workers.js';
    function workerFileSelectors(workerIndex: number) {
      return createSelectorsForWorkerFile(scriptFile, 'test/e2e/resources/sources', 'multi-workers.js', workerIndex);
    }

    async function validateNavigationTree() {
      await step('Ensure 10 workers exist', async () => {
        await waitFor(workerFileSelectors(10).rootSelector);
      });
    }

    async function validateBreakpoints() {
      assert.deepEqual(await getBreakpointDecorators(), [6, 12]);
      assert.deepEqual(await getBreakpointDecorators(true), [6]);
    }

    describe(`loads scripts exactly once ${withOrWithout}`, () => {
      beforeEach(async () => {
        // Have the target load the page.
        await goToResource(targetPage);

        await step('Open sources panel', async () => {
          await click('#tab-sources');
        });

        await validateNavigationTree();

        await step('Open first worker file', async () => {
          await openNestedWorkerFile(workerFileSelectors(1));
        });

        // Look at source tabs
        await validateSourceTabs();
      });

      afterEach(async () => {
        // Look at source tabs
        await validateSourceTabs();
      });

      it('on reload', async () => {
        // Reload page
        await goToResource(targetPage);

        // Check workers again
        await validateNavigationTree();
      });

      it('upon break', async () => {
        const {target} = getBrowserAndPages();

        // Send message to a worker to trigger break
        await target.evaluate('workers[3].postMessage({command:"break"});');

        // Validate that we are paused by locating the resume button
        await waitFor(RESUME_BUTTON);
      });
    });

    it(`shows exactly one breakpoint ${withOrWithout}`, async () => {
      const {frontend} = getBrowserAndPages();
      // Have the target load the page.
      await goToResource(targetPage);

      await click('#tab-sources');
      // Wait for all workers to load
      await validateNavigationTree();
      // Open file from second worker
      await openNestedWorkerFile(workerFileSelectors(2));
      // Set a breakpoint
      await addBreakpointForLine(frontend, 6);

      await waitFor('.breakpoint-entry');
      const breakpoints = (await $$('.breakpoint-entry')).length;
      assert.strictEqual(breakpoints, 1);
    });

    describe(`copies breakpoints between workers ${withOrWithout}`, () => {
      beforeEach(async () => {
        const {frontend} = getBrowserAndPages();
        // Have the target load the page.
        await goToResource(targetPage);

        await click('#tab-sources');
        // Wait for all workers to load
        await validateNavigationTree();

        await step('Open file from second worker', async () => {
          await openNestedWorkerFile(workerFileSelectors(2));
        });

        await step('Set two breakpoints', async () => {
          await addBreakpointForLine(frontend, 6);
        });

        await step('Disable first breakpoint', async () => {
          const bpEntry = await waitFor('.breakpoint-entry');
          const bpCheckbox = await waitFor('input', bpEntry);
          await bpCheckbox.evaluate(n => (n as HTMLElement).click());
          await waitFor('.cm-breakpoint-disabled');
        });

        await step('Add another breakpoint', async () => {
          await addBreakpointForLine(frontend, 12);
        });

        await step('Check breakpoints', async () => {
          await validateBreakpoints();
        });

        await step('Close tab', async () => {
          await click('[aria-label="Close multi-workers.js"]');
        });
      });

      it('when opening different file in editor', async () => {
        // Open different worker
        await step('Open different worker', async () => {
          await openNestedWorkerFile(workerFileSelectors(3));
        });

        await step('Check breakpoints', async () => {
          await validateBreakpoints();
        });
      });

      it('after reloading', async () => {
        const {target} = getBrowserAndPages();

        await step('Reload page', async () => {
          await target.reload();
        });

        // FIXME(crbug/1112692): Refactor test to remove the timeout.
        await timeout(100);

        await step('Open different worker', async () => {
          await openNestedWorkerFile(workerFileSelectors(4));
        });

        await step('Check breakpoints', async () => {
          await waitFor('.cm-breakpoint');
          await validateBreakpoints();
        });
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

        // Validate that the code has paused on the breakpoint at the correct script location
        assert.deepEqual(await retrieveTopCallFrameWithoutResuming(), 'multi-workers.js:6');

        // Look at source tabs
        await validateSourceTabs();
      });

      it('for newly created workers', async () => {
        const {target} = getBrowserAndPages();
        // Launch new worker to hit breakpoint
        await target.evaluate(`new Worker('${scriptFile}').postMessage({});`);

        // Validate that we are paused by locating the resume button
        await waitFor(RESUME_BUTTON);

        // Validate that the code has paused on the breakpoint at the correct script location
        assert.deepEqual(await retrieveTopCallFrameWithoutResuming(), 'multi-workers.js:6');

        await validateSourceTabs();
      });
    });
  });
});
