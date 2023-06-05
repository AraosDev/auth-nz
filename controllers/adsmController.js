const { promisify } = require('util');
const validator = require('validator');
const crypto = require('crypto');
const { catchAsync, AppError } = require('../common/Utils/appError');
const { getSignedToken, jwt, JWT_SECRET } = require('../common/Utils/jwtUtils');
const UsersInAdsm = require('../models/adsmModel');
const { modelConstants } = require('../common/constants/modelConstants');
const Email = require('../common/Utils/email');
const uploadToGcs = require('../common/Utils/gcsStorage');
const {
  API_SUCCESS,
  LOGIN_API_INVALID_IP,
  LOGIN_API_INCORRECT_CREDENTIALS,
  CHECK_AUTH_NOT_LOGGED_IN,
  CHECK_AUTH_INVALID_USER,
  UPDATE_API_PWD_NOT_ALLOWED,
  UPDATE_API_OLD_PWD_INVALID,
  UPDATE_API_PWD_SUCCESS,
  UPDATE_API_PWD_INVALID_IP,
  SEND_RESET_TOKEN_API_INVALID_USER,
  VERIFY_RESET_TOKEN_API_INVALID_IP,
  VERIFY_RESET_TOKEN_API_INVALID_TOKEN,
} = require('../common/constants/controllerConstansts').controllerConstants;

const { GCS_BUCKET_URL } = process.env;

exports.createAccount = catchAsync(async (req, res, next) => {
  const {
    userName,
    email,
    accountType,
    password,
    phoneNumber,
    confirmPassword,
  } = req.body;

  const createdUser = await UsersInAdsm.create({
    userName,
    email,
    accountType,
    password,
    phoneNumber,
    confirmPassword,
  });

  res.status(200).json({
    status: API_SUCCESS,
    user: {
      userName: createdUser.userName,
      email: createdUser.email,
      phoneNumber: createdUser.phoneNumber,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { userDetail, password } = req.body || {};
  if (!userDetail || !password)
    return next(new AppError(400, LOGIN_API_INVALID_IP));
  const filters = {};

  if (validator.default.isEmail(userDetail)) filters.email = userDetail;
  else if (validator.default.isMobilePhone(userDetail))
    filters.phoneNumber = userDetail;
  else filters.userName = userDetail;

  const user = await UsersInAdsm.findOne(filters)
    .select('+password')
    .populate('friends', '-__v')
    .populate('friendRequests.requestedTo', '-__v')
    .populate('friendRequests.requestedBy', '-__v')
    .populate('followers', '-__v')
    .populate('following', '-__v');

  if (!user || !(await user.isCorrectPwd(password, user.password)))
    return next(new AppError(400, LOGIN_API_INCORRECT_CREDENTIALS));

  const token = getSignedToken(user._id);
  res.cookie('JWT_TOKEN', token, {
    expiresIn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: !process.env.NODE_ENV.includes('dev'),
  });

  res.status(200).json({
    status: API_SUCCESS,
    user: {
      userName: user.userName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      accountType: user.accountType,
      id: user.id,
      followers: user.followers,
      friendRequests: user.friendRequests,
      following: user.following,
      friends: user.friends,
      photo: user.photo,
    },
    token,
  });
});

exports.checkAuthNStatus = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization
    ? req.headers.authorization.split('Bearer ')[1]
    : '';

  if (!token) return next(new AppError(401, CHECK_AUTH_NOT_LOGGED_IN));

  const decodeduser = await promisify(jwt.verify)(token, JWT_SECRET);

  const loggedInUser = await UsersInAdsm.findById(decodeduser.id)
    .select('+password')
    .populate('friends', '-friendRequests -__v')
    .populate('friendRequests.requestedBy', '-friendRequests -__v')
    .populate('friendRequests.requestedTo', '-friendRequests -__v');

  if (!loggedInUser) return next(new AppError(401, CHECK_AUTH_INVALID_USER));

  req.loggedInUser = loggedInUser;
  req.token = token;

  next();
});

exports.passLoginDetails = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'SUCCESS', user: req.loggedInUser });
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('JWT_TOKEN', 'loggedout', {
    expiresIn: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: API_SUCCESS,
    message: 'User successfully logged out',
    token: 'loggedout',
  });
});

