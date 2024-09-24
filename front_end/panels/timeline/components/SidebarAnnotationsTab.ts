// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Trace from '../../../models/trace/trace.js';
import * as TraceBounds from '../../../services/trace_bounds/trace_bounds.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Settings from '../../../ui/components/settings/settings.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {nameForEntry} from './EntryName.js';
import {RemoveAnnotation, RevealAnnotation} from './Sidebar.js';
import sidebarAnnotationsTabStyles from './sidebarAnnotationsTab.css.js';

const diagramImageUrl = new URL('../../../Images/performance-panel-diagram.svg', import.meta.url).toString();
const entryLabelImageUrl = new URL('../../../Images/performance-panel-entry-label.svg', import.meta.url).toString();
const timeRangeImageUrl = new URL('../../../Images/performance-panel-time-range.svg', import.meta.url).toString();

const UIStrings = {
  /**
   * @description Title for entry label.
   */
  entryLabel: 'Entry label',
  /**
   * @description Text for how to create an entry label.
   */
  entryLabelDescription: 'Double click on an entry to create an entry label. Press Esc or Enter to complete.',
  /**
   * @description  Title for diagram.
   */
  diagram: 'Diagram',
  /**
   * @description Text for how to create a diagram between entries.
   */
  diagramDescription: 'Double click on an entry to create a diagram.',
  /**
   * @description  Title for time range.
   */
  timeRange: 'Time range',
  /**
   * @description Text for how to create a time range selection and add note.
   */
  timeRangeDescription:
      'Shift and drag on the canvas to create a time range and add a label. Press Esc or Enter to complete.',
  /**
   * @description Text used to describe the delete button to screen readers
   **/
  deleteButton: 'Delete this annotation',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/SidebarAnnotationsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SidebarAnnotationsTab extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-annotations`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #annotations: Trace.Types.File.Annotation[] = [];
  // A map with annotated entries and the colours that are used to display them in the FlameChart.
  // We need this map to display the entries in the sidebar with the same colours.
  #annotationEntryToColorMap: Map<Trace.Types.Events.Event|Trace.Types.Events.LegacyTimelineFrame, string> = new Map();

  readonly #annotationsHiddenSetting: Common.Settings.Setting<boolean>;

  constructor() {
    super();
    this.#annotationsHiddenSetting = Common.Settings.Settings.instance().moduleSetting('annotations-hidden');
  }

  set annotations(annotations: Trace.Types.File.Annotation[]) {
    this.#annotations = annotations;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set annotationEntryToColorMap(annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>) {
    this.#annotationEntryToColorMap = annotationEntryToColorMap;
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sidebarAnnotationsTabStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  /**
   * Renders the Annotation 'identifier' or 'name' in the annotations list.
   * This is the text rendered before the annotation label that we use to indentify the annotation.
   *
   * Annotations identifiers for different annotations:
   * Entry label -> Entry name
   * Labelled range -> Start to End Range of the label in ms
   * Connected entries -> Connected entries names
   *
   * All identifiers have a different colour background.
   */
  #renderAnnotationIdentifier(annotation: Trace.Types.File.Annotation): LitHtml.LitTemplate {
    switch (annotation.type) {
      case 'ENTRY_LABEL': {
        const entryName = nameForEntry(annotation.entry);
        const color = this.#annotationEntryToColorMap.get(annotation.entry);

        return LitHtml.html`
              <span class="annotation-identifier" style="background-color: ${color}">
                ${entryName}
              </span>
        `;
      }
      case 'TIME_RANGE': {
        const minTraceBoundsMilli =
            TraceBounds.TraceBounds.BoundsManager.instance().state()?.milli.entireTraceBounds.min ?? 0;

        const timeRangeStartInMs =
            Math.round(Trace.Helpers.Timing.microSecondsToMilliseconds(annotation.bounds.min) - minTraceBoundsMilli);
        const timeRangeEndInMs =
            Math.round(Trace.Helpers.Timing.microSecondsToMilliseconds(annotation.bounds.max) - minTraceBoundsMilli);

        return LitHtml.html`
              <span class="annotation-identifier time-range">
                ${timeRangeStartInMs} - ${timeRangeEndInMs} ms
              </span>
        `;
      }
      case 'ENTRIES_LINK': {
        const entryFromName = nameForEntry(annotation.entryFrom);
        const fromColor = this.#annotationEntryToColorMap.get(annotation.entryFrom);

        const entryToName = annotation.entryTo ? nameForEntry(annotation.entryTo) : '';
        const toColor = annotation.entryTo ? this.#annotationEntryToColorMap.get(annotation.entryTo) : '';

        // clang-format off
        return LitHtml.html`
          <div class="entries-link">
            <span class="annotation-identifier"  style="background-color: ${fromColor}">
              ${entryFromName}
            </span>
            <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
              iconName: 'arrow-forward',
              color: 'var(--icon-default)',
              width: '18px',
              height: '18px',
            } as IconButton.Icon.IconData}>
            </${IconButton.Icon.Icon.litTagName}>
            ${(entryToName !== '' ?
              LitHtml.html`<span class="annotation-identifier" style="background-color: ${toColor}" >${entryToName}</span>`
            : '')}
          </div>
      `;
        // clang-format on
      }
      default:
        Platform.assertNever(annotation, 'Unsupported annotation type');
    }
  }

  #revealAnnotation(annotation: Trace.Types.File.Annotation): void {
    this.dispatchEvent(new RevealAnnotation(annotation));
  }

  #renderTutorialCard(): LitHtml.TemplateResult {
    return LitHtml.html`
      <div class="annotation-tutorial-container">
        Try the new annotation feature:
        <div class="tutorial-card">
          <div class="tutorial-image"> <img src=${entryLabelImageUrl}></img></div>
          <div class="tutorial-title">${i18nString(UIStrings.entryLabel)}</div>
          <div class="tutorial-description">${i18nString(UIStrings.entryLabelDescription)}</div>
          <div class="tutorial-shortcut">${Host.Platform.isMac() ? 'Cmd' : 'Ctrl'} + Click</div>
        </div>
        <div class="tutorial-card">
          <div class="tutorial-image"> <img src=${diagramImageUrl}></img></div>
          <div class="tutorial-title">${i18nString(UIStrings.diagram)}</div>
          <div class="tutorial-description">${i18nString(UIStrings.diagramDescription)}</div>
          <div class="tutorial-shortcut">
            <div class="keybinds-shortcut">
              <span class="keybinds-key">${Host.Platform.isMac() ? 'Cmd' : 'Ctrl'} + Click</span>
            </div>
          </div>
        </div>
        <div class="tutorial-card">
          <div class="tutorial-image"> <img src=${timeRangeImageUrl}></img></div>
          <div class="tutorial-title">${i18nString(UIStrings.timeRange)}</div>
          <div class="tutorial-description">${i18nString(UIStrings.timeRangeDescription)}</div>
        </div>
      </div>
    `;
  }

  #render(): void {
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <span class="annotations">
          ${this.#annotations.length === 0 ?
            this.#renderTutorialCard() :
            LitHtml.html`
              ${this.#annotations.map(annotation =>
                LitHtml.html`
                  <div class="annotation-container" @click=${() => this.#revealAnnotation(annotation)}>
                    <div class="annotation">
                      ${this.#renderAnnotationIdentifier(annotation)}
                      <span class="label">
                        ${(annotation.type === 'ENTRY_LABEL' || annotation.type === 'TIME_RANGE') ? annotation.label : ''}
                      </span>
                    </div>
                    <span class="delete-button" role="button" aria-label=${i18nString(UIStrings.deleteButton)}>
                      <${IconButton.Icon.Icon.litTagName}
                        class="bin-icon"
                        .data=${{
                          iconName: 'bin',
                          color: 'var(--icon-default)',
                          width: '20px',
                          height: '20px',
                        } as IconButton.Icon.IconData}
                        @click=${(event: Event) => {
                          // Stop propagation to not zoom into the annotation when the delete button is clicked
                          event.stopPropagation();
                          this.dispatchEvent(new RemoveAnnotation(annotation));
                      }}>
                    </span>
                  </div>`,
              )}
              <${Settings.SettingCheckbox.SettingCheckbox.litTagName} class="visibility-setting" .data=${{
                setting: this.#annotationsHiddenSetting,
                textOverride: 'Hide annotations',
              } as Settings.SettingCheckbox.SettingCheckboxData}>
              </${Settings.SettingCheckbox.SettingCheckbox.litTagName}>
        </span>`
      }`,
    this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-performance-sidebar-annotations', SidebarAnnotationsTab);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar-annotations': SidebarAnnotationsTab;
  }
}
