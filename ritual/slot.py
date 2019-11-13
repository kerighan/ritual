import pandas as pd


def convert_types(x):
    try:
        return x.__name__
    except AttributeError:
        return x.__str__()


class Slot:
    gist = "Slot"
    color = "#96F632"

    def __init__(self, name):
        self.name = name

    def to_json(self):
        return {
            "name": self.name,
            "types": [convert_types(i) for i in self.value_type],
            "color": self.color,
            "value": self.value
        }


class RunSlot(Slot):
    name = "Run"
    value_type = (bool,)
    value = True


class FloatSlot(Slot):
    value_type = (float, int)
    name = "Float"
    value = 0.


class IntSlot(Slot):
    value_type = (int,)
    name = "Int"
    value = 0


class AlphaNumSlot(Slot):
    value_type = (int, float, str)
    name = "AlphaNum"
    value = 0


class StrSlot(Slot):
    value_type = (str,)
    name = "Str"
    value = ""


class JsonSlot(Slot):
    value_type = (dict, list)
    name = "Json"
    value = "{}"


class ListSlot(Slot):
    value_type = (list,)
    name = "List"
    value = []


class ObjectSlot(Slot):
    value_type = (int, float, str, dict, list, bool, pd.DataFrame)
    name = "Object"
    value = {}


class UniversalSlot(Slot):
    value_type = "universal"
    name = "Universal"
    value = None


class DFSlot(Slot):
    value_type = (pd.DataFrame,)
    name = "DataFrame"
    value = None


class BoolSlot(Slot):
    value_type = (bool,)
    name = "Boolean"
    value = False
