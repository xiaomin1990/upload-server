const request = require('request')

class PRequest{

    constructor(){
        this.defaultOption={
            url:undefined,
            method:"GET",
            headers:{},
            body:undefined,
            formData:undefined
        }
    }

    request(options){
        let opt = Object.assign({}, this.defaultOption, options)
        if(!opt.url) throw new Error('url is must')
        return new Promise((resolve,reject) =>{
            request(options,function(error, response, body){
                  if(error) return reject(error)
                  resolve({status:response.status,statusCode:response.statusCode,headers:response.headers,body:body})
            })
        })
    }
 
}
module.exports =  new PRequest()