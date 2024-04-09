// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ApplicationComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderServiceWorkerRouterView():
    Promise<ApplicationComponents.ServiceWorkerRouterView.ServiceWorkerRouterView> {
  const component = new ApplicationComponents.ServiceWorkerRouterView.ServiceWorkerRouterView();
  renderElementIntoDOM(component);
  await coordinator.done();

  return component;
}

describeWithLocale('ServiceWorkerRouterView', () => {
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
    const component = await renderServiceWorkerRouterView();
    component.update([]);
    assert.isFalse(component.shadowRoot!.hasChildNodes());
  });

  it('shows the list of rules', async () => {
    const component = await renderServiceWorkerRouterView();
    component.update(routerRules);
    assert.isTrue(component.shadowRoot!.hasChildNodes());

    const rules = Array.from(component.shadowRoot!.querySelectorAll('.router-rule'));
    assert.strictEqual(rules.length, 2);

    rules.map((rule, idx) => {
      const condition = rule.querySelector('.condition');
      const source = rule.querySelector('.source');
      assert.strictEqual(condition?.querySelector('.rule-value')?.textContent, routerRules[idx].condition);
      assert.strictEqual(source?.querySelector('.rule-value')?.textContent, routerRules[idx].source);
    });
  });
});
