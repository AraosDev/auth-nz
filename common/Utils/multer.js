const multer = require('multer');
const { AppError } = require('./appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Please upload a valid image file', 400));
};

const multerMiddleware = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    // no larger than 5mb.
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = multerMiddleware;
