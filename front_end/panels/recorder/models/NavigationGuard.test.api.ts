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

  /** An origin that is in no recording of these tests. */
  function unrecorded(inspectedPage: InspectedPage, file: string): string {
    return `${inspectedPage.getResourcesPath('devtools.blocked.test')}/recorder/${file}`;
  }

  /** For each guard, a promise that resolves when the guard reports its first error. */
  const errorReported = new WeakMap<NavigationGuard, Promise<void>>();

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
    let reportError = (): void => {};
    const reported = new Promise<void>(resolve => {
      reportError = resolve;
    });
    const guard = new NavigationGuard(flow, inspectedPage.page.url(), () => reportError());
    errorReported.set(guard, reported);
    await guard.guardPage(inspectedPage.page as never, /* checkExistingFrames= */ false);
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

  async function waitForError(guard: NavigationGuard): Promise<Error> {
    await errorReported.get(guard);
    assert.isOk(guard.error, 'The guard did not report an error');
    return guard.error;
  }

  const subframeStep = {type: 'click', selectors: [['a']], offsetX: 1, offsetY: 1, frame: [0]};

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

  it('continues a redirect response and checks the response that commits', async ({inspectedPage}) => {
    const guard = await guardInspectedPage(inspectedPage);
    try {
      // The redirect and its destination are on the recorded origin.
      assert.isNull(await navigate(inspectedPage, recorded(inspectedPage, 'redirect.rawresponse')));
      assert.strictEqual(inspectedPage.page.url(), recorded(inspectedPage, 'recorder2.html'));
      assert.isUndefined(guard.error);

      // The guard continues the redirect response of the other origin. It
      // fails the response of the destination, which is on the same origin.
      assert.include(await navigate(inspectedPage, other(inspectedPage, 'redirect.rawresponse')),
                     'net::ERR_BLOCKED_BY_CLIENT');
      const error = await waitForError(guard);
      assert.include(error.message, `Navigation to ${other(inspectedPage, 'recorder2.html')} is not allowed`);
    } finally {
      await guard.dispose();
    }
  });

  it('continues a download from an origin that is not in the recording', async ({inspectedPage}) => {
    const guard = await guardInspectedPage(inspectedPage);
    try {
      // A download does not commit a document. Chrome aborts the navigation.
      assert.include(await navigate(inspectedPage, other(inspectedPage, 'download.txt')), 'net::ERR_ABORTED');
      assert.isUndefined(guard.error);
    } finally {
      await guard.dispose();
    }
  });

  it('continues a cross-origin iframe if the recording has no subframe step', async ({inspectedPage}) => {
    const guard = await guardInspectedPage(inspectedPage);
    try {
      assert.isNull(await navigate(inspectedPage, recorded(inspectedPage, 'oopif.html')));
      await inspectedPage.page.waitForFrame(other(inspectedPage, 'iframe1.html'));
      assert.isUndefined(guard.error);
    } finally {
      await guard.dispose();
    }
  });

  it('fails a cross-origin iframe if the recording has a subframe step', async ({inspectedPage}) => {
    const guard = await guardInspectedPage(inspectedPage, [subframeStep]);
    try {
      assert.isNull(await navigate(inspectedPage, recorded(inspectedPage, 'oopif.html')));
      const error = await waitForError(guard);
      assert.include(error.message, `Navigation to ${other(inspectedPage, 'iframe1.html')} is not allowed`);
    } finally {
      await guard.dispose();
    }
  });

  it('fails a navigation of an out-of-process iframe to an origin that is not in the recording',
     async ({inspectedPage}) => {
       const oopifUrl = other(inspectedPage, 'iframe1.html');
       const blockedUrl = unrecorded(inspectedPage, 'iframe2.html');
       const guard = await guardInspectedPage(inspectedPage, [{...subframeStep, frame: undefined, target: oopifUrl}]);
       try {
         assert.isNull(await navigate(inspectedPage, recorded(inspectedPage, 'oopif.html')));
         const frame = await inspectedPage.page.waitForFrame(oopifUrl);
         assert.isUndefined(guard.error);
         await frame.evaluate((url: string) => {
           window.location.href = url;
         }, blockedUrl);
         const error = await waitForError(guard);
         assert.include(error.message, `Navigation to ${blockedUrl} is not allowed`);
         assert.isUndefined(
             inspectedPage.page.frames().find((frame: {url: () => string}) => frame.url() === blockedUrl));
       } finally {
         await guard.dispose();
       }
     });

  /** Reads the error after an assertion that narrowed the type of `guard.error`. */
  function errorMessage(guard: NavigationGuard): string|undefined {
    return guard.error?.message;
  }

  /** Opens `url` in a new page with a click, and returns the new page. */
  async function openPopup(inspectedPage: InspectedPage, url: string) {
    await inspectedPage.page.evaluate((url: string) => {
      const link = document.createElement('a');
      link.id = 'open-popup';
      link.target = '_blank';
      link.href = url;
      link.textContent = 'open';
      document.body.append(link);
    }, url);
    await inspectedPage.page.click('#open-popup');
    const target =
        await inspectedPage.page.browser().waitForTarget((target: {url: () => string}) => target.url() === url);
    const popup = await target.page();
    assert.isOk(popup, 'The popup did not open');
    return popup;
  }

  it('fails a navigation of a popup that a step targets to an origin that is not in the recording',
     async ({inspectedPage}) => {
       const popupUrl = recorded(inspectedPage, 'recorder2.html');
       const blockedUrl = other(inspectedPage, 'recorder.html');
       const guard = await guardInspectedPage(
           inspectedPage, [{type: 'click', selectors: [['a']], offsetX: 1, offsetY: 1, target: popupUrl}]);
       try {
         assert.isNull(await navigate(inspectedPage, recorded(inspectedPage, 'recorder.html')));
         const popup = await openPopup(inspectedPage, popupUrl);

         await guard.guardStepTarget(inspectedPage.page.browser() as never, popupUrl, 5000);
         assert.isUndefined(guard.error);
         const navigationError = await popup.goto(blockedUrl).then(() => null, (err: Error) => err.message);

         assert.include(navigationError, 'net::ERR_BLOCKED_BY_CLIENT');
         const error = await waitForError(guard);
         assert.include(error.message, `Navigation to ${blockedUrl} is not allowed`);
       } finally {
         await guard.dispose();
       }
     });

  it('reports a popup from an origin that is not in the recording, if a step targets a frame of the popup',
     async ({inspectedPage}) => {
       // The recording has only the origin of the frame, not the origin of the popup.
       const frameUrl = other(inspectedPage, 'iframe1.html');
       const popupUrl = recorded(inspectedPage, 'oopif.html');
       const flow = {
         title: 'test',
         steps: [
           {type: 'navigate', url: other(inspectedPage, 'recorder.html')},
           {type: 'click', selectors: [['a']], offsetX: 1, offsetY: 1, target: frameUrl},
         ],
       } as UserFlow;
       const guard = new NavigationGuard(flow, inspectedPage.page.url(), () => {});
       try {
         await guard.guardPage(inspectedPage.page as never, /* checkExistingFrames= */ false);
         assert.isNull(await navigate(inspectedPage, other(inspectedPage, 'recorder.html')));
         const popup = await openPopup(inspectedPage, popupUrl);
         await popup.waitForFrame(frameUrl);
         assert.isUndefined(guard.error);

         await guard.guardStepTarget(inspectedPage.page.browser() as never, frameUrl, 5000);

         assert.include(errorMessage(guard), `Navigation to ${popupUrl} is not allowed`);
       } finally {
         await guard.dispose();
       }
     });

  it('reports the inspected page from an origin that is not in the recording, if a step targets a frame of the page before a navigate step',
     async ({inspectedPage}) => {
       // The recording has only the origin of the frame, not the origin of the page.
       const frameUrl = other(inspectedPage, 'iframe1.html');
       const pageUrl = recorded(inspectedPage, 'oopif.html');
       assert.isNull(await navigate(inspectedPage, pageUrl));
       await inspectedPage.page.waitForFrame(frameUrl);
       const flow = {
         title: 'test',
         steps: [
           {type: 'click', selectors: [['a']], offsetX: 1, offsetY: 1, target: frameUrl},
           {type: 'navigate', url: other(inspectedPage, 'recorder.html')},
         ],
       } as UserFlow;
       const guard = new NavigationGuard(flow, inspectedPage.page.url(), () => {});
       try {
         await guard.guardPage(inspectedPage.page as never, /* checkExistingFrames= */ false);
         // The guard reports the page at the start of the replay and does not change it.
         assert.include(errorMessage(guard), `Navigation to ${pageUrl} is not allowed`);
         assert.strictEqual(inspectedPage.page.url(), pageUrl);

         await guard.guardStepTarget(inspectedPage.page.browser() as never, frameUrl, 5000);

         assert.strictEqual(inspectedPage.page.url(), pageUrl);
       } finally {
         await guard.dispose();
       }
     });

  it('removes a page from before the replay from the session history', async ({inspectedPage}) => {
    // Chrome does not pause a response for a back/forward cache restore, so
    // the guard cannot fail it. The guard removes the pages that `history.back()`
    // could restore. The page from before the replay is on an origin that is
    // not in the recording.
    await inspectedPage.page.goto(other(inspectedPage, 'recorder2.html'));
    await inspectedPage.page.goto(other(inspectedPage, 'recorder.html'));
    const guard = await guardInspectedPage(inspectedPage);
    try {
      assert.strictEqual(inspectedPage.page.url(), 'about:blank');
      assert.isNull(await navigate(inspectedPage, recorded(inspectedPage, 'recorder.html')));

      await inspectedPage.page.goBack();
      assert.strictEqual(inspectedPage.page.url(), 'about:blank');
      // The history has no entry before about:blank.
      await inspectedPage.page.goBack().catch(() => {});
      assert.strictEqual(inspectedPage.page.url(), 'about:blank');
      assert.isUndefined(guard.error);
    } finally {
      await guard.dispose();
    }
  });

  it('keeps the current document if its origin is in the recording', async ({inspectedPage}) => {
    await inspectedPage.page.goto(other(inspectedPage, 'recorder.html'));
    await inspectedPage.page.goto(recorded(inspectedPage, 'recorder2.html'));
    const guard = await guardInspectedPage(inspectedPage);
    try {
      assert.strictEqual(inspectedPage.page.url(), recorded(inspectedPage, 'recorder2.html'));

      // The history has no entry before the current document.
      await inspectedPage.page.goBack().catch(() => {});
      assert.strictEqual(inspectedPage.page.url(), recorded(inspectedPage, 'recorder2.html'));
      assert.isUndefined(guard.error);
    } finally {
      await guard.dispose();
    }
  });

  it('keeps the session history if all entries have an origin from the recording', async ({inspectedPage}) => {
    await inspectedPage.page.goto(recorded(inspectedPage, 'recorder.html'));
    // Remove the entries from before the test, for example about:blank.
    const session = await inspectedPage.page.createCDPSession();
    await session.send('Page.resetNavigationHistory');
    await inspectedPage.page.goto(recorded(inspectedPage, 'recorder2.html'));
    const guard = await guardInspectedPage(inspectedPage);
    try {
      await inspectedPage.page.goBack();

      assert.strictEqual(inspectedPage.page.url(), recorded(inspectedPage, 'recorder.html'));
      assert.isUndefined(guard.error);
    } finally {
      await guard.dispose();
    }
  });

  it('keeps the current document if the recording has no navigate step', async ({inspectedPage}) => {
    const url = other(inspectedPage, 'recorder.html');
    await inspectedPage.page.goto(url);
    const flow = {title: 'test', steps: [{type: 'setViewport', width: 800, height: 600}]} as UserFlow;
    const guard = new NavigationGuard(flow, inspectedPage.page.url(), () => {});
    try {
      await guard.guardPage(inspectedPage.page as never, /* checkExistingFrames= */ false);

      assert.strictEqual(inspectedPage.page.url(), url);
      assert.isUndefined(guard.error);
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
