FROM amazonlinux:latest

RUN curl --silent --location https://rpm.nodesource.com/setup_8.x | bash -

# Install C and wget
RUN yum install -y gcc44 gcc-c++ libgcc44 cmake wget findutils zip nodejs

CMD ["/bin/bash"]
