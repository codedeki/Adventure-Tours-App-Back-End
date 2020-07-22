const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your username!'],
    unique: true,
    trim: true,
    maxlength: [40, 'A username cannot be longer than 40 characters'],
    minlength: [10, 'A username must be longer than 10 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid e-mail address'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, //hide password in data output
  },
  passwordConfirm: {
    type: String,
    //required as input; not required as persistent to db
    required: [true, 'Please confirm your password'],
    validate: {
      //Only works on .create() & .save()
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//Encryption BCRYPT
userSchema.pre('save', async function (next) {
  //Only run if psw modified
  if (!this.isModified('password')) return next();
  //hash psw
  this.password = await bcrypt.hash(this.password, 12);
  //delete psw confirm field
  this.passwordConfirm = undefined;
  next();
});

//Password Reset Middleware: Runs before new doc is saved
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; //put psw change at 1 second in past to give time for token to be created
  next();
});

//Hide User when Deleted Middleware
userSchema.pre(/^find/, function (next) {
  //points to current query
  this.find({ active: { $ne: false } });
  next();
});

//Compare user typed password to databse password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//Check if password changed after token issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(
      `Password Change Function Call Time Stamp: ${changedTimestamp} vs JWT Time Stamp At Login: ${JWTTimestamp}`
    );
    return JWTTimestamp < changedTimestamp;
    /* As soon as a user changes password, the code in this function executes to make a date stamp of that change by calling getTime(); we then compare that getTime() date stamp with the date stamp of the existing token that was issued at login; if the date stamp of the changed password function using getTime() is newer than or more recent: i.e. *greater than*, that means the password was changed and therefore the token date stamp is older than or outdated: i.e. *less than*, so we return false in the next line and deny access to user profile */
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
