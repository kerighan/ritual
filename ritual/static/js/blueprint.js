// blueprint DOM
var blueprint = document.getElementById("blueprint");
var blueprintInfo = document.getElementById("blueprint-info");
var svg = d3.select(blueprint);
var contentGroup = svg.append("g");
var nodeGroup = contentGroup.append("g").attr("id", "nodes");
var lines = contentGroup.append("g").attr("id", "lines");
var draggableLine = contentGroup.append("g").attr("id", "draggable-line").attr("pointer-events", "none");
var line = d3.line().x(function(d){ return d.x }).y(function(d){ return d.y}).curve(d3.curveBasis);

var panX = 0;
var panY = 0;
var zoom = 1;
svg.call(d3.zoom().on("zoom", function(){
    contentGroup.attr("transform", d3.event.transform);
    // zooming & panning
    zoom = d3.event.transform.k;
    panX = d3.event.transform.x;
    panY = d3.event.transform.y;
}));

// UI DOM
var displayName = document.getElementById("box-info-name");
var displayGist = document.getElementById("box-info-gist");
var displayParams = document.getElementById("box-info-parameters");
var displayValue = document.getElementById("box-info-value");
var displayHelp = document.getElementById("box-help");
var runButton = document.getElementById("run-button");
var saveButton = document.getElementById("save-button");
var saveList = document.getElementById("save-list");

// helper DOM
var helper = document.getElementById("helper");
var helperList = document.getElementById("helper-list");
var helperInput = document.getElementById("helper-search-input");

// helper booleans
var helperShown = false;
var helperAllow = true;
var draggingBox = false;
var draggingLine = false;

// selection
var selectedNode = -1;
var selectedPin = -1;
var selectedDir = -1;
var hoveredNode = -1;
var hoveredPin = -1;
var hoveredDir = -1;
var clickedNode = -1;
var dragMouseX = -1;
var dragMouseY = -1;

// edges that depend on the selected node
var dependentEdges = [];
var dependentEdgesIndex = [];

// store nodes and edges into memory
var nodes = [];
var edges = [];


// box functions
function getUniqueName(name){
    var allNames = [];
    for (var i = 0; i < nodes.length; i++){
        allNames.push(nodes[i].name);
    }
    
    var n = 2;
    var newName = name;
    while (allNames.includes(newName)){
        newName = name + " " + n;
        n++;
    }
    return newName;
}


