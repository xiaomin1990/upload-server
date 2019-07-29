
const _COS = require('../../node_modules/cos-nodejs-sdk-v5')
const COSConfig = require('../constants').COS
const fshelper=require('./fs')
const _fshelper =new fshelper()
const log =require('../../node_modules/debug/src')('helper:cos')

class COS {
  constructor() {
    this.cos = new _COS({
      SecretId:COSConfig.SecretId,
      SecretKey: COSConfig.SecretKey
    })
  }
  UploadFile({Key,FilePath,Region = COSConfig.Region,Bucket = COSConfig.Bucket}) {
      return new Promise((resovel,reject) =>{
        this.cos.sliceUploadFile({
            Bucket,
            Region,
            Key,
            FilePath
        },(err,data)=>{
            if(err) reject(err)
            resovel(data)
        }) 
    })
  }
  async UploadDir({Dir,folder = null,Delete=false,Region = COSConfig.Region,Bucket = COSConfig.Bucket}){
      let files = _fshelper.recurseSync(Dir,["**/*.mp4","**/*.m3u8","**/*.avi","**/*.wma","**/*.wav","**/*.ts","**/*.mp3"])
      if(files && files.length>0){
        let location
        try{
          for(let info of files){
            if(info && info.flag){
              let Key=folder ? folder + '/' +info.filename  : info.filename
              let FilePath=info.filepath
              let uploadInfo = await this.UploadFile({Key,FilePath,Region,Bucket})
              location = location || uploadInfo && uploadInfo.Location
            }
          }
          if(Delete){
            _fshelper.rmdirFileSync(Dir)
            _fshelper.rmdirSync(Dir)
         }
         return location
        }catch(error){
          log.error(error.message)
        }
      }
  }

}

module.exports = COS