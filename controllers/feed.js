const {validationResult} = require('express-validator')
const fs = require('fs');
const path = require('path');

const Post = require('../models/post');

exports.getPosts = (req,res,next) => {
    Post.find()
        .then(posts => {
            res.status(200).json({
                message: 'Fetched posts successfully!',
                posts: posts
            });
        })
        .catch(err => {

        })
};

exports.createPost = (req,res,next) => {
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
    console.log(req.file.path);
    const imageUrl = req.file.path.replace("\\", "/");
    const title = req.body.title;
    const content = req.body.content;
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: { name: 'Burak'},
    });
    post.save()
    .then(result => {
        console.log(result);
        res.status(201).json({
            message: 'Post created successfully.',
            post: result}
        );
    })
    .catch(err => {
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    });
};

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post){
                const error = new Error('Could not find the post!');
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({message: 'Post fetched!', post: post});
        })
        .catch(err => {
            if (!err.statusCode){
                err.statusCode = 500;
            }
            next(err);
        });
};

exports.updatePost = (req, res, next) => {
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
    Post.findById(postId)
        .then(post => {
            if (!post){
                const error = new Error('Could not find the post!');
                error.statusCode = 404;
                throw error;
            }
            if (imageUrl !== post.imageUrl){
                clearImage(post.imageUrl);
            }
            post.title = title;
            post.imageUrl = imageUrl;
            post.content = content;
            return post.save();
        })
        .then(post => {
            res.status(200).json({message: 'Post updated', post: post});
        })
        .catch(err => {
            if (!err.statusCode){
                err.statusCode = 500;
            }
            next(err);
        })
};

exports.postDelete = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post){
                const error = new Error('Could not find the post!');
                error.statusCode = 404;
                throw error;
            }
            clearImage(post.imageUrl);
            return Post.findByIdAndDelete(postId);
        })
        .then(result =>{
            console.log(result);
            res.status(200).json({message: 'Deleted post!'});
        })
        .catch(err => {
            if (!err.statusCode){
                err.statusCode = 500;
            }
            next(err);
        })
};

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
};