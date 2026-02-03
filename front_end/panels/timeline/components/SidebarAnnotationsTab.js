// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/settings/settings.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Trace from '../../../models/trace/trace.js';
import * as TraceBounds from '../../../services/trace_bounds/trace_bounds.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { AnnotationHoverOut, HoverAnnotation, RemoveAnnotation, RevealAnnotation } from './Sidebar.js';
import sidebarAnnotationsTabStyles from './sidebarAnnotationsTab.css.js';
const { html, render } = Lit;
const diagramImageUrl = new URL('../../../Images/performance-panel-diagram.svg', import.meta.url).toString();
const entryLabelImageUrl = new URL('../../../Images/performance-panel-entry-label.svg', import.meta.url).toString();
const timeRangeImageUrl = new URL('../../../Images/performance-panel-time-range.svg', import.meta.url).toString();
const deleteAnnotationImageUrl = new URL('../../../Images/performance-panel-delete-annotation.svg', import.meta.url).toString();
const UIStrings = {
    /**
     * @description Title for entry label.
     */
    annotationGetStarted: 'Annotate a trace for yourself and others',
    /**
     * @description Title for entry label.
     */
    entryLabelTutorialTitle: 'Label an item',
    /**
     * @description Text for how to create an entry label.
     */
    entryLabelTutorialDescription: 'Double-click or press Enter on an item and type to create an item label.',
    /**
     * @description  Title for diagram.
     */
    entryLinkTutorialTitle: 'Connect two items',
    /**
     * @description Text for how to create a diagram between entries.
     */
    entryLinkTutorialDescription: 'Double-click on an item, click on the adjacent rightward arrow, then select the destination item.',
    /**
     * @description  Title for time range.
     */
    timeRangeTutorialTitle: 'Define a time range',
    /**
     * @description Text for how to create a time range selection and add note.
     */
    timeRangeTutorialDescription: 'Shift-drag in the flamechart then type to create a time range annotation.',
    /**
     * @description  Title for deleting annotations.
     */
    deleteAnnotationTutorialTitle: 'Delete an annotation',
    /**
     * @description Text for how to access an annotation delete function.
     */
    deleteAnnotationTutorialDescription: 'Hover over the list in the sidebar with Annotations tab selected to access the delete function.',
    /**
     * @description Text used to describe the delete button to screen readers.
     * @example {"A paint event annotated with the text hello world"} PH1
     **/
    deleteButton: 'Delete annotation: {PH1}',
    /**
     * @description label used to describe an annotation on an entry
     * @example {Paint} PH1
     * @example {"Hello world"} PH2
     */
    entryLabelDescriptionLabel: 'A "{PH1}" event annotated with the text "{PH2}"',
    /**
     * @description label used to describe a time range annotation
     * @example {2.5 milliseconds} PH1
     * @example {13.5 milliseconds} PH2
     */
    timeRangeDescriptionLabel: 'A time range starting at {PH1} and ending at {PH2}',
    /**
     * @description label used to describe a link from one entry to another.
     * @example {Paint} PH1
     * @example {Recalculate styles} PH2
     */
    entryLinkDescriptionLabel: 'A link between a "{PH1}" event and a "{PH2}" event',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/SidebarAnnotationsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SidebarAnnotationsTab extends UI.Widget.Widget {
    #annotations = [];
    // A map with annotated entries and the colours that are used to display them in the FlameChart.
    // We need this map to display the entries in the sidebar with the same colours.
    #annotationEntryToColorMap = new Map();
    #annotationsHiddenSetting;
    #view;
    constructor(view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        this.#annotationsHiddenSetting = Common.Settings.Settings.instance().moduleSetting('annotations-hidden');
    }
    deduplicatedAnnotations() {
        return this.#annotations;
    }
    setData(data) {
        this.#annotations = this.#processAnnotationsList(data.annotations);
        this.#annotationEntryToColorMap = data.annotationEntryToColorMap;
        this.requestUpdate();
    }
    #processAnnotationsList(annotations) {
        // When an entry is double-clicked, we create two annotations (a label and an entries connection) for the user to choose from.
        // The one not selected is deleted when the user makes their selection.
        // To avoid excessive activity in the sidebar (adding and removing annotations), only show one 'not started' annotation associated with an entry.
        //
        // If we encounter an annotation for an entry that hasn't started creation, add that entry to the 'entriesWithNotStartedAnnotation'
        // set. This allows us to filter out any subsequent not started annotations for the same entry.
        const entriesWithNotStartedAnnotation = new Set();
        const processedAnnotations = annotations.filter(annotation => {
            if (this.#isAnnotationCreationStarted(annotation)) {
                return true;
            }
            if (annotation.type === 'ENTRIES_LINK' || annotation.type === 'ENTRY_LABEL') {
                const annotationEntry = annotation.type === 'ENTRIES_LINK' ? annotation.entryFrom : annotation.entry;
                if (entriesWithNotStartedAnnotation.has(annotationEntry)) {
                    return false;
                }
                entriesWithNotStartedAnnotation.add(annotationEntry);
            }
            return true;
        });
        // Sort annotations by timestamp.
        processedAnnotations.sort((firstAnnotation, secondAnnotation) => this.#getAnnotationTimestamp(firstAnnotation) - this.#getAnnotationTimestamp(secondAnnotation));
        return processedAnnotations;
    }
    #getAnnotationTimestamp(annotation) {
        switch (annotation.type) {
            case 'ENTRY_LABEL': {
                return annotation.entry.ts;
            }
            case 'ENTRIES_LINK': {
                return annotation.entryFrom.ts;
            }
            case 'TIME_RANGE': {
                return annotation.bounds.min;
            }
            default: {
                Platform.assertNever(annotation, `Invalid annotation type ${annotation}`);
            }
        }
    }
    #isAnnotationCreationStarted(annotation) {
        // Consider the annotation not started if:
        // ENTRY_LABEL - label is empty
        // ENTRIES_LINK - the connection annotation does not have the 'to' entry
        // TIME_RANGE - range is over zero
        switch (annotation.type) {
            case 'ENTRY_LABEL': {
                return annotation.label.length > 0;
            }
            case 'ENTRIES_LINK': {
                return Boolean(annotation.entryTo);
            }
            case 'TIME_RANGE': {
                return annotation.bounds.range > 0;
            }
        }
    }
    performUpdate() {
        const input = {
            annotations: this.#annotations,
            annotationsHiddenSetting: this.#annotationsHiddenSetting,
            annotationEntryToColorMap: this.#annotationEntryToColorMap,
            onAnnotationClick: (annotation) => {
                this.contentElement.dispatchEvent(new RevealAnnotation(annotation));
            },
            onAnnotationHover: (annotation) => {
                this.contentElement.dispatchEvent(new HoverAnnotation(annotation));
            },
            onAnnotationHoverOut: () => {
                this.contentElement.dispatchEvent(new AnnotationHoverOut());
            },
            onAnnotationDelete: (annotation) => {
                this.contentElement.dispatchEvent(new RemoveAnnotation(annotation));
            },
        };
        this.#view(input, {}, this.contentElement);
    }
}
function detailedAriaDescriptionForAnnotation(annotation) {
    switch (annotation.type) {
        case 'ENTRY_LABEL': {
            const name = Trace.Name.forEntry(annotation.entry);
            return i18nString(UIStrings.entryLabelDescriptionLabel, {
                PH1: name,
                PH2: annotation.label,
            });
        }
        case 'TIME_RANGE': {
            const from = i18n.TimeUtilities.formatMicroSecondsAsMillisFixedExpanded(annotation.bounds.min);
            const to = i18n.TimeUtilities.formatMicroSecondsAsMillisFixedExpanded(annotation.bounds.max);
            return i18nString(UIStrings.timeRangeDescriptionLabel, {
                PH1: from,
                PH2: to,
            });
        }
        case 'ENTRIES_LINK': {
            if (!annotation.entryTo) {
                // Only label it if it is completed.
                return '';
            }
            const nameFrom = Trace.Name.forEntry(annotation.entryFrom);
            const nameTo = Trace.Name.forEntry(annotation.entryTo);
            return i18nString(UIStrings.entryLinkDescriptionLabel, {
                PH1: nameFrom,
                PH2: nameTo,
            });
        }
        default:
            Platform.assertNever(annotation, 'Unsupported annotation');
    }
}
function findTextColorForContrast(bgColorText) {
    const bgColor = Common.Color.parse(bgColorText)?.asLegacyColor();
    // Let's default to black text, since the entries' titles are black in the flamechart.
    const darkColorToken = '--app-color-performance-sidebar-label-text-dark';
    const darkColorText = Common.Color.parse(ThemeSupport.ThemeSupport.instance().getComputedValue(darkColorToken))?.asLegacyColor();
    if (!bgColor || !darkColorText) {
        // This part of code shouldn't be reachable unless background color is invalid or something wrong with the color
        // parsing. If so let's fall back to the dark color,
        return `var(${darkColorToken})`;
    }
    const contrastRatio = Common.ColorUtils.contrastRatio(bgColor.rgba(), darkColorText.rgba());
    return contrastRatio >= 4.5 ? `var(${darkColorToken})` : 'var(--app-color-performance-sidebar-label-text-light)';
}
function renderAnnotationIdentifier(annotation, annotationEntryToColorMap) {
    switch (annotation.type) {
        case 'ENTRY_LABEL': {
            const entryName = Trace.Name.forEntry(annotation.entry);
            const backgroundColor = annotationEntryToColorMap.get(annotation.entry) ?? '';
            const color = findTextColorForContrast(backgroundColor);
            const styleForAnnotationIdentifier = {
                backgroundColor,
                color,
            };
            return html `
            <span class="annotation-identifier" style=${Lit.Directives.styleMap(styleForAnnotationIdentifier)}>
              ${entryName}
            </span>
      `;
        }
        case 'TIME_RANGE': {
            const minTraceBoundsMilli = TraceBounds.TraceBounds.BoundsManager.instance().state()?.milli.entireTraceBounds.min ?? 0;
            const timeRangeStartInMs = Math.round(Trace.Helpers.Timing.microToMilli(annotation.bounds.min) - minTraceBoundsMilli);
            const timeRangeEndInMs = Math.round(Trace.Helpers.Timing.microToMilli(annotation.bounds.max) - minTraceBoundsMilli);
            return html `
            <span class="annotation-identifier time-range">
              ${timeRangeStartInMs} - ${timeRangeEndInMs} ms
            </span>
      `;
        }
        case 'ENTRIES_LINK': {
            const entryFromName = Trace.Name.forEntry(annotation.entryFrom);
            const fromBackgroundColor = annotationEntryToColorMap.get(annotation.entryFrom) ?? '';
            const fromTextColor = findTextColorForContrast(fromBackgroundColor);
            const styleForFromAnnotationIdentifier = {
                backgroundColor: fromBackgroundColor,
                color: fromTextColor,
            };
            // clang-format off
            return html `
        <div class="entries-link">
          <span class="annotation-identifier" style=${Lit.Directives.styleMap(styleForFromAnnotationIdentifier)}>
            ${entryFromName}
          </span>
          <devtools-icon name="arrow-forward" class="inline-icon large">
          </devtools-icon>
          ${renderEntryToIdentifier(annotation, annotationEntryToColorMap)}
        </div>
    `;
            // clang-format on
        }
        default:
            Platform.assertNever(annotation, 'Unsupported annotation type');
    }
}
/**
 * Renders the Annotation 'identifier' or 'name' in the annotations list.
 * This is the text rendered before the annotation label that we use to identify the annotation.
 *
 * Annotations identifiers for different annotations:
 * Entry label -> Entry name
 * Labelled range -> Start to End Range of the label in ms
 * Connected entries -> Connected entries names
 *
 * All identifiers have a different colour background.
 */
