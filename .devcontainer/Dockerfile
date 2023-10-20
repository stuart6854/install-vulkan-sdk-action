FROM node:21-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && apt upgrade \
    && apt-get install -y --no-install-recommends ca-certificates curl wget gnupg dirmngr xz-utils mc git \
    && npm install -g n@latest && node --version \
    && npm install -g yarn@latest --force && yarn --version \
    && npm install -g npm@latest && npm --version

# Install act (GitHub Actions local runner. See also https://github.com/nektos/act)
# RUN curl https://raw.githubusercontent.com/nektos/act/master/install.sh | bash
# 'act' doesn't work on devcontainer. It works on local as well as on WSL.
# RUN curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog

COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]

CMD [ "node" ]
