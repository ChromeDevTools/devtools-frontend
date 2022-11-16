// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line rulesdir/es_modules_import
import emptyWidgetStyles from '../../../ui/legacy/emptyWidget.css.js';
import * as UI from '../../../ui/legacy/legacy.js';

import preloadingViewStyles from './preloadingView.css.js';

// This is under construction.
// TODO(https://crbug.com/1384419): Implement it.
export class PreloadingView extends UI.Widget.VBox {
  show(parentElement: Element, insertBefore?: Node|null): void {
    super.show(parentElement, insertBefore);
  }

  wasShown(): void {
    super.wasShown();

    this.registerCSSFiles([emptyWidgetStyles, preloadingViewStyles]);
  }
}
