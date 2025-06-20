// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getCleanTextContentFromSingleElement,
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';

import * as Insights from './insights.js';

describeWithEnvironment('CLSCulprits component', () => {
  it('renders unsized image culprits', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'unsized-images.json.gz');
    const firstNavInsights = traceData.insights?.values().next()?.value;
    assert.isOk(firstNavInsights);
    const clsModel = firstNavInsights.model.CLSCulprits;
    const component = new Insights.CLSCulprits.CLSCulprits();
    component.model = clsModel;
    component.insightSetKey = firstNavInsights.id;
    component.bounds = traceData.parsedTrace.Meta.traceBounds;
    component.selected = true;

    renderElementIntoDOM(component);
    await RenderCoordinator.done();
    assert.isOk(component.shadowRoot);

    const titleText = getCleanTextContentFromSingleElement(component.shadowRoot, '.insight-title');
    assert.strictEqual(titleText, 'Layout shift culprits');

    const worstClusterText = getCleanTextContentFromSingleElement(component.shadowRoot, '.worst-cluster');
    assert.strictEqual(worstClusterText, 'Worst cluster: Layout shift cluster @ 1.37 s');

    const culpritsList = component.shadowRoot.querySelector<HTMLElement>('.worst-culprits');
    assert.isOk(culpritsList);
    assert.strictEqual(
        culpritsList.deepInnerText(),
        'Unsized image element\ncuzillion.…wfQ%3D%3D\n' +
            'Unsized image element\ncuzillion.…wfQ%3D%3D');
  });
});
