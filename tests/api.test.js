/* eslint-disable no-unused-expressions */
import queryString from 'querystring'; import chai from 'chai';
import chaiHttp from 'chai-http';


import {
  location, regData, server,
} from './data';

chai.use(chaiHttp);
chai.should();

const { expect } = chai;
let token;

beforeAll(async () => {
  const res = await chai
    .request(server)
    .post('/api/register')
    .send(regData);
  ({ accessToken: token } = res.body);
});

describe('jwt api', () => {
  test('/register', async () => {
    const res = await chai
      .request(server)
      .post('/api/register')
      .send(regData);
    expect(res).have.status(200);
    expect(res).to.be.json;
    expect(res.body)
      .to.have.property('accessToken')
      .to.be.a('string');
    expect(res.body)
      .to.have.property('refreshToken')
      .to.be.a('string');
  });

  test('/register without device info', async () => {
    const res = await chai
      .request(server)
      .post('/api/register')
      .send({ org: 'test' });
    expect(res).have.status(500);
    expect(res).to.be.json;
    expect(res.body).to.have.property('message', 'Device info is missing');
  });

  test('/company_tokens', async () => {
    const res = await chai
      .request(server)
      .get('/api/company_tokens')
      .set('Authorization', `Bearer ${token}`);
    expect(res).have.status(200);
    expect(res).to.be.json;
  });

  test('/company_tokens 403', async () => {
    const res = await chai
      .request(server)
      .get('/api/company_tokens')
      .set('Authorization', 'Bearer !!!');
    expect(res).have.status(403);
    expect(res).to.be.json;
  });

  test('/refresh_token', async () => {
    const res = await chai
      .request(server)
      .get('/api/refresh_token')
      .set('Authorization', `Bearer ${token}`);
    expect(res).have.status(200);
    expect(res).to.be.json;
    expect(res.body)
      .to.have.property('accessToken')
      .to.be.a('string');
    expect(res.body)
      .to.have.property('refreshToken')
      .to.be.a('string');
  });

  test('/refresh_token 403', async () => {
    const res = await chai
      .request(server)
      .get('/api/refresh_token')
      .set('Authorization', 'Bearer !!');
    expect(res).have.status(403);
    expect(res).to.be.json;
  });

  test('/stats', async () => {
    const res = await chai
      .request(server)
      .get('/api/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res).have.status(200);
    expect(res).to.be.json;
  });

  test('/stats 403', async () => {
    const res = await chai
      .request(server)
      .get('/api/stats')
      .set('Authorization', 'Bearer ');
    expect(res).have.status(403);
    expect(res).to.be.json;
  });

  test('/devices', async () => {
    const res = await chai
      .request(server)
      .get('/api/devices')
      .set('Authorization', `Bearer ${token}`);
    expect(res).have.status(200);
    expect(res).to.be.json;
    // console.info('devices:data', res.body);
  });

  test('/devices 403', async () => {
    const res = await chai
      .request(server)
      .get('/api/devices')
      .set('Authorization', 'Bearer ');
    expect(res).have.status(403);
    expect(res).to.be.json;
    // console.info('devices:data', res.body);
  });

  describe('locations', () => {
    test('/locations/latest', async () => {
      const res = await chai
        .request(server)
        .get('/api/locations/latest')
        .set('Authorization', `Bearer ${token}`);
      expect(res).have.status(200);
    });

    test('POST /locations', async () => {
      const res = await chai
        .request(server)
        .post('/api/locations')
        .set('Authorization', `Bearer ${token}`)
        .send({ location });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('POST /locations []', async () => {
      const res = await chai
        .request(server)
        .post('/api/locations')
        .set('Authorization', `Bearer ${token}`)
        .send([{ location }]);
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('/locations', async () => {
      const res = await chai
        .request(server)
        .get('/api/locations')
        .set('Authorization', `Bearer ${token}`);
      expect(res).have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');
      // console.info('locations:data', res.body);
    });

    test('POST /locations/test', async () => {
      const res = await chai
        .request(server)
        .post('/api/locations/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ location });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('DELETE /locations', async () => {
      const res = await chai
        .request(server)
        .delete(
          `/api/locations?${
            queryString.stringify({
              start_date: location.timestamp.substr(0, 10),
              end_date: new Date().toISOString().substr(0, 10),
            })}`,
        )
        .set('Authorization', `Bearer ${token}`);
      expect(res).have.status(200);
      expect(res).to.be.json;
    });
  });
});
