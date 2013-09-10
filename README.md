# dash.js

A reference client implementation for the playback of MPEG DASH via JavaScript and compliant browsers. Learn more about DASH IF Reference Client.

##Live Streaming
This live-streaming branch contains several changes to how segments are scheduled.

### Results
* Several of the live mpds work
* The time to startup and seek in the streams is dramitically faster - depending on the mpd being used.

###Goals:
* Find the Live Edges and play the content 
* Download all the data for presentation time T at the same time
* Have more than one outstanding segment at a time

### Find the Live Edges and play the content
The mpd can describe a window where segments from the future are not yet available and where segments from the past become unavailable. This is challenging because the current time on the client computer will not be synchronized with the time on the computer that provided the mpd. Thus finding the first segment or last segment in the window described by the mpd is not a function of the current time.

In addition, if the player is left in the paused state then the window can move past the current play time. In this case the player could keep scheduling video even in the paused state so that the player has all the content even if the window moves past the play position. Or the player could jump to the start of the window if it moved past the play position. It is not clear what the right thing to do is, so the behavior would probably need to be in an extension.

In talking to people about this issue, the approach seems to be to use information about the window and the latency and the bandwidth and the minBufferTime to pick a time that is distant enough from the current Edge to ensure that the segment being requested is available. I would also like to be able to respond to 404’s by searching away from the edge we are missing to find a valid segment.

###Download all the data for presentation time T at the same time.
This is complex. The player should play the highest quality possible. If the player requests too many parallel segments it will be hard to calculate the bandwidth needed for the current quality correctly. The player should also start playing the content as fast as possible. If the player requests too many parallel segments then the first segments will arrive slower and playback will start later.
 
To start with the player should make parallel requests across all active streambuffers for the same stream. So segment 0 of audio and segment 0 of video and segment 0 of each additional active streambuffer should all be requested in parallel. This still requires some care to provide an accurate bandwidth, but it is correct for them to be combined because the active streambuffers for the current quality must fit in the current bandwidth. 

Given these segments in Adaptation Sets A & B
 
    Presentation
    Time 0 1 2 3 4 5
    A  - |1|2|3|4|5|
    B  - | 1 |2| 3 |
    C  - |    1    |
 
Here are two tables to represent the same desired scheduling cadence:
 
    Download
    Time 0 1 2 3 4 5
    A  - |1|2|3|4|5|
    B  - |1|-|2|3|-|
    C  - |1|-|-|-|-|
 
    Download
    Time | Segments to Schedule in parallel
    0    | A1, B1 and C1
    1    | A2
    2    | A3 and B2
    3    | A4 and B3
    4    | A5
 
So perhaps a streambuffer will schedule the next segment when it’s current ‘bufferLength’ <= ‘bufferLength’ of every other streambuffer in the same stream.
 
    Download |(bufferLength, Should-Schedule)
    Time     | A,s | B,s | C,s
    ---------+-----+-----+----
    0        | 0,y | 0,y | 0,y
    1        | 1,y | 2,n | 5,n
    2        | 2,y | 2,y | 5,n
    3        | 3,y | 3,y | 5,n
    4        | 4,y | 5,n | 5,n
    5        | 5,y | 5,y | 5,y


###Future Goals:
* The latency but not the data stream for the next segment for each active stream overlapped with the previous segment data being downloaded. Example: This means that the request for the next audio and video segment should both wait until almost the end of the current video segment download
  * The audio segment is smaller than the video segment so it would be ready for the next request early. 
  * The next audio segment download should not slowdown the current video segment download so don’t overlap the data downloads.
* The different qualities are a special case at startup where perhaps the player will try a low, part of a med and part of a high quality for the same source buffer at the same time to figure out with a minimum of wasted time what the initial quality should be.

