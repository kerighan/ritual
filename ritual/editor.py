def load_package(packages):
    from .box import Function, Condition, Variable
    import inspect
    import importlib

    objs = []
    if packages:
        allowed_boxes = (
            Function.__class__,
            Condition.__class__,
            Variable.__class__)

        for package in packages:
            pkg = importlib.import_module(package)
            for name, obj in inspect.getmembers(pkg):
                if inspect.isclass(obj):
                    if obj.__module__ == package and isinstance(
                            obj, allowed_boxes):
                        objs.append(obj)
    return objs


def list_saved_files():
    from glob import glob
    filenames = glob("graphs/*.json")
    filenames = sorted(
        [item.split("/")[-1].split(".")[0] for item in filenames],
        reverse=True)
    return filenames

def start_server(args):
    from flask import Flask, send_from_directory, request, jsonify
    from . import Rite
    from datetime import datetime
    import logging
    import time
    import json
    import os

    # log = logging.getLogger('werkzeug')
    # log.setLevel(logging.ERROR)

    rite = Rite("project")
    rite += load_package(args.packages)

    # add imported boxes
    boxes = rite.to_json()

    # Start micro server
    app = Flask(__name__)

    @app.route("/")
    def index():
        return app.send_static_file("index.html")
    
    @app.route("/list", methods=["GET"])
    def list_saves():
        filenames = list_saved_files()
        return jsonify(filenames)

    @app.route("/load", methods=["GET"])
    def load():
        args = dict(request.args)
        if "id" not in args:
            return "ìd` parameter needed", 400

        file_id = args["id"]
        filename = os.path.join("graphs", file_id + ".json")
        with open(filename, "r") as f:
            data = json.load(f)
        return jsonify(data)

    @app.route("/save", methods=["POST"])
    def save():
        assert "nodes" in request.json
        assert "edges" in request.json

        nodes = request.json["nodes"]
        edges = request.json["edges"]

        if not os.path.exists("graphs"):
            os.makedirs("graphs")
        
        filename = datetime.now().strftime("%Y%m%d_%H%M%S") + ".json"
        filename = os.path.join("graphs/", filename)
        with open(filename, "w") as f:
            json.dump({
                "nodes": nodes,
                "edges": edges,
                "packages": args.packages
            }, f)
        
        print("File successfully saved")
        print("-----------------------")
        return "OK", 200

    @app.route("/run", methods=["POST"])
    def run():
        start_time = time.time()

        assert "nodes" in request.json
        assert "edges" in request.json

        nodes = request.json["nodes"]
        edges = request.json["edges"]

        ritual = rite.promote(nodes, edges)
        res = ritual.run()

        # show timing
        delta = time.time() - start_time
        print(f"Graph executed in {delta:.2f}s")
        print("-----------------------")

        return "OK", 200

    @app.route("/js/boxes.js")
    def send_box():
        return boxes


    @app.route("/js/<path:path>")
    def send_js(path):
        return send_from_directory("static/js", path)


    @app.route("/css/<path:path>")
    def send_css(path):
        return send_from_directory("static/css", path)


    # store variables
    if args.f is None:
        folder = "."
    else:
        folder = args.f

    return app
