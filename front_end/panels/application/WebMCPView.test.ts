// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {JSONSchema7} from 'json-schema';

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as WebMCP from '../../models/web_mcp/web_mcp.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  findMenuItemWithLabel,
  getContextMenuForElement,
  getMenuForToolbarButton
} from '../../testing/ContextMenuHelpers.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {StubStackTrace} from '../../testing/StackTraceHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ProtocolMonitor from '../protocol_monitor/protocol_monitor.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;

const {DEFAULT_VIEW, WebMCPView, filterToolCalls} = Application.WebMCPView;

function createTool(
    name: string, description: string, frameId: Protocol.Page.FrameId, target: SDK.Target.Target,
    backendNodeId?: Protocol.DOM.BackendNodeId, inputSchema: unknown = {
      type: 'object'
    }): WebMCP.WebMCPModel.Tool {
  return new WebMCP.WebMCPModel.Tool({name, description, inputSchema, frameId, backendNodeId}, target);
}
describeWithEnvironment('WebMCPView (View)', () => {
  const createDefaultViewInput = (): Application.WebMCPView.ViewInput => {
    return {
      filters: {text: ''},
      tools: [],
      toolCalls: [],
      filterButtons: WebMCPView.createFilterButtons(() => {}, () => {}),
      onClearLogClick: () => {},
      onFilterChange: () => {},
      selectedTool: null,
      onToolSelect: () => {},
      selectedCall: null,
      onCallSelect: () => {},
      onRunTool: () => {},
    };
  };

  it('renders empty when no tools are available', async () => {
    const target = document.createElement('div');
    target.style.width = '600px';
    target.style.height = '400px';
    renderElementIntoDOM(target, {includeCommonStyles: true});
    DEFAULT_VIEW(createDefaultViewInput(), {}, target);

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
        result: new WebMCP.WebMCPModel.Result(
            Protocol.WebMCP.InvocationStatus.Completed, 'File content here', undefined, undefined)
      },
      {
        invocationId: '3',
        input: '{"path": "/root/secret.txt"}',
        tool: tools[2],
        result: new WebMCP.WebMCPModel.Result(
            Protocol.WebMCP.InvocationStatus.Error, undefined, 'Permission denied', undefined)
      },
      {
        invocationId: '4',
        input: '{"timeout": 100}',
        tool: tools[3],
        result:
            new WebMCP.WebMCPModel.Result(Protocol.WebMCP.InvocationStatus.Canceled, undefined, undefined, undefined)
      },
    ];
    DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          tools,
          toolCalls,
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

    DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          tools,
        },
        {}, container);

    await assertScreenshot('application/webmcp_view.png');
  });

  it('shows a context menu when right-clicking a tool', async () => {
    const copyTextStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');
    const sdkTarget = createTarget();
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const tools = [
      createTool('test_tool', 'A test tool description', 'frame1' as Protocol.Page.FrameId, sdkTarget),
    ];

    DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          tools,
        },
        {}, container);

    const toolItem = container.querySelector('.tool-item');
    assert.isNotNull(toolItem);

    const contextMenu = getContextMenuForElement(toolItem);
    const copyNameItem = findMenuItemWithLabel(contextMenu.defaultSection(), 'Copy name');
    const copyDescItem = findMenuItemWithLabel(contextMenu.defaultSection(), 'Copy description');

    assert.isDefined(copyNameItem);
    assert.isDefined(copyDescItem);

    contextMenu.invokeHandler(copyNameItem.id());
    sinon.assert.calledWith(copyTextStub, 'test_tool');

    contextMenu.invokeHandler(copyDescItem.id());
    sinon.assert.calledWith(copyTextStub, 'A test tool description');
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
    DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          tools,
        },
        {}, target);

    const listElements = target.querySelectorAll('.tool-item');
    assert.lengthOf(listElements, 2);
    assert.strictEqual(listElements[0].querySelector('.tool-name')?.textContent, 'tool1');
    assert.strictEqual(listElements[0].querySelector('.tool-description')?.textContent, 'desc1');
    assert.isNull(target.querySelector('.tool-list .empty-state'));
  });

  it('highlights the selected tool', () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const target = document.createElement('div');
    const tools = [
      createTool('tool1', 'desc1', 'frame1' as Protocol.Page.FrameId, sdkTarget),
      createTool('tool2', 'desc2', 'frame1' as Protocol.Page.FrameId, sdkTarget)
    ];
    DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          tools,
          selectedTool: tools[1],
        },
        {}, target);

    const listElements = target.querySelectorAll('.tool-item');
    assert.lengthOf(listElements, 2);
    assert.isFalse(listElements[0].classList.contains('selected'));
    assert.isTrue(listElements[1].classList.contains('selected'));
  });

  it('renders a selected tool call details in a TabbedPane', async () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const target = document.createElement('div');
    target.style.width = '600px';
    target.style.height = '400px';
    renderElementIntoDOM(target, {includeCommonStyles: true});

    const tool = createTool('list_files', 'List files', 'frame-1' as Protocol.Page.FrameId, sdkTarget);
    const selectedCall: WebMCP.WebMCPModel.Call = {
      invocationId: '1',
      input: '{"dir": "/tmp"}',
      tool,
      result: new WebMCP.WebMCPModel.Result(
          Protocol.WebMCP.InvocationStatus.Completed, 'File content here', undefined, undefined)
    };

    DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          toolCalls: [selectedCall],
          selectedCall,
        },
        {}, target);

    await assertScreenshot('application/webmcp-tool-call-details.png');
  });

  it('renders a tool call with JS exception in a TabbedPane', async () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const target = document.createElement('div');
    target.style.width = '600px';
    target.style.height = '400px';
    renderElementIntoDOM(target, {includeCommonStyles: true});

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = sdkTarget.targetManager();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({forceNew: true, resourceMapping, targetManager});

    const tool = createTool('list_files', 'List files', 'frame-1' as Protocol.Page.FrameId, sdkTarget);
    const selectedCall: WebMCP.WebMCPModel.Call = {
      invocationId: '1',
      input: '{"dir": "/tmp"}',
      tool,
      result: new WebMCP.WebMCPModel.Result(Protocol.WebMCP.InvocationStatus.Error, undefined, undefined, undefined)
    };

    const errorObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    const runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel);
    runtimeModel.target.returns(sdkTarget);
    errorObject.runtimeModel.returns(runtimeModel);

    const mockExceptionDetails: WebMCP.WebMCPModel.ExceptionDetails = {
      error: errorObject,
      description: 'TypeError: Cannot read properties of undefined (reading \'foo\')',
      frames: [
        {line: 'TypeError: Cannot read properties of undefined (reading \'foo\')'}, {
          line: '    at doSomething (app.js:10:5)',
          isCallFrame: true,
          link: {
            url: urlString`http://localhost/app.js`,
            lineNumber: 9,
            columnNumber: 4,
            prefix: '    at doSomething (',
            suffix: ')',
            enclosedInBraces: false,
            scriptId: '123' as Protocol.Runtime.ScriptId,
          }
        }
      ],
    };

    sinon.stub(selectedCall.result!, 'exceptionDetails').get(() => Promise.resolve(mockExceptionDetails));

    DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          toolCalls: [selectedCall],
          selectedCall,
        },
        {}, target);

    await UI.Widget.Widget.allUpdatesComplete;

    const tabbedPane = target.querySelector('devtools-tabbed-pane');
    const tabElement = tabbedPane?.shadowRoot?.getElementById('tab-webmcp.call-outputs');
    tabElement?.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));

    await UI.Widget.Widget.allUpdatesComplete;
    await assertScreenshot('application/webmcp-tool-call-error-js-exception.png');
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
          ...createDefaultViewInput(),
          filters: {text: 'test', toolTypes: {imperative: true}},
          filterButtons,
        },
        {}, container);

    await assertScreenshot('application/webmcp_filter_bar_applied.png');
  });

  it('calls onClearLogClick when clear log button is clicked', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    const onClearLogClick = sinon.spy();

    DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          onClearLogClick,
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

  it('updates selected tool', async () => {
    const {model, viewStub} = await setup();
    const toolProtocol = {
      name: 'tool1',
      description: 'desc1',
      inputSchema: {type: 'object'},
      frameId: 'frame1' as Protocol.Page.FrameId
    };
    model.toolsAdded({tools: [toolProtocol]});
    const input = await viewStub.nextInput;
    const tool = input.tools[0];

    viewStub.input.onToolSelect(tool);
    const nextInput = await viewStub.nextInput;
    assert.strictEqual(nextInput.selectedTool, tool);
  });

  it('invokes tool via onRunTool', async () => {
    const {model, viewStub} = await setup();
    const toolProtocol = {
      name: 'tool1',
      description: 'desc1',
      inputSchema: {type: 'object'},
      frameId: 'frame1' as Protocol.Page.FrameId
    };
    model.toolsAdded({tools: [toolProtocol]});
    const input = await viewStub.nextInput;
    const tool = input.tools[0];

    viewStub.input.onToolSelect(tool);
    const nextInput = await viewStub.nextInput;

    const invokeStub = sinon.stub(target.webMCPAgent(), 'invoke_invokeTool');

    // Test with parameters
    nextInput.onRunTool({
      data: {
        command: 'tool1',
        parameters: {arg1: 'value'},
      } as ProtocolMonitor.JSONEditor.Command
    });
    sinon.assert.calledWith(
        invokeStub, {toolName: 'tool1', frameId: 'frame1' as Protocol.Page.FrameId, input: {arg1: 'value'}});

    // Test with missing parameters
    nextInput.onRunTool({
      data: {
        command: 'tool1',
      } as ProtocolMonitor.JSONEditor.Command
    });
    sinon.assert.calledWith(invokeStub, {toolName: 'tool1', frameId: 'frame1' as Protocol.Page.FrameId, input: {}});
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
      tool: tools[0],
      input: '{"dir": "/tmp"}',
    },
    {
      invocationId: '2',
      tool: tools[1],
      input: '{"path": "/tmp/test.txt"}',
      result: new WebMCP.WebMCPModel.Result(
          Protocol.WebMCP.InvocationStatus.Completed, 'File content here', undefined, undefined)
    },
    {
      invocationId: '3',
      tool: tools[2],
      input: '{"path": "/root/secret.txt"}',
      result: new WebMCP.WebMCPModel.Result(
          Protocol.WebMCP.InvocationStatus.Error, undefined, 'Permission denied', undefined)
    },
    {
      invocationId: '4',
      tool: tools[3],
      input: '{"timeout": 100}',
    },
    {
      invocationId: '5',
      tool: tools[3],
      input: '{}',
      result: new WebMCP.WebMCPModel.Result(
          Protocol.WebMCP.InvocationStatus.Completed, 'Declarative success content', undefined, undefined)
    }
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
        completed: true,
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
        completed: true,
      },
      toolTypes: {
        declarative: true,
      },
    });
    assert.lengthOf(result, 1);
    assert.strictEqual(result[0].invocationId, '5');
  });
});

