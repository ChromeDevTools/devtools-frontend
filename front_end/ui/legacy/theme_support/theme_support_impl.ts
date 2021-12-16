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
import * as Platform from '../../../core/platform/platform.js';

import inspectorSyntaxHighlightStyles from '../inspectorSyntaxHighlight.css.legacy.js';
import inspectorSyntaxHighlightDarkStyles from '../inspectorSyntaxHighlightDark.css.legacy.js';

let themeSupportInstance: ThemeSupport;

const themeValuesCache = new Map<CSSStyleDeclaration, Map<string, string>>();

export class ThemeSupport {
  private readonly themeNameInternal: string;
  private themableProperties: Set<string>;
  private readonly cachedThemePatches: Map<string, string>;
  private readonly setting: Common.Settings.Setting<string>;
  private readonly customSheets: Set<string>;
  private readonly computedRoot: () => symbol | CSSStyleDeclaration;
  private injectingStyleSheet?: boolean;

  private constructor(setting: Common.Settings.Setting<string>) {
    const systemPreferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';
    this.themeNameInternal = setting.get() === 'systemPreferred' ? systemPreferredTheme : setting.get();
    this.themableProperties = new Set([
      'color',
      'box-shadow',
      'text-shadow',
      'outline-color',
      'background-image',
      'background-color',
      'border-left-color',
      'border-right-color',
      'border-top-color',
      'border-bottom-color',
      '-webkit-border-image',
      'fill',
      'stroke',
    ]);
    this.cachedThemePatches = new Map();
    this.setting = setting;
    this.customSheets = new Set();
    this.computedRoot = Common.Lazy.lazy(() => window.getComputedStyle(document.documentElement));
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
    this.injectingStyleSheet = true;
    this.appendStyle(element, inspectorSyntaxHighlightStyles);
    if (this.themeNameInternal === 'dark') {
      this.appendStyle(element, inspectorSyntaxHighlightDarkStyles);
    }
    this.injectingStyleSheet = false;
  }

