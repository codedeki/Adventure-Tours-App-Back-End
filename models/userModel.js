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

//Compare user typed password to databse password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
