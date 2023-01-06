const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = async (req,res,next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        const error = new Error('Validation failed!');
        error.status = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    try {

        const hashedPass = await bcrypt.hash(password, 12)
        const user = new User({
            email: email,
            password: hashedPass,
            name: name
        });
        const result = await user.save();
        res.status(201).json({message: 'User created!', userId: result._id});

    } catch(err){
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.login = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;

    const user = await User.findOne({email: email})
    if (!user){
        const error = new Error('No user with this e-mail!');
        error.statusCode = 401;
        throw error;
    }
    loadedUser = user;

    try {
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual){
            const error = new Error('Wrong password!');
            error.statusCode = 401;
            throw error;
        }
        const token = jwt.sign({
            email: loadedUser.email,
            userId: loadedUser._id.toString()
        }, 'secretsecret', { expiresIn: '1h'});
        
        res.status(200).json({token: token, userId: loadedUser._id.toString()});
        return;

    } catch(err){
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
        return err;
    }
};