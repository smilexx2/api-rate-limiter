# Assumptions

1. used Redis for track request counts;
2. Both authenticated and unauthenticated users' rates limits can be individually pre-configured for a particular endpoint, You can't re-configure for a particular endpoint after the appliation started;
3. Implement a Sliding log algorithm for more granular control over request limits means enable configuration on the time window instead of 1 hour by default;
4. temporary rate limit overrides only overrides the rate limit globally;
5. used dummy JWT secret key for authentication for illustration purpose.

# Potential improvements

1. Integration test with the actual Redis instance instead of a mock;
2. Enhance configuration management using third party tools like feature flags or config manager instead of store all rate limit configuration in memory
3. Implmenet proper user authentication
4. Dynamically update rate limits based on business logics.
5. Proper error handling
