using Comfort.Common;
using EFT;
using EFT.Game.Spawning;
using SPT.Reflection.Utils;
using System;
using System.Collections.Generic;
using System.Linq;

namespace acidphantasm_botplacementsystem.Utils
{
    internal class Utility
    {
        public static string mainProfileID = string.Empty;
        public static string mapName = string.Empty;
        public static List<IPlayer> allPMCs = new();
        public static List<IPlayer> allBots = new();
        public static List<IPlayer> allScavs = new();
        public static List<ISpawnPoint> allSpawnPoints = new();
        public static List<ISpawnPoint> playerSpawnPoints = new();
        public static List<ISpawnPoint> backupPlayerSpawnPoints = new();
        public static List<ISpawnPoint> combinedSpawnPoints = new();
        public static List<BotZone> currentMapZones = new();

        private static int _lastFrame = -1;
        public static Dictionary<string, string[]> mapHotSpots = new()
        {
            {"rezervbase", ["ZoneSubStorage", "ZoneBarrack"]},
            {"shoreline", ["ZoneSanatorium1", "ZoneSanatorium2"]},
            {"lighthouse", ["Zone_LongRoad", "Zone_Chalet", "Zone_Village"]},
            {"interchange", ["ZoneCenter", "ZoneCenterBot"]},
            {"bigmap", ["ZoneDormitory", "ZoneScavBase", "ZoneOldAZS", "ZoneGasStation"]}
        };

        public void Awake()
        {
            mainProfileID = GetPlayerProfile().ProfileId;
        }

        public static Profile GetPlayerProfile()
        {
            return ClientAppUtils.GetClientApp().GetClientBackEndSession().Profile;
        }

        public static string CurrentLocation
        {
            get
            {
                if (mapName != string.Empty) return mapName;

                var gameWorld = Singleton<GameWorld>.Instance;
                if (gameWorld != null)
                {
                    mapName = gameWorld.LocationId;
                    return mapName;
                }
                return "default";
            }
        }

        private static void InvalidateCacheIfNewFrame()
        {
            int currentFrame = UnityEngine.Time.frameCount;
            if (currentFrame != _lastFrame)
            {
                _lastFrame = currentFrame;
                allPMCs.Clear();
                allScavs.Clear();
            }
        }

        public static List<IPlayer> GetAllPMCs()
        {
            InvalidateCacheIfNewFrame();
            if (allPMCs.Count > 0) return allPMCs;

            var gameWorld = Singleton<GameWorld>.Instance;
            if (gameWorld != null)
            {
                var pmcs = gameWorld.RegisteredPlayers
                    .Where(x => x.Profile.Side == EPlayerSide.Bear || x.Profile.Side == EPlayerSide.Usec)
                    .ToList();
                allPMCs.AddRange(pmcs);
            }
            return allPMCs;
        }

        public static List<IPlayer> GetAllScavs()
        {
            InvalidateCacheIfNewFrame();
            if (allScavs.Count > 0) return allScavs;

            var gameWorld = Singleton<GameWorld>.Instance;
            if (gameWorld != null)
            {
                var scavs = gameWorld.RegisteredPlayers
                    .Where(x => x.Profile.Info.Settings.Role == WildSpawnType.assault)
                    .ToList();
                allScavs.AddRange(scavs);
            }
            return allScavs;
        }
        
        public static List<IPlayer> GetAllCachedBots()
        {
            return GetAllPMCs()
                .Concat(GetAllScavs())
                .ToList();
        }

        public static List<ISpawnPoint> GetAllSpawnPoints()
        {
            if (allSpawnPoints.Count == 0)
            {
                allSpawnPoints = SpawnPointManagerClass.CreateFromScene().ToList();
            }
            return allSpawnPoints;
        }

        public static List<ISpawnPoint> GetPlayerSpawnPoints()
        {
            if (playerSpawnPoints.Count == 0)
            {
                playerSpawnPoints = GetAllSpawnPoints()
                    .Where(x => x.Categories.ContainPlayerCategory())
                    .Where(x => x.Infiltration != null)
                    .ToList();
            }
            return playerSpawnPoints;
        }

        public static List<ISpawnPoint> GetBotNoBossNoSnipeSpawnPoints()
        {
            if (backupPlayerSpawnPoints.Count == 0)
            {
                backupPlayerSpawnPoints = GetAllSpawnPoints()
                    .Where(x => x.Categories.ContainBotCategory())
                    .Where(x => !x.Categories.ContainBossCategory())
                    .Where(x => !x.IsSnipeZone)
                    .ToList();
            }
            return backupPlayerSpawnPoints;
        }
        
        public static List<ISpawnPoint> GetCombinedPlayerAndBotSpawnPoints()
        {
            if (combinedSpawnPoints.Count == 0)
            {
                combinedSpawnPoints = GetPlayerSpawnPoints()
                    .Concat(GetBotNoBossNoSnipeSpawnPoints())
                    .Distinct()
                    .ToList();
            }

            return combinedSpawnPoints;
        }
        
        public static List<BotZone> GetMapBotZones()
        {
            return ShuffleCopy(currentMapZones);
        }

        private static System.Random _shuffleRng = new System.Random();

        public static void ShuffleInPlace<T>(List<T> list)
        {
            for (int i = list.Count - 1; i > 0; i--)
            {
                int k = _shuffleRng.Next(i + 1);
                (list[k], list[i]) = (list[i], list[k]);
            }
        }

        public static List<T> ShuffleCopy<T>(List<T> list)
        {
            var copy = new List<T>(list);
            ShuffleInPlace(copy);
            return copy;
        }
    }
}