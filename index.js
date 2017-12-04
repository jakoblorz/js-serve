const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");

const _projectRoot = process.argv[2] || process.cwd() || __dirname;
const _viewFolder = path.join(_projectRoot, "./views");
const _port = parseInt(process.argv[3] || process.env.PORT || "8585");
const _host = process.argv[4] || process.env.HOSTNAME || "localhost";

/**
 * check if a filename ends with an allowed extname
 * @param {string[]} allowedExtnames list of extnames that are allowed
 */
const filterFilePathByExtname = (allowedExtnames) =>
    (file) => allowedExtnames.indexOf(path.extname(file)) !== -1;

/**
 * scan a directory for files recursively, returning a list of all files 
 * @param {string} dir directory path to start scanning for files
 * @param {string} pathExtension not required when calling manually - stores the offset from the
 * initial dir path
 */
const readDirRecursive = (dir, pathExtension = "/") =>
    fs.readdirSync(dir)

        // readDirSync returns files as well as directories - recurse into the directories
        .map((file) => ((_file) => fs.statSync(_file).isDirectory() ?
            readDirRecursive(_file, path.join(pathExtension, file)) : file)(path.join(dir, file)))

        // reduce the (string | string[])[] into a proper string[] with correctly offsetted
        // filenames representing the offset from the base folder
        .reduce((files, file) => file instanceof Array ?
            files.concat(file.map((file) => path.join(pathExtension, file))) :
            files.concat([path.join(pathExtension, file)]), []);

const extractFunctionArguments = (fn) =>
    ((_args) => _args.length === 1 && _args[0] === "" ? [] : _args)(
        (fn.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, "")
            .match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m))[1]
            .split(/,/));
        
const arrayFileStringOperation = (fn) =>
    (array) => array.length > 0 ? array.concat([fn(array[0], array)]) : array;
        
const matchViewToPath = (urlPathArray) =>
    (view) => urlPathArray.filter((currentPathSection, index) =>
        view.path[index] === currentPathSection).length === urlPathArray.length && urlPathArray.length === view.path.length;
    
const views = readDirRecursive(_viewFolder)

    // filter all files out that do not end with .js or .jsx
    .filter(filterFilePathByExtname([".js", ".jsx"]))

    // map each file into an array with the filepath as first element
    .map((file) => [file])

    // append the required file as second element
    .map(arrayFileStringOperation((file) => require(path.join(_viewFolder, file))))

    // filter all arrays out that do not have a function as second element
    .filter((arr) => typeof arr[1] === "function")

    // append the function arguments to the array as third element
    .map(arrayFileStringOperation((file, array) => extractFunctionArguments(array[1])))

    // append the relative file path as splitted string array to the array as fourth element
    .map(arrayFileStringOperation((file) => (file[0] === "/" ? file.slice(1) : file).split("/")))

    // replace the array with a object
    .map((array) => ({ file: array[0], handler: array[1], args: array[2], path: array[3] }));

const server = http.createServer((req, res) => {
    req.url = req.url || "/";

    const view = views.filter(matchViewToPath(req.url.slice(1, ((index) =>
        index === -1 ? undefined : index)(req.url.indexOf("?"))).split("/")))[0];
    
    if (view === undefined) {
        return res.end(JSON.stringify({ error: "no handler found" }));
    }

    const args = ((queryArgs) => Object.keys(queryArgs).length === view.args.length ?
        view.args.map((arg) => queryArgs[arg]) : undefined)(
            url.parse(req.url, true).query);

    if (args === undefined && view.args.length > 0) {
        return res.end(JSON.stringify({ error: "not enought arguments found" }));
    }

    res.end(view.handler.apply(null, args));
}).listen(_port, _host);
    
