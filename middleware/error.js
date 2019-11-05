const ErrorResponse = require('../utils/errorResponse');
//Custom error handling middleware, must take 4 arguments
const errorHandler = (err, req, res, next) => {
	//Make a copy of the error object and pull out all its properties
	let error = {...err};

	////console.log('new error variable contains ', error);
	////console.log('err.message contains ', err.message);

	error.message = err.message;
	
	//Log to console for dev
	//console.log(err);

	//Mongoose bad ObjectId
	//This error fires whenever an improperly formatted object id is submitted
	if(err.name === "CastError") {
		const message = `Resource not found`;
		error = new ErrorResponse(message, 404);
	}

	// Mongoose duplicate key
	if(err.code === 11000) {
		const message = 'Duplicate field value entered';
		error = new ErrorResponse(message, 400);
	}

	// Mongoose validation key
	if(err.name === 'ValidationError') {
		const message = Object.values(err.errors).map(val => val.message);
		error = new ErrorResponse(message, 400);
	}


	console.log(err.name);

	res.status(error.statusCode || 500).json({
		success: false,
		error: error.message || 'Server Error'
	})
}

module.exports = errorHandler;