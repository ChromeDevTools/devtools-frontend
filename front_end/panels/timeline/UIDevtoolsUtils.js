// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Trace from '../../models/trace/trace.js';
const UIStrings = {
    /**
     * @description Label for a frame start event in the Performance panel.
     */
    frameStart: 'Frame start',
    /**
     * @description Label for a draw frame event in the Performance panel.
     */
    drawFrame: 'Draw frame',
    /**
     * @description Label for a layout event in the Performance panel.
     */
    layout: 'Layout',
    /**
     * @description Label for a rasterizing event in the Performance panel.
     */
    rasterizing: 'Rasterizing',
    /**
     * @description Label for a drawing event in the Performance panel.
     */
    drawing: 'Drawing',
    /**
     * @description Label for a painting event in the Performance panel.
     */
    painting: 'Painting',
    /**
     * @description Event category for system activity in the Performance panel.
     */
    system: 'System',
    /**
     * @description Event category for idle time in the Performance panel.
     */
    idle: 'Idle',
    /**
     * @description Event category for network and resource loading in the Performance panel.
     */
    loading: 'Loading',
    /**
     * @description Header for the user experience events track in the Performance panel.
     */
    experience: 'Experience',
    /**
     * @description Event category for script execution in the Performance panel.
     */
    scripting: 'Scripting',
    /**
     * @description Event category for layout and rendering in the Performance panel.
     */
    rendering: 'Rendering',
    /**
     * @description Event category for GPU activity in the Performance panel.
     */
    gpu: 'GPU',
    /**
     * @description Event category for asynchronous activity in the Performance panel.
     */
    async: 'Async',
    /**
     * @description Event category for messaging activity in the Performance panel.
     */
    messaging: 'Messaging',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/UIDevtoolsUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let eventStylesMap = null;
let categories = null;
export class UIDevtoolsUtils {
    static isUiDevTools() {
        return Root.Runtime.Runtime.queryParam('uiDevTools') === 'true';
    }
    static categorizeEvents() {
        if (eventStylesMap) {
            return eventStylesMap;
        }
        const type = RecordType;
        const categories = UIDevtoolsUtils.categories();
        const drawing = categories['drawing'];
        const rasterizing = categories['rasterizing'];
        const layout = categories['layout'];
        const painting = categories['painting'];
        const other = categories['other'];
        const eventStyles = {};
        const { TimelineRecordStyle } = Trace.Styles;
        // Paint Categories
        eventStyles[type.ViewPaint] = new TimelineRecordStyle('View::Paint', painting);
        eventStyles[type.ViewOnPaint] = new TimelineRecordStyle('View::OnPaint', painting);
        eventStyles[type.ViewPaintChildren] = new TimelineRecordStyle('View::PaintChildren', painting);
        eventStyles[type.ViewOnPaintBackground] = new TimelineRecordStyle('View::OnPaintBackground', painting);
        eventStyles[type.ViewOnPaintBorder] = new TimelineRecordStyle('View::OnPaintBorder', painting);
        eventStyles[type.LayerPaintContentsToDisplayList] =
            new TimelineRecordStyle('Layer::PaintContentsToDisplayList', painting);
        // Layout Categories
        eventStyles[type.ViewLayout] = new TimelineRecordStyle('View::Layout', layout);
        eventStyles[type.ViewLayoutBoundsChanged] = new TimelineRecordStyle('View::Layout(bounds_changed)', layout);
        // Raster Categories
        eventStyles[type.RasterTask] = new TimelineRecordStyle('RasterTask', rasterizing);
        eventStyles[type.RasterizerTaskImplRunOnWorkerThread] =
            new TimelineRecordStyle('RasterizerTaskImpl::RunOnWorkerThread', rasterizing);
        // Draw Categories
        eventStyles[type.DirectRendererDrawFrame] = new TimelineRecordStyle('DirectRenderer::DrawFrame', drawing);
        eventStyles[type.BeginFrame] = new TimelineRecordStyle(i18nString(UIStrings.frameStart), drawing, true);
        eventStyles[type.DrawFrame] = new TimelineRecordStyle(i18nString(UIStrings.drawFrame), drawing, true);
        eventStyles[type.NeedsBeginFrameChanged] = new TimelineRecordStyle('NeedsBeginFrameChanged', drawing, true);
        // Other Categories
        eventStyles[type.ThreadControllerImplRunTask] = new TimelineRecordStyle('ThreadControllerImpl::RunTask', other);
        eventStylesMap = eventStyles;
        return eventStyles;
    }
    static categories() {
        if (categories) {
            return categories;
        }
        const { TimelineCategory, EventCategory } = Trace.Styles;
        categories = {
            layout: new TimelineCategory(EventCategory.LAYOUT, i18nString(UIStrings.layout), true, '--app-color-loading'),
            rasterizing: new TimelineCategory(EventCategory.RASTERIZING, i18nString(UIStrings.rasterizing), true, '--app-color-scripting'),
            drawing: new TimelineCategory(EventCategory.DRAWING, i18nString(UIStrings.drawing), true, '--app-color-rendering'),
            painting: new TimelineCategory(EventCategory.PAINTING, i18nString(UIStrings.painting), true, '--app-color-painting'),
            other: new TimelineCategory(EventCategory.OTHER, i18nString(UIStrings.system), false, '--app-color-system'),
            idle: new TimelineCategory(EventCategory.IDLE, i18nString(UIStrings.idle), false, '--app-color-idle'),
            loading: new TimelineCategory(EventCategory.LOADING, i18nString(UIStrings.loading), false, '--app-color-loading'),
            experience: new TimelineCategory(EventCategory.EXPERIENCE, i18nString(UIStrings.experience), false, '--app-color-rendering'),
            messaging: new TimelineCategory(EventCategory.MESSAGING, i18nString(UIStrings.messaging), false, '--app-color-messaging'),
            scripting: new TimelineCategory(EventCategory.SCRIPTING, i18nString(UIStrings.scripting), false, '--app-color-scripting'),
            rendering: new TimelineCategory(EventCategory.RENDERING, i18nString(UIStrings.rendering), false, '--app-color-rendering'),
            gpu: new TimelineCategory(EventCategory.GPU, i18nString(UIStrings.gpu), false, '--app-color-painting'),
            async: new TimelineCategory(EventCategory.ASYNC, i18nString(UIStrings.async), false, '--app-color-async'),
        };
        return categories;
    }
    static getMainCategoriesList() {
        return ['idle', 'drawing', 'painting', 'rasterizing', 'layout', 'other'];
    }
}
export var RecordType;
(function (RecordType) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    RecordType["ViewPaint"] = "View::Paint";
    RecordType["ViewOnPaint"] = "View::OnPaint";
    RecordType["ViewPaintChildren"] = "View::PaintChildren";
    RecordType["ViewOnPaintBackground"] = "View::OnPaintBackground";
    RecordType["ViewOnPaintBorder"] = "View::OnPaintBorder";
    RecordType["ViewLayout"] = "View::Layout";
    RecordType["ViewLayoutBoundsChanged"] = "View::Layout(bounds_changed)";
    RecordType["LayerPaintContentsToDisplayList"] = "Layer::PaintContentsToDisplayList";
    RecordType["DirectRendererDrawFrame"] = "DirectRenderer::DrawFrame";
    RecordType["RasterTask"] = "RasterTask";
    RecordType["RasterizerTaskImplRunOnWorkerThread"] = "RasterizerTaskImpl::RunOnWorkerThread";
    RecordType["BeginFrame"] = "BeginFrame";
    RecordType["DrawFrame"] = "DrawFrame";
    RecordType["NeedsBeginFrameChanged"] = "NeedsBeginFrameChanged";
    RecordType["ThreadControllerImplRunTask"] = "ThreadControllerImpl::RunTask";
    /* eslint-enable @typescript-eslint/naming-convention */
})(RecordType || (RecordType = {}));
//# sourceMappingURL=UIDevtoolsUtils.js.map