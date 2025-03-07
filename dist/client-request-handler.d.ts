import * as Stream from 'stream';
import ModbusAbstractRequest from './abstract-request.js';
import ModbusAbstractResponse from './abstract-response.js';
import { ModbusRequestBody } from './request';
import { CastRequestBody } from './request-response-map.js';
import { UserRequestError } from './user-request-error';
import UserRequest, { PromiseUserRequest } from './user-request.js';
export default abstract class MBClientRequestHandler<S extends Stream.Duplex, Req extends ModbusAbstractRequest> {
    readonly state: "offline" | "online";
    readonly requestCount: number;
    protected _socket: S;
    protected _timeout: number;
    protected abstract _requests: UserRequest[];
    protected abstract _currentRequest: UserRequest | null | undefined;
    protected _state: 'offline' | 'online';
    constructor(socket: S, timeout: number);
    abstract register<R extends Req, B extends ModbusRequestBody>(requestBody: B): PromiseUserRequest<CastRequestBody<R, B>>;
    registerRequest<R extends Req>(request: R): PromiseUserRequest<R>;
    handle(response: ModbusAbstractResponse): void;
    manuallyRejectCurrentRequest(): void;
    manuallyRejectRequests(numRequests: number): void;
    manuallylRejectAllRequests(): void;
    customErrorRequest(err: UserRequestError<any>): void;
    protected _clearCurrentRequest(): void;
    protected _clearAllRequests(): void;
    protected _onConnect(): void;
    protected _onClose(): void;
    protected _flush(): void;
}
//# sourceMappingURL=client-request-handler.d.ts.map