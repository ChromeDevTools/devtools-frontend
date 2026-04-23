// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { traceJsonGenerator } from './SaveFileFormatter.js';
import timelineStatusDialogStyles from './timelineStatusDialog.css.js';
const UIStrings = {
    /**
     * @description Text to download the trace file after an error
     */
    downloadAfterError: 'Download trace',
    /**
     * @description Text for the status of something
     */
    status: 'Status',
    /**
     * @description Text that refers to the time
     */
    time: 'Time',
    /**
     * @description Text for the description of something
     */
    description: 'Description',
    /**
     * @description Text of an item that stops the running task
     */
    stop: 'Stop',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/StatusDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
// clang-format off
export const DEFAULT_VIEW = (input, output, target) => {
    render(html `
    <style>${timelineStatusDialogStyles}</style>
    <div class="timeline-status-dialog">
      <div class="status-dialog-line status">
        <div class="label">${i18nString(UIStrings.status)}</div>
        <div class="content" role="status">${input.statusText}</div>
      </div>
      ${input.showTimer ? html `
        <div class="status-dialog-line time">
          <div class="label">${i18nString(UIStrings.time)}</div>
          <div class="content">${input.timeText}</div>
        </div>
      ` : nothing}
      ${input.showProgress ? html `
        <div class="status-dialog-line progress">
          <div class="label">${input.progressActivity}</div>
          <div class="indicator-container">
            <div class="indicator"
              style="width: ${input.progressPercent.toFixed(1)}%"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow=${input.progressPercent}>
            </div>
          </div>
        </div>
      ` : nothing}
      ${input.descriptionText !== undefined ? html `
        <div class="status-dialog-line description">
          <div class="label">${i18nString(UIStrings.description)}</div>
          <div class="content">${input.descriptionText}</div>
        </div>
      ` : nothing}
      <div class="stop-button">
        ${input.showDownloadButton ? html `
          <devtools-button
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
            .disabled=${input.downloadButtonDisabled}
            @click=${input.onDownloadClick}
            .jslogContext=${'timeline.download-after-error'}
          >${i18nString(UIStrings.downloadAfterError)}</devtools-button>
        ` : nothing}
        ${!input.hideStopButton ? html `
          <devtools-button
            .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
            @click=${input.onStopClick}
            .jslogContext=${'timeline.stop-recording'}
            ?autofocus=${input.focusStopButton}
          >${input.buttonText}</devtools-button>
        ` : nothing}
      </div>
    </div>
  `, target, { container: { attributes: { jslog: `${VisualLogging.dialog('timeline-status').track({ resize: true })}` } } });
    // clang-format on
};
/**
 * This is the dialog shown whilst a trace is being recorded/imported.
 */
export class StatusDialog extends UI.Widget.VBox {
    #view;
    #statusText = '';
    #showTimer;
    #timeText = '';
    #showProgress;
    #progressActivity = '';
    #progressPercent = 0;
    #descriptionText;
    #buttonText;
    #hideStopButton;
    #focusStopButton = false;
    #showDownloadButton = false;
    #downloadButtonDisabled = true;
    #onButtonClickCallback;
    #startTime;
    #timeUpdateTimer;
    #rawEvents;
    constructor(options, onButtonClickCallback, view = DEFAULT_VIEW) {
        super({ useShadowDom: 'pure' });
        this.#view = view;
        this.#showTimer = Boolean(options.showTimer);
        this.#showProgress = Boolean(options.showProgress);
        this.#descriptionText = options.description;
        this.#buttonText = options.buttonText || i18nString(UIStrings.stop);
        this.#hideStopButton = options.hideStopButton;
        this.#onButtonClickCallback = onButtonClickCallback;
    }
    finish() {
        this.stopTimer();
        this.#hideStopButton = true;
        this.requestUpdate();
    }
    async #downloadRawTraceAfterError() {
        if (!this.#rawEvents || this.#rawEvents.length === 0) {
            return;
        }
        const traceStart = Platform.DateUtilities.toISO8601Compact(new Date());
        const fileName = `Trace-Load-Error-${traceStart}.json`;
        const formattedTraceIter = traceJsonGenerator(this.#rawEvents, {});
        const traceAsString = Array.from(formattedTraceIter).join('');
        await Workspace.FileManager.FileManager.instance().save(fileName, new TextUtils.ContentData.ContentData(traceAsString, /* isBase64=*/ false, 'application/json'), 
        /* forceSaveAs=*/ true);
        Workspace.FileManager.FileManager.instance().close(fileName);
    }
    enableDownloadOfEvents(rawEvents) {
        this.#rawEvents = rawEvents;
        this.#showDownloadButton = true;
        this.#downloadButtonDisabled = false;
        this.requestUpdate();
    }
    remove() {
        this.element.parentNode?.classList.remove('opaque', 'tinted');
        this.stopTimer();
        this.element.remove();
    }
    showPane(parent, mode = 'opaque') {
        this.show(parent);
        parent.classList.toggle('tinted', mode === 'tinted');
        parent.classList.toggle('opaque', mode === 'opaque');
    }
    enableAndFocusButton() {
        this.#hideStopButton = false;
        this.#focusStopButton = true;
        this.requestUpdate();
    }
    updateStatus(text) {
        this.#statusText = text;
        this.requestUpdate();
    }
    updateProgressBar(activity, percent) {
        this.#progressActivity = activity;
        this.#progressPercent = percent;
        this.#updateTimerTick();
        this.requestUpdate();
    }
    startTimer() {
        this.#startTime = Date.now();
        this.#timeUpdateTimer = window.setInterval(this.#updateTimerTick.bind(this), 100);
        this.#updateTimerTick();
    }
    stopTimer() {
        if (!this.#timeUpdateTimer) {
            return;
        }
        clearInterval(this.#timeUpdateTimer);
        this.#updateTimerTick();
        this.#timeUpdateTimer = undefined;
    }
    #updateTimerTick() {
        if (!this.#timeUpdateTimer || !this.#showTimer) {
            return;
        }
        const seconds = (Date.now() - this.#startTime) / 1000;
        this.#timeText = i18n.TimeUtilities.preciseSecondsToString(seconds, 1);
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            statusText: this.#statusText,
            showTimer: this.#showTimer,
            timeText: this.#timeText,
            showProgress: this.#showProgress,
            progressActivity: this.#progressActivity,
            progressPercent: this.#progressPercent,
            descriptionText: this.#descriptionText,
            buttonText: this.#buttonText,
            hideStopButton: this.#hideStopButton,
            focusStopButton: this.#focusStopButton,
            showDownloadButton: this.#showDownloadButton,
            downloadButtonDisabled: this.#downloadButtonDisabled,
            onStopClick: () => {
                void this.#onButtonClickCallback();
            },
            onDownloadClick: () => {
                void this.#downloadRawTraceAfterError();
            },
        }, {}, this.contentElement);
        this.#focusStopButton = false;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
}
//# sourceMappingURL=StatusDialog.js.map