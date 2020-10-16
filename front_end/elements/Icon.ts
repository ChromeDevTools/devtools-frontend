// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../third_party/lit-html/lit-html.js';

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

type IconData = IconWithPath|IconWithName;

interface ColouredIconStyles {
  webkitMaskImage: string;
  webkitMaskPosition: string;
  webkitMaskRepeat: string;
  webkitMaskSize: string;
  backgroundColor: string;
}

interface IconStyles {
  backgroundImage: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  backgroundSize: string;
}

type Styles = ColouredIconStyles|IconStyles;

export class Icon extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  private iconPath: Readonly<string> = '';
  private color: Readonly<string> = 'rgb(110 110 110)';
  private width: Readonly<string> = '100%';
  private height: Readonly<string> = '100%';
  private styles: Readonly<Styles> = {
    webkitMaskImage: 'url(' + this.iconPath + ')',
    webkitMaskPosition: 'center',
    webkitMaskRepeat: 'no-repeat',
    webkitMaskSize: 'contain',
    backgroundColor: this.color,
  };


  get data(): IconData {
    return {
      iconPath: this.iconPath,
      color: this.color,
      width: this.width,
      height: this.height,
    };
  }

  set data(data: IconData) {
    this.iconPath =
        'iconPath' in data ? data.iconPath : 'Images/' + ('iconName' in data ? data.iconName : 'some_icon') + '.svg';
    this.color = data.color;
    this.width = data.width ? data.width : (data.height ? data.height : this.width);
    this.height = data.height ? data.height : (data.width ? data.width : this.height);
    this.setStyles(data.color);
    this.render();
  }

  private setStyles(color: string) {
    if (color) {
      this.styles = {
        webkitMaskImage: `url(${this.iconPath})`,
        webkitMaskPosition: 'center',
        webkitMaskRepeat: 'no-repeat',
        webkitMaskSize: '100%',
        backgroundColor: this.color,
      };
    } else {
      this.styles = {
        backgroundImage: `url(${this.iconPath})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100%',
      };
    }
  }

  private render() {
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        :host {
          display: inline-block;
          white-space: nowrap;
        }

        .icon-basic {
          display: inline-block;
          width: ${this.width};
          height: ${this.height};
        }
      </style>
      <span class="icon-basic" style=${LitHtml.Directives.styleMap(this.styles)}></span>
    `, this.shadow);
    // clang-format on
  }
}

customElements.define('devtools-icon', Icon);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-icon': Icon;
  }
}
