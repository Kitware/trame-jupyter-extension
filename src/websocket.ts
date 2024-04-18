import { ConcreteEmitter } from './emitter';
import { TrameJupyterComm, type CommMessage } from './comm';

type WebsocketMessage<T> = { data: T };

function toBuffer(msgpack: any) {
  if (msgpack.buffer) {
    if (msgpack.buffer.byteLength !== msgpack.length) {
      console.warn('toBuffer: deep copy');
      const tmp = new Uint8Array(msgpack.length);
      tmp.set(msgpack);
      return tmp.buffer;
    }
    return msgpack.buffer;
  }
  return msgpack;
}

export type WebSocketEvents = {
  open: any;
  message: WebsocketMessage<any>;
  error: any;
  close: any;
};

export function createUniqueIdFn() {
  let __id = 0;
  return function () {
    const id = __id;
    __id += 1;
    return id.toString();
  };
}

const uniqueId = createUniqueIdFn();

export class TrameJupyterWebSocket extends ConcreteEmitter<WebSocketEvents> {
  private window: any;
  private comm: TrameJupyterComm;
  private clientId: string;
  private serverName: string;
  private commMessageListener: (msg: CommMessage) => void;
  private commCloseListener: () => void;
  public readyState: number;

  constructor(w: Window, comm: TrameJupyterComm) {
    super();

    this.serverName = 'trame';
    this.clientId = uniqueId();
    this.readyState = 0;

    // Update server name if available in URL
    const searchParams = new URLSearchParams(w.location.search);
    if (searchParams.has('server')) {
      this.serverName = searchParams.get('server') || 'trame';
    }

    // Setup comm
    this.window = w;
    this.comm = comm;
    this.commMessageListener = (msg: CommMessage) => {
      const { data, buffers } = msg;
      const { server, client, payload } = data;

      if (client !== this.clientId || server !== this.serverName) {
        return;
      }

      if (buffers && buffers.length > 0) {
        const blob = new Blob(buffers);

        // Make it a blob for wslink
        blob.constructor = this.window.Blob;
        (blob as any).__proto__ = this.window.Blob.prototype;

        this.emit('message', { data: blob });
      } else {
        this.emit('message', { data: payload });
      }
    };

    this.commCloseListener = () => this.close();

    // Don't open the fake websocket if the comm is unusable
    if (!comm.isUseable()) {
      console.error(
        "Can't create a TrameJupyterWebSocket using a closed kernel connection"
      );
      this.readyState = 3;

      return;
    }

    this.comm.addEventListener('message', this.commMessageListener);
    this.comm.addEventListener('close', this.commCloseListener);
    this.window.addEventListener('unload', this.commCloseListener); // close on exit

    // Let the ws know that we are ready
    setTimeout(() => {
      this.readyState = 1;
      this.emit('open', { data: '' });
    }, 0);
  }

  close() {
    this.comm.removeEventListener('message', this.commMessageListener);
    this.comm.removeEventListener('close', this.commCloseListener);
    this.readyState = 3;
    // notify the kernel that the client is disconnected
    console.log('trame::jupyter-comm::close', 'FIXME');

    // notify the client that the connection is closed
    this.emit('close', { data: '' });
  }

  send(data: string | ArrayBufferLike | ArrayBufferView) {
    const isBinary = typeof data !== 'string';

    const message: CommMessage = {
      data: {
        server: this.serverName,
        client: this.clientId
      },
      buffers: []
    };

    if (isBinary) {
      message.buffers = [toBuffer(data)];
    } else {
      message.data.payload = data;
    }

    this.comm.send(message);
  }

  set onopen(callback: (data: any) => void) {
    this.removeListeners('open');
    this.addEventListener('open', callback);
  }

  set onmessage(callback: (data: WebsocketMessage<any>) => void) {
    this.removeListeners('message');
    this.addEventListener('message', callback);
  }

  set onclose(callback: (data: any) => void) {
    this.removeListeners('close');
    this.addEventListener('close', callback);
  }

  set onerror(callback: (data: any) => void) {
    this.removeListeners('error');
    this.addEventListener('error', callback);
  }
}
