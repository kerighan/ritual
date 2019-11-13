from .slot import (
    FloatSlot, StrSlot, JsonSlot, ObjectSlot, UniversalSlot,
    IntSlot, AlphaNumSlot, ListSlot, BoolSlot, RunSlot)
from enum import Enum
from collections import defaultdict
import json
import os


class State(Enum):
    IGNORE = 0


def check_inputs(func):
    def wrapper(instance, inputs=None):
        evaluate = True
        if inputs:
            for inp in inputs:
                if inp is State.IGNORE:
                    evaluate = False
                    break

        if evaluate:
            # start at index 1 because 0 is the RunSlot
            outputs = func(instance, inputs[1:])
            if not isinstance(outputs, tuple):
                outputs = (outputs,)
            assert len(outputs) >= len(instance.outputs)
        else:
            outputs = defaultdict(lambda: State.IGNORE)
        return outputs
    return wrapper


class Box:
    name = "Box"
    color = "#555555"
    inputs = []
    outputs = []
    parameters = []
    gist = "Box"
    description = ""

    def __init__(self, name=None, value=None):
        from copy import deepcopy

        if name is not None:
            assert isinstance(name, str)
            self.name = name

        if value is not None:
            assert isinstance(value, self.value_type)
            self.value = value

        self.primitive = self.__class__.__name__
        self.inputs = [RunSlot("run")] + self.inputs

    def to_json(self):
        res = {
            "name": self.name,
            "color": self.color,
            "inputs": [i.to_json() for i in self.inputs],
            "outputs": [i.to_json() for i in self.outputs],
            "parameters": [i.to_json() for i in self.parameters],
            "primitive": self.primitive,
            "gist": self.gist,
            "description": self.description
        }
        if self.gist == "Variable":
            res["value"] = self.value
        return res
    
    def from_json(self, data):
        pass
    
    def as_bool(self, value):
        return value in ["1", "true", "True", True, "yes", "Yes"]

    def _from(self, i):
        return (self, i, self.outputs[i].value_type)

    def _to(self, i):
        return (self, i, self.inputs[i].value_type)

    def get_id(self):
        return str(id(self))

    def __setattr__(self, key, value):
        if key == "value":
            if isinstance(self.value_type, tuple):
                super().__setattr__(key, self.value_type[0](value))
            else:
                super().__setattr__(key, self.value_type(value))
        else:
            super().__setattr__(key, value)

    @check_inputs
    def _call(self, *args, **kwargs):
        return self.call(*args, **kwargs)


class Function(Box):
    name = "Function"
    gist = "Function"
    color = "#49718B"
    inputs = []
    outputs = []


# Arithmetic
class Add(Function):
    name = "+"
    inputs = [
        FloatSlot("x"),
        FloatSlot("y")
    ]
    outputs = [
        FloatSlot("x + y")
    ]
    description = (
        """Add two floats"""
    )

    def call(self, inputs):
        return inputs[0] + inputs[1],


class Substract(Function):
    name = "-"
    inputs = [
        FloatSlot("x"),
        FloatSlot("y")
    ]
    outputs = [
        FloatSlot("x - y")
    ]
    description = (
        """Substract two floats"""
    )

    def call(self, inputs):
        return inputs[0] - inputs[1],


class GetItem(Function):
    name = "Get item"
    inputs = [
        JsonSlot("JSON")
    ]
    outputs = [
        FloatSlot("value"),
        FloatSlot("KeyError")
    ]
    parameters = [
        StrSlot("key")
    ]
    description = (
        """Return the value stored in the JSON at the `key` parameter."""
    )

    def call(self, inputs):
        if self.parameters[0] in inputs[0]:
            return inputs[0][self.parameters[0]], State.IGNORE
        return State.IGNORE, True


class SetItem(Function):
    name = "Set item"
    inputs = [
        JsonSlot("JSON"),
        ObjectSlot("value")
    ]
    outputs = [
        JsonSlot("JSON")
    ]
    parameters = [
        StrSlot("key")
    ]
    description = (
        """Store the value in the JSON at the `key` parameter."""
    )


    def call(self, inputs):
        inputs[0][self.parameters[0]] = inputs[1]
        return inputs[0]



# Variables
# ~~~~~~~~~

class Variable(Box):
    name = "Variable"
    gist = "Variable"
    color = "#598053"
    value = None


class Bool(Variable):
    name = "Bool"
    value = False
    outputs = [
        BoolSlot("Bool")
    ]
    description = (
        "Create a boolean variable"
    )
    def value_type(self, x):
        return self.as_bool(x)

    def call(self, inputs=None):
        return self.value


class Int(Variable):
    name = "Int"
    value_type = int
    value = 0
    outputs = [
        IntSlot("Int")
    ]
    description = (
        "Create an integer variable"
    )

    def call(self, inputs=None):
        return self.value


class Float(Variable):
    name = "Float"
    value_type = (float, int)
    value = 0
    outputs = [
        FloatSlot("Float")
    ]
    description = (
        "Create an floating point variable"
    )

    def call(self, inputs=None):
        return self.value


class List(Variable):
    name = "List"
    value_type = (list,)
    value = "[]"
    outputs = [
        ListSlot("List")
    ]
    description = (
        "Create a List variable"
    )

    def call(self, inputs=None):
        if isinstance(self.value, str):
            value = json.loads(self.value)
        elif isinstance(self.value, list):
            value = self.value
        return value


