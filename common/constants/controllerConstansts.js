exports.controllerConstants = {
  API_SUCCESS: 'SUCCESS',
  LOGIN_API_INVALID_IP:
    'Please provide username or email or phone number and password.',
  LOGIN_API_INCORRECT_CREDENTIALS:
    'Please provide a valid username and password.',
  CHECK_AUTH_NOT_LOGGED_IN: 'Please login before using this resource',
  CHECK_AUTH_INVALID_USER: 'Please login with a valid and existing username',
  UPDATE_API_PWD_NOT_ALLOWED:
    'Password update is not allowed in this resource. Please use /updatePassword/me resource for password update',
  UPDATE_API_OLD_PWD_INVALID: 'Old Password does not match.',
  UPDATE_API_PWD_SUCCESS: 'Password updated successfully.',
  UPDATE_API_PWD_INVALID_IP:
    'Please update only password using this resource. For updating other data, use /updateAccount/me resource',
  SEND_RESET_TOKEN_API_INVALID_USER: 'Invalid User',
  VERIFY_RESET_TOKEN_API_INVALID_IP:
    'Please provide both password and confirm password',
  VERIFY_RESET_TOKEN_API_INVALID_TOKEN: 'Token has either expired or wrong.',
};
