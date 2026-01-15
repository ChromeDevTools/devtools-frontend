// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/kit/kit.js';
import '../../../ui/legacy/legacy.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Input from '../../../ui/components/input/input.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { findFlexContainerIcon, findGridContainerIcon } from './CSSPropertyIconResolver.js';
import stylePropertyEditorStyles from './stylePropertyEditor.css.js';
const UIStrings = {
    /**
     * @description Title of the button that selects a flex property.
     * @example {flex-direction} propertyName
     * @example {column} propertyValue
     */
    selectButton: 'Add {propertyName}: {propertyValue}',
    /**
     * @description Title of the button that deselects a flex property.
     * @example {flex-direction} propertyName
     * @example {row} propertyValue
     */
    deselectButton: 'Remove {propertyName}: {propertyValue}',
    /**
     * @description Label for the dense checkbox in the grid-auto-flow editor.
     */
    denseLabel: 'Dense',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/StylePropertyEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html, Directives } = Lit;
export class PropertySelectedEvent extends Event {
    static eventName = 'propertyselected';
    data;
    constructor(name, value) {
        super(PropertySelectedEvent.eventName, {});
        this.data = { name, value };
    }
}
export class PropertyDeselectedEvent extends Event {
    static eventName = 'propertydeselected';
    data;
    constructor(name, value) {
        super(PropertyDeselectedEvent.eventName, {});
        this.data = { name, value };
    }
}
export class StylePropertyEditor extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #authoredProperties = new Map();
    #computedProperties = new Map();
    editableProperties = [];
    getEditableProperties() {
        return this.editableProperties;
    }
    set data(data) {
        this.#authoredProperties = data.authoredProperties;
        this.#computedProperties = data.computedProperties;
        this.#render();
    }
    #render() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${stylePropertyEditorStyles}</style>
      <style>${Input.checkboxStyles}</style>
      <div class="container">
        ${this.editableProperties.map(prop => this.#renderProperty(prop))}
      </div>
    `, this.#shadow, {
            host: this,
        });
        // clang-format on
    }
    #renderProperty(prop) {
        const authoredValue = this.#authoredProperties.get(prop.propertyName);
        const notAuthored = !authoredValue;
        const shownValue = authoredValue || this.#computedProperties.get(prop.propertyName);
        const classes = Directives.classMap({
            'property-value': true,
            'not-authored': notAuthored,
        });
        // Special handling for grid-auto-flow with dense checkbox
        if (prop.propertyName === 'grid-auto-flow') {
            return this.#renderGridAutoFlowProperty(prop, shownValue, classes);
        }
        return html `<div class="row">
      <div class="property">
        <span class="property-name">${prop.propertyName}</span>: <span class=${classes}>${shownValue}</span>
      </div>
      <div class="buttons">
        ${prop.propertyValues.map(value => this.#renderButton(value, prop.propertyName, value === authoredValue))}
      </div>
    </div>`;
    }
    #renderGridAutoFlowProperty(prop, shownValue, classes) {
        const authoredValue = this.#authoredProperties.get(prop.propertyName);
        const isDense = authoredValue === 'dense' || authoredValue === 'row dense' || authoredValue === 'column dense';
        const isRow = authoredValue === 'row' || authoredValue === 'row dense';
        const isColumn = authoredValue === 'column' || authoredValue === 'column dense';
        return html `<div class="row">
      <div class="property">
        <span class="property-name">${prop.propertyName}</span>: <span class=${classes}>${shownValue}</span>
      </div>
      <div class="buttons">
        ${this.#renderButton('row', prop.propertyName, isRow)}
        ${this.#renderButton('column', prop.propertyName, isColumn)}
        <devtools-checkbox
          .checked=${isDense}
          @change=${(e) => this.#onDenseCheckboxChange(e, isRow, isColumn)}
        >
          ${i18nString(UIStrings.denseLabel)}
        </devtools-checkbox>
      </div>
    </div>`;
    }
    #onDenseCheckboxChange(e, isRow, isColumn) {
        const checked = e.target.checked;
        const propertyName = 'grid-auto-flow';
        const currentValue = this.#authoredProperties.get(propertyName);
        let newValue = '';
        if (isRow) {
            newValue = checked ? 'row dense' : 'row';
        }
        else if (isColumn) {
            newValue = checked ? 'column dense' : 'column';
        }
        else {
            newValue = checked ? 'dense' : '';
        }
        if (currentValue) {
            this.dispatchEvent(new PropertyDeselectedEvent(propertyName, currentValue));
        }
        if (newValue) {
            this.dispatchEvent(new PropertySelectedEvent(propertyName, newValue));
        }
    }
    #renderButton(propertyValue, propertyName, selected = false) {
        const query = `${propertyName}: ${propertyValue}`;
        const iconInfo = this.findIcon(query, this.#computedProperties);
        if (!iconInfo) {
            throw new Error(`Icon for ${query} is not found`);
        }
        const transform = `transform: rotate(${iconInfo.rotate}deg) scale(${iconInfo.scaleX}, ${iconInfo.scaleY})`;
        const classes = Directives.classMap({
            button: true,
            selected,
        });
        const values = { propertyName, propertyValue };
        const title = selected ? i18nString(UIStrings.deselectButton, values) : i18nString(UIStrings.selectButton, values);
        return html `
      <button title=${title}
              class=${classes}
              jslog=${VisualLogging.item().track({ click: true }).context(`${propertyName}-${propertyValue}`)}
              @click=${() => this.#onButtonClick(propertyName, propertyValue, selected)}>
        <devtools-icon style=${transform} name=${iconInfo.iconName}>
        </devtools-icon>
      </button>
    `;
    }
    #onButtonClick(propertyName, propertyValue, selected) {
        if (propertyName === 'grid-auto-flow') {
            const currentValue = this.#authoredProperties.get(propertyName);
            const isDense = currentValue?.includes('dense') || false;
            if (selected) {
                const newValue = isDense ? 'dense' : '';
                if (currentValue) {
                    this.dispatchEvent(new PropertyDeselectedEvent(propertyName, currentValue));
                }
                if (newValue) {
                    this.dispatchEvent(new PropertySelectedEvent(propertyName, newValue));
                }
            }
            else {
                const newValue = isDense ? `${propertyValue} dense` : propertyValue;
                if (currentValue) {
                    this.dispatchEvent(new PropertyDeselectedEvent(propertyName, currentValue));
                }
                this.dispatchEvent(new PropertySelectedEvent(propertyName, newValue));
            }
        }
        else if (selected) {
            this.dispatchEvent(new PropertyDeselectedEvent(propertyName, propertyValue));
        }
        else {
            this.dispatchEvent(new PropertySelectedEvent(propertyName, propertyValue));
        }
    }
    findIcon(_query, _computedProperties) {
        throw new Error('Not implemented');
    }
}
export class FlexboxEditor extends StylePropertyEditor {
    jslogContext = 'cssFlexboxEditor';
    editableProperties = FlexboxEditableProperties;
    findIcon(query, computedProperties) {
        return findFlexContainerIcon(query, computedProperties);
    }
}
customElements.define('devtools-flexbox-editor', FlexboxEditor);
export class GridEditor extends StylePropertyEditor {
    jslogContext = 'cssGridEditor';
    editableProperties = GridEditableProperties;
    findIcon(query, computedProperties) {
        return findGridContainerIcon(query, computedProperties);
    }
}
customElements.define('devtools-grid-editor', GridEditor);
export class GridLanesEditor extends StylePropertyEditor {
    jslogContext = 'cssGridLanesEditor';
    editableProperties = GridLanesEditableProperties;
    findIcon(query, computedProperties) {
        return findGridContainerIcon(query, computedProperties);
    }
}
customElements.define('devtools-grid-lanes-editor', GridLanesEditor);
export const FlexboxEditableProperties = [
    {
        propertyName: 'flex-direction',
        propertyValues: [
            'row',
            'column',
            'row-reverse',
            'column-reverse',
        ],
    },
    {
        propertyName: 'flex-wrap',
        propertyValues: [
            'nowrap',
            'wrap',
        ],
    },
    {
        propertyName: 'align-content',
        propertyValues: [
            'center',
            'flex-start',
            'flex-end',
            'space-around',
            'space-between',
            'stretch',
        ],
    },
    {
        propertyName: 'justify-content',
        propertyValues: [
            'center',
            'flex-start',
            'flex-end',
            'space-between',
            'space-around',
            'space-evenly',
        ],
    },
    {
        propertyName: 'align-items',
        propertyValues: [
            'center',
            'flex-start',
            'flex-end',
            'stretch',
            'baseline',
        ],
    },
];
export const GridEditableProperties = [
    {
        propertyName: 'grid-auto-flow',
        propertyValues: [
            'row',
            'column',
        ],
    },
    {
        propertyName: 'align-content',
        propertyValues: [
            'center',
            'start',
            'end',
            'space-between',
            'space-around',
            'space-evenly',
            'stretch',
        ],
    },
    {
        propertyName: 'justify-content',
        propertyValues: [
            'center',
            'start',
            'end',
            'space-between',
            'space-around',
            'space-evenly',
            'stretch',
        ],
    },
    {
        propertyName: 'align-items',
        propertyValues: [
            'center',
            'start',
            'end',
            'stretch',
            'baseline',
        ],
    },
    {
        propertyName: 'justify-items',
        propertyValues: [
            'center',
            'start',
            'end',
            'stretch',
        ],
    },
];
export const GridLanesEditableProperties = [
    {
        propertyName: 'align-content',
        propertyValues: [
            'center',
            'start',
            'end',
            'space-between',
            'space-around',
            'space-evenly',
            'stretch',
        ],
    },
    {
        propertyName: 'justify-content',
        propertyValues: [
            'center',
            'start',
            'end',
            'space-between',
            'space-around',
            'space-evenly',
            'stretch',
        ],
    },
    {
        propertyName: 'align-items',
        propertyValues: [
            'center',
            'start',
            'end',
            'stretch',
        ],
    },
    {
        propertyName: 'justify-items',
        propertyValues: [
            'center',
            'start',
            'end',
            'stretch',
        ],
    },
];
//# sourceMappingURL=StylePropertyEditor.js.map