// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();

const exampleRenderHelper = (name: string, value: string): LitHtml.TemplateResult => LitHtml.html`
          <devtools-report-row>
            <span slot="name">${name}</span>
            <span slot="value">${value}</span>
          </devtools-report-row>
        `;

const container = document.querySelector('#container');
if (!container) {
  throw new Error('Could not find container');
}

LitHtml.render(
    LitHtml.html`
        <style>
          devtools-report {
            --name-column-width: 300px;
          }

          .source-code {
            font-family: monospace;
          }
        </style>

        <devtools-report>
          <devtools-report-section .data=${{
      sectionTitle: 'Section 1',
    } as Components.ReportView.ReportSectionData}>
            <devtools-report-row>
              <span slot="name">Basic plain text field</span>
              <span slot="value">And this is the value</span>
            </devtools-report-row>
            <devtools-report-row>
              <span slot="name">A field with a code value</span>
              <span slot="value" class="source-code">SomeCodeValue</span>
            </devtools-report-row>
          </devtools-report-section>

          <devtools-report-section .data=${{
      sectionTitle: 'Section 2',
    } as Components.ReportView.ReportSectionData}>
            ${exampleRenderHelper('Using a small helper', 'to render report rows')}
          </devtools-report-section>
        </devtools-report>
      `,
    container);
