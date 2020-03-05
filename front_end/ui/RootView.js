// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {VBox} from './Widget.js';

/**
 * @unrestricted
 */
export class RootView extends VBox {
  constructor() {
    super();
    this.markAsRoot();
    this.element.classList.add('root-view');
    this.registerRequiredCSS('ui/rootView.css');
    this.element.setAttribute('spellcheck', false);
  }

  /**
   * @param {!Document} document
   */
  attachToDocument(document) {
    /**************** POWWOW ADDED ****************/
    if (document.defaultView) {
      /**************** POWWOW ADDED ****************/
        document.defaultView.addEventListener('resize', this.doResize.bind(this), false);
        this._window = document.defaultView;
      /**************** POWWOW ADDED ****************/
      } else {
        window.document.addEventListener('BOTTOM_PANE_RESIZE', this.doResize.bind(this), false);
        this._window = document;
      }
      /**************** POWWOW ADDED ****************/
  
      this.doResize();
      /**************** POWWOW REMOVED ****************/
      // this.show(/** @type {!Element} */ (document.body));
      /**************** POWWOW REMOVED ****************/
      
      /**************** POWWOW ADDED ****************/
      if (document.body) {
        let domInspector = document.body.querySelector('#domInspector');
        if(domInspector) {
          this.show(/** @type {!Element} */ domInspector);
        }
      } else {
        this.show(/** @type {!Element} */ (document.body));
      }
      /**************** POWWOW ADDED ****************/
  }

  /**
   * @override
   */
  doResize() {
    if (this._window) {
      const size = this.constraints().minimum;
      const zoom = self.UI.zoomManager.zoomFactor();
      const right = Math.min(0, this._window.innerWidth - size.width / zoom);
      this.element.style.marginRight = right + 'px';
      const bottom = Math.min(0, this._window.innerHeight - size.height / zoom);
      this.element.style.marginBottom = bottom + 'px';
    }
    super.doResize();
  }
}
