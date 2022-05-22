const HttpError = require("../models/http-error");
const User = require("../models/User");

const getUsers = async (req, res, next) => {
  console.log("!!");
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
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  const updatedPlace = user.placesNotToDisplay.find(
    (place) => place.id === placeId
  );

  const today = new Date();
  const nextweek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7
  );

  const placeNotToDisplay = {
    placeDetails: { ...updatedPlace },
    expirationDate: nextweek,
  };

  try {
    user.placesNotToDisplay.push(placeNotToDisplay);
  } catch (err) {
    const error = new HttpError("Something failed, please try again.", 500);
    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

const deleteUser = async (req, res, next) => {
  const userId = req.params.uid;

  let user;
  try {
    console.log("a");
    user = await User.findById(userId);
    console.log("b", user);
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

exports.getUsers = getUsers;
exports.updatePlaceToNotDisplay = updatePlaceToNotDisplay;
exports.deleteUser = deleteUser;
