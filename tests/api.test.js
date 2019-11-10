import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';

chai.use(chaiHttp);
chai.should();

describe('api v2', () => {
  describe('/register', (done) => {
    chai.request(app)
      .post('/register')
      .send({
        company_token: 'test',
        device_id: 'test',
        device_model: 'test',
        framework: 'test',
        version: '10',
      })
      .end((err, res) => {
        console.log('register', err, res);
        expect(res).have.status(200);
        expect(res).to.be.json();
        expect(res.body).toMatchObject({
          device: expect.objectContaining({ id: expect.any(Number) }),
          jwt: expect.any(String),
        });
        expect(err).toBeNull();
        done();
      });
  });

  describe('/company_tokens', (done) => {
    chai.request(app)
      .get('/company_tokens')
      .set('Authorization', 'Bearer !!!')
      .end((err, res) => {
        console.log('company_tokens', err, res);
        expect(res).have.status(403);
        expect(res).to.be.json();
        expect(err).toBeNull();
        done();
      });
  });
});
