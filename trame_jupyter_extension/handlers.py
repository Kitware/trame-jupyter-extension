import os
import tempfile
from pathlib import Path

from jupyter_server.base.handlers import APIHandler
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

def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    static = url_path_join(base_url, "trame-jupyter-server", "(.*)")
    handlers = [
        (static, tornado.web.StaticFileHandler, dict(path=TRAME_STATIC_WWW)),
    ]
    web_app.add_handlers(host_pattern, handlers)
