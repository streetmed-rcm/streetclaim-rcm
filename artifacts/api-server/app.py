import os
from flask import Flask
from flask_cors import CORS

from routes.encounters import encounters_bp
from routes.hpe import hpe_bp
from routes.health import health_bp
from routes.teams import teams_bp
from db import init_db


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    CORS(app)

    init_db()

    app.register_blueprint(health_bp)
    app.register_blueprint(encounters_bp, url_prefix="/api/encounters")
    app.register_blueprint(hpe_bp, url_prefix="/api/hpe")
    app.register_blueprint(teams_bp, url_prefix="/api/teams")

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
