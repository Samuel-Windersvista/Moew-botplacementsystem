using acidphantasm_botplacementsystem.Spawning;
using HarmonyLib;
using SPT.Reflection.Patching;
using System.Reflection;

namespace acidphantasm_botplacementsystem.Patches
{
    /// <summary>
    /// Triggers BossSpawnTracking.EndRaidMergeData() when player unregisters (raid end),
    /// which sends boss spawn tracking data to the server via /abps/save.
    /// </summary>
    internal class UnregisterPlayerPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod()
        {
            return AccessTools.Method(typeof(EFT.GameWorld), "UnregisterPlayer");
        }

        [PatchPostfix]
        private static void PatchPostfix()
        {
            BossSpawnTracking.EndRaidMergeData();
        }
    }
}
