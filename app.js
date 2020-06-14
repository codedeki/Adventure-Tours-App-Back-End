const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1) Global Middlewares
// Set security http headers with helmet
app.use(helmet());

// Development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate Limiting Middleware: define how many requests allowed per user IP address
const limiter = rateLimit({
  max: 100, // per hour
  windowMs: 60 * 60 * 1000,
  message:
    'Too many requests from your internet address, please try again in an hour!',
});
app.use('/api', limiter); // only affect routes starting in /api

// Body parser, reading data from body in req.body
app.use(express.json({ limit: '10kb' })); //middleware to modify incoming request data, e.g. don't accept data larger than limit

// Serving static files
app.use(express.static(`${__dirname}/public`)); //middleware to serve static files

// Test midleware
app.use((req, res, next) => {
  req.requestTIme = new Date().toISOString();
  // console.log(req.headers);
  next();
});

// app.get('/api/v1/tours', getAllTours);
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// 3) Routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

//Operational Error Handling on page not found = all url requests
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  //if pass argument to next(), express will assume there is an error
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//Middleware Error Handler: 4 params are automatically recognized as error handler middleware by Express
app.use(globalErrorHandler);

// 4) Start Server
module.exports = app;
