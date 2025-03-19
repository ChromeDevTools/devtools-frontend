// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';

import selectWorkspaceDialogStyles from './selectWorkspaceDialog.css.js';

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Heading of dialog box which asks user to select a workspace folder.
   */
  selectFolder: 'Select project root folder',
  /**
   *@description Button text for canceling workspace selection.
   */
  cancel: 'Cancel',
  /**
   *@description Button text for confirming the selected workspace folder.
   */
  select: 'Select',
  /*
   *@description Button text for adding a workspace folder.
   */
  addFolder: 'Add folder',
  /*
   *@description Explanation for selecting the correct workspace folder.
   */
  selectProjectRoot:
      'To save patches directly to your project, select the project root folder containing the source files of the inspected page.',
  /*
   *@description Explainer stating that selected folder's contents are being sent to Google.
   */
  sourceCodeSent: 'Relevant code snippets will be sent to Google to generate code suggestions.'
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
  onAddFolderButtonClick: () => void;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export class SelectWorkspaceDialog extends UI.Widget.VBox {
  #view: View;
  #workspace = Workspace.Workspace.WorkspaceImpl.instance();
  #projects: Workspace.Workspace.Project[] = [];
  #selectedIndex = 0;
  #onProjectSelected: (project: Workspace.Workspace.Project) => void;
  #boundOnKeyDown: (event: KeyboardEvent) => void;
  #dialog: UI.Dialog.Dialog;

  constructor(
      options: {
        dialog: UI.Dialog.Dialog,
        onProjectSelected: (project: Workspace.Workspace.Project) => void,
        currentProject?: Workspace.Workspace.Project,
      },
      view?: View) {
    super();
    this.element.classList.add('dialog-container');
    this.registerRequiredCSS(selectWorkspaceDialogStyles);
    this.#boundOnKeyDown = this.#onKeyDown.bind(this);
    this.#onProjectSelected = options.onProjectSelected;
    this.#projects = this.#getProjects();
    this.#dialog = options.dialog;

    if (options.currentProject) {
      this.#selectedIndex = this.#projects.indexOf(options.currentProject);
    }

    // clang-format off
    this.#view = view ?? ((input, output, target) => {
      const hasProjects = input.projects.length > 0;
      render(
        html`
          <div class="dialog-header">${lockedString(UIStringsNotTranslate.selectFolder)}</div>
          <div class="main-content">
            <div class="select-project-root">${lockedString(UIStringsNotTranslate.selectProjectRoot)}</div>
            <div>${lockedString(UIStringsNotTranslate.sourceCodeSent)}</div>
          </div>
          ${input.projects.length > 0 ? html`
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
          ` : nothing}
          <div class="buttons">
            <devtools-button
              title=${lockedString(UIStringsNotTranslate.cancel)}
              aria-label="Cancel"
              .jslogContext=${'cancel'}
              @click=${input.onCancelButtonClick}
              .variant=${Buttons.Button.Variant.OUTLINED}>${lockedString(UIStringsNotTranslate.cancel)}</devtools-button>
            <devtools-button
              class="add-folder-button"
              title=${lockedString(UIStringsNotTranslate.addFolder)}
              aria-label="Add folder"
              .iconName=${'plus'}
              .jslogContext=${'add-folder'}
              @click=${input.onAddFolderButtonClick}
              .variant=${hasProjects ? Buttons.Button.Variant.TONAL : Buttons.Button.Variant.PRIMARY}>${lockedString(UIStringsNotTranslate.addFolder)}</devtools-button>
            ${hasProjects ? html`
              <devtools-button
                title=${lockedString(UIStringsNotTranslate.select)}
                aria-label="Select"
                @click=${input.onSelectButtonClick}
                .jslogContext=${'select'}
                .variant=${Buttons.Button.Variant.PRIMARY}>${lockedString(UIStringsNotTranslate.select)}</devtools-button>
            ` : nothing}
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
    this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
  }

  override willHide(): void {
    const document = UI.InspectorView.InspectorView.instance().element.ownerDocument;
    document.removeEventListener('keydown', this.#boundOnKeyDown, true);
    this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
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
        this.#onProjectSelected(this.#projects[this.#selectedIndex]);
      },
      onCancelButtonClick: () => {
        this.#dialog.hide();
      },
      onAddFolderButtonClick: () => {
        void Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
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

  #onProjectAdded(event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.Project>): void {
    const addedProject = event.data;
    this.#projects = this.#getProjects();
    const projectIndex = this.#projects.indexOf(addedProject);
    if (projectIndex !== -1) {
      this.#selectedIndex = projectIndex;
    }
    this.requestUpdate();
  }

  static show(
      onProjectSelected: (project: Workspace.Workspace.Project) => void,
      currentProject?: Workspace.Workspace.Project): void {
    const dialog = new UI.Dialog.Dialog('select-workspace');
    dialog.setMaxContentSize(new UI.Geometry.Size(384, 340));
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT);
    dialog.setDimmed(true);

    new SelectWorkspaceDialog({dialog, onProjectSelected, currentProject}).show(dialog.contentElement);
    dialog.show();
  }
}
