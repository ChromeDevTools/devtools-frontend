// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Lit from '../../third_party/lit/lit.js';

import * as Static from './static.js';

export {
  render,
  svg,
  nothing,
  noChange,
  LitElement,
  Directive,
  type TemplateResult,
  type PropertyValues,
  Directives,
  Decorators,
} from '../../third_party/lit/lit.js';

const {html, literal, flattenTemplate} = Static;

type LitTemplate = Lit.TemplateResult|typeof Lit.nothing;

export {html, literal, flattenTemplate, type LitTemplate};
