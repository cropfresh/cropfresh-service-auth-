/**
 * Zone Repository - Story 2.6
 * 
 * Data access layer for zone hierarchy operations:
 * - Get zones by district manager jurisdiction
 * - Get zone hierarchy (parent-child relationships)
 * - Count agents per zone
 * 
 * @module repositories/zone-repository
 */

import { prisma, Zone, ZoneType } from '../lib/prisma';
import { logger } from '../utils/logger';

export interface ZoneWithDetails extends Zone {
    parentZone?: Zone | null;
    childZones?: Zone[];
    _count?: { assignments: number };
}

/**
 * Repository class for zone data operations
 */
export class ZoneRepository {

    /**
     * Gets zones managed by a specific district manager
     */
    async getZonesByDistrictManager(districtManagerId: number): Promise<ZoneWithDetails[]> {
        const zones = await prisma.zone.findMany({
            where: {
                districtManagerId,
            },
            include: {
                parentZone: true,
                childZones: true,
                _count: {
                    select: { assignments: true },
                },
            },
            orderBy: [
                { type: 'asc' },
                { name: 'asc' },
            ],
        });

        return zones as ZoneWithDetails[];
    }

    /**
     * Gets all child zones of a parent zone
     */
    async getChildZones(parentZoneId: number): Promise<ZoneWithDetails[]> {
        const zones = await prisma.zone.findMany({
            where: {
                parentZoneId,
            },
            include: {
                _count: {
                    select: { assignments: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        return zones as ZoneWithDetails[];
    }

    /**
     * Gets a zone by ID with full hierarchy
     */
    async getZoneById(zoneId: number): Promise<ZoneWithDetails | null> {
        const zone = await prisma.zone.findUnique({
            where: { id: zoneId },
            include: {
                parentZone: true,
                childZones: true,
                _count: {
                    select: { assignments: true },
                },
            },
        });

        return zone as ZoneWithDetails | null;
    }

    /**
     * Gets all zones of a specific type
     */
    async getZonesByType(type: ZoneType): Promise<Zone[]> {
        return prisma.zone.findMany({
            where: { type },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Creates a new zone (for seeding or admin use)
     */
    async createZone(data: {
        name: string;
        type: ZoneType;
        parentZoneId?: number;
        districtManagerId?: number;
    }): Promise<Zone> {
        const zone = await prisma.zone.create({
            data: {
                name: data.name,
                type: data.type,
                parentZoneId: data.parentZoneId,
                districtManagerId: data.districtManagerId,
            },
        });

        logger.info({ zoneId: zone.id, name: zone.name, type: zone.type }, 'Zone created');
        return zone;
    }

    /**
     * Gets full zone hierarchy starting from a root zone
     * Returns tree structure for dropdown population
     */
    async getZoneHierarchy(rootZoneId?: number): Promise<ZoneWithDetails[]> {
        const where = rootZoneId
            ? { parentZoneId: rootZoneId }
            : { parentZoneId: null };

        const zones = await prisma.zone.findMany({
            where,
            include: {
                childZones: {
                    include: {
                        childZones: {
                            include: {
                                childZones: true, // 4 levels: State > District > Taluk > Village
                            },
                        },
                    },
                },
                _count: {
                    select: { assignments: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        return zones as ZoneWithDetails[];
    }

    /**
     * Counts active agents in a zone
     */
    async getAgentCount(zoneId: number): Promise<number> {
        return prisma.agentZoneAssignment.count({
            where: {
                zoneId,
                effectiveTo: null, // Current assignments only
            },
        });
    }
}
