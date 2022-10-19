/* 
 * Class to handle bar charts with potentially multiple data sources and up to two Y scales (but
 * only one X scale). Multiple data sets can be stacked against each scale.
 * 
 * Uses D3 but simplifies the interface.
 * 
 * Will handle multiple data sets against two Y scales (on left and right) but only one X scale.
 * Will handle overlaying bubble charts (only actually tested with one) that uses the same X scale
 * 
 * May be necessary to control opacity of overlaying charts to ensure the lower layers are visible.
 * This is set in the CSS properties, not here
 */

const HEIGHT_FACTOR = 0.8; //height is only this fraction of window to allow for nav etc.
const MARGIN_FACTOR = 20; //margin is width/MARGIN_FACTOR
const SCALE_FACTOR = 0.75; //seems we need (about) this to make it fit properly in the window
const COL_PADDING = 0.4; //proportion of column width used as inter-column spacing

const BUBBLE_TEXT_Y_SHIFT = 8; //how much to 'randomly' shift text up/down on bubble labels to minimise chance of overlap
const BUBBLE_RADIUS_FACTOR = 1000; //Control bubble width - smaller -> bigger bubbles
const BUBBLE_X_SHIFT = 25; //Factor to shift bubbles so they're centered on columns - bigger -> move right
const BUBBLE_Y_SCALE_FACTOR = 12; //Controls how far bubble columns start/end from top/bottom of window
const BOX_MIN_HEIGHT = 3; //The smallest box height in a box plot (to avoid it turning into a single line
const BOX_MEDIAN_OVERHANG = 20; //How much the median line extends outside the box in a box plot (when the line is at the top/bottom)
const AVERAGE_DOT_SIZE = 10; //How big is the 'dot' indicating the average in a box plot



class Chart {
    xScale = null;            //The (common) Y Scale - set by the first call to either left or right scale data method
    yLeftScale = null;        //The left-hand Y Scale - used by all 'left scale' data sets
    yRightScale = null;       //As above but the right scale

    height;                   //height, width and margin of graph SVG - set based on window width
    width;
    margin;

    leftDataSet = [];         //Data sets used for left, right and bubble data 
    rightDataSet = [];
    leftStackedDataSet = [];
    bubbleDataSet = [];
    boxplotDataSet = [];
    conditionalBarFilter = [];
    lineDataSet = [];

    g;                        //D3 SVG chart variables
    svg;

    chartTitle;               //Text labels - left/right data sets need to share a scale *and* label
    xLabel;
    yLeftLabel;
    yRightLabel;

    /*
     * Minimally we need to know the element that the chart will appear in (by id), and the title of the chart.
     */
    constructor(chartDiv, title) {

        //Set basic properties
        this.chartDiv = chartDiv;
        this.chartTitle = title;
        //We are going to assume one window for now...
        this.width = window.innerWidth;
        this.height = window.innerHeight * HEIGHT_FACTOR;
        this.margin = this.width / MARGIN_FACTOR;

        //Zap anything currently in the target div to prevent overwriting with new data
        d3.selectAll(this.chartDiv).selectAll("*").remove();


        //Create a d3 SVG object that's resizable
        this.svg = d3.select(this.chartDiv).append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("id", this.chartDiv + "_svg")
                .attr("viewBox", "0 0 " + (this.width + this.margin)
                        + " " + (this.height + this.margin))
                .classed("svg-content", true);
        //Move it to be within the window (note originally it was margin + 50)
        this.g = this.svg.append("g")
                .attr("transform",
                        "translate(" + (this.margin) + "," + (this.margin)
                        + ") scale(" + SCALE_FACTOR + ")"); //

    }

    /*
     * 
     * Add the X scale - you need to choose a single data set for this - it does *not*
     * add the data. Optional - if you don't do it the first add Left/Right Scale data
     * call does it for you (handy for cases where there is no bar chart data.
     */
    addXScale(data) {
        this.xScale = d3.scaleBand().range([0, this.width]).padding(COL_PADDING);
        this.xScale.domain(data.map(function (d) {
            return d.X;
        }));
        return this;
    }

    /*
     * Add data set ONLY to define a left-hand scale - you need to 're-add' it to actually appear
     * This makes the code better:-)
     * First set added defines the X scale
     */
    addLeftScaleData(data) {
        if (this.xScale === null) {
            this.xScale = d3.scaleBand().range([0, this.width]).padding(COL_PADDING);
            this.xScale.domain(data.map(function (d) {
                return d.X;
            }));

        }
        this.yLeftScale = d3.scaleLinear().range([this.height, 0]);
        this.yLeftScale.domain([0, d3.max(data, function (d) {
                return d.Y;
            })]);
        return this;
    }

