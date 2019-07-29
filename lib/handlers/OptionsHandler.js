'use strict';

const BaseHandler = require('./BaseHandler');
const ALLOWED_METHODS = require('../constants').ALLOWED_METHODS;
const ALLOWED_HEADERS = require('../constants').ALLOWED_HEADERS;
const MAX_AGE = require('../constants').MAX_AGE;

class OptionsHandler extends BaseHandler {
    /**
     * @param  {object} req 
     * @param  {object} res 
     * @return {function}
     */
    send(req, res) {
        
        res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
        res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);

        res.setHeader('Access-Control-Max-Age', MAX_AGE);

        if (this.store.extensions) {
            res.setHeader('Tus-Extension', this.store.extensions);
        }

        return super.send(res, 204);
    }
}

module.exports = OptionsHandler;
