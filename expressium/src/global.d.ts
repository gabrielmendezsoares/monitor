/**
 * ## NodeJS
 * 
 * NodeJS environment type declarations for application configuration.
 * 
 * @description Extends the global NodeJS namespace with additional type definitions
 * for environment variables used in the application. This provides type safety,
 * autocompletion, and documentation for process.env values throughout the codebase.
 * 
 * Benefits of these type declarations:
 * 
 * - Provides IntelliSense and autocompletion in supporting IDEs
 * - Enables static type checking during compilation
 * - Documents required environment variables and their expected formats
 * - Helps prevent runtime errors by catching missing or incorrectly formatted variables
 * 
 * These declarations should be updated whenever environment variables are added,
 * modified, or removed from the application.
 */
declare namespace NodeJS { 
  /**
   * ## ProcessEnv
   * 
   * Type definitions for process.env environment variables.
   * 
   * @description Extends the built-in ProcessEnv interface to define the structure
   * and types of environment variables used by the application. 
   * 
   * All environment variables are typed as `string | undefined` because:
   * 
   * - Node.js always provides environment variables as strings
   * - Variables may be undefined if not set in the environment
   * - Applications should handle missing variables gracefully
   * 
   * When using these variables, appropriate type conversion, validation,
   * and fallback values should be implemented.
   */
  interface ProcessEnv { 
    /**
     * ## NODE_ENV
     * 
     * The environment in which the application is running.
     * 
     * @description Indicates the current environment (e.g., development, production).
     * This is used to enable or disable features, logging levels, and other environment-specific settings.
     * 
     * Expected values: "development", "production", "test", or any custom string.
     */
    NODE_ENV: string | undefined;

    /**
     * ## PORT
     * 
     * The TCP port number for the server to listen on.
     * 
     * @description Specifies which port the application's HTTP server should bind to.
     * 
     * Expected format: A numeric string representing a valid port number (1-65535).
     * 
     * Recommended range: 1024-65535 for non-root users.
     */
    PORT: string | undefined;

    /**
     * ## RATE_LIMIT_WINDOW_MS
     * 
     * Time window for rate limiting in milliseconds.
     * 
     * @description Defines the duration of each rate limiting window. Requests are
     * counted within this rolling time window to enforce rate limits.
     * 
     * Expected format: A numeric string representing milliseconds.
     * 
     * Typical values: "60000" (1 minute), "3600000" (1 hour).
     */
    RATE_LIMIT_WINDOW_MS: string | undefined;

    /**
     * ## RATE_LIMIT_MAX_REQUESTS
     * 
     * Maximum number of requests allowed per rate limit window.
     * 
     * @description Sets the maximum number of requests a client (identified by IP address)
     * can make within the specified rate limit window before being rate limited.
     * 
     * Expected format: A numeric string representing the request count.
     */
    RATE_LIMIT_MAX_REQUESTS: string | undefined;

    /**
     * ## STORAGE_DATABASE_URL
     * 
     * Database connection string.
     * 
     * @description Connection URI that includes all necessary information to connect
     * to the database, including credentials, host, port, and database name.
     * 
     * Expected format: A standard database connection URI following the format:
     * 
     * `protocol://username:password@host:port/database?parameters`
     * 
     * Examples:
     * 
     * - PostgreSQL: `postgresql://user:pass@localhost:5432/dbname?schema=public`
     * - MySQL: `mysql://user:pass@localhost:3306/dbname`
     * - MongoDB: `mongodb://user:pass@localhost:27017/dbname?retryWrites=true`
     * 
     * Security note: This URL contains sensitive credentials and should be properly
     * protected in production environments.
     */
    STORAGE_DATABASE_URL: string | undefined;

    /**
     * ## APPLICATION_TYPE
     * 
     * Unique identifier for the application.
     * 
     * @description A string that identifies the application. This is used to distinguish
     * between different applications or services in a microservices architecture or when logging.
     * 
     * Expected format: A short, descriptive string that represents the application name.
     */
    APPLICATION_TYPE: string | undefined;

    /**
     * ## JWT_SECRET
     * 
     * Secret key for signing and verifying JWTs.
     * 
     * @description A cryptographic key used to sign JSON Web Tokens (JWTs) for 
     * authentication and to verify their authenticity.
     * 
     * Requirements:
     * 
     * - Should be a high-entropy random string
     * - Minimum recommended length: 32 characters
     * - Should include mixed case, numbers, and special characters
     * 
     * Security considerations:
     * 
     * - Must be kept confidential
     * - Should be unique per environment
     * - Should be stored securely (e.g., in environment variables, secrets manager)
     * - Should be rotated periodically
     */
    JWT_SECRET: string | undefined;

    /**
     * ## JWT_EXPIRES_IN
     * 
     * Expiration time for issued JWTs.
     * 
     * @description Defines how long issued JSON Web Tokens remain valid before requiring
     * a new authentication. This affects both security and user experience.
     * 
     * Expected format: Either a number (in seconds) or a string with time units.
     * 
     * Valid time units:
     * 
     * - `s`: seconds (e.g., "30s")
     * - `m`: minutes (e.g., "15m")
     * - `h`: hours (e.g., "24h")
     * - `d`: days (e.g., "7d")
     * - `w`: weeks (e.g., "2w")
     */
    JWT_EXPIRES_IN: string | undefined;
  } 
}
