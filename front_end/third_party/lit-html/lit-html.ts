// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Note: clang-format unfortunately does odd things when formatting this file.
 * Due to a bug in Clang-Format, disabling it doesn't impact if it formats
 * imports/exports, so there's no way to prevent it formatting this code like it
 * has :(
 */

import * as Directive from './directive.js';
import * as Directives from './directives.js';
/*
 * All other parts of Lit come from the lit-html package, not from its static functionality.
 */
import {
  nothing,
  render,
  svg
,
  TemplateResult} from './package/lit-html.js';
/*
 * We use the html from the static package to allow static expressions.
 * See https://docs.google.com/document/d/181LGQGSSNpI7iYzLCLjtetfQs5oJ-UkQZDkFPxUXXVs for details.
 */
import {
  html,
  literal,
} from './package/static.js';

export {
  Directive,
  Directives,
  html,
  literal,
  nothing
,
  render,
  svg,
  TemplateResult};

