declare module '@ffmpeg-installer/ffmpeg' {
  const ffmpegInstaller: {
    path: string;
    version?: string;
  };
  export default ffmpegInstaller;
}

declare module '@ffprobe-installer/ffprobe' {
  const ffprobeInstaller: {
    path: string;
    version?: string;
  };
  export default ffprobeInstaller;
}