function createBox(box){
    if (box.x & box.y){
        var x = box.x;
        var y = box.y;
        var width = box.width;
        var height = box.height;
    } else {
        var x = (1 / zoom) * (parseFloat(helper.getAttribute("x")) - panX);
        var y = (1 / zoom) * (parseFloat(helper.getAttribute("y")) - panY);
        var width = 280;
        var height = 90 + 20 * Math.max(box.inputs.length - 1, box.outputs.length);
    }

    var name = getUniqueName(box.name);
    var g = nodeGroup.append("g").attr("transform", translate(x, y))
                    .attr("index", nodes.length)
                    .on("mouseover", function(){
                        helperAllow = false;
                        var elem = d3.select(this.children[0]);
                        elem.attr("stroke-width", 1.5);
                        elem.attr("opacity", .5);
                    })
                    .on("mouseout", function(){
                        helperAllow = true;
                        if (clickedNode != this.getAttribute("index")){
                            var elem = d3.select(this.children[0]);
                            elem.attr("stroke-width", 0);
                            elem.attr("opacity", .8);
                        }
                    })
                    .on("click", function(){
                        unclick();
                        clickedNode = this.getAttribute("index");
                        displayBoxInfo(clickedNode);
                        var elem = d3.select(this.children[0]);
                        elem.attr("stroke-width", 4);
                    });
    g.append("rect").attr("x", 0)
                    .attr("y", 0)
                    .attr("width", width)
                    .attr("height", height)
                    .attr("fill", "#111")
                    .attr("rx", 6)
                    .attr("ry", 6)
                    .attr("class", "clickable")
                    .attr("opacity", .85)
                    .attr("stroke", "rgba(255, 255, 255, .2)")
                    .attr("stroke-width", 0);
    g.append("rect").attr("x", 0)
                    .attr("y", 0)
                    .attr("class", "draggable")
                    .attr("width", width)
                    .attr("height", 40)
                    .attr("ry", 6)
                    .attr("fill", box.color);
    g.append("text").attr("x", 42)
                    .attr("y", 25)
                    .text(name)
                    .attr("class", "unclickable svg-box-name")
                    .attr("fill", "#ffffff");
    g.call(
        d3.drag().on("drag", function(e){
            var elem = d3.select(this);
            var index = parseInt(this.getAttribute("index"));

            var posX = nodes[index].x;
            var posY = nodes[index].y;
            var eventX = d3.event.x;
            var eventY = d3.event.y;

            var x = posX + d3.event.dx;
            var y = posY + d3.event.dy;

            if (eventY - posY < 40 | draggingBox){
                elem.attr("transform", translate(x, y));
                nodes[index].x = x;
                nodes[index].y = y;
                draggingBox = true;
            }
            updateLinksNode(index, x, y);
        })
        .on("end", function(e){
            draggingBox = false;
            dependentEdges = [];
        })
        .on("start", function(e){
            var index = parseInt(this.getAttribute("index"));
            getDependentEdges(index);
        })
    );

    // create input pins
    var inputs_list = [];
    var num_inputs = box.inputs.length;
    if (num_inputs > 0){
        var inputs = g.append("g").attr("class", "inputs");
        for (var i = 0; i < num_inputs; i++){
            if (i > 0){
                var posY = posYOfPin(num_inputs - 1, i - 1, 35, height);
            } else {
                var posY = 19;
            }
            var circle = inputs.append("circle")
            circle.attr("cx", 25)
                    .attr("cy", posY)
                    .attr("fill", i == 0 ? "rgba(0,0,0,0)" : "#212121")
                    .attr("r", 6)
                    .attr("pin", i)
                    .attr("class", "draggable")
                    .attr("stroke", "#ffffff")
                    .attr("stroke-width", 2)
                    .on("mouseover", function(){
                        hoveredNode = this.parentNode.parentNode;
                        hoveredPin = parseInt(this.getAttribute("pin"));
                        hoveredDir = "inputs";
                    })
                    .on("mouseout", function(){
                        hoveredNode = -1;
                        hoveredPin = -1;
                        hoveredDir = -1;
                    });
            circle.call(
                d3.drag().on("start", function(e){
                    selectedNode = this.parentNode.parentNode;
                    selectedPin = parseInt(this.getAttribute("pin"));
                    selectedDir = "inputs";
                })
                .on("end", linkNodes)
                .on("drag", function(e){
                    var selectedNodeIndex = selectedNode.getAttribute("index");
                    var nodex = nodes[selectedNodeIndex][selectedDir][selectedPin].x + nodes[selectedNodeIndex].x;
                    var nodey = nodes[selectedNodeIndex][selectedDir][selectedPin].y + nodes[selectedNodeIndex].y;
                    var eventX = d3.event.x + nodes[selectedNodeIndex].x;
                    var eventY = d3.event.y + nodes[selectedNodeIndex].y;
                    dragMouseX = eventX + width;
                    dragMouseY = eventY - height / 2;
                    draggingLine = true;
                    dragLine(eventX, eventY, nodex, nodey);
                })
            );
            if (i > 0){
                inputs.append("text").attr("x", 42)
                                        .attr("y", posY + 6)
                                        .text(box.inputs[i].name)
                                        .attr("fill", "#ffffff");
            }
            inputs_list.push({x: 25, y: posY, types: box.inputs[i].types, name: box.inputs[i].name});
        }
    }

    // create output pins
    var outputs_list = [];
    var num_outputs = box.outputs.length;
    if (num_outputs > 0){
        var outputs = g.append("g").attr("class", "outputs");
        for (var i = 0; i < num_outputs; i++){
            var posY = posYOfPin(num_outputs, i, 35, height);
            var circle = outputs.append("circle")
            circle.attr("cx", width - 25)
                    .attr("cy", posY)
                    .attr("fill", "#212121")
                    .attr("r", 6)
                    .attr("class", "draggable")
                    .attr("stroke", "#ffffff")
                    .attr("stroke-width", 2)
                    .attr("pin", i)
                    .on("mouseover", function(){
                        hoveredNode = this.parentNode.parentNode;
                        hoveredPin = parseInt(this.getAttribute("pin"));
                        hoveredDir = "outputs";
                    })
                    .on("mouseout", function(){
                        hoveredNode = -1;
                        hoveredPin = -1;
                        hoveredDir = -1;
                    });
            circle.call(
                d3.drag().on("start", function(e){
                    selectedNode = this.parentNode.parentNode;
                    selectedPin = parseInt(this.getAttribute("pin"));
                    selectedDir = "outputs";
                })
                .on("end", linkNodes)
                .on("drag", function(e){
                    var selectedNodeIndex = selectedNode.getAttribute("index");
                    var nodex = nodes[selectedNodeIndex][selectedDir][selectedPin].x + nodes[selectedNodeIndex].x;
                    var nodey = nodes[selectedNodeIndex][selectedDir][selectedPin].y + nodes[selectedNodeIndex].y;
                    var eventX = d3.event.x + nodes[selectedNodeIndex].x;
                    var eventY = d3.event.y + nodes[selectedNodeIndex].y;
                    dragMouseX = eventX + width;
                    dragMouseY = eventY - height / 2;
                    draggingLine = true;
                    dragLine(nodex, nodey, eventX, eventY);
                })
            );
            outputs.append("text").attr("x", width - 42)
                                    .attr("y", posY + 6)
                                    .text(box.outputs[i].name)
                                    .attr("text-anchor", "end")
                                    .attr("fill", "#ffffff");
            outputs_list.push({x: width - 25, y: posY, types: box.outputs[i].types, name: box.outputs[i].name});
        }
    }

    nodes.push({
        x: x,
        y: y,
        width: width,
        height: height,
        name: name,
        inputs: inputs_list,
        outputs: outputs_list,
        gist: box.gist,
        parameters: box.parameters,
        color: box.color,
        group: g,
        value: box.value,
        primitive: box.primitive
    });

    if (draggingLine){
        draggingLine = false;
        hoveredNode = g.node();
        hoveredPin = 1;
        hoveredDir = "inputs";

        linkNodes();
    }

    // remove helper if there is a box on the grid
    displayBlueprintInfo();

}

