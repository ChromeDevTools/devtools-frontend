var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/perf_ui/BrickBreaker.js
var BrickBreaker_exports = {};
__export(BrickBreaker_exports, {
  BrickBreaker: () => BrickBreaker
});
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as UI from "./../../legacy.js";
import * as ThemeSupport from "./../../theme_support/theme_support.js";
var UIStrings = {
  /**
   * @description Message congratulating the user for having won a game.
   */
  congrats: "Congrats, you win!",
  /**
   * @description A Postscript hinting the user the possibility to open the game using a keycombo.
   */
  ps: "PS: You can also open the game by typing `fixme`"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/perf_ui/BrickBreaker.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var MAX_DELTA = 16;
var MIN_DELTA = 10;
var MAX_PADDLE_LENGTH = 150;
var MIN_PADDLE_LENGTH = 85;
var PADDLE_HEIGHT = 15;
var BALL_RADIUS = 10;
var colorPallettes = [
  // blues
  {
    light: "rgb(224,240,255)",
    mediumLighter: "rgb(176,208,255)",
    mediumDarker: "rgb(112,160,221)",
    dark: "rgb(0,92,153)"
  },
  // pinks
  {
    light: "rgb(253, 216, 229)",
    mediumLighter: "rgb(250, 157, 188)",
    mediumDarker: "rgb(249, 98, 154)",
    dark: "rgb(254, 5, 105)"
  },
  // pastel pinks
  {
    light: "rgb(254, 234, 234)",
    mediumLighter: "rgb(255, 216, 216)",
    mediumDarker: "rgb(255, 195, 195)",
    dark: "rgb(235, 125, 138)"
  },
  // purples
  {
    light: "rgb(226,183,206)",
    mediumLighter: "rgb(219,124,165)",
    mediumDarker: "rgb(146,60,129)",
    dark: "rgb(186, 85, 255)"
  },
  // greens
  {
    light: "rgb(206,255,206)",
    mediumLighter: "rgb(128,255,128)",
    mediumDarker: "rgb(0,246,0)",
    dark: "rgb(0,187,0)"
  },
  // reds
  {
    light: "rgb(255, 188, 181)",
    mediumLighter: "rgb(254, 170, 170)",
    mediumDarker: "rgb(215, 59, 43)",
    dark: "rgb(187, 37, 23)"
  },
  // aqua
  {
    light: "rgb(236, 254, 250)",
    mediumLighter: "rgb(204, 255, 245)",
    mediumDarker: "rgb(164, 240, 233)",
    dark: "rgb(72,189,144)"
  },
  // yellow/pink
  {
    light: "rgb(255, 225, 185)",
    mediumLighter: "rgb(255, 204, 141)",
    mediumDarker: "rgb(240, 140, 115)",
    dark: "rgb(211, 96, 117)"
  },
  // ocean breeze
  {
    light: "rgb(218, 255, 248)",
    mediumLighter: "rgb(177, 235, 236)",
    mediumDarker: "rgb(112, 214, 214)",
    dark: "rgb(34, 205, 181)"
  }
];
var BrickBreaker = class extends HTMLElement {
  timelineFlameChart;
  #canvas;
  #ctx;
  #helperCanvas;
  #helperCanvasCtx;
  #scorePanel;
  #trackTimelineOffset = 0;
  #visibleEntries = /* @__PURE__ */ new Set();
  #brokenBricks = /* @__PURE__ */ new Map();
  #keyDownHandlerBound = this.#keyDownHandler.bind(this);
  #keyUpHandlerBound = this.#keyUpHandler.bind(this);
  #keyPressHandlerBound = this.#keyPressHandler.bind(this);
  #closeGameBound = this.#closeGame.bind(this);
  #mouseMoveHandlerBound = this.#mouseMoveHandler.bind(this);
  #boundingElement = UI.UIUtils.getDevToolsBoundingElement();
  // Value by which we moved the game up relative to the viewport
  #gameViewportOffset = 0;
  #running = false;
  #initialDPR = devicePixelRatio;
  #ballX = 0;
  #ballY = 0;
  #ballDx = 0;
  #ballDy = 0;
  #paddleX = 0;
  #rightPressed = false;
  #leftPressed = false;
  #brickHeight = 0;
  #lives = 0;
  #blockCount = 0;
  #paddleLength = MAX_PADDLE_LENGTH;
  #minScreenHeight = 150;
  #maxScreenHeight = 1500;
  #screenHeightDiff = this.#maxScreenHeight - this.#minScreenHeight;
  // Value from 0.1 to 1 that multiplies speed depending on the screen height
  #deltaMultiplier = 0;
  #deltaVectorLength = 0;
  #currentPalette;
  constructor(timelineFlameChart) {
    super();
    this.timelineFlameChart = timelineFlameChart;
    this.#canvas = this.createChild("canvas", "fill");
    this.#ctx = this.#canvas.getContext("2d");
    this.#helperCanvas = document.createElement("canvas");
    this.#helperCanvasCtx = this.#helperCanvas.getContext("2d");
    const randomPaletteIndex = Math.floor(Math.random() * colorPallettes.length);
    this.#currentPalette = colorPallettes[randomPaletteIndex];
    this.#scorePanel = this.createChild("div");
    this.#scorePanel.classList.add("scorePanel");
    this.#scorePanel.style.borderImage = "linear-gradient(" + this.#currentPalette.mediumDarker + "," + this.#currentPalette.dark + ") 1";
    this.initButton();
  }
  initButton() {
    const button = this.createChild("div");
    button.classList.add("game-close-button");
    button.innerHTML = "<b><span style='font-size: 1.2em; color: white'>x</span></b>";
    button.style.background = this.#currentPalette.dark;
    button.style.boxShadow = this.#currentPalette.dark + " 1px 1px, " + this.#currentPalette.mediumDarker + " 3px 3px, " + this.#currentPalette.mediumLighter + " 5px 5px";
    button.addEventListener("click", this.#closeGame.bind(this));
    this.appendChild(button);
  }
  connectedCallback() {
    this.#running = true;
    this.#setUpNewGame();
    this.#boundingElement.addEventListener("keydown", this.#keyDownHandlerBound);
    document.addEventListener("keydown", this.#keyDownHandlerBound, false);
    document.addEventListener("keyup", this.#keyUpHandlerBound, false);
    document.addEventListener("keypress", this.#keyPressHandlerBound, false);
    window.addEventListener("resize", this.#closeGameBound);
    document.addEventListener("mousemove", this.#mouseMoveHandlerBound, false);
    this.tabIndex = 1;
    this.focus();
  }
  disconnectedCallback() {
    this.#boundingElement.removeEventListener("keydown", this.#keyDownHandlerBound);
    window.removeEventListener("resize", this.#closeGameBound);
    document.removeEventListener("keydown", this.#keyDownHandlerBound, false);
    document.removeEventListener("keyup", this.#keyUpHandlerBound, false);
    window.removeEventListener("resize", this.#closeGameBound);
    document.removeEventListener("keypress", this.#keyPressHandlerBound, false);
    document.removeEventListener("mousemove", this.#mouseMoveHandlerBound, false);
  }
  #resetCanvas() {
    const dPR = window.devicePixelRatio;
    const height = Math.round(this.offsetHeight * dPR);
    const width = Math.round(this.offsetWidth * dPR);
    this.#canvas.height = height;
    this.#canvas.width = width;
    this.#canvas.style.height = height / dPR + "px";
    this.#canvas.style.width = width / dPR + "px";
  }
  #closeGame() {
    this.#running = false;
    this.remove();
  }
  #setUpNewGame() {
    this.#resetCanvas();
    this.#deltaMultiplier = Math.max(0.1, (this.offsetHeight - this.#minScreenHeight) / this.#screenHeightDiff);
    this.#deltaVectorLength = MIN_DELTA * this.#deltaMultiplier;
    const trackData = this.timelineFlameChart.drawTrackOnCanvas("Main", this.#ctx, BALL_RADIUS);
    if (trackData === null || trackData.visibleEntries.size === 0) {
      console.error("Could not draw game");
      this.#closeGame();
      return;
    }
    this.#trackTimelineOffset = trackData.top;
    this.#visibleEntries = trackData.visibleEntries;
    this.#gameViewportOffset = this.#trackTimelineOffset + this.timelineFlameChart.getCanvas().getBoundingClientRect().top - this.timelineFlameChart.getScrollOffset();
    requestAnimationFrame(() => this.#animateFlameChartTopPositioning(trackData.top, trackData.height));
  }
  #animateFlameChartTopPositioning(currentOffset, flameChartHeight) {
    if (currentOffset === 0) {
      this.#createGame();
      return;
    }
    const dPR = window.devicePixelRatio;
    const currentOffsetOnDPR = Math.round(currentOffset * dPR);
    const newOffset = Math.max(currentOffset - 4, 0);
    const newOffsetOnDPR = Math.round(newOffset * dPR);
    const baseCanvas = this.#canvas;
    this.#helperCanvas.height = baseCanvas.height;
    this.#helperCanvas.width = baseCanvas.width;
    this.#helperCanvas.style.height = baseCanvas.style.height;
    this.#helperCanvas.style.width = baseCanvas.style.width;
    this.#helperCanvasCtx.drawImage(baseCanvas, 0, currentOffsetOnDPR, baseCanvas.width, flameChartHeight * dPR, 0, newOffsetOnDPR, baseCanvas.width, flameChartHeight * dPR);
    this.#resetCanvas();
    this.#ctx.drawImage(this.#helperCanvas, 0, 0);
    requestAnimationFrame(() => this.#animateFlameChartTopPositioning(newOffset, flameChartHeight));
  }
  #keyUpHandler(event) {
    if (event.key === "Right" || event.key === "ArrowRight" || event.key === "d") {
      this.#rightPressed = false;
      event.preventDefault();
    } else if (event.key === "Left" || event.key === "ArrowLeft" || event.key === "a") {
      this.#leftPressed = false;
      event.preventDefault();
    } else {
      event.stopImmediatePropagation();
    }
  }
  #keyPressHandler(e) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
  #keyDownHandler(event) {
    if (event.key === "Escape") {
      this.#closeGame();
      event.stopImmediatePropagation();
    } else if (event.key === "Right" || event.key === "ArrowRight" || event.key === "d") {
      this.#rightPressed = true;
      event.preventDefault();
    } else if (event.key === "Left" || event.key === "ArrowLeft" || event.key === "a") {
      this.#leftPressed = true;
      event.preventDefault();
    } else {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  #mouseMoveHandler(e) {
    this.#paddleX = Math.max(e.offsetX - this.#paddleLength / 2, 0);
    this.#paddleX = Math.min(this.#paddleX, this.offsetWidth - this.#paddleLength);
  }
  #createGame() {
    this.#ballX = this.offsetWidth / 2;
    this.#ballY = this.offsetHeight - PADDLE_HEIGHT - BALL_RADIUS;
    this.#ballDx = 0;
    this.#ballDy = -Math.SQRT2 * this.#deltaVectorLength;
    this.#paddleX = (this.#canvas.width - this.#paddleLength) / 2;
    this.#rightPressed = false;
    this.#leftPressed = false;
    this.#brickHeight = this.timelineFlameChart.getBarHeight();
    this.#blockCount = this.#visibleEntries.size;
    this.#lives = Math.max(Math.round(this.#blockCount / 17), 2);
    this.#draw();
  }
  #restartBall() {
    this.#ballX = this.offsetWidth / 2;
    this.#ballY = this.offsetHeight - PADDLE_HEIGHT - BALL_RADIUS;
    this.#ballDx = 0;
    this.#ballDy = -Math.SQRT2 * this.#deltaVectorLength;
  }
  #drawBall() {
    if (!this.#ctx) {
      return;
    }
    const gradient = this.#ctx.createRadialGradient(
      this.#ballX + BALL_RADIUS / 4,
      // Offset towards the left
      this.#ballY - BALL_RADIUS / 4,
      // Offset downwards
      0,
      this.#ballX + BALL_RADIUS / 4,
      this.#ballY - BALL_RADIUS / 4,
      BALL_RADIUS
    );
    gradient.addColorStop(0.3, this.#currentPalette.mediumLighter);
    gradient.addColorStop(0.6, this.#currentPalette.mediumDarker);
    gradient.addColorStop(1, this.#currentPalette.dark);
    this.#ctx.beginPath();
    this.#ctx.arc(this.#ballX, this.#ballY, BALL_RADIUS, 0, Math.PI * 2);
    this.#ctx.fillStyle = gradient;
    this.#ctx.fill();
    this.#ctx.closePath();
  }
  #drawPaddle() {
    if (!this.#ctx) {
      return;
    }
    const gradient = this.#ctx.createRadialGradient(this.#paddleX + this.#paddleLength / 3, this.offsetHeight - PADDLE_HEIGHT - PADDLE_HEIGHT / 4, 0, this.#paddleX + this.#paddleLength / 3, this.offsetHeight - PADDLE_HEIGHT - PADDLE_HEIGHT / 4, this.#paddleLength / 2);
    gradient.addColorStop(0.3, this.#currentPalette.dark);
    gradient.addColorStop(1, this.#currentPalette.mediumDarker);
    this.#ctx.beginPath();
    this.#ctx.rect(this.#paddleX, this.offsetHeight - PADDLE_HEIGHT, this.#paddleLength, PADDLE_HEIGHT);
    this.#ctx.fillStyle = gradient;
    this.#ctx.fill();
    this.#ctx.closePath();
  }
  #patchBrokenBricks() {
    if (!this.#ctx) {
      return;
    }
    for (const brick of this.#brokenBricks.values()) {
      this.#ctx.beginPath();
      this.#ctx.rect(brick.x, brick.y, brick.width + 0.5, this.#brickHeight + 0.5);
      this.#ctx.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-neutral-container", this);
      this.#ctx.fill();
      this.#ctx.closePath();
    }
  }
  #draw() {
    if (this.#initialDPR !== devicePixelRatio) {
      this.#running = false;
    }
    if (this.#lives === 0) {
      window.alert("GAME OVER");
      this.#closeGame();
      return;
    }
    if (this.#blockCount === 0) {
      this.#party();
      return;
    }
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#ctx.drawImage(this.#helperCanvas, 0, 0);
    this.#ctx.save();
    this.#ctx.scale(devicePixelRatio, devicePixelRatio);
    this.#helperCanvasCtx.save();
    this.#helperCanvasCtx.scale(devicePixelRatio, devicePixelRatio);
    this.#patchBrokenBricks();
    this.#drawBall();
    this.#drawPaddle();
    this.#brickCollisionDetection();
    const lives = `<div><b><span style='font-size: 1.3em; color:  ${this.#currentPalette.dark}'>&#x2764;&#xfe0f; ${this.#lives}</span></b></div>`;
    const blocks = `<div><b><span style='font-size: 1.3em; color: ${this.#currentPalette.dark}'> \u{1F9F1} ${this.#blockCount}</span></b></div>`;
    this.#scorePanel.innerHTML = lives + blocks;
    this.#blockCount = this.#visibleEntries.size - this.#brokenBricks.size;
    this.#deltaVectorLength = (MIN_DELTA + (MAX_DELTA - MIN_DELTA) * this.#brokenBricks.size / this.#visibleEntries.size) * this.#deltaMultiplier;
    this.#paddleLength = MAX_PADDLE_LENGTH - (MAX_PADDLE_LENGTH - MIN_PADDLE_LENGTH) * this.#brokenBricks.size / this.#visibleEntries.size;
    if (this.#ballX + this.#ballDx > this.offsetWidth - BALL_RADIUS || this.#ballX + this.#ballDx < BALL_RADIUS) {
      this.#ballDx = -this.#ballDx;
    }
    if (this.#ballY + this.#ballDy < BALL_RADIUS) {
      this.#ballDy = -this.#ballDy;
    } else if (this.#ballY + this.#ballDy > this.offsetHeight - BALL_RADIUS && this.#ballDy > 0) {
      if (this.#ballX > this.#paddleX - BALL_RADIUS && this.#ballX < this.#paddleX + this.#paddleLength + BALL_RADIUS) {
        let roundedBallX = Math.min(this.#ballX, this.#paddleX + this.#paddleLength);
        roundedBallX = Math.max(roundedBallX, this.#paddleX);
        const paddleLenghtPortion = (roundedBallX - this.#paddleX) * this.#deltaVectorLength * 2 / this.#paddleLength;
        this.#ballDx = -this.#deltaVectorLength + paddleLenghtPortion;
        this.#ballDy = -Math.sqrt(2 * Math.pow(this.#deltaVectorLength, 2) - Math.pow(this.#ballDx, 2));
      } else {
        this.#restartBall();
        this.#paddleX = (this.offsetWidth - this.#paddleLength) / 2;
        this.#lives--;
      }
    }
    const keyDelta = Math.round(this.clientWidth / 60);
    if (this.#rightPressed && this.#paddleX < this.offsetWidth - this.#paddleLength) {
      this.#paddleX += keyDelta;
    } else if (this.#leftPressed && this.#paddleX > 0) {
      this.#paddleX -= keyDelta;
    }
    this.#ballX += Math.round(this.#ballDx);
    this.#ballY += Math.round(this.#ballDy);
    this.#ctx.restore();
    this.#helperCanvasCtx.restore();
    if (this.#running) {
      requestAnimationFrame(this.#draw.bind(this));
    }
  }
  #brickCollisionDetection() {
    const timelineCanvasOffset = this.timelineFlameChart.getCanvas().getBoundingClientRect();
    const ballYRelativeToGame = this.#ballY + this.#gameViewportOffset - timelineCanvasOffset.top;
    const entryIndexTop = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX, ballYRelativeToGame + BALL_RADIUS);
    const entryIndexBottom = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX, ballYRelativeToGame - BALL_RADIUS);
    const entryIndexRight = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX + BALL_RADIUS, ballYRelativeToGame);
    const entryIndexLeft = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX - BALL_RADIUS, ballYRelativeToGame);
    const diffBetweenCornerandCircle = BALL_RADIUS / Math.SQRT2;
    const entryIndexRightTop = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX + diffBetweenCornerandCircle, ballYRelativeToGame + diffBetweenCornerandCircle);
    const entryIndexLeftTop = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX - diffBetweenCornerandCircle, ballYRelativeToGame + diffBetweenCornerandCircle);
    const entryIndexRightBottom = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX + diffBetweenCornerandCircle, ballYRelativeToGame - diffBetweenCornerandCircle);
    const entryIndexLeftBottom = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX - diffBetweenCornerandCircle, ballYRelativeToGame - diffBetweenCornerandCircle);
    const breakBrick = (entryIndex) => {
      const entryCoordinates = this.timelineFlameChart.entryIndexToCoordinates(entryIndex);
      if (entryCoordinates) {
        const entryBegin = Math.max(entryCoordinates.x - timelineCanvasOffset.left, 0);
        this.#brokenBricks.set(entryIndex, {
          x: entryBegin - 0.5,
          y: entryCoordinates.y - this.#gameViewportOffset - 0.5,
          width: this.timelineFlameChart.entryWidth(entryIndex)
        });
      }
    };
    if (entryIndexTop > -1 && !this.#brokenBricks.has(entryIndexTop) && this.#visibleEntries.has(entryIndexTop)) {
      this.#ballDy = -this.#ballDy;
      breakBrick(entryIndexTop);
      return;
    }
    if (entryIndexBottom > -1 && !this.#brokenBricks.has(entryIndexBottom) && this.#visibleEntries.has(entryIndexBottom)) {
      this.#ballDy = -this.#ballDy;
      breakBrick(entryIndexBottom);
      return;
    }
    if (entryIndexRight > -1 && !this.#brokenBricks.has(entryIndexRight) && this.#visibleEntries.has(entryIndexRight)) {
      this.#ballDx = -this.#ballDx;
      breakBrick(entryIndexRight);
      return;
    }
    if (entryIndexLeft > -1 && !this.#brokenBricks.has(entryIndexLeft) && this.#visibleEntries.has(entryIndexLeft)) {
      this.#ballDx = -this.#ballDx;
      breakBrick(entryIndexLeft);
      return;
    }
    const diagonalIndexes = [entryIndexRightTop, entryIndexLeftTop, entryIndexRightBottom, entryIndexLeftBottom];
    for (const index of diagonalIndexes) {
      if (index > -1 && !this.#brokenBricks.has(index) && this.#visibleEntries.has(index)) {
        this.#ballDx = -this.#ballDx;
        this.#ballDy = -this.#ballDy;
        breakBrick(index);
        return;
      }
    }
  }
  #random(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }
  #party() {
    this.#resetCanvas();
    let count = 0;
    const columnCount = 15;
    const rowCount = 5;
    const xSpacing = this.offsetWidth / columnCount;
    const ySpacing = this.offsetHeight * 0.7 / columnCount;
    const timeoutIDs = [];
    const randomOffset = () => -20 + Math.random() * 40;
    const drawConfetti = () => {
      for (let i = 0; i < columnCount * rowCount; i++) {
        const confettiContainerElement = document.createElement("span");
        confettiContainerElement.className = "confetti-100";
        confettiContainerElement.append(this.#createConfettiElement(i % columnCount * xSpacing + randomOffset(), i % rowCount * ySpacing + randomOffset()));
        timeoutIDs.push(window.setTimeout(() => this.append(confettiContainerElement), Math.random() * 100));
        timeoutIDs.push(window.setTimeout(() => {
          confettiContainerElement.remove();
        }, 1e3));
      }
      if (++count < 6) {
        setTimeout(drawConfetti, Math.random() * 100 + 400);
        return;
      }
      window.alert(`${i18nString(UIStrings.congrats)}
${i18nString(UIStrings.ps)}`);
      timeoutIDs.forEach((id) => clearTimeout(id));
      this.#closeGame();
    };
    drawConfetti();
  }
  #createConfettiElement(x, y) {
    const maxDistance = 400;
    const maxRotation = 3;
    const emojies = ["\u{1F4AF}", "\u{1F389}", "\u{1F38A}"];
    const confettiElement = document.createElement("span");
    confettiElement.textContent = emojies[this.#random(0, emojies.length)];
    confettiElement.className = "confetti-100-particle";
    confettiElement.style.setProperty("--rotation", this.#random(-maxRotation * 360, maxRotation * 360) + "deg");
    confettiElement.style.setProperty("--to-X", this.#random(-maxDistance, maxDistance) + "px");
    confettiElement.style.setProperty("--to-Y", this.#random(-maxDistance, maxDistance) + "px");
    confettiElement.style.left = x + "px";
    confettiElement.style.top = y + "px";
    return confettiElement;
  }
};
customElements.define("brick-breaker", BrickBreaker);

// gen/front_end/ui/legacy/components/perf_ui/ChartViewport.js
var ChartViewport_exports = {};
__export(ChartViewport_exports, {
  ChartViewport: () => ChartViewport
});
import * as Common2 from "./../../../../core/common/common.js";
import * as Platform4 from "./../../../../core/platform/platform.js";
import * as RenderCoordinator from "./../../../components/render_coordinator/render_coordinator.js";
import * as UI3 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/perf_ui/chartViewport.css.js
var chartViewport_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.chart-viewport-v-scroll {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  overflow-x: hidden;
  z-index: 200;
  padding-left: 1px;
}

.chart-viewport-v-scroll.always-show-scrollbar {
  overflow-y: scroll;
}
/* force non overlay scrollbars for Mac */

:host-context(.platform-mac) .chart-viewport-v-scroll {
  right: 2px;
  top: 3px;
  bottom: 3px;
}

:host-context(.platform-mac) ::-webkit-scrollbar {
  width: 8px;
}

:host-context(.platform-mac) ::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar-mac);
  border-radius: 50px;
}

:host-context(.platform-mac) .chart-viewport-v-scroll:hover::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar-mac-hover);
}
/* force non overlay scrollbars for Aura Overlay Scrollbar enabled */

:host-context(.overlay-scrollbar-enabled) ::-webkit-scrollbar {
  width: 10px;
}

:host-context(.overlay-scrollbar-enabled) ::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar-other);
}

:host-context(.overlay-scrollbar-enabled) .chart-viewport-v-scroll:hover::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar-other-hover);
}

.chart-viewport-selection-overlay {
  position: absolute;
  z-index: 100;
  background-color: var(--sys-color-state-ripple-primary);
  border-color: var(--sys-color-primary);
  border-width: 0 1px;
  border-style: solid;
  pointer-events: none;
  top: 0;
  bottom: 0;
  text-align: center;
}

.chart-viewport-selection-overlay .time-span {
  white-space: nowrap;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
}

/*# sourceURL=${import.meta.resolve("./chartViewport.css")} */`;

// gen/front_end/ui/legacy/components/perf_ui/FlameChart.js
var FlameChart_exports = {};
__export(FlameChart_exports, {
  ARROW_SIDE: () => ARROW_SIDE,
  EDIT_ICON_WIDTH: () => EDIT_ICON_WIDTH,
  FlameChart: () => FlameChart,
  FlameChartTimelineData: () => FlameChartTimelineData,
  MinimalTimeWindowMs: () => MinimalTimeWindowMs,
  RulerHeight: () => RulerHeight,
  sortDecorationsForRenderingOrder: () => sortDecorationsForRenderingOrder
});
import * as Common from "./../../../../core/common/common.js";
import * as i18n3 from "./../../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../../core/platform/platform.js";
import * as Trace from "./../../../../models/trace/trace.js";
import * as VisualLogging from "./../../../visual_logging/visual_logging.js";
import * as Buttons from "./../../../components/buttons/buttons.js";
import * as UI2 from "./../../legacy.js";
import * as ThemeSupport7 from "./../../theme_support/theme_support.js";

// gen/front_end/ui/legacy/components/perf_ui/CanvasHelper.js
import * as ThemeSupport3 from "./../../theme_support/theme_support.js";
function horizontalLine(context, width, y) {
  context.moveTo(0, y);
  context.lineTo(width, y);
}
function drawExpansionArrow(context, x, y, expanded) {
  const arrowHeight = ARROW_SIDE * Math.sqrt(3) / 2;
  const arrowCenterOffset = Math.round(arrowHeight / 2);
  context.save();
  context.beginPath();
  context.translate(x, y);
  context.rotate(expanded ? Math.PI / 2 : 0);
  context.moveTo(-arrowCenterOffset, -ARROW_SIDE / 2);
  context.lineTo(-arrowCenterOffset, ARROW_SIDE / 2);
  context.lineTo(arrowHeight - arrowCenterOffset, 0);
  context.fill();
  context.restore();
}
function drawIcon(context, x, y, width, pathData, iconColor = "--sys-color-on-surface") {
  const p = new Path2D(pathData);
  context.save();
  context.translate(x, y);
  context.fillStyle = ThemeSupport3.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container");
  context.fillRect(0, 0, width, width);
  context.fillStyle = ThemeSupport3.ThemeSupport.instance().getComputedValue(iconColor);
  const scale = width / 20;
  context.scale(scale, scale);
  context.fill(p);
  context.restore();
}

// gen/front_end/ui/legacy/components/perf_ui/flameChart.css.js
var flameChart_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.flame-chart-main-pane {
  overflow: hidden;

  --selected-group-border: hsl(216deg 68% 54%);
}

:host-context(.theme-with-dark-background) .flame-chart-main-pane {
  --selected-group-border: hsl(216deg 68% 46%);
}

.flame-chart-marker-highlight-element {
  position: absolute;
  top: 1px;
  height: 18px;
  width: 6px;
  margin: 0 -3px;
  content: "";
  display: block;
}

.flame-chart-canvas:focus-visible {
  border-top: 1px solid var(--sys-color-state-focus-ring);
  border-bottom: 1px solid var(--sys-color-state-focus-ring);
}

.flame-chart-highlight-element {
  position: absolute;
  pointer-events: none;
  background-color: var(--sys-color-state-hover-on-subtle);
}

.reveal-descendants-arrow-highlight-element {
  position: absolute;
  pointer-events: none;
  background-color: var(--sys-color-state-hover-on-subtle);
}

.flame-chart-selected-element {
  position: absolute;
  pointer-events: none;
  outline: 2px solid var(--sys-color-primary);
  background-color: var(--sys-color-state-ripple-primary);
}

.chart-cursor-element {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 100;
  width: 2px;
  background-color: var(--ref-palette-pink50);
  pointer-events: none;
}

.flame-chart-entry-info:not(:empty) {
  z-index: 2000;
  position: absolute;
  contain: content;
  background-color: var(--sys-color-cdt-base-container);
  pointer-events: none;
  padding: 4px 8px;
  white-space: nowrap;
  max-width: 80%;
  box-shadow: var(--drop-shadow);
}

.flame-chart-entry-info table tr td:empty {
  padding: 0;
}

.flame-chart-entry-info table tr td:not(:empty) {
  padding: 0 5px;
  white-space: nowrap;
}

.flame-chart-entry-info table tr td:first-child {
  font-weight: bold;
}

.flame-chart-entry-info table tr td span {
  margin-right: 5px;
}

.flame-chart-edit-confirm {
  position: fixed;
  bottom: 10px;
  right: 10px;
}

/*# sourceURL=${import.meta.resolve("./flameChart.css")} */`;

// gen/front_end/ui/legacy/components/perf_ui/Font.js
var Font_exports = {};
__export(Font_exports, {
  DEFAULT_FONT_SIZE: () => DEFAULT_FONT_SIZE,
  getFontFamilyForCanvas: () => getFontFamilyForCanvas
});
import * as Host from "./../../../../core/host/host.js";
function getFontFamilyForCanvas() {
  return Host.Platform.fontFamily();
}
var DEFAULT_FONT_SIZE = "11px";

// gen/front_end/ui/legacy/components/perf_ui/TimelineGrid.js
var TimelineGrid_exports = {};
__export(TimelineGrid_exports, {
  TimelineGrid: () => TimelineGrid
});
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as ThemeSupport5 from "./../../theme_support/theme_support.js";

// gen/front_end/ui/legacy/components/perf_ui/timelineGrid.css.js
var timelineGrid_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.resources-dividers {
  position: absolute;
  inset: 0;
  z-index: -100;
}

.resources-event-dividers {
  position: absolute;
  left: 0;
  right: 0;
  height: 100%;
  top: 0;
  z-index: 300;
  pointer-events: none;
}

.resources-dividers-label-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-clip: padding-box;
  height: 20px;
  z-index: 200;
  pointer-events: none;
  overflow: hidden;
}

.resources-divider {
  position: absolute;
  width: 1px;
  top: 0;
  bottom: 0;
  background-color: var(--sys-color-divider);
}

.resources-event-divider {
  position: absolute;
  width: 1px;
  top: 0;
  bottom: 0;
  z-index: 300;
}

.resources-divider-label {
  position: absolute;
  top: 4px;
  right: 3px;
  font-size: 80%;
  white-space: nowrap;
  pointer-events: none;
}

.timeline-grid-header {
  height: 20px;
  pointer-events: none;
}

