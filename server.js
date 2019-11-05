//Learning about HTTP using the Node core HTTP module and not using Express just yet
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db') // MongoDB server free tier password = whatever123

//Load env vars. These need to be loaded before routes that use the vars.
dotenv.config({path: './config/config.env'});

connectDB();

//Route files
const bootcamps = require('./routes/bootcamps');  //Brings in the endpoints for bootcamps
const courses = require('./routes/courses');  //Brings in the endpoints for courses
const auth = require('./routes/auth');  //Brings in the endpoints for auth
const users = require('./routes/users');  //Brings in the endpoints for users
const reviews = require('./routes/reviews');  //Brings in the endpoints for reviews

const app = express();

//Body parser
app.use(express.json());

//Cookie parser
app.use(cookieParser());

// Dev logging middleware
if(process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
} 

//File uploading using the express-fileupload package
app.use(fileupload());

//Sanitize data (e.g. SQL injection)
app.use(mongoSanitize());

//Set security headers 
app.use(helmet());

//XSS protection. Middleware to sanitize user input coming from POST body, GET queries, and url params
app.use(xss());

//Rate limiting middleware
const limiter = rateLimit({
	windowMs: 10 * 60 * 1000,   //10 minutes
	max: 100
});
app.use(limiter);

//Prevent HTTP param pollution
app.use(hpp());

//Enable CORS - cross origin resource sharing. Access API from another domain
app.use(cors());

//Set static folder
app.use(express.static(path.join(__dirname, 'public')));

//Mount routers, in proper order
app.use('/api/v1/bootcamps', bootcamps); //Assigns the bootcamps endpoints to the route '/api/v1/bootcamps'
app.use('/api/v1/courses', courses); //Assigns the courses endpoints to the route '/api/v1/courses'
app.use('/api/v1/auth', auth); //Assigns the auth endpoints to the route '/api/v1/auth'
app.use('/api/v1/users', users); //Assigns the auth endpoints to the route '/api/v1/users'
app.use('/api/v1/reviews', reviews); //Assigns the auth endpoints to the route '/api/v1/reviews'

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold));


//Global promise rejection handler
process.on('unhandledRejection', (err, promise) => {
	console.log(`Unhandled promise rejection. Error: ${err.message}`.red);
	//Close server & exit process
	server.close(() => process.exit(1));
});