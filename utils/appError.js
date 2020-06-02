class AppError extends Error {
  constructor(message, statusCode) {
    super(message); //message only param built in Error accepts, so call one param for super

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor); //prevent instances of AppError from polluting stack trace
  }
}

module.exports = AppError;
