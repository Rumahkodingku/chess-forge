import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate-video.mjs <file>");
  process.exit(2);
}

let raw;
try {
  raw = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration,size,format_name",
      "-show_entries",
      "stream=codec_name,codec_type,width,height,sample_rate,channels",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
} catch (error) {
  console.error(`ffprobe failed for ${file}: ${error.message}`);
  process.exit(1);
}

const metadata = JSON.parse(raw);
const video = metadata.streams?.find((stream) => stream.codec_type === "video");
const audio = metadata.streams?.find((stream) => stream.codec_type === "audio");
const duration = Number(metadata.format?.duration ?? 0);

if (!video) {
  console.error("No video stream found.");
  process.exit(1);
}
if (!Number.isFinite(duration) || duration <= 0) {
  console.error("Invalid duration.");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      file,
      container: metadata.format?.format_name,
      duration,
      size: Number(metadata.format?.size ?? 0),
      video: {
        codec: video.codec_name,
        width: video.width,
        height: video.height,
      },
      audio: audio
        ? {
            codec: audio.codec_name,
            sampleRate: audio.sample_rate,
            channels: audio.channels,
          }
        : null,
    },
    null,
    2,
  ),
);

console.log(`validated: ${pathToFileURL(file).href}`);
