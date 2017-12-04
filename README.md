# js-serve
serve `*.js` and `*.jsx` files instantly over http.

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

## Configuration
Order is of great importance, e.g. do not omit the port and the view folder if you
want to specify the host.
```
js-serve <view-directory; default=./views> <port; default=8080> <host; default=localhost>
```

## Logic
This module automatically imports all `*.js` and `*.jsx` files
from the specified folder. It then validates that the exported objects are functions.
Specified arguments (**does only work when the functions are implemented
using the `function` keyword**) are then extracted - these will be required to be sent using query-parameters. Based on the folder-structure, the `*.js` and `*.jsx` files
can be invoked using a basic HTTP GET request.

## Planned Features
- [] Support for functions that return **Promises**
- [] Dynamic Argument Sources: **body**, **headers**