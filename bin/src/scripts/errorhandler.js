function err(obj) {
    var errorAsObj = obj;
    if (typeof errorAsObj === "string") {
        try {
            errorAsObj = JSON.parse(errorAsObj);
        }
        catch (parseError) {
            throw errorAsObj;
        }
    }
    var statusCode = errorAsObj.statusCode;
    if (statusCode === 401) {
        throw "Received response 401 (Not Authorized). Check that your personal access token is correct and hasn't expired.";
    }
    var errorBodyObj = errorAsObj.body;
    if (errorBodyObj) {
        if (typeof errorBodyObj === "string") {
            try {
                errorBodyObj = JSON.parse(errorBodyObj);
            }
            catch (parseError) {
                throw errorBodyObj;
            }
        }
    }
    var message = errorBodyObj.message;
    if (message) {
        throw message;
    }
    else {
        throw errorBodyObj;
    }
}
exports.err = err;
