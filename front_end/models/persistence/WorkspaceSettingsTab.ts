// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';
import '../../ui/components/buttons/buttons.js';
import '../../ui/components/cards/cards.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {EditFileSystemView} from './EditFileSystemView.js';
import type {FileSystem} from './FileSystemWorkspaceBinding.js';
import {IsolatedFileSystem} from './IsolatedFileSystem.js';
import {Events, IsolatedFileSystemManager} from './IsolatedFileSystemManager.js';
import {NetworkPersistenceManager} from './NetworkPersistenceManager.js';
import type {PlatformFileSystem} from './PlatformFileSystem.js';
import workspaceSettingsTabStyles from './workspaceSettingsTab.css.js';

const UIStrings = {
  /**
   * @description Text of a DOM element in Workspace Settings Tab of the Workspace settings in Settings
   */
  workspace: 'Workspace',
  /**
   * @description Text of a DOM element in Workspace Settings Tab of the Workspace settings in Settings
   */
  mappingsAreInferredAutomatically: 'Mappings are inferred automatically.',
  /**
   * @description Text of the add button in Workspace Settings Tab of the Workspace settings in Settings
   */
  addFolder: 'Add folder',
  /**
   * @description Label element text content in Workspace Settings Tab of the Workspace settings in Settings
   */
  folderExcludePattern: 'Exclude from workspace',
  /**
   * @description Label for an item to remove something
   */
  remove: 'Remove',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/persistence/WorkspaceSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface WorkspaceSettingsTabInput {
  excludePatternSetting: Common.Settings.RegExpSetting;
  fileSystems: Array<{displayName: string, fileSystem: IsolatedFileSystem}>;
  onAddClicked: () => void;
  onRemoveClicked: (fileSystem: IsolatedFileSystem) => void;
}
export type View = (input: WorkspaceSettingsTabInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${workspaceSettingsTabStyles}</style>
    <div class="settings-card-container-wrapper" jslog=${VisualLogging.pane('workspace')}>
      <div class="settings-card-container">
        <devtools-card heading=${i18nString(UIStrings.workspace)}>
          <div class="folder-exclude-pattern">
            <label for="workspace-setting-folder-exclude-pattern">${i18nString(UIStrings.folderExcludePattern)}</label>
            <input
              class="harmony-input"
              jslog=${VisualLogging.textField().track({keydown: 'Enter', change: true}).context(input.excludePatternSetting.name)}
              ${UI.SettingsUI.bindToSetting(input.excludePatternSetting)}
              id="workspace-setting-folder-exclude-pattern"></input>
          </div>
          <div class="mappings-info">${i18nString(UIStrings.mappingsAreInferredAutomatically)}</div>
        </devtools-card>
        ${input.fileSystems.map(fileSystem => html`
          <devtools-card heading=${fileSystem.displayName}>
            <devtools-icon name="folder" slot="heading-prefix"></devtools-icon>
            <div class="mapping-view-container">
              <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(EditFileSystemView, { fileSystem: fileSystem.fileSystem })}>
              </devtools-widget>
            </div>
            <devtools-button
              slot="heading-suffix"
              .variant=${Buttons.Button.Variant.OUTLINED}
              jslog=${VisualLogging.action().track({click: true}).context('settings.remove-file-system')}
              @click=${input.onRemoveClicked.bind(null, fileSystem.fileSystem)}>${i18nString(UIStrings.remove)}</devtools-button>
          </devtools-card>
        `)}
        <div class="add-button-container">
          <devtools-button
            class="add-folder"
            .variant=${Buttons.Button.Variant.OUTLINED}
            jslog=${VisualLogging.action().track({click: true}).context('sources.add-folder-to-workspace')}
            @click=${input.onAddClicked}>${i18nString(UIStrings.addFolder)}</devtools-button>
        </div>
      </div>
    </div>`, target);
  // clang-format on
};

export class WorkspaceSettingsTab extends UI.Widget.VBox {
  readonly #view: View;
  #eventListeners: Common.EventTarget.EventDescriptor[] = [];

  constructor(view: View = DEFAULT_VIEW) {
    super();
    this.#view = view;
  }

  override wasShown(): void {
    this.#eventListeners = [
      IsolatedFileSystemManager.instance().addEventListener(Events.FileSystemAdded, this.requestUpdate.bind(this)),
      IsolatedFileSystemManager.instance().addEventListener(Events.FileSystemRemoved, this.requestUpdate.bind(this)),
    ];

    this.requestUpdate();
  }

  override willHide(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.#eventListeners = [];
  }

  override performUpdate(): void {
    const input: WorkspaceSettingsTabInput = {
      excludePatternSetting: IsolatedFileSystemManager.instance().workspaceFolderExcludePatternSetting(),
      onAddClicked: () => IsolatedFileSystemManager.instance().addFileSystem(),
      onRemoveClicked: fs => IsolatedFileSystemManager.instance().removeFileSystem(fs),
      fileSystems: IsolatedFileSystemManager.instance()
                       .fileSystems()
                       .filter(fileSystem => {
                         const networkPersistenceProject = NetworkPersistenceManager.instance().project();
                         return fileSystem instanceof IsolatedFileSystem &&
                             (!networkPersistenceProject ||
                              IsolatedFileSystemManager.instance().fileSystem(
                                  (networkPersistenceProject as FileSystem).fileSystemPath()) !== fileSystem);
                       })
                       .map(fileSystem => {
                         const displayName = WorkspaceSettingsTab.#getFilename(fileSystem);
                         return {displayName, fileSystem: fileSystem as IsolatedFileSystem};
                       })
                       .sort((fs1, fs2) => fs1.displayName.localeCompare(fs2.displayName)),
    };
    this.#view(input, {}, this.contentElement);
  }

  static #getFilename(fileSystem: PlatformFileSystem): string {
    const fileSystemPath = fileSystem.path();
    const lastIndexOfSlash = fileSystemPath.lastIndexOf('/');
    const lastPathComponent = fileSystemPath.substring(lastIndexOfSlash + 1);
    return decodeURIComponent(lastPathComponent);
  }
}