exports.updateAccountData = catchAsync(async (req, res, next) => {
  if (req.body.password)
    return next(new AppError(400, UPDATE_API_PWD_NOT_ALLOWED));
  const user = req.loggedInUser;
  const userProps = Object.keys(req.body);
  // Updating other props
  userProps.forEach((updateProp) => {
    if (updateProp !== 'photo') user[updateProp] = req.body[updateProp];
  });

  // Updating display photo prop
  if (req.file) {
    const uploadDpRes = await uploadToGcs(req.file, `${user._id}/dp`);
    if (uploadDpRes === 'UPLOADED')
      user.photo = `${GCS_BUCKET_URL}/${user._id}/dp/${req.file.originalname}`;
    else return next(new AppError('Error in uploading your DP', 400));
  }

  const updatedUser = await user.save({ validateBeforeSave: false });

  const updatedUserInfo = await UsersInAdsm.findById(updatedUser.id)
    .populate('friends', '-friendRequests -__v')
    .populate('friendRequests.requestedBy', '-friendRequests -__v')
    .populate('friendRequests.requestedTo', '-friendRequests -__v');

  res.status(200).json({
    status: API_SUCCESS,
    user: updatedUserInfo,
  });
});

exports.updateAccountPassword = catchAsync(async (req, res, next) => {
  const updateProps = Object.keys(req.body);
  if (
    Object.keys(req.body).length === 3 &&
    updateProps.every((prop) => prop.toLowerCase().includes('password'))
  ) {
    const user = req.loggedInUser;
    if (!(await user.isCorrectPwd(req.body.oldPassword, user.password)))
      return next(new AppError(400, UPDATE_API_OLD_PWD_INVALID));
    if (req.body.newPassword !== req.body.confirmNewPassword)
      return next(new AppError(400, modelConstants.PASSWORDS_NOT_MATCH));
    const newToken = user.updateNewPwd(
      req.body.newPassword,
      req.body.confirmNewPassword
    );

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      status: API_SUCCESS,
      message: UPDATE_API_PWD_SUCCESS,
      token: newToken,
    });
  }

  return next(new AppError(400, UPDATE_API_PWD_INVALID_IP));
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const reqUpdateProps = Object.keys(req.body);
  const allowedUpdateProps = [
    'friends',
    'friendRequests',
    'followers',
    'following',
  ];

  if (reqUpdateProps.some((prop) => !allowedUpdateProps.includes(prop)))
    return next(
      new AppError(400, 'Requested data cannot be updated using the resource')
    );
  const user = await UsersInAdsm.findById(userId).select('+password');
  reqUpdateProps.forEach((prop) => {
    user[prop] = req.body[prop];
  });

  const updatedUser = await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'SUCCESS', user: updatedUser });
});

exports.sendResetToken = catchAsync(async (req, res, next) => {
  const { userDetail } = req.query;

  if (!userDetail) return next(new AppError(400, LOGIN_API_INVALID_IP));

  const filters = {};
  if (validator.default.isEmail(userDetail)) filters.email = userDetail;
  else if (validator.default.isMobilePhone(userDetail))
    filters.phoneNumber = userDetail;
  else filters.userName = userDetail;

  const user = await UsersInAdsm.findOne(filters);

  if (!user) return next(new AppError(400, SEND_RESET_TOKEN_API_INVALID_USER));

  const resetToken = user.generateResetToken();
  const resetLink = `${req.get('origin')}/resetPassword?token=${resetToken}`;
  await user.save({ validateBeforeSave: false });

  await new Email(user, resetLink).sendResetTokenMail();

  res.status(200).json({
    status: API_SUCCESS,
    message: 'Reset token is sent to your email successfully.',
  });
});

exports.verifyResetTokenAndUpdatePWd = catchAsync(async (req, res, next) => {
  const { password, confirmPassword } = req.body;
  const { resetToken } = req.params;

  if (!password || !confirmPassword)
    return next(new AppError(400, VERIFY_RESET_TOKEN_API_INVALID_IP));

  if (password !== confirmPassword)
    return next(new AppError(400, modelConstants.PASSWORDS_NOT_MATCH));

  const encryptedResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await UsersInAdsm.findOne({
    passwordResetToken: encryptedResetToken,
    passwordResetTokenExpiresIn: { $gt: Date.now() },
  }).select('+password');

  if (!user)
    return next(new AppError(400, VERIFY_RESET_TOKEN_API_INVALID_TOKEN));

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpiresIn = undefined;

  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: API_SUCCESS,
    message: 'Password updated successfully.',
  });
});

exports.searchUsers = catchAsync(async (req, res, next) => {
  const { searchKey } = req.params;

  if (!searchKey)
    return next(new AppError(400, 'Please provide a valid search key'));
  const allUsers = await UsersInAdsm.find({}).select('-__v');
  const searchedUsers = allUsers.filter(
    ({ userName }) =>
      userName.includes(searchKey) && userName !== req.loggedInUser.userName
  );

  if (!searchedUsers.length)
    return next(new AppError(404, 'No Users match the searchKey'));

  res.status(200).json({
    status: 'SUCCESS',
    users: searchedUsers,
  });
});
