SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

npm install

rm -rf package
cp -r node_modules/third-party-web package
rm -fr package/.* package/www-v2 package/dist/domain-map.csv

./node_modules/.bin/esbuild --bundle package/nostats-subset.js --format=esm --outdir=lib
rm -rf node_modules package-lock.json
# Because there's a bug in clang causing it to reformat import lists even where formatting is disabled, run it right away
git cl format --js