    /*
     * Add data set ONLY to define a right-hand scale - you need to 're-add' it to actually appear
     * This makes the code better:-)
     * First set added defines the X scale
     */
    addRightScaleData(data) {
        if (this.xScale === null) {
            this.xScale = d3.scaleBand().range([0, this.width]).padding(COL_PADDING);
            this.xScale.domain(data.map(function (d) {
                return d.X;
            }));
        }
        this.yRightScale = d3.scaleLinear().range([this.height, 0]);
        this.yRightScale.domain([0, d3.max(data, function (d) {
                return d.Y;
            })]);
        return this;
    }

    /*
     * Add additional 'slave' data sets using the left-hand Y Scale
     */
    addLeftData(data, css, label) {
        this.leftDataSet.unshift({"Data": data, "CSS": css, "Label": label});
        return this;
    }

    addLeftFilterScale(data, css, filterList) {
        var filteredData = data.map(function (e, i) {
            return filterList.includes(i) ? e : {"X": e.X, "Y": 0, "Tip": e.Tip};
        });
        this.addLeftData(filteredData, css, false);
        return this;
    }

    addLeftDataStacked(data, colours, label) {//colours hack!
        this.leftStackedDataSet.unshift({"Data": data, "CSS": colours, "Label": label});
        return this;
    }

    /*
     * Add additional 'slave' data sets using the right-hand Y Scale
     */
    addRightData(data, css, label) {
        this.rightDataSet.unshift({"Data": data, "CSS": css, "Label": label});
        return this;
    }

    /*
     * 
     * Methods to set the X and Y axis labels
     */
    addXLabel(label) {
        this.xLabel = label;
        return this;
    }

    addLeftLabel(label) {
        this.yLeftLabel = label;
        return this;
    }

    addRightLabel(label) {
        this.yRightLabel = label;
        return this;
    }

    /*
     * Add bubble data - uses the X-scale but not the Y-scales - data is spread accross
     * the vertical range of the chart.
     */
    addBubbleData(data, css, maxCount) {
        var yScale = d3.scaleLinear()
                .range([this.height - this.height / BUBBLE_Y_SCALE_FACTOR, this.height / BUBBLE_Y_SCALE_FACTOR])
                .domain([0, d3.max(data, function (d) {
                        return d.yVal;
                    })]);
        this.bubbleDataSet.push({"Data": data, "CSS": css, "Count": maxCount, "yScale": yScale});
        return this;
    }

    //haxking around yScale...
    addBoxplotData(data, css, minOpacity) {
        this.yLeftScale = d3.scaleLinear()
                .domain([0, d3.max(data, function (d) {
                        return d.Y.Max;
                    })])
                .range([this.height, 0]);
        this.boxplotDataSet.push({"Data": data, "CSS": css, "yScale": this.yLeftScale, "MinOpacity": minOpacity});
        return this;
    }

    /*
     * Only works (for now...) with left data sets
     */
    addConditionalBar(dataFilter, css, minOpacity) {
        this.conditionalBarFilter.push({"Data": dataFilter, "CSS": css, "yScale": this.yLeftScale, "MinOpacity": minOpacity});
        return this;
    }

    /*
     * 
     * Only works (for now...) with left data sets
     */
    addLineData(data, css) {
        this.lineDataSet.unshift({"Data": data, "CSS": css});
        return this;
    }

