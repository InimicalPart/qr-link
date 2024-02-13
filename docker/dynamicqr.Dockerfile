FROM ubuntu:22.04

ENV DEBIAN_FRONTEND noninteractive


RUN apt-get update
RUN apt-get install -y wget gnupg

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends
RUN apt-get install -y openssh-server acl apache2 lsof supervisor git-core curl build-essential openssl libssl-dev xvfb libnss3-dev libgdk-pixbuf2.0-dev libgtk-3-dev libxss-dev libasound2 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libfontconfig1 libxrandr2 libgconf-2-4 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0

RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/home/appuser" \
    --shell "/sbin/nologin" \
    # --no-create-home \
    --uid "10001" \
    appuser

# # supervisor group
# RUN groupadd -g 10002 supervisor
# RUN usermod -aG supervisor appuser

ENV NODE_VERSION=18.17.1
ENV IS_DOCKER=1
RUN mkdir -p /var/lock/apache2 /var/run/apache2 /var/run/sshd /var/log/supervisor
# RUN setfacl -Rm u:appuser:rwX /var/log/supervisor
# RUN setfacl -dRm u:appuser:rwX /var/log/supervisor

# RUN setfacl -Rm u:appuser:rwX /etc/supervisor
# RUN setfacl -dRm u:appuser:rwX /etc/supervisor


COPY ./backend/resources/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
# allow "appuser" to read and write to all files in /var/log/supervisor (take into account new files)

# # /var/run/supervisor.sock
# RUN setfacl -Rm u:appuser:rwX /var/run/supervisor
# RUN setfacl -dRm u:appuser:rwX /var/run/supervisor
WORKDIR /app
COPY . /app

RUN chown -R appuser:appuser /app
USER appuser
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
ENV NVM_DIR=/home/appuser/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/:${PATH}"
USER root
# link /usr/bin/node to the node binary
RUN ln -s ${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/node /usr/bin/node
# link /usr/bin/npm to the npm binary
RUN ln -s ${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/npm /usr/bin/npm
USER appuser
# RUN chown -R appuser:appuser /tmp/supervisor.sock
# Install typescript and nodemon
RUN /usr/bin/npm install -g typescript nodemon
RUN /usr/bin/npm install
EXPOSE 3000 8080
# Set the DISPLAY environment variable
ENV DISPLAY=:99


USER root
# RUN ls -la /var/run/supervisor
# Start supervisord within xvfb
CMD ["xvfb-run", "-a", "/usr/bin/supervisord","-c", "/etc/supervisor/supervisord.conf"]
HEALTHCHECK --interval=1s --timeout=1s --start-period=1m --retries=10 CMD if [ $(lsof -i :3000,8080 | (grep -E "*:(8080|3000) \(LISTEN\)"||echo 0)|wc -l) -eq 2 ]; then exit 0; else exit 1; fi
