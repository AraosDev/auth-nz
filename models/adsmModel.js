const mongoose = require('mongoose');
const crypto = require('crypto');
const becrypt = require('bcryptjs');
const validator = require('validator');
const {
  requiredFieldValidationMsg,
  modelConstants,
} = require('../common/constants/modelConstants');
const { getSignedToken } = require('../common/Utils/jwtUtils');

const adsmUserSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, requiredFieldValidationMsg('userName')],
      unique: true,
      minLength: 5,
    },
    email: {
      type: String,
      required: [true, requiredFieldValidationMsg('email')],
      unique: true,
      validate: [validator.default.isEmail, 'Please provide a valid email'],
    },
    accountType: {
      type: String,
      enum: {
        values: ['private', 'public', 'professional', 'celebrity'],
        message: 'Please specify the accountType',
      },
      default: 'public',
    },
    password: {
      type: String,
      required: [true, requiredFieldValidationMsg('password')],
      minLength: 5,
      maxLength: 15,
      select: false,
    },
    confirmPassword: {
      type: String,
      required: [true, requiredFieldValidationMsg('confirmPassword')],
      validate: {
        validator: function (el) {
          return this.password === el;
        },
        message: modelConstants.PASSWORDS_NOT_MATCH,
      },
    },
    phoneNumber: {
      type: String,
      required: [true, requiredFieldValidationMsg('phoneNumber')],
      minLength: 10,
      maxLength: 10,
      unique: true,
    },
    friends: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'adsmUserSchema',
        },
      ],
      default: [],
    },
    friendRequests: {
      requestedTo: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'adsmUserSchema',
        },
      ],
      requestedBy: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'adsmUserSchema',
        },
      ],
    },
    followers: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'adsmUserSchema',
        },
      ],
      default: [],
    },
    following: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'adsmUserSchema',
        },
      ],
      default: [],
    },
    photo: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpiresIn: Date,
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

adsmUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await becrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

adsmUserSchema.methods.isCorrectPwd = async function (pwdFromReq, pwdFromDb) {
  return await becrypt.compare(pwdFromReq, pwdFromDb);
};

adsmUserSchema.methods.isTokenSignedWithUpdatedPwd = function (jwtIssuedTime) {
  if (this.passwordChangedAt) {
    const passwordChangedTime = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return jwtIssuedTime > passwordChangedTime;
  }

  return true;
};

adsmUserSchema.methods.updateNewPwd = function (newPwd, confirmNewPwd) {
  this.password = newPwd;
  this.confirmPassword = confirmNewPwd;
  this.passwordChangedAt = Date.now() - 1000;
  const signedToken = getSignedToken(this._id.valueOf());

  return signedToken;
};

adsmUserSchema.methods.generateResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetTokenExpiresIn = Date.now() + 600000;

  return resetToken;
};

const UsersInAdsm = mongoose.model('adsmUserSchema', adsmUserSchema);

module.exports = UsersInAdsm;
