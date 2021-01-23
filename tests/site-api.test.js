/* eslint-disable no-unused-expressions */
const queryString  = require('querystring');
const chai = require('chai');
const chaiHttp = require('chai-http');

const {
  location,
  location2,
  regData,
  server,
} = require('./data.js');

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
          device: {
            framework: 'flutter',
            manufacturer: 'Apple',
            model: 'iPhone10,4(x86_64)',
            platform: '13.3',
            uuid: 'iPhone10-4(x86_64)-13-3',
            version: '2.0',
          },
          company_token: 'test',
        });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('POST /locations []', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations')
        .set('Authorization', `Bearer ${token}`)
        .send([{
          location,
          device: {
            company_token: 'test',
            framework: 'flutter',
            manufacturer: 'Apple',
            model: 'iPhone10,4(x86_64)',
            platform: '13.3',
            uuid: 'iPhone10-4(x86_64)-13-3',
            version: '2.0',
          },
        }]);
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('/locations', async () => {
      const res = await chai
        .request(server)
        .get('/api/site/locations?device_id=')
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
          location: [location, location2],
          device: {
            framework: 'flutter',
            manufacturer: 'Apple',
            model: 'iPhone10,4(x86_64)',
            platform: '13.3',
            uuid: 'iPhone10-4(x86_64)-13-3',
            version: '2.0',
          },
        });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('POST /locations/test with plain device', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations/test')
        .set('Authorization', `Bearer ${token}`)
        .send({
          location: [location, location2],
          framework: 'flutter',
          manufacturer: 'Apple',
          model: 'iPhone10,4(x86_64)',
          platform: '13.3',
          uuid: 'iPhone10-4(x86_64)-13-3',
          version: '2.0',
        });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('POST /locations/test []', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations/test')
        .set('Authorization', `Bearer ${token}`)
        .send([{
          location,
          device: {
            framework: 'flutter',
            manufacturer: 'Apple',
            model: 'iPhone10,4(x86_64)',
            platform: '13.3',
            uuid: 'iPhone10-4(x86_64)-13-3',
            version: '2.0',
          },
        }]);
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('POST /locations/test [][]', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations/test')
        .set('Authorization', `Bearer ${token}`)
        .send([{
          location: [location, location2],
          device: {
            framework: 'flutter',
            manufacturer: 'Apple',
            model: 'iPhone10,4(x86_64)',
            platform: '13.3',
            uuid: 'iPhone10-4(x86_64)-13-3',
            version: '2.0',
          },
        }]);
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
