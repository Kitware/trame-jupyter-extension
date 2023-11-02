import {
  IKernelConnection,
  IComm
} from '@jupyterlab/services/lib/kernel/kernel';
import { ICommMsgMsg } from '@jupyterlab/services/lib/kernel/messages';

import { ConcreteEmitter } from './emitter';

export type CommMessage = {
  data: any;
  buffers?: (ArrayBuffer | ArrayBufferView)[];
};

export type CommEvents = {
  message: CommMessage;
  open: void;
  close: void;
};

export class TrameJupyterComm extends ConcreteEmitter<CommEvents> {
  private kernel: IKernelConnection;
  private comm: IComm | null;

  constructor(kernel: IKernelConnection) {
    super();

    this.kernel = kernel;
    this.comm = null;

    this.kernel.disposed.connect(this.onClose.bind(this));
    this.kernel.statusChanged.connect((_kernel, status) => {
      if (
        status === 'restarting' ||
        status === 'autorestarting' ||
        status === 'terminating' ||
        status === 'dead'
      ) {
        this.onClose();
      }
    });
  }

  open() {
    if (this.kernel.isDisposed) {
      throw new Error(
        `Can't open a comm for disposed kernel ${this.kernel.id}`
      );
    }

    if ((!this.comm || this.comm.isDisposed) && !this.kernel.isDisposed) {
      this.comm = this.kernel.createComm('wslink_comm');
      this.comm.open();
      this.comm.onMsg = this.onMessage.bind(this);
      this.comm.onClose = this.onClose.bind(this);
    }
  }

  send(message: CommMessage) {
    if (this.isUseable()) {
      this.comm!.send(message.data, undefined, message.buffers);
    } else {
      console.error('trame::jupyter-comm::send -- NO COMM');
    }
  }

  onMessage(msg: ICommMsgMsg<'iopub' | 'shell'>) {
    this.emit('message', { data: msg.content.data, buffers: msg.buffers });
  }

  onClose(...args: any) {
    console.error('trame::jupyter-comm::close -- NO COMM');
    this.comm = null;
    this.emit('close', undefined);
  }

  isUseable() {
    return !this.kernel.isDisposed && this.comm && !this.comm.isDisposed;
  }
}
