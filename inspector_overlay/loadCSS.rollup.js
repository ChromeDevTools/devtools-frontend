// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// WARNING: don't use this rollup plugin outside of inspector_overlay.
// See README for special constraints the overlay has.

module.exports = function loadCSS() {
  return {
    name: 'loadCSS',
    /**
     * @param {!Object} code
     * @param {string} id
     */
    transform(code, id) {
      if (id.endsWith('.css')) {
        return {
          code: `
            const style = new CSSStyleSheet();
            style.replaceSync(${JSON.stringify(code)});
            export default style;
          `,
          map: null
        };
      }
      return;
    }
  };
};
