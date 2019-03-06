const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const socket = require('socket.io');
const port = 3000;
let users;
let count;
let chatRooms;
let messagesArray = [];

const app = express();

app.use(bodyParser.json());

const MongoClient = mongodb.MongoClient;

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin' , 'http://192.168.1.37:4200');
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append("Access-Control-Allow-Headers", "Origin, Accept,Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    res.append('Access-Control-Allow-Credentials', true);
    next();
});


// MongoClient.connect('mongodb://localhost:27017/iris', (err, Database) => {
MongoClient.connect('mongodb://<dbuser>:<dbpassword>@ds143594.mlab.com:43594/heroku_8ghl09jv', (err, Database) => {
    if(err) {
        console.clear();
        console.log(">>> My ToDos Backend <<<");
        console.log("------------------------\n");
        console.log("Connecting...");
        console.log('Connection Error...');
        console.log(err);
        return false;
    }
    console.clear();
    console.log(">>> My ToDos Backend <<<");
    console.log("------------------------\n");
    console.log("Connecting...");
    const db = Database.db("iris");
    console.log("Database found :");
    console.log("Connected with MongoDB Database...");
    users = db.collection("users");
    chatRooms = db.collection("chatRooms");
    const server = app.listen(port, () => {
        console.log("Server started on port " + port + "...");
    });

    const io = socket.listen(server);

    io.sockets.on('connection', (socket) => {
        socket.on('join', (data) => {
            socket.join(data.room);
            chatRooms.find({}).toArray((err, rooms) => {
                if(err){
                    console.log(err);
                    return false;
                }
                count = 0;
                rooms.forEach((room) => {
                    if(room.name == data.room){
                        count++;
                    }
                });
                if(count == 0) {
                    chatRooms.insert({ name: data.room, messages: [] }); 
                }
            });
        });

        socket.on('message', (data) => {
            io.in(data.room).emit('new message', {user: data.user, message: data.message});
            chatRooms.update({name: data.room}, { $push: { messages: { user: data.user, message: data.message } } }, (err, res) => {
                if(err) {
                    console.log(err);
                    return false;
                }
               console.log("New Notification by :" + name.user);
            });
        });

        socket.on('typing', (data) => {
            socket.broadcast.in(data.room).emit('typing', {data: data, isTyping: true});
        });

        // socket.on('stop typing', (data) =>{
        //     socket.broadcast.in(data.room).emit('stop typing', {data: data, isTyping: false});
        // });
    });

}); 
// Check Api
app.get('/', (req, res, next) => {
    res.send('Welcome to todos express server...');
});

// sign up api
app.post('/api/users', (req, res, next) => {
    let user = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    };
    let count = 0;    
    users.find({}).toArray((err, Users) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err);
        }
        for(let i = 0; i < Users.length; i++){
            if(Users[i].username == user.username)
            count++;
        }
        // Add user if not already signed up
        if(count == 0){
            users.insert(user, (err, User) => {
                if(err){
                    res.send(err);
                }
                res.json(User);
            });
        }
        else {
            // Alert message logic here
            res.json({ user_already_signed_up: true });
        }
    });
    
});
 
// login api
app.post('/api/login', (req, res) => {
    let isPresent = false;
    let correctPassword = false;
    let loggedInUser;
    users.find({}).toArray((err, users) => {
        if(err) return res.send(err);
        users.forEach((user) => {
            if((user.username == req.body.username)) {
                if(user.password == req.body.password) {
                    isPresent = true;
                    correctPassword = true;
                    loggedInUser = {
                        username: user.username,
                        email: user.email
                    }  
                } else {
                    isPresent = true;
                }
            }
        });
            res.json({ isPresent: isPresent, correctPassword: correctPassword, user: loggedInUser });
            
    });
});

app.get('/api/users', (req, res, next) => {
    users.find({}, {username: 1, email: 1, _id: 0}).toArray((err, users) => {
        if(err) {
            res.send(err);
        }
        res.json(users);
    });
});
// chats api
app.get('/chatroom/:room', (req, res, next) => {
    let room = req.params.room;
    chatRooms.find({name: room}).toArray((err, chatroom) => {
        if(err) {
            console.log(err);
            return false;
        }
        res.json(chatroom[0].messages);
    });
});