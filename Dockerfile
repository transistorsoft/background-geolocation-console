FROM node:12.18.0-alpine

EXPOSE 9000
WORKDIR /usr/

COPY package*.json ./

RUN apk update && \
  apk add sqlite  && \
  npm i

COPY . .

ENV TZ=UTC \
    NODE_PATH=./src/client/ \
    DYNO=1 \
    JWT_PUBLIC_KEY="-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAlASKWyYeeEiHs+pm8nrIm7bVMZAN3DN62QOr1GNf9t5GnoNfVYXXNSVi7Sbi\n2PuSrG2duPxKjVJEiQXkDAmtoPGjVPLcaqUEfH+yU9BxtUXluwiIKXErDwUVRoZJ0l5IcT7H\nu3Tn1kmMuTqLGpvveZvvOV6WSZUXSADyNOMv5AN36A63akiuiyZQJT2wYljLjMzHDiQ0GzEq\nVQxMSguJLbqFn746vUp91OW3L56Mukh8f1E2h5TX3s8m4MjhtfJt6HTbEXnyhDKjm98/kcNw\nh76KPlOmns/LSZ2zYZOdYAx6py1DXiW5jyL6wfaFeMmjK8oWSiMYJqjjb7jl5YkCqwIDAQAB\n-----END RSA PUBLIC KEY-----\n" \
    JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEAlASKWyYeeEiHs+pm8nrIm7bVMZAN3DN62QOr1GNf9t5GnoNfVYXXNSVi\n7Sbi2PuSrG2duPxKjVJEiQXkDAmtoPGjVPLcaqUEfH+yU9BxtUXluwiIKXErDwUVRoZJ0l5I\ncT7Hu3Tn1kmMuTqLGpvveZvvOV6WSZUXSADyNOMv5AN36A63akiuiyZQJT2wYljLjMzHDiQ0\nGzEqVQxMSguJLbqFn746vUp91OW3L56Mukh8f1E2h5TX3s8m4MjhtfJt6HTbEXnyhDKjm98/\nkcNwh76KPlOmns/LSZ2zYZOdYAx6py1DXiW5jyL6wfaFeMmjK8oWSiMYJqjjb7jl5YkCqwID\nAQABAoIBABP5eOJMBpic0RNKcpIOV7wLtEF3+ybYG5/liu6ianTaEhWaDOdxpFUbsnnmYX5+\nlJCISlyIT1c63tzO2rN1KuUpNq1kCLKriity4BHHc1DPGe1ffWB6USE5wmE+BgBJkOUXX8TA\nRfj4+/CTIep5WJvEm0fWp9lOMVIaLpVMg031pA0sxkhC3dQGNWKlOmDt/gt9nrviX4s1PH+f\ndksZqclD9/Sc/gqz8DZKb/Eg+JxMLn2uaXP4axNvb/WOJW4BeKBBA1JcK6nfMaLdQerualW1\nBSdAzdeEmL4LiEe6OxrxCqNASAEd8BziEQ6IdlsfvSJXdvPJON/gwZE7SYn4qiECgYEA8nqP\ncyjL/Cr4K3D+eYF8CrecBsqWwJa0tgmQgnCvpdkJ1codAW2yz3Q2AO3t0cxTVQkyYxULeM9f\n352wHoyRY2IZvsZj90W2HtsMt7jCZ4GozbH4PUGNVx0KTMaF6mtz+Ts5X9ao7rUHnAjNAKed\nuEPwfVxkzon6tUTnlAThbj8CgYEAnEWHCje6WXwy9y0M7yUqIIs2tRrhS8Hx+/g8SHGAVaQu\n+P5byr7N5lpbeMmYXXRcWnfyY8MRj89VPoysw7x1HImM6QTRucRANX80WJofkNXv6Gw6YZjv\nFM6M9yBdZIkHCMP6+SP44MT4lBUqxEdxYYZXiJ/uUa9j66Y4LBhmKJUCgYEAyFRrqcf956OU\nj0d2ZuqMkcoqVQ4RSKH6QR9bzfjNlWbgEko+doysG2s2psPsJNX7zxifEW80oCYsXnJILKUU\nBRjqjkwYERX+JjXxpuQ1cRCVZwPvRKSg4mTyuoWV5BvMoA/HEiAmR7k2xTocLLtOugsfaGLq\nQh2LDTIVZZw2pz8CgYEAmJjcMQISGmfJbMy1IKFt7bGDjn3dGpkcryvL0gHji71zkPjwsZ54\neUQqplxVSIzj0gPm0bweXgvb9eRwoAJbaa53xuNJ2NjmylaYyxxVTp1aU9+7cqpgbDT2OiuE\nhzO3hru5S6fw06wEALZauKf683y35VYm5eUa8XWyzHxW5bECgYEAgjdk+ZymqC7N8YH2zrIg\nG5c6os7bVKH9EFr2WBiP+XAv8LOboecOzTnhzBDBMh8GX1LZhAienXlntfg59OVTAIty2A2E\na4Y1S2Y7nuniqjbCF43psUd1apGgOqzmnV4rgJJUXYMzpOn8Zc2EH6CKXZV4gGqqs0oa9GPJ\nClf521Q=\n-----END RSA PRIVATE KEY-----\n"

# By default console will use SqlLite file storage
# NB!: It will clean on conatiner re-creation
#      add volume or setup Postgres/Firebase ENV
ENV DATABASE_URL= \
# For Postgres SQL
# ENV DATABASE_URL=postgres://<username>:<password>@<hostname>:<port>/<dbname>
# Google Maps API Key for map
  GOOGLE_MAPS_API_KEY=AI...vNkg \
# Do you use it for a lot of organisation or users?
  SHARED_DASHBOARD= \
# Manage them in one account? http://host:9000/admin256
  ADMIN_TOKEN= \
# Do you need auth?
  PASSWORD=

# Firebase way as example
# ENV FIREBASE_URL=https://geolocation-console.firebaseio.com
# ENV FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...Nw==\n-----END PRIVATE KEY-----
# ENV FIREBASE_PROJECT_ID=geolocation-console
# ENV FIREBASE_CLIENT_EMAIL=geolocation-console@appspot.gserviceaccount.com

RUN NODE_ENV=production ./node_modules/.bin/webpack && \
    NPM_CONFIG_PRODUCTION=true npm prune --production && \
    npm i sqlite3

ENV NPM_CONFIG_PRODUCTION=true \
    NODE_ENV=production

CMD ["node", "./bin/server.js"]
