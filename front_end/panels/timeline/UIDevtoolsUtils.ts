/*
 * Copyright (C) 2019 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';

import {TimelineCategory, TimelineRecordStyle} from './EventUICategory.js';

const UIStrings = {
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  frameStart: 'Frame Start',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  drawFrame: 'Draw Frame',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  layout: 'Layout',
  /**
   *@description Text in UIDevtools Utils of the Performance panel
   */
  rasterizing: 'Rasterizing',
  /**
   *@description Text in UIDevtools Utils of the Performance panel
   */
  drawing: 'Drawing',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  painting: 'Painting',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  system: 'System',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  idle: 'Idle',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/UIDevtoolsUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _eventStylesMap: {
  [x: string]: TimelineRecordStyle,
}|null = null;

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _categories: {
  [x: string]: TimelineCategory,
}|null = null;

export class UIDevtoolsUtils {
  static isUiDevTools(): boolean {
    return Root.Runtime.Runtime.queryParam('uiDevTools') === 'true';
  }

  static categorizeEvents(): {
    [x: string]: TimelineRecordStyle,
  } {
    if (_eventStylesMap) {
      return _eventStylesMap;
    }

    const type = RecordType;
    const categories = UIDevtoolsUtils.categories();
    const drawing = categories['drawing'];
    const rasterizing = categories['rasterizing'];
    const layout = categories['layout'];
    const painting = categories['painting'];
    const other = categories['other'];

    const eventStyles: {
      [x: string]: TimelineRecordStyle,
    } = {};

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

    _eventStylesMap = eventStyles;
    return eventStyles;
  }

  static categories(): {
    [x: string]: TimelineCategory,
  } {
    if (_categories) {
      return _categories;
    }
    _categories = {
      layout: new TimelineCategory(
          'layout', i18nString(UIStrings.layout), true, '--app-color-loading-children', '--app-color-loading'),
      rasterizing: new TimelineCategory(
          'rasterizing', i18nString(UIStrings.rasterizing), true, '--app-color-children', '--app-color-scripting'),
      drawing: new TimelineCategory(
          'drawing', i18nString(UIStrings.drawing), true, '--app-color-rendering-children', '--app-color-rendering'),
      painting: new TimelineCategory(
          'painting', i18nString(UIStrings.painting), true, '--app-color-painting-children', '--app-color-painting'),
      other: new TimelineCategory(
          'other', i18nString(UIStrings.system), false, '--app-color-system-children', '--app-color-system'),
      idle: new TimelineCategory(
          'idle', i18nString(UIStrings.idle), false, '--app-color-idle-children', '--app-color-idle'),
    };
    return _categories;
  }

  static getMainCategoriesList(): string[] {
    return ['idle', 'drawing', 'painting', 'rasterizing', 'layout', 'other'];
  }
}

export enum RecordType {
  ViewPaint = 'View::Paint',
  ViewOnPaint = 'View::OnPaint',
  ViewPaintChildren = 'View::PaintChildren',
  ViewOnPaintBackground = 'View::OnPaintBackground',
  ViewOnPaintBorder = 'View::OnPaintBorder',
  ViewLayout = 'View::Layout',
  ViewLayoutBoundsChanged = 'View::Layout(bounds_changed)',
  LayerPaintContentsToDisplayList = 'Layer::PaintContentsToDisplayList',
  DirectRendererDrawFrame = 'DirectRenderer::DrawFrame',
  RasterTask = 'RasterTask',
  RasterizerTaskImplRunOnWorkerThread = 'RasterizerTaskImpl::RunOnWorkerThread',
  BeginFrame = 'BeginFrame',
  DrawFrame = 'DrawFrame',
  NeedsBeginFrameChanged = 'NeedsBeginFrameChanged',
  ThreadControllerImplRunTask = 'ThreadControllerImpl::RunTask',
}
