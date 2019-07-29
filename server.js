"use strict";

const Server = require("./lib/Server");
const FileStore = require("./lib/stores/FileStore");
const COSStore = require("./lib/stores/COSStore");
const server = new Server();

const data_store = process.env.DATA_STORE || "COSStore";
const path='/files'

function namingFunction(req){
    const re = new RegExp(`${req.baseUrl || ''}${path}\\/(\\S+)\\/?`); 
    const match = (req.originalUrl || req.url).match(re);
    if (!match) {
        return false;
    }
    const file_id = match[1];
    return file_id;
}

switch (data_store) {
  case "COSStore":
    server.datastore = new COSStore({
      path:path,
      namingFunction:namingFunction,
    });
    break;

  default:
    server.datastore = new FileStore({
      path:path,
      //domain:"",
      namingFunction:namingFunction,
    });
}

const host = "0.0.0.0";
const port = 5001;
server.listen({ host, port }, () => {
    console.log(`[${new Date().toLocaleTimeString()}] server listening at http://${host}:${port} using ${data_store}`);
});
