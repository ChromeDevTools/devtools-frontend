// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../core/sdk/sdk-meta.js';
import '../../models/workspace/workspace-meta.js';
import '../../models/logs/logs-meta.js';
import '../../panels/sensors/sensors-meta.js';
import '../../panels/sources/sources-meta.js';
import '../../entrypoints/inspector_main/inspector_main-meta.js';
import '../../entrypoints/main/main-meta.js';
import '../../ui/legacy/components/source_frame/source_frame-meta.js';
import '../../ui/components/markdown_view/markdown_view.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as ExperimentNames from '../../core/root/ExperimentNames.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Foundation from '../../foundation/foundation.js';
import type * as Protocol from '../../generated/protocol.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as Greendev from '../../models/greendev/greendev.js';
import type {SyncMessage} from '../../panels/greendev/GreenDevShared.js';
import * as Marked from '../../third_party/marked/marked.js';
import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

const {AidaClient} = Host.AidaClient;
const {ResponseType} = AiAssistance.AiAgent;

let pendingActivationSessionId: number|null = null;

class GreenDevFloaty {
  #chatContainer!: HTMLDivElement;
  #textField!: HTMLInputElement;
  #playButton!: HTMLButtonElement;
  #node?: SDK.DOMModel.DOMNode;
  #agent?: AiAssistance.GreenDevAgent.GreenDevAgent|AiAssistance.StylingAgent.StylingAgent;
  #nodeContext?: AiAssistance.DOMNodeContext.DOMNodeContext;
  #backendNodeId?: Protocol.DOM.BackendNodeId;
  #syncChannel: BroadcastChannel;
  #isFloatyWindow: boolean;
  #socketClient:
      AiAssistance.GreenDevAgentAntigravityCliSocketClient.GreenDevAgentAntigravityCliSocketClient|
      AiAssistance.GreenDevAgentGeminiCliSocketClient.GreenDevAgentGeminiCliSocketClient;

  constructor(document: Document) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    this.#backendNodeId = parseInt(params.get('backendNodeId') || '0', 10) as Protocol.DOM.BackendNodeId;
    this.#isFloatyWindow = !!this.#backendNodeId;

