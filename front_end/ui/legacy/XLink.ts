// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as UIHelpers from '../helpers/helpers.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import {html as xhtml} from './Fragment.js';
import {Tooltip} from './Tooltip.js';
import {
  MaxLengthForDisplayedURLs,
} from './UIUtils.js';
import {XElement} from './XElement.js';

export class XLink extends XElement {
  #href: Platform.DevToolsPath.UrlString|null;
  private clickable: boolean;
  private readonly onClick: (arg0: Event) => void;
  private readonly onKeyDown: (arg0: KeyboardEvent) => void;
  static create(
      url: string, linkText?: string, className?: string, preventClick?: boolean, jsLogContext?: string,
      tabindex = '0'): HTMLElement {
    if (!linkText) {
      linkText = url;
    }
    className = className || '';
    // clang-format off
    // TODO(dgozman): migrate css from 'devtools-link' to 'x-link'.
    const element = xhtml `
  <x-link href='${url}' tabindex='${tabindex}' class='${className} devtools-link' ${preventClick ? 'no-click' : ''}
  jslog=${VisualLogging.link().track({click: true, keydown:'Enter|Space'}).context(jsLogContext)}>${Platform.StringUtilities.trimMiddle(linkText, MaxLengthForDisplayedURLs)}</x-link>`;
    // clang-format on
    return element as HTMLElement;
  }

  constructor() {
    super();

    this.style.setProperty('display', 'inline');
    ARIAUtils.markAsLink(this);
    this.setAttribute('tabindex', '0');
    this.setAttribute('target', '_blank');
    this.setAttribute('rel', 'noopener');

    this.#href = null;
    this.clickable = true;

    this.onClick = (event: Event) => {
      event.consume(true);
      if (this.#href) {
        UIHelpers.openInNewTab(this.#href);
      }
    };
    this.onKeyDown = (event: KeyboardEvent) => {
      if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        event.consume(true);
        if (this.#href) {
          UIHelpers.openInNewTab(this.#href);
        }
      }
    };
  }

  static override get observedAttributes(): string[] {
    // TODO(dgozman): should be super.observedAttributes, but it does not compile.
    return XElement.observedAttributes.concat(['href', 'no-click', 'title', 'tabindex']);
  }

  get href(): Platform.DevToolsPath.UrlString|null {
    return this.#href;
  }

  override attributeChangedCallback(attr: string, oldValue: string|null, newValue: string|null): void {
    if (attr === 'no-click') {
      this.clickable = !newValue;
      this.updateClick();
      return;
    }

    if (attr === 'href') {
      // For invalid or non-absolute URLs, `href` should remain `null`.
      if (!newValue) {
        newValue = '';
      }
      let href: Platform.DevToolsPath.UrlString|null = null;
      try {
        const url = new URL(newValue);
        if (url.protocol !== 'javascript:') {
          href = Platform.DevToolsPath.urlString`${url}`;
        }
      } catch {
      }

      this.#href = href;
      if (!this.hasAttribute('title')) {
        Tooltip.install(this, newValue);
      }
      this.updateClick();
      return;
    }

    if (attr === 'tabindex') {
      if (oldValue !== newValue) {
        this.setAttribute('tabindex', newValue || '0');
      }
      return;
    }

    super.attributeChangedCallback(attr, oldValue, newValue);
  }

  private updateClick(): void {
    if (this.#href !== null && this.clickable) {
      this.addEventListener('click', this.onClick, false);
      this.addEventListener('keydown', this.onKeyDown, false);
      this.style.setProperty('cursor', 'pointer');
    } else {
      this.removeEventListener('click', this.onClick, false);
      this.removeEventListener('keydown', this.onKeyDown, false);
      this.style.removeProperty('cursor');
    }
  }
}

// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('x-link', XLink);
