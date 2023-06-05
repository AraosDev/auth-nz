class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.status = `${statusCode}`.startsWith('4') ? 'FAILED' : 'SERVER_ERROR';
    this.isOperationalError = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

module.exports = { AppError, catchAsync };
