const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

const User = require('../../models/user');
const HttpError = require('../../models/http-error');

// @route   GET api/users
// @desc    Test route
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

// @route   POST api/auth
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
  usersController.signup
);

module.exports = router;
