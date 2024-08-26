npm install
./node_modules/.bin/esbuild --bundle package/nostats-subset.js --format=esm --outdir=lib
rm -rf node_modules package-lock.json
# Because there's a bug in clang causing it to reformat import lists even where formatting is disabled, run it right away
git cl format --js
