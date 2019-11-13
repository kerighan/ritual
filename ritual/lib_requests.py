from .box import Function
from .slot import StrSlot, IntSlot, JsonSlot
import requests


# Arithmetic
class GetRequest(Function):
    name = "GET Request"
    inputs = [
        StrSlot("url"),
        JsonSlot("params")
    ]
    outputs = [
        StrSlot("text"),
        IntSlot("status code")
    ]

    def call(self, inputs):
        try:
            # if params are given
            if inputs[1] is not None:
                r = requests.get(inputs[0], params=inputs[1])
            else:
                r = requests.get(inputs[0])
            return r.text, r.status_code
        except requests.exceptions.ConnectionError:
            return "", 500
