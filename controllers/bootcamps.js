const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');

//Create different methods associated with different routes


//Functions exported for the Bootcamps API. Uses:
//--Custom error response if resource not found in database
//--Custom error handler when a database error is returned
//--Uses async/await instead of a callback function for database requests
//--Responds with .json instead of .send
//--Uses an asyncHandler to avoid repeating try/catch blocks. Necessary because database calls
//----are all asynchronous.
//--Uses Mongoose middleware to preprocess submitted data to add additional fields (e.g. location coordinates)

// @desc Get all bootcamps
// @route GET /api/v1/bootcamps
// @access Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
	//console.log('in getBootcamps:', res.advancedResults);
	//The advancedResults middleware gives us access to the result object
	res.status(200).json(res.advancedResults);
	//res.status(200).json({success: true, count: bootcamps.length, pagination: pagination, data: bootcamps});
	
});

// @desc Get single bootcamp
// @route GET /api/v1/bootcamps/:id
// @access Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findById(req.params.id);
	if(!bootcamp) {
		return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
	}

	res.status(200).json({success: true, data: bootcamp});
});

// @desc Create new bootcamp
// @route POST /api/v1/bootcamps
// @access Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
	//Add the logged in user to the user property of the request body
	req.body.user = req.user.id;

	//Check for published bootcamp
	const publishedBootcamp = await Bootcamp.findOne({user: req.user.id});

	//If the user is not an admin, they can only add one bootcamp
	if(publishedBootcamp && req.user.role !== 'admin'){
		return next(new ErrorResponse(`The user with ID ${req.user.id} has already published a bootcamp`, 400));
	}

	//Now create the bootcamp
	const bootcamp = await Bootcamp.create(req.body);
	res.status(201).json({success:true, data: bootcamp});
});

// @desc Update bootcamp
// @route PUT /api/v1/bootcamps/:id
// @access Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
	let bootcamp = await Bootcamp.findById(req.params.id);

	if(!bootcamp) {
		return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
	}

	//Check that the user is the owner of the bootcamp
	if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401));
	}

	bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
		runValidators: true
	});

	res.status(200).json({success:true, data: bootcamp});
});

// @desc Delete bootcamp
// @route DELETE /api/v1/bootcamps/:id
// @access Private
// Note: .findByIdAndDelete() is not going to trigger the 'pre' middleware
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findById(req.params.id);

	if(!bootcamp) {
		return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
	}

	//Check that the user is the owner of the bootcamp
	if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.params.id} is not authorized to delete this bootcamp`, 401));
	}

	bootcamp.remove();

	res.status(200).json({success:true, data: {}});
});

// @desc Get bootcamps within a radius. Converts zip code and distance into lat/long and uses a geocoder.
// @route GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
	const {zipcode, distance} = req.params; //Pull out parameters from the URL

	//Get lat/lng from the geocoder
	const loc = await geocoder.geocode(zipcode);
	const lat = loc[0].latitude;
	const lng = loc[0].longitude;

	//Calc radius using radians
	//Divide dist by radius of Earth
	//Earth radius = 3,963 mi
	const radius = distance / 3963;

	const bootcamps = await Bootcamp.find({
		location: { $geoWithin: { $centerSphere: [ [ lng, lat ], radius ]}}
	});

	res.status(200).json({
		success: true,
		count: bootcamps.length,
		data: bootcamps
	});
});


// @desc Upload photo for bootcamp
// @route PUT /api/v1/bootcamps/:id/photo
// @access Private
// Note: .findByIdAndDelete() is not going to trigger the 'pre' middleware
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findById(req.params.id);

	if(!bootcamp) {
		return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
	}

	//Check that the user is the owner of the bootcamp
	if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401));
	}

	if(!req.files){
		return next(new ErrorResponse(`Please upload a file`, 400));
	}

	const file = req.files.file;

	//Validate the file is a photo
	if(!file.mimetype.startsWith('image')){
		return next(new ErrorResponse(`Please upload an image file`, 400));
	}

	//Check file size
	if(file.size > process.env.MAX_FILE_UPLOAD){
		return next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
	}

	//Create custom filename
	//Also add the file extension to the name using path
	file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

	file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
		if(err){
			console.eror(err);
			return next(new ErrorResponse(`Problem with file upload`, 500));
		}

		//Insert file name into database
		await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name});
	})


	res.status(200).json({success:true, data: file.name});
});















