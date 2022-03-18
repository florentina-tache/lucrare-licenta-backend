const { validationResult } = require('express-validator');
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

const HttpError = require('../models/http-error');

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs, please check your data.', 422));
  }

  const { firstName, lastName, email, password } = req.body;

  // See if user already exists
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError('Sign up failed, please try again later.', 500));
  }

  if (existingUser) {
    return next(new HttpError('User already exists, please login.', 422));
  }

  // Get gravatar

  const avatar = gravatar.url(email, {
    s: '200',
    r: 'pg',
    d: 'mm',
  });

  // Encrypt Password

  let hashedPassword;
  try {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  } catch (err) {
    return next(new HttpError('Could not create user, please try again.', 500));
  }

  const createdUser = new User({
    firstName,
    lastName,
    email,
    avatar,
    password: hashedPassword,
  });

  try {
    await createdUser.save();
  } catch (err) {
    return next(new HttpError('Signup failed, please try again later.', 500));
  }

  // Return jsonwebtoken

  const payload = {
    userId: createdUser.id,
    email: createdUser.email,
  };

  let token;
  try {
    token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });
  } catch (err) {
    return next(new HttpError('Signup failed, please try again later.', 500));
  }

  res.status(201).json({ token });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs, please check your data.', 422));
  }

  const { email, password } = req.body;

  // See if user already exists
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError('Login failed, please try again later.', 500));
  }

  if (!existingUser) {
    return next(new HttpError('Invalid credentials', 422));
  }

  const isPasswordMatching = await bcrypt.compare(
    password,
    existingUser.password
  );
  if (!isPasswordMatching) {
    return next(new HttpError('Invalid credentials', 422));
  }

  // Return jsonwebtoken

  const payload = {
    userId: existingUser.id,
    email: existingUser.email,
  };

  let token;
  try {
    token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });
  } catch (err) {
    return next(new HttpError('Signup failed, please try again later.', 500));
  }

  res.status(201).json({ token });
};

exports.signup = signup;
exports.login = login;
