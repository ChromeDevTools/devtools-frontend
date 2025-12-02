// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../kit.js';
import * as Lit from '../../lit/lit.js';
const { html } = Lit;
export function render(container) {
    // We should stop the click as we have the wiring only in a
    // full DevTools env
    Lit.render(html `<devtools-link @click=${(ev) => ev.consume()}>I am a link</devtools-link>`, container);
}
//# sourceMappingURL=Link.docs.js.map