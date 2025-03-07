"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const OUT_OF_SYNC = 'OutOfSync';
const OFFLINE = 'Offline';
const MODBUS_EXCEPTION = 'ModbusException';
const MANUALLY_CLEARED = 'ManuallyCleared';
const Debug = require("debug");
const debug = Debug('client-request-handler');
const exception_js_1 = __importDefault(require("./response/exception.js"));
const user_request_error_1 = require("./user-request-error");
const user_request_js_1 = __importDefault(require("./user-request.js"));
class MBClientRequestHandler {
    constructor(socket, timeout) {
        if (new.target === MBClientRequestHandler) {
            throw new TypeError('Cannot instantiate ModbusClientRequestHandler directly.');
        }
        this._socket = socket;
        this._timeout = timeout;
        this._state = 'offline';
    }
    get state() {
        return this._state;
    }
    get requestCount() {
        return this._requests.length;
    }
    registerRequest(request) {
        const userRequest = new user_request_js_1.default(request, this._timeout);
        this._requests.push(userRequest);
        this._flush();
        return userRequest.promise;
    }
    handle(response) {
        debug('incoming response');
        if (!response) {
            debug('well, sorry I was wrong, no response at all');
            return;
        }
        const userRequest = this._currentRequest;
        if (!userRequest) {
            debug('no current request, no idea where this came from');
            return;
        }
        const request = userRequest.request;
        if (response.body.isException === false && response.body.fc !== request.body.fc) {
            debug('something is weird, request fc and response fc do not match.');
            userRequest.reject(new user_request_error_1.UserRequestError({
                err: OUT_OF_SYNC,
                message: 'request fc and response fc does not match.'
            }));
            this._clearAllRequests();
            return;
        }
        if (response.body instanceof exception_js_1.default) {
            debug('response is a exception');
            userRequest.reject(new user_request_error_1.UserRequestError({
                err: MODBUS_EXCEPTION,
                message: `A Modbus Exception Occurred - See Response Body`,
                response
            }));
            this._clearCurrentRequest();
            this._flush();
            return;
        }
        debug('resolving request');
        userRequest.resolve(response);
        this._clearCurrentRequest();
        this._flush();
    }
    manuallyRejectCurrentRequest() {
        if (this._currentRequest) {
            this._currentRequest.reject(new user_request_error_1.UserRequestError({
                err: MANUALLY_CLEARED,
                message: 'the request was manually cleared'
            }));
            this._flush();
        }
    }
    manuallyRejectRequests(numRequests) {
        for (let i = 0; i < numRequests; i++) {
            this.manuallyRejectCurrentRequest();
        }
    }
    manuallylRejectAllRequests() {
        this.manuallyRejectRequests(this.requestCount);
    }
    customErrorRequest(err) {
        if (this._currentRequest) {
            this._currentRequest.reject(err);
        }
    }
    _clearCurrentRequest() {
        if (!this._currentRequest) {
            return;
        }
        this._currentRequest.done();
        this._currentRequest = null;
    }
    _clearAllRequests() {
        this._clearCurrentRequest();
        while (this._requests.length > 0) {
            const req = this._requests.shift();
            if (req) {
                req.reject(new user_request_error_1.UserRequestError({
                    err: OUT_OF_SYNC,
                    message: 'rejecting because of earlier OutOfSync error'
                }));
            }
        }
    }
    _onConnect() {
        this._state = 'online';
    }
    _onClose() {
        this._state = 'offline';
        this._currentRequest && this._currentRequest.reject(new user_request_error_1.UserRequestError({
            err: OFFLINE,
            message: 'connection to modbus server closed'
        }));
        this._clearAllRequests();
    }
    _flush() {
        debug('flushing');
        if (this._currentRequest !== null) {
            debug('executing another request, come back later');
            return;
        }
        if (this._requests.length === 0) {
            debug('no request to be executed');
            return;
        }
        this._currentRequest = this._requests.shift();
        if (this._state === 'offline') {
            debug('rejecting request immediatly, client offline');
            this._currentRequest && this._currentRequest.reject(new user_request_error_1.UserRequestError({
                err: OFFLINE,
                message: 'no connection to modbus server'
            }));
            this._clearCurrentRequest();
            setTimeout(this._flush.bind(this), 0);
            return;
        }
        const payload = this._currentRequest && this._currentRequest.createPayload();
        debug('flushing new request', payload);
        this._currentRequest && this._currentRequest.start(() => {
            this._clearCurrentRequest();
            this._flush();
        });
        this._socket.write(payload, (err) => {
            debug('request fully flushed, ( error:', err, ')');
        });
    }
}
exports.default = MBClientRequestHandler;
