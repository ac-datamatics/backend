# Audio and Video Merging
This service handles the merging and syncing of audio and video into a single file using FFMPEG.

## Shift multimedia file
This functionality prepends _n_ seconds of black frames to the beginning of the video. 
(If _n_ is a negative number, it deletes _n_ seconds of frames from the beginning of the video).
This is useful when making adjustments for proper syncing when merging several multimedia files. 

## Merge multimedia files
This functionality receives several multimedia files and merges them into a single output file. Audio streams are combined and video streams are overlayed. 