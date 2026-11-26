// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';

import {ScreenshotError} from '../conductor/screenshot-error.js';
import {TestConfig} from '../conductor/test_config.js';

import {ResultsDbCollector} from './resultsdb-collector.js';

const {
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_RETRY,
  EVENT_TEST_PENDING,
} = Mocha.Runner.constants;

interface TestRetry {
  currentRetry(): number;
}

interface HookWithParent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent: Record<string, any>;
}

export class ResultsDbReporter extends Mocha.reporters.Base {
  readonly #collector: ResultsDbCollector;

  localResultsPath(): string|undefined {
    return this.#collector.localResultsPath();
  }

  constructor(runner: Mocha.Runner, options?: Mocha.MochaOptions) {
    super(runner, options);
    const suitePrefix = (options as {suiteName?: string} | undefined)?.suiteName;
    this.#collector = new ResultsDbCollector({suitePrefix});

    if (TestConfig.dryRun) {
      // A dry run only lists the matching tests. It does not use expectations or ResultDB.
      runner.on(EVENT_TEST_PASS, (test: Mocha.Test) => {
        this.#collector.recordPass({
          file: test.file!,
          titlePath: test.titlePath(),
          durationMs: test.duration ?? 0,
          runAttempt: 1,
        });
      });
      return;
    }

    runner.on(EVENT_TEST_PASS, this.onTestPass.bind(this));
    runner.on(EVENT_TEST_FAIL, this.onTestFail.bind(this));
    runner.on(EVENT_TEST_RETRY, this.onTestFail.bind(this));
    runner.on(EVENT_TEST_PENDING, this.onTestSkip.bind(this));

    runner.once(EVENT_RUN_END, this.epilogue.bind(this));
  }

  private onTestPass(test: Mocha.Test): void {
    const testRetry = (test as unknown) as TestRetry;
    // @ts-expect-error state exists on non-hosted conductor tests.
    const devToolsPage = test.parent?.state?.devToolsPage;
    const artifacts = devToolsPage ? ScreenshotError.saveArtifacts(devToolsPage.screenshotLog) : undefined;
    this.#collector.recordPass({
      file: test.file!,
      titlePath: test.titlePath(),
      durationMs: test.duration ?? 0,
      runAttempt: testRetry.currentRetry() + 1,
      artifacts,
    });
  }

  private onTestFail(test: Mocha.Test|Mocha.Hook, error: Error|ScreenshotError|unknown): void {
    let targetTest: Mocha.Test;
    const isHook = test.type === 'hook';
    if (isHook) {
      if (!test.ctx?.currentTest) {
        throw new Error(`Hook ${test.id} is missing currentTest`);
      }
      targetTest = test.ctx.currentTest;
    } else {
      targetTest = test as Mocha.Test;
    }

    const testRetry = (targetTest as unknown) as TestRetry;
    this.#collector.recordFail({
      file: targetTest.file!,
      titlePath: targetTest.titlePath(),
      durationMs: targetTest.duration ?? 0,
      error,
      hookName: this.maybeHook(test),
      hookTitle: isHook ? test.title : undefined,
      runAttempt: testRetry.currentRetry() + 1,
    });
  }

  private maybeHook(test: Mocha.Test|Mocha.Hook): string|undefined {
    if (!(test instanceof Mocha.Hook)) {
      return undefined;
    }
    const hook = (test as unknown) as HookWithParent;
    const suite = hook.parent;
    const hookNames = ['afterAll', 'afterEach', 'beforeAll', 'beforeEach'];
    return hookNames.find(hookName => suite[`_${hookName}`]?.includes(test));
  }

  private onTestSkip(test: Mocha.Test): void {
    const testRetry = (test as unknown) as TestRetry;
    this.#collector.recordSkip({
      file: test.file!,
      titlePath: test.titlePath(),
      runAttempt: testRetry.currentRetry() + 1,
    });
  }

  override epilogue(): void {
    super.epilogue();
    this.#collector.finalize(this.failures.length);
  }
}
