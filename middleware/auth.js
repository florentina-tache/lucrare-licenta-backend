const jwt = require('jsonwebtoken');
const config = require('config');

const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  try {
    const token = req.headers.authorization.split(' ')[1];
    //const token = req.header('x-auth-token');

    if (!token) {
      throw new HttpError('Authentication failed, please try again later.');
    }

    const decodedToken = jwt.verify(token, config.get('jwtSecret'));

    req.userId = { userId: decodedToken.userId };
    req.role = { role: decodedToken.role };
    next();
  } catch (err) {
    return next(
      new HttpError('Authentication failed, please try again later.', 401)
    );
  }
};
