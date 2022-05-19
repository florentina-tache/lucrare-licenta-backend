const AWS = require('aws-sdk');
const fs = require('fs');

const addImageToS3 = async (image) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || 'AKIA4NGKKTZHWNXXBCN4',
    secretAccessKey:
      process.env.AWS_S3_SECRET_ACCESS_KEY ||
      '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',
  });

  const imagePath = image.path;

  //   const imagePath = req.files[0].path;
  const blob = fs.readFileSync(imagePath);

  const uploadedImage = await s3
    .upload({
      Bucket: process.env.AWS_S3_BUCKET_NAME || 'imagini-licenta',
      Key: image.filename,
      Body: blob,
    })
    .promise();
};

module.exports = addImageToS3;
