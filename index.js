require('dotenv').config();
var express     			= require("express");
var app         			= express();
var bodyParser  			= require("body-parser");
var mongoose    			= require('mongoose');
var flash       			= require('connect-flash');
var passport    			= require('passport');
var LocalStrategy   		= require('passport-local');
var passportLocalMongoose   = require('passport-local-mongoose');
var methodOverride 			= require("method-override");
var Course  				= require('./models/courses');
var Comment     			= require('./models/comment');
var User        			= require('./models/user');
var Purchase    = require('./models/purchase');
const stripe    = require('stripe')(process.env.STRIPE_SECRET_KEY);


//AVOID DEPRECATION WARNINGS IN MONGOOSE//
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect("mongodb://localhost/portal_app");
app.use(flash());


//Passport configuration//
app.use(require("express-session")({
secret: "Yelp camp",
resave: false,
saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine","ejs");
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));


//LISTENING PORT//
app.listen(3000,process.env.IP,function(){
	console.log('Server has started!!');
});

////////////////////////////////////////////////////////////////////////////////////////////////////
									//COURSE ROUTES//
////////////////////////////////////////////////////////////////////////////////////////////////////

//landing page//
app.get("/",function(req,res){
	
		Course.find({},function(err,courses){
			if(err){
				console.log(err);
			}else{
				res.render("index",{courses: courses});
			}
		});
});

//homepage
app.get("/courses",function(req,res){
	 var noMatch = null;
	 if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		Course.find({name: regex},function(err,courses){
		if(err){
			console.log(err);
		} else {
			if(courses.length < 1) {
                  noMatch = "No courses match that query, please try again.";
              }
              res.render("home",{courses:courses, noMatch: noMatch});
           }
	});
	}else{
		Course.find({}, function(err, courses){
           if(err){
               console.log(err);
           } else {
              res.render("home",{courses:courses, noMatch: noMatch});
           }
        });		
	}
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

//individual course show page
app.get("/courses/:id",function(req,res){
	Course.findById(req.params.id).populate("comments likes").exec(function(err,foundCourse){
        if(err){
            console.log(err);
        }else{
             res.render("show", {course: foundCourse});
        }
    });
});



//POST A NEW COURSE PAGE//
app.post("/courses",isLoggedIn,function(req,res){
    var name = req.body.name;
    var image = req.body.image;
    var category = req.body.category;
    var price = req.body.price;
    var description = req.body.describe;
    var creator = req.body.creator;
	var expertise = req.body.expertise;
	var qualification = req.body.qualification;
    var newCourse = {name: name,image: image,category: category,price: price,description: description, creator: creator,expertise: expertise,qualification: qualification};
    
   // create a new course and save to database //
   Course.create(newCourse,function(err,course){
        if(err){
            console.log(err);
        }else{
            res.redirect("/courses");
    }
});
});

//CREATE A NEW COURSE PAGE //
app.get("/new",isLoggedIn,function(req,res){
    res.render("addcourse.ejs")
});



// Course Like Route
app.post("/courses/:id/like", isLoggedIn, function (req, res) {
    Course.findById(req.params.id, function (err, foundCourse) {
        if (err) {
            console.log(err);
            return res.redirect("/courses");
        }

        // check if req.user._id exists in foundCourse.likes
        var foundUserLike = foundCourse.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCourse.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCourse.likes.push(req.user);
        }

        foundCourse.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/courses");
            }
            return res.redirect("/courses/" + foundCourse._id);
        });
    });
});



//////////////////////////////////////////////////////////////////////////////////////////////////
								//Authentication Routes//
//////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/register",function(req, res) {
    res.render("register");
});

app.post("/register",function(req,res){
   var newUser = new User({username: req.body.username, firstname: req.body.firstname, lastname: req.body.lastname, email: req.body.email});
	
	if(req.body.adminCode === 'admin'){
		newUser.isAdmin = true;
	}
	
	
   User.register(newUser,req.body.password,function(err,user){
       if(err){
           req.flash("error", err.message);
           return res.redirect("/register");
       }
      passport.authenticate("local")(req,res,function(){
		  req.flash("success", "Welcome Onboard " +user.firstname);
          res.redirect("/courses");
       });
   });
	
});

app.get("/login",function(req, res) {
    res.render("login", {message: req.flash("error")});
});

app.post("/login",passport.authenticate("local",
{
//  successRedirect: "/courses",
    failureRedirect: "/login"
}), function(req,res){
	res.redirect(req.session.returnTo || '/');
    delete req.session.returnTo;
});

app.get("/logout",function(req, res) {
    req.logout();
	req.flash("success","Logged Out Successfully");
    res.redirect("/");
});

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
	req.session.returnTo = req.originalUrl; 
    req.flash("error","Please login first");
    res.redirect("/login");
}

