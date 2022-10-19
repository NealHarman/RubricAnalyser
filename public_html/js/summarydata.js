
/*
 * Class to generate summary data box plots - typically for the actual and
 * 'ideal' data. We assume the data is already in the correct format:
 */
class SummaryDataGraph {
    constructor(title) {
        this.title = title;
    }

    summaryData = [];
    title;

    addData(label, dataItem) {
        this.summaryData.push({"X": label, "Y": dataItem, "Tip": dataItem.Average});
        return this;
    }

    genGraph(container, css) {
        const summaryBoxPlot = new Chart(container, this.title);
        summaryBoxPlot
                .addXScale(this.summaryData)
                .addBoxplotData(this.summaryData, css, 1.0)
                .addXLabel("")
                .addLeftLabel("Score")
                .graphRender();
    }
}
