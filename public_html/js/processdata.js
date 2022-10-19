/*
 * Generate the data sets needed from the assignment rubric and the mark data.
 * 
 * Will generate five sets of data that can be accessed by get methods.
 * 1. getStatsData - overall stats data (average, medain Q1, Q2, min, max) for overall mark.
 * 2. getMarkData - information about each marked submission (id, score and rubric breakdown)
 * 3. getRubricData - information about each rubric category and band (number in each band, stats
 *    per band as in 1 - both absolute and as %)
 * 4. getNormalData - an 'ideal set of comparison data with (currently) a mean of 60 and Stdev of 25
 * 5. getNormalStatsData - as 1. above but for the 'ideal' data
 * 6. getRubricStatsData - stats data related to the rubric (e.g. median, UQ/LQ etc.)
 * 7. getFlatData - return the data in a 'flat' array suitable for turning into csv/tsv
 */
class GenerateData {
    constructor(rubricData, markData, userData, average, sd) {
        //Fix the type of data from web controls
        this.average = Number(average);
        this.sd = Number(sd);
        this.rubricData = rubricData;
        this.userData = userData;

        //Generate rubric data - just put in 'buckets' of 10 marks
        var rubricBlock = genRubric(this.rubricData);

        //get rid of nulls and put data into format we want
        this.marks = genData(rubricBlock, preFilterSubmissions(markData));

        //Generate stats - quartiles, mean etc. - from rubric
        this.rubricStats = prepRubricStatsData(rubricBlock);

        //Generate stats from marks - argument is value to use
        this.statsData = prepMarkStatsData(markData.map(function (val) {
            return val.score;
        }));

        //Generate the ideal 'target' mark data
        this.normalData = genNormalDist(this.marks.length, this.average, this.sd);

        //Generate stats from the 'target' data - argument is value to use
        this.normalStatsData = prepMarkStatsData(this.normalData);

        //Flatten data so we can generate CSV and TSV files
        this.flatData = generateFlatData(this.marks, this.userData);
    }

    rubricStats;
    marks;
    statsData;
    normalData;
    normalStatsData;
    rubricData;
    userData;
    flatData;
    average;
    sd;

    //Accessors for the data generated
    getRubricData() {
        return this.rubricData;
    }

    getRubricStatsData() {
        return this.rubricStats;
    }

    getMarkData() {
        return this.marks;
    }

    getStatsData() {
        return this.statsData;
    }

    getNormalData() {
        return this.normalData;
    }

    getNormalStatsData() {
        return this.normalStatsData;
    }

    getFlatData() {
        return this.flatData;
    }
}

/****/
//The rest of this is handled by local functions

/*
 * 
 * Post calculate mark stats data- needs to be done
 * after the mark data has been processed. 
 * 
 * Argument is function to specify data to use
 */
function prepMarkStatsData(scoreList) {
    //var scoreList = markData.map(function(val) {return val.score;});
    const statsData = {"Average": Math.round(d3.mean(scoreList) * 100 + Number.EPSILON) / 100,
        "Q1": d3.quantile(scoreList, 0.25), "Median": d3.quantile(scoreList, 0.5),
        "Q3": d3.quantile(scoreList, 0.75), "IQR": 0,
        "Min": d3.min(scoreList), "Max": d3.max(scoreList)};

    statsData.IQR = statsData.Q3 - statsData.Q1;
    return statsData;
}


/*
 * Local function to post-calculate the stats data per rubric category - needs to be done
 * after the mark data has been processed. 
 */
function prepRubricStatsData(rubricData) {
    return rubricData.map(function (e) {
        //Do each row of the rubric
        return generateRubricStatsRow(e);
    });
}

/*
 * Generate a single row of stats data for a rubric - called by above
 */
