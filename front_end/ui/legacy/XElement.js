// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class XElement extends HTMLElement {
    static get observedAttributes() {
        return [
            'flex', 'padding', 'padding-top', 'padding-bottom', 'padding-left',
            'padding-right', 'margin', 'margin-top', 'margin-bottom', 'margin-left',
            'margin-right', 'overflow', 'overflow-x', 'overflow-y', 'font-size',
            'color', 'background', 'background-color', 'border', 'border-top',
            'border-bottom', 'border-left', 'border-right', 'max-width', 'max-height',
        ];
    }
    attributeChangedCallback(attr, _oldValue, newValue) {
        if (attr === 'flex') {
            if (newValue === null) {
                this.style.removeProperty('flex');
            }
            else if (newValue === 'initial' || newValue === 'auto' || newValue === 'none' || newValue.indexOf(' ') !== -1) {
                this.style.setProperty('flex', newValue);
            }
            else {
                this.style.setProperty('flex', '0 0 ' + newValue);
            }
            return;
        }
        if (newValue === null) {
            this.style.removeProperty(attr);
            if (attr.startsWith('padding-') || attr.startsWith('margin-') || attr.startsWith('border-') ||
                attr.startsWith('background-') || attr.startsWith('overflow-')) {
                const shorthand = attr.substring(0, attr.indexOf('-'));
                const shorthandValue = this.getAttribute(shorthand);
                if (shorthandValue !== null) {
                    this.style.setProperty(shorthand, shorthandValue);
                }
            }
        }
        else {
            this.style.setProperty(attr, newValue);
        }
    }
}
//# sourceMappingURL=XElement.js.map