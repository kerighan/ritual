from .box import Function, InputOutput, Cast
from .slot import StrSlot, DFSlot, BoolSlot, JsonSlot, ListSlot
import pandas as pd
import os


class ReadDataFrame(InputOutput):
    name = "Read DataFrame"
    inputs = [
        StrSlot("filename")
    ]
    outputs = [
        DFSlot("df")
    ]
    parameters = [
        StrSlot("filename")
    ]
    description = (
        "Read a DataFrame from disk: "
        "as pickle if filename extension is .p, "
        "as csv if filename extension is .csv, "
        "as hdf if filename extension is .hdf "
    )

    def call(self, inputs):
        filename = inputs[0]
        if filename is None:
            filename = self.parameters[0]
        assert os.path.exists(filename)

        if ".p" == filename[-2:]:
            df = pd.read_pickle(filename)
        elif ".csv" == filename[-4:]:
            df = pd.read_csv(filename)
        elif ".hdf" == filename[-4:]:
            key = filename.split("/")[-1].split(".")[0]
            df = pd.read_hdf(filename, key)
        
        return df


class Columns(Function):
    name = "Get columns"
    inputs = [
        DFSlot("df")
    ]
    outputs = [
        DFSlot("df[columns]")
    ]
    parameters = [
        StrSlot("columns", "col1,col2")
    ]

    def call(self, inputs):
        df = inputs[0]
        columns = [
            item.strip() for item in self.parameters[0].split(",")]
        return df[columns]


class DFToCSV(InputOutput):
    name = "Write DataFrame to CSV"
    inputs = [
        DFSlot("df")
    ]
    parameters = [
        StrSlot("filename"),
        BoolSlot("include index")
    ]

    def call(self, inputs):
        df = inputs[0]
        df.to_csv(self.parameters[0],
                  index=None)


class DFToJSON(Cast):
    name = "Cast DataFrame to JSON"
    inputs = [
        DFSlot("df")
    ]
    outputs = [
        JsonSlot("JSON")
    ]

    def call(self, inputs):
        df = inputs[0]
        return df.to_dict()


class DFToList(Cast):
    name = "Cast DataFrame to List"
    inputs = [
        DFSlot("df")
    ]
    outputs = [
        ListSlot("List")
    ]

    def call(self, inputs):
        df = inputs[0]
        return df.to_dict("records")
