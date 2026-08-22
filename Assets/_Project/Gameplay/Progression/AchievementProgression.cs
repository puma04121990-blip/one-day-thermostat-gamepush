using System;
using System.Collections.Generic;
using System.Linq;
using OneDayThermostat.Core;

namespace OneDayThermostat.Gameplay.Progression
{
    public enum AchievementTriggerKind { ArchiveEntry, ReviewKey, ServiceOutcome }

    public sealed class AchievementDefinition
    {
        public string Id = string.Empty;
        public string TitleKey = string.Empty;
        public string DescriptionKey = string.Empty;
        public AchievementTriggerKind TriggerKind;
        public string TriggerKey = string.Empty;
    }

    public sealed class AchievementProgressionSystem
    {
        private readonly IReadOnlyList<AchievementDefinition> _definitions;

        public AchievementProgressionSystem(IReadOnlyList<AchievementDefinition> definitions = null)
        {
            _definitions = definitions ?? AchievementCatalog.Create();
        }

        public void Step(SimulationWorld world, float deltaSeconds)
        {
            foreach (var definition in _definitions)
            {
                if (!IsTriggered(world, definition) || !world.Archive.UnlockedAchievements.Add(definition.Id)) continue;
                world.Archive.PendingPlatformAchievements.Add(definition.Id);
                world.Archive.UnlockedEntries.Add("archive.achievement." + definition.Id);
            }
        }

        public bool MarkPlatformSynced(SimulationWorld world, string achievementId)
        {
            if (string.IsNullOrWhiteSpace(achievementId) || !world.Archive.UnlockedAchievements.Contains(achievementId)) return false;
            return world.Archive.PendingPlatformAchievements.Remove(achievementId);
        }

        private static bool IsTriggered(SimulationWorld world, AchievementDefinition definition)
        {
            return definition.TriggerKind == AchievementTriggerKind.ArchiveEntry
                ? world.Archive.UnlockedEntries.Contains(definition.TriggerKey)
                : definition.TriggerKind == AchievementTriggerKind.ReviewKey
                    ? world.Archive.EndOfDayReviewAvailable && world.Archive.EndOfDayReviewKey == definition.TriggerKey
                    : world.Archive.UnlockedEntries.Contains(definition.TriggerKey);
        }
    }

    public static class AchievementCatalog
    {
        public static IReadOnlyList<AchievementDefinition> Create()
        {
            return new[]
            {
                new AchievementDefinition { Id = "achievement.threshold_route", TitleKey = "achievement.threshold_route.title", DescriptionKey = "achievement.threshold_route.description", TriggerKind = AchievementTriggerKind.ArchiveEntry, TriggerKey = "archive.threshold_route" },
                new AchievementDefinition { Id = "achievement.quiet_route", TitleKey = "achievement.quiet_route.title", DescriptionKey = "achievement.quiet_route.description", TriggerKind = AchievementTriggerKind.ArchiveEntry, TriggerKey = "archive.quiet_route" },
                new AchievementDefinition { Id = "achievement.day_gathered", TitleKey = "achievement.day_gathered.title", DescriptionKey = "achievement.day_gathered.description", TriggerKind = AchievementTriggerKind.ReviewKey, TriggerKey = "review.day.stewardship_complete" },
                new AchievementDefinition { Id = "achievement.branch_rebalanced", TitleKey = "achievement.branch_rebalanced.title", DescriptionKey = "achievement.branch_rebalanced.description", TriggerKind = AchievementTriggerKind.ServiceOutcome, TriggerKey = "service.outcome.branch_rebalanced" }
            };
        }
    }
}
