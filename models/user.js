var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
	password: String,
	firstname: String,
	lastname: String,
	email: {type: String, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
	isAdmin: {type: Boolean, default: false},
	isPaid: { type: Boolean, default:false},
    purchases: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Purchase"
        }
    ]
});

UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", UserSchema);