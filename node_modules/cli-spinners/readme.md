# cli-spinners

> 70+ spinners for use in the terminal

<p align="center">
	<br>
	<img width="700" src="screenshot.svg">
	<br>
	<br>
</p>

The list of spinners is just a [JSON file](spinners.json) and can be used wherever.

You probably want to use one of these spinners through the [`ora`](https://github.com/sindresorhus/ora) package.

## Install

```sh
npm install cli-spinners
```

## Usage

```js
import cliSpinners from 'cli-spinners';

console.log(cliSpinners.dots);
/*
{
	interval: 80,
	frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
}
*/
```

- `interval` is the intended time per frame, in milliseconds.
- `frames` is an array of frames to show for the spinner.

## Preview

The header GIF is outdated. See all the [spinner at once](https://jsfiddle.net/sindresorhus/2eLtsbey/embedded/result/) or [one at the time](https://asciinema.org/a/95348?size=big).

## API

### cliSpinners

Each spinner comes with a recommended `interval` and an array of `frames`.

[See the spinners.](spinners.json)

### randomSpinner()

Get a random spinner.

```js
import {randomSpinner} from 'cli-spinners';

console.log(randomSpinner());
/*
{
	interval: 80,
	frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
}
*/
```

## Related

- [ora](https://github.com/sindresorhus/ora) - Elegant terminal spinner
- [CLISpinner](https://github.com/kiliankoe/CLISpinner) - Terminal spinners for Swift
- [py-spinners](https://github.com/ManrajGrover/py-spinners) - Python port
- [spinners](https://github.com/FGRibreau/spinners) - Terminal spinners for Rust
- [go-spinners](https://github.com/gabe565/go-spinners) - Go port
- [bash-cli-spinners](https://github.com/simeg/bash-cli-spinners) - Terminal spinners in Bash
