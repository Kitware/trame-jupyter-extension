import os

try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings

    warnings.warn("Importing 'trame_jupyter_extension' outside a proper installation.")
    __version__ = "dev"
from .handlers import setup_handlers


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "trame-jupyter-extension"}]


def _jupyter_server_extension_points():
    return [{"module": "trame_jupyter_extension"}]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """

    if "TRAME_INJECT_HEADER" in os.environ:
        if "headers" not in server_app.web_app.settings:
            server_app.web_app.settings["headers"] = {}
        server_app.web_app.settings["headers"].update(
            {
                # Allow access to `SharedArrayBuffer`.
                "Cross-Origin-Opener-Policy": "same-origin",
                "Cross-Origin-Embedder-Policy": "require-corp",
            }
        )

    setup_handlers(server_app.web_app)
    name = "trame-jupyter-extension"
    server_app.log.info(f"Registered {name} server extension")
