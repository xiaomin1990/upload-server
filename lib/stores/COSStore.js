'use strict';

const DataStore = require('./DataStore');
const File = require('../models/File');
const fs = require('fs');
const Configstore = require('../../node_modules/configstore');
const pkg = require('../../package.json');
const MASK = '0777';
const IGNORED_MKDIR_ERROR = 'EEXIST';
const FILE_DOESNT_EXIST = 'ENOENT';
const ERRORS = require('../constants').ERRORS;
const log = require('../../node_modules/debug/src')('upload-server:stores:filestore');
const COS = require('../helper/cos')
const FFMeng = require('../helper/ffmeng')

/**
 * 上传到本地
 *
 */
class COSStore extends DataStore {
    constructor(options) {
        super(options);
        this.directory = options.directory || options.path.replace(/^\//, '');
        this.extensions = ['creation', 'creation-defer-length'];
        this.configstore = new Configstore(`${pkg.name}-${pkg.version}`);
        this._checkOrCreateDirectory();
    }

    _checkOrCreateDirectory() {
        fs.mkdir(this.directory, MASK, (error) => {
            if (error && error.code !== IGNORED_MKDIR_ERROR) {
                throw error;
            }
        });
    }

    /**
     * 创建文件
     *
     * @param  {object} req 
     * @param  {File} file
     * @return {Promise}
     */
    create(req) {
        return new Promise((resolve, reject) => {
            const upload_length = req.headers['upload-length'];
            const upload_defer_length = req.headers['upload-defer-length'];
            const upload_metadata = req.headers['upload-metadata'];
            if (upload_length === undefined && upload_defer_length === undefined) {
                return reject(ERRORS.INVALID_LENGTH);
            }
            let file_id;
            try {
                file_id = this.generateFileName(req);
            }
            catch (generateError) {
                log('[FileStore] create: check your namingFunction. Error', generateError);
                return reject(ERRORS.FILE_WRITE_ERROR);
            }
            const file = new File(file_id, upload_length, upload_defer_length, upload_metadata);
            return fs.open(`${this.directory}/${file.id}`, 'w', (err, fd) => {
                if (err) {
                    log('[FileStore] create: Error', err);
                    return reject(err);
                }
                this.configstore.set(file.id, file);
                return fs.close(fd, (exception) => {
                    if (exception) {
                        log('[FileStore] create: Error', exception);
                        return reject(exception);
                    }
                    return resolve(file);
                });
            });
        });
    }

    /**
     * 写数据到文件 （）
     *
     * @param  {object} req 
     * @param  {string} file_id   
     * @param  {integer} offset     
     * @return {Promise}
     */
    write(req, file_id, offset) {
        return new Promise((resolve, reject) => {
            const path = `${this.directory}/${file_id}`;
            const options = {
                flags: 'r+',
                start: offset,
            };
            const stream = fs.createWriteStream(path, options);
            let new_offset = 0;
            req.on('data', (buffer) => {
                new_offset += buffer.length;
            });
            stream.on('error', (e) => {
                log('[FileStore] write: Error', e);
                reject(ERRORS.FILE_WRITE_ERROR);
            });
            return req.pipe(stream).on('finish', () => {
                log(`[FileStore] write: ${new_offset} bytes written to ${path}`);
                offset += new_offset;
                log(`[FileStore] write: File is now ${offset} bytes`);
                const config = this.configstore.get(file_id);
                log(`[FileStore] config: File is now ${config.upload_length} bytes`);
                if (config && parseInt(config.upload_length, 10) === offset) {
                    log(`[FileStore] write: finish`)
                    //第一步:视频转换
                    let _ffmenf =  new FFMeng()
                    _ffmenf.ToM3U8({filepath:path,fileDel:true}).then(info =>{
                        let output=info.output
                        let filename=info.filename+info.ext
                        //第二步:上传文件到COS云
                        let _cos =new COS()
                        _cos.UploadDir({Dir:output,folder:"m3u8",Delete:true}).then((location) =>{
                            location =location && ("https://"+location.substring(0,location.lastIndexOf('.'))+'.m3u8')
                            resolve({offset,location})
                        }).catch(err =>{
                            log(err)
                            reject(err)
                        })
                    }).catch(err =>{
                        log(err)
                        reject(err)
                    })
                }else{
                    resolve({offset});
                }
               
            });
        });
    }

    /**
     * 获取文件信息
     *
     * @param  {string} file_id 
     * @return {object} 
     */
    getOffset(file_id) {
        const config = this.configstore.get(file_id);
        return new Promise((resolve, reject) => {
            const file_path = `${this.directory}/${file_id}`;
            fs.stat(file_path, (error, stats) => {
                if (error && error.code === FILE_DOESNT_EXIST && config) {
                    log(`[FileStore] getOffset: No file found at ${file_path} but db record exists`, config);
                    return reject(ERRORS.FILE_NO_LONGER_EXISTS);
                }
                if (error && error.code === FILE_DOESNT_EXIST) {
                    log(`[FileStore] getOffset: No file found at ${file_path}`);
                    return reject(ERRORS.FILE_NOT_FOUND);
                }
                if (error) {
                    return reject(error);
                }
                if (stats.isDirectory()) {
                    log(`[FileStore] getOffset: ${file_path} is a directory`);
                    return reject(ERRORS.FILE_NOT_FOUND);
                }
                const data = Object.assign(stats, config);
                return resolve(data);
            });
        });
    }
}

module.exports = COSStore;