function checkCommentOwnership(req,res,next){
   if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
           if(err){
               res.redirect("back");
           }  else {
               // does user own the comment?
            if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
                next();
            } else {
                res.redirect("back");
            }
           }
        });
    } else {
        res.redirect("back");
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////
									//Comment routes//
/////////////////////////////////////////////////////////////////////////////////////////////////////
//add comment//
app.get("/courses/:id/comment/new",isLoggedIn,function(req, res) {
   //find course by id
   Course.findById(req.params.id, function(err,course){
       if(err){
           console.log(err);
       }else{
           res.render("newcomment",{course: course});
       }
   });
   
});

//post newcomment//
app.post("/courses/:id/comment",isLoggedIn,function(req, res) {
   //lookup course using id
   Course.findById(req.params.id,function(err, course) {
       if(err){
           console.log(err);
       }else{
            //create new comment
            Comment.create(req.body.comment,function(err,comment){
               if(err){
                   console.log(err);
               } else{
                     //add username and id to comment
                     comment.author.username = req.user.username;
				     comment.author.firstname = req.user.firstname;
				     comment.author.lastname = req.user.lastname;
                     comment.author.id = req.user._id;
                     comment.save();
					 course.comments.push(comment);
					 course.save();
					//redirect to show page
					 res.redirect("/courses/" +course._id);
               }
          });
       }
   }); 
});

//edit comment
app.get("/courses/:id/comment/:comment_id/edit",checkCommentOwnership,function(req,res){
    Comment.findById(req.params.comment_id, function(err, foundComment) {
        if(err){
            res.redirect("back");
        }else{
             res.render("commentedit",{course_id: req.params.id,comment: foundComment});
        }
    });
   
});

//update comment
app.put("/courses/:id/comment/:comment_id",function(req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,updatedComment){
        if(err){
            res.redirect("back");
        }else{
            res.redirect("/courses/" + req.params.id);
        }
    });
});

//delete comment
app.delete("/courses/:id/comment/:comment_id",checkCommentOwnership, function(req,res){
    Comment.findByIdAndRemove(req.params.comment_id,function(err,delcomment){
            res.redirect("/courses/"+req.params.id);
    });
});


///////////////////////////////////////////////////////////////////////////////////////////////
										//CHECKOUT//
////////////////////////////////////////////////////////////////////////////////////////////////

//checkout//
app.get('/courses/:id/checkout',isLoggedIn, async (req, res) => {
    
    Course.findById(req.params.id, async(err, course) => {
       if(err){
           console.log(err);
       }else{
            console.log(course);
            try{
    
                const paymentIntent = await stripe.paymentIntents.create({
                amount: course.price,
                currency: 'inr',
                // Verify your integration in this guide by including this parameter
                metadata: {integration_check: 'accept_a_payment'},
                });
 
                res.render("checkout",{client_secret: paymentIntent.client_secret, amount: course.price, id: req.params.id,course:course});

            } catch(err){
        req.flash("error",err.message);
        res.redirect("back");
        }
       }
    });
});


app.post("/courses/:id/pay",isLoggedIn, async (req,res) => {
     const { paymentMethodId, items, currency } = req.body;
    Course.findById(req.params.id, async(err, course) => {
       if(err){
           console.log(err);
       }else{
            console.log(course);
            const amount = course.price;
 
    try {
      // Create new PaymentIntent with a PaymentMethod ID from the client.
      const intent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method: paymentMethodId,
        error_on_requires_action: true,
        confirm: true
      });
  
      console.log("💰 Payment received!");

      await req.user.save();
      // The payment is complete and the money has been moved
      // You can add any post-payment code here (e.g. shipping, fulfillment, etc)
      User.findById(req.user._id,function(err,user){
         if(err){
            console.log(err); 
         } else{
             Purchase.create({},function(err,purchase){
            	if(err){
            		console.log(err);
            	}else{
            	    purchase.buyer.id = req.user._id;
            	    purchase.buyer.buyername = user.username;
            		purchase.course.id = req.params.id;
            		purchase.course.coursename = course.name;
            		purchase.save();
            
            		user.purchases.push(purchase);
            		user.save();
            	}
             });
         }
      });
      
      
      
      // Send the client secret to the client to use in the demo
      res.send({ clientSecret: intent.client_secret });
    } catch (e) {
      // Handle "hard declines" e.g. insufficient funds, expired card, card authentication etc
      // See https://stripe.com/docs/declines/codes for more
      if (e.code === "authentication_required") {
        res.send({
          error:
            "This card requires authentication in order to proceeded. Please use a different card."
        });
      } else {
        res.send({ error: e.message });
      }
    }
       }
    });
});
//end of checkout//

app.get("/users/:id",isLoggedIn,function(req,res){
    User.findById(req.user._id).populate("purchases").exec(function(err,foundUser){
        if(err){
            console.log(err);
        }else{
             res.render("profile", {user: foundUser});
        }
    });
});






///////////////////////////////////////////////////////////////////////////////////////////////
										//EXTRAS//
////////////////////////////////////////////////////////////////////////////////////////////////


//premiumbilling page//
app.get("/premiumbilling/:id",isLoggedIn,function(req,res){
	res.render("premiumbilling");
});


//offer
app.get("/offer",function(req,res){
	res.render("offer");
});

//about page
app.get("/about",function(req,res){
	res.render("about");
});
//careers
app.get("/careers",function(req,res){
	res.render("careers");
});


//faqs
app.get("/faqs",function(req,res){
	res.render("faqs");
});
//contact
app.get("/contact",function(req,res){
	res.render("contact");
});
//privacy
app.get("/privacy",function(req,res){
	res.render("privacy");
});
//terms
app.get("/terms",function(req,res){
	res.render("termsandconditions");
});

//class schedule
app.get("/classes",isLoggedIn,function(req,res){
	res.render("classes");
});
//assessment
app.get("/exams",isLoggedIn,function(req,res){
	res.render("exams");
});

















/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*    Course.create({
		name :" Introduction to Node.js",
    image : "https://cdn.pixabay.com/photo/2016/11/30/20/44/computer-1873831__340.png",
	category : "Web development",
	price : 499,
    description: "For Beginners",
	creator: "Shreyasi Chakraborty"
},function(err,course){
		if(err){
			console.log(err);
		}else{
			console.log(course);
		}
	});

*/