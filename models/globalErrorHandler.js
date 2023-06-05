const mongoDbOpsErrNames = ['CastError', 'ValidationError'];
const { NODE_ENV: ENV } = process.env;

const getOpsStatusCode = (err) => {
  const error = err;
  if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError')
    return 401;
  if (mongoDbOpsErrNames.includes(error.name) || error.code === 11000)
    return 400;
  if (error.statusCode) return error.statusCode;
  return 500;
};

const handleProdMongoError = (err, res) => {
  const message =
    err.code === 11000
      ? `Values for ${Object.entries(err.keyValue).map(
          ([key, value]) => `${key} property (${value})`
        )} is already present. Please provide unique value`
      : err.message;

  res.status(err.statusCode).json({
    status: err.status,
    message,
  });
};

const handleDevError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    errors: err,
    stack: err.stack,
    message: err.message,
  });
};

const handleProdError = (err, res) => {
  if (`${err.statusCode}`.startsWith('4')) handleProdMongoError(err, res);
  else
    res.status(500).json({
      status: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error occurred',
    });
};

module.exports = (err, req, res, next) => {
  err.statusCode = getOpsStatusCode(err);
  err.status = err.status || 'ERROR';

  console.log(err);

  if (ENV === 'production') handleProdError(err, res);
  if (ENV === 'development') handleDevError(err, res);
};
