// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import { ViewManager } from './ViewManager.js';
import { VBox } from './Widget.js';
export class SimpleView extends VBox {
    #title;
    #viewId;
    /**
     * Constructs a new `SimpleView` with the given `options`.
     *
     * @param options the settings for the resulting view.
     * @throws TypeError - if `options.viewId` is not in extended kebab case.
     */
    constructor(options) {
        super(options);
        this.#title = options.title;
        this.#viewId = options.viewId;
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