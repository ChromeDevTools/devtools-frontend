// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';

import * as Issues from './issues.js';

const {DEFAULT_VIEW} = Issues.GenericIssueDetailsView;

describe('GenericIssueDetailsView', () => {
  describe('DEFAULT_VIEW', () => {
    setupLocaleHooks();

    function renderView(input: Issues.GenericIssueDetailsView.ViewInput): HTMLTableElement {
      const target = document.createElement('table');
      renderElementIntoDOM(target);
      DEFAULT_VIEW(input, undefined, target);
      return target;
    }

    it('renders the frame header when showFrameHeader is true', () => {
      const target = renderView({showFrameHeader: true, rows: []});

      const headers = target.querySelectorAll('td.affected-resource-header');
      assert.lengthOf(headers, 1);
      assert.strictEqual(headers[0].textContent, 'Frame');
    });

    it('omits the frame header when showFrameHeader is false', () => {
      const target = renderView({showFrameHeader: false, rows: []});

      assert.lengthOf(target.querySelectorAll('td.affected-resource-header'), 0);
      assert.lengthOf(target.querySelectorAll('tr'), 0);
    });

    it('renders rows with frame and element', () => {
      const frame: Issues.GenericIssueDetailsView.FrameCellData = {
        url: 'main-frame',
        hasFrame: false,
        onReveal: () => {},
        onMouseEnter: () => {},
        onMouseLeave: () => {},
      };
      const element: Issues.GenericIssueDetailsView.ElementCellData = {
        nodeName: 'input#email',
        onElementClick: () => {},
      };

      const target = renderView({
        showFrameHeader: true,
        rows: [
          {frame, element},
          {element},
        ],
      });

      const rows = target.querySelectorAll<HTMLTableRowElement>('tr.affected-resource-directive');
      assert.lengthOf(rows, 2);
      assert.lengthOf(rows[0].cells, 2);
      assert.strictEqual(rows[0].cells[0].textContent?.trim(), 'main-frame');
      assert.strictEqual(rows[0].cells[1].textContent?.trim(), 'input#email');
      assert.lengthOf(rows[1].cells, 1);
      assert.strictEqual(rows[1].cells[0].textContent?.trim(), 'input#email');
    });
  });
});
