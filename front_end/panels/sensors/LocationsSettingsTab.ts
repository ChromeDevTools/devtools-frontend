// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import locationsSettingsTabStyles from './locationsSettingsTab.css.js';
const {createRef, ref} = Directives;
export {locationsSettingsTabStyles};

const UIStrings = {
  /**
   * @description Title in the Locations settings tab, where custom geographic locations that the user
   * has entered are stored.
   */
  locations: 'Locations',
  /**
   * @description Label for the name of a geographic location that the user has entered.
   */
  locationName: 'Location name',
  /**
   * @description Abbreviation of latitude in the Locations settings tab of the Device toolbar.
   */
  lat: 'Lat',
  /**
   * @description Abbreviation of longitude in the Locations settings tab of the Device toolbar.
   */
  long: 'Long',
  /**
   * @description Text in the Sensors view of the Device toolbar.
   */
  timezoneId: 'Timezone ID',
  /**
   * @description Label for text input for the locale of a particular location.
   */
  locale: 'Locale',
  /**
   * @description Label for text input for the latitude of a GPS position.
   */
  latitude: 'Latitude',
  /**
   * @description Label for text input for the longitude of a GPS position.
   */
  longitude: 'Longitude',
  /**
   * @description Label for text input for the accuracy of a GPS position.
   */
  accuracy: 'Accuracy',
  /**
   * @description Error message in the Locations settings tab that declares the location name input must not be empty.
   */
  locationNameCannotBeEmpty: 'Location name can’t be empty',
  /**
   * @description Error message in the Locations settings tab that declares the maximum length of the location name.
   * @example {50} PH1
   */
  locationNameMustBeLessThanS: 'Location name must be less than {PH1} characters',
  /**
   * @description Error message in the Locations settings tab that declares that the value for the latitude input must be a number.
   */
  latitudeMustBeANumber: 'Latitude must be a number',
  /**
   * @description Error message in the Locations settings tab that declares the minimum value for the latitude input.
   * @example {-90} PH1
   */
  latitudeMustBeGreaterThanOrEqual: 'Latitude must be greater than or equal to {PH1}',
  /**
   * @description Error message in the Locations settings tab that declares the maximum value for the latitude input.
   * @example {90} PH1
   */
  latitudeMustBeLessThanOrEqualToS: 'Latitude must be less than or equal to {PH1}',
  /**
   * @description Error message in the Locations settings tab that declares that the value for the longitude input must be a number.
   */
  longitudeMustBeANumber: 'Longitude must be a number',
  /**
   * @description Error message in the Locations settings tab that declares the minimum value for the longitude input.
   * @example {-180} PH1
   */
  longitudeMustBeGreaterThanOr: 'Longitude must be greater than or equal to {PH1}',
  /**
   * @description Error message in the Locations settings tab that declares the maximum value for the longitude input.
   * @example {180} PH1
   */
  longitudeMustBeLessThanOrEqualTo: 'Longitude must be less than or equal to {PH1}',
  /**
   * @description Error message in the Locations settings tab that declares timezone ID input invalid.
   */
  timezoneIdMustContainAlphabetic: 'Timezone ID must contain alphabetic characters',
  /**
   * @description Error message in the Locations settings tab that declares locale input invalid.
   */
  localeMustContainAlphabetic: 'Locale must contain alphabetic characters',
  /**
   * @description Error message in the Locations settings tab that declares that the value for the accuracy input must be a number.
   */
  accuracyMustBeANumber: 'Accuracy must be a number',
  /**
   * @description Error message in the Locations settings tab that declares the minimum value for the accuracy input.
   * @example {0} PH1
   */
  accuracyMustBeGreaterThanOrEqual: 'Accuracy must be greater than or equal to {PH1}',
  /**
   * @description Text of add locations button in the Locations settings tab of the Device toolbar.
   */
  addLocation: 'Add location',
  /**
   * @description Title for the dialog when editing an existing location in the Locations settings tab.
   */
  editLocation: 'Edit location',
  /**
   * @description Label for button to save location changes.
   */
  save: 'Save',
  /**
   * @description Label for button to cancel location edits.
   */
  cancel: 'Cancel',
  /**
   * @description Label for button to close the location dialog.
   */
  close: 'Close',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sensors/LocationsSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function renderItemView(location: LocationDescription): LitTemplate {
  // clang-format off
  return html`
    <div class="locations-list-item" role="row">
      <div class="locations-list-text locations-list-title" role="cell">
        <div class="locations-list-title-text" title=${location.title}>${location.title}</div>
      </div>
      <div class="locations-list-separator"></div>
      <div class="locations-list-text" role="cell">${location.lat}</div>
      <div class="locations-list-separator"></div>
      <div class="locations-list-text" role="cell">${location.long}</div>
      <div class="locations-list-separator"></div>
      <div class="locations-list-text" role="cell">${location.timezoneId}</div>
      <div class="locations-list-separator"></div>
      <div class="locations-list-text" role="cell">${location.locale}</div>
      <div class="locations-list-separator"></div>
      <div class="locations-list-text" role="cell">${
          location.accuracy ?? SDK.EmulationModel.Location.DEFAULT_ACCURACY}</div>
    </div>`;
  // clang-format on
}

export interface EditorInputControls {
  titleInput: LitTemplate|Element;
  latInput: LitTemplate|Element;
  longInput: LitTemplate|Element;
  timezoneIdInput: LitTemplate|Element;
  localeInput: LitTemplate|Element;
  accuracyInput: LitTemplate|Element;
}

export interface LocationDialogInput {
  location: LocationDescription;
  isNew: boolean;
  errors?: {
    title?: string|null,
    lat?: string|null,
    long?: string|null,
    timezoneId?: string|null,
    locale?: string|null,
    accuracy?: string|null,
  };
  onSave: (location: LocationDescription) => void;
  onCancel: () => void;
  onValidateErrors: (errors: {
    title?: string|null,
    lat?: string|null,
    long?: string|null,
    timezoneId?: string|null,
    locale?: string|null,
    accuracy?: string|null,
  }) => void;
}

export function renderEditorView(controls: EditorInputControls, errors?: LocationDialogInput['errors'],
                                 isDialog = false): LitTemplate {
  if (!isDialog) {
    // clang-format off
    return html`
      <div class="locations-edit-row">
        <div class="locations-list-text locations-list-title">${i18nString(UIStrings.locationName)}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text">${i18nString(UIStrings.lat)}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text">${i18nString(UIStrings.long)}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text">${i18nString(UIStrings.timezoneId)}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text">${i18nString(UIStrings.locale)}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text">${i18nString(UIStrings.accuracy)}</div>
      </div>
      <div class="locations-edit-row">
        <div class="locations-list-text locations-list-title locations-input-container">${controls.titleInput}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text locations-input-container">${controls.latInput}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text locations-list-text-longitude locations-input-container">${controls.longInput}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text locations-input-container">${controls.timezoneIdInput}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text locations-input-container">${controls.localeInput}</div>
        <div class="locations-list-separator locations-list-separator-invisible"></div>
        <div class="locations-list-text locations-input-container">${controls.accuracyInput}</div>
      </div>
      ${errors ? html`
        <div class="locations-edit-row locations-error-row" role="alert">
          <div class="locations-list-text locations-list-title locations-error-cell">${errors.title ?? nothing}</div>
          <div class="locations-list-separator locations-list-separator-invisible"></div>
          <div class="locations-list-text locations-error-cell">${errors.lat ?? nothing}</div>
          <div class="locations-list-separator locations-list-separator-invisible"></div>
          <div class="locations-list-text locations-list-text-longitude locations-error-cell">${errors.long ?? nothing}</div>
          <div class="locations-list-separator locations-list-separator-invisible"></div>
          <div class="locations-list-text locations-error-cell">${errors.timezoneId ?? nothing}</div>
          <div class="locations-list-separator locations-list-separator-invisible"></div>
          <div class="locations-list-text locations-error-cell">${errors.locale ?? nothing}</div>
          <div class="locations-list-separator locations-list-separator-invisible"></div>
          <div class="locations-list-text locations-error-cell">${errors.accuracy ?? nothing}</div>
        </div>
      ` : nothing}`;
    // clang-format on
  }

  // clang-format off
  return html`
    <div class="editor-grid">
      <div class="editor-field editor-field-full-width ${errors?.title ? 'has-error' : ''}">
        <label class="editor-field-label" for="location-title">${i18nString(UIStrings.locationName)}</label>
        ${controls.titleInput}
        ${errors?.title ? html`<div class="editor-field-error" role="alert">${errors.title}</div>` : nothing}
      </div>
      <div class="editor-field ${errors?.lat ? 'has-error' : ''}">
        <label class="editor-field-label" for="location-lat">${i18nString(UIStrings.lat)}</label>
        ${controls.latInput}
        ${errors?.lat ? html`<div class="editor-field-error" role="alert">${errors.lat}</div>` : nothing}
      </div>
      <div class="editor-field ${errors?.long ? 'has-error' : ''}">
        <label class="editor-field-label" for="location-long">${i18nString(UIStrings.long)}</label>
        ${controls.longInput}
        ${errors?.long ? html`<div class="editor-field-error" role="alert">${errors.long}</div>` : nothing}
      </div>
      <div class="editor-field ${errors?.timezoneId ? 'has-error' : ''}">
        <label class="editor-field-label" for="location-timezone">${i18nString(UIStrings.timezoneId)}</label>
        ${controls.timezoneIdInput}
        ${errors?.timezoneId ? html`<div class="editor-field-error" role="alert">${errors.timezoneId}</div>` : nothing}
      </div>
      <div class="editor-field ${errors?.locale ? 'has-error' : ''}">
        <label class="editor-field-label" for="location-locale">${i18nString(UIStrings.locale)}</label>
        ${controls.localeInput}
        ${errors?.locale ? html`<div class="editor-field-error" role="alert">${errors.locale}</div>` : nothing}
      </div>
      <div class="editor-field editor-field-full-width ${errors?.accuracy ? 'has-error' : ''}">
        <label class="editor-field-label" for="location-accuracy">${i18nString(UIStrings.accuracy)}</label>
        ${controls.accuracyInput}
        ${errors?.accuracy ? html`<div class="editor-field-error" role="alert">${errors.accuracy}</div>` : nothing}
      </div>
    </div>
  `;
  // clang-format on
}

export function renderLocationDialog(input: LocationDialogInput, target: HTMLElement): void {
  const titleInputRef = createRef<HTMLInputElement>();
  const latInputRef = createRef<HTMLInputElement>();
  const longInputRef = createRef<HTMLInputElement>();
  const timezoneIdInputRef = createRef<HTMLInputElement>();
  const localeInputRef = createRef<HTMLInputElement>();
  const accuracyInputRef = createRef<HTMLInputElement>();

  const handleSave = (): void => {
    const title = titleInputRef.value?.value.trim() ?? '';
    const latStr = latInputRef.value?.value.trim() ?? '';
    const longStr = longInputRef.value?.value.trim() ?? '';
    const timezoneId = timezoneIdInputRef.value?.value.trim() ?? '';
    const locale = localeInputRef.value?.value.trim() ?? '';
    const accuracyStr = accuracyInputRef.value?.value.trim() ?? '';

    const titleError = validateTitle(title);
    const latError = validateLatitude(latStr);
    const longError = validateLongitude(longStr);
    const tzError = validateTimezoneId(timezoneId);
    const localeError = validateLocale(locale);
    const accuracyError = validateAccuracy(accuracyStr);

    if (titleError || latError || longError || tzError || localeError || accuracyError) {
      input.onValidateErrors({
        title: titleError,
        lat: latError,
        long: longError,
        timezoneId: tzError,
        locale: localeError,
        accuracy: accuracyError,
      });
      return;
    }

    input.onSave({
      title,
      lat: latStr ? parseFloat(latStr) : 0,
      long: longStr ? parseFloat(longStr) : 0,
      timezoneId,
      locale,
      accuracy: accuracyStr ? parseFloat(accuracyStr) : SDK.EmulationModel.Location.DEFAULT_ACCURACY,
    });
  };

  const editorControls: EditorInputControls = {
    titleInput:
        html`<input id="location-title" aria-label=${i18nString(UIStrings.locationName)} type="text" placeholder=${
            i18nString(UIStrings.locationName)} .value=${input.location.title} ${ref(titleInputRef)}>`,
    latInput: html`<input id="location-lat" aria-label=${i18nString(UIStrings.lat)} type="text" placeholder=${
        i18nString(UIStrings.latitude)} .value=${String(input.location.lat)} ${ref(latInputRef)}>`,
    longInput: html`<input id="location-long" aria-label=${i18nString(UIStrings.long)} type="text" placeholder=${
        i18nString(UIStrings.longitude)} .value=${String(input.location.long)} ${ref(longInputRef)}>`,
    timezoneIdInput:
        html`<input id="location-timezone" aria-label=${i18nString(UIStrings.timezoneId)} type="text" placeholder=${
            i18nString(UIStrings.timezoneId)} .value=${input.location.timezoneId} ${ref(timezoneIdInputRef)}>`,
    localeInput: html`<input id="location-locale" aria-label=${i18nString(UIStrings.locale)} type="text" placeholder=${
        i18nString(UIStrings.locale)} .value=${input.location.locale} ${ref(localeInputRef)}>`,
    accuracyInput: html`<input id="location-accuracy" aria-label=${
        i18nString(UIStrings.accuracy)} type="text" placeholder=${i18nString(UIStrings.accuracy)} .value=${
        String(input.location.accuracy || SDK.EmulationModel.Location.DEFAULT_ACCURACY)} ${ref(accuracyInputRef)}>`,
  };

  // clang-format off

  const dialogContent = html`
    <style>${locationsSettingsTabStyles}</style>
      <div class="location-dialog-content">
      <div class="dialog-header">
        <span class="dialog-title">${input.isNew ? i18nString(UIStrings.addLocation) : i18nString(UIStrings.editLocation)}</span>
        <devtools-button
          class="dialog-close-button"
          .iconName=${'cross'}
          .variant=${Buttons.Button.Variant.ICON}
          .title=${i18nString(UIStrings.close)}
          .jslogContext=${'dialog-close'}
          @click=${input.onCancel}
          aria-label=${i18nString(UIStrings.close)}>
        </devtools-button>
      </div>
        ${renderEditorView(editorControls, input.errors, true)}
        <div class="dialog-buttons">
          <devtools-button
            class="save-button"
            .variant=${Buttons.Button.Variant.PRIMARY}
            @click=${handleSave}>
            ${i18nString(UIStrings.save)}
          </devtools-button>
          <devtools-button
            class="cancel-button"
            .variant=${Buttons.Button.Variant.OUTLINED}
            @click=${input.onCancel}>
            ${i18nString(UIStrings.cancel)}
          </devtools-button>
        </div>
      </div>
  `;

  // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
  render(html`
    <style>${locationsSettingsTabStyles}</style>
    <devtools-widget
      class="location-dialog-widget"
      ${UI.Widget.widget(UI.Dialog.DialogWidget, {
        open: true,
        jslogContext: 'location-dialog',
        content: dialogContent,
      })}
      @hidden=${input.onCancel}>
    </devtools-widget>
  `, target);
  // clang-format on
}

interface LocationsViewInput {
  onAddLocation: () => void;
}

export type ViewOutput = undefined;

export const DEFAULT_VIEW = (input: LocationsViewInput, _output: ViewOutput, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <style>${locationsSettingsTabStyles}</style>
    <div class="settings-card-container-wrapper">
      <div class="settings-card-container">
        <devtools-card .heading=${i18nString(UIStrings.locations)}>
          <div class="list-container"></div>
          <devtools-button
            class="add-locations-button"
            .variant=${Buttons.Button.Variant.OUTLINED}
            .iconName=${'plus'}
            .jslogContext=${'emulation.add-location'}
            @click=${input.onAddLocation}>
            ${i18nString(UIStrings.addLocation)}
          </devtools-button>
        </devtools-card>
      </div>
    </div>`, target);
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;
export class LocationsSettingsTab extends UI.Widget.VBox implements UI.ListWidget.Delegate<LocationDescription> {
  private readonly list: UI.ListWidget.ListWidget<LocationDescription>;
  private readonly customSetting: Common.Settings.Setting<LocationDescription[]>;
  private editor?: UI.ListWidget.Editor<LocationDescription>;
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {
      jslog: `${VisualLogging.pane('emulation-locations')}`,
      useShadowDom: true,
    });
    this.#view = view;

    this.list = new UI.ListWidget.ListWidget(this, undefined, true);
    this.list.element.classList.add('locations-list');
    this.list.registerRequiredCSS(locationsSettingsTabStyles);
    this.customSetting =
        Common.Settings.Settings.instance().moduleSetting<LocationDescription[]>('emulation.locations');
    const list =
        this.customSetting.get().map(location => replaceLocationTitles(location, this.customSetting.defaultValue));

    function replaceLocationTitles(
        location: LocationDescription, defaultValues: LocationDescription[]): LocationDescription {
      // This check is done for locations that might had been cached wrongly due to crbug.com/1171670.
      // Each of the default values would have been stored without a title if the user had added a new location
      // while the bug was present in the application. This means that getting the setting's default value with the `get`
      // method would return the default locations without a title. To cope with this, the setting values are
      // preemptively checked and corrected so that any default value mistakenly stored without a title is replaced
      // with the corresponding declared value in the pre-registered setting.
      if (!location.title) {
        const replacement = defaultValues.find(
            defaultLocation => defaultLocation.lat === location.lat && defaultLocation.long === location.long &&
                defaultLocation.timezoneId === location.timezoneId && defaultLocation.locale === location.locale);
        if (!replacement) {
          console.error('Could not determine a location setting title');
        } else {
          return replacement;
        }
      }
      return location;
    }

    this.customSetting.set(list);
    this.customSetting.addChangeListener(this.locationsUpdated, this);
  }

  override wasShown(): void {
    super.wasShown();
    this.locationsUpdated();
  }

  override performUpdate(): void {
    const viewInput = {
      onAddLocation: () => this.addButtonClicked(),
    };
    this.#view(viewInput, undefined, this.contentElement as HTMLElement);

    const listContainer = this.contentElement.querySelector('.list-container');
    if (listContainer) {
      this.list.show(listContainer);
    }
  }
  private locationsUpdated(): void {
    this.list.clear();

    const conditions = this.customSetting.get();
    for (const condition of conditions) {
      this.list.appendItem(condition, true);
    }

    this.list.appendSeparator();
    this.requestUpdate();
  }

  private addButtonClicked(): void {
    this.list.addNewItem(this.customSetting.get().length, {
      title: '',
      lat: 0,
      long: 0,
      timezoneId: '',
      locale: '',
      accuracy: SDK.EmulationModel.Location.DEFAULT_ACCURACY,
    });
  }

  renderItem(location: LocationDescription, _editable: boolean): Element {
    const fragment = document.createDocumentFragment();
    // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
    render(renderItemView(location), fragment);
    return fragment.firstElementChild as Element;
  }

  removeItemRequested(_item: LocationDescription, index: number): void {
    const list = this.customSetting.get();
    list.splice(index, 1);
    this.customSetting.set(list);
  }

  commitEdit(location: LocationDescription, editor: UI.ListWidget.Editor<LocationDescription>, isNew: boolean): void {
    location.title = editor.control('title').value.trim();
    const lat = editor.control('lat').value.trim();
    location.lat = lat ? parseFloat(lat) : 0;
    const long = editor.control('long').value.trim();
    location.long = long ? parseFloat(long) : 0;
    const timezoneId = editor.control('timezone-id').value.trim();
    location.timezoneId = timezoneId;
    const locale = editor.control('locale').value.trim();
    location.locale = locale;
    const accuracy = editor.control('accuracy').value.trim();
    location.accuracy = accuracy ? parseFloat(accuracy) : SDK.EmulationModel.Location.DEFAULT_ACCURACY;

    const list = this.customSetting.get();
    if (isNew) {
      list.push(location);
    }
    this.customSetting.set(list);
  }

  beginEdit(location: LocationDescription): UI.ListWidget.Editor<LocationDescription> {
    const editor = this.createEditor();
    editor.control('title').value = location.title;
    editor.control('lat').value = String(location.lat);
    editor.control('long').value = String(location.long);
    editor.control('timezone-id').value = location.timezoneId;
    editor.control('locale').value = location.locale;
    editor.control('accuracy').value = String(location.accuracy ?? SDK.EmulationModel.Location.DEFAULT_ACCURACY);
    return editor;
  }

  private createEditor(): UI.ListWidget.Editor<LocationDescription> {
    if (this.editor) {
      return this.editor;
    }

    const editor = new UI.ListWidget.Editor<LocationDescription>();
    this.editor = editor;
    const content = editor.contentElement();

    const createValidator = (validator: (value: string) => string | null) =>
        (_item: LocationDescription, _index: number,
         input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult => {
          const errorMessage = validator(input.value);
          if (errorMessage) {
            return {valid: false, errorMessage};
          }
          return {valid: true};
        };

    const titleInput =
        editor.createInput('title', 'text', i18nString(UIStrings.locationName), createValidator(validateTitle));
    const latInput =
        editor.createInput('lat', 'text', i18nString(UIStrings.latitude), createValidator(validateLatitude));
    const longInput =
        editor.createInput('long', 'text', i18nString(UIStrings.longitude), createValidator(validateLongitude));
    const timezoneIdInput = editor.createInput('timezone-id', 'text', i18nString(UIStrings.timezoneId),
                                               createValidator(validateTimezoneId));
    const localeInput =
        editor.createInput('locale', 'text', i18nString(UIStrings.locale), createValidator(validateLocale));
    const accuracyInput =
        editor.createInput('accuracy', 'text', i18nString(UIStrings.accuracy), createValidator(validateAccuracy));

    // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
    render(renderEditorView({
             titleInput,
             latInput,
             longInput,
             timezoneIdInput,
             localeInput,
             accuracyInput,
           }),
           content as HTMLElement);

    return editor;
  }
}
export interface LocationDescription {
  title: string;
  lat: number;
  long: number;
  timezoneId: string;
  locale: string;
  accuracy?: number;
}

export function validateTitle(value: string): string|null {
  const maxLength = 50;
  const trimmedValue = value.trim();

  if (!trimmedValue.length) {
    return i18nString(UIStrings.locationNameCannotBeEmpty);
  }
  if (trimmedValue.length > maxLength) {
    return i18nString(UIStrings.locationNameMustBeLessThanS, {PH1: maxLength});
  }
  return null;
}

export function validateLatitude(value: string): string|null {
  const minLat = -90;
  const maxLat = 90;
  const trimmedValue = value.trim();
  const parsedValue = Number(trimmedValue);

  if (!trimmedValue) {
    return null;
  }
  if (Number.isNaN(parsedValue)) {
    return i18nString(UIStrings.latitudeMustBeANumber);
  }
  if (parsedValue < minLat) {
    return i18nString(UIStrings.latitudeMustBeGreaterThanOrEqual, {PH1: minLat});
  }
  if (parsedValue > maxLat) {
    return i18nString(UIStrings.latitudeMustBeLessThanOrEqualToS, {PH1: maxLat});
  }
  return null;
}

export function validateLongitude(value: string): string|null {
  const minLong = -180;
  const maxLong = 180;
  const trimmedValue = value.trim();
  const parsedValue = Number(trimmedValue);

  if (!trimmedValue) {
    return null;
  }
  if (Number.isNaN(parsedValue)) {
    return i18nString(UIStrings.longitudeMustBeANumber);
  }
  if (parsedValue < minLong) {
    return i18nString(UIStrings.longitudeMustBeGreaterThanOr, {PH1: minLong});
  }
  if (parsedValue > maxLong) {
    return i18nString(UIStrings.longitudeMustBeLessThanOrEqualTo, {PH1: maxLong});
  }
  return null;
}

export function validateTimezoneId(value: string): string|null {
  const trimmedValue = value.trim();
  // Chromium uses ICU's timezone implementation, which is very
  // liberal in what it accepts. ICU does not simply use an allowlist
  // but instead tries to make sense of the input, even for
  // weird-looking timezone IDs. There's not much point in validating
  // the input other than checking if it contains at least one
  // alphabetic character. The empty string resets the override,
  // and is accepted as well.
  if (trimmedValue === '' || /[a-zA-Z]/.test(trimmedValue)) {
    return null;
  }
  return i18nString(UIStrings.timezoneIdMustContainAlphabetic);
}

export function validateLocale(value: string): string|null {
  const trimmedValue = value.trim();
  // Similarly to timezone IDs, there's not much point in validating
  // input locales other than checking if it contains at least two
  // alphabetic characters.
  // https://unicode.org/reports/tr35/#Unicode_language_identifier
  // The empty string resets the override, and is accepted as
  // well.
  if (trimmedValue === '' || /[a-zA-Z]{2}/.test(trimmedValue)) {
    return null;
  }
  return i18nString(UIStrings.localeMustContainAlphabetic);
}

export function validateAccuracy(value: string): string|null {
  const minAccuracy = 0;
  const trimmedValue = value.trim();
  const parsedValue = Number(trimmedValue);

  if (!trimmedValue) {
    return null;
  }
  if (Number.isNaN(parsedValue)) {
    return i18nString(UIStrings.accuracyMustBeANumber);
  }
  if (parsedValue < minAccuracy) {
    return i18nString(UIStrings.accuracyMustBeGreaterThanOrEqual, {PH1: minAccuracy});
  }
  return null;
}
