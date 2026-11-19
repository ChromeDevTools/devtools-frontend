// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, type InspectedPage, it} from '../../../../test/api/mocha-interface.js';

// The API tests run in Node.js. The `models.js` entrypoint imports modules
// that need the DOM, thus the test imports the file directly.
// eslint-disable-next-line @devtools/es-modules-import
import {NavigationGuard} from './NavigationGuard.js';

type UserFlow = ConstructorParameters<typeof NavigationGuard>[0];

describe('NavigationGuard API Test', () => {
  /** The origin of the recording. */
  function recorded(inspectedPage: InspectedPage, file: string): string {
    return `${inspectedPage.getResourcesPath()}/recorder/${file}`;
  }

  /** An origin that is in the recording only if a step has it as a target. */
  function other(inspectedPage: InspectedPage, file: string): string {
    return `${inspectedPage.getResourcesPath('devtools.oopif.test')}/recorder/${file}`;
  }

  /**
   * Enables a guard on the inspected page for a recording that navigates to
   * the recorded origin and then runs `extraSteps`.
   */
  async function guardInspectedPage(inspectedPage: InspectedPage,
                                    extraSteps: unknown[] = []): Promise<NavigationGuard> {
    const flow = {
      title: 'test',
      steps: [{type: 'navigate', url: recorded(inspectedPage, 'recorder.html')}, ...extraSteps],
    } as UserFlow;
    const guard = new NavigationGuard(flow, inspectedPage.page.url(), () => {});
    await guard.guardPage(inspectedPage.page as never);
    return guard;
  }

  /** Navigates the inspected page and returns the error message, if the navigation fails. */
  async function navigate(inspectedPage: InspectedPage, url: string): Promise<string|null> {
    try {
      await inspectedPage.page.goto(url);
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  }

  it('continues a main frame navigation to an origin from the recording', async ({inspectedPage}) => {
    const guard = await guardInspectedPage(inspectedPage);
    try {
      assert.isNull(await navigate(inspectedPage, recorded(inspectedPage, 'recorder2.html')));
      assert.strictEqual(inspectedPage.page.url(), recorded(inspectedPage, 'recorder2.html'));
      assert.isUndefined(guard.error);
    } finally {
      await guard.dispose();
    }
  });

  it('fails a main frame navigation to an origin that is not in the recording', async ({inspectedPage}) => {
    const guard = await guardInspectedPage(inspectedPage);
    try {
      const url = other(inspectedPage, 'recorder2.html');
      assert.include(await navigate(inspectedPage, url), 'net::ERR_BLOCKED_BY_CLIENT');
      assert.strictEqual(guard.error?.message,
                         `Navigation to ${url} is not allowed, because the recording does not contain its origin`);
      assert.notStrictEqual(inspectedPage.page.url(), url);
    } finally {
      await guard.dispose();
    }
  });

  it('does not fail navigations after dispose()', async ({inspectedPage}) => {
    const guard = await guardInspectedPage(inspectedPage);
    await guard.dispose();

    assert.isNull(await navigate(inspectedPage, other(inspectedPage, 'recorder2.html')));
    assert.isUndefined(guard.error);
  });
});
