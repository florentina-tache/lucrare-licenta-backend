const { v1: uuidv1 } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const addImageToS3 = require('../util/aws');
const detectLabel = require('../util/detectLabel');
const Place = require('../models/Place');
const User = require('../models/User');

const getRandomPlace = async (req, res, next) => {
  let place;
  try {
    place = await Place.aggregate([{ $sample: { size: 1 } }]);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a place.',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      'Could not find place for the provided id.',
      404
    );
    return next(error);
  }
  //db.collection.deleteMany( { orderExpDate : {"$lt" : new Date(Date.now() - 7*24*60*60 * 1000) } })

  res.status(200).json({ place: place[0] });
};

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a place.',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      'Could not find place for the provided id.',
      404
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let placeType;
  if (req.params.type === 'added') {
    placeType = 'addedPlaces';
  } else if (req.params.type === 'favourites') {
    placeType = 'favouritePlaces';
  }

  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate(placeType);
  } catch (err) {
    const error = new HttpError(
      'Fetching places failed, please try again later.',
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces[placeType].length === 0) {
    return next(
      new HttpError('Could not find places for the provided user id.', 404)
    );
  }

  res.status(200).json({
    places: userWithPlaces[placeType].map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const getPlacesByTag = async (req, res, next) => {
  const { tag } = req.body;

  let places;
  try {
    places = await Place.find({ tags: tag });
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a place.',
      500
    );
    return next(error);
  }

  if (!places) {
    const error = new HttpError('Could not find any place.', 404);
    return next(error);
  }

  res
    .status(200)
    .json({ places: places});
};

const getLatestPlaces = async (req, res, next) => {
  console.log("!!!")
  let places;
  try {
    console.log("!")
    places = await Place.find().sort({$natural: -1 }).limit(3)
    console.log("?")
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a place.',
      500
    );
    return next(error);
  }

  if (!places) {
    const error = new HttpError('Could not find any place.', 404);
    return next(error);
  }

  res
    .status(200)
    .json({ places: places});
};

const createPlace = async (req, res, next) => {
  let placeType;
  if (req.params.type === 'added') {
    placeType = 'addedPlaces';
  } else if (req.params.type === 'favourites') {
    placeType = 'favouritePlaces';
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description, address, creator, image } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  let tagsList;
  // if (placeType === 'addedPlaces') {
  //   await addImageToS3(req.file);
  //   tagsList = await detectLabel(req.file.filename);
  // }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image:
      req.file?.path ||
      image ||
      'uploads\\1a59b73c-286e-488e-9f26-ee7aba124dd6.png',
    creator,
    tags: tagsList,
  });

  const placeNotToDisplay = {
    placeDetails: { ...createdPlace },
    expirationDate: null,
  };

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError(
      'Creating place failed, please try again.',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id.', 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user[placeType].push(createdPlace);
    user.placesNotToDisplay.push(placeNotToDisplay);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      'Creating place failed, please try again.',
      500
    );
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description, address } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place.',
      500
    );
    return next(error);
  }

  // if (place.creator.toString() !== req.userData.userId) {
  //   const error = new HttpError('You are not allowed to edit this place.', 401);
  //   return next(error);
  // }

  place.title = title;
  place.description = description;
  place.address = address;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place.',
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place.',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could not find place for this id.', 404);
    return next(error);
  }

  // if (place.creator.id !== req.userData.userId) {
  //   const error = new HttpError(
  //     'You are not allowed to delete this place.',
  //     401
  //   );
  //   return next(error);
  // }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.addedPlaces.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place.',
      500
    );
    return next(error);
  }

  // fs.unlink(imagePath, (err) => {
  //   console.log(err);
  // });

  res.status(200).json({ message: 'Deleted place.' });
};

exports.getRandomPlace = getRandomPlace;
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.getLatestPlaces = getLatestPlaces;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
exports.getPlacesByTag = getPlacesByTag;
