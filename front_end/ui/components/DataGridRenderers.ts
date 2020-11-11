// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LitHtml from '../../third_party/lit-html/lit-html.js';

export const stringRenderer = (value: unknown): LitHtml.TemplateResult => {
  const stringified = String(value);
  return LitHtml.html`${stringified}`;
};

export const codeBlockRenderer = (value: unknown): LitHtml.TemplateResult => {
  return LitHtml.html`<code>${value}</code>`;
};
