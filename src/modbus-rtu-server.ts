
import ModbusServerClient from './modbus-server-client.js'
import ModbusServer, { IModbusServerOptions } from './modbus-server.js'
import ModbusRTURequest from './rtu-request.js'
import ModbusRTUResponse from './rtu-response.js'

import { SerialPort } from 'serialport';

export default class ModbusRTUServer extends ModbusServer {
  public _socket: any
  public emit: any

  constructor (socket: SerialPort, options?: Partial<IModbusServerOptions>) {
    super(options)
    this._socket = socket

    const fromBuffer = ModbusRTURequest.fromBuffer
    const fromRequest = ModbusRTUResponse.fromRequest as any
    const client = new ModbusServerClient(this, socket, fromBuffer, fromRequest)
    this.emit('connection', client)
  }
}
