// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

type Constructor<T extends UI.Widget.Widget> = new (...args: any[]) => T;

export type LegacyWrapper<T extends UI.Widget.Widget, Component extends WrappableComponent<T>> = {
  getComponent(): Component,
}&T;

export function
legacyWrapper<T extends Constructor<UI.Widget.Widget>, Component extends WrappableComponent<InstanceType<T>>>(
    base: T, component: Component, jsLogContext?: string): LegacyWrapper<InstanceType<T>, Component> {
  return new class extends base {
    #component: Component;

    constructor(..._args: any[]) {
      super(/* isWebComponent=*/ true);
      this.#component = component;
      this.#component.wrapper = this as InstanceType<T>;
      void this.#component.render();
      this.contentElement.appendChild(this.#component);
      if (jsLogContext) {
        this.element.setAttribute('jslog', `${VisualLogging.pane().context(jsLogContext)}`);
      }
    }

    override wasShown(): void {
      this.#component.wasShown();
      void this.#component.render();
    }

    override willHide(): void {
      this.#component.willHide();
    }

    async doUpdate(): Promise<void> {
      await this.#component.render();
    }

    getComponent(): Component {
      return this.#component;
    }
    // clang-format off
  }() as unknown as LegacyWrapper<InstanceType<T>, Component>;
  // clang-format on
}
