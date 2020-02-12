from .box import Function
from .slot import StrSlot, IntSlot, JsonSlot
import requests


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
            url, params = inputs
            if params is not None:
                r = requests.get(url, params=params)
            else:
                r = requests.get(url)
            return r.text, r.status_code
        except requests.exceptions.ConnectionError:
            return "", 500


class PostRequest(Function):
    name = "POST Request"
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
            url, params = inputs
            if params is not None:
                r = requests.post(url, payload=params)
            else:
                r = requests.post(url)
            return r.text, r.status_code
        except requests.exceptions.ConnectionError:
            return "", 500
