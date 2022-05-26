// 8103502c-ff3b-4fd6-8693-ff883ac097b9

const generateUri = ({type, contactId, callStartUTCDate}) => {

    const month = (callStartUTCDate.getMonth() + 1).toString().padStart(2, '0');
    const year = callStartUTCDate.getFullYear();
    const day = (callStartUTCDate.getDate()).toString().padStart(2, '-');
    const hours = (callStartUTCDate.getHours()).toString().padStart(2, '0');
    const minutes = (callStartUTCDate.getMinutes()).toString().padStart(2, '0');
    const seconds = (callStartUTCDate.getSeconds()).toString().padStart(2, '0')

    if(type == 'audioUri') return `/connect/ac-datamatics/call-recordings/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hours}:${minutes}_UTC.wav`;
    if(type == 'redactedAudioUri') return `/Analysis/Voice/Redacted/${year}/${month}/${day}/${contactId}_call_recording_redacted_${year}-${month}-${day}T${hours} ${minutes} ${seconds}Z.json`;
    if(type == 'transcriptUri') return ``;
    if(type == 'sentimentAnalysisUri') return `/Analysis/Voice/Redacted/${year}/${month}/${day}/${contactId}_call_recording_redacted_${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z.json`;
    if(type == 'screenRecordingUri') return `/connect/ac-datamatics/screen-recordings/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hours}:${minutes}_UTC.wav`;
    if(type == 'mergedRecordingUri') return `/connect/ac-datamatics/merged-recordings/${year}/${month}/${day}/${contactId}_${year}${month}${day}T${hours}:${minutes}_UTC.wav`;
    return '';
}

const contactId = "8103502c-ff3b-4fd6-8693-ff883ac097b9";
const callStartUTCDate = new Date('2022-05-16T21:41:57Z');

let uris = ['audioUri', 'redactedAudioUri', 'transcriptUri', 'sentimentAnalysisUri', 'screenRecordingUri', 'mergedRecordingUri'];
const urisMap = {};

uris.forEach(type => {
    urisMap[type] = generateUri({type, contactId, callStartUTCDate})
});

console.log(JSON.stringify(urisMap));

