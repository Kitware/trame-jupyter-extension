import os
import tempfile
from pathlib import Path

from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.utils import url_path_join
import tornado

from trame.tools.www import StaticContentGenerator

# Static directory to serve
TRAME_STATIC_WWW = tempfile.mkdtemp()


# Generate trame static content
def write_static_www(*modules):
    for client_type in ["vue2", "vue3"]:
        generator = StaticContentGenerator()
        generator.client_type = client_type
        generator.enable_all()
        if len(modules) and modules[0]:
            generator.enable_modules(*modules)
        generator.write(Path(TRAME_STATIC_WWW) / client_type)


# Generate static content
write_static_www(*os.environ.get("TRAME_MODULES", "").split(","))


#
class WorkingDirectoryProvider(JupyterHandler):
    @tornado.web.authenticated
    def get(self):
        self.finish(f'{{ "www": "{TRAME_STATIC_WWW}" }}')


class TrameStaticHandler(tornado.web.StaticFileHandler):
    def set_default_headers(self):
        self.set_header("Cross-Origin-Opener-Policy", "same-origin")
        self.set_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Cache-Control", "no-store")


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    api = url_path_join(base_url, "trame-jupyter-server", "location")
    static = url_path_join(base_url, "trame-jupyter-server", "(.*)")
    handlers = [
        (api, WorkingDirectoryProvider),
        (
            static,
            TrameStaticHandler,
            dict(path=TRAME_STATIC_WWW, default_filename="index.html"),
        ),
    ]
    web_app.add_handlers(host_pattern, handlers)
