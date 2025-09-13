// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Lit from '../../third_party/lit/lit.js';

export {
  Decorators,
  Directive,
  Directives,
  LitElement,
  noChange,
  nothing,
  type PropertyValues,
  render,
  StaticHtml,
  svg,
  type TemplateResult,
} from '../../third_party/lit/lit.js';
export {
  i18nTemplate,
} from './i18n-template.js';
export {
  html,
} from './strip-whitespace.js';

export type LitTemplate = Lit.TemplateResult|typeof Lit.nothing;
