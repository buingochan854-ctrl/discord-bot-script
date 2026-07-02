module.exports = {

    // Thư mục tải video
    DOWNLOAD_FOLDER: "./downloads",

    // Định dạng yt-dlp
    DEFAULT_FORMAT: "bv*+ba/b",

    // Giới hạn upload Discord (MB)
    MAX_UPLOAD_MB: 24,

    // Có nén video không
    COMPRESS_VIDEO: true,

    // Độ phân giải khi nén
    MAX_HEIGHT: 720,

    // Bitrate video
    VIDEO_BITRATE: "1800k",

    // Bitrate audio
    AUDIO_BITRATE: "128k",

    // ffmpeg preset
    FFMPEG_PRESET: "veryfast",

    // Có xóa file sau khi gửi
    DELETE_AFTER_SEND: true,

    // Số lần retry
    MAX_RETRY: 3

};