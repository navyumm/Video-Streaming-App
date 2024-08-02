import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { exec } from "child_process" // watch out
import { stderr, stdout } from "process";

const app = express();

// multer middleware
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "_" + uuidv4() + path.extname(file.originalname))
  }
})


// multer configuration
const upload = multer({ storage: storage })


app.use(
  cors({
    origin: ["http://localhost:8000", "http://localhost:5173"],
    // methods: ["GET", "POST"],
    Credential: true
  })
)


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
})


app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static("uploads"))


app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' })
})

let videoUrls = []; // Store the video URLs globally for simplicity

app.post('/upload', upload.single('file'), function(req, res){
  // res.json({ message: 'File uploaded successfully!' })
  const lessonID = uuidv4()
  const videoPath = req.file.path
  const outputPath = `./uploads/courses/${lessonID}`
  const hlsPath = `${outputPath}/index.m3u8`
  console.log('hlspath: ', hlsPath)

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // ffmpeg
  const ffmpegCommand = `ffmpeg -i ${videoPath} -c:v libx264 -c:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

  // no queue because of POC (profe of concept), not to be used in production
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
      }
      console.log(`stdout: ${stdout}`)
      console.log(`stderr: ${stderr}`)
      const videoUrl = `http://localhost:8000/uploads/courses/${lessonID}/index.m3u8`;
      videoUrls.push(videoUrl);

      res.json({ 
        message: 'Video conveted to HLS format!', 
        videoUrl: videoUrl,
        lessonID: lessonID
      })
  })
})


app.get('/uploaded-videos', (req, res) => {
  res.json({ videoUrls: videoUrls });
});


app.delete('/delete-video/:lessonID', (req, res) => {
  const lessonID = req.params.lessonID;
  const videoIndex = videoUrls.findIndex(video => video.lessonID === lessonID);

  if (videoIndex !== -1) {
    const videoUrl = videoUrls[videoIndex].videoUrl;
    const outputPath = path.dirname(videoUrl.replace('http://localhost:8000', '.'));

    // Remove the video entry from the list
    videoUrls.splice(videoIndex, 1);

    // Delete the directory containing the video segments and playlist
    fs.rm(outputPath, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error(`Error deleting video files: ${err}`);
        return res.status(500).json({ message: 'Error deleting video files' });
      }

      res.json({ message: 'Video deleted successfully' });
    });
  } else {
    res.status(404).json({ message: 'Video not found' });
  }
});



app.listen(8000, () => {
  console.log('Server is running on port 8000...');
})