function generateRubricStatsRow(currRow) {
    const sortedData = currRow.ScoreList.sort(d3.ascending);

    //First using the actual range of the data
    currRow.ScoreList = sortedData;
    currRow.Q1 = d3.quantile(sortedData, 0.25);
    currRow.Median = d3.quantile(sortedData, 0.5);
    currRow.Q3 = d3.quantile(sortedData, 0.75);
    currRow.Average = Math.round(d3.mean(sortedData) * 100 + Number.EPSILON) / 100;
    currRow.IQR = currRow.Q3 - currRow.Q1;
    currRow.Min = d3.min(sortedData);
    currRow.Max = d3.max(sortedData);

    //Now scaled to a %
    const sortedScaledData = sortedData.map(function (val) {
        return currRow.Points > 0 ? Math.round((val / currRow.Points) * 10000) / 100 : 0;
    });
    currRow.ScoreListScaled = sortedScaledData;
    currRow.Q1Scaled = d3.quantile(sortedScaledData, 0.25);
    currRow.MedianScaled = d3.quantile(sortedScaledData, 0.5);
    currRow.Q3Scaled = d3.quantile(sortedScaledData, 0.75);
    currRow.AverageScaled = Math.round(d3.mean(sortedScaledData) * 100 + Number.EPSILON) / 100;
    currRow.IQRScaled = currRow.Q3 - currRow.Q1;
    currRow.MinScaled = d3.min(sortedScaledData);
    currRow.MaxScaled = d3.max(sortedScaledData);

    return currRow;
}

/*
 * Generate a representation of the rubric that we want as opposed to the one
 * that Canvas gives us
 */
function genRubric(rubricData) {
    const rubricDataBlock = [];
    const rubric = rubricData.rubric;
    console.log(rubric);

    // Handle the rubric categories (rows) - kept as loop not map because of length
    for (let elem of rubric) {
        console.log(elem);
        //Add in whatever data from the Canvas rubric that we can right now;
        //Descriptor information will be updated when we've processed it below, but average
        //set to -1 as a placeholder (good choice?) - will be updated later by computeAverages
        const row = {"id": elem.id, "Category": elem.description,
            "Description": elem.long_description, "Points": elem.points,
            "Average": 0, "AverageScaled": 0, "Total": 0, "ScoreList": [], "Median": 0, "Min": 0, "Max": 0,
            "Q1": 0, "Q3": 0, "IQR": 0, "ScoreListScaled": [], "MedianScaled": 0, "MinScaled": 0, "MaxScaled": 0,
            "Q1Scaled": 0, "Q3Scaled": 0, "IQRScaled": 0,
            "DescriptorCount": 0, "Descriptors": null};
        //Handle the rubric descriptors (columns) - mostly duplicates the one in the Canvas data but we
        //add in a count of the number of categories so we know how many rows we need in e.g. bubble
        //charts
        const descData = elem.ratings;
        const descBlock = descData.map(e =>
            ({"id": e.id, "ItemDesc": e.description,
                "ItemLongDesc": e.long_description, "ItemPoints": e.points,
                "ItemCount": 0})
        );
        //Update the descriptor information now we know about the rubric categories
        row.DescriptorCount = descBlock.length;
        row.Descriptors = descBlock;
        rubricDataBlock.push(row);
    }
    return rubricDataBlock;
}

/*
 * Process the actual assessment data from Canvas - we don't need most of it so we simply mainly
 */
