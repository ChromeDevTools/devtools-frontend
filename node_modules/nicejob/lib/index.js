
function get(which) {
  var phrases = require('../data/'+ which + '.json')[which],
    n = random(0, phrases.length - 1);
  return phrases[n];
}

function nicejob() {
  return get('positive');
}

function not_nicejob() {
  return get('negative');
}

function random(min, max) {
  if (max == null) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

nicejob.not = not_nicejob;

module.exports = nicejob;