function displayBlueprintInfo(){
    if (nodes.length == 1)
        blueprintInfo.classList.add("d-none");
    else if (nodes.length == 0)
        blueprintInfo.classList.remove("d-none");
}

function getBoxOfName(name){
    for (var i = 0; i < boxes.length; i++){
        if (boxes[i].name == name){
            return boxes[i];
        }
    }
}

function changeClickedBoxName(newName){
    nodes[clickedNode].group.select(".svg-box-name").text(newName);
    nodes[clickedNode].name = newName;
}

function changeClickedBoxValue(newValue){
    nodes[clickedNode].value = newValue;
}

function changeClickedBoxParam(newValue, index){
    nodes[clickedNode].parameters = JSON.parse(JSON.stringify(
        nodes[clickedNode].parameters));
    nodes[clickedNode].parameters[index].value = newValue;
}

// Helper events
blueprint.addEventListener("contextmenu", function(e){
    e.preventDefault();
    var x = e.clientX;
    var y = e.clientY - 50;

    helperOpen(x, y);
    return false;
}, false);


blueprint.addEventListener("click", function(e){
    helperClose();
    if (helperAllow){
        unclick();
    }
});

function unclick(){
    if (clickedNode != -1){
        console.log(clickedNode);
        var elem = nodes[clickedNode].group.select("rect")
        elem.attr("stroke-width", 0);
        elem.attr("opacity", .8);
        clickedNode = -1;
        displayBoxInfo();
    }
}

