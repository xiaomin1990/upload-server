'use strict';

const crypto = require('crypto');

class Uid {
    static rand() {
        return crypto.randomBytes(16).toString('hex');
    }
}
module.exports = Uid;
