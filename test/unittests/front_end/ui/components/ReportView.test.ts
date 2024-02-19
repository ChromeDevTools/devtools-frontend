// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ReportView from '../../../../../front_end/ui/components/report_view/report_view.js';
import * as LitHtml from '../../../../../front_end/ui/lit-html/lit-html.js';
import {getElementWithinComponent, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('ReportView', () => {
  describe('header', () => {
    it('shows the provided report title', () => {
      const report = new ReportView.ReportView.Report();
      report.data = {reportTitle: 'Title for test report'};
      renderElementIntoDOM(report);

      // TODO(szuend): Replace this with an aria selector once we can use them in unit tests.
      const header = getElementWithinComponent(report, 'div.report-title', HTMLElement);
      assert.strictEqual(header.textContent, 'Title for test report');
    });
  });

  describe('row', () => {
    it('renders the elements provided for the "key" and "value" slot', () => {
      const report = new ReportView.ReportView.Report();
      LitHtml.render(
          LitHtml.html`
        <devtools-report-key>This is the key</devtools-report-key>
        <devtools-report-value>This is the value</devtools-report-value>
      `,
          report);
      renderElementIntoDOM(report);

      const slot = getElementWithinComponent(report, 'slot', HTMLSlotElement);
      const keyElement = report.querySelector('devtools-report-key');
      const valueElement = report.querySelector('devtools-report-value');

      assert.strictEqual(slot.assignedElements()[0], keyElement);
      assert.strictEqual(slot.assignedElements()[1], valueElement);
    });
  });
});