function helperOpen(x, y, elem){
    if (helperAllow){
        listHelper(undefined, elem);
        helper.style.transform = translate_px(x, y);
        helper.setAttribute("x", x - 300);
        helper.setAttribute("y", y);
        helper.classList.remove("d-none");
        helperShown = true;
        helperInput.focus();
    }
}

function listHelper(search, elem){
    helperList.innerHTML = "";

    var outputType;
    if (elem){
        var nodeId = parseInt(selectedNode.getAttribute("index"));
        outputType = nodes[nodeId].outputs[selectedPin].types;
    }

    for (var i = 0; i < boxes.length; i++){
        var box = boxes[i];
        var name = box.name;
        if (search){
            if (elem){
                if (box.inputs.length == 2){
                    if (areTypesCompatible(outputType, box.inputs[1].types)){
                        var li = createHelperLi(name, i);
                        helperList.appendChild(li);
                    }
                }
            }
            else {
                if (name.toLowerCase().includes(search.toLowerCase())){
                    var li = createHelperLi(name, i);
                    helperList.appendChild(li);
                }
            }
        }
        else{
            helperInput.value = "";
            if (elem){
                if (box.inputs.length == 2){
                    if (areTypesCompatible(outputType, box.inputs[1].types)){
                        var li = createHelperLi(name, i);
                        helperList.appendChild(li);
                    }
                }
            }
            else {
                var li = createHelperLi(name, i);
                helperList.appendChild(li);
            }
        }
    }
}

function createHelperLi(name, i){
    var li = document.createElement("li");
    li.innerHTML = name;
    li.setAttribute("boxname", name);
    li.setAttribute("boxid", i);

    li.addEventListener("click", function(){
        name = this.getAttribute("boxname");
        createBox(getBoxOfName(name));
        helperClose();
    });

    li.addEventListener("mouseover", function(){
        var index = this.getAttribute("boxid");
        displayHelp.innerHTML = boxes[index].description;
    });
    li.addEventListener("mouseleave", function(){
        displayHelp.innerHTML = "";
    })
    return li
}

function helperClose(){
    draggingLine = false;
    draggableLine.html("");
    if (helperShown){
        helper.classList.add("d-none");
        helperShown = false;
    }
}

helperInput.addEventListener("input", function(){
    if (draggingLine){
        listHelper(this.value, selectedNode);
    } else {
        listHelper(this.value);
    }
});

helperInput.addEventListener("keydown", function(e){
    if (e.key == "Enter"){
        if (helperList.children.length == 1){
            helperList.children[0].click();
        }
    }
})

// Position helper functions
function posYOfPin(num_pins, i, start, end){
    num_points = num_pins + 1;
    var height = end - start;
    padding = height / num_points;
    return (i + 1) * padding + start;
}

function translate_px(x, y){
    return "translate(" + x + "px, " + y + "px)";
}

function translate(x, y){
    return "translate(" + x + ", " + y + ")";
}

