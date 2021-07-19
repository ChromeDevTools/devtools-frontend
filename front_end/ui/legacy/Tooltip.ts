// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

export class Tooltip {
  _anchorElement?: Element;
  _tooltipLastOpened?: number;
  _tooltipLastClosed?: number;

  static install(element: HTMLElement, tooltipContent: string|null, _actionId?: string, _options?: TooltipOptions|null):
      void {
    element.title = tooltipContent || '';
  }
}
export interface TooltipOptions {
  anchorTooltipAtElement?: boolean;
}
