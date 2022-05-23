# Backend
This repo contains all the code for the backend services for Datamatics.

> IMPORTANT: Because the features will be distributed across several AWS services, ecah feature will be treated as its own project and must be contained in its own directory. 

## Features
| Feature | Directory | Description |
| ------- | --------- | ----------- |
| Audio-Video Merging | [audio-video-merging](./audio-video-merging) | Service that merges audio and video into a single file, and handles time syncing. |
| Video Upload | [video-upload](./video-upload) | Service that receives screen recording and uploads it to S3 |
