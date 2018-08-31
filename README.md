# Explaining neural network training concepts through an interactive visualization
## Using a neural network for complementary color prediction
<pre>
Authors

Roberto Stelling BCS - Universidade Federal do Rio de Janeiro
Mestrado PPGI - Graduate Student

Adriana Vivacqua PhD - Universidade Federal do Rio de Janeiro
Mestrado PPGI - University Professor
</pre>

## Abstract
With [Machine Play](https://github.com/RobStelling/machineplay) we explore interactive data visualization as a mean to help users understand a training method of a Neural Network. The visualization let the users interact with the neural network training procedure, changing parameters and viewing results as they are shown on the browser. As most machine learning and neural network methods are opaque and hard to understand by the public in general, we explore this visualization as a way to teach the techniques and concepts around neural network model training, visually exposing the behaviour of the training algorithm to the users playing with the visualization. In this article we describe one particular exploration, using the problem of predicting the complementary color of a RGB color, implemented as a neural network model.

**Machine Play Screenshot**

![Final screen](/images/MPSshot.png)

The inner circle displays the original RGB colors, the middle circle displays the corresponding complementary colors and the outer circle displays the predicted colors by the neural network.

The 5 bands on the lower side displays the model last 200 sampled predictions and, on the right side of the bands, the desired predicted colors as a refence.

The text in the middle of the circle tells how many steps where necessary to reach the current stage, the value of the cost function and the time, in minutes, that it took for the network to reach the current stage.
