// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Breakpoints from '../models/breakpoints/breakpoints.js';
import * as Logs from '../models/logs/logs.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as ProjectSettings from '../models/project_settings/project_settings.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as WorkspaceDiff from '../models/workspace_diff/workspace_diff.js';
import * as AiAssistancePanel from '../panels/ai_assistance/ai_assistance.js';
import * as UI from '../ui/legacy/legacy.js';
import { findMenuItemWithLabel } from './ContextMenuHelpers.js';
import { renderElementIntoDOM } from './DOMHelpers.js';
import { createTarget, } from './EnvironmentHelpers.js';
import { createContentProviderUISourceCodes, createFileSystemUISourceCode } from './UISourceCodeHelpers.js';
import { createViewFunctionStub } from './ViewFunctionHelpers.js';
function createMockAidaClient(doConversation) {
    const aidaClient = sinon.createStubInstance(Host.AidaClient.AidaClient);
    aidaClient.doConversation.callsFake(doConversation);
    return aidaClient;
}
export const MockAidaAbortError = {
    abortError: true,
};
export const MockAidaFetchError = {
    fetchError: true,
};
/**
 * Creates a mock AIDA client that responds using `data`.
 *
 * Each first-level item of `data` is a single response.
 * Each second-level item of `data` is a chunk of a response.
 * The last chunk sets completed flag to true;
 */
export function mockAidaClient(data = []) {
    let callId = 0;
    async function* provideAnswer(_, options) {
        if (!data[callId]) {
            throw new Error('No data provided to the mock client');
        }
        for (const [idx, chunk] of data[callId].entries()) {
            if (options?.signal?.aborted || ('abortError' in chunk)) {
                throw new Host.AidaClient.AidaAbortError();
            }
            if ('fetchError' in chunk) {
                throw new Error('Fetch error');
            }
            const metadata = chunk.metadata ?? {};
            if (metadata?.attributionMetadata?.attributionAction === Host.AidaClient.RecitationAction.BLOCK) {
                throw new Host.AidaClient.AidaBlockError();
            }
            if (chunk.functionCalls?.length) {
                callId++;
                yield { ...chunk, metadata, completed: true };
                break;
            }
            const completed = idx === data[callId].length - 1;
            if (completed) {
                callId++;
            }
            yield {
                ...chunk,
                metadata,
                completed,
            };
        }
    }
    return createMockAidaClient(provideAnswer);
}
export async function createUISourceCode(options) {
    const url = options?.url ?? Platform.DevToolsPath.urlString `http://example.test/script.js`;
    const { project } = createContentProviderUISourceCodes({
        items: [
            {
                url,
                mimeType: options?.mimeType ?? 'application/javascript',
                resourceType: options?.resourceType ?? Common.ResourceType.resourceTypes.Script,
                content: options?.content ?? undefined,
            },
        ],
        target: createTarget(),
    });
    const uiSourceCode = project.uiSourceCodeForURL(url);
    if (!uiSourceCode) {
        throw new Error('Failed to create a test uiSourceCode');
    }
    if (!uiSourceCode.contentType().isTextType()) {
        uiSourceCode?.setContent('binary', true);
    }
    if (options?.requestContentData) {
        await uiSourceCode.requestContentData();
    }
    return uiSourceCode;
}
export function createNetworkRequest(opts) {
    const networkRequest = SDK.NetworkRequest.NetworkRequest.create('requestId-0', opts?.url ?? Platform.DevToolsPath.urlString `https://www.example.com/script.js`, Platform.DevToolsPath.urlString ``, null, null, null);
    networkRequest.statusCode = 200;
    networkRequest.setRequestHeaders([{ name: 'content-type', value: 'bar1' }]);
    networkRequest.responseHeaders = [{ name: 'content-type', value: 'bar2' }, { name: 'x-forwarded-for', value: 'bar3' }];
    if (opts?.includeInitiators) {
        const initiatorNetworkRequest = SDK.NetworkRequest.NetworkRequest.create('requestId-1', Platform.DevToolsPath.urlString `https://www.initiator.com`, Platform.DevToolsPath.urlString ``, null, null, null);
        const initiatedNetworkRequest1 = SDK.NetworkRequest.NetworkRequest.create('requestId-2', Platform.DevToolsPath.urlString `https://www.example.com/1`, Platform.DevToolsPath.urlString ``, null, null, null);
        const initiatedNetworkRequest2 = SDK.NetworkRequest.NetworkRequest.create('requestId-3', Platform.DevToolsPath.urlString `https://www.example.com/2`, Platform.DevToolsPath.urlString ``, null, null, null);
        sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'initiatorGraphForRequest')
            .withArgs(networkRequest)
            .returns({
            initiators: new Set([networkRequest, initiatorNetworkRequest]),
            initiated: new Map([
                [networkRequest, initiatorNetworkRequest],
                [initiatedNetworkRequest1, networkRequest],
                [initiatedNetworkRequest2, networkRequest],
            ]),
        })
            .withArgs(initiatedNetworkRequest1)
            .returns({
            initiators: new Set([]),
            initiated: new Map([
                [initiatedNetworkRequest1, networkRequest],
            ]),
        })
            .withArgs(initiatedNetworkRequest2)
            .returns({
            initiators: new Set([]),
            initiated: new Map([
                [initiatedNetworkRequest2, networkRequest],
            ]),
        });
    }
    return networkRequest;
}
let panels = [];
/**
 * Creates and shows an AiAssistancePanel instance returning the view
 * stubs and the initial view input caused by Widget.show().
 */
