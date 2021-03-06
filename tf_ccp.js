/**
 * @license
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

 /*
  * Based on the complementary color prediction demo from deeplearn.js
  * Recreated on top of tensorflow.js with D3.js visuals
  *
  */

/*
 * MOMENTUM parameter
 * MAX_COLORS - max number of colors displayed on the color band
 * INTERSECTION - "Overlap" for SVG "sharp gradient"
 * COLORBAND - Height of color bands
 * STARTCOLOR - Neutral start color
 */

const MOMENTUM = 0.9,
      MAX_COLORS = 200,
      INTERSECTION = 0.0002,
      COLORBAND = 25,
      STARTCOLOR = [200,200,200];

/*
 * Model variables that can be ajusted at running time:
 * learningRate
 * batchSize
 * runsb4Rendering
 * epochs
 * stepLimit
 * costTarget
 *
 * noTrain and noUpdate can be used to stop/restart training and
 * stop rendering screen updates
 */
var learningRate,
    batchSize,
    runsb4Rendering,
    epochs,
    stepLimit,
    costTarget,
    step,
    cost,
    noTrain,
    noUpdate,
    reachLimit,
    model,
    startTrainingTime,
    forbiddenColors,
    tooltipSVG,
    sampleList,
    sampledColors,
    totalSamples,
    svgID = "#DLCCP";

/**
 * This implementation of computing the complementary color came from an
 * answer by Edd at https://stackoverflow.com/a/37657940
 */
