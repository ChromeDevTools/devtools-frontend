// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithMockConnection} from '../../../testing/MockConnection.js';

import * as TimelineComponents from './components.js';

describeWithMockConnection('TimelineSummary', () => {
  it('correctly renders categories', async function() {
    const categories: TimelineComponents.TimelineSummary.CategoryData[] = [
      {title: 'System', value: 100, color: 'blue'},
      {title: 'Scripting', value: 5, color: 'red'},
      {title: 'Painting', value: 2, color: 'green'},
      {title: 'Loading', value: 1, color: 'white'},
      {title: 'Rendering', value: 0, color: 'black'},
    ];

    const summary = new TimelineComponents.TimelineSummary.CategorySummary();
    summary.data = {
      rangeStart: 0,
      rangeEnd: 110,
      total: 110,
      categories,
      selectedEvents: [],
    };

    categories.push({title: 'Total', value: 110, color: 'yellow'});

    assert.isNotNull(summary.shadowRoot);
    const range = summary.shadowRoot.querySelector('.summary-range');
    assert.include(range?.textContent, 'Range: ');

    const categorySummaries = summary.shadowRoot.querySelector('.category-summary');
    const rows = categorySummaries?.querySelectorAll('.category-row') || [];
    for (let i = 0; i < rows.length; i++) {
      const swatch = rows[i].querySelector('.category-swatch');
      assert.isNotNull(swatch);
      const name = rows[i].querySelector('.category-name');
      assert.include(name?.textContent, categories[i]?.title);
      const value = rows[i].querySelector('.category-value');
      assert.include(value?.textContent, categories[i]?.value.toString());
    }
  });
  it('no categories should just render Total', async function() {
    const categories: TimelineComponents.TimelineSummary.CategoryData[] = [];

    const summary = new TimelineComponents.TimelineSummary.CategorySummary();
    summary.data = {
      rangeStart: 0,
      rangeEnd: 110,
      total: 110,
      categories,
      selectedEvents: [],
    };

    categories.push({title: 'Total', value: 110, color: 'grey'});

    assert.isNotNull(summary.shadowRoot);
    const range = summary.shadowRoot.querySelector('.summary-range');
    assert.include(range?.textContent, 'Range: ');

    const categorySummaries = summary.shadowRoot.querySelector('.category-summary');
    // Should just have the "Total" row.
    const rows = categorySummaries?.querySelectorAll('.category-row') || [];
    assert.lengthOf(rows, 1);

    const swatch = rows[0].querySelector('.category-swatch');
    assert.isNotNull(swatch);

    const name = rows[0].querySelector('.category-name');
    assert.include(name?.textContent, 'Total');

    const value = rows[0].querySelector('.category-value');
    assert.include(value?.textContent, (110).toString());
  });
});
