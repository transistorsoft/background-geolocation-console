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

beforeAll(async () => {
  const res = await chai.request(server)
    .post('/v2/register')
    .send(regData);
  ({ accessToken: token } = res.body);
});

describe('api v2', () => {
  test('/register', async () => {
    const res = await chai.request(server)
      .post('/v2/register')
      .send(regData);
    expect(res).have.status(200);
    expect(res).to.be.json;
    expect(res.body).to.have.property('accessToken').to.be.a('string');
  });

  test('/register', async () => {
    const res = await chai.request(server)
      .post('/v2/register')
      .send({ org: 'test' });
    expect(res).have.status(500);
    expect(res).to.be.json;
    expect(res.body).to.have.property('message', 'Device info is missing');
  });

  test('/company_tokens', async () => {
    const res = await chai.request(server)
      .get('/v2/company_tokens')
      .set('Authorization', 'Bearer !!!');
    expect(res).have.status(403);
    expect(res).to.be.json;
  });

  test('/company_tokens', async () => {
    const res = await chai.request(server)
      .get('/v2/company_tokens')
      .set('Authorization', 'Bearer ' + token);
    expect(res).have.status(200);
    expect(res).to.be.json;
  });
});
