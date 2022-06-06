/**
 * Generates keys to S3 bucket object from contact metadata
 * @param {{contactId: String, callStartUTCDate: Date}} param0 Options for generating uri
 */
const getS3Keys = ({contactId, callStartUTCDate}) => {
    const keys = [];
    const month = (callStartUTCDate.getMonth() + 1).toString().padStart(2, '0');
    const year = callStartUTCDate.getFullYear();
    const day = (callStartUTCDate.getDate()).toString().padStart(2, '0');
    const hour = (callStartUTCDate.getHours()).toString().padStart(2, '0');
    const minute = (callStartUTCDate.getMinutes()).toString().padStart(2, '0');
    const second = (callStartUTCDate.getSeconds()).toString().padStart(2, '0')

    keys['audioPath'] = `connect/ac-datamatics/CallRecordings/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hour}:${minute}_UTC.wav`;
    keys['audiolessScreenRecordingPath'] = `ScreenRecordings/Audioless/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hour}:${minute}_UTC.wav`
    keys['redactedAudioPath'] = `Analysis/Voice/Redacted/${year}/${month}/${day}/${contactId}_call_recording_redacted_${year}-${month}-${day}T${hour}:${minute}:${second}Z.wav`;
    keys['analysisPath'] = `Analysis/Voice/Redacted/${year}/${month}/${day}/${contactId}_analysis_redacted_${year}-${month}-${day}T${hour}:${minute}:${second}Z.json`;
    keys['processedScreenRecordingPath'] = `ScreenRecordings/Processed/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hour}:${minute}_UTC.mp4`
    return keys;
}

module.exports = getS3Keys;