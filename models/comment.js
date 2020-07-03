var mongoose = require("mongoose");
 
var commentSchema = new mongoose.Schema({
    text: String,
	created:  {type: Date, default: Date.now},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String,
		firstname: String,
		lastname: String
    }
});
 
module.exports = mongoose.model("Comment", commentSchema);