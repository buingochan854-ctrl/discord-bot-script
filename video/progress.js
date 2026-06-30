// Parse log của yt-dlp

function parseProgress(line) {
    if (!line) return null;

    line = line.toString();

    /*
    Ví dụ log:

    [download]   1.2% of 23.41MiB at 3.21MiB/s ETA 00:07

    */

    const match = line.match(
        /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+(.+?)\s+at\s+(.+?)\s+ETA\s+(.+)/
    );

    if (!match) return null;

    return {
        percent: Number(match[1]),
        size: match[2],
        speed: match[3],
        eta: match[4]
    };
}

module.exports = {
    parseProgress
}; 
