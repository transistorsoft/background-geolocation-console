/* eslint-disable no-unused-expressions */
import queryString from 'querystring'; import chai from 'chai';
import chaiHttp from 'chai-http';


import {
  location,
  regData,
  server,
} from './data';


chai.use(chaiHttp);
chai.should();

const { expect } = chai;
let token;

beforeAll(async () => {
  const res = await chai
    .request(server)
    .post('/api/jwt/register')
    .send(regData);
  ({ accessToken: token } = res.body);
});


describe('site api', () => {
  test('/company_tokens', async () => {
    const res = await chai
      .request(server)
      .get('/api/site/company_tokens')
      .set('Authorization', `Bearer ${token}`);
    expect(res).have.status(200);
    expect(res).to.be.json;
  });

  test('/stats', async () => {
    const res = await chai.request(server)
      .get('/api/site/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res).have.status(200);
    expect(res).to.be.json;
  });

  describe('devices', () => {
    test('/devices', async () => {
      const res = await chai
        .request(server)
        .get('/api/site/devices')
        .set('Authorization', `Bearer ${token}`);

      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('DELETE /devices/test', async () => {
      const res = await chai.request(server)
        .delete('/api/site/devices/371')
        .set('Authorization', `Bearer ${token}`);

      expect(res).have.status(200);
      expect(res).to.be.json;
    });
  });

  describe('locations', () => {
    test('/locations/latest', async () => {
      const res = await chai
        .request(server)
        .get('/api/site/locations/latest?device_id=372')
        .set('Authorization', `Bearer ${token}`);
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('POST /locations', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          location,
          device: { model: 'test', uuid: 'test' },
          company_token: 'test',
        });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('/locations', async () => {
      const res = await chai
        .request(server)
        .get('/api/site/locations?device_id=372')
        .set('Authorization', `Bearer ${token}`);

      expect(res).have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');
      // console.info('locations:data', res.body);
    });

    test('POST /locations/test', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations/test')
        .set('Authorization', `Bearer ${token}`)
        .send({
          location,
          device: { model: 'test', uuid: 'test' },
          company_token: 'test',
        });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('DELETE /locations', async () => {
      const res = await chai.request(server)
        .delete(
          `/api/site/locations?${
            queryString.stringify({
              device_id: 371,
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