describeWithEnvironment('ToolDetailsWidget', () => {
  it('renders a DOM node origin', async () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '400px';
    renderElementIntoDOM(container, {includeCommonStyles: true});

    const domNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    domNode.getAttribute.withArgs('id').returns('my-id');
    domNode.getAttribute.withArgs('class').returns('class1 class2');
    domNode.nodeNameInCorrectCase.returns('div');

    const tool = createTool('my-tool', 'my description', 'frame1' as Protocol.Page.FrameId, sdkTarget);
    sinon.stub(tool, 'node').get(() => ({
                                   resolvePromise: () => Promise.resolve(domNode),
                                 }));

    const widget = new Application.WebMCPView.ToolDetailsWidget();
    widget.markAsRoot();
    widget.show(container);
    widget.tool = tool;
    await widget.updateComplete;

    await assertScreenshot('application/webmcp_tool_details_node.png');
  });

  it('renders a stack trace origin', async () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '400px';
    renderElementIntoDOM(container, {includeCommonStyles: true});

    const tool = createTool('my-tool', 'my description', 'frame1' as Protocol.Page.FrameId, sdkTarget);
    sinon.stub(tool, 'stackTrace')
        .get(() => Promise.resolve(StubStackTrace.create(['http://example.com/script.js:myFunction:10:5'])));

    const widget = new Application.WebMCPView.ToolDetailsWidget();
    widget.markAsRoot();
    widget.show(container);
    widget.tool = tool;
    await widget.updateComplete;

    await assertScreenshot('application/webmcp_tool_details_stacktrace.png');
  });

  it('renders a frame', async () => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    const sdkTarget = createTarget();
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '400px';
    renderElementIntoDOM(container, {includeCommonStyles: true});

    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    frame.displayName.returns('My Frame Name');

    const tool = createTool('my-tool', 'my description', 'frame1' as Protocol.Page.FrameId, sdkTarget);
    sinon.stub(tool, 'frame').get(() => frame);

    const widget = new Application.WebMCPView.ToolDetailsWidget();
    widget.markAsRoot();
    widget.show(container);
    widget.tool = tool;
    await widget.updateComplete;

    await assertScreenshot('application/webmcp_tool_details_frame.png');
  });
});

