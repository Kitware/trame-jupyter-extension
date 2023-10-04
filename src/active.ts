import { JupyterFrontEnd } from '@jupyterlab/application';
import { SessionContext, ISessionContext } from '@jupyterlab/apputils';
import {
  IKernelConnection,
  IModel as IModelKernel
} from '@jupyterlab/services/lib/kernel/kernel';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

export class ActiveManager {
  app: JupyterFrontEnd;
  www: string;
  sessionToKernel: Record<string, IModelKernel>;
  kernels: Record<string, IKernelConnection>;
  sessionCtx: SessionContext;

  constructor(app: JupyterFrontEnd) {
    this.app = app;
    this.sessionToKernel = {};
    this.kernels = {};
    this.sessionCtx = new SessionContext({
      sessionManager: app.serviceManager.sessions,
      specsManager: app.serviceManager.kernelspecs,
      name: 'TrameHelper',
    });
    this.www = '';
    this.updateExtensionLocation();
  }

  finishInitialization(): void {
    this.updateSessionMapping();
    this.app.serviceManager.sessions.runningChanged.connect(
      this.updateSessionMapping,
      this
    );
  }

  async updateExtensionLocation(): Promise<void> {
    const settings = ServerConnection.makeSettings();
    const requestUrl = URLExt.join(
      settings.baseUrl,
      'trame-jupyter-server',
      'location'
    );
    let response: Response;
    try {
      response = await ServerConnection.makeRequest(requestUrl, {}, settings);
    } catch (error) {
      throw new ServerConnection.NetworkError(error as any);
    }

    const data: any = await response.text();

    if (data.length > 0) {
      try {
        this.www = JSON.parse(data).www;
      } catch (error) {
        console.log('Not a JSON response body.', response);
      }
    }

    if (!response.ok) {
      throw new ServerConnection.ResponseError(response, data.message || data);
    }

    this.finishInitialization();
  }

  updateSessionMapping(): void {
    const runningSessions = this.app.serviceManager.sessions.running();
    let session = null;
    while ((session = runningSessions.next())) {
      if (session?.kernel) {
        this.sessionToKernel[session.name] = session.kernel;
        const kernelId = session.kernel.id;

        // Create a connection by default and set ENV on kernel
        if (!this.kernels[kernelId]) {
          // const kernelConnection = this.app.serviceManager.kernels.connectTo({
          //   model: session.kernel,
          //   handleComms: true
          // });
          // this.kernels[kernelId] = kernelConnection;
          // kernelConnection.requestExecute({
          //   silent: true,
          //   code: `
          //     import os
          //     os.environ["TRAME_DISABLE_V3_WARNING"] = "1"
          //     os.environ["TRAME_IFRAME_BUILDER"] = "jupyter-extension"
          //     os.environ["TRAME_BACKEND"] = "jupyter"
          //     os.environ["TRAME_JUPYTER_EXTENSION"] = "${this.www}"
          //   `
          // });
        }
      }
    }
  }

  getActiveKernel(): IModelKernel | null {
    const pathTokens = window.location.pathname.split('/');
    const activeName = pathTokens[pathTokens.length - 1];
    if (activeName) {
      return this.sessionToKernel[activeName];
    }
    return null;
  }

  getKernelConnection(kernelId: string): IKernelConnection | null {
    return this.kernels[kernelId];
  }

  dispose(): void {
    this.app.serviceManager.sessions.runningChanged.disconnect(
      this.updateSessionMapping,
      this
    );
  }
}