/*# sourceURL=${import.meta.resolve("./timelineGrid.css")} */`;

// gen/front_end/ui/legacy/components/perf_ui/TimelineGrid.js
var labelMap = /* @__PURE__ */ new Map();
var TimelineGrid = class _TimelineGrid {
  element;
  #dividersElement;
  gridHeaderElement;
  eventDividersElement;
  #dividersLabelBarElement;
  constructor() {
    this.element = document.createElement("div");
    Platform2.DOMUtilities.appendStyle(this.element, timelineGrid_css_default);
    this.#dividersElement = this.element.createChild("div", "resources-dividers");
    this.gridHeaderElement = document.createElement("div");
    this.gridHeaderElement.classList.add("timeline-grid-header");
    this.eventDividersElement = this.gridHeaderElement.createChild("div", "resources-event-dividers");
    this.#dividersLabelBarElement = this.gridHeaderElement.createChild("div", "resources-dividers-label-bar");
    this.element.appendChild(this.gridHeaderElement);
  }
  static calculateGridOffsets(calculator, freeZoneAtLeft) {
    const minGridSlicePx = 64;
    const clientWidth = calculator.computePosition(calculator.maximumBoundary());
    let dividersCount = clientWidth / minGridSlicePx;
    let gridSliceTime = calculator.boundarySpan() / dividersCount;
    const pixelsPerTime = clientWidth / calculator.boundarySpan();
    const logGridSliceTime = Math.ceil(Math.log(gridSliceTime) / Math.LN10);
    gridSliceTime = Math.pow(10, logGridSliceTime);
    if (gridSliceTime * pixelsPerTime >= 5 * minGridSlicePx) {
      gridSliceTime = gridSliceTime / 5;
    }
    if (gridSliceTime * pixelsPerTime >= 2 * minGridSlicePx) {
      gridSliceTime = gridSliceTime / 2;
    }
    const firstDividerTime = Math.ceil((calculator.minimumBoundary() - calculator.zeroTime()) / gridSliceTime) * gridSliceTime + calculator.zeroTime();
    let lastDividerTime = calculator.maximumBoundary();
    lastDividerTime += minGridSlicePx / pixelsPerTime;
    dividersCount = Math.ceil((lastDividerTime - firstDividerTime) / gridSliceTime);
    if (!gridSliceTime) {
      dividersCount = 0;
    }
    const offsets = [];
    for (let i = 0; i < dividersCount; ++i) {
      const time = firstDividerTime + gridSliceTime * 100 * i / 100;
      const positionFromTime = calculator.computePosition(time);
      if (positionFromTime < (freeZoneAtLeft || 0)) {
        continue;
      }
      offsets.push({ position: Math.floor(positionFromTime), time });
    }
    return { offsets, precision: Math.max(0, -Math.floor(Math.log(gridSliceTime * 1.01) / Math.LN10)) };
  }
  static drawCanvasGrid(context, dividersData) {
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    const height = Math.floor(context.canvas.height / window.devicePixelRatio);
    context.strokeStyle = getComputedStyle(document.body).getPropertyValue("--app-color-strokestyle");
    context.lineWidth = 1;
    context.translate(0.5, 0.5);
    context.beginPath();
    for (const offsetInfo of dividersData.offsets) {
      context.moveTo(offsetInfo.position, 0);
      context.lineTo(offsetInfo.position, height);
    }
    context.stroke();
    context.restore();
  }
  static drawCanvasHeaders(context, dividersData, formatTimeFunction, paddingTop, headerHeight, freeZoneAtLeft) {
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    const width = Math.ceil(context.canvas.width / window.devicePixelRatio);
    context.beginPath();
    context.fillStyle = ThemeSupport5.ThemeSupport.instance().getComputedValue("--color-background-opacity-80");
    context.fillRect(0, 0, width, headerHeight);
    context.fillStyle = ThemeSupport5.ThemeSupport.instance().getComputedValue("--sys-color-on-surface");
    context.textBaseline = "hanging";
    context.font = `${DEFAULT_FONT_SIZE} ${getFontFamilyForCanvas()}`;
    const paddingRight = 4;
    for (const offsetInfo of dividersData.offsets) {
      const text = formatTimeFunction(offsetInfo.time);
      const textWidth = context.measureText(text).width;
      const textPosition = offsetInfo.position - textWidth - paddingRight;
      if (!freeZoneAtLeft || freeZoneAtLeft < textPosition) {
        context.fillText(text, textPosition, paddingTop);
      }
    }
    context.restore();
  }
  get dividersElement() {
    return this.#dividersElement;
  }
  get dividersLabelBarElement() {
    return this.#dividersLabelBarElement;
  }
  updateDividers(calculator, freeZoneAtLeft) {
    const dividersData = _TimelineGrid.calculateGridOffsets(calculator, freeZoneAtLeft);
    const dividerOffsets = dividersData.offsets;
    const precision = dividersData.precision;
    const dividersElementClientWidth = this.#dividersElement.clientWidth;
    let divider = this.#dividersElement.firstChild;
    let dividerLabelBar = this.#dividersLabelBarElement.firstChild;
    for (let i = 0; i < dividerOffsets.length; ++i) {
      if (!divider) {
        divider = document.createElement("div");
        divider.className = "resources-divider";
        this.#dividersElement.appendChild(divider);
        dividerLabelBar = document.createElement("div");
        dividerLabelBar.className = "resources-divider";
        const label = document.createElement("div");
        label.className = "resources-divider-label";
        labelMap.set(dividerLabelBar, label);
        dividerLabelBar.appendChild(label);
        this.#dividersLabelBarElement.appendChild(dividerLabelBar);
      }
      const time = dividerOffsets[i].time;
      const position = dividerOffsets[i].position;
      if (dividerLabelBar) {
        const label = labelMap.get(dividerLabelBar);
        if (label) {
          label.textContent = calculator.formatValue(time, precision);
        }
      }
      const percentLeft = 100 * position / dividersElementClientWidth;
      divider.style.left = percentLeft + "%";
      if (dividerLabelBar) {
        dividerLabelBar.style.left = percentLeft + "%";
      }
      divider = divider.nextSibling;
      if (dividerLabelBar) {
        dividerLabelBar = dividerLabelBar.nextSibling;
      }
    }
    while (divider) {
      const nextDivider = divider.nextSibling;
      this.#dividersElement.removeChild(divider);
      if (nextDivider) {
        divider = nextDivider;
      } else {
        break;
      }
    }
    while (dividerLabelBar) {
      const nextDivider = dividerLabelBar.nextSibling;
      this.#dividersLabelBarElement.removeChild(dividerLabelBar);
      if (nextDivider) {
        dividerLabelBar = nextDivider;
      } else {
        break;
      }
    }
    return true;
  }
  addEventDividers(dividers) {
    this.gridHeaderElement.removeChild(this.eventDividersElement);
    for (const divider of dividers) {
      this.eventDividersElement.appendChild(divider);
    }
    this.gridHeaderElement.appendChild(this.eventDividersElement);
  }
  removeEventDividers() {
    this.eventDividersElement.removeChildren();
  }
  hideEventDividers() {
    this.eventDividersElement.classList.add("hidden");
  }
  showEventDividers() {
    this.eventDividersElement.classList.remove("hidden");
  }
  setScrollTop(scrollTop) {
    this.#dividersLabelBarElement.style.top = scrollTop + "px";
    this.eventDividersElement.style.top = scrollTop + "px";
  }
};

// gen/front_end/ui/legacy/components/perf_ui/FlameChart.js
var KEYBOARD_FAKED_CONTEXT_MENU_DETAIL = -1;
var SUBTITLE_FONT_SIZE_AND_STYLE = "italic 10px";
var UIStrings2 = {
  /**
   * @description Aria alert used to notify the user when an event has been selected because they tabbed into a group.
   * @example {Paint} PH1
   * @example {Main thread} PH2
   *
   */
  eventSelectedFromGroup: 'Selected a {PH1} event within {PH2}. Press "enter" to focus this event.',
  /**
   * @description Aria accessible name in Flame Chart of the Performance panel
   */
  flameChart: "Flame Chart",
  /**
   * @description Text for the screen reader to announce a hovered group
   * @example {Network} PH1
   */
  sHovered: "{PH1} hovered",
  /**
   * @description Text for screen reader to announce a selected group.
   * @example {Network} PH1
   */
  sSelected: "{PH1} selected",
  /**
   * @description Text for screen reader to announce an expanded group
   * @example {Network} PH1
   */
  sExpanded: "{PH1} expanded",
  /**
   * @description Text for screen reader to announce a collapsed group
   * @example {Network} PH1
   */
  sCollapsed: "{PH1} collapsed",
  /**
   * @description Text for an action that adds a label annotation to an entry in the Flame Chart
   */
  labelEntry: "Label entry",
  /**
   * @description Text for an action that adds link annotation between entries in the Flame Chart
   */
  linkEntries: "Link entries",
  /**
   * @description Shown in the context menu when right clicking on a track header to enable the user to enter the track configuration mode.
   */
  enterTrackConfigurationMode: "Configure tracks",
  /**
   * @description Shown in the context menu when right clicking on a track header to allow the user to exit track configuration mode.
   */
  exitTrackConfigurationMode: "Finish configuring tracks"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/components/perf_ui/FlameChart.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var HEADER_LEFT_PADDING = 6;
var ARROW_SIDE = 8;
var EXPANSION_ARROW_INDENT = HEADER_LEFT_PADDING + ARROW_SIDE / 2;
var HEADER_LABEL_X_PADDING = 3;
var HEADER_LABEL_Y_PADDING = 2;
var PADDING_BETWEEN_TITLE_AND_SUBTITLE = 6;
var EDIT_ICON_WIDTH = 16;
var GAP_BETWEEN_EDIT_ICONS = 3;
var UP_ICON_LEFT = HEADER_LEFT_PADDING;
var DOWN_ICON_LEFT = UP_ICON_LEFT + EDIT_ICON_WIDTH + GAP_BETWEEN_EDIT_ICONS;
var HIDE_ICON_LEFT = DOWN_ICON_LEFT + EDIT_ICON_WIDTH + GAP_BETWEEN_EDIT_ICONS;
var EDIT_MODE_TOTAL_ICON_WIDTH = HIDE_ICON_LEFT + EDIT_ICON_WIDTH + GAP_BETWEEN_EDIT_ICONS;
var moveUpIconPath = "M9.25 17V5.875L7.062 8.062L6 7L10 3L14 7L12.938 8.062L10.75 5.875V17H9.25Z";
var moveDownIconPath = "M9.25 3V14.125L7.062 11.938L6 13L10 17L14 13L12.938 11.938L10.75 14.125V3H9.25Z";
var hideIconPath = "M13.2708 11.1459L11.9792 9.85419C12.0347 9.32641 11.875 8.87155 11.5 8.4896C11.125 8.10766 10.6736 7.94446 10.1458 8.00002L8.85417 6.70835C9.03472 6.63891 9.22222 6.58683 9.41667 6.5521C9.61111 6.51738 9.80556 6.50002 10 6.50002C10.9722 6.50002 11.7986 6.8403 12.4792 7.52085C13.1597 8.20141 13.5 9.0278 13.5 10C13.5 10.1945 13.4826 10.3889 13.4479 10.5834C13.4132 10.7778 13.3542 10.9653 13.2708 11.1459ZM16.0417 13.9167L14.9583 12.8334C15.4583 12.4445 15.9132 12.0174 16.3229 11.5521C16.7326 11.0868 17.0764 10.5695 17.3542 10C16.6736 8.59724 15.6701 7.49655 14.3438 6.69794C13.0174 5.89933 11.5694 5.50002 10 5.50002C9.63889 5.50002 9.28472 5.52085 8.9375 5.56252C8.59028 5.60419 8.25 5.67363 7.91667 5.77085L6.70833 4.56252C7.23611 4.35419 7.77431 4.20835 8.32292 4.12502C8.87153 4.04169 9.43056 4.00002 10 4.00002C11.9861 4.00002 13.8021 4.53821 15.4479 5.6146C17.0938 6.69099 18.2778 8.1528 19 10C18.6944 10.7917 18.2882 11.5104 17.7813 12.1563C17.2743 12.8021 16.6944 13.3889 16.0417 13.9167ZM16 18.125L13.2917 15.4167C12.7639 15.6111 12.2257 15.757 11.6771 15.8542C11.1285 15.9514 10.5694 16 10 16C8.01389 16 6.19792 15.4618 4.55208 14.3854C2.90625 13.309 1.72222 11.8472 1 10C1.30556 9.20835 1.70833 8.48613 2.20833 7.83335C2.70833 7.18058 3.29167 6.5903 3.95833 6.06252L1.875 3.97919L2.9375 2.91669L17.0625 17.0625L16 18.125ZM5.02083 7.14585C4.53472 7.53474 4.08333 7.96183 3.66667 8.4271C3.25 8.89238 2.90972 9.41669 2.64583 10C3.32639 11.4028 4.32986 12.5035 5.65625 13.3021C6.98264 14.1007 8.43056 14.5 10 14.5C10.3611 14.5 10.7153 14.4757 11.0625 14.4271C11.4097 14.3785 11.7569 14.3125 12.1042 14.2292L11.1667 13.2917C10.9722 13.3611 10.7778 13.4132 10.5833 13.4479C10.3889 13.4827 10.1944 13.5 10 13.5C9.02778 13.5 8.20139 13.1597 7.52083 12.4792C6.84028 11.7986 6.5 10.9722 6.5 10C6.5 9.80558 6.52431 9.61113 6.57292 9.41669C6.62153 9.22224 6.66667 9.0278 6.70833 8.83335L5.02083 7.14585Z";
var showIconPath = "M10 13.5C10.972 13.5 11.7983 13.1597 12.479 12.479C13.1597 11.7983 13.5 10.972 13.5 10C13.5 9.028 13.1597 8.20167 12.479 7.521C11.7983 6.84033 10.972 6.5 10 6.5C9.028 6.5 8.20167 6.84033 7.521 7.521C6.84033 8.20167 6.5 9.028 6.5 10C6.5 10.972 6.84033 11.7983 7.521 12.479C8.20167 13.1597 9.028 13.5 10 13.5ZM10 12C9.44467 12 8.97233 11.8057 8.583 11.417C8.19433 11.0277 8 10.5553 8 10C8 9.44467 8.19433 8.97233 8.583 8.583C8.97233 8.19433 9.44467 8 10 8C10.5553 8 11.0277 8.19433 11.417 8.583C11.8057 8.97233 12 9.44467 12 10C12 10.5553 11.8057 11.0277 11.417 11.417C11.0277 11.8057 10.5553 12 10 12ZM10 16C8.014 16 6.20833 15.455 4.583 14.365C2.95833 13.2743 1.764 11.8193 1 10C1.764 8.18067 2.95833 6.72567 4.583 5.635C6.20833 4.545 8.014 4 10 4C11.986 4 13.7917 4.545 15.417 5.635C17.0417 6.72567 18.236 8.18067 19 10C18.236 11.8193 17.0417 13.2743 15.417 14.365C13.7917 15.455 11.986 16 10 16ZM10 14.5C11.5553 14.5 12.9927 14.0973 14.312 13.292C15.632 12.486 16.646 11.3887 17.354 10C16.646 8.61133 15.632 7.514 14.312 6.708C12.9927 5.90267 11.5553 5.5 10 5.5C8.44467 5.5 7.00733 5.90267 5.688 6.708C4.368 7.514 3.354 8.61133 2.646 10C3.354 11.3887 4.368 12.486 5.688 13.292C7.00733 14.0973 8.44467 14.5 10 14.5Z";
var FlameChart = class extends Common.ObjectWrapper.eventMixin(UI2.Widget.VBox) {
  flameChartDelegate;
  chartViewport;
  dataProvider;
  candyStripePattern;
  candyStripePatternGray;
  contextMenu;
  viewportElement;
  canvas;
  context;
  popoverElement;
  markerHighlighElement;
  highlightElement;
  revealDescendantsArrowHighlightElement;
  selectedElement = null;
  rulerEnabled;
  barHeight;
  // Additional space around an entry that is added for operations with entry.
  // It allows for less pecision while selecting/hovering over an entry.
  hitMarginPx;
  textBaseline;
  textPadding;
  highlightedMarkerIndex;
  /**
   * The index of the entry that's hovered (typically), or focused because of searchResult or other reasons.focused via searchResults, or focused by other means.
   * Updated as the cursor moves. Meanwhile `selectedEntryIndex` is the entry that's been clicked.
   **/
  highlightedEntryIndex;
  /**
   * Represents the index of the entry that is selected. For an entry to be
   * selected, it has to be clicked by the user (generally).
   **/
  selectedEntryIndex;
  rawTimelineDataLength;
  markerPositions;
  customDrawnPositions;
  lastMouseOffsetX;
  selectedGroupIndex;
  keyboardFocusedGroup;
  offsetWidth;
  offsetHeight;
  dragStartX;
  dragStartY;
  lastMouseOffsetY;
  #minimumBoundary;
  maxDragOffset;
  timelineLevels;
  visibleLevelOffsets;
  visibleLevels;
  visibleLevelHeights;
  groupOffsets;
  rawTimelineData;
  forceDecorationCache;
  entryColorsCache;
  colorDimmingCache = /* @__PURE__ */ new Map();
  totalTime;
  lastPopoverState;
  dimIndices;
  /** When true, all undimmed entries are outlined. When an array, only those indices are outlined (if not dimmed). */
  dimShouldOutlineUndimmedEntries = false;
  #tooltipPopoverYAdjustment = 0;
  #font;
  #subtitleFont;
  #groupTreeRoot;
  #searchResultEntryIndex = null;
  #inTrackConfigEditMode = false;
  #linkSelectionAnnotationIsInProgress = false;
  // Stored because we cache this value to save extra lookups and layoffs.
  #canvasBoundingClientRect = null;
  #selectedElementOutlineEnabled = true;
  #indexToDrawOverride = /* @__PURE__ */ new Map();
  #persistedGroupConfig = null;
  #boundOnThemeChanged = this.#onThemeChanged.bind(this);
  constructor(dataProvider, flameChartDelegate, optionalConfig = {}) {
    super({ useShadowDom: true });
    this.#font = `${DEFAULT_FONT_SIZE} ${getFontFamilyForCanvas()}`;
    this.#subtitleFont = `${SUBTITLE_FONT_SIZE_AND_STYLE} ${getFontFamilyForCanvas()}`;
    this.registerRequiredCSS(flameChart_css_default);
    this.registerRequiredCSS(UI2.inspectorCommonStyles);
    this.contentElement.classList.add("flame-chart-main-pane");
    if (typeof optionalConfig.selectedElementOutline === "boolean") {
      this.#selectedElementOutlineEnabled = optionalConfig.selectedElementOutline;
    }
    this.flameChartDelegate = flameChartDelegate;
    let enableCursorElement = true;
    if (typeof optionalConfig.useOverlaysForCursorRuler === "boolean") {
      enableCursorElement = !optionalConfig.useOverlaysForCursorRuler;
    }
    this.chartViewport = new ChartViewport(this, {
      enableCursorElement
    });
    this.chartViewport.show(this.contentElement);
    this.dataProvider = dataProvider;
    this.viewportElement = this.chartViewport.viewportElement;
    this.canvas = this.viewportElement.createChild("canvas", "fill");
    if (optionalConfig.canvasVELogContext) {
      const context = VisualLogging.canvas(optionalConfig.canvasVELogContext).track({
        hover: true
      });
      this.canvas.setAttribute("jslog", `${context}`);
    }
    this.context = this.canvas.getContext("2d");
    this.candyStripePattern = this.candyStripePatternGray = null;
    this.canvas.tabIndex = 0;
    UI2.ARIAUtils.setLabel(this.canvas, i18nString2(UIStrings2.flameChart));
    UI2.ARIAUtils.markAsTree(this.canvas);
    this.setDefaultFocusedElement(this.canvas);
    this.canvas.classList.add("flame-chart-canvas");
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    this.canvas.addEventListener("mouseout", this.onMouseOut.bind(this), false);
    this.canvas.addEventListener("click", this.onClick.bind(this), false);
    this.canvas.addEventListener("dblclick", this.#onDblClick.bind(this), false);
    this.canvas.addEventListener("keydown", this.onKeyDown.bind(this), false);
    this.canvas.addEventListener("contextmenu", this.onContextMenu.bind(this), false);
    this.popoverElement = optionalConfig.tooltipElement || this.viewportElement.createChild("div", "flame-chart-entry-info");
    this.markerHighlighElement = this.viewportElement.createChild("div", "flame-chart-marker-highlight-element");
    this.highlightElement = this.viewportElement.createChild("div", "flame-chart-highlight-element");
    this.revealDescendantsArrowHighlightElement = this.viewportElement.createChild("div", "reveal-descendants-arrow-highlight-element");
    if (this.#selectedElementOutlineEnabled) {
      this.selectedElement = this.viewportElement.createChild("div", "flame-chart-selected-element");
    }
    this.canvas.addEventListener("focus", () => {
      this.dispatchEventToListeners(
        "CanvasFocused"
        /* Events.CANVAS_FOCUSED */
      );
    }, false);
    UI2.UIUtils.installDragHandle(this.viewportElement, this.startDragging.bind(this), this.dragging.bind(this), this.endDragging.bind(this), null);
    this.rulerEnabled = true;
    this.barHeight = 17;
    this.hitMarginPx = 3;
    this.textBaseline = 5;
    this.textPadding = 5;
    this.chartViewport.setWindowTimes(dataProvider.minimumBoundary(), dataProvider.minimumBoundary() + dataProvider.totalTime());
    this.highlightedMarkerIndex = -1;
    this.highlightedEntryIndex = -1;
    this.selectedEntryIndex = -1;
    this.#searchResultEntryIndex = null;
    this.rawTimelineDataLength = 0;
    this.markerPositions = /* @__PURE__ */ new Map();
    this.customDrawnPositions = /* @__PURE__ */ new Map();
    this.lastMouseOffsetX = 0;
    this.selectedGroupIndex = -1;
    this.lastPopoverState = {
      entryIndex: -1,
      groupIndex: -1,
      hiddenEntriesPopover: false
    };
    this.keyboardFocusedGroup = -1;
  }
  #onThemeChanged() {
    this.scheduleUpdate();
  }
  wasShown() {
    super.wasShown();
    ThemeSupport7.ThemeSupport.instance().addEventListener(ThemeSupport7.ThemeChangeEvent.eventName, this.#boundOnThemeChanged);
  }
  willHide() {
    ThemeSupport7.ThemeSupport.instance().removeEventListener(ThemeSupport7.ThemeChangeEvent.eventName, this.#boundOnThemeChanged);
    this.hideHighlight();
    super.willHide();
  }
  canvasBoundingClientRect() {
    if (this.#canvasBoundingClientRect && this.#canvasBoundingClientRect.width > 0 && this.#canvasBoundingClientRect.height > 0) {
      return this.#canvasBoundingClientRect;
    }
    this.#canvasBoundingClientRect = this.canvas.getBoundingClientRect();
    return this.#canvasBoundingClientRect;
  }
  verticalScrollBarVisible() {
    return this.chartViewport.verticalScrollBarVisible();
  }
  /**
   * In some cases we need to manually adjust the positioning of the tooltip
   * vertically to account for the fact that it might be rendered not relative
   * to just this flame chart. This is true of the main flame chart in the
   * Performance Panel where the element is rendered in a higher-stack container
   * and we need to manually adjust its Y position to correctly put the tooltip
   * in the right place.
   */
  setTooltipYPixelAdjustment(y) {
    if (y === this.#tooltipPopoverYAdjustment) {
      return;
    }
    this.#tooltipPopoverYAdjustment = y;
    if (this.popoverElement.children.length) {
      this.updatePopoverOffset();
    }
  }
  getBarHeight() {
    return this.barHeight;
  }
  setBarHeight(value) {
    this.barHeight = value;
  }
  setTextBaseline(value) {
    this.textBaseline = value;
  }
  setTextPadding(value) {
    this.textPadding = value;
  }
  enableRuler(enable) {
    this.rulerEnabled = enable;
  }
  alwaysShowVerticalScroll() {
    this.chartViewport.alwaysShowVerticalScroll();
  }
  disableRangeSelection() {
    this.chartViewport.disableRangeSelection();
  }
  #shouldDimEvent(entryIndex) {
    if (this.dimIndices) {
      return this.dimIndices[entryIndex] !== 0;
    }
    return false;
  }
  /**
   * Returns true only if dimming is active, but not for this specific entry.
   * Also checks `dimShouldOutlineUndimmedEntries`.
   */
  #shouldOutlineEvent(entryIndex) {
    if (!this.isDimming() || this.#shouldDimEvent(entryIndex)) {
      return false;
    }
    if (ArrayBuffer.isView(this.dimShouldOutlineUndimmedEntries)) {
      return this.dimShouldOutlineUndimmedEntries[entryIndex] !== 0;
    }
    return this.dimShouldOutlineUndimmedEntries;
  }
  /**
   * Returns a contiguous boolean array for quick lookup during drawing.
   */
  #createTypedIndexArray(indices, inclusive) {
    const typedIndices = new Uint8Array(this.rawTimelineDataLength);
    if (inclusive) {
      for (const index of indices) {
        typedIndices[index] = 1;
      }
    } else {
      typedIndices.fill(1);
      for (const index of indices) {
        typedIndices[index] = 0;
      }
    }
    return typedIndices;
  }
  enableDimming(entryIndices, inclusive, outline) {
    this.dimIndices = this.#createTypedIndexArray(entryIndices, inclusive);
    this.dimShouldOutlineUndimmedEntries = Array.isArray(outline) ? this.#createTypedIndexArray(outline, true) : outline;
    this.draw();
  }
  disableDimming() {
    this.dimIndices = null;
    this.dimShouldOutlineUndimmedEntries = false;
    this.draw();
  }
  isDimming() {
    return Boolean(this.dimIndices);
  }
  #transformColor(entryIndex, color) {
    if (this.#shouldDimEvent(entryIndex)) {
      let dimmed = this.colorDimmingCache.get(color);
      if (dimmed) {
        return dimmed;
      }
      const parsedColor = Common.Color.parse(color);
      dimmed = parsedColor ? parsedColor.asLegacyColor().grayscale().asString() : "lightgrey";
      this.colorDimmingCache.set(color, dimmed);
      return dimmed;
    }
    return color;
  }
  getColorForEntry(entryIndex) {
    if (!this.entryColorsCache) {
      return "";
    }
    return this.#transformColor(entryIndex, this.entryColorsCache[entryIndex]);
  }
  highlightEntry(entryIndex) {
    if (this.highlightedEntryIndex === entryIndex) {
      return;
    }
    if (!this.dataProvider.entryColor(entryIndex)) {
      return;
    }
    this.highlightedEntryIndex = entryIndex;
    this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
    this.dispatchEventToListeners("EntryHovered", entryIndex);
  }
  hideHighlight() {
    if (this.#searchResultEntryIndex === null) {
      this.popoverElement.removeChildren();
      this.lastPopoverState = {
        entryIndex: -1,
        groupIndex: -1,
        hiddenEntriesPopover: false
      };
    }
    if (this.highlightedEntryIndex === -1) {
      return;
    }
    this.highlightedEntryIndex = -1;
    this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
    this.dispatchEventToListeners("EntryHovered", -1);
  }
  createCandyStripePattern(color) {
    const size = 17;
    const candyStripeCanvas = document.createElement("canvas");
    candyStripeCanvas.width = size;
    candyStripeCanvas.height = size;
    const ctx = candyStripeCanvas.getContext("2d", { willReadFrequently: true });
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(Math.PI * 0.25);
    ctx.translate(-size * 0.5, -size * 0.5);
    ctx.fillStyle = color;
    for (let x = -size; x < size * 2; x += 3) {
      ctx.fillRect(x, -size, 1, size * 3);
    }
    return ctx.createPattern(candyStripeCanvas, "repeat");
  }
  resetCanvas() {
    const ratio = window.devicePixelRatio;
    const width = Math.round(this.offsetWidth * ratio);
    const height = Math.round(this.offsetHeight * ratio);
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width / ratio}px`;
    this.canvas.style.height = `${height / ratio}px`;
  }
  windowChanged(startTime, endTime, animate) {
    this.flameChartDelegate.windowChanged(startTime, endTime, animate);
  }
  updateRangeSelection(startTime, endTime) {
    this.flameChartDelegate.updateRangeSelection(startTime, endTime);
  }
  setSize(width, height) {
    this.offsetWidth = width;
    this.offsetHeight = height;
  }
  startDragging(event) {
    this.hideHighlight();
    this.maxDragOffset = 0;
    this.dragStartX = event.pageX;
    this.dragStartY = event.pageY;
    return true;
  }
  dragging(event) {
    const dx = event.pageX - this.dragStartX;
    const dy = event.pageY - this.dragStartY;
    this.maxDragOffset = Math.max(this.maxDragOffset, Math.sqrt(dx * dx + dy * dy));
  }
  endDragging(_event) {
    this.updateHighlight();
  }
  timelineData(rebuild) {
    if (!this.dataProvider) {
      return null;
    }
    const timelineData = this.dataProvider.timelineData(rebuild);
    if (timelineData !== this.rawTimelineData || timelineData && timelineData.entryStartTimes.length !== this.rawTimelineDataLength) {
      this.processTimelineData(timelineData);
    }
    return this.rawTimelineData || null;
  }
  revealEntryVertically(entryIndex) {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const level = timelineData.entryLevels[entryIndex];
    this.chartViewport.setScrollOffset(this.levelToOffset(level), this.levelHeight(level), true);
  }
  revealEntry(entryIndex) {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const timeLeft = this.chartViewport.windowLeftTime();
    const timeRight = this.chartViewport.windowRightTime();
    const entryStartTime = timelineData.entryStartTimes[entryIndex];
    let entryTotalTime = timelineData.entryTotalTimes[entryIndex];
    if (Number.isNaN(entryTotalTime)) {
      entryTotalTime = 1;
    }
    const entryEndTime = entryStartTime + entryTotalTime;
    let minEntryTimeWindow = Math.min(entryTotalTime, timeRight - timeLeft);
    const level = timelineData.entryLevels[entryIndex];
    this.chartViewport.setScrollOffset(this.levelToOffset(level), this.levelHeight(level));
    const minVisibleWidthPx = 30;
    const futurePixelToTime = (timeRight - timeLeft) / this.offsetWidth;
    minEntryTimeWindow = Math.max(minEntryTimeWindow, futurePixelToTime * minVisibleWidthPx);
    if (timeLeft > entryEndTime) {
      const delta = timeLeft - entryEndTime + minEntryTimeWindow;
      this.windowChanged(
        timeLeft - delta,
        timeRight - delta,
        /* animate */
        true
      );
    } else if (timeRight < entryStartTime) {
      const delta = entryStartTime - timeRight + minEntryTimeWindow;
      this.windowChanged(
        timeLeft + delta,
        timeRight + delta,
        /* animate */
        true
      );
    }
  }
  setWindowTimes(startTime, endTime, animate) {
    this.chartViewport.setWindowTimes(startTime, endTime, animate);
    this.updateHighlight();
  }
  /**
   * Handle the mouse move event. The handle priority will be:
   *   1. Track configuration icons -> show tooltip for the icons
   *   2. Inside a track header -> mouse style will be a "pointer", indicating track can be focused
   *   3. Inside a track -> update the highlight of hovered event
   */
  onMouseMove(mouseEvent) {
    this.#searchResultEntryIndex = null;
    this.lastMouseOffsetX = mouseEvent.offsetX;
    this.lastMouseOffsetY = mouseEvent.offsetY;
    if (!this.enabled()) {
      return;
    }
    if (this.chartViewport.isDragging()) {
      return;
    }
    const timeMilliSeconds = Trace.Types.Timing.Milli(this.chartViewport.pixelToTime(mouseEvent.offsetX));
    this.dispatchEventToListeners("MouseMove", {
      mouseEvent,
      timeInMicroSeconds: Trace.Helpers.Timing.milliToMicro(timeMilliSeconds)
    });
    const { groupIndex, hoverType } = this.coordinatesToGroupIndexAndHoverType(mouseEvent.offsetX, mouseEvent.offsetY);
    switch (hoverType) {
      case "TRACK_CONFIG_UP_BUTTON":
      case "TRACK_CONFIG_DOWN_BUTTON":
      case "TRACK_CONFIG_HIDE_BUTTON":
      case "TRACK_CONFIG_SHOW_BUTTON": {
        this.hideHighlight();
        this.viewportElement.style.cursor = "pointer";
        const iconTooltipElement = this.#prepareIconInfo(groupIndex, hoverType);
        if (iconTooltipElement) {
          this.popoverElement.appendChild(iconTooltipElement);
          this.updatePopoverOffset();
        }
        return;
      }
      case "INSIDE_TRACK_HEADER":
        this.updateHighlight();
        this.viewportElement.style.cursor = "pointer";
        return;
      case "INSIDE_TRACK":
      case "OUTSIDE_TRACKS":
        this.updateHighlight();
        return;
      case "ERROR":
        return;
      default:
        Platform3.assertNever(hoverType, `Invalid hovering type: ${hoverType}`);
    }
  }
  #prepareIconInfo(groupIndex, iconType) {
    const group = this.rawTimelineData?.groups[groupIndex];
    if (!group) {
      return null;
    }
    const maxTitleChars = 20;
    const displayName = Platform3.StringUtilities.trimMiddle(group.name, maxTitleChars);
    let iconTooltip = "";
    switch (iconType) {
      case "TRACK_CONFIG_UP_BUTTON":
        iconTooltip = `Move ${displayName} track up`;
        break;
      case "TRACK_CONFIG_DOWN_BUTTON":
        iconTooltip = `Move ${displayName} track down`;
        break;
      case "TRACK_CONFIG_HIDE_BUTTON":
        if (this.groupIsLastVisibleTopLevel(groupIndex)) {
          iconTooltip = "Can not hide the last top level track";
        } else {
          iconTooltip = `Hide ${displayName} track`;
        }
        break;
      case "TRACK_CONFIG_SHOW_BUTTON":
        iconTooltip = `Show ${displayName} track`;
        break;
      default:
        return null;
    }
    const element = document.createElement("div");
    element.createChild("span", "popoverinfo-title").textContent = iconTooltip;
    return element;
  }
  updateHighlight() {
    const entryIndex = this.coordinatesToEntryIndex(this.lastMouseOffsetX, this.lastMouseOffsetY);
    this.updateHiddenChildrenArrowHighlighPosition(entryIndex);
    if (entryIndex === -1) {
      this.hideHighlight();
      const { groupIndex, hoverType } = this.coordinatesToGroupIndexAndHoverType(this.lastMouseOffsetX, this.lastMouseOffsetY);
      if (hoverType === "INSIDE_TRACK_HEADER") {
        this.#updatePopoverForGroup(groupIndex);
      }
      if (groupIndex >= 0 && this.rawTimelineData?.groups?.[groupIndex].selectable) {
        this.viewportElement.style.cursor = "pointer";
      } else {
        this.viewportElement.style.cursor = "default";
      }
      return;
    }
    if (this.chartViewport.isDragging()) {
      return;
    }
    this.#updatePopoverForEntry(entryIndex);
    this.viewportElement.style.cursor = this.dataProvider.canJumpToEntry(entryIndex) ? "pointer" : "default";
    this.highlightEntry(entryIndex);
  }
  onMouseOut() {
    this.lastMouseOffsetX = -1;
    this.lastMouseOffsetY = -1;
    this.hideHighlight();
  }
  showPopoverForSearchResult(selectedSearchResult) {
    this.#searchResultEntryIndex = selectedSearchResult;
    this.#updatePopoverForEntry(selectedSearchResult);
  }
  #updatePopoverForEntry(entryIndex) {
    const isMouseOverRevealChildrenArrow = entryIndex !== null && this.isMouseOverRevealChildrenArrow(this.lastMouseOffsetX, entryIndex);
    if (entryIndex === this.lastPopoverState.entryIndex && isMouseOverRevealChildrenArrow === this.lastPopoverState.hiddenEntriesPopover) {
      return this.updatePopoverOffset();
    }
    const data = this.timelineData();
    if (!data) {
      return;
    }
    const group = data.groups.at(this.selectedGroupIndex);
    const popoverElement = isMouseOverRevealChildrenArrow && group ? this.dataProvider.preparePopoverForCollapsedArrow?.(entryIndex) : entryIndex !== null && this.dataProvider.preparePopoverElement(entryIndex);
    if (popoverElement) {
      this.updatePopoverContents(popoverElement);
    }
    this.lastPopoverState = {
      entryIndex,
      groupIndex: -1,
      hiddenEntriesPopover: isMouseOverRevealChildrenArrow
    };
  }
  updatePopoverContents(popoverElement) {
    this.popoverElement.removeChildren();
    this.popoverElement.appendChild(popoverElement);
    this.updatePopoverOffset();
    this.lastPopoverState.entryIndex = -1;
  }
  updateMouseOffset(mouseX, mouseY) {
    this.lastMouseOffsetX = mouseX;
    this.lastMouseOffsetY = mouseY;
  }
  #updatePopoverForGroup(groupIndex) {
    if (groupIndex === this.lastPopoverState.groupIndex) {
      return this.updatePopoverOffset();
    }
    this.popoverElement.removeChildren();
    const data = this.timelineData();
    if (!data) {
      return;
    }
    const group = data.groups.at(groupIndex);
    if (group?.description) {
      this.popoverElement.innerText = group?.description;
      this.updatePopoverOffset();
    }
    this.lastPopoverState = {
      groupIndex,
      entryIndex: -1,
      hiddenEntriesPopover: false
    };
  }
  updatePopoverOffset() {
    let mouseX = this.lastMouseOffsetX;
    let mouseY = this.lastMouseOffsetY;
    if (this.#searchResultEntryIndex !== null) {
      const coordinate = this.entryIndexToCoordinates(this.selectedEntryIndex);
      const { x: canvasViewportOffsetX, y: canvasViewportOffsetY } = this.canvas.getBoundingClientRect();
      mouseX = coordinate?.x ? coordinate.x - canvasViewportOffsetX : mouseX;
      mouseY = coordinate?.y ? coordinate.y - canvasViewportOffsetY : mouseY;
    }
    const parentWidth = this.popoverElement.parentElement ? this.popoverElement.parentElement.clientWidth : 0;
    const parentHeight = this.popoverElement.parentElement ? this.popoverElement.parentElement.clientHeight : 0;
    const infoWidth = this.popoverElement.clientWidth;
    const infoHeight = this.popoverElement.clientHeight;
    const offsetX = 10;
    const offsetY = 6 + this.#tooltipPopoverYAdjustment;
    let x;
    let y;
    for (let pass = 0; pass < 2; ++pass) {
      for (let quadrant = 0; quadrant < 4; ++quadrant) {
        const dx = quadrant & 2 ? -offsetX - infoWidth : offsetX;
        const dy = quadrant & 1 ? -offsetY - infoHeight : offsetY;
        x = Platform3.NumberUtilities.clamp(mouseX + dx, 0, parentWidth - infoWidth);
        y = Platform3.NumberUtilities.clamp(mouseY + dy, 0, parentHeight - infoHeight);
        const popoverFits = pass === 0 ? (
          // Will the whole popover be visible?
          (x >= mouseX || mouseX >= x + infoWidth) && (y >= mouseY || mouseY >= y + infoHeight)
        ) : (
          // Will the popover fit well in 1 dimension? (Though we typically see it fit in both, here. Shrug.)
          x >= mouseX || mouseX >= x + infoWidth || y >= mouseY || mouseY >= y + infoHeight
        );
        if (popoverFits) {
          break;
        }
      }
    }
    this.popoverElement.style.left = x + "px";
    this.popoverElement.style.top = y + "px";
  }
  /**
   * Handle double mouse click event in flame chart.
   */
  #onDblClick(mouseEvent) {
    this.focus();
    const { groupIndex } = this.coordinatesToGroupIndexAndHoverType(mouseEvent.offsetX, mouseEvent.offsetY);
    if (this.highlightedEntryIndex !== -1) {
      this.#selectGroup(groupIndex);
      this.dispatchEventToListeners("EntryLabelAnnotationAdded", { entryIndex: this.highlightedEntryIndex, withLinkCreationButton: true });
      const flameChartView = this.flameChartDelegate.containingElement?.();
      if (flameChartView) {
        VisualLogging.logClick(flameChartView, mouseEvent, { doubleClick: true });
      }
    }
  }
  /**
   * Handle mouse click event in flame chart
   *
   * And the handle priority will be:
   * 1. Track configuration icons -> Config a track
   * 1.1 if it's edit mode ignore others.
   * 2. Inside a track header -> Select and Expand/Collapse a track
   * 3. Inside a track -> Select a track
   * 3.1 shift + click -> Select the time range of clicked event
   * 3.2 click -> update highlight (handle in other functions)
   */
  onClick(mouseEvent) {
    this.focus();
    const clickThreshold = 5;
    if (this.maxDragOffset > clickThreshold) {
      return;
    }
    const { groupIndex, hoverType } = this.coordinatesToGroupIndexAndHoverType(mouseEvent.offsetX, mouseEvent.offsetY);
    switch (hoverType) {
      case "TRACK_CONFIG_UP_BUTTON":
        this.moveGroupUp(groupIndex);
        return;
      case "TRACK_CONFIG_DOWN_BUTTON":
        this.moveGroupDown(groupIndex);
        return;
      case "TRACK_CONFIG_HIDE_BUTTON":
        if (this.groupIsLastVisibleTopLevel(groupIndex)) {
          return;
        }
        this.hideGroup(groupIndex);
        return;
      case "TRACK_CONFIG_SHOW_BUTTON":
        this.showGroup(groupIndex);
        return;
      case "INSIDE_TRACK_HEADER":
        this.#selectGroup(groupIndex);
        this.toggleGroupExpand(groupIndex);
        return;
      case "INSIDE_TRACK":
      case "OUTSIDE_TRACKS": {
        this.#selectGroup(groupIndex);
        const timelineData = this.timelineData();
        if (mouseEvent.shiftKey && this.highlightedEntryIndex !== -1 && timelineData) {
          const start = timelineData.entryStartTimes[this.highlightedEntryIndex];
          const end = start + timelineData.entryTotalTimes[this.highlightedEntryIndex];
          this.chartViewport.setRangeSelection(start, end);
        } else {
          this.chartViewport.onClick(mouseEvent);
          this.dispatchEventToListeners("EntryInvoked", this.highlightedEntryIndex);
        }
        return;
      }
    }
  }
  setLinkSelectionAnnotationIsInProgress(inProgress) {
    this.#linkSelectionAnnotationIsInProgress = inProgress;
  }
  #selectGroup(groupIndex) {
    if (groupIndex < 0 || this.selectedGroupIndex === groupIndex) {
      return;
    }
    if (!this.rawTimelineData) {
      return;
    }
    const groups = this.rawTimelineData.groups;
    if (!groups) {
      return;
    }
    this.keyboardFocusedGroup = groupIndex;
    if (!this.#linkSelectionAnnotationIsInProgress) {
      this.scrollGroupIntoView(groupIndex);
    }
    const groupName = groups[groupIndex].name;
    if (!groups[groupIndex].selectable) {
      this.deselectAllGroups();
      UI2.ARIAUtils.LiveAnnouncer.alert(i18nString2(UIStrings2.sHovered, { PH1: groupName }));
    } else {
      this.selectedGroupIndex = groupIndex;
      this.flameChartDelegate.updateSelectedGroup(this, groups[groupIndex]);
      this.draw();
      UI2.ARIAUtils.LiveAnnouncer.alert(i18nString2(UIStrings2.sSelected, { PH1: groupName }));
    }
  }
  deselectAllGroups() {
    this.selectedGroupIndex = -1;
    this.flameChartDelegate.updateSelectedGroup(this, null);
    this.draw();
  }
  deselectAllEntries() {
    this.selectedEntryIndex = -1;
    this.rawTimelineData?.emptyInitiators();
    this.draw();
  }
  isGroupFocused(index) {
    return index === this.selectedGroupIndex || index === this.keyboardFocusedGroup;
  }
  scrollGroupIntoView(index) {
    if (index < 0) {
      return;
    }
    if (!this.rawTimelineData) {
      return;
    }
    const groups = this.rawTimelineData.groups;
    const groupOffsets = this.groupOffsets;
    if (!groupOffsets || !groups) {
      return;
    }
    const groupTop = groupOffsets[index];
    let nextOffset = groupOffsets[index + 1];
    if (index === groups.length - 1) {
      nextOffset += groups[index].style.padding;
    }
    const scrollTop = index === 0 ? 0 : groupTop;
    const scrollHeight = Math.min(nextOffset - scrollTop, this.chartViewport.chartHeight());
    this.chartViewport.setScrollOffset(scrollTop, scrollHeight);
  }
  /**
   * Toggle a group's expanded state.
   * @param groupIndex the index of this group in the timelineData.groups
   * array. Note that this is the array index, and not the startLevel of the
   * group.
   */
  toggleGroupExpand(groupIndex) {
    if (groupIndex < 0 || !this.isGroupCollapsible(groupIndex)) {
      return;
    }
    if (!this.rawTimelineData?.groups) {
      return;
    }
    this.expandGroup(
      groupIndex,
      !this.rawTimelineData.groups[groupIndex].expanded
      /* setExpanded */
    );
  }
  expandGroup(groupIndex, setExpanded = true, propagatedExpand = false) {
    if (groupIndex < 0 || !this.isGroupCollapsible(groupIndex)) {
      return;
    }
    if (!this.rawTimelineData) {
      return;
    }
    const groups = this.rawTimelineData.groups;
    if (!groups) {
      return;
    }
    const group = groups[groupIndex];
    group.expanded = setExpanded;
    this.updateLevelPositions();
    this.updateHighlight();
    if (!group.expanded) {
      const timelineData = this.timelineData();
      if (timelineData) {
        const level = timelineData.entryLevels[this.selectedEntryIndex];
        if (this.selectedEntryIndex >= 0 && level >= group.startLevel && (groupIndex >= groups.length - 1 || groups[groupIndex + 1].startLevel > level)) {
          this.selectedEntryIndex = -1;
          this.rawTimelineData.emptyInitiators();
        }
      }
    }
    this.updateHeight();
    this.draw();
    this.#notifyProviderOfConfigurationChange();
    this.scrollGroupIntoView(groupIndex);
    if (!propagatedExpand) {
      const groupName = groups[groupIndex].name;
      const content = group.expanded ? i18nString2(UIStrings2.sExpanded, { PH1: groupName }) : i18nString2(UIStrings2.sCollapsed, { PH1: groupName });
      UI2.ARIAUtils.LiveAnnouncer.alert(content);
    }
  }
  moveGroupUp(groupIndex) {
    if (groupIndex < 0) {
      return;
    }
    if (!this.rawTimelineData?.groups) {
      return;
    }
    if (!this.#groupTreeRoot) {
      return;
    }
    for (let i = 0; i < this.#groupTreeRoot.children.length; i++) {
      const child = this.#groupTreeRoot.children[i];
      if (child.index === groupIndex) {
        if (i >= 1) {
          this.#groupTreeRoot.children[i] = this.#groupTreeRoot.children[i - 1];
          this.#groupTreeRoot.children[i - 1] = child;
          break;
        }
      }
    }
    this.updateLevelPositions();
    this.updateHighlight();
    this.updateHeight();
    this.draw();
    this.#notifyProviderOfConfigurationChange();
  }
  #notifyProviderOfConfigurationChange() {
    if (!this.#groupTreeRoot) {
      return;
    }
    if (!this.dataProvider.handleTrackConfigurationChange) {
      return;
    }
    const groups = this.rawTimelineData?.groups;
    if (!groups) {
      return;
    }
    const sortedGroupIndexes = this.#getVisualOrderOfGroupIndexes(this.#groupTreeRoot);
    this.dataProvider.handleTrackConfigurationChange(groups, sortedGroupIndexes);
  }
  /**
   * Walks the tree in DFS to generate the visual order of the groups.
   */
  #getVisualOrderOfGroupIndexes(root) {
    const sortedGroupIndexes = [];
    function traverse(node) {
      if (node.index !== -1) {
        sortedGroupIndexes.push(node.index);
      }
      for (const child of node.children) {
        traverse(child);
      }
    }
    traverse(root);
    return sortedGroupIndexes;
  }
  moveGroupDown(groupIndex) {
    if (groupIndex < 0) {
      return;
    }
    if (!this.rawTimelineData?.groups) {
      return;
    }
    if (!this.#groupTreeRoot) {
      return;
    }
    for (let i = 0; i < this.#groupTreeRoot.children.length; i++) {
      const child = this.#groupTreeRoot.children[i];
      if (child.index === groupIndex) {
        if (i <= this.#groupTreeRoot.children.length - 2) {
          this.#groupTreeRoot.children[i] = this.#groupTreeRoot.children[i + 1];
          this.#groupTreeRoot.children[i + 1] = child;
          break;
        }
      }
    }
    this.updateLevelPositions();
    this.updateHighlight();
    this.updateHeight();
    this.draw();
    this.#notifyProviderOfConfigurationChange();
  }
  hideGroup(groupIndex) {
    this.#toggleGroupHiddenState(
      groupIndex,
      /* hidden= */
      true
    );
  }
  showGroup(groupIndex) {
    this.#toggleGroupHiddenState(
      groupIndex,
      /* hidden= */
      false
    );
  }
  showAllGroups() {
    if (!this.rawTimelineData?.groups) {
      return;
    }
    for (const group of this.rawTimelineData.groups) {
      group.hidden = false;
    }
    this.updateLevelPositions();
    this.updateHighlight();
    this.updateHeight();
    this.draw();
    this.#notifyProviderOfConfigurationChange();
    this.scrollGroupIntoView(0);
  }
  #toggleGroupHiddenState(groupIndex, hidden) {
    if (groupIndex < 0) {
      return;
    }
    if (!this.rawTimelineData?.groups) {
      return;
    }
    const groups = this.rawTimelineData.groups;
    if (!groups) {
      return;
    }
    const group = groups[groupIndex];
    group.hidden = hidden;
    this.updateLevelPositions();
    this.updateHighlight();
    this.updateHeight();
    this.draw();
    this.#notifyProviderOfConfigurationChange();
  }
  modifyTree(treeAction, index) {
    const data = this.timelineData();
    if (!data || !this.dataProvider.modifyTree) {
      return;
    }
    this.dataProvider.modifyTree(treeAction, index);
    this.update();
  }
  #buildEnterEditModeContextMenu(event) {
    if (this.#inTrackConfigEditMode) {
      return;
    }
    this.contextMenu = new UI2.ContextMenu.ContextMenu(event);
    const label = i18nString2(UIStrings2.enterTrackConfigurationMode);
    this.contextMenu.defaultSection().appendItem(label, () => {
      this.enterTrackConfigurationMode();
    }, {
      jslogContext: "track-configuration-enter"
    });
    void this.contextMenu.show();
  }
  #buildExitEditModeContextMenu(event) {
    if (this.#inTrackConfigEditMode === false) {
      return;
    }
    this.contextMenu = new UI2.ContextMenu.ContextMenu(event);
    const label = i18nString2(UIStrings2.exitTrackConfigurationMode);
    this.contextMenu.defaultSection().appendItem(label, () => {
      this.#exitEditMode();
    }, {
      jslogContext: "track-configuration-exit"
    });
    void this.contextMenu.show();
  }
  #hasTrackConfigurationMode() {
    return Boolean(this.dataProvider.hasTrackConfigurationMode?.());
  }
  onContextMenu(event) {
    const { groupIndex, hoverType } = this.coordinatesToGroupIndexAndHoverType(event.offsetX, event.offsetY);
    if (this.#inTrackConfigEditMode) {
      this.#buildExitEditModeContextMenu(event);
      return;
    }
    if (hoverType === "INSIDE_TRACK_HEADER" && this.#hasTrackConfigurationMode()) {
      this.#buildEnterEditModeContextMenu(event);
    }
    const isFakedFromKeyboardPress = event.detail === KEYBOARD_FAKED_CONTEXT_MENU_DETAIL;
    const entryIndexToUse = isFakedFromKeyboardPress ? this.selectedEntryIndex : this.highlightedEntryIndex;
    if (entryIndexToUse === -1) {
      return;
    }
    if (!isFakedFromKeyboardPress) {
      this.dispatchEventToListeners("EntryInvoked", entryIndexToUse);
      this.setSelectedEntry(entryIndexToUse);
      this.#selectGroup(groupIndex);
    }
    this.contextMenu = this.dataProvider.customizedContextMenu?.(event, this.selectedEntryIndex, groupIndex) ?? new UI2.ContextMenu.ContextMenu(event);
    const annotationSection = this.contextMenu.annotationSection();
    annotationSection.appendItem(i18nString2(UIStrings2.labelEntry), () => {
      this.dispatchEventToListeners("EntryLabelAnnotationAdded", { entryIndex: this.selectedEntryIndex, withLinkCreationButton: false });
    }, {
      jslogContext: "timeline.annotations.create-entry-label"
    });
    annotationSection.appendItem(i18nString2(UIStrings2.linkEntries), () => {
      this.dispatchEventToListeners("EntriesLinkAnnotationCreated", { entryFromIndex: this.selectedEntryIndex });
    }, {
      jslogContext: "timeline.annotations.create-entries-link"
    });
    void this.contextMenu.show();
  }
  #handleFlameChartTransformEvent(event) {
    if (this.selectedEntryIndex === -1) {
      return;
    }
    this.dataProvider.handleFlameChartTransformKeyboardEvent?.(event, this.selectedEntryIndex, this.selectedGroupIndex);
  }
  /**
   * Triggers a context menu as if the user had clicked on the selected entry.
   * To do this we calculate the (x, y) of the selected entry, and create a
   * fake mouse event to pretend the user has clicked on that coordinate.
   * We then dispatch the event as a "contextmenu" event, thus triggering the
   * usual contextmenu code path.
   */
  #triggerContextMenuFromKeyPress() {
    const startTime = this.timelineData()?.entryStartTimes[this.selectedEntryIndex];
    const level = this.timelineData()?.entryLevels[this.selectedEntryIndex];
    if (!startTime || !level) {
      return;
    }
    const boundingRect = this.canvasBoundingClientRect();
    if (!boundingRect) {
      return;
    }
    const x = this.chartViewport.timeToPosition(startTime) + boundingRect.left;
    const y = this.levelToOffset(level) - this.getScrollOffset() + boundingRect.top;
    const event = new MouseEvent("contextmenu", { clientX: x, clientY: y, detail: KEYBOARD_FAKED_CONTEXT_MENU_DETAIL });
    this.canvas.dispatchEvent(event);
  }
  onKeyDown(e) {
    if (UI2.KeyboardShortcut.KeyboardShortcut.hasAtLeastOneModifier(e) || !this.timelineData()) {
      return;
    }
    if (e.key === " " && this.selectedEntryIndex > -1) {
      this.#triggerContextMenuFromKeyPress();
    }
    let eventHandled = this.handleSelectionNavigation(e);
    if (!eventHandled && this.rawTimelineData?.groups) {
      eventHandled = this.handleKeyboardGroupNavigation(e);
    }
    if (!eventHandled) {
      this.#handleFlameChartTransformEvent(e);
    }
  }
  bindCanvasEvent(eventName, onEvent) {
    this.canvas.addEventListener(eventName, onEvent);
  }
  drawTrackOnCanvas(trackName, context, minWidth) {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return null;
    }
    const canvasWidth = this.offsetWidth;
    const canvasHeight = this.offsetHeight;
    context.save();
    const ratio = window.devicePixelRatio;
    context.scale(ratio, ratio);
    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.font = this.#font;
    const groups = this.rawTimelineData?.groups || [];
    const groupOffsets = this.groupOffsets;
    if (!groups.length || !groupOffsets) {
      return null;
    }
    const trackIndex = groups.findIndex((g) => g.name.includes(trackName));
    if (trackIndex < 0) {
      return null;
    }
    this.scrollGroupIntoView(trackIndex);
    const group = groups[trackIndex];
    const startLevel = group.startLevel;
    const endLevel = groups[trackIndex + 1].startLevel;
    const groupTop = groupOffsets[trackIndex];
    const nextOffset = groupOffsets[trackIndex + 1];
    const { drawBatches, titleIndices } = this.getDrawBatches(context, timelineData);
    const entryIndexIsInTrack = (index) => {
      const barWidth = Math.min(this.#eventBarWidth(timelineData, index), canvasWidth);
      return timelineData.entryLevels[index] >= startLevel && timelineData.entryLevels[index] < endLevel && barWidth > minWidth;
    };
    let allFilteredIndexes = [];
    for (const [{ color, outline }, { indexes }] of drawBatches) {
      const filteredIndexes = indexes.filter(entryIndexIsInTrack);
      allFilteredIndexes = [...allFilteredIndexes, ...filteredIndexes];
      this.#drawBatchEvents(context, timelineData, color, filteredIndexes, outline);
    }
    const filteredTitleIndices = titleIndices.filter(entryIndexIsInTrack);
    this.drawEventTitles(context, timelineData, filteredTitleIndices, canvasWidth);
    context.restore();
    return {
      top: groupOffsets[trackIndex],
      height: nextOffset - groupTop,
      visibleEntries: new Set(allFilteredIndexes)
    };
  }
  handleKeyboardGroupNavigation(event) {
    const keyboardEvent = event;
    let handled = false;
    let entrySelected = false;
    if (keyboardEvent.code === "ArrowUp") {
      handled = this.selectPreviousGroup();
    } else if (keyboardEvent.code === "ArrowDown") {
      handled = this.selectNextGroup();
    } else if (keyboardEvent.code === "ArrowLeft") {
      if (this.keyboardFocusedGroup >= 0) {
        this.expandGroup(
          this.keyboardFocusedGroup,
          false
          /* setExpanded */
        );
        handled = true;
      }
    } else if (keyboardEvent.code === "ArrowRight") {
      if (this.keyboardFocusedGroup >= 0) {
        this.expandGroup(
          this.keyboardFocusedGroup,
          true
          /* setExpanded */
        );
        this.selectFirstChild();
        handled = true;
      }
    } else if (keyboardEvent.key === "Enter") {
      entrySelected = this.selectFirstEntryInCurrentGroup();
      handled = entrySelected;
    }
    if (handled && !entrySelected) {
      this.deselectAllEntries();
    }
    if (handled) {
      keyboardEvent.consume(true);
    }
    return handled;
  }
  /**
   * Used when the user presses "enter" when a group is selected, so that we
   * move their selection into an event in the group.
   */
  selectFirstEntryInCurrentGroup() {
    if (!this.rawTimelineData) {
      return false;
    }
    const allGroups = this.rawTimelineData.groups;
    if (this.keyboardFocusedGroup < 0 || !allGroups) {
      return false;
    }
    const group = allGroups[this.keyboardFocusedGroup];
    const startLevelInGroup = group.startLevel;
    if (startLevelInGroup < 0) {
      return false;
    }
    if (this.keyboardFocusedGroup < allGroups.length - 1 && allGroups[this.keyboardFocusedGroup + 1].startLevel === startLevelInGroup) {
      return false;
    }
    if (!this.timelineLevels) {
      return false;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return false;
    }
    const minDurationOfFirstEntry = Trace.Types.Timing.Milli(1);
    let firstEntryIndex = this.timelineLevels[startLevelInGroup].find((i) => {
      const duration = timelineData.entryTotalTimes[i];
      return !Number.isNaN(duration) && duration >= minDurationOfFirstEntry;
    });
    if (typeof firstEntryIndex === "undefined") {
      firstEntryIndex = this.timelineLevels[startLevelInGroup][0];
    }
    this.expandGroup(
      this.keyboardFocusedGroup,
      true
      /* setExpanded */
    );
    const eventName = this.dataProvider.entryTitle(firstEntryIndex);
    if (eventName) {
      UI2.ARIAUtils.LiveAnnouncer.alert(i18nString2(UIStrings2.eventSelectedFromGroup, {
        PH1: eventName,
        PH2: group.name
      }));
    }
    this.setSelectedEntry(firstEntryIndex);
    return true;
  }
  selectPreviousGroup() {
    if (this.keyboardFocusedGroup <= 0) {
      return false;
    }
    const groupIndexToSelect = this.getGroupIndexToSelect(
      -1
      /* offset */
    );
    this.#selectGroup(groupIndexToSelect);
    return true;
  }
  selectNextGroup() {
    if (!this.rawTimelineData?.groups) {
      return false;
    }
    if (this.keyboardFocusedGroup >= this.rawTimelineData.groups.length - 1) {
      return false;
    }
    const groupIndexToSelect = this.getGroupIndexToSelect(
      1
      /* offset */
    );
    this.#selectGroup(groupIndexToSelect);
    return true;
  }
  getGroupIndexToSelect(offset) {
    if (!this.rawTimelineData?.groups) {
      throw new Error("No raw timeline data");
    }
    const allGroups = this.rawTimelineData.groups;
    let groupIndexToSelect = this.keyboardFocusedGroup;
    let groupName, groupWithSubNestingLevel;
    do {
      groupIndexToSelect += offset;
      groupName = this.rawTimelineData.groups[groupIndexToSelect].name;
      groupWithSubNestingLevel = this.keyboardFocusedGroup !== -1 && allGroups[groupIndexToSelect].style.nestingLevel > allGroups[this.keyboardFocusedGroup].style.nestingLevel;
    } while (groupIndexToSelect > 0 && groupIndexToSelect < allGroups.length - 1 && (!groupName || groupWithSubNestingLevel));
    return groupIndexToSelect;
  }
  selectFirstChild() {
    if (!this.rawTimelineData?.groups) {
      return;
    }
    const allGroups = this.rawTimelineData.groups;
    if (this.keyboardFocusedGroup < 0 || this.keyboardFocusedGroup >= allGroups.length - 1) {
      return;
    }
    const groupIndexToSelect = this.keyboardFocusedGroup + 1;
    if (allGroups[groupIndexToSelect].style.nestingLevel > allGroups[this.keyboardFocusedGroup].style.nestingLevel) {
      this.#selectGroup(groupIndexToSelect);
    }
  }
  handleSelectionNavigation(event) {
    if (this.selectedEntryIndex === -1) {
      return false;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return false;
    }
    function timeComparator(time, entryIndex) {
      if (!timelineData) {
        throw new Error("No timeline data");
      }
      return time - timelineData.entryStartTimes[entryIndex];
    }
    function entriesIntersect(entry1, entry2) {
      if (!timelineData) {
        throw new Error("No timeline data");
      }
      const start1 = timelineData.entryStartTimes[entry1];
      const start2 = timelineData.entryStartTimes[entry2];
      const end1 = start1 + timelineData.entryTotalTimes[entry1];
      const end2 = start2 + timelineData.entryTotalTimes[entry2];
      return start1 < end2 && start2 < end1;
    }
    const keyboardEvent = event;
    const keys = UI2.KeyboardShortcut.Keys;
    if (keyboardEvent.keyCode === keys.Left.code || keyboardEvent.keyCode === keys.Right.code) {
      const level = timelineData.entryLevels[this.selectedEntryIndex];
      const levelIndexes = this.timelineLevels ? this.timelineLevels[level] : [];
      let indexOnLevel = Platform3.ArrayUtilities.lowerBound(levelIndexes, this.selectedEntryIndex, (a, b) => a - b);
      indexOnLevel += keyboardEvent.keyCode === keys.Left.code ? -1 : 1;
      event.consume(true);
      if (indexOnLevel >= 0 && indexOnLevel < levelIndexes.length) {
        this.dispatchEventToListeners("EntrySelected", levelIndexes[indexOnLevel]);
      }
      return true;
    }
    if (keyboardEvent.keyCode === keys.Up.code || keyboardEvent.keyCode === keys.Down.code) {
      let level = timelineData.entryLevels[this.selectedEntryIndex];
      level += keyboardEvent.keyCode === keys.Up.code ? -1 : 1;
      if (level < 0 || this.timelineLevels && level >= this.timelineLevels.length) {
        this.deselectAllEntries();
        keyboardEvent.consume(true);
        return true;
      }
      const entryTime = timelineData.entryStartTimes[this.selectedEntryIndex] + timelineData.entryTotalTimes[this.selectedEntryIndex] / 2;
      const levelIndexes = this.timelineLevels ? this.timelineLevels[level] : [];
      let indexOnLevel = Platform3.ArrayUtilities.upperBound(levelIndexes, entryTime, timeComparator) - 1;
      if (!entriesIntersect(this.selectedEntryIndex, levelIndexes[indexOnLevel])) {
        ++indexOnLevel;
        if (indexOnLevel >= levelIndexes.length || !entriesIntersect(this.selectedEntryIndex, levelIndexes[indexOnLevel])) {
          if (keyboardEvent.code === "ArrowDown") {
            return false;
          }
          this.deselectAllEntries();
          keyboardEvent.consume(true);
          return true;
        }
      }
      keyboardEvent.consume(true);
      this.dispatchEventToListeners("EntrySelected", levelIndexes[indexOnLevel]);
      return true;
    }
    if (event.key === "Enter") {
      event.consume(true);
      this.dispatchEventToListeners("EntryInvoked", this.selectedEntryIndex);
      this.dispatchEventToListeners("EntryLabelAnnotationAdded", {
        entryIndex: this.selectedEntryIndex,
        withLinkCreationButton: true
      });
      return true;
    }
    return false;
  }
  /**
   * Given offset of the cursor, returns the index of the entry.
   * This function is public for test purpose.
   * @param x
   * @param y
   * @returns the index of the entry
   */
  coordinatesToEntryIndex(x, y) {
    if (x < 0 || y < 0) {
      return -1;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return -1;
    }
    y += this.chartViewport.scrollOffset();
    if (!this.visibleLevelOffsets || !this.visibleLevelHeights || !this.visibleLevels) {
      throw new Error("No visible level offsets or heights");
    }
    let cursorLevel = -1;
    for (let i = 0; i < this.dataProvider.maxStackDepth(); i++) {
      if (y >= this.visibleLevelOffsets[i] && y < this.visibleLevelOffsets[i] + (this.visibleLevels[i] ? this.visibleLevelHeights[i] : 0)) {
        cursorLevel = i;
        break;
      }
    }
    if (cursorLevel < 0 || !this.visibleLevels[cursorLevel]) {
      return -1;
    }
    const offsetFromLevel = y - this.visibleLevelOffsets[cursorLevel];
    if (offsetFromLevel > this.levelHeight(cursorLevel)) {
      return -1;
    }
    for (const [index, pos] of this.customDrawnPositions) {
      if (timelineData.entryLevels[index] !== cursorLevel) {
        continue;
      }
      if (pos.x <= x && x < pos.x + pos.width) {
        return index;
      }
    }
    for (const [index, pos] of this.markerPositions) {
      if (timelineData.entryLevels[index] !== cursorLevel) {
        continue;
      }
      if (pos.x <= x && x < pos.x + pos.width) {
        return index;
      }
    }
    const entryStartTimes = timelineData.entryStartTimes;
    const entriesOnLevel = this.timelineLevels ? this.timelineLevels[cursorLevel] : [];
    if (!entriesOnLevel?.length) {
      return -1;
    }
    const cursorTime = this.chartViewport.pixelToTime(x);
    const indexOnLevel = Math.max(Platform3.ArrayUtilities.upperBound(entriesOnLevel, cursorTime, (time, entryIndex2) => time - entryStartTimes[entryIndex2]) - 1, 0);
    function checkEntryHit(entryIndex2) {
      if (entryIndex2 === void 0) {
        return false;
      }
      if (!timelineData) {
        return false;
      }
      const startTime = entryStartTimes[entryIndex2];
      const duration = timelineData.entryTotalTimes[entryIndex2];
      const startX = this.chartViewport.timeToPosition(startTime);
      const endX = this.chartViewport.timeToPosition(startTime + duration);
      return startX - this.hitMarginPx < x && x < endX + this.hitMarginPx;
    }
    let entryIndex = entriesOnLevel[indexOnLevel];
    if (checkEntryHit.call(this, entryIndex)) {
      return entryIndex;
    }
    entryIndex = entriesOnLevel[indexOnLevel + 1];
    if (checkEntryHit.call(this, entryIndex)) {
      return entryIndex;
    }
    return -1;
  }
  /**
   * Given an entry's index and an X coordinate of a mouse click, returns
   * whether the mouse is hovering over the arrow button that reveals hidden children
   */
  isMouseOverRevealChildrenArrow(x, index) {
    if (!this.entryHasDecoration(
      index,
      "HIDDEN_DESCENDANTS_ARROW"
      /* FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW */
    )) {
      return false;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return false;
    }
    const startTime = timelineData.entryStartTimes[index];
    const duration = timelineData.entryTotalTimes[index];
    const endX = this.chartViewport.timeToPosition(startTime + duration);
    const barHeight = this.#eventBarHeight(timelineData, index);
    const arrowWidth = barHeight;
    if (endX - arrowWidth - this.hitMarginPx < x && x < endX + this.hitMarginPx) {
      return true;
    }
    return false;
  }
  /**
   * Given an entry's index, returns its coordinates relative to the
   * viewport.
   * This function is public for test purpose.
   */
  entryIndexToCoordinates(entryIndex) {
    const timelineData = this.timelineData();
    const { x: canvasViewportOffsetX, y: canvasViewportOffsetY } = this.canvas.getBoundingClientRect();
    if (!timelineData || !this.visibleLevelOffsets) {
      return null;
    }
    const x = this.chartViewport.timeToPosition(timelineData.entryStartTimes[entryIndex]) + canvasViewportOffsetX;
    const y = this.visibleLevelOffsets[timelineData.entryLevels[entryIndex]] - this.chartViewport.scrollOffset() + canvasViewportOffsetY;
    return { x, y };
  }
  /**
   * Given an entry's index, returns its title
   */
  entryTitle(entryIndex) {
    return this.dataProvider.entryTitle(entryIndex);
  }
  /**
   * Returns the offset of the canvas relative to the viewport.
   */
  getCanvasOffset() {
    return this.canvas.getBoundingClientRect();
  }
  getCanvas() {
    return this.canvas;
  }
  /**
   * Returns the y scroll of the chart viewport.
   */
  getScrollOffset() {
    return this.chartViewport.scrollOffset();
  }
  getContextMenu() {
    return this.contextMenu;
  }
  /**
   * Given offset of the cursor, returns the index of the group and the hover type of current mouse position.
   * Will return -1 for index and HoverType.OUTSIDE_TRACKS if no group is hovered/clicked.
   * And the handle priority will be:
   * 1. Track configuration icons
   * 2. Inside a track header (track label and the expansion arrow)
   * 3. Inside a track
   * 4. Outside all tracks
   *
   * This function is public for test purpose.
   * @param x
   * @param y
   * @returns the index of the group and the button user clicked. If there is no button the button type will be
   * undefined.
   */
  coordinatesToGroupIndexAndHoverType(x, y) {
    if (!this.rawTimelineData?.groups || !this.groupOffsets) {
      return {
        groupIndex: -1,
        hoverType: "ERROR"
        /* HoverType.ERROR */
      };
    }
    if (x < 0 || y < 0) {
      return {
        groupIndex: -1,
        hoverType: "ERROR"
        /* HoverType.ERROR */
      };
    }
    y += this.chartViewport.scrollOffset();
    const groups = this.rawTimelineData.groups || [];
    if (this.#groupTreeRoot) {
      const sortedGroupIndexes = this.#getVisualOrderOfGroupIndexes(this.#groupTreeRoot);
      if (sortedGroupIndexes.length !== groups.length) {
        console.warn("The data from the group tree doesn't match the data from DataProvider.");
        return {
          groupIndex: -1,
          hoverType: "ERROR"
          /* HoverType.ERROR */
        };
      }
      sortedGroupIndexes.push(groups.length);
      for (let i = 0; i < sortedGroupIndexes.length; i++) {
        const groupIndex = sortedGroupIndexes[i];
        const nextIndex = sortedGroupIndexes[i + 1] ?? sortedGroupIndexes.length;
        if (y >= this.groupOffsets[groupIndex] && y < this.groupOffsets[nextIndex]) {
          const context = this.context;
          context.save();
          context.font = this.#font;
          const headerRight = HEADER_LEFT_PADDING + (this.#inTrackConfigEditMode ? EDIT_MODE_TOTAL_ICON_WIDTH : 0) + this.labelWidthForGroup(context, groups[groupIndex]);
          context.restore();
          const mouseInHeaderRow = y >= this.groupOffsets[groupIndex] && y < this.groupOffsets[groupIndex] + groups[groupIndex].style.height;
          if (this.#inTrackConfigEditMode) {
            if (mouseInHeaderRow) {
              if (UP_ICON_LEFT <= x && x < UP_ICON_LEFT + EDIT_ICON_WIDTH) {
                return {
                  groupIndex,
                  hoverType: "TRACK_CONFIG_UP_BUTTON"
                  /* HoverType.TRACK_CONFIG_UP_BUTTON */
                };
              }
              if (DOWN_ICON_LEFT <= x && x < DOWN_ICON_LEFT + EDIT_ICON_WIDTH) {
                return {
                  groupIndex,
                  hoverType: "TRACK_CONFIG_DOWN_BUTTON"
                  /* HoverType.TRACK_CONFIG_DOWN_BUTTON */
                };
              }
              if (HIDE_ICON_LEFT <= x && x < HIDE_ICON_LEFT + EDIT_ICON_WIDTH) {
                return {
                  groupIndex,
                  hoverType: groups[groupIndex].hidden ? "TRACK_CONFIG_SHOW_BUTTON" : "TRACK_CONFIG_HIDE_BUTTON"
                };
              }
              if (mouseInHeaderRow && x <= headerRight) {
                return {
                  groupIndex,
                  hoverType: "INSIDE_TRACK_HEADER"
                  /* HoverType.INSIDE_TRACK_HEADER */
                };
              }
            }
          } else {
            if (mouseInHeaderRow && x <= headerRight) {
              return {
                groupIndex,
                hoverType: "INSIDE_TRACK_HEADER"
                /* HoverType.INSIDE_TRACK_HEADER */
              };
            }
            return {
              groupIndex,
              hoverType: "INSIDE_TRACK"
              /* HoverType.INSIDE_TRACK */
            };
          }
        }
      }
    }
    return {
      groupIndex: -1,
      hoverType: "OUTSIDE_TRACKS"
      /* HoverType.OUTSIDE_TRACKS */
    };
  }
  enterTrackConfigurationMode() {
    if (!this.#hasTrackConfigurationMode()) {
      return;
    }
    const div = document.createElement("div");
    div.classList.add("flame-chart-edit-confirm");
    const button = new Buttons.Button.Button();
    button.data = {
      variant: "primary",
      jslogContext: "track-configuration-exit"
    };
    button.innerText = i18nString2(UIStrings2.exitTrackConfigurationMode);
    div.appendChild(button);
    button.addEventListener("click", () => {
      this.#exitEditMode();
    });
    this.viewportElement.appendChild(div);
    this.#inTrackConfigEditMode = true;
    this.dispatchEventToListeners("TracksReorderStateChange", true);
    this.updateLevelPositions();
    this.draw();
    this.scrollGroupIntoView(0);
  }
  #removeEditModeButton() {
    const confirmButton = this.viewportElement.querySelector(".flame-chart-edit-confirm");
    if (confirmButton) {
      this.viewportElement.removeChild(confirmButton);
    }
  }
  #exitEditMode() {
    this.#removeEditModeButton();
    this.#inTrackConfigEditMode = false;
    this.dispatchEventToListeners("TracksReorderStateChange", false);
    this.updateLevelPositions();
    this.draw();
  }
  markerIndexBeforeTime(time) {
    const timelineData = this.timelineData();
    if (!timelineData) {
      throw new Error("No timeline data");
    }
    const markers = timelineData.markers;
    if (!markers) {
      throw new Error("No timeline markers");
    }
    return Platform3.ArrayUtilities.lowerBound(timelineData.markers, time, (markerTimestamp, marker) => markerTimestamp - marker.startTime());
  }
  /**
   * Draw the whole flame chart.
   * Make sure |setWindowTimes| is called with correct time range before this function.
   */
  draw() {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    this.resetCanvas();
    this.dispatchEventToListeners("LatestDrawDimensions", {
      chart: {
        widthPixels: this.offsetWidth,
        heightPixels: this.offsetHeight,
        scrollOffsetPixels: this.chartViewport.scrollOffset(),
        // If there are no groups because we have no timeline data, we treat
        // that as all being collapsed.
        allGroupsCollapsed: this.rawTimelineData?.groups.every((g) => !g.expanded) ?? true
      },
      traceWindow: Trace.Helpers.Timing.traceWindowFromMilliSeconds(this.minimumBoundary(), this.maximumBoundary())
    });
    const canvasWidth = this.offsetWidth;
    const canvasHeight = this.offsetHeight;
    const context = this.context;
    context.save();
    const ratio = window.devicePixelRatio;
    const top = this.chartViewport.scrollOffset();
    context.scale(ratio, ratio);
    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.translate(0, -top);
    context.font = this.#font;
    const { markerIndices, drawBatches, titleIndices } = this.getDrawBatches(context, timelineData);
    for (const [{ color, outline }, { indexes }] of drawBatches) {
      this.#drawBatchEvents(context, timelineData, color, indexes, outline);
    }
    if (!this.#inTrackConfigEditMode) {
      this.#drawCustomSymbols(context, timelineData);
      this.drawMarkers(context, timelineData, markerIndices);
    }
    this.drawEventTitles(context, timelineData, titleIndices, canvasWidth);
    const allIndexes = Array.from(drawBatches.values()).map((x) => x.indexes).flat();
    this.#drawDecorations(context, timelineData, allIndexes);
    context.restore();
    this.drawGroupHeaders(canvasWidth, canvasHeight);
    this.drawFlowEvents(context, timelineData);
    this.drawMarkerLines();
    const dividersData = TimelineGrid.calculateGridOffsets(this);
    const navStartTimes = this.dataProvider.mainFrameNavigationStartEvents?.() || [];
    let navStartTimeIndex = 0;
    const drawAdjustedTime = (time) => {
      if (navStartTimes.length === 0) {
        return this.formatValue(time, dividersData.precision);
      }
      const hasNextNavStartTime = navStartTimes.length > navStartTimeIndex + 1;
      if (hasNextNavStartTime) {
        const nextNavStartTime = navStartTimes[navStartTimeIndex + 1];
        const nextNavStartTimeStartTimestamp = Trace.Helpers.Timing.microToMilli(nextNavStartTime.ts);
        if (time > nextNavStartTimeStartTimestamp) {
          navStartTimeIndex++;
        }
      }
      const nearestMarker = navStartTimes[navStartTimeIndex];
      if (nearestMarker) {
        const nearestMarkerStartTime = Trace.Helpers.Timing.microToMilli(nearestMarker.ts);
        time -= nearestMarkerStartTime - this.zeroTime();
      }
      return this.formatValue(time, dividersData.precision);
    };
    TimelineGrid.drawCanvasGrid(context, dividersData);
    if (this.rulerEnabled) {
      TimelineGrid.drawCanvasHeaders(context, dividersData, drawAdjustedTime, 3, RulerHeight);
    }
    this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
    this.updateElementPosition(this.selectedElement, this.selectedEntryIndex);
    if (this.#searchResultEntryIndex !== null) {
      this.showPopoverForSearchResult(this.#searchResultEntryIndex);
    }
    this.updateMarkerHighlight();
  }
  /**
   * Draws generic flame chart events, that is, the plain rectangles that fill several parts
   * in the timeline like the Main Thread flamechart and the timings track.
   * Drawn on a color by color basis to minimize the amount of times context.style is switched.
   */
  #drawBatchEvents(context, timelineData, color, indexes, outline) {
    context.save();
    context.beginPath();
    for (let i = 0; i < indexes.length; ++i) {
      const entryIndex = indexes[i];
      if (this.#indexToDrawOverride.has(entryIndex)) {
        continue;
      }
      this.#drawEventRect(context, timelineData, entryIndex);
    }
    if (outline) {
      const nearBlack = ThemeSupport7.ThemeSupport.instance().getComputedValue("--ref-palette-neutral10");
      context.strokeStyle = `color-mix(in srgb, ${color}, ${nearBlack} 60%)`;
      context.stroke();
    }
    context.fillStyle = color;
    context.fill();
    context.restore();
  }
  /**
   * Draws decorations onto events. {@link FlameChartDecoration}.
   */
  #drawDecorations(context, timelineData, indexes) {
    const { entryTotalTimes, entryStartTimes, entryLevels } = timelineData;
    context.save();
    for (let i = 0; i < indexes.length; ++i) {
      const entryIndex = indexes[i];
      const decorationsForEvent = timelineData.entryDecorations.at(entryIndex);
      if (!decorationsForEvent || decorationsForEvent.length < 1) {
        continue;
      }
      if (decorationsForEvent.length > 1) {
        sortDecorationsForRenderingOrder(decorationsForEvent);
      }
      const entryStartTime = entryStartTimes[entryIndex];
      const duration = entryTotalTimes[entryIndex];
      const barX = this.timeToPositionClipped(entryStartTime);
      const barLevel = entryLevels[entryIndex];
      const barHeight = this.#eventBarHeight(timelineData, entryIndex);
      const barY = this.levelToOffset(barLevel);
      let barWidth = this.#eventBarWidth(timelineData, entryIndex);
      for (const decoration of decorationsForEvent) {
        switch (decoration.type) {
          case "CANDY": {
            const candyStripeStartTime = Trace.Helpers.Timing.microToMilli(decoration.startAtTime);
            if (duration < candyStripeStartTime) {
              continue;
            }
            if (!this.candyStripePattern || !this.candyStripePatternGray) {
              const red = "rgba(255, 0, 0, 0.8)";
              this.candyStripePattern = this.createCandyStripePattern(red);
              const parsedColor = Common.Color.parse(red);
              const dimmed = parsedColor?.asLegacyColor().grayscale().asString() ?? "lightgrey";
              this.candyStripePatternGray = this.createCandyStripePattern(dimmed);
            }
            context.save();
            context.beginPath();
            const barXStart = this.timeToPositionClipped(entryStartTime + candyStripeStartTime);
            const barXEnd = this.timeToPositionClipped(entryStartTime + duration);
            this.#drawEventRect(context, timelineData, entryIndex, {
              startX: barXStart,
              width: barXEnd - barXStart
            });
            context.fillStyle = this.#shouldDimEvent(entryIndex) ? this.candyStripePatternGray : this.candyStripePattern;
            context.fill();
            context.restore();
            break;
          }
          case "WARNING_TRIANGLE": {
            let endTimePixels = barX + barWidth;
            if (typeof decoration.customEndTime !== "undefined") {
              const endTimeMilli = Trace.Helpers.Timing.microToMilli(decoration.customEndTime);
              endTimePixels = this.timeToPositionClipped(endTimeMilli);
              barWidth = endTimePixels - barX;
            }
            const triangleHeight = 8;
            let triangleWidth = 8;
            if (typeof decoration.customStartTime !== "undefined") {
              const startTimeMilli = Trace.Helpers.Timing.microToMilli(decoration.customStartTime);
              const startTimePixels = this.timeToPositionClipped(startTimeMilli);
              triangleWidth = Math.min(endTimePixels - startTimePixels, 8);
            }
            context.save();
            context.beginPath();
            context.rect(barX, barY, barWidth, barHeight);
            context.clip();
            context.beginPath();
            context.fillStyle = this.#transformColor(entryIndex, "red");
            context.moveTo(barX + barWidth - triangleWidth, barY);
            context.lineTo(barX + barWidth, barY);
            context.lineTo(barX + barWidth, barY + triangleHeight);
            context.fill();
            context.restore();
            break;
          }
          case "HIDDEN_DESCENDANTS_ARROW": {
            context.save();
            context.beginPath();
            context.rect(barX, barY, barWidth, barHeight);
            const arrowSize = barHeight;
            if (barWidth > arrowSize * 2) {
              const triangleSize = 7;
              const triangleHorizontalPadding = 5;
              const triangleVerrticalPadding = 6;
              context.clip();
              context.beginPath();
              context.fillStyle = "#474747";
              const arrowAX = barX + barWidth - triangleSize - triangleHorizontalPadding;
              const arrowAY = barY + triangleVerrticalPadding;
              context.moveTo(arrowAX, arrowAY);
              const arrowBX = barX + barWidth - triangleHorizontalPadding;
              const arrowBY = barY + triangleVerrticalPadding;
              context.lineTo(arrowBX, arrowBY);
              const arrowCX = barX + barWidth - triangleHorizontalPadding - triangleSize / 2;
              const arrowCY = barY + barHeight - triangleVerrticalPadding;
              context.lineTo(arrowCX, arrowCY);
            } else {
              const triangleSize = 8;
              context.clip();
              context.beginPath();
              context.fillStyle = "#474747";
              context.moveTo(barX + barWidth - triangleSize, barY + barHeight);
              context.lineTo(barX + barWidth, barY + barHeight);
              context.lineTo(barX + barWidth, barY + triangleSize);
            }
            context.fill();
            context.restore();
            break;
          }
        }
      }
    }
    context.restore();
  }
  /**
   * Draws (but does not fill) a rectangle for a given event onto the provided
   * context. Because sometimes we need to draw a portion of the rect, it
   * optionally allows the start X and width of the rect to be overridden by
   * custom pixel values. It currently does not allow the start Y and height to
   * be changed because we have no need to do so, but this can be extended in
   * the future if required.
   **/
  #drawEventRect(context, timelineData, entryIndex, overrides) {
    const { entryTotalTimes, entryStartTimes, entryLevels } = timelineData;
    const duration = entryTotalTimes[entryIndex];
    if (isNaN(duration)) {
      return;
    }
    const entryStartTime = entryStartTimes[entryIndex];
    const barX = overrides?.startX ?? this.timeToPositionClipped(entryStartTime);
    const barLevel = entryLevels[entryIndex];
    const barHeight = this.#eventBarHeight(timelineData, entryIndex);
    const barY = this.levelToOffset(barLevel);
    const barWidth = overrides?.width ?? this.#eventBarWidth(timelineData, entryIndex);
    if (barWidth === 0) {
      return;
    }
    context.rect(barX, barY, barWidth - 0.5, barHeight - 1);
  }
  #eventBarHeight(timelineData, entryIndex) {
    const { entryLevels } = timelineData;
    const barLevel = entryLevels[entryIndex];
    const barHeight = this.levelHeight(barLevel);
    return barHeight;
  }
  entryWidth(entryIndex) {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return 0;
    }
    return this.#eventBarWidth(timelineData, entryIndex);
  }
  #eventBarWidth(timelineData, entryIndex) {
    const { entryTotalTimes, entryStartTimes } = timelineData;
    const duration = entryTotalTimes[entryIndex];
    const entryStartTime = entryStartTimes[entryIndex];
    const barXStart = this.timeToPositionClipped(entryStartTime);
    const barXEnd = this.timeToPositionClipped(entryStartTime + duration);
    const barWidth = Math.max(barXEnd - barXStart, 1);
    return barWidth;
  }
  /**
   * Preprocess the data to be drawn to speed the rendering time.
   * Specifically:
   *  - Groups events into draw batches - same color + same outline - to help drawing performance
   *    by reducing how often `context.fillStyle` is changed.
   *  - Discards non visible events.
   *  - Gathers marker events (LCP, FCP, DCL, etc.).
   *  - Gathers event titles that should be rendered.
   */
  getDrawBatches(context, timelineData) {
    const titleIndices = [];
    const markerIndices = [];
    const { entryTotalTimes, entryStartTimes } = timelineData;
    const top = this.chartViewport.scrollOffset();
    const textPadding = this.textPadding;
    const minTextWidth = 2 * textPadding + UI2.UIUtils.measureTextWidth(context, "\u2026");
    const minTextWidthDuration = this.chartViewport.pixelToTimeOffset(minTextWidth);
    const keysByColorWithOutline = /* @__PURE__ */ new Map();
    const keysByColorWithNoOutline = /* @__PURE__ */ new Map();
    const getOrMakeKey = (color, outline) => {
      const map = outline ? keysByColorWithOutline : keysByColorWithNoOutline;
      const key = map.get(color);
      if (key) {
        return key;
      }
      const newKey = { color, outline };
      map.set(color, newKey);
      return newKey;
    };
    const drawBatches = /* @__PURE__ */ new Map();
    for (let level = 0; level < this.dataProvider.maxStackDepth(); ++level) {
      if (this.levelToOffset(level) + this.levelHeight(level) < top || this.levelToOffset(level) > top + this.offsetHeight) {
        continue;
      }
      if (!this.visibleLevels?.[level]) {
        continue;
      }
      if (!this.timelineLevels) {
        break;
      }
      const levelIndexes = this.timelineLevels[level];
      const rightIndexOnLevel = Platform3.ArrayUtilities.lowerBound(levelIndexes, this.chartViewport.windowRightTime(), (time, entryIndex) => time - entryStartTimes[entryIndex]) - 1;
      let lastDrawOffset = Infinity;
      for (let entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
        const entryIndex = levelIndexes[entryIndexOnLevel];
        const duration = entryTotalTimes[entryIndex];
        if (isNaN(duration)) {
          markerIndices.push(entryIndex);
          continue;
        }
        if (duration >= minTextWidthDuration || this.forceDecorationCache?.[entryIndex]) {
          titleIndices.push(entryIndex);
        }
        const entryStartTime = entryStartTimes[entryIndex];
        const entryOffsetRight = entryStartTime + duration;
        const levelForcedDrawable = Boolean(this.dataProvider.forceDrawableLevel?.(level));
        if (entryOffsetRight <= this.chartViewport.windowLeftTime() && !levelForcedDrawable) {
          break;
        }
        const barX = this.timeToPositionClipped(entryStartTime);
        if (barX >= lastDrawOffset) {
          continue;
        }
        lastDrawOffset = barX;
        if (this.entryColorsCache) {
          const color = this.getColorForEntry(entryIndex);
          const outline = this.#shouldOutlineEvent(entryIndex);
          const key = getOrMakeKey(color, outline);
          let batch = drawBatches.get(key);
          if (!batch) {
            batch = { indexes: [] };
            drawBatches.set(key, batch);
          }
          batch.indexes.push(entryIndex);
        }
      }
    }
    return { drawBatches, titleIndices, markerIndices };
  }
  /**
   * The function to draw the group headers. It will draw the title by default.
   * And when a group is hovered, it will add a edit button.
   * And will draw the move up/down, hide and save button if user enter the editing mode.
   * @param width
   * @param height
   * @param hoveredGroupIndex This is used to show the edit icon for hovered group. If it is undefined or -1, it means
   * there is no group being hovered.
   */
  drawGroupHeaders(width, height) {
    const context = this.context;
    const top = this.chartViewport.scrollOffset();
    const ratio = window.devicePixelRatio;
    if (!this.rawTimelineData) {
      return;
    }
    const groups = this.rawTimelineData.groups || [];
    if (!groups.length) {
      return;
    }
    const groupOffsets = this.groupOffsets;
    if (groupOffsets === null || groupOffsets === void 0) {
      return;
    }
    const lastGroupOffset = groupOffsets[groupOffsets.length - 1];
    context.save();
    context.scale(ratio, ratio);
    context.translate(0, -top);
    context.font = this.#font;
    context.fillStyle = ThemeSupport7.ThemeSupport.instance().getComputedValue("--sys-color-cdt-base-container");
    this.forEachGroupInViewport((offset, _, group) => {
      const paddingHeight = group.style.padding;
      if (paddingHeight < 5) {
        return;
      }
      context.fillRect(0, offset - paddingHeight + 2, width, paddingHeight - 4);
    });
    if (groups.length && lastGroupOffset < top + height) {
      context.fillRect(0, lastGroupOffset + 2, width, top + height - lastGroupOffset);
    }
    context.strokeStyle = ThemeSupport7.ThemeSupport.instance().getComputedValue("--sys-color-neutral-container");
    context.beginPath();
    this.forEachGroupInViewport((offset, _, group, isFirst) => {
      if (isFirst || group.style.padding < 4) {
        return;
      }
      horizontalLine(context, width, offset - 2.5);
    });
    horizontalLine(context, width, lastGroupOffset + 1.5);
    context.stroke();
    this.forEachGroupInViewport((offset, index, group) => {
      if (group.style.useFirstLineForOverview) {
        return;
      }
      if (!this.isGroupCollapsible(index) || group.expanded) {
        if (!group.style.shareHeaderLine && this.isGroupFocused(index)) {
          context.fillStyle = group.style.backgroundColor;
          context.fillRect(0, offset, width, group.style.height);
        }
        return;
      }
      let nextGroup = index + 1;
      while (nextGroup < groups.length && groups[nextGroup].style.nestingLevel > group.style.nestingLevel) {
        nextGroup++;
      }
      const endLevel = nextGroup < groups.length ? groups[nextGroup].startLevel : this.dataProvider.maxStackDepth();
      this.drawCollapsedOverviewForGroup(group, offset, endLevel);
    });
    context.save();
    const trackConfigurationAllowed = groups.length > 1;
    const iconsWidth = this.#inTrackConfigEditMode ? EDIT_MODE_TOTAL_ICON_WIDTH : 0;
    this.forEachGroupInViewport((offset, groupIndex, group) => {
      context.font = this.#font;
      if (this.isGroupCollapsible(groupIndex) && !group.expanded || group.style.shareHeaderLine) {
        const labelBackgroundWidth = this.labelWidthForGroup(context, group);
        const parsedColor = Common.Color.parse(group.style.backgroundColor);
        if (parsedColor) {
          context.fillStyle = parsedColor.setAlpha(0.8).asString();
        }
        context.fillRect(iconsWidth + HEADER_LEFT_PADDING, offset + HEADER_LABEL_Y_PADDING, labelBackgroundWidth, group.style.height - 2 * HEADER_LABEL_Y_PADDING);
      }
      context.fillStyle = this.#inTrackConfigEditMode && group.hidden ? ThemeSupport7.ThemeSupport.instance().getComputedValue("--sys-color-token-subtle", this.contentElement) : group.style.color;
      const titleStart = iconsWidth + EXPANSION_ARROW_INDENT * (group.style.nestingLevel + 1) + ARROW_SIDE / 2 + HEADER_LABEL_X_PADDING;
      const y = offset + group.style.height - this.textBaseline;
      context.fillText(group.name, titleStart, y);
      if (group.subtitle) {
        const titleMetrics = context.measureText(group.name);
        context.font = this.#subtitleFont;
        context.fillText(group.subtitle, titleStart + titleMetrics.width + PADDING_BETWEEN_TITLE_AND_SUBTITLE, y - 1);
        context.font = this.#font;
      }
      if (this.#inTrackConfigEditMode && group.hidden) {
        context.fillRect(titleStart, offset + group.style.height / 2, UI2.UIUtils.measureTextWidth(context, group.name), 1);
      }
      if (trackConfigurationAllowed) {
        if (this.#inTrackConfigEditMode) {
          const iconColor = group.hidden ? "--sys-color-token-subtle" : "--sys-color-on-surface";
          if (group.style.nestingLevel === 0) {
            drawIcon(context, UP_ICON_LEFT, offset, EDIT_ICON_WIDTH, moveUpIconPath, iconColor);
            drawIcon(context, DOWN_ICON_LEFT, offset, EDIT_ICON_WIDTH, moveDownIconPath, iconColor);
          }
          drawIcon(context, HIDE_ICON_LEFT, offset, EDIT_ICON_WIDTH, group.hidden ? showIconPath : hideIconPath, this.groupIsLastVisibleTopLevel(groupIndex) ? "--sys-color-state-disabled" : iconColor);
        }
      }
    });
    context.restore();
    context.fillStyle = ThemeSupport7.ThemeSupport.instance().getComputedValue("--sys-color-token-subtle");
    this.forEachGroupInViewport((offset, index, group) => {
      if (this.isGroupCollapsible(index)) {
        drawExpansionArrow(context, iconsWidth + EXPANSION_ARROW_INDENT * (group.style.nestingLevel + 1), offset + group.style.height - this.textBaseline - ARROW_SIDE / 2, this.#inTrackConfigEditMode ? false : Boolean(group.expanded));
      }
    });
    context.strokeStyle = ThemeSupport7.ThemeSupport.instance().getComputedValue("--sys-color-neutral-outline");
    context.beginPath();
    context.stroke();
    this.forEachGroupInViewport((offset, index, group, _isFirst, groupHeight) => {
      if (this.isGroupFocused(index)) {
        const lineWidth = 2;
        const bracketLength = 10;
        context.fillStyle = ThemeSupport7.ThemeSupport.instance().getComputedValue("--selected-group-border", this.contentElement);
        context.fillRect(0, offset - lineWidth, lineWidth, groupHeight - group.style.padding + 2 * lineWidth);
        context.fillRect(0, offset - lineWidth, bracketLength, lineWidth);
        context.fillRect(0, offset + groupHeight - group.style.padding, bracketLength, lineWidth);
      }
    });
    context.restore();
  }
  /**
   * Draws page load events in the Timings track (LCP, FCP, DCL, etc.)
   */
  drawMarkers(context, timelineData, markerIndices) {
    const { entryStartTimes, entryLevels } = timelineData;
    this.markerPositions.clear();
    context.textBaseline = "alphabetic";
    context.save();
    context.beginPath();
    let lastMarkerLevel = -1;
    let lastMarkerX = -Infinity;
    for (let m = markerIndices.length - 1; m >= 0; --m) {
      const entryIndex = markerIndices[m];
      const title = this.entryTitle(entryIndex);
      if (!title) {
        continue;
      }
      const entryStartTime = entryStartTimes[entryIndex];
      const level = entryLevels[entryIndex];
      if (lastMarkerLevel !== level) {
        lastMarkerX = -Infinity;
      }
      const x = Math.max(this.chartViewport.timeToPosition(entryStartTime), lastMarkerX);
      const y = this.levelToOffset(level);
      const h = this.levelHeight(level);
      const padding = 4;
      const width = Math.ceil(UI2.UIUtils.measureTextWidth(context, title)) + 2 * padding;
      lastMarkerX = x + width + 1;
      lastMarkerLevel = level;
      this.markerPositions.set(entryIndex, { x, width });
      context.fillStyle = this.getColorForEntry(entryIndex);
      context.fillRect(x, y, width, h - 1);
      context.fillStyle = "white";
      context.fillText(title, x + padding, y + h - this.textBaseline);
    }
    context.strokeStyle = "rgba(0, 0, 0, 0.2)";
    context.stroke();
    context.restore();
  }
  #drawCustomSymbols(context, timelineData) {
    const { entryStartTimes, entryTotalTimes, entryLevels } = timelineData;
    this.customDrawnPositions.clear();
    context.save();
    const posArray = [];
    for (const [entryIndex, drawOverride] of this.#indexToDrawOverride.entries()) {
      const entryStartTime = entryStartTimes[entryIndex];
      const entryTotalTime = entryTotalTimes[entryIndex];
      const level = entryLevels[entryIndex];
      const group = this.dataProvider.groupForEvent?.(entryIndex);
      if (group?.hidden) {
        continue;
      }
      const unclippedXStart = this.chartViewport.timeToPosition(entryStartTime);
      const unclippedXEnd = this.chartViewport.timeToPosition(entryStartTime + entryTotalTime);
      const x = unclippedXStart;
      const y = this.levelToOffset(level);
      const height = this.levelHeight(level);
      const width = unclippedXEnd - unclippedXStart;
      const pos = drawOverride(context, x, y, width, height, (time) => this.chartViewport.timeToPosition(time), (color) => this.#transformColor(entryIndex, color));
      posArray.push({ entryIndex, pos });
    }
    posArray.sort((a, b) => (b.pos.z ?? 0) - (a.pos.z ?? 0));
    for (const { entryIndex, pos } of posArray) {
      this.customDrawnPositions.set(entryIndex, pos);
    }
    context.restore();
  }
  /**
   * Draws the titles of trace events in the timeline. Also calls `decorateEntry` on the data
   * provider, which can do any custom drawing on the corresponding entry's area (e.g. draw screenshots
   * in the Performance Panel timeline).
   *
   * Takes in the width of the entire canvas so that we know if an event does
   * not fit into the viewport entirely, the max width we can draw is that
   * width, not the width of the event itself.
   */
  drawEventTitles(context, timelineData, titleIndices, canvasWidth) {
    const timeToPixel = this.chartViewport.timeToPixel();
    const textPadding = this.textPadding;
    context.save();
    context.beginPath();
    const { entryStartTimes, entryLevels } = timelineData;
    for (let i = 0; i < titleIndices.length; ++i) {
      const entryIndex = titleIndices[i];
      const entryStartTime = entryStartTimes[entryIndex];
      const barX = this.timeToPositionClipped(entryStartTime);
      const barWidth = Math.min(this.#eventBarWidth(timelineData, entryIndex), canvasWidth);
      const barLevel = entryLevels[entryIndex];
      const barY = this.levelToOffset(barLevel);
      let text = this.dataProvider.entryTitle(entryIndex);
      const barHeight = this.#eventBarHeight(timelineData, entryIndex);
      if (text?.length) {
        context.font = this.#font;
        const hasArrowDecoration = this.entryHasDecoration(
          entryIndex,
          "HIDDEN_DESCENDANTS_ARROW"
          /* FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW */
        );
        const maxBarWidth = hasArrowDecoration && barWidth > barHeight * 2 ? barWidth - textPadding - this.barHeight : barWidth - 2 * textPadding;
        text = UI2.UIUtils.trimTextMiddle(context, text, maxBarWidth);
      }
      const unclippedBarX = this.chartViewport.timeToPosition(entryStartTime);
      if (this.dataProvider.decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixel, (color) => this.#transformColor(entryIndex, color))) {
        continue;
      }
      if (!text?.length) {
        continue;
      }
      context.fillStyle = this.#transformColor(entryIndex, this.dataProvider.textColor(entryIndex));
      context.fillText(text, barX + textPadding, barY + barHeight - this.textBaseline);
    }
    context.restore();
  }
  /**
   * @callback GroupCallback
   * @param groupTop pixels between group top and the top of the flame chart.
   * @param groupIndex
   * @param group
   * @param isFirstGroup if the group is the first one of this nesting level.
   * @param height pixels of height of this group
   */
  /**
   * Process the pixels of start and end, and other data of each group, which are used in drawing the group.
   * @param callback
   */
  forEachGroup(callback) {
    if (!this.rawTimelineData) {
      return;
    }
    const groups = this.rawTimelineData.groups || [];
    if (!groups.length) {
      return;
    }
    const groupOffsets = this.groupOffsets;
    if (!groupOffsets) {
      return;
    }
    const groupStack = [{ nestingLevel: -1, visible: true }];
    for (let i = 0; i < groups.length; ++i) {
      let traverse = function(root) {
        sortedGroupIndexes.push(root.index);
        for (const child of root.children) {
          traverse(child);
        }
      };
      const groupTop = groupOffsets[i];
      const group = groups[i];
      let firstGroup = true;
      let last = groupStack[groupStack.length - 1];
      while (last && last.nestingLevel >= group.style.nestingLevel) {
        groupStack.pop();
        firstGroup = false;
        last = groupStack[groupStack.length - 1];
      }
      last = groupStack[groupStack.length - 1];
      const parentGroupVisible = last ? last.visible : false;
      const thisGroupVisible = !group.hidden && parentGroupVisible && (!this.isGroupCollapsible(i) || group.expanded);
      groupStack.push({ nestingLevel: group.style.nestingLevel, visible: Boolean(thisGroupVisible) });
      if (!this.#groupTreeRoot) {
        return;
      }
      const sortedGroupIndexes = [];
      traverse(this.#groupTreeRoot);
      sortedGroupIndexes.shift();
      if (sortedGroupIndexes.length !== groups.length) {
        console.warn("The data from the group tree doesn't match the data from DataProvider.");
        return;
      }
      sortedGroupIndexes.push(groups.length);
      const currentIndex = sortedGroupIndexes.indexOf(i);
      const nextOffset = groupOffsets[sortedGroupIndexes[currentIndex + 1]];
      if (!this.#inTrackConfigEditMode && (!parentGroupVisible || group.hidden)) {
        continue;
      }
      callback(groupTop, i, group, firstGroup, nextOffset - groupTop);
    }
  }
  forEachGroupInViewport(callback) {
    const top = this.chartViewport.scrollOffset();
    this.forEachGroup((groupTop, index, group, firstGroup, height) => {
      if (groupTop - group.style.padding > top + this.offsetHeight) {
        return;
      }
      if (groupTop + height < top) {
        return;
      }
      callback(groupTop, index, group, firstGroup, height);
    });
  }
  /**
   * Returns the width of the title label of the group, which include the left padding, arrow and the group header text.
   * This function is public for test reason.
   * |ICON_WIDTH|expansionArrowIndent * (nestingLevel + 1)|
   * |headerLeftPadding|EDIT  ICON|                    |Arrow|LabelXPadding|Title|LabelXPadding|
   *                              |<--                      labelWidth                      -->|
   * @param context canvas context
   * @param group
   * @returns the width of the label of the group.
   */
  labelWidthForGroup(context, group) {
    return EXPANSION_ARROW_INDENT * (group.style.nestingLevel + 1) + ARROW_SIDE / 2 + HEADER_LABEL_X_PADDING + UI2.UIUtils.measureTextWidth(context, group.name) + HEADER_LABEL_X_PADDING - HEADER_LEFT_PADDING;
  }
  drawCollapsedOverviewForGroup(group, y, endLevel) {
    const range = new Common.SegmentedRange.SegmentedRange(mergeCallback);
    const timeWindowLeft = this.chartViewport.windowLeftTime();
    const timeWindowRight = this.chartViewport.windowRightTime();
    const context = this.context;
    const groupBarHeight = group.style.height;
    if (!this.rawTimelineData) {
      return;
    }
    const entryStartTimes = this.rawTimelineData.entryStartTimes;
    const entryTotalTimes = this.rawTimelineData.entryTotalTimes;
    const timeToPixel = this.chartViewport.timeToPixel();
    for (let level = group.startLevel; level < endLevel; ++level) {
      const levelIndexes = this.timelineLevels ? this.timelineLevels[level] : [];
      const rightIndexOnLevel = Platform3.ArrayUtilities.lowerBound(levelIndexes, timeWindowRight, (time, entryIndex) => time - entryStartTimes[entryIndex]) - 1;
      let lastDrawOffset = Infinity;
      for (let entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
        const entryIndex = levelIndexes[entryIndexOnLevel];
        const entryStartTime = entryStartTimes[entryIndex];
        const barX = this.timeToPositionClipped(entryStartTime);
        const entryEndTime = entryStartTime + entryTotalTimes[entryIndex];
        if (isNaN(entryEndTime) || barX >= lastDrawOffset) {
          continue;
        }
        if (entryEndTime <= timeWindowLeft) {
          break;
        }
        lastDrawOffset = barX;
        const color = this.getColorForEntry(entryIndex);
        const endBarX = this.timeToPositionClipped(entryEndTime);
        if (group.style.useDecoratorsForOverview && this.dataProvider.forceDecoration(entryIndex)) {
          const unclippedBarX = this.chartViewport.timeToPosition(entryStartTime);
          const barWidth = this.#eventBarWidth(this.rawTimelineData, entryIndex);
          context.beginPath();
          context.fillStyle = color;
          context.fillRect(barX, y, barWidth, groupBarHeight - 1);
          this.dataProvider.decorateEntry(entryIndex, context, "", barX, y, barWidth, groupBarHeight, unclippedBarX, timeToPixel, (color2) => this.#transformColor(entryIndex, color2));
          continue;
        }
        range.append(new Common.SegmentedRange.Segment(barX, endBarX, color));
      }
    }
    const segments = range.segments().slice().sort((a, b) => a.data.localeCompare(b.data));
    let lastColor;
    context.beginPath();
    for (let i = 0; i < segments.length; ++i) {
      const segment = segments[i];
      if (lastColor !== segments[i].data) {
        context.fill();
        context.beginPath();
        lastColor = segments[i].data;
        context.fillStyle = lastColor;
      }
      context.rect(segment.begin, y, segment.end - segment.begin, groupBarHeight);
    }
    context.fill();
    function mergeCallback(a, b) {
      return a.data === b.data && a.end + 0.4 > b.end ? a : null;
    }
  }
  drawFlowEvents(context, timelineData) {
    const td = this.timelineData();
    if (!td) {
      return;
    }
    const { entryTotalTimes, entryStartTimes, entryLevels } = timelineData;
    const ratio = window.devicePixelRatio;
    const top = this.chartViewport.scrollOffset();
    const arrowLineWidth = 6;
    const arrowWidth = 3;
    context.save();
    context.scale(ratio, ratio);
    context.translate(0, -top);
    const arrowColor = ThemeSupport7.ThemeSupport.instance().getComputedValue("--sys-color-on-surface-subtle");
    context.fillStyle = arrowColor;
    context.strokeStyle = arrowColor;
    for (let i = 0; i < td.initiatorsData.length; ++i) {
      const initiatorsData = td.initiatorsData[i];
      const initiatorStartTime = entryStartTimes[initiatorsData.initiatorIndex];
      const initiatorEndTime = entryStartTimes[initiatorsData.initiatorIndex] + entryTotalTimes[initiatorsData.initiatorIndex];
      const initiatedStartTime = entryStartTimes[initiatorsData.eventIndex];
      const initiatorEndsBeforeInitiatedStart = initiatorEndTime < initiatedStartTime;
      const initiatorArrowStartTime = initiatorEndsBeforeInitiatedStart ? initiatorEndTime : (
        // The blue indicator's width is 2, so add a little bit offset to start the arrow.
        Math.max(initiatorStartTime, this.chartViewport.pixelToTime(5))
      );
      const initiatorArrowEndTime = initiatedStartTime;
      if (initiatorArrowEndTime < this.chartViewport.windowLeftTime()) {
        continue;
      }
      let startX = this.chartViewport.timeToPosition(initiatorArrowStartTime);
      let endX = this.chartViewport.timeToPosition(initiatorArrowEndTime);
      if (initiatorsData.isInitiatorHidden) {
        const { circleEndX } = this.drawCircleAroundCollapseArrow(initiatorsData.initiatorIndex, context, timelineData);
        if (circleEndX) {
          startX = circleEndX;
        }
      }
      if (initiatorsData.isEntryHidden) {
        const { circleStartX } = this.drawCircleAroundCollapseArrow(initiatorsData.eventIndex, context, timelineData);
        if (circleStartX) {
          endX = circleStartX;
        }
      }
      const startLevel = entryLevels[initiatorsData.initiatorIndex];
      const endLevel = entryLevels[initiatorsData.eventIndex];
      const startY = this.levelToOffset(startLevel) + this.levelHeight(startLevel) / 2;
      const endY = this.levelToOffset(endLevel) + this.levelHeight(endLevel) / 2;
      const lineLength = endX - startX;
      context.lineWidth = 1;
      context.shadowColor = "rgba(0, 0, 0, 0.3)";
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.shadowBlur = 3;
      if (lineLength > arrowWidth) {
        context.beginPath();
        context.moveTo(endX, endY);
        context.lineTo(endX - arrowLineWidth, endY - 3);
        context.lineTo(endX - arrowLineWidth, endY + 3);
        context.fill();
      }
      if (initiatorEndsBeforeInitiatedStart) {
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(startX + lineLength / 2, startY);
        context.lineTo(startX + lineLength / 2, endY);
        context.lineTo(endX, endY);
        context.stroke();
      } else {
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(startX, endY);
        context.lineTo(endX, endY);
        context.stroke();
      }
    }
    context.restore();
  }
  drawCircleAroundCollapseArrow(entryIndex, context, timelineData) {
    const decorationsForEvent = timelineData.entryDecorations.at(entryIndex);
    if (!decorationsForEvent?.find(
      (decoration) => decoration.type === "HIDDEN_DESCENDANTS_ARROW"
      /* FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW */
    )) {
      return {};
    }
    const { entryStartTimes, entryLevels } = timelineData;
    const barWidth = this.#eventBarWidth(timelineData, entryIndex);
    if (barWidth < this.barHeight * 2) {
      return {};
    }
    const entryStartTime = entryStartTimes[entryIndex];
    const barX = this.timeToPositionClipped(entryStartTime);
    const barLevel = entryLevels[entryIndex];
    const barHeight = this.#eventBarHeight(timelineData, entryIndex);
    const barY = this.levelToOffset(barLevel);
    context.save();
    context.beginPath();
    context.rect(barX, barY, barWidth, barHeight);
    context.clip();
    context.lineWidth = 1;
    context.beginPath();
    context.fillStyle = "#474747";
    const triangleCenterX = barX + barWidth - this.barHeight / 2;
    const triangleCenterY = barY + this.barHeight / 2;
    const circleRadius = 6;
    context.beginPath();
    context.arc(triangleCenterX, triangleCenterY, circleRadius, 0, 2 * Math.PI);
    context.stroke();
    context.restore();
    return { circleStartX: triangleCenterX - circleRadius, circleEndX: triangleCenterX + circleRadius };
  }
  /**
   * Draws the vertical dashed lines in the timeline marking where the "Marker" events
   * happened in time.
   */
  drawMarkerLines() {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const markers = timelineData.markers;
    const left = this.markerIndexBeforeTime(this.minimumBoundary());
    const rightBoundary = this.maximumBoundary();
    const timeToPixel = this.chartViewport.timeToPixel();
    const context = this.context;
    context.save();
    const ratio = window.devicePixelRatio;
    context.scale(ratio, ratio);
    context.translate(0, 3);
    const height = RulerHeight - 1;
    for (let i = left; i < markers.length; i++) {
      const timestamp = markers[i].startTime();
      if (timestamp > rightBoundary) {
        break;
      }
      markers[i].draw(context, this.chartViewport.timeToPosition(timestamp), height, timeToPixel);
    }
    context.restore();
  }
  updateMarkerHighlight() {
    const element = this.markerHighlighElement;
    if (element.parentElement) {
      element.remove();
    }
    const markerIndex = this.highlightedMarkerIndex;
    if (markerIndex === -1) {
      return;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const marker = timelineData.markers[markerIndex];
    const barX = this.timeToPositionClipped(marker.startTime());
    UI2.Tooltip.Tooltip.install(element, marker.title() || "");
    const style = element.style;
    style.left = barX + "px";
    style.backgroundColor = marker.color();
    this.viewportElement.appendChild(element);
  }
  processTimelineData(timelineData) {
    if (!timelineData) {
      this.timelineLevels = null;
      this.visibleLevelOffsets = null;
      this.visibleLevels = null;
      this.groupOffsets = null;
      this.rawTimelineData = null;
      this.forceDecorationCache = null;
      this.entryColorsCache = null;
      this.dimIndices = null;
      this.colorDimmingCache.clear();
      this.rawTimelineDataLength = 0;
      this.#groupTreeRoot = null;
      this.selectedGroupIndex = -1;
      this.keyboardFocusedGroup = -1;
      this.flameChartDelegate.updateSelectedGroup(this, null);
      return;
    }
    this.rawTimelineData = timelineData;
    this.rawTimelineDataLength = timelineData.entryStartTimes.length;
    this.forceDecorationCache = new Array(this.rawTimelineDataLength);
    this.entryColorsCache = new Array(this.rawTimelineDataLength);
    this.#indexToDrawOverride.clear();
    for (let i = 0; i < this.rawTimelineDataLength; ++i) {
      this.forceDecorationCache[i] = this.dataProvider.forceDecoration(i) ?? false;
      this.entryColorsCache[i] = this.dataProvider.entryColor(i);
      const drawOverride = this.dataProvider.getDrawOverride?.(i);
      if (drawOverride) {
        this.#indexToDrawOverride.set(i, drawOverride);
      }
    }
    const entryCounters = new Uint32Array(this.dataProvider.maxStackDepth() + 1);
    for (let i = 0; i < timelineData.entryLevels.length; ++i) {
      ++entryCounters[timelineData.entryLevels[i]];
    }
    const levelIndexes = new Array(entryCounters.length);
    for (let i = 0; i < levelIndexes.length; ++i) {
      levelIndexes[i] = new Uint32Array(entryCounters[i]);
      entryCounters[i] = 0;
    }
    for (let i = 0; i < timelineData.entryLevels.length; ++i) {
      const level = timelineData.entryLevels[i];
      levelIndexes[level][entryCounters[level]++] = i;
    }
    this.timelineLevels = levelIndexes;
    const groups = this.rawTimelineData.groups || [];
    for (let i = 0; i < groups.length; ++i) {
      const matchingConfig = this.#persistedGroupConfig?.find((c) => c.trackName === groups[i].name);
      const expanded = matchingConfig?.expanded ?? groups[i].expanded ?? false;
      const hidden = matchingConfig?.hidden ?? groups[i].hidden ?? false;
      groups[i].expanded = expanded;
      groups[i].hidden = hidden;
    }
    if (!this.#groupTreeRoot) {
      this.#groupTreeRoot = this.buildGroupTree(groups);
    } else {
      this.updateGroupTree(groups, this.#groupTreeRoot);
    }
    if (this.#persistedGroupConfig && groups.length > 0 && this.#groupTreeRoot && this.#persistedGroupConfig.length === groups.length) {
      this.#reOrderGroupsBasedOnPersistedConfig(this.#persistedGroupConfig, this.#groupTreeRoot);
    }
    this.updateLevelPositions();
    this.updateHeight();
    if (this.selectedGroupIndex === -1) {
      this.selectedGroupIndex = timelineData.selectedGroup ? groups.indexOf(timelineData.selectedGroup) : -1;
    }
    this.keyboardFocusedGroup = this.selectedGroupIndex;
    this.flameChartDelegate.updateSelectedGroup(this, timelineData.selectedGroup);
  }
  /**
   * If we find persisted configuration, we need to update the tree so the
   * children in the tree are ordered in the way they were ordered the last time
   * the user viewed this trace.
   */
  #reOrderGroupsBasedOnPersistedConfig(persistedConfig, root) {
    function traverseAndOrderChildren(node) {
      if (node.children.length) {
        node.children.sort((a, b) => {
          const aIndex = persistedConfig[a.index].visualIndex;
          const bIndex = persistedConfig[b.index].visualIndex;
          return aIndex - bIndex;
        });
      }
      node.children.forEach(traverseAndOrderChildren);
    }
    traverseAndOrderChildren(root);
  }
  /**
   * Builds a tree node for a group. For each group the start level is inclusive and the end level is exclusive.
   * @param group
   * @param index index of the group in the |FlameChartTimelineData.groups[]|
   * @param endLevel The end level of this group, which is also the start level of the next group or the end of all
   * groups
   * @returns the tree node for the group
   */
  #buildGroupTreeNode(group, index, endLevel) {
    return {
      index,
      nestingLevel: group.style.nestingLevel,
      startLevel: group.startLevel,
      endLevel,
      children: []
    };
  }
  /**
   * Builds a tree for the given group array, the tree will be built based on the nesting level.
   * We will add one fake root to represent the top level parent, and the for each tree node, its children means the
   * group nested in. The order of the children matters because it represent the order of groups.
   * So for example if there are Group 0-7, Group 0, 3, 4 have nestingLevel 0, Group 1, 2, 5, 6, 7 have nestingLevel 1.
   * Then we will get a tree like this.
   *              -1(fake root to represent the top level parent)
   *             / | \
   *            /  |  \
   *           0   3   4
   *          / \    / | \
   *         1   2  5  6  7
   * This function is public for test purpose.
   * @param groups the array of all groups, it should be the one from FlameChartTimelineData
   * @returns the root of the Group tree. The root is the fake one we added, which represent the parent for all groups
   */
  buildGroupTree(groups) {
    const treeRoot = {
      index: -1,
      nestingLevel: -1,
      startLevel: 0,
      // If there is no |groups| (for example the JS Profiler), it means all the
      // levels belong to the top level, so just use the max level as the end.
      endLevel: groups.length ? groups[0].startLevel : this.dataProvider.maxStackDepth(),
      children: []
    };
    const groupStack = [treeRoot];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const currentGroupNestingLevel = group.style.nestingLevel;
      let parentGroup = groupStack[groupStack.length - 1];
      while (parentGroup && parentGroup.nestingLevel >= currentGroupNestingLevel) {
        groupStack.pop();
        parentGroup = groupStack[groupStack.length - 1];
      }
      const nextGroup = groups[i + 1];
      const endLevel = nextGroup?.startLevel ?? this.dataProvider.maxStackDepth();
      const currentGroupNode = this.#buildGroupTreeNode(group, i, endLevel);
      parentGroup.children.push(currentGroupNode);
      groupStack.push(currentGroupNode);
    }
    return treeRoot;
  }
  /**
   * Updates the tree for the given group array.
   * For a new timeline data, if the groups remains the same (the same here mean the group order inside the |groups|,
   * the start level, style and other attribute can be changed), but other parts are different.
   * For example the |entryLevels[]| or |maxStackDepth| is changed, then we should update the group tree instead of
   * re-build it.
   * So we can keep the order that user manually set.
   * To do this, we go through the tree, and update the start and end level of each group.
   * This function is public for test purpose.
   * @param groups the array of all groups, it should be the one from FlameChartTimelineData
   * @param root the root of the Group tree. The root is the fake one we added, which represent the parent for all groups
   */
  updateGroupTree(groups, root) {
    const maxStackDepth = this.dataProvider.maxStackDepth();
    function traverse(treeNode) {
      const index = treeNode.index;
      if (index < 0) {
        treeNode.startLevel = 0;
        treeNode.endLevel = groups.length ? groups[0].startLevel : maxStackDepth;
      } else {
        if (!groups[index]) {
          console.warn("The |groups| is changed. Please make sure the flamechart is reset after data change in the data provider");
          return;
        }
        treeNode.startLevel = groups[index].startLevel;
        const nextGroup = groups[index + 1];
        treeNode.endLevel = nextGroup?.startLevel ?? maxStackDepth;
      }
      for (const child of treeNode.children) {
        traverse(child);
      }
    }
    traverse(root);
  }
  /**
   * Given a tree, do a preorder traversal, and process the group and the levels in this group.
   * So for a tree like this:
   *              -1
   *             / | \
   *            /  |  \
   *           0   3   4
   *          / \    / | \
   *         1   2  5  6  7
   * The traverse order will be: -1, 0, 1, 2, 3, 4, 5, 6, 7.
   * @param groupNode TreeNode for current group
   * @param currentOffset
   * @param parentGroupIsVisible used to determine if current group's header and its levels are visible
   * @returns the offset (in pixels) after processing current group
   */
  #traverseGroupTreeAndUpdateLevelPositionsForTheGroup(groupNode, currentOffset, parentGroupIsVisible) {
    if (!this.visibleLevels || !this.visibleLevelOffsets || !this.visibleLevelHeights || !this.groupOffsets) {
      return currentOffset;
    }
    const groups = this.rawTimelineData?.groups;
    if (!groups) {
      return currentOffset;
    }
    if (groupNode.index >= groups.length) {
      console.warn("The data from the group tree is outdated. Please make sure the flamechart is reset after data change in the data provider");
      return currentOffset;
    }
    if (groupNode.index >= 0) {
      this.groupOffsets[groupNode.index] = currentOffset;
      if (this.#inTrackConfigEditMode && groups[groupNode.index].name || !groups[groupNode.index].hidden && parentGroupIsVisible && !groups[groupNode.index].style.shareHeaderLine) {
        currentOffset += groups[groupNode.index].style.height;
      }
    }
    let thisGroupIsVisible = false;
    if (groupNode.index < 0) {
      thisGroupIsVisible = true;
    } else {
      const thisGroupIsExpanded = !(this.isGroupCollapsible(groupNode.index) && !groups[groupNode.index].expanded);
      thisGroupIsVisible = !groups[groupNode.index].hidden && thisGroupIsExpanded;
    }
    const thisGroupLevelsAreVisible = thisGroupIsVisible && parentGroupIsVisible;
    for (let level = groupNode.startLevel; level < groupNode.endLevel; level++) {
      if (level >= this.dataProvider.maxStackDepth()) {
        console.warn("The data from the group tree is outdated. Please make sure the flamechart is reset after data change in the data provider");
        return currentOffset;
      }
      const isFirstOnLevel = level === groupNode.startLevel;
      let thisLevelIsVisible;
      if (groupNode.index < 0) {
        thisLevelIsVisible = true;
      } else {
        const isFirstLevelAndForOverview = isFirstOnLevel && groups[groupNode.index].style.useFirstLineForOverview;
        thisLevelIsVisible = !groups[groupNode.index].hidden && (parentGroupIsVisible && (thisGroupLevelsAreVisible || isFirstLevelAndForOverview));
      }
      let height;
      if (groups[groupNode.index]) {
        const isFirstLevelAndNotShareHeaderLine = isFirstOnLevel && !groups[groupNode.index].style.shareHeaderLine;
        const thisGroupIsCollapsed = this.isGroupCollapsible(groupNode.index) && !groups[groupNode.index].expanded;
        if (isFirstLevelAndNotShareHeaderLine || thisGroupIsCollapsed) {
          height = groups[groupNode.index].style.height;
        } else {
          height = groups[groupNode.index].style.itemsHeight ?? this.barHeight;
        }
      } else {
        height = this.barHeight;
      }
      this.visibleLevels[level] = this.#inTrackConfigEditMode ? false : Boolean(thisLevelIsVisible);
      this.visibleLevelOffsets[level] = currentOffset;
      this.visibleLevelHeights[level] = this.#inTrackConfigEditMode ? 0 : height;
      if (groupNode.index < 0 || !groups[groupNode.index].hidden && (thisLevelIsVisible || parentGroupIsVisible && groups[groupNode.index].style.shareHeaderLine && isFirstOnLevel)) {
        currentOffset += this.visibleLevelHeights[level];
      }
    }
    if (groupNode.children.length === 0) {
      return currentOffset;
    }
    for (const child of groupNode.children) {
      if (this.#inTrackConfigEditMode && groups[child.index].name || thisGroupLevelsAreVisible && !groups[child.index]?.hidden && child !== groupNode.children[0]) {
        currentOffset += groups[child.index].style.padding ?? 0;
      }
      currentOffset = this.#traverseGroupTreeAndUpdateLevelPositionsForTheGroup(child, currentOffset, thisGroupLevelsAreVisible);
    }
    return currentOffset;
  }
  updateLevelPositions() {
    if (!this.#groupTreeRoot) {
      console.warn("Please make sure the new timeline data is processed before update the level positions.");
      return;
    }
    const levelCount = this.dataProvider.maxStackDepth();
    const groups = this.rawTimelineData?.groups || [];
    this.visibleLevelOffsets = new Uint32Array(levelCount + 1);
    this.visibleLevelHeights = new Uint32Array(levelCount);
    this.visibleLevels = new Array(levelCount);
    this.groupOffsets = new Uint32Array(groups.length + 1);
    let currentOffset = this.rulerEnabled ? RulerHeight + 2 : 2;
    currentOffset = this.#traverseGroupTreeAndUpdateLevelPositionsForTheGroup(
      this.#groupTreeRoot,
      currentOffset,
      /* parentGroupIsVisible= */
      true
    );
    this.groupOffsets[groups.length] = currentOffset;
    this.visibleLevelOffsets[levelCount] = currentOffset;
  }
  isGroupCollapsible(index) {
    if (!this.rawTimelineData || index < 0) {
      return;
    }
    const groups = this.rawTimelineData.groups || [];
    const style = groups[index].style;
    if (style.collapsible === 1) {
      return false;
    }
    if (!style.shareHeaderLine) {
      return style.collapsible === 0;
    }
    const isLastGroup = index + 1 >= groups.length;
    if (style.collapsible === 2) {
      const nextRowStartLevel = isLastGroup ? this.dataProvider.maxStackDepth() : groups[index + 1].startLevel;
      const rowsInCurrentGroup = nextRowStartLevel - groups[index].startLevel;
      if (rowsInCurrentGroup < 2) {
        return false;
      }
    }
    if (!isLastGroup && groups[index + 1].style.nestingLevel > style.nestingLevel) {
      return true;
    }
    const nextGroupLevel = isLastGroup ? this.dataProvider.maxStackDepth() : groups[index + 1].startLevel;
    if (nextGroupLevel !== groups[index].startLevel + 1) {
      return true;
    }
    return style.height !== style.itemsHeight;
  }
  groupIsLastVisibleTopLevel(groupIndex) {
    if (groupIndex < 0 || !this.rawTimelineData) {
      return true;
    }
    const group = this.rawTimelineData.groups[groupIndex];
    const visibleTopLevelGroupNumber = this.#groupTreeRoot?.children.filter((track) => !this.rawTimelineData?.groups[track.index].hidden).length;
    return visibleTopLevelGroupNumber === 1 && group.style.nestingLevel === 0 && !group.hidden;
  }
  setSelectedEntry(entryIndex) {
    if (this.isMouseOverRevealChildrenArrow(this.lastMouseOffsetX, entryIndex)) {
      this.modifyTree("RESET_CHILDREN", entryIndex);
    }
    if (this.selectedEntryIndex === entryIndex) {
      return;
    }
    if (entryIndex !== -1) {
      this.chartViewport.hideRangeSelection();
    }
    this.selectedEntryIndex = entryIndex;
    this.revealEntry(entryIndex);
    this.updateElementPosition(this.selectedElement, this.selectedEntryIndex);
    this.update();
  }
  entryHasDecoration(entryIndex, decorationType) {
    const timelineData = this.timelineData();
    if (!timelineData) {
      return false;
    }
    const decorationsForEvent = timelineData.entryDecorations.at(entryIndex);
    if (decorationsForEvent && decorationsForEvent.length >= 1) {
      return decorationsForEvent.some((decoration) => decoration.type === decorationType);
    }
    return false;
  }
  getCustomDrawnPositionForEntryIndex(entryIndex) {
    const customPos = this.customDrawnPositions.get(entryIndex);
    if (customPos) {
      return customPos;
    }
    return this.markerPositions.get(entryIndex) ?? null;
  }
  /**
   * Update position of an Element. By default, the element is treated as a full entry and it's dimensions are set to the full entry width/length/height.
   * If isDecoration parameter is set to true, the element will be positioned on the right side of the entry and have a square shape where width == height of the entry.
   */
  updateElementPosition(element, entryIndex, isDecoration) {
    if (!element) {
      return;
    }
    const elementMinWidthPx = 2;
    element.classList.add("hidden");
    if (entryIndex === -1) {
      return;
    }
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    const startTime = timelineData.entryStartTimes[entryIndex];
    const duration = timelineData.entryTotalTimes[entryIndex];
    let barX = 0;
    let barWidth = 0;
    let visible = true;
    const customPos = this.customDrawnPositions.get(entryIndex);
    if (customPos) {
      barX = customPos.x;
      barWidth = customPos.width;
    } else if (Number.isNaN(duration)) {
      const position = this.markerPositions.get(entryIndex);
      if (position) {
        barX = position.x;
        barWidth = position.width;
      } else {
        visible = false;
      }
    } else {
      barX = this.chartViewport.timeToPosition(startTime);
      barWidth = duration * this.chartViewport.timeToPixel();
    }
    if (barX + barWidth <= 0 || barX >= this.offsetWidth) {
      return;
    }
    const barCenter = barX + barWidth / 2;
    barWidth = Math.max(barWidth, elementMinWidthPx);
    barX = barCenter - barWidth / 2;
    const entryLevel = timelineData.entryLevels[entryIndex];
    const barY = this.levelToOffset(entryLevel) - this.chartViewport.scrollOffset();
    const barHeight = this.levelHeight(entryLevel);
    const style = element.style;
    if (isDecoration) {
      style.top = barY + "px";
      style.width = barHeight + "px";
      style.height = barHeight + "px";
      style.left = barX + barWidth - barHeight + "px";
    } else {
      style.top = barY + "px";
      style.width = barWidth + "px";
      style.height = barHeight - 1 + "px";
      style.left = barX + "px";
    }
    element.classList.toggle("hidden", !visible);
    this.viewportElement.appendChild(element);
  }
  // Updates the highlight of an Arrow button that is shown on an entry if it has hidden child entries
  updateHiddenChildrenArrowHighlighPosition(entryIndex) {
    this.revealDescendantsArrowHighlightElement.classList.add("hidden");
    if (entryIndex === -1 || !this.isMouseOverRevealChildrenArrow(this.lastMouseOffsetX, entryIndex)) {
      return;
    }
    this.updateElementPosition(this.revealDescendantsArrowHighlightElement, entryIndex, true);
  }
  timeToPositionClipped(time) {
    return Platform3.NumberUtilities.clamp(this.chartViewport.timeToPosition(time), 0, this.offsetWidth);
  }
  /**
   * Returns the amount of pixels a group is vertically offset in the flame chart.
   * Now this function is only used for tests.
   */
  groupIndexToOffsetForTest(groupIndex) {
    if (!this.groupOffsets) {
      throw new Error("No visible group offsets");
    }
    return this.groupOffsets[groupIndex];
  }
  /**
   * Set the edit mode.
   * Now this function is only used for tests.
   */
  setEditModeForTest(editMode) {
    this.#inTrackConfigEditMode = editMode;
  }
  /**
   * Returns the visibility of a level in the.
   * flame chart.
   */
  levelIsVisible(level) {
    if (!this.visibleLevels) {
      throw new Error("No level visiblibities");
    }
    return this.visibleLevels[level];
  }
  /**
   * Returns the amount of pixels a level is vertically offset in the.
   * flame chart.
   */
  levelToOffset(level) {
    if (!this.visibleLevelOffsets) {
      throw new Error("No visible level offsets");
    }
    return this.visibleLevelOffsets[level];
  }
  levelHeight(level) {
    if (!this.visibleLevelHeights) {
      throw new Error("No visible level heights");
    }
    return this.visibleLevelHeights[level];
  }
  updateBoundaries() {
    this.totalTime = this.dataProvider.totalTime();
    this.#minimumBoundary = this.dataProvider.minimumBoundary();
    this.chartViewport.setBoundaries(this.#minimumBoundary, this.totalTime);
  }
  updateHeight() {
    this.chartViewport.setContentHeight(this.totalContentHeight());
  }
  /**
   * This is the total height that would be required to render the flame chart
   * with no overflows.
   */
  totalContentHeight() {
    return this.levelToOffset(this.dataProvider.maxStackDepth()) + 2;
  }
  onResize() {
    this.#canvasBoundingClientRect = null;
    this.scheduleUpdate();
  }
  setPersistedConfig(config) {
    this.#persistedGroupConfig = config;
  }
  update() {
    if (!this.timelineData()) {
      return;
    }
    this.updateHeight();
    this.updateBoundaries();
    this.draw();
    if (!this.chartViewport.isDragging()) {
      this.updateHighlight();
    }
  }
  // Reset the whole flame chart.
  // It will reset the viewport, which will reset the scrollTop and scrollLeft. So should be careful when call this
  // function. But when the data is "real" changed, especially when groups[] is changed, make sure call this before
  // re-rendering.
  // This will also clear all the selected entry, group, etc.
  // Remember to call |setWindowTimes| before draw the flame chart again.
  reset() {
    if (this.#inTrackConfigEditMode) {
      this.#removeEditModeButton();
      this.#inTrackConfigEditMode = false;
    }
    this.chartViewport.reset();
    this.rawTimelineData = null;
    this.rawTimelineDataLength = 0;
    this.#groupTreeRoot = null;
    this.dimIndices = null;
    this.colorDimmingCache.clear();
    this.highlightedMarkerIndex = -1;
    this.highlightedEntryIndex = -1;
    this.selectedEntryIndex = -1;
    this.selectedGroupIndex = -1;
    this.#persistedGroupConfig = null;
  }
  scheduleUpdate() {
    this.chartViewport.scheduleUpdate();
  }
  enabled() {
    return this.rawTimelineDataLength !== 0;
  }
  computePosition(time) {
    return this.chartViewport.timeToPosition(time);
  }
  formatValue(value, precision) {
    return this.dataProvider.formatValue(value - this.zeroTime(), precision);
  }
  maximumBoundary() {
    return Trace.Types.Timing.Milli(this.chartViewport.windowRightTime());
  }
  minimumBoundary() {
    return Trace.Types.Timing.Milli(this.chartViewport.windowLeftTime());
  }
  zeroTime() {
    return Trace.Types.Timing.Milli(this.dataProvider.minimumBoundary());
  }
  boundarySpan() {
    return Trace.Types.Timing.Milli(this.maximumBoundary() - this.minimumBoundary());
  }
  getDimIndices() {
    return this.dimIndices || null;
  }
};
var RulerHeight = 15;
var MinimalTimeWindowMs = 0.5;
var decorationDrawOrder = {
  CANDY: 1,
  WARNING_TRIANGLE: 2,
  HIDDEN_DESCENDANTS_ARROW: 3
};
function sortDecorationsForRenderingOrder(decorations) {
  decorations.sort((decoration1, decoration2) => {
    return decorationDrawOrder[decoration1.type] - decorationDrawOrder[decoration2.type];
  });
}
var FlameChartTimelineData = class _FlameChartTimelineData {
  entryLevels;
  entryTotalTimes;
  entryStartTimes;
  /**
   * An array of entry decorations, where each item in the array is an array of
   * decorations for the event at that index.
   **/
  entryDecorations;
  groups;
  /**
   * Markers are events with vertical lines that go down the entire timeline at their start time.
   * These are only used now in the Extensibility API; users can provide a
   * `marker` event
   * (https://developer.chrome.com/docs/devtools/performance/extension#inject_your_data_with_the_user_timings_api)
   * which will render with a vertical line.
   * If you are wondering what we use to draw page events like LCP, those are
   * done via the overlays system. In time, it probably makes sense to use the
   * overlays for e11y marker events too, and then we can remove markers from
   * TimelineData, rather than have two systems to build the same UI...
   */
  markers;
  // These four arrays are used to draw the initiator arrows, and if there are
  // multiple arrows, they should be a chain.
  initiatorsData;
  selectedGroup;
  constructor(entryLevels, entryTotalTimes, entryStartTimes, groups, entryDecorations = [], initiatorsData = []) {
    this.entryLevels = entryLevels;
    this.entryTotalTimes = entryTotalTimes;
    this.entryStartTimes = entryStartTimes;
    this.entryDecorations = entryDecorations;
    this.groups = groups || [];
    this.markers = [];
    this.initiatorsData = initiatorsData || [];
    this.selectedGroup = null;
  }
  // TODO(crbug.com/1501055) Thinking about refactor this class, so we can avoid create a new object when modifying the
  // flame chart.
  static create(data) {
    return new _FlameChartTimelineData(data.entryLevels, data.entryTotalTimes, data.entryStartTimes, data.groups, data.entryDecorations || [], data.initiatorsData || []);
  }
  // TODO(crbug.com/1501055) Thinking about refactor this class, so we can avoid create a new object when modifying the
  // flame chart.
  static createEmpty() {
    return new _FlameChartTimelineData(
      [],
      // entry levels: what level on the timeline is an event on,
      [],
      // entry total times: the total duration of an event,
      [],
      // entry start times: the start time of a given event,
      []
    );
  }
  emptyInitiators() {
    this.initiatorsData = [];
  }
};

// gen/front_end/ui/legacy/components/perf_ui/ChartViewport.js
var ChartViewport = class extends UI3.Widget.VBox {
  delegate;
  viewportElement;
  #alwaysShowVerticalScroll;
  rangeSelectionEnabled;
  vScrollElement;
  vScrollContent;
  selectionOverlay;
  cursorElement;
  #isDragging;
  totalHeight;
  offsetHeight;
  scrollTop;
  rangeSelectionStart;
  rangeSelectionEnd;
  dragStartPointX;
  dragStartPointY;
  dragStartScrollTop;
  visibleLeftTime;
  visibleRightTime;
  offsetWidth;
  targetLeftTime;
  targetRightTime;
  selectionOffsetShiftX;
  selectionStartX;
  lastMouseOffsetX;
  minimumBoundary;
  totalTime;
  isUpdateScheduled;
  cancelWindowTimesAnimation;
  #config;
  constructor(delegate, config) {
    super();
    this.#config = config;
    this.registerRequiredCSS(chartViewport_css_default);
    this.delegate = delegate;
    this.viewportElement = this.contentElement.createChild("div", "fill");
    this.viewportElement.addEventListener("mousemove", this.updateCursorPosition.bind(this), false);
    this.viewportElement.addEventListener("mouseout", this.onMouseOut.bind(this), false);
    this.viewportElement.addEventListener("wheel", this.onMouseWheel.bind(this), false);
    this.viewportElement.addEventListener("keydown", this.onChartKeyDown.bind(this), false);
    this.viewportElement.addEventListener("keyup", this.onChartKeyUp.bind(this), false);
    UI3.UIUtils.installDragHandle(this.viewportElement, this.startDragging.bind(this), this.dragging.bind(this), this.endDragging.bind(this), "-webkit-grabbing", null);
    UI3.UIUtils.installDragHandle(this.viewportElement, this.startRangeSelection.bind(this), this.rangeSelectionDragging.bind(this), this.endRangeSelection.bind(this), "text", null);
    this.#alwaysShowVerticalScroll = false;
    this.rangeSelectionEnabled = true;
    this.vScrollElement = this.contentElement.createChild("div", "chart-viewport-v-scroll");
    this.vScrollContent = this.vScrollElement.createChild("div");
    this.vScrollElement.addEventListener("scroll", this.onScroll.bind(this), false);
    this.selectionOverlay = this.contentElement.createChild("div", "chart-viewport-selection-overlay hidden");
    this.cursorElement = this.contentElement.createChild("div", "chart-cursor-element hidden");
    this.reset();
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
  }
  alwaysShowVerticalScroll() {
    this.#alwaysShowVerticalScroll = true;
    this.vScrollElement.classList.add("always-show-scrollbar");
  }
  disableRangeSelection() {
    this.rangeSelectionEnabled = false;
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
  }
  isDragging() {
    return this.#isDragging;
  }
  elementsToRestoreScrollPositionsFor() {
    return [this.vScrollElement];
  }
  verticalScrollBarVisible() {
    return !this.vScrollElement.classList.contains("hidden");
  }
  updateScrollBar() {
    const showScroll = this.#alwaysShowVerticalScroll || this.totalHeight > this.offsetHeight;
    if (this.vScrollElement.classList.contains("hidden") !== showScroll) {
      return;
    }
    this.vScrollElement.classList.toggle("hidden", !showScroll);
    this.updateContentElementSize();
  }
  onResize() {
    this.updateScrollBar();
    this.updateContentElementSize();
    this.scheduleUpdate();
  }
  reset() {
    this.vScrollElement.scrollTop = 0;
    this.scrollTop = 0;
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
    this.#isDragging = false;
    this.dragStartPointX = 0;
    this.dragStartPointY = 0;
    this.dragStartScrollTop = 0;
    this.visibleLeftTime = 0;
    this.visibleRightTime = 0;
    this.offsetWidth = 0;
    this.offsetHeight = 0;
    this.totalHeight = 0;
    this.targetLeftTime = 0;
    this.targetRightTime = 0;
    this.isUpdateScheduled = false;
    this.updateContentElementSize();
  }
  updateContentElementSize() {
    let offsetWidth = this.vScrollElement.offsetLeft;
    if (!offsetWidth) {
      offsetWidth = this.contentElement.offsetWidth;
    }
    this.offsetWidth = offsetWidth;
    this.offsetHeight = this.contentElement.offsetHeight;
    this.delegate.setSize(this.offsetWidth, this.offsetHeight);
  }
  setContentHeight(totalHeight) {
    this.totalHeight = totalHeight;
    this.vScrollContent.style.height = totalHeight + "px";
    this.updateScrollBar();
    this.updateContentElementSize();
    if (this.scrollTop + this.offsetHeight <= totalHeight) {
      return;
    }
    this.scrollTop = Math.max(0, totalHeight - this.offsetHeight);
    this.vScrollElement.scrollTop = this.scrollTop;
  }
  /**
   * @param centered If true, scrolls offset to where it is centered on the chart,
   * based on current the this.offsetHeight value.
   */
  setScrollOffset(offset, height, centered) {
    height = height || 0;
    if (centered) {
      const halfPadding = Math.floor(this.offsetHeight / 2);
      if (this.vScrollElement.scrollTop > offset) {
        this.vScrollElement.scrollTop = offset - (height + halfPadding);
      }
    } else if (this.vScrollElement.scrollTop > offset) {
      this.vScrollElement.scrollTop = offset;
    }
    if (this.vScrollElement.scrollTop < offset - this.offsetHeight + height) {
      this.vScrollElement.scrollTop = offset - this.offsetHeight + height;
    }
  }
  scrollOffset() {
    return this.scrollTop;
  }
  chartHeight() {
    return this.offsetHeight;
  }
  setBoundaries(zeroTime, totalTime) {
    this.minimumBoundary = zeroTime;
    this.totalTime = totalTime;
  }
  /**
   * The mouse wheel can results in flamechart zoom, scroll and pan actions, depending on the scroll deltas and the selected navigation:
   *
   * Classic navigation:
   * 1. Mouse Wheel --> Zoom
   * 2. Mouse Wheel + Shift --> Scroll
   * 3. Trackpad: Mouse Wheel AND horizontal scroll (deltaX > deltaY): --> Pan left/right
   *
   * Modern navigation:
   * 1. Mouse Wheel -> Scroll
   * 2. Mouse Wheel + Shift -> Pan left/right
   * 3. Mouse Wheel + Ctrl/Cmd -> Zoom
   * 4. Trackpad: Mouse Wheel AND horizontal scroll (deltaX > deltaY): --> Zoom
   */
  onMouseWheel(wheelEvent) {
    const navigation = Common2.Settings.Settings.instance().moduleSetting("flamechart-selected-navigation").get();
    const panDelta = (wheelEvent.deltaY || wheelEvent.deltaX) / 53 * this.offsetHeight / 8;
    const zoomDelta = Math.pow(1.2, (wheelEvent.deltaY || wheelEvent.deltaX) * 1 / 53) - 1;
    if (navigation === "classic") {
      if (wheelEvent.shiftKey) {
        this.vScrollElement.scrollTop += panDelta;
      } else if (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) {
        this.handleHorizontalPanGesture(
          wheelEvent.deltaX,
          /* animate */
          true
        );
      } else {
        this.handleZoomGesture(zoomDelta);
      }
    } else if (navigation === "modern") {
      const isCtrlOrCmd = UI3.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(wheelEvent);
      if (wheelEvent.shiftKey) {
        this.handleHorizontalPanGesture(
          panDelta,
          /* animate */
          true
        );
      } else if (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) {
        this.handleHorizontalPanGesture(
          wheelEvent.deltaX,
          /* animate */
          true
        );
      } else if (isCtrlOrCmd) {
        this.handleZoomGesture(zoomDelta);
      } else {
        this.vScrollElement.scrollTop += panDelta;
      }
    }
    wheelEvent.consume(true);
  }
  startDragging(event) {
    if (event.shiftKey) {
      return false;
    }
    this.#isDragging = true;
    this.dragStartPointX = event.pageX;
    this.dragStartPointY = event.pageY;
    this.dragStartScrollTop = this.vScrollElement.scrollTop;
    this.viewportElement.style.cursor = "";
    return true;
  }
  dragging(event) {
    const pixelShift = this.dragStartPointX - event.pageX;
    this.dragStartPointX = event.pageX;
    this.handleHorizontalPanGesture(pixelShift);
    const pixelScroll = this.dragStartPointY - event.pageY;
    this.vScrollElement.scrollTop = this.dragStartScrollTop + pixelScroll;
  }
  endDragging() {
    this.#isDragging = false;
  }
  startRangeSelection(event) {
    if (!event.shiftKey || !this.rangeSelectionEnabled) {
      return false;
    }
    this.#isDragging = true;
    this.selectionOffsetShiftX = event.offsetX - event.pageX;
    this.selectionStartX = event.offsetX;
    return true;
  }
  endRangeSelection() {
    this.#isDragging = false;
    this.selectionStartX = null;
  }
  hideRangeSelection() {
    this.selectionOverlay.classList.add("hidden");
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
  }
  /**
   * @param startTime the start time of the selection in MilliSeconds
   * @param endTime the end time of the selection in MilliSeconds
   * TODO(crbug.com/346312365): update the type definitions in ChartViewport.ts
   */
  setRangeSelection(startTime, endTime) {
    if (!this.rangeSelectionEnabled) {
      return;
    }
    this.rangeSelectionStart = Math.min(startTime, endTime);
    this.rangeSelectionEnd = Math.max(startTime, endTime);
    this.delegate.updateRangeSelection(this.rangeSelectionStart, this.rangeSelectionEnd);
  }
  onClick(event) {
    const mouseEvent = event;
    const time = this.pixelToTime(mouseEvent.offsetX);
    if (this.rangeSelectionStart !== null && this.rangeSelectionEnd !== null && time >= this.rangeSelectionStart && time <= this.rangeSelectionEnd) {
      return;
    }
    this.hideRangeSelection();
  }
  rangeSelectionDragging(event) {
    const x = Platform4.NumberUtilities.clamp(event.pageX + this.selectionOffsetShiftX, 0, this.offsetWidth);
    const start = this.pixelToTime(this.selectionStartX || 0);
    const end = this.pixelToTime(x);
    this.setRangeSelection(start, end);
  }
  onScroll() {
    this.scrollTop = this.vScrollElement.scrollTop;
    this.scheduleUpdate();
  }
  onMouseOut() {
    this.lastMouseOffsetX = -1;
    this.showCursor(false);
  }
  updateCursorPosition(e) {
    const mouseEvent = e;
    this.lastMouseOffsetX = mouseEvent.offsetX;
    const shouldShowCursor = this.#config.enableCursorElement && mouseEvent.shiftKey && !mouseEvent.metaKey;
    this.showCursor(shouldShowCursor);
    if (shouldShowCursor) {
      this.cursorElement.style.left = mouseEvent.offsetX + "px";
    }
  }
  pixelToTime(x) {
    return this.pixelToTimeOffset(x) + this.visibleLeftTime;
  }
  pixelToTimeOffset(x) {
    return x * (this.visibleRightTime - this.visibleLeftTime) / this.offsetWidth;
  }
  timeToPosition(time) {
    return Math.floor((time - this.visibleLeftTime) / (this.visibleRightTime - this.visibleLeftTime) * this.offsetWidth);
  }
  timeToPixel() {
    return this.offsetWidth / (this.visibleRightTime - this.visibleLeftTime);
  }
  showCursor(visible) {
    this.cursorElement.classList.toggle("hidden", !visible || this.#isDragging);
  }
  onChartKeyDown(keyboardEvent) {
    this.showCursor(keyboardEvent.shiftKey);
    this.handleZoomPanScrollKeys(keyboardEvent);
  }
  onChartKeyUp(keyboardEvent) {
    this.showCursor(keyboardEvent.shiftKey);
  }
  handleZoomPanScrollKeys(keyboardEvent) {
    if (UI3.KeyboardShortcut.KeyboardShortcut.hasAtLeastOneModifier(keyboardEvent) && !keyboardEvent.shiftKey) {
      return;
    }
    const zoomFactor = keyboardEvent.shiftKey ? 0.8 : 0.3;
    const panOffset = 160;
    const scrollOffset = 50;
    switch (keyboardEvent.code) {
      case "KeyA":
        this.handleHorizontalPanGesture(
          -panOffset,
          /* animate */
          true
        );
        break;
      case "KeyD":
        this.handleHorizontalPanGesture(
          panOffset,
          /* animate */
          true
        );
        break;
      case "Equal":
      // '+' key for zoom in
      case "KeyW":
        this.handleZoomGesture(-zoomFactor);
        break;
      case "Minus":
      // '-' key for zoom out
      case "KeyS":
        this.handleZoomGesture(zoomFactor);
        break;
      case "ArrowUp":
        if (keyboardEvent.shiftKey) {
          this.vScrollElement.scrollTop -= scrollOffset;
        }
        break;
      case "ArrowDown":
        if (keyboardEvent.shiftKey) {
          this.vScrollElement.scrollTop += scrollOffset;
        }
        break;
      case "ArrowLeft":
        if (keyboardEvent.shiftKey) {
          this.handleHorizontalPanGesture(
            -panOffset,
            /* animate */
            true
          );
        }
        break;
      case "ArrowRight":
        if (keyboardEvent.shiftKey) {
          this.handleHorizontalPanGesture(
            panOffset,
            /* animate */
            true
          );
        }
        break;
      default:
        return;
    }
    keyboardEvent.consume(true);
  }
  handleZoomGesture(zoom) {
    const bounds = { left: this.targetLeftTime, right: this.targetRightTime };
    const cursorTime = this.pixelToTime(this.lastMouseOffsetX || 0);
    bounds.left += (bounds.left - cursorTime) * zoom;
    bounds.right += (bounds.right - cursorTime) * zoom;
    this.requestWindowTimes(
      bounds,
      /* animate */
      true
    );
  }
  handleHorizontalPanGesture(offset, animate) {
    const bounds = { left: this.targetLeftTime, right: this.targetRightTime };
    const timeOffset = Platform4.NumberUtilities.clamp(this.pixelToTimeOffset(offset), this.minimumBoundary - bounds.left, this.totalTime + this.minimumBoundary - bounds.right);
    bounds.left += timeOffset;
    bounds.right += timeOffset;
    this.requestWindowTimes(bounds, Boolean(animate));
  }
  requestWindowTimes(bounds, animate) {
    const maxBound = this.minimumBoundary + this.totalTime;
    if (bounds.left < this.minimumBoundary) {
      bounds.right = Math.min(bounds.right + this.minimumBoundary - bounds.left, maxBound);
      bounds.left = this.minimumBoundary;
    } else if (bounds.right > maxBound) {
      bounds.left = Math.max(bounds.left - bounds.right + maxBound, this.minimumBoundary);
      bounds.right = maxBound;
    }
    if (bounds.right - bounds.left < MinimalTimeWindowMs) {
      return;
    }
    this.delegate.windowChanged(bounds.left, bounds.right, animate);
  }
  scheduleUpdate() {
    if (this.cancelWindowTimesAnimation || this.isUpdateScheduled) {
      return;
    }
    this.isUpdateScheduled = true;
    void RenderCoordinator.write(() => {
      this.isUpdateScheduled = false;
      this.update();
    });
  }
  update() {
    this.delegate.update();
  }
  willHide() {
    super.willHide();
    if (this.cancelWindowTimesAnimation) {
      this.cancelWindowTimesAnimation();
      this.setWindowTimes(this.targetLeftTime, this.targetRightTime, false);
    }
  }
  setWindowTimes(startTime, endTime, animate) {
    if (startTime === this.targetLeftTime && endTime === this.targetRightTime) {
      return;
    }
    if (!animate || this.visibleLeftTime === 0 || this.visibleRightTime === Infinity || startTime === 0 && endTime === Infinity || startTime === Infinity && endTime === Infinity) {
      this.targetLeftTime = startTime;
      this.targetRightTime = endTime;
      this.visibleLeftTime = startTime;
      this.visibleRightTime = endTime;
      this.scheduleUpdate();
      return;
    }
    if (this.cancelWindowTimesAnimation) {
      this.cancelWindowTimesAnimation();
      this.visibleLeftTime = this.targetLeftTime;
      this.visibleRightTime = this.targetRightTime;
    }
    this.targetLeftTime = startTime;
    this.targetRightTime = endTime;
    this.cancelWindowTimesAnimation = UI3.UIUtils.animateFunction(this.element.window(), animateWindowTimes.bind(this), [{ from: this.visibleLeftTime, to: startTime }, { from: this.visibleRightTime, to: endTime }], 100, () => {
      this.cancelWindowTimesAnimation = null;
    });
    function animateWindowTimes(startTime2, endTime2) {
      if (!this.isShowing()) {
        return;
      }
      this.visibleLeftTime = startTime2;
      this.visibleRightTime = endTime2;
      this.update();
    }
  }
  windowLeftTime() {
    return this.visibleLeftTime;
  }
  windowRightTime() {
    return this.visibleRightTime;
  }
};

// gen/front_end/ui/legacy/components/perf_ui/FilmStripView.js
var FilmStripView_exports = {};
__export(FilmStripView_exports, {
  Dialog: () => Dialog2,
  FilmStripView: () => FilmStripView
});
import * as Common3 from "./../../../../core/common/common.js";
import * as Host2 from "./../../../../core/host/host.js";
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as Trace2 from "./../../../../models/trace/trace.js";
import * as VisualLogging2 from "./../../../visual_logging/visual_logging.js";
import * as UI4 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/perf_ui/filmStripView.css.js
var filmStripView_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.film-strip-view {
  overflow: auto hidden;
  align-content: flex-start;
  min-height: 81px;
}

.film-strip-view .frame .time {
  font-size: 10px;
  margin-top: 2px;
}

.film-strip-view .gray-info-message {
  margin: auto;
}

.film-strip-view .frame {
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  flex: none;
  cursor: pointer;
}

.film-strip-view .frame .thumbnail {
  min-width: 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  pointer-events: none;
  margin: 4px 0 2px;
  border: 2px solid transparent;
}

.film-strip-view .frame:hover .thumbnail,
.film-strip-view .frame:focus .thumbnail {
  border-color: var(--sys-color-primary);
}

.film-strip-view .frame .thumbnail img {
  height: auto;
  width: auto;
  max-width: 80px;
  max-height: 50px;
  pointer-events: none;
  box-shadow: 0 0 3px var(--box-shadow-outline-color);
  flex: 0 0 auto;
}

.film-strip-view .frame:hover .thumbnail img,
.film-strip-view .frame:focus .thumbnail img {
  box-shadow: none;
}

.film-strip-image-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;

  .image-box {
    overflow: auto;
    margin: var(--sys-size-7) var(--sys-size-8) var(--sys-size-8)
      var(--sys-size-8);
    border: var(--sys-size-1) solid var(--sys-color-divider);
  }

  img {
    max-height: 80vh;
    max-width: 80vw;
  }

  .time-box {
    margin: 0 var(--sys-size-3);
  }

  .button-box {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: var(--sys-size-6) 0 var(--sys-size-5);
  }
}

/*# sourceURL=${import.meta.resolve("./filmStripView.css")} */`;

// gen/front_end/ui/legacy/components/perf_ui/FilmStripView.js
var UIStrings3 = {
  /**
   * @description Element title in Film Strip View of the Performance panel
   */
  doubleclickToZoomImageClickTo: "Doubleclick to zoom image. Click to view preceding requests.",
  /**
   * @description Aria label for captured screenshots in network panel.
   * @example {3ms} PH1
   */
  screenshotForSSelectToView: "Screenshot for {PH1} - select to view preceding requests.",
  /**
   * @description Text for one or a group of screenshots
   */
  screenshot: "Screenshot",
  /**
   * @description Prev button title in Film Strip View of the Performance panel
   */
  previousFrame: "Previous frame",
  /**
   * @description Next button title in Film Strip View of the Performance panel
   */
  nextFrame: "Next frame"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/components/perf_ui/FilmStripView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var FilmStripView = class _FilmStripView extends Common3.ObjectWrapper.eventMixin(UI4.Widget.HBox) {
  statusLabel;
  zeroTime = Trace2.Types.Timing.Milli(0);
  #filmStrip = null;
  constructor() {
    super({ useShadowDom: true });
    this.registerRequiredCSS(filmStripView_css_default);
    this.contentElement.classList.add("film-strip-view");
    this.statusLabel = this.contentElement.createChild("div", "gray-info-message");
    this.reset();
  }
  static setImageData(imageElement, dataUri) {
    if (dataUri) {
      imageElement.src = dataUri;
    }
  }
  setModel(filmStrip) {
    this.#filmStrip = filmStrip;
    this.zeroTime = Trace2.Helpers.Timing.microToMilli(filmStrip.zeroTime);
    if (!this.#filmStrip.frames.length) {
      this.reset();
      return;
    }
    this.update();
  }
  createFrameElement(frame) {
    const time = Trace2.Helpers.Timing.microToMilli(frame.screenshotEvent.ts);
    const frameTime = i18n5.TimeUtilities.millisToString(time - this.zeroTime);
    const element = document.createElement("button");
    element.classList.add("frame");
    UI4.Tooltip.Tooltip.install(element, i18nString3(UIStrings3.doubleclickToZoomImageClickTo));
    element.createChild("div", "time").textContent = frameTime;
    element.tabIndex = 0;
    element.setAttribute("jslog", `${VisualLogging2.preview("film-strip").track({ click: true, dblclick: true })}`);
    element.setAttribute("aria-label", i18nString3(UIStrings3.screenshotForSSelectToView, { PH1: frameTime }));
    UI4.ARIAUtils.markAsButton(element);
    const imageElement = element.createChild("div", "thumbnail").createChild("img");
    imageElement.alt = i18nString3(UIStrings3.screenshot);
    element.addEventListener("mousedown", this.onMouseEvent.bind(this, "FrameSelected", time), false);
    element.addEventListener("mouseenter", this.onMouseEvent.bind(this, "FrameEnter", time), false);
    element.addEventListener("mouseout", this.onMouseEvent.bind(this, "FrameExit", time), false);
    element.addEventListener("dblclick", this.onDoubleClick.bind(this, frame), false);
    element.addEventListener("focusin", this.onMouseEvent.bind(this, "FrameEnter", time), false);
    element.addEventListener("focusout", this.onMouseEvent.bind(this, "FrameExit", time), false);
    const imgData = Trace2.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(frame.screenshotEvent);
    _FilmStripView.setImageData(imageElement, imgData);
    return element;
  }
  update() {
    const frames = this.#filmStrip?.frames;
    if (!frames || frames.length < 1) {
      return;
    }
    const frameElements = frames.map((frame) => this.createFrameElement(frame));
    this.contentElement.removeChildren();
    for (const element of frameElements) {
      this.contentElement.appendChild(element);
    }
  }
  onMouseEvent(eventName, timestamp) {
    this.dispatchEventToListeners(eventName, timestamp);
  }
  onDoubleClick(filmStripFrame) {
    if (!this.#filmStrip) {
      return;
    }
    Dialog2.fromFilmStrip(this.#filmStrip, filmStripFrame.index);
  }
  reset() {
    this.zeroTime = Trace2.Types.Timing.Milli(0);
    this.contentElement.removeChildren();
    this.contentElement.appendChild(this.statusLabel);
  }
  setStatusText(text) {
    this.statusLabel.textContent = text;
  }
};
var Dialog2 = class _Dialog {
  widget;
  index;
  dialog = null;
  #data;
  static fromFilmStrip(filmStrip, selectedFrameIndex) {
    const data = {
      source: "Trace",
      frames: filmStrip.frames,
      index: selectedFrameIndex,
      zeroTime: Trace2.Helpers.Timing.microToMilli(filmStrip.zeroTime)
    };
    return new _Dialog(data);
  }
  constructor(data) {
    this.#data = data;
    this.index = data.index;
    const prevButton = UI4.UIUtils.createTextButton("\u25C0", this.onPrevFrame.bind(this));
    UI4.Tooltip.Tooltip.install(prevButton, i18nString3(UIStrings3.previousFrame));
    const nextButton = UI4.UIUtils.createTextButton("\u25B6", this.onNextFrame.bind(this));
    UI4.Tooltip.Tooltip.install(nextButton, i18nString3(UIStrings3.nextFrame));
    this.widget = new UI4.Widget.Widget({ classes: ["film-strip-image-dialog"] });
    this.widget.registerRequiredCSS(filmStripView_css_default);
    const imageBox = document.createElement("div");
    imageBox.classList.add("image-box");
    const image = document.createElement("img");
    image.setAttribute("data-film-strip-dialog-img", "");
    imageBox.append(image);
    const buttonBox = document.createElement("div");
    buttonBox.classList.add("button-box");
    const timeBox = document.createElement("div");
    timeBox.classList.add("time-box");
    buttonBox.append(prevButton);
    buttonBox.append(timeBox);
    buttonBox.append(nextButton);
    this.widget.contentElement.append(imageBox);
    this.widget.contentElement.append(buttonBox);
    this.widget.element.tabIndex = 0;
    this.widget.contentElement.append();
    this.widget.contentElement.addEventListener("keydown", this.keyDown.bind(this), false);
    this.dialog = null;
    void this.render();
  }
  hide() {
    if (this.dialog) {
      this.dialog.hide();
    }
  }
  #framesCount() {
    return this.#data.frames.length;
  }
  #zeroTime() {
    return this.#data.zeroTime;
  }
  resize() {
    if (!this.dialog) {
      this.dialog = new UI4.Dialog.Dialog();
      this.widget.show(this.dialog.contentElement);
      this.dialog.setDefaultFocusedElement(this.widget.element);
      this.dialog.show();
    }
    this.dialog.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
  }
  keyDown(event) {
    const keyboardEvent = event;
    switch (keyboardEvent.key) {
      case "ArrowLeft":
        if (Host2.Platform.isMac() && keyboardEvent.metaKey) {
          this.onFirstFrame();
        } else {
          this.onPrevFrame();
        }
        break;
      case "ArrowRight":
        if (Host2.Platform.isMac() && keyboardEvent.metaKey) {
          this.onLastFrame();
        } else {
          this.onNextFrame();
        }
        break;
      case "Home":
        this.onFirstFrame();
        break;
      case "End":
        this.onLastFrame();
        break;
    }
  }
  onPrevFrame() {
    if (this.index > 0) {
      --this.index;
    }
    void this.render();
  }
  onNextFrame() {
    if (this.index < this.#framesCount() - 1) {
      ++this.index;
    }
    void this.render();
  }
  onFirstFrame() {
    this.index = 0;
    void this.render();
  }
  onLastFrame() {
    this.index = this.#framesCount() - 1;
    void this.render();
  }
  render() {
    const frame = this.#data.frames[this.index];
    const timestamp = Trace2.Helpers.Timing.microToMilli(frame.screenshotEvent.ts);
    const timeBox = this.widget.contentElement.querySelector(".time-box");
    if (timeBox) {
      timeBox.textContent = i18n5.TimeUtilities.millisToString(timestamp - this.#zeroTime());
    }
    const image = this.widget.contentElement.querySelector("img");
    if (!image) {
      return;
    }
    image.setAttribute("data-frame-index", this.index.toString());
    const imgData = Trace2.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(frame.screenshotEvent);
    FilmStripView.setImageData(image, imgData);
    this.resize();
  }
};

// gen/front_end/ui/legacy/components/perf_ui/GCActionDelegate.js
var GCActionDelegate_exports = {};
__export(GCActionDelegate_exports, {
  GCActionDelegate: () => GCActionDelegate
});
import * as SDK from "./../../../../core/sdk/sdk.js";
var GCActionDelegate = class {
  handleAction(_context, _actionId) {
    for (const heapProfilerModel of SDK.TargetManager.TargetManager.instance().models(SDK.HeapProfilerModel.HeapProfilerModel)) {
      void heapProfilerModel.collectGarbage();
    }
    return true;
  }
};

// gen/front_end/ui/legacy/components/perf_ui/LineLevelProfile.js
var LineLevelProfile_exports = {};
__export(LineLevelProfile_exports, {
  Helper: () => Helper,
  Memory: () => Memory,
  Performance: () => Performance
});
import * as SDK2 from "./../../../../core/sdk/sdk.js";
import * as Bindings from "./../../../../models/bindings/bindings.js";
import * as Workspace from "./../../../../models/workspace/workspace.js";
import * as SourceFrame from "./../source_frame/source_frame.js";
var performanceInstance;
var Performance = class _Performance {
  helper;
  constructor() {
    this.helper = new Helper(
      "performance"
      /* SourceFrame.SourceFrame.DecoratorType.PERFORMANCE */
    );
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!performanceInstance || forceNew) {
      performanceInstance = new _Performance();
    }
    return performanceInstance;
  }
  reset() {
    this.helper.reset();
  }
  appendLegacyCPUProfile(profile, target) {
    const nodesToGo = [profile.profileHead];
    const sampleDuration = (profile.profileEndTime - profile.profileStartTime) / profile.totalHitCount;
    while (nodesToGo.length) {
      const nodes = nodesToGo.pop()?.children ?? [];
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i];
        nodesToGo.push(node);
        if (!node.url || !node.positionTicks) {
          continue;
        }
        for (let j = 0; j < node.positionTicks.length; ++j) {
          const lineInfo = node.positionTicks[j];
          const line = lineInfo.line;
          const time = lineInfo.ticks * sampleDuration;
          this.helper.addLineData(target, node.url, line, time);
        }
      }
    }
  }
  appendCPUProfile(profile, target) {
    if (!profile.lines) {
      this.appendLegacyCPUProfile(profile, target);
      this.helper.scheduleUpdate();
      return;
    }
    if (!profile.samples) {
      return;
    }
    for (let i = 1; i < profile.samples.length; ++i) {
      const line = profile.lines[i];
      if (!line) {
        continue;
      }
      const node = profile.nodeByIndex(i);
      if (!node) {
        continue;
      }
      const scriptIdOrUrl = Number(node.scriptId) || node.url;
      if (!scriptIdOrUrl) {
        continue;
      }
      const time = profile.timestamps[i] - profile.timestamps[i - 1];
      this.helper.addLineData(target, scriptIdOrUrl, line, time);
    }
    this.helper.scheduleUpdate();
  }
};
var memoryInstance;
var Memory = class _Memory {
  helper;
  constructor() {
    this.helper = new Helper(
      "memory"
      /* SourceFrame.SourceFrame.DecoratorType.MEMORY */
    );
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!memoryInstance || forceNew) {
      memoryInstance = new _Memory();
    }
    return memoryInstance;
  }
  reset() {
    this.helper.reset();
  }
  appendHeapProfile(profile, target) {
    const helper = this.helper;
    processNode(profile.head);
    helper.scheduleUpdate();
    function processNode(node) {
      node.children.forEach(processNode);
      if (!node.selfSize) {
        return;
      }
      const script = Number(node.callFrame.scriptId) || node.callFrame.url;
      if (!script) {
        return;
      }
      const line = node.callFrame.lineNumber + 1;
      helper.addLineData(target, script, line, node.selfSize);
    }
  }
};
var Helper = class {
  type;
  locationPool = new Bindings.LiveLocation.LiveLocationPool();
  updateTimer = null;
  lineData = /* @__PURE__ */ new Map();
  constructor(type) {
    this.type = type;
    this.reset();
  }
  reset() {
    this.lineData = /* @__PURE__ */ new Map();
    this.scheduleUpdate();
  }
  addLineData(target, scriptIdOrUrl, line, data) {
    let targetData = this.lineData.get(target);
    if (!targetData) {
      targetData = /* @__PURE__ */ new Map();
      this.lineData.set(target, targetData);
    }
    let scriptData = targetData.get(scriptIdOrUrl);
    if (!scriptData) {
      scriptData = /* @__PURE__ */ new Map();
      targetData.set(scriptIdOrUrl, scriptData);
    }
    scriptData.set(line, (scriptData.get(line) || 0) + data);
  }
  scheduleUpdate() {
    if (this.updateTimer) {
      return;
    }
    this.updateTimer = window.setTimeout(() => {
      this.updateTimer = null;
      void this.doUpdate();
    }, 0);
  }
  async doUpdate() {
    this.locationPool.disposeAll();
    const decorationsBySource = /* @__PURE__ */ new Map();
    const pending = [];
    for (const [target, scriptToLineMap] of this.lineData) {
      const debuggerModel = target ? target.model(SDK2.DebuggerModel.DebuggerModel) : null;
      for (const [scriptIdOrUrl, lineToDataMap] of scriptToLineMap) {
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        if (debuggerModel) {
          const workspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
          for (const lineToData of lineToDataMap) {
            const line = lineToData[0] - 1;
            const data = lineToData[1];
            const rawLocation = typeof scriptIdOrUrl === "string" ? debuggerModel.createRawLocationByURL(scriptIdOrUrl, line, 0) : debuggerModel.createRawLocationByScriptId(String(scriptIdOrUrl), line, 0);
            if (rawLocation) {
              pending.push(workspaceBinding.rawLocationToUILocation(rawLocation).then((uiLocation) => {
                if (uiLocation) {
                  let lineMap = decorationsBySource.get(uiLocation.uiSourceCode);
                  if (!lineMap) {
                    lineMap = /* @__PURE__ */ new Map();
                    decorationsBySource.set(uiLocation.uiSourceCode, lineMap);
                  }
                  lineMap.set(uiLocation.lineNumber + 1, data);
                }
              }));
            }
          }
        } else if (typeof scriptIdOrUrl === "string") {
          const uiSourceCode = workspace.uiSourceCodeForURL(scriptIdOrUrl);
          if (uiSourceCode) {
            decorationsBySource.set(uiSourceCode, lineToDataMap);
          }
        }
      }
      await Promise.all(pending);
      for (const [uiSourceCode, lineMap] of decorationsBySource) {
        uiSourceCode.setDecorationData(this.type, lineMap);
      }
    }
    for (const uiSourceCode of Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes()) {
      if (!decorationsBySource.has(uiSourceCode)) {
        uiSourceCode.setDecorationData(this.type, void 0);
      }
    }
  }
};

// gen/front_end/ui/legacy/components/perf_ui/LiveHeapProfile.js
var LiveHeapProfile_exports = {};
__export(LiveHeapProfile_exports, {
  LiveHeapProfile: () => LiveHeapProfile
});
import * as Common4 from "./../../../../core/common/common.js";
import * as Host3 from "./../../../../core/host/host.js";
import * as SDK3 from "./../../../../core/sdk/sdk.js";
var liveHeapProfileInstance;
var LiveHeapProfile = class _LiveHeapProfile {
  running;
  sessionId;
  loadEventCallback;
  setting;
  constructor() {
    this.running = false;
    this.sessionId = 0;
    this.loadEventCallback = () => {
    };
    this.setting = Common4.Settings.Settings.instance().moduleSetting("memory-live-heap-profile");
    this.setting.addChangeListener((event) => event.data ? this.startProfiling() : this.stopProfiling());
    if (this.setting.get()) {
      void this.startProfiling();
    }
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!liveHeapProfileInstance || forceNew) {
      liveHeapProfileInstance = new _LiveHeapProfile();
    }
    return liveHeapProfileInstance;
  }
  async run() {
    return;
  }
  modelAdded(model) {
    void model.startSampling(1e4);
  }
  modelRemoved(_model) {
  }
  async startProfiling() {
    if (this.running) {
      return;
    }
    this.running = true;
    const sessionId = this.sessionId;
    SDK3.TargetManager.TargetManager.instance().observeModels(SDK3.HeapProfilerModel.HeapProfilerModel, this);
    SDK3.TargetManager.TargetManager.instance().addModelListener(SDK3.ResourceTreeModel.ResourceTreeModel, SDK3.ResourceTreeModel.Events.Load, this.loadEventFired, this);
    do {
      const models = SDK3.TargetManager.TargetManager.instance().models(SDK3.HeapProfilerModel.HeapProfilerModel);
      const profiles = await Promise.all(models.map((model) => model.getSamplingProfile()));
      if (sessionId !== this.sessionId) {
        break;
      }
      Memory.instance().reset();
      for (let i = 0; i < profiles.length; ++i) {
        const profile = profiles[i];
        if (!profile) {
          continue;
        }
        Memory.instance().appendHeapProfile(profile, models[i].target());
      }
      await Promise.race([
        new Promise((r) => window.setTimeout(r, Host3.InspectorFrontendHost.isUnderTest() ? 10 : 5e3)),
        new Promise((r) => {
          this.loadEventCallback = r;
        })
      ]);
    } while (sessionId === this.sessionId);
    SDK3.TargetManager.TargetManager.instance().unobserveModels(SDK3.HeapProfilerModel.HeapProfilerModel, this);
    SDK3.TargetManager.TargetManager.instance().removeModelListener(SDK3.ResourceTreeModel.ResourceTreeModel, SDK3.ResourceTreeModel.Events.Load, this.loadEventFired, this);
    for (const model of SDK3.TargetManager.TargetManager.instance().models(SDK3.HeapProfilerModel.HeapProfilerModel)) {
      void model.stopSampling();
    }
    Memory.instance().reset();
  }
  stopProfiling() {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.sessionId++;
  }
  loadEventFired() {
    this.loadEventCallback();
  }
};

// gen/front_end/ui/legacy/components/perf_ui/NetworkPriorities.js
var NetworkPriorities_exports = {};
__export(NetworkPriorities_exports, {
  networkPriorityWeight: () => networkPriorityWeight,
  priorityUILabelMap: () => priorityUILabelMap,
  uiLabelForNetworkPriority: () => uiLabelForNetworkPriority,
  uiLabelToNetworkPriority: () => uiLabelToNetworkPriority
});
import * as i18n7 from "./../../../../core/i18n/i18n.js";
var UIStrings4 = {
  /**
   * @description Text in Network Priorities of the Performance panel
   */
  lowest: "Lowest",
  /**
   * @description Text in Network Priorities of the Performance panel
   */
  low: "Low",
  /**
   * @description Text in Network Priorities of the Performance panel
   */
  medium: "Medium",
  /**
   * @description Text in Network Priorities of the Performance panel
   */
  high: "High",
  /**
   * @description Text in Network Priorities of the Performance panel
   */
  highest: "Highest"
};
var str_4 = i18n7.i18n.registerUIStrings("ui/legacy/components/perf_ui/NetworkPriorities.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
function uiLabelForNetworkPriority(priority) {
  return priorityUILabelMap().get(priority) || "";
}
var uiLabelToPriorityMapInstance = /* @__PURE__ */ new Map();
function uiLabelToNetworkPriority(priorityLabel) {
  if (uiLabelToPriorityMapInstance.size === 0) {
    priorityUILabelMap().forEach((value, key) => uiLabelToPriorityMapInstance.set(value, key));
  }
  const priority = uiLabelToPriorityMapInstance.get(priorityLabel);
  if (priority) {
    return priority;
  }
  throw new Error("Priority not found");
}
var priorityUILabelMapInstance = /* @__PURE__ */ new Map();
function priorityUILabelMap() {
  if (priorityUILabelMapInstance.size === 0) {
    priorityUILabelMapInstance.set("VeryLow", i18nString4(UIStrings4.lowest));
    priorityUILabelMapInstance.set("Low", i18nString4(UIStrings4.low));
    priorityUILabelMapInstance.set("Medium", i18nString4(UIStrings4.medium));
    priorityUILabelMapInstance.set("High", i18nString4(UIStrings4.high));
    priorityUILabelMapInstance.set("VeryHigh", i18nString4(UIStrings4.highest));
  }
  return priorityUILabelMapInstance;
}
var networkPriorityWeights = /* @__PURE__ */ new Map();
function networkPriorityWeight(priority) {
  if (networkPriorityWeights.size === 0) {
    networkPriorityWeights.set("VeryLow", 1);
    networkPriorityWeights.set("Low", 2);
    networkPriorityWeights.set("Medium", 3);
    networkPriorityWeights.set("High", 4);
    networkPriorityWeights.set("VeryHigh", 5);
  }
  return networkPriorityWeights.get(priority) || 0;
}

// gen/front_end/ui/legacy/components/perf_ui/OverviewGrid.js
var OverviewGrid_exports = {};
__export(OverviewGrid_exports, {
  OverviewGrid: () => OverviewGrid,
  Window: () => Window,
  WindowSelector: () => WindowSelector
});
import * as Common5 from "./../../../../core/common/common.js";
import * as i18n9 from "./../../../../core/i18n/i18n.js";
import * as Platform6 from "./../../../../core/platform/platform.js";
import * as IconButton from "./../../../components/icon_button/icon_button.js";
import * as VisualLogging3 from "./../../../visual_logging/visual_logging.js";
import * as UI5 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/perf_ui/overviewGrid.css.js
var overviewGrid_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.overview-grid-window-selector {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: var(--sys-color-state-ripple-primary);
  z-index: 250;
  pointer-events: none;
}

.overview-grid-window-resizer {
  position: absolute;
  top: 0;
  height: 19px;
  width: 10px;
  margin-left: -5px; /* half width (incl the border) */
  background-color: var(--sys-color-tonal-container);
  border: 1px solid var(--sys-color-tonal-outline);
  z-index: 500;
  border-radius: 3px;
}

/* Grip lines within the handle */
.overview-grid-window-resizer::before,
.overview-grid-window-resizer::after {
  content: "";
  width: 1px;
  background: var(--sys-color-primary);
  height: 7px;
  position: absolute;
  left: 2px;
  top: 5px;
  border-radius: 1px;
}

.overview-grid-window-resizer::after {
  left: 5px;
}

.overview-grid-window-resizer:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

.overview-grid-cursor-area {
  position: absolute;
  inset: 20px 0 0;
  z-index: 500;
  cursor: text;
}

.overview-grid-cursor-position {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--sys-color-primary);
  z-index: 500;
  pointer-events: none;
  visibility: hidden;
  overflow: hidden;
}

.window-curtain-left,
.window-curtain-right {
  background-color: var(--sys-color-state-ripple-primary);
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 300;
  pointer-events: none;
  border: 2px none var(--sys-color-tonal-outline);
}

.window-curtain-left {
  left: 0;
  border-right-style: solid;
}

.window-curtain-right {
  right: 0;
  border-left-style: solid;
}

.create-breadcrumb-button-container {
  visibility: hidden;
  opacity: 0%;
  transition: opacity 100ms 250ms;
  display: flex;
  position: absolute;
  top: 15px;
  justify-content: center;
  z-index: 600;
  left: 0;
  right: 0;
}

.is-breadcrumb-button-visible {
  visibility: visible;
  opacity: 100%;
}

.create-breadcrumb-button-container.with-screenshots {
  /* We have more room when screenshots are enabled,
   * so push the button down slightly */
  top: 20px;
}

.create-breadcrumb-button {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  background: var(--sys-color-cdt-base-container);
  box-shadow: var(--drop-shadow-depth-3);
  border-radius: 50px;
  padding: 1px 6px;
  gap: 2px;
}

.create-breadcrumb-button:active {
  /* On minimap cursor changes to text to selected an area,
  * so keep it as default on the breadcrumb button */
  cursor: default;
}

.create-breadcrumb-button:hover {
  background: var(--sys-color-neutral-container);
}

@media (forced-colors: active) {
  .overview-grid-cursor-position {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  .window-curtain-left,
  .window-curtain-right {
    background-color: transparent;
    border-color: ButtonText;
  }

  .overview-grid-window-resizer {
    background-color: ButtonText;
  }

  .overview-grid-window-resizer:hover,
  .overview-grid-window-resizer:active,
  .overview-grid-window-resizer:focus-visible {
    forced-color-adjust: none;
    background-color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./overviewGrid.css")} */`;

// gen/front_end/ui/legacy/components/perf_ui/OverviewGrid.js
var UIStrings5 = {
  /**
   * @description Label for the window for Overview grids
   */
  overviewGridWindow: "Overview grid window",
  /**
   * @description Label for left window resizer for Overview grids
   */
  leftResizer: "Left Resizer",
  /**
   * @description Label for right window resizer for Overview grids
   */
  rightResizer: "Right Resizer"
};
var str_5 = i18n9.i18n.registerUIStrings("ui/legacy/components/perf_ui/OverviewGrid.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var OverviewGrid = class {
  element;
  grid;
  // The |window| will manage the html element of resizers, the left/right blue-colour curtain, and handle the resizing,
  // zooming, and breadcrumb creation.
  window;
  constructor(prefix, calculator) {
    this.element = document.createElement("div");
    this.element.id = prefix + "-overview-container";
    this.grid = new TimelineGrid();
    this.grid.element.id = prefix + "-overview-grid";
    this.grid.setScrollTop(0);
    this.element.appendChild(this.grid.element);
    this.window = new Window(this.element, this.grid.dividersLabelBarElement, calculator);
  }
  enableCreateBreadcrumbsButton() {
    return this.window.enableCreateBreadcrumbsButton();
  }
  set showingScreenshots(isShowing) {
    this.window.showingScreenshots = isShowing;
  }
  clientWidth() {
    return this.element.clientWidth;
  }
  updateDividers(calculator) {
    this.grid.updateDividers(calculator);
  }
  addEventDividers(dividers) {
    this.grid.addEventDividers(dividers);
  }
  removeEventDividers() {
    this.grid.removeEventDividers();
  }
  reset() {
    this.window.reset();
  }
  // The ratio of the left slider position compare to the whole overview grid.
  // It should be a number between 0 and 1.
  windowLeftRatio() {
    return this.window.windowLeftRatio || 0;
  }
  // The ratio of the right slider position compare to the whole overview grid.
  // It should be a number between 0 and 1.
  windowRightRatio() {
    return this.window.windowRightRatio || 0;
  }
  /**
   * This function will return the raw value of the slider window.
   * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
   *
   * @returns the pair of start/end value of the slider window in milliseconds or bytes
   */
  calculateWindowValue() {
    return this.window.calculateWindowValue();
  }
  setWindowRatio(leftRatio, rightRatio) {
    this.window.setWindowRatio(leftRatio, rightRatio);
  }
  addEventListener(eventType, listener, thisObject) {
    return this.window.addEventListener(eventType, listener, thisObject);
  }
  setClickHandler(clickHandler) {
    this.window.setClickHandler(clickHandler);
  }
  zoom(zoomFactor, referencePoint) {
    this.window.zoom(zoomFactor, referencePoint);
  }
  setResizeEnabled(enabled) {
    this.window.setResizeEnabled(enabled);
  }
};
var MinSelectableSize = 14;
var WindowScrollSpeedFactor = 0.3;
var ResizerOffset = 5;
var OffsetFromWindowEnds = 10;
var Window = class extends Common5.ObjectWrapper.ObjectWrapper {
  parentElement;
  calculator;
  leftResizeElement;
  rightResizeElement;
  leftCurtainElement;
  rightCurtainElement;
  breadcrumbButtonContainerElement;
  createBreadcrumbButton;
  curtainsRange;
  breadcrumbZoomIcon;
  overviewWindowSelector;
  offsetLeft;
  dragStartPointPixel;
  dragStartLeftRatio;
  dragStartRightRatio;
  // The ratio of the left/right resizer position compare to the whole overview grid.
  // They should be a number between 0 and 1.
  windowLeftRatio = 0;
  windowRightRatio = 1;
  resizeEnabled;
  clickHandler;
  resizerParentOffsetLeft;
  #breadcrumbsEnabled = false;
  #mouseOverGridOverview = false;
  constructor(parentElement, dividersLabelBarElement, calculator) {
    super();
    this.parentElement = parentElement;
    this.parentElement.classList.add("parent-element");
    UI5.ARIAUtils.markAsGroup(this.parentElement);
    this.calculator = calculator;
    UI5.ARIAUtils.setLabel(this.parentElement, i18nString5(UIStrings5.overviewGridWindow));
    UI5.UIUtils.installDragHandle(this.parentElement, this.startWindowSelectorDragging.bind(this), this.windowSelectorDragging.bind(this), this.endWindowSelectorDragging.bind(this), "text", null);
    if (dividersLabelBarElement) {
      UI5.UIUtils.installDragHandle(dividersLabelBarElement, this.startWindowDragging.bind(this), this.windowDragging.bind(this), null, "-webkit-grabbing", "-webkit-grab");
    }
    this.parentElement.addEventListener("wheel", this.onMouseWheel.bind(this), true);
    this.parentElement.addEventListener("dblclick", this.resizeWindowMaximum.bind(this), true);
    Platform6.DOMUtilities.appendStyle(this.parentElement, overviewGrid_css_default);
    this.leftResizeElement = parentElement.createChild("div", "overview-grid-window-resizer");
    UI5.UIUtils.installDragHandle(this.leftResizeElement, this.resizerElementStartDragging.bind(this), this.leftResizeElementDragging.bind(this), null, "ew-resize");
    this.rightResizeElement = parentElement.createChild("div", "overview-grid-window-resizer");
    UI5.UIUtils.installDragHandle(this.rightResizeElement, this.resizerElementStartDragging.bind(this), this.rightResizeElementDragging.bind(this), null, "ew-resize");
    UI5.ARIAUtils.setLabel(this.leftResizeElement, i18nString5(UIStrings5.leftResizer));
    UI5.ARIAUtils.markAsSlider(this.leftResizeElement);
    const leftKeyDown = (event) => this.handleKeyboardResizing(event, false);
    this.leftResizeElement.addEventListener("keydown", leftKeyDown);
    this.leftResizeElement.addEventListener("click", this.onResizerClicked);
    UI5.ARIAUtils.setLabel(this.rightResizeElement, i18nString5(UIStrings5.rightResizer));
    UI5.ARIAUtils.markAsSlider(this.rightResizeElement);
    const rightKeyDown = (event) => this.handleKeyboardResizing(event, true);
    this.rightResizeElement.addEventListener("keydown", rightKeyDown);
    this.rightResizeElement.addEventListener("focus", this.onRightResizeElementFocused.bind(this));
    this.rightResizeElement.addEventListener("click", this.onResizerClicked);
    this.leftCurtainElement = parentElement.createChild("div", "window-curtain-left");
    this.rightCurtainElement = parentElement.createChild("div", "window-curtain-right");
    this.breadcrumbButtonContainerElement = parentElement.createChild("div", "create-breadcrumb-button-container");
    this.createBreadcrumbButton = this.breadcrumbButtonContainerElement.createChild("div", "create-breadcrumb-button");
    this.createBreadcrumbButton.setAttribute("jslog", `${VisualLogging3.action("timeline.create-breadcrumb").track({ click: true })}`);
    this.reset();
  }
  enableCreateBreadcrumbsButton() {
    this.curtainsRange = this.createBreadcrumbButton.createChild("div");
    this.breadcrumbZoomIcon = IconButton.Icon.create("zoom-in");
    this.createBreadcrumbButton.appendChild(this.breadcrumbZoomIcon);
    this.createBreadcrumbButton.addEventListener("click", () => {
      this.#createBreadcrumb();
    });
    this.#breadcrumbsEnabled = true;
    this.#changeBreadcrumbButtonVisibilityOnInteraction(this.parentElement);
    this.#changeBreadcrumbButtonVisibilityOnInteraction(this.rightResizeElement);
    this.#changeBreadcrumbButtonVisibilityOnInteraction(this.leftResizeElement);
    return this.breadcrumbButtonContainerElement;
  }
  set showingScreenshots(isShowing) {
    this.breadcrumbButtonContainerElement.classList.toggle("with-screenshots", isShowing);
  }
  #changeBreadcrumbButtonVisibilityOnInteraction(element) {
    if (!this.#breadcrumbsEnabled) {
      return;
    }
    element.addEventListener("mouseover", () => {
      if (this.windowLeftRatio <= 0 && this.windowRightRatio >= 1) {
        this.breadcrumbButtonContainerElement.classList.toggle("is-breadcrumb-button-visible", false);
        this.#mouseOverGridOverview = false;
      } else {
        this.breadcrumbButtonContainerElement.classList.toggle("is-breadcrumb-button-visible", true);
        this.#mouseOverGridOverview = true;
      }
    });
    element.addEventListener("mouseout", () => {
      this.breadcrumbButtonContainerElement.classList.toggle("is-breadcrumb-button-visible", false);
      this.#mouseOverGridOverview = false;
    });
  }
  onResizerClicked(event) {
    if (event.target) {
      event.target.focus();
    }
  }
  onRightResizeElementFocused() {
    this.parentElement.scrollLeft = 0;
  }
  reset() {
    this.windowLeftRatio = 0;
    this.windowRightRatio = 1;
    this.setResizeEnabled(true);
    this.updateCurtains();
  }
  setResizeEnabled(resizeEnabled) {
    this.resizeEnabled = resizeEnabled;
    this.rightResizeElement.tabIndex = resizeEnabled ? 0 : -1;
    this.leftResizeElement.tabIndex = resizeEnabled ? 0 : -1;
  }
  setClickHandler(clickHandler) {
    this.clickHandler = clickHandler;
  }
  resizerElementStartDragging(event) {
    const mouseEvent = event;
    const target = event.target;
    if (!this.resizeEnabled) {
      return false;
    }
    this.resizerParentOffsetLeft = mouseEvent.pageX - mouseEvent.offsetX - target.offsetLeft;
    event.stopPropagation();
    return true;
  }
  leftResizeElementDragging(event) {
    const mouseEvent = event;
    this.resizeWindowLeft(mouseEvent.pageX - (this.resizerParentOffsetLeft || 0));
    event.preventDefault();
  }
  rightResizeElementDragging(event) {
    const mouseEvent = event;
    this.resizeWindowRight(mouseEvent.pageX - (this.resizerParentOffsetLeft || 0));
    event.preventDefault();
  }
  handleKeyboardResizing(event, moveRightResizer) {
    const keyboardEvent = event;
    const target = event.target;
    let increment = false;
    if (keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowRight") {
      if (keyboardEvent.key === "ArrowRight") {
        increment = true;
      }
      const newPos = this.getNewResizerPosition(target.offsetLeft, increment, keyboardEvent.ctrlKey);
      if (moveRightResizer) {
        this.resizeWindowRight(newPos);
      } else {
        this.resizeWindowLeft(newPos);
      }
      event.consume(true);
    }
  }
  getNewResizerPosition(offset, increment, ctrlPressed) {
    let newPos;
    let pixelsToShift = ctrlPressed ? 10 : 2;
    pixelsToShift = increment ? pixelsToShift : -Math.abs(pixelsToShift);
    const offsetLeft = offset + ResizerOffset;
    newPos = offsetLeft + pixelsToShift;
    if (increment && newPos < OffsetFromWindowEnds) {
      newPos = OffsetFromWindowEnds;
    } else if (!increment && newPos > this.parentElement.clientWidth - OffsetFromWindowEnds) {
      newPos = this.parentElement.clientWidth - OffsetFromWindowEnds;
    }
    return newPos;
  }
  startWindowSelectorDragging(event) {
    if (!this.resizeEnabled) {
      return false;
    }
    const mouseEvent = event;
    this.offsetLeft = this.parentElement.getBoundingClientRect().left;
    const position = mouseEvent.x - this.offsetLeft;
    this.overviewWindowSelector = new WindowSelector(this.parentElement, position);
    return true;
  }
  windowSelectorDragging(event) {
    this.#mouseOverGridOverview = true;
    if (!this.overviewWindowSelector) {
      return;
    }
    const mouseEvent = event;
    this.overviewWindowSelector.updatePosition(mouseEvent.x - this.offsetLeft);
    event.preventDefault();
  }
  endWindowSelectorDragging(event) {
    if (!this.overviewWindowSelector) {
      return;
    }
    const mouseEvent = event;
    const window2 = this.overviewWindowSelector.close(mouseEvent.x - this.offsetLeft);
    if (this.#breadcrumbsEnabled && window2.start === window2.end) {
      return;
    }
    delete this.overviewWindowSelector;
    const clickThreshold = 3;
    if (window2.end - window2.start < clickThreshold) {
      if (this.clickHandler?.call(null, event)) {
        return;
      }
      const middle = window2.end;
      window2.start = Math.max(0, middle - MinSelectableSize / 2);
      window2.end = Math.min(this.parentElement.clientWidth, middle + MinSelectableSize / 2);
    } else if (window2.end - window2.start < MinSelectableSize) {
      if (this.parentElement.clientWidth - window2.end > MinSelectableSize) {
        window2.end = window2.start + MinSelectableSize;
      } else {
        window2.start = window2.end - MinSelectableSize;
      }
    }
    this.setWindowPosition(window2.start, window2.end);
  }
  startWindowDragging(event) {
    const mouseEvent = event;
    this.dragStartPointPixel = mouseEvent.pageX;
    this.dragStartLeftRatio = this.windowLeftRatio;
    this.dragStartRightRatio = this.windowRightRatio;
    event.stopPropagation();
    return true;
  }
  windowDragging(event) {
    this.#mouseOverGridOverview = true;
    if (this.#breadcrumbsEnabled) {
      this.breadcrumbButtonContainerElement.classList.toggle("is-breadcrumb-button-visible", true);
    }
    const mouseEvent = event;
    mouseEvent.preventDefault();
    let delta = (mouseEvent.pageX - this.dragStartPointPixel) / this.parentElement.clientWidth;
    if (this.dragStartLeftRatio + delta < 0) {
      delta = -this.dragStartLeftRatio;
    }
    if (this.dragStartRightRatio + delta > 1) {
      delta = 1 - this.dragStartRightRatio;
    }
    this.setWindowRatio(this.dragStartLeftRatio + delta, this.dragStartRightRatio + delta);
  }
  resizeWindowLeft(start) {
    this.#mouseOverGridOverview = true;
    if (start < OffsetFromWindowEnds) {
      start = 0;
    } else if (start > this.rightResizeElement.offsetLeft - 4) {
      start = this.rightResizeElement.offsetLeft - 4;
    }
    this.setWindowPosition(start, null);
  }
  resizeWindowRight(end) {
    this.#mouseOverGridOverview = true;
    if (end > this.parentElement.clientWidth - OffsetFromWindowEnds) {
      end = this.parentElement.clientWidth;
    } else if (end < this.leftResizeElement.offsetLeft + MinSelectableSize) {
      end = this.leftResizeElement.offsetLeft + MinSelectableSize;
    }
    this.setWindowPosition(null, end);
  }
  resizeWindowMaximum() {
    this.setWindowPosition(0, this.parentElement.clientWidth);
  }
  /**
   * This function will return the raw value of the give slider.
   * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
   * @param leftSlider if this slider is the left one
   * @returns the value in milliseconds or bytes
   */
  getRawSliderValue(leftSlider) {
    if (!this.calculator) {
      throw new Error("No calculator to calculate boundaries");
    }
    const minimumValue = this.calculator.minimumBoundary();
    const valueSpan = this.calculator.maximumBoundary() - minimumValue;
    if (leftSlider) {
      return minimumValue + valueSpan * this.windowLeftRatio;
    }
    return minimumValue + valueSpan * this.windowRightRatio;
  }
  updateResizeElementAriaValue(leftPercentValue, rightPercentValue) {
    const roundedLeftValue = leftPercentValue.toFixed(2);
    const roundedRightValue = rightPercentValue.toFixed(2);
    UI5.ARIAUtils.setAriaValueNow(this.leftResizeElement, roundedLeftValue);
    UI5.ARIAUtils.setAriaValueNow(this.rightResizeElement, roundedRightValue);
    const leftResizeCeiling = Number(roundedRightValue) - 0.5;
    const rightResizeFloor = Number(roundedLeftValue) + 0.5;
    UI5.ARIAUtils.setAriaValueMinMax(this.leftResizeElement, "0", leftResizeCeiling.toString());
    UI5.ARIAUtils.setAriaValueMinMax(this.rightResizeElement, rightResizeFloor.toString(), "100");
  }
  updateResizeElementPositionLabels() {
    if (!this.calculator) {
      return;
    }
    const startValue = this.calculator.formatValue(this.getRawSliderValue(
      /* leftSlider */
      true
    ));
    const endValue = this.calculator.formatValue(this.getRawSliderValue(
      /* leftSlider */
      false
    ));
    UI5.ARIAUtils.setAriaValueText(this.leftResizeElement, String(startValue));
    UI5.ARIAUtils.setAriaValueText(this.rightResizeElement, String(endValue));
  }
  updateResizeElementPercentageLabels(leftValue, rightValue) {
    UI5.ARIAUtils.setAriaValueText(this.leftResizeElement, leftValue);
    UI5.ARIAUtils.setAriaValueText(this.rightResizeElement, rightValue);
  }
  /**
   * This function will return the raw value of the slider window.
   * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
   *
   * @returns the pair of start/end value of the slider window in milliseconds or bytes
   */
  calculateWindowValue() {
    return {
      rawStartValue: this.getRawSliderValue(
        /* leftSlider */
        true
      ),
      rawEndValue: this.getRawSliderValue(
        /* leftSlider */
        false
      )
    };
  }
  setWindowRatio(windowLeftRatio, windowRightRatio) {
    this.windowLeftRatio = windowLeftRatio;
    this.windowRightRatio = windowRightRatio;
    this.updateCurtains();
    if (this.calculator) {
      this.dispatchEventToListeners("WindowChangedWithPosition", this.calculateWindowValue());
    }
    this.dispatchEventToListeners(
      "WindowChanged"
      /* Events.WINDOW_CHANGED */
    );
    this.#changeBreadcrumbButtonVisibility(windowLeftRatio, windowRightRatio);
  }
  // "Create breadcrumb" button is only visible when the window is set to
  // something other than the full range and mouse is hovering over the MiniMap
  #changeBreadcrumbButtonVisibility(windowLeftRatio, windowRightRatio) {
    if (!this.#breadcrumbsEnabled) {
      return;
    }
    if (windowRightRatio >= 1 && windowLeftRatio <= 0 || !this.#mouseOverGridOverview) {
      this.breadcrumbButtonContainerElement.classList.toggle("is-breadcrumb-button-visible", false);
    } else {
      this.breadcrumbButtonContainerElement.classList.toggle("is-breadcrumb-button-visible", true);
    }
  }
  #createBreadcrumb() {
    this.dispatchEventToListeners("BreadcrumbAdded", this.calculateWindowValue());
  }
  updateCurtains() {
    const windowLeftRatio = this.windowLeftRatio;
    const windowRightRatio = this.windowRightRatio;
    let leftRatio = windowLeftRatio;
    let rightRatio = windowRightRatio;
    const widthRatio = rightRatio - leftRatio;
    if (this.parentElement.clientWidth !== 0) {
      const widthInPixels = widthRatio * this.parentElement.clientWidth;
      const minWidthInPixels = MinSelectableSize / 2;
      if (widthInPixels < minWidthInPixels) {
        const factor = minWidthInPixels / widthInPixels;
        leftRatio = (windowRightRatio + windowLeftRatio - widthRatio * factor) / 2;
        rightRatio = (windowRightRatio + windowLeftRatio + widthRatio * factor) / 2;
      }
    }
    const leftResizerPercLeftOffset = 100 * leftRatio;
    const rightResizerPercLeftOffset = 100 * rightRatio;
    const rightResizerPercRightOffset = 100 - 100 * rightRatio;
    const leftResizerPercLeftOffsetString = leftResizerPercLeftOffset + "%";
    const rightResizerPercLeftOffsetString = rightResizerPercLeftOffset + "%";
    this.leftResizeElement.style.left = leftResizerPercLeftOffsetString;
    this.rightResizeElement.style.left = rightResizerPercLeftOffsetString;
    this.leftCurtainElement.style.width = leftResizerPercLeftOffsetString;
    this.rightCurtainElement.style.width = rightResizerPercRightOffset + "%";
    this.breadcrumbButtonContainerElement.style.marginLeft = leftResizerPercLeftOffset > 0 ? leftResizerPercLeftOffset + "%" : "0%";
    this.breadcrumbButtonContainerElement.style.marginRight = rightResizerPercRightOffset > 0 ? rightResizerPercRightOffset + "%" : "0%";
    if (this.curtainsRange) {
      this.curtainsRange.textContent = this.getWindowRange().toFixed(0) + " ms";
    }
    this.updateResizeElementAriaValue(leftResizerPercLeftOffset, rightResizerPercLeftOffset);
    if (this.calculator) {
      this.updateResizeElementPositionLabels();
    } else {
      this.updateResizeElementPercentageLabels(leftResizerPercLeftOffsetString, rightResizerPercLeftOffsetString);
    }
    this.toggleBreadcrumbZoomButtonDisplay();
  }
  toggleBreadcrumbZoomButtonDisplay() {
    if (this.breadcrumbZoomIcon) {
      if (this.getWindowRange() < 4.5) {
        this.breadcrumbZoomIcon.style.display = "none";
        this.breadcrumbButtonContainerElement.style.pointerEvents = "none";
      } else {
        this.breadcrumbZoomIcon.style.display = "flex";
        this.breadcrumbButtonContainerElement.style.pointerEvents = "auto";
      }
    }
  }
  getWindowRange() {
    if (!this.calculator) {
      throw new Error("No calculator to calculate window range");
    }
    const leftRatio = this.windowLeftRatio > 0 ? this.windowLeftRatio : 0;
    const rightRatio = this.windowRightRatio < 1 ? this.windowRightRatio : 1;
    return this.calculator.boundarySpan() * (rightRatio - leftRatio);
  }
  setWindowPosition(startPixel, endPixel) {
    const clientWidth = this.parentElement.clientWidth;
    const windowLeft = typeof startPixel === "number" ? startPixel / clientWidth : this.windowLeftRatio;
    const windowRight = typeof endPixel === "number" ? endPixel / clientWidth : this.windowRightRatio;
    this.setWindowRatio(windowLeft || 0, windowRight || 0);
  }
  onMouseWheel(event) {
    const wheelEvent = event;
    if (!this.resizeEnabled) {
      return;
    }
    if (wheelEvent.deltaY) {
      const zoomFactor = 1.1;
      const wheelZoomSpeed = 1 / 53;
      const reference = wheelEvent.offsetX / this.parentElement.clientWidth;
      this.zoom(Math.pow(zoomFactor, wheelEvent.deltaY * wheelZoomSpeed), reference);
    }
    if (wheelEvent.deltaX) {
      let offset = Math.round(wheelEvent.deltaX * WindowScrollSpeedFactor);
      const windowLeftPixel = this.leftResizeElement.offsetLeft + ResizerOffset;
      const windowRightPixel = this.rightResizeElement.offsetLeft + ResizerOffset;
      if (windowLeftPixel - offset < 0) {
        offset = windowLeftPixel;
      }
      if (windowRightPixel - offset > this.parentElement.clientWidth) {
        offset = windowRightPixel - this.parentElement.clientWidth;
      }
      this.setWindowPosition(windowLeftPixel - offset, windowRightPixel - offset);
      wheelEvent.preventDefault();
    }
  }
  zoom(factor, reference) {
    let leftRatio = this.windowLeftRatio || 0;
    let rightRatio = this.windowRightRatio || 0;
    const windowSizeRatio = rightRatio - leftRatio;
    let newWindowSizeRatio = factor * windowSizeRatio;
    if (newWindowSizeRatio > 1) {
      newWindowSizeRatio = 1;
      factor = newWindowSizeRatio / windowSizeRatio;
    }
    leftRatio = reference + (leftRatio - reference) * factor;
    leftRatio = Platform6.NumberUtilities.clamp(leftRatio, 0, 1 - newWindowSizeRatio);
    rightRatio = reference + (rightRatio - reference) * factor;
    rightRatio = Platform6.NumberUtilities.clamp(rightRatio, newWindowSizeRatio, 1);
    this.setWindowRatio(leftRatio, rightRatio);
  }
};
var WindowSelector = class {
  startPosition;
  width;
  windowSelector;
  constructor(parent, position) {
    this.startPosition = position;
    this.width = parent.offsetWidth;
    this.windowSelector = document.createElement("div");
    this.windowSelector.className = "overview-grid-window-selector";
    this.windowSelector.style.left = this.startPosition + "px";
    this.windowSelector.style.right = this.width - this.startPosition + "px";
    parent.appendChild(this.windowSelector);
  }
  close(position) {
    position = Math.max(0, Math.min(position, this.width));
    this.windowSelector.remove();
    return this.startPosition < position ? { start: this.startPosition, end: position } : { start: position, end: this.startPosition };
  }
  updatePosition(position) {
    position = Math.max(0, Math.min(position, this.width));
    if (position < this.startPosition) {
      this.windowSelector.style.left = position + "px";
      this.windowSelector.style.right = this.width - this.startPosition + "px";
    } else {
      this.windowSelector.style.left = this.startPosition + "px";
      this.windowSelector.style.right = this.width - position + "px";
    }
  }
};

