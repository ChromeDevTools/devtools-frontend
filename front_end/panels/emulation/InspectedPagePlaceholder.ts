// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';

import inspectedPagePlaceholderStyles from './inspectedPagePlaceholder.css.js';

let inspectedPagePlaceholderInstance: InspectedPagePlaceholder;

const InspectedPagePlaceholderBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.Widget> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.Widget,
    );

export class InspectedPagePlaceholder extends InspectedPagePlaceholderBase {
  constructor() {
    super({useShadowDom: true});
    this.registerRequiredCSS(inspectedPagePlaceholderStyles);
    this.restoreMinimumSize();
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

  restoreMinimumSize(): void {
    this.setMinimumSize(150, 150);
  }

  clearMinimumSize(): void {
    this.setMinimumSize(1, 1);
  }

  private dipPageRect(): {
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
    const rect = this.dipPageRect();
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
