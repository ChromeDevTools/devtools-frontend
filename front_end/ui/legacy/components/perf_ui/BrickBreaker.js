// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as UI from '../../legacy.js';
import * as ThemeSupport from '../../theme_support/theme_support.js';
const UIStrings = {
    /**
     * @description Message congratulating the user for having won a game.
     */
    congrats: 'Congrats, you win!',
    /**
     * @description A Postscript hinting the user the possibility to open the game using a keycombo.
     */
    ps: 'PS: You can also open the game by typing `fixme`',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/BrickBreaker.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const MAX_DELTA = 16;
const MIN_DELTA = 10;
const MAX_PADDLE_LENGTH = 150;
const MIN_PADDLE_LENGTH = 85;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 10;
const colorPallettes = [
    // blues
    {
        light: 'rgb(224,240,255)',
        mediumLighter: 'rgb(176,208,255)',
        mediumDarker: 'rgb(112,160,221)',
        dark: 'rgb(0,92,153)',
    },
    // pinks
    {
        light: 'rgb(253, 216, 229)',
        mediumLighter: 'rgb(250, 157, 188)',
        mediumDarker: 'rgb(249, 98, 154)',
        dark: 'rgb(254, 5, 105)',
    },
    // pastel pinks
    {
        light: 'rgb(254, 234, 234)',
        mediumLighter: 'rgb(255, 216, 216)',
        mediumDarker: 'rgb(255, 195, 195)',
        dark: 'rgb(235, 125, 138)',
    },
    // purples
    {
        light: 'rgb(226,183,206)',
        mediumLighter: 'rgb(219,124,165)',
        mediumDarker: 'rgb(146,60,129)',
        dark: 'rgb(186, 85, 255)',
    },
    // greens
    {
        light: 'rgb(206,255,206)',
        mediumLighter: 'rgb(128,255,128)',
        mediumDarker: 'rgb(0,246,0)',
        dark: 'rgb(0,187,0)',
    },
    // reds
    {
        light: 'rgb(255, 188, 181)',
        mediumLighter: 'rgb(254, 170, 170)',
        mediumDarker: 'rgb(215, 59, 43)',
        dark: 'rgb(187, 37, 23)',
    },
    // aqua
    {
        light: 'rgb(236, 254, 250)',
        mediumLighter: 'rgb(204, 255, 245)',
        mediumDarker: 'rgb(164, 240, 233)',
        dark: 'rgb(72,189,144)',
    },
    // yellow/pink
    {
        light: 'rgb(255, 225, 185)',
        mediumLighter: 'rgb(255, 204, 141)',
        mediumDarker: 'rgb(240, 140, 115)',
        dark: 'rgb(211, 96, 117)',
    },
    // ocean breeze
    {
        light: 'rgb(218, 255, 248)',
        mediumLighter: 'rgb(177, 235, 236)',
        mediumDarker: 'rgb(112, 214, 214)',
        dark: 'rgb(34, 205, 181)',
    },
];
export class BrickBreaker extends HTMLElement {
    timelineFlameChart;
    #canvas;
    #ctx;
    #helperCanvas;
    #helperCanvasCtx;
    #scorePanel;
    #trackTimelineOffset = 0;
    #visibleEntries = new Set();
    #brokenBricks = new Map();
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
        this.#canvas = this.createChild('canvas', 'fill');
        this.#ctx = this.#canvas.getContext('2d');
        this.#helperCanvas = document.createElement('canvas');
        this.#helperCanvasCtx = this.#helperCanvas.getContext('2d');
        const randomPaletteIndex = Math.floor(Math.random() * colorPallettes.length);
        this.#currentPalette = colorPallettes[randomPaletteIndex];
        this.#scorePanel = this.createChild('div');
        this.#scorePanel.classList.add('scorePanel');
        this.#scorePanel.style.borderImage =
            'linear-gradient(' + this.#currentPalette.mediumDarker + ',' + this.#currentPalette.dark + ') 1';
        this.initButton();
    }
    initButton() {
        const button = this.createChild('div');
        button.classList.add('game-close-button');
        button.innerHTML = '<b><span style=\'font-size: 1.2em; color: white\'>x</span></b>';
        button.style.background = this.#currentPalette.dark;
        button.style.boxShadow = this.#currentPalette.dark + ' 1px 1px, ' + this.#currentPalette.mediumDarker +
            ' 3px 3px, ' + this.#currentPalette.mediumLighter + ' 5px 5px';
        button.addEventListener('click', this.#closeGame.bind(this));
        this.appendChild(button);
    }
    connectedCallback() {
        this.#running = true;
        this.#setUpNewGame();
        this.#boundingElement.addEventListener('keydown', this.#keyDownHandlerBound);
        document.addEventListener('keydown', this.#keyDownHandlerBound, false);
        document.addEventListener('keyup', this.#keyUpHandlerBound, false);
        document.addEventListener('keypress', this.#keyPressHandlerBound, false);
        window.addEventListener('resize', this.#closeGameBound);
        document.addEventListener('mousemove', this.#mouseMoveHandlerBound, false);
        this.tabIndex = 1;
        this.focus();
    }
    disconnectedCallback() {
        this.#boundingElement.removeEventListener('keydown', this.#keyDownHandlerBound);
        window.removeEventListener('resize', this.#closeGameBound);
        document.removeEventListener('keydown', this.#keyDownHandlerBound, false);
        document.removeEventListener('keyup', this.#keyUpHandlerBound, false);
        window.removeEventListener('resize', this.#closeGameBound);
        document.removeEventListener('keypress', this.#keyPressHandlerBound, false);
        document.removeEventListener('mousemove', this.#mouseMoveHandlerBound, false);
    }
    #resetCanvas() {
        const dPR = window.devicePixelRatio;
        const height = Math.round(this.offsetHeight * dPR);
        const width = Math.round(this.offsetWidth * dPR);
        this.#canvas.height = height;
        this.#canvas.width = width;
        this.#canvas.style.height = (height / dPR) + 'px';
        this.#canvas.style.width = (width / dPR) + 'px';
    }
    #closeGame() {
        this.#running = false;
        this.remove();
    }
    #setUpNewGame() {
        this.#resetCanvas();
        this.#deltaMultiplier = Math.max(0.1, (this.offsetHeight - this.#minScreenHeight) / this.#screenHeightDiff);
        this.#deltaVectorLength = MIN_DELTA * this.#deltaMultiplier;
        const trackData = this.timelineFlameChart.drawTrackOnCanvas('Main', this.#ctx, BALL_RADIUS);
        if (trackData === null || trackData.visibleEntries.size === 0) {
            console.error('Could not draw game');
            this.#closeGame();
            return;
        }
        this.#trackTimelineOffset = trackData.top;
        this.#visibleEntries = trackData.visibleEntries;
        this.#gameViewportOffset = this.#trackTimelineOffset +
            this.timelineFlameChart.getCanvas().getBoundingClientRect().top - this.timelineFlameChart.getScrollOffset();
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
        if (event.key === 'Right' || event.key === 'ArrowRight' || event.key === 'd') {
            this.#rightPressed = false;
            event.preventDefault();
        }
        else if (event.key === 'Left' || event.key === 'ArrowLeft' || event.key === 'a') {
            this.#leftPressed = false;
            event.preventDefault();
        }
        else {
            event.stopImmediatePropagation();
        }
    }
    #keyPressHandler(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }
    #keyDownHandler(event) {
        if (event.key === 'Escape') {
            this.#closeGame();
            event.stopImmediatePropagation();
        }
        else if (event.key === 'Right' || event.key === 'ArrowRight' || event.key === 'd') {
            this.#rightPressed = true;
            event.preventDefault();
        }
        else if (event.key === 'Left' || event.key === 'ArrowLeft' || event.key === 'a') {
            this.#leftPressed = true;
            event.preventDefault();
        }
        else {
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
        const gradient = this.#ctx.createRadialGradient(this.#ballX + BALL_RADIUS / 4, // Offset towards the left
        this.#ballY - BALL_RADIUS / 4, // Offset downwards
        0, this.#ballX + BALL_RADIUS / 4, this.#ballY - BALL_RADIUS / 4, BALL_RADIUS);
        // stops for gradient
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
        gradient.addColorStop(0.3, this.#currentPalette.dark); // Paddle color
        gradient.addColorStop(1, this.#currentPalette.mediumDarker); // Lighter color
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
            // Extend the patch width an extra 0.5 px to ensure the
            // entry is completely covered.
            this.#ctx.rect(brick.x, brick.y, brick.width + 0.5, this.#brickHeight + 0.5);
            this.#ctx.fillStyle =
                ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-neutral-container', this);
            this.#ctx.fill();
            this.#ctx.closePath();
        }
    }
    #draw() {
        if (this.#initialDPR !== devicePixelRatio) {
            this.#running = false;
        }
        if (this.#lives === 0) {
            window.alert('GAME OVER');
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
        const blocks = `<div><b><span style='font-size: 1.3em; color: ${this.#currentPalette.dark}'> 🧱 ${this.#blockCount}</span></b></div>`;
        this.#scorePanel.innerHTML = lives + blocks;
        this.#blockCount = this.#visibleEntries.size - this.#brokenBricks.size;
        this.#deltaVectorLength =
            (MIN_DELTA + (MAX_DELTA - MIN_DELTA) * this.#brokenBricks.size / this.#visibleEntries.size) *
                this.#deltaMultiplier;
        this.#paddleLength = MAX_PADDLE_LENGTH -
            (MAX_PADDLE_LENGTH - MIN_PADDLE_LENGTH) * this.#brokenBricks.size / this.#visibleEntries.size;
        if (this.#ballX + this.#ballDx > this.offsetWidth - BALL_RADIUS || this.#ballX + this.#ballDx < BALL_RADIUS) {
            // Ball bounces on a side wall.
            this.#ballDx = -this.#ballDx;
        }
        if (this.#ballY + this.#ballDy < BALL_RADIUS) {
            // Ball bounces on the top.
            this.#ballDy = -this.#ballDy;
        }
        else if (this.#ballY + this.#ballDy > this.offsetHeight - BALL_RADIUS && this.#ballDy > 0) {
            // Ball is at the bottom, either on the paddle or in the
            // void.
            if (this.#ballX > (this.#paddleX - BALL_RADIUS) &&
                this.#ballX < this.#paddleX + this.#paddleLength + BALL_RADIUS) {
                // Ball bounces on the paddle, calculate this.ballDx and this.ballDy so that
                // the speed remains constant.
                // speed^2 = dx^2 + dy^2 = MAX_DELTA^2 + MAX_DELTA^2
                // -> speed = MAX_DELTA * sqrt(2)
                // (speed is measured in pixels / frame)
                // The bouncing angle is determined by the portion of the
                // paddle's length on which it falls and by the restriction
                // -MAX_DELTA < this.ballDx < MAX_DELTA
                // Since we allow for some margin of error (BALL_RADIUS), we need to
                // round the ball x to be within the paddle.
                let roundedBallX = Math.min(this.#ballX, this.#paddleX + this.#paddleLength);
                roundedBallX = Math.max(roundedBallX, this.#paddleX);
                const paddleLenghtPortion = (roundedBallX - this.#paddleX) * this.#deltaVectorLength * 2 / this.#paddleLength;
                this.#ballDx = -this.#deltaVectorLength + paddleLenghtPortion;
                // Solve for this.ballDy given the above equation and bounce up.
                this.#ballDy = -Math.sqrt(2 * Math.pow(this.#deltaVectorLength, 2) - Math.pow(this.#ballDx, 2));
            }
            else {
                // Ball fell into oblivion, restart.
                this.#restartBall();
                this.#paddleX = (this.offsetWidth - this.#paddleLength) / 2;
                this.#lives--;
            }
        }
        const keyDelta = Math.round(this.clientWidth / 60);
        if (this.#rightPressed && this.#paddleX < this.offsetWidth - this.#paddleLength) {
            this.#paddleX += keyDelta;
        }
        else if (this.#leftPressed && this.#paddleX > 0) {
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
        // coordinatesToEntryIndex expects coordinates relative to the timeline canvas.
        const timelineCanvasOffset = this.timelineFlameChart.getCanvas().getBoundingClientRect();
        // Check collision if there is an entry on the top, bottom, left and right of the ball
        const ballYRelativeToGame = this.#ballY + this.#gameViewportOffset - timelineCanvasOffset.top;
        const entryIndexTop = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX, ballYRelativeToGame + BALL_RADIUS);
        const entryIndexBottom = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX, ballYRelativeToGame - BALL_RADIUS);
        const entryIndexRight = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX + BALL_RADIUS, ballYRelativeToGame);
        const entryIndexLeft = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX - BALL_RADIUS, ballYRelativeToGame);
        // Points on the 45 degree corners
        const diffBetweenCornerandCircle = BALL_RADIUS / Math.SQRT2;
        const entryIndexRightTop = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX + diffBetweenCornerandCircle, ballYRelativeToGame + diffBetweenCornerandCircle);
        const entryIndexLeftTop = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX - diffBetweenCornerandCircle, ballYRelativeToGame + diffBetweenCornerandCircle);
        const entryIndexRightBottom = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX + diffBetweenCornerandCircle, ballYRelativeToGame - diffBetweenCornerandCircle);
        const entryIndexLeftBottom = this.timelineFlameChart.coordinatesToEntryIndex(this.#ballX - diffBetweenCornerandCircle, ballYRelativeToGame - diffBetweenCornerandCircle);
        const breakBrick = (entryIndex) => {
            const entryCoordinates = this.timelineFlameChart.entryIndexToCoordinates(entryIndex);
            if (entryCoordinates) {
                // Cap entries starting before the visible window in the game.
                const entryBegin = Math.max(entryCoordinates.x - timelineCanvasOffset.left, 0);
                // Extend the patch width and height an extra 0.5 px to ensure the
                // entry is completely covered.
                this.#brokenBricks.set(entryIndex, {
                    x: entryBegin - 0.5,
                    y: entryCoordinates.y - this.#gameViewportOffset - 0.5,
                    width: this.timelineFlameChart.entryWidth(entryIndex),
                });
            }
        };
        if (entryIndexTop > -1 && !this.#brokenBricks.has(entryIndexTop) && this.#visibleEntries.has(entryIndexTop)) {
            this.#ballDy = -this.#ballDy;
            breakBrick(entryIndexTop);
            return;
        }
        if (entryIndexBottom > -1 && !this.#brokenBricks.has(entryIndexBottom) &&
            this.#visibleEntries.has(entryIndexBottom)) {
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
        // if the brick hits on 45 degrees, reverse both directions
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
                const confettiContainerElement = document.createElement('span');
                confettiContainerElement.className = 'confetti-100';
                confettiContainerElement.append(this.#createConfettiElement((i % columnCount) * xSpacing + randomOffset(), (i % rowCount) * ySpacing + randomOffset()));
                timeoutIDs.push(window.setTimeout(() => this.append(confettiContainerElement), Math.random() * 100));
                timeoutIDs.push(window.setTimeout(() => {
                    confettiContainerElement.remove();
                }, 1000));
            }
            if (++count < 6) {
                setTimeout(drawConfetti, Math.random() * 100 + 400);
                return;
            }
            window.alert(`${i18nString(UIStrings.congrats)}\n${i18nString(UIStrings.ps)}`);
            timeoutIDs.forEach(id => clearTimeout(id));
            this.#closeGame();
        };
        drawConfetti();
    }
    #createConfettiElement(x, y) {
        const maxDistance = 400;
        const maxRotation = 3;
        const emojies = ['💯', '🎉', '🎊'];
        const confettiElement = document.createElement('span');
        confettiElement.textContent = emojies[this.#random(0, emojies.length)];
        confettiElement.className = 'confetti-100-particle';
        confettiElement.style.setProperty('--rotation', this.#random(-maxRotation * 360, maxRotation * 360) + 'deg');
        confettiElement.style.setProperty('--to-X', this.#random(-maxDistance, maxDistance) + 'px');
        confettiElement.style.setProperty('--to-Y', this.#random(-maxDistance, maxDistance) + 'px');
        confettiElement.style.left = x + 'px';
        confettiElement.style.top = y + 'px';
        return confettiElement;
    }
}
// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('brick-breaker', BrickBreaker);
//# sourceMappingURL=BrickBreaker.js.map