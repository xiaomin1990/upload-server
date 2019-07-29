'use strict';

const BaseHandler = require('./BaseHandler');
const ERRORS = require('../constants').ERRORS;
const log = require('../../node_modules/debug/src')('upload-server:handlers:post');
class PostHandler extends BaseHandler {

    /**
     * 创建文件
     *
     * @param  {object} req 
     * @param  {object} res 
     * @return {function}
     */
    send(req, res) {
        return this.store.create(req)
            .then((File) => {
                let url 
                if(this.store.relativeLocation){
                    url = `${req.baseUrl || ''}${this.store.path}/${File.id}`
                }else{
                    url = this.store.domain ? `${this.store.domain}${this.store.path}/${File.id}` : `//${req.headers.host}${req.baseUrl || ''}${this.store.path}/${File.id}`
                }
                return super.send(res, 201, { Location: url });
            })
            .catch((error) => {
                log('[PostHandler]', error);
                const status_code = error.status_code || ERRORS.UNKNOWN_ERROR.status_code;
                const body = error.body || `${ERRORS.UNKNOWN_ERROR.body}${error.message || ''}\n`;
                return super.send(res, status_code, {}, body);
            });
    }
}

module.exports = PostHandler;