    this.#syncChannel = new BroadcastChannel('green-dev-sync');
    this.#syncChannel.onmessage = event => {
      this.#onSyncMessage(event.data);
    };

    this.#initFloatyMode(document);
    if (Greendev.Prototypes.instance().isEnabled('beyondStylingAntigravity')) {
      this.#socketClient =
          new AiAssistance.GreenDevAgentAntigravityCliSocketClient.GreenDevAgentAntigravityCliSocketClient();
    } else {
      this.#socketClient = new AiAssistance.GreenDevAgentGeminiCliSocketClient.GreenDevAgentGeminiCliSocketClient();
    }
  }

  #initFloatyMode(doc: Document): void {
    this.#chatContainer = doc.getElementById('chat-container') as HTMLDivElement;
    this.#textField = doc.querySelector('.green-dev-floaty-dialog-text-field') as HTMLInputElement;
    this.#playButton = doc.querySelector('.green-dev-floaty-dialog-play-button') as HTMLButtonElement;

    this.#playButton?.addEventListener('click', () => {
      if (this.#node) {
        void this.runConversation();
      }
    });

    const contextText = doc.querySelector('.green-dev-floaty-dialog-context-text') as HTMLSpanElement;
    if (contextText) {
      contextText.style.cursor = 'pointer';
      contextText.title = 'Click to show in DevTools Panel';
      contextText.addEventListener('click', () => {
        this.#broadcastFullState();
      });
    }

    const learnMoreLink = doc.querySelector('.learn-more-link');
    if (learnMoreLink) {
      learnMoreLink.addEventListener('click', event => {
        event.preventDefault();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
            'https://developer.chrome.com/docs/devtools/ai-assistance' as Platform.DevToolsPath.UrlString);
      });
    }

    const nodeDescriptionElement = doc.querySelector('.green-dev-floaty-dialog-node-description') as HTMLDivElement;
    nodeDescriptionElement?.addEventListener('mousemove', () => {
      if (this.#node) {
        this.#node.highlight();
      }
    });
    nodeDescriptionElement?.addEventListener('mouseleave', () => {
      if (this.#node && this.#backendNodeId) {
        const msg = JSON.stringify({
          id: 9999,
          method: 'Overlay.setShowInspectedElementAnchor',
          params: {inspectedElementAnchorConfig: {backendNodeId: this.#backendNodeId}},
        });
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(msg);
      }
    });

    this.#textField?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && this.#node) {
        void this.runConversation();
      }
    });

    this.#textField?.focus();
  }

  #broadcastFullState(): void {
    const state = {
      type: 'full-state',
      messages: this.#getMessages(),
      sessionId: this.#backendNodeId,
      nodeDescription: document.querySelector('.green-dev-floaty-dialog-node-description')?.textContent,
    };
    this.#syncChannel.postMessage(state);
  }

  #onSyncMessage(data: SyncMessage): void {
    if (data.type === 'main-window-alive') {
      if (pendingActivationSessionId) {
        const syncChannel = new BroadcastChannel('green-dev-sync');
        syncChannel.postMessage({type: 'activate-panel', sessionId: pendingActivationSessionId});
        syncChannel.close();
      }
    } else if (data.type === 'request-session-state') {
      this.#broadcastFullState();

      if (pendingActivationSessionId) {
        this.#syncChannel.postMessage({type: 'select-tab', sessionId: pendingActivationSessionId});
        pendingActivationSessionId = null;
      }
    } else if (data.type === 'user-input' && data.sessionId === this.#backendNodeId) {
      if (this.#textField) {
        this.#textField.value = data.text ?? '';
        void this.runConversation();
      }
    } else if (data.type === 'restore-floaty' && data.sessionId === this.#backendNodeId) {
      // The main DevTools window will bring the floaty to the front,
      // so the floaty window itself doesn't need to do it.
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
    }
  }

  static instance(opts: {forceNew: boolean|null, document: Document} = {forceNew: null, document}): GreenDevFloaty {
    const {forceNew, document} = opts;
    if (!greenDevFloatyInstance || forceNew) {
      greenDevFloatyInstance = new GreenDevFloaty(document);
    }
    return greenDevFloatyInstance;
  }

  handlePanelRequest = (event: Common.EventTarget.EventTargetEvent<number>): void => {
    pendingActivationSessionId = event.data;
    this.#sendActivatePanelMessage(pendingActivationSessionId, 0);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
        'magic:open-devtools' as Platform.DevToolsPath.UrlString);
  };

  readonly #maxActivationRetries = 10;
  readonly #activationRetryDelayMs = 200;

  #sendActivatePanelMessage(sessionId: number, retryCount: number): void {
    if (retryCount >= this.#maxActivationRetries) {
      return;
    }

    const syncChannel = new BroadcastChannel('green-dev-sync');
    syncChannel.postMessage({type: 'activate-panel', sessionId});
    syncChannel.close();

    // To ensure the activate-panel is always received, let's add a small delay and retry.
    // This is a pragmatic fix for the prototype given the existing async message flow.
    setTimeout(() => {
      // Check if pendingActivationSessionId is still set. If it is, it means
      // the panel hasn't been activated yet (or the confirmation message
      // hasn't arrived), so we retry.
      if (pendingActivationSessionId === sessionId) {
        this.#sendActivatePanelMessage(sessionId, retryCount + 1);
      }
    }, this.#activationRetryDelayMs);
  }

  handleRestoreEvent(event: Common.EventTarget.EventTargetEvent<number>): void {
    const sessionId = event.data;
    // Only the main DevTools window (which is NOT a floaty window) should broadcast the restore request.
    if (!this.#isFloatyWindow) {
      this.#syncChannel.postMessage({type: 'restore-floaty', sessionId});
    } else if (this.#backendNodeId === sessionId) {
      // If a floaty window receives a restore request for its own session,
      // it should bring itself to the front.
      console.error('[GreenDev] Calling bringToFront for session ' + sessionId);
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
    }
  }

  setNode(node: SDK.DOMModel.DOMNode): void {
    if (this.#node) {
      this.#node.domModel().overlayModel().removeEventListener(
          SDK.OverlayModel.Events.INSPECT_PANEL_SHOW_REQUESTED, this.handlePanelRequest);
    }
    if (this.#node === node) {
      return;
    }
    this.#node = node;
    this.#node.domModel().overlayModel().addEventListener(
        SDK.OverlayModel.Events.INSPECT_PANEL_SHOW_REQUESTED, this.handlePanelRequest);
    this.#backendNodeId = node.backendNodeId();

    void node.domModel().overlayModel().clearHighlight();
    this.#textField?.focus();
    this.#agent = undefined;
    this.#nodeContext = undefined;

    const nodeDescriptionElement = document.querySelector('.green-dev-floaty-dialog-node-description');
    let description = '';
    if (nodeDescriptionElement) {
      const id = node.getAttribute('id');
      if (id) {
        description = `#${id}`;
      } else {
        const classes = node.classNames().join('.');
        description = node.nodeName().toLowerCase() + (classes ? `.${classes}` : '');
      }
      nodeDescriptionElement.textContent = description;
    }

    this.#syncChannel.postMessage({type: 'node-changed', sessionId: this.#backendNodeId, nodeDescription: description});

    if (this.#backendNodeId) {
      const msg = JSON.stringify({
        id: 9999,
        method: 'Overlay.setShowInspectedElementAnchor',
        params: {inspectedElementAnchorConfig: {backendNodeId: this.#backendNodeId}},
      });
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(msg);
    }
  }

  #getMessages(): Array<{text: string, isUser: boolean}> {
    const messages = [];
    if (this.#chatContainer) {
      const messageElements = this.#chatContainer.querySelectorAll('.message');
      for (const el of messageElements) {
        const isUser = el.classList.contains('user-message');
        const content = el.querySelector('.message-content')?.textContent || '';
        messages.push({text: content, isUser});
      }
    }
    return messages;
  }

  #formatError(errorMessage: string): string {
    return `Error: '${errorMessage}' - Protip: to use AI features you need to be signed in.`;
  }

  runConversation = async(): Promise<void> => {
    if (!this.#textField || !this.#node) {
      return;
    }
    const query = this.#textField.value || this.#textField.placeholder;
    this.#textField.value = '';

    const useAntigravity = Greendev.Prototypes.instance().isEnabled('beyondStylingAntigravity');
    const useGemini = Greendev.Prototypes.instance().isEnabled('beyondStylingGemini');
    const useGreenDevAgent = useAntigravity || useGemini;
    const isAntigravity = useAntigravity;

    if (!this.#agent) {
      const aidaClient = new AidaClient();
      if (useGreenDevAgent) {
        if (isAntigravity) {
          this.#socketClient =
              new AiAssistance.GreenDevAgentAntigravityCliSocketClient.GreenDevAgentAntigravityCliSocketClient();
        } else {
          this.#socketClient = new AiAssistance.GreenDevAgentGeminiCliSocketClient.GreenDevAgentGeminiCliSocketClient();
        }

        this.#agent = new AiAssistance.GreenDevAgent.GreenDevAgent({aidaClient});
        this.#agent.addEventListener(
            AiAssistance.GreenDevAgent.Events.CLI_PROMPT_REQUESTED,
            async (
                event: Common.EventTarget.EventTargetEvent<
                    AiAssistance.GreenDevAgent.EventTypes[AiAssistance.GreenDevAgent.Events.CLI_PROMPT_REQUESTED]>) => {
              const {prompt} = event.data;
              const remoteName = isAntigravity ? 'Antigravity' : 'Gemini';
              const aiContent =
                  this.#addMessageInternal(`Fix has been submitted to ${remoteName} CLI, please wait...`, false);

              if (isAntigravity) {
                let fullResponse = '';
                void (
                    this.#socketClient as
                    AiAssistance.GreenDevAgentAntigravityCliSocketClient.GreenDevAgentAntigravityCliSocketClient)
                    .sendPrompt(prompt, (chunk: string) => {
                      fullResponse += chunk;
                      const responseText = `Antigravity CLI responds: ${fullResponse}`;
                      const markdown = new MarkdownView.MarkdownView.MarkdownView();
                      markdown.data = {
                        tokens: Marked.Marked.lexer(responseText),
                      };

                      const style = document.createElement('style');
                      style.textContent =
                          '.message { font-size: 1.0rem; } .message code { font-size: 1.0rem; font-family: \'Roboto Mono\', ' +
                          'monospace; color: green; } .message ul { margin-left: 20px; }';
                      markdown.shadowRoot?.appendChild(style);

                      this.#updateAiMessage(aiContent, markdown, responseText);
                    });
              } else {
                const response =
                    await (this.#socketClient as
                           AiAssistance.GreenDevAgentGeminiCliSocketClient.GreenDevAgentGeminiCliSocketClient)
                        .sendPrompt(prompt);

                const responseText = `Gemini CLI responds: ${response}`;
                const markdown = new MarkdownView.MarkdownView.MarkdownView();
                markdown.data = {
                  tokens: Marked.Marked.lexer(responseText),
                };
                this.#updateAiMessage(aiContent, markdown, responseText);
              }
            });
      } else {
        this.#agent = new AiAssistance.StylingAgent.StylingAgent({aidaClient});
        this.#nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(this.#node);
      }
    }

    this.#addMessageInternal(query, true);
    const aiContent = this.#addMessageInternal('Thinking...', false);

    let agentFinished = false;
    let steps = 0;
    try {
      let results;
      if (useGreenDevAgent && this.#agent instanceof AiAssistance.GreenDevAgent.GreenDevAgent) {
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!target) {
          return;
        }

        // --- Get the Accessibility Tree ---
        const accessibilityModel = target.model(SDK.AccessibilityModel.AccessibilityModel);
        let axTree = '';
        if (accessibilityModel) {
          await accessibilityModel.resumeModel();
          const axResponse = await accessibilityModel.agent.invoke_getFullAXTree({});
          if (!axResponse.getError()) {
            axTree = JSON.stringify(axResponse.nodes);
          } else {
            console.error('Failed to capture Accessibility Tree:', axResponse.getError());
          }
        }

        // --- Get the most recent network requests ---
        const allNetworkRequests = await AiAssistance.GreenDevAgent.GreenDevAgent.getNetworkContextData(target);
        const networkResourcesMax = 50;
        const startNetworkIndex = Math.max(0, allNetworkRequests.length - networkResourcesMax);
        const lastNetworkRequests = allNetworkRequests.slice(startNetworkIndex);
        let formattedNetworkContext = lastNetworkRequests.map(req => req.string).join('\n');

        if (!formattedNetworkContext) {
          formattedNetworkContext = 'No network requests found.';
        } else {
          const footer = allNetworkRequests.length > lastNetworkRequests.length ?
              `${
                  allNetworkRequests.length -
                  lastNetworkRequests.length} additional requests are available (network requests shown are capped at ${
                  networkResourcesMax} requests).` :
              'No further network requests are available.';

          formattedNetworkContext = `Showing network requests with indices ${startNetworkIndex}-${
              startNetworkIndex + lastNetworkRequests.length - 1}:\n\n${formattedNetworkContext}\n\n${footer}`;
        }

        // --- Get the most recent console messages ---
        const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
        const allConsoleMessages = consoleModel ? consoleModel.messages() : [];
        const consoleMsgLimit = 50;
        const startIndex = Math.max(0, allConsoleMessages.length - consoleMsgLimit);
        const lastConsoleMessages = allConsoleMessages.slice(startIndex);
        let formattedConsoleMessages =
            lastConsoleMessages
                .map(
                    (entry: SDK.ConsoleModel.ConsoleMessage, i: number) =>
                        AiAssistance.GreenDevAgent.GreenDevAgent.formatConsoleMessage(entry, startIndex + i))
                .join('\n');
        formattedConsoleMessages = formattedConsoleMessages.trimEnd();

        if (!formattedConsoleMessages) {
          formattedConsoleMessages = 'No console messages found.';
        } else {
          const footer = allConsoleMessages.length > lastConsoleMessages.length ?
              `${
                  allConsoleMessages.length -
                  lastConsoleMessages.length} additional messages are available (errors shown are capped at ${
                  consoleMsgLimit} most recent).` :
              'No further console messages are available.';

          formattedConsoleMessages = `Showing console messages with indices ${startIndex}-${
              startIndex + lastConsoleMessages.length - 1}:\n\n${formattedConsoleMessages}\n\n${footer}`;
        }

        const mainUrl = target.inspectedURL();

        // --- Get the React Props for the selected node (if available) ---
        const reactComponentProps = this.#backendNodeId ?
            await this.#agent.getReactComponentProps(this.#backendNodeId, false) :
            'Could not get the backendNodeId for the selected element.';

        // --- Get some context information about the selected node ---
        const domNodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(this.#node);
        const elementContext = await domNodeContext.describe();

        // Now construct the full context.
        const context = `# Page URL

${mainUrl}

# User-selected node

${elementContext}

# React component props:

${reactComponentProps}

# Recent network requests

${formattedNetworkContext}

# Recent console messages

${formattedConsoleMessages}

# Accessibility tree

${axTree}`;

        const nodeContext = new AiAssistance.GreenDevAgent.GreenDevContext(context);
        results = this.#agent.run(query, {selected: nodeContext});
      } else if (this.#agent instanceof AiAssistance.StylingAgent.StylingAgent) {
        if (!this.#nodeContext) {
          throw new Error('Node context not found.');
        }
        results = this.#agent.run(query, {selected: this.#nodeContext});
      } else {
        throw new Error('Agent not initialized correctly');
      }

      for await (const result of results) {
        switch (result.type) {
          case ResponseType.QUERYING:
            steps++;
            break;
          case ResponseType.ANSWER: {
            aiContent.textContent = '';
            // Add a space in the protocol, which prevents links from being linkified in
            // the markup. Why? Because there's an exception thrown if the links don't match the
            // allowlist in getMarkdownLink(). Need to figure out later.
            let sanitizedText = result.text.replace(/https:\/\//g, 'https: //');
            sanitizedText = sanitizedText.replace(/http:\/\//g, 'http: //');
            const markdown = new MarkdownView.MarkdownView.MarkdownView();
            markdown.data = {
              tokens: Marked.Marked.lexer(sanitizedText),
            };
            this.#updateAiMessage(aiContent, markdown, result.text);

            void new Promise(resolve => setTimeout(resolve, 0)).then(() => {
              const style = document.createElement('style');
              style.textContent =
                  '.message { font-size: 1.0rem; } .message code { font-size: 1.0rem; font-family: \'Roboto Mono\', ' +
                  'monospace; color: green; } .message ul { margin-left: 20px; }';
              markdown.shadowRoot?.appendChild(style);

              const codeBlocks = markdown.shadowRoot?.querySelectorAll('devtools-code-block');
              if (codeBlocks) {
                for (const codeBlock of codeBlocks) {
                  const style = document.createElement('style');
                  style.textContent = `
.heading { color: black; background-color: #f2f6ff; font-family: 'Roboto Mono', monospace; padding: 2px 4px;
           border-top-left-radius: 8px; border-top-right-radius: 8px; margin-bottom: 3px; }
.code { background-color: #f8f9fa; font-family: 'Roboto Mono', monospace; padding: 5px;
        border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
.editor-wrapper { margin-left: 20px; }
                  `;
                  codeBlock.shadowRoot?.appendChild(style);
                }
              }
            });
            agentFinished = true;
            break;
          }
          case ResponseType.ERROR:
            this.#updateAiMessage(
                aiContent, document.createTextNode(this.#formatError(result.error)), this.#formatError(result.error));
            agentFinished = true;
            break;
          case ResponseType.SIDE_EFFECT:
            result.confirm(true);
            break;
          default:
            break;
        }
        if (this.#chatContainer) {
          this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
        }
      }
    } catch (e) {
      aiContent.textContent = `Exception: ${e instanceof Error ? e.message : String(e)}`;
      agentFinished = true;
    }

    const MAX_AGENT_STEPS = AiAssistance.AiAgent.MAX_STEPS;
    if (!agentFinished && steps >= MAX_AGENT_STEPS) {
      aiContent.textContent = `The agent has reached its internal limit of ${MAX_AGENT_STEPS} steps per turn before
      finding an answer. Please try again with a more specific query or say 'continue' (to get ${MAX_AGENT_STEPS}
      more steps and continue trying).`;
    }
  };

  #addMessageInternal(text: string, isUser: boolean): HTMLDivElement {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    messageElement.appendChild(content);

    if (this.#chatContainer) {
      this.#chatContainer.appendChild(messageElement);
      this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
    }

    this.#syncChannel.postMessage({
      type: 'new-message',
      text,
      isUser,
      sessionId: this.#backendNodeId,
      nodeDescription: document.querySelector('.green-dev-floaty-dialog-node-description')?.textContent,
    });

    return content;
  }

  #updateAiMessage(aiContentElement: HTMLDivElement, newContent: Node, newText: string): void {
    aiContentElement.textContent = '';
    aiContentElement.append(newContent);
    this.#syncChannel.postMessage({type: 'update-last-message', text: newText, sessionId: this.#backendNodeId});
  }
}

