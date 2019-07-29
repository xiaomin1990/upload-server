'use strict';

const BaseHandler = require('./BaseHandler');
const ERRORS = require('../constants').ERRORS;
const log = require('../../node_modules/debug/src')('upload-server:handlers:head');
class HeadHandler extends BaseHandler {
    /**
     *
     * @param  {object} req 
     * @param  {object} res 
     * @return {function}
     */
    send(req, res) {
        const file_id = this.getFileIdFromRequest(req);
        if (file_id === false) {
            return super.send(res, ERRORS.FILE_NOT_FOUND.status_code, {}, ERRORS.FILE_NOT_FOUND.body);
        }

        return this.store.getOffset(file_id)
            .then((file) => {
                res.setHeader('Cache-Control', 'no-store');
                res.setHeader('Upload-Offset', file.size);
                if (file.upload_length !== undefined) {
                    res.setHeader('Upload-Length', file.upload_length);
                }
                if (!('upload_length' in file) && file.upload_defer_length !== undefined) {
                    res.setHeader('Upload-Defer-Length', file.upload_defer_length);
                }
                if (file.upload_metadata !== undefined) {
                    res.setHeader('Upload-Metadata', file.upload_metadata);
                }
                return res.end();
            })
            .catch((error) => {
                log('[HeadHandler]', error);
                const status_code = error.status_code || ERRORS.UNKNOWN_ERROR.status_code;
                const body = error.body || `${ERRORS.UNKNOWN_ERROR.body}${error.message || ''}\n`;
                return super.send(res, status_code, {}, body);
            });
    }
}

module.exports = HeadHandler;
