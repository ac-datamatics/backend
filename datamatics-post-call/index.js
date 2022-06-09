const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const db = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const connect = new AWS.Connect({  });
const BUCKET = "ac-datamatics";
const CONNECT_INSTANCE_ID = "148a1752-4bcd-4190-8af9-3bc4124ee5d5";

/**
 * Get contact id from S3 path
 * @param {String} path S3 path to extract id from
 * @returns {String}
 */
const getContactIdFromPath = path => {
    console.log(path)
    return path.match(/[^\/|^_]*(?=\.webm|_analysis|_\d*T)/mg)?.[0];
}

/**
 * Generates paths to S3 object from contact metadata
 * @param {{contactId: String, callStartUTCDate: Date}} param0 Data
 */
const getPathsFromContactId = ({contactId, callStartUTCDate}) => {
    const year = callStartUTCDate.getFullYear(), 
        month = (callStartUTCDate.getMonth() + 1).toString().padStart(2, '0'), 
        day = callStartUTCDate.getDate().toString().padStart(2, '0'), 
        hour = callStartUTCDate.getHours().toString().padStart(2, '0'), 
        minute = callStartUTCDate.getMinutes().toString().padStart(2, '0'), 
        second = callStartUTCDate.getSeconds().toString().padStart(2, '0');
    return {
        audioPath: `connect/ac-datamatics/CallRecordings/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hour}:${minute}_UTC.wav`,
        screenRecordingPath: `public/recordings/${contactId}.webm`, 
        redactedAudioPath: `Analysis/Voice/Redacted/${year}/${month}/${day}/${contactId}_call_recording_redacted_${year}-${month}-${day}T${hour}:${minute}:${second}Z.wav`, 
        analysisPath: `Analysis/Voice/Redacted/${year}/${month}/${day}/${contactId}_analysis_redacted_${year}-${month}-${day}T${hour}:${minute}:${second}Z.json`,
        mergedScreenRecordingPath: `connect/ac-datamatics/ScreenRecordings/${contactId}.webm `
    }
}
/**
 * Checks if a file exists at the specified path on S3
 * @param {String} remotePath Remote path of file to check
 * @returns {Promise<Boolean>}
 */
const S3FileExists = async (remotePath) => {
    try{
        await s3.headObject({ Bucket: BUCKET, Key: remotePath }).promise();
        return true;
    } catch(e){
        return false;
    }
}

/**
 * Reads the content of a JSON file in S3
 * @param {String} remotePath Path in S3 of file to read
 * @returns {Promise<Object>}
 */
const readS3JSON = async (remotePath) => {
    const data = await s3.getObject({ Bucket: BUCKET, Key: remotePath }).promise();
    const body = data.Body.toString();
    return JSON.parse(body);
}

/**
 * Uploads a new record to the database
 * @param {String} contactId Id of contact
 * @param {{
 * callStartUTCDate: Date, 
 * callEndUTCDate: Date
 * mergedRecordingPath: String, 
 * analysisPath: String, 
 * agentId: String, 
 * queueId: String, 
 * rating: Number, 
 * sentimentAgent: Number, 
 * sentimentCustomer: Number, 
 * videoExists: Boolean
 * }} param1 
 */
const uploadToDatabase = async (contactId,  {
    callStartUTCDate, 
    callEndUTCDate,
    mergedRecordingPath, 
    analysisPath, 
    agentUsername,
    queueId, 
    rating, 
    sentimentAgent, 
    sentimentCustomer, 
    videoExists,
    analysisExists
}) => {
    return await db.putItem({
        TableName: 'Datamatics', 
        Item: {
            contact_id: {S: contactId},
            callStartUTCDate: {S: callStartUTCDate.toISOString()},
            callEndUTCDate: {S: callEndUTCDate.toISOString()},
            // mergedRecordingPath: {S: mergedRecordingPath},
            // analysisPath: {S: analysisPath},
            // agentId: {S: agentId},
            queue_id: {S: queueId},
            rating: {N: rating.toString()},
            sentimentAgent: {N: sentimentAgent.toString()},
            sentimentCustomer: {N: sentimentCustomer.toString()},
            videoExists: {BOOL: videoExists},
            analysisExists: {BOOL: analysisExists},
            uploadDate: {S: new Date().toISOString()},
            is_assigned: {BOOL: false},
            //
            mergedRecordingURL: {S: mergedRecordingPath},
            analysisURL: {S: analysisPath},
            // Queue: {S: queueId},
            agentUsername: {S: agentUsername}, 
            // Rating: {N: rating.toString()}
        }
    }).promise();
}


