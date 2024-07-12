// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

declare module '*.css.js' {
  const styles: CSSStyleSheet;
  export default styles;
}

declare module '*.css.legacy.js' {
  const styles: {cssContent: string};
  export default styles;
}
