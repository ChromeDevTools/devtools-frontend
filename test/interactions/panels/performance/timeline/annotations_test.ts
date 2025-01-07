// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {click, waitFor} from '../../../../shared/helper.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('Performance panel annotations', () => {
  it('allows the user to click on an entry label to select the event', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev-modifications');
    await waitFor('.timeline-flamechart');
    await waitFor<HTMLElement>('.overlay-item.overlay-type-ENTRY_LABEL');
    await click('.overlay-type-ENTRY_LABEL', {clickOptions: {offset: {x: 10, y: 10}}});

    // Ensure that the right event hsa been selected by inspecting the details.
    const details = await waitFor('.timeline-details-view-body');
    const titleElem = await waitFor<HTMLElement>('.timeline-details-chip-title', details);
    const title = await titleElem.evaluate(e => e.innerText);
    assert.strictEqual(title, 'initializeApp');
  });
});
