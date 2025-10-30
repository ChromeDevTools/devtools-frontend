// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import rootViewStyles from './rootView.css.js';
import { VBox } from './Widget.js';
import { ZoomManager } from './ZoomManager.js';
export class RootView extends VBox {
    window;
    constructor() {
        super();
        this.markAsRoot();
        this.element.classList.add('root-view');
        this.registerRequiredCSS(rootViewStyles);
        this.element.setAttribute('spellcheck', 'false');
    }
    attachToDocument(document) {
        if (document.defaultView) {
            document.defaultView.addEventListener('resize', this.doResize.bind(this), false);
        }
        this.window = document.defaultView;
        this.doResize();
        this.show(document.body);
    }
    doResize() {
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
//# sourceMappingURL=RootView.js.map