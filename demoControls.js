
// Controls for the mockup menus
function controls(suffix, data) {
  // Converts a RGB string in the format rgb(r, g, b) to a vector = [r, g, b]
	function rgb2color(rgb) {
		var rgbcolor = rgb.slice(4, -1).split(",");
		return [...Array(3).keys()].map(v => +rgbcolor[v]); 
	}

  // Returns 1 or -1, the smaller the cut, the greater the probatility of return 1
	function oneMinusOne(cut) {
		return Math.random() > cut ? 1 : -1;
	}

  // Returns a color with some noise, uses data.cost to control the amount of noise
	function colorNoise(color) {
		const noise = data.cost*255*(Math.random()/3);
		const nColor = normalizeColor(color);
		const noiseColor = [...Array(3).keys()].map(v => Math.min(1, Math.max(0, nColor[v]+(noise*oneMinusOne(0.5)))));
		return denormalizeColor(noiseColor);
	}


  // Updates a mockup interface
	function updateMockupUI() {
		const svgElements = d3.select("#svg"+suffix);
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
	      .text("Step "+data.step);
	  svgElements
	    .append("text")
	      .attr("x", -120)
	      .attr("y",  20)
	      .attr("class", "tempText")
	      .attr("font-size", "36px")
	      .style("fill", "black")
	      // Current cost
	      .text("Cost "+data.cost.toLocaleString("en", {maximumFractionDigits: 8}));
	  svgElements
	    .append("text")
	      .attr("x", -120)
	      .attr("y",  70)
	      .attr("class", "tempText")
	      .attr("font-size", "36px")
	      .style("fill", "black")
	      // Current cost
	      .text("Time "+data.time.toLocaleString("en", {maximumFractionDigits: 8}));

	  svgElements.selectAll(".predictedDemo")
	  	.each(function(d, i) {
	  		color = svgElements.select("#co"+i).style("fill");
	  		const newColor = colorNoise(rgb2color(color));
	  		svgElements.select("#pr"+i).style("fill", sharpRGBColor(newColor));
	  	});

	  svgElements.selectAll(".predictedDemo")
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

	}

  //
  function demoMockup() {
  	function mockupResetControls() {
  			document.getElementById("trigger"+suffix).checked = false;
  			document.getElementById("startStop"+suffix).innerText = "Start";
  			document.getElementById("update"+suffix).disabled = false;
  	}
  	if (data.run) {
  		updateMockupUI();
  		if (data.cost <= data.costTarget) {
  			data.run = false;
  			d3.select("#cost_range"+suffix).classed("finish", true);
  			mockupResetControls();
  		} else if (data.step >= data.stepLimit) {
  			data.run = false;
  			d3.select("#step_range"+suffix).classed("finish", true);
  			mockupResetControls();
  		} else {
	  		const duration = Math.max(1000, data.runsb4Rendering * data.batchSize);
	  		data.step += data.runsb4Rendering;
	  		data.time += duration/(1000*60);
        if (data.cost == +Infinity)
          data.cost = 0.01;
	  		data.cost = data.cost + (data.cost * data.learningRate * oneMinusOne(1-data.learningRate));
	  		setTimeout(demoMockup, duration);
	  	}
  	}
  }

  if (data == null)
  	data = {};
  if (data.learningRate == undefined)
		data.learningRate = learningRate;
  if (data.batchSize == undefined)
		data.batchSize = batchSize;
	if (data.epochs == undefined)
		data.epochs = epochs;
  if (data.runsb4Rendering == undefined)
  	data.runsb4Rendering = runsb4Rendering;
  if (data.stepLimit == undefined)
  	data.stepLimit = stepLimit;
  if (data.costTarget == undefined)
  	data.costTarget = costTarget;
  if (data.step == undefined)
  	data.step = 0;
  if (data.cost == undefined)
  	data.cost = +Infinity;
  if (data.demo == undefined)
  	data.demo = false;
  if (data.time == undefined)
  	data.time = 0;
  // Start button
  document.getElementById("trigger"+suffix)
  	.addEventListener("click", function(){
    	const startStop = document.getElementById("startStop"+suffix);
    	if (startStop.innerText.trim() == "Start") {
    		if (d3.select(".finish."+suffix)._groups[0][0] == null) {
        	d3.selectAll(".demo.freeze."+suffix).attr("disabled", "");
        	startStop.innerText = "Stop";
      		d3.select("#update"+suffix).attr("disabled", "");
      		if (data.demo) {
      			data.run = true;
      			demoMockup();
      		}
    		} else
    			document.getElementById("trigger"+suffix).checked = false;
    	} else {
    		startStop.innerText = "Start";
    		d3.select("#update"+suffix).attr("disabled", null);
    		data.run = false;
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
	  	if (data.demo) {
	  		data.run = false;
	  		data.cost = +Infinity;
	  		data.step = 0;
	  		data.time = 0;
	  		const demoSVG = d3.select("#svg"+suffix);
	  		demoSVG.selectAll(".tempText").remove();
	  		demoSVG.selectAll(".predictedDemo")
	  			.style("fill", sharpRGBColor([200,200,200]))
	    	.each(function(d, i){
	      	demoSVG
	        	.append("text")
	        	.attr("class", "tempText txPr")
	        	.append("textPath")
	        	.attr("xlink:href", "#pr"+i)
	        	.append("tspan")
	        	.attr("dy", -10)
	        	.attr("dx", 95)
	        	.attr("text-anchor", "middle")
	        	.text(function(d){return d3.select("#svg"+suffix).select("#pr"+i).style("fill").slice(4,-1);});
	      	return false;
	    	});
	  	}
	  }, true);
  // Learning rate slider
  const learningSlider = document.getElementById("learning_range"+suffix);
  const learningOutput = document.getElementById("learning_val"+suffix);
  learningSlider.value = learningOutput.innerHTML = data.learningRate;
  
  learningSlider.oninput = function() {
    learningOutput.innerHTML = this.value;
    data.learningRate = +this.value;
  };
  // Batch size slider
  const batchSlider = document.getElementById("batch_range"+suffix);
  const batchOuput = document.getElementById("batch_val"+suffix);
  batchSlider.value = batchOuput.innerHTML = data.batchSize;

  batchSlider.oninput = function() {
    batchOuput.innerHTML = this.value;
    data.batchSize = +this.value;
  };
  // Epochs slider
  const epochsSlider = document.getElementById("epochs_range"+suffix);
  const epochsOuput = document.getElementById("epochs_val"+suffix);
  epochsSlider.value = epochsOuput.innerHTML = data.epochs;

  epochsSlider.oninput = function() {
    epochsOuput.innerHTML = this.value;
    data.epochs = +this.value;
  };

  // Render interval slider
  const renderSlider = document.getElementById("render_range"+suffix);
  const renderOuput = document.getElementById("render_val"+suffix);
  renderSlider.value = renderOuput.innerHTML = data.runsb4Rendering;

  renderSlider.oninput = function() {
    renderOuput.innerHTML = this.value;
    data.runsb4Rendering = +this.value;
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

// Tooltips for SVG elements
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