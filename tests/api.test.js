/* eslint-disable no-unused-expressions */
import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);
chai.should();

const { expect } = chai;
const server = 'http://localhost:9000';
let token;

describe('api v2', () => {
  test('/register', (done) => {
    chai.request(server)
      .post('/v2/register')
      .send({
        org: 'test',
        uuid: 'test',
        model: 'test',
        framework: 'test',
        version: '10',
      })
      .end((err, res) => {
        ({ accessToken: token } = res.body);
        expect(res).have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.have.property('accessToken').to.be.a('string');
        expect(err).to.be.null;
        done();
      });
  });

  test('/company_tokens', (done) => {
    chai.request(server)
      .get('/v2/company_tokens')
      .set('Authorization', 'Bearer !!!')
      .end((err, res) => {
        expect(res).have.status(403);
        expect(res).to.be.json;
        expect(err).to.be.null;
        done();
      });
  });

  test('/company_tokens', (done) => {
    chai.request(server)
      .get('/v2/company_tokens')
      .set('Authorization', 'Bearer ' + token)
      .end((err, res) => {
        expect(res).have.status(200);
        expect(res).to.be.json;
        expect(err).to.be.null;
        done();
      });
  });
});
