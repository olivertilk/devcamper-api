const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');

// @desc Register user
// @route POST /api/v1/auth/register
// @access Public
exports.register = asyncHandler(async (req, res, next) => {
	const { name, email, password, role } = req.body;

	//Create user
	const user = await User.create({
		name, 
		email,
		password,
		role
	});
	
	//Call the helper function that gets the token, creates the cookie and sends the response
	sendTokenResponse(user, 200, res);
});


// @desc Login user
// @route POST /api/v1/auth/login
// @access Public
exports.login = asyncHandler(async (req, res, next) => {
	const {email, password} = req.body;

	//Validate email & password
	if(!email || !password) {
		return next(new ErrorResponse('Please provide an email and password to login', 400));
	}

	//Check for user
	//+password overrides the select: false property of the password field
	const user = await User.findOne({email: email}).select('+password');

	if(!user){
		return next(new ErrorResponse('Invalid credentials', 401));
	}

	//Check if password matches
	const isMatch = await user.matchPassword(password);
	if(!isMatch){
		return next(new ErrorResponse('Invalid credentials', 401));
	}
	
	//Call the helper function that gets the token, creates the cookie and sends the response
	sendTokenResponse(user, 200, res);
});

// @desc Get current logged in user
// @route POST /api/v1/auth/me
// @access Private
exports.getMe = asyncHandler(async (req, res, next) => {
	//There is a user property on the request object because it was added by the auth middleware,
	//which takes the token and decodes it to get the user's id.
	const user = await User.findById(req.user.id);

	res.status(200).json({
		success: true,
		data: user
	})
});

// @desc Forgot password
// @route POST /api/v1/auth/forgotpassword
// @access Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
	//There is a user property on the request object because it was added by the auth middleware,
	//which takes the token and decodes it to get the user's id.
	const user = await User.findOne({email: req.body.email});

	if(!user){
		return next(new ErrorResponse('There is no user with that email.', 404));
	}

	//Get reset token
	const resetToken = user.getResetPasswordToken();

	//Save the new values in the reset fields back into the database
	await user.save({validateBeforeSave: false});

	//Create reset url
	const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

	const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

	try {
		await sendEmail({
			email: user.email,
			subject: 'Password reset token',
			message: message
		});

		res.status(200).json({success: true, data: 'Email sent'});
	} catch (err) {
		console.log(err);
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		await user.save({validateBeforeSave: false});

		return next(new ErrorResponse('Email could not be sent', 500));
	}

});

// @desc Reset password
// @route PUT /api/v1/auth/resetpassword/:resettoken
// @access Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
	//Get hashed token
	const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

	const user = await User.findOne({
		resetPasswordToken: resetPasswordToken, 
		resetPasswordExpire: { 
			$gt: Date.now()
		} 
	});

	if(!user) {
		return next(new ErrorResponse('Invalid token', 400));
	}

	//Set new password
	user.password= req.body.password;
	user.resetPasswordToken = undefined;
	user.resetPasswordExpire = undefined;
	await user.save();

	//Call the helper function that gets the token, creates the cookie and sends the response
	//This is to log in the user after resetting the password
	sendTokenResponse(user, 200, res);
});


// @desc Update user details
// @route PUT /api/v1/auth/updatedetails
// @access Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
	//Need to pull out the name and email because if you use req.body in the update, 
	//it leaves the route vulnerable to updating other fields as well
	const fieldsToUpdate = {
		name: req.body.name,
		email: req.body.email
	}
	//There is a user property on the request object because it was added by the auth middleware,
	//which takes the token and decodes it to get the user's id.
	const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
		new: true,
		runValidators: true
	});

	res.status(200).json({
		success: true,
		data: user
	})
});


// @desc Update password
// @route PUT /api/v1/auth/updatepassword
// @access Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
	//There is a user property on the request object because it was added by the auth middleware,
	//which takes the token and decodes it to get the user's id.
	const user = await User.findById(req.user.id).select('+password');

	//Check current password
	if(!(await user.matchPassword(req.body.currentPassword))) {
		return next(new ErrorResponse('Password is incorrect', 401));
	}

	user.password = req.body.newPassword;
	await user.save();

	//Call the helper function that gets the token, creates the cookie and sends the response
	//This is to log in the user after resetting the password
	sendTokenResponse(user, 200, res);
});

// @desc Log out user / clear cookie
// @route GET /api/v1/auth/logout
// @access Private
exports.logout = asyncHandler(async (req, res, next) => {
	res.cookie('token', 'none', {
		expires: new Date(Date.now + 10 * 1000),
		httpOnly: true
	});

	res.status(200).json({
		success: true,
		data: {}
	})
});


//Custom function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
	//This is a method defined on the object returned from the database, not a static method, which is
	//defined on the model itself
	const token = user.getSignedJwtToken();

	//httpOnly makes is accessible only by client-side script
	const options = {
		expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
		httpOnly: true
	};
	
	//In production send the cookie with HTTPS
	if(process.env.NODE_ENV === 'production') {
		options.secure = true;
	}

	//.cookie() takes in 3 parameters: key of cookie, value of cookie and options
	res.status(statusCode).cookie('token', token, options).json({
		success: true,
		token: token
	});
};







