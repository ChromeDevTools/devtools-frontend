// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import type * as Foundation from '../../foundation/foundation.js';

import rootViewStyles from './rootView.css.js';
import {UniverseRequestEvent} from './UniverseRequestEvent.js';
import {VBox} from './Widget.js';
import {ZoomManager} from './ZoomManager.js';

export class RootView extends VBox {
  private window?: (Window&typeof globalThis)|null;
  readonly #onWindowResize = (): void => this.doResize();
  constructor(universe: Foundation.Universe.Universe) {
    super();
    this.markAsRoot();
    this.element.classList.add('root-view');
    this.registerRequiredCSS(rootViewStyles);
    this.element.setAttribute('spellcheck', 'false');
    this.element.addEventListener(UniverseRequestEvent.eventName, (event: UniverseRequestEvent) => {
      event.universe = universe;
      event.stopPropagation();
    });
  }

  attachToDocument(document: Document): void {
    this.window?.removeEventListener('resize', this.#onWindowResize, false);
    this.window = document.defaultView;
    this.window?.addEventListener('resize', this.#onWindowResize, false);
    this.doResize();
    this.show(document.body);
  }

  override onDetach(): void {
    this.window?.removeEventListener('resize', this.#onWindowResize, false);
    this.window = null;
    super.onDetach();
  }

  override doResize(): void {
    if (this.window) {
      const size = this.constraints().minimum;
      const zoom = ZoomManager.instance().zoomFactor();
      const right = Math.min(0, this.window.innerWidth - size.width / zoom);
      this.element.style.marginRight = right + 'px';
      const bottom = Math.min(0, this.window.innerHeight - size.height / zoom);
      this.element.style.marginBottom = bottom + 'px';
    }
    super.doResize();
  }
}
