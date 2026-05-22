import { injectable, inject } from "tsyringe";
import { ILocationBase, IBossLocationSpawn, IWave } from "@spt/models/eft/common/ILocationBase";
import type { ILogger } from "@spt/models/spt/utils/ILogger";

import { BossSpawnControl } from "./BossSpawnControl";
import { DatabaseService } from "@spt/services/DatabaseService";
import { ILocations } from "@spt/models/spt/server/ILocations";
import { VanillaAdjustmentControl } from "./VanillaAdjustmentControl";
import { PMCSpawnControl } from "./PMCSpawnControl";
import { ScavSpawnControl } from "./ScavSpawnControl";
import { IRaidChanges } from "@spt/models/spt/location/IRaidChanges";
import type { ICloner } from "@spt/utils/cloners/ICloner";
import { ModConfig } from "../Globals/ModConfig";

@injectable()
export class MapSpawnControl 
{
    public validMaps: string[] = [
        "bigmap",
        "factory4_day",
        "factory4_night",
        "interchange",
        "laboratory",
        "lighthouse",
        "rezervbase",
        "sandbox",
        "sandbox_high",
        "shoreline",
        "tarkovstreets",
        "woods"
    ];

    public botMapCache: Record<string, IBossLocationSpawn[]> = {};
    public scavMapCache: Record<string, IWave[]> = {};
    public locationData: ILocations = {};

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("DatabaseService") protected databaseService: DatabaseService,
        @inject("BossSpawnControl") protected bossSpawnControl: BossSpawnControl,
        @inject("ScavSpawnControl") protected scavSpawnControl: ScavSpawnControl,
        @inject("PMCSpawnControl") protected pmcSpawnControl: PMCSpawnControl,
        @inject("PrimaryCloner") protected cloner: ICloner,
        @inject("VanillaAdjustmentControl") protected vanillaAdjustmentControl: VanillaAdjustmentControl
    ) 
    {}

    public configureInitialData(): void 
    {
        this.locationData = this.databaseService.getTables().locations;
        for (const mapName of this.validMaps) 
        {
            const mapEntry = this.locationData[mapName];
            if (!mapEntry || !mapEntry.base) 
            {
                this.logger.warning(`[ABPS] Map "${mapName}" not found in location database. Skipping.`);
                continue;
            }
            mapEntry.base.BossLocationSpawn = [];
            this.botMapCache[mapName] = [];
            this.scavMapCache[mapName] = [];
            if (ModConfig.config.scavConfig.waves.enable && ModConfig.config.scavConfig.startingScavs.enable) 
            {
                this.vanillaAdjustmentControl.enableAllSpawnSystem(mapEntry.base);
            }
            else if (!ModConfig.config.scavConfig.waves.enable && ModConfig.config.scavConfig.startingScavs.enable)
            {
                this.vanillaAdjustmentControl.disableNewSpawnSystem(mapEntry.base);
            }
            else if (!ModConfig.config.scavConfig.waves.enable && !ModConfig.config.scavConfig.startingScavs.enable)
            {
                this.vanillaAdjustmentControl.disableAllSpawnSystem(mapEntry.base);
            }
            else if (ModConfig.config.scavConfig.waves.enable && !ModConfig.config.scavConfig.startingScavs.enable)
            {
                this.vanillaAdjustmentControl.disableOldSpawnSystem(mapEntry.base);
            }
            this.vanillaAdjustmentControl.removeExistingWaves(mapEntry.base);
            this.vanillaAdjustmentControl.fixPMCHostility(mapEntry.base);
            this.vanillaAdjustmentControl.adjustNewWaveSettings(mapEntry.base);
            /*
            This is how you make a spawn point properly
            if (this.validMaps[map] == "bigmap") {
                const test = {
                    "BotZoneName": "",
                    "Categories": [
                        "Player"
                    ],
                    "ColliderParams": {
                        "_parent": "SpawnSphereParams",
                        "_props": {
                            "Center": {
                                "x": 0,
                                "y": 0,
                                "z": 0
                            },
                            "Radius": 75
                        }
                    },
                    "CorePointId": 0,
                    "DelayToCanSpawnSec": 4,
                    "Id": crypto.randomUUID(),
                    "Infiltration": "Boiler Tanks",
                    "Position": {
                        "x": 288.068,
                        "y": 1.718,
                        "z": -200.166
                    },
                    "Rotation": 17.73762,
                    "Sides": [
                        "Pmc"
                    ]
                }
                this.locationData[mapName].base.SpawnPointParams.push(test);
            }
            */
        }

        this.vanillaAdjustmentControl.disableVanillaSettings();
        this.vanillaAdjustmentControl.removeCustomPMCWaves();
        this.buildInitialCache();
    }
    public buildInitialCache(): void 
    {
        this.buildBossWaves();
        this.buildPMCWaves();
        this.buildStartingScavs();
        this.replaceOriginalLocations();
    }

    private buildBossWaves(): void 
    {
        for (const mapName of this.validMaps) 
        {
            const mapData = this.bossSpawnControl.getCustomMapData(mapName, this.locationData[mapName].base.EscapeTimeLimit);
            if (mapData.length) mapData.forEach((index) => (this.botMapCache[mapName].push(index)));
        }
    }

    private buildPMCWaves(): void 
    {
        for (const mapName of this.validMaps) 
        {
            const mapData = this.pmcSpawnControl.getCustomMapData(mapName, this.locationData[mapName].base.EscapeTimeLimit);
            if (mapData.length) mapData.forEach((index) => (this.botMapCache[mapName].push(index)));
        }
    }

    private buildStartingScavs(): void 
    {
        for (const mapName of this.validMaps) 
        {
            if (mapName == "laboratory") continue;
            const mapData = this.scavSpawnControl.getCustomMapData(mapName);
            if (mapData.length) mapData.forEach((index) => (this.scavMapCache[mapName].push(index)));
        }
    }

    private replaceOriginalLocations(): void 
    {
        for (const mapName of this.validMaps) 
        {
            this.locationData[mapName].base.BossLocationSpawn = this.cloner.clone(this.botMapCache[mapName]);
            this.locationData[mapName].base.waves = this.cloner.clone(this.scavMapCache[mapName]);
        }
    }

    public rebuildCache(location: string): void
    {
        location = location.toLowerCase();
        this.locationData = this.databaseService.getTables().locations;
        const mapEntry = this.locationData[location];
        if (!mapEntry || !mapEntry.base) 
        {
            this.logger.warning(`[ABPS] Map "${location}" not found during rebuild. Skipping.`);
            return;
        }
        this.botMapCache[location] = [];
        this.scavMapCache[location] = [];
        mapEntry.base.waves = [];
        this.rebuildBossWave(location);
        this.rebuildPMCWave(location);    
        this.rebuildStartingScavs(location) 
        this.rebuildLocation(location);
    }

    private rebuildBossWave(location: string): void 
    {
        const mapName = location.toLowerCase();
        this.logger.warning(`[ABPS] Recreating bosses for ${mapName}`);

        const mapData = this.bossSpawnControl.getCustomMapData(mapName, this.locationData[mapName].base.EscapeTimeLimit);
        if (mapData.length) mapData.forEach((index) => (this.botMapCache[mapName].push(index)));
    }

    private rebuildPMCWave(location: string): void 
    {
        const mapName = location.toLowerCase();
        this.logger.warning(`[ABPS] Recreating PMCs for ${mapName}`);

        const mapData = this.pmcSpawnControl.getCustomMapData(mapName, this.locationData[mapName].base.EscapeTimeLimit);
        if (mapData.length) mapData.forEach((index) => (this.botMapCache[mapName].push(index)));
    }

    private rebuildStartingScavs(location: string): void 
    {
        const mapName = location.toLowerCase();
        if (mapName == "laboratory") return;
        this.logger.warning(`[ABPS] Recreating scavs for ${mapName}`);

        const mapData = this.scavSpawnControl.getCustomMapData(mapName);
        if (mapData.length) mapData.forEach((index) => (this.scavMapCache[mapName].push(index)));
    }

    private rebuildLocation(location: string): void 
    {
        const mapName = location.toLowerCase();
        this.locationData[mapName].base.BossLocationSpawn = this.cloner.clone(this.botMapCache[mapName]);
        this.locationData[mapName].base.waves = this.cloner.clone(this.scavMapCache[mapName]);
    }

    public adjustWaves(mapBase: ILocationBase, raidAdjustments: IRaidChanges): void
    {
        if (!mapBase || !mapBase.Id) {
            this.logger.warning("[ABPS] adjustWaves called with invalid mapBase. Skipping.");
            return;
        }
        if (!Array.isArray(mapBase.BossLocationSpawn)) {
            this.logger.warning("[ABPS] adjustWaves called with invalid BossLocationSpawn. Skipping.");
            return;
        }
        mapBase.waves = Array.isArray(mapBase.waves) ? mapBase.waves : [];

        const locationName = mapBase.Id.toLowerCase();
        const skipRaw = Number(raidAdjustments?.simulatedRaidStartSeconds ?? 0);
        const skipSeconds = Number.isFinite(skipRaw) ? Math.max(0, skipRaw) : 0;

        if (skipSeconds <= 60)
        {
            return; // No significant adjustment needed
        }

        // Preserve fixed start waves (Time == -1) - bosses that spawn at raid start
        const startWaves = mapBase.BossLocationSpawn.filter((x) => x.Time === -1);

        // Get all waves with Time AFTER the skip point (both PMC and non-PMC timed waves)
        const remainingTimed = mapBase.BossLocationSpawn
            .filter((x) => typeof x.Time === "number" && x.Time > skipSeconds)
            .map((x) => {
                const cloned = this.cloner.clone(x);
                cloned.Time -= skipSeconds;
                return cloned;
            });

        // Regenerate starting PMCs based on remaining raid time
        const raidMinsRaw = Number(raidAdjustments?.raidTimeMinutes ?? 0);
        const totalRemainingTime = Number.isFinite(raidMinsRaw) ? Math.max(0, raidMinsRaw) * 60 : 0;
        const newStartingPMCs = this.pmcSpawnControl.generateScavRaidRemainingPMCs(locationName, totalRemainingTime);

        // Regenerate starting Scavs for the late-start scenario
        const newStartingScavs = this.scavSpawnControl.generateStartingScavs(locationName, "assault", true);

        // Reassemble: time-shifted waves + new PMCs + fixed start waves
        const clonedPMCs = Array.isArray(newStartingPMCs) ? this.cloner.clone(newStartingPMCs) : [];
        const clonedStartWaves = Array.isArray(startWaves) ? this.cloner.clone(startWaves) : [];
        mapBase.BossLocationSpawn = [
            ...remainingTimed,
            ...clonedPMCs,
            ...clonedStartWaves,
        ];

        // Add new Scav waves
        const clonedScavs = Array.isArray(newStartingScavs) ? this.cloner.clone(newStartingScavs) : [];
        for (const scavWave of clonedScavs)
        {
            mapBase.waves.push(scavWave);
        }
    }
}