function renderEntryToIdentifier(annotation, annotationEntryToColorMap) {
    if (annotation.entryTo) {
        const entryToName = Trace.Name.forEntry(annotation.entryTo);
        const toBackgroundColor = annotationEntryToColorMap.get(annotation.entryTo) ?? '';
        const toTextColor = findTextColorForContrast(toBackgroundColor);
        const styleForToAnnotationIdentifier = {
            backgroundColor: toBackgroundColor,
            color: toTextColor,
        };
        // clang-format off
        return html `
      <span class="annotation-identifier" style=${Lit.Directives.styleMap(styleForToAnnotationIdentifier)}>
        ${entryToName}
      </span>`;
        // clang-format on
    }
    return Lit.nothing;
}
function jslogForAnnotation(annotation) {
    switch (annotation.type) {
        case 'ENTRY_LABEL':
            return 'entry-label';
        case 'TIME_RANGE':
            return 'time-range';
        case 'ENTRIES_LINK':
            return 'entries-link';
        default:
            Platform.assertNever(annotation, 'unknown annotation type');
    }
}
function renderTutorial() {
    // clang-format off
    return html `<div class="annotation-tutorial-container">
    ${i18nString(UIStrings.annotationGetStarted)}
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${entryLabelImageUrl}></img></div>
        <div class="tutorial-title">${i18nString(UIStrings.entryLabelTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString(UIStrings.entryLabelTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${diagramImageUrl}></img></div>
        <div class="tutorial-title">${i18nString(UIStrings.entryLinkTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString(UIStrings.entryLinkTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${timeRangeImageUrl}></img></div>
        <div class="tutorial-title">${i18nString(UIStrings.timeRangeTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString(UIStrings.timeRangeTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${deleteAnnotationImageUrl}></img></div>
        <div class="tutorial-title">${i18nString(UIStrings.deleteAnnotationTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString(UIStrings.deleteAnnotationTutorialDescription)}</div>
      </div>
    </div>`;
    // clang-format on
}
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${sidebarAnnotationsTabStyles}</style>
      <span class="annotations">
        ${input.annotations.length === 0 ? renderTutorial() :
        html `
            ${input.annotations.map(annotation => {
            const label = detailedAriaDescriptionForAnnotation(annotation);
            return html `
                <div class="annotation-container"
                  @click=${() => input.onAnnotationClick(annotation)}
                  @mouseover=${() => (annotation.type === 'ENTRY_LABEL') ? input.onAnnotationHover(annotation) : null}
                  @mouseout=${() => (annotation.type === 'ENTRY_LABEL') ? input.onAnnotationHoverOut() : null}
                  aria-label=${label}
                  tabindex="0"
                  jslog=${VisualLogging.item(`timeline.annotation-sidebar.annotation-${jslogForAnnotation(annotation)}`).track({ click: true })}
                >
                  <div class="annotation">
                    ${renderAnnotationIdentifier(annotation, input.annotationEntryToColorMap)}
                    <span class="label">
                      ${(annotation.type === 'ENTRY_LABEL' || annotation.type === 'TIME_RANGE') ? annotation.label : ''}
                    </span>
                  </div>
                  <button class="delete-button" aria-label=${i18nString(UIStrings.deleteButton, { PH1: label })} @click=${(event) => {
                // Stop propagation to not zoom into the annotation when
                // the delete button is clicked
                event.stopPropagation();
                input.onAnnotationDelete(annotation);
            }} jslog=${VisualLogging.action('timeline.annotation-sidebar.delete').track({ click: true })}>
                    <devtools-icon class="bin-icon extra-large" name="bin"></devtools-icon>
                  </button>
                </div>`;
        })}
            <setting-checkbox class="visibility-setting" .data=${{
            setting: input.annotationsHiddenSetting,
            textOverride: 'Hide annotations',
        }}>
            </setting-checkbox>`}
    </span>`, target);
};
//# sourceMappingURL=SidebarAnnotationsTab.js.map