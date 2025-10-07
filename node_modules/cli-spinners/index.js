import spinners from './spinners.json' with {type: 'json'};

export default spinners;

const spinnersList = Object.keys(spinners);

export function randomSpinner() {
	const randomIndex = Math.floor(Math.random() * spinnersList.length);
	const spinnerName = spinnersList[randomIndex];
	return spinners[spinnerName];
}
