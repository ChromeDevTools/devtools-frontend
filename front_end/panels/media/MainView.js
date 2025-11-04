// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { MediaModel } from './MediaModel.js';
import { PlayerDetailView } from './PlayerDetailView.js';
import { PlayerListView } from './PlayerListView.js';
const UIStrings = {
    /**
     * @description Text to show if no media player has been selected
     * A media player can be an audio and video source of a page.
     */
    noPlayerDetailsSelected: 'No media player selected',
    /**
     * @description Text to instruct the user on how to view media player details
     * A media player can be an audio and video source of a page.
     */
    selectToViewDetails: 'Select a media player to inspect its details.',
    /**
     * @description Text to show if no player can be shown
     * A media player can be an audio and video source of a page.
     */
    noMediaPlayer: 'No media player',
    /**
     * @description Text to explain this panel
     * A media player can be an audio and video source of a page.
     */
    mediaPlayerDescription: 'On this page you can view and export media player details.',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/MainView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const MEDIA_PLAYER_EXPLANATION_URL = 'https://developer.chrome.com/docs/devtools/media-panel#hide-show';
class PlayerDataCollection {
    properties;
    messages;
    events;
    errors;
    constructor() {
        this.properties = new Map();
        this.messages = [];
        this.events = [];
        this.errors = [];
    }
    onProperty(property) {
        this.properties.set(property.name, property.value);
    }
    onError(error) {
        this.errors.push(error);
    }
    onMessage(message) {
        this.messages.push(message);
    }
    onEvent(event) {
        this.events.push(event);
    }
    export() {
        return { properties: this.properties, messages: this.messages, events: this.events, errors: this.errors };
    }
}
export class PlayerDataDownloadManager {
    playerDataCollection;
    constructor() {
        this.playerDataCollection = new Map();
    }
    addPlayer(playerID) {
        this.playerDataCollection.set(playerID, new PlayerDataCollection());
    }
    onProperty(playerID, property) {
        const playerProperty = this.playerDataCollection.get(playerID);
        if (!playerProperty) {
            return;
        }
        playerProperty.onProperty(property);
    }
    onError(playerID, error) {
        const playerProperty = this.playerDataCollection.get(playerID);
        if (!playerProperty) {
            return;
        }
        playerProperty.onError(error);
    }
    onMessage(playerID, message) {
        const playerProperty = this.playerDataCollection.get(playerID);
        if (!playerProperty) {
            return;
        }
        playerProperty.onMessage(message);
    }
    onEvent(playerID, event) {
        const playerProperty = this.playerDataCollection.get(playerID);
        if (!playerProperty) {
            return;
        }
        playerProperty.onEvent(event);
    }
    exportPlayerData(playerID) {
        const playerProperty = this.playerDataCollection.get(playerID);
        if (!playerProperty) {
            throw new Error('Unable to find player');
        }
        return playerProperty.export();
    }
    deletePlayer(playerID) {
        this.playerDataCollection.delete(playerID);
    }
}
export class MainView extends UI.Panel.PanelWithSidebar {
    detailPanels;
    deletedPlayers;
    downloadStore;
    sidebar;
    #playerIdsToPlayers;
    #domNodeIdsToPlayerIds;
    #placeholder;
    #initialPlayersLoadedPromise;
    #initialPlayersLoadedPromiseResolve = () => { };
    constructor(downloadStore = new PlayerDataDownloadManager()) {
        super('media');
        this.detailPanels = new Map();
        this.#playerIdsToPlayers = new Map();
        this.#domNodeIdsToPlayerIds = new Map();
        this.#initialPlayersLoadedPromise = new Promise(resolve => {
            this.#initialPlayersLoadedPromiseResolve = resolve;
        });
        this.deletedPlayers = new Set();
        this.downloadStore = downloadStore;
        this.sidebar = new PlayerListView(this);
        this.sidebar.show(this.panelSidebarElement());
        this.splitWidget().hideSidebar();
        this.#placeholder =
            new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMediaPlayer), UIStrings.mediaPlayerDescription);
        this.#placeholder.show(this.mainElement());
        this.#placeholder.link = MEDIA_PLAYER_EXPLANATION_URL;
        SDK.TargetManager.TargetManager.instance().observeModels(MediaModel, this, { scoped: true });
    }
    renderMainPanel(playerID) {
        if (!this.detailPanels.has(playerID)) {
            return;
        }
        const mainWidget = this.splitWidget().mainWidget();
        if (mainWidget) {
            mainWidget.detachChildWidgets();
        }
        this.detailPanels.get(playerID)?.show(this.mainElement());
    }
    wasShown() {
        super.wasShown();
        for (const model of SDK.TargetManager.TargetManager.instance().models(MediaModel, { scoped: true })) {
            this.addEventListeners(model);
        }
    }
    willHide() {
        super.willHide();
        for (const model of SDK.TargetManager.TargetManager.instance().models(MediaModel, { scoped: true })) {
            this.removeEventListeners(model);
        }
    }
    modelAdded(model) {
        if (this.isShowing()) {
            this.addEventListeners(model);
        }
    }
    modelRemoved(model) {
        this.removeEventListeners(model);
    }
    addEventListeners(mediaModel) {
        mediaModel.ensureEnabled();
        mediaModel.addEventListener("PlayerPropertiesChanged" /* Events.PLAYER_PROPERTIES_CHANGED */, this.propertiesChanged, this);
        mediaModel.addEventListener("PlayerEventsAdded" /* Events.PLAYER_EVENTS_ADDED */, this.eventsAdded, this);
        mediaModel.addEventListener("PlayerMessagesLogged" /* Events.PLAYER_MESSAGES_LOGGED */, this.messagesLogged, this);
        mediaModel.addEventListener("PlayerErrorsRaised" /* Events.PLAYER_ERRORS_RAISED */, this.errorsRaised, this);
        mediaModel.addEventListener("PlayerCreated" /* Events.PLAYER_CREATED */, this.playerCreated, this);
    }
    removeEventListeners(mediaModel) {
        mediaModel.removeEventListener("PlayerPropertiesChanged" /* Events.PLAYER_PROPERTIES_CHANGED */, this.propertiesChanged, this);
        mediaModel.removeEventListener("PlayerEventsAdded" /* Events.PLAYER_EVENTS_ADDED */, this.eventsAdded, this);
        mediaModel.removeEventListener("PlayerMessagesLogged" /* Events.PLAYER_MESSAGES_LOGGED */, this.messagesLogged, this);
        mediaModel.removeEventListener("PlayerErrorsRaised" /* Events.PLAYER_ERRORS_RAISED */, this.errorsRaised, this);
        mediaModel.removeEventListener("PlayerCreated" /* Events.PLAYER_CREATED */, this.playerCreated, this);
    }
    propertiesChanged(event) {
        for (const property of event.data.properties) {
            this.onProperty(event.data.playerId, property);
        }
    }
    eventsAdded(event) {
        for (const ev of event.data.events) {
            // TODO(crbug.com/1228674): The conversion from Protocol.Media.PlayerEvent to PlayerEvent happens implicitly
            // by augmenting the protocol type with some additional property in various places. This needs to be cleaned up
            // in a conversion function that takes the protocol type and produces the PlayerEvent type.
            this.onEvent(event.data.playerId, ev);
        }
    }
    messagesLogged(event) {
        for (const message of event.data.messages) {
            this.onMessage(event.data.playerId, message);
        }
    }
    errorsRaised(event) {
        for (const error of event.data.errors) {
            this.onError(event.data.playerId, error);
        }
    }
    shouldPropagate(playerID) {
        return !this.deletedPlayers.has(playerID) && this.detailPanels.has(playerID);
    }
    onProperty(playerID, property) {
        if (!this.shouldPropagate(playerID)) {
            return;
        }
        this.sidebar.onProperty(playerID, property);
        this.downloadStore.onProperty(playerID, property);
        this.detailPanels.get(playerID)?.onProperty(property);
    }
    onError(playerID, error) {
        if (!this.shouldPropagate(playerID)) {
            return;
        }
        this.sidebar.onError(playerID, error);
        this.downloadStore.onError(playerID, error);
        this.detailPanels.get(playerID)?.onError(error);
    }
    onMessage(playerID, message) {
        if (!this.shouldPropagate(playerID)) {
            return;
        }
        this.sidebar.onMessage(playerID, message);
        this.downloadStore.onMessage(playerID, message);
        this.detailPanels.get(playerID)?.onMessage(message);
    }
    onEvent(playerID, event) {
        if (!this.shouldPropagate(playerID)) {
            return;
        }
        this.sidebar.onEvent(playerID, event);
        this.downloadStore.onEvent(playerID, event);
        this.detailPanels.get(playerID)?.onEvent(event);
    }
    selectPlayerByDOMNodeId(domNodeId) {
        const playerId = this.#domNodeIdsToPlayerIds.get(domNodeId);
        if (!playerId) {
            return;
        }
        const player = this.#playerIdsToPlayers.get(playerId);
        if (player) {
            this.sidebar.selectPlayerById(player.playerId);
        }
    }
    waitForInitialPlayers() {
        return this.#initialPlayersLoadedPromise;
    }
    playerCreated(event) {
        const player = event.data;
        this.#playerIdsToPlayers.set(player.playerId, player);
        if (player.domNodeId) {
            this.#domNodeIdsToPlayerIds.set(player.domNodeId, player.playerId);
        }
        if (this.splitWidget().showMode() !== "Both" /* UI.SplitWidget.ShowMode.BOTH */) {
            this.splitWidget().showBoth();
        }
        this.sidebar.addMediaElementItem(player.playerId);
        this.detailPanels.set(player.playerId, new PlayerDetailView());
        this.downloadStore.addPlayer(player.playerId);
        if (this.detailPanels.size === 1) {
            this.#placeholder.header = i18nString(UIStrings.noPlayerDetailsSelected);
            this.#placeholder.text = i18nString(UIStrings.selectToViewDetails);
        }
        this.#initialPlayersLoadedPromiseResolve();
    }
    markPlayerForDeletion(playerID) {
        // TODO(tmathmeyer): send this to chromium to save the storage space there too.
        this.deletedPlayers.add(playerID);
        this.detailPanels.delete(playerID);
        const player = this.#playerIdsToPlayers.get(playerID);
        if (player?.domNodeId) {
            this.#domNodeIdsToPlayerIds.delete(player.domNodeId);
        }
        this.#playerIdsToPlayers.delete(playerID);
        this.sidebar.deletePlayer(playerID);
        this.downloadStore.deletePlayer(playerID);
        if (this.detailPanels.size === 0) {
            this.#placeholder.header = i18nString(UIStrings.noMediaPlayer);
            this.#placeholder.text = i18nString(UIStrings.mediaPlayerDescription);
            this.splitWidget().hideSidebar();
            const mainWidget = this.splitWidget().mainWidget();
            if (mainWidget) {
                mainWidget.detachChildWidgets();
            }
            this.#placeholder.show(this.mainElement());
        }
    }
    markOtherPlayersForDeletion(playerID) {
        for (const keyID of this.detailPanels.keys()) {
            if (keyID !== playerID) {
                this.markPlayerForDeletion(keyID);
            }
        }
    }
    exportPlayerData(playerID) {
        const dump = this.downloadStore.exportPlayerData(playerID);
        const uriContent = 'data:application/octet-stream,' + encodeURIComponent(JSON.stringify(dump, null, 2));
        const anchor = document.createElement('a');
        anchor.href = uriContent;
        anchor.download = playerID + '.json';
        anchor.click();
    }
}
//# sourceMappingURL=MainView.js.map