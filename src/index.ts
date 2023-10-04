import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ActiveManager } from './active';
import { TrameJupyterComm } from './comm';
import { TrameJupyterWebSocket } from './websocket';

/**
 * Initialization data for the trame-jupyter-extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'trame-jupyter-extension:plugin',
  description: 'A JupyterLab extension for trame communication layer',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    const activeManager = new ActiveManager(app);
    const comms: Record<string, TrameJupyterComm> = {};

    function init(childWindow: any) {
      const kernelId = childWindow.frameElement.dataset.kernelId;
      if (!comms[kernelId]) {
        const kc = activeManager.getKernelConnection(kernelId);
        if (!kc) {
          throw new Error(
            `trame: Could not get kernel connection to ${kernelId}`
          );
        }
        comms[kernelId] = new TrameJupyterComm(kc);

        // Open kernel connection at creation
        comms[kernelId].open();
      }
      if (comms[kernelId]) {
        return {
          createWebSocket: () => {
            return new TrameJupyterWebSocket(childWindow, comms[kernelId]);
          }
        };
      }
    }

    const namespace = {
      app,
      activeManager,
      comms,
      init
    };

    (window as any).trameJupyter = namespace;
  }
};

export default plugin;
