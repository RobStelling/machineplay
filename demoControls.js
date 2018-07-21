function controls(suffix) {
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
  learningSlider.value = learningOutput.innerHTML = learningRate;
  
  learningSlider.oninput = function() {
    learningOutput.innerHTML = this.value;
  };
  // Batch size slider
  const batchSlider = document.getElementById("batch_range"+suffix);
  const batchOuput = document.getElementById("batch_val"+suffix);
  batchSlider.value = batchOuput.innerHTML = batchSize;

  batchSlider.oninput = function() {
    batchOuput.innerHTML = this.value;
  };
  // Render interval slider
  const renderSlider = document.getElementById("render_range"+suffix);
  const renderOuput = document.getElementById("render_val"+suffix);
  renderSlider.value = renderOuput.innerHTML = runsb4Rendering;

  renderSlider.oninput = function() {
    renderOuput.innerHTML = this.value;
  };
  // Step limit slider
  const stepSlider = document.getElementById("step_range"+suffix);
  const stepOuput = document.getElementById("step_val"+suffix);
  stepSlider.value = stepOuput.innerHTML = stepLimit;

  stepSlider.oninput = function() {
    stepOuput.innerHTML = this.value;
    if (stepLimit <= step)
      d3.select("#step_range").classed("finish", true);
    else
      d3.select("#step_range").classed("finish", false);
  };
  // Cost target slider
  const costSlider = document.getElementById("cost_range"+suffix);
  const costOuput = document.getElementById("cost_val"+suffix);
  costSlider.value = costOuput.innerHTML = costTarget;

  costSlider.oninput = function() {
    costOuput.innerHTML = this.value;
    if (costTarget >= cost)
      d3.select("#cost_range").classed("finish", true);
    else
      d3.select("#cost_range").classed("finish", false);
  };
}