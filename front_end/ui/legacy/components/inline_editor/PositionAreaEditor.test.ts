// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {assertScreenshot, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';

import * as InlineEditor from './inline_editor.js';

const {
  Mode,
  Axis,
  parsePositionArea,
  stringifyPositionArea,
} = InlineEditor.PositionAreaEditor;

describe('PositionAreaEditor', () => {
  describe('parsePositionArea', () => {
    it('parses single physical keywords', () => {
      assert.deepEqual(parsePositionArea('top'), {
        first: {start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 2, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('bottom'), {
        first: {start: 2, end: 2, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 2, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('left'), {
        first: {start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 2, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.INLINE,
      });
      assert.deepEqual(parsePositionArea('right'), {
        first: {start: 2, end: 2, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 2, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.INLINE,
      });
      assert.deepEqual(parsePositionArea('span-top'), {
        first: {start: 0, end: 1, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 2, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('span-right'), {
        first: {start: 1, end: 2, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 2, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.INLINE,
      });
    });

    it('parses center and span-all shortcuts', () => {
      assert.deepEqual(parsePositionArea('center'), {
        first: {start: 1, end: 1, mode: Mode.AUTO, self: false},
        second: {start: 1, end: 1, mode: Mode.AUTO, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('span-all'), {
        first: {start: 0, end: 2, mode: Mode.AUTO, self: false},
        second: {start: 0, end: 2, mode: Mode.AUTO, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('start'), {
        first: {start: 0, end: 0, mode: Mode.AUTO, self: false},
        second: {start: 0, end: 0, mode: Mode.AUTO, self: false},
        primaryAxis: Axis.BLOCK,
      });
    });

    it('parses two physical keywords preserving authored order', () => {
      assert.deepEqual(parsePositionArea('top left'), {
        first: {start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('left top'), {
        first: {start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.INLINE,
      });
      assert.deepEqual(parsePositionArea('bottom center'), {
        first: {start: 2, end: 2, mode: Mode.PHYSICAL, self: false},
        second: {start: 1, end: 1, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('center right'), {
        first: {start: 1, end: 1, mode: Mode.PHYSICAL, self: false},
        second: {start: 2, end: 2, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('span-bottom span-left'), {
        first: {start: 1, end: 2, mode: Mode.PHYSICAL, self: false},
        second: {start: 0, end: 1, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
    });

    it('parses coordinate keywords', () => {
      assert.deepEqual(parsePositionArea('y-start x-end'), {
        first: {start: 0, end: 0, mode: Mode.COORDINATE, self: false},
        second: {start: 2, end: 2, mode: Mode.COORDINATE, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('span-x-start y-end'), {
        first: {start: 0, end: 1, mode: Mode.COORDINATE, self: false},
        second: {start: 2, end: 2, mode: Mode.COORDINATE, self: false},
        primaryAxis: Axis.INLINE,
      });
    });

    it('parses logical keywords', () => {
      assert.deepEqual(parsePositionArea('block-start inline-end'), {
        first: {start: 0, end: 0, mode: Mode.LOGICAL, self: false},
        second: {start: 2, end: 2, mode: Mode.LOGICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('inline-start span-block-end'), {
        first: {start: 0, end: 0, mode: Mode.LOGICAL, self: false},
        second: {start: 1, end: 2, mode: Mode.LOGICAL, self: false},
        primaryAxis: Axis.INLINE,
      });
      assert.deepEqual(parsePositionArea('block-end'), {
        first: {start: 2, end: 2, mode: Mode.LOGICAL, self: false},
        second: {start: 0, end: 2, mode: Mode.LOGICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
    });

    it('parses auto keywords', () => {
      assert.deepEqual(parsePositionArea('start end'), {
        first: {start: 0, end: 0, mode: Mode.AUTO, self: false},
        second: {start: 2, end: 2, mode: Mode.AUTO, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('span-start center'), {
        first: {start: 0, end: 1, mode: Mode.AUTO, self: false},
        second: {start: 1, end: 1, mode: Mode.AUTO, self: false},
        primaryAxis: Axis.BLOCK,
      });
    });

    it('parses self-* keywords', () => {
      assert.deepEqual(parsePositionArea('self-block-start self-inline-end'), {
        first: {start: 0, end: 0, mode: Mode.LOGICAL, self: true},
        second: {start: 2, end: 2, mode: Mode.LOGICAL, self: true},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('self-y-start self-x-end'), {
        first: {start: 0, end: 0, mode: Mode.COORDINATE, self: true},
        second: {start: 2, end: 2, mode: Mode.COORDINATE, self: true},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('self-start self-end'), {
        first: {start: 0, end: 0, mode: Mode.AUTO, self: true},
        second: {start: 2, end: 2, mode: Mode.AUTO, self: true},
        primaryAxis: Axis.BLOCK,
      });
    });

    it('parses mixed axis modes', () => {
      assert.deepEqual(parsePositionArea('top inline-end'), {
        first: {start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
        second: {start: 2, end: 2, mode: Mode.LOGICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('block-start right'), {
        first: {start: 0, end: 0, mode: Mode.LOGICAL, self: false},
        second: {start: 2, end: 2, mode: Mode.PHYSICAL, self: false},
        primaryAxis: Axis.BLOCK,
      });
      assert.deepEqual(parsePositionArea('top self-end'), {
        first: {start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
        second: {start: 2, end: 2, mode: Mode.AUTO, self: true},
        primaryAxis: Axis.BLOCK,
      });
    });

    it('returns null for invalid inputs', () => {
      assert.isNull(parsePositionArea(''));
      assert.isNull(parsePositionArea('none'));
      assert.isNull(parsePositionArea('top left right'));
      assert.isNull(parsePositionArea('invalid-token'));
      assert.isNull(parsePositionArea('top bottom'));
      assert.isNull(parsePositionArea('left right'));
    });
  });

  describe('stringifyPositionArea', () => {
    it('stringifies simple keywords and shortcuts', () => {
      const top = parsePositionArea('top');
      assert.exists(top);
      assert.strictEqual(stringifyPositionArea(top), 'top');

      const center = parsePositionArea('center');
      assert.exists(center);
      assert.strictEqual(stringifyPositionArea(center), 'center');

      const spanAll = parsePositionArea('span-all');
      assert.exists(spanAll);
      assert.strictEqual(stringifyPositionArea(spanAll), 'span-all');

      const topSpanLeft = parsePositionArea('top span-left');
      assert.exists(topSpanLeft);
      assert.strictEqual(stringifyPositionArea(topSpanLeft), 'top span-left');

      const bottomRight = parsePositionArea('bottom right');
      assert.exists(bottomRight);
      assert.strictEqual(stringifyPositionArea(bottomRight), 'bottom right');

      const centerAll = parsePositionArea('center span-all');
      assert.exists(centerAll);
      assert.strictEqual(stringifyPositionArea(centerAll), 'center span-all');

      const start = parsePositionArea('start');
      assert.exists(start);
      assert.strictEqual(stringifyPositionArea(start), 'start');
    });

    it('stringifies logical keywords', () => {
      const blockStartInlineEnd = parsePositionArea('block-start inline-end');
      assert.exists(blockStartInlineEnd);
      assert.strictEqual(stringifyPositionArea(blockStartInlineEnd), 'block-start inline-end');
    });
  });

  describe('presenter', () => {
    it('updates view input when setting area', async () => {
      const view = createViewFunctionStub(InlineEditor.PositionAreaEditor.PositionAreaEditor);
      const editor = new InlineEditor.PositionAreaEditor.PositionAreaEditor(undefined, view);
      editor.wasShown();

      const area = parsePositionArea('top left');
      assert.exists(area);
      editor.area = area;
      await view.nextInput;
      assert.strictEqual(editor.area, area);
      assert.strictEqual(view.input.area, area);
    });

    it('handles selection with SelectStart and SelectEnd', async () => {
      const view = createViewFunctionStub(InlineEditor.PositionAreaEditor.PositionAreaEditor);
      const editor = new InlineEditor.PositionAreaEditor.PositionAreaEditor(undefined, view);
      editor.area = parsePositionArea('top left') ?? undefined;
      editor.wasShown();
      await editor.updateComplete;

      const changeSpy = sinon.spy();
      editor.addEventListener(InlineEditor.PositionAreaEditor.Events.POSITION_AREA_CHANGED, changeSpy);

      view.input.onSelectStart(0, 0);
      view.input.onSelectEnd(2, 2);

      assert.exists(editor.area);
      assert.strictEqual(stringifyPositionArea(editor.area), 'span-all');
      sinon.assert.called(changeSpy);
    });

    it('handles selection with SelectStart, Select, and SelectEnd', async () => {
      const view = createViewFunctionStub(InlineEditor.PositionAreaEditor.PositionAreaEditor);
      const editor = new InlineEditor.PositionAreaEditor.PositionAreaEditor(undefined, view);
      editor.area = parsePositionArea('top left') ?? undefined;
      editor.wasShown();
      await editor.updateComplete;

      const changeSpy = sinon.spy();
      editor.addEventListener(InlineEditor.PositionAreaEditor.Events.POSITION_AREA_CHANGED, changeSpy);

      view.input.onSelectStart(0, 0);
      view.input.onSelect(1, 0);
      assert.exists(editor.area);
      assert.strictEqual(stringifyPositionArea(editor.area), 'top span-left');

      view.input.onSelectEnd(2, 0);
      assert.exists(editor.area);
      assert.strictEqual(stringifyPositionArea(editor.area), 'top');
      sinon.assert.called(changeSpy);
    });

    it('restores original area on cancelled selection (SelectStart, SelectEnd(undefined))', async () => {
      const view = createViewFunctionStub(InlineEditor.PositionAreaEditor.PositionAreaEditor);
      const editor = new InlineEditor.PositionAreaEditor.PositionAreaEditor(undefined, view);
      const initialArea = parsePositionArea('top left') ?? undefined;
      editor.area = initialArea;
      editor.wasShown();
      await editor.updateComplete;

      view.input.onSelectStart(1, 1);
      assert.exists(editor.area);
      assert.strictEqual(stringifyPositionArea(editor.area), 'center');

      view.input.onSelectEnd(undefined, undefined);
      assert.exists(editor.area);
      assert.strictEqual(stringifyPositionArea(editor.area), 'top left');
    });
  });

  describe('DEFAULT_VIEW screenshot', () => {
    it('renders the view', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target, {includeCommonStyles: true});
      const area = parsePositionArea('top span-left');
      assert.exists(area);
      InlineEditor.PositionAreaEditor.DEFAULT_VIEW({
        area,
        onSelectStart: () => {},
        onSelect: () => {},
        onSelectEnd: () => {},
      },
                                                   undefined, target);
      await assertScreenshot('inline_editor/position_area_editor.png');
    });
  });
});
