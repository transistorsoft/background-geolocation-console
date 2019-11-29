/* eslint-disable no-unused-expressions */
import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);
chai.should();

const { expect } = chai;
const server = 'http://localhost:9000';
const regData = {
  org: 'test',
  uuid: 'uuid',
  model: 'model',
  framework: 'framework',
  manufacturer: 'manufacturer',
  version: '10',
};
let token;
let refresh;

beforeAll(async () => {
  const res = await chai.request(server)
    .post('/v2/register')
    .send(regData);
  ({ accessToken: token, refreshToken: refresh } = res.body);
});

describe('api v2', () => {
  test('/register', async () => {
    const res = await chai.request(server)
      .post('/api/register')
      .send(regData);
    expect(res).have.status(200);
    expect(res).to.be.json;
    expect(res.body).to.have.property('accessToken').to.be.a('string');
    expect(res.body).to.have.property('refreshToken').to.be.a('string');
  });

  test('/register', async () => {
    const res = await chai.request(server)
      .post('/api/register')
      .send({ org: 'test' });
    expect(res).have.status(500);
    expect(res).to.be.json;
    expect(res.body).to.have.property('message', 'Device info is missing');
  });

  test('/company_tokens', async () => {
    const res = await chai.request(server)
      .get('/api/company_tokens')
      .set('Authorization', 'Bearer !!!');
    expect(res).have.status(403);
    expect(res).to.be.json;
  });

  test('/company_tokens', async () => {
    const res = await chai.request(server)
      .get('/api/company_tokens')
      .set('Authorization', 'Bearer ' + token);
    expect(res).have.status(200);
    expect(res).to.be.json;
  });

  test('/refresh_token', async () => {
    const res = await chai.request(server)
      .get('/api/refresh_token')
      .set('Authorization', 'Bearer ' + token);
    expect(res).have.status(200);
    expect(res).to.be.json;
    expect(res.body).to.have.property('accessToken').to.be.a('string');
    expect(res.body).to.have.property('refreshToken').to.be.a('string');
  });
});
