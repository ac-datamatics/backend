const BUCKET = 'ac-datamatics';
const {spawn} = require('child_process');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const db = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const fsPromise = require('fs').promises;

/**
 * Generates uri to S3 bucket object from contact metadata
 * @param {{type: String, contactId: String, callStartUTCDate: Date}} param0 Options for generating uri
 */
const generateUri = ({type, contactId, callStartUTCDate}) => {

    const month = (callStartUTCDate.getMonth() + 1).toString().padStart(2, '0');
    const year = callStartUTCDate.getFullYear();
    const day = (callStartUTCDate.getDate()).toString().padStart(2, '-');
    const hours = (callStartUTCDate.getHours()).toString().padStart(2, '0');
    const minutes = (callStartUTCDate.getMinutes()).toString().padStart(2, '0');
    const seconds = (callStartUTCDate.getSeconds()).toString().padStart(2, '0')

    if(type == 'audioUri') return `connect/ac-datamatics/call-recordings/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hours}:${minutes}_UTC.wav`;
    if(type == 'redactedAudioUri') return `Analysis/Voice/Redacted/${year}/${month}/${day}/${contactId}_call_recording_redacted_${year}-${month}-${day}T${hours} ${minutes} ${seconds}Z.wav`;
    if(type == 'transcriptUri') return ``;
    if(type == 'sentimentAnalysisUri') return `Analysis/Voice/Redacted/${year}/${month}/${day}/${contactId}_call_recording_redacted_${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z.json`;
    if(type == 'screenRecordingUri') return `connect/ac-datamatics/screen-recordings/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hours}:${minutes}_UTC.wav`;
    if(type == 'mergedRecordingUri') return `connect/ac-datamatics/merged-recordings/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hours}:${minutes}_UTC.wav`;
    return '';
}

/**
 * Uploads a new record to database
 * @param {String} contactId Id of contact
 * @param {{callStartUTCDate: Date, agentId: String, transcriptUri: String, sentimentAnalysisUri: String, mergedRecordingUri: String}} data Data to be stored
 */
const uploadToDatabase = (contactId, data) => new Promise((resolve, reject)=>{
    const {callStartUTCDate, agentId, transcriptUri, sentimentAnalysisUri, mergedRecordingUri} = data;
    /*db.putItem({
        TableName: 'Datamatics',
        Item: {
            contactId: {S: contactId},
            callStartUTCDate: {S: callStartUTCDate.toISOString()}, 
            agentId: {S: agentId},
            transcriptUri: {S: transcriptUri},
            sentimentAnalysisUri: {S: sentimentAnalysisUri}, 
            mergedRecordingUri: {S: mergedRecordingUri}, 
            assignedToAgentIds: {SS: []},
            watchedByAgentIds: {SS: []}, 
            likedByAgentIds: {SS: []}
        }
    }, (err, data) => {
        if(err) reject(err);
        else resolve(data);
    })*/
});

const mergeAudioVideo = async ({audioPath, videoPath, outputPath}) => new Promise((resolve, reject) => {
    const command = spawn('ffmpeg', ['-i', audioPath, '-i', videoPath, '-c:v', 'copy', '-c:a', 'aac', outputPath]);
    command.on('close', (code) => {
        resolve(code);
    });
})

/**
 * Downloads a file from a remote path in an S3 bucket into a local path in the current system
 * @param {{remotePath: String, localPath: String}} param0 remotePath in S3 to fetch object from, and localPath to save file to
 * @returns {undefined}
 */
const downloadFromS3 = async ({remotePath, localPath}) => {
    const data = await s3.getObject({Bucket: BUCKET, Key: remotePath}).promise();
    return await fsPromise.writeFile(localPath, data.Body);
};

/**
 * Upload a local file to S3
 * @param {{remotePath: String, localPath: String}} param0 remotePath in S3 to upload object from, and localPath of file to upload
 * @returns {Promise<AWS.S3.ManagedUpload.SendData>}
 */
const uploadFileToS3 = async({remotePath, localPath}) => {
    const data = await fsPromise.readFile(localPath);
    return await s3.upload({
        Bucket: BUCKET, 
        Key: remotePath, 
        Body: data
    }).promise();
}

exports.handler = async (event) => {
    // Get and parse data from body
    let {agentId, contactId, callStartUTCDate} = event;
    callStartUTCDate = new Date(callStartUTCDate);
    // Generate uris
    let uriTypes = ['audioUri', 'redactedAudioUri', 'transcriptUri', 'sentimentAnalysisUri', 'screenRecordingUri', 'mergedRecordingUri'];
    const uris = {};
    uriTypes.forEach(type => {
        uris[type] = generateUri({type, contactId, callStartUTCDate})
    });
    // Create db record (set status=processing) (pending)
    await uploadToDatabase( contactId, {
        agentId, 
        callStartUTCDate,
        transcriptUri: uris['transcriptUri'], 
        sentimentAnalysisUri: uris['sentimentAnalysisUri'], 
        mergedRecordingUri: uris['mergedRecordingUri'],
        uploadDate: new Date(), 
        status: "processing"
    } );
    // Download
    try{
        // Download audio
        await downloadFromS3({remotePath: uris['redactedAudioUri'], localPath: '/tmp/audio.mp4'});
        // Download video
        await downloadFromS3({remotePath: uris['screenRecordingUri'], localPath: '/tmp/video.mp4'});
    } catch(e){
        return e;
    }
    /*
    // Merge audio and video
    await mergeAudioVideo({audioPath: '/tmp/audio.mp4', videoPath: '/tmp/video.mp4', outputPath: '/tmp/output.mp4'});
    // Save merged audio-video to mergedRecordingUri
    await uploadFileToS3({remotePath: uris['mergedRecordingUri'], localPath: '/tmp/output.mp4'})
    */
     // Update db record (set status = processed)
    return {
        statusCode: 200, 
        body: uris
    };
}