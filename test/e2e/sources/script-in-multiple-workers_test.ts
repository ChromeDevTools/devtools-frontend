// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  click,
  enableExperiment,
  getBrowserAndPages,
  getPendingEvents,
  goToResource,
  installEventListener,
  step,
  timeout,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

import {
  addBreakpointForLine,
  BREAKPOINT_ITEM_SELECTOR,
  createSelectorsForWorkerFile,
  DEBUGGER_PAUSED_EVENT,
  executionLineHighlighted,
  getBreakpointDecorators,
  getOpenSources,
  openNestedWorkerFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
  SourceFileEvents,
  THREADS_SELECTOR,
  waitForLines,
  waitForSourceFiles,
} from '../helpers/sources-helpers.js';

async function validateSourceTabs() {
  await step('Validate exactly one source file is open', async () => {
    const openSources = await waitForFunction(async () => {
      const sources = await getOpenSources();
      return sources.length ? sources : undefined;
    });
    assert.deepEqual(openSources, ['multi-workers.js']);
  });
}

describe('Multi-Workers', function() {
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
      await waitForLines(12);
      // Wait for breakpoints to be present
      await waitFor('.cm-gutterElement ~ .cm-breakpoint ~ .cm-breakpoint');
      assert.deepEqual(await getBreakpointDecorators(), [6, 12]);
      assert.deepEqual(await getBreakpointDecorators(true), [6]);
    }

    describe(`loads scripts exactly once ${withOrWithout}`, () => {
      it('but still distinguishes between the workers', async () => {
        // Have the target load the page.
        await goToResource(targetPage);

        await step('Open sources panel', async () => {
          await click('#tab-sources');
        });

        await validateNavigationTree();

        const {target, frontend} = getBrowserAndPages();
        installEventListener(frontend, DEBUGGER_PAUSED_EVENT);

        await step('Send message to a worker to trigger break', async () => {
          await target.evaluate('workers[3].postMessage({command:"break"});');
        });

        await step('Validate that we are fully paused', async () => {
          await waitFor(RESUME_BUTTON);
          await waitFor(PAUSE_INDICATOR_SELECTOR);
          await waitForFunction(async () => await getPendingEvents(frontend, DEBUGGER_PAUSED_EVENT));
          await executionLineHighlighted();
        });

        // Look at source tabs
        await validateSourceTabs();

        const selectedFile = workerFileSelectors(1).fileSelector + '[aria-selected="true"]';
        const expandedWorker = workerFileSelectors(1).rootSelector + '[aria-expanded="true"]';

        await step('Wait for first worker to be expanded', async () => {
          await waitFor(selectedFile);
          const workers = await $$(expandedWorker);
          assert.strictEqual(workers.length, 1);
        });

        await step('Break in and switch to a different worker', async () => {
          // Send message to a worker to a different worker to cause a different file to be
          // selected in the page tree
          await target.evaluate('workers[5].postMessage({command:"break"});');

          // This typically happens too quickly to cause DevTools to switch to the other thread, so
          // click on the other paused thread.
          await Promise.all([
            click(THREADS_SELECTOR),
            waitFor(THREADS_SELECTOR + '[aria-expanded="true"]'),
          ]);
          await click('.thread-item:has( .thread-item-paused-state:not(:empty)):not(.selected)');
        });

        // Now two workers are expanded
        await waitFor(expandedWorker + ' ~ ' + expandedWorker);
        // And still only one source tab
        await validateSourceTabs();
      });
    });

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
      await waitForSourceFiles(
          SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith('multi-workers.js')), async () => {
            // Have the target load the page.
            await goToResource(targetPage);

            await click('#tab-sources');
            // Wait for all workers to load
            await validateNavigationTree();
            // Open file from second worker
            await openNestedWorkerFile(workerFileSelectors(2));
          });
      // Set a breakpoint
      await addBreakpointForLine(frontend, 6);

      await waitFor(BREAKPOINT_ITEM_SELECTOR);
      const breakpoints = (await $$(BREAKPOINT_ITEM_SELECTOR)).length;
      assert.strictEqual(breakpoints, 1);
    });

    // Regularly failing on Windows CQ
    describe.skip(
        `[crbug.com/1425122] copies breakpoints between workers ${withOrWithout}`, () => {
          beforeEach(async () => {
            const {frontend} = getBrowserAndPages();
            await waitForSourceFiles(
                SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith('multi-workers.js')),
                async () => {
                  // Have the target load the page.
                  await goToResource(targetPage);

                  await click('#tab-sources');
                  // Wait for all workers to load
                  await validateNavigationTree();

                  await step('Open file from second worker', async () => {
                    await openNestedWorkerFile(workerFileSelectors(2));
                  });
                });

            await step('Set two breakpoints', async () => {
              await addBreakpointForLine(frontend, 6);
            });

            await step('Disable first breakpoint', async () => {
              const bpEntry = await waitFor(BREAKPOINT_ITEM_SELECTOR);
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

    // Flaky tests in beforeEach.
    describe.skip(`[crbug.com/1425122] hits breakpoints added to workers ${withOrWithout}`, () => {
      beforeEach(async () => {
        await enableExperiment('instrumentation-breakpoints');
        const {frontend} = getBrowserAndPages();
        await waitForSourceFiles(
            SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith('multi-workers.js')), async () => {
              // Have the target load the page.
              await goToResource(targetPage);

              await step('Open sources panel', async () => {
                await click('#tab-sources');
              });

              await validateNavigationTree();

              await step('Open second worker file', async () => {
                await openNestedWorkerFile(workerFileSelectors(2));
              });
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
