const router = require('express').Router();
const multerMiddleware = require('../common/Utils/multer');
const {
  createAccount,
  login,
  checkAuthNStatus,
  logout,
  updateAccountData,
  updateAccountPassword,
  sendResetToken,
  verifyResetTokenAndUpdatePWd,
  passLoginDetails,
  searchUsers,
  updateUserData,
} = require('../controllers/adsmController');

router.post('/signup', createAccount);
router.post('/login', login);
router.get('/getUserDetials', checkAuthNStatus, passLoginDetails);
router.get('/logout', checkAuthNStatus, logout);
router.patch(
  '/updateAccount/me',
  checkAuthNStatus,
  multerMiddleware.single('photo'),
  updateAccountData
);
router.patch('/updatePassword/me', checkAuthNStatus, updateAccountPassword);
router.patch('/updateAccount/:userId', checkAuthNStatus, updateUserData);
router.get('/forgotPassword', sendResetToken);
router.patch('/resetPassword/:resetToken', verifyResetTokenAndUpdatePWd);
router.get('/searchUsers/:searchKey', checkAuthNStatus, searchUsers);

module.exports = router;
