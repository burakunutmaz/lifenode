const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');

const authMiddleware = require('../middleware/is-auth');

describe('Auth Middleware', function() {

    it('should throw an error if authorization header is NOT present', function() {
        const req = {
            get: function() {
                return null;
            }
        };
        expect(authMiddleware.bind(this, req, {}, () => {})).to.throw('Not authenticated!');
    });
    
    it('should throw an error if the auth header contains only one string', function() {
        const req = {
            get: function() {
                return '123';
            }
        };
        expect(authMiddleware.bind(this, req, {}, () => {})).to.throw();
    });

    it('should throw an error if the token cannot be verified', function() {
        const req = {
            get: function() {
                return 'Bearer xyz';
            }
        };
        expect(authMiddleware.bind(this, req, {}, () => {})).to.throw();
    });

    it('should yield a userId after decoding the token', function() {

        const req = {
            get: function() {
                return 'Bearer 123123123';
            }
        };

        sinon.stub(jwt, 'verify');
        jwt.verify.returns({userId: 'abc'});

        authMiddleware(req, {}, () => {});

        expect(req).to.have.property('userId');
        expect(req).to.have.property('userId', 'abc');
        expect(jwt.verify.called).to.be.true;

        jwt.verify.restore();
    });

})
