// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../core/sdk/sdk-meta.js';
import '../../models/workspace/workspace-meta.js';
import '../../panels/sensors/sensors-meta.js';
import '../inspector_main/inspector_main-meta.js';
import '../main/main-meta.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Foundation from '../../foundation/foundation.js';
import type * as Protocol from '../../generated/protocol.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';

const {AidaClient} = Host.AidaClient;
const {ResponseType} = AiAssistance.AiAgent;
const {NodeContext, StylingAgent} = AiAssistance.StylingAgent;

class GreenDevFloaty {
  #chatContainer: HTMLDivElement;
  #textField: HTMLInputElement;
  #playButton: HTMLButtonElement;
  #node?: SDK.DOMModel.DOMNode;
  #agent?: StylingAgent;
  #nodeContext?: NodeContext;
  #backendNodeId?: Protocol.DOM.BackendNodeId;
  // Switching this to false can help while investigating tool conflicts.
  #highlightNodeOnWindowFocus = false;

  constructor(document: Document) {
    this.#chatContainer = document.getElementById('chat-container') as HTMLDivElement;
    this.#textField = document.querySelector('.green-dev-floaty-dialog-text-field') as HTMLInputElement;
    this.#playButton = document.querySelector('.green-dev-floaty-dialog-play-button') as HTMLButtonElement;

    this.#playButton.addEventListener('click', () => {
      if (this.#node) {
        void this.runConversation();
      }
    });

    if (this.#highlightNodeOnWindowFocus) {
      window.addEventListener('focus', () => {
        if (this.#node) {
          this.#node.highlight();
        }
      });
    } else {
      console.error('Node highlighting on focus disabled');
    }

    const nodeDescriptionElement =
        document.querySelector('.green-dev-floaty-dialog-node-description') as HTMLDivElement;
    nodeDescriptionElement.addEventListener('mousemove', () => {
      if (this.#node) {
        this.#node.highlight();
      }
    });
    nodeDescriptionElement.addEventListener('mouseleave', () => {
      if (this.#node && this.#backendNodeId) {
        // Refresh the anchor by re-sending the show command.
        const msg = JSON.stringify({
          id: 9999,
          method: 'Overlay.setShowInspectedElementAnchor',
          params: {inspectedElementAnchorConfig: {backendNodeId: this.#backendNodeId}}
        });
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(msg);
      }
    });

    this.#textField.addEventListener('keydown', event => {
      if (event.key === 'Enter' && this.#node) {
        void this.runConversation();
      }
    });

    this.#textField.focus();
  }

  static instance(opts: {
    forceNew: boolean|null,
    document: Document,
  } = {forceNew: null, document}): GreenDevFloaty {
    const {forceNew, document} = opts;
    if (!greenDevFloatyInstance || forceNew) {
      greenDevFloatyInstance = new GreenDevFloaty(document);
    }

    return greenDevFloatyInstance;
  }

  setNode(node: SDK.DOMModel.DOMNode): void {
    if (this.#node === node) {
      return;
    }
    this.#node = node;
    this.#backendNodeId = node.backendNodeId();

    // Highlight the node on the page.
    void node.domModel().overlayModel().clearHighlight();
    if (this.#highlightNodeOnWindowFocus) {
      node.highlight();
    }

    this.#textField.focus();

    // Reset conversation for a new node
    this.#agent = undefined;
    this.#nodeContext = undefined;

    const nodeDescriptionElement = document.querySelector('.green-dev-floaty-dialog-node-description');
    if (nodeDescriptionElement) {
      const id = node.getAttribute('id');
      if (id) {
        nodeDescriptionElement.textContent = `#${id}`;
      } else {
        const classes = node.classNames().join('.');
        nodeDescriptionElement.textContent = node.nodeName().toLowerCase() + (classes ? `.${classes}` : '');
      }
    }
  }

  #addMessage(text: string, isUser: boolean): {content: HTMLDivElement, details?: HTMLDivElement} {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    messageElement.appendChild(content);

    let details: HTMLDivElement|undefined;
    if (!isUser) {
      details = document.createElement('div');
      details.className = 'message-details';
      details.style.display = 'none';
      messageElement.appendChild(details);

      const toggle = document.createElement('div');
      toggle.className = 'message-details-toggle';
      toggle.textContent = 'Show details';
      toggle.onclick = () => {
        if (details) {
          const isHidden = details.style.display === 'none';
          details.style.display = isHidden ? 'block' : 'none';
          toggle.textContent = isHidden ? 'Hide details' : 'Show details';
        }
      };
      messageElement.appendChild(toggle);
    }

    this.#chatContainer.appendChild(messageElement);
    this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
    return {content, details};
  }

  async runConversation(): Promise<void> {
    const query = this.#textField.value || this.#textField.placeholder;
    this.#textField.value = '';

    if (!this.#node) {
      return;
    }

    if (!this.#agent) {
      const aidaClient = new AidaClient();
      this.#agent = new StylingAgent({aidaClient});
      this.#nodeContext = new NodeContext(this.#node);
    }

    this.#addMessage(query, true);
    const {content: aiContent, details: aiDetails} = this.#addMessage('Thinking...', false);

    try {
      if (!this.#nodeContext) {
        throw new Error('Node context is not set.');
      }
      for await (const result of this.#agent.run(query, {selected: this.#nodeContext})) {
        switch (result.type) {
          case ResponseType.ANSWER:
            aiContent.textContent = result.text;
            break;
          case ResponseType.ERROR:
            aiContent.textContent = `Error: '${result.error}' - Protip: to use AI features you need to be signed in.`;
            break;
          case ResponseType.THOUGHT:
            if (aiDetails) {
              const thought = document.createElement('div');
              thought.className = 'thought';
              thought.textContent = `Thought: ${result.thought}`;
              aiDetails.appendChild(thought);
            }
            break;
          case ResponseType.ACTION:
            if (aiDetails) {
              const action = document.createElement('div');
              action.className = 'action';
              action.textContent = `Action: ${result.code}\nOutput: ${result.output}`;
              aiDetails.appendChild(action);
            }
            break;
          case ResponseType.SIDE_EFFECT:
            if (aiDetails) {
              const se = document.createElement('div');
              se.className = 'side-effect';
              se.textContent = 'Side effect detected, auto-approving for Floaty...';
              aiDetails.appendChild(se);
            }
            // For Floaty, we might want to auto-approve or show a button.
            // Let's try auto-approving for now to see if it unblocks.
            result.confirm(true);
            break;
          default:
            console.error('Unhandled response type:', result.type, result);
            break;
        }
        this.#chatContainer.scrollTop = this.#chatContainer.scrollHeight;
      }
    } catch (e) {
      console.error('Caught exception in runConversation:', e);
      aiContent.textContent = `Exception: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
}

let greenDevFloatyInstance: GreenDevFloaty;

async function init(): Promise<void> {
  try {
    Root.Runtime.Runtime.setPlatform(Host.Platform.platform());
    const [config, prefs] = await Promise.all([
      new Promise<Root.Runtime.HostConfig>(resolve => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.getHostConfig(resolve);
      }),
      new Promise<Record<string, string>>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreferences(resolve)),
    ]);

    Object.assign(Root.Runtime.hostConfig, config);

    // Register necessary experiments to avoid "Unknown experiment" errors.
    Root.Runtime.experiments.register(
        Root.ExperimentNames.ExperimentName.CAPTURE_NODE_CREATION_STACKS, 'Capture node creation stacks');
    Root.Runtime.experiments.register(
        Root.ExperimentNames.ExperimentName.INSTRUMENTATION_BREAKPOINTS, 'Enable instrumentation breakpoints');
    Root.Runtime.experiments.register(
        Root.ExperimentNames.ExperimentName.USE_SOURCE_MAP_SCOPES, 'Use scope information from source maps');
    Root.Runtime.experiments.register(Root.ExperimentNames.ExperimentName.LIVE_HEAP_PROFILE, 'Live heap profile');
    Root.Runtime.experiments.register(Root.ExperimentNames.ExperimentName.PROTOCOL_MONITOR, 'Protocol Monitor');

    const WINDOW_LOCAL_STORAGE: Common.Settings.SettingsBackingStore = {
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
    };

    const hostUnsyncedStorage: Common.Settings.SettingsBackingStore = {
      register: (name: string) =>
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, {synced: false}),
      set: Host.InspectorFrontendHost.InspectorFrontendHostInstance.setPreference,
      get: (name: string) => {
        return new Promise(resolve => {
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreference(name, resolve);
        });
      },
      remove: Host.InspectorFrontendHost.InspectorFrontendHostInstance.removePreference,
      clear: Host.InspectorFrontendHost.InspectorFrontendHostInstance.clearPreferences,
    };
    const hostSyncedStorage: Common.Settings.SettingsBackingStore = {
      ...hostUnsyncedStorage,
      register: (name: string) =>
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, {synced: true}),
    };

    const syncedStorage = new Common.Settings.SettingsStorage(prefs, hostSyncedStorage, '');
    const globalStorage = new Common.Settings.SettingsStorage(prefs, hostUnsyncedStorage, '');
    const localStorage = new Common.Settings.SettingsStorage(window.localStorage, WINDOW_LOCAL_STORAGE, '');

    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
    });

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
    Root.DevToolsContext.setGlobalInstance(universe.context);

    // Register a revealer that brings the floaty to the front.
    Common.Revealer.registerRevealer({
      contextTypes() {
        return [SDK.DOMModel.DeferredDOMNode, SDK.DOMModel.DOMNode];
      },
      async loadRevealer() {
        return {
          async reveal() {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
          },
        };
      },
    });

    await i18n.i18n.fetchAndRegisterLocaleData('en-US');

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.connectionReady();

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const x = parseInt(params.get('x') || '0', 10);
    const y = parseInt(params.get('y') || '0', 10);
    const backendNodeId = parseInt(params.get('backendNodeId') || '0', 10);

    const floaty = GreenDevFloaty.instance({forceNew: null, document});

    await SDK.Connections.initMainConnection(
        async () => {
          const targetManager = SDK.TargetManager.TargetManager.instance();

          targetManager.createTarget('main', 'Main', SDK.Target.Type.FRAME, null);

          // Wait for the target to be attached and initialized.
          const mainTarget = await new Promise<SDK.Target.Target|null>((resolve, reject) => {
            const target = targetManager.primaryPageTarget();
            if (target) {
              resolve(target);
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
            setTimeout(() => reject(new Error('Timeout waiting for primary page target')), 10000);
          });

          if (!mainTarget) {
            console.error('Failed to obtain mainTarget');
            return;
          }

          const domModel = mainTarget.model(SDK.DOMModel.DOMModel);
          if (!domModel) {
            console.error('DOMModel not found on mainTarget');
            return;
          }

          let node: SDK.DOMModel.DOMNode|null = null;
          if (backendNodeId) {
            const nodesMap =
                await domModel.pushNodesByBackendIdsToFrontend(new Set([backendNodeId as Protocol.DOM.BackendNodeId]));
            node = nodesMap?.get(backendNodeId as Protocol.DOM.BackendNodeId) || null;
          } else {
            node = await domModel.nodeForLocation(x, y, true);
          }

          if (node) {
            floaty.setNode(node);
          } else {
            console.error('No node found');
          }

          // Trigger overlay.
          const showAnchor = (): void => {
            if (backendNodeId) {
              const msg = JSON.stringify({
                id: 9999,
                method: 'Overlay.setShowInspectedElementAnchor',
                params: {inspectedElementAnchorConfig: {backendNodeId}}
              });
              Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(msg);
            }
          };
          showAnchor();
        },
        () => {
          console.error('Connection lost');
        });
  } catch (err) {
    console.error('Error during init():', err);
  }
}

void init();
