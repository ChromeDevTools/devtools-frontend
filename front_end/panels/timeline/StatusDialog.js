// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
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
/**
 * This is the dialog shown whilst a trace is being recorded/imported.
 */
export class StatusDialog extends UI.Widget.VBox {
    status;
    time;
    progressLabel;
    progressBar;
    description;
    button;
    downloadTraceButton;
    startTime;
    timeUpdateTimer;
    #rawEvents;
    constructor(options, onButtonClickCallback) {
        super({
            jslog: `${VisualLogging.dialog('timeline-status').track({ resize: true })}`,
            useShadowDom: true,
        });
        this.contentElement.classList.add('timeline-status-dialog');
        const statusLine = this.contentElement.createChild('div', 'status-dialog-line status');
        statusLine.createChild('div', 'label').textContent = i18nString(UIStrings.status);
        this.status = statusLine.createChild('div', 'content');
        UI.ARIAUtils.markAsStatus(this.status);
        if (options.showTimer) {
            const timeLine = this.contentElement.createChild('div', 'status-dialog-line time');
            timeLine.createChild('div', 'label').textContent = i18nString(UIStrings.time);
            this.time = timeLine.createChild('div', 'content');
        }
        if (options.showProgress) {
            const progressBarContainer = this.contentElement.createChild('div', 'status-dialog-line progress');
            this.progressLabel = progressBarContainer.createChild('div', 'label');
            this.progressBar = progressBarContainer.createChild('div', 'indicator-container').createChild('div', 'indicator');
            UI.ARIAUtils.markAsProgressBar(this.progressBar);
        }
        if (typeof options.description === 'string') {
            const descriptionLine = this.contentElement.createChild('div', 'status-dialog-line description');
            descriptionLine.createChild('div', 'label').textContent = i18nString(UIStrings.description);
            this.description = descriptionLine.createChild('div', 'content');
            this.description.innerText = options.description;
        }
        const buttonContainer = this.contentElement.createChild('div', 'stop-button');
        this.downloadTraceButton = UI.UIUtils.createTextButton(i18nString(UIStrings.downloadAfterError), () => {
            void this.#downloadRawTraceAfterError();
        }, { jslogContext: 'timeline.download-after-error' });
        this.downloadTraceButton.disabled = true;
        this.downloadTraceButton.classList.add('hidden');
        const buttonText = options.buttonText || i18nString(UIStrings.stop);
        this.button = UI.UIUtils.createTextButton(buttonText, onButtonClickCallback, {
            jslogContext: 'timeline.stop-recording',
        });
        // Profiling can't be stopped during initialization.
        this.button.classList.toggle('hidden', options.hideStopButton);
        buttonContainer.append(this.downloadTraceButton);
        buttonContainer.append(this.button);
    }
    finish() {
        this.stopTimer();
        this.button.classList.add('hidden');
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
        this.downloadTraceButton.disabled = false;
        this.downloadTraceButton.classList.remove('hidden');
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
        this.button.classList.remove('hidden');
        this.button.focus();
    }
    updateStatus(text) {
        this.status.textContent = text;
    }
    updateProgressBar(activity, percent) {
        if (this.progressLabel) {
            this.progressLabel.textContent = activity;
        }
        if (this.progressBar) {
            this.progressBar.style.width = percent.toFixed(1) + '%';
            UI.ARIAUtils.setValueNow(this.progressBar, percent);
        }
        this.updateTimer();
    }
    startTimer() {
        this.startTime = Date.now();
        this.timeUpdateTimer = window.setInterval(this.updateTimer.bind(this), 100);
        this.updateTimer();
    }
    stopTimer() {
        if (!this.timeUpdateTimer) {
            return;
        }
        clearInterval(this.timeUpdateTimer);
        this.updateTimer();
        delete this.timeUpdateTimer;
    }
    updateTimer() {
        if (!this.timeUpdateTimer || !this.time) {
            return;
        }
        const seconds = (Date.now() - this.startTime) / 1000;
        this.time.textContent = i18n.TimeUtilities.preciseSecondsToString(seconds, 1);
    }
    wasShown() {
        super.wasShown();
        this.registerRequiredCSS(timelineStatusDialogStyles);
    }
}
//# sourceMappingURL=StatusDialog.js.map