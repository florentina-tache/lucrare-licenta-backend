const express = require("express");
const { check } = require("express-validator");

const usersController = require("../controllers/users-controllers");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", usersController.getUsers);

router.patch("/places", usersController.updatePlaceToNotDisplay);

router.delete("/:uid", usersController.deleteUser);

module.exports = router;