let greenDevFloatyInstance: GreenDevFloaty;

function safeRegisterExperiment(name: string, title: string): void {
  try {
    Root.Runtime.experiments.register(name as ExperimentNames.ExperimentName, title);
  } catch (e) {
    console.error('Unable to register experiment ', name, title, e);
  }
}

async function init(): Promise<void> {
  try {
    Root.Runtime.Runtime.setPlatform(Host.Platform.platform());
    const [config, prefs] = await Promise.all([
      new Promise<Root.Runtime.HostConfig>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getHostConfig(resolve)),
      new Promise<Record<string, string>>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreferences(resolve)),
    ]);
    Object.assign(Root.Runtime.hostConfig, config);

    safeRegisterExperiment(
        Root.ExperimentNames.ExperimentName.INSTRUMENTATION_BREAKPOINTS, 'Enable instrumentation breakpoints');
    safeRegisterExperiment(
        Root.ExperimentNames.ExperimentName.USE_SOURCE_MAP_SCOPES, 'Use scope information from source maps');
    safeRegisterExperiment(Root.ExperimentNames.ExperimentName.PROTOCOL_MONITOR, 'Protocol Monitor');

    const hostUnsyncedStorage: Common.Settings.SettingsBackingStore = {
      register: (name: string) =>
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, {synced: false}),
      set: Host.InspectorFrontendHost.InspectorFrontendHostInstance.setPreference,
      get: (name: string) =>
          new Promise(resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreference(name, resolve)),
      remove: Host.InspectorFrontendHost.InspectorFrontendHostInstance.removePreference,
      clear: Host.InspectorFrontendHost.InspectorFrontendHostInstance.clearPreferences,
    };
    const syncedStorage = new Common.Settings.SettingsStorage(prefs, hostUnsyncedStorage, '');
    const globalStorage = new Common.Settings.SettingsStorage(prefs, hostUnsyncedStorage, '');
    const localStorage = new Common.Settings.SettingsStorage(
        window.localStorage, {
          register(_setting: string): void{},
          async get(setting: string): Promise<string> {
            return window.localStorage.getItem(setting) as unknown as string;
          },
          set(setting: string, value: string): void {
            window.localStorage.setItem(setting, value);
          },
          remove(setting: string): void {
            window.localStorage.removeItem(setting);
          },
          clear: () => window.localStorage.clear(),
        },
        '');

    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
    });

    UI.UIUtils.initializeUIUtils(document);
    ThemeSupport.ThemeSupport.instance({
      forceNew: true,
      setting: Common.Settings.Settings.instance().moduleSetting('ui-theme'),
    });
    UI.ZoomManager.ZoomManager.instance(
        {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});

    const settingLanguage = Common.Settings.Settings.instance().moduleSetting<string>('language').get();
    i18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        navigatorLanguage: navigator.language,
        settingLanguage,
        lookupClosestDevToolsLocale: i18n.i18n.lookupClosestSupportedDevToolsLocale,
      },
    });

    const universe = new Foundation.Universe.Universe({
      settingsCreationOptions: {
        syncedStorage,
        globalStorage,
        localStorage,
        settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      }
    });
    Root.DevToolsContext.setGlobalInstance(universe.context as Root.DevToolsContext.WritableDevToolsContext);

    await i18n.i18n.fetchAndRegisterLocaleData('en-US');
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.connectionReady();

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const backendNodeId = parseInt(params.get('backendNodeId') || '0', 10);

    const floaty = GreenDevFloaty.instance({forceNew: null, document});

    if (backendNodeId) {
      await SDK.Connections.initMainConnection(async () => {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        targetManager.createTarget('main', 'Main', SDK.Target.Type.FRAME, null);
        const mainTarget = await new Promise<SDK.Target.Target|null>(resolve => {
          const t = targetManager.primaryPageTarget();
          if (t) {
            resolve(t);
            return;
          }
          const observer = {
            targetAdded: (target: SDK.Target.Target) => {
              if (target === targetManager.primaryPageTarget()) {
                targetManager.unobserveTargets(observer);
                resolve(target);
              }
            },
            targetRemoved: () => {},
          };
          targetManager.observeTargets(observer);
        });
        if (!mainTarget) {
          return;
        }
        const domModel = mainTarget.model(SDK.DOMModel.DOMModel);
        if (!domModel) {
          return;
        }

        // Add listener for floaty restore events
        const overlayModel = mainTarget.model(SDK.OverlayModel.OverlayModel);
        if (overlayModel) {
          overlayModel.addEventListener(
              SDK.OverlayModel.Events.INSPECTED_ELEMENT_WINDOW_RESTORED, floaty.handleRestoreEvent, floaty);
        }

        const nodesMap =
            await domModel.pushNodesByBackendIdsToFrontend(new Set([backendNodeId as Protocol.DOM.BackendNodeId]));
        const node = nodesMap?.get(backendNodeId as Protocol.DOM.BackendNodeId) || null;
        if (node) {
          floaty.setNode(node);
        }
      }, () => {});
    } else {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const observer = {
        targetAdded: (target: SDK.Target.Target) => {
          if (target.type() === SDK.Target.Type.FRAME) {
            const overlayModel = target.model(SDK.OverlayModel.OverlayModel);
            if (overlayModel) {
              overlayModel.addEventListener(
                  SDK.OverlayModel.Events.INSPECTED_ELEMENT_WINDOW_RESTORED, floaty.handleRestoreEvent, floaty);
              overlayModel.addEventListener(
                  SDK.OverlayModel.Events.INSPECT_PANEL_SHOW_REQUESTED, floaty.handlePanelRequest);
            }
          }
        },
        targetRemoved: (target: SDK.Target.Target) => {
          if (target.type() === SDK.Target.Type.FRAME) {
            const overlayModel = target.model(SDK.OverlayModel.OverlayModel);
            if (overlayModel) {
              overlayModel.removeEventListener(
                  SDK.OverlayModel.Events.INSPECTED_ELEMENT_WINDOW_RESTORED, floaty.handleRestoreEvent, floaty);
              overlayModel.removeEventListener(
                  SDK.OverlayModel.Events.INSPECT_PANEL_SHOW_REQUESTED, floaty.handlePanelRequest);
            }
          }
        },
      };
      targetManager.observeTargets(observer);
    }
  } catch (err) {
    console.error('[GreenDev] FATAL ERROR during init():', err);
  }
}

void init();
