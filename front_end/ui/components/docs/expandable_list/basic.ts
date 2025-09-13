// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as Lit from '../../../lit/lit.js';
import * as ExpandableList from '../../expandable_list/expandable_list.js';

const {html} = Lit;

await FrontendHelpers.initializeGlobalVars();

const component = new ExpandableList.ExpandableList.ExpandableList();

const rows = [];
rows.push(html`
  <div>This is row 1. Click on the triangle icon to expand.</div>
`);

for (let rowNumber = 2; rowNumber < 11; rowNumber++) {
  rows.push(html`
    <div>This is row ${rowNumber}.</div>
  `);
}

component.data = {
  rows,
};

document.getElementById('container')?.appendChild(component);
