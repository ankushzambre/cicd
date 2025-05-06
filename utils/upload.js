const multer = require("multer");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
require("dotenv").config();
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
});

const uploadToS3 = async (file) => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3.send(new PutObjectCommand(params));
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload file");
  }
};

//  middleware function to handle multer errors
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: "Image should not be greater than 5MB" 
      });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

// Function to generate a signed URL for an image
const generateSignedUrl = async (imageUrl) => {
  if (!imageUrl) return null;

  try {
    const fileName = imageUrl.split('/').pop();
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileName,
    };

    const command = new GetObjectCommand(params);
    return await getSignedUrl(s3, command, { expiresIn: 604800 }); // 7 days expiration
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return imageUrl; // Return original URL if signed URL fails
  }
};

module.exports = { upload, uploadToS3, multerErrorHandler, generateSignedUrl };
