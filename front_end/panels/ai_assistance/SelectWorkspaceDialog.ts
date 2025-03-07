// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';

import selectWorkspaceDialogStyles from './selectWorkspaceDialog.css.js';

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Heading of dialog box which asks user to select a workspace folder.
   */
  selectFolder: 'Select folder',
  /**
   *@description Button text for canceling workspace selection.
   */
  cancel: 'Cancel',
  /**
   *@description Button text for confirming the selected workspace folder.
   */
  select: 'Select',
  /*
   *@description Explainer stating that selected folder's contents are being sent to Google.
   */
  sourceCodeSent: 'Source code from the selected folder is sent to Google to generate code suggestions'
} as const;

const lockedString = i18n.i18n.lockedString;

interface ViewInput {
  projects: Array<{
    name: string,
    path: string,
  }>;
  selectedIndex: number;
  onProjectSelected: (index: number) => void;
  onSelectButtonClick: () => void;
  onCancelButtonClick: () => void;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export class SelectWorkspaceDialog extends UI.Widget.VBox {
  #view: View;
  #workspace = Workspace.Workspace.WorkspaceImpl.instance();
  #projects: Workspace.Workspace.Project[] = [];
  #selectedIndex = 0;
  #handleProjectSelected: (project: Workspace.Workspace.Project) => void;
  #boundOnKeyDown: (event: KeyboardEvent) => void;
  #dialog: UI.Dialog.Dialog;

  constructor(
      options: {
        dialog: UI.Dialog.Dialog,
        handleProjectSelected: (project: Workspace.Workspace.Project) => void,
        currentProject?: Workspace.Workspace.Project,
      },
      view?: View) {
    super();
    this.registerRequiredCSS(selectWorkspaceDialogStyles);
    this.#boundOnKeyDown = this.#onKeyDown.bind(this);
    this.#handleProjectSelected = options.handleProjectSelected;
    this.#projects = this.#getProjects();
    this.#dialog = options.dialog;

    if (options.currentProject) {
      this.#selectedIndex = this.#projects.indexOf(options.currentProject);
    }

    // clang-format off
    this.#view = view ?? ((input, output, target) => {
      render(
        html`
          <div class="dialog-header">${lockedString(UIStringsNotTranslate.selectFolder)}</div>
          <div class="main-content">${lockedString(UIStringsNotTranslate.sourceCodeSent)}</div>
          <ul>
            ${input.projects.map((project, index) => {
              return html`
                <li
                  @click=${() => input.onProjectSelected(index)}
                  class=${index === input.selectedIndex ? 'selected' : ''}
                  title=${project.path}
                >
                  <devtools-icon class="folder-icon" .name=${'folder'}></devtools-icon>
                  ${project.name}
                </li>`;
            })}
          </ul>
          <div class="buttons">
            <devtools-button
              title=${lockedString(UIStringsNotTranslate.cancel)}
              aria-label="Cancel"
              .jslogContext=${'freestyler.new-chat'}
              @click=${input.onCancelButtonClick}
              .variant=${Buttons.Button.Variant.OUTLINED}>${lockedString(UIStringsNotTranslate.cancel)}</devtools-button>
            <devtools-button
              title=${lockedString(UIStringsNotTranslate.select)}
              class="select-button"
              aria-label="Select"
              @click=${input.onSelectButtonClick}
              .jslogContext=${'freestyler.new-chat'}
              .variant=${Buttons.Button.Variant.PRIMARY}>${lockedString(UIStringsNotTranslate.select)}</devtools-button>
          </div>
        `,
        target,
        {host: target}
      );
    }) as View;
    // clang-format on
    this.performUpdate();
  }

  override wasShown(): void {
    const document = UI.InspectorView.InspectorView.instance().element.ownerDocument;
    document.addEventListener('keydown', this.#boundOnKeyDown, true);
  }

  override willHide(): void {
    const document = UI.InspectorView.InspectorView.instance().element.ownerDocument;
    document.removeEventListener('keydown', this.#boundOnKeyDown, true);
  }

  #onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        this.#selectedIndex = Math.min(this.#selectedIndex + 1, this.#projects.length - 1);
        this.requestUpdate();
        break;
      case 'ArrowUp':
        this.#selectedIndex = Math.max(this.#selectedIndex - 1, 0);
        this.requestUpdate();
        break;
    }
  }

  override performUpdate(): void {
    const viewInput = {
      projects:
          this.#projects.map(project => ({
                               name: project.displayName(),
                               path: Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(
                                   (project?.id() || '') as Platform.DevToolsPath.UrlString),
                             })),
      selectedIndex: this.#selectedIndex,
      onProjectSelected: (index: number) => {
        this.#selectedIndex = index;
        this.requestUpdate();
      },
      onSelectButtonClick: () => {
        this.#dialog.hide();
        this.#handleProjectSelected(this.#projects[this.#selectedIndex]);
      },
      onCancelButtonClick: () => {
        this.#dialog.hide();
      }
    };

    this.#view(viewInput, undefined, this.contentElement);
  }

  #getProjects(): Workspace.Workspace.Project[] {
    return this.#workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem)
        .filter(
            project => project instanceof Persistence.FileSystemWorkspaceBinding.FileSystem &&
                project.fileSystem().type() ===
                    Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT);
  }
}
