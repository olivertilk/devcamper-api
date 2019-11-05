const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Course = require('../models/Course');
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

// @desc Get all courses
// @route GET /api/v1/courses
// @route GET /api/v1/bootcamps/:bootcampId/courses
// @access Public
exports.getCourses = asyncHandler(async (req, res, next) => {
	//Check if the bootcamp ID exists. If it does, return courses for it, if not return all courses
	let query;

	if(req.params.bootcampId){
		//Here, a bootcamp id was specified so the advancedResults middleware is not necessary
		const courses = await Course.find({
			bootcamp: req.params.bootcampId
		});

		return res.status(200).json({
			success: true,
			count: courses.length,
			data: courses
		});
	}else{
		res.status(200).json(res.advancedResults);
	}
});


// @desc Get single course
// @route GET /api/v1/courses/:id
// @access Public
exports.getCourse = asyncHandler(async (req, res, next) => {
	const course = await Course.findById(req.params.id).populate({
		path: 'bootcamp',
		select: 'name description'
	});

	if(!course){
		return next(new ErrorResponse(`No course with the id of ${req.params.id}`), 404);
	}

	res.status(200).json({
		success: true,
		data: course
	});
});

// @desc Add course
// @route POST /api/v1/bootcamps/:bootcampId/courses
// @access Private
exports.addCourse = asyncHandler(async (req, res, next) => {
	//Add the bootcamp and user IDs to the request body so they can be saved in the database
	req.body.bootcamp = req.params.bootcampId;
	req.body.user = req.user.id;

	const bootcamp = await Bootcamp.findById(req.params.bootcampId);

	if(!bootcamp){
		return next(new ErrorResponse(`No bootcamp with the id of ${req.params.bootcampId}`), 404);
	}

	//Check that the user is the owner of the bootcamp
	if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.user.id} is not authorized to add a course to this bootcamp`, 401));
	}
	
	const course = await Course.create(req.body);

	res.status(200).json({
		success: true,
		data: course
	});
});

// @desc Update course
// @route PUT /api/v1/courses/:id
// @access Private
exports.updateCourse = asyncHandler(async (req, res, next) => {
	let course = await Course.findById(req.params.id);

	if(!course){
		return next(new ErrorResponse(`No course with the id of ${req.params.id}`), 404);
	}

	//Check that the user is the owner of the course
	if(course.user.toString() !== req.user.id && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this course`, 401));
	}

	//The third parameter is options. 'new: true' causes the call to return the updated document.
	//runValidators runs the validators on the update object
	course = await Course.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
		runValidators: true
	});
	

	res.status(200).json({
		success: true,
		data: course
	});
});

// @desc Delete course
// @route DELETE /api/v1/courses/:id
// @access Private
exports.deleteCourse = asyncHandler(async (req, res, next) => {
	const course = await Course.findById(req.params.id);

	if(!course){
		return next(new ErrorResponse(`No course with the id of ${req.params.id}`), 404);
	}

	//Check that the user is the owner of the course
	if(course.user.toString() !== req.user.id && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this course`, 401));
	}

	await course.remove();

	res.status(200).json({
		success: true,
		data: {}
	});
});

