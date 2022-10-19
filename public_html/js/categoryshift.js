/*
 * Work out how to get marks closer to the normalised data by moving them up/down one
 * or more rubric categories
 */
class RubricBandShift {
    constructor(markData, rubricData, normData) {
        this.markData = markData;
        this.rubricData = rubricData;
        this.normData = normData;
    }

    markData;
    rubricData;
    normData;
    categoryList;
    /*
     * Generate the list of categories that could move marks outside the target
     * by variance amount to within theshold of the target
     */
    generateCategoryList(variance, threshold) {
        this.categoryList = genCategoryList(variance, threshold,
                this.markData, this.rubricData, this.normData);
        return this;
    }

    /*
     * Sort the list of categories by the number of problems they 'fix'
     * descending
     */
    getListByMaxEntryCount() {
        return JSON.parse(JSON.stringify(this.categoryList.sort(function (a, b) {
            return b.Num - a.Num;
        })));
    }

    /*
     * Sort the list of categories by the number of changes required to 'fix'
     * a category ascending - not currently used 
     */
    getListByMinCategoryNumber() {
        return JSON.parse(JSON.stringify(this.categoryList.sort(function (a, b) {
            return a.CatCount - b.CatCount;
        })));
    }
}

/*
 * 
 * Given a variance and threshold (see above)and the mark, rubric and target
 * data, generate a list of possible combinations of changes that would improve the result
 */
function genCategoryList(variance, threshold, markData, rubricData, normData) {
    var possibleList = [];
    var caseCount = 0;
    var caseList = [];
    //for each student....
    for (let i = 0; i < markData.length; i++) {
        var studentMark = markData[i].score;
        var normMark = normData[i];
        var diff = studentMark - normMark;
        if (Math.abs(diff) > variance) {
            caseCount++;
            caseList.push(i);
            //for each category in the rubric...
            for (let j = 0; j < rubricData.length; j++) {
                //for each *combo* of categories from here to the end...
                for (let l = j; l < rubricData.length; l++) {
                    //sum all the deltas for these categories
                    var sumDiff = 0;
                    var shiftDiff = 0;
                    var catDiff = "";
                    var catList = [];
                    var catItemList = [];
                    var catItemListNames = [];
                    var catListIndices = [];
                    var markShift = [];

                    //for each category within a combination
                    for (let k = j; k < l; k++) {
                        //shift the mark to the lower/higher category
                        shiftDiff = diff > 0 ? shiftDown(k, markData[i], rubricData[k]) : -shiftUp(k, markData[i], rubricData[k]);

                        sumDiff += shiftDiff;
                        catDiff += rubricData[k].Category + " ";
                        catList.push(rubricData[k].Category);

                        catListIndices.push(k);
                        try {
                            catItemList.push(markData[i].rubricData[k].Index);
                            catItemListNames.push(markData[i].rubricData[k].Descriptor);
                            markShift.push(shiftDiff);//changes to this now redundant?
                        } catch (error) {
                            console.log(markData[i]);
                        }
                    }
                    //If the combination of changes gets a mark within the theshold distance from the target
                    if (Math.abs(sumDiff - diff) < threshold) {
                        var testingVals = remapMarks(rubricData, markData, catListIndices, catItemList, markShift);
                        possibleList.push({"Cats": catDiff, "Num": 1,
                            "Total": (diff - sumDiff), "Active": true, "Gap": 0,
                            "CatList": catList, "CatListIndices": catListIndices, "CatCount": catList.length,
                            "CatItemList": catItemList, "CatItemListNames": catItemListNames, "MarkShift": markShift,
                            "CaseList": [i], "SumDiff": sumDiff, "ModdedMarks": testingVals});
                    }
                }
            }
        }
    }
    //Consolidate all the entries
    for (let x = 0; x < possibleList.length; x++) {
        for (let y = x + 1; y < possibleList.length; y++) {
            if (possibleList[x].Cats === possibleList[y].Cats
                    && JSON.stringify(possibleList[x].CatItemList) === JSON.stringify(possibleList[y].CatItemList)
                    && possibleList[y].Active === true) {
                possibleList[x].Num++;
                possibleList[x].Total += possibleList[y].Total;
                possibleList[x].CaseList.push(possibleList[y].CaseList[0]); //hm...
                possibleList[y].Active = false;
            }
        }
    }
    var filteredList = possibleList.filter(function (e) {
        return e.Active !== false;
    });
    for (let b = 0; b < filteredList.length; b++) {
        filteredList[b].Gap = Math.round((filteredList[b].Total / filteredList[b].Num) * 100) / 100;
    }
    return filteredList;
}

/*
 * Change a particular mark down to a lower category
 */
function shiftDown(catIndex, studentData, rubricData) {
    //Make sure not already at the bottom of the category list
    var scoreIndex;
    try {
        scoreIndex = studentData.rubricData[catIndex].Index;
    } catch (error) {
        console.log(studentData);
        return 0;
    }
    if (scoreIndex < rubricData.DescriptorCount - 1) {
        return rubricData.Descriptors[scoreIndex + 1].ItemPoints;
    } else {
        return 0;
    }
}

//LIMITED TESTING SO FAR - marks too low has not been an issue
/*
 * Change a particular mark up to a higher category
 */
function shiftUp(catIndex, studentData, rubricData) {

    //Make sure not already at the top of the category list
    var scoreIndex;
    try {
        scoreIndex = studentData.rubricData[catIndex].Index;
    } catch (error) {
        console.log(studentData);
        return 0;
    }
    if (scoreIndex > 0) {
        return rubricData.Descriptors[scoreIndex - 1].ItemPoints;
    } else {
        return 0;
    }
}

/*
 * Actually change the mark categories of combinations of marks that will move
 * the final result to within threshold of the target
 */
function remapMarks(rubricData, markData, catListIndices, catItemList, markShift) {
    var updatedMarks = [];
    for (let i = 0; i < markData.length; i++) {
        var mark = markData[i].score;
        for (let j = 0; j < markData[i].length; j++) {
            try {
                if (markData[i].rubricData[catListIndices[j]].Index === catItemList[j]) {
                    mark -= markShift[j];
                }
            } catch (error) {
                console.log(error.message);
                console.log(markData[i].id);
            }
        }
        updatedMarks.push(mark);
    }
    return updatedMarks;
}


