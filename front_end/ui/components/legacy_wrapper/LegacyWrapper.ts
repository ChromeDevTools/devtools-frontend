// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api, @devtools/enforce-custom-element-definitions-location*/

import type * as Platform from '../../../core/platform/platform.js';
import type * as UI from '../../legacy/legacy.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

export abstract class WrappableComponent<T extends UI.Widget.Widget = UI.Widget.Widget> extends HTMLElement {
  wrapper: T|null = null;
  async render(): Promise<void> {
  }
  wasShown(): void {
  }
  willHide(): void {
  }
}

export type LegacyWrapper<T extends UI.Widget.Widget, Component extends WrappableComponent<T>> = {
  getComponent(): Component,
}&T;

export function legacyWrapper<T extends UI.Widget.Widget, Component extends WrappableComponent<T>>(
    base: Platform.Constructor.Constructor<T>, component: Component,
    jsLogContext?: string): LegacyWrapper<T, Component> {
  return new class extends(base as Platform.Constructor.Constructor<UI.Widget.Widget>) {
    #component: Component;

    constructor(..._args: any[]) {
      super(/* useShadowDom=*/ true);
      this.#component = component;
      this.#component.wrapper = this as unknown as T;
      void this.#component.render();
      this.contentElement.appendChild(this.#component);
      if (jsLogContext) {
        this.element.setAttribute('jslog', `${VisualLogging.pane().context(jsLogContext)}`);
      }
    }

    override wasShown(): void {
      super.wasShown();
      this.#component.wasShown();
      void this.#component.render();
    }

    override willHide(): void {
      super.willHide();
      this.#component.willHide();
    }

    override async performUpdate(): Promise<void> {
      await this.#component.render();
    }

    getComponent(): Component {
      return this.#component;
    }
    // clang-format off
  }() as unknown as LegacyWrapper<T, Component>;
  // clang-format on
}
