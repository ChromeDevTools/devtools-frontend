// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../../lit/lit.js';
import { ExpandableList } from './expandable_list.js';
const { html } = Lit;
export function render(container) {
    const component = new ExpandableList.ExpandableList();
    const rows = [];
    rows.push(html `
    <div>This is row 1. Click on the triangle icon to expand.</div>
  `);
    for (let rowNumber = 2; rowNumber < 11; rowNumber++) {
        rows.push(html `
      <div>This is row ${rowNumber}.</div>
    `);
    }
    component.data = {
        rows,
    };
    container.appendChild(component);
}
//# sourceMappingURL=ExpandableList.docs.js.map