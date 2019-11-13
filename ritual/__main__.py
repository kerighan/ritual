from .editor import start_server, list_saved_files
import argparse
import sys
import os


def main():
    # Parse arguments
    parser = argparse.ArgumentParser()
    parser.add_argument("--editor",
                        help="starts Anubis editor",
                        action="store_true")
    parser.add_argument("-f", help="which folder to start")
    parser.add_argument("-p",
                        const=5000,
                        nargs="?",
                        help="on which port to start the webserver")
    parser.add_argument("--packages",
                        nargs='+',
                        help="libraries of boxes")
    args = parser.parse_args()

    # instantiate Anubis
    if args.editor:
        app = start_server(args)
        app.run(host="0.0.0.0", debug=True, port=args.p)
    else:
        from . import load_graph

        if args.f:
            filename = args.f
        else:
            filenames = list_saved_files()
            filename = "graphs/" + filenames[0] + ".json"
        print(f"Running graph: {filename}")

        ritual = load_graph(filename)
        ritual.run()
