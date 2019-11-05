const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Please add a name']
	},
	email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    role: {
    	type: String,
    	enum: ['user', 'publisher'],
    	default: 'user'
    },
    password: {
    	type: String,
    	required: [true, 'Please add a password'],
    	minlength: 6,
    	select: false //Not going to show password when returned
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
    	type: Date,
    	default: Date.now
    }
});

//Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
	
	//If the password was not modified, move to the next middleware
	if(!this.isModified('password')){
		next();
	}

	const salt = await bcrypt.genSalt(10);
	this.password  = await bcrypt.hash(this.password, salt);
});

//This is a method defined on the object returned from the database, not a static method, which is
//defined on the model itself.
//Sign JSON Web Token and return
UserSchema.methods.getSignedJwtToken = function () {
	return jwt.sign( { id: this._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

//Match user-entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
	//this.password is accessible because the method is called on the returned user object from the database
	return await bcrypt.compare(enteredPassword, this.password);
}

//Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function() {
	//Generate token
	const resetToken = crypto.randomBytes(20).toString('hex');

	console.log(resetToken);

	//Hash token and set to resetPasswordToken field
	//This method is called on the user returned from the database so this has access to the properties of the user
	this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

	//Set expire
	this.resetPasswordExpire = Date.now() + 10 * 60 *1000;

	return resetToken;
}


module.exports = mongoose.model('User', UserSchema);









