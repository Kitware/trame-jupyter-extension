import { ConcreteEmitter } from './emitter';
import { TrameJupyterComm, type CommMessage } from './comm';

type WebsocketMessage<T> = { data: T };

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

function isArrayBufferView(
  array: ArrayBuffer | ArrayBufferView
): array is ArrayBufferView {
  return !!(array as any)?.buffer;
}

export class TrameJupyterWebSocket extends ConcreteEmitter<WebSocketEvents> {
  private window: any;
  private comm: any;
  private clientId: string;
  private serverName: string;
  private commListener: (msg: CommMessage) => void;
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
    this.commListener = (msg: CommMessage) => {
      const { data, buffers } = msg;
      const { server, client, payload } = data;

      if (client !== this.clientId || server !== this.serverName) {
        return;
      }

      if (buffers && buffers.length > 0) {
        const buffer: ArrayBuffer = isArrayBufferView(buffers[0])
          ? buffers[0].buffer
          : buffers[0];

        // Buffer is ArrayBuffer, but it doesn't pass instanceof ArrayBuffer test in session.js (??!)
        // make it!
        (buffer as any).constructor = this.window.ArrayBuffer;
        (buffer as any).__proto__ = this.window.ArrayBuffer.prototype;

        this.emit('message', { data: buffer });
      } else {
        this.emit('message', { data: payload });
      }
    };
    this.comm.addEventListener('message', this.commListener);
    this.window.addEventListener('unload', () => this.close()); // close on exit

    // Let the ws know that we are ready
    setTimeout(() => {
      this.readyState = 1;
      this.emit('open', { data: '' });
    }, 0);
  }

  close() {
    this.comm.removeEventListener('message', this.commListener);
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
      message.buffers = [data];
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
