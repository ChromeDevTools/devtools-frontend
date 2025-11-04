// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Switch } from './switch.js';
export async function render(container) {
    function switchExample({ checked, disabled }) {
        const example = document.createElement('div');
        example.style.marginTop = '20px';
        const explanation = document.createElement('div');
        const disabledExplanation = document.createElement('div');
        const component = new Switch.Switch();
        component.checked = checked;
        component.disabled = disabled;
        explanation.textContent = `is checked? ${component.checked}`;
        disabledExplanation.textContent = `is disabled? ${component.disabled}`;
        component.addEventListener(Switch.SwitchChangeEvent.eventName, ev => {
            explanation.textContent = `is checked? ${ev.checked}`;
        });
        example.appendChild(component);
        example.appendChild(explanation);
        example.appendChild(disabledExplanation);
        return example;
    }
    // Basic
    container.appendChild(switchExample({ checked: false, disabled: false }));
    // Already checked
    container.appendChild(switchExample({ checked: true, disabled: false }));
    // Disabled
    container.appendChild(switchExample({ checked: false, disabled: true }));
    // Disabled & checked
    container.appendChild(switchExample({ checked: true, disabled: true }));
}
//# sourceMappingURL=Switch.docs.js.map