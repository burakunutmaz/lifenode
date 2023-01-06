const { expect } = require("chai");
const sinon = require('sinon');
const mongoose = require('mongoose');
mongoose.set('strictQuery', true);

const io = require('../socket');
const FeedController = require('../controllers/feed');
const User = require('../models/user');

describe('Feed Controller', function(){

    let tempUserId;
    before(async function() {
        await mongoose.connect('mongodb+srv://burak:burakadmin@cluster0.zp3ye6m.mongodb.net/lifenode-test')
        const user = new User({
            email: 'test@test.com',
            password: '12345',
            name: 'Test',
            posts: []
        });
        const savedUser = await user.save();
        tempUserId = savedUser._id.toString();
    })

    it('should send a response with a valid user status for an existing user', async function() {

            const req = {userId: tempUserId};
            const res = {
                statusCode: 500,
                userStatus: null,
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data){
                    this.userStatus = data.status;
                }
            };

            await FeedController.getStatus(req, res, () => {})
            expect(res.statusCode).to.be.equal(200);
            expect(res.userStatus).to.be.equal('I am new!');
    });

    it('should add the created post to the post list of the creator', async function(){

        const stub = sinon.stub(io, 'getIO').callsFake(() => {
            return {
              emit: function() {}
            }
          });

        const req = {
            body: {
                title: 'Test Post',
                content: 'Test Content'
            },
            file: {
                path: 'abcd'
            },
            userId: tempUserId
        };

        const dummyRes = {
            status: function() {return this;},
            json: function() {}
        }

        const savedUser = await FeedController.createPost(req, dummyRes, ()=>{});
        expect(savedUser).to.have.property('posts');
        expect(savedUser.posts).to.have.length(1);
    })

    after(async function() {
        await User.deleteMany({});
        await mongoose.disconnect();
        return;
    })
});