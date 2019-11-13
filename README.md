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
ritual --editor --packages ritual.requests ritual.dataframe
```
These packages add a new set of boxes that you can place and call, in this case http requests and Pandas DataFrame basic I/O functions.


## Authors

Maixent Chenebaux