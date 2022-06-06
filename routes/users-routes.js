const express = require("express");
const { check } = require("express-validator");

const usersController = require("../controllers/users-controllers");
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get("/", usersController.getUsers);

router.patch("/places", usersController.updatePlaceToNotDisplay);

router.delete("/:uid", usersController.deleteUser);

router.delete("/favourites/:pid", usersController.deleteFavouritePlace);

module.exports = router;
