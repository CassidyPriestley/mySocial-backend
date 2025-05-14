class AppError extends Error {
  constructor(message, statusCode) {
    // Calls the parent (Error) constructor with the message.
    super(message);
    // Sets the statusCode property.
    this.statusCode = statusCode;
    // Determines if the status is 'fail' or 'error' based on the statusCode.
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    // Captures the stack trace, excluding the constructor call from it.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
