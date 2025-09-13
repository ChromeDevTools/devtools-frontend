// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {Directives, html, render} from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import emptyWidgetStyles from './emptyWidget.css.js';
import inspectorCommonStyles from './inspectorCommon.css.js';
import {VBox} from './Widget.js';
import {XLink} from './XLink.js';

const UIStrings = {
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/EmptyWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {ref} = Directives;

interface EmptyWidgetInput {
  header: string;
  text: string;
  link?: Platform.DevToolsPath.UrlString|undefined|null;
}

interface EmptyWidgetOutput {
  contentElement: Element|undefined;
}

type View = (input: EmptyWidgetInput, output: EmptyWidgetOutput, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(html`
    <style>${inspectorCommonStyles}</style>
    <style>${emptyWidgetStyles}</style>
    <div class="empty-state" jslog=${VisualLogging.section('empty-view')}
         ${ref(e => {output.contentElement = e;})}>
      <div class="empty-state-header">${input.header}</div>
      <div class="empty-state-description">
        <span>${input.text}</span>
        ${input.link ? XLink.create(
            input.link, i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more') : ''}
      </div>
    </div>`, target);
  // clang-format on
};

export class EmptyWidget extends VBox {
  #header: string;
  #text: string;
  #link: Platform.DevToolsPath.UrlString|undefined|null;
  #view: View;

  constructor(headerOrElement: string|HTMLElement, text = '', element?: HTMLElement, view = DEFAULT_VIEW) {
    const header = typeof headerOrElement === 'string' ? headerOrElement : '';
    if (!element && headerOrElement instanceof HTMLElement) {
      element = headerOrElement;
    }
    super(element, {classes: ['empty-view-scroller']});
    this.#header = header;
    this.#text = text;
    this.#link = undefined;
    this.#view = view;
    this.performUpdate();
  }

  set link(link: Platform.DevToolsPath.UrlString|undefined|null) {
    this.#link = link;
    this.performUpdate();
  }

  set text(text: string) {
    this.#text = text;
    this.performUpdate();
  }

  set header(header: string) {
    this.#header = header;
    this.performUpdate();
  }

  override performUpdate(): void {
    const output = {contentElement: undefined};
    this.#view({header: this.#header, text: this.#text, link: this.#link}, output, this.element);
    if (output.contentElement) {
      this.contentElement = output.contentElement;
    }
  }
}
