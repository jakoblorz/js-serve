#! /usr/bin/env node

const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");

const _projectRoot = process.cwd() || __dirname;
const _viewFolder = path.join(_projectRoot, process.argv[2] || "./views");
const _port = parseInt(process.argv[3] || process.env.PORT || "8080");
const _host = process.argv[4] || process.env.HOSTNAME || "localhost";

/**
 * check if a filename ends with an allowed extname
 * @param {string[]} allowedExtnames list of extnames that are allowed
 */
const filterFilePathByExtname = (allowedExtnames) =>
    (file) => allowedExtnames.indexOf(path.extname(file)) !== -1;

/**
 * append an array or plain value to another array
 * @param {any[]} array list of already processed elements
 * @param {any | any[]} insertionVal value to append to the list of already processed elements
 */
const reduceMultiDimensionalArray = (array, insertionVal) =>
    insertionVal instanceof Array ? array.concat(insertionVal) : array.concat([insertionVal]);

/**
 * check if a path points to a file or a directory
 * @param {string} file path to a file or a directory
 */
const fileIsDirectory = (file) =>
    fs.statSync(file).isDirectory();

/**
 * scan a directory for files recursively, returning a list of all files 
 * @param {string} basePath directory path to start scanning for files
 * @param {string} relPath not required when calling manually - stores the offset from the
 * initial dir path
 */
const readDirRecursive = (basePath, relPath = "/") =>
    ((_level) => fs.readdirSync(_level)
        .map((file) => fileIsDirectory(path.join(_level, file)) ?
            readDirRecursive(basePath, path.join(relPath, file)) : path.join(relPath, file))
        .reduce(reduceMultiDimensionalArray, []))(path.join(basePath, relPath));

/**
 * get a list of the arguments of a function
 * @param {Function} fn function to extract the required arguments from
 */
const extractFunctionArguments = (fn) =>
    ((_args) => _args.length === 1 && _args[0] === "" ? [] : _args)((fn.toString()
        .replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, "")
        .match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m))[1]
        .split(/,/));

/**
 * Create an operation on an array which requires the first array value. The result will be
 * appended to the array
 * @param {Function} fn callback that is invoked using the invoked array element at position
 * 1 as first argument and full array as second argument
 */
const arrayFileStringOperation = (fn) =>
    (array) => array.length > 0 ? array.concat([fn(array[0], array)]) : array;

/**
 * creates a filter function to filter all views that are registered at
 * the url
 * @param {string[]} urlPathArray list of url sections (split be /)
 */
const matchViewToPath = (urlPathArray) =>
    (view) => urlPathArray.length === view.path.length && urlPathArray
        .filter((currentPathSection, index) =>
            view.path[index] === currentPathSection)
        .length === urlPathArray.length;

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

    // prevent req.url === undefined errors
    req.url = req.url || "/";

    // try to find a view that matches the url
    const view = views.filter(matchViewToPath(req.url.slice(1, ((index) =>
        index === -1 ? undefined : index)(req.url.indexOf("?"))).split("/")))[0];

    // return an error if no view was found
    if (view === undefined) {
        return res.end(JSON.stringify({ error: "no handler found" }));
    }

    // extract the arguments from the request's query, undefined if args are not
    // sufficient
    const args = ((queryArgs) => Object.keys(queryArgs).length === view.args.length ?
        view.args.map((arg) => queryArgs[arg]) : undefined)(url.parse(req.url, true).query);

    // if arguments are required but not sufficient, return an error
    if (args === undefined && view.args.length > 0) {
        return res.end(JSON.stringify({ error: "not enough arguments provided" }));
    }

    // invoke the handler method using the extracted arguments
    res.end(view.handler.apply(null, args));

}).listen(_port, _host);