    /*
     * Setup the graph assuming bar chart data contains X, Y and Tip values, where X is a set of discrete categories,
     * Y is the Y value (integer or real), and Tip is the tooltip text. X must be the same for all data sets
     * 
     * Any bubble data must contain: Category (which must match the X category above (tidy this up),
     * Descriptor (which is  used to set the bubble label), LongDesc (the long description, part of the tool tip),
     * pos (location of item in the category), Count (number of submissions in this Descriptor within a category
     * and also part of the tool tip), NumDesc (the number of descriptors within a category), yVal (the distribution
     * position within a column - so that if there are different numbers of descriptors in differnet categories,
     * they all start/end at the bottom/top of the chart, and intermediate values are distributed
     * evenly - probably a nicer way to do this). 
     * 
     * Note that there is one data row per Descriptor, and multiple descriptors therefore share Category and NumDesc values
     * 
     * As well as rendering the data, we add the scales and title.
     */
    graphRender() {
        if (this.yRightScale !== null) {
            yAxisRight(this.g, this.yRightScale, this.width, this.margin, SCALE_FACTOR, this.this.yRightLabel);
        }

        if (this.yLeftScale !== null) {
            yAxisLeft(this.g, this.yLeftScale, this.width, this.margin, SCALE_FACTOR, this.yLeftLabel);
        }

        if (this.rightDataSet.length > 0) {
            this.rightDataSet.forEach(data => renderNormalBarChart(this.g, data.Data, this.height,
                        this.xScale, this.yRightScale, data.CSS, data.Label));
        }
        if (this.leftDataSet.length > 0) {
            this.leftDataSet.forEach(data => renderNormalBarChart(this.g, data.Data, this.height,
                        this.xScale, this.yLeftScale, data.CSS, data.Label));
        }
        if (this.leftStackedDataSet.length > 0) {
            this.leftStackedDataSet.forEach(data => renderStackedBarChart(this.g, data.Data,
                        this.xScale, this.yLeftScale, data.CSS));
        }
        if (this.bubbleDataSet.length > 0) {
            this.bubbleDataSet.forEach(data => renderBubbles(this.g, data.Data, this.xScale,
                        data.yScale, this.width, this.height, this.margin, data.Count, data.CSS));
        }
        if (this.boxplotDataSet.length > 0) {
            //a bit hacky...
            yAxisLeft(this.g, this.yLeftScale, this.width, this.margin, SCALE_FACTOR, this.yLeftLabel);
            this.boxplotDataSet.forEach(data => renderBox(this.g, data.Data, this.xScale,
                        data.yScale, data.CSS, data.MinOpacity));
        }
        if (this.lineDataSet.length > 0) {
            this.lineDataSet.forEach(data => renderLine(this.g, data.Data, this.xScale,
                        this.yLeftScale, data.CSS));
        }

        xAxis(this.g, this.xScale, this.width, this.height, this.margin, SCALE_FACTOR, this.xLabel);
        title(this.svg, this.width, this.height, this.margin, SCALE_FACTOR, this.chartTitle);
    }
}


/*
 * Utility functions used to render data
 */

//Render a single bar chart dataset to the specified element (g) with the specified height range,
//scales and css class for rectangles
function renderNormalBarChart(g, dataSet, height, xScale, yScale, cssClass, label) {
    //The actual bar
    g.selectAll(cssClass)
            .data(dataSet)
            .enter().append("rect")
            .attr("class", cssClass)
            .attr("x", function (d) {
                return xScale(d.X);
            })
            .attr("y", function (d) {
                return yScale(d.Y);
            })
            .attr("width", xScale.bandwidth())
            .attr("height", function (d) {
                return height - yScale(d.Y);
            }).append('title')
            .text((d) => `${d.Tip}`);

    //Text value above bar
    if (label) {
        g.selectAll("text." + cssClass)
                .data(dataSet)
                .enter().append("text")
                //.attr("class", "graphText")
                .attr("class", cssClass)
                .style("opacity", 1.0)
                .attr("font-size", "16px")
                .attr("text-anchor", "middle")
                .attr("x", function (d) {
                    return xScale(d.X) + xScale.bandwidth() / 2;
                })
                .attr("y", function (d) {
                    return yScale(d.Y) - 5;
                })
                .text(function (d) {
                    return d.Y;
                });
    }
}

//Do a single line chart
function renderLine(g, dataSet, xScale, yScale, cssClass) {
    //The actual bar
    g.append("path")
            .datum(dataSet)
            .attr("class", cssClass)
            //.attr("fill", "none")
            //.attr("stroke", "steelblue")
            //.attr("stroke-width", 1.5)
            .attr("d", d3.line()
                    .x(function (d) {
                        return xScale(d.X);
                    })
                    .y(function (d) {
                        return yScale(d.Y);
                    }));
}

//Helper function to avoid clumsy loops
function processRow(elem, index) {
    var row = {id: index};
    //map a lambda?
    for (let val of elem.rubricData) {
        row = {...row, [val.Category]: val.Score};
    }
    return row;
}
/*
 * Built a stacked bar chart intended for use with categorised rubric data
 */
