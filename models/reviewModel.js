const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId, //parent referencing
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user '],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate reviews on a tour from same user
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Use Populate to decide what data to show when view a Review
reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//Update Average Rating on Tours: Static - only used instance thusfar
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  console.log(tourId);
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Middleware: Calc New Average after a new review is posted
reviewSchema.post('save', function () {
  //can't use Review.calcAverageRatings before init so must use constructor to point to current model/review
  this.constructor.calcAverageRatings(this.tour);
});

//findByIdAndUpdate //findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //pass data from pre to post middleware using the 'this' keyword
  this.r = await this.findOne(); //revrieve current document from db and store in varialbe
  next();
});
//retrieve the 'this' keyword in post middleware
reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne() does not work here, since query already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
