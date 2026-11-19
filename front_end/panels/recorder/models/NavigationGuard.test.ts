// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as Models from './models.js';

describe('NavigationGuard', () => {
  it('collects all URLs in the recording and excludes the current URL when a navigate step runs first', () => {
    const allowed = Models.NavigationGuard.collectAllowedNavigations({
      title: 'test',
      steps: [
        {
          type: Models.Schema.StepType.SetViewport,
          width: 800,
          height: 600,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: false,
        },
        {
          type: Models.Schema.StepType.Navigate,
          url: 'https://navigate.test/path',
          assertedEvents: [
            {type: Models.Schema.AssertedEventType.Navigation, url: 'https://asserted.test/final', title: ''},
          ],
        },
        {type: Models.Schema.StepType.Click, selectors: [['a']], offsetX: 1, offsetY: 1, target: 'main'},
        {
          type: Models.Schema.StepType.Click,
          selectors: [['a']],
          offsetX: 1,
          offsetY: 1,
          target: 'https://popup.test:8080/popup.html',
        },
        {type: Models.Schema.StepType.Navigate, url: 'data:text/plain,hello'},
        {type: Models.Schema.StepType.Navigate, url: 'https://<url>/not-a-url'},
      ],
    },
                                                                     'http://current.test/index.html');

    assert.deepEqual([...allowed.origins].sort(), [
      'https://asserted.test',
      'https://navigate.test',
      'https://popup.test:8080',
    ]);
    assert.deepEqual([...allowed.urls], ['data:text/plain,hello']);
  });

  it('includes the current URL when an interactive step runs before the first navigate step', () => {
    const allowed = Models.NavigationGuard.collectAllowedNavigations({
      title: 'test',
      steps: [
        {type: Models.Schema.StepType.Click, selectors: [['a']], offsetX: 1, offsetY: 1},
        {type: Models.Schema.StepType.Navigate, url: 'https://navigate.test/path'},
      ],
    },
                                                                     'http://current.test/index.html');

    assert.deepEqual([...allowed.origins].sort(), ['http://current.test', 'https://navigate.test']);
  });

  it('excludes the current URL when only a step with a different target runs before the first navigate step', () => {
    const allowed = Models.NavigationGuard.collectAllowedNavigations({
      title: 'test',
      steps: [
        {
          type: Models.Schema.StepType.Click,
          selectors: [['a']],
          offsetX: 1,
          offsetY: 1,
          target: 'https://popup.test/popup.html',
        },
        {type: Models.Schema.StepType.Navigate, url: 'https://navigate.test/path'},
      ],
    },
                                                                     'http://current.test/index.html');

    assert.deepEqual([...allowed.origins].sort(), ['https://navigate.test', 'https://popup.test']);
  });

  it('includes the current URL when the recording has no main-page navigate step', () => {
    const allowed = Models.NavigationGuard.collectAllowedNavigations({
      title: 'test',
      steps: [
        {
          type: Models.Schema.StepType.SetViewport,
          width: 800,
          height: 600,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: false,
        },
        {
          type: Models.Schema.StepType.EmulateNetworkConditions,
          download: 1000,
          upload: 1000,
          latency: 10,
        },
      ],
    },
                                                                     'http://current.test/index.html');

    assert.deepEqual([...allowed.origins], ['http://current.test']);
  });

  it('includes the current URL on devtools: targets where navigate steps are skipped', () => {
    const allowed = Models.NavigationGuard.collectAllowedNavigations({
      title: 'test',
      steps: [
        {type: Models.Schema.StepType.Navigate, url: 'https://navigate.test/path'},
      ],
    },
                                                                     'devtools://devtools/bundled/inspector.html');

    assert.deepEqual([...allowed.origins].sort(), ['devtools://devtools', 'https://navigate.test']);
  });

  it('compares the origin, and the complete URL for opaque origins', () => {
    const allowed = {origins: new Set(['https://a.test']), urls: new Set(['data:text/plain,hello'])};

    assert.isTrue(Models.NavigationGuard.isNavigationAllowed('https://a.test/other?query', allowed));
    assert.isTrue(Models.NavigationGuard.isNavigationAllowed('data:text/plain,hello', allowed));
    assert.isFalse(Models.NavigationGuard.isNavigationAllowed('http://a.test/', allowed));
    assert.isFalse(Models.NavigationGuard.isNavigationAllowed('https://sub.a.test/', allowed));
    assert.isFalse(Models.NavigationGuard.isNavigationAllowed('https://a.test:8443/', allowed));
    assert.isFalse(Models.NavigationGuard.isNavigationAllowed('data:text/plain,other', allowed));
    assert.isFalse(Models.NavigationGuard.isNavigationAllowed('not a url', allowed));
  });
});
