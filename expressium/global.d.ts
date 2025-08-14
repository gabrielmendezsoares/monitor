/**
 * ## NodeJS
 *
 * Node.js environment variable declarations.
 *
 * @description
 * Extends the global `NodeJS` namespace with application-specific environment
 * variable types to provide type safety, documentation, and autocompletion
 * when accessing `process.env`.
 */
declare namespace NodeJS {
  /**
   * ## ProcessEnv
   *
   * Typed structure for environment variables.
   *
   * @description
   * Declares all expected environment variables used by the application.
   * Each value is typed as `string | undefined` because Node.js environment
   * variables are always strings and may be absent at runtime.
   */
  interface ProcessEnv { 
    /**
      * ## NODE_ENV
      *
      * Runtime environment name.
      *
      * @description
      * Indicates the mode in which the application is running.
      * 
      * Expected values: `"development"`, `"production"`, `"test"`, or any custom string.
      */
    NODE_ENV: string | undefined;

    /**
      * ## PORT
      *
      * Port number for the server to bind to.
      *
      * @description
      * Must be a numeric string representing a valid TCP port.
      */
    PORT: string | undefined;

    /**
     * ## APPLICATION_TYPE
     *
     * Identifier for the application or service.
     *
     * @description
     * Used to distinguish logs or metrics across multiple services.
     */
    APPLICATION_TYPE: string | undefined;

    /**
     * ## JWT_SECRET
     *
     * Secret key for signing JWTs.
     *
     * @description
     * Must be a strong, high-entropy string used for HMAC signing.
     */
    JWT_SECRET: string | undefined;

    /**
     * ## JWT_EXPIRES_IN
     *
     * Lifetime of JWT tokens.
     *
     * @description
     * A duration string or number (e.g., `"15m"`, `"7d"`, or `"3600"`).
     */
    JWT_EXPIRES_IN: string | undefined;

    /**
     * ## LOG_LEVEL
     *
     * Verbosity level for logging output.
     *
     * @description
     * Defines the minimum log level that should be emitted.
     * 
     * Examples: `"debug"`, `"info"`, `"warn"`, `"error"`.
     */
    LOG_LEVEL: string | undefined;

    /**
     * ## ERROR_LOG_MAX_SIZE
     *
     * Maximum size for error log files.
     *
     * @description
     * Maximum size before rotating a log file.
     */
    ERROR_LOG_MAX_SIZE: string | undefined;

    /**
     * ## ERROR_LOG_MAX_FILES
     *
     * Maximum number of error logs to retain.
     *
     * @description
     * Maximum retention period for old logs.
     */
    ERROR_LOG_MAX_FILES: string | undefined;

    /**
     * ## WARN_LOG_MAX_SIZE
     *
     * Maximum size for warn log files.
     *
     * @description
     * Maximum size before rotating a log file.
     */
    WARN_LOG_MAX_SIZE: string | undefined;

    /**
     * ## WARN_LOG_MAX_FILES
     *
     * Maximum number of warn logs to retain.
     *
     * @description
     * Maximum retention period for old logs.
     */
    WARN_LOG_MAX_FILES: string | undefined;

    /**
     * ## INFO_LOG_MAX_SIZE
     *
     * Maximum size for info log files.
     *
     * @description
     * Maximum size before rotating a log file.
     */
    INFO_LOG_MAX_SIZE: string | undefined;

    /**
     * ## INFO_LOG_MAX_FILES
     *
     * Maximum number of info logs to retain.
     *
     * @description
     * Maximum retention period for old logs.
     */
    INFO_LOG_MAX_FILES: string | undefined;

    /**
     * ## DEBUG_LOG_MAX_SIZE
     *
     * Maximum size for debug log files.
     *
     * @description
     * Maximum size before rotating a log file.
     */
    DEBUG_LOG_MAX_SIZE: string | undefined;

    /**
     * ## DEBUG_LOG_MAX_FILES
     *
     * Maximum number of debug logs to retain.
     *
     * @description
     * Maximum retention period for old logs.
     */
    DEBUG_LOG_MAX_FILES: string | undefined;

    /**
     * ## EXCEPTION_LOG_MAX_SIZE
     *
     * Maximum size for exception logs.
     *
     * @description
     * Maximum size before rotating a log file.
     */
    EXCEPTION_LOG_MAX_SIZE: string | undefined;

    /**
     * ## EXCEPTION_LOG_MAX_FILES
     *
     * Maximum number of exception logs to retain.
     *
     * @description
     * Maximum retention period for old logs.
     */
    EXCEPTION_LOG_MAX_FILES: string | undefined;

    /**
     * ## REJECTION_LOG_MAX_SIZE
     *
     * Maximum size for rejection logs.
     *
     * @description
     * Maximum size before rotating a log file.
     */
    REJECTION_LOG_MAX_SIZE: string | undefined;

    /**
     * ## REJECTION_LOG_MAX_FILES
     *
     * Maximum number of rejection logs to retain.
     *
     * @description
     * Maximum retention period for old logs.
     */
    REJECTION_LOG_MAX_FILES: string | undefined;

    /**
     * ## RATE_LIMIT_WINDOW_MS
     *
     * Rate limit window duration.
     *
     * @description
     * Time window in milliseconds for rate limiting requests.
     * 
     * Example: `"60000"` for 1 minute.
     */
    RATE_LIMIT_WINDOW_MS: string | undefined;

    /**
     * ## RATE_LIMIT_MAX_REQUESTS
     *
     * Maximum requests per rate limit window.
     *
     * @description
     * Maximum number of requests a single client can make during the defined window.
     */
    RATE_LIMIT_MAX_REQUESTS: string | undefined;

    /**
     * ## STORAGE_DATABASE_URI
     *
     * Connection string for the application's database.
     *
     * @description
     * Full URI containing credentials and database details.
     * 
     * Example: `mysql://username:password@host:3306/database_name`.
     */
    STORAGE_DATABASE_URI: string | undefined;
  } 
}
