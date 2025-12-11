// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setUpEnvironment} from '../../testing/OverridesHelpers.js';
import {createContentProviderUISourceCodes} from '../../testing/UISourceCodeHelpers.js';
import {render, type TemplateResult} from '../../ui/lit/lit.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

const setUpEnvironmentWithUISourceCode =
    (url: string, resourceType: Common.ResourceType.ResourceType, project?: Workspace.Workspace.Project) => {
      const {workspace} = setUpEnvironment();
      Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: false});

      if (!project) {
        project = {id: () => url, type: () => Workspace.Workspace.projectTypes.Network} as Workspace.Workspace.Project;
      }

      const uiSourceCode = new Workspace.UISourceCode.UISourceCode(project, urlString`${url}`, resourceType);

      project.uiSourceCodes = () => [uiSourceCode];

      workspace.addProject(project);

      return {workspace, project, uiSourceCode};
    };

describeWithEnvironment('FilteredUISourceCodeListProvider', () => {
  before(() => {
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.JUST_MY_CODE, '');
  });

  it('should exclude Fetch requests in the result', () => {
    const url = 'http://www.example.com/list-fetch.json';
    const resourceType = Common.ResourceType.resourceTypes.Fetch;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const result = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(result, 0);
  });

  it('should exclude XHR requests in the result', () => {
    const url = 'http://www.example.com/list-xhr.json';
    const resourceType = Common.ResourceType.resourceTypes.XHR;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const result = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(result, 0);
  });

  it('should include Document requests in the result', () => {
    const url = 'http://www.example.com/index.html';
    const resourceType = Common.ResourceType.resourceTypes.Document;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const resultUrl = filteredUISourceCodeListProvider.itemKeyAt(0);
    const resultCount = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(resultUrl, url);
    assert.strictEqual(resultCount, 1);
  });

  it('should exclude ignored script requests in the result', () => {
    const url = 'http://www.example.com/some-script.js';
    const resourceType = Common.ResourceType.resourceTypes.Script;

    const {workspace, project, uiSourceCode} = setUpEnvironmentWithUISourceCode(url, resourceType);

    // ignore the uiSourceCode
    Root.Runtime.experiments.setEnabled(Root.Runtime.ExperimentName.JUST_MY_CODE, true);
    Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(uiSourceCode);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const result = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);
    Root.Runtime.experiments.setEnabled(Root.Runtime.ExperimentName.JUST_MY_CODE, false);

    assert.strictEqual(result, 0);
  });

  it('should include Image requests in the result', () => {
    const url = 'http://www.example.com/img.png';
    const resourceType = Common.ResourceType.resourceTypes.Image;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const resultUrl = filteredUISourceCodeListProvider.itemKeyAt(0);
    const resultCount = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(resultCount, 1);
    assert.strictEqual(resultUrl, url);
  });

  it('should include Script requests in the result', () => {
    const url = 'http://www.example.com/some-script.js';
    const resourceType = Common.ResourceType.resourceTypes.Script;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const resultUrl = filteredUISourceCodeListProvider.itemKeyAt(0);
    const resultCount = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(resultCount, 1);
    assert.strictEqual(resultUrl, url);
  });

  describe('renderItem', () => {
    const url1 = urlString`http://test/helloWorld12.js`;
    const url2 =
        urlString`http://test/some/very-long-url/which/usually/breaks-rendering/due-to/trancation/so/that/the-path-is-cut-appropriately/and-no-horizontal-scrollbars/are-shown.js`;
    let provider: Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider;
    let itemIndex1: number;
    let itemIndex2: number;

    function getHighlightedText(h: HTMLElement): string {
      let text = '';
      for (const node of h.childNodes) {
        if (node instanceof HTMLElement) {
          if (node.classList.contains('highlight')) {
            text += `[${node.deepInnerText()}]`;
          } else {
            text += getHighlightedText(node);
          }
        } else {
          text += node.deepInnerText();
        }
      }
      return text;
    }

    async function getRenderedText(template: TemplateResult): Promise<{title: string, subtitle: string}> {
      const container = document.createElement('div');
      render(template, container);
      await new Promise<void>(resolve => queueMicrotask(resolve));
      const titleHighlight = container.querySelector<HTMLElement>('devtools-highlight.filtered-ui-source-code-title');
      const subtitleHighlight =
          container.querySelector<HTMLElement>('devtools-highlight.filtered-ui-source-code-subtitle');
      assert.isNotNull(titleHighlight);
      assert.isNotNull(subtitleHighlight);

      const title = getHighlightedText(titleHighlight);
      const subtitle = getHighlightedText(subtitleHighlight);
      return {title, subtitle};
    }

    beforeEach(() => {
      createContentProviderUISourceCodes(
          {items: [{url: url1, mimeType: 'text/javascript'}, {url: url2, mimeType: 'text/javascript'}]});

      provider = new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
      provider.attach();

      assert.strictEqual(provider.itemCount(), 2, 'Provider should have two items');

      if (provider.itemKeyAt(0) === url1) {
        itemIndex1 = 0;
        itemIndex2 = 1;
      } else {
        itemIndex1 = 1;
        itemIndex2 = 0;
      }
    });

    it('renders correct highlight for query "12"', async () => {
      const query = '12';
      const {title, subtitle} = await getRenderedText(provider.renderItem(itemIndex1, query));
      assert.strictEqual(title, 'helloWorld[12].js');
      assert.strictEqual(subtitle, 'test/');
    });

    it('renders correct highlight for query "te12"', async () => {
      const query = 'te12';
      const {title, subtitle} = await getRenderedText(provider.renderItem(itemIndex1, query));
      // This could be helloWorld[12].js, but current implementation doesn't support it.
      assert.strictEqual(title, 'helloWorld12.js');
      assert.strictEqual(subtitle, '[te]st/');
    });

    it('renders correct highlight for query "shown.js"', async () => {
      const query = 'shown.js';
      const {title} = await getRenderedText(provider.renderItem(itemIndex2, query));
      assert.strictEqual(title, 'are-[shown.js]');
    });

    it('renders correct highlight for query "usually-shown.js"', async () => {
      const query = 'usually-shown.js';
      const {title, subtitle} = await getRenderedText(provider.renderItem(itemIndex2, query));
      // This could be are-[shown.js], but current implementation doesn't support it.
      assert.strictEqual(title, 'are-shown.js');
      assert.include(subtitle, '[usually]');
    });
  });
});