function genData(rubricBlock, markData) {

    const markDataBlock = [];
    var count = 0;

    //Look through every submission - why won't this work as for-of?
    for (let i = 0; i < markData.length; i++) {
        //for(let sub in markData) {
        //Get the core data per submission - id, score, rubric scores
        var id = markData[i].id;
        var user = markData[i].user_id;
        var score = markData[i].score;
        var rubricData = markData[i].rubric_assessment;

        //We skip any where there is no submission
        if (rubricData !== undefined) {
            //This is what a row will look like - we fill in rubricData below
            var row = {"id": id, "user": user, "score": score, "rubricData": null};
            var rubricArray = [];
            count++;
            //Process each rubric row per student
            for (let item of rubricBlock) {
                var rubricRowId = item.id;
                
                //yuk...
                if (rubricData[rubricRowId] === undefined) {
                    continue;
                }
                var score = rubricData[rubricRowId].points;
                
                //Avoid NaN appearing in the data
                if (score !== undefined) {
                    //Keep a total for each rubric row so we can later compute
                    //the average
                    item.Total += score;
                    item.ScoreList.push(score);
                }

                //Build a data item for each rubric row per student        
                var ratingId = rubricData[rubricRowId].rating_id;
                var indexOfCategory = item.Descriptors.map(e => (e.id)).indexOf(ratingId);

                var rowEntry = {"id": item.id,
                    "Category": item.Category, "Score": score,
                    "RatingId": ratingId, "Index": indexOfCategory,
                    "Descriptor": item.Descriptors[indexOfCategory].ItemDesc};

                rubricArray.push(rowEntry);

                //We could just essentially copy accross the rubric data so this
                //loop is to update the rubric data - how many were in each
                //rubric category descriptor and what was the average per rubric catagory?
                //We add this data in
                for (let elem of item.Descriptors) {
                    if (elem.id === ratingId) {
                        elem.ItemCount++;
                        break;
                    }
                }
            }
            row.rubricData = rubricArray;
            markDataBlock.push(row);
        }
    }
    return markDataBlock;
}
/*
 * Generate a 'flat' data set for creating CSV and TSV files
 */
function generateFlatData(markData, userData) {
    //Just in case, make sure we find a non-null row and extract headers
    let i = 0;
    while (markData[i] === null) {
        i++;
    }
    let headerRow = ["id", "score"];

    console.log(markData);
    let rubric = markData[i].rubricData;

    //Get the headers for each rubric category, descriptor and the score
    for (let row of rubric) {
        headerRow.push(row.Category);
        headerRow.push(row.Category + " Score");
    }

    //Now create the actual data
    var blockData = [];
    blockData.push(headerRow);
    var email;
    for (let submission of markData) {
        //console.log(student);
        for (let user of userData) {
            if (user.id === submission.user) {
                email = user.email;
            }
        }
        var studentRow = [email, submission.score];
        for (let rubricRow of submission.rubricData) {
            studentRow.push(rubricRow.Descriptor);
            studentRow.push(rubricRow.Score);
        }
        blockData.push(studentRow);
    }
    return blockData;
}

/*
 * get the email field corresponding to an id
 */
function getEmail(id, userData) {
    for(let student of userData) {
        //console.log(student.email);
        if (student.id === id) {
            console.log(student.email);
            return student.email;
        }
    }
    return id;
}

/*
 * Just get rid of the null submissions
 */
function preFilterSubmissions(rawData) {
    //Get rid of non-submissions (but leave 'real' zeros)
    var filteredGlobal = rawData.filter(e =>
        (e.score !== null));
    return filteredGlobal;
}

/*
 * These used to generate normally-distributed 'comparison' scores
 */

function genNormalDist(n, mean, sd) {
    console.log(n)
    console.log(mean)
    console.log(sd)
    const genNumbers = [];
    //Generate a 100-times as many as we need...
    //console.log("long list");
    for (let i = 0; i < n * 100; i++) {
        genNumbers.push(getNormallyDistributedRandomNumber(mean, sd));
    }

    //..sort them...
    //console.log("sorting");
    const sortedNormal = genNumbers.sort((a, b) => a - b);

    //.. get rid of 99 of each 100 - get smoother data
    const filteredList = [];
    //console.log("about to filter");
    for (let i = 0; i < sortedNormal.length; i += 100) {
        filteredList.push(sortedNormal[i]);
    }
    return filteredList;
}

function boxMullerTransform() {
    const u1 = Math.random();
    const u2 = Math.random();

    //'Full' Box-Muller returns a pair z0 and z1 - we don't need z1
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    //const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

    return z0;
}

function getNormallyDistributedRandomNumber(mean, stddev) {
    //yuk... - make sure we stay 0-100
    while (true) {
        const z0 = boxMullerTransform();
        var retVal = z0 * stddev + mean;
        //console.log("looping...");
        if (retVal <= 100 && retVal >= 0) {
            return Math.round(retVal * 100.0 + Number.EPSILON) / 100;
        }
    }
}
