// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../models/trace/trace.js';
import * as TraceBounds from '../../../services/trace_bounds/trace_bounds.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {RemoveAnnotation} from './Sidebar.js';
import sidebarAnnotationsTabStyles from './sidebarAnnotationsTab.css.js';

export class SidebarAnnotationsTab extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-annotations`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #annotations: TraceEngine.Types.File.Annotation[] = [];
  // A map with annotated entries and the colours that are used to display them in the FlameChart.
  // We need this map to display the entries in the sidebar with the same colours.
  #annotationEntryToColorMap: Map<TraceEngine.Types.TraceEvents.TraceEventData, string> = new Map();

  set annotations(annotations: TraceEngine.Types.File.Annotation[]) {
    this.#annotations = annotations;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set annotationEntryToColorMap(annotationEntryToColorMap: Map<TraceEngine.Types.TraceEvents.TraceEventData, string>) {
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
  #renderAnnotationIdentifier(annotation: TraceEngine.Types.File.Annotation): LitHtml.LitTemplate {
    switch (annotation.type) {
      case 'ENTRY_LABEL': {
        const entryName = TraceEngine.Types.TraceEvents.isProfileCall(annotation.entry) ?
            annotation.entry.callFrame.functionName :
            annotation.entry.name;
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

        const timeRangeStartInMs = Math.round(
            TraceEngine.Helpers.Timing.microSecondsToMilliseconds(annotation.bounds.min) - minTraceBoundsMilli);
        const timeRangeEndInMs = Math.round(
            TraceEngine.Helpers.Timing.microSecondsToMilliseconds(annotation.bounds.max) - minTraceBoundsMilli);

        return LitHtml.html`
              <span class="annotation-identifier time-range">
                ${timeRangeStartInMs} - ${timeRangeEndInMs} ms
              </span>
        `;
      }
      case 'ENTRIES_LINK': {
        const entryFromName = TraceEngine.Types.TraceEvents.isProfileCall(annotation.entryFrom) ?
            annotation.entryFrom.callFrame.functionName :
            annotation.entryFrom.name;

        const entryToName = (!annotation.entryTo) ? '' :
            TraceEngine.Types.TraceEvents.isProfileCall(annotation.entryTo) ?
                                                    annotation.entryTo.callFrame.functionName :
                                                    annotation.entryTo.name;

        const fromColor = this.#annotationEntryToColorMap.get(annotation.entryFrom);
        const toColor = (annotation.entryTo) ? this.#annotationEntryToColorMap.get(annotation.entryTo) : '';

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
    }
  }

  #render(): void {
    // clang-format off
      LitHtml.render(
        LitHtml.html`
          <span class="annotations">
            ${this.#annotations.map(annotation =>
              LitHtml.html`
                <div class="annotation-container">
                  <div class="annotation">
                    ${this.#renderAnnotationIdentifier(annotation)}
                    <span class="label">
                      ${(annotation.type === 'ENTRY_LABEL' || annotation.type === 'TIME_RANGE') ? annotation.label : ''}
                    </span>
                  </div>
                  <${IconButton.Icon.Icon.litTagName} class="bin-icon" .data=${{
                          iconName: 'bin',
                          color: 'var(--icon-default)',
                          width: '20px',
                          height: '20px',
                        } as IconButton.Icon.IconData} @click=${() => {
                          this.dispatchEvent(new RemoveAnnotation(annotation));
                  }}>
                </div>`,
           )}
          </span>`,
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
