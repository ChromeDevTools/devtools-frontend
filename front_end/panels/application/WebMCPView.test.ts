// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as WebMCP from '../../models/web_mcp/web_mcp.js';
import {findMenuItemWithLabel, getMenuForToolbarButton} from '../../testing/ContextMenuHelpers.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Application from './application.js';

const {DEFAULT_VIEW, WebMCPView, filterToolCalls} = Application.WebMCPView;

function createTool(
    name: string, description: string, frameId: Protocol.Page.FrameId, target: SDK.Target.Target,
    backendNodeId?: Protocol.DOM.BackendNodeId): WebMCP.WebMCPModel.Tool {
  return new WebMCP.WebMCPModel.Tool(
      {name, description, inputSchema: {type: 'object'}, frameId, backendNodeId}, target);
}
describeWithEnvironment('WebMCPView (View)', () => {
  it('renders empty when no tools are available', async () => {
    const target = document.createElement('div');
    target.style.width = '600px';
    target.style.height = '400px';
    renderElementIntoDOM(target, {includeCommonStyles: true});
    const filterButtons = WebMCPView.createFilterButtons(() => {}, () => {});

    DEFAULT_VIEW(
        {
          filters: {text: ''},
          tools: [],
          toolCalls: [],
          filterButtons,
          onClearLogClick: () => {},
          onFilterChange: () => {},
        },
        {}, target);

    const listElements = target.querySelectorAll('.tool-item');
    assert.lengthOf(listElements, 0);

    const emptyStateHeader = target.querySelector('.tool-list .empty-state-header');
    assert.isNotNull(emptyStateHeader);
    assert.strictEqual(emptyStateHeader?.textContent, 'Available WebMCP Tools');

    const callListElements = target.querySelectorAll('.call-item');
    assert.lengthOf(callListElements, 0);

    const callListEmptyHeader = target.querySelector('.call-log .empty-state-header');
    assert.isNotNull(callListEmptyHeader);
    assert.strictEqual(callListEmptyHeader?.textContent, 'Tool Activity');

    await assertScreenshot('application/webmcp-empty.png');
  });

  it('renders tool calls with different statuses', async () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const target = document.createElement('div');
    target.style.width = '600px';
    target.style.height = '400px';
    renderElementIntoDOM(target, {includeCommonStyles: true});
    const tools = [
      createTool('list_files', 'List files', 'frame-1' as Protocol.Page.FrameId, sdkTarget),
      createTool('read_file', 'Read a file', 'frame-1' as Protocol.Page.FrameId, sdkTarget),
      createTool('write_file', 'Write a file', 'frame-1' as Protocol.Page.FrameId, sdkTarget),
      createTool('long_running_task', 'A long task', 'frame-1' as Protocol.Page.FrameId, sdkTarget),
    ];
    const toolCalls: WebMCP.WebMCPModel.Call[] = [
      {
        invocationId: '1',
        input: '{"dir": "/tmp"}',
        tool: tools[0],
      },
      {
        invocationId: '2',
        input: '{"path": "/tmp/test.txt"}',
        tool: tools[1],
        result: {
          status: Protocol.WebMCP.InvocationStatus.Success,
          output: 'File content here',
        },
      },
      {
        invocationId: '3',
        input: '{"path": "/root/secret.txt"}',
        tool: tools[2],
        result: {
          status: Protocol.WebMCP.InvocationStatus.Error,
          errorText: 'Permission denied',
        },
      },
      {
        invocationId: '4',
        input: '{"timeout": 100}',
        tool: tools[3],
        result: {
          status: Protocol.WebMCP.InvocationStatus.Canceled,
        },
      },
    ];
    const filterButtons = WebMCPView.createFilterButtons(() => {}, () => {});
    DEFAULT_VIEW(
        {
          tools,
          toolCalls,
          filters: {text: ''},
          filterButtons,
          onClearLogClick: function(): void {
            throw new Error('Function not implemented.');
          },
          onFilterChange: function(): void {
            throw new Error('Function not implemented.');
          }
        },
        {}, target);

    const grid = target.querySelector('devtools-data-grid');
    assert.isNotNull(grid);
    await assertScreenshot('application/webmcp-tool-calls.png');
  });
  it('renders a list of tools correctly', async () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '400px';
    renderElementIntoDOM(container, {includeCommonStyles: true});

    const tools = [
      createTool('calculator', 'Calculates math expressions', 'frame1' as Protocol.Page.FrameId, sdkTarget),
      createTool('weather', 'Gets the current weather', 'frame1' as Protocol.Page.FrameId, sdkTarget)
    ];

    const filterButtons = WebMCPView.createFilterButtons(() => {}, () => {});
    DEFAULT_VIEW(
        {
          filters: {text: ''},
          tools,
          filterButtons,
          onClearLogClick: () => {},
          onFilterChange: () => {},
          toolCalls: [],
        },
        {}, container);

    await assertScreenshot('application/webmcp_view.png');
  });

  it('renders a list of tools', async () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});
    const tools = [
      createTool('tool1', 'desc1', 'frame1' as Protocol.Page.FrameId, sdkTarget),
      createTool('tool2', 'desc2', 'frame1' as Protocol.Page.FrameId, sdkTarget)
    ];
    const filterButtons = WebMCPView.createFilterButtons(() => {}, () => {});

    DEFAULT_VIEW(
        {
          filters: {text: ''},
          tools,
          filterButtons,
          onClearLogClick: () => {},
          onFilterChange: () => {},
          toolCalls: [],
        },
        {}, target);

    const listElements = target.querySelectorAll('.tool-item');
    assert.lengthOf(listElements, 2);
    assert.strictEqual(listElements[0].querySelector('.tool-name')?.textContent, 'tool1');
    assert.strictEqual(listElements[0].querySelector('.tool-description')?.textContent, 'desc1');
    assert.isNull(target.querySelector('.tool-list .empty-state'));
  });
  it('renders filter bar with filters applied', async () => {
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '400px';
    renderElementIntoDOM(container, {includeCommonStyles: true});

    const filterButtons = WebMCPView.createFilterButtons(() => {}, () => {});

    // Simulate setting an active filter visually
    filterButtons.toolTypes.setCount(1);

    DEFAULT_VIEW(
        {
          filters: {text: 'test', toolTypes: {imperative: true}},
          tools: [],
          toolCalls: [],
          filterButtons,
          onClearLogClick: () => {},
          onFilterChange: () => {},
        },
        {}, container);

    await assertScreenshot('application/webmcp_filter_bar_applied.png');
  });

  it('calls onClearLogClick when clear log button is clicked', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    const onClearLogClick = sinon.spy();
    const filterButtons = WebMCPView.createFilterButtons(() => {}, () => {});

    DEFAULT_VIEW(
        {
          filters: {text: ''},
          tools: [],
          toolCalls: [],
          filterButtons,
          onClearLogClick,
          onFilterChange: () => {},
        },
        {}, target);

    const clearButton = target.querySelector('devtools-button[title="Clear log"]') as HTMLElement;
    assert.isNotNull(clearButton);
    clearButton.click();
    sinon.assert.calledOnce(onClearLogClick);
  });
});

