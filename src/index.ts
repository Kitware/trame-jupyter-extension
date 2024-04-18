import { IDisposable } from '@lumino/disposable';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';
import { Kernel } from '@jupyterlab/services';

import { TrameJupyterComm } from './comm';
import { TrameJupyterWebSocket } from './websocket';
import { ContextManager } from './manager';
import { Registry } from './registry';
import { getExtensionLocation } from './location';
import { updateOutputs } from './utils';

/**
 * A notebook widget extension that creates a kernel manager each time a notebook is opened.
 */
export class WidgetExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  private _endpoint: string;
  private _www: string;

  constructor(endpoint: string, www: string) {
    this._endpoint = endpoint;
    this._www = www;
  }

  createNew(
    _panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const manager = new ContextManager(context, this._endpoint, this._www);
    return manager;
  }
}

/**
 * Initialization data for the trame-jupyter-extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'trame-jupyter-extension:plugin',
  description: 'A JupyterLab extension for trame communication layer',
  autoStart: true,
  activate: async (app: JupyterFrontEnd) => {
    const kernelsRegistry = new Registry<Kernel.IKernelConnection>();
    const commsRegistry = new Registry<TrameJupyterComm>();

    function init(childWindow: any) {
      const kernelId = childWindow.frameElement.dataset.kernelId;
      const kc = kernelsRegistry.getItem(kernelId);
      let comm = commsRegistry.getItem(kernelId);

      if (!kc) {
        throw new Error(
          `trame: Could not get kernel connection to ${kernelId}`
        );
      }

      if (!comm || !comm.isUseable()) {
        comm = new TrameJupyterComm(kc);
        comm.open();
        commsRegistry.setItem(kernelId, comm);
        comm.addEventListener('close', () => {
          commsRegistry.setItem(kernelId, null);
        });
      }

      // Enable fullscreen output if any
      updateOutputs();

      return {
        createWebSocket: () => {
          return new TrameJupyterWebSocket(childWindow, comm!);
        }
      };
    }

    const namespace = {
      app,
      kernelsRegistry,
      commsRegistry,
      init,
      updateOutputs
    };

    (window as any).trameJupyter = namespace;

    const { endpoint, www } = await getExtensionLocation();

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new WidgetExtension(endpoint, www)
    );
  }
};

export default plugin;
