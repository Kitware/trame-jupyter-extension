import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  IKernelConnection,
  IModel as IModelKernel
} from '@jupyterlab/services/lib/kernel/kernel';

export class ActiveManager {
  app: JupyterFrontEnd;
  sessionToKernel: Record<string, IModelKernel>;
  kernels: Record<string, IKernelConnection>;

  constructor(app: JupyterFrontEnd) {
    this.app = app;
    this.sessionToKernel = {};
    this.kernels = {};
    this.updateSessionMapping();

    this.app.serviceManager.sessions.runningChanged.connect(
      this.updateSessionMapping,
      this
    );
  }

  updateSessionMapping() {
    const runningSessions = this.app.serviceManager.sessions.running();
    let entry = null;
    do {
      entry = runningSessions.next();
      const session = entry.value;
      if (session?.kernel) {
        this.sessionToKernel[session.name] = session.kernel;
        const kernelId = session.kernel.id;

        // Create a connection by default and set ENV on kernel
        if (!this.kernels[kernelId]) {
          const kernelConnection = this.app.serviceManager.kernels.connectTo({
            model: session.kernel,
            handleComms: true
          });
          this.kernels[kernelId] = kernelConnection;

          kernelConnection.requestExecute({
            silent: true,
            code: `
              import os
              os.environ["TRAME_DISABLE_V3_WARNING"] = "1"
              os.environ["TRAME_IFRAME_BUILDER"] = "jupyter-extension"
              os.environ["TRAME_BACKEND"] = "jupyter"
            `
          });
        }
      }
    } while (!entry.done);
  }

  getActiveKernel(): IModelKernel | null {
    const activeName = window.location.pathname.split('/').at(-1);
    if (activeName) {
      return this.sessionToKernel[activeName];
    }
    return null;
  }

  getKernelConnection(kernelId: string): IKernelConnection | null {
    return this.kernels[kernelId];
  }

  dispose() {
    this.app.serviceManager.sessions.runningChanged.disconnect(
      this.updateSessionMapping,
      this
    );
  }
}
