// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { UIUtils } from './legacy.js';
export function render(container) {
    const styleElement = document.createElement('style');
    styleElement.textContent = 'fieldset { label { display: block; } }';
    container.appendChild(styleElement);
    function radioExample({ name, tabbable, disabled }) {
        const example = document.createElement('fieldset');
        example.style.marginTop = '20px';
        const legend = document.createElement('legend');
        legend.textContent = name;
        const list = document.createElement('div');
        for (let i = 0; i < 3; ++i) {
            const { label, radio } = UIUtils.createRadioButton(name, `Option #${i + 1}`, name);
            radio.tabIndex = tabbable ? 0 : -1;
            radio.disabled = disabled;
            radio.checked = i === 0;
            list.append(label);
        }
        example.append(legend, list);
        return example;
    }
    // Basic
    container.appendChild(radioExample({ name: 'basic', tabbable: true, disabled: false }));
    // Not tab reachable
    container.appendChild(radioExample({ name: 'not-table-reachable', tabbable: false, disabled: false }));
    // Disabled
    container.appendChild(radioExample({ name: 'disabled', tabbable: true, disabled: true }));
}
//# sourceMappingURL=RadioButton.docs.js.map