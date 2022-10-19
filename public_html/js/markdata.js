/*
 * Generate graphs relating to actual marks - not the rubric
 * 1. Histogram - both the target and the actual data; returns HTML representing on/off controls for each data item
 * 2. Low-to-High data - again both target and actual and again returns HTML representing on/off controls
 * 3. Low-to-High 'stacked' - the actual data broken down by rubric category score and a target line graph. No controls so no return value
 * 4. Effect of changing one/multiple rubric categories up/down one descriptor - returns control block to turn on/off
 * 5. Effect of 4. on all marks - visibility controlled by controls from 4.
 * 
 * Most of this uses the Chart class to generate the actual views of the data
 */
class MarkDataGraph {
    constructor(markData, normalData) {
        this.markData = markData;
        this.normalData = normalData;

        //generate 'binned' histograms for raw and target data
        this.histBins = convertDataSetToHistBin(this.markData, e => e.score);
        this.normHistBins = convertDataSetToHistBin(this.normalData, e => e);
        
        //generate sorted data
        this.sortedMarkData = markData.sort((a, b) => a.score - b.score);
    }

    markData; //unsorted original
    sortedMarkData;

    normalData; //Note already sorted 'on arrival'

    histBins;
    normHistBins;
    
    /*
     * These all call the relevant functions below
     */
    genHistogram(container, css, cssNormal) {
        genHistogram(container, css, cssNormal, this.histBins, this.normHistBins);
        return normalDataControls('histControlsPanel', 'histo', css, cssNormal);
    }

    genLowHi(container, css, cssNormal) {
        genLowToHigh(container, css, cssNormal, this.markData, this.normalData);
        return normalDataControls('lowHighControlsPanel', 'lowHigh', css, cssNormal);
    }
    genLowHiStacked(container, lineCss, colours) {
        genLowToHighStacked(container, lineCss, colours, this.markData, this.normalData);
    }

    genFilterMap(container, css,  colours, dataFilter) {
        return genLowToHighWhatIf(container, css, colours, this.markData, this.normalData, dataFilter);
    }

    genAllDataSortedFiltered(container, css, colours, dataFilter) {
        return genSingleMappedSortedGrades(container, css, colours, this.markData, this.normalData, dataFilter);
    }

    genAllDataFiltered(container, css, colours, dataFilter) {
        return genSingleMappedGrades(container, css, colours, this.markData, this.normalData, dataFilter);
    }

    getSortedMarkData() {
        return this.sortedMarkData;
    }

    getHistBins() {
        return this.histBins;
    }

    getNormHistBins() {
        return this.normHistBins;
    }

}

/*****
 * Local functions
 */

/*
 * Function to generate a histogram - we iterate through the Canvas JSON data
 * and build something that d3 can use - we use a generic bar chart function (below)
 * so just use a list of X-Y pairs for the data (specifying what it means with labels).
 * Weak typing of Javascript means we can put whatever values we like in for X and Y
 * 
 * container - target div
 * css - how to style the actual data
 * cssNormal - how to style the target data
 * histogramBins and normalHistBins - the histogram data, actual and target
 */
function genHistogram(container, css, cssNormal, histogramBins, normalHistBins) {

    //Specify the data, html div, labels and CSS for the bar colour
    const histogramBar = new Chart(container, "Score Histogram");
    histogramBar
            .addLeftScaleData(histogramBins)
            .addLeftData(histogramBins, css, true)
            .addLeftData(normalHistBins, cssNormal, true)
            .addXLabel("Band")
            .addLeftLabel("Count")
            .graphRender();
}

