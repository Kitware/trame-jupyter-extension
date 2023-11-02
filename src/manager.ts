import { IDisposable } from '@lumino/disposable';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { Kernel } from '@jupyterlab/services';

import { ISessionContext } from '@jupyterlab/apputils';

import { IChangedArgs } from '@jupyterlab/coreutils';

import { Registry } from './registry';

export class ContextManager implements IDisposable {
  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel> | null;
  private _kernel: Kernel.IKernelConnection | null;
  private _kernelsRegistry: Registry<Kernel.IKernelConnection>;
  private _endpoint: string;
  private _www: string;

  constructor(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>,
    endpoint: string,
    www: string
  ) {
    this._context = context;
    this._endpoint = endpoint;
    this._www = www;

    this._kernel = null;

    this._kernelsRegistry = (window as any).trameJupyter.kernelsRegistry;

    context.sessionContext.kernelChanged.connect(this.onKernelChanged, this);

    // For debugging if needed
    // context.sessionContext.sessionChanged.connect(this.onSessionChanged, this);
    // context.sessionContext.statusChanged.connect(this.onStatusChanged, this);
    // context.sessionContext.connectionStatusChanged.connect(this.onConnectionStatusChanged, this);
  }

  get context(): any {
    return this._context;
  }

  private onKernelChanged(
    session: ISessionContext,
    args: IChangedArgs<
      Kernel.IKernelConnection | null,
      Kernel.IKernelConnection | null,
      'kernel'
    >
  ) {
    if (this._kernel !== null && this._kernel.id) {
      this._kernelsRegistry.setItem(this._kernel.id, null);
    }

    this._kernel = args.newValue;

    if (this._kernel !== null && this._kernel.id) {
      this._kernelsRegistry.setItem(this._kernel.id, this._kernel);

      this._kernel.requestExecute({
        silent: true,
        code: this.getKernelCode()
      });
    }
  }

  get isDisposed(): boolean {
    return this._context === null;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    if (this._context) {
      this._context.sessionContext.kernelChanged.disconnect(
        this.onKernelChanged,
        this
      );
      // For debugging if needed
      // this._context.sessionContext.sessionChanged.disconnect(this.onSessionChanged, this);
      // this._context.sessionContext.statusChanged.disconnect(this.onStatusChanged, this);
      // this._context.sessionContext.connectionStatusChanged.disconnect(this.onConnectionStatusChanged, this);
    }

    this._kernel = null;
    this._context = null;
  }

  private getKernelCode(): string {
    return `
      import os
      os.environ["TRAME_DISABLE_V3_WARNING"] = "1"
      os.environ["TRAME_IFRAME_BUILDER"] = "jupyter-extension"
      os.environ["TRAME_BACKEND"] = "jupyter"
      os.environ["TRAME_JUPYTER_WWW"] = "${this._www}"
      os.environ["TRAME_JUPYTER_ENDPOINT"] = "${this._endpoint}"
    `;
  }

  // For debugging if needed
  // private onConnectionStatusChanged(session: ISessionContext, status: Kernel.ConnectionStatus) {}
  // private onSessionChanged(session: ISessionContext, args: IChangedArgs<Session.ISessionConnection | null, Session.ISessionConnection | null, "session">) {}
  // private onStatusChanged(session: ISessionContext, status: Kernel.Status) {}
}