describeWithEnvironment('WebMCPView Presenter', () => {
  let target: SDK.Target.Target;

  async function setup() {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    target = createTarget();
    const model = target.model(WebMCP.WebMCPModel.WebMCPModel) as WebMCP.WebMCPModel.WebMCPModel;

    const viewStub = createViewFunctionStub(WebMCPView);
    new WebMCPView(document.createElement('div'), viewStub);
    await viewStub.nextInput;

    return {model, viewStub};
  }

  afterEach(() => {
    target?.dispose('test');
  });

  it('passes tools to the view sorted by name', async () => {
    const {model, viewStub} = await setup();
    model.toolsAdded({
      tools: [
        {
          name: 'b-tool',
          description: 'desc1',
          inputSchema: {type: 'object'},
          frameId: 'frame1' as Protocol.Page.FrameId
        },
        {
          name: 'a-tool',
          description: 'desc2',
          inputSchema: {type: 'object'},
          frameId: 'frame1' as Protocol.Page.FrameId
        }
      ]
    });
    const input = await viewStub.nextInput;

    assert.lengthOf(input.tools, 2);
    assert.strictEqual(input.tools[0].name, 'a-tool');
    assert.strictEqual(input.tools[1].name, 'b-tool');
  });

  it('updates when tools are removed', async () => {
    const {model, viewStub} = await setup();
    const tool = {
      name: 'tool1',
      description: 'desc1',
      inputSchema: {type: 'object'},
      frameId: 'frame1' as Protocol.Page.FrameId
    };
    model.toolsAdded({tools: [tool]});
    await viewStub.nextInput;
    assert.lengthOf(viewStub.input.tools, 1);

    model.toolsRemoved({tools: [tool]});
    const input = await viewStub.nextInput;
    assert.lengthOf(input.tools, 0);
  });

  it('updates filter state when text filter is set', async () => {
    const {viewStub} = await setup();
    viewStub.input.onFilterChange({text: 'test filter'});
    const input = await viewStub.nextInput;
    assert.strictEqual(input.filters.text, 'test filter');
  });

  it('updates filter state when drop down filters are set', async () => {
    const {viewStub} = await setup();

    const contextMenu = getMenuForToolbarButton(viewStub.input.filterButtons.toolTypes.button);
    const imperativeItem = findMenuItemWithLabel(contextMenu.defaultSection(), 'Imperative');
    assert.isDefined(imperativeItem);

    contextMenu.invokeHandler(imperativeItem.id());

    const input = await viewStub.nextInput;
    assert.isTrue(input.filters.toolTypes?.imperative);
  });

  it('clears all filters when clear filters button is clicked', async () => {
    const {viewStub} = await setup();
    viewStub.input.onFilterChange({text: 'test filter', toolTypes: {imperative: false}});
    await viewStub.nextInput;

    viewStub.input.onFilterChange({text: ''});
    const input = await viewStub.nextInput;
    assert.strictEqual(input.filters.text, '');
    assert.isUndefined(input.filters.toolTypes);
    assert.isUndefined(input.filters.statusTypes);
  });
});

