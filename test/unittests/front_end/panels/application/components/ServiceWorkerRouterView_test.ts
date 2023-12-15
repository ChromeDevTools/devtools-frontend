// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertShadowRoot,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

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
    assertShadowRoot(component.shadowRoot);
    component.update([]);
    assert.isFalse(component.shadowRoot.hasChildNodes());
  });

  it('shows the list of rules', async () => {
    const component = await renderServiceWorkerRouterView();
    assertShadowRoot(component.shadowRoot);
    await component.update(routerRules);
    assert.isTrue(component.shadowRoot.hasChildNodes());

    const rules = Array.from(component.shadowRoot.querySelectorAll('.router-rule'));
    assert.strictEqual(rules.length, 2);

    rules.map((rule, idx) => {
      const condition = rule.querySelector('.condition');
      const source = rule.querySelector('.source');
      assert.strictEqual(condition?.querySelector('.rule-value')?.textContent, routerRules[idx].condition);
      assert.strictEqual(source?.querySelector('.rule-value')?.textContent, routerRules[idx].source);
    });
  });
});
