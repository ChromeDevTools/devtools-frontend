// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import { ViewManager } from './ViewManager.js';
import { VBox } from './Widget.js';
export class SimpleView extends VBox {
    #title;
    #viewId;
    constructor(elementOrOptions, options) {
        // @ts-expect-error
        super(elementOrOptions, options);
        const optionsObj = (elementOrOptions instanceof HTMLElement ? options : elementOrOptions);
        this.#title = optionsObj.title;
        this.#viewId = optionsObj.viewId;
        if (!Platform.StringUtilities.isExtendedKebabCase(this.#viewId)) {
            throw new TypeError(`Invalid view ID '${this.#viewId}'`);
        }
    }
    viewId() {
        return this.#viewId;
    }
    title() {
        return this.#title;
    }
    isCloseable() {
        return false;
    }
    isTransient() {
        return false;
    }
    toolbarItems() {
        return Promise.resolve([]);
    }
    widget() {
        return Promise.resolve(this);
    }
    revealView() {
        return ViewManager.instance().revealView(this);
    }
    disposeView() {
    }
    isPreviewFeature() {
        return false;
    }
    iconName() {
        return undefined;
    }
}
//# sourceMappingURL=View.js.map