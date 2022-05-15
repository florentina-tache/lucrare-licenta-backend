const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  addedPlaces: [
    { type: mongoose.Types.ObjectId, required: true, ref: 'Place' },
  ],
  favouritePlaces: [
    { type: mongoose.Types.ObjectId, required: true, ref: 'Place' },
  ],
  placesNotToDisplay: [
    {
      placeDetails: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'Place',
      },
      expirationDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model('User', userSchema);
