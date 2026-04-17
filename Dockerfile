# ===== Build stage =====
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /build

# Cache Maven wrapper + deps first
COPY mvnw mvnw.cmd ./
COPY .mvn .mvn
COPY pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Build the app
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# ===== Runtime stage =====
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S wave && adduser -S wave -G wave
WORKDIR /app

# Copy the fat jar
COPY --from=builder /build/target/*.jar app.jar
RUN chown -R wave:wave /app
USER wave

# JVM tuning for small containers (Render/Fly free tiers: 512MB)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

# Render/Fly pass PORT env var; Spring Boot reads it via server.port=${PORT:8080}
EXPOSE 8080

# Actuator health probe for platform orchestrators
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:${PORT:-8080}/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