// Edges functions
function linkNodes(){
    if (selectedDir != hoveredDir & selectedNode != -1 & hoveredNode != -1){
        draggableLine.html("");
        draggingLine = false;
        if (selectedDir == "inputs"){
            var inputNode = selectedNode;
            var inputPin = selectedPin;
            var inputDir = "inputs";

            var outputNode = hoveredNode;
            var outputPin = hoveredPin;
            var outputDir = "outputs";
        } else {
            var inputNode = hoveredNode;
            var inputPin = hoveredPin;
            var inputDir = "inputs";

            var outputNode = selectedNode;
            var outputPin = selectedPin;
            var outputDir = "outputs";
        }

        var inputNodeIndex = inputNode.getAttribute("index");
        var inputX = nodes[inputNodeIndex][inputDir][inputPin].x + nodes[inputNodeIndex].x;
        var inputY = nodes[inputNodeIndex][inputDir][inputPin].y + nodes[inputNodeIndex].y;

        var outputNodeIndex = outputNode.getAttribute("index");
        var outputX = nodes[outputNodeIndex][outputDir][outputPin].x + nodes[outputNodeIndex].x
        var outputY = nodes[outputNodeIndex][outputDir][outputPin].y + nodes[outputNodeIndex].y;

        var data = [
            {
                x: inputX - 5,
                y: inputY
            },
            {
                x: inputX - 80,
                y: inputY
            },
            {
                x: outputX + 80,
                y: outputY
            },
            {
                x: outputX + 5,
                y: outputY
            },
        ];

        var line = d3.line().x(function(d){ return d.x }).y(function(d){ return d.y}).curve(d3.curveBasis);
        var path = lines.append("path");
        var color = inputPin == 0 ? "rgba(255, 255, 255, .75)" : "#606060";
        path.datum(data).attr("d", line).attr("fill", "transparent").attr("stroke", color).attr("stroke-width", 5);

        edges.push(
            {
                inputNode: inputNode,
                inputPin: inputPin,
                outputNode: outputNode,
                outputPin: outputPin,
                inputX: inputX,
                inputY: inputY,
                outputX: outputX,
                outputY: outputY,
                path: path
            }
        );
    } else if (draggingLine){
        helperOpen(dragMouseX, dragMouseY, selectedNode);
    }
}

function updateLinkNode(path, i, inputX, inputY, outputX, outputY){
    var data = [
        {
            x: inputX - 5,
            y: inputY
        },
        {
            x: inputX - 80,
            y: inputY
        },
        {
            x: outputX + 80,
            y: outputY
        },
        {
            x: outputX + 5,
            y: outputY
        },
    ];
    var color = edges[i].inputPin == 0 ? "rgba(255, 255, 255, .75)" : "#606060";
    path.datum(data).attr("d", line)
                    .attr("fill", "transparent")
                    .attr("stroke", color)
                    .attr("stroke-width", 5);
    edges[i].inputX = inputX;
    edges[i].inputY = inputY;
    edges[i].outputX = outputX;
    edges[i].outputY = outputY;
}

function updateLinksNode(nodeId, x, y){
    for (j = 0; j < dependentEdges.length; j++){
        var edge = dependentEdges[j];
        if (edge.inputNode.getAttribute("index") == nodeId){
            paddingY = nodes[nodeId].inputs[edge.inputPin].y;
            paddingX = nodes[nodeId].inputs[edge.inputPin].x;
            updateLinkNode(edge.path, dependentEdgesIndex[j], x + paddingX, y + paddingY, edge.outputX, edge.outputY);
        } else {
            paddingY = nodes[nodeId].outputs[edge.outputPin].y;
            paddingX = nodes[nodeId].outputs[edge.outputPin].x;
            updateLinkNode(edge.path, dependentEdgesIndex[j], edge.inputX, edge.inputY, x + paddingX, y + paddingY);
        }
    }
}

function getDependentEdges(nodeIndex){
    dependentEdges = [];
    dependentEdgesIndex = [];
    for (var i = 0; i < edges.length; i++){
        if (edges[i].inputNode.getAttribute("index") == nodeIndex | edges[i].outputNode.getAttribute("index") == nodeIndex){
            dependentEdges.push(edges[i]);
            dependentEdgesIndex.push(i);
        }
    }
}

// Line that draws on drag
function dragLine(inputX, inputY, outputX, outputY){
    draggableLine.html("");
    var data = [
        {
            x: inputX,
            y: inputY
        },
        {
            x: inputX + 80,
            y: inputY
        },
        {
            x: outputX - 80,
            y: outputY
        },
        {
            x: outputX,
            y: outputY
        },
    ];
    draggableLine.append("path").datum(data).attr("d", line).attr("fill", "transparent").attr("stroke", "#333333").attr("stroke-width", 5);
}

