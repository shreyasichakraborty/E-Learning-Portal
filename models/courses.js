var mongoose    = require('mongoose');

//SETUP DATABASE SCHEMA//

var courseSchema = new mongoose.Schema({
    name : String,
    image : String,
	category : String,
	price : Number,
    description: String,
	creator: String,
	expertise: String,
	qualification:String,
    comments: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }
    ],
	likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
});


module.exports = mongoose.model("Course",courseSchema);
//END OF DATABASE SCHEMA //





