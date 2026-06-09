// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import paintProfilerStyles from './paintProfiler.css.js';
const { html, render, nothing } = Lit;
const { repeat } = Lit.Directives;
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
export class PaintProfilerView extends Common.ObjectWrapper.eventMixin(UI.Widget.HBox) {
    canvasContainer;
    progressBanner;
    pieChart;
    showImageCallback;
    canvas;
    context;
    #selectionWindow;
    innerBarWidth;
    minBarHeight;
    barPaddingWidth;
    outerBarWidth;
    pendingScale;
    scale;
    samplesPerBar;
    log;
    snapshot;
    logCategories;
    profiles;
    updateImageTimer;
    constructor(showImageCallback) {
        super({ useShadowDom: true });
        this.registerRequiredCSS(paintProfilerStyles);
        this.contentElement.classList.add('paint-profiler-overview');
        this.canvasContainer = this.contentElement.createChild('div', 'paint-profiler-canvas-container');
        this.progressBanner = this.contentElement.createChild('div', 'empty-state hidden');
        this.progressBanner.textContent = i18nString(UIStrings.profiling);
        this.pieChart = new PerfUI.PieChart.PieChart();
        this.populatePieChart(0, []);
        this.pieChart.classList.add('paint-profiler-pie-chart');
        this.contentElement.appendChild(this.pieChart);
        this.showImageCallback = showImageCallback;
        this.canvas = this.canvasContainer.createChild('canvas', 'fill');
        this.context = this.canvas.getContext('2d');
        this.#selectionWindow = new PerfUI.OverviewGrid.Window(this.canvasContainer);
        this.#selectionWindow.addEventListener("WindowChanged" /* PerfUI.OverviewGrid.Events.WINDOW_CHANGED */, this.onWindowChanged, this);
        this.innerBarWidth = 4 * window.devicePixelRatio;
        this.minBarHeight = window.devicePixelRatio;
        this.barPaddingWidth = 2 * window.devicePixelRatio;
        this.outerBarWidth = this.innerBarWidth + this.barPaddingWidth;
        this.pendingScale = 1;
        this.scale = this.pendingScale;
        this.samplesPerBar = 0;
        this.log = [];
        this.reset();
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
    onResize() {
        this.update();
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
            this.update();
            this.populatePieChart(0, []);
            this.#selectionWindow.setResizeEnabled(false);
            return;
        }
        this.#selectionWindow.setResizeEnabled(true);
        this.progressBanner.classList.remove('hidden');
        this.updateImage();
        const profiles = await snapshot.profile(clipRect);
        this.progressBanner.classList.add('hidden');
        this.profiles = profiles;
        this.update();
        this.updatePieChart();
    }
    setScale(scale) {
        const needsUpdate = scale > this.scale;
        const predictiveGrowthFactor = 2;
        this.pendingScale = Math.min(1, scale * predictiveGrowthFactor);
        if (needsUpdate && this.snapshot) {
            this.updateImage();
        }
    }
    update() {
        this.canvas.width = this.canvasContainer.clientWidth * window.devicePixelRatio;
        this.canvas.height = this.canvasContainer.clientHeight * window.devicePixelRatio;
        this.samplesPerBar = 0;
        if (!this.profiles?.length || !this.logCategories) {
            return;
        }
        const maxBars = Math.floor((this.canvas.width - 2 * this.barPaddingWidth) / this.outerBarWidth);
        const sampleCount = this.log.length;
        this.samplesPerBar = Math.ceil(sampleCount / maxBars);
        let maxBarTime = 0;
        const barTimes = [];
        const barHeightByCategory = [];
        let heightByCategory = {};
        for (let i = 0, lastBarIndex = 0, lastBarTime = 0; i < sampleCount;) {
            let categoryName = (this.logCategories[i]?.name) || 'misc';
            const sampleIndex = this.log[i].commandIndex;
            for (let row = 0; row < this.profiles.length; row++) {
                const sample = this.profiles[row][sampleIndex];
                lastBarTime += sample;
                heightByCategory[categoryName] = (heightByCategory[categoryName] || 0) + sample;
            }
            ++i;
            if (i - lastBarIndex === this.samplesPerBar || i === sampleCount) {
                // Normalize by total number of samples accumulated.
                const factor = this.profiles.length * (i - lastBarIndex);
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
        const scale = (this.canvas.height - paddingHeight - this.minBarHeight) / maxBarTime;
        for (let i = 0; i < barTimes.length; ++i) {
            for (const categoryName in barHeightByCategory[i]) {
                barHeightByCategory[i][categoryName] *= (barTimes[i] * scale + this.minBarHeight) / barTimes[i];
            }
            this.renderBar(i, barHeightByCategory[i]);
        }
    }
    renderBar(index, heightByCategory) {
        const categories = PaintProfilerView.categories();
        let currentHeight = 0;
        const x = this.barPaddingWidth + index * this.outerBarWidth;
        for (const categoryName in categories) {
            if (!heightByCategory[categoryName]) {
                continue;
            }
            currentHeight += heightByCategory[categoryName];
            const y = this.canvas.height - currentHeight;
            this.context.fillStyle = categories[categoryName].color;
            this.context.fillRect(x, y, this.innerBarWidth, heightByCategory[categoryName]);
        }
    }
    onWindowChanged() {
        this.dispatchEventToListeners("WindowChanged" /* Events.WINDOW_CHANGED */);
        this.updatePieChart();
        if (this.updateImageTimer) {
            return;
        }
        this.updateImageTimer = window.setTimeout(this.updateImage.bind(this), 100);
    }
    updatePieChart() {
        const { total, slices } = this.calculatePieChart();
        this.populatePieChart(total, slices);
    }
    calculatePieChart() {
        const window = this.selectionWindow();
        if (!this.profiles?.length || !window) {
            return { total: 0, slices: [] };
        }
        let totalTime = 0;
        const timeByCategory = {};
        for (let i = window.left; i < window.right; ++i) {
            const logEntry = this.log[i];
            const category = PaintProfilerView.categoryForLogItem(logEntry);
            timeByCategory[category.color] = timeByCategory[category.color] || 0;
            for (let j = 0; j < this.profiles.length; ++j) {
                const time = this.profiles[j][logEntry.commandIndex];
                totalTime += time;
                timeByCategory[category.color] += time;
            }
        }
        const slices = [];
        for (const color in timeByCategory) {
            slices.push({ value: timeByCategory[color] / this.profiles.length, color, title: '' });
        }
        return { total: totalTime / this.profiles.length, slices };
    }
    populatePieChart(total, slices) {
        this.pieChart.data = {
            chartName: i18nString(UIStrings.profilingResults),
            size: 55,
            formatter: this.formatPieChartTime.bind(this),
            showLegend: false,
            total,
            slices,
        };
    }
    formatPieChartTime(value) {
        return i18n.TimeUtilities.millisToString(value * 1000, true);
    }
    selectionWindow() {
        if (!this.log) {
            return null;
        }
        const screenLeft = (this.#selectionWindow.windowLeftRatio || 0) * this.canvas.width;
        const screenRight = (this.#selectionWindow.windowRightRatio || 0) * this.canvas.width;
        const barLeft = Math.floor(screenLeft / this.outerBarWidth);
        const barRight = Math.floor((screenRight + this.innerBarWidth - this.barPaddingWidth / 2) / this.outerBarWidth);
        const stepLeft = Platform.NumberUtilities.clamp(barLeft * this.samplesPerBar, 0, this.log.length - 1);
        const stepRight = Platform.NumberUtilities.clamp(barRight * this.samplesPerBar, 0, this.log.length);
        return { left: stepLeft, right: stepRight };
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
        const scale = this.pendingScale;
        if (!this.snapshot) {
            return;
        }
        void this.snapshot.replay(scale, left, right).then(image => {
            if (!image) {
                return;
            }
            this.scale = scale;
            this.showImageCallback(image);
        });
    }
    reset() {
        if (this.snapshot) {
            this.snapshot.release();
        }
        this.snapshot = null;
        this.profiles = null;
        this.#selectionWindow.reset();
        this.#selectionWindow.setResizeEnabled(false);
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
          ${repeat(input.visibleLogItems, item => item.commandIndex, item => renderLogItem(item))}
        </ul>`}>
      </devtools-tree>
    </div>`, target);
};
export class PaintProfilerCommandLogView extends UI.Widget.VBox {
    log;
    selectionWindow;
    #view;
    constructor(element, view = COMMAND_LOG_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.setMinimumSize(100, 25);
        this.log = [];
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    setCommandLog(log) {
        this.log = log;
        this.updateWindow({ left: 0, right: this.log.length });
    }
    updateWindow(selectionWindow) {
        this.selectionWindow = selectionWindow;
        this.requestUpdate();
    }
    performUpdate() {
        const visibleLogItems = this.selectionWindow && this.log.length ?
            this.log.slice(this.selectionWindow.left, this.selectionWindow.right) :
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