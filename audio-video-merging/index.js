const {spawn} = require('child_process');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
const fsPromise = require('fs').promises;

const BUCKET = 'ac-datamatics'

<<<<<<< HEAD
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
=======
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
>>>>>>> 65b745e14bb2e6e51197b8f4e242c91fd6643cab
    }).promise();
}

exports.handler = async (event) => {
    // Download video
<<<<<<< HEAD
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
=======
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
>>>>>>> 65b745e14bb2e6e51197b8f4e242c91fd6643cab
};
