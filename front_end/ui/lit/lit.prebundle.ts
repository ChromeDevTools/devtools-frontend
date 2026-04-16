// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Lit from '../../third_party/lit/lit.js';

export type {DirectiveResult} from '../../third_party/lit/lib/directive.js';
export {
  AsyncDirective,
  Decorators,
  Directive,
  Directives,
  LitElement,
  noChange,
  nothing,
  type PropertyValues,
  StaticHtml,
  svg,
  type TemplateResult,
} from '../../third_party/lit/lit.js';
export {
  i18nTemplate,
} from './i18n-template.js';
export {
  render,
  type RenderOptions,
} from './render.js';
export {
  html,
} from './strip-whitespace.js';

export type LitTemplate = Lit.TemplateResult|typeof Lit.nothing;
