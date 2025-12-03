// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../kit.js';
import * as Lit from '../../lit/lit.js';
const { html } = Lit;
export function render(container) {
    Lit.render(html `
        <table>
          <tr>
            <th>Icon description</th>
            <th>Icon</th>
          </tr>
          <tr>
            <td>Created through html template with default size and color</td>
            <td>
              <devtools-icon name="select-element"></devtools-icon>
            </td>
          </tr>
          <tr>
            <td>Created through html template with custom size and color</td>
            <td>
              <devtools-icon name="select-element" class="custom-color small"></devtools-icon>
            </td>
          </tr>
        </table>
      `, container);
}
//# sourceMappingURL=Icon.docs.js.map