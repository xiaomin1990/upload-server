
const extend = require('../node_modules/extend')
const pRequest = require('./request')
const {getSource} = require('./source')
const EventEmitter = require('events'); 
const { resolve } = require('url')


const defaultOptions = {
    endpoint: null,
    headers: {},
    chunkSize: Infinity,
    uploadUrl: null,
    uploadSize: null,
    overridePatchMethod: false,
    uploadLengthDeferred: false,
}

class Upload  extends EventEmitter {
   
    constructor(file, options) {
        super()
        this.options = extend(true, {}, defaultOptions, options)
        this.file = file
        this.url = null
        this._offset = null
        this._size = null
        this._source = null
    }

    async start() {
        const file = this.file
        if (!file) {
            throw new Error('no file or stream to upload provided')
        }
        if (!this.options.endpoint && !this.options.uploadUrl) {
            throw new Error('neither an endpoint or an upload URL is provided')
        }
        if (this._source) {
            return await this._start(this._source)
        }
        else {
            let source = await getSource(file, this.options.chunkSize)
            this._source = source
            return await this._start(source)
        }
    }

    async  _start(source) {
        if (this.options.uploadLengthDeferred) {
            this._size = null
        }
        else if (this.options.uploadSize != null) {
            this._size = Number(this.options.uploadSize)
            if (isNaN(this._size)) {
                throw new Error(' cannot convert `uploadSize` option into a number')
            }
        }
        else {
            this._size = source.size
            if (this._size == null) {
                throw new Error("cannot automatically derive upload's size from input and must be specified manually using the `uploadSize` option")
            }
        }
        return await this._createUpload()
    }
     async _createUpload() {
        if (!this.options.endpoint) {
            throw new Error('unable to create upload because no endpoint is provided')
        }
        let resInfo = await pRequest.request({
            url:this.options.endpoint,
            method:"POST",
            headers:{
                'Upload-Length':this._size
            }
        }).catch(err =>{
            throw new Error(`failed to create upload,error:${err.message}`)
        })
        if (!inStatusCategory(resInfo.statusCode, 200)) {
            throw new Error('unexpected response while creating upload')
        }
        const location = resInfo && resInfo.headers && resInfo.headers.location
        console.log('location:',location)
        if (location == null) {
            throw new Error('invalid or missing Location header')
        }
        this.url = resolveUrl(this.options.endpoint, location)
        if (this._size === 0) {
            this._source.close()
            return 
        }
        this._offset = 0
        return await this._startUpload()
    }

    async _startUpload() {
        const start = this._offset
        let end = this._offset + this.options.chunkSize
        if ((end === Infinity || end > this._size) && !this.options.uploadLengthDeferred) {
            end = this._size
        }
        let chunk= await this._source.slice(start, end)
        let resInfo = await pRequest.request({
            url:this.url,
            method:"POST",
            headers:{
                'X-HTTP-Method-Override':'PATCH',
                'Upload-Offset':this._offset,
                'Content-Type':'application/offset+octet-stream'
            },
            body:chunk,
        }).catch(err =>{
            throw new Error(`failed to upload chunk at offset ${this._offset}:${err.message}`)
        })
        if (!inStatusCategory(resInfo.statusCode, 200)) {
            throw new Error('unexpected response while uploading chunk')
        }
        const offset =resInfo && resInfo.headers && resInfo.headers["upload-offset"] &&  parseInt(resInfo.headers["upload-offset"], 10)
        if (isNaN(offset)) {
            throw new Error('invalid or missing offset value')
        }
        this._offset = offset
        if (offset == this._size) {
            this._source.close()
            return resInfo && resInfo.headers && resInfo.headers["url"]
        }
        return await this._startUpload()
    }
}


function inStatusCategory(status, category) {
    return (status >= category && status < (category + 100))
}
function resolveUrl(origin, link) {
    return resolve(origin, link)
}

Upload.defaultOptions = defaultOptions

module.exports=Upload