// gen/front_end/ui/legacy/components/perf_ui/PieChart.js
var PieChart_exports = {};
__export(PieChart_exports, {
  PieChart: () => PieChart
});
import * as i18n11 from "./../../../../core/i18n/i18n.js";
import { html, render, svg } from "./../../../lit/lit.js";
import * as VisualLogging4 from "./../../../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/components/perf_ui/pieChart.css.js
var pieChart_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.root {
  align-items: flex-start; /* keep chart at top so it doesnt change position as the legend changes height */
  display: flex;
  min-width: fit-content;
  white-space: nowrap;
}

.chart-root {
  position: relative;
  overflow: hidden;
}

.pie-chart-foreground {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 10;
  top: 0;
  display: flex;
  pointer-events: none;
}

.pie-chart-total {
  margin: auto;
  padding: 2px 5px;
  pointer-events: auto;
}

:focus {
  outline-width: 0;
}

.pie-chart-total.selected {
  font-weight: bold;
}

.chart-root .slice.selected {
  stroke: var(--sys-color-primary);
  stroke-opacity: 100%;
  stroke-width: 0.04;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pie-chart-legend {
  margin-left: 30px;
}

.pie-chart-legend-row {
  margin: 5px 2px 5px auto;
  padding-right: 25px;
}

.pie-chart-legend-row.selected {
  font-weight: bold;
}

.pie-chart-legend-row:focus-visible {
  box-shadow: 0 0 0 2px var(--sys-color-state-focus-ring) !important; /* stylelint-disable-line declaration-no-important */
}

.pie-chart-swatch {
  display: inline-block;
  width: 11px;
  height: 11px;
  margin: 0 6px;
  top: 1px;
  position: relative;
  border: 1px solid var(--sys-color-neutral-outline);
}

.pie-chart-name {
  display: inline-block;
}

.pie-chart-size {
  display: inline-block;
  text-align: right;
  width: 70px;
}

@media (forced-colors: active) {
  .pie-chart-swatch {
    forced-color-adjust: none;
    border-color: ButtonText;
  }

  .pie-chart-total {
    forced-color-adjust: none;
    background-color: canvas;
  }
}

/*# sourceURL=${import.meta.resolve("./pieChart.css")} */`;

// gen/front_end/ui/legacy/components/perf_ui/PieChart.js
var UIStrings6 = {
  /**
   * @description Text for sum
   */
  total: "Total"
};
var str_6 = i18n11.i18n.registerUIStrings("ui/legacy/components/perf_ui/PieChart.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var PieChart = class extends HTMLElement {
  shadow = this.attachShadow({ mode: "open" });
  chartName = "";
  size = 0;
  formatter = (val) => String(val);
  showLegend = false;
  total = 0;
  slices = [];
  totalSelected = true;
  sliceSelected = -1;
  innerR = 0.618;
  lastAngle = -Math.PI / 2;
  set data(data) {
    this.chartName = data.chartName;
    this.size = data.size;
    this.formatter = data.formatter;
    this.showLegend = data.showLegend;
    this.total = data.total;
    this.slices = data.slices;
    this.render();
  }
  render() {
    this.lastAngle = -Math.PI / 2;
    const output = html`
      <style>${pieChart_css_default}</style>
      <div class="root" role="group" @keydown=${this.onKeyDown} aria-label=${this.chartName}
          jslog=${VisualLogging4.pieChart().track({ keydown: "ArrowUp|ArrowDown" })}>
        <div class="chart-root" style="width: ${this.size}px; height: ${this.size}px;">
          ${svg`
          <svg>
          <g transform="scale(${this.size / 2}) translate(1, 1) scale(0.99, 0.99)">
            <circle r="1" stroke="hsl(0, 0%, 80%)" fill="transparent" stroke-width=${1 / this.size}></circle>
            <circle r=${this.innerR} stroke="hsl(0, 0%, 80%)" fill="transparent" stroke-width=${1 / this.size}></circle>
            ${this.slices.map((slice, index) => {
      const selected = this.sliceSelected === index;
      const tabIndex = selected && !this.showLegend ? "0" : "-1";
      return svg`<path class="slice ${selected ? "selected" : ""}"
                  jslog=${VisualLogging4.pieChartSlice().track({ click: true })}
                  @click=${this.onSliceClicked(index)} tabIndex=${tabIndex}
                  fill=${slice.color} d=${this.getPathStringForSlice(slice)}
                  aria-label=${slice.title} id=${selected ? "selectedSlice" : ""}></path>`;
    })}
            <!-- This is so that the selected slice is re-drawn on top, to avoid re-ordering slices
            just to render them properly. -->
            <use href="#selectedSlice" />
            </g>
          </svg>
          `}
          <div class="pie-chart-foreground">
            <div class="pie-chart-total ${this.totalSelected ? "selected" : ""}" @click=${this.selectTotal}
                jslog=${VisualLogging4.pieChartTotal("select-total").track({ click: true })}
                tabIndex=${this.totalSelected && !this.showLegend ? "1" : "-1"}>
              ${this.total ? this.formatter(this.total) : ""}
            </div>
          </div>
        </div>
        ${this.showLegend ? html`
        <div class="pie-chart-legend" jslog=${VisualLogging4.section("legend")}>
          ${this.slices.map((slice, index) => {
      const selected = this.sliceSelected === index;
      return html`
              <div class="pie-chart-legend-row ${selected ? "selected" : ""}"
                  jslog=${VisualLogging4.pieChartSlice().track({ click: true })}
                  @click=${this.onSliceClicked(index)} tabIndex=${selected ? "0" : "-1"}>
                <div class="pie-chart-size">${this.formatter(slice.value)}</div>
                <div class="pie-chart-swatch" style="background-color: ${slice.color};"></div>
                <div class="pie-chart-name">${slice.title}</div>
              </div>`;
    })}
          <div class="pie-chart-legend-row ${this.totalSelected ? "selected" : ""}"
              jslog=${VisualLogging4.pieChartTotal("select-total").track({ click: true })}
              @click=${this.selectTotal} tabIndex=${this.totalSelected ? "0" : "-1"}>
            <div class="pie-chart-size">${this.formatter(this.total)}</div>
            <div class="pie-chart-swatch"></div>
            <div class="pie-chart-name">${i18nString6(UIStrings6.total)}</div>
          </div>
        </div>
        ` : ""}
      </div>
    `;
    render(output, this.shadow, { host: this });
  }
  onSliceClicked(index) {
    return () => {
      this.selectSlice(index);
    };
  }
  selectSlice(index) {
    this.totalSelected = false;
    this.sliceSelected = index;
    this.render();
  }
  selectTotal() {
    this.totalSelected = true;
    this.sliceSelected = -1;
    this.render();
  }
  selectAndFocusTotal() {
    this.selectTotal();
    const totalLegendRow = this.shadow.querySelector(".pie-chart-legend > :last-child");
    if (!totalLegendRow) {
      return;
    }
    totalLegendRow.focus();
  }
  selectAndFocusSlice(index) {
    this.selectSlice(index);
    const sliceLegendRow = this.shadow.querySelector(`.pie-chart-legend > :nth-child(${index + 1})`);
    if (!sliceLegendRow) {
      return;
    }
    sliceLegendRow.focus();
  }
  focusNextElement() {
    if (this.totalSelected) {
      this.selectAndFocusSlice(0);
    } else if (this.sliceSelected === this.slices.length - 1) {
      this.selectAndFocusTotal();
    } else {
      this.selectAndFocusSlice(this.sliceSelected + 1);
    }
  }
  focusPreviousElement() {
    if (this.totalSelected) {
      this.selectAndFocusSlice(this.slices.length - 1);
    } else if (this.sliceSelected === 0) {
      this.selectAndFocusTotal();
    } else {
      this.selectAndFocusSlice(this.sliceSelected - 1);
    }
  }
  onKeyDown(event) {
    let handled = false;
    if (event.key === "ArrowDown") {
      this.focusNextElement();
      handled = true;
    } else if (event.key === "ArrowUp") {
      this.focusPreviousElement();
      handled = true;
    }
    if (handled) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }
  getPathStringForSlice(slice) {
    const value = slice.value;
    let sliceAngle = value / this.total * 2 * Math.PI;
    if (!isFinite(sliceAngle)) {
      return;
    }
    sliceAngle = Math.min(sliceAngle, 2 * Math.PI * 0.9999);
    const x1 = Math.cos(this.lastAngle);
    const y1 = Math.sin(this.lastAngle);
    this.lastAngle += sliceAngle;
    const x2 = Math.cos(this.lastAngle);
    const y2 = Math.sin(this.lastAngle);
    const r2 = this.innerR;
    const x3 = x2 * r2;
    const y3 = y2 * r2;
    const x4 = x1 * r2;
    const y4 = y1 * r2;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathString = `M${x1},${y1} A1,1,0,${largeArc},1,${x2},${y2} L${x3},${y3} A${r2},${r2},0,${largeArc},0,${x4},${y4} Z`;
    return pathString;
  }
};
customElements.define("devtools-perf-piechart", PieChart);

// gen/front_end/ui/legacy/components/perf_ui/TimelineOverviewCalculator.js
var TimelineOverviewCalculator_exports = {};
__export(TimelineOverviewCalculator_exports, {
  TimelineOverviewCalculator: () => TimelineOverviewCalculator
});
import * as i18n13 from "./../../../../core/i18n/i18n.js";
import * as Trace3 from "./../../../../models/trace/trace.js";
var TimelineOverviewCalculator = class {
  #minimumBoundary = Trace3.Types.Timing.Milli(0);
  #maximumBoundary = Trace3.Types.Timing.Milli(100);
  #displayWidth = 0;
  navStartTimes;
  /**
   * Given a timestamp, returns its x position in the minimap.
   *
   * @param time
   * @returns position in pixel
   */
  computePosition(time) {
    return (time - this.#minimumBoundary) / this.boundarySpan() * this.#displayWidth;
  }
  positionToTime(position) {
    if (this.#displayWidth === 0) {
      return Trace3.Types.Timing.Milli(0);
    }
    return Trace3.Types.Timing.Milli(position / this.#displayWidth * this.boundarySpan() + this.#minimumBoundary);
  }
  setBounds(minimumBoundary, maximumBoundary) {
    this.#minimumBoundary = minimumBoundary;
    this.#maximumBoundary = maximumBoundary;
  }
  setNavStartTimes(navStartTimes) {
    this.navStartTimes = navStartTimes;
  }
  setDisplayWidth(clientWidth) {
    this.#displayWidth = clientWidth;
  }
  reset() {
    this.setBounds(Trace3.Types.Timing.Milli(0), Trace3.Types.Timing.Milli(100));
  }
  formatValue(time, precision) {
    if (this.navStartTimes) {
      for (let i = this.navStartTimes.length - 1; i >= 0; i--) {
        const startTimeMilliseconds = Trace3.Helpers.Timing.microToMilli(this.navStartTimes[i].ts);
        if (time > startTimeMilliseconds) {
          time = Trace3.Types.Timing.Milli(time - (startTimeMilliseconds - this.zeroTime()));
          break;
        }
      }
    }
    return i18n13.TimeUtilities.preciseMillisToString(time - this.zeroTime(), precision);
  }
  maximumBoundary() {
    return this.#maximumBoundary;
  }
  minimumBoundary() {
    return this.#minimumBoundary;
  }
  zeroTime() {
    return this.#minimumBoundary;
  }
  /**
   * This function returns the time different between min time and max time of current minimap.
   *
   * @returns the time range in milliseconds
   */
  boundarySpan() {
    return Trace3.Types.Timing.Milli(this.#maximumBoundary - this.#minimumBoundary);
  }
};

// gen/front_end/ui/legacy/components/perf_ui/TimelineOverviewPane.js
var TimelineOverviewPane_exports = {};
__export(TimelineOverviewPane_exports, {
  OverviewInfo: () => OverviewInfo,
  TimelineOverviewBase: () => TimelineOverviewBase,
  TimelineOverviewPane: () => TimelineOverviewPane
});
import * as Common6 from "./../../../../core/common/common.js";
import * as Trace4 from "./../../../../models/trace/trace.js";
import * as TraceBounds from "./../../../../services/trace_bounds/trace_bounds.js";
import * as VisualLoggging from "./../../../visual_logging/visual_logging.js";
import * as UI6 from "./../../legacy.js";
import * as ThemeSupport9 from "./../../theme_support/theme_support.js";

// gen/front_end/ui/legacy/components/perf_ui/timelineOverviewInfo.css.js
var timelineOverviewInfo_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.overview-info:not(:empty) {
  display: flex;
  background: var(--sys-color-cdt-base-container);
  box-shadow: var(--sys-elevation-level2);
  padding: var(--sys-size-4);
  border-radius: var(--sys-shape-corner-small);
}

.overview-info .frame .time {
  display: none;
}

.overview-info .frame .thumbnail img {
  max-width: 50vw;
  max-height: 50vh;
}

/*# sourceURL=${import.meta.resolve("./timelineOverviewInfo.css")} */`;

// gen/front_end/ui/legacy/components/perf_ui/TimelineOverviewPane.js
var TimelineOverviewPane = class extends Common6.ObjectWrapper.eventMixin(UI6.Widget.VBox) {
  overviewCalculator;
  overviewGrid;
  cursorArea;
  cursorElement;
  overviewControls = [];
  markers = /* @__PURE__ */ new Map();
  overviewInfo;
  updateThrottler = new Common6.Throttler.Throttler(100);
  cursorEnabled = false;
  cursorPosition = 0;
  lastWidth = 0;
  windowStartTime = Trace4.Types.Timing.Milli(0);
  windowEndTime = Trace4.Types.Timing.Milli(Infinity);
  muteOnWindowChanged = false;
  hasPointer = false;
  #dimHighlightSVG;
  #boundOnThemeChanged = this.#onThemeChanged.bind(this);
  constructor(prefix) {
    super();
    this.element.id = prefix + "-overview-pane";
    this.overviewCalculator = new TimelineOverviewCalculator();
    this.overviewGrid = new OverviewGrid(prefix, this.overviewCalculator);
    this.overviewGrid.element.setAttribute("jslog", `${VisualLoggging.timeline(`${prefix}-overview`).track({ click: true, drag: true, hover: true })}`);
    this.element.appendChild(this.overviewGrid.element);
    this.cursorArea = this.overviewGrid.element.createChild("div", "overview-grid-cursor-area");
    this.cursorElement = this.overviewGrid.element.createChild("div", "overview-grid-cursor-position");
    this.cursorArea.addEventListener("pointerdown", this.onMouseDown.bind(this), true);
    this.cursorArea.addEventListener("pointerup", this.onMouseCancel.bind(this), true);
    this.cursorArea.addEventListener("pointercancel", this.onMouseCancel.bind(this), true);
    this.cursorArea.addEventListener("pointermove", this.onMouseMove.bind(this), true);
    this.cursorArea.addEventListener("pointerleave", this.hideCursor.bind(this), true);
    this.overviewGrid.setResizeEnabled(false);
    this.overviewGrid.addEventListener("WindowChangedWithPosition", this.onWindowChanged, this);
    this.overviewGrid.addEventListener("BreadcrumbAdded", this.onBreadcrumbAdded, this);
    this.overviewGrid.setClickHandler(this.onClick.bind(this));
    this.overviewInfo = new OverviewInfo(this.cursorElement);
    this.#dimHighlightSVG = UI6.UIUtils.createSVGChild(this.element, "svg", "timeline-minimap-dim-highlight-svg hidden");
    this.#initializeDimHighlightSVG();
  }
  enableCreateBreadcrumbsButton() {
    const breadcrumbsElement = this.overviewGrid.enableCreateBreadcrumbsButton();
    breadcrumbsElement.addEventListener("pointerdown", this.onMouseDown.bind(this), true);
    breadcrumbsElement.addEventListener("pointerup", this.onMouseCancel.bind(this), true);
    breadcrumbsElement.addEventListener("pointercancel", this.onMouseCancel.bind(this), true);
    breadcrumbsElement.addEventListener("pointermove", this.onMouseMove.bind(this), true);
    breadcrumbsElement.addEventListener("pointerleave", this.hideCursor.bind(this), true);
  }
  onMouseDown(event) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    event.target.setPointerCapture(event.pointerId);
    this.overviewInfo.hide();
    this.hasPointer = true;
  }
  onMouseCancel(event) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    event.target.releasePointerCapture(event.pointerId);
    this.overviewInfo.show();
    this.hasPointer = false;
  }
  onMouseMove(event) {
    if (!this.cursorEnabled) {
      return;
    }
    const mouseEvent = event;
    const target = event.target;
    const offsetLeftRelativeToCursorArea = target.getBoundingClientRect().left - this.cursorArea.getBoundingClientRect().left;
    this.cursorPosition = mouseEvent.offsetX + offsetLeftRelativeToCursorArea;
    this.cursorElement.style.left = this.cursorPosition + "px";
    this.cursorElement.style.visibility = "visible";
    const timeInMilliSeconds = this.overviewCalculator.positionToTime(this.cursorPosition);
    const timeWindow = this.overviewGrid.calculateWindowValue();
    if (Trace4.Types.Timing.Milli(timeWindow.rawStartValue) <= timeInMilliSeconds && timeInMilliSeconds <= Trace4.Types.Timing.Milli(timeWindow.rawEndValue)) {
      const timeInMicroSeconds = Trace4.Helpers.Timing.milliToMicro(timeInMilliSeconds);
      this.dispatchEventToListeners("OverviewPaneMouseMove", { timeInMicroSeconds });
    } else {
      this.dispatchEventToListeners(
        "OverviewPaneMouseLeave"
        /* Events.OVERVIEW_PANE_MOUSE_LEAVE */
      );
    }
    if (!this.hasPointer) {
      void this.overviewInfo.setContent(this.buildOverviewInfo());
    }
  }
  async buildOverviewInfo() {
    const document2 = this.element.ownerDocument;
    const x = this.cursorPosition;
    const elements = await Promise.all(this.overviewControls.map((control) => control.overviewInfoPromise(x)));
    const fragment = document2.createDocumentFragment();
    const nonNullElements = elements.filter((element) => element !== null);
    fragment.append(...nonNullElements);
    return fragment;
  }
  hideCursor() {
    this.cursorElement.style.visibility = "hidden";
    this.dispatchEventToListeners(
      "OverviewPaneMouseLeave"
      /* Events.OVERVIEW_PANE_MOUSE_LEAVE */
    );
    this.overviewInfo.hide();
  }
  #onThemeChanged() {
    this.scheduleUpdate();
  }
  wasShown() {
    super.wasShown();
    const start = TraceBounds.TraceBounds.BoundsManager.instance().state()?.milli.minimapTraceBounds.min;
    const end = TraceBounds.TraceBounds.BoundsManager.instance().state()?.milli.minimapTraceBounds.max;
    this.update(start, end);
    ThemeSupport9.ThemeSupport.instance().addEventListener(ThemeSupport9.ThemeChangeEvent.eventName, this.#boundOnThemeChanged);
  }
  willHide() {
    ThemeSupport9.ThemeSupport.instance().removeEventListener(ThemeSupport9.ThemeChangeEvent.eventName, this.#boundOnThemeChanged);
    this.overviewInfo.hide();
    super.willHide();
  }
  onResize() {
    const width = this.element.offsetWidth;
    if (width === this.lastWidth) {
      return;
    }
    this.lastWidth = width;
    this.scheduleUpdate();
  }
  setOverviewControls(overviewControls) {
    for (let i = 0; i < this.overviewControls.length; ++i) {
      this.overviewControls[i].dispose();
    }
    for (let i = 0; i < overviewControls.length; ++i) {
      overviewControls[i].setCalculator(this.overviewCalculator);
      overviewControls[i].show(this.overviewGrid.element);
    }
    this.overviewControls = overviewControls;
    this.update();
  }
  set showingScreenshots(isShowing) {
    this.overviewGrid.showingScreenshots = isShowing;
  }
  setBounds(minimumBoundary, maximumBoundary) {
    if (minimumBoundary === this.overviewCalculator.minimumBoundary() && maximumBoundary === this.overviewCalculator.maximumBoundary()) {
      return;
    }
    this.overviewCalculator.setBounds(minimumBoundary, maximumBoundary);
    this.overviewGrid.setResizeEnabled(true);
    this.cursorEnabled = true;
    this.scheduleUpdate(minimumBoundary, maximumBoundary);
  }
  setNavStartTimes(navStartTimes) {
    this.overviewCalculator.setNavStartTimes(navStartTimes);
  }
  scheduleUpdate(start, end) {
    void this.updateThrottler.schedule(async () => {
      this.update(start, end);
    });
  }
  update(start, end) {
    if (!this.isShowing()) {
      return;
    }
    this.overviewCalculator.setDisplayWidth(this.overviewGrid.clientWidth());
    for (let i = 0; i < this.overviewControls.length; ++i) {
      this.overviewControls[i].update(start, end);
    }
    this.overviewGrid.updateDividers(this.overviewCalculator);
    this.updateMarkers();
    this.updateWindow();
  }
  setMarkers(markers) {
    this.markers = markers;
  }
  /**
   * Dim the time marker outside the highlight time bounds.
   *
   * @param highlightBounds the time bounds to highlight, if it is empty, it means to highlight everything.
   */
  #dimMarkers(highlightBounds) {
    for (const time of this.markers.keys()) {
      const marker = this.markers.get(time);
      if (!marker) {
        continue;
      }
      const timeInMicroSeconds = Trace4.Helpers.Timing.milliToMicro(Trace4.Types.Timing.Milli(time));
      const dim = highlightBounds && !Trace4.Helpers.Timing.timestampIsInBounds(highlightBounds, timeInMicroSeconds);
      marker.style.filter = `grayscale(${dim ? 1 : 0})`;
    }
  }
  updateMarkers() {
    const filteredMarkers = /* @__PURE__ */ new Map();
    for (const time of this.markers.keys()) {
      const marker = this.markers.get(time);
      const position = Math.round(this.overviewCalculator.computePosition(Trace4.Types.Timing.Milli(time)));
      if (filteredMarkers.has(position)) {
        continue;
      }
      filteredMarkers.set(position, marker);
      marker.style.left = position + "px";
    }
    this.overviewGrid.removeEventDividers();
    this.overviewGrid.addEventDividers([...filteredMarkers.values()]);
  }
  reset() {
    this.windowStartTime = Trace4.Types.Timing.Milli(0);
    this.windowEndTime = Trace4.Types.Timing.Milli(Infinity);
    this.overviewCalculator.reset();
    this.overviewGrid.reset();
    this.overviewGrid.setResizeEnabled(false);
    this.cursorEnabled = false;
    this.hideCursor();
    this.markers = /* @__PURE__ */ new Map();
    for (const control of this.overviewControls) {
      control.reset();
    }
    this.overviewInfo.hide();
    this.scheduleUpdate();
  }
  onClick(event) {
    return this.overviewControls.some((control) => control.onClick(event));
  }
  onBreadcrumbAdded() {
    this.dispatchEventToListeners("OverviewPaneBreadcrumbAdded", {
      startTime: Trace4.Types.Timing.Milli(this.windowStartTime),
      endTime: Trace4.Types.Timing.Milli(this.windowEndTime)
    });
  }
  onWindowChanged(event) {
    if (this.muteOnWindowChanged) {
      return;
    }
    if (!this.overviewControls.length) {
      return;
    }
    this.windowStartTime = Trace4.Types.Timing.Milli(event.data.rawStartValue === this.overviewCalculator.minimumBoundary() ? 0 : event.data.rawStartValue);
    this.windowEndTime = Trace4.Types.Timing.Milli(event.data.rawEndValue === this.overviewCalculator.maximumBoundary() ? Infinity : event.data.rawEndValue);
    const windowTimes = {
      startTime: Trace4.Types.Timing.Milli(this.windowStartTime),
      endTime: Trace4.Types.Timing.Milli(this.windowEndTime)
    };
    this.dispatchEventToListeners("OverviewPaneWindowChanged", windowTimes);
  }
  setWindowTimes(startTime, endTime) {
    if (startTime === this.windowStartTime && endTime === this.windowEndTime) {
      return;
    }
    this.windowStartTime = startTime;
    this.windowEndTime = endTime;
    this.updateWindow();
    this.dispatchEventToListeners("OverviewPaneWindowChanged", {
      startTime: Trace4.Types.Timing.Milli(startTime),
      endTime: Trace4.Types.Timing.Milli(endTime)
    });
  }
  updateWindow() {
    if (!this.overviewControls.length) {
      return;
    }
    const absoluteMin = this.overviewCalculator.minimumBoundary();
    const timeSpan = this.overviewCalculator.maximumBoundary() - absoluteMin;
    const haveRecords = absoluteMin > 0;
    const left = haveRecords && this.windowStartTime ? Math.min((this.windowStartTime - absoluteMin) / timeSpan, 1) : 0;
    const right = haveRecords && this.windowEndTime < Infinity ? (this.windowEndTime - absoluteMin) / timeSpan : 1;
    this.muteOnWindowChanged = true;
    this.overviewGrid.setWindowRatio(left, right);
    this.muteOnWindowChanged = false;
  }
  /**
   * This function will create three rectangles and a polygon, which will be use to highlight the time range.
   */
  #initializeDimHighlightSVG() {
    const defs = UI6.UIUtils.createSVGChild(this.#dimHighlightSVG, "defs");
    const mask = UI6.UIUtils.createSVGChild(defs, "mask");
    mask.id = "dim-highlight-cutouts";
    const showAllRect = UI6.UIUtils.createSVGChild(mask, "rect");
    showAllRect.setAttribute("width", "100%");
    showAllRect.setAttribute("height", "100%");
    showAllRect.setAttribute("fill", "hsl(0deg 0% 95%)");
    const desaturateRect = UI6.UIUtils.createSVGChild(this.#dimHighlightSVG, "rect", "background");
    desaturateRect.setAttribute("width", "100%");
    desaturateRect.setAttribute("height", "100%");
    desaturateRect.setAttribute("fill", ThemeSupport9.ThemeSupport.instance().getComputedValue("--color-background"));
    desaturateRect.setAttribute("mask", `url(#${mask.id})`);
    desaturateRect.style.mixBlendMode = "saturation";
    const punchRect = UI6.UIUtils.createSVGChild(mask, "rect", "punch");
    punchRect.setAttribute("y", "0");
    punchRect.setAttribute("height", "100%");
    punchRect.setAttribute("fill", "black");
    const bracketColor = ThemeSupport9.ThemeSupport.instance().getComputedValue("--sys-color-state-on-header-hover");
    const bracket = UI6.UIUtils.createSVGChild(this.#dimHighlightSVG, "polygon");
    bracket.setAttribute("fill", bracketColor);
    ThemeSupport9.ThemeSupport.instance().addEventListener(ThemeSupport9.ThemeChangeEvent.eventName, () => {
      const desaturateRect2 = this.#dimHighlightSVG.querySelector("rect.background");
      desaturateRect2?.setAttribute("fill", ThemeSupport9.ThemeSupport.instance().getComputedValue("--color-background"));
      const bracket2 = this.#dimHighlightSVG.querySelector("polygon");
      bracket2?.setAttribute("fill", ThemeSupport9.ThemeSupport.instance().getComputedValue("--sys-color-state-on-header-hover"));
    });
  }
  #addBracket(left, right) {
    const TRIANGLE_SIZE = 5;
    const bracket = this.#dimHighlightSVG.querySelector("polygon");
    bracket?.setAttribute("points", `${left},0 ${left},${TRIANGLE_SIZE} ${left + TRIANGLE_SIZE - 1},1 ${right - TRIANGLE_SIZE - 1},1 ${right},${TRIANGLE_SIZE} ${right},0`);
    bracket?.classList.remove("hidden");
  }
  #hideBracket() {
    const bracket = this.#dimHighlightSVG.querySelector("polygon");
    bracket?.classList.add("hidden");
  }
  highlightBounds(bounds, withBracket) {
    const left = this.overviewCalculator.computePosition(Trace4.Helpers.Timing.microToMilli(bounds.min));
    const right = this.overviewCalculator.computePosition(Trace4.Helpers.Timing.microToMilli(bounds.max));
    this.#dimMarkers(bounds);
    const punchRect = this.#dimHighlightSVG.querySelector("rect.punch");
    punchRect?.setAttribute("x", left.toString());
    punchRect?.setAttribute("width", (right - left).toString());
    if (withBracket) {
      this.#addBracket(left, right);
    } else {
      this.#hideBracket();
    }
    this.#dimHighlightSVG.classList.remove("hidden");
  }
  clearBoundsHighlight() {
    this.#dimMarkers();
    this.#dimHighlightSVG.classList.add("hidden");
  }
};
var TimelineOverviewBase = class extends UI6.Widget.VBox {
  #calculator;
  canvas;
  #context;
  constructor() {
    super();
    this.#calculator = null;
    this.canvas = this.element.createChild("canvas", "fill");
    this.#context = this.canvas.getContext("2d");
  }
  width() {
    return this.canvas.width;
  }
  height() {
    return this.canvas.height;
  }
  context() {
    if (!this.#context) {
      throw new Error("Unable to retrieve canvas context");
    }
    return this.#context;
  }
  calculator() {
    return this.#calculator;
  }
  update() {
    throw new Error("Not implemented");
  }
  dispose() {
    this.detach();
  }
  reset() {
  }
  async overviewInfoPromise(_x) {
    return null;
  }
  setCalculator(calculator) {
    this.#calculator = calculator;
  }
  onClick(_event) {
    return false;
  }
  resetCanvas() {
    if (this.element.clientWidth) {
      this.setCanvasSize(this.element.clientWidth, this.element.clientHeight);
    }
  }
  setCanvasSize(width, height) {
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
  }
};
var OverviewInfo = class {
  anchorElement;
  glassPane;
  visible;
  element;
  constructor(anchor) {
    this.anchorElement = anchor;
    this.glassPane = new UI6.GlassPane.GlassPane();
    this.glassPane.setPointerEventsBehavior(
      "PierceContents"
      /* UI.GlassPane.PointerEventsBehavior.PIERCE_CONTENTS */
    );
    this.glassPane.setMarginBehavior(
      "DefaultMargin"
      /* UI.GlassPane.MarginBehavior.DEFAULT_MARGIN */
    );
    this.glassPane.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    this.visible = false;
    this.element = UI6.UIUtils.createShadowRootWithCoreStyles(this.glassPane.contentElement, { cssFile: timelineOverviewInfo_css_default }).createChild("div", "overview-info");
  }
  async setContent(contentPromise) {
    this.visible = true;
    const content = await contentPromise;
    if (!this.visible) {
      return;
    }
    this.element.removeChildren();
    this.element.appendChild(content);
    this.glassPane.setContentAnchorBox(this.anchorElement.boxInWindow());
    if (!this.glassPane.isShowing()) {
      this.glassPane.show(this.anchorElement.ownerDocument);
    }
  }
  hide() {
    this.visible = false;
    this.glassPane.hide();
  }
  show() {
    this.visible = true;
    this.glassPane.show(window.document);
  }
};
export {
  BrickBreaker_exports as BrickBreaker,
  ChartViewport_exports as ChartViewport,
  FilmStripView_exports as FilmStripView,
  FlameChart_exports as FlameChart,
  Font_exports as Font,
  GCActionDelegate_exports as GCActionDelegate,
  LineLevelProfile_exports as LineLevelProfile,
  LiveHeapProfile_exports as LiveHeapProfile,
  NetworkPriorities_exports as NetworkPriorities,
  OverviewGrid_exports as OverviewGrid,
  PieChart_exports as PieChart,
  TimelineGrid_exports as TimelineGrid,
  TimelineOverviewCalculator_exports as TimelineOverviewCalculator,
  TimelineOverviewPane_exports as TimelineOverviewPane
};
//# sourceMappingURL=perf_ui.js.map
