function controls(suffix, data) {

  if (data == null)
  	data = {};
  if (data.learningRate == undefined)
	data.learningRate = learningRate;
  if (data.batchSize == undefined)
	data.batchSize = batchSize;
  if (data.runsb4Rendering == undefined)
  	data.runsb4Rendering = runsb4Rendering;
  if (data.stepLimit == undefined)
  	data.stepLimit = stepLimit;
  if (data.costTarget == undefined)
  	data.costTarget = costTarget;
  if (data.step == undefined)
  	data.step = step;
  if (data.cost == undefined)
  	data.cost = cost;
  if (data.demo == undefined)
  	data.demo = false;
  // Start button
  document.getElementById("trigger"+suffix)
          .addEventListener("click", function(){
          	const startStop = document.getElementById("startStop"+suffix);
          	if (startStop.innerText == "Start") {
          		if (d3.select(".finish."+suffix)._groups[0][0] == null) {
		          	d3.selectAll(".demo.freeze."+suffix).attr("disabled", "");
		          	startStop.innerText = "Stop";
	          		d3.select("#update"+suffix).attr("disabled", "");
          		} else
          			document.getElementById("trigger"+suffix).checked = false;
          	} else {
          		startStop.innerText = "Start";
          		d3.select("#update"+suffix).attr("disabled", null);
          	}
          }, true);
  // Render button
  document.getElementById("update"+suffix)
          .addEventListener("click", function(){
          	d3.selectAll(".demo.freeze."+suffix).attr("disabled", null);
          	d3.selectAll(".demo.finish."+suffix).classed("finish", false);
          	const updateButton = document.getElementById("update"+suffix)
          	updateButton.checked = true;
          	updateButton.disabled = true;
          }, true);
  // Learning rate slider
  const learningSlider = document.getElementById("learning_range"+suffix);
  const learningOutput = document.getElementById("learning_val"+suffix);
  learningSlider.value = learningOutput.innerHTML = data.learningRate;
  
  learningSlider.oninput = function() {
    learningOutput.innerHTML = this.value;
  };
  // Batch size slider
  const batchSlider = document.getElementById("batch_range"+suffix);
  const batchOuput = document.getElementById("batch_val"+suffix);
  batchSlider.value = batchOuput.innerHTML = data.batchSize;

  batchSlider.oninput = function() {
    batchOuput.innerHTML = this.value;
  };
  // Render interval slider
  const renderSlider = document.getElementById("render_range"+suffix);
  const renderOuput = document.getElementById("render_val"+suffix);
  renderSlider.value = renderOuput.innerHTML = data.runsb4Rendering;

  renderSlider.oninput = function() {
    renderOuput.innerHTML = this.value;
  };
  // Step limit slider
  const stepSlider = document.getElementById("step_range"+suffix);
  const stepOuput = document.getElementById("step_val"+suffix);
  stepSlider.value = stepOuput.innerHTML = data.stepLimit;

  stepSlider.oninput = function() {
    stepOuput.innerHTML = this.value;
    data.stepLimit = +this.value;
    if (data.stepLimit <= data.step)
      d3.select("#step_range"+suffix).classed("finish", true);
    else
      d3.select("#step_range"+suffix).classed("finish", false);
  };
  // Cost target slider
  const costSlider = document.getElementById("cost_range"+suffix);
  const costOuput = document.getElementById("cost_val"+suffix);
  costSlider.value = costOuput.innerHTML = data.costTarget;

  costSlider.oninput = function() {
    costOuput.innerHTML = this.value;
    data.costTarget = +this.value;
    if (data.costTarget >= data.cost)
      d3.select("#cost_range"+suffix).classed("finish", true);
    else
      d3.select("#cost_range"+suffix).classed("finish", false);
  };
}

function svgTooltips() {
  // SVG mouseover, mousemove and mouseout callbacks 
  function mouseoverSVG(d) {
    if (d3.select(this).classed("predictedDemo"))
      tooltipSVG.html("Predicted colors");
    else if (d3.select(this).classed("complementDemo"))
      tooltipSVG.html("Complementary colors");
    else
      tooltipSVG.html("Original colors");
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
  d3.selectAll(".colorDemo")
    .on("mouseover", mouseoverSVG)
    .on("mousemove", mousemoveSVG)
    .on("mouseout", mouseoutSVG);
}