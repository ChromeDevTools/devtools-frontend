var nicejob = require('../lib/index');

console.log('Positive:');
console.log(nicejob());
console.log(nicejob());
console.log(nicejob());

console.log();

console.log('Negative:');
console.log(nicejob.not());
console.log(nicejob.not());
console.log(nicejob.not());
