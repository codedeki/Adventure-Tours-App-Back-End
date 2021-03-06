const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

//Define view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // correct path

// 1) Global Middlewares
// Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public'))); //links all pug files with the public folder
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
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // added to update HTML form
app.use(cookieParser());

// Data Sanitization against NoSQL query injection
// e.g. POST login with this in body, which returns true:
// {
//   "email": { "$gt": "" },
//   "password": "password"
// }
app.use(mongoSanitize());

// Data Sanitization against XSS
app.use(xss());

// Prevent parameter pollution (remove duplicate query strings) / except: can white-list some params if desire
// e.g. ...api/v1/tours?duration=5&duration=9 is now allowed b/c duration is in whitelist
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression()); // compress text for deployment

// Test midleware
app.use((req, res, next) => {
  req.requestTIme = new Date().toISOString();
  // console.log(req.headers);
  // console.log(req.cookies);
  next();
});

// app.get('/api/v1/tours', getAllTours);
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// 3) Routes

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

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
