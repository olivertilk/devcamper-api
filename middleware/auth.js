const jwt = require('jsonwebtoken');
const asyncHandler = require ('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

//Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
	let token;

	//Look for a Bearer authorization token in the headers
	if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		token = req.headers.authorization.split(' ')[1];
	}
	//else look in the cookie for authorization information
	else if(req.cookies.token){
		token = req.cookies.token
	}

	//Make sure token exist
	if(!token){
		return next(new ErrorResponse('Not authorized to access this resource', 401));
	}

	try {
		//Verify token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		console.log(decoded);

		req.user = await User.findById(decoded.id);

		next();

	} catch (err) {
		return next(new ErrorResponse('Not authorized to access this resource', 401));

	}
});

//Grant access to specific roles, which are provided in a comma separated list
exports.authorize = (...roles) => {
	return (req, res, next) => {
		if(!roles.includes(req.user.role)) {
			return next(new ErrorResponse(`User role ${req.user.role} is not authorized to access this resource`, 403));
		}
		next();
	}
};