// UI management
function displayBoxInfo(){
    displayGist.style.backgroundColor = "transparent";
    displayName.innerHTML = "";
    displayGist.innerHTML = "";
    displayValue.innerHTML = "";
    displayParams.innerHTML = "";

    if (clickedNode > -1){
        var box = nodes[clickedNode];

        // add gist and primitive
        displayGist.innerHTML = box.gist + " - " + box.primitive;
        displayGist.style.backgroundColor = box.color;
        
        // add input name
        var labelName = document.createElement("label");
        labelName.innerHTML = "Name";
        displayName.appendChild(labelName);
        var inputName = document.createElement("input");
        inputName.value = box.name;
        inputName.addEventListener("input", function(e){
            changeClickedBoxName(this.value);
        });
        displayName.appendChild(inputName);

        // add input value
        if (box.gist == "Variable"){
            var labelValue = document.createElement("label");
            labelValue.innerHTML = "Value";
            displayValue.appendChild(labelValue);


            var inputValue = document.createElement("input");
            if (box.primitive == "Bool"){
                inputValue.setAttribute("type", "checkbox");
                inputValue.checked = box.value;
                inputValue.addEventListener("change", function(e){
                    changeClickedBoxValue(this.checked);

                });
                inputValue.setAttribute("id", "bool-value");

                var squareValue = document.createElement("label");
                squareValue.classList.add("square-value");
                squareValue.innerHTML = "boolean";
                squareValue.setAttribute("for", "bool-value");

                displayValue.appendChild(inputValue);
                displayValue.appendChild(squareValue);
            } else {
                inputValue.value = box.value;
                inputValue.addEventListener("input", function(e){
                    changeClickedBoxValue(this.value);
                });
                displayValue.appendChild(inputValue);
            }
        }

        // display parameters if any
        if (box.parameters){
            for (var i = 0; i < box.parameters.length; i++){
                var labelParam = document.createElement("label");
                labelParam.innerHTML = box.parameters[i].name;
                displayParams.appendChild(labelParam);

                var inputParam = document.createElement("input");
                inputParam.value = box.parameters[i].value;
                inputParam.setAttribute("index", i);
                inputParam.addEventListener("input", function(e){
                    changeClickedBoxParam(this.value, this.getAttribute("index"));
                });
                displayParams.appendChild(inputParam);
            }
        }
    }
}


// Delete key presse
document.addEventListener("keydown", function(e){
    if (e.key == "Delete"){
        if (clickedNode != -1){
            removeNode(clickedNode);
        }
    }
});

function removeNode(nodeId){
    // remove dependant edges
    getDependentEdges(nodeId);
    for (var i = dependentEdges.length - 1; i >= 0; i--){
        dependentEdges[i].path.remove();
        edges.splice(dependentEdgesIndex[i], 1);
    }
    dependentEdges = [];
    dependentEdgesIndex = [];

    // reindex edges
    for (var i = 0; i < edges.length; i++){
        edges[i].path.attr("index", i);
    }

    // remove node
    nodes[nodeId].group.remove();
    nodes.splice(nodeId, 1);

    // reindex nodes
    for (var i = 0; i < nodes.length; i++){
        nodes[i].group.attr("index", i);
    }
    helperAllow = true;
    clickedNode = -1;
    displayBoxInfo();
    displayBlueprintInfo();
}


function areTypesCompatible(typesA, typesB){
    if (typesA){
        var compatible = false;
        for (var i = 0; i < typesA.length; i++){
            if (typesB.includes(typesA[i])){
                compatible = true;
                break;
            }
        }
        return compatible;

    } else {
        return false;
    }
}

