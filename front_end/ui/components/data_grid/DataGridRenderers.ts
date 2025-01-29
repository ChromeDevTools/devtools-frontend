// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../../../ui/lit/lit.js';

import type {CellValue} from './DataGridUtils.js';

const {html} = Lit;

export const primitiveRenderer = (value: CellValue): Lit.TemplateResult => {
  return html`${value}`;
};

export const codeBlockRenderer = (value: CellValue): Lit.TemplateResult|typeof Lit.nothing => {
  if (!value) {
    return Lit.nothing;
  }
  const stringValue = String(value);
  return html`<code>${stringValue}</code>`;
};

export const iconRenderer = (icon: CellValue): Lit.TemplateResult|typeof Lit.nothing => {
  if (!icon) {
    return Lit.nothing;
  }
  return html`<div style="display: flex; justify-content: center;">${icon}</div>`;
};
