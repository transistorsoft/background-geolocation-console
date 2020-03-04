/* eslint-disable no-unused-expressions */
import queryString from 'querystring'; import chai from 'chai';
import chaiHttp from 'chai-http';


import { location, server } from './data';

chai.use(chaiHttp);
chai.should();

const { expect } = chai;

describe('site api', () => {
  test('/company_tokens', async () => {
    const res = await chai
      .request(server)
      .get('/api/site/company_tokens?company_token=test');
    expect(res).have.status(200);
    expect(res).to.be.json;
  });

  test('/stats', async () => {
    const res = await chai.request(server).get('/api/site/stats');

    expect(res).have.status(200);
    expect(res).to.be.json;
  });

  describe('devices', () => {
    test('/devices', async () => {
      const res = await chai
        .request(server)
        .get('/api/site/devices?company_token=test');

      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('DELETE /devices/test', async () => {
      const res = await chai.request(server).delete('/api/site/devices/371?company_token=test');

      expect(res).have.status(200);
      expect(res).to.be.json;
    });
  });

  describe('locations', () => {
    test('/locations/latest', async () => {
      const res = await chai
        .request(server)
        .get('/api/site/locations/latest?company_token=test');
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('POST /locations', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations')
        .send({
          location,
          device: { model: 'test', uuid: 'test' },
          company_token: 'test',
        });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('POST /locations []', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations')
        .send([
          {
            location,
            device: { model: 'test', uuid: 'test' },
            company_token: 'test',
          },
        ]);
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('/locations', async () => {
      const res = await chai
        .request(server)
        .get('/api/site/locations?company_token=test&device_id=372');

      expect(res).have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');
      // console.info('locations:data', res.body);
    });

    test('POST /locations/test', async () => {
      const res = await chai
        .request(server)
        .post('/api/site/locations/test')
        .send({
          location,
          device: { model: 'test', uuid: 'test' },
          company_token: 'test',
        });
      expect(res).have.status(200);
      expect(res).to.be.json;
    });

    test('DELETE /locations', async () => {
      const res = await chai.request(server).delete(
        `/api/site/locations?company_token=test&device_id=371&${
          queryString.stringify({
            start_date: location.timestamp.substr(0, 10),
            end_date: new Date().toISOString().substr(0, 10),
          })}`,
      );

      expect(res).have.status(200);
      expect(res).to.be.json;
    });
  });
});
