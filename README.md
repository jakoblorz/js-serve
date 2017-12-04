# js-serve
serve *.js and *.jsx files immediately over http.

## Setup
- Install js-serve: `npm install js-serve`
- Prepare your **view directory**: `mkdir ./views`
- Add `*.js` or `*.jsx` files, exporting a `function`:
```javascript
// ping.js

module.exports = function (ping) {
    return ping + " - pong ";
};
```
- `curl http://localhost:8080/ping.js?ping=testping` returns `testping - pong` 