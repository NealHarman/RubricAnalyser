/*
 * Get the data related to the assignment, based on the specified (base) URI
 * and security token - courseID and assignmentID set later (we may use this
 * for multiple assignments).
 */
class GetData {
    constructor(uri, token) {
        this.uri = uri;
        this.token = token;
    }
    uri;
    token;
    courseId;
    assignmentId;

    setCourseId(courseId) {
        this.courseId = courseId;
        return this;
    }

    setAssignmentId(assignmentId) {
        this.assignmentId = assignmentId;
        return this;
    }

    /*
     * 
     * Get the JSON data related to the assignment
     */
    promiseAssignData(pageSize) {
        var rubricUri = this.uri + this.courseId + "/assignments/" + this.assignmentId;
        if (pageSize > 10) {
            rubricUri += "&per_page=" + pageSize;
        }
        return getData(this.token, rubricUri);
    }

    /*
     * 
     * Get the JSON data related to the submissions - including rubric breakdowns
     */
    promiseSubmissionData(pageSize) {
        var submissionUri = this.uri + this.courseId + "/assignments/" + this.assignmentId + "/submissions?include[]=rubric_assessment";
        if (pageSize > 10) {
            submissionUri += "&per_page=" + pageSize;
        }
        return getData(this.token, submissionUri);
    }

    /*
     * 
     * Get the JSON data related to the user submitting assignments
     */
    promiseUserData(pageSize) {
        var userUri = this.uri + this.courseId + "/users/";
        if (pageSize > 10) {
            submissionUri += "&per_page=" + pageSize;
        }
        return getData(this.token, userUri);
    }

}

/*
 * 
 * Return the specified (potentially paged) data from the specified URI using
 * the specified security token - promise used to ensure return only when
 * all data retrieved.
 */
function getData(token, uri) {
    var tempData = [];
    var completionPromise = new Promise(function (success, failure) {
        getDataPage(tempData, uri, token, success, failure);
    });
    return completionPromise;
}

/*
 * Recursive function that goes and gets the data - data is paged so it needs to follow the next-page links
 * and concatenate the data - it does this recursively (not my first choice but easy and works)
 */
function getDataPage(jsonArray, uri, token, success, failure) {
    var retVal = null;
    var authenticationHeader = "Bearer " + token;
    $.ajax({
        type: "GET",
        url: uri,
        beforeSend: function (request) {
            request.setRequestHeader("Authorization", authenticationHeader);
        },
        dataType: 'json',
        success: function (msg, textStatus, resp, div) {
            //Extract the next page link
            retVal = link(resp.getResponseHeader('Link'));
            //append the data whatever we have so far
            jsonArray = jsonArray.concat(msg);
            //If we are done, call the promise successfunction to deal with the data
            if (retVal === null) {
                console.log(jsonArray[0]);
                success(jsonArray);
            } else {
                //otherwise, recurse using the next-page link
                getDataPage(jsonArray, retVal, token, success);
            }
        },
        error: function (jqXHR, text, error) {
            failure(text);
        }
    }
    );
}

/*
 * Extract the next-page link (if present) using a regex
 * 
 * Used because Canvas returns data in 'pages' and does not guarantee the maximum
 * allowed page size
 */
function link(linkHeader) {
    var re = /<([^;]+)>;[\s]*rel="([a-z]+)"/g;
    var arrRes = [];
    var obj = {};
    while ((arrRes = re.exec(linkHeader)) !== null) {
        obj[arrRes[2]] = {
            url: arrRes[1]
        };
    }
    if (obj["next"] === undefined) {
        return null;
    }
    var retElt = obj["next"]["url"];
    return retElt;
}

