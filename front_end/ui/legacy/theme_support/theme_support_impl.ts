// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../../core/common/common.js';
import inspectorSyntaxHighlightStyles from '../inspectorSyntaxHighlight.css.legacy.js';

let themeSupportInstance: ThemeSupport;

const themeValuesCache = new Map<CSSStyleDeclaration, Map<string, string>>();

export class ThemeSupport extends EventTarget {
  private themeNameInternal = 'default';
  private customSheets: Set<string> = new Set();
  private computedRoot = Common.Lazy.lazy(() => window.getComputedStyle(document.documentElement));

  private constructor(private setting: Common.Settings.Setting<string>) {
    super();
  }

  static hasInstance(): boolean {
    return typeof themeSupportInstance !== 'undefined';
  }

  static instance(opts: {
    forceNew: boolean|null,
    setting: Common.Settings.Setting<string>|null,
  } = {forceNew: null, setting: null}): ThemeSupport {
    const {forceNew, setting} = opts;
    if (!themeSupportInstance || forceNew) {
      if (!setting) {
        throw new Error(`Unable to create theme support: setting must be provided: ${new Error().stack}`);
      }

      themeSupportInstance = new ThemeSupport(setting);
    }

    return themeSupportInstance;
  }

  getComputedValue(variableName: string, target: Element|null = null): string {
    const computedRoot = target ? window.getComputedStyle(target) : this.computedRoot();
    if (typeof computedRoot === 'symbol') {
      throw new Error(`Computed value for property (${variableName}) could not be found on :root.`);
    }

    // Since we might query the same variable name from various targets we need to support
    // per-target caching of computed values. Here we attempt to locate the particular computed
    // value cache for the target. If no target was specified we use the default computed root,
    // which belongs to the document element.
    let computedRootCache = themeValuesCache.get(computedRoot);
    if (!computedRootCache) {
      computedRootCache = new Map<string, string>();
      themeValuesCache.set(computedRoot, computedRootCache);
    }

    // Since theme changes trigger a reload, we can avoid repeatedly looking up color values
    // dynamically. Instead we can look up the first time and cache them for future use,
    // knowing that the cache will be invalidated by virtue of a reload when the theme changes.
    let cachedValue = computedRootCache.get(variableName);
    if (!cachedValue) {
      cachedValue = computedRoot.getPropertyValue(variableName).trim();

      // If we receive back an empty value (nothing has been set) we don't store it for the future.
      // This means that subsequent requests will continue to query the styles in case the value
      // has been set.
      if (cachedValue) {
        computedRootCache.set(variableName, cachedValue);
      }
    }

    return cachedValue;
  }

  hasTheme(): boolean {
    return this.themeNameInternal !== 'default';
  }

  themeName(): string {
    return this.themeNameInternal;
  }

  injectHighlightStyleSheets(element: Element|ShadowRoot): void {
    this.appendStyle(element, inspectorSyntaxHighlightStyles);
  }

  appendStyle(node: Node, {cssContent}: {cssContent: string}): void {
    const styleElement = document.createElement('style');
    styleElement.textContent = cssContent;
    node.appendChild(styleElement);
  }

  injectCustomStyleSheets(element: Element|ShadowRoot): void {
    for (const sheet of this.customSheets) {
      const styleElement = document.createElement('style');
      styleElement.textContent = sheet;
      element.appendChild(styleElement);
    }
  }

  addCustomStylesheet(sheetText: string): void {
    this.customSheets.add(sheetText);
  }

  applyTheme(document: Document): void {
    const isForcedColorsMode = window.matchMedia('(forced-colors: active)').matches;
    const systemPreferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';

    const useSystemPreferred = this.setting.get() === 'systemPreferred' || isForcedColorsMode;
    this.themeNameInternal = useSystemPreferred ? systemPreferredTheme : this.setting.get();

    const wasDarkThemed = document.documentElement.classList.contains('-theme-with-dark-background');
    document.documentElement.classList.toggle('-theme-with-dark-background', this.themeNameInternal === 'dark');

    const isDarkThemed = document.documentElement.classList.contains('-theme-with-dark-background');

    // In the event the theme changes we need to clear caches and notify subscribers.
    if (wasDarkThemed !== isDarkThemed) {
      themeValuesCache.clear();
      this.customSheets.clear();
      this.dispatchEvent(new ThemeChangeEvent());
    }

    // Baseline is the name of Chrome's default color theme and there are two of these: default and grayscale.
    // The collective name for the rest of the color themes is dynamic.
    // In the baseline themes Chrome uses custom values for surface colors, whereas for dynamic themes these are color-mixed.
    // To match Chrome we need to know if any of the baseline themes is currently active and assign specific values to surface colors.
    const selectedTheme = getComputedStyle(document.body).getPropertyValue('--user-color-source');
    document.documentElement.classList.toggle('baseline-default', selectedTheme === 'baseline-default');
    document.documentElement.classList.toggle('baseline-grayscale', selectedTheme === 'baseline-grayscale');
  }
}

export class ThemeChangeEvent extends Event {
  static readonly eventName = 'themechange';

  constructor() {
    super(ThemeChangeEvent.eventName, {bubbles: true, composed: true});
  }
}
