import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

async function getExtensionLocation(): Promise<{
  endpoint: string;
  www: string;
}> {
  let www = '';
  let endpoint = '';

  const settings = ServerConnection.makeSettings();
  endpoint = URLExt.join(settings.baseUrl, 'trame-jupyter-server');
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
      www = JSON.parse(data).www;
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return { endpoint, www };
}

export { getExtensionLocation };