describeWithEnvironment('PayloadWidget (View)', () => {
  const {PAYLOAD_DEFAULT_VIEW} = Application.WebMCPView;

  it('renders parsed JSON input', async () => {
    const target = document.createElement('div');
    target.style.width = '600px';
    target.style.height = '400px';
    renderElementIntoDOM(target, {includeCommonStyles: true});

    PAYLOAD_DEFAULT_VIEW(
        {
          valueObject: {key1: 'value1', key2: ['a', 'b']},
        },
        {}, target);

    await assertScreenshot('application/webmcp_payload_parsed.png');
  });

  it('renders unparsable input as raw source', async () => {
    const target = document.createElement('div');
    target.style.width = '600px';
    target.style.height = '400px';
    renderElementIntoDOM(target, {includeCommonStyles: true});

    PAYLOAD_DEFAULT_VIEW(
        {
          valueString: 'invalid json input',
        },
        {}, target);

    await assertScreenshot('application/webmcp_payload_unparsable.png');
  });
});

describeWithEnvironment('PayloadWidget', () => {
  const {PayloadWidget} = Application.WebMCPView;
  async function createWidget() {
    const view = createViewFunctionStub(PayloadWidget);
    const widget = new PayloadWidget(undefined, view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  it('renders nothing if no call is assigned', async () => {
    const {view} = await createWidget();
    assert.isUndefined(view.input.valueObject);
    assert.isUndefined(view.input.valueString);
  });

  it('passes valid JSON input to view', async () => {
    const {view, widget} = await createWidget();
    widget.valueObject = {key: 'value'};

    const nextInput = await view.nextInput;
    assert.deepEqual(nextInput.valueObject as {key: string}, {key: 'value'});
  });

  it('passes string input to view', async () => {
    const {view, widget} = await createWidget();
    widget.valueString = 'invalid json';

    const nextInput = await view.nextInput;
    assert.strictEqual(nextInput.valueString, 'invalid json');
  });
});

describe('parseToolSchema', () => {
  const {parseToolSchema} = Application.WebMCPView;
  const {ParameterType} = ProtocolMonitor.JSONEditor;

  it('parses empty schema', () => {
    const parsed = parseToolSchema({});
    assert.deepEqual(parsed.parameters, []);
    assert.strictEqual(parsed.typesByName.size, 0);
    assert.strictEqual(parsed.enumsByName.size, 0);
  });

  it('parses primitive properties', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        strProp: {type: 'string', description: 'A string'},
        numProp: {type: 'integer'},
        boolProp: {type: 'boolean'},
      },
      required: ['strProp'],
    };
    const parsed = parseToolSchema(schema);

    assert.lengthOf(parsed.parameters, 3);
    assert.deepEqual(parsed.parameters[0], {
      name: 'strProp',
      type: ParameterType.STRING,
      description: 'A string',
      optional: false,
      isCorrectType: true,
    });
    assert.deepEqual(parsed.parameters[1], {
      name: 'numProp',
      type: ParameterType.NUMBER,
      description: '',
      optional: true,
      isCorrectType: true,
    });
  });

  it('parses nested objects', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        objProp: {
          type: 'object',
          properties: {
            nestedStr: {type: 'string'},
          },
          required: ['nestedStr'],
        },
        emptyObj: {
          type: 'object',
        },
      },
    };
    const parsed = parseToolSchema(schema);

    assert.lengthOf(parsed.parameters, 2);
    assert.strictEqual(parsed.parameters[0].name, 'objProp');
    assert.strictEqual(parsed.parameters[0].type, ParameterType.OBJECT);
    assert.isDefined(parsed.parameters[0].typeRef);
    assert.isUndefined(parsed.parameters[0].isKeyEditable);

    assert.strictEqual(parsed.parameters[1].name, 'emptyObj');
    assert.strictEqual(parsed.parameters[1].type, ParameterType.OBJECT);
    assert.isTrue(parsed.parameters[1].isKeyEditable);

    const nestedType = parsed.typesByName.get(parsed.parameters[0].typeRef!);
    assert.isDefined(nestedType);
    assert.lengthOf(nestedType!, 1);
    assert.strictEqual(nestedType![0].name, 'nestedStr');
    assert.isFalse(nestedType![0].optional);
  });

  it('parses arrays', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        arrProp: {
          type: 'array',
          items: {type: 'string'},
        },
        objArrProp: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nestedNum: {type: 'number'},
            },
          },
        },
      },
    };
    const parsed = parseToolSchema(schema);

    assert.lengthOf(parsed.parameters, 2);
    assert.strictEqual(parsed.parameters[0].name, 'arrProp');
    assert.strictEqual(parsed.parameters[0].type, ParameterType.ARRAY);
    assert.strictEqual(parsed.parameters[0].typeRef, 'string');

    assert.strictEqual(parsed.parameters[1].name, 'objArrProp');
    assert.strictEqual(parsed.parameters[1].type, ParameterType.ARRAY);
    assert.isDefined(parsed.parameters[1].typeRef);

    const nestedType = parsed.typesByName.get(parsed.parameters[1].typeRef!);
    assert.isDefined(nestedType);
    assert.lengthOf(nestedType!, 1);
    assert.strictEqual(nestedType![0].name, 'nestedNum');
    assert.strictEqual(nestedType![0].type, ParameterType.NUMBER);
  });

  it('parses enums', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        enumProp: {
          type: 'string',
          enum: ['val1', 'val2'],
        },
        enumArrProp: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['arrVal1'],
          },
        },
      },
    };
    const parsed = parseToolSchema(schema);

    assert.lengthOf(parsed.parameters, 2);
    assert.isDefined(parsed.parameters[0].typeRef);
    assert.isDefined(parsed.parameters[1].typeRef);

    const enum1 = parsed.enumsByName.get(parsed.parameters[0].typeRef!);
    assert.deepEqual(enum1, {val1: 'val1', val2: 'val2'});

    const enum2 = parsed.enumsByName.get(parsed.parameters[1].typeRef!);
    assert.deepEqual(enum2, {arrVal1: 'arrVal1'});
  });

  it('parses refs', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        refProp: {
          $ref: '#/definitions/MyObject',
        },
        enumRefProp: {
          $ref: '#/definitions/MyEnum',
        },
      },
      definitions: {
        MyObject: {
          type: 'object',
          properties: {
            nestedProp: {type: 'string'},
          },
        },
        MyEnum: {
          type: 'string',
          enum: ['val1', 'val2'],
        },
      },
    };
    const parsed = parseToolSchema(schema);

    assert.lengthOf(parsed.parameters, 2);
    assert.strictEqual(parsed.parameters[0].name, 'refProp');
    assert.strictEqual(parsed.parameters[0].type, ParameterType.OBJECT);
    assert.strictEqual(parsed.parameters[0].typeRef, 'MyObject');

    assert.strictEqual(parsed.parameters[1].name, 'enumRefProp');
    assert.strictEqual(parsed.parameters[1].type, ParameterType.STRING);
    assert.strictEqual(parsed.parameters[1].typeRef, 'MyEnum');

    const myObjectParams = parsed.typesByName.get('MyObject');
    assert.isDefined(myObjectParams);
    assert.lengthOf(myObjectParams!, 1);
    assert.strictEqual(myObjectParams![0].name, 'nestedProp');
    assert.strictEqual(myObjectParams![0].type, ParameterType.STRING);

    const myEnumRecord = parsed.enumsByName.get('MyEnum');
    assert.isDefined(myEnumRecord);
    assert.deepEqual(myEnumRecord, {val1: 'val1', val2: 'val2'});
  });

  it('parses unparsable types like anyOf as unknown by default', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        anyOfProp: {
          anyOf: [
            {type: 'string'},
            {type: 'number'},
          ],
        },
      },
    };
    const parsed = parseToolSchema(schema);

    assert.lengthOf(parsed.parameters, 1);
    assert.strictEqual(parsed.parameters[0].name, 'anyOfProp');
    assert.strictEqual(parsed.parameters[0].type, ParameterType.UNKNOWN);
    assert.isUndefined(parsed.parameters[0].typeRef);
  });
});

