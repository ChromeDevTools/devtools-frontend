// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as sinon from 'sinon';

import * as Trace from '../../../../models/trace/trace.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';

import * as Components from './components.js';

const {DEFAULT_VIEW} = Components.EntriesLinkOverlay;

function createViewInput(overrides: Partial<Components.EntriesLinkOverlay.ViewInput> = {}):
    Components.EntriesLinkOverlay.ViewInput {
  return {
    coordinateFrom: {x: 10, y: 20},
    fromEntryDimensions: {width: 40, height: 16},
    fromEntryCutOff: {cutOffTop: false, cutOffBottom: false, cutOffRight: false},
    coordinateTo: {x: 100, y: 60},
    toEntryDimensions: {width: 50, height: 20},
    toEntryCutOff: {cutOffTop: false, cutOffBottom: false, cutOffRight: false},
    entryFromVisible: true,
    entryToVisible: true,
    fromEntryIsSource: true,
    toEntryIsSource: true,
    arrowHidden: false,
    linkState: Trace.Types.File.EntriesLinkState.CONNECTED,
    partlyVisibleConnectionLinePercentage: 100,
    arrowColor: 'rgb(0, 0, 0)',
    onStartCreating: () => {},
    ...overrides,
  };
}

describe('EntriesLinkOverlay', () => {
  setupLocaleHooks();

  describe('view', () => {
    it('positions the create-link icon at the right edge of the from-entry and hides the connector line before creation starts',
       () => {
         const target = document.createElement('div');
         renderElementIntoDOM(target);
         const onStartCreating = sinon.spy();

         DEFAULT_VIEW(createViewInput({
                        linkState: Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED,
                        coordinateFrom: {x: 10, y: 20},
                        fromEntryDimensions: {width: 40, height: 16},
                        onStartCreating,
                      }),
                      undefined, target);

         const icon = target.querySelector<HTMLElement>('.create-link-icon');
         assert.isNotNull(icon);
         assert.strictEqual(icon.style.left, '50px');
         assert.strictEqual(icon.style.top, '20px');
         assert.strictEqual(icon.style.display, '');

         const line = target.querySelector<SVGLineElement>('line');
         assert.isNotNull(line);
         assert.strictEqual(line.style.display, 'none');

         const fromCircle = target.querySelector<SVGCircleElement>('.entryFromConnector');
         const toCircle = target.querySelector<SVGCircleElement>('.entryToConnector');
         assert.strictEqual(fromCircle?.getAttribute('visibility'), 'hidden');
         assert.strictEqual(toCircle?.getAttribute('visibility'), 'hidden');

         dispatchClickEvent(icon);
         sinon.assert.calledOnce(onStartCreating);
       });

    it('renders the connector line, connector circles, and highlight wrappers with cut-off classes', () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);

      DEFAULT_VIEW(createViewInput({
                     fromEntryCutOff: {cutOffTop: true, cutOffBottom: false, cutOffRight: false},
                     toEntryCutOff: {cutOffTop: false, cutOffBottom: true, cutOffRight: true},
                   }),
                   undefined, target);

      const fromWrapper = target.querySelector<HTMLElement>('.from-highlight-wrapper');
      assert.isNotNull(fromWrapper);
      assert.strictEqual(fromWrapper.style.visibility, 'visible');
      assert.strictEqual(fromWrapper.style.left, '10px');
      assert.strictEqual(fromWrapper.style.top, '20px');
      assert.strictEqual(fromWrapper.style.width, '40px');
      assert.strictEqual(fromWrapper.style.height, '16px');
      assert.isTrue(fromWrapper.classList.contains('cut-off-top'));

      const toWrapper = target.querySelector<HTMLElement>('.to-highlight-wrapper');
      assert.isNotNull(toWrapper);
      assert.strictEqual(toWrapper.style.left, '100px');
      assert.strictEqual(toWrapper.style.top, '60px');
      assert.strictEqual(toWrapper.style.width, '50px');
      assert.strictEqual(toWrapper.style.height, '20px');
      assert.isTrue(toWrapper.classList.contains('cut-off-bottom'));
      assert.isTrue(toWrapper.classList.contains('cut-off-right'));
    });
  });
});
