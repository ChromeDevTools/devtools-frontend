// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';

/**
 * Lazily loads the vscode.web-custom-data/browser.css-data.json and allows
 * lookup by property name.
 *
 * The class intentionally doesn't return any promise to the loaded data.
 * Otherwise clients would need to Promise.race against a timeout to handle
 * the case where the data is not yet available.
 */
export class WebCustomData {
  #data = new Map<string, CSSProperty>();

  /** The test actually needs to wait for the result */
  readonly fetchPromiseForTest: Promise<unknown>;

  constructor(remoteBase: string) {
    if (!remoteBase) {
      this.fetchPromiseForTest = Promise.resolve();
      return;
    }
    this.fetchPromiseForTest = fetch(`${remoteBase}third_party/vscode.web-custom-data/browsers.css-data.json`)
                                   .then(response => response.json())
                                   .then((json: CSSBrowserData) => {
                                     for (const property of json.properties) {
                                       this.#data.set(property.name, property);
                                     }
                                   })
                                   .catch();
  }

  /**
   * Creates a fresh `WebCustomData` instance using the standard
   * DevTools remote base.
   * Throws if no valid remoteBase was found.
   */
  static create(): WebCustomData {
    const remoteBase = Root.Runtime.getRemoteBase();
    // Silently skip loading of the CSS data if remoteBase is not set properly.
    return new WebCustomData(remoteBase?.base ?? '');
  }

  /**
   * Returns the documentation for the CSS property `name` or `undefined` if
   * no such property is documented. Also returns `undefined` if data hasn't
   * finished loading or failed to load.
   */
  findCssProperty(name: string): CSSProperty|undefined {
    return this.#data.get(name);
  }
}

interface CSSBrowserData {
  properties: CSSProperty[];
}

export interface CSSProperty {
  name: string;
  description?: string;
  syntax?: string;
  references?: Array<{
    name: string,
    url: string,
  }>;
}
