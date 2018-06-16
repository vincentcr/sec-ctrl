FROM amazonlinux:latest

# Install C and wget
RUN yum install gcc44 gcc-c++ libgcc44 cmake wget findutils -y

RUN wget https://nodejs.org/dist/v8.10.0/node-v8.10.0.tar.gz && \
  tar -zxvf node-v8.10.0.tar.gz && \
  cd node-v8.10.0 && ./configure && make && \
  make install

CMD ["/bin/bash"]