function populateSaveList(){
    saveList.innerHTML = "";

    // send request
    $.ajax({
        type: "GET",
        url: "/list",
        contentType:"application/json",
        success: function(data){
            var option = document.createElement("option");
            option.setAttribute("name", -1);
            option.innerHTML = "New graph";
            saveList.appendChild(option);

            for (var i = 0; i < data.length; i++){
                var option = document.createElement("option");
                option.setAttribute("name", data[i]);
                option.innerHTML = data[i];
                saveList.appendChild(option);
            }
        }
    });

    saveList.addEventListener("change", function(e){
        var selected = this.selectedIndex;
        var name = saveList.children[selected].getAttribute("name");
        if (name == -1){
            resetGraph();
        } else {
            $.ajax({
                type: "GET",
                url: "/load?id=" + name,
                contentType:"application/json",
                success: function(data){
                    loadGraph(data);
                }
            });
        }

    });
}
populateSaveList();


function loadEdge(edge){
    var data = [
        {
            x: edge.inputX - 5,
            y: edge.inputY
        },
        {
            x: edge.inputX - 80,
            y: edge.inputY
        },
        {
            x: edge.outputX + 80,
            y: edge.outputY
        },
        {
            x: edge.outputX + 5,
            y: edge.outputY
        },
    ];

    var line = d3.line().x(function(d){ return d.x }).y(function(d){ return d.y}).curve(d3.curveBasis);
    var path = lines.append("path");
    var color = edge.inputPin == 0 ? "rgba(255, 255, 255, .75)" : "#606060";
    path.datum(data).attr("d", line).attr("fill", "transparent").attr("stroke", color).attr("stroke-width", 5);

    var inputNode = blueprint.querySelector("g[index='" + edge.inputNode + "']");
    var outputNode = blueprint.querySelector("g[index='" + edge.outputNode + "']");
    edges.push(
        {
            inputNode: inputNode,
            inputPin: edge.inputPin,
            outputNode: outputNode,
            outputPin: edge.outputPin,
            inputX: edge.inputX,
            inputY: edge.inputY,
            outputX: edge.outputX,
            outputY: edge.outputY,
            path: path
        }
    );
}

function loadGraph(data){
    resetGraph();
    // contentGroup.attr("transform", "translate(0, 0)");

    loaded_nodes = data.nodes;
    loaded_edges = data.edges;
    for (var i = 0; i < loaded_nodes.length; i++){
        createBox(loaded_nodes[i]);
    }

    for (var i = 0; i < loaded_edges.length; i++){
        loadEdge(loaded_edges[i]);
    }

}

function resetGraph(){
    nodes = [];
    edges = [];
    nodeGroup.html("");
    lines.html("");
    displayBlueprintInfo();
}

// Requests
function prepareEdges(){
    var new_edges = [];
    for (var i = 0; i < edges.length; i++){
        var tmp = {};
        for (var key in edges[i]){
            if (key == "outputNode" | key == "inputNode"){
                tmp[key] = parseInt(edges[i][key].getAttribute("index"));
            }
            else if (key != "path"){
                tmp[key] = edges[i][key];
            }
        }
        new_edges.push(tmp);
    }
    return new_edges;
}

function prepareNodes(){
    var new_nodes = [];
    for (var i = 0; i < nodes.length; i++){
        var tmp = {};
        for (var key in nodes[i]){
            if (key != "group")
                tmp[key] = nodes[i][key];
        }
        new_nodes.push(tmp);
    }
    return new_nodes;
}

runButton.addEventListener("click", function(){
    // prepare Edges data
    var new_edges = prepareEdges();

    // prepare Nodes data
    var new_nodes = prepareNodes();

    // send request
    $.ajax({
        type: "POST",
        url: "/run",
        contentType:"application/json",
        data: JSON.stringify({edges: new_edges, nodes: new_nodes}),
        success: function(data){
            console.log(data);
        }
    });
});

saveButton.addEventListener("click", function(){
    // prepare Edges data
    var new_edges = prepareEdges();

    // prepare Nodes data
    var new_nodes = prepareNodes();

    // send request
    $.ajax({
        type: "POST",
        url: "/save",
        contentType:"application/json",
        data: JSON.stringify({edges: new_edges, nodes: new_nodes}),
        success: function(data){
            populateSaveList();
        }
    });
});
