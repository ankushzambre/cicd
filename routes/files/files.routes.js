const express = require("express");
const crypto = require("crypto"); // for generating random names
const multer = require("multer");
const { createFiles } = require("./files.controller");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const filesRoutes = express.Router();

// generate random file name for extra security on naming
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

// store files upload folder in disk
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "routes/files/uploads/");
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (
      extension !== ".jpg" &&
      extension !== ".jpeg" &&
      extension !== ".png" &&
      extension !== ".pdf"
    ) {
      return cb(new Error("Only images and pdf are allowed"));
    } else if (extension === ".pdf") {
      const uniqueSuffix = generateFileName();
      cb(null, uniqueSuffix + ".pdf");
    } else if (extension === ".png") {
      const uniqueSuffix = generateFileName();
      cb(null, uniqueSuffix + ".png");
    } else {
      const uniqueSuffix = generateFileName();
      cb(null, uniqueSuffix + ".jpg");
    }
  },
});
// multer middleware
const upload = multer({ storage: storage });

// create new image
filesRoutes.post("/", upload.array("files", 1), createFiles);

//to serve single image from disk
filesRoutes.get("/:id", (req, res) => {
  res.sendFile(__dirname + "/uploads/" + req.params.id, (err) => {
    if (err) {
      res.status(404).send("Not found");
    }
  });
});

//get all images
const fs = require("fs");
filesRoutes.get("/", (req, res) => {
  fs.readdir(__dirname + "/uploads", (err, files) => {
    if (err) {
      return res.status(500).send("Unable to read directory: " + err);
    }
    return res.status(200).json({ files });
  });
});
filesRoutes.post("/aws", async (req, res) => {
  try {
    const imageUrl = await req.body.fileUrl;
    // Extract the file name from the URL
    const fileName = imageUrl.split('/').pop();
    // Configure the AWS SDK
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileName,
    };
    // Generate signed URL for the file
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return res.status(200).json({ url });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ "message": "Unable to get file: " + error });
  }
});

module.exports = filesRoutes;
