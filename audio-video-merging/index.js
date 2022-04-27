const {spawn} = require('child_process');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
const fsPromise = require('fs').promises;

const BUCKET = 'ac-datamatics'

async function getFileFromS3(Key){ 
    try{
        const data = await s3.getObject({Bucket: BUCKET, Key}).promise();
        return data.Body;
    } catch(e){
        throw new Error(`Could not retrieve video from S3: ${e.message}`);
    }
}

const mergeFiles = (videoFile, audioFile, outputFile) => new Promise((resolve, reject)=>{
    const command = spawn('ffmpeg', ['-i', videoFile, '-i', audioFile, outputFile]);
    command.on('close', (code) => {
        /*if(code == 0) resolve();
        else reject(code);*/
        resolve(code);
    })
});

const uploadFileToS3 = async (localFilePath, bucketFilePath) => {
    const file = await fsPromise.readFile(localFilePath);
    return await s3.upload({
        Bucket: BUCKET, 
        Key: bucketFilePath,
        Body: file
    }).promise();
}

exports.handler = async (event) => {
    // Download video
    let videoStream = await getFileFromS3('test/video.mp4');
    await fsPromise.writeFile('/tmp/video.mp4', videoStream);
    
    let audioStream = await getFileFromS3('test/audio.mp4');
    await fsPromise.writeFile('/tmp/audio.mp4', audioStream);
    
    try{
        await mergeFiles('/tmp/video.mp4', '/tmp/audio.mp4', '/tmp/audio-video.mp4');
    } catch(e){
        return {
            message: "An error occured while merging the files", 
            error: e
        }
    }
    
    try{
        await uploadFileToS3('/tmp/audio-video.mp4', 'test/output.mp4');
    } catch(e){
        return {
            message: "An error occured while uploading the merged file",
            error: e
        };
    }
    
    // TODO implement
    const response = {
        statusCode: 200,
        body: "aa",
    };
    return response;
};
