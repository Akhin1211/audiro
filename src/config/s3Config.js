import {S3Client} from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3'
const s3Client = new S3Client({
  region: process.env.AWS_REDION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
  }
});