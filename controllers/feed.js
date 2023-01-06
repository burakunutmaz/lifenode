const {validationResult} = require('express-validator')
const fs = require('fs');
const path = require('path');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getStatus = async (req,res,next) => {
    try {
        const user = await User.findById(req.userId)
        if (!user){
            const error = new Error('An error has occured!');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({message: 'Fetched status', status: user.status});

    } catch (err){
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postStatus = async (req,res,next) => {
    const status = req.body.status;
    console.log(status);

    try {
        const user = await User.findById(req.userId)
        if (!user){
            const error = new Error('An error has occured!');
            error.statusCode = 404;
            throw error;
        }
        user.status = status;
        await user.save();
        res.status(201).json({message: 'Status updated!'});

    } catch(err){
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPosts = async (req,res,next) => {
    const currentPage = +req.query.page || 1;
    const postPerPage = 3;

    try {
        const totalItems = await Post.find().countDocuments()
        const posts = await Post.find()
                                .populate('creator')
                                .sort({createdAt: 'desc'})
                                .skip((currentPage - 1) * postPerPage)
                                .limit(postPerPage);
    
        res.status(200).json({
            message: 'Fetched posts successfully!',
            posts: posts,
            totalItems: totalItems
        });

    } catch (err) {
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.createPost = async (req,res,next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()){
        const error = new Error('Invalid input!');
        error.statusCode = 422;
        throw error;
    }
    if (!req.file){
        const error = new Error('No image provided');
        error.statusCode = 422;
        throw error;
    }

    const imageUrl = req.file.path.replace("\\", "/");
    const title = req.body.title;
    const content = req.body.content;
    let creator;
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
    });

    try {
        
        const result = await post.save()
        const user = await User.findById(req.userId);
        user.posts.push(post);
        const savedUser = await user.save();
        io.getIO().emit('posts', { action: 'create', post: {...post._doc, creator: {_id: req.userId, name: user.name}} });
        res.status(201).json({
            message: 'Post created successfully.',
            post: post,
            creator: {_id: user._id, name: user.name}}
        );
        return savedUser;

    } catch(err) {
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
    
};

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId)
        if (!post){
            const error = new Error('Could not find the post!');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({message: 'Post fetched!', post: post});
    } catch (err) {
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    const postId = req.params.postId;
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        const error = new Error('Invalid input!');
        error.statusCode = 422;
        throw error;
    }
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file){
        imageUrl = req.file.path.replace("\\", "/");
    }
    if (!imageUrl){
        const error = new Error('No file picked!');
        error.statusCode = 422;
        throw error;
    }

    try {
        const post = await Post.findById(postId).populate('creator')
        if (!post){
            const error = new Error('Could not find the post!');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId){
            const error = new Error('Not authorized!');
            error.statusCode = 403;
            throw error;
        }
        if (imageUrl !== post.imageUrl){
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.imageUrl = imageUrl;
        post.content = content;
        const result = await post.save();
        io.getIO().emit('posts', {action: 'update', post: result});
        res.status(200).json({message: 'Post updated', post: result});

    } catch (err){
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
    
};

exports.postDelete = async (req, res, next) => {
    const postId = req.params.postId;

    try {
        const post = await Post.findById(postId)
        if (!post){
            const error = new Error('Could not find the post!');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId){
            const error = new Error('Not authorized!');
            error.statusCode = 403;
            throw error;
        }
        clearImage(post.imageUrl);
        await Post.findByIdAndDelete(postId);
        const user = await User.findById(req.userId);
        user.posts.pull(postId);
        await user.save();

        io.getIO().emit('posts', {
            action: 'delete',
            post: postId
        });

        res.status(200).json({message: 'Deleted post!'});

    } catch(err){
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
};

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
};