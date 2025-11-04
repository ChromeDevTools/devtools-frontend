// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { UIUtils } from './legacy.js';
export async function render(container) {
    function sliderExample({ min, max, tabIndex, disabled }) {
        const example = document.createElement('div');
        example.style.marginTop = '20px';
        const minExplanation = document.createElement('div');
        const maxExplanation = document.createElement('div');
        const valueExplanation = document.createElement('div');
        const disabledExplanation = document.createElement('div');
        const tabbableExplanation = document.createElement('div');
        const component = UIUtils.createSlider(min, max, tabIndex);
        component.disabled = disabled;
        minExplanation.textContent = `min: ${min}`;
        maxExplanation.textContent = `max: ${max}`;
        valueExplanation.textContent = `value: ${component.value}`;
        disabledExplanation.textContent = `is disabled? ${component.disabled}`;
        tabbableExplanation.textContent = `is tabbable? ${component.tabIndex >= 0}`;
        component.addEventListener('change', () => {
            valueExplanation.textContent = `value: ${component.value}`;
        });
        example.appendChild(component);
        example.appendChild(minExplanation);
        example.appendChild(maxExplanation);
        example.appendChild(valueExplanation);
        example.appendChild(disabledExplanation);
        example.appendChild(tabbableExplanation);
        return example;
    }
    // Basic
    container.appendChild(sliderExample({ min: 0, max: 100, tabIndex: 0, disabled: false }));
    // Not tab reachable
    container.appendChild(sliderExample({ min: 0, max: 100, tabIndex: -1, disabled: false }));
    // Disabled
    container.appendChild(sliderExample({ min: 0, max: 100, tabIndex: 0, disabled: true }));
}
//# sourceMappingURL=Slider.docs.js.map