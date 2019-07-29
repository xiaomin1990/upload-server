
const { exec,execSync } = require("child_process")
const path = require("path")
const fshelper = require('./fs')
const _fshelper =new fshelper()

class FFMeng{

    async ToM3U8({filepath,output,fileDel=false}){
        let outputname = path.basename(filepath,path.extname(filepath))
        let outDir = output
        if(!output){
            outDir = path.join(path.dirname(filepath),outputname)
            _fshelper.mkdirSync(outDir)
            output = path.join(outDir,outputname)
        }
        let command = `ffmpeg -i ${filepath} -codec copy -vbsf h264_mp4toannexb -map 0 -f segment -segment_list ${output}.m3u8 -segment_time 5  ${output}%03d.ts`
        return new Promise((resovel,reject) =>{
            exec(command, (err, stdout) => {
                if(err) reject(err)
                if(fileDel){
                    _fshelper.unlinkSync(filepath)
                }
                resovel({filename:outputname,output:outDir,ext:".m3u8"})
            })
        })
    }

}

module.exports = FFMeng