'use strict'

const BaseHandler = require('./BaseHandler')
const ERRORS = require('../constants').ERRORS
const log = require('../../node_modules/debug/src')('upload-server:handlers:patch')
class PatchHandler extends BaseHandler {
    /**
     * 上传数据（支持断点续传）
     *
     * @param  {object} req 
     * @param  {object} res
     * @return {function}
     */
    send(req, res) {
        const file_id = this.getFileIdFromRequest(req)
        if (file_id === false) {
            return super.send(res, ERRORS.FILE_NOT_FOUND.status_code, {}, ERRORS.FILE_NOT_FOUND.body)
        }
        let offset = req.headers['upload-offset']
        if (offset === undefined) {
            return super.send(res, ERRORS.MISSING_OFFSET.status_code, {}, ERRORS.MISSING_OFFSET.body)
        }
        const content_type = req.headers['content-type']
        if (content_type === undefined) {
            return super.send(res, ERRORS.INVALID_CONTENT_TYPE.status_code, {}, ERRORS.INVALID_CONTENT_TYPE.body)
        }
        offset = parseInt(offset, 10)
        return this.store.getOffset(file_id)
            .then((stats) => {
                if (stats.size !== offset) {
                    log(`[PatchHandler] send: Incorrect offset - ${offset} sent but file is ${stats.size}`)
                    return Promise.reject(ERRORS.INVALID_OFFSET)
                }
                return this.store.write(req, file_id, offset)
            })
            .then((obj) => {
                let headers = {
                    'Upload-Offset': obj.offset
                }
                if(obj.location){
                    headers.url=obj.location
                }
                return super.send(res, 204, headers)
            })
            .catch((error) => {
                log('[PatchHandler]', error)
                const status_code = error.status_code || ERRORS.UNKNOWN_ERROR.status_code
                const body = error.body || `${ERRORS.UNKNOWN_ERROR.body}${error.message || ''}\n`
                return super.send(res, status_code, {}, body)
            })
    }
}

module.exports = PatchHandler
