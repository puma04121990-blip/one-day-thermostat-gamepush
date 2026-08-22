# Local-first achievements в Browser Edition

Achievements фиксируют наблюдаемые факты дня: сохранённый порог, бережный маршрут, собранный baseline и bounded recovery ветви. Они **не дают power-up, валюту, рейтинг или влияние на жильцов**. Их источник — только authoritative fixed-tick `GameState`.

| ID | Authoritative trigger | Local result |
|---|---|---|
| `achievement.threshold_route` | Archive содержит «Порог». | Trace сохранён в Archive. |
| `achievement.quiet_route` | Archive содержит «Тихий дренаж». | Бережный route отмечен. |
| `achievement.day_gathered` | Review key `review.day.stewardship_complete`. | Baseline собран без открытых service tasks. |
| `achievement.branch_rebalanced` | `service.branch_26.resonance` resolved. | Bounded recovery ветви отмечен. |

## Local-first и будущая platform mirror

При первом unlock ID попадает в `achievements.unlocked`, отдельный Archive entry и `pendingPlatformTags` **в одном local save**. Повторные fixed ticks не создают дублей. `markPlatformAchievementSynced(id)` удаляет pending tag только для уже локально разблокированного ID.

Browser Edition пока не вызывает GamePush SDK и не содержит credentials, project ID или предположений о browser API. После подключения реального test project отдельный adapter сможет читать `pendingPlatformTags`, выполнять подтверждённый dispatch и вызывать acknowledgement только после ответа платформы. До этого pending tags намеренно сохраняются как безопасная local-first очередь.
