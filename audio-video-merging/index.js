const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const db = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const connect = new AWS.Connect({  })
const fsPromise = require('fs').promises;
const {spawn} = require('child_process')

const BUCKET = "ac-datamatics";
const CONNECT_INSTANCE_ID = "148a1752-4bcd-4190-8af9-3bc4124ee5d5";
/**
 * Get contact id from S3 path
 * @param {String} path S3 path to extract id from
 * @returns {String}
 */
const getContactIdFromPath = path => {
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
 * Opens a subprocess to merge video (webm) and audio (wav) using ffmpeg
 * @param {{audioPath: String, videoPath: String, outputPath: String}} param0 Paths
 * @returns {Promise<Number>}
 */
const mergeAudioAndVideo = async ({audioPath, videoPath, outputPath}) =>
    new Promise((resolve, reject) => {
        const command = spawn('ffmpeg', ['-i', audioPath, '-i', videoPath, '-c:a', 'opus', '-strict', '-2', '-y', outputPath]);
        command.on('close', (code) => {
            resolve(code);
        });
    });


/**
 * Downloads a file from a remote path in an S3 bucket into a local path in the current system
 * @param {{remotePath: String, localPath: String}} param0 remotePath in S3 to fetch object from, and localPath to save file to
 * @returns {Promise<undefined>}
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
 const uploadToS3 = async({remotePath, localPath}) => {
    const data = await fsPromise.readFile(localPath);
    return await s3.upload({
        Bucket: BUCKET, 
        Key: remotePath, 
        Body: data, 
        ContentType: 'video/webm',
    }).promise();
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

exports.handler = async (event) => {
    const triggerFilePath = event?.Records?.[0]?.s3?.object?.key;
    const contactId = getContactIdFromPath(triggerFilePath);
    // Get contact information
    let c, connectedToAgentTimestamp, initiationTimestamp;
    try{
        let c = await connect.describeContact({ContactId: contactId, InstanceId: CONNECT_INSTANCE_ID}).promise();
        connectedToAgentTimestamp = new Date(c.Contact?.AgentInfo?.ConnectedToAgentTimestamp);
        initiationTimestamp = new Date(c.Contact?.InitiationTimestamp);

    } catch(e){
        return {
            statusCode: 502, 
            error: JSON.stringify(e),
            message: "Error fetching info from API"
        }
    }
    // Generate paths (seconds are ambiguous)
    let paths, audioExists, videoExists;
    let callStartUTCDate = initiationTimestamp;
    while(callStartUTCDate <= connectedToAgentTimestamp || !audioExists){
        paths = getPathsFromContactId({contactId, callStartUTCDate});
        audioExists = await S3FileExists(paths.redactedAudioPath);
        videoExists = await S3FileExists(paths.screenRecordingPath);
        callStartUTCDate.setSeconds(callStartUTCDate.getSeconds()+1); 
    }
    // If one does not exists...
    if(!audioExists || !videoExists){
        return {
            statusCode: 404, 
            error: "Audio or video does not exist",
            audioPath: paths.redactedAudioPath, 
            videoPath: paths.screenRecordingPath, 
            videoExists, audioExists
        }
    }
    // Download files
    try{
        await downloadFromS3({remotePath: paths.redactedAudioPath, localPath: '/tmp/audio.wav'});
        await downloadFromS3({remotePath: paths.screenRecordingPath, localPath: '/tmp/video.webm'});
    } catch(e){
        return {
            statusCode: 500, 
            error: e, 
            message: "Error downloading files"
        }
    }
    // Merge files
    try{
        await mergeAudioAndVideo({ audioPath: '/tmp/audio.wav', videoPath: '/tmp/video.webm', outputPath: '/tmp/output.webm' });
    } catch(e){
        return {
            statusCode: 500, 
            error: JSON.stringify(e), 
            message: "Error merging files"
        }
    }
    // Upload files
    try{
        await uploadToS3({remotePath: paths.mergedScreenRecordingPath, localPath: '/tmp/output.webm'})
    } catch(e){
        return {
            statusCode: 500, 
            error: e, 
            message: "Error uploading files"
        }
    }

    // Return success message
    return {
        statusCode: 200, 
        body: {
            contactId
        },
        message: "Video and audio merged correctly"
    }
}