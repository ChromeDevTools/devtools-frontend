// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ExpandableList from '../../../../../front_end/ui/components/expandable_list/expandable_list.js';
import * as LitHtml from '../../../../../front_end/ui/lit-html/lit-html.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {MutationType, withMutations} from '../../helpers/MutationHelpers.js';

describe('ExpandableList', () => {
  it('can be expanded', async () => {
    const list = new ExpandableList.ExpandableList.ExpandableList();
    renderElementIntoDOM(list);
    list.data = {
      rows: [
        LitHtml.html`<div class="row">row 1</div>`,
        LitHtml.html`<div class="row">row 2</div>`,
      ],
    };
    assertShadowRoot(list.shadowRoot);

    // checks that list is not expanded initially
    let rows = list.shadowRoot.querySelectorAll('.row');
    assert.strictEqual(rows.length, 1);
    const iconSpan = list.shadowRoot.querySelector<HTMLElement>('span.arrow-icon');
    assert.isNotNull(iconSpan);
    assert.isFalse(iconSpan?.classList.contains('expanded'));

    // checks that clicking button expands list by adding a div
    const button = list.shadowRoot.querySelector<HTMLElement>('button.arrow-icon-button');
    await withMutations([{target: 'div', type: MutationType.ADD, max: 1}], list.shadowRoot, () => {
      button?.click();
    });

    // checks that list is expanded
    assert.isTrue(iconSpan?.classList.contains('expanded'));
    rows = list.shadowRoot.querySelectorAll('.row');
    assert.strictEqual(rows.length, 2);
  });

  it('does not render when given 0 rows', async () => {
    const list = new ExpandableList.ExpandableList.ExpandableList();
    renderElementIntoDOM(list);
    list.data = {
      rows: [],
    };
    assertShadowRoot(list.shadowRoot);

    // checks that list is not rendered
    const rows = list.shadowRoot.querySelectorAll('.row');
    assert.strictEqual(rows.length, 0);
    const iconSpan = list.shadowRoot.querySelector<HTMLElement>('span.arrow-icon');
    assert.isNull(iconSpan);
  });

  it('cannot be expanded when given 1 row', async () => {
    const list = new ExpandableList.ExpandableList.ExpandableList();
    renderElementIntoDOM(list);
    list.data = {
      rows: [
        LitHtml.html`<div class="row">row 1</div>`,
      ],
    };
    assertShadowRoot(list.shadowRoot);

    // checks that list contains 1 row
    const rows = list.shadowRoot.querySelectorAll('.row');
    assert.strictEqual(rows.length, 1);

    // checks that list does not render button for expanding
    const iconSpan = list.shadowRoot.querySelector<HTMLElement>('span.arrow-icon');
    assert.isNull(iconSpan);
    const button = list.shadowRoot.querySelector<HTMLElement>('button.arrow-icon-button');
    assert.isNull(button);
  });
});
