const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

const auth = require('../../middleware/auth');

const User = require('../../models/user');
const HttpError = require('../../models/http-error');
const authController = require('../../controllers/auth-controllers');

// @route   GET api/auth
// @desc    Authentication route
// @access  Public

router.get('/', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId.userId).select('-password');
    res.json(user);
  } catch (err) {
    return next(
      new HttpError('Authentication failed, please try again later.', 500)
    );
  }
});

// @route   POST api/auth/signup
// @desc    Register user
// @access  Public

router.post(
  '/signup',
  [
    check('firstName', 'First Name is required').not().isEmpty(),
    check('lastName', 'Last Name is required').not().isEmpty(),
    check('email', 'Email is not valid').isEmail(),
    check(
      'password',
      'Password is not valid, 8 or more characters required'
    ).isLength({ min: 8 }),
  ],
  authController.signup
);

// @route   POST api/auth/login
// @desc    Login user
// @access  Public

router.post(
  '/login',
  [
    check('email', 'Email is invalid').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  authController.login
);

module.exports = router;