describeWithEnvironment('WebMCPView JSON Editor', () => {
  const createDefaultViewInput = (): Application.WebMCPView.ViewInput => {
    return {
      filters: {text: ''},
      tools: [],
      toolCalls: [],
      filterButtons: Application.WebMCPView.WebMCPView.createFilterButtons(() => {}, () => {}),
      onClearLogClick: () => {},
      onFilterChange: () => {},
      selectedTool: null,
      onToolSelect: () => {},
      selectedCall: null,
      onCallSelect: () => {},
      onRunTool: () => {},
    };
  };

  it('renders parameters based on tool schema', async () => {
    const target = createTarget();
    const tool = createTool('testTool', 'Test tool', 'frameId' as Protocol.Page.FrameId, target, undefined, {
      type: 'object',
      properties: {
        strProp: {type: 'string', description: 'A string'},
      },
      required: ['strProp'],
    });

    const targetEl = document.createElement('div');
    targetEl.style.width = '600px';
    targetEl.style.height = '400px';
    renderElementIntoDOM(targetEl, {includeCommonStyles: true});

    Application.WebMCPView.DEFAULT_VIEW(
        {
          ...createDefaultViewInput(),
          selectedTool: tool,
        },
        {}, targetEl);

    // Wait for nested Lit renders
    await new Promise(resolve => setTimeout(resolve, 50));

    const devtoolsWidget = targetEl.querySelector('devtools-widget.json-editor-widget');
    assert.isNotNull(devtoolsWidget);

    const inputs = devtoolsWidget!.shadowRoot?.querySelectorAll('devtools-suggestion-input');

    assert.isDefined(inputs);
    assert.isTrue(inputs!.length > 0, 'Should render suggestion inputs for parameters');

    await assertScreenshot('application/webmcp-json-editor.png');
  });
});