//Map data to 10 mark 'bin' histogram - called to generate the data used above
function convertDataSetToHistBin(markData, mapFunc) {
    const histogramBins = [{"X": "[0-10)", "Y": 0, "Tip": null}, {"X": "[10-20)", "Y": 0, "Tip": null},
        {"X": "[20-30)", "Y": 0, "Tip": null}, {"X": "[30-40)", "Y": 0, "Tip": null}, {"X": "[40-50)", "Y": 0, "Tip": null},
        {"X": "[50-60)", "Y": 0, "Tip": null}, {"X": "[60-70)", "Y": 0, "Tip": null}, {"X": "[70-80)", "Y": 0, "Tip": null},
        {"X": "[80-90)", "Y": 0, "Tip": null}, {"X": "[90-100]", "Y": 0, "Tip": null}];

    //Iterate through the the data, work out which 'bin' each mark is in, and add it
    for (let elem of markData) {
        //Non-submissions now filtered - first do the 'real' data
        //We pass in a selection function to allow this to work on different data formats
        const score = mapFunc(elem);
        var index = Math.floor(score / 10);
        //handle 100% - other bands are inclusive at the bottom and exclusive at the top
        //except for the last one
        if (index === 10) {
            index--;
        }
        histogramBins[index]["Y"]++;
        histogramBins[index]["Tip"] = histogramBins[index]["Y"];
    }
    return histogramBins;
}

/*
 * Generate a low-to-high chart
 * Parameters as for genHistogram except we use the sorted actual and target
 * data instead of the data mapped to a histogram
 * 
 */
function genLowToHigh(container, css, cssNormal, sortedData, sortedNormal) {
    const processed = sortedData.map((n, i) => ({"X": i, "Y": n.score, "Tip": n.score}));

    //Map the sorted comparison data to the format needed for the chart
    const procNormal = sortedNormal.map((n, i) => ({"X": i, "Y": n, "Tip": null}));
    //As above - specify data, div labels etc
    const lowHighBar = new Chart(container, "Low to High");
    lowHighBar
            .addLeftScaleData(processed)
            .addLeftData(processed, css, true)
            .addLeftData(procNormal, cssNormal, true)
            .addXLabel("Student")
            .addLeftLabel("Score")
            .graphRender();
}

/*
 * as above but create the stacked data so the contribution of each rubric category can be seen
 * container - target div for chart
 * lineCss - style the target data line
 * colours - array of colour values for stacked data
 * sortedData & sortedNormal - actual and target data (target only rendered as a line)
 */
function genLowToHighStacked(container, lineCss, colours, sortedData, sortedNormal) {
    const processed = sortedData.map((n, i) => ({"X": i, "Y": n.score, "Components": n.rubricData, "Tip": n.Score}));
    const lowHighBar = new Chart(container, "Low to High by Rubric Category");
    const procNormal = sortedNormal.map((n, i) => ({"X": i, "Y": n, "Tip": null}));
    lowHighBar
            .addLeftScaleData(processed)
            .addLeftDataStacked(sortedData, colours, true)
            .addLineData(procNormal, lineCss)
            .addXLabel("Student")
            .addLeftLabel("Score")
            .graphRender();
}

/*
 * Generate a set of controls (checkboxes) to turn overlaid normal and actual mark data on and off
 */
function normalDataControls(container, controlName, css, cssNormal) {
    return "<div id='" + container + "'>" +
            //return "<div id='" + container + "'>" +
            "<script>$('#" + controlName + "ShowNormal').change(function () {" +
            "if (this.checked) {" +
            "$('." + cssNormal + "').show();" +
            "} else {" +
            "$('." + cssNormal + "').hide();" +
            "}" +
            "});" +
            "$('#" + controlName + "ShowData').change(function () {" +
            "if (this.checked) {" +
            "$('." + css + "').show();" +
            "} else {" +
            "$('." + css + "').hide();" +
            "}" +
            "});</script>" +
            "<div>" +
            "<input type ='checkbox' id='" + controlName + "ShowNormal' checked/><span>&nbsp;Show target curve.</span><br/>" +
            "<input type ='checkbox' id='" + controlName + "ShowData' checked/><span>&nbsp;Show actual data.</span><br/>" +
            "</div>";
}

/*
 * Generate a what-if chart based on effect of moving marks from one rubric category up/down
 */
