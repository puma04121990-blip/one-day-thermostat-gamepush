# GitHub Governance

## Текущее состояние

Репозиторий открыт публично: [`puma04121990-blip/one-day-thermostat-gamepush`](https://github.com/puma04121990-blip/one-day-thermostat-gamepush). В нём активна CI-проверка `Core checks`, которая на каждом push/PR выполняет secret policy, компиляцию deterministic core smoke-test и проверку обязательной production-документации.

Серверная защита `main` **включена**. Она требует актуальный успешный check `secret-and-core-check`, требует linear history и запрещает force push/удаление основной ветки. Конфигурация хранится в `.github/branch-protection.json` и применена через GitHub REST API; сам JSON остаётся в репозитории как воспроизводимый источник правил.

| Правило | Значение |
|---|---|
| Обязательный status check | `secret-and-core-check` |
| Strict up-to-date status | Да |
| Linear history | Да |
| Force pushes | Запрещены |
| Deletion of `main` | Запрещено |
| Required review | Не включён для текущего индивидуального ownership; добавить при появлении команды отдельным решением. |

## Рабочий процесс

Все изменения создаются в тематической ветке и попадают в `main` через pull request после успешного `Core checks`. Прямые изменения `main`, force push и удаление ветки блокируются server-side policy. Перед pull request автор выполняет требования `CONTRIBUTING.md`, включая clean worktree, local core smoke-test, проверку отсутствия credentials и тематическую документацию.

## Воспроизводимое применение

Если правила нужно восстановить или обновить, выполните под владельцем репозитория:

```bash
gh api --method PUT \
  repos/puma04121990-blip/one-day-thermostat-gamepush/branches/main/protection \
  --input .github/branch-protection.json
```

После изменения правил проверьте статус через `gh api repos/puma04121990-blip/one-day-thermostat-gamepush/branches/main/protection` и выполните test pull request. Не ослабляйте `secret-and-core-check` ради ручного merge: исправьте CI либо обновите required context атомарно с workflow.
