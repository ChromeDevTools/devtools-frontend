// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const main = document.querySelector('main');
const mainContainer = document.querySelector('.main-container');
const goldenImageContainer = mainContainer.querySelector('.golden .image-container');
const generatedImageContainer = mainContainer.querySelector('.generated .image-container');
const status = document.querySelector('.status');
const file = document.querySelector('.file');
const percentage = document.querySelector('.percentage');
const diffImageContainer = document.querySelector('.diff');
const testSkip = document.querySelector('.test-skip');
const testConfirm = document.querySelector('.test-confirm');

const choiceMarker = document.createElement('div');
choiceMarker.classList.add('choice');

const leftImage = new Image();
const rightImage = new Image();
const diffImage = new Image();

let listening = false;
function setState({type, msg, left, right, diff, rawMisMatchPercentage, fileName}) {
  switch (type) {
    case 'status':
      listening = false;
      document.body.appendChild(status);
      status.textContent = msg;
      mainContainer.remove();
      disableButtons();
      break;

    case 'outcome':
      main.appendChild(mainContainer);
      status.remove();
      choiceMarker.remove();

      file.textContent = fileName;
      percentage.textContent = `${rawMisMatchPercentage}%`;

      // Golden.
      leftImage.src = left;
      goldenImageContainer.appendChild(leftImage);

      // Generated.
      rightImage.src = right;
      generatedImageContainer.appendChild(rightImage);

      // Diff.
      diffImage.src = diff;
      diffImageContainer.appendChild(diffImage);
      diffImage.onerror = () => {
        diffImage.src = './no-diff-available.png';
        diffImage.onerror = null;
      };

      listening = true;
      enableSkipButton();
      break;
  }
}

function makeChoice(which) {
  choiceMarker.dataset.choice = which;
  leftImage.classList.toggle('selected', which === 'golden');
  rightImage.classList.toggle('selected', which === 'generated');
  enableConfirmButton();
}

function commitChoice() {
  document.body.appendChild(choiceMarker);
  setWaiting();
}

function setWaiting() {
  setState({type: 'status', msg: 'Waiting...'});
}

function enableSkipButton() {
  testSkip.disabled = false;
}

function enableConfirmButton() {
  testConfirm.disabled = false;
}

function disableButtons() {
  testSkip.disabled = true;
  testConfirm.disabled = true;
}

function commitSkip() {
  makeChoice('skip');
  commitChoice();
}

function commitChoiceIfPossible() {
  if (!choiceMarker.dataset.choice) {
    return;
  }
  commitChoice();
}

window.addEventListener('keyup', evt => {
  if (!listening) {
    return;
  }

  switch (evt.key) {
    case 'ArrowLeft':
      makeChoice('golden');
      return;

    case 'ArrowRight':
      makeChoice('generated');
      return;

    case 'd':
      diffImageContainer.classList.toggle('visible');
      return;

    case 's':
      commitSkip();
      return;

    case 'Enter':
      commitChoiceIfPossible();
      return;
  }
});

leftImage.addEventListener('click', () => makeChoice('golden'));
rightImage.addEventListener('click', () => makeChoice('generated'));
testSkip.addEventListener('click', () => commitSkip());
testConfirm.addEventListener('click', () => commitChoiceIfPossible());

setWaiting();
