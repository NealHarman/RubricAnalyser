$(document).ready(function () {
    /*
     * 
     * To Do:
     * 
     * 1. Tidy up chart and processdata - DONE
     * 2. Make generatebarchats and getting data OO - DONE
     * 3. Get access to web space, test multiple browsers
     * 4. Improve tool tips
     * 5. Data analysis - comparing 'ideal' distribution and make suggestions to improve rubric - DONE
     * 6. Authentication
     * 7. Better interface than hard-coding params - DONE
     */

    /*
     * 
     * A set of constant values for testing - the current value of the authentication token, the various
     * course and assignment IDs - uncomment the ones you want to test (or replace them); and the target
     * average and Std Dev.
     * 
     * All these values are 'injected' by the code below into on-page controls so can be directly edited;
     * they are set up this way to minimise testing overheard
     */

    //All of these are necessary for this to work - they are all on the UI but to save time, put them
    //here as constants
    //
    //Put your own authentication token here
    const authenticationToken = "9395~hZiLlXCd8G1tJIMiVT5AXlILFmxdVu0e4NuL1TY9A7hhvqxBQWrEAg2kkjqDufL4";

    //Put your Canvas API URL here
    const baseUri = "https://canvas.swansea.ac.uk/api/v1/courses/";

    //Put your course and assignment numbers here
    const courseID = "24792";
    const assignmentID = "169145";
    
    //- Solar System
    //const assignmentID = "107426";

    //For CS-253 - not so much data so quicker - REST
    //const courseID = "15526";
    //const assignmentID = "127923";
    // - SOAP
    //const assignmentID = "127922";
    //const assignmentID = "174526";
    
    //We are trying to work out what needs to happen to the data to move to this
    //average and SD - these are informal 'target' values for my University's CS dept
    //for the levels I teach.
    const targetAv = 60.0;
    const targetSd = 25.0;

    //Inject a standard 'data not ready yet' msg into the tabs before data is loaded/processed
    const notReady = "Content not ready - use the 'Load' tab to get data";
    $('.notready').val("Content not ready - use the 'Load' tab to get data");

    /*Slightly hacky way to make data available to download in CSV/TSV
     * The link to the processed data (via the processData object) has to be global so it can be
     * accessed in the functions to get CSV and TSV data.
     * DO NOT put var in front of this!
     */
    processData = null;

    //Colour set used to differentiate rubric catagories and what-if options - no. of colours controls no. of what-if options
    //so add more if you want more
    const colours = ["DeepPink", "Magenta", "MediumSlateBlue", "Red", "DarkRed", "Orange", "Green", "Teal", "Blue", "Navy"];

    //How far away from the 'target' mark do you need to be start checking the impact of moving up/down a rubric category.
    const targetThresholdTriggerDist = 10.0;
    //How close do we want to get to the 'target' mark?
    const minTargetDist = 5.0;

    /*
     * Inject the test values defined above into the on-page controls to simplify testing
     */
    $('#token').val(authenticationToken);
    $('#course').val(courseID);
    $('#assessment').val(assignmentID);
    $('#average').val(targetAv);
    $('#sd').val(targetSd);
    $('#url').val(baseUri);

    /*
     * These are the events linked to the UI controls - the buttons to get/process data and download CSV/TSV
     */

    /*
     *The main 'Go' button downloads data and generates the graphis 
     */
    $('#go').click(function () {
        //A simplistic 'progress' indicator
        $('#loading').html("Loading, may take a while...");

        //Build the URI to get the assignment and mark data
        const baseUri = $('#url').val();

        //Go and fetch the assessment and submission data
        const getData = new GetData(baseUri, $('#token').val());
        getData.setCourseId($('#course').val()).setAssignmentId($('#assessment').val());
        //Getting the data is asynchronous so set up promises...
        const assignmentPromise = getData.promiseAssignData(0);
        const submissionPromise = getData.promiseSubmissionData(0);
        const userPromise = getData.promiseUserData(0);

        //..which are later delivered on - once the data is back, call the dealWithData function
        Promise.all([assignmentPromise, submissionPromise, userPromise]).then(assessData => dealWithData(assessData));
    });

    /*
     * Download data as CSV
     */
    $('#csv').click(function () {
        if (processData === null) {
            alert("No data to show");
        } else {
            const flatData = processData.getFlatData();
            var csv = [];
            flatData.forEach(function (row) {
                csv += row.join(',') + '\n';
            });
            const hiddenElement = document.createElement('a');
            hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
            hiddenElement.target = '_blank';

            hiddenElement.download = 'MarkRubricData.csv';
            hiddenElement.click();
        }
    });

    /*
     * Download data as TSV
     */
    $('#tsv').click(function () {
        if (processData === null) {
            alert("No data to show");
        } else {
            const flatData = processData.getFlatData();
            var csv = [];
            flatData.forEach(function (row) {
                csv += row.join('\t') + '\n';
            });
            const hiddenElement = document.createElement('a');
            hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
            hiddenElement.target = '_blank';

            hiddenElement.download = 'MarkRubricData.tsv';
            hiddenElement.click();
        }
    });

    /*
     * Checkbox on tab 8 to turn visibility on/off for all 'what if' data sets on both 
     * tab 8 AND 9 - use to 'unset' them all then pick 1 to check on tab 9...
     */
    $('#changeall').on('change', function () {
        if ($(this).prop('checked')) {
            $('.control').each(function () {
                $(this).prop('checked', true).trigger('change');
            });
        } else {

            $('.control').each(function () {
                $(this).prop('checked', false).trigger('change');
            });
        }
    });

    /*
     * Handy debugging function - walks through a JSON object and logs it
     * TODO: add indenting
     */
    function traverse(o) {
        for (let i in o) {
            console.log(i, o[i]);
            if (Boolean(o[i]) && typeof (o[i]) === "object") {
                traverse(o[i]);
            }
        }
    }

    /*/
     * Once the REST calls have returned data - i.e. the Promises have been met - process it
     * and generate the graphs
     */
    function dealWithData(assessData) {
        //Extract the data - [0][0] because we can re-used REST code if we treat it as an array
        const assignmentData = assessData[0][0];
        const submissionData = assessData[1];
        const userData = assessData[2];

        //Put the data in the format we want and generate the target data based on an average and SD
        //we can retrieve this by calling .getMarkData and .getNormalData
        processData = new GenerateData(assignmentData, submissionData,
                userData, $('#average').val(), $('#sd').val());

        //Some of the controls are dynamically generated - zap any generated by previous calls to this function
        $('.controlContainer').html(null);

        //From the 'raw' data and target normal data, generate the graph data
        const markChart = new MarkDataGraph(processData.getMarkData(),
                processData.getNormalData());

        //Create the histogram chart and the controls for it
        const histControls = markChart.genHistogram("#histContainer", "bar", "barNormal");
        $(histControls).appendTo("#histControls");

        //As above but for the low-to-high chart
        const lowHighControls = markChart.genLowHi("#scoreContainer", "lowHighBar", "lowHighRefBar");
        $(lowHighControls).appendTo("#lowHighControls");

        //As above but broken down by rubric category
        markChart.genLowHiStacked("#scoreRubricContainer", "line", colours);

        //As above but data for rubrics - average ('raw' and %) for each category; bubbles for no. in each descriptor
        //Also the 'raw' and % box plots for the rubric
        const rubricChart = new RubricDataGraph(processData.getRubricStatsData(),
                processData.getMarkData());
        rubricChart.genUnscaledBoxPlot("#rubricBoxplotContainer", "box");
        rubricChart.genScaledBoxPlot("#scaledRubricBoxplotContainer", "boxScaled");
        const rubricControls = rubricChart.genRubricGraph("#rubricSummaryContainer", "rubricBar",
                "rubricBarWeighted", "bubble");
        $(rubricControls).appendTo("#rubricControls");

        //Generate the summary histogram box plot that appears on the load tab
        const summaryChart = new SummaryDataGraph("Summary Box Plot");
        summaryChart
                .addData("Actual", processData.getStatsData())
                .addData("Normal Dist.", processData.getNormalStatsData())
                .genGraph("#summaryContainer", "boxSummary");

        //Generate the 'what-if' plot
        //1. Go and create the 'what-if' data based on specified threshold and target distance
        const filterCategoryBandData = new RubricBandShift(processData.getMarkData(),
                processData.getRubricStatsData(), processData.getNormalData());
        const filterData = filterCategoryBandData.generateCategoryList(targetThresholdTriggerDist, minTargetDist).getListByMaxEntryCount();
        //2. Clear the controls and append a new filterchart - note markChart created above for low-high charts - and add new controls
        $('#whatIfControls').html(null);
        const whatIfControls = markChart.genFilterMap("#filterHistogramContainer", "filterBar", colours, filterData);
        $(whatIfControls).appendTo("#whatIfControls");

        //Generate the 'what-if' charts based on the effect of shifting *all* marks by the specified amounts and re-sorting low-to-high
        $('#filteredControls').html(null);
        const filteredControls = markChart.genAllDataFiltered('#filterDetailContainer', "filterBar", colours, filterData);
        $(filteredControls).appendTo('#filteredControls');

        //make the CSV and TSV button visible
        $('#download').show();

        //Clear the 'loading' message and the 'not ready' messages on tabs
        $('#loading').html("");
        $('.notready').hide();
    }
});



