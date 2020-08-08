# Build Stage
FROM rust:1.45.2 AS builder
WORKDIR /usr/src/server-app

RUN rustup component add rustfmt

COPY server-app/Cargo.toml server-app/Cargo.lock /usr/src/server-app/

RUN mkdir src && echo "fn main() {println!(\"if you see this, the build broke\")}" > src/main.rs

RUN cargo build --release && rm -f target/release/deps/grpc-server*

COPY server-app/ ./
COPY proto/ ../proto
RUN cargo build --release

RUN ls /usr/src/server-app/target/release/

# Bundle Stage
FROM rust:1.45.2
COPY --from=builder /usr/src/server-app/target/release/grpc-server .
USER 1000
EXPOSE 50051
CMD ["./grpc-server"]
