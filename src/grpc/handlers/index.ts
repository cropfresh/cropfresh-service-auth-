/**
 * gRPC Handler Index
 * 
 * Exports all domain-specific handler modules for easy import.
 * Each handler module follows the same pattern:
 * - createXxxHandlers(deps) returns an object with handler functions
 * - Handlers are typed to match proto definitions
 * 
 * @module grpc/handlers
 */

export { createTeamHandlers, TeamHandlerDependencies } from './team-handlers';
export { createHaulerHandlers, HaulerHandlerDependencies } from './hauler-handlers';
export { createAgentHandlers } from './agent-handlers'; // Story 2.6

// Future handler exports (for refactoring existing auth.ts):
// export { createOtpHandlers } from './otp-handlers';
// export { createFarmerHandlers } from './farmer-handlers';
// export { createBuyerHandlers } from './buyer-handlers';
// export { createSessionHandlers } from './session-handlers';
