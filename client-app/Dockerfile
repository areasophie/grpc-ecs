# Build Stage
FROM rust:1.45.2 AS builder
WORKDIR /usr/src/client-app

RUN rustup component add rustfmt

COPY client-app/Cargo.toml client-app/Cargo.lock /usr/src/client-app/

RUN mkdir src && echo "fn main() {println!(\"if you see this, the build broke\")}" > src/main.rs

RUN cargo build --release && rm -f target/release/deps/grpc-client*

COPY client-app/ ./
COPY proto/ ../proto
RUN cargo build --release

RUN ls /usr/src/client-app/target/release/

# Bundle Stage
FROM rust:1.45.2
COPY --from=builder /usr/src/client-app/target/release/grpc-client .
USER 1000
EXPOSE 50051
CMD ["./grpc-client"]
