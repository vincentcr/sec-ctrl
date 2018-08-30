FROM node:8

COPY common /app/common
RUN cd /app/common && npm install

COPY cloud /app/cloud

WORKDIR /app/cloud
RUN npm install

CMD ["npm", "run", "test-suite"]

