# API Rate Limiter Middleware

## Overview

This project implements a middleware for an Express.js application using TypeScript that enforces rate limiting on API requests. The middleware tracks requests per IP address over a specified time frame and returns an HTTP 429 (Too Many Requests) error if the limit is exceeded.

## Features and Assumptions

- **Redis for Request Tracking**: Redis is used to efficiently track request counts for rate limiting.

- **Rate Limiting per IP Address**: The middleware enforces rate limits per IP address to ensure fair use of resources.

- **Configurable Rate Limits**: Rate limits can be individually configured per endpoint and for different user types (authenticated vs unauthenticated).

  > Note that once the application is running, rate limits cannot be reconfigured.

- **Sliding Log Algorithm**: A sliding log algorithm is implemented to allow more granular control over request limits. This includes enabling configuration of the time window, which is set to one hour by default.

- **Temporary Rate Limit Overrides**: Temporary rate limit overrides can be applied per IP address or globally, allowing more granular control based on specific requirements.

- **Different Rate Limits for User Types**: Different rate limits are implemented for authenticated and unauthenticated users, allowing for flexible control over API usage.

- **Authentication**: A dummy JWT secret key is used for authentication purposes for demonstration.

## Running the Application Locally

### Run Redis Only with Docker Compose

To run only the Redis service using Docker Compose:

1. **Start Redis**:
   Run the following command to start only the Redis service:

   ```bash
   docker-compose up redis
   ```

   After starting Redis, create a `.env` file by copying everything from `.env.example` to `.env`, and then start the application separately by running:

   ```bash
   npm run dev
   ```

2. **Access the Application**: Once the services are up, the API can be accessed at `http://localhost:3000`.

### Run Both Redis and Application with Docker Compose

To run both Redis and the App together:

1. **Start Redis and the Application**:
   Use the following command to start both Redis and the Express.js server together:

   ```bash
   docker-compose up
   ```

2. **Access the Application**: Once the services are up, the API can be accessed at `http://localhost:3000`.

## Default Rate Limit Configuration:

The application comes with a default rate limit configuration:

- Global Rate Limits:

  - Authenticated Users: A limit of 10 requests per minute is applied across all endpoints.

  - Unauthenticated Users: A limit of 5 requests per minute is applied across all endpoints.

- Custom Endpoint Rate Limit:

  - /api/special: A custom rate limit of 3 requests per 30 seconds is applied specifically for this endpoint.

  > This configuration can be easily extended to support additional endpoints with specific rate limits as needed.

## API Documentation

### Authentication

All endpoints can be authenticated via a test Bearer token in the `Authorization` header. Example:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJpYXQiOjE3MzEzNzgyNTN9.2t15fYHIqgQx7zwdIhOy0aC9FWS_LBcvVqEAjjLGZBY
```

### Endpoints

1. **GET /**

   - **Description**: Root endpoint for the API rate limiter.
   - **Response**: Returns a message indicating that the API Rate Limiter is active.
   - **Example**:
     ```
     GET /
     Response: "Hello API Rate Limiter!"
     ```

2. **GET /api/special**

   - **Description**: A special API endpoint with a custom rate limit.
   - **Response**: Returns a message indicating a custom rate-limited endpoint.
   - **Example**:
     ```
     GET /api/special
     Response: "Special API endpoint with a custom rate limit."
     ```

3. **POST /admin/rate-limit-override**

   - **Description**: Allows an administrator to override the rate limit for specific IP addresses or globally.
   - **Request Body**:
     ```json
     {
       "type": "global" | "ip",
       "key": "<IP Address>", // required if type is "ip"
       "newLimit": <number>,
       "ttlMs": <number>
     }
     ```
   - **Response**: Updates the rate limit as specified.
   - **Example**:
     ```
     POST /admin/rate-limit-override
     Request Body: {
       "type": "ip",
       "key": "192.168.1.1",
       "newLimit": 500,
       "ttlMs": 3600000
     }
     Response: "Rate limit updated successfully."
     ```

## Testing

### Unit Tests

Unit tests are included to verify the functionality of the middleware. To run the tests:

```bash
npm run test
```

## Potential Improvements

1. **Integration Testing**: Incorporate integration tests with an actual Redis instance instead of relying on mock data. This will ensure that the rate limiter behaves as expected in real-world scenarios.

2. **Enhanced Configuration Management**: Improve configuration management by using third-party tools like feature flags or a configuration management service, instead of storing all rate limit configurations in memory.

3. **Proper User Authentication**: Implement proper user authentication rather than using a dummy JWT secret key. This will add a layer of security that better reflects real-world use cases.

4. **Dynamic Rate Limit Updates**: Allow rate limits to be updated dynamically based on business needs without requiring application restarts.

5. **Robust Error Handling**: Implement more comprehensive error handling to ensure that the system remains stable under unexpected conditions, such as Redis connection failures or misconfigured rate limits.
