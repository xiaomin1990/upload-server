'use strict';

const DataStore = require('../stores/DataStore');

class BaseHandler {
    constructor(store) {
        if (!(store instanceof DataStore)) {
            throw new Error(`${store} is not a DataStore`);
        }
        this.store = store;
    }

    /**
     * @param  {object} res 
     * @param  {integer} status
     * @param  {object} headers
     * @param  {string} body
     * @return {ServerResponse}
     */
    send(res, status, headers, body) {
        headers = headers ? headers : {};
        body = body ? body : '';
        headers = Object.assign(headers, {
            'Content-Length': body.length,
        });

        res.writeHead(status, headers);
        res.write(body);
        return res.end();
    }

    /**
     * @param  {object} req 
     * @return {bool|string}
     */
    getFileIdFromRequest(req) {
        const re = new RegExp(`${req.baseUrl || ''}${this.store.path}\\/(\\S+)\\/?`); 
        const match = (req.originalUrl || req.url).match(re);
        if (!match) {
            return false;
        }
        const file_id = match[1];
        return file_id;
    }

}

module.exports = BaseHandler;
