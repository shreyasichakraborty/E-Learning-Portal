var mongoose = require("mongoose");
 
var purchaseSchema = mongoose.Schema({
    buyer: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        buyername: String
    },
    course: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course"
        },
        coursename: String
    }
});

module.exports = mongoose.model("Purchase", purchaseSchema);
