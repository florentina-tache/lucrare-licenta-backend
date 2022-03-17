const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

const usersController = require('../../controllers/users-controllers');

const User = require('../../models/user');

// @route   POST api/users/signup
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
