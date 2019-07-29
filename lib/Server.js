'use strict';

/**
 * @fileOverview
 * TUS Protocol Server Implementation.
 *
 * @author Ben Stahl <bhstahl@gmail.com>
 */
const http = require('http');

const DataStore = require('./stores/DataStore');
const HeadHandler = require('./handlers/HeadHandler');
const OptionsHandler = require('./handlers/OptionsHandler');
const PatchHandler = require('./handlers/PatchHandler');
const PostHandler = require('./handlers/PostHandler');
const RequestValidator = require('./validators/RequestValidator');
const EXPOSED_HEADERS = require('./constants').EXPOSED_HEADERS;
const log = require('../node_modules/debug/src')('upload-server');
class UpServer  {
    constructor() {
        this.handlers = {};
    }

    get datastore() {
        return this._datastore;
    }

    set datastore(store) {
        if (!(store instanceof DataStore)) {
            throw new Error(`${store} is not a DataStore`);
        }
        this._datastore = store;
        this.handlers = {
            GET: {},
            HEAD: new HeadHandler(store),
            OPTIONS: new OptionsHandler(store),
            PATCH: new PatchHandler(store),
            POST: new PostHandler(store),
        };
    }

    get(path, callback) {

        this.handlers.GET[path] = callback;
    }

    /**
     * request 请求
     *
     * @param  {object} req 
     * @param  {object} res 
     * @return {ServerResponse}
     */
    handle(req, res) {
        log(`[UPServer] handle: ${req.method} ${req.url}`);
        //重写method，用于支持 PATCH、Put等请求
        if (req.headers['x-http-method-override']) {
            req.method = req.headers['x-http-method-override'].toUpperCase();
        }

        if (req.method === 'GET') {

            if (!(req.url in this.handlers.GET)) {
                res.writeHead(404, {});
                res.write('Not found\n');
                return res.end();
            }
            return this.handlers.GET[req.url](req, res);
        }

        const invalid_headers = [];

        for (const header_name in req.headers) {
            if (req.method === 'OPTIONS') {
                continue;
            }
            if (header_name.toLowerCase() === 'content-type' && req.method !== 'PATCH') {
                continue;
            }
            if (RequestValidator.isInvalidHeader(header_name, req.headers[header_name])) {
                log(`Invalid ${header_name} header: ${req.headers[header_name]}`);
                invalid_headers.push(header_name);
            }
        }

        if (invalid_headers.length > 0) {
            res.writeHead(412, {}, 'Precondition Failed');
            return res.end(`Invalid ${invalid_headers.join(' ')}\n`);
        }

        // Enable CORS
        res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS);
        if (req.headers.origin) {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        }

        // Invoke the handler for the method requested
        if (this.handlers[req.method]) {
            return this.handlers[req.method].send(req, res);
        }

        // 404 Anything else
        res.writeHead(404, {});
        res.write('Not found\n');
        return res.end();
    }

    listen() {
        const server = http.createServer(this.handle.bind(this));
        return server.listen.apply(server, arguments);
    }
}

module.exports = UpServer;
