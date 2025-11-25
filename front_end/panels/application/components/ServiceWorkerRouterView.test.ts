// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';

import * as ApplicationComponents from './components.js';

async function renderServiceWorkerRouterView(rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[]):
    Promise<ApplicationComponents.ServiceWorkerRouterView.ServiceWorkerRouterView> {
  const component = new ApplicationComponents.ServiceWorkerRouterView.ServiceWorkerRouterView();
  renderElementIntoDOM(component);
  component.rules = rules;
  await component.updateComplete;

  return component;
}

describe('ServiceWorkerRouterView', () => {
  setupLocaleHooks();

  const routerRules = [
    {
      condition: JSON.stringify({urlPattern: '/foo/bar'}),
      source: ['network'].toString(),
      id: 1,
    },
    {
      condition: JSON.stringify({urlPattern: '/baz'}),
      source: ['fetch-event'].toString(),
      id: 2,
    },
  ];

  it('shows nothing with empty rules', async () => {
    const component = await renderServiceWorkerRouterView([]);
    assert.isFalse(component.contentElement.hasChildNodes());
  });

  it('shows the list of rules', async () => {
    const component = await renderServiceWorkerRouterView(routerRules);
    assert.isTrue(component.contentElement.hasChildNodes());

    const rules = Array.from(component.contentElement.querySelectorAll('.router-rule'));
    assert.lengthOf(rules, 2);

    rules.map((rule, idx) => {
      const condition = rule.querySelector('.condition');
      const source = rule.querySelector('.source');
      assert.strictEqual(condition?.querySelector('.rule-value')?.textContent, routerRules[idx].condition);
      assert.strictEqual(source?.querySelector('.rule-value')?.textContent, routerRules[idx].source);
    });
  });
});