function computeComplementaryColor(rgbColor) {
  let r = rgbColor[0];
  let g = rgbColor[1];
  let b = rgbColor[2];

  // Convert RGB to HSL
  // Adapted from answer by 0x000f http://stackoverflow.com/a/34946092/4939630
  r /= 255.0;
  g /= 255.0;
  b /= 255.0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = (max + min) / 2.0;
  let s = h;
  const l = h;

  if (max === min) {
    h = s = 0;  // achromatic
  } else {
    const d = max - min;
    s = (l > 0.5 ? d / (2.0 - max - min) : d / (max + min));

    if (max === r && g >= b) {
      h = 1.0472 * (g - b) / d;
    } else if (max === r && g < b) {
      h = 1.0472 * (g - b) / d + 6.2832;
    } else if (max === g) {
      h = 1.0472 * (b - r) / d + 2.0944;
    } else if (max === b) {
      h = 1.0472 * (r - g) / d + 4.1888;
    }
  }

  h = h / 6.2832 * 360.0 + 0;

  // Shift hue to opposite side of wheel and convert to [0-1] value
  h += 180;
  if (h > 360) {
    h -= 360;
  }
  h /= 360;

  // Convert h s and l values into r g and b values
  // Adapted from answer by Mohsen http://stackoverflow.com/a/9493060/4939630
  if (s === 0) {
    r = g = b = l;  // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r, g, b].map(v => Math.round(v * 255));
}

// Normalize/denormalize functions
// normalize color components: 0-255 -> 0-1 
function normalizeColor(color) {
  return color.map(v => v / 255);
}

// denormalize color components: 0-1 -> 0-255
function denormalizeColor(normalizedColor) {
  return normalizedColor.map(v => Math.round(v * 255));
}

// Gets a normlized RGB color, produces a normalized complementary color
function computeComplementaryNormalizedColor(normalizedRgb) {
  return normalizeColor(computeComplementaryColor(denormalizeColor(normalizedRgb)));
}

//Color<->Tensor functions
// Converts 1 tensor to 1 color
function tensor2color(colorTensor) {
  return [...Array(3).keys()].map(v => colorTensor.get(0, v));
}

// Converts colors to tensors
function color2tensor(color) {
  return tf.tensor(color);
}

// Converts an array[3] colors to an integer with 24 bits
// Assumes color is well behaved ([0-255, 0-255, 0-255])
function squashColor(color){
  return color[0]<<16 | color[1]<<8 | color[2];
}

// Generates and array of #count [data, label] pairs
function generateData(count) {
  function generateRandomChannelValue() {
    return Math.floor(Math.random() * 256);
  }
  count = Math.max(0, count);
  
  const rawInput = new Array(count);
  const rawLabels = new Array(count);
  
  for (let i = 0; i < count; i++) {
    rawInput[i] = [generateRandomChannelValue(),
                   generateRandomChannelValue(),
                   generateRandomChannelValue()];
    if (!forbiddenColors.has(squashColor(rawInput[i]))) {
      rawLabels[i] = normalizeColor(computeComplementaryColor(rawInput[i]));
      rawInput[i] = normalizeColor(rawInput[i]);
    } else 
      i--;
  }
  return [rawInput, rawLabels];
}

// Generates the sharp code of a color (Ex: #0FAB10)
// color: number[3]
function sharpRGBColor(color) {
  color = [...Array(color.length).keys()].map(v => Math.round(color[v]));
  return "#" + ("0" + color[0].toString(16)).slice(-2)
             + ("0" + color[1].toString(16)).slice(-2)
             + ("0" + color[2].toString(16)).slice(-2);
}

// Total training time in minutes
function totalTime() {
  if (startTrainingTime == null)
    return 0.0;

  var now = new Date;  
  return (now.getTime() - startTrainingTime.getTime())/60000;
}

// On every frame, we train and then maybe update the UI.
function updateUI() {
  /*
   * Takes a color, gets its prediction as a tensor, denormalize it and converts to an RGB color
   */
  function modelPredict(color) {
    var normalizedColor = tf.tidy(() => {
      const tensorColor = tf.tensor2d([normalizeColor(color)]);
      const predictedColor = model.predict(tensorColor);
      return tensor2color(predictedColor);
    });
    // Forces the predicted color to be within bounds [0-1], same code as below, but clearer
    // normalizedColor = [...Array(normalizedColor.length).keys()].map(v => Math.max(Math.min(normalizedColor[v], 1), 0));
    for (let i = 0; i < normalizedColor.length; i++)
      normalizedColor[i] = Math.max(Math.min(normalizedColor[i], 1), 0);

    return denormalizeColor(normalizedColor);
  }

  // Single color 'cost'
  function colorCost(prediction, label) {
    // Prediction and label are RGB colors, use loss(tensor, tensor) to calculate single
    // color loss
    return tf.tidy(() => {
      const predictionTensor = tf.tensor2d([normalizeColor(prediction)]);
      const labelTensor = tf.tensor2d([normalizeColor(label)]);
      const tensorLoss = loss(predictionTensor, labelTensor);
      return tensorLoss.get();
    });
  }

  function addColor(color, colorVector) {
    if (colorVector.length == MAX_COLORS)
      colorVector.shift();
    colorVector.push(color);
    return colorVector.length;
  }

  if (noUpdate)
    return;

  // Updates the table of the predicted complements
  const colorRows = document.querySelectorAll('tr[data-original-color]');

  for (let i = 0; i < colorRows.length; i++) {
    const rowElement = colorRows[i];
    const tds = rowElement.querySelectorAll('td');
    const originalColor =
        rowElement.getAttribute('data-original-color')
            .split(',')
            .map(v => parseInt(v, 10));

    // Visualize the predicted color.
    const predictedColor = modelPredict(originalColor);
    populateContainerWithColor(
        tds[2], predictedColor[0], predictedColor[1], predictedColor[2]);
  }

  // Updates outer ring of predicted colors
  const svgElements = d3.select(svgID);
  svgElements.selectAll(".predicted")
      .style("fill",
        function(d){
          const originalColor = [parseInt(d.data.color.slice(1,3), 16),
                                 parseInt(d.data.color.slice(3,5), 16),
                                 parseInt(d.data.color.slice(5,7), 16)];
          predicted = modelPredict(originalColor);
          d.data.cost = colorCost(predicted, originalColor);
          return sharpRGBColor(predicted);
         });

  // Deletes all temporary text
  svgElements.selectAll(".tempText").remove();
  // And create new labels
  svgElements
    .append("text")
      .attr("x", -120)
      .attr("y", -30)
      .attr("class", "tempText")
      .attr("font-size", "36px")
      .style("fill", "black")
      // Step Count
      .text("Step "+step);
  svgElements
    .append("text")
      .attr("x", -120)
      .attr("y",  20)
      .attr("class", "tempText")
      .attr("font-size", "36px")
      .style("fill", "black")
      // Current cost
      .text("Cost "+cost.toLocaleString("en", {maximumFractionDigits: 8}));
  svgElements
    .append("text")
      .attr("x", -120)
      .attr("y",  70)
      .attr("class", "tempText")
      .attr("font-size", "36px")
      .style("fill", "black")
      // Current time
      .text("Time "+totalTime().toLocaleString("en", {maximumFractionDigits: 8}));
  // Updates color labels
  svgElements.selectAll(".predicted")
      .each(function(d, i){
        svgElements
            .append("text")
            .attr("class", "tempText txPr")
            .append("textPath")
            .attr("xlink:href", "#pr"+i)
            .append("tspan")
            .attr("dy", -10)
            .attr("dx", 95)
            .attr("text-anchor", "middle")
            .text(function(d){return svgElements.select("#pr"+i).style("fill").slice(4,-1);});
        return false;
      });

  // Adds color sample bars
  for (let i = 0; i < sampleList.length; i++) {
    addColor(svgElements.select("#pr"+sampleList[i]).style("fill"), sampledColors[i]);
    svgElements.select("#grad"+i).selectAll("stop").remove();
    var stops = svgElements.select("#grad"+i).selectAll("stop").data(sampled2stops(sampledColors[i]));
    stops.exit();
    stops.enter().append('stop');
    d3.select(svgID).selectAll("stop")
      .attr("offset", function(d, i){return d[0];})
      .attr("stop-color", function(d){return d[1];})
      
  }
}

/*
 * Loss function on tensors, Mean Squared Error
 */
function loss(predictions, labels) {
  // Subtract our labels (actual values) from predictions, square the results,
  // and take the mean. Inputs are tensors.
  return tf.tidy(() => {
    const meanSquareError = predictions.sub(labels).square().mean();
    return meanSquareError;
  });
}

// Trains one batch
async function train1Batch() {
  // Reduce the learning rate by 85% every 42 steps
  //currentLearningRate = initialLearningRate * Math.pow(0.85, Math.floor(step/42));
  //model.optimizer.learningRate = currentLearningRate;
  const batchData = generateData(batchSize);
  const dataTensor = color2tensor(batchData[0]);
  const labelTensor = color2tensor(batchData[1]);
  const history = await model.fit(dataTensor, labelTensor,
           {batchSize: batchSize,
            epochs: epochs
           });

  cost = history.history.loss[0];
  tf.dispose(dataTensor, labelTensor);
  return step++;
}

// Trains the model for runsb4Rendering steps and then update the UI
async function trainAndMaybeRender() {
  // message: String
  function finishTrainingAndRendering(message) {
    function flagInterface(status) {
      trigger = document.getElementById("trigger");
      trigger.checked = !status;
      document.getElementById("startStop").innerHTML = status?"Start":"Stop";
      document.getElementById("update").disabled = false;
    }

    if (noUpdate) {
      noUpdate = false;
      updateUI();
    }

    noTrain = true;
    reachLimit = true;
    flagInterface(true);
    console.log(message);
    console.log(totalTime());
  }
  // Stops at a certain setpLimit or costTarget, whatever happens first
  if (noTrain)
    return;
  // If stepLimit was reached, finishTrainAndRendering
  if (step >= stepLimit) {
    finishTrainingAndRendering(`Reached step limit (${stepLimit})\nCost: ${cost}`);
    d3.select("#step_range").classed("finish", true);
    // Stop training.
    return;
  }
  // If cost target was reached, finishTrainAnd
  if (cost <= costTarget) {
    finishTrainingAndRendering(`Reached cost target (${costTarget})\nCost: ${cost} Step:${step}`);
    d3.select("#cost_range").classed("finish", true);
    // Stop training
    return;
  }
  // We only update the UI after runsb4Rendering steps
  for (let i = 0; i < runsb4Rendering; i++)
    await train1Batch();
  updateUI();

  // Schedule the next batch to be trained.
  requestAnimationFrame(trainAndMaybeRender);  
}

// Populates hidden table container with a RGB color
// container: HTMLElement
// r: number (0-255)
// g: number (0-255)
// b: number (0-255)
function populateContainerWithColor(
    container, r, g, b) {
  const originalColorString = 'rgb(' + [r, g, b].join(',') + ')';
  container.textContent = originalColorString;

  const colorBox = document.createElement('div');
  colorBox.classList.add('color-box');
  colorBox.style.background = originalColorString;
  container.appendChild(colorBox);
}

// convert SampledColors to gradient stops
function sampled2stops(sampled) {
  var stops = [];
  const numSamples = sampled.length;
  var cutSize = 1 / numSamples;
   stops.push([0, sampled[0]]);
  stops.push([cutSize, sampled[0]]);
   for (let i = 1; i < numSamples; i++) {
    stops.push([(cutSize*i)+INTERSECTION, sampled[i]]);
    stops.push([cutSize*(i+1), sampled[i]]);
  }
  return stops;
}

// Initialize graphical Interface
function initializeUi() {
  // testColors will record the colors in the table,
  // to be lter used in the inner color doughnut
  var testColors = [],
      gradStops = [];
  const colorRows = document.querySelectorAll('tr[data-original-color]');

  // Populate table colors
  for (let i = 0; i < colorRows.length; i++) {
    const rowElement = colorRows[i];
    const tds = rowElement.querySelectorAll('td');
    const originalColor =
        rowElement.getAttribute('data-original-color')
            .split(',')
            .map(v => parseInt(v, 10));

    // Visualize the original color.
    populateContainerWithColor(
        tds[0], originalColor[0], originalColor[1], originalColor[2]);

    // Visualize the complementary color.
    const complement = computeComplementaryColor(originalColor);
    populateContainerWithColor(
        tds[1], complement[0], complement[1], complement[2]);
    // In a sense, value is not strictly necessary, as every slice will be the same
    // size. Either we use the same value here for all slices or omit value and change
    // the pie call later to .value(function(d){return 42;}) (or any constant)
    // We decided to use value, just because it makes easier to change the visualization
    // later on the road if the need be.
    testColors.push({color: sharpRGBColor(originalColor), value: 42});
    forbiddenColors.add(squashColor(originalColor));
  }
  // Initialize d3 elements
  d3.select("#svgWheel").append("svg").attr("id", "DLCCP");
  var svg = d3.select(svgID);
  var arc = [d3.arc().innerRadius(250).outerRadius(320),
             d3.arc().innerRadius(350).outerRadius(420),
             d3.arc().innerRadius(450).outerRadius(520)];
  var pie = d3.pie().value(function(d){return d.value;}).sort(null);
  // Creates the inner color donut
  // const widthHeight = Math.min(window.innerHeight, window.innerWidth);
  // Sets SVG parameters and draws the three color donuts
  const SVGviewBox = svg.attr("viewBox").split(" ").map(function(dim){return +dim;});
  const factor = (window.innerHeight * 0.9) / SVGviewBox[3];
  svg.attr("width", SVGviewBox[2]*factor).attr("height", SVGviewBox[3]*factor);

  svg.selectAll("original")
        .data(pie(testColors))
        .enter()
        .append("path")
        .attr("d", arc[0])
        .style("fill", function(d){return d.data.color;})
        .attr("id", function(d, i){return "or"+i;})
        .attr("class", "original color");
  // Creates the middle complementary color donut
  svg.selectAll("complement")
        .data(pie(testColors))
        .enter()
        .append("path")
        .attr("d", arc[1])
        .style("fill", function(d){return actualComplement(d.data.color);})
        .attr("id", function(d, i){return "co"+i;})
        .attr("class", "complement color");
  // Creates the outer predicted color donut
  svg.selectAll("predicted")
        .data(pie(testColors))
        .enter()
        .append("path")
        .attr("d", arc[2])
        .style("fill", sharpRGBColor(STARTCOLOR))
        .attr("id", function(d, i){return "pr"+i;})
        .attr("class", "predicted color");
  // Creates the labels for the original colors
  svg.selectAll(".original")
    .each(function(d, i){
      svg.append("text")
          .attr("class", "txOr")
          .append("textPath")
          .attr("xlink:href", "#or"+i)
          .append("tspan")
          .attr("dy", -10)
          .attr("dx", 58)
          .attr("text-anchor", "middle")
          .text(function(){return svg.select("#or"+i).style("fill").slice(4,-1);});
      return false;
    });
  // Creates the labels for the complementary colors
  svg.selectAll(".complement")
    .each(function(d, i){
      svg.append("text")
          .attr("class", "txCo")
          .append("textPath")
          .attr("xlink:href", "#co"+i)
          .append("tspan")
          .attr("dy", -10)
          .attr("dx", 78)
          .attr("text-anchor", "middle")
          .text(function(){return svg.select("#co"+i).style("fill").slice(4,-1);});
      return false;
    });

  // Creates the labels for the pretidcte colors
  svg.selectAll(".predicted")
      .each(function(d, i){
        svg
          .append("text")
          .attr("class", "tempText txPr")
          .append("textPath")
          .attr("xlink:href", "#pr"+i) 
          .append("tspan")
          .attr("dy", -10)
          .attr("dx", 95)
          .attr("text-anchor", "middle")
          .text(function(){return svg.select("#pr"+i).style("fill").slice(4,-1);});
        return false;
      });

  // Adds color sample bars
  for (let i = 0; i < sampleList.length; i++) {
    // Color sample band
    svg.append("rect")
      .style("fill", "url(#grad"+i+")")
      .attr("class", "color sampleBand")
      .attr("id", "pr"+sampleList[i]+"M")
      .attr("x", -550)
      .attr("y", 570+(COLORBAND*i))
      .attr("width", 1050)
      .attr("height", COLORBAND);
    // Target color
    svg.append("rect")
      .style("fill", function(){return svg.select("#co"+sampleList[i]).style("fill");})
      .attr("class", "color reference")
      .attr("id", "co"+i+"M")
      .attr("x", 503)
      .attr("y", 570+(COLORBAND*i))
      .attr("width", 50)
      .attr("height", COLORBAND);
     gradStops.push(sampled2stops([svg.select("#pr"+sampleList[i]).style("fill")]));
    var gradient = svg.select("#Gdefs").append("linearGradient")
                      .attr("id", "grad"+i)
                      .attr("x1", "0%")
                      .attr("x2", "100%")
                      .attr("y1", "0%")
                      .attr("y2", "0%");
     gradient.selectAll("stop").data(gradStops[i]).enter().append("stop")
      .attr("offset", function(d, i){return d[0];})
      .attr("stop-color", function(d){return d[1];})
      .attr("stop-opacity", 1);
  }

  // Add annotations
  const annotations = [{
    note: { label: "Original colors (RGB)"},
    x: 272, y: -212,
    dy: -266, dx: 95
  },{
    note: { label: "Computed complementary colors (RGB)"},
    x: 425, y: -130,
    dy: -146, dx: 52
  },{
    note: { label: "Predicted colors (RGB)"},
    x: 438, y: -328,
    dy: -70, dx: 25
  },{
    note: { label: "Latest 200 rendered color predictions"},
    x: 300, y: 565,
    dy: -80, dx: 65
  },{
    note: { label: "Color reference"},
    x: 525, y: 565,
    dy: -30, dx: -25
  }];

  const makeAnnotations = d3.annotation().annotations(annotations);
  svg.append("g").attr("class", "annotation-group").call(makeAnnotations);

  // Makes the first prediction, with the model still untrained
  //updateUI();
  // Computes the complementary color of an input string in the #rrggbb format and returns
  // the complementary color on the same notation
  function actualComplement(color) {
    const originalColor = [parseInt(color.slice(1,3), 16),
                           parseInt(color.slice(3,5), 16),
                           parseInt(color.slice(5,7), 16)];
    const complement = computeComplementaryColor(originalColor);
    return sharpRGBColor(complement);
  }
}

// Called when user clicks on Start/Stop button
function switchStartStop() {
  const startStopTrigger = document.getElementById("trigger");
  noTrain = !noTrain;
  document.getElementById("startStop").innerHTML = noTrain?"Start":"Stop";
  if (noTrain == false) {
    if (reachLimit) {
      reachLimit = false;
      d3.select("#step_range").classed("finish", false);
      d3.select("#cost_range").classed("finish", false);
    }
    document.getElementById("update").disabled = true;
    requestAnimationFrame(trainAndMaybeRender);
  } else
      document.getElementById("update").disabled = false;
}

// Actually starts the network training, when button is in Start mode
function startIt() {
  //document.getElementById("trigger").disabled = true;
  //document.getElementById("learning_range").disabled = true;
  d3.selectAll(".freeze").attr("disabled", "");
  var trigger = document.getElementById("trigger");
  trigger.removeEventListener("click", startIt, true);
  trigger.addEventListener("click", switchStartStop, true);

  document.getElementById("startStop").innerHTML = noTrain?"Start":"Stop";
  document.getElementById("update").disabled = !noTrain;
  startTrainingTime = new Date();
    // Compile the model
  const optimizer = tf.train.momentum(learningRate, MOMENTUM, true);
  model.compile({optimizer: optimizer,
                 loss: loss,
                 metrics: ['accuracy']
                });
  updateUI();
  setTimeout(function(){requestAnimationFrame(trainAndMaybeRender);}, 1000);
}

// Model layers
function modelInit() {
  //Add input layer
  // First layer must have an input shape defined.
  model.add(tf.layers.dense({units: 3,
                            inputShape: [3]}));
  // Afterwards, TF.js does automatic shape inference.
  model.add(tf.layers.dense({units: 64,
                             activation: 'relu'
                           }));
  // Afterwards, TF.js does automatic shape inference.
  model.add(tf.layers.dense({units: 32,
                             activation: 'relu'
                           }));
  // Afterwards, TF.js does automatic shape inference.
  model.add(tf.layers.dense({units: 16,
                             activation: 'relu'
                           }));
  // Afterwards, TF.js does automatic shape inference.
  model.add(tf.layers.dense({units: 3
                           }));
}

// Variables that are reset at every rerun
function varReset() {
  step = 0;
  cost = +Infinity;
  reachLimit = false;
  noTrain = false;
  noUpdate = false;
  model = tf.sequential();
  startTrainingTime = null;
  sampledColors = [];
  for (let i = 0; i < sampleList.length; i++)
    sampledColors.push([]);

}

// Reset environment before reruning
function resetEnvironment() {
  const tableElements = d3.select("#MLPlay");
  const svgElements = d3.select(svgID);
  tf.disposeVariables();
  varReset();
  // updateInterface();
  modelInit();
  tableElements.selectAll(".freeze").attr("disabled", null);
  //document.getElementById("learning_range").disabled = false;
  tableElements.selectAll(".finish").classed("finish", false);
  svgElements.selectAll(".tempText").remove();
  svgElements.selectAll(".predicted")
      .style("fill", sharpRGBColor(STARTCOLOR))
      .attr("id", function(d, i){return "pr"+i;})
      .attr("class", "predicted color");
  // Creates the labels for the predicted colors
  svgElements.selectAll(".predicted")
      .each(function(d, i){
        svgElements
            .append("text")
            .attr("class", "tempText txPr")
            .append("textPath")
            .attr("xlink:href", "#pr"+i)
            .append("tspan")
            .attr("dy", -10)
            .attr("dx", 95)
            .attr("text-anchor", "middle")
            .text(function(d){return svgElements.select("#pr"+i).style("fill").slice(4,-1);});
        return false;
      });
  // Reset color sample bars
  for (let i = 0; i < sampleList.length; i++) {
    svgElements.select("#grad"+i).selectAll("stop").remove();
    var gradStops = sampled2stops([svgElements.select("#pr"+sampleList[i]).style("fill")]);
    var gradient = svgElements.select("#grad"+i);
    gradient.selectAll("stop").data(gradStops).enter().append("stop")
      .attr("offset", function(d, i){return d[0];})
      .attr("stop-color", function(d){return d[1];})
      .attr("stop-opacity", 1);
  }

  var resetButton = document.getElementById("update");
  resetButton.disabled = true;
  resetButton.checked = true;
  // Start button
  var triggerButton = document.getElementById("trigger");
  trigger.removeEventListener("click", switchStartStop, true);
  trigger.addEventListener("click", startIt, true);
}

// Initial values, not reset at reruns
function initValues() {
  learningRate = 42e-2;
  batchSize = 10;
  runsb4Rendering = 5;
  epochs = 2;
  stepLimit = 1000;
  costTarget = 5e-4;
  forbiddenColors = new Set();
  tooltipSVG = d3.select("body")
                 .append("div")
                 .classed("svgTip", true)
                 .html("Machine Play");
  sampleList = ["0", "5", "1", "8", "14"];
  varReset();
}

// Set interface hooks before starting
function setInterfaceHooks() {
  // Start button
  document.getElementById("trigger")
          .addEventListener("click", startIt, true);
  // Render button
  document.getElementById("update")
          .addEventListener("click", resetEnvironment, true);
  // Learning rate slider
  var learningSlider = document.getElementById("learning_range");
  var learningOutput = document.getElementById("learning_val");
  learningSlider.value = learningOutput.innerHTML = learningRate;
  
  learningSlider.oninput = function() {
    learningOutput.innerHTML = this.value;
    learningRate = +this.value;
  };
  // Batch size slider
  var batchSlider = document.getElementById("batch_range");
  var batchOuput = document.getElementById("batch_val");
  batchSlider.value = batchOuput.innerHTML = batchSize;

  batchSlider.oninput = function() {
    batchOuput.innerHTML = this.value;
    batchSize = +this.value;
  };
  // Epochs slider
  var epochsSlider = document.getElementById("epochs_range");
  var epochsOuput = document.getElementById("epochs_val");
  epochsSlider.value = epochsOuput.innerHTML = epochs;

  epochsSlider.oninput = function() {
    epochsOuput.innerHTML = this.value;
    epochs = +this.value;
  };
  // Render interval slider
  var renderSlider = document.getElementById("render_range");
  var renderOuput = document.getElementById("render_val");
  renderSlider.value = renderOuput.innerHTML = runsb4Rendering;

  renderSlider.oninput = function() {
    renderOuput.innerHTML = this.value;
    runsb4Rendering = +this.value;
  };
  // Step limit slider
  var stepSlider = document.getElementById("step_range");
  var stepOuput = document.getElementById("step_val");
  stepSlider.value = stepOuput.innerHTML = stepLimit;

  stepSlider.oninput = function() {
    stepOuput.innerHTML = this.value;
    stepLimit = +this.value;
    if (stepLimit <= step)
      d3.select("#step_range").classed("finish", true);
    else
      d3.select("#step_range").classed("finish", false);
  };
  // Cost target slider
  var costSlider = document.getElementById("cost_range");
  var costOuput = document.getElementById("cost_val");
  costSlider.value = costOuput.innerHTML = costTarget;

  costSlider.oninput = function() {
    costOuput.innerHTML = this.value;
    costTarget = +this.value;
    if (costTarget >= cost)
      d3.select("#cost_range").classed("finish", true);
    else
      d3.select("#cost_range").classed("finish", false);
  };

  // SVG mouseover, mousemove and mouseout callbacks 
  function mouseoverSVG(d) {
    if (d3.select(this).classed("predicted"))
      tooltipSVG.html("Predicted colors");
    else if (d3.select(this).classed("complement"))
      tooltipSVG.html("Complementary colors");
    else if (d3.select(this).classed("original"))
      tooltipSVG.html("Original colors");
    else if (d3.select(this).classed("sampleBand"))
      tooltipSVG.html("Latest " + MAX_COLORS +" rendered color predictions");
    else
      tooltipSVG.html("Color reference (predictions should be as close to the reference as possible)");
    return tooltipSVG.style("visibility", "visible");
  }

  function mousemoveSVG(d) {
    return tooltipSVG.style("top", (d3.event.pageY-20)+"px")
      .style("left",(d3.event.pageX+25)+"px");
  }

  function mouseoutSVG(d) {
        return tooltipSVG.style("visibility", "hidden");
  }

  // Set SVG callbacks
  d3.select(svgID).selectAll(".color")
    .on("mouseover", mouseoverSVG)
    .on("mousemove", mousemoveSVG)
    .on("mouseout", mouseoutSVG);
}

// Action begins here
initValues();
modelInit();
initializeUi();
setInterfaceHooks();