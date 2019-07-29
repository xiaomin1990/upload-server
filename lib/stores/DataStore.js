'use strict'


const Uid = require('../models/Uid')
const File = require('../models/File')
const ERRORS = require('../constants').ERRORS
const debug = require('../../node_modules/debug/src')
const log = debug('tus-node-server:stores')
class DataStore  {
    constructor(options) {
        if (!options || !options.path) {
            throw new Error('Store must have a path')
        }
        if (options.namingFunction && typeof options.namingFunction !== 'function') {
            throw new Error('namingFunction must be a function')
        }
        this.path = options.path
        this.generateFileName = options.namingFunction || Uid.rand
        this.relativeLocation = options.relativeLocation || false
        this.domain = options.domain || false
    }

    get extensions() {
        if (!this._extensions) {
            return null
        }
        return this._extensions.join()
    }

    set extensions(extensions_array) {
        if (!Array.isArray(extensions_array)) {
            throw new Error('DataStore extensions must be an array')
        }
        this._extensions = extensions_array
    }

    /**
     * POST requests  创建文件
     *
     * @param  {object} req
     * @return {Promise}
     */
    create(req) {
        return new Promise((resolve, reject) => {
            const upload_length = req.headers['upload-length']
            const upload_defer_length = req.headers['upload-defer-length']
            const upload_metadata = req.headers['upload-metadata']
            if (upload_length === undefined && upload_defer_length === undefined) {
                return reject(ERRORS.INVALID_LENGTH)
            }
            const file_id = this.generateFileName(req)
            const file = new File(file_id, upload_length, upload_defer_length, upload_metadata)
            return resolve(file)
        })
    }

    /**
     * PATCH requests  写数据（支持断点续传）
     *
     * @param  {object} req 
     * @return {Promise}
     */
    write(req) {
        log('[DataStore] write')
        return new Promise((resolve, reject) => {
            const offset = 0
            return resolve(offset)
        })
    }

    /**
     * 获取文件大小 用于断点续传
     *
     * @param  {string}  id  
     * @return {Promise} 
     */
    getOffset(id) {
        return new Promise((resolve, reject) => {
            if (!id) {
                return reject(ERRORS.FILE_NOT_FOUND)
            }
            return resolve({ size: 0, upload_length: 1 })
        })
    }
}

module.exports = DataStore
