// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

class MockSuggestBoxDelegate implements UI.SuggestBox.SuggestBoxDelegate {
  readonly appliedSuggestions: {suggestion: string, isIntermediateSuggestion?: boolean}[] = [];
  readonly accceptedSuggestions: string[] = [];

  private lastAppliedSuggestion!: UI.SuggestBox.Suggestion;

  constructor(readonly element: HTMLElement) {
  }

  applySuggestion(suggestion: UI.SuggestBox.Suggestion|null, isIntermediateSuggestion?: boolean) {
    if (!suggestion) {
      throw new Error('All tests should pass a real suggestion to `applySuggestion`');
    }
    this.appliedSuggestions.push({suggestion: suggestion.text, isIntermediateSuggestion});
    this.lastAppliedSuggestion = suggestion;
  }

  acceptSuggestion() {
    this.accceptedSuggestions.push(this.lastAppliedSuggestion.text);
  }

  ownerElement() {
    return this.element;
  }
}

const createKeyEvent = (key: string) => new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key});

describeWithLocale('SuggestBox', () => {
  let delegate: MockSuggestBoxDelegate;
  let div: HTMLElement;
  let suggestBox: UI.SuggestBox.SuggestBox;
  const anchorBox = new AnchorBox(50, 50, 400, 400);

  beforeEach(() => {
    div = document.createElement('div');
    delegate = new MockSuggestBoxDelegate(div);
    suggestBox = new UI.SuggestBox.SuggestBox(delegate);

    // Needed to render the `SuggestBox`.
    UI.GlassPane.GlassPane.setContainer(suggestBox.element);
  });

  afterEach(() => {
    suggestBox.hide();
    div.remove();
  });

  it('opens the controller element after updating suggestions', () => {
    suggestBox.updateSuggestions(anchorBox, [{text: 'First'}, {text: 'Second'}], true, true, 'e');

    assert.strictEqual(div.getAttribute('aria-expanded'), 'true');
  });

  it('selects the first item when no priority is specified', () => {
    suggestBox.updateSuggestions(
        anchorBox, [{text: 'First'}, {text: 'Hello'}, {text: 'The best suggestion'}], true, true, 'e');

    assert.deepStrictEqual(delegate.appliedSuggestions, [{suggestion: 'First', isIntermediateSuggestion: true}]);
  });

  it('selects no item when "canShowForSingleItem" is false', () => {
    suggestBox.updateSuggestions(
        anchorBox, [{text: 'First'}, {text: 'Hello', priority: 2}, {text: 'The best suggestion', priority: 5}], false,
        true, 'e');

    assert.deepStrictEqual(delegate.appliedSuggestions, []);
  });

  it('selects the highest priority item', () => {
    suggestBox.updateSuggestions(
        anchorBox, [{text: 'First'}, {text: 'Hello', priority: 2}, {text: 'The best suggestion', priority: 5}], true,
        true, 'e');

    assert.deepStrictEqual(
        delegate.appliedSuggestions, [{suggestion: 'The best suggestion', isIntermediateSuggestion: true}]);
  });

  it('allows arrow keys for selection', () => {
    suggestBox.updateSuggestions(
        anchorBox, [{text: 'First'}, {text: 'Hello', priority: 2}, {text: 'The best suggestion', priority: 5}], true,
        true, 'e');

    suggestBox.keyPressed(createKeyEvent('ArrowUp'));
    suggestBox.keyPressed(createKeyEvent('ArrowUp'));
    suggestBox.keyPressed(createKeyEvent('ArrowUp'));
    suggestBox.keyPressed(createKeyEvent('ArrowDown'));
    suggestBox.keyPressed(createKeyEvent('ArrowDown'));

    assert.deepStrictEqual(delegate.appliedSuggestions, [
      {suggestion: 'The best suggestion', isIntermediateSuggestion: true},
      {suggestion: 'Hello', isIntermediateSuggestion: true},
      {suggestion: 'First', isIntermediateSuggestion: true},
      {suggestion: 'The best suggestion', isIntermediateSuggestion: true},
      {suggestion: 'First', isIntermediateSuggestion: true},
      {suggestion: 'Hello', isIntermediateSuggestion: true},
    ]);
  });

  it('allows using the "Enter" key to accept a suggestions', () => {
    suggestBox.updateSuggestions(
        anchorBox, [{text: 'First'}, {text: 'Hello', priority: 2}, {text: 'The best suggestion', priority: 5}], true,
        true, 'e');

    suggestBox.keyPressed(createKeyEvent('Enter'));
    assert.deepStrictEqual(delegate.accceptedSuggestions, ['The best suggestion']);
  });

  it('closes the controller element after accepting a suggestion', () => {
    suggestBox.updateSuggestions(
        anchorBox, [{text: 'First'}, {text: 'Hello', priority: 2}, {text: 'The best suggestion', priority: 5}], true,
        true, 'e');

    suggestBox.keyPressed(createKeyEvent('Enter'));

    assert.strictEqual(div.getAttribute('aria-expanded'), 'false');
  });
});
