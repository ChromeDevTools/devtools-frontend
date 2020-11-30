// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../../../../front_end/third_party/lit-html/lit-html.js';
import * as UIComponents from '../../../../../front_end/ui/components/components.js';
import {getElementsWithinComponent, getElementWithinComponent, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('ReportView', () => {
  describe('section', () => {
    it('shows the provided section title', () => {
      const section = new UIComponents.ReportView.ReportSection();
      section.data = {sectionTitle: 'Title for test section'};
      renderElementIntoDOM(section);

      // TODO(szuend): Replace this with an aria selector once we can use them in unit tests.
      const header = getElementWithinComponent(section, 'div.header', HTMLElement);
      assert.strictEqual(header.textContent, 'Title for test section');
    });
  });

  describe('row', () => {
    it('renders the elements provided for the "name" and "value" slot', () => {
      const row = new UIComponents.ReportView.ReportRow();
      LitHtml.render(
          LitHtml.html`
        <span slot="name">This is the name</span>
        <span slot="value">This is the value</span>
      `,
          row);
      renderElementIntoDOM(row);

      const [nameSlot, valueSlot] = getElementsWithinComponent(row, 'slot', HTMLSlotElement);
      const [nameSpan, valueSpan] = row.querySelectorAll('span');

      assert.strictEqual(nameSlot.assignedElements()[0], nameSpan);
      assert.strictEqual(valueSlot.assignedElements()[0], valueSpan);
    });
  });
});
