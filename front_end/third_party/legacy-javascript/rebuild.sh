SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

npm install

rm -rf package
cp node_modules/legacy-javascript/legacy-javascript.js lib

rm -rf node_modules package
