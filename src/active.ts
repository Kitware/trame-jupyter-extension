import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  IKernelConnection,
  IModel as IModelKernel
} from '@jupyterlab/services/lib/kernel/kernel';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { ISessionConnection } from '@jupyterlab/services/lib/session/session';

export class ActiveManager {
  app: JupyterFrontEnd;
  www: string;
  sessionToKernel: Record<string, IModelKernel>;
  kernels: Record<string, IKernelConnection>;
  sessionConnections: Record<string, ISessionConnection>;

  constructor(app: JupyterFrontEnd) {
    this.app = app;
    this.sessionToKernel = {};
    this.kernels = {};
    this.sessionConnections = {};
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
      if (!this.sessionConnections[session.id]) {
        const sessionConnection = this.app.serviceManager.sessions.connectTo({
          model: session
        });
        this.sessionConnections[session.id] = sessionConnection;

        sessionConnection.kernelChanged.connect(
          (sessionConnection, kernelChange) => {
            if (!kernelChange.newValue) {
              // Not sure what I need to do...
              if (kernelChange.oldValue) {
                console.log(
                  'Need to dispose kernel',
                  kernelChange.oldValue?.id,
                  'on session',
                  sessionConnection.id
                );
                delete this.kernels[kernelChange.oldValue.id];
              }
            } else if (!kernelChange.oldValue) {
              console.log(
                'New kernel',
                kernelChange.newValue.id,
                'on session',
                sessionConnection.id
              );
              if (sessionConnection.kernel) {
                sessionConnection.kernel.requestExecute({
                  silent: true,
                  code: `
                      import os
                      os.environ["TRAME_DISABLE_V3_WARNING"] = "1"
                      os.environ["TRAME_IFRAME_BUILDER"] = "jupyter-extension"
                      os.environ["TRAME_BACKEND"] = "jupyter"
                      os.environ["TRAME_JUPYTER_EXTENSION"] = "${this.www}"
                    `
                });
                this.kernels[sessionConnection.kernel.id] =
                  sessionConnection.kernel;
              }
            } else {
              console.log('kernelChanged ???', sessionConnection, kernelChange);
            }
          }
        );

        if (sessionConnection?.kernel) {
          sessionConnection.kernel.requestExecute({
            silent: true,
            code: `
                  import os
                  os.environ["TRAME_DISABLE_V3_WARNING"] = "1"
                  os.environ["TRAME_IFRAME_BUILDER"] = "jupyter-extension"
                  os.environ["TRAME_BACKEND"] = "jupyter"
                  os.environ["TRAME_JUPYTER_EXTENSION"] = "${this.www}"
                `
          });
          this.kernels[sessionConnection.kernel.id] = sessionConnection.kernel;
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
