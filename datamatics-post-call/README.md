# Datamatics Post Call
This Lambda function is called by a REST API on the frontend after the screen recording has been uploaded. 
![diagram](https://user-images.githubusercontent.com/5952839/170443255-be451e9e-f487-4905-adbd-ecdc90e087cb.svg)

The function receives:
* agentId (username)
* contactId
* Call start date (UTC, ISO format)

in order to:
* Generate paths for (un)redacted audio recordingds, audioless/processed screen recordings and analysis files. (See [here](../paths.md) for more info)
* Calculate relevant data from analysis (eg, rating)
* Merge video and audio files
* Upload relevant data to database
