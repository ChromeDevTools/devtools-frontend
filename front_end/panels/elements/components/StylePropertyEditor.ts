// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../../ui/lit/lit.js';
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
  /**
   * @description Label for the dense checkbox in the grid-auto-flow editor.
   */
  denseLabel: 'Dense',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/StylePropertyEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {classMap} = Directives;

declare global {
  interface HTMLElementEventMap {
    propertyselected: PropertySelectedEvent;
    propertydeselected: PropertyDeselectedEvent;
  }
}

export interface EditableProperty {
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

export interface ViewInput {
  authoredProperties: Map<string, string>;
  computedProperties: Map<string, string>;
  editableProperties: EditableProperty[];
  containerClass?: string;
  findIcon: (query: string) => IconInfo | null;
  onButtonClick: (propertyName: string, propertyValue: string, selected: boolean) => void;
  onDenseCheckboxChange: (checked: boolean, isRow: boolean, isColumn: boolean) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function renderButton(
    input: ViewInput,
    propertyValue: string,
    propertyName: string,
    selected = false,
    ): LitTemplate {
  const query = `${propertyName}: ${propertyValue}`;
  const iconInfo = input.findIcon(query);
  if (!iconInfo) {
    throw new Error(`Icon for ${query} is not found`);
  }
  const transform = `transform: rotate(${iconInfo.rotate}deg) scale(${iconInfo.scaleX}, ${iconInfo.scaleY})`;
  const classes = classMap({
    button: true,
    selected,
  });
  const values = {propertyName, propertyValue};
  const title = selected ? i18nString(UIStrings.deselectButton, values) : i18nString(UIStrings.selectButton, values);
  return html`
    <button title=${title}
            class=${classes}
            jslog=${VisualLogging.item().track({click: true, resize: true}).context(`${propertyName}-${propertyValue}`)}
            @click=${() => input.onButtonClick(propertyName, propertyValue, selected)}>
      <devtools-icon style=${transform} name=${iconInfo.iconName}>
      </devtools-icon>
    </button>
  `;
}

function renderGridAutoFlowProperty(
    input: ViewInput,
    prop: EditableProperty,
    shownValue: string|undefined,
    classes: ReturnType<typeof classMap>,
    ): LitTemplate {
  const authoredValue = input.authoredProperties.get(prop.propertyName);

  const isDense = authoredValue === 'dense' || authoredValue === 'row dense' || authoredValue === 'column dense';
  const isRow = authoredValue === 'row' || authoredValue === 'row dense';
  const isColumn = authoredValue === 'column' || authoredValue === 'column dense';

  return html`<div class="row">
    <div class="property">
      <span class="property-name">${prop.propertyName}</span>: <span class=${classes}>${shownValue}</span>
    </div>
    <div class="buttons">
      ${renderButton(input, 'row', prop.propertyName, isRow)}
      ${renderButton(input, 'column', prop.propertyName, isColumn)}
      <devtools-checkbox
        .checked=${isDense}
        @change=${
      (e: Event) => input.onDenseCheckboxChange((e.target as UI.UIUtils.CheckboxLabel).checked, isRow, isColumn)}
      >
        ${i18nString(UIStrings.denseLabel)}
      </devtools-checkbox>
    </div>
  </div>`;
}

function renderProperty(input: ViewInput, prop: EditableProperty): LitTemplate {
  const authoredValue = input.authoredProperties.get(prop.propertyName);
  const notAuthored = !authoredValue;
  const shownValue = authoredValue || input.computedProperties.get(prop.propertyName);
  const classes = classMap({
    'property-value': true,
    'not-authored': notAuthored,
  });

  // Special handling for grid-auto-flow with dense checkbox
  if (prop.propertyName === 'grid-auto-flow') {
    return renderGridAutoFlowProperty(input, prop, shownValue, classes);
  }

  return html`<div class="row">
    <div class="property">
      <span class="property-name">${prop.propertyName}</span>: <span class=${classes}>${shownValue}</span>
    </div>
    <div class="buttons">
      ${prop.propertyValues.map(value => renderButton(input, value, prop.propertyName, value === authoredValue))}
    </div>
  </div>`;
}

export const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <style>${stylePropertyEditorStyles}</style>
    <div class="container">
      ${input.editableProperties.map(prop => renderProperty(input, prop))}
    </div>
  `, target, {container: {classes: input.containerClass ? [input.containerClass] : []}});
  // clang-format on
};

export class StylePropertyEditor extends UI.Widget.VBox {
  static get editableProperties(): EditableProperty[] {
    return [];
  }

  protected readonly containerClass: string = '';
  readonly #view: View;
  #authoredProperties = new Map<string, string>();
  #computedProperties = new Map<string, string>();

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  getEditableProperties(): EditableProperty[] {
    return (this.constructor as typeof StylePropertyEditor).editableProperties;
  }

  get authoredProperties(): Map<string, string> {
    return this.#authoredProperties;
  }

  set authoredProperties(authoredProperties: Map<string, string>) {
    if (this.#authoredProperties === authoredProperties) {
      return;
    }
    this.#authoredProperties = authoredProperties;
    this.requestUpdate();
  }

  get computedProperties(): Map<string, string> {
    return this.#computedProperties;
  }

  set computedProperties(computedProperties: Map<string, string>) {
    if (this.#computedProperties === computedProperties) {
      return;
    }
    this.#computedProperties = computedProperties;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      authoredProperties: this.#authoredProperties,
      computedProperties: this.#computedProperties,
      editableProperties: this.getEditableProperties(),
      containerClass: this.containerClass,
      findIcon: (query: string) => this.findIcon(query, this.#computedProperties),
      onButtonClick: this.#onButtonClick.bind(this),
      onDenseCheckboxChange: this.#onDenseCheckboxChange.bind(this),
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  #onDenseCheckboxChange(checked: boolean, isRow: boolean, isColumn: boolean): void {
    const propertyName = 'grid-auto-flow';
    const currentValue = this.#authoredProperties.get(propertyName);

    let newValue = '';
    if (isRow) {
      newValue = checked ? 'row dense' : 'row';
    } else if (isColumn) {
      newValue = checked ? 'column dense' : 'column';
    } else {
      newValue = checked ? 'dense' : '';
    }

    if (currentValue) {
      this.element.dispatchEvent(new PropertyDeselectedEvent(propertyName, currentValue));
    }

    if (newValue) {
      this.element.dispatchEvent(new PropertySelectedEvent(propertyName, newValue));
    }
  }

  #onButtonClick(propertyName: string, propertyValue: string, selected: boolean): void {
    if (propertyName === 'grid-auto-flow') {
      const currentValue = this.#authoredProperties.get(propertyName);
      const isDense = currentValue?.includes('dense') || false;

      if (selected) {
        const newValue = isDense ? 'dense' : '';

        if (currentValue) {
          this.element.dispatchEvent(new PropertyDeselectedEvent(propertyName, currentValue));
        }

        if (newValue) {
          this.element.dispatchEvent(new PropertySelectedEvent(propertyName, newValue));
        }
      } else {
        const newValue = isDense ? `${propertyValue} dense` : propertyValue;

        if (currentValue) {
          this.element.dispatchEvent(new PropertyDeselectedEvent(propertyName, currentValue));
        }

        this.element.dispatchEvent(new PropertySelectedEvent(propertyName, newValue));
      }
    } else if (selected) {
      this.element.dispatchEvent(new PropertyDeselectedEvent(propertyName, propertyValue));
    } else {
      this.element.dispatchEvent(new PropertySelectedEvent(propertyName, propertyValue));
    }
  }

  protected findIcon(_query: string, _computedProperties: Map<string, string>): IconInfo|null {
    return null;
  }
}

export class FlexboxEditor extends StylePropertyEditor {
  static override get editableProperties(): EditableProperty[] {
    return FlexboxEditableProperties;
  }

  protected override readonly containerClass = 'flexbox-editor';

  protected override findIcon(query: string, computedProperties: Map<string, string>): IconInfo|null {
    return findFlexContainerIcon(query, computedProperties);
  }
}

export class GridEditor extends StylePropertyEditor {
  static override get editableProperties(): EditableProperty[] {
    return GridEditableProperties;
  }

  protected override readonly containerClass = 'grid-editor';

  protected override findIcon(query: string, computedProperties: Map<string, string>): IconInfo|null {
    return findGridContainerIcon(query, computedProperties);
  }
}

export class GridLanesEditor extends StylePropertyEditor {
  static override get editableProperties(): EditableProperty[] {
    return GridLanesEditableProperties;
  }

  protected override readonly containerClass = 'grid-lanes-editor';

  protected override findIcon(query: string, computedProperties: Map<string, string>): IconInfo|null {
    return findGridContainerIcon(query, computedProperties);
  }
}

export const FlexboxEditableProperties: Array<{
  propertyName: string,
  propertyValues: string[],
}> =
    [
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
          'wrap-reverse',
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

export const GridEditableProperties: Array<{
  propertyName: string,
  propertyValues: string[],
}> =
    [
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

export const GridLanesEditableProperties: Array<{
  propertyName: string,
  propertyValues: string[],
}> =
    [
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
