// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../report_view/report_view.js';

import * as Lit from '../../../lit/lit.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

const {html} = Lit;

await ComponentHelpers.ComponentServerSetup.setup();

const exampleRenderHelper = (key: string, value: string) => html`
          <devtools-report-key>${key}</devtools-report-key>
          <devtools-report-value>${value}</devtools-report-value>
        `;

const container = document.querySelector<HTMLElement>('#container');
if (!container) {
  throw new Error('Could not find container');
}

Lit.render(
    html`
        <style>
          .source-code {
            font-family: monospace;
          }
        </style>

        <devtools-report .data=${{
reportTitle:
  'Optional Title',
    }}>
          <devtools-report-section-header>Section 1</devtools-report-section-header>
          <devtools-report-key>Basic plain text field</devtools-report-key>
          <devtools-report-value>And this is the value</devtools-report-value>
          <devtools-report-key>A field with a code value</devtools-report-key>
          <devtools-report-value class="source-code">SomeCodeValue</devtools-report-value>
          <devtools-report-divider></devtools-report-divider>
          <devtools-report-section-header>Section 2</devtools-report-section-header>
          ${exampleRenderHelper('Using a small helper', 'to render report rows')}
          ${exampleRenderHelper('This wide column defines the column width', 'for all rows')}
          <devtools-report-divider></devtools-report-divider>
        </devtools-report>
      `,
    container);