describe('filterToolCalls', () => {
  const target = sinon.createStubInstance(SDK.Target.Target);
  const tools = [
    createTool('list_files', 'desc', 'frame-1' as Protocol.Page.FrameId, target),
    createTool('read_file', 'desc', 'frame-1' as Protocol.Page.FrameId, target),
    createTool('write_file', 'desc', 'frame-1' as Protocol.Page.FrameId, target),
    createTool(
        'long_running_task',
        'desc',
        'frame-1' as Protocol.Page.FrameId,
        target,
        1 as Protocol.DOM.BackendNodeId,
        ),
    createTool(
        'declarative_success',
        'desc',
        'frame-1' as Protocol.Page.FrameId,
        target,
        2 as Protocol.DOM.BackendNodeId,
        ),
  ];
  const mockCalls: WebMCP.WebMCPModel.Call[] = [
    {
      invocationId: '1',
      input: '{"dir": "/tmp"}',
      tool: tools[0],
    },
    {
      invocationId: '2',
      input: '{"path": "/tmp/test.txt"}',
      tool: tools[1],
      result: {
        status: Protocol.WebMCP.InvocationStatus.Success,
        output: 'File content here',
      },
    },
    {
      invocationId: '3',
      input: '{"path": "/root/secret.txt"}',
      tool: tools[2],
      result: {
        status: Protocol.WebMCP.InvocationStatus.Error,
        errorText: 'Permission denied',
      },
    },
    {
      invocationId: '4',
      input: '{"timeout": 100}',
      tool: tools[3],
    },
    {
      invocationId: '5',
      input: '{}',
      tool: tools[3],
      result: {
        status: Protocol.WebMCP.InvocationStatus.Success,
        output: 'Declarative success content',
      },
    },
  ];

  it('filters by name/text', () => {
    const result = filterToolCalls(mockCalls, {text: 'secret.txt'});
    assert.lengthOf(result, 1);
    assert.strictEqual(result[0].invocationId, '3');
  });

  it('filters by status', () => {
    const result = filterToolCalls(mockCalls, {
      text: '',
      statusTypes: {
        success: true,
      },
    });
    assert.lengthOf(result, 2);
    assert.strictEqual(result[0].invocationId, '2');
    assert.strictEqual(result[1].invocationId, '5');

    const resultPending = filterToolCalls(mockCalls, {
      text: '',
      statusTypes: {
        pending: true,
      },
    });
    assert.lengthOf(resultPending, 2);
    assert.strictEqual(resultPending[0].invocationId, '1');
    assert.strictEqual(resultPending[1].invocationId, '4');
  });

  it('filters by type', () => {
    const resultDeclarative = filterToolCalls(mockCalls, {
      text: '',
      toolTypes: {
        declarative: true,
      },
    });
    assert.lengthOf(resultDeclarative, 2);
    assert.strictEqual(resultDeclarative[0].invocationId, '4');
    assert.strictEqual(resultDeclarative[1].invocationId, '5');

    const resultImperative = filterToolCalls(mockCalls, {
      text: '',
      toolTypes: {
        imperative: true,
      },
    });
    assert.lengthOf(resultImperative, 3);
    assert.strictEqual(resultImperative[0].invocationId, '1');
    assert.strictEqual(resultImperative[1].invocationId, '2');
    assert.strictEqual(resultImperative[2].invocationId, '3');
  });

  it('filters by all three together', () => {
    const result = filterToolCalls(mockCalls, {
      text: 'success',
      statusTypes: {
        success: true,
      },
      toolTypes: {
        declarative: true,
      },
    });
    assert.lengthOf(result, 1);
    assert.strictEqual(result[0].invocationId, '5');
  });
});
