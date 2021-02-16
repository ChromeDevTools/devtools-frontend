// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../third_party/lit-html/lit-html.js';

export interface IconWithPath {
  iconPath: string;
  color: string;
  width?: string;
  height?: string;
}

export interface IconWithName {
  iconName: string;
  color: string;
  width?: string;
  height?: string;
}

export type IconData = IconWithPath|IconWithName;

const isString = (value: string|undefined): value is string => value !== undefined;

export class Icon extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  private iconPath: Readonly<string> = '';
  private color: Readonly<string> = 'rgb(110 110 110)';
  private width: Readonly<string> = '100%';
  private height: Readonly<string> = '100%';
  private iconName?: Readonly<string>;

  set data(data: IconData) {
    const {width, height} = data;
    this.color = data.color;
    this.width = isString(width) ? width : (isString(height) ? height : this.width);
    this.height = isString(height) ? height : (isString(width) ? width : this.height);
    this.iconPath = 'iconPath' in data ? data.iconPath : `Images/${data.iconName}.svg`;
    if ('iconName' in data) {
      this.iconName = data.iconName;
    }
    this.render();
  }

  get data(): IconData {
    const commonData = {
      color: this.color,
      width: this.width,
      height: this.height,
    };
    if (this.iconName) {
      return {
        ...commonData,
        iconName: this.iconName,
      };
    }
    return {
      ...commonData,
      iconPath: this.iconPath,
    };
  }

  private getStyles(): {[key: string]: string} {
    const {iconPath, width, height, color} = this;
    const commonStyles = {
      width,
      height,
      display: 'block',
    };
    if (color) {
      return {
        ...commonStyles,
        webkitMaskImage: `url(${iconPath})`,
        webkitMaskPosition: 'center',
        webkitMaskRepeat: 'no-repeat',
        // We are setting this to 99% to work around an issue where non-standard zoom levels would cause the icon to clip.
        webkitMaskSize: '99%',
        backgroundColor: `var(--icon-color, ${color})`,
      };
    }
    return {
      ...commonStyles,
      backgroundImage: `url(${iconPath})`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      // We are setting this to 99% to work around an issue where non-standard zoom levels would cause the icon to clip.
      backgroundSize: '99%',
    };
  }

  private render(): void {
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        :host {
          display: inline-block;
          white-space: nowrap;
        }
      </style>
      <div class="icon-basic" style=${LitHtml.Directives.styleMap(this.getStyles())}></div>
    `, this.shadow);
    // clang-format on
  }
}

if (!customElements.get('devtools-icon')) {
  customElements.define('devtools-icon', Icon);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-icon': Icon;
  }
}
