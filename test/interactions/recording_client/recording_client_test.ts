// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../shared/helper.js';
import {it} from '../../shared/mocha-extensions.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../helpers/shared.js';

describe('RecordingClient', () => {
  preloadForCodeCoverage('recording_client/basic.html');

  beforeEach(async () => {
    await loadComponentDocExample('recording_client/basic.html');
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      const exports = {};
      // @ts-ignore
      window.RecordingClient.setupRecordingClient(
          {
            // We don't have the access to the actual bindings here. Therefore, the test assumes
            // that the markup is explicitly annotated with the following attributes.
            getAccessibleName: (element: Element) => {
              if (!('getAttribute' in element)) {
                return '';
              }
              return element.getAttribute('aria-name');
            },
            getAccessibleRole: (element: Element) => {
              if (!('getAttribute' in element)) {
                return 'generic';
              }
              return element.getAttribute('aria-role');
            },
          },
          false,
          true,
          exports,
      );
      // @ts-ignore
      window.teardown = exports.teardown;
      // @ts-ignore
      window.createStepFromEvent = exports.createStepFromEvent;
      // @ts-ignore
      window.getSelector = exports.getSelector;
    });
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      // @ts-ignore
      window.teardown();
    });
  });

  it('should create click steps from events', async () => {
    const {frontend} = getBrowserAndPages();
    const step = await frontend.evaluate(() => {
      const event = new Event('click');
      const target = document.querySelector('#button');
      // @ts-ignore
      return window.createStepFromEvent(event, target, true);
    });
    assert.deepStrictEqual(step, {
      type: 'click',
      selector: 'aria/testButton',
    });
  });

  it('should create keydown steps from events', async () => {
    const {frontend} = getBrowserAndPages();
    const step = await frontend.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
      });
      const target = document.querySelector('#input');
      // @ts-ignore
      return window.createStepFromEvent(event, target, true);
    });
    assert.deepStrictEqual(step, {
      type: 'keydown',
      altKey: false,
      metaKey: false,
      shiftKey: false,
      ctrlKey: false,
      key: 'Escape',
    });
  });

  it('should create keyup steps from events', async () => {
    const {frontend} = getBrowserAndPages();
    const step = await frontend.evaluate(() => {
      const event = new KeyboardEvent('keyup', {
        key: 'Escape',
      });
      const target = document.querySelector('#input');
      // @ts-ignore
      return window.createStepFromEvent(event, target, true);
    });
    assert.deepStrictEqual(step, {
      type: 'keyup',
      altKey: false,
      metaKey: false,
      shiftKey: false,
      ctrlKey: false,
      key: 'Escape',
    });
  });

  it('should get a CSS selector for elements', async () => {
    const {frontend} = getBrowserAndPages();
    const step = await frontend.evaluate(() => {
      const target = document.querySelector('#buttonNoARIA');
      // @ts-ignore
      return window.getSelector(target);
    });
    assert.deepStrictEqual(step, '#buttonNoARIA');
  });

  it('should get a CSS selector for shadow root elements', async () => {
    const {frontend} = getBrowserAndPages();
    const step = await frontend.evaluate(() => {
      const target = document.querySelector('main')
                         ?.querySelector('shadow-css-selector-element')
                         ?.shadowRoot?.querySelector('#insideShadowRoot');
      // @ts-ignore
      return window.getSelector(target);
    });
    assert.deepStrictEqual(step, ['body > main > shadow-css-selector-element', '#insideShadowRoot']);
  });

  it('should get an ARIA selector for shadow root elements', async () => {
    const {frontend} = getBrowserAndPages();
    const step = await frontend.evaluate(() => {
      const target = document.querySelector('[aria-role="main"]')
                         ?.querySelector('shadow-aria-selector-element')
                         ?.shadowRoot?.querySelector('button');
      // @ts-ignore
      return window.getSelector(target);
    });
    assert.deepStrictEqual(step, ['aria/[role=\"main\"]', 'aria/login']);
  });
});
