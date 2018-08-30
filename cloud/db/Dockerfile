FROM postgres:10-alpine

ARG DB_PASSWORD
ENV DB_NAME sec_ctrl_dev
ENV DB_USER sec_ctrl_dev
ENV SCRIPTS_DIR /pgsql-bootstrap

RUN  mkdir /pgsql-bootstrap

# save the hashed password to a file. it will be picked later by the the init-db.sh script.
RUN echo -n ${DB_PASSWORD}${DB_USER} | md5sum | cut -d' ' -f1 > ${SCRIPTS_DIR}/md5_passwd

COPY init-db.sh /docker-entrypoint-initdb.d/
COPY *.sql ${SCRIPTS_DIR}/


