# Dockerfile para Software de Contabilidad

# Etapa 1: Construir el frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# Etapa 2: Construir el backend
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/main.go

# Etapa 3: Imagen final
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copiar el ejecutable del backend
COPY --from=backend-builder /app/main .

# Copiar archivos estáticos del frontend
COPY --from=frontend-builder /app/web/build ./web/dist

# Exponer puerto
EXPOSE 8080

# Comando por defecto
CMD ["./main"]
