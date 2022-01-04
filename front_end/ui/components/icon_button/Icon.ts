// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';
import iconStyles from './icon.css.js';

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
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export class Icon extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-icon`;

  readonly #shadow = this.attachShadow({mode: 'open'});

  #iconPath: Readonly<string> = '';
  #color: Readonly<string> = 'rgb(110 110 110)';
  #width: Readonly<string> = '100%';
  #height: Readonly<string> = '100%';
  #iconName?: Readonly<string>;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [iconStyles];
  }

  set data(data: IconData) {
    const {width, height} = data;
    this.#color = data.color;
    this.#width = isString(width) ? width : (isString(height) ? height : this.#width);
    this.#height = isString(height) ? height : (isString(width) ? width : this.#height);
    if ('iconPath' in data) {
      this.#iconPath = data.iconPath;
    } else {
      this.#iconPath = new URL(`../../../Images/${data.iconName}.svg`, import.meta.url).toString();
      this.#iconName = data.iconName;
    }
    this.#render();
  }

  get data(): IconData {
    const commonData = {
      color: this.#color,
      width: this.#width,
      height: this.#height,
    };
    if (this.#iconName) {
      return {
        ...commonData,
        iconName: this.#iconName,
      };
    }
    return {
      ...commonData,
      iconPath: this.#iconPath,
    };
  }

  #getStyles(): {[key: string]: string} {
    const iconPath = this.#iconPath;
    const width = this.#width;
    const height = this.#height;
    const color = this.#color;
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

  #render(): void {
    void coordinator.write(() => {
      // clang-format off
      LitHtml.render(LitHtml.html`
        <div class="icon-basic" style=${LitHtml.Directives.styleMap(this.#getStyles())}></div>
      `, this.#shadow, {host: this});
      // clang-format on
    });
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-icon', Icon);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-icon': Icon;
  }
}
