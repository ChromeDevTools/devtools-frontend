// TODO: Load the spinner names from the JSON file.
export type SpinnerName =
	| 'dots'
	| 'dots2'
	| 'dots3'
	| 'dots4'
	| 'dots5'
	| 'dots6'
	| 'dots7'
	| 'dots8'
	| 'dots9'
	| 'dots10'
	| 'dots11'
	| 'dots12'
	| 'dots13'
	| 'dots14'
	| 'dots8Bit'
	| 'dotsCircle'
	| 'sand'
	| 'line'
	| 'line2'
	| 'rollingLine'
	| 'pipe'
	| 'simpleDots'
	| 'simpleDotsScrolling'
	| 'star'
	| 'star2'
	| 'flip'
	| 'hamburger'
	| 'growVertical'
	| 'growHorizontal'
	| 'balloon'
	| 'balloon2'
	| 'noise'
	| 'bounce'
	| 'boxBounce'
	| 'boxBounce2'
	| 'binary'
	| 'triangle'
	| 'arc'
	| 'circle'
	| 'squareCorners'
	| 'circleQuarters'
	| 'circleHalves'
	| 'squish'
	| 'toggle'
	| 'toggle2'
	| 'toggle3'
	| 'toggle4'
	| 'toggle5'
	| 'toggle6'
	| 'toggle7'
	| 'toggle8'
	| 'toggle9'
	| 'toggle10'
	| 'toggle11'
	| 'toggle12'
	| 'toggle13'
	| 'arrow'
	| 'arrow2'
	| 'arrow3'
	| 'bouncingBar'
	| 'bouncingBall'
	| 'smiley'
	| 'monkey'
	| 'hearts'
	| 'clock'
	| 'earth'
	| 'material'
	| 'moon'
	| 'runner'
	| 'pong'
	| 'shark'
	| 'dqpb'
	| 'weather'
	| 'christmas'
	| 'grenade'
	| 'point'
	| 'layer'
	| 'betaWave'
	| 'fingerDance'
	| 'fistBump'
	| 'soccerHeader'
	| 'mindblown'
	| 'speaker'
	| 'orangePulse'
	| 'bluePulse'
	| 'orangeBluePulse'
	| 'timeTravel'
	| 'aesthetic'
	| 'dwarfFortress';

export type Spinner = {
	/**
	The intended time per frame, in milliseconds.
	*/
	readonly interval: number;

	/**
	An array of frames to show for the spinner.
	*/
	readonly frames: string[];
};

/**
70+ spinners for use in the terminal.

@example
```
import cliSpinners from 'cli-spinners';

console.log(cliSpinners.dots);
// {
// 	interval: 80,
// 	frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
// }
```
*/
declare const cliSpinners: {
	readonly [spinnerName in SpinnerName]: Spinner;
};

export default cliSpinners;

/**
Get a random spinner.

@example
```
import {randomSpinner} from 'cli-spinners';

console.log(randomSpinner());
// {
// 	interval: 80,
// 	frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
// }
```
*/
export function randomSpinner(): Spinner;
