// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// <reference path="./request_idle_callback.d.ts" />
/// <reference path="./intl_display_names.d.ts" />

interface CSSStyleSheet {
  replaceSync(content: string): void;
}

interface ShadowRoot {
  adoptedStyleSheets: CSSStyleSheet[]
}

interface ImportMeta {
  url: string;
}
