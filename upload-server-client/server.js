
const fs = require('fs');
const Upload = require('./lib/upload');

const path = './1234.mp4';
const file = fs.createReadStream(path);
const size = fs.statSync(path).size;

const options = {
    endpoint: 'http://62.234.96.29:5001/files/1234.mp4',
    uploadSize: size,
    chunkSize:1024*1024,  //分包大小 默认:Infinity 
};
var upload = new Upload(file, options);
upload.start().then(info =>{
   console.log('info:',info)
})

