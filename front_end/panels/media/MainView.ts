// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {Events, MediaModel, type PlayerEvent} from './MediaModel.js';
import {PlayerDetailView} from './PlayerDetailView.js';
import {PlayerListView} from './PlayerListView.js';

const {repeat} = Directives;
const {widget} = UI.Widget;

export interface PlayerData {
  properties: Map<string, string>;
  messages: Protocol.Media.PlayerMessage[];
  events: PlayerEvent[];
  errors: Protocol.Media.PlayerError[];
}

export interface ViewInput {
  players: Map<string, PlayerData>;
  activePlayerId: string|null;
  onPlayerSelected: (playerID: string) => void;
  onHidePlayer: (playerID: string) => void;
  onHideOtherPlayers: (playerID: string) => void;
  onSavePlayerInfo: (playerID: string) => void;
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const hasPlayers = input.players.size > 0;
  const activePlayerData = input.activePlayerId ? input.players.get(input.activePlayerId) : undefined;
  const placeholderHeader =
      hasPlayers ? i18nString(UIStrings.noPlayerDetailsSelected) : i18nString(UIStrings.noMediaPlayer);
  const placeholderText =
      hasPlayers ? i18nString(UIStrings.selectToViewDetails) : i18nString(UIStrings.mediaPlayerDescription);
  // clang-format off
  render(html`
    <devtools-split-view direction="column"
                         name="media-panel-split-view-state"
                         sidebar-initial-size="200"
                         show=${hasPlayers ? 'both' : 'main'}>
      <devtools-widget slot="sidebar"
                       class="panel-sidebar"
                       jslog=${VisualLogging.pane('sidebar').track({resize: true})}
                       ${widget(PlayerListView, {
                         players: input.players,
                         selectedPlayerID: input.activePlayerId,
                         onSelectPlayer: input.onPlayerSelected,
                         onHidePlayer: input.onHidePlayer,
                         onHideOtherPlayers: input.onHideOtherPlayers,
                         onSavePlayerInfo: input.onSavePlayerInfo,
                       })}>
      </devtools-widget>
      ${activePlayerData && input.activePlayerId ? repeat([input.activePlayerId], id => id, () => html`
        <devtools-widget slot="main" ${widget(PlayerDetailView, {
          playerData: activePlayerData,
        })}></devtools-widget>
      `) : html`
        <devtools-widget slot="main" ${widget(UI.EmptyWidget.EmptyWidget, {
          header: placeholderHeader,
          text: placeholderText,
          link: MEDIA_PLAYER_EXPLANATION_URL,
        })}></devtools-widget>
      `}
    </devtools-split-view>
  `, target);
  // clang-format on
};

const UIStrings = {
  /**
   * @description Text to show if no media player has been selected.
   * A media player can be an audio and video source of a page.
   */
  noPlayerDetailsSelected: 'No media player selected',
  /**
   * @description Text to instruct the user on how to view media player details.
   * A media player can be an audio and video source of a page.
   */
  selectToViewDetails: 'Select a media player to inspect its details',
  /**
   * @description Text to show if no player can be shown.
   * A media player can be an audio and video source of a page.
   */
  noMediaPlayer: 'No media player',
  /**
   * @description Text to explain this panel.
   * A media player can be an audio and video source of a page.
   */
  mediaPlayerDescription: 'On this page you can view and export media player details',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/media/MainView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const MEDIA_PLAYER_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/media-panel#hide-show' as Platform.DevToolsPath.UrlString;

export interface TriggerHandler {
  onProperty(property: Protocol.Media.PlayerProperty): void;
  onError(error: Protocol.Media.PlayerError): void;
  onMessage(message: Protocol.Media.PlayerMessage): void;
  onEvent(event: PlayerEvent): void;
}

export interface TriggerDispatcher {
  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void;
  onError(playerID: string, error: Protocol.Media.PlayerError): void;
  onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void;
  onEvent(playerID: string, event: PlayerEvent): void;
}

class PlayerDataCollection implements TriggerHandler {
  private readonly properties: Map<string, string>;
  private readonly messages: Protocol.Media.PlayerMessage[];
  private readonly events: PlayerEvent[];
  private readonly errors: Protocol.Media.PlayerError[];

  constructor() {
    this.properties = new Map();
    this.messages = [];
    this.events = [];
    this.errors = [];
  }

  onProperty(property: Protocol.Media.PlayerProperty): void {
    this.properties.set(property.name, property.value);
  }

  onError(error: Protocol.Media.PlayerError): void {
    this.errors.push(error);
  }

  onMessage(message: Protocol.Media.PlayerMessage): void {
    this.messages.push(message);
  }

  onEvent(event: PlayerEvent): void {
    this.events.push(event);
  }

  export(): PlayerData {
    return {properties: this.properties, messages: this.messages, events: this.events, errors: this.errors};
  }
}

export class PlayerDataDownloadManager implements TriggerDispatcher {
  private readonly playerDataCollection: Map<string, PlayerDataCollection>;
  constructor() {
    this.playerDataCollection = new Map();
  }

  addPlayer(playerID: string): void {
    this.playerDataCollection.set(playerID, new PlayerDataCollection());
  }

  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onProperty(property);
  }

  onError(playerID: string, error: Protocol.Media.PlayerError): void {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onError(error);
  }

  onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onMessage(message);
  }

  onEvent(playerID: string, event: PlayerEvent): void {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onEvent(event);
  }

  exportPlayerData(playerID: string): PlayerData {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      throw new Error('Unable to find player');
    }

    return playerProperty.export();
  }

  deletePlayer(playerID: string): void {
    this.playerDataCollection.delete(playerID);
  }
}

