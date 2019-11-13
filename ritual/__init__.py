import networkx as nx


__version__ = "0.0.1"


class Rite:
    from .box import standard

    boxes = standard

    def __init__(self, name):
        assert isinstance(name, str)
        self.name = name

    def add_box(self, box):
        assert box.gist in ["Box", "Type", "Function", "Cast"]
        self.boxes.append(box)

    def __iadd__(self, boxes):
        if isinstance(boxes, list):
            for box in boxes:
                self.add_box(box)
        else:
            self.add_box(boxes)
        return self

    def to_json(self, filename=None):
        import json

        data = []
        for item in self.boxes:
            data.append(item().to_json())
        if filename is None:
            js = json.dumps(data)
            js = f"var boxes = {js};"
            return js
        else:
            with open(filename, "w") as f:
                js = json.dumps(data)
                js = f"var boxes = {js};"
                f.write(js)
    
    def build_name2box(self):
        self.name2box = {}
        for box in self.boxes:
            self.name2box[box.__name__] = box

    def __getitem__(self, key):
        return self.name2box[key]
    
    def promote(self, n, e):
        from .link import Link
        from copy import deepcopy

        self.build_name2box()
        ritual = Ritual()

        nodes = []
        for i in range(len(n)):
            name = n[i]["name"]
            primitive = n[i]["primitive"]
            node = deepcopy(self[primitive])(name)
            if "value" in n[i]:
                node.value = n[i]["value"]
            if "parameters" in n[i]:
                node.parameters = [j["value"] for j in n[i]["parameters"]]
            nodes.append(node)

        edges = []
        for edge in e:
            edges.append(Link(
                nodes[edge["outputNode"]]._from(edge["outputPin"]),
                nodes[edge["inputNode"]]._to(edge["inputPin"])
            ))
        ritual.create_graph(edges)
        return ritual


class Ritual():
    sorted_nodes = None
    verbose = True
    id2name = {}
    name2node = {}

    def create_graph(self, edges):
        if self.verbose:
            print("Creating graph...")

        di_edges = []
        for edge in edges:
            di_edges.append((edge.in_, edge.out_))

        self.G = nx.DiGraph()
        self.G.add_edges_from(di_edges)
        self.build_name2node()

        for node in self.G.nodes:
            self.id2name[node.get_id()] = node.name

        self.topsort()

    def build_name2node(self):
        self.name2node = {}
        for node in self.G.nodes:
            self.name2node[node.name] = node

    def feed(self, **kwargs):
        for key, value in kwargs.items():
            self.name2node[key].value = value

    def topsort(self):
        if self.verbose:
            print("Sorting nodes...")

        self.sorted_nodes = list(nx.topological_sort(self.G))
    
    def run(self, translate=True):
        assert self.sorted_nodes is not None

        if self.verbose:
            print("Running graph...")

        # call functions
        state = {}
        for i, node in enumerate(self.sorted_nodes):
            # get node id
            node_id = node.get_id()

            if len(node.inputs) == 0:
                if len(node.outputs) > 0:
                    state[node_id] = node._call()
                else:
                    node._call()
            else:
                args = [None] * len(node.inputs)
                for i in range(len(node.inputs)):
                    if hasattr(node.inputs[i], "origin"):
                        origin_id, pin = node.inputs[i].origin
                        args[i] = state[origin_id][pin]

                if len(node.outputs) > 0:
                    state[node_id] = node._call(args)
                else:
                    node._call(args)

        if not translate:
            return state
        
        state_translated = {}
        for key, value in state.items():
            state_translated[self.id2name[key]] = value
        return state_translated


def load_graph(filename):
    from .editor import load_package
    import json

    with open(filename, "r") as f:
        data = json.load(f)

    rite = Rite("project")
    rite += load_package(data["packages"])
    ritual = rite.promote(data["nodes"], data["edges"])
    return ritual
