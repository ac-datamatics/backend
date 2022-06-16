# Datamatics Post Call
This Lambda function is triggered after the audio video files have been merged. 
![diagram](https://user-images.githubusercontent.com/5952839/170443255-be451e9e-f487-4905-adbd-ecdc90e087cb.svg)

The function receives:
* agentId (username)
* contactId
* Call start date (UTC, ISO format)

in order to:
* Generate paths for processed screen recordings and analysis files. (See [here](../paths.md) for more info)
* Calculate relevant data from analysis (eg, rating)
* Upload relevant data to database
