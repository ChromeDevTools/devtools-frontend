// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Button from './Button.js';
import textButtonStylesRaw from './textButton.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const textButtonStyles = new CSSStyleSheet();
textButtonStyles.replaceSync(textButtonStylesRaw.cssContent);

export {
  Button,
  textButtonStyles,
};
