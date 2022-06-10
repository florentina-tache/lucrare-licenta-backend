const { v1: uuidv1 } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const addImageToS3 = require('../util/aws');
const detectLabel = require('../util/detectLabel');
const Place = require('../models/Place');
const User = require('../models/User');

const generatePlace = async () => {
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
  return place;
}

const getPlaceToNotDisplay = async (placeId) => {
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something wrong happened.",
      500
    );
    return next(error);
  }

  const today = new Date();
  // const nextweek = new Date(
  //   today.getFullYear(),
  //   today.getMonth(),
  //   today.getDate() + 7
  // );

  var oldDateObj = new Date();
  var nextweek = new Date();
  nextweek.setTime(oldDateObj.getTime() + (2 * 60 * 1000));

  const placeNotToDisplay = {
    placeDetails: place.id,
    expirationDate: nextweek,
  };

  return placeNotToDisplay
};

const getRandomPlace = async (req, res, next) => {
  const userId = req.params.uid;
  const placeId = req.params.pid;

  // console.log(userId, placeId)

  let placesCount;
  try {
    placesCount = await Place.count();
  } catch (err) {
  }

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something wrong happened.",
      500
    );
    return next(error);
  }

  //--------------------
  if (placeId !== "1") {
    const placeNotToDisplay = await getPlaceToNotDisplay(placeId)
    try {
      user.placesNotToDisplay.push(placeNotToDisplay);
      await user.save();
    } catch (err) {
      const error = new HttpError("Something failed, please try again.", 500);
      // console.log("errorUpdate", err)
      return next(error);
    }
  }
  //--------------------

  const userPlacesCount = user.placesNotToDisplay.length;
  if (placesCount === userPlacesCount) {
    const error = new HttpError(
      'Did not find any new places.',
      404
    );
    return next(error);
  }

  let place;
  let shouldNotDisplay;
  do {
    place = await generatePlace();
    shouldNotDisplay = user.placesNotToDisplay.find((p) => {
      return p.placeDetails.toString() === place[0]._id.toString()
    })
  } while (shouldNotDisplay);
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
    .json({ places: places });
};

const getLatestPlaces = async (req, res, next) => {
  let places;
  try {
    places = await Place.find().sort({ $natural: -1 }).limit(3)
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
    .json({ places: places });
};

const getMostLikedPlaces = async (req, res, next) => {
  let places;
  try {
    places = await Place.find().sort({ likes: -1 }).limit(3)
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
    .json({ places: places });
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

  const { title, description, address, creator, image, placeId } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  let tagsList;
  if (placeType === 'addedPlaces') {
    await addImageToS3(req.file);
    tagsList = await detectLabel(req.file.filename);
  }

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

  let place;
  if (placeType === 'favouritePlaces') {
    const alreadyInFavourites = user.placesNotToDisplay.find((p) => {
      return p.placeDetails.toString() === placeId
    })
    if (alreadyInFavourites) {
      const error = new HttpError(
        'Place already in favourites or added by you.',
        500
      );
      return next(error);
    }

    try {
      place = await Place.findById(placeId);
      place.likes += 1;
      await place.save();
    } catch (err) {
    }
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    let savedPlace;
    if (placeType === 'addedPlaces') {
      savedPlace = await createdPlace.save({ session: sess });
      user[placeType].push(createdPlace);
    }
    if (placeType === 'favouritePlaces') {
      // await createdPlace.save({ session: sess });
      user[placeType].push(place);
    }
    const placeNotToDisplay = {
      placeDetails: placeId || savedPlace._id,
      expirationDate: null,
    };
    user.placesNotToDisplay.push(placeNotToDisplay);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    // console.log(err);
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
  const { role } = req.role;
  const { userId } = req.userId;

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

  if (role === 'user' && (place.creator.toString() !== userId)) {
    const error = new HttpError('You are not allowed to edit this place.', 401);
    return next(error);
  }

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
  const { role } = req.role;
  const { userId } = req.userId;
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

  if (role === 'user' && (place.creator.id !== userId)) {
    const error = new HttpError(
      'You are not allowed to delete this place.',
      401
    );
    return next(error);
  }

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
exports.getMostLikedPlaces = getMostLikedPlaces;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
exports.getPlacesByTag = getPlacesByTag;
