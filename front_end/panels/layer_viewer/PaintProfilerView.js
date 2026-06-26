// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import paintProfilerStyles from './paintProfiler.css.js';
const { html, render, nothing } = Lit;
const { ref } = Lit.Directives;
const UIStrings = {
    /**
     * @description Text to indicate the progress of a profile
     */
    profiling: 'Profiling…',
    /**
     * @description Text in Paint Profiler View of the Layers panel
     */
    shapes: 'Shapes',
    /**
     * @description Text in Paint Profiler View of the Layers panel
     */
    bitmap: 'Bitmap',
    /**
     * @description Generic label for any text
     */
    text: 'Text',
    /**
     * @description Text in Paint Profiler View of the Layers panel
     */
    misc: 'Misc',
    /**
     * @description ARIA label for a pie chart that shows the results of the paint profiler
     */
    profilingResults: 'Profiling results',
    /**
     * @description Label for command log tree in the Profiler tab
     */
    commandLog: 'Command Log',
};
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/PaintProfilerView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let categories = null;
let logItemCategoriesMap = null;
function formatPieChartTime(value) {
    return i18n.TimeUtilities.millisToString(value * 1000, true);
}
function calculateSelectionWindow(windowLeftRatio, windowRightRatio, canvasWidth, outerBarWidth, innerBarWidth, barPaddingWidth, samplesPerBar, logLength) {
    const screenLeft = windowLeftRatio * canvasWidth;
    const screenRight = windowRightRatio * canvasWidth;
    const barLeft = Math.floor(screenLeft / outerBarWidth);
    const barRight = Math.floor((screenRight + innerBarWidth - barPaddingWidth / 2) / outerBarWidth);
    const stepLeft = Platform.NumberUtilities.clamp(barLeft * samplesPerBar, 0, logLength - 1);
    const stepRight = Platform.NumberUtilities.clamp(barRight * samplesPerBar, 0, logLength);
    return { left: stepLeft, right: stepRight };
}
function renderCanvas(canvas, context, input, samplesPerBar) {
    const profiles = input.profiles;
    const logCategories = input.logCategories;
    if (!profiles || !profiles.length || !logCategories) {
        return;
    }
    let maxBarTime = 0;
    const barTimes = [];
    const barHeightByCategory = [];
    let heightByCategory = {};
    for (let i = 0, lastBarIndex = 0, lastBarTime = 0; i < input.log.length;) {
        let categoryName = (logCategories[i]?.name) || 'misc';
        const sampleIndex = input.log[i].commandIndex;
        for (let row = 0; row < profiles.length; row++) {
            const sample = profiles[row][sampleIndex];
            lastBarTime += sample;
            heightByCategory[categoryName] = (heightByCategory[categoryName] || 0) + sample;
        }
        ++i;
        if (i - lastBarIndex === samplesPerBar || i === input.log.length) {
            // Normalize by total number of samples accumulated.
            const factor = profiles.length * (i - lastBarIndex);
            lastBarTime /= factor;
            for (categoryName in heightByCategory) {
                heightByCategory[categoryName] /= factor;
            }
            barTimes.push(lastBarTime);
            barHeightByCategory.push(heightByCategory);
            if (lastBarTime > maxBarTime) {
                maxBarTime = lastBarTime;
            }
            lastBarTime = 0;
            heightByCategory = {};
            lastBarIndex = i;
        }
    }
    const paddingHeight = 4 * window.devicePixelRatio;
    const scale = (canvas.height - paddingHeight - input.minBarHeight) / maxBarTime;
    for (let i = 0; i < barTimes.length; ++i) {
        for (const categoryName in barHeightByCategory[i]) {
            barHeightByCategory[i][categoryName] *= (barTimes[i] * scale + input.minBarHeight) / barTimes[i];
        }
        const categories = PaintProfilerView.categories();
        let currentHeight = 0;
        const x = input.barPaddingWidth + i * input.outerBarWidth;
        for (const categoryName in categories) {
            if (!barHeightByCategory[i][categoryName]) {
                continue;
            }
            currentHeight += barHeightByCategory[i][categoryName];
            const y = canvas.height - currentHeight;
            context.fillStyle = categories[categoryName].color;
            context.fillRect(x, y, input.innerBarWidth, barHeightByCategory[i][categoryName]);
        }
    }
}
function calculatePieChartData(input, canvasWidth, samplesPerBar, emptyPieChartData) {
    const profiles = input.profiles;
    const logCategories = input.logCategories;
    if (!profiles || !profiles.length || !logCategories) {
        return emptyPieChartData;
    }
    const { left: stepLeft, right: stepRight } = calculateSelectionWindow(input.windowLeftRatio, input.windowRightRatio, canvasWidth, input.outerBarWidth, input.innerBarWidth, input.barPaddingWidth, samplesPerBar, input.log.length);
    let totalTime = 0;
    const timeByCategory = {};
    for (let i = stepLeft; i < stepRight; ++i) {
        const logEntry = input.log[i];
        const category = PaintProfilerView.categories()[(logCategories[i]?.name) || 'misc'];
        if (!category) {
            continue;
        }
        timeByCategory[category.color] = timeByCategory[category.color] || 0;
        for (let j = 0; j < profiles.length; ++j) {
            const time = profiles[j][logEntry.commandIndex];
            totalTime += time;
            timeByCategory[category.color] += time;
        }
    }
    const slices = [];
    for (const color in timeByCategory) {
        slices.push({ value: timeByCategory[color] / profiles.length, color, title: '' });
    }
    return {
        ...emptyPieChartData,
        total: totalTime / profiles.length,
        slices,
    };
}
const DEFAULT_VIEW = (input, output, target) => {
    const getTemplate = (pieChartData) => html `
    <style>${paintProfilerStyles}</style>
    <div class="paint-profiler-canvas-container" ${ref(output.onCanvasContainerCreated)}>
      <canvas class="fill"></canvas>
    </div>
    <div class="empty-state ${input.isProfiling ? '' : 'hidden'}">
      ${i18nString(UIStrings.profiling)}
    </div>
    <devtools-perf-piechart class="paint-profiler-pie-chart" .data=${pieChartData}></devtools-perf-piechart>
  `;
    const emptyPieChartData = {
        chartName: i18nString(UIStrings.profilingResults),
        size: 55,
        formatter: formatPieChartTime,
        showLegend: false,
        total: 0,
        slices: [],
    };
    render(getTemplate(emptyPieChartData), target);
    const canvasContainer = target.querySelector('.paint-profiler-canvas-container');
    const canvas = target.querySelector('canvas');
    if (!canvas || !canvasContainer) {
        return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
        return;
    }
    canvas.width = canvasContainer.clientWidth * window.devicePixelRatio;
    canvas.height = canvasContainer.clientHeight * window.devicePixelRatio;
    if (!input.profiles?.length || !input.logCategories) {
        return;
    }
    const maxBars = Math.floor((canvas.width - 2 * input.barPaddingWidth) / input.outerBarWidth);
    const samplesPerBar = Math.ceil(input.log.length / maxBars);
    renderCanvas(canvas, context, input, samplesPerBar);
    const pieChartData = calculatePieChartData(input, canvas.width, samplesPerBar, emptyPieChartData);
    render(getTemplate(pieChartData), target);
};
export class PaintProfilerView extends Common.ObjectWrapper.eventMixin(UI.Widget.Widget) {
    canvasContainer;
    #selectionWindow;
    innerBarWidth;
    minBarHeight;
    barPaddingWidth;
    outerBarWidth;
    #pendingScale;
    #scale;
    samplesPerBar;
    log;
    snapshot;
    logCategories;
    profiles;
    updateImageTimer;
    showImageCallback;
    isProfiling = false;
    #isResizeEnabled = false;
    #view;
    #viewOutput;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.innerBarWidth = 4 * window.devicePixelRatio;
        this.minBarHeight = window.devicePixelRatio;
        this.barPaddingWidth = 2 * window.devicePixelRatio;
        this.outerBarWidth = this.innerBarWidth + this.barPaddingWidth;
        this.#pendingScale = 1;
        this.#scale = this.#pendingScale;
        this.samplesPerBar = 0;
        this.log = [];
        this.#viewOutput = {
            onCanvasContainerCreated: (el) => {
                if (el && !this.canvasContainer) {
                    this.canvasContainer = el;
                    this.#selectionWindow = new PerfUI.OverviewGrid.Window(this.canvasContainer);
                    this.#selectionWindow.addEventListener("WindowChanged" /* PerfUI.OverviewGrid.Events.WINDOW_CHANGED */, this.onWindowChanged, this);
                    this.#selectionWindow.setResizeEnabled(this.#isResizeEnabled);
                }
            },
        };
        this.reset();
    }
    set snapshotAndLog(data) {
        const newSnapshot = data ? data.snapshot : null;
        const newLog = data ? data.log : [];
        const newClipRect = data ? (data.clipRect || null) : null;
        if (this.snapshot === newSnapshot && this.log === newLog) {
            return;
        }
        void this.setSnapshotAndLog(newSnapshot, newLog, newClipRect);
    }
    get snapshoAndLog() {
        return { snapshot: this.snapshot, log: this.log };
    }
    static categories() {
        if (!categories) {
            categories = {
                shapes: new PaintProfilerCategory('shapes', i18nString(UIStrings.shapes), 'rgb(255, 161, 129)'),
                bitmap: new PaintProfilerCategory('bitmap', i18nString(UIStrings.bitmap), 'rgb(136, 196, 255)'),
                text: new PaintProfilerCategory('text', i18nString(UIStrings.text), 'rgb(180, 255, 137)'),
                misc: new PaintProfilerCategory('misc', i18nString(UIStrings.misc), 'rgb(206, 160, 255)'),
            };
        }
        return categories;
    }
    static initLogItemCategories() {
        if (!logItemCategoriesMap) {
            const categories = PaintProfilerView.categories();
            const logItemCategories = {};
            logItemCategories['Clear'] = categories['misc'];
            logItemCategories['DrawPaint'] = categories['misc'];
            logItemCategories['DrawData'] = categories['misc'];
            logItemCategories['SetMatrix'] = categories['misc'];
            logItemCategories['PushCull'] = categories['misc'];
            logItemCategories['PopCull'] = categories['misc'];
            logItemCategories['Translate'] = categories['misc'];
            logItemCategories['Scale'] = categories['misc'];
            logItemCategories['Concat'] = categories['misc'];
            logItemCategories['Restore'] = categories['misc'];
            logItemCategories['SaveLayer'] = categories['misc'];
            logItemCategories['Save'] = categories['misc'];
            logItemCategories['BeginCommentGroup'] = categories['misc'];
            logItemCategories['AddComment'] = categories['misc'];
            logItemCategories['EndCommentGroup'] = categories['misc'];
            logItemCategories['ClipRect'] = categories['misc'];
            logItemCategories['ClipRRect'] = categories['misc'];
            logItemCategories['ClipPath'] = categories['misc'];
            logItemCategories['ClipRegion'] = categories['misc'];
            logItemCategories['DrawPoints'] = categories['shapes'];
            logItemCategories['DrawRect'] = categories['shapes'];
            logItemCategories['DrawOval'] = categories['shapes'];
            logItemCategories['DrawRRect'] = categories['shapes'];
            logItemCategories['DrawPath'] = categories['shapes'];
            logItemCategories['DrawVertices'] = categories['shapes'];
            logItemCategories['DrawDRRect'] = categories['shapes'];
            logItemCategories['DrawBitmap'] = categories['bitmap'];
            logItemCategories['DrawBitmapRectToRect'] = categories['bitmap'];
            logItemCategories['DrawBitmapMatrix'] = categories['bitmap'];
            logItemCategories['DrawBitmapNine'] = categories['bitmap'];
            logItemCategories['DrawSprite'] = categories['bitmap'];
            logItemCategories['DrawPicture'] = categories['bitmap'];
            logItemCategories['DrawText'] = categories['text'];
            logItemCategories['DrawPosText'] = categories['text'];
            logItemCategories['DrawPosTextH'] = categories['text'];
            logItemCategories['DrawTextOnPath'] = categories['text'];
            logItemCategoriesMap = logItemCategories;
        }
        return logItemCategoriesMap;
    }
    static categoryForLogItem(logItem) {
        const method = Platform.StringUtilities.toTitleCase(logItem.method);
        const logItemCategories = PaintProfilerView.initLogItemCategories();
        let result = logItemCategories[method];
        if (!result) {
            result = PaintProfilerView.categories()['misc'];
            logItemCategories[method] = result;
        }
        return result;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    onResize() {
        this.requestUpdate();
    }
    async setSnapshotAndLog(snapshot, log, clipRect) {
        this.reset();
        this.snapshot = snapshot;
        if (this.snapshot) {
            this.snapshot.addReference();
        }
        this.log = log;
        this.logCategories = this.log.map(PaintProfilerView.categoryForLogItem);
        if (!snapshot) {
            this.#isResizeEnabled = false;
            this.#selectionWindow?.setResizeEnabled(false);
            this.requestUpdate();
            return;
        }
        this.#isResizeEnabled = true;
        this.#selectionWindow?.setResizeEnabled(true);
        this.isProfiling = true;
        this.requestUpdate();
        this.updateImage();
        const profiles = await snapshot.profile(clipRect);
        this.isProfiling = false;
        this.profiles = profiles;
        this.requestUpdate();
    }
    set scale(scale) {
        const needsUpdate = scale > this.#scale;
        const predictiveGrowthFactor = 2;
        this.#pendingScale = Math.min(1, scale * predictiveGrowthFactor);
        if (needsUpdate && this.snapshot) {
            this.updateImage();
        }
    }
    get scale() {
        return this.#scale;
    }
    performUpdate() {
        const input = {
            isProfiling: this.isProfiling,
            log: this.log,
            profiles: this.profiles,
            logCategories: this.logCategories,
            innerBarWidth: this.innerBarWidth,
            minBarHeight: this.minBarHeight,
            barPaddingWidth: this.barPaddingWidth,
            outerBarWidth: this.outerBarWidth,
            windowLeftRatio: this.#selectionWindow?.windowLeftRatio || 0,
            windowRightRatio: this.#selectionWindow?.windowRightRatio || 0,
        };
        this.#view(input, this.#viewOutput, this.contentElement);
    }
    onWindowChanged() {
        this.dispatchEventToListeners("WindowChanged" /* Events.WINDOW_CHANGED */, this.selectionWindow());
        this.requestUpdate();
        if (this.updateImageTimer) {
            return;
        }
        this.updateImageTimer = window.setTimeout(this.updateImage.bind(this), 100);
    }
    selectionWindow() {
        if (!this.log || !this.canvasContainer || !this.#selectionWindow) {
            return null;
        }
        const canvasWidth = this.canvasContainer.clientWidth * window.devicePixelRatio;
        const maxBars = Math.floor((canvasWidth - 2 * this.barPaddingWidth) / this.outerBarWidth);
        const samplesPerBar = Math.ceil(this.log.length / maxBars);
        return calculateSelectionWindow(this.#selectionWindow.windowLeftRatio || 0, this.#selectionWindow.windowRightRatio || 0, canvasWidth, this.outerBarWidth, this.innerBarWidth, this.barPaddingWidth, samplesPerBar, this.log.length);
    }
    updateImage() {
        delete this.updateImageTimer;
        let left;
        let right;
        const window = this.selectionWindow();
        if (this.profiles?.length && window) {
            left = this.log[window.left].commandIndex;
            right = this.log[window.right - 1].commandIndex;
        }
        const scale = this.#pendingScale;
        if (!this.snapshot) {
            return;
        }
        void this.snapshot.replay(scale, left, right).then(image => {
            if (!image) {
                return;
            }
            this.#scale = scale;
            this.showImageCallback?.(image);
        });
    }
    reset() {
        if (this.snapshot) {
            this.snapshot.release();
        }
        this.snapshot = null;
        this.profiles = null;
        this.#selectionWindow?.reset();
        this.#selectionWindow?.setResizeEnabled(false);
        this.#isResizeEnabled = false;
        this.isProfiling = false;
    }
}
function paramToString(param, name) {
    if (typeof param !== 'object') {
        return typeof param === 'string' && param.length > 100 ? name : JSON.stringify(param);
    }
    let str = '';
    let keyCount = 0;
    for (const key in param) {
        const paramKey = param[key];
        if (++keyCount > 4 || typeof paramKey === 'object' || (typeof paramKey === 'string' && paramKey.length > 100)) {
            return name;
        }
        if (str) {
            str += ', ';
        }
        str += paramKey;
    }
    return str;
}
function paramsToString(params) {
    let str = '';
    for (const key in params) {
        if (str) {
            str += ', ';
        }
        str += paramToString(params[key], key);
    }
    return str;
}
function renderProperty(name, value) {
    const isObject = value !== null && typeof value === 'object';
    // clang-format off
    return html `
    <li role="treeitem">
      <span>${name}: </span>${isObject ? html `
          <ul role="group">
            ${Object.entries(value).map(([key, val]) => renderProperty(key, val))}
          </ul>` : html `
          <span>${JSON.stringify(value)}</span>`}
    </li>
  `;
    // clang-format on
}
function renderLogItem(logItem) {
    const hasParams = Boolean(logItem.params && Object.keys(logItem.params).length > 0);
    const titleText = logItem.method + '(' + paramsToString(logItem.params) + ')';
    // clang-format off
    return html `
    <li role="treeitem">
      ${titleText}
      ${hasParams ? html `
        <ul role="group">
          ${Object.entries(logItem.params || {}).map(([key, val]) => renderProperty(key, val))}
        </ul>` : nothing}
    </li>
  `;
    // clang-format on
}
// clang-format off
export const COMMAND_LOG_DEFAULT_VIEW = (input, _output, target) => {
    render(html `
    <div class="overflow-auto flex-auto vbox">
      <devtools-tree
          autofocus
          aria-label=${i18nString(UIStrings.commandLog)}
          .template=${html `
        <ul role="tree">
          ${input.visibleLogItems.map(item => renderLogItem(item))}
        </ul>`}>
      </devtools-tree>
    </div>`, target);
};
export class PaintProfilerCommandLogView extends UI.Widget.VBox {
    #log = [];
    #selectionWindow = null;
    #view;
    constructor(element, view = COMMAND_LOG_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.setMinimumSize(100, 25);
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    set commandLog(log) {
        if (this.#log === log) {
            return;
        }
        this.#log = log;
        this.#selectionWindow = { left: 0, right: this.#log.length };
        this.requestUpdate();
    }
    get commandLog() {
        return this.#log;
    }
    set selectionWindow(window) {
        this.#selectionWindow = window;
        this.requestUpdate();
    }
    get selectionWindow() {
        return this.#selectionWindow || null;
    }
    performUpdate() {
        const visibleLogItems = this.#selectionWindow && this.#log.length ?
            this.#log.slice(this.#selectionWindow.left, this.#selectionWindow.right) :
            [];
        this.#view({ visibleLogItems }, undefined, this.contentElement);
        return Promise.resolve();
    }
}
export class PaintProfilerCategory {
    name;
    title;
    color;
    constructor(name, title, color) {
        this.name = name;
        this.title = title;
        this.color = color;
    }
}
//# sourceMappingURL=PaintProfilerView.js.map