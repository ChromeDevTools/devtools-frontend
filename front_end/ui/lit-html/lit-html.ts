// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import * as Static from './static.js';

const {render, Directive, Directives, nothing, noChange} = LitHtml;
const {html, literal, flattenTemplate} = Static;

export type TemplateResult = LitHtml.TemplateResult|typeof LitHtml.nothing;

export {
  render,
  Directive,
  Directives,
  nothing,
  noChange,
  html,
  literal,
  flattenTemplate,  // Exposed for unit testing.
};