function renderStackedBarChart(g, dataSet, xScale, yScale, colours) {


    //Get the keynames to index the colouring - use 1st data item as template
    const keyNames = dataSet[0].rubricData.map(elem => elem.Category);

    //Now 'flatten' the data for stacking
    const interData = dataSet.map((elem, index) => processRow(elem, index));

    //Use d3's built-in stack generator to split up the data
    var stackDataGen = d3.stack().keys(keyNames);
    var stackedData = stackDataGen(interData);

    //Get the X-scale elements
    var subgroups = xScale.domain();
    //colours
    var color = d3.scaleOrdinal()
            .domain(subgroups)
            .range(colours);

    // Show the bars
    g.selectAll("cssClass")
            // Enter in the stack data = loop key per key = group per group
            .data(stackedData)
            .enter().append("g")
            .attr("fill", function (d) {
                return color(d.key);
            })
            .selectAll("rect")
            // enter a second time = loop subgroup per subgroup to add all rectangles
            .data(function (d) {
                return d;
            })
            .enter().append("rect")
            .attr("x", function (d) {
                return xScale(d.data.id);
            })
            .attr("y", function (d) {
                return yScale(d[1]);
            })
            .attr("height", function (d) {
                return yScale(d[0]) - yScale(d[1]);
            })
            .attr("width", xScale.bandwidth());
}

//Render a bubble chart data set to a specfied element (g) with scales, window size, max bubble size
//co-efficient (maxCount) and css Class for bubbles
function renderBubbles(g, dataSet, xScale, yScale, width, height, margin, maxCount, cssClass) {
    //Size of circules
    const zScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([10, 50]);

    //Actual circles
    g.selectAll("dot")
            .data(dataSet)
            .enter()
            .append("circle")
            .attr("class", cssClass)
            .attr("cx", function (d) {
                return xScale(d.Category) + (width / BUBBLE_X_SHIFT);
            })
            .attr("cy", function (d) {
                return yScale(d.yVal);
            })
            .attr("r", function (d) {
                return zScale(d.Count) * width / BUBBLE_RADIUS_FACTOR;
            })
            .attr("width", xScale.bandwidth())
            .attr("height", function (d) {
                return height - yScale(d.yVal);
            })
            .append("title")
            .text(function (d) {
                return "Desc.: " + d.LongDesc + " Number: " + d.Count;
            });


    //Text in circles
    g.selectAll("text.labels").data(dataSet)
            .enter().append("text")
            .attr("class", cssClass)
            .attr("font-size", "16px")
            .attr("dx", function (d) {
                var text = d.Descriptor;
                var len = text.length;
                var shift = len - margin;
                return xScale(d.Category) - shift;
            })
            .attr("dy", function (d) {
                var text = d.Descriptor;
                var len = text.length;
                var shift = len - BUBBLE_TEXT_Y_SHIFT;
                return yScale(d.yVal) - shift;
            })
            .attr("width", xScale.bandwidth())
            .attr("height", function (d) {
                return height - yScale(d.yVal);
            })
            .text(function (d) {
                return d.Descriptor;
            });
}

/*
 * 
 * Render a boxplot
 */
