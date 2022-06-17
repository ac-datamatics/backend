const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const connect = new AWS.Connect({  });
const fsPromise = require('fs').promises;
const BUCKET = "ac-datamatics";
const CONNECT_INSTANCE_ID = "148a1752-4bcd-4190-8af9-3bc4124ee5d5";

/**
 * Get contact id from S3 path
 * @param {String} path S3 path to extract id from
 * @returns {String}
 */
const getContactIdFromPath = path => {
    return path.match(/[^\/|^_]*(?=\.webm|_analysis|_\d*T)/mg)?.[0];
};

/**
 * Reads the content of a JSON file in S3
 * @param {String} remotePath Path in S3 of file to read
 * @returns {Promise<Object>}
 */
const readS3JSON = async (remotePath) => {
    const data = await s3.getObject({ Bucket: BUCKET, Key: remotePath }).promise();
    const body = data.Body.toString();
    return JSON.parse(body);
};

/**
 * Upload string to an S3 VTT file
 * @param {String} str Content of the file
 * @param {String} remotePath Key of file to upload
 */
const uploadCaptionsToS3 = async (str, remotePath) => {
    return await s3.upload({
        Bucket: BUCKET, 
        Key: remotePath, 
        Body: str, 
        ContentType: 'text/vtt',
    }).promise();
};

/**
 * @param {string} text
 * @param {int} limit 
 * @returns {string}
 */
const adjustLineLength = (text, limit) => {
    let words = text.toString().split(' ');
    let res = '';
    if(words.length > limit) {
        let i = 0;
        for(i = 0; i < words.length-limit; i += limit) {
            res += words.slice(i, i+limit).join(' ') + '\n';
        }
        res += words.slice(i).join(' ');
        return res;
    } else{
        return text;
    }
};

/**
 * Returns the timestamp in hours, minutes, and milliseconds
 * @param {Number} millis The milliseconds
 * @returns {String}
 */
const millisToTimestamp =(millis) => {
    const hours = Math.floor(millis / 3600000);
    const minutes = Math.floor(millis / 60000);
    const seconds =  ((millis % 60000) / 1000).toFixed(3);
    return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(6, '0');
};

exports.handler = async (event) => {
    // 
    const contactLensKey = event?.Records?.[0]?.s3?.object?.key.replace(/[\+%]+/g, ' ');
    console.log(contactLensKey);
    const contactId = getContactIdFromPath(contactLensKey);
    const analysis = await readS3JSON(contactLensKey);
    let result = 'WEBVTT\n\n';

    analysis.Transcript.forEach((block, i) => {
        if(!block.Content) return;
        const t1 = millisToTimestamp(block.BeginOffsetMillis);
        const t2 = millisToTimestamp(block.EndOffsetMillis);
    
        result += `${i+1}\n${t1} --> ${t2}\n[${block.ParticipantId}] ${adjustLineLength(block.Content, 8)}\n\n`;
    });

    let captionsPath = `connect/ac-datamatics/Captions/${contactId}.vtt`;

    await uploadCaptionsToS3(result, captionsPath);
    
    return {
        statusCode: 200, 
        message: "Success, captions generated"
    };
}
