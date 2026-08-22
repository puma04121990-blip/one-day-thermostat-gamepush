using System;
using System.Collections.Generic;
using System.Linq;
using OneDayThermostat.Core;

namespace OneDayThermostat.Gameplay.Climate
{
    public sealed class ServiceFollowUpSystem : IAuthoritativeSystem
    {
        private static readonly Dictionary<string, ServiceTemplate> Templates = new Dictionary<string, ServiceTemplate>
        {
            ["cost.branch_26_resonance"] = new ServiceTemplate("service.branch_26.resonance", "component.branch_26", "service.action.balance_branch", "service.outcome.branch_rebalanced"),
            ["cost.kitchen_queue"] = new ServiceTemplate("service.kitchen_drain.queue", "component.kitchen_drain", "service.action.clear_drain_window", "service.outcome.drain_window_cleared"),
            ["cost.second_network_peak"] = new ServiceTemplate("service.network_main.peak", "component.network_main", "service.action.stage_network_return", "service.outcome.network_return_staged")
        };

        public void Step(SimulationWorld world, float deltaSeconds)
        {
            MaterializeFollowUps(world);
            OfferEndOfDayReview(world);
        }

        public bool Complete(SimulationWorld world, string followUpId)
        {
            var followUp = world.Archive.ServiceFollowUps.FirstOrDefault(x => x.Id == followUpId && !x.IsResolved);
            if (followUp == null || !world.Components.TryGetValue(followUp.ComponentId, out var component)) return false;

            component.Wear = Clamp01(component.Wear - .12f);
            component.RecoveryProgress = Clamp01(component.RecoveryProgress + .32f);
            component.RecentStress = Clamp01(component.RecentStress - .18f);
            followUp.IsResolved = true;
            followUp.CompletedTick = world.Tick;
            world.Archive.UnlockedEntries.Add(followUp.OutcomeKey);
            world.Archive.StewardshipCredits += 1;
            return true;
        }

        private static void MaterializeFollowUps(SimulationWorld world)
        {
            foreach (var cost in world.Archive.UnresolvedCosts.ToArray())
            {
                if (!Templates.TryGetValue(cost, out var template)) continue;
                if (world.Archive.ServiceFollowUps.Any(x => x.Id == template.Id)) continue;
                world.Archive.ServiceFollowUps.Add(new ServiceFollowUp
                {
                    Id = template.Id,
                    ComponentId = template.ComponentId,
                    ReasonKey = cost,
                    ActionKey = template.ActionKey,
                    OutcomeKey = template.OutcomeKey,
                    CreatedTick = world.Tick
                });
                world.Archive.UnlockedEntries.Add("archive.service_follow_up");
            }
        }

        private static void OfferEndOfDayReview(SimulationWorld world)
        {
            if (world.Event.Phase != EventPhase.Cooldown || world.Archive.EndOfDayReviewAvailable) return;
            var unresolved = world.Archive.ServiceFollowUps.Count(x => !x.IsResolved);
            world.Archive.EndOfDayReviewAvailable = true;
            world.Archive.EndOfDayReviewKey = unresolved == 0 ? "review.day.stewardship_complete" : "review.day.service_follow_up_open";
            world.Archive.UnlockedEntries.Add("archive.end_of_day_review");
        }

        private static float Clamp01(float value) => Math.Max(0f, Math.Min(1f, value));

        private sealed class ServiceTemplate
        {
            public readonly string Id;
            public readonly string ComponentId;
            public readonly string ActionKey;
            public readonly string OutcomeKey;

            public ServiceTemplate(string id, string componentId, string actionKey, string outcomeKey)
            {
                Id = id;
                ComponentId = componentId;
                ActionKey = actionKey;
                OutcomeKey = outcomeKey;
            }
        }
    }
}