function renderBox(g, dataSet, xScale, yScale, cssClass, minOpacity) {
    //Vertical lines from min to max
    //top
    g.selectAll(cssClass)
            .data(dataSet)
            .enter()
            .append("line")
            .attr("x1", function (d) {
                return  xScale(d.X) + xScale.bandwidth() / 2;
            })
            .attr("x2", function (d) {
                return  xScale(d.X) + xScale.bandwidth() / 2;
            })
            .attr("y1", function (d) {
                return yScale(d.Y.Q3);
            })
            .attr("y2", function (d) {
                return yScale(d.Y.Max);
            })
            .attr("class", cssClass);//.attr("stroke", "black");
    //bottom
    g.selectAll(cssClass)
            .data(dataSet)
            .enter()
            .append("line")
            .attr("x1", function (d) {
                return  xScale(d.X) + xScale.bandwidth() / 2;
            })
            .attr("x2", function (d) {
                return  xScale(d.X) + xScale.bandwidth() / 2;
            })
            .attr("y1", function (d) {
                return yScale(d.Y.Min);
            })
            .attr("y2", function (d) {
                return yScale(d.Y.Q1);
            })
            .attr("class", cssClass).attr("stroke", "black");
    //The box
    g.selectAll(cssClass)
            .data(dataSet)
            .enter().append("rect")
            .attr("x", function (d) {
                return xScale(d.X);
            })
            .attr("y", function (d) {
                return yScale(d.Y.Q3);
            })
            .attr("height", function (d) {
                var height = yScale(d.Y.Q1) - yScale(d.Y.Q3);
                /*console.log(height, d.X);
                 console.log(yScale(d.Y.Q1), yScale(d.Y.Q3));
                 console.log(d.Y.Q1, d.Y.Q3);*/
                return height < BOX_MIN_HEIGHT ? BOX_MIN_HEIGHT : yScale(d.Y.Q1) - yScale(d.Y.Q3);
            })
            .attr("width", xScale.bandwidth())
            .attr("class", cssClass)
            //Sort out the opacity of the box - smaller weighting = smaller opacity
            .style("opacity", function (d) {
                return (d.Y.Points / 100 < minOpacity ? minOpacity : d.Y.Points / 100);
            }).append('title')
            .text((d) => `${d.Tip}`);
    //Median Line
    g.selectAll(cssClass)
            .data(dataSet)
            .enter()
            .append("line")
            .attr("x1", function (d) {
                return  xScale(d.X) - BOX_MEDIAN_OVERHANG;
            })
            .attr("x2", function (d) {
                return  xScale(d.X) + xScale.bandwidth() + BOX_MEDIAN_OVERHANG;
            })
            .attr("y1", function (d) {
                return yScale(d.Y.Median);
            })
            .attr("y2", function (d) {
                return yScale(d.Y.Median);
            })
            .attr("class", cssClass).attr("stroke", "black");
    //Average 'dot'
    g.selectAll(cssClass)
            .data(dataSet)
            .enter()
            .append("circle")
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("cx", function (d) {
                return xScale(d.X) + xScale.bandwidth() / 2;
            })
            .attr("cy", function (d) {
                return yScale(d.Y.Average);
            })
            .attr("r", AVERAGE_DOT_SIZE);
}

//Append title to specified element (svg) given window dimentions and scale factor
function title(svg, width, height, margin, scale, title) {
    svg.append("text")
            .attr("transform", "translate(" + margin + "," + 0 + ") scale(" + scale + ")")//
            .attr("x", margin)
            .attr("y", margin)
            .attr("height", width)
            .attr("width", height)
            .attr("font-size", "36px")
            .text(title);
}

//Append X axis to specified element (g) given window dimensions and scale factor
function xAxis(g, xScale, width, height, margin, scale, xLabel) {

    g.append("g")
            .attr("transform", "translate(0," + (height) + ")")
            .style("font-size", "14px")
            .call(d3.axisBottom(xScale).ticks(calcTicks(xScale.domain(), width)))
            .append("text")
            .attr("y", margin * scale)//
            .attr("x", width - margin * scale)//
            .attr("stroke", "black")
            .attr("fill", "black")
            .attr("text-anchor", "end")
            .attr("font-size", "20px")
            .text(xLabel);
}

//Append left Y axis to specified element (g) given window dimensions and scale factor
function yAxisLeft(g, yScale, width, margin, scale, yLabel) {
    g.append("g")
            .style("font-size", "14px")
            .call(d3.axisLeft(yScale).tickFormat(function (d) {
                return d;
            }).ticks(10))
            .append("text")
            .attr("transform", "rotate(-90) translate(0,"
                    + margin + ") scale(" + scale + ")")//
            .attr("y", -margin)
            .attr("dy", "-5.1em")
            .attr("text-anchor", "end")
            .attr("stroke", "black")
            .attr("fill", "black")
            .attr("font-size", "30px")
            .text(yLabel);
}

//Append right Y axis to specified element (g) given window dimensions and scale factor
function yAxisRight(g, yScale, width, margin, scale, yLabel) {
    g.append("g")
            .attr("transform", "translate(" + (width) + ", 0)")
            .call(d3.axisRight(yScale).tickFormat(function (d) {
                return d;
            }).ticks(10))
            .append("text")
            .attr("transform", "rotate(-90) translate(0,"
                    + margin + ") scale(" + scale + ")")
            .attr("y", margin)
            .attr("dy", "-5.1em")
            .style("stroke", "black")
            .style("fill", "black")
            .attr("text-anchor", "end")
            .attr("font-size", "30px")
            .text(yLabel);
}
/*
 * In progress - something to set the x-scale tick spacing
 * Returns sensible values but seems to be ignored
 */

function calcTicks(data, width) {
    const gap = width / data.length; //(really data.length - 1...)
    const step = Math.ceil(10 / gap);

    return data.length / step;
}





