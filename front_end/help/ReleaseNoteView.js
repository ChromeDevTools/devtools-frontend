// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {latestReleaseNote, releaseNoteViewId} from './HelpImpl.js';

export class ReleaseNoteView extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('help/releaseNote.css');
    const releaseNoteElement = this._createReleaseNoteElement(latestReleaseNote());
    const topSection = this.contentElement.createChild('div', 'release-note-top-section');
    topSection.textContent = ls`${latestReleaseNote().header}`;
    this.contentElement.appendChild(releaseNoteElement);
  }

  /**
   * @param {!Help.ReleaseNote} releaseNote
   * @return {!Element}
   */
  _createReleaseNoteElement(releaseNote) {
    const hbox = createElementWithClass('div', 'hbox');
    const container = hbox.createChild('div', 'release-note-container');
    const contentContainer = container.createChild('ul');
    UI.ARIAUtils.setAccessibleName(contentContainer, ls`${latestReleaseNote().header}`);

    let linkNumber = 1;
    for (const highlight of releaseNote.highlights) {
      const listItem = contentContainer.createChild('li');
      const linkWrapper = UI.XLink.create(highlight.link, '', 'release-note-link');
      linkWrapper.textContent = '';
      UI.ARIAUtils.markAsLink(linkWrapper);
      UI.ARIAUtils.setAccessibleName(
          linkWrapper, `${highlight.title}: ${highlight.subtitle} ${linkNumber} of ${releaseNote.highlights.length}`);

      const title = linkWrapper.createChild('div', 'release-note-title');
      title.textContent = highlight.title;

      const subtitle = linkWrapper.createChild('div', 'release-note-subtitle');
      subtitle.textContent = highlight.subtitle;

      listItem.appendChild(linkWrapper);
      linkNumber++;
    }

    const actionContainer = container.createChild('div', 'release-note-action-container');
    const learnMore = UI.createTextButton(ls`Learn more`, event => {
      event.consume(true);
      Host.InspectorFrontendHost.openInNewTab(releaseNote.link);
    });
    UI.ARIAUtils.markAsLink(learnMore);
    actionContainer.appendChild(learnMore);

    actionContainer.appendChild(UI.createTextButton(ls`Close`, event => {
      event.consume(true);
      self.UI.inspectorView.closeDrawerTab(releaseNoteViewId, true);
    }, 'close-release-note'));

    const imageLink = UI.XLink.create(releaseNote.link, ' ');
    imageLink.classList.add('release-note-image');
    imageLink.title = ls`${latestReleaseNote().header}`;

    hbox.appendChild(imageLink);
    const image = imageLink.createChild('img');
    image.src = 'Images/whatsnew.png';
    image.title = imageLink.title;
    image.alt = image.title;

    return hbox;
  }
}
