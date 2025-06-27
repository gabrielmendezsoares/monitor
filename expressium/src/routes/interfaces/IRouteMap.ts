/**
 * ## IRouteMap
 * 
 * Interface defining the structure of route configuration objects.
 * 
 * @description This interface specifies the required and optional properties for
 * configuring API routes in the application. It serves as a contract for creating
 * consistent route definitions that can be processed by the route generation system.
 * 
 * Each property plays a specific role:
 * 
 * - method: HTTP method definition
 * - version: Version definition
 * - url: URL path definition
 * - serviceHandler: Service handler binding
 * - requiresAuthorization: Authorization handling
 * - dynamicSegmentList: Dynamic segment definition
 * - roleList: Role-based access control
 * - middlewareHandlerList: Middleware handler binding
 * 
 * This structure enables declarative route definitions that are both maintainable
 * and self-documenting.
 */
export interface IRouteMap {
  method: string,
  version?: string,
  url: string,
  serviceHandler: Function,
  requiresAuthorization?: boolean
  dynamicSegmentList?: string[],
  roleList?: string[],
  middlewareHandlerList?: Function[],
};
