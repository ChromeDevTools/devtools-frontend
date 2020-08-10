// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line spaced-comment
/// <reference path="./resize_observer.d.ts" />


interface CSSStyleSheet {
  replaceSync(content: string): void;
}

interface ShadowRoot {
  adoptedStyleSheets: CSSStyleSheet[]
}