exports.handler = async (event) => {
    const triggerFilePath = event?.Records?.[0]?.s3?.object?.key;
    const contactId = getContactIdFromPath(triggerFilePath);
    // Get contact information
    let contact = {};
    try{
        let c = await connect.describeContact({ContactId: contactId, InstanceId: CONNECT_INSTANCE_ID}).promise();
        contact.connectedToAgentTimestamp = new Date(c.Contact?.AgentInfo?.ConnectedToAgentTimestamp);
        contact.initiationTimestamp = new Date(c.Contact?.InitiationTimestamp);
        contact.disconnectTimestamp = new Date(c.Contact?.DisconnectTimestamp);
        let a = await connect.describeUser({UserId: c.Contact?.AgentInfo.Id, InstanceId: CONNECT_INSTANCE_ID}).promise();
        contact.agentUsername = a.User?.Username;
        contact.queueId = c.Contact?.QueueInfo?.Id;
    } catch(e){
        console.log('fail 502 :(')
        return {
            statusCode: 502, 
            error: e
        }
    }
    // Generate paths (seconds are ambiguous)
    let paths, videoExists = false, analysisExists = false;
    let callStartUTCDate = contact.initiationTimestamp;
    
    while(callStartUTCDate <= contact.connectedToAgentTimestamp || !analysisExists){
        paths = getPathsFromContactId({contactId, callStartUTCDate});
        videoExists = await S3FileExists(paths.mergedScreenRecordingPath);
        analysisExists = await S3FileExists(paths.analysisPath);
        callStartUTCDate.setSeconds(callStartUTCDate.getSeconds()+1);
    }
    
    let rating = 0, sentimentAgent = 0, sentimentCustomer = 0;
    if(analysisExists){
        try{
            // Read file
            const analysis = await readS3JSON(paths.analysisPath);
            // Calculate values
            let initialSentiment = analysis?.ConversationCharacteristics.Sentiment.SentimentByPeriod.QUARTER.CUSTOMER[0].Score;
            let finalSentiment = analysis?.ConversationCharacteristics.Sentiment.SentimentByPeriod.QUARTER.CUSTOMER[3].Score;
            rating = Math.max(finalSentiment) - Math.abs(initialSentiment);
            sentimentAgent = analysis?.ConversationCharacteristics?.Sentiment?.OverallSentiment?.AGENT;
            sentimentCustomer = analysis?.ConversationCharacteristics?.Sentiment?.OverallSentiment?.CUSTOMER;
        } catch(e){
            rating = 0, sentimentAgent = 0, sentimentCustomer = 0;
        }
    }
    // Upload data to db
    try{
        await uploadToDatabase(contactId, {
            callStartUTCDate: contact.initiationTimestamp, 
            callEndUTCDate: contact.disconnectTimestamp,
            mergedRecordingPath: paths.mergedScreenRecordingPath, 
            analysisPath: paths.analysisPath,
            agentUsername: contact.agentUsername,
            queueId: contact.queueId, 
            rating, 
            sentimentAgent, 
            sentimentCustomer, 
            videoExists, 
            analysisExists
        })
    } catch(e){
        console.log('failed with 500 :(')
        return {
            statusCode: 500, 
            error: e, 
            message: "Error uploading to DB"
        }
    }

    // Return
    console.log(contactId);
    return {
        statusCode: 200, 
        message: "Success"
    }
}