export async function createAiAssistancePanel(options) {
    let aidaAvailabilityForStub = options?.aidaAvailability ?? "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */;
    const view = createViewFunctionStub(AiAssistancePanel.AiAssistancePanel, { chatView: options?.chatView });
    const aidaClient = options?.aidaClient ?? mockAidaClient();
    const checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions').callsFake(() => {
        return Promise.resolve(aidaAvailabilityForStub);
    });
    const panel = new AiAssistancePanel.AiAssistancePanel(view, {
        aidaClient,
        aidaAvailability: aidaAvailabilityForStub,
        syncInfo: options?.syncInfo ?? { isSyncActive: true },
    });
    panels.push(panel);
    // In many of the tests we create other panels to allow the right contexts to
    // be set for the AI Assistance panel.
    renderElementIntoDOM(panel, { allowMultipleChildren: true });
    await view.nextInput;
    const stubAidaCheckAccessPreconditions = (aidaAvailability) => {
        aidaAvailabilityForStub = aidaAvailability;
        return checkAccessPreconditionsStub;
    };
    return {
        panel,
        view,
        aidaClient,
        stubAidaCheckAccessPreconditions,
    };
}
export const setupAutomaticFileSystem = (options = {
    hasFileSystem: false
}) => {
    const root = '/path/to/my-automatic-file-system';
    const uuid = '549bbf9b-48b2-4af7-aebd-d3ba68993094';
    const inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    inspectorFrontendHost.events = sinon.createStubInstance(Common.ObjectWrapper.ObjectWrapper);
    const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
    sinon.stub(projectSettingsModel, 'availability').value('available');
    sinon.stub(projectSettingsModel, 'projectSettings').value(options.hasFileSystem ? { workspace: { root, uuid } } : {});
    const manager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance({
        forceNew: true,
        inspectorFrontendHost,
        projectSettingsModel,
    });
    sinon.stub(manager, 'connectAutomaticFileSystem').resolves(true);
};
let patchWidgets = [];
/**
 * Creates and shows an AiAssistancePanel instance returning the view
 * stubs and the initial view input caused by Widget.show().
 */
export async function createPatchWidget(options) {
    const view = createViewFunctionStub(AiAssistancePanel.PatchWidget.PatchWidget);
    const aidaClient = options?.aidaClient ?? mockAidaClient();
    const widget = new AiAssistancePanel.PatchWidget.PatchWidget(undefined, view, {
        aidaClient,
    });
    patchWidgets.push(widget);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {
        widget,
        view,
        aidaClient,
    };
}
export async function createPatchWidgetWithDiffView(options) {
    const aidaClient = options?.aidaClient ?? mockAidaClient([[{ explanation: 'patch applied' }]]);
    const { view, widget } = await createPatchWidget({ aidaClient });
    widget.changeSummary = 'body { background-color: red; }';
    view.input.onApplyToWorkspace();
    assert.strictEqual((await view.nextInput).patchSuggestionState, AiAssistancePanel.PatchWidget.PatchSuggestionState.SUCCESS);
    return { widget, view, aidaClient };
}
export function initializePersistenceImplForTests() {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({ forceNew: true });
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        targetManager: SDK.TargetManager.TargetManager.instance(),
        resourceMapping: new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace),
        ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager.instance({ forceNew: true }),
    });
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
        forceNew: true,
        targetManager: SDK.TargetManager.TargetManager.instance(),
        workspace,
        debuggerWorkspaceBinding,
    });
    Persistence.Persistence.PersistenceImpl.instance({ forceNew: true, workspace, breakpointManager });
    WorkspaceDiff.WorkspaceDiff.workspaceDiff({ forceNew: true });
}
export function cleanup() {
    for (const panel of panels) {
        panel.detach();
    }
    panels = [];
    for (const widget of patchWidgets) {
        widget.detach();
    }
    patchWidgets = [];
}
export function openHistoryContextMenu(lastUpdate, item) {
    const contextMenu = new UI.ContextMenu.ContextMenu(new MouseEvent('click'));
    lastUpdate.populateHistoryMenu(contextMenu);
    const freestylerEntry = findMenuItemWithLabel(contextMenu.defaultSection(), item);
    return {
        contextMenu,
        id: freestylerEntry?.id(),
    };
}
export function createTestFilesystem(fileSystemPath, files) {
    const { project, uiSourceCode } = createFileSystemUISourceCode({
        url: Platform.DevToolsPath.urlString `${fileSystemPath}/index.html`,
        mimeType: 'text/html',
        content: 'content',
        fileSystemPath,
    });
    uiSourceCode.setWorkingCopy('content');
    for (const file of files ?? []) {
        const uiSourceCode = project.createUISourceCode(Platform.DevToolsPath.urlString `${fileSystemPath}/${file.path}`, Common.ResourceType.resourceTypes.Script);
        project.addUISourceCode(uiSourceCode);
        uiSourceCode.setWorkingCopy(file.content);
    }
    return { project, uiSourceCode };
}
//# sourceMappingURL=AiAssistanceHelpers.js.map