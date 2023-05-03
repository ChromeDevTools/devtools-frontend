// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */

import {assert} from 'chai';

import {
  loadComponentDocExample,
  preloadForCodeCoverage,
} from '../../../../../test/interactions/helpers/shared.js';
import {getBrowserAndPages} from '../../../../../test/shared/helper.js';
import {
  describe,
  it,
} from '../../../../../test/shared/mocha-extensions.js';
import {type Schema} from '../../../../../front_end/panels/recorder/models/models.js';
import {assertMatchesJSONSnapshot} from '../../../../../test/shared/snapshots.js';

import {type DevToolsRecorder} from '../../../../../front_end/panels/recorder/injected/injected.js';

describe('Injected', () => {
  preloadForCodeCoverage('recorder_injected/basic.html');

  beforeEach(async () => {
    await loadComponentDocExample('recorder_injected/basic.html');

    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      (window.DevToolsRecorder as DevToolsRecorder)
          .startRecording(
              {
                // We don't have the access to the actual bindings here. Therefore, the test assumes
                // that the markup is explicitly annotated with the following attributes.
                getAccessibleName: (element: Node) => {
                  if (!('getAttribute' in element)) {
                    return '';
                  }
                  return (element as Element).getAttribute('aria-name') || '';
                },
                getAccessibleRole: (element: Node) => {
                  if (!('getAttribute' in element)) {
                    return 'generic';
                  }
                  return (element as Element).getAttribute('aria-role') || '';
                },
              },
              {
                debug: false,
                allowUntrustedEvents: true,
                selectorTypesToRecord: [
                  'xpath',
                  'css',
                  'text',
                  'aria',
                  'pierce',
                ] as Schema.SelectorType[],
              },
          );
    });
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      window.DevToolsRecorder.stopRecording();
    });
  });

  it('should get selectors for an element', async () => {
    const {frontend} = getBrowserAndPages();
    const selectors = await frontend.evaluate(() => {
      const target = document.querySelector('#buttonNoARIA');
      if (!target) {
        throw new Error('#buttonNoARIA not found');
      }
      return window.DevToolsRecorder.recordingClientForTesting.getSelectors(
          target,
      );
    });
    assertMatchesJSONSnapshot(selectors);
  });

  it('should get selectors for elements with custom selector attributes', async () => {
    const {frontend} = getBrowserAndPages();
    const selectors = await frontend.evaluate(() => {
      const targets = [
        ...document.querySelectorAll('.custom-selector-attribute'),
        document.querySelector('#shadow-root-with-custom-selectors')?.shadowRoot?.querySelector('button') as
            HTMLButtonElement,
      ];
      return targets.map(
          window.DevToolsRecorder.recordingClientForTesting.getSelectors,
      );
    });
    assertMatchesJSONSnapshot(selectors);
  });

  it('should get selectors for shadow root elements', async () => {
    const {frontend} = getBrowserAndPages();
    const selectors = await frontend.evaluate(() => {
      const target = document.querySelector('main')
                         ?.querySelector('shadow-css-selector-element')
                         ?.shadowRoot?.querySelector('#insideShadowRoot');
      if (!target) {
        throw new Error('#insideShadowRoot is not found');
      }
      return window.DevToolsRecorder.recordingClientForTesting.getSelectors(
          target,
      );
    });
    assertMatchesJSONSnapshot(selectors);
  });

  it('should get an ARIA selector for shadow root elements', async () => {
    const {frontend} = getBrowserAndPages();
    const selectors = await frontend.evaluate(() => {
      const target = document.querySelector('[aria-role="main"]')
                         ?.querySelector('shadow-aria-selector-element')
                         ?.shadowRoot?.querySelector('button');
      if (!target) {
        throw new Error('button is not found');
      }
      return window.DevToolsRecorder.recordingClientForTesting.getSelectors(
          target,
      );
    });
    assertMatchesJSONSnapshot(selectors);
  });

  it('should not get an ARIA selector if the target element has no name or role', async () => {
    const {frontend} = getBrowserAndPages();
    const selectors = await frontend.evaluate(() => {
      const target = document.querySelector('#no-aria-name-or-role');
      if (!target) {
        throw new Error('button is not found');
      }
      return window.DevToolsRecorder.recordingClientForTesting.getSelectors(
          target,
      );
    });
    assertMatchesJSONSnapshot(selectors);
  });

  describe('CSS selectors', () => {
    it('should query CSS selectors', async () => {
      const {frontend} = getBrowserAndPages();
      const results = await frontend.evaluate(() => {
        return [
          window.DevToolsRecorder.recordingClientForTesting
              .queryCSSSelectorAllForTesting(
                  ['[data-qa=custom-id]', '[data-testid=shadow\\ button]'],
                  )
              .length,
          window.DevToolsRecorder.recordingClientForTesting
              .queryCSSSelectorAllForTesting(
                  ['[data-qa=custom-id]'],
                  )
              .length,
          window.DevToolsRecorder.recordingClientForTesting
              .queryCSSSelectorAllForTesting(
                  '[data-qa=custom-id]',
                  )
              .length,
          window.DevToolsRecorder.recordingClientForTesting
              .queryCSSSelectorAllForTesting(
                  '.doesnotexist',
                  )
              .length,
          window.DevToolsRecorder.recordingClientForTesting
              .queryCSSSelectorAllForTesting(
                  ['[data-qa=custom-id]', '.doesnotexist'],
                  )
              .length,
          window.DevToolsRecorder.recordingClientForTesting
              .queryCSSSelectorAllForTesting(
                  ['#notunique'],
                  )
              .length,
        ];
      });
      assert.deepStrictEqual(results, [1, 1, 1, 0, 0, 2]);
    });

    it('should return not-optimized CSS selectors for duplicate elements', async () => {
      const {frontend} = getBrowserAndPages();
      const selector = await frontend.evaluate(() => {
        const target = document.querySelector('#notunique');
        if (!target) {
          throw new Error('#notunique is not found');
        }
        return window.DevToolsRecorder.recordingClientForTesting.getCSSSelector(
            target,
        );
      });
      assertMatchesJSONSnapshot(selector);
    });
  });

  describe('Text selectors', () => {
    const getSelectorOfButtonWithLength = (length: number) => {
      const {frontend} = getBrowserAndPages();
      return frontend.evaluate(length => {
        const selector = `#buttonWithLength${length}`;
        const target = document.querySelector(selector);
        if (!target) {
          throw new Error(`${selector} could not be found.`);
        }
        if (target.innerHTML.length !== length) {
          throw new Error(`${selector} is not of length ${length}`);
        }
        return window.DevToolsRecorder.recordingClientForTesting.getTextSelector(
            target,
        );
      }, length);
    };
    const MINIMUM_LENGTH = 12;
    const MAXIMUM_LENGTH = 64;
    const SAME_PREFIX_TEXT_LENGTH = 32;

    it('should return a text selector for elements < minimum length', async () => {
      const selectors = await getSelectorOfButtonWithLength(MINIMUM_LENGTH - 1);
      assertMatchesJSONSnapshot(selectors);
    });
    it('should return a text selector for elements == minimum length', async () => {
      const selectors = await getSelectorOfButtonWithLength(MINIMUM_LENGTH);
      assertMatchesJSONSnapshot(selectors);
    });
    it('should return a text selector for elements == maximum length', async () => {
      const selectors = await getSelectorOfButtonWithLength(MAXIMUM_LENGTH);
      assertMatchesJSONSnapshot(selectors);
    });
    it('should not return a text selector for elements > maximum length', async () => {
      const selectors = await getSelectorOfButtonWithLength(MAXIMUM_LENGTH + 1);
      assert.deepStrictEqual(selectors, undefined);
    });
    it('should return a text selector correctly with same prefix elements', async () => {
      let selectors = await getSelectorOfButtonWithLength(
          SAME_PREFIX_TEXT_LENGTH,
      );
      assertMatchesJSONSnapshot(selectors, {name: 'Smaller'});
      selectors = await getSelectorOfButtonWithLength(
          SAME_PREFIX_TEXT_LENGTH + 1,
      );
      assertMatchesJSONSnapshot(selectors, {name: 'Larger'});
    });
    it('should trim text selectors', async () => {
      const {frontend} = getBrowserAndPages();
      const selectors = await frontend.evaluate(() => {
        const selector = '#buttonWithNewLines';
        const target = document.querySelector(selector);
        if (!target) {
          throw new Error(`${selector} could not be found.`);
        }
        return window.DevToolsRecorder.recordingClientForTesting.getTextSelector(
            target,
        );
      });
      assertMatchesJSONSnapshot(selectors);
    });
  });
});
