'use strict';
/**
 * 验证
 */

const CONSTANTS = require('../constants');

class RequestValidator {

    //PATCH requests header 必须包含 Upload-Offset
    static _invalidUploadOffsetHeader(value) {
        return isNaN(value) || parseInt(value, 10) < 0;
    }

    static _invalidUploadLengthHeader(value) {
        return isNaN(value) || parseInt(value, 10) < 0;
    }

    // Upload-Defer-Length==1
    static _invalidUploadDeferLengthHeader(value) {
        return isNaN(value) || parseInt(value, 10) !== 1;
    }

    // The Upload-Metadata request and response header MUST consist of one
    static _invalidUploadMetadataHeader(value) {
        const keypairs = value.split(',')
            .map((keypair) => keypair.trim().split(' '));

        return keypairs.some(
            (keypair) => keypair[0] === '' || (keypair.length !== 2 && keypair.length !== 1)
        );
    }

    static _invalidXRequestedWithHeader() {
        return false;
    }

    static _invalidTusExtensionHeader(value) {
        return false;
    }

    static _invalidTusMaxSizeHeader() {
        return false;
    }

    static _invalidXHttpMethodOverrideHeader() {
        return false;
    }

    //PATCH requests  必须设置Content-Type: application/offset+octet-stream
    static _invalidContentTypeHeader(value) {
        return value !== 'application/offset+octet-stream';
    }

    static _invalidAuthorizationHeader() {
        return false;
    }

    static capitalizeHeader(header_name) {
        return header_name.replace(/\b[a-z]/g, function() {
            return arguments[0].toUpperCase();
        }).replace(/-/g, '');
    }

    static isInvalidHeader(header_name, header_value) {
        if (CONSTANTS.HEADERS_LOWERCASE.indexOf(header_name) === -1) {
            return false;
        }

        const method = `_invalid${this.capitalizeHeader(header_name)}Header`;
        return this[method](header_value);
    }
}

module.exports = RequestValidator;
