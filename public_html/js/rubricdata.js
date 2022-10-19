/* 
 * Handle charts representing rubrics
 * 1. genUnscaledBoxPlot - a box plot for each rubric category score based on the 'raw' value
 * (so a category with a max score of 40 will look 'higher' than one with one of 5)
 * 2. genScaledBoxPlot - all rubric scores scaled to a range of 0-100
 * 3. genRubricGraph - scaled and unscaled bar charts for each rubric category as well as
 * bubble chart for number of marks in each band of each category
 */

class RubricDataGraph {
    constructor(rubricData, markData) {
        this.rubricData = rubricData;
        this.markData = markData;
    }

    rubricData;
    markData;

    genUnscaledBoxPlot(container, css) {
        const data = this.rubricData.map(val => ({"X": val.Category, "Y": val,
                "Tip": "Average: " + val.Average}));
        genBoxPlot(data, container, css, 1.0);
    }

    genScaledBoxPlot(container, css) {
        //genBoxplot(this.scaledRubricData, container, css);
        const moddedData = this.rubricData.map(val =>
            ({"X": val.Category, "Y": {"Average": val.AverageScaled,
                    "Median": val.MedianScaled,
                    "Min": val.MinScaled,
                    "Max": val.MaxScaled,
                    "Q1": val.Q1Scaled,
                    "Q3": val.Q3Scaled,
                    "Points": val.Points,
                    "IQR": val.IQRScaled}, "Tip": "Average: " + val.AverageScaled}));
        genBoxPlot(moddedData, container, css, 0.1);
    }

    /*
     * Generate a bar chart of the rubric category averages - generates two charts:
     * One maps all categories to a % so they all have equal 'weight'
     * The other chart shows their average contribution to the score
     */
    genRubricGraph(container, css, cssWeighted, cssBubbles) {
        //We generated averages for each rubric category when we processed the data, so easy to map it here
        const scaledTo100 = this.rubricData.map(elem => ({"X": elem.Category, "Y": elem.AverageScaled,
                "Tip": "Average: " + elem.AverageScaled}));
        const unScaled = this.rubricData.map(elem => ({"X": elem.Category, "Y": elem.Average,
                "Tip": "Average: " + elem.Average}));

        const bubbleData = addBubbles(this.rubricData);
        //As above - specify data,div, labels etc.
        const rubricSummary = new Chart(container, "Rubric Summary");
        rubricSummary
                .addLeftScaleData(scaledTo100)
                .addLeftData(scaledTo100, css, false)
                .addLeftData(unScaled, cssWeighted, false)
                .addBubbleData(bubbleData.Data, cssBubbles, bubbleData.Count)
                .addXLabel("Rubric Category")
                .addLeftLabel("Average")
                .graphRender();

        return rubricDataControls(container, 'rubricControlsPanel', cssBubbles, css, cssWeighted);
    }
}


//*****
/*
 * 
 * Generate a boxplot using unscaled data
 */
function genBoxPlot(data, container, css, minOpac) {
    const rubricBoxPlot = new Chart(container, "Rubric Box Plot");
    rubricBoxPlot
            .addXScale(data)
            .addBoxplotData(data, css, minOpac)
            .addXLabel("Band")
            .addLeftLabel("Score")
            .graphRender();
}

/*
 * Tidy up!
 */
function addBubbles(rubric) {
    const dataArray = [];
    var maxCategories = 0;
    var maxCount = 0;
    for (let elem of rubric) {
        const catLen = elem.Descriptors.length;
        //Since we need the value of the index, *and* we need to construct data and update counts,
        //an 'old style' loop seems simplest
        for (var j = 0; j < catLen; j++) {
            const itemCount = elem.Descriptors[j].ItemCount;
            const row = {"Category": elem.Category, "Descriptor": elem.Descriptors[j].ItemDesc,
                "LongDesc": elem.Descriptors[j].ItemLongDesc,
                "pos": catLen - j - 1, "Count": itemCount, "NumDesc": catLen, "yVal": 0};
            if (itemCount > maxCount) {
                maxCount = itemCount;
            }
            dataArray.push(row);
        }

        if (catLen > maxCategories) {
            maxCategories = catLen;
        }
    }
    //nasty... now go back and fix the yVals so that different numbers of categories distribute properly
    //Should be sortable with d3 scales somehow
    dataArray.map(e => (e.yVal = e.NumDesc === 1 ? maxCategories / 2 : e.pos / (e.NumDesc - 1)));
    return {"Data": dataArray, "Count": maxCount};
}

/*
 * Generate a set of controls to turn rubric data components on and off
 */
function rubricDataControls(container, controlName, bubbles, unscaled, scaled) {
    return "<div id='" + container + "'>" +
            "<script>$('#" + controlName + "ShowBubbles').change(function () {" +
            "if (this.checked) {" +
            "$('." + bubbles + "').show();" +
            "} else {" +
            "$('." + bubbles + "').hide();" +
            "}" +
            "});" +
            "$('#" + controlName + "ShowUnScaled').change(function () {" +
            "if (this.checked) {" +
            "$('." + unscaled + "').show();" +
            "} else {" +
            "$('." + unscaled + "').hide();" +
            "}" +
            "});"
            +
            "$('#" + controlName + "ShowScaled').change(function () {" +
            "if (this.checked) {" +
            "$('." + scaled + "').show();" +
            "} else {" +
            "$('." + scaled + "').hide();" +
            "}" +
            "});</script>" +
            "<div>" +
            "<input type ='checkbox' id='" + controlName + "ShowBubbles' checked/><span>&nbsp;Show histogram category bubbles.</span><br/>" +
            "<input type ='checkbox' id='" + controlName + "ShowUnScaled' checked/><span>&nbsp;Show unscaled data.</span><br/>" +
            "<input type ='checkbox' id='" + controlName + "ShowScaled' checked/><span>&nbsp;Show actual data.</span><br/>" +
            "</div>";
}




