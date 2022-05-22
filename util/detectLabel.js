// Load the SDK
const AWS = require('aws-sdk');

const detectLabel = async (image) => {
  AWS.config.update({ region: 'eu-central-1' });

  const rekognition = new AWS.Rekognition({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || 'AKIA4NGKKTZHWNXXBCN4',
    secretAccessKey:
      process.env.AWS_S3_SECRET_ACCESS_KEY ||
      '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',
    region: 'eu-central-1',
  });

  const params = {
    Image: {
      S3Object: {
        Bucket: process.env.AWS_S3_BUCKET_NAME || 'imagini-licenta',
        Name: image,
      },
    },
    MaxLabels: 10,
  };

  // rekognition.detectLabels(params, function (err, response) {
  //   if (err) {
  //     console.log(err, err.stack);
  //   } else {
  //     const tagsList = response.Labels.map((a) => a.Name);
  //     console.log('1', tagsList);
  //     return tagsList;
  //   }
  // });

  const getResult = async () => {
    return await new Promise((resolve, reject) => {
      rekognition.detectLabels(params, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  };

  const result = await getResult();

  const tagsList = result.Labels.map((a) => a.Name.toLowerCase());
  return tagsList;
  
};

module.exports = detectLabel;
