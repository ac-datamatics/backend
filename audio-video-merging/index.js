const {spawn} = require('child_process');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
const fsPromise = require('fs').promises;

const BUCKET = 'ac-datamatics'

 const downloadFromS3 = async ({
    s3Path,
    localPath
 }) => {
    const data = await s3.getObject({Bucket: BUCKET, Key: s3Path}).promise();
    return await fsPromise.writeFile(localPath ,data.Body);
 }


const mergeAudioVideo = ({
    audioLocalPath, 
    videoLocalPath,
    outputLocalPath
}) => new Promise((resolve, reject) => {
    const command = spawn('ffmpeg', ['-i', audioLocalPath, '-i', videoLocalPath, '-c:v', 'copy', '-c:a', 'aac', outputLocalPath]);
    command.on('close', (code) => {
        resolve(code);
    });
})

const uploadFileToS3 = async({
    s3Path, 
    localPath
}) => {
    const data = await fsPromise.readFile(localPath);
    return await s3.upload({
        Bucket: BUCKET, 
        Key: s3Path,
        Body: data
    }).promise();
}

exports.handler = async (event) => {
    // Download video
    await downloadFromS3({
        s3Path: 'test/video.mp4',
        localPath: '/tmp/video.mp4'
    });
    // Download audio
    await downloadFromS3({
        s3Path: 'test/audio.mp4',
        localPath: '/tmp/audio.mp4'
    });
    // Merge files
    const mergeOutputCode = await mergeAudioVideo({
        audioLocalPath: '/tmp/audio.mp4', 
        videoLocalPath: '/tmp/video.mp4', 
        outputLocalPath: '/tmp/output.mp4'
    })
    // Upload
    await uploadFileToS3({
        s3Path: 'test/out.mp4', 
        localPath: '/tmp/output.mp4'
    });
    
    return {
        statusCode: 200, 
        body: {
            audio: (await fsPromise.stat('/tmp/audio.mp4')).size,
            video: (await fsPromise.stat('/tmp/video.mp4')).size,
            merged: (await fsPromise.stat('/tmp/output.mp4')).size, 
            mergedOutputCode: mergeOutputCode, 
        }
    }
};
