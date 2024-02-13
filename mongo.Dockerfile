FROM mongo:latest

ENV DEBIAN_FRONTEND noninteractive
ENV IS_DOCKER=1

ENV NODE_VERSION=18.17.1

RUN apt-get update && apt-get install -y curl openssh-server apache2 supervisor lsof
WORKDIR /app
COPY ./mongodqr /app
RUN mkdir -p /var/lock/apache2 /var/run/apache2 /var/run/sshd /var/log/supervisor
COPY ./mongodqr/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY ./mongodqr/mongod.conf /data/configdb/mongod.conf
RUN mkdir /root/.nvm
RUN ls -la /root
ENV NVM_DIR=/root/.nvm
ENV IS_DOCKER=1
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN ln -s ${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/node /usr/bin/node
# link /usr/bin/npm to the npm binary
RUN ln -s ${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/npm /usr/bin/npm

RUN /usr/bin/node --version
RUN /usr/bin/npm --version
RUN /usr/bin/npm install -g typescript nodemon

RUN ls -la /usr/bin/node
RUN ls -la /usr/bin/npm

RUN whoami

RUN /usr/bin/npm install

EXPOSE 27017 3010
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
# Check if ports :3000 and :27017 are open and listening
HEALTHCHECK --interval=1s --timeout=1s --start-period=5s --retries=10 CMD if [ $(lsof -i :3010,27017 | (grep -E "*:(27017|3010) \(LISTEN\)"||echo 0)|wc -l) -eq 2 ]; then exit 0; else exit 1; fi
