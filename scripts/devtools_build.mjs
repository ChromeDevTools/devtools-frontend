// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Representation of the feature set that is configured for Chrome. This
 * keeps track of enabled and disabled features and generates the correct
 * combination of `--enable-features` / `--disable-features` command line
 * flags.
 *
 * There are unit tests for this in `./devtools_build.test.mjs`.
 */
export class FeatureSet {
  #disabled = new Set();
  #enabled = new Map();

  /**
   * Disables the given `feature`.
   *
   * @param {string} feature the name of the feature to disable.
   */
  disable(feature) {
    this.#disabled.add(feature);
    this.#enabled.delete(feature);
  }

  /**
   * Enables the given `feature`, and optionally adds the `parameters` to it.
   * For example:
   * ```js
   * featureSet.enable('DevToolsFreestyler', {patching: true});
   * ```
   * The parameters are additive.
   *
   * @param {string} feature the name of the feature to enable.
   * @param {object} parameters the additional parameters to pass to it, in
   *                            the form of key/value pairs.
   */
  enable(feature, parameters = {}) {
    this.#disabled.delete(feature);
    if (!this.#enabled.has(feature)) {
      this.#enabled.set(feature, Object.create(null));
    }
    for (const [key, value] of Object.entries(parameters)) {
      this.#enabled.get(feature)[key] = value;
    }
  }

  /**
   * Merge the other `featureSet` into this.
   *
   * @param featureSet the other `FeatureSet` to apply.
   */
  merge(featureSet) {
    for (const feature of featureSet.#disabled) {
      this.disable(feature);
    }
    for (const [feature, parameters] of featureSet.#enabled) {
      this.enable(feature, parameters);
    }
  }

  /**
   * Yields the command line parameters to pass to the invocation of
   * a Chrome binary for achieving the state of the feature set.
   */
  * [Symbol.iterator]() {
    const disabledFeatures = [...this.#disabled];
    if (disabledFeatures.length) {
      yield `--disable-features=${disabledFeatures.sort().join(',')}`;
    }
    const enabledFeatures = [...this.#enabled].map(([feature, parameters]) => {
      parameters = Object.entries(parameters);
      if (parameters.length) {
        parameters = parameters.map(([key, value]) => `${key}/${value}`);
        feature = `${feature}:${parameters.sort().join('/')}`;
      }
      return feature;
    });
    if (enabledFeatures.length) {
      yield `--enable-features=${enabledFeatures.sort().join(',')}`;
    }
  }

  static parse(text) {
    const features = [];
    for (const str of text.split(',')) {
      const parts = str.split(':');
      if (parts.length < 1 || parts.length > 2) {
        throw new Error(`Invalid feature declaration '${str}'`);
      }
      const feature = parts[0];
      const parameters = Object.create(null);
      if (parts.length > 1) {
        const args = parts[1].split('/');
        if (args.length % 2 !== 0) {
          throw new Error(`Invalid parameters '${parts[1]}' for feature ${feature}`);
        }
        for (let i = 0; i < args.length; i += 2) {
          const key = args[i + 0];
          const value = args[i + 1];
          parameters[key] = value;
        }
      }
      features.push({feature, parameters});
    }
    return features;
  }
}
