const myPromise = new Promise((resolve, reject) => {
  resolve('Success!');
});

ignoreListed1();

function ignoreListed1() {
  ignoreListed2();
}

function ignoreListed2() {
  ignoreListed3();
}

function ignoreListed3() {
  ignoreListed4();
}

function ignoreListed4() {
  myPromise.then((value) => {
    shown1();
  });
}
