// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../third_party/lit/lit.js';

import * as Static from './static.js';

export {Directive, type TemplateResult} from '../../third_party/lit/lit.js';

const {render, svg, nothing, noChange, LitElement, Directives} = Lit;
const {html, literal, flattenTemplate} = Static;

type LitTemplate = Lit.TemplateResult|typeof nothing;

export {
  render,
  nothing,
  noChange,
  LitElement,
  Directives,
  svg,
  html,
  literal,
  flattenTemplate,
  type LitTemplate,
};
