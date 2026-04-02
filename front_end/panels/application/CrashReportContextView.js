// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
const UIStrings = {
    /**
     * @description Placeholder text when no context is detected.
     */
    noContext: 'No context entries detected across frames.',
    /**
     * @description Fallback label when a frame has no URL.
     */
    unknownFrame: 'Unknown Frame',
    /**
     * @description Placeholder for a search field in a toolbar
     */
    filterByText: 'Filter by key or value',
    /**
     * @description Text to refresh the page
     */
    refresh: 'Refresh',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/CrashReportContextView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    const { widget } = UI.Widget;
    // clang-format off
    render(html `
    <style>${UI.inspectorCommonStyles}</style>
    <style>
      .crash-report-context-view {
        padding-top: 5px;
        overflow: auto;
      }

      .frame-section {
        margin-top: var(--sys-size-8);
      }

      .frame-section:first-child {
        margin-top: 0;
      }

      .frame-header {
        display: flex;
        align-items: center;
        padding: var(--sys-size-4) var(--sys-size-6);
        gap: var(--sys-size-6);
        background-color: var(--sys-color-surface2);
        border-bottom: 1px solid var(--sys-color-divider);
      }

      .frame-url {
        font-weight: var(--ref-typeface-weight-bold);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--default-font-family);
      }


      .toolbar-container {
        border-bottom: 1px solid var(--sys-color-divider);
        background-color: var(--sys-color-cdt-base-container);
      }
    </style>
    <div class="vbox flex-auto" jslog=${VisualLogging.pane('crash-report-context')}>
      <devtools-toolbar class="crash-report-context-toolbar" role="toolbar" jslog=${VisualLogging.toolbar()}>
        <devtools-button title=${i18nString(UIStrings.refresh)}
                         @click=${input.onRefresh}
                         .iconName=${'refresh'}
                         .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
                         jslog=${VisualLogging.action('refresh').track({
        click: true
    })}>
        </devtools-button>
        <devtools-toolbar-input type="filter" placeholder=${i18nString(UIStrings.filterByText)}
            @change=${(e) => input.onFilterChanged(e)} class="flex-auto">
        </devtools-toolbar-input>
      </devtools-toolbar>
      ${input.frames.length > 0 ? html `
        <div class="crash-report-context-view flex-auto">
          ${input.frames.map(frame => html `
            <div class="frame-section">
              <div class="frame-header">
                <span class="frame-url" title="URL: ${frame.url}\nFrame ID: ${frame.frameId}">${frame.displayName}</span>
              </div>
              <div class="grid-container">
                <devtools-widget
                  ${widget(ApplicationComponents.CrashReportContextGrid.CrashReportContextGrid, {
        data: {
            entries: frame.entries.map(e => ({ key: e.key, value: e.value })),
            selectedKey: input.selectedKey || undefined,
            filters: input.filters
        }
    })}
                  @select=${(e) => input.onRowSelected(e.detail)}>
                </devtools-widget>
              </div>
            </div>
          `)}
        </div>
      ` : html `
        ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noContext),
    })}
      `}
    </div>
  `, target);
    // clang-format on
};
export class CrashReportContextView extends UI.Widget.VBox {
    selectedKey = null;
    #view;
    #filters = [];
    constructor(view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        this.requestUpdate();
    }
    async performUpdate() {
        const models = SDK.TargetManager.TargetManager.instance().models(SDK.CrashReportContextModel.CrashReportContextModel);
        const allEntries = (await Promise.all(models.map(model => model.getEntries())))
            .flat()
            .filter((entry) => entry !== null);
        const frameData = this.#processFrameData(allEntries);
        this.#view({
            frames: frameData,
            selectedKey: this.selectedKey,
            filters: this.#filters,
            onRowSelected: (key) => {
                this.selectedKey = key;
                this.requestUpdate();
            },
            onRefresh: () => {
                this.requestUpdate();
            },
            onFilterChanged: (e) => {
                const text = e.detail;
                const textFilterRegExp = text ? Platform.StringUtilities.createPlainTextSearchRegex(text, 'i') : null;
                if (textFilterRegExp) {
                    this.#filters = [
                        { key: 'key,value', regex: textFilterRegExp, negative: false },
                    ];
                }
                else {
                    this.#filters = [];
                }
                this.requestUpdate();
            },
        }, undefined, this.contentElement);
    }
    #processFrameData(allEntries) {
        if (allEntries.length === 0) {
            return [];
        }
        const entriesByFrame = Map.groupBy(allEntries, entry => entry.frameId);
        return [...entriesByFrame.entries()]
            .map(([frameId, frameEntries]) => {
            const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
            const url = frame?.url || i18nString(UIStrings.unknownFrame);
            const displayName = frame?.displayName() || url;
            return {
                url,
                frameId,
                displayName,
                isMain: frame?.isMainFrame() ?? false,
                origin: frame?.securityOrigin || '',
                entries: frameEntries,
            };
        })
            // Ensure the main (outermost) frame is always listed first at the top of the View
            .sort((a, b) => {
            if (a.isMain && !b.isMain) {
                return -1;
            }
            if (!a.isMain && b.isMain) {
                return 1;
            }
            return 0;
        })
            .map(data => ({
            url: data.url,
            frameId: data.frameId,
            displayName: data.displayName,
            entries: data.entries,
        }));
    }
}
//# sourceMappingURL=CrashReportContextView.js.map