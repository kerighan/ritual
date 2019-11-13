# Visual scripting for Pyton

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.


### Installing

You can install the method by typing:
```
pip install ritual
```

### Basic usage

Create a new folder, and start the local editor using the command:
```bash
ritual --editor
```
Then, go to `http://0.0.0.0:5000/`.
On the local website, right click to add functions or variables (represented as boxes), and link them to create a graph.
You can save the graph as well as running it by clicking on the top-right buttons.

![UI example](https://raw.githubusercontent.com/kerighan/ritual/master/img/UI_1.png)

You can add different pre-existing packages to the editor, as well as your own (documentation soon), by adding the `--packages` parameter:
```bash
ritual --editor --packages ritual.lib_requests ritual.lib_pandas
```
These packages add a new set of boxes that you can place and call, in this case http requests and Pandas DataFrame basic I/O functions.

When saved, the graph and the packages references are stored in a single .json file (in the graphs/ folder) that you can call later on by omitting the `--editor` parameter:

```bash
ritual -f graphs/XXXX.json
```
Or by loading directly the graph in Python:

```python
from ritual import load_graph

ritual = load_graph("graphs/XXXX.json")
state = ritual.run()
```
The `state` variable is a dict that contains the boxes output values, accessible by box name.

## Authors

Maixent Chenebaux