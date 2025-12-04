// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as TimelineComponents from './components.js';

describeWithMockConnection('TimelineSummary', () => {
  async function setupWidget(): Promise<{
    widget: TimelineComponents.TimelineSummary.CategorySummary,
    view: ViewFunctionStub<typeof TimelineComponents.TimelineSummary.CategorySummary>,
  }> {
    const view = createViewFunctionStub(TimelineComponents.TimelineSummary.CategorySummary);
    const widget = new TimelineComponents.TimelineSummary.CategorySummary(view);
    await view.nextInput;
    return {widget, view};
  }

  it('correctly renders categories', async function() {
    const categories: TimelineComponents.TimelineSummary.CategoryData[] = [
      {title: 'System', value: 100, color: 'blue'},
      {title: 'Scripting', value: 5, color: 'red'},
      {title: 'Painting', value: 2, color: 'green'},
      {title: 'Loading', value: 1, color: 'white'},
      {title: 'Rendering', value: 0, color: 'black'},
    ];

    const {widget, view} = await setupWidget();
    widget.rangeStart = 0;
    widget.rangeEnd = 110;
    widget.total = 110;
    widget.categories = categories;
    await view.nextInput;

    assert.deepEqual(view.input.categories, categories);
    assert.deepEqual(view.input.total, 110);
    assert.deepEqual(view.input.rangeStart, 0);
    assert.deepEqual(view.input.rangeEnd, 110);
  });
  it('no categories should just render Total', async function() {
    const categories: TimelineComponents.TimelineSummary.CategoryData[] = [];

    const {widget, view} = await setupWidget();
    widget.rangeStart = 0;
    widget.rangeEnd = 110;
    widget.total = 110;
    widget.categories = categories;
    await view.nextInput;

    assert.deepEqual(view.input.categories, []);
    assert.deepEqual(view.input.total, 110);
    assert.deepEqual(view.input.rangeStart, 0);
    assert.deepEqual(view.input.rangeEnd, 110);
  });
});