function genLowToHighWhatIf(container, css, colours, filteredData, normalData, filter) {

    //Set up a set of styles for each colour
    for (let elem of colours) {
        $("head").append("<style>." + elem + "{color: " + elem + "; fill: " + elem + "; opacity: 0.9;}</style>");
    }

    //We need the mark data in order lowest to highest
    const sortedData = filteredData.sort((a, b) => (a.score - b.score));
    //These two contain the mark and normal data in a format that can be mapped by Chart
    const processed = sortedData.map((e, i) => ({"X": i, "Y": e.score, "Tip": e.score}));
    const procNormal = normalData.map((e, i) => ({"X": i, "Y": e, "Tip": null}));

    //Add the mark and normal data to a new chart in the usual way
    var lowHighBar = new Chart(container, "Change Rubric Bands");
    lowHighBar = lowHighBar
            .addLeftScaleData(processed)
            .addLeftData(processed, css, true)
            //.addLeftData(procNormal, cssNormal, false);
            .addLineData(procNormal, "line");

    var controlBlock = ""; //This will be the set of on/off controls we will add to the page

    //Add controls while we have colours and enough possible mark bands to change
    //Convenient to have value of i so 'old style' loop seems best
    for (let i = 0; i < Math.min(colours.length, filter.length); i++) {

        //For each group of updated marks create a data set for Chart
        const filteredUpdated = filter[i].ModdedMarks.map((e, i) => ({"X": i, "Y": e, "Tip": null}));

        //Add the new data as a filter - only those columns present in the CaseList will appear on the chart
        lowHighBar = lowHighBar
                .addLeftFilterScale(filteredUpdated, colours[i], filter[i].CaseList);

        //Now create the label names for each row - either you will need to move one or more rubric categories
        //up or down, depending if you need higher/lower marks
        var label = filter[i].SumDiff > 0 ? "Move Down:- " : "Move Up:- ";
        //Add each category to the label
        for (let j = 0; j < filter[i].CatItemList.length; j++) {
            label += filter[i].CatList[j] + ": " + filter[i].CatItemListNames[j] + "; ";
        }
        label += " (" + filter[i].Num + ")"; //The number of marks that this will 'correct'
        //Add the new label to the control block
        controlBlock += genControlCheckBoxLine(i, 'whatIfControlsPanel', colours[i], label);
    }
    //Deal with axes etc.
    lowHighBar.addXLabel("Student")
            .addLeftLabel("Score")
            .graphRender();

    return controlBlock;
}

//Resorted by new marks
function genSingleMappedSortedGrades(container, css, colours, filteredData, normalData, filter) {
    //We need the mark data in order lowest to highest
    const sortedData = filteredData.sort((a, b) => (a.score - b.score));

    return mappingHelper(container, css, colours, sortedData, normalData, filter);
}

//In original order - doesn't seem to make a difference?
function genSingleMappedGrades(container, css, colours, filteredData, normalData, filter) {
    return mappingHelper(container, css, colours, filteredData, normalData, filter);
}

function mappingHelper(container, css, colours, filterData, normalData, filter) {
    //These two contain the mark and normal data in a format that can be mapped by Chart
    const processed = filterData.map((e, i) => ({"X": i, "Y": e.score, "Tip": e.score}));
    const procNormal = normalData.map((e, i) => ({"X": i, "Y": e, "Tip": null}));

    var controlBlock = "";

    var singleMapped = new Chart(container, "All data filtered by category.");
    singleMapped = singleMapped
            .addLeftScaleData(processed)
            .addLeftData(processed, css, false)
            .addLineData(procNormal, "line");

    for (let i = 0; i < Math.min(colours.length, filter.length); i++) {
        var premapped = filter[i].ModdedMarks.sort((a, b) => (a - b));
        var mapped = premapped.map((e, i) => ({"X": i, "Y": e, "Tip": null}));
        singleMapped = singleMapped.addLeftData(mapped, colours[i], true);
    }

    singleMapped.addXLabel("Student")
            .addLeftLabel("Score")
            .graphRender();
    return controlBlock;
}

/*
 * Generate the HTML for one control line - a checkbox and label of the correct color, along with the jQuery
 * to control it - allows us to see the affect of a given change in the marks
 */
function genControlCheckBoxLine(i, controlName, css, label) {
    return "<div>" +
            "<script>$('#" + controlName + i + "').change(function () {" +
            "if (this.checked) {" +
            "$('." + css + "').show();" +
            "} else {" +
            "$('." + css + "').hide();" +
            "}" +
            "});" +
            "</script>" +
            "<input type ='checkbox' class='control' id='" + controlName + i + "' checked/><span style='color:" + css + ";'>&nbsp;" + label + "</span><br/>" +
            "</div>";
}

           