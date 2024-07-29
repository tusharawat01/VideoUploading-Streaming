import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import util from "util";
import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

dotenv.config({
  path: "./.env"
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



const app = express();

const connectDb = async () => {
  try {
      const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB Connected!! Host: ${connectionInstance.connection.host}`);
  } catch (error) {
      console.error('MongoDB Connection Error:', error.message);
      process.exit(1);  
  }
}

connectDb().then(() => {
  app.on("error",(error) => {
      console.log("Express Side Error : ", error);
      throw error;
  });
  app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on PORT : ${process.env.PORT}`);
  })
})
.catch((error) => {
  console.log('MongoDB connection Failed : ', error);
});

// import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const uploadSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  compressedName: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String, 
    required: true,
  }
},{timestamps: true});

uploadSchema.plugin(mongooseAggregatePaginate);
 
export const Upload = mongoose.model('Upload', uploadSchema);


// Multer middleware
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname.replace(/\s+/g, '_')));
  }
});



const upload = multer({ storage: storage });

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.get('/', function (req, res) {
  res.json({ message: "Hello chai aur code" });
});

const execPromise = util.promisify(exec);

const fsPromises = fs.promises;

// Cleanup temporary files asynchronously
const cleanupFiles = async (filePath, directoryPath) => {
  try {
    await fsPromises.unlink(filePath);
    await fsPromises.rm(directoryPath, { recursive: true });
  } catch (error) {
    console.error(`Error cleaning up files at ${directoryPath}:`, error);
  }
};


app.post("/upload", upload.array('files', 10), async (req, res) => {


  try {
    const videoFiles = req.files;

    for (const file of videoFiles) {
      const lessonId = uuidv4();
      const outputPath = `./uploads/videos/${lessonId}`;
      const hlsPath = `${outputPath}/index.m3u8`;
    
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }
      const videoPath = file.path;
      console.log("video path:", videoPath);

      const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -preset fast -codec:a aac  -b:a 128k -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 -threads 4 ${hlsPath}`;


      await execPromise(ffmpegCommand);
      console.log(`Video ${file.originalname} converted to HLS format`);

      const cloudinaryResponse = await uploadDirectoryToCloudinary(outputPath, `videos/${lessonId}`);
      const indexFileResponse = cloudinaryResponse.find(response => response.original_filename === 'index');

      if (!indexFileResponse) {
        return res.status(400).json({ error: "index.m3u8 file not found in Cloudinary response" });
      }

      const indexFileUrl = indexFileResponse.secure_url;
      console.log("indexFileUrl:", indexFileUrl);

      const newFile = await Upload.create({
        originalName: file.originalname,
        compressedName: lessonId,
        fileUrl: indexFileUrl
      });

      if (!newFile) {
        throw new Error("Error occurred while creating file document");
      }

      console.log("newFile:", newFile);

      await cleanupFiles(file.path, outputPath);
    }

    console.log("Videos uploaded and saved successfully")

    res.json({
      message: "Videos uploaded and saved successfully"
    });

  } catch (error) {
    console.error("Error processing videos:", error);
    res.status(500).json({ error: "An error occurred while processing the videos" });
  }
});


const uploadDirectoryToCloudinary = async (directoryPath, cloudinaryFolderPath) => {
  try {
    const files = fs.readdirSync(directoryPath);
    const uploadPromises = files.map(file => {
      const filePath = path.join(directoryPath, file);
      const fileName = path.basename(filePath);
      return cloudinary.uploader.upload(filePath, {
        resource_type: 'raw',
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        folder: cloudinaryFolderPath,
        public_id: fileName
      }).catch(err => {
        console.error(`Failed to upload ${fileName}:`, err);
        throw err;
      });
    });

    return Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload files to Cloudinary');
  }
};


app.get("/getFiles", async (req, res) => {
  try {
    // Destructure and parse query parameters
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { [sort]: order === 'asc' ? 1 : -1 }
    };

    // Create an aggregate query
    const aggregateQuery = Upload.aggregate().sort(options.sort);

    if (!aggregateQuery) {
      res.status(400).json({ error: "An error occurred while creating aggregate query" });
    }

    // Perform aggregation and pagination
    const result = await Upload.aggregatePaginate(aggregateQuery, options);
    console.log(result);

    // Handle case where result is empty or null
    if (!result || result.totalDocs === 0) {
      res.status(400).json({ error: "Error occurred while performing aggregation" });
    }

    // Prepare the response data
    const data = {
      success: true,
      data: result.docs,
      totalPages: result.totalPages,
      currentPage: result.page,
      totalDocs: result.totalDocs
    };

    res.json({
      status: 200,
      message: "All video files fetched successfully",
      video: data
    });

  } catch (error) {
    console.error('Error fetching videos from MongoDB:', error);
    res.status(500).json({ error: "An error occurred while fetching the video" });
  }
});

