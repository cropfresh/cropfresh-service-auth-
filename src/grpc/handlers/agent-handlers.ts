/**
 * Agent gRPC Handlers - Story 2.6
 * 
 * Modular gRPC handlers for field agent operations:
 * - CreateFieldAgent (AC2, AC3)
 * - ListFieldAgents (AC1)
 * - AgentFirstLogin (AC4)
 * - AgentSetPin (AC4)
 * - CompleteAgentTraining (AC5)
 * - GetAgentDashboard (AC6)
 * - DeactivateAgent (AC7)
 * - GetZones
 * 
 * @module grpc/handlers/agent-handlers
 */

import * as grpc from '@grpc/grpc-js';
import { Logger } from 'pino';
import { AgentProvisioningService } from '../../services/agent-provisioning-service';
import { AgentRepository } from '../../repositories/agent-repository';
import { ZoneRepository } from '../../repositories/zone-repository';
import { EmploymentType, AgentStatus } from '../../lib/prisma';

/**
 * Creates gRPC handlers for field agent operations
 */
export function createAgentHandlers(logger: Logger) {
    const agentService = new AgentProvisioningService();
    const agentRepo = new AgentRepository();
    const zoneRepo = new ZoneRepository();

    return {
        /**
         * CreateFieldAgent - District Manager creates agent account (AC2, AC3)
         */
        CreateFieldAgent: async (call: any, callback: any) => {
            try {
                const { full_name, mobile_number, zone_id, start_date, employment_type, created_by_user_id } = call.request;

                logger.info({ mobile: mobile_number }, 'Creating field agent');

                // Map employment type string to enum
                const empType = employment_type as keyof typeof EmploymentType;
                if (!EmploymentType[empType]) {
                    return callback(null, {
                        success: false,
                        message: 'Invalid employment type. Use FULL_TIME, PART_TIME, or CONTRACTOR',
                    });
                }

                const result = await agentService.createAgent(
                    full_name,
                    mobile_number,
                    parseInt(zone_id),
                    start_date ? new Date(start_date) : new Date(),
                    EmploymentType[empType],
                    created_by_user_id
                );

                callback(null, {
                    success: result.success,
                    message: result.message,
                    agent_id: result.agentId,
                    employee_id: result.employeeId,
                    status: result.status,
                    sms_sent: result.smsSent,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'CreateFieldAgent failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * ListFieldAgents - Get agents with filters (AC1)
         */
        ListFieldAgents: async (call: any, callback: any) => {
            try {
                const { status_filter, zone_id, search, page = 1, limit = 20, district_manager_id } = call.request;

                const result = await agentRepo.listAgents({
                    status: status_filter ? AgentStatus[status_filter as keyof typeof AgentStatus] : undefined,
                    zoneId: zone_id ? parseInt(zone_id) : undefined,
                    search,
                    districtManagerId: district_manager_id,
                    page,
                    limit,
                });

                const agents = result.agents.map(agent => ({
                    agent_id: agent.agentProfile?.id.toString(),
                    name: agent.name,
                    mobile: agent.phone,
                    zone_name: agent.agentProfile?.zoneAssignments[0]?.zone.name || '',
                    status: agent.agentProfile?.status,
                    last_login_at: agent.lastLoginAt?.toISOString() || '',
                    employee_id: agent.agentProfile?.employeeId,
                }));

                callback(null, {
                    success: true,
                    agents,
                    pagination: {
                        page,
                        limit,
                        total: result.total,
                        total_pages: Math.ceil(result.total / limit),
                    },
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'ListFieldAgents failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * GetAgentDetails - Get full agent info (AC7)
         */
        GetAgentDetails: async (call: any, callback: any) => {
            try {
                const { agent_id } = call.request;
                const agent = await agentRepo.findByUserId(parseInt(agent_id));

                if (!agent?.agentProfile) {
                    return callback(null, {
                        success: false,
                        agent: null,
                    });
                }

                callback(null, {
                    success: true,
                    agent: {
                        agent_id: agent.agentProfile.id.toString(),
                        user_id: agent.id.toString(),
                        name: agent.name,
                        mobile: agent.phone,
                        employee_id: agent.agentProfile.employeeId,
                        employment_type: agent.agentProfile.employmentType,
                        status: agent.agentProfile.status,
                        zone_id: agent.agentProfile.zoneAssignments[0]?.zone.id.toString() || '',
                        zone_name: agent.agentProfile.zoneAssignments[0]?.zone.name || '',
                        start_date: agent.agentProfile.startDate.toISOString(),
                        created_at: agent.agentProfile.createdAt.toISOString(),
                        last_login_at: agent.lastLoginAt?.toISOString() || '',
                        training_completed_at: agent.agentProfile.trainingCompletedAt?.toISOString() || '',
                    },
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'GetAgentDetails failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * AgentFirstLogin - Validate temp PIN, return token for PIN change (AC4)
         */
        AgentFirstLogin: async (call: any, callback: any) => {
            try {
                const { mobile_number, pin } = call.request;
                logger.info({ mobile: mobile_number }, 'Agent first login attempt');

                const result = await agentService.firstLogin(mobile_number, pin);

                callback(null, {
                    success: result.success,
                    message: result.message,
                    requires_pin_change: result.requiresPinChange,
                    temporary_token: result.temporaryToken || '',
                    agent_name: result.agentName || '',
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'AgentFirstLogin failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * AgentSetPin - Set permanent PIN after first login (AC4)
         */
        AgentSetPin: async (call: any, callback: any) => {
            try {
                const { temporary_token, new_pin, confirm_pin } = call.request;

                const result = await agentService.setPin(temporary_token, new_pin, confirm_pin);

                callback(null, {
                    success: result.success,
                    message: result.message,
                    access_token: result.accessToken || '',
                    refresh_token: result.refreshToken || '',
                    requires_training: result.requiresTraining,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'AgentSetPin failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * CompleteAgentTraining - Mark training done, unlock dashboard (AC5)
         */
        CompleteAgentTraining: async (call: any, callback: any) => {
            try {
                const { user_id } = call.request;

                const result = await agentService.completeTraining(parseInt(user_id));

                callback(null, {
                    success: result.success,
                    message: result.message,
                    status: result.status,
                    dashboard_unlocked: result.dashboardUnlocked,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'CompleteAgentTraining failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * GetAgentDashboard - Dashboard data for agent home screen (AC6)
         */
        GetAgentDashboard: async (call: any, callback: any) => {
            try {
                const { user_id } = call.request;
                const agent = await agentRepo.findByUserId(parseInt(user_id));

                if (!agent?.agentProfile) {
                    return callback(null, {
                        success: false,
                        agent_name: '',
                        pending_tasks: 0,
                    });
                }

                const zoneAssignment = agent.agentProfile.zoneAssignments[0];
                const zone = zoneAssignment?.zone;

                // Get child zones (villages) if this is a taluk
                let villages: string[] = [];
                if (zone) {
                    const childZones = await zoneRepo.getChildZones(zone.id);
                    villages = childZones.map(z => z.name);
                }

                callback(null, {
                    success: true,
                    agent_name: agent.name || 'Agent',
                    pending_tasks: 0, // TODO: Integrate with task service
                    zone_name: zone?.name || '',
                    villages,
                    farmer_count: 0, // TODO: Integrate with farmer count
                    verifications_today: 0,
                    accuracy_percent: 0,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'GetAgentDashboard failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * DeactivateAgent - Deactivate an agent account (AC7)
         */
        DeactivateAgent: async (call: any, callback: any) => {
            try {
                const { agent_id, reason, deactivated_by_user_id } = call.request;

                const result = await agentService.deactivateAgent(
                    parseInt(agent_id),
                    reason,
                    deactivated_by_user_id
                );

                callback(null, {
                    success: result.success,
                    message: result.message,
                    new_status: AgentStatus.INACTIVE,
                    sms_sent: result.smsSent,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'DeactivateAgent failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * ReassignAgentZone - Reassign agent to different zone (AC7)
         */
        ReassignAgentZone: async (call: any, callback: any) => {
            try {
                const { agent_id, new_zone_id, effective_date, assigned_by_user_id } = call.request;

                const agent = await agentRepo.findByUserId(parseInt(agent_id));
                if (!agent?.agentProfile) {
                    return callback(null, {
                        success: false,
                        message: 'Agent not found',
                    });
                }

                await agentRepo.reassignZone(
                    agent.agentProfile.id,
                    parseInt(new_zone_id),
                    assigned_by_user_id,
                    effective_date ? new Date(effective_date) : new Date()
                );

                callback(null, {
                    success: true,
                    message: 'Zone reassigned successfully',
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'ReassignAgentZone failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },

        /**
         * GetZones - Get zones for dropdown (filtered by DM jurisdiction)
         */
        GetZones: async (call: any, callback: any) => {
            try {
                const { district_manager_id, parent_zone_id } = call.request;

                let zones;
                if (parent_zone_id) {
                    zones = await zoneRepo.getChildZones(parseInt(parent_zone_id));
                } else if (district_manager_id) {
                    zones = await zoneRepo.getZonesByDistrictManager(district_manager_id);
                } else {
                    zones = await zoneRepo.getZoneHierarchy();
                }

                callback(null, {
                    success: true,
                    zones: zones.map(zone => ({
                        zone_id: zone.id.toString(),
                        name: zone.name,
                        type: zone.type,
                        parent_zone_id: zone.parentZoneId?.toString() || '',
                        agent_count: zone._count?.assignments || 0,
                    })),
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'GetZones failed');
                callback({
                    code: grpc.status.INTERNAL,
                    message: error.message,
                });
            }
        },
    };
}
