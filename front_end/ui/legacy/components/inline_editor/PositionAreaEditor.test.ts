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
        onModeChange: () => {},
        onSelfChange: () => {},
      },
                                                   undefined, target);
      await assertScreenshot('inline_editor/position_area_editor.png');
    });
  });

  it('correctly transitions between axis classes', async () => {
    const view = createViewFunctionStub(InlineEditor.PositionAreaEditor.PositionAreaEditor);
    const editor = new InlineEditor.PositionAreaEditor.PositionAreaEditor(undefined, view);
    const physicalInline = ['left', 'right', 'span-left', 'span-right'];
    const coordinateInline = ['x-start', 'x-end', 'span-x-start', 'span-x-end'];
    const coordinateInlineSelf = ['self-x-start', 'self-x-end', 'span-self-x-start', 'span-self-x-end'];
    const physicalBlock = ['top', 'bottom', 'span-top', 'span-bottom'];
    const coordinateBlock = ['y-start', 'y-end', 'span-y-start', 'span-y-end'];
    const coordinateBlockSelf = ['self-y-start', 'self-y-end', 'span-self-y-start', 'span-self-y-end'];

    const logicalBlock = ['block-start', 'block-end', 'span-block-start', 'span-block-end'];
    const logicalInline = ['inline-start', 'inline-end', 'span-inline-start', 'span-inline-end'];
    const logicalBlockSelf = ['self-block-start', 'self-block-end', 'span-self-block-start', 'span-self-block-end'];
    const logicalInlineSelf =
        ['self-inline-start', 'self-inline-end', 'span-self-inline-start', 'span-self-inline-end'];
    const auto = ['start', 'end', 'span-start', 'span-end'];
    const autoSelf = ['self-start', 'self-end', 'span-self-start', 'span-self-end'];

    function checkMode(axis: InlineEditor.PositionAreaEditor.Axis, current: [string[], string[]],
                       mode: InlineEditor.PositionAreaEditor.Mode, expected: [string[], string[]]) {
      for (const keyword of [0, 1, 2, 3]) {
        const area = parsePositionArea(`${current[0][keyword]} ${current[1][keyword]}`);
        assert.exists(area);
        editor.area = area;
        // Intentionally using performUpdate instead of requestUpdate. Otherwise each helper would take 4 animation
        // frames, which would make this test take around 15s.
        editor.performUpdate();
        view.input.onModeChange(axis, mode);
        editor.performUpdate();
        assert.exists(view.input.area);
        const expectedFirst = expected[0][keyword];
        const expectedSecond = expected[1][keyword];
        assert.strictEqual(stringifyPositionArea(view.input.area),
                           expectedFirst === expectedSecond ? expectedFirst : `${expectedFirst} ${expectedSecond}`);

        if (current[0] !== current[1]) {
          const flippedArea = parsePositionArea(`${current[1][keyword]} ${current[0][keyword]}`);
          assert.exists(flippedArea);
          editor.area = flippedArea;
          editor.performUpdate();
          view.input.onModeChange(axis, mode);
          editor.performUpdate();
          assert.exists(view.input.area);
          assert.strictEqual(stringifyPositionArea(view.input.area),
                             expectedSecond === expectedFirst ? expectedSecond : `${expectedSecond} ${expectedFirst}`);
        }
      }
    }

    function checkSelf(axis: InlineEditor.PositionAreaEditor.Axis, current: [string[], string[]], self: boolean,
                       expected: [string[], string[]]) {
      for (const keyword of [0, 1, 2, 3]) {
        const area = parsePositionArea(`${current[0][keyword]} ${current[1][keyword]}`);
        assert.exists(area);
        editor.area = area;
        editor.performUpdate();
        view.input.onSelfChange(axis, self);
        editor.performUpdate();
        assert.exists(view.input.area);
        const expectedFirst = expected[0][keyword];
        const expectedSecond = expected[1][keyword];
        assert.strictEqual(stringifyPositionArea(view.input.area),
                           expectedFirst === expectedSecond ? expectedFirst : `${expectedFirst} ${expectedSecond}`);

        if (current[0] !== current[1]) {
          const flippedArea = parsePositionArea(`${current[1][keyword]} ${current[0][keyword]}`);
          assert.exists(flippedArea);
          editor.area = flippedArea;
          editor.performUpdate();
          view.input.onSelfChange(axis, self);
          editor.performUpdate();
          assert.exists(view.input.area);
          assert.strictEqual(stringifyPositionArea(view.input.area),
                             expectedSecond === expectedFirst ? expectedSecond : `${expectedSecond} ${expectedFirst}`);
        }
      }
    }

    // [physical, physical] + coordinate = [coordinate, physical] / [physical, coordinate]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [physicalInline, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [coordinateInline, physicalBlock]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [physicalInline, coordinateBlock]);

    // [coordinate, physical] + physical = [physical, physical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [coordinateInline, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [physicalInline, physicalBlock]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, coordinateBlock],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [physicalInline, physicalBlock]);

    // [coordinate/s, physical] + physical = [physical, physical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [coordinateInlineSelf, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [physicalInline, physicalBlock]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, coordinateBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [physicalInline, physicalBlock]);

    // [physical, physical] + logical = [logical, logical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [physicalInline, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.LOGICAL, [logicalInline, logicalBlock]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.LOGICAL, [logicalInline, logicalBlock]);

    // [coordinate, physical] + logical = [logical, logical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [coordinateInline, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.LOGICAL, [logicalInline, logicalBlock]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, coordinateBlock],
              InlineEditor.PositionAreaEditor.Mode.LOGICAL, [logicalInline, logicalBlock]);

    // [coordinate/s, physical] + logical = [logical/s, logical/s]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [coordinateInlineSelf, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.LOGICAL, [logicalInlineSelf, logicalBlockSelf]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, coordinateBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.LOGICAL, [logicalInlineSelf, logicalBlockSelf]);

    // [coordinate, physical] + auto = [auto, auto]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [coordinateInline, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.AUTO, [auto, auto]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, coordinateBlock],
              InlineEditor.PositionAreaEditor.Mode.AUTO, [auto, auto]);

    // [coordinate/s, physical] + auto = [auto/s, auto/s]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [coordinateInlineSelf, physicalBlock],
              InlineEditor.PositionAreaEditor.Mode.AUTO, [autoSelf, autoSelf]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, coordinateBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.AUTO, [autoSelf, autoSelf]);

    // [logical, logical] + physical = [physical, physical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [logicalInline, logicalBlock],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [physicalInline, physicalBlock]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [logicalInline, logicalBlock],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [physicalInline, physicalBlock]);

    // [logical/s, logical/s] + physical = [physical, coordinate/s] / [coordinate/s, physical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [logicalInlineSelf, logicalBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [physicalInline, coordinateBlockSelf]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [logicalInlineSelf, logicalBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [coordinateInlineSelf, physicalBlock]);

    // [auto, auto] + physical = [physical, physical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [auto, auto], InlineEditor.PositionAreaEditor.Mode.PHYSICAL,
              [physicalBlock, physicalInline]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [auto, auto], InlineEditor.PositionAreaEditor.Mode.PHYSICAL,
              [physicalBlock, physicalInline]);

    // [auto/s, auto/s] + physical = [coordinate/s, physical] / [physical, coordinate/s]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [autoSelf, autoSelf],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [coordinateBlockSelf, physicalInline]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [autoSelf, autoSelf],
              InlineEditor.PositionAreaEditor.Mode.PHYSICAL, [physicalBlock, coordinateInlineSelf]);

    // [logical, logical] + coordinate = [coordinate, physical] / [physical, coordinate]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [logicalInline, logicalBlock],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [coordinateInline, physicalBlock]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [logicalInline, logicalBlock],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [physicalInline, coordinateBlock]);

    // [logical/s, logical/s] + coordinate = [coordinate/s, coordinate/s]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [logicalInlineSelf, logicalBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [coordinateInlineSelf, coordinateBlockSelf]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [logicalInlineSelf, logicalBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [coordinateInlineSelf, coordinateBlockSelf]);

    // [auto, auto] + coordinate = [physical, coordinate] / [coordinate, physical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [auto, auto],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [physicalBlock, coordinateInline]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [auto, auto], InlineEditor.PositionAreaEditor.Mode.COORDINATE,
              [coordinateBlock, physicalInline]);

    // [auto/s, auto/s] + coordinate = [coordinate/s, coordinate/s]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [autoSelf, autoSelf],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [coordinateBlockSelf, coordinateInlineSelf]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [autoSelf, autoSelf],
              InlineEditor.PositionAreaEditor.Mode.COORDINATE, [coordinateBlockSelf, coordinateInlineSelf]);

    // [logical, logical] + auto = [auto, auto]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [logicalInline, logicalBlock],
              InlineEditor.PositionAreaEditor.Mode.AUTO, [auto, auto]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [logicalInline, logicalBlock],
              InlineEditor.PositionAreaEditor.Mode.AUTO, [auto, auto]);

    // [logical/s, logical/s] + auto = [auto/s, auto/s]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [logicalInlineSelf, logicalBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.AUTO, [autoSelf, autoSelf]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [logicalInlineSelf, logicalBlockSelf],
              InlineEditor.PositionAreaEditor.Mode.AUTO, [autoSelf, autoSelf]);

    // [auto, auto] + logical = [logical, logical]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [auto, auto], InlineEditor.PositionAreaEditor.Mode.LOGICAL,
              [logicalBlock, logicalInline]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [auto, auto], InlineEditor.PositionAreaEditor.Mode.LOGICAL,
              [logicalBlock, logicalInline]);

    // [auto/s, auto/s] + logical = [logical/s, logical/s]
    checkMode(InlineEditor.PositionAreaEditor.Axis.INLINE, [autoSelf, autoSelf],
              InlineEditor.PositionAreaEditor.Mode.LOGICAL, [logicalBlockSelf, logicalInlineSelf]);
    checkMode(InlineEditor.PositionAreaEditor.Axis.BLOCK, [autoSelf, autoSelf],
              InlineEditor.PositionAreaEditor.Mode.LOGICAL, [logicalBlockSelf, logicalInlineSelf]);

    // physical + self = coordinate/s
    checkSelf(InlineEditor.PositionAreaEditor.Axis.INLINE, [physicalInline, physicalBlock], true,
              [coordinateInlineSelf, physicalBlock]);
    checkSelf(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, physicalBlock], true,
              [physicalInline, coordinateBlockSelf]);

    // physical + !self = physical
    checkSelf(InlineEditor.PositionAreaEditor.Axis.INLINE, [physicalInline, physicalBlock], false,
              [physicalInline, physicalBlock]);
    checkSelf(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, physicalBlock], false,
              [physicalInline, physicalBlock]);

    // coordinate + self = coordinate/s
    checkSelf(InlineEditor.PositionAreaEditor.Axis.INLINE, [coordinateInline, physicalBlock], true,
              [coordinateInlineSelf, physicalBlock]);
    checkSelf(InlineEditor.PositionAreaEditor.Axis.BLOCK, [physicalInline, coordinateBlock], true,
              [physicalInline, coordinateBlockSelf]);

    // logical + self = logical/s
    checkSelf(InlineEditor.PositionAreaEditor.Axis.INLINE, [logicalInline, logicalBlock], true,
              [logicalInlineSelf, logicalBlockSelf]);
    checkSelf(InlineEditor.PositionAreaEditor.Axis.BLOCK, [logicalInline, logicalBlock], true,
              [logicalInlineSelf, logicalBlockSelf]);

    // auto + self = auto/s
    checkSelf(InlineEditor.PositionAreaEditor.Axis.INLINE, [auto, auto], true, [autoSelf, autoSelf]);
    checkSelf(InlineEditor.PositionAreaEditor.Axis.BLOCK, [auto, auto], true, [autoSelf, autoSelf]);

    // coordinate/s + !self = coordinate
    checkSelf(InlineEditor.PositionAreaEditor.Axis.INLINE, [coordinateInlineSelf, coordinateBlockSelf], false,
              [coordinateInline, coordinateBlockSelf]);
    checkSelf(InlineEditor.PositionAreaEditor.Axis.BLOCK, [coordinateInlineSelf, coordinateBlockSelf], false,
              [coordinateInlineSelf, coordinateBlock]);

    // logical/s + !self = logical
    checkSelf(InlineEditor.PositionAreaEditor.Axis.INLINE, [logicalInlineSelf, logicalBlockSelf], false,
              [logicalInline, logicalBlock]);
    checkSelf(InlineEditor.PositionAreaEditor.Axis.BLOCK, [logicalInlineSelf, logicalBlockSelf], false,
              [logicalInline, logicalBlock]);

    // auto/s + !self = auto
    checkSelf(InlineEditor.PositionAreaEditor.Axis.INLINE, [autoSelf, autoSelf], false, [auto, auto]);
    checkSelf(InlineEditor.PositionAreaEditor.Axis.BLOCK, [autoSelf, autoSelf], false, [auto, auto]);

    await editor.updateComplete;
  });
});
