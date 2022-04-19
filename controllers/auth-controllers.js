const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

const HttpError = require('../models/http-error');
const User = require('../models/User');

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

  // Encrypt Password

  let hashedPassword;
  try {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  } catch (err) {
    return next(new HttpError('Could not create user, please try again.', 500));
  }

  let image = req.file?.path ? req.file.path : 'upload\\userDefault';

  const createdUser = new User({
    firstName,
    lastName,
    email,
    image,
    password: hashedPassword,
  });

  try {
    await createdUser.save();
  } catch (err) {
    return next(new HttpError('Signup failed, please try again later.', 500));
  }

  // Return jsonwebtoken

  let userId = createdUser.id;
  const payload = {
    userId,
    email: createdUser.email,
    image: createdUser.image,
  };

  let token;
  try {
    token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });
  } catch (err) {
    return next(new HttpError('Signup failed, please try again later.', 500));
  }

  res.status(201).json({ userId, token });
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

  let userId = existingUser.id;
  const payload = {
    userId,
    email: existingUser.email,
    image: existingUser.image,
  };

  let token;
  try {
    token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });
  } catch (err) {
    return next(new HttpError('Signup failed, please try again later.', 500));
  }

  res.status(201).json({ userId, token });
};

exports.signup = signup;
exports.login = login;
