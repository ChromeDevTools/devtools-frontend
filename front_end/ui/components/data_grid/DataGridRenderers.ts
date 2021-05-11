// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import type {CellValue} from './DataGridUtils.js';

export const primitiveRenderer = (value: CellValue): LitHtml.TemplateResult => {
  return LitHtml.html`${value}`;
};

export const codeBlockRenderer = (value: CellValue): LitHtml.TemplateResult|typeof LitHtml.nothing => {
  if (!value) {
    return LitHtml.nothing;
  }
  const MAX_LENGTH = 13;
  const stringValue = String(value);
  const truncatedValue =
      stringValue.length > MAX_LENGTH ? stringValue.substring(0, MAX_LENGTH - 3) + '...' : stringValue;
  return LitHtml.html`<code>${truncatedValue}</code>`;
};