  /**
   * Note: this is a duplicate of the function in ui/utils. It exists here
   * so there is no circular dependency between ui/utils and theme_support.
   */
  private appendStyle(node: Node, {cssContent}: {cssContent: string}): void {
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

  isForcedColorsMode(): boolean {
    return window.matchMedia('(forced-colors: active)').matches;
  }

  addCustomStylesheet(sheetText: string): void {
    this.customSheets.add(sheetText);
  }

  applyTheme(document: Document): void {
    if (!this.hasTheme() || this.isForcedColorsMode()) {
      return;
    }

    if (this.themeNameInternal === 'dark') {
      document.documentElement.classList.add('-theme-with-dark-background');
    }

    const styleSheets = document.styleSheets;
    const result = [];
    for (let i = 0; i < styleSheets.length; ++i) {
      const href = styleSheets[i].href;
      if (!href) {
        continue;
      }
      result.push(this.patchForTheme(href, (styleSheets[i] as CSSStyleSheet)));
    }
    result.push('/*# sourceURL=inspector.css.theme */');

    const styleElement = document.createElement('style');
    styleElement.textContent = result.join('\n');
    document.head.appendChild(styleElement);
  }

  themeStyleSheet(id: string, text: string): string {
    if (!this.hasTheme() || this.injectingStyleSheet || this.isForcedColorsMode()) {
      return '';
    }

    let patch = this.cachedThemePatches.get(id);
    if (!patch) {
      const styleElement = document.createElement('style');
      styleElement.textContent = text;
      document.body.appendChild(styleElement);

      const {sheet} = styleElement;
      if (!sheet) {
        throw new Error('No sheet in stylesheet object');
      }
      patch = this.patchForTheme(id, sheet);
      document.body.removeChild(styleElement);
    }
    return patch;
  }

  private patchForTheme(id: string, styleSheet: CSSStyleSheet): string {
    const cached = this.cachedThemePatches.get(id);
    if (cached) {
      return cached;
    }

    try {
      const rules = styleSheet.cssRules;
      const result = [];
      for (let j = 0; j < rules.length; ++j) {
        const rule = rules[j];
        if (rule instanceof CSSImportRule) {
          result.push(this.patchForTheme(rule.styleSheet.href || '', rule.styleSheet));
          continue;
        }

        if (!(rule instanceof CSSStyleRule)) {
          continue;
        }

        const output: string[] = [];
        const style = rule.style;
        const selectorText = rule.selectorText;
        for (let i = 0; style && i < style.length; ++i) {
          this.patchProperty(selectorText, style, style[i], output);
        }
        if (output.length) {
          result.push(rule.selectorText + '{' + output.join('') + '}');
        }
      }

      const fullText = result.join('\n');
      this.cachedThemePatches.set(id, fullText);
      return fullText;
    } catch (e) {
      this.setting.set('default');
      return '';
    }
  }

  /**
   * Theming API is primarily targeted at making dark theme look good.
   * - If rule has ".-theme-preserve" in selector, it won't be affected.
   * - One can create specializations for dark themes via body.-theme-with-dark-background selector in host context.
   */
  private patchProperty(selectorText: string, style: CSSStyleDeclaration, name: string, output: string[]): void {
    if (!this.themableProperties.has(name)) {
      return;
    }

    const value = style.getPropertyValue(name);
    if (!value || value === 'none' || value === 'inherit' || value === 'initial' || value === 'transparent') {
      return;
    }
    if (name === 'background-image' && value.indexOf('gradient') === -1) {
      return;
    }

    if (selectorText.indexOf('-theme-') !== -1) {
      return;
    }

    let colorUsage = ThemeSupport.ColorUsage.Unknown;
    if (name.indexOf('background') === 0 || name.indexOf('border') === 0) {
      colorUsage |= ThemeSupport.ColorUsage.Background;
    }
    if (name.indexOf('background') === -1) {
      colorUsage |= ThemeSupport.ColorUsage.Foreground;
    }

    output.push(name);
    output.push(':');
    if (/^var\(.*\)$/.test(value)) {
      // Don't translate CSS variables.
      output.push(value);
    } else {
      const items = value.replace(Common.Color.Regex, '\0$1\0').split('\0');
      for (const item of items) {
        output.push(this.patchColorText(item, (colorUsage as number)));
      }
    }
    if (style.getPropertyPriority(name)) {
      output.push(' !important');
    }
    output.push(';');
  }

  /**
   * This legacy function has been supeseded by CSS custom properties. Wherever possible, please use
   * the values declared in global stylesheets.
   *
   * @deprecated
   */
  patchColorText(text: string, colorUsage: number): string {
    const color = Common.Color.Color.parse(text);
    if (!color) {
      return text;
    }
    const outColor = this.patchColor(color, colorUsage);
    let outText = outColor.asString(null);
    if (!outText) {
      outText = outColor.asString(outColor.hasAlpha() ? Common.Color.Format.RGBA : Common.Color.Format.RGB);
    }
    return outText || text;
  }

  /**
   * This legacy function has been supeseded by CSS custom properties. Wherever possible, please use
   * the values declared in global stylesheets.
   *
   * @deprecated
   */
  patchColor(color: Common.Color.Color, colorUsage: number): Common.Color.Color {
    const hsla = color.hsla();
    this.patchHSLA(hsla, colorUsage);

    const rgba: number[] = [];
    Common.Color.Color.hsl2rgb(hsla, rgba);
    return new Common.Color.Color(rgba, color.format());
  }

  private patchHSLA(hsla: number[], colorUsage: number): void {
    const hue = hsla[0];
    const sat = hsla[1];
    let lit: number = hsla[2];
    const alpha = hsla[3];

    switch (this.themeNameInternal) {
      case 'dark': {
        const minCap = colorUsage & ThemeSupport.ColorUsage.Background ? 0.14 : 0;
        const maxCap = colorUsage & ThemeSupport.ColorUsage.Foreground ? 0.9 : 1;
        lit = 1 - lit;
        if (lit < minCap * 2) {
          lit = minCap + lit / 2;
        } else if (lit > 2 * maxCap - 1) {
          lit = maxCap - 1 / 2 + lit / 2;
        }
        break;
      }
    }
    hsla[0] = Platform.NumberUtilities.clamp(hue, 0, 1);
    hsla[1] = Platform.NumberUtilities.clamp(sat, 0, 1);
    hsla[2] = Platform.NumberUtilities.clamp(lit, 0, 1);
    hsla[3] = Platform.NumberUtilities.clamp(alpha, 0, 1);
  }
}
export namespace ThemeSupport {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum ColorUsage {
    Unknown = 0,
    Foreground = 1,
    Background = 2,
  }
}
