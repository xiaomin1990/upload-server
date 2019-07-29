
const {Readable, Transform } = require('stream')
const {ReadStream, createReadStream} = require('fs')

class BufferSource {
    constructor(buffer) {
        this._buffer = buffer;
        this.size = buffer.length;
    }

    slice(start, end, callback) {
        const buf = this._buffer.slice(start, end);
        buf.size = buf.length;
        callback(null, buf);
    }

    close() {}
}

class FileSource {
    constructor(stream) {
        this._stream = stream;
        this._path = stream.path.toString();
    }

    slice(start, end) {
        return new Promise((resovel,reject)=>{
            const stream = createReadStream(this._path, {
                start,
                end: end - 1,
                autoClose: true,
            });
            stream.size = end - start
            resovel(stream)
        })
    }
    close() {
        this._stream.destroy();
    }
}

class StreamSource {
    constructor(stream, chunkSize) {
        chunkSize = Number(chunkSize);
        if (!isFinite(chunkSize)) {
            throw new Error('cannot create source for stream without a finite value for the `chunkSize` option');
        }
        this._stream = stream;
        this.size = null;
        stream.pause();
        this._buf = new Buffer(chunkSize);
        this._bufPos = null;
        this._bufLen = 0;
    }
    slice(start, end) {
        return new Promise((resovel,reject)=>{
            if (start >= this._bufPos && start < (this._bufPos + this._bufLen)) {
                const bufStart = start - this._bufPos;
                const bufEnd = Math.min(this._bufLen, end - this._bufPos);
                const buf = this._buf.slice(bufStart, bufEnd);
                buf.size = buf.length;
                resovel(buf)
            }
            if (start < this._bufPos) {
                reject('cannot slice from position which we already seeked away')
            }
            this._bufPos = start;
            this._bufLen = 0;
            const bytesToSkip = start - this._bufPos;
            const bytesToRead = end - start;
            const slicingStream = new SlicingStream(bytesToSkip, bytesToRead, this);
            this._stream.pipe(slicingStream);
            slicingStream.size = bytesToRead;
            resovel(slicingStream);
        })
    }

    close() {

    }
}


class SlicingStream extends Transform {
    constructor(bytesToSkip, bytesToRead, source) {
        super();
        this._bytesToSkip = bytesToSkip;
        this._bytesToRead = bytesToRead;
        this._source = source;
    }

    _transform(chunk, encoding, callback) {
        const bytesSkipped = Math.min(this._bytesToSkip, chunk.length);
        this._bytesToSkip -= bytesSkipped;
        const bytesAvailable = chunk.length - bytesSkipped;
        if (bytesAvailable === 0) {
            callback(null);
            return;
        }
        const bytesToRead = Math.min(this._bytesToRead, bytesAvailable);
        this._bytesToRead -= bytesToRead;
        if (bytesToRead !== 0) {
            const data = chunk.slice(bytesSkipped, bytesSkipped + bytesToRead);
            this._source._bufLen += data.copy(this._source._buf, this._source._bufLen);
            this.push(data);
        }
        if (this._bytesToRead === 0) {
            this._source._stream.unpipe(this);
            this.end();
        }
        if (bytesToRead !== bytesAvailable) {
            const unusedChunk = chunk.slice(bytesSkipped + bytesToRead);
            this._source._stream.unshift(unusedChunk);
        }
        callback(null);
    }
}

module.exports = {
    getSource:function(input, chunkSize) {
        return new Promise(function(resovel,reject){
            if (Buffer.isBuffer(input)) {
                resovel(new BufferSource(input))
            }
            else if(input instanceof ReadStream && input.path != null) {
                resovel(new FileSource(input))
            }
            else if(input instanceof Readable) {
                resovel(new StreamSource(input, chunkSize))
            }
            else{
                reject('source object may only be an instance of Buffer or Readable in this environment')
            } 
        })
    }

}
