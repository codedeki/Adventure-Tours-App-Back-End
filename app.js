const express = require('express');
const morgan = require('morgan');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1) Middlewares
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.json()); //middleware to modify incoming request data
app.use(express.static(`${__dirname}/public`)); //middleware to serve static files

app.use((req, res, next) => {
  console.log('Middleware 2 activated');
  req.requestTIme = new Date().toISOString();
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
