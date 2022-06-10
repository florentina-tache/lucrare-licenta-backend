const express = require('express');
const router = express.Router();
const HttpError = require('../models/http-error');

router.get('/', (req, res, next) => {
  try {
     return res.status(200).json({
          message: "App is up and running!",
          status: 200,
      })
  } catch (err) {
    return next(new HttpError('App is down for maintanance', 500));
  }
});

module.exports = router;
