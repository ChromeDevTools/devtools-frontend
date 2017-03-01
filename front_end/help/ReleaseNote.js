// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Help.ReleaseNoteView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('help/releaseNote.css');
    var releaseNoteElement = this._createReleaseNoteElement(Help.latestReleaseNote());
    this.contentElement.appendChild(releaseNoteElement);
  }

  /**
   * @param {!Help.ReleaseNote} releaseNote
   * @return {!Element}
   */
  _createReleaseNoteElement(releaseNote) {
    var container = createElementWithClass('div', 'release-note-container');
    var contentContainer = container.createChild('div', 'release-note-content-container');
    var textContainer = contentContainer.createChild('div', 'release-note-text-container');
    textContainer.createChild('div', 'release-note-update-text')
        .createTextChild(Common.UIString('Chrome has been updated to version %d. ', releaseNote.version));
    textContainer.createChild('div').createTextChild(Common.UIString(`Here's what's new in DevTools:`));
    var highlightContainer = textContainer.createChild('ul', 'release-note-highlight-container');
    for (var highlight of releaseNote.highlights) {
      var listItem = highlightContainer.createChild('li');
      for (var content of highlight.contents) {
        if (content.link) {
          var className = highlight.featured ? 'release-note-featured-link' : 'release-note-link';
          listItem.appendChild(UI.createExternalLink(content.link, content.text + ' ', className));
        } else {
          listItem.createTextChild(content.text + ' ');
        }
      }
    }

    var actionContainer = container.createChild('div', 'release-note-action-container');
    var viewMoreButton = UI.createTextButton(Common.UIString('Learn more'), event => {
      event.consume(true);
      InspectorFrontendHost.openInNewTab(releaseNote.link);
    });
    actionContainer.appendChild(viewMoreButton);

    var closeButton = UI.createTextButton(Common.UIString('Close'), event => {
      event.consume(true);
      UI.inspectorView.closeDrawerTab(Help._releaseNoteViewId, true);
    }, 'close-release-note');
    actionContainer.appendChild(closeButton);

    var imageLink = UI.createExternalLink(releaseNote.link, ' ');
    contentContainer.appendChild(imageLink);
    var image = imageLink.createChild('img', 'release-note-image');
    image.src = releaseNote.image.src;
    image.addEventListener('mouseover', e => container.classList.add('image-hover'));
    image.addEventListener('mouseout', e => container.classList.remove('image-hover'));
    return container;
  }
};
