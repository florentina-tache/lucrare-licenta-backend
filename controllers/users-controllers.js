const HttpError = require("../models/http-error");
const User = require("../models/User");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({ role: "user" }, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const updateUser = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const updatePlaceToNotDisplay = async (req, res, next) => {
  const { userId, placeId } = req.body;

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

  if (!user) {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  // const updatedPlace = user.placesNotToDisplay.find(
  //   (place) => place.id === placeId
  // );

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
  const nextweek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7
  );

  const placeNotToDisplay = {
    placeDetails: place.id,
    expirationDate: nextweek,
  };

  try {
    user.placesNotToDisplay.push(placeNotToDisplay);
    await user.save();
  } catch (err) {
    const error = new HttpError("Something failed, please try again.", 500);
    console.log("errorUpdate", err)
    return next(error);
  }

  res.status(200);
};

const deleteUser = async (req, res, next) => {
  const userId = req.params.uid;
  const { role } = req.role;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete user.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for this id.", 404);
    return next(error);
  }

  const imagePath = user.image;

  if (role !== admin) {
    const error = new HttpError(
      'You are not allowed to delete this user.',
      401
    );
    return next(error);
  }

  try {
    await user.remove({});
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete user.",
      500
    );
    return next(error);
  }

  // fs.unlink(imagePath, (err) => {
  //   console.log(err);
  // });

  res.status(200).json({ message: "Deleted user." });
};

const deleteFavouritePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  const { userId } = req.userId;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for this id.", 404);
    return next(error);
  }

  //-----------------
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place.',
      500
    );
    return next(error);
  }

  //----------------

  const placeInFavourites = user.favouritePlaces.indexOf(placeId)
  let placeInNotDisplay;
  user.placesNotToDisplay.find((p, index) => {
    placeInNotDisplay = index
    return p.placeDetails.toString() === placeId
  })

  const today = new Date();
  const nextweek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7
  );

  if (placeInFavourites > -1 && placeInNotDisplay > -1) {
    user.favouritePlaces.splice(placeInFavourites, 1);
    // user.placesNotToDisplay.splice(placeInNotDisplay, 1);
    user.placesNotToDisplay[placeInNotDisplay].expirationDate = nextweek;
    try {
      await user.save();
    } catch (err) {
      const error = new HttpError(
        'Something went wrong, could not delete this place from favourites.',
        500
      );
      return next(error);
    }
  }

  res.status(200).json({ message: "Deleted user." });
};

exports.getUsers = getUsers;
exports.updatePlaceToNotDisplay = updatePlaceToNotDisplay;
exports.deleteUser = deleteUser;
exports.deleteFavouritePlace = deleteFavouritePlace;