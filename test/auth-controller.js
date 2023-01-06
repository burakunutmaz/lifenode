const chai = require("chai");
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon');
const mongoose = require('mongoose')
mongoose.set('strictQuery', true);

const User = require('../models/user');
const AuthController = require('../controllers/auth');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Auth Controller', function() {
    
    it('should throw an error if no user can be found', async function() {
        const stub = sinon.stub(User, 'findOne').throws();

        const req = {
            body: {
                email: 'test@test.com',
                password: '12345'
            }
        };

        await expect(AuthController.login(req, {}, ()=>{})).to.be.rejected;
    });

    this.afterEach(sinon.restore);
    
});