class Object(Variable):
    name = "Object"
    value_type = (float, int, str)
    value = 0
    outputs = [
        ObjectSlot("Object")
    ]
    description = (
        "Create an object variable"
    )

    def call(self, inputs=None):
        return self.value


class Str(Variable):
    name = "String"
    value_type = str
    value = ""
    outputs = [
        StrSlot("Str")
    ]
    description = (
        "Create a String variable"
    )

    def call(self, inputs=None):
        return self.value


class Json(Variable):
    name = "Json"
    value = {}
    outputs = [
        JsonSlot("Json")
    ]
    description = (
        "Create a JSON variable"
    )

    def value_type(self, x):
        if isinstance(x, str):
            return json.loads(x)
        elif isinstance(x, dict):
            return x

    def call(self, inputs=None):
        return self.value


class Environment(Variable):
    name = "Environment variable"
    value_type = str
    value = "PATH"
    outputs = [
        StrSlot("Str")
    ]
    description = (
        "Get an Environment variable by its name"
    )

    def call(self, inputs=None):
        return os.environ.get(self.value)


# Conditions
# ~~~~~~~~~~

class Condition(Box):
    name = "Event"
    gist = "Event"
    color = "#811012"
    inputs = []
    outputs = []
    parameters = []


class Branch(Condition):
    name = "Branch"
    inputs = [
        BoolSlot("condition")
    ]
    outputs = [
        BoolSlot("True"),
        BoolSlot("False"),
    ]
    description = (
        "Takes in a boolean, and execute the `True` branch if the boolean is True, "
        "the `False` branch is executed otherwise."
    )

    def call(self, inputs):
        if inputs[0]:
            return True, State.IGNORE
        else:
            return State.IGNORE, True


class GreaterThan(Condition):
    name = ">"
    inputs = [
        FloatSlot("x"),
        FloatSlot("y")
    ]
    outputs = [
        BoolSlot("x > y")
    ]
    description = (
        "Returns True if the first input is strictly greater than the second input."
    )

    def call(self, inputs):
        return inputs[0] > inputs[1]


class GreaterThanOrEqual(Condition):
    name = ">="
    inputs = [
        FloatSlot("x"),
        FloatSlot("y")
    ]
    outputs = [
        BoolSlot("x >= y")
    ]
    description = (
        "Returns True if the first input is greater than or equal to the second input."
    )

    def call(self, inputs):
        return inputs[0] >= inputs[1]


# Outputs
# ~~~~~~~

class Output(Box):
    name = "Output"
    value_type = str
    color = "#BA9303"
    inputs = [
        StrSlot("text")
    ]


class Print(Output):
    import pandas as pd

    name = "Print"
    value_type = lambda x: x
    inputs = [
        UniversalSlot("text")
    ]
    description = (
        "Print the given input in the console"
    )

    def call(self, inputs=None):
        if inputs is None:
            print(str(self.value))
        else:
            if isinstance(inputs[0], dict):
                from pprint import pprint
                pprint(inputs[0])
            else:
                print(str(inputs[0]))


class ToFile(Output):
    name = "Write to file"
    value_type = (str, int, float, dict, list)
    inputs = [
        ObjectSlot("content")
    ]
    parameters = [
        StrSlot("filename")
    ]
    description = (
        "Persist Python object to file. "
        "Can be any of string, integer, float, dict or list."
    )

    def call(self, inputs):
        content = inputs[0]
        if isinstance(content, dict):
            import json
            with open(self.parameters[0], "w") as f:
                json.dump(content, f)
        elif isinstance(content, list):
            with open(self.parameters[0], "w") as f:
                f.write("\n".join(content))
        else:
            with open(self.parameters[0], "w") as f:
                f.write(content)


# Casts
# ~~~~~

class Cast(Box):
    name = "Cast"
    gist = "Cast"
    color = "#111111"
    inputs = []
    outputs = []
    parameters = []


class ToInt(Cast):
    name = "Cast to Int"
    inputs = [
        AlphaNumSlot("Object")
    ]
    outputs = [
        IntSlot("Int")
    ]
    description = (
        "Cast any alpha numeric input to an integer"
    )

    def call(self, inputs=None):
        return int(inputs[0]),


class ToStr(Cast):
    name = "Cast to Str"
    inputs = [
        ObjectSlot("Object")
    ]
    outputs = [
        StrSlot("Str")
    ]
    description = (
        "Cast any python object to a string"
    )

    def call(self, inputs=None):
        return str(inputs[0]),


class ToList(Cast):
    name = "Cast to List"
    inputs = [
        ObjectSlot("Object")
    ]
    outputs = [
        ListSlot("List")
    ]
    description = (
        "Cast any python object to a list"
    )

    def call(self, inputs=None):
        return list([inputs[0]])


class ToJson(Cast):
    name = "Cast to JSON"
    inputs = [
        StrSlot("Object")
    ]
    outputs = [
        JsonSlot("JSON")
    ]
    description = (
        "Cast any python object to a JSON (Python Dict)"
    )

    def call(self, inputs=None):
        import json
        return json.loads(str(inputs[0])),


standard = [
    Bool,
    Float,
    Int,
    Str,
    Json,
    List,
    Environment,
    ToInt,
    ToStr,
    ToJson,
    ToFile,
    GetItem,
    SetItem,
    Branch,
    GreaterThan,
    GreaterThanOrEqual,
    Print,
    Add,
    Substract,
]