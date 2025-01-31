// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import checkboxStylesRaw from './checkbox.css.js';
import textInputStylesRaw from './textInput.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const checkboxStyles = new CSSStyleSheet();
checkboxStyles.replaceSync(checkboxStylesRaw.cssContent);

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const textInputStyles = new CSSStyleSheet();
textInputStyles.replaceSync(textInputStylesRaw.cssContent);

export {
  checkboxStyles,
  checkboxStylesRaw,
  textInputStyles,
};
