const checkPlacesExpiration = (places) => {
    console.log("places", places)
    const filteredPlaces = places.filter((p) => {
        try {
            const threshold = 60000; // 1 minute
            const currentTime = Date.now();
            const expirationTime = new Date(p.expirationDate).getTime();

            console.log("currentTime, expirationTime", currentTime, expirationTime)

            return !p.expirationDate || expirationTime - threshold > currentTime;
        } catch (error) {
            // keeps the place in the array if expiration time undefined and
            // new Date throws an error
            return true;
        }

        // console.log(p.expirationDate, Date.now(), p.expirationDate > Date.now(), !p.expirationDate)
        // return p.expirationDate > Date.now() || !p.expirationDate
    });
    console.log("places", filteredPlaces)
    return filteredPlaces;
}

module.exports = checkPlacesExpiration;