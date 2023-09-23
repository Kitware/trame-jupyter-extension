import {
  IKernelConnection,
  IComm
} from '@jupyterlab/services/lib/kernel/kernel';
import {
  ICommMsgMsg,
  ICommCloseMsg
} from '@jupyterlab/services/lib/kernel/messages';

import { ConcreteEmitter } from './emitter';

export type CommMessage = {
  data: any;
  buffers?: (ArrayBuffer | ArrayBufferView)[];
};

export type CommEvents = {
  message: CommMessage;
};

export class TrameJupyterComm extends ConcreteEmitter<CommEvents> {
  private kernel: IKernelConnection;
  private comm: IComm | null;

  constructor(kernel: IKernelConnection) {
    super();

    this.kernel = kernel;
    this.comm = null;
  }

  open() {
    if (!this.comm || this.comm.isDisposed) {
      this.comm = this.kernel.createComm('wslink_comm');
      this.comm.open();
      this.comm.onMsg = this.onMessage.bind(this);
      this.comm.onClose = this.onClose.bind(this);
    }
  }

  send(message: CommMessage) {
    if (this.comm) {
      this.comm.send(message.data, undefined, message.buffers);
    } else {
      console.error('trame::jupyter-comm::send -- NO COMM');
    }
  }

  onMessage(msg: ICommMsgMsg<'iopub' | 'shell'>) {
    this.emit('message', { data: msg.content.data, buffers: msg.buffers });
  }

  onClose(msg: ICommCloseMsg<'iopub' | 'shell'>) {
    console.error('trame::jupyter-comm::close -- NO COMM');
  }
}