export class MainView extends UI.Panel.Panel implements SDK.TargetManager.SDKModelObserver<MediaModel> {
  private deletedPlayers: Set<string>;
  private readonly downloadStore: PlayerDataDownloadManager;
  #playerData: Map<string, PlayerData>;
  #playerIdsToPlayers: Map<string, Protocol.Media.Player>;
  #domNodeIdsToPlayerIds: Map<Protocol.DOM.BackendNodeId, string>;
  #activePlayerId: string|null = null;
  readonly #view: View;
  readonly #initialPlayersLoadedPromise: Promise<void>;
  #initialPlayersLoadedPromiseResolve: () => void = () => {};
  readonly #boundRenderMainPanel = this.renderMainPanel.bind(this);
  readonly #boundMarkPlayerForDeletion = this.markPlayerForDeletion.bind(this);
  readonly #boundMarkOtherPlayersForDeletion = this.markOtherPlayersForDeletion.bind(this);
  readonly #boundExportPlayerData = this.exportPlayerData.bind(this);

  constructor(downloadStore: PlayerDataDownloadManager = new PlayerDataDownloadManager(), view: View = DEFAULT_VIEW) {
    super('media');
    this.#view = view;
    this.#playerData = new Map();
    this.#playerIdsToPlayers = new Map();
    this.#domNodeIdsToPlayerIds = new Map();
    this.#initialPlayersLoadedPromise = new Promise(resolve => {
      this.#initialPlayersLoadedPromiseResolve = resolve;
    });

    this.deletedPlayers = new Set();

    this.downloadStore = downloadStore;
    this.requestUpdate();

    SDK.TargetManager.TargetManager.instance().observeModels(MediaModel, this, {scoped: true});
  }

  override performUpdate(): void {
    const input: ViewInput = {
      players: new Map(this.#playerData),
      activePlayerId: this.#activePlayerId,
      onPlayerSelected: this.#boundRenderMainPanel,
      onHidePlayer: this.#boundMarkPlayerForDeletion,
      onHideOtherPlayers: this.#boundMarkOtherPlayersForDeletion,
      onSavePlayerInfo: this.#boundExportPlayerData,
    };
    this.#view(input, undefined, this.contentElement);
  }

  renderMainPanel(playerID: string): void {
    if (!this.#playerData.has(playerID) || this.#activePlayerId === playerID) {
      return;
    }
    this.#activePlayerId = playerID;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    for (const model of SDK.TargetManager.TargetManager.instance().models(MediaModel, {scoped: true})) {
      this.addEventListeners(model);
    }
  }

  override willHide(): void {
    super.willHide();
    for (const model of SDK.TargetManager.TargetManager.instance().models(MediaModel, {scoped: true})) {
      this.removeEventListeners(model);
    }
  }

  modelAdded(model: MediaModel): void {
    if (this.isShowing()) {
      this.addEventListeners(model);
    }
  }

  modelRemoved(model: MediaModel): void {
    this.removeEventListeners(model);
  }

  private addEventListeners(mediaModel: MediaModel): void {
    mediaModel.ensureEnabled();
    mediaModel.addEventListener(Events.PLAYER_PROPERTIES_CHANGED, this.propertiesChanged, this);
    mediaModel.addEventListener(Events.PLAYER_EVENTS_ADDED, this.eventsAdded, this);
    mediaModel.addEventListener(Events.PLAYER_MESSAGES_LOGGED, this.messagesLogged, this);
    mediaModel.addEventListener(Events.PLAYER_ERRORS_RAISED, this.errorsRaised, this);
    mediaModel.addEventListener(Events.PLAYER_CREATED, this.playerCreated, this);
  }

  private removeEventListeners(mediaModel: MediaModel): void {
    mediaModel.removeEventListener(Events.PLAYER_PROPERTIES_CHANGED, this.propertiesChanged, this);
    mediaModel.removeEventListener(Events.PLAYER_EVENTS_ADDED, this.eventsAdded, this);
    mediaModel.removeEventListener(Events.PLAYER_MESSAGES_LOGGED, this.messagesLogged, this);
    mediaModel.removeEventListener(Events.PLAYER_ERRORS_RAISED, this.errorsRaised, this);
    mediaModel.removeEventListener(Events.PLAYER_CREATED, this.playerCreated, this);
  }

  private propertiesChanged(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerPropertiesChangedEvent>):
      void {
    for (const property of event.data.properties) {
      this.onProperty(event.data.playerId, property);
    }
  }

  private eventsAdded(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerEventsAddedEvent>): void {
    for (const ev of event.data.events) {
      // TODO(crbug.com/1228674): The conversion from Protocol.Media.PlayerEvent to PlayerEvent happens implicitly
      // by augmenting the protocol type with some additional property in various places. This needs to be cleaned up
      // in a conversion function that takes the protocol type and produces the PlayerEvent type.
      this.onEvent(event.data.playerId, ev as PlayerEvent);
    }
  }

  private messagesLogged(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerMessagesLoggedEvent>): void {
    for (const message of event.data.messages) {
      this.onMessage(event.data.playerId, message);
    }
  }

  private errorsRaised(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerErrorsRaisedEvent>): void {
    for (const error of event.data.errors) {
      this.onError(event.data.playerId, error);
    }
  }

  private shouldPropagate(playerID: string): boolean {
    return !this.deletedPlayers.has(playerID) && this.#playerData.has(playerID);
  }

  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.downloadStore.onProperty(playerID, property);
    const data = this.#playerData.get(playerID);
    if (data) {
      data.properties.set(property.name, property.value);
      this.#playerData.set(playerID, {...data});
      this.requestUpdate();
    }
  }

  onError(playerID: string, error: Protocol.Media.PlayerError): void {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.downloadStore.onError(playerID, error);
    const data = this.#playerData.get(playerID);
    if (data) {
      data.errors.push(error);
      this.#playerData.set(playerID, {...data});
      this.requestUpdate();
    }
  }

  onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.downloadStore.onMessage(playerID, message);
    const data = this.#playerData.get(playerID);
    if (data) {
      data.messages.push(message);
      this.#playerData.set(playerID, {...data});
      this.requestUpdate();
    }
  }

  onEvent(playerID: string, event: PlayerEvent): void {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.downloadStore.onEvent(playerID, event);
    const data = this.#playerData.get(playerID);
    if (data) {
      data.events.push(event);
      this.#playerData.set(playerID, {...data});
      this.requestUpdate();
    }
  }

  selectPlayerByDOMNodeId(domNodeId: Protocol.DOM.BackendNodeId): void {
    const playerId = this.#domNodeIdsToPlayerIds.get(domNodeId);
    if (!playerId) {
      return;
    }
    const player = this.#playerIdsToPlayers.get(playerId);
    if (player) {
      this.renderMainPanel(player.playerId);
    }
  }

  waitForInitialPlayers(): Promise<void> {
    return this.#initialPlayersLoadedPromise;
  }

  private playerCreated(event: Common.EventTarget.EventTargetEvent<Protocol.Media.Player>): void {
    const player = event.data;
    this.#playerIdsToPlayers.set(player.playerId, player);
    if (player.domNodeId) {
      this.#domNodeIdsToPlayerIds.set(player.domNodeId, player.playerId);
    }

    this.#playerData.set(player.playerId, {
      properties: new Map(),
      messages: [],
      events: [],
      errors: [],
    });
    this.downloadStore.addPlayer(player.playerId);
    this.requestUpdate();

    this.#initialPlayersLoadedPromiseResolve();
  }

  markPlayerForDeletion(playerID: string): void {
    // TODO(tmathmeyer): send this to chromium to save the storage space there too.
    this.deletedPlayers.add(playerID);
    this.#playerData.delete(playerID);
    const player = this.#playerIdsToPlayers.get(playerID);
    if (player?.domNodeId) {
      this.#domNodeIdsToPlayerIds.delete(player.domNodeId);
    }
    this.#playerIdsToPlayers.delete(playerID);
    this.downloadStore.deletePlayer(playerID);
    if (this.#activePlayerId === playerID) {
      this.#activePlayerId = null;
    }
    this.requestUpdate();
  }

  markOtherPlayersForDeletion(playerID: string): void {
    for (const keyID of this.#playerData.keys()) {
      if (keyID !== playerID) {
        this.markPlayerForDeletion(keyID);
      }
    }
  }

  exportPlayerData(playerID: string): void {
    const dump = this.downloadStore.exportPlayerData(playerID);
    const uriContent = 'data:application/octet-stream,' + encodeURIComponent(JSON.stringify(dump, null, 2));
    /* eslint-disable-next-line @devtools/no-imperative-dom-api */
    const anchor = document.createElement('a');
    anchor.href = uriContent;
    anchor.download = playerID + '.json';
    anchor.click();
  }
}
