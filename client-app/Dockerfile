FROM gradle:6.5.1-jdk11 AS builder

WORKDIR /app/client-app
COPY client-app/ /app/client-app/
COPY proto/ /app/proto/
RUN ["gradle", "bootJar"]

# Build Docker Image
FROM openjdk:11-jre-slim
WORKDIR /app
COPY --from=builder /app/client-app/build/libs/client-0.0.1.jar .
ENTRYPOINT ["java", "-jar", "client-0.0.1.jar"]