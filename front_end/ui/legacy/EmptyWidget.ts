// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {html, render} from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import emptyWidgetStyles from './emptyWidget.css.js';
import inspectorCommonStyles from './inspectorCommon.css.js';
import {VBox} from './Widget.js';

const UIStrings = {
  /**
   * @description Link text in an empty state view leading to external documentation.
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/EmptyWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  header: string;
  text: string;
  link?: Platform.DevToolsPath.UrlString|null;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${inspectorCommonStyles}</style>
    <style>${emptyWidgetStyles}</style>
    <div class="empty-state" jslog=${VisualLogging.section('empty-view')}>
      <div class="empty-state-header">${input.header}</div>
      <div class="empty-state-description">
        <span>${input.text}</span>
        ${input.link ? html`<devtools-link href=${input.link} jslogContext=${'learn-more'}>${i18nString(UIStrings.learnMore)}</devtools-link>` : ''}
      </div>
      <slot></slot>
    </div>`, target, {container: {classes: ['empty-view-scroller']}});
  // clang-format on
};

export class EmptyWidget extends VBox {
  #header: string;
  #text: string;
  #link: Platform.DevToolsPath.UrlString|undefined|null;
  #view: View;

  constructor(headerOrElement: string|HTMLElement, text = '', element?: HTMLElement, view: View = DEFAULT_VIEW) {
    const header = typeof headerOrElement === 'string' ? headerOrElement : '';
    if (!element && headerOrElement instanceof HTMLElement) {
      element = headerOrElement;
    }
    super(element, {useShadowDom: true, classes: ['empty-widget-container']});
    this.#header = header;
    this.#text = text;
    this.#link = undefined;
    this.#view = view;
    // TODO: migrate to `requestUpdate()` once callers don't manipulate DOM directly and synchronously anymore.
    this.performUpdate();
  }

  set link(link: Platform.DevToolsPath.UrlString|undefined|null) {
    this.#link = link;
    // TODO: migrate to `requestUpdate()` once callers don't manipulate DOM directly and synchronously anymore.
    this.performUpdate();
  }

  set text(text: string) {
    this.#text = text;
    // TODO: migrate to `requestUpdate()` once callers don't manipulate DOM directly and synchronously anymore.
    this.performUpdate();
  }

  set header(header: string) {
    this.#header = header;
    // TODO: migrate to `requestUpdate()` once callers don't manipulate DOM directly and synchronously anymore.
    this.performUpdate();
  }

  override performUpdate(): void {
    this.#view({header: this.#header, text: this.#text, link: this.#link}, undefined, this.contentElement);
  }
}
