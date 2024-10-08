// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import {findFlexContainerIcon, findGridContainerIcon, type IconInfo} from './CSSPropertyIconResolver.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/StylePropertyEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html, Directives} = LitHtml;

declare global {
  interface HTMLElementEventMap {
    'propertyselected': PropertySelectedEvent;
    'propertydeselected': PropertyDeselectedEvent;
  }
}

interface FlexEditorData {
  authoredProperties: Map<string, string>;
  computedProperties: Map<string, string>;
}

interface EditableProperty {
  propertyName: string;
  propertyValues: string[];
}

export class PropertySelectedEvent extends Event {
  static readonly eventName = 'propertyselected';
  data: {name: string, value: string};

  constructor(name: string, value: string) {
    super(PropertySelectedEvent.eventName, {});
    this.data = {name, value};
  }
}

export class PropertyDeselectedEvent extends Event {
  static readonly eventName = 'propertydeselected';
  data: {name: string, value: string};

  constructor(name: string, value: string) {
    super(PropertyDeselectedEvent.eventName, {});
    this.data = {name, value};
  }
}

export class StylePropertyEditor extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #authoredProperties: Map<string, string> = new Map();
  #computedProperties: Map<string, string> = new Map();
  protected readonly editableProperties: EditableProperty[] = [];

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [stylePropertyEditorStyles];
  }

  getEditableProperties(): EditableProperty[] {
    return this.editableProperties;
  }

  set data(data: FlexEditorData) {
    this.#authoredProperties = data.authoredProperties;
    this.#computedProperties = data.computedProperties;
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="container">
        ${this.editableProperties.map(prop => this.#renderProperty(prop))}
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }

  #renderProperty(prop: EditableProperty): LitHtml.TemplateResult {
    const authoredValue = this.#authoredProperties.get(prop.propertyName);
    const notAuthored = !authoredValue;
    const shownValue = authoredValue || this.#computedProperties.get(prop.propertyName);
    const classes = Directives.classMap({
      'property-value': true,
      'not-authored': notAuthored,
    });
    return html`<div class="row">
      <div class="property">
        <span class="property-name">${prop.propertyName}</span>: <span class=${classes}>${shownValue}</span>
      </div>
      <div class="buttons">
        ${prop.propertyValues.map(value => this.#renderButton(value, prop.propertyName, value === authoredValue))}
      </div>
    </div>`;
  }

  #renderButton(propertyValue: string, propertyName: string, selected: boolean = false): LitHtml.TemplateResult {
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
    const values = {propertyName, propertyValue};
    const title = selected ? i18nString(UIStrings.deselectButton, values) : i18nString(UIStrings.selectButton, values);
    return html`
      <button title=${title}
              class=${classes}
              jslog=${VisualLogging.item().track({click: true}).context(`${propertyName}-${propertyValue}`)}
              @click=${() => this.#onButtonClick(propertyName, propertyValue, selected)}>
        <devtools-icon style=${transform} name=${iconInfo.iconName}>
        </devtools-icon>
      </button>
    `;
  }

  #onButtonClick(propertyName: string, propertyValue: string, selected: boolean): void {
    if (selected) {
      this.dispatchEvent(new PropertyDeselectedEvent(propertyName, propertyValue));
    } else {
      this.dispatchEvent(new PropertySelectedEvent(propertyName, propertyValue));
    }
  }

  protected findIcon(_query: string, _computedProperties: Map<string, string>): IconInfo|null {
    throw new Error('Not implemented');
  }
}

export class FlexboxEditor extends StylePropertyEditor {
  readonly jslogContext = 'cssFlexboxEditor';
  protected override readonly editableProperties: EditableProperty[] = FlexboxEditableProperties;

  protected override findIcon(query: string, computedProperties: Map<string, string>): IconInfo|null {
    return findFlexContainerIcon(query, computedProperties);
  }
}

customElements.define('devtools-flexbox-editor', FlexboxEditor);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-flexbox-editor': FlexboxEditor;
  }
}

export class GridEditor extends StylePropertyEditor {
  readonly jslogContext = 'cssGridEditor';
  protected override readonly editableProperties: EditableProperty[] = GridEditableProperties;

  protected override findIcon(query: string, computedProperties: Map<string, string>): IconInfo|null {
    return findGridContainerIcon(query, computedProperties);
  }
}

customElements.define('devtools-grid-editor', GridEditor);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-grid-editor': GridEditor;
  }
}

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
    propertyName: 'align-content',
    propertyValues: [
      'center',
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
