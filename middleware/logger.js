// @desc Adds logging that can subsequently be accessed in any route
const logger = (req, res, next) => {
	req.hello = 'Hello world';
	console.log(`${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl}`);
	next();  //Don't forget to move to the next middleware
}


module.exports = logger;