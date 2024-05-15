// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from './visual_logging-testing.js';

describe('LoggingConfig', () => {
  let element: Element;

  beforeEach(() => {
    element = document.createElement('div');
  });

  it('identifies if element needs logging', () => {
    assert.isFalse(VisualLogging.LoggingConfig.needsLogging(element));

    element.setAttribute('jslog', 'TreeItem');
    assert.isTrue(VisualLogging.LoggingConfig.needsLogging(element));
  });

  describe('reads simple logging config', () => {
    it('for TreeItem', () => {
      element.setAttribute('jslog', 'TreeItem');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.ve, 1);
    });

    it('for TextField', () => {
      element.setAttribute('jslog', 'TextField');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.ve, 8);
    });

    it('for Action', () => {
      element.setAttribute('jslog', 'Action');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.ve, 29);
    });

    it('for Preview', () => {
      element.setAttribute('jslog', 'Preview');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.ve, 35);
    });

    it('for Panel', () => {
      element.setAttribute('jslog', 'Panel');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.ve, 48);
    });

    it('for TableHeader', () => {
      element.setAttribute('jslog', 'TableHeader');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.ve, 69);
    });

    it('for TableCell', () => {
      element.setAttribute('jslog', 'TableCell');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.ve, 70);
    });
  });

  it('throws on unknown visual element', () => {
    element.setAttribute('jslog', 'NonExistentVisualElement');
    assert.throws(() => VisualLogging.LoggingConfig.getLoggingConfig(element));
  });

  it('can parse complex track attribute', () => {
    element.setAttribute('jslog', 'TreeItem; track:click, keydown: :|Enter; context:42');
    const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
    assert.deepEqual(config.track, {click: true, keydown: ':|Enter'});
  });

  describe('can parse simple context attribute', () => {
    it('for TreeItem', () => {
      element.setAttribute('jslog', 'TreeItem;context:42');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.context, '42');
    });

    it('for Action', () => {
      element.setAttribute('jslog', 'Action;context:console.clear');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.context, 'console.clear');
    });

    it('for Panel', () => {
      element.setAttribute('jslog', 'Panel;context:developer-resources');
      const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
      assert.strictEqual(config.context, 'developer-resources');
    });
  });

  it('can parse parent attribute', () => {
    element.setAttribute('jslog', 'TreeItem;parent:customProvider');
    const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
    assert.strictEqual(config.parent, 'customProvider');
  });

  it('ignores whitespaces while parsing', () => {
    element.setAttribute('jslog', 'TreeItem;     context:   42');
    const config = VisualLogging.LoggingConfig.getLoggingConfig(element);
    assert.strictEqual(config.context, '42');
  });

  it('builds a string config', () => {
    const treeItem = VisualLogging.LoggingConfig.makeConfigStringBuilder.bind(null, 'TreeItem');
    assert.strictEqual(`${treeItem()}`, 'TreeItem');
    assert.strictEqual(`${treeItem().context(42)}`, 'TreeItem; context: 42');
    assert.strictEqual(`${treeItem().track({click: true})}`, 'TreeItem; track: click');
    assert.strictEqual(`${treeItem().track({click: true, change: true})}`, 'TreeItem; track: click, change');
    assert.strictEqual(`${treeItem().track({keydown: 'Enter'})}`, 'TreeItem; track: keydown: Enter');
    assert.strictEqual(
        `${treeItem().context(42).track({keydown: 'Enter'})}`, 'TreeItem; context: 42; track: keydown: Enter');
  });
});
