/* eslint-disable prefer-promise-reject-errors */
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const { GCS_BUCKET_NAME } = process.env;

const storage = new Storage({
  keyFilename: path.join(__dirname, '../../keys.json'),
});

const uploadToGcs = (file, folderName) =>
  new Promise((resolve, reject) => {
    const { originalname, buffer } = file;
    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const blob = bucket.file(`${folderName}/${originalname}`);
    const blobStream = blob.createWriteStream({
      resumable: false,
    });
    blobStream
      .on('finish', () => resolve('UPLOADED'))
      .on('error', () => reject('UPLOAD_FAILED'))
      .end(buffer);
  });

module.exports = uploadToGcs;
