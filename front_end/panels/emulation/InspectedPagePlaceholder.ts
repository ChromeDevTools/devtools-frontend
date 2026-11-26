// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';

import inspectedPagePlaceholderStyles from './inspectedPagePlaceholder.css.js';

export type View = (input: undefined, output: undefined, target: HTMLElement|DocumentFragment) => void;

export const DEFAULT_VIEW: View = (_input, _output, target) => {
  // clang-format off
  render(html`
    <style>${inspectedPagePlaceholderStyles}</style>
    <slot></slot>`,
    target);
  // clang-format on
};

let inspectedPagePlaceholderInstance: InspectedPagePlaceholder;

const InspectedPagePlaceholderBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.Widget<ShadowRoot>> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.Widget,
    );

export class InspectedPagePlaceholder extends InspectedPagePlaceholderBase {
  readonly #view: View;
  #needsUpdate = true;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: 'pure'});
    this.#view = view;
    this.setMinimumSize(150, 150);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): InspectedPagePlaceholder {
    const {forceNew} = opts;
    if (!inspectedPagePlaceholderInstance || forceNew) {
      inspectedPagePlaceholderInstance = new InspectedPagePlaceholder();
    }

    return inspectedPagePlaceholderInstance;
  }

  override wasShown(): void {
    super.wasShown();
    if (this.#needsUpdate) {
      this.requestUpdate();
    }
  }

  override performUpdate(): void {
    this.#needsUpdate = false;
    this.#view(undefined, undefined, this.contentElement);
  }

  #dipPageRect(): {
    x: number,
    y: number,
    width: number,
    height: number,
  } {
    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    const rect = this.element.getBoundingClientRect();
    const bodyRect = this.element.ownerDocument.body.getBoundingClientRect();

    const left = Math.max(rect.left * zoomFactor, bodyRect.left * zoomFactor);
    const top = Math.max(rect.top * zoomFactor, bodyRect.top * zoomFactor);
    const bottom = Math.min(rect.bottom * zoomFactor, bodyRect.bottom * zoomFactor);
    const right = Math.min(rect.right * zoomFactor, bodyRect.right * zoomFactor);

    return {x: left, y: top, width: right - left, height: bottom - top};
  }

  update(force?: boolean): void {
    // The placeholder is temporarily detached while its owner re-renders (e.g. when device mode is toggled)
    // or while it moves between the DevTools and the toolbox documents. A detached element measures as 0x0,
    // which would resize the inspected page to 1x1, so wait until it is attached again.
    if (!this.element.isConnected) {
      return;
    }
    const rect = this.#dipPageRect();
    const bounds = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      height: Math.max(1, Math.round(rect.height)),
      width: Math.max(1, Math.round(rect.width)),
    };
    if (force) {
      // Short term fix for Lighthouse interop.
      --bounds.height;
      this.dispatchEventToListeners(Events.UPDATE, bounds);
      ++bounds.height;
    }
    this.dispatchEventToListeners(Events.UPDATE, bounds);
  }
}

export const enum Events {
  UPDATE = 'Update',
}

export interface Bounds {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface EventTypes {
  [Events.UPDATE]: Bounds;
}
