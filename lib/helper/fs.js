const fs = require("fs")
const util = require("../../node_modules/utils-extend")
const path = require("path")
const fileMatch = require("../../node_modules/file-match/file-match")

class FS {
  constructor() {
    this.mode = '0777'
  }
  GetExists(filepath) {
    let exists = fs.existsSync(filepath)
    if (exists) {
        return filepath
    } else {
        return this.GetExists(path.dirname(filepath))
    }
}
/**
 * 创建夹  支持一次创建多级目录
 * @param {*} filepath 
 * @param {*} mode 
 */
mkdir(filepath, mode) {
    let root = this.GetExists(filepath)
    let children = path.relative(root, filepath)
    mode = mode || this.mode
    if (!children) return Promise.resolve()
    children = children.split(path.sep)      
    function _create(filepath) {
        return new Promise((resolve,reject)=>{
            if (_create.count === children.length) {
                return resolve()
            }
            filepath = path.join(filepath, children[_create.count])
            fs.mkdir(filepath, mode, function(err) {
                if (err) reject(err)
                _create.count++
                return _create(filepath)
            })
        })
    }
    _create.count = 0
    return _create(root)
}
mkdirSync(filepath, mode) {
    let root = this.GetExists(filepath)
    let children = path.relative(root, filepath)
    if (!children) return
    mode = mode || this.mode;
    children = children.split(path.sep)
    children.forEach(function(item) {
        root = path.join(root, item)
        fs.mkdirSync(root, mode)
    })
}
/**
 * 写文件
 * @param {*} filename 
 * @param {*} data 
 * @param {*} options 
 */
writeFile(filename, data, options) {
    let dirname = path.dirname(filename)
    return new Promise((resolve,reject)=>{
        this.mkdir(dirname).then(() => {
            fs.writeFile(filename, data, options, function(err) {
                if (err) reject(err)
                resolve()
            })
          })
    })
}
writeFileSync(filename, data, options) {
    let dirname = path.dirname(filename)
    this.mkdirSync(dirname)
    fs.writeFileSync(filename, data, options)
}
/**
 * 拷贝文件
 * @param {*} srcpath 
 * @param {*} destpath 
 * @param {*} options 
 */
copyFile(srcpath, destpath, options) {
    options = util.extend({ encoding: "utf8" }, options || {})
    return new Promise((resolve,reject) => {
        fs.readFile(srcpath, { encoding: options.encoding }, (err, contents) => {
            if (err) return reject(err)
            return this.writeFile(destpath, contents, options)
          })
    })
}
copyFileSync(srcpath, destpath, options) {
    options = util.extend({ encoding: "utf8" }, options || {})
    let contents = fs.readFileSync(srcpath)
    this.writeFileSync(destpath, contents)
}
/**
 * 递归文件夹
 * @param {*} dirpath 
 * @param {* } filter
 * @param {*} callback {filepath:路径, relative:相对路径,filename:文件名,flag:true符合筛选条件反之}
 */
//filter  eg .   ==['**/*.js']
recurse(dirpath, filter, callback) {
    let filterCb = fileMatch(filter)
    let rootpath = dirpath
    function _recurse(dirpath) {
        fs.readdir(dirpath, function(err, files) {
             if (err) return callback(err)
            files.forEach(function(filename) {
                let filepath = path.join(dirpath, filename)
                fs.stat(filepath, function(err, stats) {
                    let relative = path.relative(rootpath, filepath)
                    let flag = filterCb(relative)
                    if (stats.isDirectory()) {
                        _recurse(filepath)
                    }
                    return callback({filepath, relative,filename,flag})
                })
            })
        })
    }
    _recurse(dirpath)
}
recurseSync(dirpath, filter) {
    let filterCb = fileMatch(filter)
    let rootpath = dirpath
    let files=[]
    function _recurse(dirpath) {
      fs.readdirSync(dirpath).forEach(function(filename) {
        let filepath = path.join(dirpath, filename)
        let stats = fs.statSync(filepath)
        let relative = path.relative(rootpath, filepath)
        let flag = filterCb(relative)
        if (stats.isDirectory()) {
          recurse(filepath)
        }
        files.push({ filepath, relative, filename, flag})
      })
    }
    _recurse(dirpath)
    return files
}
/**
 * 清空文件夹中的文件
 * @param {param} dirpath 
 */
rmdirFileSync(dirpath) {
    let files = fs.readdirSync(dirpath)
    files.forEach((file)=>{
        let _chpath= path.join(dirpath, file)
        let stats = fs.statSync(_chpath)
        if(stats.isDirectory()){
            this.rmdirFileSync(_chpath)
        }else{
            fs.unlinkSync(_chpath)
        }        
    })
}
unlinkSync(filepath){
    fs.unlinkSync(filepath)
}
/**
 * 删除文件夹
 * @param {param} dirpath 
 */
rmdirSync(dirpath) {
    fs.rmdirSync(dirpath)
}
}
module.exports = FS
